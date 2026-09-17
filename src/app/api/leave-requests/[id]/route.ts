import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER'].includes(session.role)) {
      return NextResponse.json({ error: 'غير مصرح للقيام بهذا الإجراء' }, { status: 403 });
    }

    const body = await request.json();
    const { action, actionReason } = body; // action: 'APPROVED' | 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(action)) {
      return NextResponse.json({ error: 'إجراء غير صالح.' }, { status: 400 });
    }

    const leave = await prisma.leaveRequest.findUnique({
      where: { id: params.id },
      include: { employee: true, leaveType: true },
    });

    if (!leave) {
      return NextResponse.json({ error: 'طلب الإجازة غير موجود' }, { status: 404 });
    }

    if (leave.status === action) {
      return NextResponse.json({
        success: true,
        message: `طلب الإجازة معالج سابقاً بحالة: ${action === 'APPROVED' ? 'موافق عليه' : 'مرفوض'}`,
        leave,
      });
    }

    const updatedLeave = await prisma.leaveRequest.update({
      where: { id: leave.id },
      data: {
        status: action,
        actionByUserId: session.userId,
        actionReason: actionReason || null,
        actionAt: new Date(),
      },
    });

    // التأكد من عدم تكرار الإشعار للموظف خلال آخر 5 دقائق
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const existingNotif = await prisma.notification.findFirst({
      where: {
        employeeId: leave.employeeId,
        createdAt: { gte: fiveMinutesAgo },
        title: { contains: 'تحديث طلب الإجازة' },
      },
    });

    if (!existingNotif) {
      const leaveTypeName = leave.leaveType?.name || 'إجازة';
      const cleanLeaveType = leaveTypeName.startsWith('إجازة ') ? leaveTypeName.replace('إجازة ', '') : leaveTypeName;
      const startDateStr = leave.startDate.toISOString().slice(0, 10);
      const endDateStr = leave.endDate.toISOString().slice(0, 10);

      const message = action === 'APPROVED'
        ? `تمت الموافقة على طلب الإجازة (${cleanLeaveType}) للفترة من ${startDateStr} إلى ${endDateStr}.`
        : `تم رفض طلب الإجازة (${cleanLeaveType}) للفترة من ${startDateStr} إلى ${endDateStr}.`;

      await prisma.notification.create({
        data: {
          employeeId: leave.employeeId,
          title: `تحديث طلب الإجازة (${action === 'APPROVED' ? 'موافقة' : 'رفض'})`,
          message,
          type: action === 'APPROVED' ? 'SUCCESS' : 'WARNING',
        },
      });
    }

    // توثيق العملية في AuditLog
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: `LEAVE_${action}`,
        entity: 'LeaveRequest',
        entityId: leave.id,
        oldValue: JSON.stringify({ status: leave.status }),
        newValue: JSON.stringify({ status: action, actionReason }),
        reason: actionReason || `اتخاذ قرار ${action} بشأن طلب إجازة الموظف`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `تم ${action === 'APPROVED' ? 'الموافقة على' : 'رفض'} طلب الإجازة بنجاح`,
      leave: updatedLeave,
    });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في معالجة طلب الإجازة' }, { status: 500 });
  }
}
