// Shifts, answers, bookings and conversations: the read-side rules every
// screen uses. Ported unchanged from the website's lib/preview/model.ts.
import { MAX_DAYS, datePlus, londonInstant, shortDay } from "./time.ts";
import { firstName, joinNames } from "./labels.ts";
import { teamOf } from "./teams.ts";
import type { Booking, Data, DayStatus, Member, Response, Service, Shift, ShiftDraft } from "./types.ts";

export function member(data: Data, id: string) {
  return data.members.find((m) => m.id === id)!;
}
export function threadBetween(data: Data, venue: string, talent: string) {
  return data.threads.find((t) => t.venue === venue && t.talent === talent);
}
// Whether this conversation has messages from the other person after the
// last one read. Status events (booked, filled) aren't unread messages.
export function unreadChat(data: Data, actor: string, t: { id: string }) {
  const messages = data.messages.filter((m) => m.thread === t.id);
  const idx = messages.findIndex((m) => m.id === data.read[`${actor}/${t.id}`]);
  return messages.slice(idx + 1).some((m) => m.from !== actor && !m.system);
}

// The days of a shift from a draft: up to 14 dates with the same hours.
// Throws a message to show when the dates or hours can't work.
export function makeDays(d: Pick<ShiftDraft, "start" | "end"> & Partial<ShiftDraft>): Service[] {
  const list = Array.isArray(d.dates)
    ? [...new Set(d.dates)].sort()
    : Number.isInteger(d.count) && d.date
      ? Array.from({ length: d.count! }, (_, i) => datePlus(d.date!, i))
      : [];
  if (list.length < 1 || list.length > MAX_DAYS)
    throw new Error(`Choose between 1 and ${MAX_DAYS} dates.`);
  if (!d.start || !d.end || d.start === d.end)
    throw new Error("Choose different start and end times.");
  return list.map((date) => {
    const endDate = d.end < d.start ? datePlus(date, 1) : date;
    return {
      date,
      start: d.start,
      end: d.end,
      from: londonInstant(date, d.start),
      to: londonInstant(endDate, d.end),
    };
  });
}
// Days for a set of dates with the same hours.
export function daysFor(w: { dates: string[]; start: string; end: string }) {
  return makeDays({ dates: w.dates, start: w.start, end: w.end });
}
export function hoursOf(s: Service) {
  return (Date.parse(s.to) - Date.parse(s.from)) / 3600000;
}
export function overlap(a: Service[], b: Service[]) {
  return a.some((x) => b.some((y) => x.from < y.to && y.from < x.to));
}
export function bookedCount(data: Data, shift: string) {
  return data.bookings.filter((b) => b.shift === shift && !b.cancelled).length;
}
// The days of a booking that haven't been cancelled.
export function activeDays(b: Booking) {
  return b.days.filter((d) => b.log[d]?.status !== "cancelled");
}
// The services of a booking still on. A fully cancelled booking keeps its
// original days so it can still be shown.
export function bookingServices(data: Data, b: Booking) {
  const shift = data.shifts.find((s) => s.id === b.shift)!;
  const days = b.cancelled ? b.days : activeDays(b);
  return shift.days.filter((d) => days.includes(d.date));
}
export function bookingPast(data: Data, b: Booking) {
  const days = bookingServices(data, b);
  return !days.length || days[days.length - 1].to <= data.now;
}
// Where each booked day stands, with its hours and pay.
export function dayRecords(data: Data, b: Booking) {
  const shift = data.shifts.find((s) => s.id === b.shift)!;
  return shift.days
    .filter((d) => b.days.includes(d.date))
    .map((d) => {
      const log = b.log[d.date];
      const status: DayStatus = log ? log.status : d.to <= data.now ? "to-confirm" : "booked";
      const hours = log?.status === "worked" ? log.hours! : hoursOf(d);
      return {
        date: d.date,
        service: d,
        status,
        log,
        start: log?.start || d.start,
        end: log?.end || d.end,
        hours,
        pay: Math.round(hours * shift.rate * 100) / 100,
      };
    });
}
export function offeredDates(shift: Shift, r: Response) {
  return r.days ?? shift.days.map((d) => d.date);
}
// Who is booked on each date of a shift.
export function coverage(data: Data, shift: Shift) {
  return Object.fromEntries(
    shift.days.map((d) => [
      d.date,
      data.bookings
        .filter((b) => b.shift === shift.id && !b.cancelled && activeDays(b).includes(d.date))
        .map((b) => b.talent),
    ]),
  ) as Record<string, string[]>;
}
// Dates that still have a place left and haven't started yet.
export function openDates(data: Data, shift: Shift) {
  const c = coverage(data, shift);
  return shift.days
    .filter((d) => c[d.date].length < shift.capacity && d.from > data.now)
    .map((d) => d.date);
}
// This talent's booking elsewhere that clashes with these hours, if any.
export function conflict(data: Data, talent: string, days: Service[], exclude?: string) {
  return data.bookings.find(
    (b) =>
      b.talent === talent &&
      !b.cancelled &&
      b.shift !== exclude &&
      overlap(days, bookingServices(data, b)),
  );
}
// Days the venue can still book this person for: offered, still open, and
// not already in their booking on this shift.
export function bookableDates(data: Data, shift: Shift, r: Response) {
  const open = openDates(data, shift);
  const mine = data.bookings
    .filter((b) => b.shift === shift.id && b.talent === r.talent && !b.cancelled)
    .flatMap(activeDays);
  return offeredDates(shift, r).filter((d) => open.includes(d) && !mine.includes(d));
}
// Days this talent marked Not free on their own calendar.
export function busyDates(data: Data, talent: string, shift: Shift) {
  return shift.days
    .filter((d) =>
      data.availability.some((a) => a.member === talent && a.date === d.date && a.kind === "not-free"),
    )
    .map((d) => d.date);
}
// Dates of a shift this talent could still take: open, and not clashing
// with their own bookings elsewhere.
export function availableDates(data: Data, talent: string, shift: Shift) {
  const open = openDates(data, shift);
  return shift.days
    .filter((d) => open.includes(d.date) && !conflict(data, talent, [d], shift.id))
    .map((d) => d.date);
}
// "Worked with you" comes only from recorded work: a day at this venue that
// was confirmed as worked.
export function workedWith(data: Data, venue: string, talent: string) {
  return data.bookings.some(
    (b) =>
      b.talent === talent &&
      data.shifts.find((x) => x.id === b.shift)?.venue === venue &&
      Object.values(b.log).some((l) => l.status === "worked"),
  );
}
// A booking request to one person for one place books when they accept.
export function bookOnAccept(data: Data, s: Shift) {
  if (s.acceptBooks !== undefined) return s.acceptBooks;
  return (
    s.mode === "request" &&
    s.capacity === 1 &&
    data.responses.filter((r) => r.shift === s.id && r.source === "invite").length === 1
  );
}
// A booking request everyone it went to turned down.
export function declinedByAll(data: Data, s: Shift) {
  // The database records that nobody was left.
  if (s.closedBy !== undefined) return s.closedBy === "all-declined";
  const answers = data.responses.filter((r) => r.shift === s.id && r.source === "invite");
  return (
    s.mode === "request" &&
    answers.length > 0 &&
    answers.every((r) => ["declined", "withdrawn"].includes(r.status))
  );
}
// This venue's most recent ask in a team, or any team: the form starts from it.
export function lastAsk(data: Data, venue: string, family?: string) {
  return data.shifts.find((s) => s.venue === venue && (!family || teamOf(s.roles) === family));
}
// An open shift from the same venue for the same roles and overlapping hours.
export function similarShift(data: Data, venue: string, roles: string[], days: Service[]) {
  return data.shifts.find(
    (s) =>
      s.venue === venue &&
      s.status === "open" &&
      s.roles.some((r) => roles.includes(r)) &&
      overlap(s.days, days),
  );
}
// This person's live answer on another of this venue's shifts for any of
// these hours: a request waiting, a yes, or a booking. A venue never sends a
// second ask for the same hours; it books from the one already there.
export function openAnswer(data: Data, venue: string, talent: string, days: Service[], exclude?: string) {
  return data.responses.find((r) => {
    if (r.talent !== talent || r.shift === exclude) return false;
    if (!["invited", "can-cover", "booked"].includes(r.status)) return false;
    const s = data.shifts.find((x) => x.id === r.shift);
    if (!s || s.venue !== venue) return false;
    if (r.status !== "booked" && s.status !== "open") return false;
    const theirs =
      r.status === "booked"
        ? data.bookings
            .filter((b) => b.shift === s.id && b.talent === talent && !b.cancelled)
            .flatMap(activeDays)
        : offeredDates(s, r);
    return overlap(s.days.filter((d) => theirs.includes(d.date)), days);
  });
}
// One line a venue reads to know where a shift stands. Never contradicts the
// day-by-day detail: it talks in people per day, not "days covered".
export function venueSummary(data: Data, s: Shift): { text: string; good: boolean; needs: boolean } {
  const waiting = data.responses.filter(
    (r) =>
      r.shift === s.id &&
      ["can-cover", "booked"].includes(r.status) &&
      // Only yeses from approved talent can be booked.
      data.members.find((m) => m.id === r.talent)?.approved !== false &&
      bookableDates(data, s, r).length > 0,
  ).length;
  const c = coverage(data, s);
  const open = openDates(data, s);
  const active = data.bookings.filter((b) => b.shift === s.id && !b.cancelled);
  // Bookings with a cancelled day that now needs someone again.
  const dropped = data.bookings.filter(
    (b) => b.shift === s.id && b.days.some((d) => b.log[d]?.status === "cancelled" && open.includes(d)),
  );
  // A cancellation reopened a day: say what's needed, not who cancelled.
  const prefix = dropped.length ? "Cover needed again · " : "";
  // People asked and still deciding: someone who declined isn't waited on.
  const deciding = data.responses
    .filter((r) => r.shift === s.id && r.status === "invited")
    .map((r) => {
      const m: Member | undefined = data.members.find((x) => x.id === r.talent);
      return m ? firstName(m) : "Someone";
    });
  if (s.status === "filled") return { text: "Filled", good: true, needs: false };
  if (s.status === "expired") return { text: "Started unfilled", good: false, needs: false };
  if (s.status === "closed")
    return { text: declinedByAll(data, s) ? "Declined" : "Cancelled", good: false, needs: false };
  if (waiting) return { text: `${prefix}${waiting} said yes · Book`, good: true, needs: true };
  if (active.length || dropped.length) {
    const people = (k: number, more: boolean) => `${k}${more ? " more" : ""} ${k === 1 ? "person" : "people"}`;
    let text: string;
    if (s.days.length === 1)
      text =
        s.capacity > 1 ? `${c[s.days[0].date].length} of ${s.capacity} booked` : prefix ? "" : "Needs someone";
    else {
      const need = open.map((d) => ({ d, k: s.capacity - c[d].length, more: c[d].length > 0 }));
      const same = need.every((x) => x.k === need[0].k && x.more === need[0].more);
      text = same
        ? `${need.map((x) => shortDay(x.d)).join(", ")} ${need.length > 1 ? "each need" : "needs"} ${people(need[0].k, need[0].more)}`
        : need.map((x) => `${shortDay(x.d)} needs ${people(x.k, x.more)}`).join(" · ");
    }
    // Once the venue has asked someone else, the next move is theirs: it waits.
    if (dropped.length && deciding.length)
      return { text: `Waiting for ${joinNames(deciding)}`, good: false, needs: false };
    const full = text ? `${prefix}${text}` : prefix.replace(/ · $/, "");
    return { text: full, good: false, needs: !!dropped.length };
  }
  return {
    text: s.mode === "request" && deciding.length ? `Waiting for ${joinNames(deciding)}` : "No replies yet",
    good: false,
    needs: false,
  };
}
