import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { broadcastNotificationToUser } from '@/lib/sse-notifications';
import { sendPushToUser } from '@/lib/push-notifications';

export const dynamic = 'force-dynamic';

// GET: جلب كافة الطلبات المعلقة (إجازات، استئذان ساعي، تصحيح بصمة، توثيق أجهزة)
export async function GET(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER', 'SUPERVISOR'].includes(session.role)) {
      return NextResponse.json({ error: 'غير مصرح للوصول لمركز الاعتماد.' }, { status: 403 });
    }

    let branchConstraint: any = {};
    if (session.role === 'BRANCH_MANAGER') {
      const managerEmp = await prisma.employee.findUnique({
        where: { userId: session.userId },
        select: { primaryBranchId: true },
      });
      if (managerEmp?.primaryBranchId) {
        branchConstraint = { primaryBranchId: managerEmp.primaryBranchId };
      }
    }

    // 1. طلبات الإجازات المعلقة LEAVE
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        status: 'PENDING',
        employee: branchConstraint,
      },
      include: {
        employee: {
          include: {
            department: true,
            primaryBranch: true,
          },
        },
        leaveType: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // 2. طلبات الاستئذان الساعي المعلقة HOURLY_PERMISSION
    const permissionRequests = await prisma.permissionRequest.findMany({
      where: {
        status: 'PENDING',
        employee: branchConstraint,
      },
      include: {
        employee: {
          include: {
            department: true,
            primaryBranch: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 3. طلبات تصحيح البصمة المعلقة CORRECTION
    const correctionRequests = await prisma.attendanceCorrectionRequest.findMany({
      where: {
        status: 'PENDING',
        employee: branchConstraint,
      },
      include: {
        employee: {
          include: {
            department: true,
            primaryBranch: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 4. طلبات توثيق الأجهزة المعلقة DEVICE
    const deviceRequests = await prisma.trustedDevice.findMany({
      where: {
        status: 'PENDING',
        employee: branchConstraint,
      },
      include: {
        employee: {
          include: {
            department: true,
            primaryBranch: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // تحويل البيانات لنموذج موحد
    const items = [
      ...leaveRequests.map((req) => ({
        id: req.id,
        category: 'LEAVE',
        employeeName: `${req.employee.firstName} ${req.employee.lastName}`,
        employeeId: req.employeeId,
        avatarUrl: req.employee.avatarUrl,
        jobTitle: req.employee.jobTitle || 'موظف',
        branchName: req.employee.primaryBranch?.name || 'الفرع الرئيسي',
        departmentName: req.employee.department?.name || 'عام',
        typeLabel: req.leaveType?.name || 'إجازة',
        details: `من ${req.startDate.toISOString().slice(0, 10)} إلى ${req.endDate.toISOString().slice(0, 10)}`,
        reason: req.reason,
        createdAt: req.createdAt,
      })),

      ...permissionRequests.map((req) => ({
        id: req.id,
        category: 'HOURLY_PERMISSION',
        employeeName: `${req.employee.firstName} ${req.employee.lastName}`,
        employeeId: req.employeeId,
        avatarUrl: req.employee.avatarUrl,
        jobTitle: req.employee.jobTitle || 'موظف',
        branchName: req.employee.primaryBranch?.name || 'الفرع الرئيسي',
        departmentName: req.employee.department?.name || 'عام',
        typeLabel: 'استئذان ساعي ⏱️',
        details: `بتاريخ ${req.date} من ${req.startTime} إلى ${req.endTime}`,
        reason: req.reason,
        createdAt: req.createdAt,
      })),

      ...correctionRequests.map((req) => ({
        id: req.id,
        category: 'CORRECTION',
        employeeName: `${req.employee.firstName} ${req.employee.lastName}`,
        employeeId: req.employeeId,
        avatarUrl: req.employee.avatarUrl,
        jobTitle: req.employee.jobTitle || 'موظف',
        branchName: req.employee.primaryBranch?.name || 'الفرع الرئيسي',
        departmentName: req.employee.department?.name || 'عام',
        typeLabel: 'تصحيح بصمة ✍️',
        details: `تاريخ ${req.date}${req.proposedCheckIn ? ` (دخول: ${req.proposedCheckIn})` : ''}${req.proposedCheckOut ? ` (خروج: ${req.proposedCheckOut})` : ''}`,
        reason: req.reason,
        createdAt: req.createdAt,
      })),

      ...deviceRequests.map((req) => ({
        id: req.id,
        category: 'DEVICE',
        employeeName: `${req.employee.firstName} ${req.employee.lastName}`,
        employeeId: req.employeeId,
        avatarUrl: req.employee.avatarUrl,
        jobTitle: req.employee.jobTitle || 'موظف',
        branchName: req.employee.primaryBranch?.name || 'الفرع الرئيسي',
        departmentName: req.employee.department?.name || 'عام',
        typeLabel: 'اعتماد جهاز 📱',
        details: `جهاز جديد: ${req.deviceName || req.platform || 'هاتف محمول'} (${req.os || req.browser || 'غير حدد'})`,
        reason: req.reviewNote || 'طلب اعتماد جهاز جديد لتسجيل البصمة',
        createdAt: req.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const counts = {
      total: items.length,
      leave: leaveRequests.length,
      hourlyPermission: permissionRequests.length,
      correction: correctionRequests.length,
      device: deviceRequests.length,
    };

    return NextResponse.json({
      items,
      counts,
    });
  } catch (error) {
    console.error('Fetch approvals error:', error);
    return NextResponse.json({ error: 'حدث خطأ في جلب طلبات الاعتماد.' }, { status: 500 });
  }
}

// POST / PATCH: معالجة قرار اعتماد أو رفض أي طلب موحد
export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER'].includes(session.role)) {
      return NextResponse.json({ error: 'غير مصرح لاتخاذ القرار.' }, { status: 403 });
    }

    const body = await request.json();
    const { id, category, action, actionReason } = body; // action: 'APPROVED' | 'REJECTED'

    if (!id || !category || !['APPROVED', 'REJECTED'].includes(action)) {
      return NextResponse.json({ error: 'بيانات الطلب غير صالحة.' }, { status: 400 });
    }

    const now = new Date();

    // 1. معالجة الإجازة LEAVE
    if (category === 'LEAVE') {
      const leave = await prisma.leaveRequest.findUnique({ where: { id }, include: { employee: true, leaveType: true } });
      if (!leave) return NextResponse.json({ error: 'طلب الإجازة غير موجود' }, { status: 404 });

      await prisma.leaveRequest.update({
        where: { id },
        data: {
          status: action,
          actionByUserId: session.userId,
          actionReason: actionReason || null,
          actionAt: now,
        },
      });

      const leaveTypeName = leave.leaveType?.name || 'إجازة';
      const cleanLeaveType = leaveTypeName.startsWith('إجازة ') ? leaveTypeName.replace('إجازة ', '') : leaveTypeName;
      const statusText = action === 'APPROVED' ? 'تمت الموافقة على' : 'تم رفض';

      const notif = await prisma.notification.create({
        data: {
          employeeId: leave.employeeId,
          title: `تحديث طلب الإجازة (${action === 'APPROVED' ? 'موافقة' : 'رفض'})`,
          message: `${statusText} طلب إجازتك الـ (${cleanLeaveType}) للفترة من ${leave.startDate.toISOString().slice(0, 10)} إلى ${leave.endDate.toISOString().slice(0, 10)}.${actionReason ? ` ملاحظة: ${actionReason}` : ''}`,
          type: action === 'APPROVED' ? 'SUCCESS' : 'WARNING',
        },
      });

      broadcastNotificationToUser(leave.employeeId, notif);
      sendPushToUser(leave.employee.userId, {
        title: `تحديث طلب الإجازة`,
        body: `${statusText} طلب إجازتك (${cleanLeaveType}).`,
        data: { url: '/', notificationId: notif.id },
      }).catch(() => {});

      return NextResponse.json({ success: true, message: `تم ${action === 'APPROVED' ? 'الموافقة على' : 'رفض'} طلب الإجازة.` });
    }

    // 2. معالجة الاستئذان الساعي HOURLY_PERMISSION
    if (category === 'HOURLY_PERMISSION') {
      const permission = await prisma.permissionRequest.findUnique({ where: { id }, include: { employee: true } });
      if (!permission) return NextResponse.json({ error: 'طلب الاستئذان غير موجود' }, { status: 404 });

      await prisma.permissionRequest.update({
        where: { id },
        data: {
          status: action,
          actionByUserId: session.userId,
          actionReason: actionReason || null,
        },
      });

      const statusText = action === 'APPROVED' ? 'تمت الموافقة على' : 'تم رفض';
      const notif = await prisma.notification.create({
        data: {
          employeeId: permission.employeeId,
          title: `تحديث طلب الاستئذان الساعي (${action === 'APPROVED' ? 'موافقة' : 'رفض'})`,
          message: `${statusText} طلب استئذانك الساعي لتاريخ ${permission.date} من ${permission.startTime} إلى ${permission.endTime}.${actionReason ? ` ملاحظة: ${actionReason}` : ''}`,
          type: action === 'APPROVED' ? 'SUCCESS' : 'WARNING',
        },
      });

      broadcastNotificationToUser(permission.employeeId, notif);
      sendPushToUser(permission.employee.userId, {
        title: `تحديث طلب الاستئذان`,
        body: `${statusText} طلب الاستئذان الساعي.`,
        data: { url: '/', notificationId: notif.id },
      }).catch(() => {});

      return NextResponse.json({ success: true, message: `تم ${action === 'APPROVED' ? 'الموافقة على' : 'رفض'} طلب الاستئذان الساعي.` });
    }

    // 3. معالجة تصحيح البصمة CORRECTION
    if (category === 'CORRECTION') {
      const correction = await prisma.attendanceCorrectionRequest.findUnique({ where: { id }, include: { employee: true } });
      if (!correction) return NextResponse.json({ error: 'طلب التصحيح غير موجود' }, { status: 404 });

      await prisma.$transaction(async (tx) => {
        await tx.attendanceCorrectionRequest.update({
          where: { id },
          data: {
            status: action,
            actionByUserId: session.userId,
            actionReason: actionReason || null,
          },
        });

        if (action === 'APPROVED') {
          const checkInDateObj = correction.proposedCheckIn
            ? new Date(`${correction.date}T${correction.proposedCheckIn}:00`)
            : undefined;
          const checkOutDateObj = correction.proposedCheckOut
            ? new Date(`${correction.date}T${correction.proposedCheckOut}:00`)
            : undefined;

          await tx.attendanceRecord.upsert({
            where: {
              employeeId_date: {
                employeeId: correction.employeeId,
                date: correction.date,
              },
            },
            update: {
              ...(checkInDateObj ? { checkInAt: checkInDateObj } : {}),
              ...(checkOutDateObj ? { checkOutAt: checkOutDateObj } : {}),
              notes: `تم التصحيح بموافقة الإدارة: ${correction.reason}`,
            },
            create: {
              employeeId: correction.employeeId,
              date: correction.date,
              checkInAt: checkInDateObj || new Date(),
              checkOutAt: checkOutDateObj || null,
              status: 'PRESENT',
              notes: `تم التصحيح بموافقة الإدارة: ${correction.reason}`,
            },
          });
        }

        const statusText = action === 'APPROVED' ? 'تمت الموافقة على' : 'تم رفض';
        const notif = await tx.notification.create({
          data: {
            employeeId: correction.employeeId,
            title: `تحديث طلب تصحيح البصمة (${action === 'APPROVED' ? 'موافقة' : 'رفض'})`,
            message: `${statusText} طلب تصحيح بصمتك لتاريخ ${correction.date}.${actionReason ? ` ملاحظة: ${actionReason}` : ''}`,
            type: action === 'APPROVED' ? 'SUCCESS' : 'WARNING',
          },
        });

        broadcastNotificationToUser(correction.employeeId, notif);
        sendPushToUser(correction.employee.userId, {
          title: `تحديث طلب تصحيح البصمة`,
          body: `${statusText} طلب تصحيح البصمة.`,
          data: { url: '/', notificationId: notif.id },
        }).catch(() => {});
      });

      return NextResponse.json({ success: true, message: `تم ${action === 'APPROVED' ? 'الموافقة على' : 'رفض'} طلب تصحيح البصمة.` });
    }

    // 4. معالجة توثيق الجهاز DEVICE
    if (category === 'DEVICE') {
      const device = await prisma.trustedDevice.findUnique({ where: { id }, include: { employee: true } });
      if (!device) return NextResponse.json({ error: 'طلب اعتماد الجهاز غير موجود' }, { status: 404 });

      const newStatus = action === 'APPROVED' ? 'APPROVED' : 'REVOKED';
      await prisma.trustedDevice.update({
        where: { id },
        data: {
          status: newStatus,
          isApproved: action === 'APPROVED',
          approvedAt: action === 'APPROVED' ? now : undefined,
          approvedBy: action === 'APPROVED' ? session.userId : undefined,
          rejectedAt: action === 'REJECTED' ? now : undefined,
          rejectedBy: action === 'REJECTED' ? session.userId : undefined,
          reviewNote: actionReason || null,
        },
      });

      const statusText = action === 'APPROVED' ? 'تم اعتماد' : 'تم رفض اعتماد';
      const notif = await prisma.notification.create({
        data: {
          employeeId: device.employeeId,
          title: action === 'APPROVED' ? '✅ تم اعتماد جهازك' : '❌ تم رفض اعتماد الجهاز',
          message: `${statusText} جهازك (${device.deviceName || 'المحمول'}) من قبل الإدارة.${actionReason ? ` ملاحظة: ${actionReason}` : ''}`,
          type: action === 'APPROVED' ? 'SUCCESS' : 'ERROR',
        },
      });

      broadcastNotificationToUser(device.employeeId, notif);
      sendPushToUser(device.employee.userId, {
        title: action === 'APPROVED' ? '✅ تم اعتماد جهازك' : '❌ تم رفض الجهاز',
        body: `${statusText} جهازك المحمول.`,
        data: { url: '/', notificationId: notif.id },
      }).catch(() => {});

      return NextResponse.json({ success: true, message: `تم ${action === 'APPROVED' ? 'اعتماد' : 'رفض'} الجهاز بنجاح.` });
    }

    return NextResponse.json({ error: 'تصنيف الطلب غير معروف' }, { status: 400 });
  } catch (error) {
    console.error('Process approval error:', error);
    return NextResponse.json({ error: 'حدث خطأ في معالجة طلب الاعتماد.' }, { status: 500 });
  }
}
