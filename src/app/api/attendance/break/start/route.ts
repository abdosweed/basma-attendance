import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const todayDateStr = new Date().toISOString().split('T')[0];

    const todayRecord = await prisma.attendanceRecord.findUnique({
      where: {
        employeeId_date: {
          employeeId: session.employeeId,
          date: todayDateStr,
        },
      },
    });

    if (!todayRecord || !todayRecord.checkInAt || todayRecord.checkOutAt) {
      return NextResponse.json(
        { error: 'يجب تسجيل الحضور أولاً قبل بدء الاستراحة.' },
        { status: 400 }
      );
    }

    const existingActiveBreak = await prisma.breakRecord.findFirst({
      where: { employeeId: session.employeeId, status: 'ACTIVE' },
    });

    if (existingActiveBreak) {
      return NextResponse.json({ error: 'أنت في استراحة بالفعل حالياً.' }, { status: 400 });
    }

    const nowServerTime = new Date();

    const breakRecord = await prisma.breakRecord.create({
      data: {
        employeeId: session.employeeId,
        startTime: nowServerTime,
        status: 'ACTIVE',
      },
    });

    await prisma.attendanceRecord.update({
      where: { id: todayRecord.id },
      data: { status: 'ON_BREAK' },
    });

    await prisma.attendanceEvent.create({
      data: {
        employeeId: session.employeeId,
        type: 'BREAK_START',
        serverTimestamp: nowServerTime,
        latitude: 0,
        longitude: 0,
        accuracy: 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'تم بدء الاستراحة بنجاح',
      breakRecord,
    });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في بدء الاستراحة' }, { status: 500 });
  }
}
