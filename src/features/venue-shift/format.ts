// Labels the venue's shift screens and the Bookings hub share. Ported from
// the website's Discovery.tsx (whenLine, sentTo) and ShiftDetail.tsx
// (daysPhrase), which keep them next to the screens rather than in the model.
import { datesLabel, firstName, relativeDay, shortDay, type Data, type Shift } from '@/domain';

/** "Thu 8 Oct · 17:00–23:00", "Mon 5–Wed 7 Oct · 17:00–23:00", or "Tomorrow · 17:00–23:00". */
export function whenLine(data: Data, s: Shift, dates?: string[]) {
  const span = dates ?? s.days.map((d) => d.date);
  const first = s.days.find((d) => d.date === [...span].sort()[0]) ?? s.days[0];
  return `${span.length > 1 ? datesLabel(span) : relativeDay(first.date, data.now)} · ${first.start}–${first.end}`;
}

/** "all 3 days", "Thu 8 only", "2 days": used on every per-day button. */
export function daysPhrase(dates: string[], total: number) {
  if (total > 1 && dates.length === total) return `all ${total} days`;
  if (dates.length === 1) return `${shortDay(dates[0])} only`;
  return `${dates.length} days`;
}

/** Whole pounds as "£18", otherwise two decimals "£18.50" (spec §10.8). */
export function money(n: number) {
  return Number.isInteger(n) ? `£${n}` : `£${n.toFixed(2)}`;
}

/** "1 person", "3 people". */
export function people(n: number) {
  return `${n} ${n === 1 ? 'person' : 'people'}`;
}

/** Who an ask went to, in the venue's words: "Job post", "Request · Poppy, Theo", "Request · 4 people". */
export function sentTo(data: Data, s: Shift) {
  if (s.mode === 'post') return 'Job post';
  const names = data.responses
    .filter((r) => r.shift === s.id && r.source === 'invite')
    .map((r) => nameOf(data, r.talent));
  return `Request · ${names.length > 2 ? `${names.length} people` : names.join(', ')}`;
}

/** First name of anyone in the snapshot, with the snapshot's stand-in when missing. */
export function nameOf(data: Data, id: string) {
  const m = data.members.find((x) => x.id === id);
  return m ? firstName(m) : 'Someone';
}
