import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { id } = params;

    const notification = await prisma.notification.updateMany({
      where: {
        id,
        employeeId: session.employeeId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في تحديث الإشعار' }, { status: 500 });
  }
}