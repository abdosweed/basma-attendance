import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !session.employeeId) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const todayDateStr = new Date().toISOString().split('T')[0];

    const [employee, todayRecord, activeBreak, notifications] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: session.employeeId },
        include: {
          primaryBranch: true,
          company: { include: { systemSettings: true } },
          employeeBranches: { include: { branch: true } },
          employeeShifts: { include: { shift: true } },
        },
      }),
      prisma.attendanceRecord.findUnique({
        where: {
          employeeId_date: {
            employeeId: session.employeeId,
            date: todayDateStr,
          },
        },
      }),
      prisma.breakRecord.findFirst({
        where: { employeeId: session.employeeId, status: 'ACTIVE' },
      }),
      prisma.notification.findMany({
        where: { employeeId: session.employeeId, isRead: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    if (!employee) {
      return NextResponse.json({ error: 'الموظف غير موجود' }, { status: 404 });
    }

    const activeShift = employee.employeeShifts[0]?.shift || null;
    let statusText = '⚪ لم يسجل الحضور';
    let statusCode = 'NOT_CHECKED_IN';

    if (activeBreak) {
      statusText = '🟠 في استراحة';
      statusCode = 'ON_BREAK';
    } else if (todayRecord) {
      if (todayRecord.checkOutAt) {
        statusText = '⚪ تم تسجيل الانصراف';
        statusCode = 'CHECKED_OUT';
      } else if (todayRecord.checkInAt) {
        if (todayRecord.status === 'LATE') {
          statusText = '🟡 حاضر (متأخر)';
          statusCode = 'LATE';
        } else {
          statusText = '🟢 حاضر (يعمل حالياً)';
          statusCode = 'PRESENT';
        }
      }
    }

    return NextResponse.json({
      employee: {
        id: employee.id,
        name: `${employee.firstName} ${employee.lastName}`,
        employeeNumber: employee.employeeNumber,
        jobTitle: employee.jobTitle,
        primaryBranch: employee.primaryBranch,
        authorizedBranches: employee.employeeBranches.map((eb) => eb.branch),
        allowOutsideBranch: employee.allowOutsideBranch,
      },
      shift: activeShift,
      todayRecord,
      activeBreak,
      statusText,
      statusCode,
      notifications,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Fetch today error:', error);
    return NextResponse.json({ error: 'خطأ في جلب بيانات اليوم' }, { status: 500 });
  }
}
