import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateEmployeeLocation } from '@/lib/geofence';

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'غير مصرح للوصول. يرجى تسجيل الدخول.' }, { status: 401 });
    }

    const body = await request.json();
    const { latitude, longitude, accuracy, deviceId, verificationId, verificationCode } = body;

    if (latitude === undefined || longitude === undefined || accuracy === undefined) {
      return NextResponse.json(
        { error: 'تعذر الحصول على إحداثيات الموقع الجغرافي بشكل صحيح' },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: session.employeeId },
      include: {
        company: {
          include: {
            systemSettings: true,
          },
        },
        employeeBranches: {
          include: { branch: true },
        },
        primaryBranch: true,
        employeeShifts: {
          include: { shift: true },
        },
      },
    });

    if (!employee || employee.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'حساب الموظف غير نشط أو غير موجود' }, { status: 403 });
    }

    // 1. تحديد الفروع المصرح بها للموظف
    let authorizedBranches = employee.employeeBranches
      .map((eb) => eb.branch)
      .filter((b) => b && b.isActive);

    if (authorizedBranches.length === 0 && employee.primaryBranch) {
      authorizedBranches = [employee.primaryBranch];
    }

    // 2. جلب إعدادات الدقة القصوى
    const settings = employee.company.systemSettings[0];
    const maxAccuracy = settings?.maxAcceptedGpsAccuracy || 30.0;
    const accuracyMustBeWithinRadius = settings?.accuracyMustBeWithinRadius || false;
    const validationMode = (settings?.geofenceValidationMode as 'STRICT' | 'ACCURACY_AWARE') || 'STRICT';

    // 3. إجراء التحقق الجغرافي الخادم (Server-Side Geofencing)
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

    const nowServerTime = new Date();
    const todayDateStr = nowServerTime.toISOString().split('T')[0];

    // إذا فشل التحقق الجغرافي
    if (!geofenceResult.isAllowed) {
      if (geofenceResult.isSuspicious) {
        await prisma.suspiciousAttempt.create({
          data: {
            employeeId: employee.id,
            deviceId: deviceId || 'UNKNOWN',
            latitude,
            longitude,
            accuracy,
            reason: geofenceResult.reason || 'GPS_OUT_OF_BOUNDS',
            riskLevel: accuracy > maxAccuracy ? 'MEDIUM' : 'HIGH',
            actionTaken: 'BLOCKED',
          },
        });
      }

      return NextResponse.json(
        {
          error: geofenceResult.reason || 'أنت خارج نطاق موقع العمل المسموح.',
          code: geofenceResult.code,
          distanceMeters: geofenceResult.distanceMeters,
          allowedRadiusMeters: geofenceResult.nearestBranch?.geofenceRadius || 10,
          accuracyMeters: accuracy,
          maxAllowedAccuracyMeters: maxAccuracy,
          nearestBranch: geofenceResult.nearestBranch,
        },
        { status: 403 }
      );
    }

    // 4. فحص كود التأكيد التفاعلي المزدوج (Double Verification Code Step)
    if (!verificationCode || !verificationId) {
      // إنشاء كود ديناميكي متجدد من 6 أرقام ينتهي خلال 120 ثانية
      const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 120 * 1000);

      const vRecord = await prisma.verificationCode.create({
        data: {
          employeeId: employee.id,
          type: 'CHECK_IN',
          code: generatedCode,
          expiresAt,
        },
      });

      return NextResponse.json({
        requiresVerification: true,
        verificationId: vRecord.id,
        verificationCode: generatedCode,
        message: 'أدخل كود التأكيد المباشر لإتمام تسجيل الحضور بنجاح',
        expiresInSeconds: 120,
        distanceMeters: geofenceResult.distanceMeters,
        branchName: geofenceResult.matchedBranch?.name || authorizedBranches[0]?.name,
      });
    }

    // التحقق من كود التأكيد المرسل
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

    // تعليم الكود كمستخدم
    await prisma.verificationCode.update({
      where: { id: verificationId },
      data: { usedAt: nowServerTime },
    });

    // 4. فحص حالة الحضور اليوم لمنع الحضور المكرر (Duplicate Check-In Prevention)
    const existingRecord = await prisma.attendanceRecord.findUnique({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: todayDateStr,
        },
      },
    });

    if (existingRecord && existingRecord.checkInAt && !existingRecord.checkOutAt) {
      return NextResponse.json(
        { error: 'لقد قمت بتسجيل الحضور بالفعل لهذه الوردية اليوم.' },
        { status: 400 }
      );
    }

    // 5. جلب الوردية الحالية وحساب التأخير
    const activeShift = employee.employeeShifts[0]?.shift;
    let lateMinutes = 0;
    let recordStatus = 'PRESENT';

    if (activeShift) {
      const [shiftHour, shiftMinute] = activeShift.startTime.split(':').map(Number);
      const shiftStartTimeToday = new Date(nowServerTime);
      shiftStartTimeToday.setHours(shiftHour, shiftMinute, 0, 0);

      const gracePeriodMs = activeShift.gracePeriodMins * 60 * 1000;
      const allowedTimeLimit = new Date(shiftStartTimeToday.getTime() + gracePeriodMs);

      if (nowServerTime > allowedTimeLimit) {
        const diffMs = nowServerTime.getTime() - shiftStartTimeToday.getTime();
        lateMinutes = Math.floor(diffMs / (1000 * 60));
        recordStatus = 'LATE';
      }
    }

    const branchId = geofenceResult.matchedBranch?.id || authorizedBranches[0]?.id;

    // 6. حفظ حدث الحضور الخام في جدول AttendanceEvent غير القابل للتعديل
    const event = await prisma.attendanceEvent.create({
      data: {
        employeeId: employee.id,
        branchId,
        shiftId: activeShift?.id,
        type: 'CHECK_IN',
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

    // 7. تحديث أو إنشاء سجل الحضور اليومي AttendanceRecord
    const record = await prisma.attendanceRecord.upsert({
      where: {
        employeeId_date: {
          employeeId: employee.id,
          date: todayDateStr,
        },
      },
      update: {
        checkInAt: nowServerTime,
        checkOutAt: null,
        lateMinutes,
        status: recordStatus,
        branchId,
        shiftId: activeShift?.id,
      },
      create: {
        employeeId: employee.id,
        date: todayDateStr,
        checkInAt: nowServerTime,
        lateMinutes,
        status: recordStatus,
        branchId,
        shiftId: activeShift?.id,
      },
    });

    // 8. إنشاء إشعار للموظف
    const timeFormatted = nowServerTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    await prisma.notification.create({
      data: {
        employeeId: employee.id,
        title: 'تم تسجيل الحضور بنجاح',
        message: `تم تسجيل حضورك في الساعة ${timeFormatted} ${
          recordStatus === 'LATE' ? `(متأخر ${lateMinutes} دقيقة)` : 'في الوقت المحدد'
        }.`,
        type: recordStatus === 'LATE' ? 'WARNING' : 'SUCCESS',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'تم تسجيل الحضور بنجاح',
      checkInTime: timeFormatted,
      lateMinutes,
      status: recordStatus,
      branchName: geofenceResult.matchedBranch?.name,
      record,
    });
  } catch (error: any) {
    console.error('Check-in error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم أثناء تسجيل الحضور' }, { status: 500 });
  }
}
