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

    const updatedLeave = await prisma.leaveRequest.update({
      where: { id: leave.id },
      data: {
        status: action,
        actionByUserId: session.userId,
        actionReason: actionReason || null,
        actionAt: new Date(),
      },
    });

    // إنشاء إشعار للموظف
    const statusText = action === 'APPROVED' ? 'تمت الموافقة على' : 'تم رفض';
    await prisma.notification.create({
      data: {
        employeeId: leave.employeeId,
        title: `تحديث طلب الإجازة (${action === 'APPROVED' ? 'موافقة' : 'رفض'})`,
        message: `${statusText} طلب إجازتك الـ ${leave.leaveType.name} من ${leave.startDate.toISOString().slice(0, 10)} إلى ${leave.endDate.toISOString().slice(0, 10)}.`,
        type: action === 'APPROVED' ? 'SUCCESS' : 'WARNING',
      },
    });

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
