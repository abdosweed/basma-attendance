import webpush from 'web-push';
import { prisma } from '@/lib/prisma';
import { ensureVapidConfigured } from '@/lib/vapid';

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    url?: string;
    notificationId?: string;
    type?: string;
    [key: string]: any;
  };
}

/**
 * Mask endpoint URL for safe logging (hides sensitive subscription tokens)
 */
function maskEndpoint(endpoint: string): string {
  try {
    const url = new URL(endpoint);
    const host = url.hostname;
    const pathParts = url.pathname.split('/');
    const lastPart = pathParts[pathParts.length - 1] || '';
    const maskedPart = lastPart.length > 8 ? `${lastPart.substring(0, 4)}...${lastPart.substring(lastPart.length - 4)}` : '***';
    return `${url.protocol}//${host}/.../${maskedPart}`;
  } catch {
    return '***masked-endpoint***';
  }
}

/**
 * Sends a VAPID-authenticated Web Push notification to a specific subscription
 */
export async function sendPushToSubscription(
  subscriptionId: string,
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: PushNotificationPayload
): Promise<boolean> {
  const configured = ensureVapidConfigured();
  if (!configured) {
    console.warn('[PUSH_SERVICE] VAPID configuration unavailable. Skipping push dispatch.');
    return false;
  }

  const pushSubscription = {
    endpoint,
    keys: {
      p256dh,
      auth,
    },
  };

  const payloadString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/badge-72x72.png',
    tag: payload.tag || payload.data?.notificationId || `push-${Date.now()}`,
    data: {
      url: payload.data?.url || '/',
      notificationId: payload.data?.notificationId,
      type: payload.data?.type || 'SYSTEM_ALERT',
    },
  });

  try {
    await webpush.sendNotification(pushSubscription, payloadString);
    
    // Update lastSeenAt timestamp on success
    await prisma.pushSubscription.update({
      where: { id: subscriptionId },
      data: { lastSeenAt: new Date() },
    }).catch(() => {});

    console.log(`[PUSH_SERVICE] PUSH_SENT successfully to subscription: ${maskEndpoint(endpoint)}`);
    return true;
  } catch (error: any) {
    const statusCode = error?.statusCode;
    console.warn(`[PUSH_SERVICE] PUSH_FAILED for subscription ${maskEndpoint(endpoint)}. Status: ${statusCode || error.message}`);

    // If endpoint is no longer valid (410 Gone or 404 Not Found), deactivate subscription
    if (statusCode === 410 || statusCode === 404) {
      await invalidateSubscription(subscriptionId, `HTTP_${statusCode}_INVALID_ENDPOINT`);
    }

    return false;
  }
}

/**
 * Sends a VAPID-authenticated Web Push notification to all active subscriptions of a user
 */
export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ total: number; sent: number; failed: number }> {
  try {
    const activeSubscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    if (activeSubscriptions.length === 0) {
      return { total: 0, sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const sub of activeSubscriptions) {
      const success = await sendPushToSubscription(
        sub.id,
        sub.endpoint,
        sub.p256dh,
        sub.auth,
        payload
      );

      if (success) {
        sent++;
      } else {
        failed++;
      }
    }

    return { total: activeSubscriptions.length, sent, failed };
  } catch (error) {
    console.error(`[PUSH_SERVICE] Exception in sendPushToUser for userId ${userId}:`, error);
    // Push failures must never throw or interrupt core operations
    return { total: 0, sent: 0, failed: 0 };
  }
}

/**
 * Inactivates a push subscription when revoked or invalid
 */
export async function invalidateSubscription(subscriptionId: string, reason: string): Promise<void> {
  try {
    await prisma.pushSubscription.update({
      where: { id: subscriptionId },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });
    console.log(`[PUSH_SERVICE] SUBSCRIPTION_REVOKED [${subscriptionId}]: ${reason}`);
  } catch (error) {
    console.error(`[PUSH_SERVICE] Failed to invalidate subscription ${subscriptionId}:`, error);
  }
}
