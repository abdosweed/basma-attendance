import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAuthenticatedUser();
    if (!session) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    if (session.role === 'EMPLOYEE' && session.employeeId) {
      const corrections = await prisma.attendanceCorrectionRequest.findMany({
        where: { employeeId: session.employeeId },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ corrections });
    }

    const corrections = await prisma.attendanceCorrectionRequest.findMany({
      include: {
        employee: { include: { primaryBranch: true, department: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ corrections });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في جلب طلبات تصحيح البصمة' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json();
    const { date, proposedCheckIn, proposedCheckOut, reason } = body;

    if (!date || !reason) {
      return NextResponse.json({ error: 'يرجى تحديد التاريخ وسبب طلب تصحيح البصمة.' }, { status: 400 });
    }

    const correction = await prisma.attendanceCorrectionRequest.create({
      data: {
        employeeId: session.employeeId,
        date: date.slice(0, 10),
        proposedCheckIn: proposedCheckIn || null,
        proposedCheckOut: proposedCheckOut || null,
        reason: reason.trim(),
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'تم إرسال طلب تصحيح الحضور بنجاح للمراجعة الإدارية.',
      correction,
    });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في إرسال طلب التصحيح' }, { status: 500 });
  }
}
