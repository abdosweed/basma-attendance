import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getVapidConfig } from '@/lib/vapid';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint, keys, platform, deviceId } = body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return NextResponse.json(
        { error: 'بيانات اشتراك الإشعارات غير مكتملة' },
        { status: 400 }
      )      ;
    }

    const userAgentHeader = req.headers.get('user-agent') || 'UNKNOWN';
    let clientPlatform = platform || 'UNKNOWN';
    if (clientPlatform === 'UNKNOWN') {
      if (/iPhone|iPad|iPod/i.test(userAgentHeader)) {
        clientPlatform = 'IOS_PWA';
      } else if (/Android/i.test(userAgentHeader)) {
        clientPlatform = 'ANDROID_PWA';
      } else {
        clientPlatform = 'DESKTOP';
      }
    }

    // Account Switching Protection:
    // If the endpoint is already registered under another user (or previous session),
    // update the record to associate exclusively with current logged in user.
    const subscription = await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        userId: currentUser.userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        platform: clientPlatform,
        userAgent: userAgentHeader,
        deviceId: deviceId || null,
        isActive: true,
        lastSeenAt: new Date(),
        revokedAt: null,
      },
      update: {
        userId: currentUser.userId, // Re-bind to current active user!
        p256dh: keys.p256dh,
        auth: keys.auth,
        platform: clientPlatform,
        userAgent: userAgentHeader,
        deviceId: deviceId || undefined,
        isActive: true,
        lastSeenAt: new Date(),
        revokedAt: null,
      },
    });

    console.log(`[PUSH_API] SUBSCRIPTION_CREATED for userId ${currentUser.userId} (${clientPlatform})`);

    return NextResponse.json({
      success: true,
      message: 'تم تفعيل اشتراك الإشعارات الفورية بنجاح',
      subscriptionId: subscription.id,
    });
  } catch (error: any) {
    console.error('[PUSH_API] Error subscribing to push:', error);
    return NextResponse.json(
      { error: 'تعذر حفظ اشتراك الإشعارات الفورية' },
      { status: 500 }
    );
  }
}
