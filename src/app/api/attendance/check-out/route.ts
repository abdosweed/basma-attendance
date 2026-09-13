import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateEmployeeLocation } from '@/lib/geofence';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
    }

    const body = await request.json();
    const { latitude, longitude, accuracy, deviceId } = body;

    const employee = await prisma.employee.findUnique({
      where: { id: session.employeeId },
      include: {
        company: { include: { systemSettings: true } },
        employeeBranches: { include: { branch: true } },
        primaryBranch: true,
        employeeShifts: { include: { shift: true } },
      },
    });

    if (!employee || employee.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'حساب الموظف غير نشط' }, { status: 403 });
    }

    const nowServerTime = new Date();

    // 1. البحث عن آخر سجل حضور مفتوح (لم يتم انصرافه بعد) للتعامل الصحيح مع الورديات الليلية الناتجة بعد منتصف الليل
    const openRecord = await prisma.attendanceRecord.findFirst({
      where: {
        employeeId: employee.id,
        checkInAt: { not: null },
        checkOutAt: null,
      },
      orderBy: { checkInAt: 'desc' },
    });

    if (!openRecord || !openRecord.checkInAt) {
      return NextResponse.json(
        { error: 'لم يتم تسجيل الحضور اليوم أو للوردية الحالية حتى الآن لتسجيل الانصراف.' },
        { status: 400 }
      );
    }

    // 2. الفحص الجغرافي الخادم لتسجيل الانصراف بموجب إحداثيات الفرع الحالية من قاعدة البيانات
    let authorizedBranches = employee.employeeBranches.map((eb) => eb.branch).filter((b) => b && b.isActive);
    if (authorizedBranches.length === 0 && employee.primaryBranch) {
      authorizedBranches = [employee.primaryBranch];
    }

    const settings = employee.company.systemSettings[0];
    const maxAccuracy = settings?.maxAcceptedGpsAccuracy || 50.0;

    const geofenceResult = validateEmployeeLocation(
      latitude,
      longitude,
      accuracy,
      maxAccuracy,
      authorizedBranches,
      employee.allowOutsideBranch
    );

    if (!geofenceResult.isAllowed) {
      return NextResponse.json(
        { error: geofenceResult.reason || 'أنت خارج نطاق موقع العمل المسموح لتسجيل الانصراف.' },
        { status: 400 }
      );
    }

    // 3. إنهاء أي استراحة جارية
    const activeBreak = await prisma.breakRecord.findFirst({
      where: { employeeId: employee.id, status: 'ACTIVE' },
    });

    if (activeBreak) {
      const breakDuration = Math.floor((nowServerTime.getTime() - activeBreak.startTime.getTime()) / (1000 * 60));
      await prisma.breakRecord.update({
        where: { id: activeBreak.id },
        data: {
          endTime: nowServerTime,
          durationMinutes: breakDuration,
          status: 'COMPLETED',
        },
      });
    }

    // 4. حساب دقائق العمل والانصراف المبكر والساعات الإضافية Overtime
    const checkInMs = openRecord.checkInAt.getTime();
    const totalDiffMs = nowServerTime.getTime() - checkInMs;
    const totalWorkedMinutes = Math.floor(totalDiffMs / (1000 * 60));

    const activeShift = employee.employeeShifts[0]?.shift;
    let earlyLeaveMinutes = 0;
    let overtimeMinutes = 0;

    if (activeShift) {
      const [endHour, endMinute] = activeShift.endTime.split(':').map(Number);
      const shiftEndTime = new Date(nowServerTime);
      shiftEndTime.setHours(endHour, endMinute, 0, 0);

      // الانصراف المبكر
      if (nowServerTime < shiftEndTime) {
        const earlyMs = shiftEndTime.getTime() - nowServerTime.getTime();
        earlyLeaveMinutes = Math.floor(earlyMs / (1000 * 60));
      } else {
        // الساعات الإضافية
        const overMs = nowServerTime.getTime() - shiftEndTime.getTime();
        overtimeMinutes = Math.floor(overMs / (1000 * 60));
      }
    }

    const branchId = geofenceResult.matchedBranch?.id || authorizedBranches[0]?.id;

    // 5. تسجيل حدث الانصراف الخام
    await prisma.attendanceEvent.create({
      data: {
        employeeId: employee.id,
        branchId,
        shiftId: activeShift?.id,
        type: 'CHECK_OUT',
        serverTimestamp: nowServerTime,
        latitude,
        longitude,
        accuracy,
        distanceFromBranch: geofenceResult.distanceMeters,
        deviceId,
        status: 'SUCCESS',
        source: 'PWA_MOBILE',
      },
    });

    // 6. تحديث سجل الحضور المفتوح
    const updatedRecord = await prisma.attendanceRecord.update({
      where: { id: openRecord.id },
      data: {
        checkOutAt: nowServerTime,
        totalWorkedMinutes,
        earlyLeaveMinutes,
        overtimeMinutes,
      },
    });

    const timeFormatted = nowServerTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    await prisma.notification.create({
      data: {
        employeeId: employee.id,
        title: 'تم تسجيل الانصراف بنجاح',
        message: `تم تسجيل انصرافك في الساعة ${timeFormatted}. إجمالي ساعات العمل: ${Math.floor(
          totalWorkedMinutes / 60
        )} ساعة و ${totalWorkedMinutes % 60} دقيقة.`,
        type: 'SUCCESS',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'تم تسجيل الانصراف بنجاح',
      checkOutTime: timeFormatted,
      totalWorkedMinutes,
      earlyLeaveMinutes,
      overtimeMinutes,
      record: updatedRecord,
    });
  } catch (error: any) {
    console.error('Check-out error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم أثناء تسجيل الانصراف' }, { status: 500 });
  }
}
