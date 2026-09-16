import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getVapidConfig } from '@/lib/vapid';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const { publicKey } = getVapidConfig();

    const activeSubscriptionsCount = await prisma.pushSubscription.count({
      where: {
        userId: currentUser.userId,
        isActive: true,
      },
    });

    return NextResponse.json({
      vapidPublicKey: publicKey,
      isSubscribed: activeSubscriptionsCount > 0,
      activeSubscriptionsCount,
    });
  } catch (error: any) {
    console.error('[PUSH_API] Error getting push status:', error);
    return NextResponse.json(
      { error: 'تعذر جلب حالة الإشعارات' },
      { status: 500 }
    );
  }
}
