/**
 * Core Reporting Metrics Engine - Basma Attendance System v1.14.0
 * Phase 12B.1 Core Reporting Engine
 *
 * Enforces the 7 Approved Business Decisions:
 * 1. Grace Period / Late Calculation: lateMinutes = max(0, actualCheckIn - (scheduledStart + gracePeriod))
 * 2. Overtime Policy: Informational Potential Overtime only.
 * 3. Break Policy: Paid break, no salary deduction. Excess break calculated as BREAK_EXCESS_MINUTES.
 * 4. Flexible Shift: WORK_HOURS_DEFICIT calculated based on required hours, no traditional entrance late.
 * 5. Missing Check-Out Policy: Classified as INCOMPLETE_ATTENDANCE, net worked hours = null.
 * 6. Admin Adjustment Policy: Flagged as ADMIN_ADJUSTED using available data.
 * 7. Friday Rotation Policy: NOT_SCHEDULED unless employee is scheduled to work on that Friday.
 */

import { ReportingStatus, ReportFlag } from './types';

export interface ShiftInfo {
  id: string;
  name: string;
  type: 'FIXED' | 'FLEXIBLE' | 'SPLIT';
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  splitStartTime?: string | null;
  splitEndTime?: string | null;
  requiredHours: number; // e.g. 8.0
  gracePeriodMins: number; // e.g. 10
  maxBreakMins: number;    // e.g. 30
  isNightShift: boolean;
  rotateFriday: boolean;
  fridayShiftType: string; // "MORNING", "EVENING", "OFF"
  workingDays: string;     // "SUN,MON,TUE,WED,THU"
}

export interface CalculateLateInput {
  actualCheckIn: Date;
  scheduledStartTime: string; // "09:00"
  gracePeriodMins: number;   // 10
  dateStr: string;           // "2026-09-16"
}

/**
 * 1. Business Decision 1: Grace Period / Late Calculation
 * Formula: lateMinutes = max(0, actualCheckIn - (scheduledStart + gracePeriod))
 *
 * Tardiness is calculated ONLY after grace period end.
 */
export function calculateLateMinutes(input: CalculateLateInput): number {
  const { actualCheckIn, scheduledStartTime, gracePeriodMins, dateStr } = input;

  const [startHour, startMin] = scheduledStartTime.split(':').map(Number);
  
  // Construct scheduledStart Date in local time context
  // Parse dateStr (YYYY-MM-DD)
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // We compute time difference in milliseconds relative to UTC epoch or exact date
  // Tripoli is UTC+2
  const scheduledStartMs = Date.UTC(year, month - 1, day, startHour - 2, startMin);
  const effectiveStartMs = scheduledStartMs + gracePeriodMins * 60 * 1000;

  const actualCheckInMs = actualCheckIn.getTime();

  if (actualCheckInMs <= effectiveStartMs) {
    return 0;
  }

  const lateMs = actualCheckInMs - effectiveStartMs;
  return Math.floor(lateMs / (60 * 1000));
}

export interface CalculateEarlyLeaveInput {
  actualCheckOut: Date;
  scheduledEndTime: string; // "17:00"
  dateStr: string;          // "2026-09-16"
  isNightShift?: boolean;
}

/**
 * Calculates Early Leave Minutes for FIXED shifts.
 */
export function calculateEarlyLeaveMinutes(input: CalculateEarlyLeaveInput): number {
  const { actualCheckOut, scheduledEndTime, dateStr, isNightShift } = input;
  const [endHour, endMin] = scheduledEndTime.split(':').map(Number);
  const [year, month, day] = dateStr.split('-').map(Number);

  let endDayOffset = 0;
  if (isNightShift && endHour < 12) {
    endDayOffset = 1; // Ends next day morning
  }

  const scheduledEndMs = Date.UTC(year, month - 1, day + endDayOffset, endHour - 2, endMin);
  const actualCheckOutMs = actualCheckOut.getTime();

  if (actualCheckOutMs >= scheduledEndMs) {
    return 0;
  }

  const earlyMs = scheduledEndMs - actualCheckOutMs;
  return Math.floor(earlyMs / (60 * 1000));
}

export interface CalculateWorkAndBreakInput {
  checkInAt: Date | null;
  checkOutAt: Date | null;
  totalBreakMinutes: number;
  allowedBreakMinutes: number; // e.g. 30
  shiftType: 'FIXED' | 'FLEXIBLE' | 'SPLIT';
  requiredHours: number; // e.g. 8.0
}

export interface WorkAndBreakResult {
  grossWorkedMinutes: number | null;
  netWorkedMinutes: number | null; // null if checkOutAt is missing
  breakExcessMinutes: number;
  workHoursDeficitMinutes: number;
  potentialOvertimeMinutes: number;
  isMissingCheckout: boolean;
}

/**
 * Business Decisions 2, 3, 4, 5: Work & Break Engine
 */
export function calculateWorkAndBreakMetrics(input: CalculateWorkAndBreakInput): WorkAndBreakResult {
  const {
    checkInAt,
    checkOutAt,
    totalBreakMinutes,
    allowedBreakMinutes,
    shiftType,
    requiredHours,
  } = input;

  // Decision 3: Excess break is tracked independently, allowed break is paid!
  const breakExcessMinutes = Math.max(0, totalBreakMinutes - allowedBreakMinutes);

  // Decision 5: Missing check-out -> worked hours = null!
  if (!checkInAt || !checkOutAt) {
    return {
      grossWorkedMinutes: null,
      netWorkedMinutes: null,
      breakExcessMinutes,
      workHoursDeficitMinutes: 0,
      potentialOvertimeMinutes: 0,
      isMissingCheckout: true,
    };
  }

  const grossMs = checkOutAt.getTime() - checkInAt.getTime();
  const grossWorkedMinutes = Math.max(0, Math.floor(grossMs / (60 * 1000)));

  // Allowed break is paid! Only excess break is non-productive (or gross = net worked time if break paid).
  // Per Decision 3: "الاستراحة المسموحة تعتبر مدفوعة ولا تخصم من ساعات العمل الأساسية"
  // Net Worked Minutes = grossWorkedMinutes (because break is paid). If break excess is tracked as excess flag.
  const netWorkedMinutes = grossWorkedMinutes;

  let workHoursDeficitMinutes = 0;
  let potentialOvertimeMinutes = 0;

  const requiredMinutes = Math.round(requiredHours * 60);

  if (shiftType === 'FLEXIBLE') {
    // Decision 4: Flexible Shift rule
    if (netWorkedMinutes < requiredMinutes) {
      workHoursDeficitMinutes = requiredMinutes - netWorkedMinutes;
    } else if (netWorkedMinutes > requiredMinutes) {
      potentialOvertimeMinutes = netWorkedMinutes - requiredMinutes;
    }
  } else {
    // FIXED shift
    if (netWorkedMinutes > requiredMinutes) {
      potentialOvertimeMinutes = netWorkedMinutes - requiredMinutes;
    }
  }

  return {
    grossWorkedMinutes,
    netWorkedMinutes,
    breakExcessMinutes,
    workHoursDeficitMinutes,
    potentialOvertimeMinutes,
    isMissingCheckout: false,
  };
}

export interface ResolveStatusInput {
  dateStr: string;               // YYYY-MM-DD
  dayOfWeek: string;             // SUN, MON, TUE, WED, THU, FRI, SAT
  shift: ShiftInfo | null;
  checkInAt: Date | null;
  checkOutAt: Date | null;
  isApprovedLeave: boolean;
  isCompanyHoliday: boolean;
  lateMinutes: number;
  workHoursDeficitMinutes: number;
  breakExcessMinutes: number;
}

/**
 * Business Decisions 1, 4, 5, 7: Core Status Resolver
 */
export function resolveAttendanceStatus(input: ResolveStatusInput): {
  status: ReportingStatus;
  flags: ReportFlag[];
} {
  const {
    dayOfWeek,
    shift,
    checkInAt,
    checkOutAt,
    isApprovedLeave,
    isCompanyHoliday,
    lateMinutes,
    workHoursDeficitMinutes,
    breakExcessMinutes,
  } = input;

  const flags: ReportFlag[] = [];

  // Decision 14: Approved Leave -> ON_LEAVE
  if (isApprovedLeave) {
    return { status: 'ON_LEAVE', flags: [] };
  }

  // Decision 13: Company Holiday -> HOLIDAY
  if (isCompanyHoliday) {
    return { status: 'HOLIDAY', flags: [] };
  }

  if (!shift) {
    return { status: 'NOT_SCHEDULED', flags: [] };
  }

  // Decision 7: Friday Rotation Policy
  if (dayOfWeek === 'FRI') {
    if (!shift.rotateFriday || shift.fridayShiftType === 'OFF') {
      return { status: 'NOT_SCHEDULED', flags: [] };
    }
  } else {
    // Check if dayOfWeek is in workingDays (e.g. "SUN,MON,TUE,WED,THU")
    const workingDaysList = shift.workingDays.split(',').map((s) => s.trim().toUpperCase());
    if (!workingDaysList.includes(dayOfWeek)) {
      return { status: 'NOT_SCHEDULED', flags: [] };
    }
  }

  // If no check-in -> ABSENT
  if (!checkInAt) {
    flags.push('ABSENT');
    return { status: 'ABSENT', flags };
  }

  // Decision 5: Missing check-out -> INCOMPLETE_ATTENDANCE
  if (!checkOutAt) {
    flags.push('MISSING_CHECKOUT');
    if (breakExcessMinutes > 0) flags.push('BREAK_EXCEEDED');
    return { status: 'INCOMPLETE_ATTENDANCE', flags };
  }

  // Check break excess
  if (breakExcessMinutes > 0) {
    flags.push('BREAK_EXCEEDED');
  }

  // Flexible Shift vs Fixed Shift
  if (shift.type === 'FLEXIBLE') {
    // Decision 4: Flexible Shift rule - no traditional late
    if (workHoursDeficitMinutes > 0) {
      flags.push('WORK_HOURS_DEFICIT');
      return { status: 'WORK_HOURS_DEFICIT', flags };
    }
    return { status: 'PRESENT', flags };
  }

  // FIXED Shift logic
  if (lateMinutes > 0) {
    flags.push('LATE');
    return { status: 'LATE', flags };
  }

  return { status: 'PRESENT', flags };
}
