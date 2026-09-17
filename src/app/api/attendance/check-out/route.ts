import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateEmployeeLocation } from '@/lib/geofence';
import { evaluateDeviceTrust, evaluateAntiBuddyPunching } from '@/lib/device';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'غير مصرح للوصول' }, { status: 401 });
    }

    const body = await request.json();
    const { latitude, longitude, accuracy, deviceId, trustedDeviceId, deviceInfo, verificationId, verificationCode } = body;

    const employee = await prisma.employee.findUnique({
      where: { id: session.employeeId },
      include: {
        company: { include: { systemSettings: true } },
        employeeBranches: { include: { branch: true } },
        primaryBranch: true,
        employeeShifts: { include: { shift: true } },
        trustedDevices: true,
      },
    });

    if (!employee || employee.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'حساب الموظف غير نشط' }, { status: 403 });
    }

    // 0. فحص وتقييم ثقة الجهاز (Approved Device Model Engine)
    const userAgent = request.headers.get('user-agent') || '';
    const rawDevId = trustedDeviceId || deviceId || 'UNKNOWN_DEV';

    const deviceEval = await evaluateDeviceTrust(
      employee.id,
      rawDevId,
      employee.companyId,
      userAgent
    );

    if (!deviceEval.isAllowed) {
      return NextResponse.json(
        {
          error: deviceEval.reason || 'هذا الجهاز غير معتمد.',
          code: 'UNAUTHORIZED_DEVICE',
          deviceStatus: deviceEval.status,
        },
        { status: 403 }
      );
    }

    // 0.1 فحص حماية البصمة النيابية ومكافحة تبادل الأجهزة (Anti-Buddy Punching Guard)
    const buddyPunchingCheck = await evaluateAntiBuddyPunching(employee.id, rawDevId);
    if (!buddyPunchingCheck.isAllowed) {
      return NextResponse.json(
        {
          error: buddyPunchingCheck.reason,
          code: 'DEVICE_SHARING_VIOLATION',
        },
        { status: 403 }
      );
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
    const maxAccuracy = settings?.maxAcceptedGpsAccuracy || 30.0;
    const accuracyMustBeWithinRadius = settings?.accuracyMustBeWithinRadius || false;
    const validationMode = (settings?.geofenceValidationMode as 'STRICT' | 'ACCURACY_AWARE') || 'STRICT';

    const geofenceResult = validateEmployeeLocation(
      latitude,
      longitude,
      accuracy,
      maxAccuracy,
      authorizedBranches,
      employee.allowOutsideBranch,
      accuracyMustBeWithinRadius,
      validationMode
    );

    if (!geofenceResult.isAllowed) {
      const clientIp = request.headers.get('x-forwarded-for') || 'UNKNOWN_IP';
      await prisma.auditLog.create({
        data: {
          userId: employee.userId,
          action: 'OUT_OF_BOUNDS_ATTEMPT',
          entity: 'ATTENDANCE',
          reason: geofenceResult.reason || 'محاولة تسجيل انصراف خارج نطاق الفرع المسموح',
          ipAddress: clientIp,
          details: {
            employeeId: employee.id,
            employeeName: `${employee.firstName} ${employee.lastName}`,
            nearestBranch: geofenceResult.nearestBranch,
            distanceMeters: geofenceResult.distanceMeters,
            coords: { latitude, longitude, accuracy },
          },
        },
      });

      return NextResponse.json(
        {
          error: geofenceResult.reason || 'أنت خارج نطاق موقع العمل المسموح لتسجيل الانصراف.',
          code: geofenceResult.code,
          distanceMeters: geofenceResult.distanceMeters,
          allowedRadiusMeters: geofenceResult.nearestBranch?.geofenceRadius || 10,
          accuracyMeters: accuracy,
        },
        { status: 403 }
      );
    }

    // 3. فحص كود التأكيد التفاعلي المزدوج (Double Verification Code Step)
    const enableOtp = settings?.enableVerificationOtp ?? false;

    if (enableOtp) {
      if (!verificationCode || !verificationId) {
        const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 120 * 1000);

        const vRecord = await prisma.verificationCode.create({
          data: {
            employeeId: employee.id,
            type: 'CHECK_OUT',
            code: generatedCode,
            expiresAt,
          },
        });

        // إنشاء إشعار في قاعدة البيانات وبثه لحظياً عبر SSE
        try {
          await prisma.notification.create({
            data: {
              employeeId: employee.id,
              title: 'كود تأكيد الانصراف',
              message: `كود تأكيد تسجيل الانصراف الخاص بك هو: ${generatedCode} (صالح لمدة دقيقتين)`,
              type: 'INFO',
            },
          });
        } catch (e) {}

        return NextResponse.json({
          requiresVerification: true,
          verificationId: vRecord.id,
          verificationCode: generatedCode,
          message: `كود التأكيد الخاص بك هو: ${generatedCode}. أدخله في النافذة لإتمام الانصراف.`,
          expiresInSeconds: 120,
          distanceMeters: geofenceResult.distanceMeters,
          branchName: geofenceResult.matchedBranch?.name || authorizedBranches[0]?.name,
        });
      }

      const vCheck = await prisma.verificationCode.findUnique({
        where: { id: verificationId },
      });

      if (
        !vCheck ||
        vCheck.employeeId !== employee.id ||
        vCheck.code !== verificationCode ||
        vCheck.usedAt !== null ||
        vCheck.expiresAt < nowServerTime
      ) {
        return NextResponse.json(
          { error: 'كود التأكيد غير صحيح أو انتهت صلاحيته. يرجى إعادة المحاولة.' },
          { status: 400 }
        );
      }

      await prisma.verificationCode.update({
        where: { id: verificationId },
        data: { usedAt: nowServerTime },
      });
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
