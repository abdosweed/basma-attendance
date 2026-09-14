import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { evaluateDeviceTrust } from '@/lib/device';

export async function POST(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { deviceId, trustedDeviceId } = body;
    const userAgent = request.headers.get('user-agent') || '';
    const rawDevId = trustedDeviceId || deviceId || 'UNKNOWN_DEV';

    const empObj = await prisma.employee.findUnique({
      where: { id: session.employeeId },
      select: { companyId: true },
    });

    if (empObj) {
      const deviceEval = await evaluateDeviceTrust(
        session.employeeId,
        rawDevId,
        empObj.companyId,
        userAgent
      );

      if (!deviceEval.isAllowed) {
        return NextResponse.json(
          {
            error: deviceEval.reason || 'هذا الجهاز غير معتمد لإنهاء الاستراحة.',
            code: 'UNAUTHORIZED_DEVICE',
            deviceStatus: deviceEval.status,
          },
          { status: 403 }
        );
      }
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
