import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'الرابط الخاص بالإشعارات مطلوب' }, { status: 400 });
    }

    await prisma.pushSubscription.updateMany({
      where: {
        userId: currentUser.userId,
        endpoint,
      },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    console.log(`[PUSH_API] SUBSCRIPTION_REVOKED by userId ${currentUser.userId}`);

    return NextResponse.json({
      success: true,
      message: 'تم إلغاء تفعيل الإشعارات الفورية',
    });
  } catch (error: any) {
    console.error('[PUSH_API] Error unsubscribing from push:', error);
    return NextResponse.json(
      { error: 'تعذر إلغاء اشتراك الإشعارات' },
      { status: 500 }
    );
  }
}
