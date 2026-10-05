import { TEAMS, SKILLS as CATALOGUE_SKILLS } from "../catalogue.ts";
export type Side = "venue" | "talent";
export type ResponseStatus =
  | "invited"
  | "can-cover"
  | "booked"
  | "cancelled"
  | "declined"
  | "withdrawn"
  | "not-selected"
  | "lapsed";
// Preview profile shape; the additive database mapping is in docs/data-model.md.
export type VenueDetails = {
  address: string; // street line; the postcode is on the member
  contactName: string;
  contactRole: string;
  types: string[];
  cuisines: string[];
  covers: string;
  teamSize: number;
  website: string;
  instagram: string;
  knownFor: string[];
  teamsNeeded: string[];
  dressCode: string;
  uniform: boolean;
  staffMeal: boolean;
  rateChef: number;
  rateFoh: number;
  vacancies: number;
};
export type Member = {
  id: string;
  side: "venue" | "talent";
  name: string;
  phone: string;
  email: string;
  postcode: string;
  photo: string;
  bio: string;
  roles: string[];
  skills: string[];
  customSkills: string[];
  approved: boolean;
  alert: "all" | "soon" | "off";
  // Talent only: the lowest hourly pay they'll take, shown to venues.
  minRate?: number;
  venue?: VenueDetails;
  account?: Account;
};
export type DocStatus = "verified" | "review" | "missing";
// Settings a signed-in member manages for themselves. Never shown publicly,
// except which documents Dyuknow has verified.
export type Account = {
  texts: { messages: boolean; reminders: boolean; replies: boolean };
  quiet: { on: boolean; start: string; end: string };
  docs: Record<string, { status: DocStatus; file?: string; updated?: string }>;
  payout?: { holder: string; sortCode: string; last4: string };
  billing?: { company: string; email: string; vat: string };
  // When the member asked Dyuknow to delete their account.
  deletion?: string;
};
// What Dyuknow checks before someone can be booked or book.
export function requiredDocs(m: Pick<Member, "side" | "roles">) {
  if (m.side === "venue") return ["Business registration", "Premises licence"];
  const kitchen = m.roles.some((r) => [...TEAMS.Kitchen, ...TEAMS.Pastry].includes(r as never));
  return ["Right to work", "Photo ID", kitchen ? "Food hygiene certificate" : "Allergen awareness"];
}
export function accountOf(m: Member): Account {
  const docs = Object.fromEntries(
    requiredDocs(m).map((d) => [d, m.account?.docs[d] ?? { status: "missing" as const }]),
  );
  return {
    texts: { messages: true, reminders: true, replies: true },
    quiet: { on: false, start: "23:00", end: "08:00" },
    ...m.account,
    docs,
  };
}
export function verifiedDocs(m: Member) {
  const docs = accountOf(m).docs;
  return Object.keys(docs).filter((d) => docs[d].status === "verified");
}
export type Service = {
  date: string;
  start: string;
  end: string;
  from: string;
  to: string;
};
// What a venue needs: position, days, hours, pay. One object for both ways
// of asking. A job post ("post") goes to everyone; a booking request
// ("request") goes to the people the venue chose. Either way talent says yes
// and the venue books.
export type Shift = {
  id: string;
  venue: string;
  roles: string[];
  family: string;
  days: Service[];
  capacity: number;
  rate: number;
  note: string;
  mode: "post" | "request";
  status: "open" | "filled" | "closed" | "expired";
  created: string;
  address?: string;
  contact?: string;
  phone?: string;
  // Multi-day only: the venue wants the same person on every day.
  together?: boolean;
};
// One person's answer to a shift. "invited" means a booking request is
// waiting for them; "can-cover" means they said yes and the venue decides.
export type Response = {
  id: string;
  shift: string;
  talent: string;
  source: "invite" | "response";
  status: ResponseStatus;
  note: string;
  // Dates the talent said yes to. Missing means every date of the shift.
  days?: string[];
};
// The one conversation between a venue and a talent member. Booking requests,
// answers and booking updates all land here.
export type Thread = {
  id: string;
  venue: string;
  talent: string;
  started: string;
};
// What happened on one booked day. A day with no entry is still booked.
export type DayLog = {
  status: "worked" | "no-show" | "cancelled";
  by: string;
  at: string;
  // Worked: the hours the venue confirmed (scheduled hours unless changed).
  start?: string;
  end?: string;
  hours?: number;
  // Confirmed automatically because the venue didn't within 48 hours.
  auto?: boolean;
  reason?: string;
};
export type Booking = {
  id: string;
  shift: string;
  talent: string;
  // Every date this person was booked for on the shift, cancelled or not.
  days: string[];
  // True once every day is cancelled.
  cancelled: boolean;
  reason?: string;
  by?: string;
  cancelledAt?: string;
  bookedAt?: string;
  log: Record<string, DayLog>;
};
export type Message = {
  id: string;
  thread: string;
  from: string;
  text: string;
  time: string;
  system: boolean;
  // A shift this message is about, shown as a card.
  shift?: string;
};
export type Notice = {
  id: string;
  to: string;
  title: string;
  text: string;
  target: string;
  read: boolean;
  time: string;
};
export type Availability = {
  member: string;
  date: string;
  kind: "free" | "not-free";
  start: string;
  end: string;
};
export type Data = {
  version: 3;
  now: string;
  members: Member[];
  shifts: Shift[];
  responses: Response[];
  bookings: Booking[];
  messages: Message[];
  notices: Notice[];
  availability: Availability[];
  threads: Thread[];
  read: Record<string, string>;
  messageDrafts: Record<string, string>;
  offline: boolean;
  failNext: boolean;
  reminders?: string[];
  setupDrafts?: Record<
    string,
    {
      member: Member;
      step: number;
      availability: boolean;
      availabilityDates?: string[];
      availabilityPeriod?: "day" | "evening";
    }
  >;
};
export type ShiftDraft = {
  roles: string[];
  family: string;
  date: string;
  count: number;
  start: string;
  end: string;
  capacity: number;
  rate: number;
  note: string;
  // Who a booking request goes to. Empty means a job post to everyone.
  to: string[];
  together?: boolean;
  // Any dates (up to 14) with the same hours. When missing, `date` + `count`
  // describe a consecutive run.
  dates?: string[];
};
// The most dates one shift can cover: two weeks of holiday cover.
export const MAX_DAYS = 14;
// How long a venue has to confirm a day's hours before they confirm themselves.
export const CONFIRM_WITHIN = 48 * 3600000;
// Teams and their positions come from the shared list; the preview only adds
// the tile photography.
export const FAMILIES: Record<string, { roles: string[]; photo: string }> = {
  Kitchen: { roles: [...TEAMS.Kitchen], photo: "/assets/role-headchef-tile.webp" },
  Pastry: { roles: [...TEAMS.Pastry], photo: "/assets/talent-pastry-dish-1.webp" },
  Bar: { roles: [...TEAMS.Bar], photo: "/assets/talent-bartender-1.webp" },
  Sommelier: { roles: [...TEAMS.Sommelier], photo: "/assets/talent-sommelier-1.webp" },
  Floor: { roles: [...TEAMS.Floor], photo: "/assets/talent-maitred-1.webp" },
};
export const SKILLS = CATALOGUE_SKILLS;
// "TW9 1UA" → "TW9": the only part of a postcode shown before a booking.
export function areaOf(m: Pick<Member, "postcode">) {
  const p = m.postcode.trim().toUpperCase();
  if (!p) return "";
  return p.includes(" ") ? p.split(" ")[0] : p.slice(0, -3) || p;
}
export function fullAddress(m: Member) {
  return [m.venue?.address, m.postcode].filter(Boolean).join(", ");
}
export function contactLine(m: Member) {
  return [m.venue?.contactName, m.venue?.contactRole].filter(Boolean).join(" · ");
}
export function allSkills(m: Member) {
  return [...m.skills, ...m.customSkills];
}
// Pay pre-fill: the chef rate for Kitchen and Pastry, the FOH rate otherwise.
export function defaultRate(m: Member, family: string) {
  return ["Kitchen", "Pastry"].includes(family)
    ? m.venue?.rateChef || 0
    : m.venue?.rateFoh || 0;
}
// Note pre-fill, built from the venue's dress code, uniform and staff meal.
export function defaultNote(m: Member) {
  const v = m.venue;
  if (!v) return "";
  return [
    v.dressCode,
    v.uniform ? "Uniform provided" : "Uniform not provided",
    v.staffMeal ? "Staff meal" : "No staff meal",
  ]
    .filter(Boolean)
    .join(" · ");
}
export function uid() {
  return crypto.randomUUID();
}
export function datePlus(date: string, count: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + count);
  return d.toISOString().slice(0, 10);
}
export function londonDate(now: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));
}
export function displayDate(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  }).format(new Date(`${date}T12:00:00Z`));
}
export function clockLabel(now: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(now));
}
// Resolve London wall time using the timezone database, including overnight/DST.
// Ambiguous and nonexistent wall times require another selection in this preview.
export function londonInstant(date: string, time: string) {
  const target = `${date} ${time}`;
  const guess = Date.parse(`${date}T${time}:00Z`);
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const matches = [guess - 3600000, guess, guess + 3600000].filter(
    (t) => fmt.format(new Date(t)) === target,
  );
  if (matches.length !== 1)
    throw new Error(
      matches.length
        ? "This London time occurs twice when the clocks change. Choose a time outside 01:00–02:00."
        : "This London time does not exist when the clocks change. Choose a different hour.",
    );
  return new Date(matches[0]).toISOString();
}
export function makeDays(d: ShiftDraft): Service[] {
  const list = Array.isArray(d.dates)
    ? [...new Set(d.dates)].sort()
    : Number.isInteger(d.count) && d.date
      ? Array.from({ length: d.count }, (_, i) => datePlus(d.date, i))
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
export function serviceLabel(s: Service) {
  return `${displayDate(s.date)} · ${s.start}${s.end < s.start ? ` → ${displayDate(datePlus(s.date, 1))} ${s.end}` : `–${s.end}`}`;
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
// Where each booked day stands: the record payments will run on.
export type DayStatus = "booked" | "to-confirm" | "worked" | "no-show" | "cancelled";
export function dayRecords(data: Data, b: Booking) {
  const shift = data.shifts.find((s) => s.id === b.shift)!;
  return shift.days
    .filter((d) => b.days.includes(d.date))
    .map((d) => {
      const log = b.log[d.date];
      const status: DayStatus = log
        ? log.status
        : d.to <= data.now
          ? "to-confirm"
          : "booked";
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
        .filter(
          (b) =>
            b.shift === shift.id && !b.cancelled && activeDays(b).includes(d.date),
        )
        .map((b) => b.talent),
    ]),
  ) as Record<string, string[]>;
}
// Dates that still have a place left.
// Dates that still have a place left and haven't started yet.
export function openDates(data: Data, shift: Shift) {
  const c = coverage(data, shift);
  return shift.days
    .filter((d) => c[d.date].length < shift.capacity && d.from > data.now)
    .map((d) => d.date);
}
export function conflict(
  data: Data,
  talent: string,
  days: Service[],
  exclude?: string,
) {
  return data.bookings.find(
    (b) =>
      b.talent === talent &&
      !b.cancelled &&
      b.shift !== exclude &&
      overlap(days, bookingServices(data, b)),
  );
}
// Dates of a shift this talent could still take: open, and not clashing
// with their own bookings elsewhere.
// "Thu 8": short enough for buttons, unambiguous across two weeks.
export function shortDay(date: string) {
  return displayDate(date).replace(/ [A-Za-z]+$/, "");
}
// Days this talent could still add to what they've offered on a shift.
export function offerableDates(data: Data, talent: string, shift: Shift) {
  const r = data.responses.find(
    (r) => r.shift === shift.id && r.talent === talent,
  );
  const offered =
    r && ["can-cover", "booked"].includes(r.status) ? offeredDates(shift, r) : [];
  const mine = data.bookings
    .filter((b) => b.shift === shift.id && b.talent === talent && !b.cancelled)
    .flatMap(activeDays);
  return availableDates(data, talent, shift).filter(
    (d) => !offered.includes(d) && !mine.includes(d),
  );
}
// Days the venue can still book this person for: offered, still open, and
// not already in their booking on this shift.
export function bookableDates(data: Data, shift: Shift, r: Response) {
  const open = openDates(data, shift);
  const mine = data.bookings
    .filter((b) => b.shift === shift.id && b.talent === r.talent && !b.cancelled)
    .flatMap(activeDays);
  return offeredDates(shift, r).filter(
    (d) => open.includes(d) && !mine.includes(d),
  );
}
// Days this talent marked Not free on their own calendar.
export function busyDates(data: Data, talent: string, shift: Shift) {
  return shift.days
    .filter((d) =>
      data.availability.some(
        (a) => a.member === talent && a.date === d.date && a.kind === "not-free",
      ),
    )
    .map((d) => d.date);
}
export function availableDates(data: Data, talent: string, shift: Shift) {
  const open = openDates(data, shift);
  return shift.days
    .filter((d) => open.includes(d.date) && !conflict(data, talent, [d], shift.id))
    .map((d) => d.date);
}
export function relativeDay(date: string, now: string) {
  const today = londonDate(now);
  if (date === today) return "Today";
  if (date === datePlus(today, 1)) return "Tomorrow";
  return displayDate(date);
}
export function hoursOf(s: Service) {
  return (Date.parse(s.to) - Date.parse(s.from)) / 3600000;
}
// "Worked with you" comes only from recorded work: a day at this venue that
// was confirmed as worked.
export function workedWith(data: Data, venue: string, talent: string) {
  return data.bookings.some(
    (b) =>
      b.talent === talent &&
      data.shifts.find((x) => x.id === b.shift)!.venue === venue &&
      Object.values(b.log).some((l) => l.status === "worked"),
  );
}
export function joinNames(list: string[]) {
  if (list.length <= 1) return list.join("");
  return `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`;
}
export function firstName(m: Member) {
  return m.side === "talent" ? m.name.split(" ")[0] : m.name;
}
// Runs of back-to-back dates: ["Sat 3", "Sun 4", "Tue 6"] → [[3, 4], [6]].
function runs(dates: string[]) {
  const sorted = [...new Set(dates)].sort();
  const out: string[][] = [];
  for (const d of sorted) {
    const last = out.at(-1);
    if (last && datePlus(last.at(-1)!, 1) === d) last.push(d);
    else out.push([d]);
  }
  return out;
}
// Compact label for dates, back-to-back days as ranges: "Mon 5 Oct",
// "Mon 5–Wed 7 Oct", "Sat 3–Sun 4, Tue 13 Oct".
export function datesLabel(dates: string[]) {
  const groups = runs(dates);
  if (!groups.length) return "";
  const all = groups.flat();
  if (all.length === 1) return displayDate(all[0]);
  const sameMonth = all.every((d) => d.slice(0, 7) === all[0].slice(0, 7));
  const short = (d: string) =>
    sameMonth ? displayDate(d).replace(/ [A-Za-z]+$/, "") : displayDate(d);
  const month = sameMonth ? displayDate(all[0]).replace(/^.* /, " ") : "";
  return `${groups
    .map((g) => (g.length > 1 ? `${short(g[0])}–${short(g.at(-1)!)}` : short(g[0])))
    .join(", ")}${month}`;
}
// Dates short enough for one glance. Up to two runs read in full; more
// become a count and the span they fall in: "7 days" · "Sat 3 – Tue 20 Oct".
export function datesSummary(dates: string[]) {
  const groups = runs(dates);
  const all = groups.flat();
  if (groups.length <= 2) return { main: datesLabel(all), sub: "" };
  const first = displayDate(all[0]);
  const last = displayDate(all.at(-1)!);
  const sameMonth = all[0].slice(0, 7) === all.at(-1)!.slice(0, 7);
  return {
    main: `${all.length} days`,
    sub: `${sameMonth ? first.replace(/ [A-Za-z]+$/, "") : first} – ${last}`,
  };
}
// Talent who were sent this shift: everyone in the roles for a job post, the
// chosen people for a booking request.
export function audience(data: Data, shift: Shift) {
  const invited = data.responses
    .filter((r) => r.shift === shift.id && r.source === "invite")
    .map((r) => r.talent);
  if (shift.mode === "request") return invited;
  return [
    ...new Set([
      ...data.members
        .filter(
          (m) =>
            m.side === "talent" &&
            m.approved &&
            m.roles.some((r) => shift.roles.includes(r)),
        )
        .map((m) => m.id),
      ...invited,
    ]),
  ];
}
// One line a venue reads to know where a shift stands. Never contradicts the
// day-by-day detail: it talks in people per day, not "days covered".
export function venueSummary(data: Data, s: Shift) {
  const waiting = data.responses.filter(
    (r) =>
      r.shift === s.id &&
      ["can-cover", "booked"].includes(r.status) &&
      bookableDates(data, s, r).length > 0,
  ).length;
  const c = coverage(data, s);
  const open = openDates(data, s);
  const active = data.bookings.filter((b) => b.shift === s.id && !b.cancelled);
  // Bookings with a cancelled day that now needs someone again.
  const dropped = data.bookings.filter(
    (b) =>
      b.shift === s.id &&
      b.days.some((d) => b.log[d]?.status === "cancelled" && open.includes(d)),
  );
  const prefix = dropped.length
    ? `${joinNames([...new Set(dropped.map((b) => firstName(member(data, b.talent))))])} cancelled · `
    : "";
  if (s.status === "filled") return { text: "Filled", good: true, needs: false };
  if (s.status === "expired")
    return { text: "Started without full cover", good: false, needs: false };
  if (s.status === "closed") return { text: "Closed", good: false, needs: false };
  if (waiting)
    return { text: `${prefix}${waiting} can do it · Review`, good: true, needs: true };
  if (active.length || dropped.length) {
    const people = (k: number, more: boolean) =>
      `${k}${more ? " more" : ""} ${k === 1 ? "person" : "people"}`;
    let text: string;
    if (s.days.length === 1)
      text =
        s.capacity > 1
          ? `${c[s.days[0].date].length} of ${s.capacity} booked`
          : prefix
            ? "needs someone"
            : "Needs someone";
    else {
      const need = open.map((d) => ({
        d,
        k: s.capacity - c[d].length,
        more: c[d].length > 0,
      }));
      const same = need.every((x) => x.k === need[0].k && x.more === need[0].more);
      text = same
        ? `${need.map((x) => shortDay(x.d)).join(", ")} ${need.length > 1 ? "each need" : "needs"} ${people(need[0].k, need[0].more)}`
        : need.map((x) => `${shortDay(x.d)} needs ${people(x.k, x.more)}`).join(" · ");
    }
    return { text: `${prefix}${text}`, good: false, needs: !!dropped.length };
  }
  return {
    text:
      s.mode === "request"
        ? `Waiting to hear from ${joinNames(audience(data, s).map((id) => firstName(member(data, id))))}`
        : "No one has said yes yet",
    good: false,
    needs: false,
  };
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
export function isFree(data: Data, talent: string, days: Service[]) {
  if (conflict(data, talent, days)) return false;
  return days.every((day) =>
    data.availability
      .filter((a) => a.member === talent && a.kind === "free")
      .some((a) => {
        try {
          const start = londonInstant(a.date, a.start);
          const end = londonInstant(
            a.end <= a.start ? datePlus(a.date, 1) : a.date,
            a.end,
          );
          return start <= day.from && end >= day.to;
        } catch {
          return false;
        }
      }),
  );
}
// Where a talent member stands for some hours, from their own calendar and
// their bookings. Only "free" means they said yes to those hours.
export type Standing = "free" | "booked" | "not-free" | "other-hours" | "not-set";
export function standing(data: Data, talent: string, days: Service[]): Standing {
  if (!days.length) return "not-set";
  if (conflict(data, talent, days)) return "booked";
  if (isFree(data, talent, days)) return "free";
  const marks = data.availability.filter(
    (a) => a.member === talent && days.some((d) => d.date === a.date),
  );
  if (marks.some((a) => a.kind === "not-free")) return "not-free";
  return marks.length ? "other-hours" : "not-set";
}
export function standingLabel(data: Data, talent: string, days: Service[]) {
  const s = standing(data, talent, days);
  if (s !== "free" && s !== "booked" && days.length > 1) {
    const k = days.filter((d) => standing(data, talent, [d]) === "free").length;
    if (k) return `Free ${k} of ${days.length} days`;
  }
  if (s === "other-hours") {
    const a = data.availability.find(
      (a) => a.member === talent && a.date === days[0].date && a.kind === "free",
    );
    return a ? `Free ${a.start}–${a.end} only` : "Free other hours";
  }
  return {
    free: "Free then",
    booked: "Booked elsewhere then",
    "not-free": "Not free then",
    "not-set": "Availability not set",
  }[s];
}
// Who a venue sees for a team at a time. While the network is small this is
// everyone vetted, in order:
// 1. in the role (or team) and free then,
// 2. in the role (or team) but not free, or no availability set,
// 3. everyone else, same team first.
export function rankTalent(
  data: Data,
  venue: string,
  family: string,
  role: string | undefined,
  days: Service[],
) {
  const fits = (m: Member) =>
    role ? m.roles.includes(role) : m.roles.some((r) => FAMILIES[family]?.roles.includes(r));
  const inTeam = (m: Member) =>
    m.roles.some((r) => FAMILIES[family]?.roles.includes(r));
  const free = (m: Member) => standing(data, m.id, days) === "free";
  const order = (a: Member, b: Member) =>
    Number(inTeam(b)) - Number(inTeam(a)) ||
    Number(free(b)) - Number(free(a)) ||
    Number(workedWith(data, venue, b.id)) - Number(workedWith(data, venue, a.id)) ||
    a.name.localeCompare(b.name);
  const talent = data.members
    .filter((m) => m.side === "talent" && m.approved)
    .sort(order);
  return {
    free: talent.filter((m) => fits(m) && free(m)),
    unavailable: talent.filter((m) => fits(m) && !free(m)),
    others: talent.filter((m) => !fits(m)),
  };
}
// Days for a set of dates with the same hours.
export function daysFor(w: { dates: string[]; start: string; end: string }) {
  return makeDays({ dates: w.dates, start: w.start, end: w.end } as ShiftDraft);
}
export function threadBetween(data: Data, venue: string, talent: string) {
  return data.threads.find((t) => t.venue === venue && t.talent === talent);
}
// The conversation for this pair, started if it doesn't exist yet.
function threadFor(data: Data, venue: string, talent: string) {
  let t = threadBetween(data, venue, talent);
  if (!t) {
    t = { id: uid(), venue, talent, started: data.now };
    data.threads.push(t);
  }
  return t;
}
export function member(data: Data, id: string) {
  return data.members.find((m) => m.id === id)!;
}
// This person's live answer on another of this venue's shifts for any of
// these hours: a request waiting, a yes, or a booking. A venue never sends a
// second ask for the same hours; it books from the one already there.
export function openAnswer(
  data: Data,
  venue: string,
  talent: string,
  days: Service[],
  exclude?: string,
) {
  return data.responses.find((r) => {
    if (r.talent !== talent || r.shift === exclude) return false;
    if (!["invited", "can-cover", "booked"].includes(r.status)) return false;
    const s = data.shifts.find((x) => x.id === r.shift)!;
    if (s.venue !== venue) return false;
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
export function shiftLabel(s: Shift) {
  return s.roles.join(" or ");
}
export function bookingPast(data: Data, b: Booking) {
  const days = bookingServices(data, b);
  return !days.length || days[days.length - 1].to <= data.now;
}
export function responseLabel(r: Response) {
  return {
    invited: "Booking request",
    "can-cover": "Waiting to hear",
    booked: "Booked",
    cancelled: "Cancelled",
    declined: "Declined",
    withdrawn: "Withdrawn",
    "not-selected": "Position filled",
    lapsed: "No longer available",
  }[r.status];
}
export function notify(
  data: Data,
  to: string,
  title: string,
  text: string,
  target: string,
) {
  data.notices.unshift({
    id: uid(),
    to,
    title,
    text,
    target,
    read: false,
    time: data.now,
  });
}
// A status line in this person's conversation with the venue.
function event(data: Data, r: Response, text: string) {
  const s = data.shifts.find((x) => x.id === r.shift)!;
  data.messages.push({
    id: uid(),
    thread: threadFor(data, s.venue, r.talent).id,
    from: "system",
    text,
    time: data.now,
    system: true,
  });
}
// A shift card in the conversation, sent by `from`.
function card(data: Data, s: Shift, talent: string, from: string, text: string) {
  data.messages.push({
    id: uid(),
    thread: threadFor(data, s.venue, talent).id,
    from,
    text,
    time: data.now,
    system: false,
    shift: s.id,
  });
}
function closeWaiting(
  data: Data,
  s: Shift,
  text: string,
  status: ResponseStatus = "not-selected",
) {
  data.responses
    .filter(
      (r) => r.shift === s.id && ["invited", "can-cover"].includes(r.status),
    )
    .forEach((r) => {
      r.status = status;
      event(data, r, text);
      notify(
        data,
        r.talent,
        text,
        `${member(data, s.venue).name} · ${shiftLabel(s)}`,
        `shift/${s.id}`,
      );
    });
}
// A new booking: this person's other waiting answers lose the clashing days.
function trimClashes(data: Data, b: Booking) {
  const t = member(data, b.talent);
  const booked = bookingServices(data, b);
  const venue = data.shifts.find((x) => x.id === b.shift)!.venue;
  data.responses
    .filter(
      (o) =>
        o.talent === b.talent &&
        o.shift !== b.shift &&
        ["invited", "can-cover"].includes(o.status),
    )
    .forEach((o) => {
      const other = data.shifts.find((x) => x.id === o.shift)!;
      // "Elsewhere" only when it really is another venue.
      const where =
        other.venue === venue
          ? `on another ${member(data, venue).name} shift`
          : "elsewhere";
      const clashing = other.days
        .filter((d) => overlap([d], booked))
        .map((d) => d.date);
      if (!clashing.length) return;
      const remaining = offeredDates(other, o).filter(
        (d) => !clashing.includes(d),
      );
      if (o.status === "can-cover" && remaining.length) {
        o.days = remaining;
        event(
          data,
          o,
          `${t.name} is now booked ${where} on ${datesLabel(clashing)} and can still do ${datesLabel(remaining)}.`,
        );
        return;
      }
      if (o.status === "invited" && remaining.length) return;
      o.status = "lapsed";
      event(data, o, `No longer available — booked ${where} at this time.`);
      // The venue that made the booking already knows.
      if (other.venue !== venue)
        notify(
          data,
          other.venue,
          `${t.name} is no longer available`,
          `${shiftLabel(other)} · booked elsewhere for those hours.`,
          `shift/${o.shift}`,
        );
    });
}
export function sweep(data: Data) {
  data.shifts.forEach((s) => {
    // A shift closes once no day that still needs someone is in the future.
    if (
      s.status === "open" &&
      !openDates(data, s).length &&
      s.days.some((d) => coverage(data, s)[d.date].length < s.capacity)
    ) {
      s.status = "expired";
      closeWaiting(data, s, "This shift has started", "lapsed");
      notify(
        data,
        s.venue,
        "Shift expired",
        "Unfilled places are now closed.",
        `shift/${s.id}`,
      );
    }
  });
  // A day the venue hasn't confirmed within 48 hours counts as worked, at the
  // scheduled hours.
  for (const b of data.bookings.filter((b) => !b.cancelled))
    for (const d of bookingServices(data, b))
      if (!b.log[d.date] && Date.parse(d.to) + CONFIRM_WITHIN <= Date.parse(data.now))
        b.log[d.date] = {
          status: "worked",
          by: "dyuknow",
          at: data.now,
          start: d.start,
          end: d.end,
          hours: hoursOf(d),
          auto: true,
        };
  data.reminders ??= [];
  for (const booking of data.bookings.filter((b) => !b.cancelled)) {
    const shift = data.shifts.find((s) => s.id === booking.shift)!;
    const first = bookingServices(data, booking)[0];
    const bookedAt = booking.bookedAt || shift.created;
    const reminder =
      londonDate(bookedAt) === first.date
        ? new Date(Date.parse(first.from) - 7200000).toISOString()
        : londonInstant(datePlus(first.date, -1), "18:00");
    if (
      reminder > bookedAt &&
      reminder <= data.now &&
      first.from > data.now &&
      !data.reminders.includes(booking.id)
    ) {
      data.reminders.push(booking.id);
      if (accountOf(member(data, booking.talent)).texts.reminders)
      notify(
        data,
        booking.talent,
        "Your next service is coming up",
        `${member(data, shift.venue).name} · ${serviceLabel(first)}. Check your arrival details.`,
        `booking/${booking.id}`,
      );
    }
  }
}
export function seed(): Data {
  const talent = (
    m: Pick<Member, "id" | "name" | "phone" | "email" | "postcode" | "photo" | "bio" | "roles" | "skills"> &
      Partial<Member>,
  ): Member => ({
    side: "talent",
    customSkills: [],
    approved: true,
    alert: "all",
    ...m,
  });
  const members: Member[] = [
    {
      id: "spruce",
      side: "venue",
      name: "Spruce",
      phone: "+44 7700 900101",
      email: "kitchen@spruce.example",
      postcode: "TW9 1UA",
      photo: "/assets/venue-larkspur-dining.webp",
      bio: "A neighbourhood dining room built around seasonal British produce.",
      roles: [],
      skills: [],
      customSkills: [],
      approved: true,
      alert: "all",
      venue: {
        address: "14 Church Road, Richmond, London",
        contactName: "Alex",
        contactRole: "Duty manager",
        types: ["Restaurant"],
        cuisines: ["British"],
        covers: "30–60",
        teamSize: 14,
        website: "spruce.example",
        instagram: "@spruce.richmond",
        knownFor: ["Excellent food", "Great team culture"],
        teamsNeeded: ["Kitchen", "Pastry"],
        dressCode: "Chef whites",
        uniform: true,
        staffMeal: true,
        rateChef: 18,
        rateFoh: 16,
        vacancies: 2,
      },
    },
    {
      id: "sea",
      side: "venue",
      name: "The Sea The Sea",
      phone: "+44 7700 900102",
      email: "hello@theseathesea.example",
      postcode: "SW1X 0AW",
      photo: "/assets/venue-hotel-bar.webp",
      bio: "A seafood counter with an open kitchen and a calm service.",
      roles: [],
      skills: [],
      customSkills: [],
      approved: true,
      alert: "all",
      venue: {
        address: "174 Pavilion Road, Chelsea, London",
        contactName: "Morgan",
        contactRole: "On-site manager",
        types: ["Restaurant"],
        cuisines: ["Seafood"],
        covers: "30–60",
        teamSize: 12,
        website: "theseathesea.example",
        instagram: "@theseathesea",
        knownFor: ["Fine dining standards", "Fast-paced service"],
        teamsNeeded: ["Kitchen", "Pastry", "Floor", "Bar"],
        dressCode: "Chef whites",
        uniform: false,
        staffMeal: true,
        rateChef: 22,
        rateFoh: 18,
        vacancies: 3,
      },
    },
    {
      id: "harper",
      side: "venue",
      name: "Harper Privé",
      phone: "+44 7700 900103",
      email: "events@harperprive.example",
      postcode: "W1K 5DB",
      photo: "/assets/venue-members-club.webp",
      bio: "Intimate private dinners and considered events.",
      roles: [],
      skills: [],
      customSkills: [],
      approved: true,
      alert: "all",
      venue: {
        address: "8 Brook Street, Mayfair, London",
        contactName: "Jamie",
        contactRole: "Events manager",
        types: ["Private Members Club", "Events"],
        cuisines: ["Modern European"],
        covers: "0–30",
        teamSize: 9,
        website: "harperprive.example",
        instagram: "@harperprive",
        knownFor: ["Creative food"],
        teamsNeeded: ["Kitchen", "Pastry"],
        dressCode: "Blacks",
        uniform: false,
        staffMeal: true,
        rateChef: 24,
        rateFoh: 20,
        vacancies: 1,
      },
    },
    talent({
      id: "poppy",
      minRate: 16,
      name: "Poppy Bertram",
      phone: "+44 7700 900201",
      email: "poppy@example.com",
      postcode: "TW9 2AA",
      photo: "/assets/talent-chef-4.webp",
      bio: "Five years in seasonal kitchens. Comfortable on a busy section, happiest working with British produce.",
      roles: ["CDP", "Senior CDP"],
      skills: ["Fine Dining", "Open Fire", "Grill"],
      customSkills: ["Seasonal British"],
    }),
    talent({
      id: "camille",
      minRate: 25,
      name: "Camille Aubert",
      phone: "+44 7700 900202",
      email: "camille@example.com",
      postcode: "SW3 4RY",
      photo: "/assets/talent-camille-portrait.webp",
      bio: "Nine years leading kitchens. Ex-Core by Clare Smyth. A calm hand at the pass.",
      roles: ["Head Chef", "Sous Chef"],
      skills: ["Open Fire", "Fine Dining", "Fish"],
    }),
    talent({
      id: "theo",
      minRate: 17,
      name: "Theo Marchetti",
      phone: "+44 7700 900203",
      email: "theo@example.com",
      postcode: "W1T 2EZ",
      photo: "/assets/talent-chef-2.webp",
      bio: "Six years on sections in contemporary London restaurants. Produce-led, steady on service.",
      roles: ["CDP", "Senior CDP"],
      skills: ["Fine Dining", "Pasta"],
    }),
    talent({
      id: "ethan",
      minRate: 20,
      name: "Ethan Russell",
      phone: "+44 7700 900204",
      email: "ethan@example.com",
      postcode: "E8 3PB",
      photo: "/assets/talent-chef-3.webp",
      bio: "",
      roles: ["Sous Chef", "Junior Sous"],
      skills: ["High Volume", "Events"],
    }),
    talent({
      id: "noor",
      minRate: 15,
      name: "Noor Haddad",
      phone: "+44 7700 900205",
      email: "noor@example.com",
      postcode: "W1D 4DE",
      photo: "/assets/talent-bartender-1.webp",
      bio: "Four years behind London hotel and restaurant bars. Cocktail service with care and pace.",
      roles: ["Bartender", "Mixologist"],
      skills: ["Cocktails", "High Volume", "Guest Relations"],
    }),
    talent({
      id: "ines",
      minRate: 14,
      name: "Inès Laurent",
      phone: "+44 7700 900206",
      email: "ines@example.com",
      postcode: "W8 7AG",
      photo: "/assets/talent-maitred-1.webp",
      bio: "Guest service from intimate dinners to a busy dining room. Fluent in English and French.",
      roles: ["Waiter", "Host", "Section Waiter"],
      skills: ["Wine Service", "Guest Relations", "Fine Dining"],
    }),
  ];
  // Sample documents: most checked, a few waiting, so both states show.
  for (const m of members) {
    const docs = Object.fromEntries(
      requiredDocs(m).map((d) => [d, { status: "verified" as DocStatus, updated: "2026-09-20T09:00:00.000Z" }]),
    );
    if (m.id === "theo") docs["Food hygiene certificate"] = { status: "review", file: "food-hygiene-level-2.pdf", updated: "2026-09-30T09:00:00.000Z" } as never;
    if (m.id === "noor") docs["Allergen awareness"] = { status: "missing" } as never;
    m.account = {
      texts: { messages: true, reminders: true, replies: true },
      quiet: { on: false, start: "23:00", end: "08:00" },
      docs,
      ...(m.side === "talent"
        ? { payout: { holder: m.name, sortCode: "12-34-56", last4: String(4821 + members.indexOf(m)) } }
        : { billing: { company: `${m.name} Ltd`, email: m.email, vat: "" } }),
    };
  }
  const data: Data = {
    version: 3,
    now: "2026-10-01T09:00:00.000Z",
    members,
    shifts: [],
    responses: [],
    bookings: [],
    messages: [],
    notices: [],
    availability: [],
    threads: [],
    read: {},
    messageDrafts: {},
    offline: false,
    failNext: false,
  };
  for (const m of members.filter((m) => m.side === "talent" && m.id !== "theo"))
    for (let i = 0; i < 14; i++)
      data.availability.push({
        member: m.id,
        date: datePlus("2026-10-01", i),
        kind: "free",
        start: "16:00",
        end: "23:59",
      });
  // Poppy has marked one evening as busy on her own calendar.
  data.availability = data.availability.map((a) =>
    a.member === "poppy" && a.date === "2026-10-06"
      ? { ...a, kind: "not-free" as const, start: "00:00", end: "00:00" }
      : a,
  );
  const day = (date: string, start = "17:00", end = "23:00") =>
    makeDays({ date, start, end, count: 1 } as ShiftDraft);
  data.shifts = [
    {
      id: "spruce-friday",
      venue: "spruce",
      roles: ["CDP", "Senior CDP"],
      family: "Kitchen",
      days: day("2026-10-02"),
      capacity: 1,
      rate: 18,
      note: defaultNote(members[0]),
      mode: "post",
      status: "open",
      created: data.now,
    },
    {
      id: "sea-saturday",
      venue: "sea",
      roles: ["Head Chef", "Sous Chef"],
      family: "Kitchen",
      days: day("2026-10-03", "18:00"),
      capacity: 1,
      rate: 28,
      note: defaultNote(members[1]),
      mode: "request",
      status: "open",
      created: data.now,
    },
    {
      id: "harper-weekend",
      venue: "harper",
      roles: ["CDP"],
      family: "Kitchen",
      days: makeDays({
        date: "2026-10-04",
        start: "17:00",
        end: "23:00",
        count: 3,
      } as ShiftDraft),
      capacity: 1,
      rate: 24,
      note: defaultNote(members[2]),
      mode: "post",
      status: "open",
      created: data.now,
    },
    {
      id: "sea-residency",
      venue: "sea",
      roles: ["Sous Chef", "Junior Sous"],
      family: "Kitchen",
      days: makeDays({
        date: "2026-10-08",
        start: "16:00",
        end: "23:00",
        count: 3,
      } as ShiftDraft),
      capacity: 1,
      rate: 26,
      note: "Chef whites · staff meal · running the pass while our head chef is away. Same person all three nights, please.",
      mode: "post",
      status: "open",
      created: data.now,
      together: true,
    },
    {
      id: "harper-bar",
      venue: "harper",
      roles: ["Bartender", "Mixologist"],
      family: "Bar",
      days: day("2026-10-02", "22:00", "02:00"),
      capacity: 1,
      rate: 22,
      note: "Black shirt · cocktail service · taxi home arranged directly with the venue.",
      mode: "post",
      status: "open",
      created: data.now,
    },
    {
      id: "spruce-floor",
      venue: "spruce",
      roles: ["Waiter"],
      family: "Floor",
      days: day("2026-10-07", "18:00"),
      capacity: 1,
      rate: 18,
      note: "Black shirt · staff meal · relaxed evening service.",
      mode: "post",
      status: "open",
      created: data.now,
    },
    {
      id: "past-poppy",
      venue: "spruce",
      roles: ["CDP"],
      family: "Kitchen",
      days: day("2026-09-28"),
      capacity: 1,
      rate: 18,
      note: defaultNote(members[0]),
      mode: "request",
      status: "filled",
      created: "2026-09-27T09:00:00.000Z",
    },
  ];
  data.responses = [
    {
      id: "invite-camille",
      shift: "sea-saturday",
      talent: "camille",
      source: "invite",
      status: "invited",
      note: "",
    },
    {
      id: "past-response",
      shift: "past-poppy",
      talent: "poppy",
      source: "invite",
      status: "booked",
      note: "",
    },
  ];
  data.bookings = [
    {
      id: "past-booking",
      shift: "past-poppy",
      talent: "poppy",
      days: ["2026-09-28"],
      cancelled: false,
      log: {
        "2026-09-28": {
          status: "worked",
          by: "spruce",
          at: "2026-09-29T10:00:00.000Z",
          start: "17:00",
          end: "23:00",
          hours: 6,
        },
      },
    },
  ];
  const sea = data.shifts.find((s) => s.id === "sea-saturday")!;
  card(data, sea, "camille", "sea", "Booking request");
  notify(
    data,
    "camille",
    "The Sea The Sea sent you a booking request",
    "Head Chef or Sous Chef · Sat 3 Oct · 18:00–23:00 · £28/h",
    "shift/sea-saturday",
  );
  for (const s of data.shifts.filter((s) => s.mode === "post"))
    for (const m of members.filter(
      (m) => m.side === "talent" && m.roles.some((r) => s.roles.includes(r)),
    ))
      notify(
        data,
        m.id,
        `${member(data, s.venue).name} posted a job`,
        `${shiftLabel(s)} · ${serviceLabel(s.days[0])} · £${s.rate}/h`,
        `shift/${s.id}`,
      );
  return data;
}
export type Action =
  | { type: "post"; actor: string; draft: ShiftDraft }
  | {
      type: "respond" | "book" | "withdraw" | "decline";
      actor: string;
      shift: string;
      talent?: string;
      note?: string;
      days?: string[];
    }
  | { type: "close"; actor: string; shift: string; reason: string }
  | {
      type: "cancel";
      actor: string;
      booking: string;
      reason: string;
      // Which future days to cancel. Missing means every future day.
      days?: string[];
    }
  | {
      type: "confirm-day";
      actor: string;
      booking: string;
      date: string;
      status: "worked" | "no-show";
      start?: string;
      end?: string;
    }
  | { type: "message"; actor: string; thread: string; text: string }
  | { type: "open-thread"; actor: string; with: string }
  | {
      type: "availability";
      actor: string;
      dates: string[];
      kind: "free" | "not-free";
      start: string;
      end: string;
    }
  | { type: "profile"; actor: string; patch: Partial<Member> }
  | { type: "account"; actor: string; patch: Partial<Account> }
  | { type: "upload-doc"; actor: string; doc: string; file: string }
  | { type: "verify-doc"; actor: string; member: string; doc: string }
  | { type: "help"; actor: string; text: string }
  | { type: "delete-account"; actor: string; cancel?: boolean }
  | { type: "read-notice"; actor: string; id?: string }
  | { type: "read-chat"; actor: string; thread: string }
  | { type: "draft-message"; actor: string; thread: string; text: string }
  | {
      type: "save-setup";
      side: "venue" | "talent";
      draft: {
        member: Member;
        step: number;
        availability: boolean;
        availabilityDates?: string[];
        availabilityPeriod?: "day" | "evening";
      };
    }
  | { type: "invite"; actor: string; shift: string; talents: string[] }
  | { type: "nudge"; actor: string }
  | {
      type: "join";
      member: Member;
      availableTomorrow?: boolean;
      availabilityDates?: string[];
      availabilityPeriod?: "day" | "evening";
    }
  | { type: "advance"; until: string }
  | { type: "settings"; offline?: boolean; failNext?: boolean };
// Sends a booking request to one person: their answer waits on this shift.
function request(data: Data, s: Shift, talent: string) {
  const venue = member(data, s.venue);
  const t = member(data, talent);
  if (!t || t.side !== "talent") throw new Error("Choose talent members to send this to.");
  const open = openAnswer(data, s.venue, talent, s.days, s.id);
  if (open)
    throw new Error(
      `${t.name} ${open.status === "invited" ? "already has your booking request" : open.status === "booked" ? "is already booked with you" : "already said yes to your job"} for those hours. Open it instead of sending another.`,
    );
  if (!availableDates(data, talent, s).length)
    throw new Error(`${t.name} is booked elsewhere then. Choose someone else.`);
  let r = data.responses.find((r) => r.shift === s.id && r.talent === talent);
  if (r && ["can-cover", "invited", "booked"].includes(r.status)) return;
  if (r) {
    r.status = "invited";
    r.source = "invite";
  } else {
    r = { id: uid(), shift: s.id, talent, source: "invite", status: "invited", note: "" };
    data.responses.push(r);
  }
  card(data, s, talent, s.venue, "Booking request");
  notify(
    data,
    talent,
    `${venue.name} sent you a booking request`,
    `${shiftLabel(s)} · ${datesLabel(s.days.map((d) => d.date))} · ${s.days[0].start}–${s.days[0].end} · £${s.rate}/h`,
    `shift/${s.id}`,
  );
}
export function transition(original: Data, action: Action): Data {
  const data: Data = structuredClone(original);
  sweep(data);
  const utility = [
    "settings",
    "read-notice",
    "read-chat",
    "draft-message",
    "save-setup",
    "nudge",
    "advance",
  ];
  if (!utility.includes(action.type)) {
    if (data.offline)
      throw new Error(
        "You're offline. Nothing was sent. Reconnect in Preview controls, then try again.",
      );
    if (data.failNext)
      throw new Error("The action could not be saved. Nothing was sent; try again.");
  }
  if (action.type === "settings") {
    if (action.offline !== undefined) data.offline = action.offline;
    if (action.failNext !== undefined) data.failNext = action.failNext;
  }
  if (action.type === "advance") {
    if (action.until < data.now)
      throw new Error(
        "Preview time can only move forward. Reset stories to start again.",
      );
    data.now = action.until;
    sweep(data);
  }
  if (action.type === "save-setup") {
    data.setupDrafts ??= {};
    data.setupDrafts[action.side] = action.draft;
  }
  if (action.type === "nudge")
    notify(
      data,
      action.actor,
      "Free this week?",
      "Update your next 14 days so venues know when to ask you.",
      "availability",
    );
  if (action.type === "invite") {
    const shift = data.shifts.find((s) => s.id === action.shift)!;
    if (shift.venue !== action.actor || shift.status !== "open")
      throw new Error("This shift is no longer open.");
    if (!action.talents.length) throw new Error("Choose at least one person.");
    for (const talent of action.talents) request(data, shift, talent);
  }
  if (action.type === "draft-message")
    data.messageDrafts[`${action.actor}/${action.thread}`] = action.text;
  if (action.type === "read-chat")
    data.read[`${action.actor}/${action.thread}`] =
      data.messages.filter((m) => m.thread === action.thread).at(-1)?.id || "";
  if (action.type === "read-notice")
    data.notices
      .filter(
        (n) => n.to === action.actor && (!action.id || action.id === n.id),
      )
      .forEach((n) => (n.read = true));
  if (action.type === "account") {
    const m = member(data, action.actor);
    const a = accountOf(m);
    m.account = {
      ...a,
      ...action.patch,
      texts: { ...a.texts, ...action.patch.texts },
      quiet: { ...a.quiet, ...action.patch.quiet },
      docs: a.docs,
    };
    if (action.patch.payout && !/^\d{2}-\d{2}-\d{2}$/.test(action.patch.payout.sortCode))
      throw new Error("Enter the sort code as 12-34-56.");
  }
  if (action.type === "upload-doc") {
    const m = member(data, action.actor);
    const a = accountOf(m);
    if (!(action.doc in a.docs)) throw new Error("Choose one of the listed documents.");
    a.docs[action.doc] = { status: "review", file: action.file, updated: data.now };
    m.account = a;
  }
  // Dyuknow checks documents outside the app; this records the result.
  if (action.type === "verify-doc") {
    if (action.actor !== "dyuknow") throw new Error("Only Dyuknow verifies documents.");
    const m = member(data, action.member);
    const a = accountOf(m);
    a.docs[action.doc] = { ...a.docs[action.doc], status: "verified", updated: data.now };
    m.account = a;
    notify(data, m.id, `${action.doc} verified`, "It now shows on your profile.", "account");
  }
  if (action.type === "help" && !action.text.trim())
    throw new Error("Tell us what happened.");
  if (action.type === "delete-account") {
    const m = member(data, action.actor);
    const a = accountOf(m);
    m.account = { ...a, deletion: action.cancel ? undefined : data.now };
  }
  if (action.type === "profile") {
    const m = member(data, action.actor);
    const { name, bio, roles, skills, customSkills, alert, phone, email, postcode, minRate, venue } =
      action.patch;
    Object.assign(
      m,
      Object.fromEntries(
        Object.entries({ name, bio, roles, skills, customSkills, alert, phone, email, postcode, minRate }).filter(
          ([, v]) => v !== undefined,
        ),
      ),
    );
    if (venue && m.venue) m.venue = { ...m.venue, ...venue };
  }
  if (action.type === "join") {
    if (data.members.some((m) => m.phone === action.member.phone))
      throw new Error(
        "This phone belongs to a preloaded profile. Choose Claim existing profile.",
      );
    // Dyuknow vets people before they get an account, so joining is enough.
    data.members.push({ ...action.member, approved: true });
    if (data.setupDrafts) delete data.setupDrafts[action.member.side];
    if (action.member.side === "talent") {
      const dates =
        action.availabilityDates ??
        (action.availableTomorrow ? [datePlus(londonDate(data.now), 1)] : []);
      for (const date of [...new Set(dates)]) {
        if (
          date < londonDate(data.now) ||
          date > datePlus(londonDate(data.now), 6)
        )
          throw new Error("Choose availability within the next seven days.");
        data.availability.push({
          member: action.member.id,
          date,
          kind: "free",
          start: action.availabilityPeriod === "day" ? "09:00" : "16:00",
          end: action.availabilityPeriod === "day" ? "17:00" : "23:59",
        });
      }
    }
  }
  if (action.type === "post") {
    const d = action.draft;
    const venue = member(data, action.actor);
    if (venue.side !== "venue") throw new Error("Only venues can send shifts.");
    if (
      !d.roles.length ||
      !d.roles.every((r) => FAMILIES[d.family]?.roles.includes(r))
    )
      throw new Error("Choose the position you need.");
    if (!(d.rate > 0) || !Number.isFinite(d.rate))
      throw new Error("Add an hourly rate in pounds.");
    if (!Number.isInteger(d.capacity) || d.capacity < 1 || d.capacity > 5)
      throw new Error("Choose between 1 and 5 people.");
    const days = makeDays(d);
    if (days[0].from <= data.now)
      throw new Error(
        "The shift must start in the future. Choose a later time.",
      );
    const to = [...new Set(d.to)];
    const s: Shift = {
      id: uid(),
      venue: venue.id,
      roles: d.roles,
      family: d.family,
      days,
      capacity: d.capacity,
      rate: d.rate,
      note: d.note,
      mode: to.length ? "request" : "post",
      status: "open",
      created: data.now,
      address: fullAddress(venue),
      contact: contactLine(venue),
      phone: venue.phone,
      together: days.length > 1 && !!d.together,
    };
    data.shifts.unshift(s);
    if (to.length) for (const id of to) request(data, s, id);
    else
      data.members
        .filter(
          (m) =>
            m.side === "talent" &&
            m.approved &&
            m.roles.some((r) => s.roles.includes(r)) &&
            (m.alert === "all" ||
              (m.alert === "soon" &&
                days[0].date <= datePlus(londonDate(data.now), 1))),
        )
        .forEach((m) =>
          notify(
            data,
            m.id,
            `${venue.name} posted a job`,
            `${shiftLabel(s)} · ${days.length > 1 ? `${datesLabel(days.map((d) => d.date))} · ${days[0].start}–${days[0].end}${s.together ? " · same person for all days" : ""}` : serviceLabel(days[0])} · £${s.rate}/h`,
            `shift/${s.id}`,
          ),
        );
  }
  if (
    ["respond", "book", "withdraw", "decline"].includes(action.type) &&
    "shift" in action
  ) {
    const s = data.shifts.find((s) => s.id === action.shift);
    if (!s) throw new Error("This shift no longer exists.");
    const a = action as Extract<
      Action,
      { type: "respond" | "book" | "withdraw" | "decline" }
    >;
    const talent = action.type === "book" ? a.talent! : a.actor;
    const venueName = member(data, s.venue).name;
    let r = data.responses.find((r) => r.shift === s.id && r.talent === talent);
    if (action.type === "withdraw" || action.type === "decline") {
      if (
        !r ||
        r.talent !== a.actor ||
        !["invited", "can-cover"].includes(r.status)
      )
        throw new Error(
          "This answer is no longer waiting. View its current status.",
        );
      r.status = action.type === "withdraw" ? "withdrawn" : "declined";
      const verb = r.status === "withdrawn" ? "withdrew" : "declined";
      event(data, r, `${member(data, talent).name} ${verb}.`);
      notify(
        data,
        s.venue,
        `${member(data, talent).name} ${verb}`,
        `${shiftLabel(s)} · ${serviceLabel(s.days[0])}`,
        `shift/${s.id}`,
      );
    } else {
      if (s.status !== "open")
        throw new Error(
          s.status === "expired"
            ? "This shift has started and is closed."
            : "This shift has been filled or closed. You have not been booked.",
        );
      const t = member(data, talent);
      if (!t?.approved || t.side !== "talent")
        throw new Error("Choose a talent member.");
      const open = openDates(data, s);
      if (!open.length)
        throw new Error(
          "This shift has been filled or closed. You have not been booked.",
        );
      const free = availableDates(data, talent, s);
      if (action.type === "respond") {
        const invitedHere = r?.status === "invited";
        // Already waiting or booked here: this adds more days to the yes.
        const adding = !!r && ["can-cover", "booked"].includes(r.status);
        if (
          !invitedHere &&
          !adding &&
          (s.mode !== "post" || !t.roles.some((role) => s.roles.includes(role)))
        )
          throw new Error("This shift is for members in the selected roles.");
        const pool = adding ? offerableDates(data, talent, s) : free;
        const days = a.days?.length ? [...new Set(a.days)].sort() : pool;
        if (!days.length)
          throw new Error(
            adding
              ? "You’ve already said yes to every open day."
              : "No longer available — booked elsewhere for overlapping hours.",
          );
        if (!days.every((d) => s.days.some((x) => x.date === d)))
          throw new Error("Choose dates from this shift.");
        if (!days.every((d) => pool.includes(d)))
          throw new Error(
            "One of those days is no longer available. Review the days and send again.",
          );
        if (s.together && !adding && days.length < s.days.length)
          throw new Error(
            "This shift needs the same person for all days. You can only say yes to all of them.",
          );
        if (adding && r) {
          r.days = [...new Set([...offeredDates(s, r), ...days])].sort();
          event(data, r, `${t.name} can also do ${datesLabel(days)}.`);
          notify(
            data,
            s.venue,
            `${t.name} can also do ${datesLabel(days)}`,
            `${shiftLabel(s)} · Book when you’re ready.`,
            `shift/${s.id}`,
          );
          return data;
        }
        const partial = days.length < s.days.length;
        if (r) {
          r.status = "can-cover";
          r.note = a.note || "";
          r.days = days;
        } else {
          r = {
            id: uid(),
            shift: s.id,
            talent,
            source: "response",
            status: "can-cover",
            note: a.note || "",
            days,
          };
          data.responses.push(r);
        }
        // The yes goes back to the venue as a card in the conversation.
        card(
          data,
          s,
          talent,
          talent,
          partial ? `Can do ${datesLabel(days)}` : "Can do it",
        );
        if (r.note)
          data.messages.push({
            id: uid(),
            thread: threadFor(data, s.venue, talent).id,
            from: talent,
            text: r.note,
            time: data.now,
            system: false,
          });
        notify(
          data,
          s.venue,
          `${t.name} can do it`,
          `${shiftLabel(s)} · ${partial ? datesLabel(days) : serviceLabel(s.days[0])}${partial ? ` (${days.length} of ${s.days.length} days)` : ""}`,
          `shift/${s.id}`,
        );
      } else {
        const existing = data.bookings.find(
          (x) => x.shift === s.id && x.talent === talent && !x.cancelled,
        );
        if (
          !r ||
          s.venue !== a.actor ||
          !(r.status === "can-cover" || (r.status === "booked" && existing))
        )
          throw new Error("This person is no longer available to book.");
        // The venue books from the days this person said yes to.
        const bookable = bookableDates(data, s, r);
        const days = a.days?.length ? [...new Set(a.days)].sort() : bookable;
        if (!days.length)
          throw new Error(
            "The days they said yes to are already covered. You have not booked them.",
          );
        if (!days.every((d) => bookable.includes(d)))
          throw new Error(
            "You can only book days this person said yes to that are still open.",
          );
        if (s.together && !existing && days.length < s.days.length)
          throw new Error(
            "This shift needs the same person for all days. Book every day or choose someone else.",
          );
        if (days.some((d) => !free.includes(d)))
          throw new Error(
            "No longer available — booked elsewhere for overlapping hours.",
          );
        r.status = "booked";
        let b: Booking;
        if (existing) {
          existing.days = [...new Set([...existing.days, ...days])].sort();
          for (const d of days) delete existing.log[d];
          b = existing;
        } else {
          b = {
            id: uid(),
            shift: s.id,
            talent,
            days,
            cancelled: false,
            bookedAt: data.now,
            log: {},
          };
          data.bookings.unshift(b);
        }
        event(
          data,
          r,
          `${existing ? "Added to the booking" : "Booked"}: ${datesLabel(days)} · ${s.days[0].start}–${s.days[0].end} · £${s.rate}/h.`,
        );
        notify(
          data,
          talent,
          existing
            ? `${venueName} added ${datesLabel(days)} to your booking`
            : `You're booked at ${venueName}`,
          `${shiftLabel(s)} · ${datesLabel(activeDays(b))} · ${s.days[0].start}–${s.days[0].end}`,
          `booking/${b.id}`,
        );
        const stillOpen = openDates(data, s);
        if (!stillOpen.length) {
          s.status = "filled";
          closeWaiting(data, s, "This shift has been filled");
        } else
          data.responses
            .filter(
              (o) =>
                o.shift === s.id &&
                o.status === "can-cover" &&
                !offeredDates(s, o).some((d) => stillOpen.includes(d)),
            )
            .forEach((o) => {
              o.status = "not-selected";
              event(data, o, "The days you said yes to have been filled.");
              notify(
                data,
                o.talent,
                "The days you said yes to have been filled",
                `${venueName} · ${shiftLabel(s)}`,
                `shift/${s.id}`,
              );
            });
        trimClashes(data, b);
      }
    }
  }
  if (action.type === "close") {
    const s = data.shifts.find((s) => s.id === action.shift)!;
    if (s.venue !== action.actor || s.status !== "open")
      throw new Error("This shift is already closed or filled.");
    s.status = "closed";
    closeWaiting(data, s, `Closed by the venue: ${action.reason}`);
  }
  if (action.type === "cancel") {
    const b = data.bookings.find((b) => b.id === action.booking)!;
    const s = data.shifts.find((s) => s.id === b.shift)!;
    if (![s.venue, b.talent].includes(action.actor) || b.cancelled)
      throw new Error("This booking can no longer be cancelled.");
    const future = bookingServices(data, b)
      .filter((d) => d.from > data.now)
      .map((d) => d.date);
    const days = action.days?.length ? [...new Set(action.days)].sort() : future;
    if (!days.length || !days.every((d) => future.includes(d)))
      throw new Error("Only days that haven’t started can be cancelled.");
    if (!action.reason.trim()) throw new Error("Choose a cancellation reason.");
    for (const d of days)
      b.log[d] = { status: "cancelled", by: action.actor, at: data.now, reason: action.reason };
    const r = data.responses.find(
      (r) => r.shift === s.id && r.talent === b.talent,
    )!;
    // Their yes no longer covers the cancelled days, so they aren't offered
    // back to the venue; they can say yes again if things change.
    r.days = offeredDates(s, r).filter((d) => !days.includes(d));
    if (!activeDays(b).length) {
      b.cancelled = true;
      b.reason = action.reason;
      b.by = action.actor;
      b.cancelledAt = data.now;
      r.status = "cancelled";
    }
    event(
      data,
      r,
      `${member(data, action.actor).name} cancelled ${datesLabel(days)}: ${action.reason}.`,
    );
    notify(
      data,
      action.actor === s.venue ? b.talent : s.venue,
      `${member(data, action.actor).name} cancelled`,
      `${shiftLabel(s)} · ${datesLabel(days)} · ${action.reason}`,
      `booking/${b.id}`,
    );
    // The days need someone again, so the shift reopens for them.
    if (s.status === "filled" && openDates(data, s).length) s.status = "open";
  }
  if (action.type === "confirm-day") {
    const b = data.bookings.find((b) => b.id === action.booking)!;
    const s = data.shifts.find((s) => s.id === b.shift)!;
    if (s.venue !== action.actor)
      throw new Error("Only the venue confirms the hours worked.");
    const d = bookingServices(data, b).find((x) => x.date === action.date);
    if (!d || b.log[action.date])
      throw new Error("This day has already been recorded.");
    if (d.to > data.now)
      throw new Error("You can confirm a day once it has finished.");
    if (action.status === "no-show")
      b.log[d.date] = { status: "no-show", by: action.actor, at: data.now };
    else {
      const start = action.start || d.start;
      const end = action.end || d.end;
      const [actual] = makeDays({ dates: [d.date], start, end } as ShiftDraft);
      b.log[d.date] = {
        status: "worked",
        by: action.actor,
        at: data.now,
        start,
        end,
        hours: hoursOf(actual),
      };
    }
    const log = b.log[d.date];
    notify(
      data,
      b.talent,
      log.status === "worked"
        ? `${member(data, s.venue).name} confirmed ${log.hours} hours`
        : `${member(data, s.venue).name} marked you as not there`,
      `${displayDate(d.date)}${log.status === "worked" ? ` · ${log.start}–${log.end} · £${Math.round(log.hours! * s.rate * 100) / 100}` : ""}`,
      `booking/${b.id}`,
    );
  }
  if (action.type === "open-thread") {
    const other = member(data, action.with);
    const me = member(data, action.actor);
    if (!other?.approved || !me || other.side === me.side)
      throw new Error("Venues and talent can message each other.");
    threadFor(
      data,
      me.side === "venue" ? me.id : other.id,
      me.side === "talent" ? me.id : other.id,
    );
  }
  if (action.type === "message") {
    const thread = data.threads.find((t) => t.id === action.thread);
    if (!thread || ![thread.venue, thread.talent].includes(action.actor))
      throw new Error("This conversation is private.");
    if (!action.text.trim()) throw new Error("Write a message first.");
    data.messages.push({
      id: uid(),
      thread: thread.id,
      from: action.actor,
      text: action.text.trim(),
      time: data.now,
      system: false,
    });
    data.messageDrafts[`${action.actor}/${thread.id}`] = "";
    const to = action.actor === thread.talent ? thread.venue : thread.talent;
    if (accountOf(member(data, to)).texts.messages)
      notify(
        data,
        to,
        `Message from ${member(data, action.actor).name}`,
        action.text.trim(),
        `chat/${thread.id}`,
      );
  }
  if (action.type === "availability") {
    if (!action.dates.length) throw new Error("Choose at least one date.");
    if (action.kind === "free")
      action.dates.forEach((date) => {
        if (action.start === "00:00" && action.end === "00:00") {
          londonInstant(date, action.start);
          londonInstant(datePlus(date, 1), action.end);
        } else
          makeDays({
            date,
            count: 1,
            start: action.start,
            end: action.end,
          } as ShiftDraft);
      });
    for (const date of action.dates) {
      data.availability = data.availability.filter(
        (a) => !(a.member === action.actor && a.date === date),
      );
      data.availability.push({
        member: action.actor,
        date,
        kind: action.kind,
        start: action.start,
        end: action.end,
      });
    }
  }
  return data;
}
export function unreadChat(data: Data, actor: string, t: { id: string }) {
  const messages = data.messages.filter((m) => m.thread === t.id);
  const idx = messages.findIndex((m) => m.id === data.read[`${actor}/${t.id}`]);
  // Status events (booked, filled) show in the thread but aren't unread messages.
  return messages.slice(idx + 1).some((m) => m.from !== actor && !m.system);
}
