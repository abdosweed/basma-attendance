import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { notificationClients } from '@/lib/sse-notifications';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await getAuthenticatedUser();
  if (!session || !session.employeeId) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
  }

  const employeeId = session.employeeId;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: any) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      if (!notificationClients.has(employeeId)) {
        notificationClients.set(employeeId, new Set());
      }
      notificationClients.get(employeeId)!.add(send);

      send({ type: 'CONNECTED', message: 'مرحبًا! القناة حية ومباشرة.' });

      request.signal.addEventListener('abort', () => {
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
    },
  });
}