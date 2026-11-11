/**
 * Small date helpers for kit controls. Dates are 'YYYY-MM-DD' calendar days and
 * times are 'HH:MM' wall-clock strings (Europe/London). The pickers work in
 * device-local Date objects; these convert without timezone drift.
 */

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function parts(ymd: string): [number, number, number] {
  const [y, m, d] = ymd.split('-').map(Number);
  return [y, m, d];
}

/** 0 = Sunday. Timezone-independent. */
export function weekdayOf(ymd: string): number {
  const [y, m, d] = parts(ymd);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

export function weekdayShort(ymd: string): string {
  return WEEKDAYS[weekdayOf(ymd)];
}

export function dayNumber(ymd: string): number {
  return parts(ymd)[2];
}

export function monthShort(ymd: string): string {
  return MONTHS[parts(ymd)[1] - 1];
}

/** "Fri 14 Nov" */
export function formatDay(ymd: string): string {
  const [, m, d] = parts(ymd);
  return `${weekdayShort(ymd)} ${d} ${MONTHS[m - 1]}`;
}

/** "Friday 14 November" (for screen readers) */
export function formatDayLong(ymd: string): string {
  const [, m, d] = parts(ymd);
  return `${WEEKDAYS_LONG[weekdayOf(ymd)]} ${d} ${MONTHS_LONG[m - 1]}`;
}

/** Device-local Date at midday for a calendar day (safe for the date picker). */
export function ymdToDate(ymd: string): Date {
  const [y, m, d] = parts(ymd);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function dateToYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function hmToDate(hm: string | null | undefined, fallback = '18:00'): Date {
  const [h, mi] = (hm || fallback).split(':').map(Number);
  const d = new Date();
  d.setHours(h || 0, mi || 0, 0, 0);
  return d;
}

export function dateToHm(date: Date, minuteInterval = 1): string {
  let h = date.getHours();
  let m = Math.round(date.getMinutes() / minuteInterval) * minuteInterval;
  if (m >= 60) {
    m = 0;
    h = (h + 1) % 24;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
