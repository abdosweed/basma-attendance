import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { notificationClients } from '@/lib/sse-notifications';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getAuthenticatedUser();
  if (!session || !session.employeeId) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const employeeId = session.employeeId;
  const lastEventId = request.headers.get('last-event-id');

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (data: any) => {
        try {
          const eventId = data.id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
          const eventType = data.type || 'notification';
          const payload = `id: ${eventId}\nevent: ${eventType}\ndata: ${JSON.stringify({ ...data, id: eventId })}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch (e) {
          // Controller might be closed
        }
      };

      if (!notificationClients.has(employeeId)) {
        notificationClients.set(employeeId, new Set());
      }
      notificationClients.get(employeeId)!.add(send);

      // Initial Connection Event
      send({ type: 'CONNECTED', message: 'مرحبًا! القناة حية ومباشرة.', timestamp: new Date().toISOString() });

      // Last-Event-ID Replay Support: If client reconnected with lastEventId, query unread notifications created recently
      if (lastEventId) {
        try {
          const missedNotifications = await prisma.notification.findMany({
            where: {
              employeeId: employeeId,
              readAt: null,
            },
            orderBy: { createdAt: 'asc' },
            take: 20,
          });

          for (const notif of missedNotifications) {
            send({
              id: notif.id,
              type: notif.type,
              title: notif.title,
              message: notif.message,
              createdAt: notif.createdAt,
              isReplay: true,
            });
          }
        } catch (err) {
          console.error('[SSE] Failed to replay missed notifications:', err);
        }
      }

      // Heartbeat ping interval every 15s to keep connection alive on Vercel Edge/Serverless
      const pingInterval = setInterval(() => {
        try {
          const pingPayload = `event: ping\ndata: ${JSON.stringify({ type: 'PING', timestamp: new Date().toISOString() })}\n\n`;
          controller.enqueue(encoder.encode(pingPayload));
        } catch (e) {
          clearInterval(pingInterval);
        }
      }, 15000);

      request.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        const userClients = notificationClients.get(employeeId);
        if (userClients) {
          userClients.delete(send);
          if (userClients.size === 0) {
            notificationClients.delete(employeeId);
          }
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}