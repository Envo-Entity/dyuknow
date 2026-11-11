// London time. Dyuknow runs on London wall-clock time everywhere, whatever
// timezone the phone is in.
//
// The website formats with Intl directly. Here only one Intl primitive is
// used (the London wall clock of an instant, read as numbers), and every
// label is built by hand, so output never depends on how a device's Intl
// lays out "en-GB" text (Hermes on iOS and Android use the platform's own
// formatters). The labels match what browsers print for en-GB today,
// including "Sept".

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"];

// The most dates one shift can cover: two weeks of holiday cover.
export const MAX_DAYS = 14;
// How long a venue has to confirm a day's hours before they confirm themselves.
export const CONFIRM_WITHIN = 48 * 3600000;

export type LondonClock = { year: number; month: number; day: number; hour: number; minute: number };

let formatter: Intl.DateTimeFormat | null = null;
function londonFormatter() {
  formatter ??= new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formatter;
}
const pad = (n: number) => String(n).padStart(2, "0");

/** The London wall clock at an instant (ISO string, ms or Date). */
export function londonClock(instant: string | number | Date): LondonClock {
  const date = instant instanceof Date ? instant : new Date(instant);
  const f = londonFormatter();
  let year = 0;
  let month = 0;
  let day = 0;
  let hour = 0;
  let minute = 0;
  if (typeof f.formatToParts === "function") {
    for (const p of f.formatToParts(date)) {
      const n = Number(p.value);
      if (p.type === "year") year = n;
      else if (p.type === "month") month = n;
      else if (p.type === "day") day = n;
      else if (p.type === "hour") hour = n;
      else if (p.type === "minute") minute = n;
    }
  } else {
    // en-GB numeric order: dd/mm/yyyy, hh:mm
    const n = (f.format(date).match(/\d+/g) ?? []).map(Number);
    [day, month, year, hour, minute] = n;
  }
  // Some engines print midnight as 24 with hour12: false.
  if (hour === 24) hour = 0;
  return { year, month, day, hour, minute };
}
function clockDate(c: LondonClock) {
  return `${c.year}-${pad(c.month)}-${pad(c.day)}`;
}
function clockTime(c: LondonClock) {
  return `${pad(c.hour)}:${pad(c.minute)}`;
}

export function datePlus(date: string, count: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + count);
  return d.toISOString().slice(0, 10);
}
/** "2026-10-02": the London date of an instant. */
export function londonDate(now: string) {
  return clockDate(londonClock(now));
}
/** "17:00": the London time of an instant. */
export function londonTime(instant: string) {
  return clockTime(londonClock(instant));
}
/** Today's London date (onboarding's name for it). */
export function londonToday(now: Date = new Date()) {
  return clockDate(londonClock(now));
}
export function upcomingDates(today: string, count = 14) {
  return Array.from({ length: count }, (_, offset) => datePlus(today, offset));
}
/** "Fri 2 Oct" for a London date. */
export function displayDate(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}
/** "2 Oct, 17:00" for an instant, in London time. */
export function clockLabel(now: string) {
  const c = londonClock(now);
  return `${c.day} ${MONTHS[c.month - 1]}, ${clockTime(c)}`;
}
/** "Thu 8": short enough for buttons, unambiguous across two weeks. */
export function shortDay(date: string) {
  return displayDate(date).replace(/ [A-Za-z]+$/, "");
}
export function relativeDay(date: string, now: string) {
  const today = londonDate(now);
  if (date === today) return "Today";
  if (date === datePlus(today, 1)) return "Tomorrow";
  return displayDate(date);
}
// Resolve London wall time using the timezone database, including overnight/DST.
// Ambiguous and nonexistent wall times must be chosen again.
export function londonInstant(date: string, time: string) {
  const target = `${date} ${time}`;
  const guess = Date.parse(`${date}T${time}:00Z`);
  const matches = [guess - 3600000, guess, guess + 3600000].filter((t) => {
    const c = londonClock(t);
    return `${clockDate(c)} ${clockTime(c)}` === target;
  });
  if (matches.length !== 1)
    throw new Error(
      matches.length
        ? "That time happens twice when the clocks go back. Choose another."
        : "That time doesn’t exist when the clocks go forward. Choose another.",
    );
  return new Date(matches[0]).toISOString();
}
