import { prisma } from '@/lib/prisma';
import { getTripoliDateString, getTripoliDayOfWeek, getTripoliTimeString } from './attendance-day';
import { calculateLateMinutes, calculateWorkAndBreakMetrics, ShiftInfo } from './metrics';
import { ScopedReportingFilter } from './permissions';

export interface PayrollReportFilters {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  branchId?: string;
  employeeId?: string;
  status?: string;   // ALL, PRESENT, LATE, ABSENT, ON_LEAVE
  search?: string;
}

export interface PayrollRow {
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  branchName: string;
  departmentName: string;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  workedHoursStr: string;
  workedMinutes: number;
  lateMinutes: number;
  overtimeHoursStr: string;
  overtimeMinutes: number;
  status: string;
  statusLabel: string;
  notes: string;
}

export interface PayrollSummaryKPI {
  totalWorkedHours: string;
  totalWorkedMinutes: number;
  totalLateMinutes: number;
  totalOvertimeHours: string;
  totalOvertimeMinutes: number;
  totalAbsenceDays: number;
  totalLeaveDays: number;
  totalRecordsCount: number;
}

export interface PayrollReportResult {
  summary: PayrollSummaryKPI;
  rows: PayrollRow[];
  appliedFilters: PayrollReportFilters;
}

/**
 * Helper to generate all dates YYYY-MM-DD between startDate and endDate
 */
function getDatesInRange(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const curr = new Date(`${startDateStr}T00:00:00Z`);
  const end = new Date(`${endDateStr}T00:00:00Z`);

  while (curr <= end) {
    dates.push(curr.toISOString().slice(0, 10));
    curr.setUTCDate(curr.getUTCDate() + 1);
  }
  return dates;
}

/**
 * Phase 15 Core Payroll & Advanced Attendance Reporting Engine
 */
export async function calculatePayrollReport(
  scope: ScopedReportingFilter,
  filters: PayrollReportFilters
): Promise<PayrollReportResult> {
  if (scope.isForbidden) {
    return {
      summary: {
        totalWorkedHours: '0س 0د',
        totalWorkedMinutes: 0,
        totalLateMinutes: 0,
        totalOvertimeHours: '0س 0د',
        totalOvertimeMinutes: 0,
        totalAbsenceDays: 0,
        totalLeaveDays: 0,
        totalRecordsCount: 0,
      },
      rows: [],
      appliedFilters: filters,
    };
  }

  const startDateStr = filters.startDate;
  const endDateStr = filters.endDate;
  const dates = getDatesInRange(startDateStr, endDateStr);

  const startUtc = new Date(`${startDateStr}T00:00:00Z`);
  const endUtc = new Date(`${endDateStr}T23:59:59Z`);

  // Build employee query condition
  const employeeWhere: any = {
    companyId: scope.companyId,
    status: 'ACTIVE',
  };

  if (scope.employeeIds?.length) employeeWhere.id = { in: scope.employeeIds };
  if (scope.branchIds?.length) employeeWhere.primaryBranchId = { in: scope.branchIds };
  if (filters.branchId && filters.branchId !== 'ALL') {
    employeeWhere.primaryBranchId = filters.branchId;
  }
  if (filters.employeeId && filters.employeeId !== 'ALL') {
    employeeWhere.id = filters.employeeId;
  }
  if (filters.search) {
    employeeWhere.OR = [
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
      { employeeNumber: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const employees = await prisma.employee.findMany({
    where: employeeWhere,
    include: {
      department: true,
      primaryBranch: true,
      employeeShifts: {
        where: { endDate: null },
        include: { shift: true },
        take: 1,
      },
      attendanceRecords: {
        where: {
          date: { gte: startDateStr, lte: endDateStr },
        },
      },
      leaveRequests: {
        where: {
          status: 'APPROVED',
          startDate: { lte: endUtc },
          endDate: { gte: startUtc },
        },
        include: { leaveType: true },
      },
      permissionRequests: {
        where: {
          status: 'APPROVED',
          date: { gte: startDateStr, lte: endDateStr },
        },
      },
    },
    orderBy: { firstName: 'asc' },
  });

  const holidays = await prisma.holiday.findMany({
    where: {
      companyId: scope.companyId,
      startDate: { lte: endUtc },
      endDate: { gte: startUtc },
    },
  });

  const rows: PayrollRow[] = [];
  let totalWorkedMinsSum = 0;
  let totalLateMinsSum = 0;
  let totalOvertimeMinsSum = 0;
  let totalAbsenceDaysSum = 0;
  let totalLeaveDaysSum = 0;

  for (const emp of employees) {
    const shift = emp.employeeShifts[0]?.shift as ShiftInfo | undefined;
    const branchName = emp.primaryBranch?.name || 'الفرع الرئيسي';
    const deptName = emp.department?.name || 'عام';
    const empName = `${emp.firstName} ${emp.lastName}`;

    for (const dateStr of dates) {
      const dateObj = new Date(`${dateStr}T12:00:00Z`);
      const dayOfWeek = getTripoliDayOfWeek(dateObj);

      // 1. Check Attendance Record
      const record = emp.attendanceRecords.find((r) => r.date === dateStr);

      // 2. Check Approved Leaves
      const activeLeave = emp.leaveRequests.find((l) => {
        const lStart = getTripoliDateString(new Date(l.startDate));
        const lEnd = getTripoliDateString(new Date(l.endDate));
        return dateStr >= lStart && dateStr <= lEnd;
      });

      // 3. Check Hourly Permissions
      const activePermission = emp.permissionRequests.find((p) => p.date === dateStr);

      // 4. Check Holidays
      const isHoliday = holidays.some((h) => {
        const hStart = getTripoliDateString(new Date(h.startDate));
        const hEnd = getTripoliDateString(new Date(h.endDate));
        return dateStr >= hStart && dateStr <= hEnd;
      });

      let status = 'ABSENT';
      let statusLabel = 'غائب';
      let workedMins = 0;
      let lateMins = 0;
      let overtimeMins = 0;
      let checkInStr: string | null = null;
      let checkOutStr: string | null = null;
      let notes = '';

      if (record) {
        checkInStr = record.checkInAt ? getTripoliTimeString(record.checkInAt) : null;
        checkOutStr = record.checkOutAt ? getTripoliTimeString(record.checkOutAt) : null;

        if (record.checkInAt && shift) {
          lateMins = calculateLateMinutes({
            actualCheckIn: record.checkInAt,
            scheduledStartTime: shift.startTime,
            gracePeriodMins: shift.gracePeriodMins,
            dateStr,
          });
        }

        if (record.checkInAt && record.checkOutAt) {
          const metrics = calculateWorkAndBreakMetrics({
            checkInAt: record.checkInAt,
            checkOutAt: record.checkOutAt,
            totalBreakMinutes: record.totalBreakMinutes || 0,
            allowedBreakMinutes: shift?.maxBreakMins || 0,
            shiftType: shift?.type || 'FIXED',
            requiredHours: shift?.requiredHours || 8.0,
          });

          workedMins = metrics.netWorkedMinutes || 0;
          overtimeMins = metrics.potentialOvertimeMinutes || 0;
        }

        if (lateMins > 0) {
          status = 'LATE';
          statusLabel = 'متأخر';
        } else if (record.checkInAt) {
          status = 'PRESENT';
          statusLabel = 'حاضر';
        } else {
          status = 'INCOMPLETE_ATTENDANCE';
          statusLabel = 'بصمة غير مكتملة';
        }

        if (record.notes) {
          notes = record.notes;
        }
      } else if (activeLeave) {
        status = 'ON_LEAVE';
        statusLabel = 'إجازة معتمدة';
        notes = `إجازة: ${activeLeave.leaveType?.name || 'معتمدة'} - ${activeLeave.reason}`;
        totalLeaveDaysSum++;
      } else if (isHoliday) {
        status = 'HOLIDAY';
        statusLabel = 'عطلة رسمية';
        notes = 'عطلة رسمية معتمدة';
      } else {
        // No record and no leave: Check if shift is active on this day
        const isOffDay = shift?.workingDays ? !shift.workingDays.includes(dayOfWeek) : false;
        if (isOffDay) {
          status = 'OFF_DAY';
          statusLabel = 'عطلة أسبوعية';
        } else {
          status = 'ABSENT';
          statusLabel = 'غائب غير مبرر';
          totalAbsenceDaysSum++;
        }
      }

      if (activePermission) {
        const permText = `استئذان ساعي معتمد (${activePermission.startTime} - ${activePermission.endTime})`;
        notes = notes ? `${notes} | ${permText}` : permText;
      }

      // Status filter check
      if (filters.status && filters.status !== 'ALL') {
        if (filters.status === 'PRESENT' && !['PRESENT', 'LATE'].includes(status)) continue;
        if (filters.status === 'LATE' && status !== 'LATE') continue;
        if (filters.status === 'ABSENT' && status !== 'ABSENT') continue;
        if (filters.status === 'ON_LEAVE' && status !== 'ON_LEAVE') continue;
      }

      totalWorkedMinsSum += workedMins;
      totalLateMinsSum += lateMins;
      totalOvertimeMinsSum += overtimeMins;

      const workedHours = Math.floor(workedMins / 60);
      const workedRemMins = workedMins % 60;
      const workedHoursStr = workedMins > 0 ? `${workedHours}س ${workedRemMins}د` : '0س';

      const overtimeHours = Math.floor(overtimeMins / 60);
      const overtimeRemMins = overtimeMins % 60;
      const overtimeHoursStr = overtimeMins > 0 ? `${overtimeHours}س ${overtimeRemMins}د` : '0س';

      rows.push({
        employeeId: emp.id,
        employeeNumber: emp.employeeNumber,
        employeeName: empName,
        branchName,
        departmentName: deptName,
        date: dateStr,
        checkInAt: checkInStr,
        checkOutAt: checkOutStr,
        workedHoursStr,
        workedMinutes: workedMins,
        lateMinutes: lateMins,
        overtimeHoursStr,
        overtimeMinutes: overtimeMins,
        status,
        statusLabel,
        notes,
      });
    }
  }

  const totalWorkedH = Math.floor(totalWorkedMinsSum / 60);
  const totalWorkedRem = totalWorkedMinsSum % 60;
  const totalOvertimeH = Math.floor(totalOvertimeMinsSum / 60);
  const totalOvertimeRem = totalOvertimeMinsSum % 60;

  return {
    summary: {
      totalWorkedHours: `${totalWorkedH}س ${totalWorkedRem}د`,
      totalWorkedMinutes: totalWorkedMinsSum,
      totalLateMinutes: totalLateMinsSum,
      totalOvertimeHours: `${totalOvertimeH}س ${totalOvertimeRem}د`,
      totalOvertimeMinutes: totalOvertimeMinsSum,
      totalAbsenceDays: totalAbsenceDaysSum,
      totalLeaveDays: totalLeaveDaysSum,
      totalRecordsCount: rows.length,
    },
    rows,
    appliedFilters: filters,
  };
}
