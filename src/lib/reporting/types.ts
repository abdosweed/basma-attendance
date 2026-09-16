/**
 * Core Reporting Engine Types - Basma Attendance System v1.14.0
 * Phase 12B.1 Core Reporting Engine
 */

export type ReportingStatus =
  | 'PRESENT'
  | 'ON_TIME'
  | 'LATE'
  | 'ABSENT'
  | 'ON_LEAVE'
  | 'NOT_SCHEDULED'
  | 'INCOMPLETE_ATTENDANCE'
  | 'EARLY_LEAVE'
  | 'ON_BREAK'
  | 'CHECKED_OUT'
  | 'WORK_HOURS_DEFICIT'
  | 'HOLIDAY';

export type ReportFlag =
  | 'LATE'
  | 'ABSENT'
  | 'EARLY_LEAVE'
  | 'MISSING_CHECKOUT'
  | 'BREAK_EXCEEDED'
  | 'GPS_VERIFIED'
  | 'ADMIN_ADJUSTED'
  | 'WORK_HOURS_DEFICIT'
  | 'OUTSIDE_ATTEMPT'
  | 'SHIFT_MISMATCH';

export interface ReportPagination {
  page: number;
  limit: number;
  totalRows: number;
  totalPages: number;
}

export interface AppliedReportFilters {
  date?: string;
  startDate?: string;
  endDate?: string;
  branchId?: string;
  departmentId?: string;
  shiftId?: string;
  employeeId?: string;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// 1. Today Live Attendance Types
export interface TodayLiveSummary {
  expectedCount: number;
  notCheckedInCount: number;
  currentlyWorkingCount: number;
  onBreakCount: number;
  lateCount: number;
  checkedOutCount: number;
  needsReviewCount: number;
}

export interface TodayLiveRow {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  departmentName: string;
  branchName: string;
  shiftName: string;
  shiftType: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: ReportingStatus;
  statusLabel: string;
  lateMinutes: number;
  workedMinutes: number | null;
  breakMinutes: number;
  flags: ReportFlag[];
}

export interface TodayLiveReportResponse {
  summary: TodayLiveSummary;
  rows: TodayLiveRow[];
  pagination: ReportPagination;
  appliedFilters: AppliedReportFilters;
}

// 2. Daily Attendance Report Types
export interface DailyAttendanceSummary {
  totalEmployees: number;
  presentCount: number;
  lateCount: number;
  absentCount: number;
  onLeaveCount: number;
  notScheduledCount: number;
  incompleteCount: number;
  totalWorkedMinutes: number;
  totalLateMinutes: number;
  totalBreakExcessMinutes: number;
}

export interface DailyAttendanceRow {
  attendanceRecordId: string | null;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  departmentName: string;
  branchName: string;
  shiftName: string;
  shiftType: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: ReportingStatus;
  statusLabel: string;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  totalBreakMinutes: number;
  allowedBreakMinutes: number;
  breakExcessMinutes: number;
  workedMinutes: number | null; // null if incomplete
  workedMinutesFormatted: string;
  potentialOvertimeMinutes: number; // Informational only
  flags: ReportFlag[];
  isAdminAdjusted: boolean;
  adjustmentDetails?: {
    adjustedAt?: string;
    adjustedBy?: string;
    reason?: string;
  };
}

export interface DailyAttendanceReportResponse {
  summary: DailyAttendanceSummary;
  rows: DailyAttendanceRow[];
  pagination: ReportPagination;
  appliedFilters: AppliedReportFilters;
}

// 3. Monthly Attendance Summary Types
export interface MonthlyEmployeeSummaryRow {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  departmentName: string;
  branchName: string;
  scheduledDays: number;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  notScheduledDays: number;
  lateDays: number;
  totalLateMinutes: number;
  earlyLeaveDays: number;
  incompleteAttendanceDays: number;
  totalWorkedMinutes: number;
  totalWorkedHoursFormatted: string;
  totalBreakExcessMinutes: number;
  locationVerificationCount: number;
  workDeficitMinutes: number;
}

export interface MonthlyAttendanceReportResponse {
  summary: {
    totalEmployees: number;
    month: string;
    totalScheduledDaysSum: number;
    totalWorkedHoursSum: string;
    totalLateMinutesSum: number;
    totalAbsenceDaysSum: number;
  };
  rows: MonthlyEmployeeSummaryRow[];
  pagination: ReportPagination;
  appliedFilters: AppliedReportFilters;
}

// 4. Late & Absence Report Types
export interface LateAbsenceSummary {
  totalLateOccurrences: number;
  totalLateMinutes: number;
  totalAbsenceOccurrences: number;
  totalEarlyLeaveOccurrences: number;
  totalEarlyLeaveMinutes: number;
  totalWorkDeficitMinutes: number;
}

export interface LateAbsenceRow {
  date: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  departmentName: string;
  branchName: string;
  shiftName: string;
  scheduledStart: string | null;
  actualCheckIn: string | null;
  gracePeriodMins: number;
  effectiveStart: string | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  workDeficitMinutes: number;
  type: 'LATE' | 'ABSENT' | 'EARLY_LEAVE' | 'WORK_DEFICIT';
  notes?: string;
}

export interface LateAbsenceReportResponse {
  summary: LateAbsenceSummary;
  rows: LateAbsenceRow[];
  pagination: ReportPagination;
  appliedFilters: AppliedReportFilters;
}

// 5. Attendance Exceptions Report Types
export interface ExceptionsSummary {
  totalExceptions: number;
  missingCheckoutCount: number;
  breakExceededCount: number;
  adminAdjustedCount: number;
  locationVerifiedCount: number;
  outsideAttemptCount: number;
  workDeficitCount: number;
}

export interface ExceptionRow {
  attendanceRecordId: string | null;
  date: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  departmentName: string;
  branchName: string;
  exceptionType: ReportFlag;
  exceptionLabel: string;
  details: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  status: ReportingStatus;
  createdAt: string;
}

export interface ExceptionsReportResponse {
  summary: ExceptionsSummary;
  rows: ExceptionRow[];
  pagination: ReportPagination;
  appliedFilters: AppliedReportFilters;
}

// 6. Employee Attendance Profile Types
export interface EmployeeProfileSummaryCard {
  presentDays: number;
  lateDays: number;
  totalLateMinutes: number;
  absentDays: number;
  leaveDays: number;
  incompleteDays: number;
  totalWorkedHoursFormatted: string;
  breakExcessMinutes: number;
  locationVerificationCount: number;
}

export interface EmployeeProfileReportResponse {
  employee: {
    id: string;
    employeeNumber: string;
    firstName: string;
    lastName: string;
    jobTitle: string | null;
    departmentName: string;
    branchName: string;
    hireDate: string | null;
    status: string;
  };
  summary: EmployeeProfileSummaryCard;
  dailyTimeline: DailyAttendanceRow[];
  lateHistory: LateAbsenceRow[];
  exceptions: ExceptionRow[];
  appliedFilters: AppliedReportFilters;
}
