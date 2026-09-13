import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateEmployeeLocation } from '@/lib/geofence';
import { broadcastNotificationToUser } from '@/lib/sse-notifications';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const { latitude, longitude, accuracy, timestamp } = body;

    if (!latitude || !longitude) {
      return NextResponse.json({ error: 'بيانات الموقع ناقصة' }, { status: 400 });
    }

    const todayDateStr = new Date().toISOString().split('T')[0];

    // 1. التحقق من وجود جلسة حضور مفتوحة للموظف اليوم (CHECKED_IN)
    const todayRecord = await prisma.attendanceRecord.findUnique({
      where: {
        employeeId_date: {
          employeeId: session.employeeId,
          date: todayDateStr,
        },
      },
      include: {
        employee: {
          include: {
            primaryBranch: true,
            company: { include: { systemSettings: true } },
            employeeBranches: { include: { branch: true } },
          },
        },
      },
    });

    // الخصوصية: لا تقم بمراقبة الموقع إذا لم تكن هناك جلسة حضور مفتوحة أو إذا سجل الانصراف
    if (!todayRecord || !todayRecord.checkInAt || todayRecord.checkOutAt) {
      return NextResponse.json({
        monitoringStatus: 'STOPPED',
        message: 'لا توجد جلسة حضور مفتوحة حالياً. المراقبة متوقفة.',
      });
    }

    const employee = todayRecord.employee;
    const settings = employee.company.systemSettings[0] || {
      enableWorkGeofenceMonitoring: true,
      geofenceExitConfirmationSeconds: 90,
      geofenceReturnConfirmationSeconds: 60,
      maxAcceptedGpsAccuracy: 30,
      accuracyMustBeWithinRadius: false,
      notifyEmployeeOnExit: true,
      notifyEmployeeOnReturn: true,
      notifyAdminOnExit: true,
      notifyAdminOnReturn: true,
    };

    if (!settings.enableWorkGeofenceMonitoring) {
      return NextResponse.json({ monitoringStatus: 'DISABLED' });
    }

    const authorizedBranches = [
      ...(employee.primaryBranch ? [employee.primaryBranch] : []),
      ...employee.employeeBranches.map((eb) => eb.branch),
    ];

    // 2. فحص النطاق الصارم بالـ Backend
    const geoResult = validateEmployeeLocation(
      latitude,
      longitude,
      accuracy || 15,
      settings.maxAcceptedGpsAccuracy,
      authorizedBranches,
      employee.allowOutsideBranch,
      settings.accuracyMustBeWithinRadius
    );

    // 3. التحقق من الأذونات المعتمدة (PermissionRequest APPROVED) لعدم تسجيل الخروج كـ مخالفة
    const now = new Date();
    const approvedPermission = await prisma.permissionRequest.findFirst({
      where: {
        employeeId: session.employeeId,
        date: todayDateStr,
        status: 'APPROVED',
      },
    });

    const isAuthorizedExit = !!approvedPermission;

    // 4. جلب سجل المخالفة القائم إن وجد
    const activeViolation = await prisma.geofenceViolation.findFirst({
      where: {
        employeeId: session.employeeId,
        attendanceRecordId: todayRecord.id,
        status: 'ACTIVE',
      },
    });

    if (!geoResult.isAllowed) {
      // الموظف خارج النطاق الصارم
      if (!activeViolation) {
        // إنشاء سجل مخالفة خروج جديد
        const newViolation = await prisma.geofenceViolation.create({
          data: {
            employeeId: session.employeeId,
            attendanceRecordId: todayRecord.id,
            branchId: geoResult.nearestBranch?.id,
            exitDetectedAt: now,
            exitLatitude: latitude,
            exitLongitude: longitude,
            maxDistanceMeters: geoResult.distanceMeters || 0,
            authorized: isAuthorizedExit,
            permissionRequestId: approvedPermission?.id || null,
            status: isAuthorizedExit ? 'AUTHORIZED' : 'ACTIVE',
          },
        });

        if (!isAuthorizedExit) {
          // إرسال إشعار للموظف
          if (settings.notifyEmployeeOnExit) {
            const empNotif = await prisma.notification.create({
              data: {
                employeeId: session.employeeId,
                title: '⚠️ تنبيه: لقد خرجت من نطاق موقع العمل',
                message: `تم رصد خروجك من نطاق الفرع (${geoResult.nearestBranch?.name}). المسافة: ${Math.round(
                  geoResult.distanceMeters || 0
                )} متر (النطاق: ${geoResult.nearestBranch?.geofenceRadius}m).`,
                type: 'WARNING',
              },
            });
            broadcastNotificationToUser(session.employeeId, empNotif);
          }

          // إرسال إشعار للإدارة والمدراء
          if (settings.notifyAdminOnExit) {
            const admins = await prisma.user.findMany({
              where: { role: { in: ['ADMIN', 'HR', 'SUPER_ADMIN', 'BRANCH_MANAGER'] } },
              include: { employee: true },
            });

            for (const adm of admins) {
              if (adm.employee) {
                const admNotif = await prisma.notification.create({
                  data: {
                    employeeId: adm.employee.id,
                    title: '⚠️ خروج موظف من نطاق العمل',
                    message: `رصد خروج الموظف ${employee.firstName} ${employee.lastName} من نطاق فرع ${geoResult.nearestBranch?.name} مسافة ${Math.round(
                      geoResult.distanceMeters || 0
                    )} متر بدون إذن.`,
                    type: 'URGENT',
                  },
                });
                broadcastNotificationToUser(adm.employee.id, admNotif);
              }
            }
          }
        }
      } else {
        // تحديث المسافة القصوى لسجل المخالفة القائم
        if ((geoResult.distanceMeters || 0) > activeViolation.maxDistanceMeters) {
          await prisma.geofenceViolation.update({
            where: { id: activeViolation.id },
            data: { maxDistanceMeters: geoResult.distanceMeters || 0 },
          });
        }
      }
    } else {
      // الموظف داخل النطاق
      if (activeViolation) {
        // تسجيل العودة
        const exitTime = new Date(activeViolation.exitDetectedAt).getTime();
        const durationMins = Math.round((now.getTime() - exitTime) / (1000 * 60));

        await prisma.geofenceViolation.update({
          where: { id: activeViolation.id },
          data: {
            returnDetectedAt: now,
            returnLatitude: latitude,
            returnLongitude: longitude,
            durationMinutes: durationMins,
            status: 'RETURNED',
          },
        });

        if (!activeViolation.authorized) {
          // إشعار عودة للموظف
          if (settings.notifyEmployeeOnReturn) {
            const empReturnNotif = await prisma.notification.create({
              data: {
                employeeId: session.employeeId,
                title: '✅ تم تسجيل عودتك إلى نطاق العمل',
                message: `شكراً لعودتك لنطاق الفرع. مدة التواجد خارج النطاق: ${durationMins} دقيقة.`,
                type: 'SUCCESS',
              },
            });
            broadcastNotificationToUser(session.employeeId, empReturnNotif);
          }

          // إشعار عودة للإدارة
          if (settings.notifyAdminOnReturn) {
            const admins = await prisma.user.findMany({
              where: { role: { in: ['ADMIN', 'HR', 'SUPER_ADMIN', 'BRANCH_MANAGER'] } },
              include: { employee: true },
            });

            for (const adm of admins) {
              if (adm.employee) {
                const admNotif = await prisma.notification.create({
                  data: {
                    employeeId: adm.employee.id,
                    title: '✅ عودة موظف إلى نطاق العمل',
                    message: `عاد الموظف ${employee.firstName} ${employee.lastName} إلى نطاق العمل بعد غياب دام ${durationMins} دقيقة.`,
                    type: 'INFO',
                  },
                });
                broadcastNotificationToUser(adm.employee.id, admNotif);
              }
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      geofenceStatus: geoResult.isAllowed ? 'INSIDE' : 'OUTSIDE',
      distanceMeters: geoResult.distanceMeters,
      accuracyMeters: accuracy,
      isAuthorizedExit,
    });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في معالجة نبضة الموقع الجغرافي' }, { status: 500 });
  }
}