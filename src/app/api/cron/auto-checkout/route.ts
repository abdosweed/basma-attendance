import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCronAuth } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleAutoCheckout(request);
}

export async function POST(request: NextRequest) {
  return handleAutoCheckout(request);
}

async function handleAutoCheckout(request: NextRequest) {
  try {
    if (!verifyCronAuth(request)) {
      return NextResponse.json({ error: 'غير مصرح للوصول إلى مهمة الإغلاق المجدولة' }, { status: 401 });
    }

    const nowServerTime = new Date();
    const todayTripoliDateStr = nowServerTime.toLocaleDateString('en-CA', { timeZone: 'Africa/Tripoli' });

    // 1. البحث عن كافة سجلات الحضور المفتوحة (دخول بدون انصراف)
    const openRecords = await prisma.attendanceRecord.findMany({
      where: {
        checkInAt: { not: null },
        checkOutAt: null,
      },
      include: {
        employee: {
          include: {
            employeeShifts: {
              include: { shift: true },
            },
            primaryBranch: true,
          },
        },
        shift: true,
      },
    });

    let closedCount = 0;
    const closedDetails: any[] = [];

    for (const record of openRecords) {
      if (!record.checkInAt) continue;

      const emp = record.employee;
      const assignedShift = record.shift || emp?.employeeShifts?.[0]?.shift;
      const shiftEndTimeStr = assignedShift?.endTime || '16:00';

      const isPreviousDay = record.date < todayTripoliDateStr;

      // حساب وقت الانصراف الآلي المفترض (نهاية الوردية في تاريخ السجل)
      const [endH, endM] = shiftEndTimeStr.split(':').map(Number);
      const autoCheckOutDate = new Date(record.checkInAt);
      autoCheckOutDate.setHours(endH, endM, 0, 0);

      // إذا كانت الوردية ليلية وانتهت في اليوم التالي
      if (assignedShift?.isNightShift || autoCheckOutDate < record.checkInAt) {
        autoCheckOutDate.setDate(autoCheckOutDate.getDate() + 1);
      }

      // حساب مهلة الأمان (ساعتان بعد نهاية الوردية)
      const safetyBufferMs = 2 * 60 * 60 * 1000;
      const thresholdTimeMs = autoCheckOutDate.getTime() + safetyBufferMs;

      // يجب الإغلاق إذا مر تاريخ السجل أو تجاوزنا مهلة الأمان
      if (isPreviousDay || nowServerTime.getTime() >= thresholdTimeMs) {
        // حساب دقائق العمل الفعلية
        const workedMs = autoCheckOutDate.getTime() - record.checkInAt.getTime();
        const totalWorkedMinutes = Math.max(0, Math.floor(workedMs / (1000 * 60)));

        // تحديث السجل بحالة AUTO_CLOSED
        await prisma.attendanceRecord.update({
          where: { id: record.id },
          data: {
            checkOutAt: autoCheckOutDate,
            totalWorkedMinutes,
            status: 'AUTO_CLOSED',
            notes: (record.notes ? record.notes + ' | ' : '') + 'تم الإغلاق التلقائي لعدم تسجيل الموظف للانصراف (AUTO_CLOSED)',
          },
        });

        // إضافة حدث انصراف تلقائي
        await prisma.attendanceEvent.create({
          data: {
            employeeId: record.employeeId,
            branchId: record.branchId,
            type: 'CHECK_OUT',
            serverTimestamp: autoCheckOutDate,
            latitude: 0,
            longitude: 0,
            accuracy: 0,
            source: 'AUTO_CHECKOUT',
            status: 'AUTO_CLOSED',
            notes: `إغلاق آلي مجدول بنهاية الوردية الرسمية (${shiftEndTimeStr})`,
          },
        });

        // توثيق العملية في سجل التدقيق AuditLog
        await prisma.auditLog.create({
          data: {
            userId: emp?.userId || 'SYSTEM_CRON',
            action: 'SYSTEM_AUTO_CHECKOUT',
            entity: 'AttendanceRecord',
            entityId: record.id,
            reason: 'إغلاق تلقائي مجدول للوردية المنسية بعد انتهاء زمن العمل وساعات الأمان',
            details: {
              employeeId: record.employeeId,
              employeeName: `${emp?.firstName || ''} ${emp?.lastName || ''}`,
              recordDate: record.date,
              checkInAt: record.checkInAt,
              autoCheckOutAt: autoCheckOutDate,
              totalWorkedMinutes,
            },
          },
        });

        closedCount++;
        closedDetails.push({
          recordId: record.id,
          employeeId: record.employeeId,
          employeeName: `${emp?.firstName} ${emp?.lastName}`,
          date: record.date,
          autoCheckOutAt: autoCheckOutDate.toISOString(),
        });
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      timeZone: 'Africa/Tripoli',
      openRecordsCount: openRecords.length,
      closedRecordsCount: closedCount,
      closedDetails,
      message: `تم فحص السجلات المفتوحة وإغلاق ${closedCount} وردية منسية آلياً 🤖`,
    });
  } catch (error: any) {
    console.error('Auto Checkout Cron Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في تنفيذ مهمة الإغلاق التلقائي' }, { status: 500 });
  }
}
