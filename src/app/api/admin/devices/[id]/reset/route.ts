import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST: فك اقتران هاتف الموظف أو تعديل حالة الاعتماد
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER'].includes(session.role)) {
      return NextResponse.json({ error: 'غير مصرح لفك اقتران الجهاز' }, { status: 403 });
    }

    const deviceIdParam = params.id;
    const body = await request.json().catch(() => ({}));
    const action = body.action || 'DELETE'; // DELETE or TOGGLE_APPROVAL

    const targetDevice = await prisma.trustedDevice.findUnique({
      where: { id: deviceIdParam },
      include: { employee: true },
    });

    if (!targetDevice) {
      return NextResponse.json({ error: 'الجهاز المعتمد غير موجود' }, { status: 404 });
    }

    if (action === 'TOGGLE_APPROVAL') {
      const updated = await prisma.trustedDevice.update({
        where: { id: targetDevice.id },
        data: { isApproved: !targetDevice.isApproved },
      });

      await prisma.auditLog.create({
        data: {
          userId: session.userId,
          action: 'TOGGLE_DEVICE_APPROVAL',
          entity: 'TrustedDevice',
          entityId: targetDevice.id,
          reason: `تعديل حالة اعتماد هاتف الموظف (${targetDevice.employee.firstName}): ${updated.isApproved ? 'معتمد' : 'محظور'}`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `تم ${updated.isApproved ? 'اعتماد' : 'حظر'} الجهاز بنجاح`,
        device: updated,
      });
    }

    // Default action: DELETE / UNBIND device
    await prisma.trustedDevice.delete({
      where: { id: targetDevice.id },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: 'UNBIND_TRUSTED_DEVICE',
        entity: 'TrustedDevice',
        entityId: targetDevice.id,
        reason: `فك اقتران هاتف الموظف (${targetDevice.employee.firstName}) لتمكينه من ربط هاتف جديد`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `تم فك اقتران هاتف الموظف (${targetDevice.employee.firstName}) بنجاح. يمكنه الآن تسجيل الحضور من هاتفه الجديد.`,
    });
  } catch (error) {
    console.error('Reset device error:', error);
    return NextResponse.json({ error: 'حدث خطأ أثناء فك اقتران الجهاز' }, { status: 500 });
  }
}
