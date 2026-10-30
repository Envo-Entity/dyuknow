// Small display helpers the screens share. `whenLine` and `sentTo` are the
// website's Discovery.tsx helpers, `daysPhrase` is ShiftDetail.tsx's; they
// live next to the web's screens, so they were not in model.ts. Money and
// hours follow FEATURES §10.8 and §1.8. Pure: no React.
import { datesLabel, firstName } from "./labels.ts";
import { relativeDay, shortDay } from "./time.ts";
import type { Data, Shift } from "./types.ts";

/** §10.8: whole pounds as `£18`, otherwise two decimals `£18.50`. Show it with `tabular`. */
export function money(n: number) {
  const v = Math.round(n * 100) / 100;
  return Number.isInteger(v) ? `£${v}` : `£${v.toFixed(2)}`;
}

/** Hours as the web prints them, without float noise: `6`, `6.5`, `6.25`. */
export function hoursNumber(hours: number) {
  return String(Math.round(hours * 100) / 100);
}

/** Minutes → hours (`375` → `6.25`). */
export function minutesToHours(minutes: number) {
  return minutes / 60;
}

/**
 * `6.25 hours` (or `6.25 h` with `unit: 'h'`). One hour reads `1 hour`.
 * Takes hours; pass `minutesToHours(m)` when you have minutes.
 */
export function hoursLabel(hours: number, unit: "hours" | "h" = "hours") {
  const n = hoursNumber(hours);
  if (unit === "h") return `${n} h`;
  return `${n} ${n === "1" ? "hour" : "hours"}`;
}

/**
 * When a shift (or some of its days) runs: `Thu 8 Oct · 17:00–23:00`,
 * `Mon 5–Wed 7 Oct · 17:00–23:00`, or `Tomorrow · 17:00–23:00` for one day.
 * The web's `whenLine`; the times are those of the earliest picked day.
 * An empty or missing `dates` means every day of the shift. '' for a shift with no days.
 */
export function whenLine(data: Pick<Data, "now">, s: Pick<Shift, "days">, dates?: string[]) {
  const span = dates && dates.length ? dates : s.days.map((d) => d.date);
  const earliest = [...span].sort()[0];
  const first = s.days.find((d) => d.date === earliest) ?? s.days[0];
  if (!first) return "";
  return `${span.length > 1 ? datesLabel(span) : relativeDay(first.date, data.now)} · ${first.start}–${first.end}`;
}

/** `all 3 days`, `Thu 8 only`, `2 days`: used on every per-day button (web ShiftDetail.tsx). */
export function daysPhrase(dates: string[], total: number) {
  if (total > 1 && dates.length === total) return `all ${total} days`;
  if (dates.length === 1) return `${shortDay(dates[0])} only`;
  return `${dates.length} days`;
}

/** `1 person`, `3 people`. */
export function people(n: number) {
  return `${n} ${n === 1 ? "person" : "people"}`;
}

/**
 * Who an ask went to, in the venue's words (web Discovery.tsx):
 * `Job post`, `Request · Poppy, Theo`, `Request · 4 people`.
 * Anyone missing from the snapshot reads `Someone`.
 */
export function sentTo(data: Pick<Data, "responses" | "members">, s: Pick<Shift, "id" | "mode">) {
  if (s.mode === "post") return "Job post";
  const names = data.responses
    .filter((r) => r.shift === s.id && r.source === "invite")
    .map((r) => {
      const m = data.members.find((x) => x.id === r.talent);
      return m ? firstName(m) : "Someone";
    });
  return `Request · ${names.length > 2 ? `${names.length} people` : names.join(", ")}`;
}
