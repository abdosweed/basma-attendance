/**
 * Timezone & Attendance Day Resolver - Basma Attendance System v1.14.0
 * Phase 12B.1 Core Reporting Engine
 *
 * Mandated Timezone: Africa/Tripoli (UTC+2)
 */

export const COMPANY_TIMEZONE = 'Africa/Tripoli';

/**
 * Returns formatted Date string YYYY-MM-DD in Africa/Tripoli timezone for a given UTC Date
 */
export function getTripoliDateString(date: Date = new Date()): string {
  // Use Intl.DateTimeFormat with Africa/Tripoli
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: COMPANY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date); // Output format YYYY-MM-DD
}

/**
 * Returns formatted Time string HH:mm in Africa/Tripoli timezone for a given UTC Date
 */
export function getTripoliTimeString(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: COMPANY_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return formatter.format(date); // Output format HH:mm
}

/**
 * Returns Tripoli day of week (SUN, MON, TUE, WED, THU, FRI, SAT)
 */
export function getTripoliDayOfWeek(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: COMPANY_TIMEZONE,
    weekday: 'short',
  });
  const short = formatter.format(date).toUpperCase(); // SUN, MON...
  const map: Record<string, string> = {
    SUN: 'SUN',
    MON: 'MON',
    TUE: 'TUE',
    WED: 'WED',
    THU: 'THU',
    FRI: 'FRI',
    SAT: 'SAT',
  };
  return map[short] || 'SUN';
}

export interface ResolveAttendanceDayInput {
  eventTimestamp: Date;
  isNightShift?: boolean;
  shiftStartTime?: string; // HH:mm
  shiftEndTime?: string;   // HH:mm
}

/**
 * Business Decision 5 / Requirement 5: Attendance Day Resolver
 * Resolves which YYYY-MM-DD Attendance Day an event belongs to.
 * Night Shift rule (22:00 -> 06:00):
 * If check-in occurs late at night (e.g. 21:55 or 22:05) or check-out occurs next morning (e.g. 06:00 on D+1),
 * all events bind exclusively to the Shift Start Date (Day D).
 */
export function resolveAttendanceDay(input: ResolveAttendanceDayInput): string {
  const { eventTimestamp, isNightShift, shiftStartTime } = input;
  const tripoliDateStr = getTripoliDateString(eventTimestamp);

  if (!isNightShift || !shiftStartTime) {
    return tripoliDateStr;
  }

  // Parse shift start hour (e.g. "22:00" -> 22)
  const [startHourStr] = shiftStartTime.split(':');
  const startHour = parseInt(startHourStr, 10);

  // If shift starts late (e.g., >= 18:00) and event occurs early morning (e.g., < 12:00 Tripoli time),
  // then the event belongs to YESTERDAY's shift start date!
  const eventTimeStr = getTripoliTimeString(eventTimestamp);
  const eventHour = parseInt(eventTimeStr.split(':')[0], 10);

  if (startHour >= 18 && eventHour < 12) {
    // Event is on day D+1 morning. Subtract 1 day to bind to Day D.
    const yesterday = new Date(eventTimestamp.getTime() - 24 * 60 * 60 * 1000);
    return getTripoliDateString(yesterday);
  }

  return tripoliDateStr;
}

/**
 * Formats minutes into human-friendly Arabic format (e.g., 462 min -> "7س 42د")
 */
export function formatMinutesToArabic(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || isNaN(minutes)) {
    return 'غير مكتمل';
  }
  if (minutes <= 0) {
    return '0د';
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return `${hours}س ${mins}د`;
  } else if (hours > 0) {
    return `${hours}س`;
  } else {
    return `${mins}د`;
  }
}
