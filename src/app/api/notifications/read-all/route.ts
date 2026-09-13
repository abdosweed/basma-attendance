import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    await prisma.notification.updateMany({
      where: {
        employeeId: session.employeeId,
        readAt: null,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: 'تم تعليم جميع الإشعارات كمقروءة.' });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في حديث الإشعارات' }, { status: 500 });
  }
}