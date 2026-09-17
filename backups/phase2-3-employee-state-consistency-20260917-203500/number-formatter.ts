/**
 * Basma Attendance System v2.0.0
 * Western 0-9 Digit Formatting Utilities for Arabic RTL Presentation
 */

export function toWesternNumerals(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return '';
  const str = String(input);
  return str.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
}

export function formatWesternTime(
  dateInput: Date | string | null | undefined,
  includeSeconds: boolean = false
): string {
  if (!dateInput) return '—';

  // Handle HH:mm raw string input (e.g. "08:00")
  if (typeof dateInput === 'string' && /^\d{2}:\d{2}$/.test(dateInput)) {
    const [h, m] = dateInput.split(':').map(Number);
    const period = h >= 12 ? 'م' : 'ص';
    const formattedH = h % 12 === 0 ? 12 : h % 12;
    const padH = formattedH < 10 ? `0${formattedH}` : `${formattedH}`;
    const padM = m < 10 ? `0${m}` : `${m}`;
    return `${padH}:${padM} ${period}`;
  }

  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '—';

  const opts: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...(includeSeconds ? { second: '2-digit' } : {}),
  };

  try {
    const timeStr = date.toLocaleTimeString('en-US', { ...opts, timeZone: 'Africa/Tripoli' });
    return timeStr.replace('AM', 'ص').replace('PM', 'م');
  } catch (e) {
    const timeStr = date.toLocaleTimeString('en-US', opts);
    return timeStr.replace('AM', 'ص').replace('PM', 'م');
  }
}

export function formatWesternDate(dateInput: Date | string | null | undefined): string {
  if (!dateInput) return '—';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '—';

  const dayName = date.toLocaleDateString('ar-SA', { weekday: 'short' });
  const dayNum = date.getDate();
  const monthName = date.toLocaleDateString('ar-SA', { month: 'short' });
  const yearNum = date.getFullYear();

  return `${dayName}، ${toWesternNumerals(dayNum)} ${monthName} ${toWesternNumerals(yearNum)}`;
}

export function formatWesternDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined || isNaN(minutes) || minutes <= 0) return '—';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  if (hrs > 0 && mins > 0) {
    return `${hrs} س ${mins} د`;
  } else if (hrs > 0) {
    return `${hrs} س`;
  } else {
    return `${mins} د`;
  }
}
