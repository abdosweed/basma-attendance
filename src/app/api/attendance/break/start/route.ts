import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { broadcastNotificationToUser } from '@/lib/sse-notifications';
import { validateEmployeeLocation } from '@/lib/geofence';
import { evaluateDeviceTrust } from '@/lib/device';

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { latitude, longitude, accuracy } = body;

    const todayDateStr = new Date().toISOString().split('T')[0];
    const employee = await prisma.employee.findUnique({
      where: { id: session.employeeId },
      include: {
        company: { include: { systemSettings: true } },
        primaryBranch: true,
        employeeShifts: { include: { shift: true } },
        employeeBranches: { include: { branch: true } },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: 'تعذر العثور على بيانات الموظف' }, { status: 404 });
    }

    const { deviceId, trustedDeviceId } = body;
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
          error: deviceEval.reason || 'هذا الجهاز غير معتمد لبدء الاستراحة.',
          code: 'UNAUTHORIZED_DEVICE',
          deviceStatus: deviceEval.status,
        },
        { status: 403 }
      );
    }

    const settings = employee.company.systemSettings[0] || {
      requireLocationForBreakStart: true,
      maxAcceptedGpsAccuracy: 30,
      accuracyMustBeWithinRadius: false,
      notifyAdminOnRepeatedBreakAttempt: true,
    };

    const currentShift = employee.employeeShifts[0]?.shift || null;
    const maxBreaksAllowed = 5;

    // 1. فحص الـ Geofence للاستراحة إذا كان الخيار مفعلاً
    if (settings.requireLocationForBreakStart && latitude && longitude) {
      const authorizedBranches = [
        ...(employee.primaryBranch ? [employee.primaryBranch] : []),
        ...employee.employeeBranches.map((eb) => eb.branch),
      ];

      const geoResult = validateEmployeeLocation(
        latitude,
        longitude,
        accuracy || 10,
        settings.maxAcceptedGpsAccuracy,
        authorizedBranches,
        employee.allowOutsideBranch,
        settings.accuracyMustBeWithinRadius
      );

      if (!geoResult.isAllowed) {
        return NextResponse.json(
          {
            error: geoResult.reason,
            code: geoResult.code,
          },
          { status: 403 }
        );
      }
    }

    // 2. استخدام Prisma Transaction لمعالجة Race Condition
    const result = await prisma.$transaction(async (tx) => {
      const todayRecord = await tx.attendanceRecord.findUnique({
        where: {
          employeeId_date: {
            employeeId: session.employeeId!,
            date: todayDateStr,
          },
        },
      });

      if (!todayRecord || !todayRecord.checkInAt || todayRecord.checkOutAt) {
        throw { status: 400, message: 'يجب تسجيل الحضور أولاً قبل بدء الاستراحة.' };
      }

      const existingActiveBreak = await tx.breakRecord.findFirst({
        where: { employeeId: session.employeeId, status: 'ACTIVE' },
      });

      if (existingActiveBreak) {
        throw { status: 400, message: 'أنت في استراحة بالفعل حالياً.' };
      }

      // حساب عدد الاستراحات المكتملة لليوم
      const completedBreaksCount = await tx.breakRecord.count({
        where: { employeeId: session.employeeId },
      });

      if (completedBreaksCount >= maxBreaksAllowed) {
        // تسجيل محاولة تكرار الاستراحة في سجل التدقيق AuditLog
        await tx.auditLog.create({
          data: {
            userId: session.userId,
            action: 'REPEATED_BREAK_ATTEMPT',
            entity: 'BreakRecord',
            reason: `محاولة بدء استراحة رقم ${completedBreaksCount + 1} بينما الحد المسموح هو ${maxBreaksAllowed}`,
          },
        });

        // إنشاء إشعار للموظف
        const notif = await tx.notification.create({
          data: {
            employeeId: session.employeeId!,
            title: '⚠️ لا يمكنك بدء استراحة جديدة',
            message: `لقد استخدمت عدد الاستراحات المسموح لك بها لهذه الوردية (${maxBreaksAllowed} استراحة).`,
            type: 'WARNING',
          },
        });

        broadcastNotificationToUser(session.employeeId!, notif);

        // إشعار للإدارة إذا كان الخيار مفعلاً
        if (settings.notifyAdminOnRepeatedBreakAttempt) {
          const admins = await tx.user.findMany({
            where: { role: { in: ['ADMIN', 'HR', 'SUPER_ADMIN'] } },
            include: { employee: true },
          });

          for (const adm of admins) {
            if (adm.employee) {
              const admNotif = await tx.notification.create({
                data: {
                  employeeId: adm.employee.id,
                  title: '⚠️ محاولة تكرار استراحة',
                  message: `حاول الموظف ${employee.firstName} ${employee.lastName} بدء استراحة إضافية محظورة.`,
                  type: 'WARNING',
                },
              });
              broadcastNotificationToUser(adm.employee.id, admNotif);
            }
          }
        }

        throw {
          status: 409,
          code: 'BREAK_LIMIT_REACHED',
          message: `لقد استخدمت عدد الاستراحات المسموح لك بها لهذه الوردية (${maxBreaksAllowed} استراحة).`,
        };
      }

      const nowServerTime = new Date();

      const breakRecord = await tx.breakRecord.create({
        data: {
          employeeId: session.employeeId!,
          startTime: nowServerTime,
          status: 'ACTIVE',
        },
      });

      await tx.attendanceRecord.update({
        where: { id: todayRecord.id },
        data: { status: 'ON_BREAK' },
      });

      await tx.attendanceEvent.create({
        data: {
          employeeId: session.employeeId!,
          type: 'BREAK_START',
          serverTimestamp: nowServerTime,
          latitude: latitude || 0,
          longitude: longitude || 0,
          accuracy: accuracy || 0,
        },
      });

      return breakRecord;
    });

    return NextResponse.json({
      success: true,
      message: 'تم بدء الاستراحة بنجاح',
      breakRecord: result,
    });
  } catch (error: any) {
    if (error.status) {
      return NextResponse.json(
        { error: error.message, code: error.code || 'BREAK_ERROR' },
        { status: error.status }
      );
    }
    return NextResponse.json({ error: 'خطأ في بدء الاستراحة' }, { status: 500 });
  }
}
