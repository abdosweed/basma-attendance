import { NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getAuthenticatedUser();
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'HR', 'BRANCH_MANAGER', 'SUPERVISOR'].includes(session.role)) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    const todayDateStr = new Date().toISOString().split('T')[0];

    const employees = await prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      include: {
        primaryBranch: true,
        department: true,
        employeeShifts: { include: { shift: true } },
        attendanceRecords: {
          where: { date: todayDateStr },
        },
        breakRecords: {
          where: { status: 'ACTIVE' },
        },
      },
      orderBy: { firstName: 'asc' },
    });

    const liveList = employees.map((emp) => {
      const todayRec = emp.attendanceRecords[0] || null;
      const activeBreak = emp.breakRecords[0] || null;
      const shift = emp.employeeShifts[0]?.shift || null;

      let statusLabel = '🔴 غائب';
      let statusBadge = 'bg-red-100 text-red-700';

      if (activeBreak) {
        statusLabel = '🟠 في استراحة';
        statusBadge = 'bg-orange-100 text-orange-700';
      } else if (todayRec?.checkOutAt) {
        statusLabel = '⚪ غادر الموعد';
        statusBadge = 'bg-gray-100 text-gray-700';
      } else if (todayRec?.checkInAt) {
        if (todayRec.status === 'LATE') {
          statusLabel = '🟡 متأخر';
          statusBadge = 'bg-yellow-100 text-yellow-800';
        } else {
          statusLabel = '🟢 يعمل حالياً';
          statusBadge = 'bg-emerald-100 text-emerald-700';
        }
      }

      const workedMins = todayRec?.totalWorkedMinutes || 0;
      const hoursStr = `${Math.floor(workedMins / 60)} س ${workedMins % 60} د`;

      return {
        id: emp.id,
        employeeNumber: emp.employeeNumber,
        name: `${emp.firstName} ${emp.lastName}`,
        jobTitle: emp.jobTitle,
        department: emp.department?.name || 'غير محدد',
        branch: emp.primaryBranch?.name || 'الفرع الرئيسي',
        shiftName: shift?.name || 'صباحية',
        checkInTime: todayRec?.checkInAt
          ? new Date(todayRec.checkInAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
          : '—',
        checkOutTime: todayRec?.checkOutAt
          ? new Date(todayRec.checkOutAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
          : '—',
        statusLabel,
        statusBadge,
        workedHours: todayRec?.checkInAt ? hoursStr : '—',
        lateMinutes: todayRec?.lateMinutes || 0,
      };
    });

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      liveAttendance: liveList,
    });
  } catch (error) {
    return NextResponse.json({ error: 'خطأ في جلب شاشة الحضور المباشر' }, { status: 500 });
  }
}
