import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCronAuth } from '@/lib/cron-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleDailyAttendanceGuard(request);
}

export async function POST(request: NextRequest) {
  return handleDailyAttendanceGuard(request);
}

async function handleDailyAttendanceGuard(request: NextRequest) {
  try {
    if (!verifyCronAuth(request)) {
      return NextResponse.json({ error: 'غير مصرح للوصول إلى مهمة رصد الغياب والتأخير' }, { status: 401 });
    }

    const nowServerTime = new Date();
    const todayTripoliDateStr = nowServerTime.toLocaleDateString('en-CA', { timeZone: 'Africa/Tripoli' });

    // جلب الموظفين النشطين
    const activeEmployees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: {
        employeeShifts: { include: { shift: true } },
        primaryBranch: true,
        user: true,
      },
    });

    let latenessProcessedCount = 0;
    let absenceGeneratedCount = 0;
    const absenceDetails: any[] = [];

    for (const emp of activeEmployees) {
      const assignedShift = emp.employeeShifts?.[0]?.shift;
      const shiftStartTimeStr = assignedShift?.startTime || '08:00';
      const gracePeriodMins = assignedShift?.gracePeriodMins ?? 15;

      // البحث عن سجل اليوم للموظف
      const todayRecord = await prisma.attendanceRecord.findFirst({
        where: {
          employeeId: emp.id,
          date: todayTripoliDateStr,
        },
      });

      // 1. إذا كان الموظف قد سجل حضوره، نحسب دقائق التأخير الفعلي
      if (todayRecord && todayRecord.checkInAt) {
        const [startH, startM] = shiftStartTimeStr.split(':').map(Number);
        const shiftStartDate = new Date(todayRecord.checkInAt);
        shiftStartDate.setHours(startH, startM, 0, 0);

        const graceEndDate = new Date(shiftStartDate.getTime() + gracePeriodMins * 60 * 1000);

        // إذا حضر بعد فترة السماح
        if (todayRecord.checkInAt.getTime() > graceEndDate.getTime()) {
          const lateMins = Math.floor((todayRecord.checkInAt.getTime() - shiftStartDate.getTime()) / (1000 * 60));

          if (todayRecord.lateMinutes !== lateMins || todayRecord.status === 'PRESENT') {
            await prisma.attendanceRecord.update({
              where: { id: todayRecord.id },
              data: {
                lateMinutes: lateMins,
                status: 'LATE',
              },
            });
            latenessProcessedCount++;
          }
        }
      }

      // 2. إذا لم يكن للموظف أي سجل حضور اليوم، نفحص طلبات الإجازات والأذونات
      if (!todayRecord) {
        // فحص وجود إجازة معتمدة تغطي اليوم
        const approvedLeave = await prisma.leaveRequest.findFirst({
          where: {
            employeeId: emp.id,
            status: 'APPROVED',
            startDate: { lte: nowServerTime },
            endDate: { gte: nowServerTime },
          },
        });

        // فحص وجود إذن أو مهمة خارجية معتمدة تغطي اليوم
        const approvedPermission = await prisma.permissionRequest.findFirst({
          where: {
            employeeId: emp.id,
            status: 'APPROVED',
            date: todayTripoliDateStr,
          },
        });

        // إذا لم تكن هناك إجازة أو إذن معتمد، يسجل كـ ABSENT (غائب)
        if (!approvedLeave && !approvedPermission) {
          const newAbsenceRecord = await prisma.attendanceRecord.create({
            data: {
              employeeId: emp.id,
              branchId: emp.primaryBranchId,
              date: todayTripoliDateStr,
              status: 'ABSENT',
              notes: 'تسجيل غياب آلي من محرك الأتمتة اليومي لعدم الحضور بدون إجازة معتمدة',
            },
          });

          // توثيق الغياب في سجل التدقيق AuditLog
          await prisma.auditLog.create({
            data: {
              userId: emp.userId,
              action: 'SYSTEM_AUTO_ABSENCE',
              entity: 'AttendanceRecord',
              entityId: newAbsenceRecord.id,
              reason: 'توليد سجل غياب تلقائي اليوم لعدم تسجيل دخول الموظف',
              details: {
                employeeId: emp.id,
                employeeName: `${emp.firstName} ${emp.lastName}`,
                date: todayTripoliDateStr,
                shiftName: assignedShift?.name || 'الوردية الرسمية',
              },
            },
          });

          absenceGeneratedCount++;
          absenceDetails.push({
            employeeId: emp.id,
            employeeName: `${emp.firstName} ${emp.lastName}`,
            employeeNumber: emp.employeeNumber,
            date: todayTripoliDateStr,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      todayTripoliDateStr,
      activeEmployeesTotal: activeEmployees.length,
      latenessProcessedCount,
      absenceGeneratedCount,
      absenceDetails,
      message: `تم تنفيذ محرك رصد الحضور والغياب اليومي: احتساب تأخير (${latenessProcessedCount})، وتوليد غياب (${absenceGeneratedCount}) 📊`,
    });
  } catch (error: any) {
    console.error('Daily Attendance Guard Cron Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في محرك رصد الحضور والغياب اليومي' }, { status: 500 });
  }
}
