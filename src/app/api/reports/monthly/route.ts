import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER'].includes(session.role)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7); // YYYY-MM

    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: {
        department: true,
        primaryBranch: true,
        attendanceRecords: {
          where: {
            date: { startsWith: month },
          },
        },
        leaveRequests: {
          where: {
            status: 'APPROVED',
          },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    const reportRows = employees.map((emp) => {
      const records = emp.attendanceRecords;

      const workingDays = 26; // أيام الدوام المفترضة بالشهريات
      const attendanceDays = records.filter((r) => r.checkInAt).length;
      const absenceDays = Math.max(0, workingDays - attendanceDays);

      let totalLateMins = 0;
      let totalWorkedMins = 0;
      let totalOvertimeMins = 0;

      for (const r of records) {
        totalLateMins += r.lateMinutes || 0;
        totalWorkedMins += r.totalWorkedMinutes || 0;
        totalOvertimeMins += r.overtimeMinutes || 0;
      }

      const workedHoursStr = `${Math.floor(totalWorkedMins / 60)}س ${totalWorkedMins % 60}د`;
      const overtimeStr = `${Math.floor(totalOvertimeMins / 60)}س ${totalOvertimeMins % 60}د`;
      const lateStr = `${Math.floor(totalLateMins / 60)}س ${totalLateMins % 60}د`;

      return {
        id: emp.id,
        employeeNumber: emp.employeeNumber,
        name: `${emp.firstName} ${emp.lastName}`,
        department: emp.department?.name || '—',
        branch: emp.primaryBranch?.name || '—',
        workingDays,
        attendanceDays,
        absenceDays,
        totalLateMins,
        lateStr,
        totalWorkedMins,
        workedHoursStr,
        totalOvertimeMins,
        overtimeStr,
      };
    });

    return NextResponse.json({
      month,
      monthName: new Date(`${month}-01`).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' }),
      reportRows,
    });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في توليد التقرير الشهري' }, { status: 500 });
  }
}
