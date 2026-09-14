import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { broadcastNotificationToUser } from '@/lib/sse-notifications';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER'].includes(session.role)) {
      return NextResponse.json({ error: 'ليس لديك صلاحية لإدارة أو اعتماد الأجهزة.' }, { status: 403 });
    }

    const deviceIdParam = params.id;
    const body = await request.json().catch(() => ({}));
    const { action, reviewNote, forceApprove } = body; // APPROVE, REPLACE, REJECT, REVOKE, REVOKE_ALL, BLOCK

    if (!action || !['APPROVE', 'REPLACE', 'REJECT', 'REVOKE', 'REVOKE_ALL', 'BLOCK'].includes(action)) {
      return NextResponse.json({ error: 'الإجراء المطلوب غير صالح.' }, { status: 400 });
    }

    const targetDevice = await prisma.trustedDevice.findUnique({
      where: { id: deviceIdParam },
      include: {
        employee: {
          include: {
            company: {
              include: { systemSettings: true },
            },
          },
        },
      },
    });

    if (!targetDevice && action !== 'REVOKE_ALL') {
      return NextResponse.json({ error: 'الجهاز المطلوب غير موجود.' }, { status: 404 });
    }

    // التحقق من صلاحية مدير الفرع (BRANCH_MANAGER)
    if (session.role === 'BRANCH_MANAGER' && targetDevice) {
      const managerEmp = await prisma.employee.findUnique({
        where: { userId: session.userId },
        select: { primaryBranchId: true },
      });

      if (managerEmp?.primaryBranchId && targetDevice.employee.primaryBranchId !== managerEmp.primaryBranchId) {
        return NextResponse.json({ error: 'ليس لديك صلاحية لإدارة أجهزة موظفي الفروع الأخرى.' }, { status: 403 });
      }
    }

    // منع الاعتماد الذاتي (حتى لو كان المسند أدمن ويحاول اعتماد جهازه الشخصي بدون تفويض)
    if (targetDevice && targetDevice.employee.userId === session.userId && session.role === 'EMPLOYEE') {
      return NextResponse.json({ error: 'لا يمكنك اعتماد جهازك الخاص بحساب موظف.' }, { status: 403 });
    }

    const now = new Date();
    const oldStatus = targetDevice?.status || 'UNKNOWN';

    // 1. إجراء استبدال الجهاز الرئيسي (REPLACE - Atomic Transaction)
    if ((action === 'REPLACE' || action === 'APPROVE') && targetDevice) {
      const companySettings = targetDevice.employee.company.systemSettings[0];
      const policy = companySettings?.trustedDevicesPolicy || 'ALLOW_MULTIPLE';

      const existingApprovedDevice = await prisma.trustedDevice.findFirst({
        where: {
          employeeId: targetDevice.employeeId,
          status: 'APPROVED',
          id: { not: targetDevice.id },
        },
      });

      // إذا كانت السياسة ONE_DEVICE_ONLY أو وجد جهاز معتمد سابق ولم يتم تأكيد الاستبدال الصريح
      if (existingApprovedDevice && policy === 'ONE_DEVICE_ONLY' && action === 'APPROVE' && !forceApprove) {
        return NextResponse.json({
          requiresReplacement: true,
          existingApprovedDevice: {
            id: existingApprovedDevice.id,
            deviceName: existingApprovedDevice.deviceName,
            approvedAt: existingApprovedDevice.approvedAt,
          },
          message: 'الموظف لديه جهاز رئيسي معتمد بالفعل. يلزم تأكيد استبدال الجهاز القديم.',
        }, { status: 409 });
      }

      if (existingApprovedDevice && (action === 'REPLACE' || forceApprove)) {
        await prisma.$transaction([
          // إلغاء اعتماد الجهاز القديم
          prisma.trustedDevice.updateMany({
            where: { employeeId: targetDevice.employeeId, id: { not: targetDevice.id } },
            data: {
              status: 'REVOKED',
              isApproved: false,
              revokedAt: now,
              revokedBy: session.userId,
              reviewNote: reviewNote || 'تم إلغاء الاعتماد بسبب استبدال الجهاز الرئيسي',
            },
          }),
          // اعتماد الجهاز الجديد كـ APPROVED
          prisma.trustedDevice.update({
            where: { id: targetDevice.id },
            data: {
              status: 'APPROVED',
              isApproved: true,
              approvedAt: now,
              approvedBy: session.userId,
              reviewNote: reviewNote || null,
            },
          }),
        ]);

        // إرسال إشعارات لحظية للموظف
        try {
          const notifNew = await prisma.notification.create({
            data: {
              employeeId: targetDevice.employeeId,
              title: '✅ تم اعتماد جهازك الجديد',
              message: `تم اعتماد جهازك الجديد (${targetDevice.deviceName || 'المعتمد'}) كجهاز رئيسي، وإلغاء اعتماد الجهاز السابق.`,
              type: 'SUCCESS',
            },
          });
          broadcastNotificationToUser(targetDevice.employeeId, notifNew);
        } catch (e) {}

        await prisma.auditLog.create({
          data: {
            userId: session.userId,
            action: 'DEVICE_REPLACED',
            entity: 'TrustedDevice',
            entityId: targetDevice.id,
            oldValue: JSON.stringify({ oldStatus, oldApprovedDeviceId: existingApprovedDevice.id }),
            newValue: JSON.stringify({
              newStatus: 'APPROVED',
              employeeId: targetDevice.employeeId,
              approvedDeviceId: targetDevice.id,
              performedBy: session.userId,
              reviewNote,
            }),
          },
        });

        return NextResponse.json({
          success: true,
          message: `تم استبدال واعتماد الجهاز الجديد كجهاز رئيسي للموظف (${targetDevice.employee.firstName}) بنجاح.`,
          deviceStatus: 'APPROVED',
        });
      }
    }

    // 2. إجراء اعتماد الجهاز العادي (APPROVE)
    if (action === 'APPROVE' && targetDevice) {
      const updated = await prisma.trustedDevice.update({
        where: { id: targetDevice.id },
        data: {
          status: 'APPROVED',
          isApproved: true,
          approvedAt: now,
          approvedBy: session.userId,
          reviewNote: reviewNote || null,
        },
      });

      try {
        const notif = await prisma.notification.create({
          data: {
            employeeId: targetDevice.employeeId,
            title: '✅ تم اعتماد جهازك',
            message: `يمكنك الآن استخدام هذا الجهاز (${targetDevice.deviceName || 'المعروف'}) لتسجيل الحضور والانصراف.`,
            type: 'SUCCESS',
          },
        });
        broadcastNotificationToUser(targetDevice.employeeId, notif);
      } catch (e) {}

      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: 'DEVICE_APPROVED',
          entity: 'TrustedDevice',
          entityId: targetDevice.id,
          oldValue: JSON.stringify({ oldStatus }),
          newValue: JSON.stringify({
            newStatus: 'APPROVED',
            employeeId: targetDevice.employeeId,
            performedBy: session.userId,
            reviewNote,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: `تم اعتماد الجهاز للموظف (${targetDevice.employee.firstName}) بنجاح.`,
        device: updated,
        deviceStatus: 'APPROVED',
      });
    }

    // 3. إجراء رفض الجهاز (REJECT)
    if (action === 'REJECT' && targetDevice) {
      const updated = await prisma.trustedDevice.update({
        where: { id: targetDevice.id },
        data: {
          status: 'REVOKED',
          isApproved: false,
          rejectedAt: now,
          rejectedBy: session.userId,
          reviewNote: reviewNote || 'تم رفض طلب اعتماد الجهاز من قبل الإدارة',
        },
      });

      try {
        const notif = await prisma.notification.create({
          data: {
            employeeId: targetDevice.employeeId,
            title: '❌ تم رفض اعتماد الجهاز',
            message: `تم رفض طلب اعتماد هذا الجهاز (${targetDevice.deviceName || 'الجهاز'}). ${reviewNote ? `ملاحظة الإدارة: ${reviewNote}` : ''}`,
            type: 'ERROR',
          },
        });
        broadcastNotificationToUser(targetDevice.employeeId, notif);
      } catch (e) {}

      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: 'DEVICE_REJECTED',
          entity: 'TrustedDevice',
          entityId: targetDevice.id,
          oldValue: JSON.stringify({ oldStatus }),
          newValue: JSON.stringify({
            newStatus: 'REVOKED',
            employeeId: targetDevice.employeeId,
            performedBy: session.userId,
            reviewNote,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: `تم رفض اعتماد الجهاز بنجاح.`,
        device: updated,
        deviceStatus: 'REVOKED',
      });
    }

    // 4. إجراء إلغاء اعتماد كافة أجهزة الموظف (REVOKE_ALL)
    if (action === 'REVOKE_ALL') {
      const targetEmpId = body.employeeId || targetDevice?.employeeId;
      if (!targetEmpId) {
        return NextResponse.json({ error: 'رقم الموظف مطلوب لإلغاء كافة الأجهزة.' }, { status: 400 });
      }

      await prisma.trustedDevice.updateMany({
        where: { employeeId: targetEmpId },
        data: {
          status: 'REVOKED',
          isApproved: false,
          revokedAt: now,
          revokedBy: session.userId,
          reviewNote: reviewNote || 'تم إلغاء جميع الأجهزة المعتمدة للموظف',
        },
      });

      try {
        const notif = await prisma.notification.create({
          data: {
            employeeId: targetEmpId,
            title: '⚠️ تم إلغاء اعتماد كافة أجهزتك',
            message: 'تم إلغاء اعتماد جميع الأجهزة الخاصة بك. يرجى مراجعة الإدارة لتقديم طلب جديد.',
            type: 'WARNING',
          },
        });
        broadcastNotificationToUser(targetEmpId, notif);
      } catch (e) {}

      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: 'ALL_DEVICES_REVOKED',
          entity: 'Employee',
          entityId: targetEmpId,
          newValue: JSON.stringify({
            employeeId: targetEmpId,
            performedBy: session.userId,
            reviewNote,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'تم إلغاء اعتماد كافة الأجهزة المرتبطة بالموظف بنجاح.',
      });
    }

    // 5. إجراء حظر الجهاز (BLOCK)
    if (action === 'BLOCK' && targetDevice) {
      const updated = await prisma.trustedDevice.update({
        where: { id: targetDevice.id },
        data: {
          status: 'BLOCKED',
          isApproved: false,
          revokedAt: now,
          revokedBy: session.userId,
          reviewNote: reviewNote || 'تم حظر الجهاز من قبل الإدارة',
        },
      });

      try {
        const notif = await prisma.notification.create({
          data: {
            employeeId: targetDevice.employeeId,
            title: '🚫 تم حظر الجهاز',
            message: `تم حظر استخدام هذا الجهاز (${targetDevice.deviceName || 'الجهاز'}) نهائياً من تسجيل الحضور.`,
            type: 'ERROR',
          },
        });
        broadcastNotificationToUser(targetDevice.employeeId, notif);
      } catch (e) {}

      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: 'DEVICE_BLOCKED',
          entity: 'TrustedDevice',
          entityId: targetDevice.id,
          oldValue: JSON.stringify({ oldStatus }),
          newValue: JSON.stringify({
            newStatus: 'BLOCKED',
            employeeId: targetDevice.employeeId,
            performedBy: session.userId,
            reviewNote,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'تم حظر الجهاز بنجاح.',
        device: updated,
        deviceStatus: 'BLOCKED',
      });
    }

    // الإجراء الافتراضي: REVOKE (إلغاء الاعتماد)
    if (targetDevice) {
      const updated = await prisma.trustedDevice.update({
        where: { id: targetDevice.id },
        data: {
          status: 'REVOKED',
          isApproved: false,
          revokedAt: now,
          revokedBy: session.userId,
          reviewNote: reviewNote || 'تم إلغاء الاعتماد من قبل الإدارة',
        },
      });

      try {
        const notif = await prisma.notification.create({
          data: {
            employeeId: targetDevice.employeeId,
            title: '⚠️ تم إلغاء اعتماد جهازك',
            message: `تم إلغاء اعتماد جهازك (${targetDevice.deviceName || 'الجهاز'}) من قبل الإدارة.`,
            type: 'WARNING',
          },
        });
        broadcastNotificationToUser(targetDevice.employeeId, notif);
      } catch (e) {}

      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: 'DEVICE_REVOKED',
          entity: 'TrustedDevice',
          entityId: targetDevice.id,
          oldValue: JSON.stringify({ oldStatus }),
          newValue: JSON.stringify({
            newStatus: 'REVOKED',
            employeeId: targetDevice.employeeId,
            performedBy: session.userId,
            reviewNote,
          }),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'تم إلغاء اعتماد الجهاز بنجاح.',
        device: updated,
        deviceStatus: 'REVOKED',
      });
    }

    return NextResponse.json({ error: 'لم يتم تنفيذ الإجراء.' }, { status: 400 });
  } catch (error: any) {
    console.error('Device action error:', error);
    return NextResponse.json({ error: 'حدث خطأ في السيرفر أثناء تنفيذ إجراء الجهاز.' }, { status: 500 });
  }
}
