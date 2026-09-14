import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const activeBreak = await prisma.breakRecord.findFirst({
      where: { employeeId: session.employeeId, status: 'ACTIVE' },
    });

    if (!activeBreak) {
      return NextResponse.json({ error: 'لا يوجد استراحة جارية إنهائها.' }, { status: 400 });
    }

    const nowServerTime = new Date();
    const durationMinutes = Math.floor(
      (nowServerTime.getTime() - activeBreak.startTime.getTime()) / (1000 * 60)
    );

    // جلب الوردية لمعرفة الاستراحة المسموحة
    const emp = await prisma.employee.findUnique({
      where: { id: session.employeeId },
      include: { employeeShifts: { include: { shift: true } } },
    });

    const allowedMins = emp?.employeeShifts[0]?.shift?.maxBreakMins || 60;
    const excessMinutes = durationMinutes > allowedMins ? durationMinutes - allowedMins : 0;

    const updatedBreak = await prisma.breakRecord.update({
      where: { id: activeBreak.id },
      data: {
        endTime: nowServerTime,
        durationMinutes,
        excessMinutes,
        status: 'COMPLETED',
      },
    });

    const todayDateStr = nowServerTime.toISOString().split('T')[0];
    const todayRecord = await prisma.attendanceRecord.findUnique({
      where: {
        employeeId_date: {
          employeeId: session.employeeId,
          date: todayDateStr,
        },
      },
    });

    if (todayRecord) {
      const newTotalBreakMins = todayRecord.totalBreakMinutes + durationMinutes;
      await prisma.attendanceRecord.update({
        where: { id: todayRecord.id },
        data: {
          totalBreakMinutes: newTotalBreakMins,
          status: todayRecord.lateMinutes > 0 ? 'LATE' : 'PRESENT',
        },
      });
    }

    await prisma.attendanceEvent.create({
      data: {
        employeeId: session.employeeId,
        type: 'BREAK_END',
        serverTimestamp: nowServerTime,
        latitude: 0,
        longitude: 0,
        accuracy: 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'تم إنهاء الاستراحة بنجاح',
      durationMinutes,
      excessMinutes,
      breakRecord: updatedBreak,
    });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في إنهاء الاستراحة' }, { status: 500 });
  }
}
