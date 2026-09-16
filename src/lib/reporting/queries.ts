/**
 * Core Reporting Queries & Aggregations - Basma Attendance System v1.14.0
 * Phase 12B.1 Core Reporting Engine
 */

import { prisma } from '@/lib/prisma';
import {
  getTripoliDateString,
  getTripoliDayOfWeek,
  getTripoliTimeString,
  formatMinutesToArabic,
} from './attendance-day';
import {
  calculateLateMinutes,
  calculateEarlyLeaveMinutes,
  calculateWorkAndBreakMetrics,
  resolveAttendanceStatus,
  ShiftInfo,
} from './metrics';
import {
  TodayLiveReportResponse,
  DailyAttendanceReportResponse,
  MonthlyAttendanceReportResponse,
  LateAbsenceReportResponse,
  ExceptionsReportResponse,
  EmployeeProfileReportResponse,
  AppliedReportFilters,
  TodayLiveRow,
  DailyAttendanceRow,
  MonthlyEmployeeSummaryRow,
  LateAbsenceRow,
  ExceptionRow,
  ReportFlag,
} from './types';
import { ScopedReportingFilter } from './permissions';

// ----------------------------------------------------------------------
// Safe Sorting Allow-Lists
// ----------------------------------------------------------------------
const ALLOWED_DAILY_SORT_FIELDS = [
  'employeeName',
  'checkInAt',
  'lateMinutes',
  'workedMinutes',
  'status',
];

// ----------------------------------------------------------------------
// 1. P0-01: Today Live Attendance Query
// ----------------------------------------------------------------------
export async function getTodayLiveAttendanceReport(
  scope: ScopedReportingFilter,
  filters: AppliedReportFilters
): Promise<TodayLiveReportResponse> {
  if (scope.isForbidden) {
    return {
      summary: {
        expectedCount: 0,
        notCheckedInCount: 0,
        currentlyWorkingCount: 0,
        onBreakCount: 0,
        lateCount: 0,
        checkedOutCount: 0,
        needsReviewCount: 0,
      },
      rows: [],
      pagination: { page: 1, limit: 50, totalRows: 0, totalPages: 0 },
      appliedFilters: filters,
    };
  }

  const todayStr = getTripoliDateString(new Date());
  const todayDayOfWeek = getTripoliDayOfWeek(new Date());

  // Fetch active employees within scope
  const employeeWhere: any = {
    companyId: scope.companyId,
    status: 'ACTIVE',
  };
  if (scope.employeeIds?.length) employeeWhere.id = { in: scope.employeeIds };
  if (scope.branchIds?.length) employeeWhere.primaryBranchId = { in: scope.branchIds };
  if (filters.departmentId) employeeWhere.departmentId = filters.departmentId;
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
        where: { date: todayStr },
        include: { shift: true },
        take: 1,
      },
      breakRecords: {
        where: { status: 'ACTIVE' },
        take: 1,
      },
      leaveRequests: {
        where: {
          status: 'APPROVED',
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
        },
        take: 1,
      },
    },
    orderBy: { firstName: 'asc' },
  });

  const todayHoliday = await prisma.holiday.findFirst({
    where: {
      companyId: scope.companyId,
      startDate: { lte: new Date() },
      endDate: { gte: new Date() },
    },
  });

  let notCheckedInCount = 0;
  let currentlyWorkingCount = 0;
  let onBreakCount = 0;
  let lateCount = 0;
  let checkedOutCount = 0;
  let needsReviewCount = 0;

  const rows: TodayLiveRow[] = [];

  for (const emp of employees) {
    const shift = emp.employeeShifts[0]?.shift as ShiftInfo | undefined;
    const record = emp.attendanceRecords[0];
    const activeBreak = emp.breakRecords[0];
    const isLeave = emp.leaveRequests.length > 0;

    let lateMins = 0;
    let workedMins: number | null = null;
    let breakMins = 0;
    const flags: ReportFlag[] = [];

    if (record) {
      if (record.checkInAt && shift) {
        lateMins = calculateLateMinutes({
          actualCheckIn: record.checkInAt,
          scheduledStartTime: shift.startTime,
          gracePeriodMins: shift.gracePeriodMins,
          dateStr: todayStr,
        });
      }

      if (record.checkInAt && record.checkOutAt && shift) {
        const metrics = calculateWorkAndBreakMetrics({
          checkInAt: record.checkInAt,
          checkOutAt: record.checkOutAt,
          totalBreakMinutes: record.totalBreakMinutes,
          allowedBreakMinutes: shift.maxBreakMins,
          shiftType: shift.type,
          requiredHours: shift.requiredHours,
        });
        workedMins = metrics.netWorkedMinutes;
        breakMins = record.totalBreakMinutes;
        if (metrics.breakExcessMinutes > 0) flags.push('BREAK_EXCEEDED');
      }
    }

    const { status, flags: resolvedFlags } = resolveAttendanceStatus({
      dateStr: todayStr,
      dayOfWeek: todayDayOfWeek,
      shift: shift || null,
      checkInAt: record?.checkInAt || null,
      checkOutAt: record?.checkOutAt || null,
      isApprovedLeave: isLeave,
      isCompanyHoliday: !!todayHoliday,
      lateMinutes: lateMins,
      workHoursDeficitMinutes: 0,
      breakExcessMinutes: 0,
    });

    resolvedFlags.forEach((f) => {
      if (!flags.includes(f)) flags.push(f);
    });

    if (activeBreak) {
      flags.push('BREAK_EXCEEDED');
    }

    // Counters
    if (status === 'LATE') lateCount++;
    if (status === 'INCOMPLETE_ATTENDANCE' || flags.includes('MISSING_CHECKOUT')) {
      needsReviewCount++;
    }

    if (activeBreak) {
      onBreakCount++;
    } else if (record?.checkInAt && !record?.checkOutAt) {
      currentlyWorkingCount++;
    } else if (record?.checkOutAt) {
      checkedOutCount++;
    } else if (status === 'ABSENT' || status === 'PRESENT' || status === 'LATE') {
      notCheckedInCount++;
    }

    // Map status label
    const statusLabels: Record<string, string> = {
      PRESENT: 'حاضر',
      ON_TIME: 'حاضر (في الوقت)',
      LATE: 'متأخر',
      ABSENT: 'غائب',
      ON_LEAVE: 'في إجازة',
      NOT_SCHEDULED: 'غير مجدول',
      INCOMPLETE_ATTENDANCE: 'بصمة غير مكتملة',
      EARLY_LEAVE: 'خروج مبكر',
      ON_BREAK: 'في استراحة',
      CHECKED_OUT: 'منصرف',
      WORK_HOURS_DEFICIT: 'عجز ساعات',
      HOLIDAY: 'عطلة رسمية',
    };

    rows.push({
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      employeeNumber: emp.employeeNumber,
      departmentName: emp.department?.name || 'غير محدد',
      branchName: emp.primaryBranch?.name || 'غير محدد',
      shiftName: shift?.name || 'بدون وردية',
      shiftType: shift?.type || 'FIXED',
      scheduledStart: shift?.startTime || null,
      scheduledEnd: shift?.endTime || null,
      checkInAt: record?.checkInAt ? getTripoliTimeString(record.checkInAt) : null,
      checkOutAt: record?.checkOutAt ? getTripoliTimeString(record.checkOutAt) : null,
      status,
      statusLabel: statusLabels[status] || status,
      lateMinutes: lateMins,
      workedMinutes: workedMins,
      breakMinutes: breakMins,
      flags,
    });
  }

  // Filter by requested status if present
  let filteredRows = rows;
  if (filters.status) {
    filteredRows = rows.filter((r) => r.status === filters.status);
  }

  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 50;
  const totalRows = filteredRows.length;
  const paginatedRows = filteredRows.slice((page - 1) * limit, page * limit);

  return {
    summary: {
      expectedCount: employees.length,
      notCheckedInCount,
      currentlyWorkingCount,
      onBreakCount,
      lateCount,
      checkedOutCount,
      needsReviewCount,
    },
    rows: paginatedRows,
    pagination: {
      page,
      limit,
      totalRows,
      totalPages: Math.ceil(totalRows / limit) || 1,
    },
    appliedFilters: filters,
  };
}

// ----------------------------------------------------------------------
// 2. P0-02: Daily Attendance Report Query
// ----------------------------------------------------------------------
export async function getDailyAttendanceReport(
  scope: ScopedReportingFilter,
  filters: AppliedReportFilters
): Promise<DailyAttendanceReportResponse> {
  if (scope.isForbidden) {
    return {
      summary: {
        totalEmployees: 0,
        presentCount: 0,
        lateCount: 0,
        absentCount: 0,
        onLeaveCount: 0,
        notScheduledCount: 0,
        incompleteCount: 0,
        totalWorkedMinutes: 0,
        totalLateMinutes: 0,
        totalBreakExcessMinutes: 0,
      },
      rows: [],
      pagination: { page: 1, limit: 50, totalRows: 0, totalPages: 0 },
      appliedFilters: filters,
    };
  }

  const dateStr = filters.date || getTripoliDateString(new Date());

  // Parse YYYY-MM-DD date object
  const [yr, mo, dy] = dateStr.split('-').map(Number);
  const targetDateObj = new Date(Date.UTC(yr, mo - 1, dy));
  const dayOfWeek = getTripoliDayOfWeek(targetDateObj);

  const employeeWhere: any = {
    companyId: scope.companyId,
    status: 'ACTIVE',
  };
  if (scope.employeeIds?.length) employeeWhere.id = { in: scope.employeeIds };
  if (scope.branchIds?.length) employeeWhere.primaryBranchId = { in: scope.branchIds };
  if (filters.departmentId) employeeWhere.departmentId = filters.departmentId;
  if (filters.shiftId) {
    employeeWhere.employeeShifts = { some: { shiftId: filters.shiftId, endDate: null } };
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
        where: { date: dateStr },
        include: { shift: true },
        take: 1,
      },
      leaveRequests: {
        where: {
          status: 'APPROVED',
          startDate: { lte: targetDateObj },
          endDate: { gte: targetDateObj },
        },
        take: 1,
      },
    },
    orderBy: { firstName: 'asc' },
  });

  const companyHoliday = await prisma.holiday.findFirst({
    where: {
      companyId: scope.companyId,
      startDate: { lte: targetDateObj },
      endDate: { gte: targetDateObj },
    },
  });

  let presentCount = 0;
  let lateCount = 0;
  let absentCount = 0;
  let onLeaveCount = 0;
  let notScheduledCount = 0;
  let incompleteCount = 0;

  let totalWorkedMinutes = 0;
  let totalLateMinutes = 0;
  let totalBreakExcessMinutes = 0;

  const rows: DailyAttendanceRow[] = [];

  for (const emp of employees) {
    const shift = emp.employeeShifts[0]?.shift as ShiftInfo | undefined;
    const record = emp.attendanceRecords[0];
    const isLeave = emp.leaveRequests.length > 0;

    let lateMins = 0;
    let earlyLeaveMins = 0;
    let breakExcessMins = 0;
    let workedMins: number | null = null;
    let potentialOvertimeMins = 0;
    let workDeficitMins = 0;
    const flags: ReportFlag[] = [];
    let isAdminAdjusted = false;

    if (record) {
      if (record.checkInAt && shift) {
        lateMins = calculateLateMinutes({
          actualCheckIn: record.checkInAt,
          scheduledStartTime: shift.startTime,
          gracePeriodMins: shift.gracePeriodMins,
          dateStr,
        });
      }

      if (record.checkInAt && record.checkOutAt && shift) {
        if (shift.type === 'FIXED') {
          earlyLeaveMins = calculateEarlyLeaveMinutes({
            actualCheckOut: record.checkOutAt,
            scheduledEndTime: shift.endTime,
            dateStr,
            isNightShift: shift.isNightShift,
          });
        }

        const metrics = calculateWorkAndBreakMetrics({
          checkInAt: record.checkInAt,
          checkOutAt: record.checkOutAt,
          totalBreakMinutes: record.totalBreakMinutes,
          allowedBreakMinutes: shift.maxBreakMins,
          shiftType: shift.type,
          requiredHours: shift.requiredHours,
        });

        workedMins = metrics.netWorkedMinutes;
        breakExcessMins = metrics.breakExcessMinutes;
        workDeficitMins = metrics.workHoursDeficitMinutes;
        potentialOvertimeMins = metrics.potentialOvertimeMinutes;
      }

      if (record.notes?.includes('ADMIN') || record.status.includes('CORRECTED')) {
        isAdminAdjusted = true;
        flags.push('ADMIN_ADJUSTED');
      }
    }

    const { status, flags: resolvedFlags } = resolveAttendanceStatus({
      dateStr,
      dayOfWeek,
      shift: shift || null,
      checkInAt: record?.checkInAt || null,
      checkOutAt: record?.checkOutAt || null,
      isApprovedLeave: isLeave,
      isCompanyHoliday: !!companyHoliday,
      lateMinutes: lateMins,
      workHoursDeficitMinutes: workDeficitMins,
      breakExcessMinutes: breakExcessMins,
    });

    resolvedFlags.forEach((f) => {
      if (!flags.includes(f)) flags.push(f);
    });

    if (earlyLeaveMins > 0) flags.push('EARLY_LEAVE');

    // Aggregate Summary
    if (status === 'PRESENT' || status === 'ON_TIME') presentCount++;
    else if (status === 'LATE') {
      lateCount++;
      presentCount++;
    } else if (status === 'ABSENT') absentCount++;
    else if (status === 'ON_LEAVE') onLeaveCount++;
    else if (status === 'NOT_SCHEDULED') notScheduledCount++;
    else if (status === 'INCOMPLETE_ATTENDANCE') incompleteCount++;

    if (workedMins) totalWorkedMinutes += workedMins;
    totalLateMinutes += lateMins;
    totalBreakExcessMinutes += breakExcessMins;

    const statusLabels: Record<string, string> = {
      PRESENT: 'حاضر',
      ON_TIME: 'حاضر (في الوقت)',
      LATE: 'متأخر',
      ABSENT: 'غائب',
      ON_LEAVE: 'في إجازة',
      NOT_SCHEDULED: 'غير مجدول',
      INCOMPLETE_ATTENDANCE: 'بصمة غير مكتملة',
      EARLY_LEAVE: 'خروج مبكر',
      ON_BREAK: 'في استراحة',
      CHECKED_OUT: 'منصرف',
      WORK_HOURS_DEFICIT: 'عجز ساعات',
      HOLIDAY: 'عطلة رسمية',
    };

    rows.push({
      attendanceRecordId: record?.id || null,
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      employeeNumber: emp.employeeNumber,
      departmentName: emp.department?.name || 'غير محدد',
      branchName: emp.primaryBranch?.name || 'غير محدد',
      shiftName: shift?.name || 'بدون وردية',
      shiftType: shift?.type || 'FIXED',
      scheduledStart: shift?.startTime || null,
      scheduledEnd: shift?.endTime || null,
      checkInAt: record?.checkInAt ? getTripoliTimeString(record.checkInAt) : null,
      checkOutAt: record?.checkOutAt ? getTripoliTimeString(record.checkOutAt) : null,
      status,
      statusLabel: statusLabels[status] || status,
      lateMinutes: lateMins,
      earlyLeaveMinutes: earlyLeaveMins,
      totalBreakMinutes: record?.totalBreakMinutes || 0,
      allowedBreakMinutes: shift?.maxBreakMins || 0,
      breakExcessMinutes: breakExcessMins,
      workedMinutes: workedMins,
      workedMinutesFormatted: formatMinutesToArabic(workedMins),
      potentialOvertimeMinutes: potentialOvertimeMins,
      flags,
      isAdminAdjusted,
    });
  }

  let filteredRows = rows;
  if (filters.status) {
    filteredRows = rows.filter((r) => r.status === filters.status);
  }

  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 50;
  const totalRows = filteredRows.length;
  const paginatedRows = filteredRows.slice((page - 1) * limit, page * limit);

  return {
    summary: {
      totalEmployees: employees.length,
      presentCount,
      lateCount,
      absentCount,
      onLeaveCount,
      notScheduledCount,
      incompleteCount,
      totalWorkedMinutes,
      totalLateMinutes,
      totalBreakExcessMinutes,
    },
    rows: paginatedRows,
    pagination: {
      page,
      limit,
      totalRows,
      totalPages: Math.ceil(totalRows / limit) || 1,
    },
    appliedFilters: filters,
  };
}

// ----------------------------------------------------------------------
// 3. P0-03: Monthly Attendance Summary Query
// ----------------------------------------------------------------------
export async function getMonthlyAttendanceSummaryReport(
  scope: ScopedReportingFilter,
  filters: AppliedReportFilters
): Promise<MonthlyAttendanceReportResponse> {
  if (scope.isForbidden) {
    return {
      summary: {
        totalEmployees: 0,
        month: filters.startDate?.substring(0, 7) || '2026-09',
        totalScheduledDaysSum: 0,
        totalWorkedHoursSum: '0س',
        totalLateMinutesSum: 0,
        totalAbsenceDaysSum: 0,
      },
      rows: [],
      pagination: { page: 1, limit: 50, totalRows: 0, totalPages: 0 },
      appliedFilters: filters,
    };
  }

  const monthStr = filters.startDate?.substring(0, 7) || getTripoliDateString(new Date()).substring(0, 7);
  const [yr, mo] = monthStr.split('-').map(Number);

  const daysInMonth = new Date(yr, mo, 0).getDate();
  const startDateStr = `${monthStr}-01`;
  const endDateStr = `${monthStr}-${String(daysInMonth).padStart(2, '0')}`;

  const employeeWhere: any = {
    companyId: scope.companyId,
    status: 'ACTIVE',
  };
  if (scope.employeeIds?.length) employeeWhere.id = { in: scope.employeeIds };
  if (scope.branchIds?.length) employeeWhere.primaryBranchId = { in: scope.branchIds };
  if (filters.departmentId) employeeWhere.departmentId = filters.departmentId;

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
          startDate: { lte: new Date(yr, mo - 1, daysInMonth) },
          endDate: { gte: new Date(yr, mo - 1, 1) },
        },
      },
      locationVerificationRequests: {
        where: {
          status: 'APPROVED',
          createdAt: {
            gte: new Date(Date.UTC(yr, mo - 1, 1)),
            lte: new Date(Date.UTC(yr, mo - 1, daysInMonth, 23, 59, 59)),
          },
        },
      },
    },
    orderBy: { firstName: 'asc' },
  });

  let totalScheduledDaysSum = 0;
  let totalWorkedMinutesSum = 0;
  let totalLateMinutesSum = 0;
  let totalAbsenceDaysSum = 0;

  const rows: MonthlyEmployeeSummaryRow[] = [];

  for (const emp of employees) {
    const shift = emp.employeeShifts[0]?.shift as ShiftInfo | undefined;
    const recordsMap = new Map(emp.attendanceRecords.map((r) => [r.date, r]));

    let scheduledDays = 0;
    let presentDays = 0;
    let absentDays = 0;
    let leaveDays = 0;
    let notScheduledDays = 0;
    let lateDays = 0;
    let totalLateMinutes = 0;
    let earlyLeaveDays = 0;
    let incompleteAttendanceDays = 0;
    let totalWorkedMinutes = 0;
    let totalBreakExcessMinutes = 0;
    let workDeficitMinutes = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dayPad = String(d).padStart(2, '0');
      const curDateStr = `${monthStr}-${dayPad}`;
      const curDateObj = new Date(Date.UTC(yr, mo - 1, d));
      const curDayOfWeek = getTripoliDayOfWeek(curDateObj);

      const record = recordsMap.get(curDateStr);

      // Check leave
      const isLeave = emp.leaveRequests.some(
        (lr) => new Date(lr.startDate) <= curDateObj && new Date(lr.endDate) >= curDateObj
      );

      let lateMins = 0;
      let workedMins: number | null = null;
      let breakExcessMins = 0;
      let deficitMins = 0;

      if (record && shift) {
        if (record.checkInAt) {
          lateMins = calculateLateMinutes({
            actualCheckIn: record.checkInAt,
            scheduledStartTime: shift.startTime,
            gracePeriodMins: shift.gracePeriodMins,
            dateStr: curDateStr,
          });
        }
        if (record.checkInAt && record.checkOutAt) {
          const metrics = calculateWorkAndBreakMetrics({
            checkInAt: record.checkInAt,
            checkOutAt: record.checkOutAt,
            totalBreakMinutes: record.totalBreakMinutes,
            allowedBreakMinutes: shift.maxBreakMins,
            shiftType: shift.type,
            requiredHours: shift.requiredHours,
          });
          workedMins = metrics.netWorkedMinutes;
          breakExcessMins = metrics.breakExcessMinutes;
          deficitMins = metrics.workHoursDeficitMinutes;
        }
      }

      const { status } = resolveAttendanceStatus({
        dateStr: curDateStr,
        dayOfWeek: curDayOfWeek,
        shift: shift || null,
        checkInAt: record?.checkInAt || null,
        checkOutAt: record?.checkOutAt || null,
        isApprovedLeave: isLeave,
        isCompanyHoliday: false,
        lateMinutes: lateMins,
        workHoursDeficitMinutes: deficitMins,
        breakExcessMinutes: breakExcessMins,
      });

      if (status !== 'NOT_SCHEDULED' && status !== 'HOLIDAY') {
        scheduledDays++;
      }

      if (status === 'PRESENT' || status === 'ON_TIME') presentDays++;
      else if (status === 'LATE') {
        presentDays++;
        lateDays++;
      } else if (status === 'ABSENT') absentDays++;
      else if (status === 'ON_LEAVE') leaveDays++;
      else if (status === 'NOT_SCHEDULED' || status === 'HOLIDAY') notScheduledDays++;
      else if (status === 'INCOMPLETE_ATTENDANCE') incompleteAttendanceDays++;

      totalLateMinutes += lateMins;
      if (workedMins) totalWorkedMinutes += workedMins;
      totalBreakExcessMinutes += breakExcessMins;
      workDeficitMinutes += deficitMins;
    }

    totalScheduledDaysSum += scheduledDays;
    totalWorkedMinutesSum += totalWorkedMinutes;
    totalLateMinutesSum += totalLateMinutes;
    totalAbsenceDaysSum += absentDays;

    rows.push({
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName}`,
      employeeNumber: emp.employeeNumber,
      departmentName: emp.department?.name || 'غير محدد',
      branchName: emp.primaryBranch?.name || 'غير محدد',
      scheduledDays,
      presentDays,
      absentDays,
      leaveDays,
      notScheduledDays,
      lateDays,
      totalLateMinutes,
      earlyLeaveDays,
      incompleteAttendanceDays,
      totalWorkedMinutes,
      totalWorkedHoursFormatted: formatMinutesToArabic(totalWorkedMinutes),
      totalBreakExcessMinutes,
      locationVerificationCount: emp.locationVerificationRequests.length,
      workDeficitMinutes,
    });
  }

  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 50;
  const totalRows = rows.length;
  const paginatedRows = rows.slice((page - 1) * limit, page * limit);

  return {
    summary: {
      totalEmployees: employees.length,
      month: monthStr,
      totalScheduledDaysSum,
      totalWorkedHoursSum: formatMinutesToArabic(totalWorkedMinutesSum),
      totalLateMinutesSum,
      totalAbsenceDaysSum,
    },
    rows: paginatedRows,
    pagination: {
      page,
      limit,
      totalRows,
      totalPages: Math.ceil(totalRows / limit) || 1,
    },
    appliedFilters: filters,
  };
}

// ----------------------------------------------------------------------
// 4. P0-04: Late & Absence Report Query
// ----------------------------------------------------------------------
export async function getLateAndAbsenceReport(
  scope: ScopedReportingFilter,
  filters: AppliedReportFilters
): Promise<LateAbsenceReportResponse> {
  if (scope.isForbidden) {
    return {
      summary: {
        totalLateOccurrences: 0,
        totalLateMinutes: 0,
        totalAbsenceOccurrences: 0,
        totalEarlyLeaveOccurrences: 0,
        totalEarlyLeaveMinutes: 0,
        totalWorkDeficitMinutes: 0,
      },
      rows: [],
      pagination: { page: 1, limit: 50, totalRows: 0, totalPages: 0 },
      appliedFilters: filters,
    };
  }

  const startDateStr = filters.startDate || getTripoliDateString(new Date());
  const endDateStr = filters.endDate || startDateStr;

  const employeeWhere: any = {
    companyId: scope.companyId,
    status: 'ACTIVE',
  };
  if (scope.employeeIds?.length) employeeWhere.id = { in: scope.employeeIds };
  if (scope.branchIds?.length) employeeWhere.primaryBranchId = { in: scope.branchIds };
  if (filters.departmentId) employeeWhere.departmentId = filters.departmentId;

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
        where: { date: { gte: startDateStr, lte: endDateStr } },
      },
    },
  });

  const rows: LateAbsenceRow[] = [];
  let totalLateOccurrences = 0;
  let totalLateMinutes = 0;
  let totalAbsenceOccurrences = 0;
  let totalEarlyLeaveOccurrences = 0;
  let totalEarlyLeaveMinutes = 0;
  let totalWorkDeficitMinutes = 0;

  for (const emp of employees) {
    const shift = emp.employeeShifts[0]?.shift as ShiftInfo | undefined;
    const recordsMap = new Map(emp.attendanceRecords.map((r) => [r.date, r]));

    // Iterate through dates in range
    const startObj = new Date(startDateStr);
    const endObj = new Date(endDateStr);

    for (let d = new Date(startObj); d <= endObj; d.setDate(d.getDate() + 1)) {
      const curDateStr = getTripoliDateString(d);
      const curDayOfWeek = getTripoliDayOfWeek(d);
      const record = recordsMap.get(curDateStr);

      let lateMins = 0;
      let earlyMins = 0;
      let deficitMins = 0;

      if (record && shift) {
        if (record.checkInAt) {
          lateMins = calculateLateMinutes({
            actualCheckIn: record.checkInAt,
            scheduledStartTime: shift.startTime,
            gracePeriodMins: shift.gracePeriodMins,
            dateStr: curDateStr,
          });
        }
        if (record.checkInAt && record.checkOutAt) {
          if (shift.type === 'FIXED') {
            earlyMins = calculateEarlyLeaveMinutes({
              actualCheckOut: record.checkOutAt,
              scheduledEndTime: shift.endTime,
              dateStr: curDateStr,
              isNightShift: shift.isNightShift,
            });
          }
          const metrics = calculateWorkAndBreakMetrics({
            checkInAt: record.checkInAt,
            checkOutAt: record.checkOutAt,
            totalBreakMinutes: record.totalBreakMinutes,
            allowedBreakMinutes: shift.maxBreakMins,
            shiftType: shift.type,
            requiredHours: shift.requiredHours,
          });
          deficitMins = metrics.workHoursDeficitMinutes;
        }
      }

      const { status } = resolveAttendanceStatus({
        dateStr: curDateStr,
        dayOfWeek: curDayOfWeek,
        shift: shift || null,
        checkInAt: record?.checkInAt || null,
        checkOutAt: record?.checkOutAt || null,
        isApprovedLeave: false,
        isCompanyHoliday: false,
        lateMinutes: lateMins,
        workHoursDeficitMinutes: deficitMins,
        breakExcessMinutes: 0,
      });

      if (status === 'LATE' && lateMins > 0) {
        totalLateOccurrences++;
        totalLateMinutes += lateMins;
        rows.push({
          date: curDateStr,
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          employeeNumber: emp.employeeNumber,
          departmentName: emp.department?.name || 'غير محدد',
          branchName: emp.primaryBranch?.name || 'غير محدد',
          shiftName: shift?.name || 'ثابتة',
          scheduledStart: shift?.startTime || null,
          actualCheckIn: record?.checkInAt ? getTripoliTimeString(record.checkInAt) : null,
          gracePeriodMins: shift?.gracePeriodMins || 0,
          effectiveStart: shift ? shift.startTime : null,
          lateMinutes: lateMins,
          earlyLeaveMinutes: 0,
          workDeficitMinutes: 0,
          type: 'LATE',
        });
      } else if (status === 'ABSENT') {
        totalAbsenceOccurrences++;
        rows.push({
          date: curDateStr,
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          employeeNumber: emp.employeeNumber,
          departmentName: emp.department?.name || 'غير محدد',
          branchName: emp.primaryBranch?.name || 'غير محدد',
          shiftName: shift?.name || 'ثابتة',
          scheduledStart: shift?.startTime || null,
          actualCheckIn: null,
          gracePeriodMins: shift?.gracePeriodMins || 0,
          effectiveStart: shift ? shift.startTime : null,
          lateMinutes: 0,
          earlyLeaveMinutes: 0,
          workDeficitMinutes: 0,
          type: 'ABSENT',
        });
      }

      if (earlyMins > 0) {
        totalEarlyLeaveOccurrences++;
        totalEarlyLeaveMinutes += earlyMins;
        rows.push({
          date: curDateStr,
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          employeeNumber: emp.employeeNumber,
          departmentName: emp.department?.name || 'غير محدد',
          branchName: emp.primaryBranch?.name || 'غير محدد',
          shiftName: shift?.name || 'ثابتة',
          scheduledStart: shift?.startTime || null,
          actualCheckIn: record?.checkInAt ? getTripoliTimeString(record.checkInAt) : null,
          gracePeriodMins: shift?.gracePeriodMins || 0,
          effectiveStart: shift ? shift.startTime : null,
          lateMinutes: 0,
          earlyLeaveMinutes: earlyMins,
          workDeficitMinutes: 0,
          type: 'EARLY_LEAVE',
        });
      }

      if (deficitMins > 0) {
        totalWorkDeficitMinutes += deficitMins;
        rows.push({
          date: curDateStr,
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          employeeNumber: emp.employeeNumber,
          departmentName: emp.department?.name || 'غير محدد',
          branchName: emp.primaryBranch?.name || 'غير محدد',
          shiftName: shift?.name || 'مرنة',
          scheduledStart: shift?.startTime || null,
          actualCheckIn: record?.checkInAt ? getTripoliTimeString(record.checkInAt) : null,
          gracePeriodMins: 0,
          effectiveStart: null,
          lateMinutes: 0,
          earlyLeaveMinutes: 0,
          workDeficitMinutes: deficitMins,
          type: 'WORK_DEFICIT',
        });
      }
    }
  }

  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 50;
  const totalRows = rows.length;
  const paginatedRows = rows.slice((page - 1) * limit, page * limit);

  return {
    summary: {
      totalLateOccurrences,
      totalLateMinutes,
      totalAbsenceOccurrences,
      totalEarlyLeaveOccurrences,
      totalEarlyLeaveMinutes,
      totalWorkDeficitMinutes,
    },
    rows: paginatedRows,
    pagination: {
      page,
      limit,
      totalRows,
      totalPages: Math.ceil(totalRows / limit) || 1,
    },
    appliedFilters: filters,
  };
}

// ----------------------------------------------------------------------
// 5. P0-05: Attendance Exceptions Report Query
// ----------------------------------------------------------------------
export async function getAttendanceExceptionsReport(
  scope: ScopedReportingFilter,
  filters: AppliedReportFilters
): Promise<ExceptionsReportResponse> {
  if (scope.isForbidden) {
    return {
      summary: {
        totalExceptions: 0,
        missingCheckoutCount: 0,
        breakExceededCount: 0,
        adminAdjustedCount: 0,
        locationVerifiedCount: 0,
        outsideAttemptCount: 0,
        workDeficitCount: 0,
      },
      rows: [],
      pagination: { page: 1, limit: 50, totalRows: 0, totalPages: 0 },
      appliedFilters: filters,
    };
  }

  const startDateStr = filters.startDate || getTripoliDateString(new Date());
  const endDateStr = filters.endDate || startDateStr;

  const employeeWhere: any = {
    companyId: scope.companyId,
    status: 'ACTIVE',
  };
  if (scope.employeeIds?.length) employeeWhere.id = { in: scope.employeeIds };
  if (scope.branchIds?.length) employeeWhere.primaryBranchId = { in: scope.branchIds };

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
        where: { date: { gte: startDateStr, lte: endDateStr } },
      },
      locationVerificationRequests: {
        where: {
          createdAt: {
            gte: new Date(startDateStr),
            lte: new Date(`${endDateStr}T23:59:59Z`),
          },
        },
      },
      suspiciousAttempts: {
        where: {
          createdAt: {
            gte: new Date(startDateStr),
            lte: new Date(`${endDateStr}T23:59:59Z`),
          },
        },
      },
    },
  });

  const rows: ExceptionRow[] = [];
  let missingCheckoutCount = 0;
  let breakExceededCount = 0;
  let adminAdjustedCount = 0;
  let locationVerifiedCount = 0;
  let outsideAttemptCount = 0;
  let workDeficitCount = 0;

  for (const emp of employees) {
    const shift = emp.employeeShifts[0]?.shift as ShiftInfo | undefined;

    // Check attendance records exceptions
    for (const rec of emp.attendanceRecords) {
      // Missing Checkout
      if (rec.checkInAt && !rec.checkOutAt) {
        missingCheckoutCount++;
        rows.push({
          attendanceRecordId: rec.id,
          date: rec.date,
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          employeeNumber: emp.employeeNumber,
          departmentName: emp.department?.name || 'غير محدد',
          branchName: emp.primaryBranch?.name || 'غير محدد',
          exceptionType: 'MISSING_CHECKOUT',
          exceptionLabel: 'بصمة انصراف مفقودة',
          details: 'تم تسجيل الدخول بدون تسجيل الانصراف',
          checkInAt: getTripoliTimeString(rec.checkInAt),
          checkOutAt: null,
          status: 'INCOMPLETE_ATTENDANCE',
          createdAt: rec.createdAt.toISOString(),
        });
      }

      // Break Exceeded
      if (shift && rec.totalBreakMinutes > shift.maxBreakMins) {
        breakExceededCount++;
        const excess = rec.totalBreakMinutes - shift.maxBreakMins;
        rows.push({
          attendanceRecordId: rec.id,
          date: rec.date,
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          employeeNumber: emp.employeeNumber,
          departmentName: emp.department?.name || 'غير محدد',
          branchName: emp.primaryBranch?.name || 'غير محدد',
          exceptionType: 'BREAK_EXCEEDED',
          exceptionLabel: 'تجاوز الاستراحة المسموحة',
          details: `تجاوز الاستراحة المسموحة بـ ${excess} دقيقة`,
          checkInAt: rec.checkInAt ? getTripoliTimeString(rec.checkInAt) : null,
          checkOutAt: rec.checkOutAt ? getTripoliTimeString(rec.checkOutAt) : null,
          status: 'PRESENT',
          createdAt: rec.createdAt.toISOString(),
        });
      }

      // Admin Adjusted
      if (rec.notes?.includes('ADMIN') || rec.status.includes('CORRECTED')) {
        adminAdjustedCount++;
        rows.push({
          attendanceRecordId: rec.id,
          date: rec.date,
          employeeId: emp.id,
          employeeName: `${emp.firstName} ${emp.lastName}`,
          employeeNumber: emp.employeeNumber,
          departmentName: emp.department?.name || 'غير محدد',
          branchName: emp.primaryBranch?.name || 'غير محدد',
          exceptionType: 'ADMIN_ADJUSTED',
          exceptionLabel: 'تعديل إداري',
          details: rec.notes || 'تعديل يدوي من قبل الإدارة',
          checkInAt: rec.checkInAt ? getTripoliTimeString(rec.checkInAt) : null,
          checkOutAt: rec.checkOutAt ? getTripoliTimeString(rec.checkOutAt) : null,
          status: 'PRESENT',
          createdAt: rec.createdAt.toISOString(),
        });
      }
    }

    // Check location verification requests
    for (const req of emp.locationVerificationRequests) {
      locationVerifiedCount++;
      rows.push({
        attendanceRecordId: null,
        date: getTripoliDateString(req.createdAt),
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        employeeNumber: emp.employeeNumber,
        departmentName: emp.department?.name || 'غير محدد',
        branchName: emp.primaryBranch?.name || 'غير محدد',
        exceptionType: 'GPS_VERIFIED',
        exceptionLabel: 'طلب تأكيد موقع إداري',
        details: `حالة الموقع: ${req.locationState} (مسافة ${Math.round(req.distanceMeters)}m)`,
        checkInAt: null,
        checkOutAt: null,
        status: 'PRESENT',
        createdAt: req.createdAt.toISOString(),
      });
    }

    // Check suspicious attempts
    for (const att of emp.suspiciousAttempts) {
      outsideAttemptCount++;
      rows.push({
        attendanceRecordId: null,
        date: getTripoliDateString(att.createdAt),
        employeeId: emp.id,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        employeeNumber: emp.employeeNumber,
        departmentName: emp.department?.name || 'غير محدد',
        branchName: emp.primaryBranch?.name || 'غير محدد',
        exceptionType: 'OUTSIDE_ATTEMPT',
        exceptionLabel: 'محاولة بصمة خارج النطاق',
        details: `السبب: ${att.reason} (مستوى الخطر: ${att.riskLevel})`,
        checkInAt: null,
        checkOutAt: null,
        status: 'ABSENT',
        createdAt: att.createdAt.toISOString(),
      });
    }
  }

  const page = Number(filters.page) || 1;
  const limit = Number(filters.limit) || 50;
  const totalRows = rows.length;
  const paginatedRows = rows.slice((page - 1) * limit, page * limit);

  return {
    summary: {
      totalExceptions: totalRows,
      missingCheckoutCount,
      breakExceededCount,
      adminAdjustedCount,
      locationVerifiedCount,
      outsideAttemptCount,
      workDeficitCount,
    },
    rows: paginatedRows,
    pagination: {
      page,
      limit,
      totalRows,
      totalPages: Math.ceil(totalRows / limit) || 1,
    },
    appliedFilters: filters,
  };
}

// ----------------------------------------------------------------------
// 6. P0-06: Employee Attendance Profile Query
// ----------------------------------------------------------------------
export async function getEmployeeAttendanceProfileReport(
  scope: ScopedReportingFilter,
  employeeId: string,
  filters: AppliedReportFilters
): Promise<EmployeeProfileReportResponse | null> {
  if (scope.isForbidden) return null;

  const emp = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      department: true,
      primaryBranch: true,
    },
  });

  if (!emp || emp.companyId !== scope.companyId) return null;

  // Fetch Daily Attendance Report scoped to this employee
  const dailyReport = await getDailyAttendanceReport(scope, {
    ...filters,
    employeeId,
  });

  const lateReport = await getLateAndAbsenceReport(scope, {
    ...filters,
    employeeId,
  });

  const exceptionsReport = await getAttendanceExceptionsReport(scope, {
    ...filters,
    employeeId,
  });

  const summary = {
    presentDays: dailyReport.summary.presentCount,
    lateDays: dailyReport.summary.lateCount,
    totalLateMinutes: dailyReport.summary.totalLateMinutes,
    absentDays: dailyReport.summary.absentCount,
    leaveDays: dailyReport.summary.onLeaveCount,
    incompleteDays: dailyReport.summary.incompleteCount,
    totalWorkedHoursFormatted: formatMinutesToArabic(dailyReport.summary.totalWorkedMinutes),
    breakExcessMinutes: dailyReport.summary.totalBreakExcessMinutes,
    locationVerificationCount: exceptionsReport.summary.locationVerifiedCount,
  };

  return {
    employee: {
      id: emp.id,
      employeeNumber: emp.employeeNumber,
      firstName: emp.firstName,
      lastName: emp.lastName,
      jobTitle: emp.jobTitle,
      departmentName: emp.department?.name || 'غير محدد',
      branchName: emp.primaryBranch?.name || 'غير محدد',
      hireDate: emp.hireDate ? emp.hireDate.toISOString() : null,
      status: emp.status,
    },
    summary,
    dailyTimeline: dailyReport.rows,
    lateHistory: lateReport.rows,
    exceptions: exceptionsReport.rows,
    appliedFilters: filters,
  };
}
