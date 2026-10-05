import { TEAMS, SKILLS as CATALOGUE_SKILLS } from "../catalogue.ts";
export type Side = "venue" | "talent" | "owner";
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
  vacancies: number; // owner only
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
};
export type Service = {
  date: string;
  start: string;
  end: string;
  from: string;
  to: string;
};
export type Shift = {
  id: string;
  venue: string;
  roles: string[];
  family: string;
  days: Service[];
  capacity: number;
  rate: number;
  note: string;
  mode: "post" | "invite";
  status: "open" | "filled" | "closed" | "expired";
  created: string;
  replacement?: string;
  address?: string;
  contact?: string;
  phone?: string;
  ownerAlerted: boolean;
  // Multi-day only: the venue needs the same person on every day.
  together?: boolean;
};
export type Response = {
  id: string;
  shift: string;
  talent: string;
  source: "invite" | "response";
  status: ResponseStatus;
  note: string;
  chat: boolean;
  // Dates the talent said yes to. Missing means every date of the shift
  // (an invitation is the venue's yes to all of them).
  days?: string[];
  // Set when the booking came from a direct conversation: its updates are
  // posted there instead of a separate shift chat.
  thread?: string;
};
// A direct conversation between a venue and a talent member. It needs no
// shift: anyone vetted can be messaged, free or not.
export type Thread = {
  id: string;
  venue: string;
  talent: string;
  started: string;
  // What the venue was looking for when it opened the conversation; it
  // pre-fills the booking request.
  context?: OfferTerms;
};
export type OfferTerms = {
  family: string;
  role: string;
  // Up to seven dates, same hours each day.
  dates: string[];
  start: string;
  end: string;
};
// A booking request sent as a card in a direct conversation.
export type Offer = OfferTerms & {
  id: string;
  thread: string;
  rate: number;
  note: string;
  status: "sent" | "accepted" | "declined" | "changes" | "replaced";
  time: string;
  // The talent's note when asking for changes.
  reply?: string;
  booking?: string;
};
export type Booking = {
  id: string;
  shift: string;
  talent: string;
  // A booking covers only the dates both sides said yes to.
  days: string[];
  cancelled: boolean;
  reason?: string;
  by?: string;
  cancelledAt?: string;
  bookedAt?: string;
  outcomes: Record<string, string>;
};
export type Message = {
  id: string;
  // The conversation: a shift response id or a direct thread id.
  response: string;
  from: string;
  text: string;
  time: string;
  system: boolean;
  offer?: string;
  // A job post this conversation is about, shown as a card.
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
  version: 2;
  now: string;
  members: Member[];
  shifts: Shift[];
  responses: Response[];
  bookings: Booking[];
  messages: Message[];
  notices: Notice[];
  availability: Availability[];
  threads?: Thread[];
  offers?: Offer[];
  read: Record<string, string>;
  messageDrafts: Record<string, string>;
  draft: Partial<ShiftDraft> | null;
  drafts?: Record<string, Partial<ShiftDraft> | null>;
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
  mode: "post" | "invite";
  invitees: string[];
  replacement?: string;
  editing?: string;
  repeatTalent?: string;
  together?: boolean;
  // Any dates (up to 7) with the same hours. When missing, `date` + `count`
  // describe a consecutive run.
  dates?: string[];
  // Where an unsent draft came from: "edit/<shift>", "again/<booking>" or
  // "replace/<booking>". Missing for a brand new shift.
  origin?: string;
};
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
  if (list.length < 1 || list.length > 7)
    throw new Error("Choose between 1 and 7 dates.");
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
export function bookingServices(data: Data, b: Booking) {
  const shift = data.shifts.find((s) => s.id === b.shift)!;
  return shift.days.filter((d) => (b.days ?? []).includes(d.date));
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
          (b) => b.shift === shift.id && !b.cancelled && b.days.includes(d.date),
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
    .flatMap((b) => b.days);
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
    .flatMap((b) => b.days);
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
// "Worked with you" comes only from recorded work: a past, uncancelled booking
// at this venue that the venue didn't report as a no-show or problem.
export function workedWith(data: Data, venue: string, talent: string) {
  return data.bookings.some((b) => {
    const s = data.shifts.find((x) => x.id === b.shift)!;
    return (
      s.venue === venue &&
      b.talent === talent &&
      !b.cancelled &&
      bookingPast(data, b) &&
      (!b.outcomes[venue] || b.outcomes[venue] === "Yes, worked")
    );
  });
}
export function joinNames(list: string[]) {
  if (list.length <= 1) return list.join("");
  return `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`;
}
export function firstName(m: Member) {
  return m.side === "talent" ? m.name.split(" ")[0] : m.name;
}
// Compact label for dates: "Mon 5 Oct", "Mon 5–Wed 7 Oct", "Mon 5, Wed 7 Oct".
export function datesLabel(dates: string[]) {
  const sorted = [...new Set(dates)].sort();
  if (!sorted.length) return "";
  if (sorted.length === 1) return displayDate(sorted[0]);
  const sameMonth = sorted.every((d) => d.slice(0, 7) === sorted[0].slice(0, 7));
  const short = (d: string) =>
    sameMonth ? displayDate(d).replace(/ [A-Za-z]+$/, "") : displayDate(d);
  const month = sameMonth ? displayDate(sorted[0]).replace(/^.* /, " ") : "";
  const consecutive = sorted.every(
    (d, i) => i === 0 || datePlus(sorted[i - 1], 1) === d,
  );
  return consecutive && sorted.length > 2
    ? `${short(sorted[0])}–${short(sorted.at(-1)!)}${month}`
    : `${sorted.map(short).join(", ")}${month}`;
}
// Talent who were sent this shift: everyone alerted in the roles, or the invitees.
export function audience(data: Data, shift: Shift) {
  const invited = data.responses
    .filter((r) => r.shift === shift.id && r.source === "invite")
    .map((r) => r.talent);
  if (shift.mode === "invite") return invited;
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
  const dropped = data.bookings.filter(
    (b) => b.shift === s.id && b.cancelled && b.days.some((d) => open.includes(d)),
  );
  const prefix = dropped.length
    ? `${joinNames([...new Set(dropped.map((b) => firstName(member(data, b.talent))))])} cancelled · `
    : "";
  if (s.status === "filled") return { text: "Filled", good: true, needs: false };
  if (s.status === "expired")
    return { text: "Started without full cover", good: false, needs: false };
  if (s.status === "closed") return { text: "Closed", good: false, needs: false };
  if (waiting)
    return { text: `${prefix}${waiting} can cover · Review`, good: true, needs: true };
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
  if (s.ownerAlerted)
    return { text: "Dyuknow is looking for someone", good: false, needs: false };
  const sent = audience(data, s).map((id) => member(data, id));
  return {
    text: sent.length
      ? `Sent to ${sent.length > 3 ? `${sent.length} people` : joinNames(sent.map(firstName))} · no replies yet`
      : "No members in this role yet",
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
export function offerDays(o: Pick<OfferTerms, "dates" | "start" | "end">) {
  return makeDays({ dates: o.dates, start: o.start, end: o.end } as ShiftDraft);
}
export function threadBetween(data: Data, venue: string, talent: string) {
  return (data.threads ?? []).find((t) => t.venue === venue && t.talent === talent);
}
// The latest booking request in a conversation.
export function currentOffer(data: Data, thread: string) {
  return (data.offers ?? []).filter((o) => o.thread === thread).at(-1);
}
export function member(data: Data, id: string) {
  return data.members.find((m) => m.id === id)!;
}
export function shiftLabel(s: Shift) {
  return s.roles.join(" or ");
}
export function bookingPast(data: Data, b: Booking) {
  const days = bookingServices(data, b);
  return days[days.length - 1].to <= data.now;
}
export function responseLabel(r: Response) {
  return {
    invited: "Invitation waiting",
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
function event(data: Data, r: Response, text: string) {
  data.messages.push({
    id: uid(),
    response: r.thread || r.id,
    from: "system",
    text,
    time: data.now,
    system: true,
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
  data.responses
    .filter(
      (o) =>
        o.talent === b.talent &&
        o.shift !== b.shift &&
        ["invited", "can-cover"].includes(o.status),
    )
    .forEach((o) => {
      const other = data.shifts.find((x) => x.id === o.shift)!;
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
          `${t.name} is now booked elsewhere on ${datesLabel(clashing)} and can still cover ${datesLabel(remaining)}.`,
        );
        return;
      }
      if (o.status === "invited" && remaining.length) return;
      o.status = "lapsed";
      event(data, o, "No longer available — booked elsewhere.");
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
    if (
      s.status === "open" &&
      !s.ownerAlerted &&
      s.days[0].date === londonDate(data.now) &&
      Date.parse(data.now) - Date.parse(s.created) >= 1800000 &&
      !data.responses.some(
        (r) => r.shift === s.id && ["can-cover", "booked"].includes(r.status),
      )
    ) {
      s.ownerAlerted = true;
      notify(
        data,
        "owner",
        "Same-day cover needs help",
        `${member(data, s.venue).name} has no response after 30 minutes.`,
        `shift/${s.id}`,
      );
      notify(
        data,
        s.venue,
        "The owner is helping",
        "Nobody has responded yet. We have alerted the owner to help find cover.",
        `shift/${s.id}`,
      );
    }
  });
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
  const data: Data = {
    version: 2,
    now: "2026-10-01T09:00:00.000Z",
    members,
    shifts: [],
    responses: [],
    bookings: [],
    messages: [],
    notices: [],
    availability: [],
    read: {},
    messageDrafts: {},
    draft: null,
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
      ownerAlerted: false,
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
      mode: "invite",
      status: "open",
      created: data.now,
      ownerAlerted: false,
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
      ownerAlerted: false,
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
      ownerAlerted: false,
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
      ownerAlerted: false,
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
      ownerAlerted: false,
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
      mode: "invite",
      status: "filled",
      created: "2026-09-27T09:00:00.000Z",
      ownerAlerted: false,
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
      chat: true,
    },
    {
      id: "past-response",
      shift: "past-poppy",
      talent: "poppy",
      source: "invite",
      status: "booked",
      note: "",
      chat: true,
    },
  ];
  data.bookings = [
    {
      id: "past-booking",
      shift: "past-poppy",
      talent: "poppy",
      days: ["2026-09-28"],
      cancelled: false,
      outcomes: { spruce: "Yes, worked", poppy: "Yes, worked" },
    },
  ];
  event(
    data,
    data.responses[0],
    "The Sea The Sea invited Camille. Accepting confirms a booking.",
  );
  notify(
    data,
    "camille",
    "The Sea The Sea invited you",
    "Sat 3 Oct · 18:00–23:00 · £28/h",
    "shift/sea-saturday",
  );
  for (const s of data.shifts.filter((s) => s.mode === "post"))
    for (const m of members.filter(
      (m) => m.side === "talent" && m.roles.some((r) => s.roles.includes(r)),
    ))
      notify(
        data,
        m.id,
        `${member(data, s.venue).name} needs cover`,
        `${shiftLabel(s)} · ${serviceLabel(s.days[0])} · £${s.rate}/h`,
        `shift/${s.id}`,
      );
  return data;
}
export type Action =
  | { type: "post"; actor: string; draft: ShiftDraft }
  | {
      type: "respond" | "accept" | "book" | "withdraw" | "decline";
      actor: string;
      shift: string;
      talent?: string;
      note?: string;
      days?: string[];
    }
  | { type: "ask-owner"; actor: string; shift: string }
  | { type: "realert"; actor: string; shift: string }
  | { type: "close"; actor: string; shift: string; reason: string }
  | { type: "cancel"; actor: string; booking: string; reason: string }
  | { type: "message"; actor: string; response: string; text: string }
  | {
      type: "open-thread";
      actor: string;
      with: string;
      context?: OfferTerms;
      // Opened from a job post: the post goes into the conversation.
      shift?: string;
    }
  | {
      type: "send-offer";
      actor: string;
      thread: string;
      offer: OfferTerms & { rate: number; note: string };
    }
  | {
      type: "answer-offer";
      actor: string;
      offer: string;
      answer: "accept" | "decline" | "changes";
      note?: string;
    }
  | { type: "open-chat"; actor: string; response: string }
  | {
      type: "availability";
      actor: string;
      dates: string[];
      kind: "free" | "not-free";
      start: string;
      end: string;
    }
  | { type: "profile"; actor: string; patch: Partial<Member> }
  | { type: "read-notice"; actor: string; id?: string }
  | { type: "read-chat"; actor: string; response: string }
  | { type: "draft-message"; actor: string; response: string; text: string }
  | { type: "save-draft"; actor: string; draft: Partial<ShiftDraft> | null }
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
  | { type: "edit-note"; actor: string; shift: string; note: string }
  | { type: "invite"; actor: string; shift: string; talents: string[] }
  | { type: "nudge"; actor: string }
  | { type: "approve"; actor: string; member: string }
  | {
      type: "join";
      member: Member;
      availableTomorrow?: boolean;
      availabilityDates?: string[];
      availabilityPeriod?: "day" | "evening";
    }
  | { type: "outcome"; actor: string; booking: string; value: string }
  | { type: "advance"; until: string }
  | { type: "settings"; offline?: boolean; failNext?: boolean };
export function transition(original: Data, action: Action): Data {
  const data: Data = structuredClone(original);
  sweep(data);
  const utility = [
    "settings",
    "read-notice",
    "read-chat",
    "draft-message",
    "save-draft",
    "save-setup",
    "nudge",
    "advance",
  ];
  if (!utility.includes(action.type)) {
    if (data.offline)
      throw new Error(
        "You're offline. Your draft is kept. Reconnect in Preview controls, then try again.",
      );
    if (data.failNext)
      throw new Error(
        "The action could not be saved. Nothing was sent. Your draft is kept; try again.",
      );
    if (
      "actor" in action &&
      action.actor !== "owner" &&
      !member(data, action.actor)?.approved &&
      action.type !== "profile"
    )
      throw new Error("Your account is waiting for owner approval.");
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
  if (action.type === "save-draft") {
    data.drafts ??= {};
    data.drafts[action.actor] = action.draft;
    data.draft = action.draft;
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
      "Update your next 14 days so venues know when to invite you.",
      "availability",
    );
  if (action.type === "edit-note") {
    const shift = data.shifts.find((s) => s.id === action.shift)!;
    if (shift.venue !== action.actor)
      throw new Error("Only this venue can edit its preparation note.");
    shift.note = action.note;
  }
  if (action.type === "invite") {
    const shift = data.shifts.find((s) => s.id === action.shift)!;
    if (shift.venue !== action.actor || shift.status !== "open")
      throw new Error("This shift is no longer open for invitations.");
    if (!action.talents.length) throw new Error("Choose at least one person.");
    for (const talent of action.talents) {
      const t = member(data, talent);
      if (
        !t?.approved ||
        t.side !== "talent" ||
        !t.roles.some((role) => shift.roles.includes(role))
      )
        throw new Error("Choose an approved member in these roles.");
      if (!availableDates(data, talent, shift).length)
        throw new Error(`${t.name} is booked for overlapping hours.`);
      let r = data.responses.find(
        (r) => r.shift === shift.id && r.talent === talent,
      );
      if (r && ["can-cover", "invited", "booked"].includes(r.status)) continue;
      if (r) {
        r.status = "invited";
        r.chat = true;
        r.source = "invite";
      } else {
        r = {
          id: uid(),
          shift: shift.id,
          talent,
          source: "invite",
          status: "invited",
          chat: true,
          note: "",
        };
        data.responses.push(r);
      }
      event(
        data,
        r,
        `${member(data, shift.venue).name} invited ${t.name}. Accepting books the service.`,
      );
      notify(
        data,
        talent,
        `${member(data, shift.venue).name} invited you`,
        `${serviceLabel(shift.days[0])} · £${shift.rate}/h`,
        `shift/${shift.id}`,
      );
    }
  }
  if (action.type === "draft-message")
    data.messageDrafts[`${action.actor}/${action.response}`] = action.text;
  if (action.type === "read-chat")
    data.read[`${action.actor}/${action.response}`] =
      data.messages.filter((m) => m.response === action.response).at(-1)?.id ||
      "";
  if (action.type === "read-notice")
    data.notices
      .filter(
        (n) => n.to === action.actor && (!action.id || action.id === n.id),
      )
      .forEach((n) => (n.read = true));
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
    data.members.push({ ...action.member, approved: false });
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
    notify(
      data,
      "owner",
      "New member awaiting approval",
      action.member.name,
      "members",
    );
  }
  if (action.type === "approve") {
    if (action.actor !== "owner")
      throw new Error("Only the owner approves members.");
    member(data, action.member).approved = true;
    notify(
      data,
      action.member,
      "You're in",
      "The owner has approved your membership. You can now use Dyuknow.",
      "home",
    );
  }
  if (action.type === "post") {
    const d = action.draft;
    const venue = member(data, action.actor);
    if (venue.side !== "venue") throw new Error("Only venues can send shifts.");
    if (
      !d.roles.length ||
      !d.roles.every((r) => FAMILIES[d.family]?.roles.includes(r))
    )
      throw new Error("Choose the positions you would accept.");
    if (!(d.rate > 0) || !Number.isFinite(d.rate))
      throw new Error("Add an hourly rate in pounds.");
    if (!Number.isInteger(d.capacity) || d.capacity < 1 || d.capacity > 5)
      throw new Error("Choose between 1 and 5 people.");
    const days = makeDays(d);
    if (days[0].from <= data.now)
      throw new Error(
        "The shift must start in the future. Choose a later time.",
      );
    if (d.mode === "invite" && !d.invitees.length)
      throw new Error("Choose at least one person to invite.");
    if (d.editing) {
      const old = data.shifts.find((s) => s.id === d.editing)!;
      if (
        old.venue !== action.actor ||
        old.status !== "open" ||
        bookedCount(data, old.id)
      )
        throw new Error(
          "A booked shift cannot be edited. Cancel the booking and create a new shift.",
        );
      old.status = "closed";
      closeWaiting(
        data,
        old,
        "The venue edited and resent this shift. Please review the new terms.",
      );
    }
    const s: Shift = {
      id: uid(),
      venue: venue.id,
      roles: d.roles,
      family: d.family,
      days,
      capacity: d.capacity,
      rate: d.rate,
      note: d.note,
      mode: d.mode,
      status: "open",
      created: data.now,
      address: fullAddress(venue),
      contact: contactLine(venue),
      phone: venue.phone,
      replacement: d.replacement || d.editing,
      together: days.length > 1 && !!d.together,
      ownerAlerted: false,
    };
    data.shifts.unshift(s);
    data.draft = null;
    if (data.drafts) data.drafts[action.actor] = null;
    const eligible = data.members.filter(
      (m) =>
        m.side === "talent" &&
        m.approved &&
        m.roles.some((r) => s.roles.includes(r)),
    );
    if (d.mode === "post")
      eligible
        .filter(
          (m) =>
            m.alert === "all" ||
            (m.alert === "soon" &&
              days[0].date <= datePlus(londonDate(data.now), 1)),
        )
        .forEach((m) =>
          notify(
            data,
            m.id,
            `${venue.name} needs cover`,
            `${shiftLabel(s)} · ${days.length > 1 ? `${datesLabel(days.map((d) => d.date))} · ${days[0].start}–${days[0].end}${s.together ? " · each person covers every day" : ""}` : serviceLabel(days[0])} · £${s.rate}/h`,
            `shift/${s.id}`,
          ),
        );
    else
      for (const id of d.invitees) {
        if (!eligible.some((m) => m.id === id))
          throw new Error(
            "An invitee must be an approved member in the selected roles.",
          );
        if (days.every((d) => conflict(data, id, [d])))
          throw new Error(
            `${member(data, id).name} is booked then. Choose another member.`,
          );
        const r: Response = {
          id: uid(),
          shift: s.id,
          talent: id,
          source: "invite",
          status: "invited",
          chat: true,
          note: "",
        };
        data.responses.push(r);
        event(
          data,
          r,
          `${venue.name} invited ${member(data, id).name}. Accepting confirms the booking.`,
        );
        notify(
          data,
          id,
          `${venue.name} invited you`,
          `${serviceLabel(days[0])} · £${s.rate}/h`,
          `shift/${s.id}`,
        );
      }
    if (!eligible.length) {
      s.ownerAlerted = true;
      notify(
        data,
        "owner",
        "No members for this shift",
        `${venue.name} needs ${shiftLabel(s)}. Please help source cover.`,
        `shift/${s.id}`,
      );
      notify(
        data,
        venue.id,
        "The owner is helping find cover",
        "There are no members in this role yet. We have asked the owner to help.",
        `shift/${s.id}`,
      );
    }
  }
  if (
    ["respond", "accept", "book", "withdraw", "decline"].includes(
      action.type,
    ) &&
    "shift" in action
  ) {
    const s = data.shifts.find((s) => s.id === action.shift);
    if (!s) throw new Error("This shift no longer exists.");
    const a = action as Extract<
      Action,
      { type: "respond" | "accept" | "book" | "withdraw" | "decline" }
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
          "This response is no longer waiting. View its current status.",
        );
      r.status = action.type === "withdraw" ? "withdrawn" : "declined";
      event(
        data,
        r,
        `${member(data, talent).name} ${r.status === "withdrawn" ? "withdrew" : "declined"} before booking.`,
      );
      notify(
        data,
        s.venue,
        `${member(data, talent).name} ${r.status === "withdrawn" ? "withdrew" : "declined"}`,
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
        throw new Error("Choose an approved talent member.");
      const open = openDates(data, s);
      if (!open.length)
        throw new Error(
          "This shift has been filled or closed. You have not been booked.",
        );
      const free = availableDates(data, talent, s);
      if (action.type === "respond") {
        const invitedHere = r?.status === "invited";
        // Already waiting or booked here: this adds more days to the offer.
        const adding = !!r && ["can-cover", "booked"].includes(r.status);
        if (
          (s.mode !== "post" && !invitedHere && !adding) ||
          !t.roles.some((role) => s.roles.includes(role))
        )
          throw new Error("This shift is for members in the selected roles.");
        const pool = adding ? offerableDates(data, talent, s) : free;
        const days = a.days?.length ? [...new Set(a.days)].sort() : pool;
        if (!days.length)
          throw new Error(
            adding
              ? "You’ve already offered every open day."
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
            "Each person must cover every day of this shift. You can only offer all of them.",
          );
        if (adding && r) {
          r.days = [...new Set([...offeredDates(s, r), ...days])].sort();
          event(data, r, `${t.name} can also cover ${datesLabel(days)}.`);
          notify(
            data,
            s.venue,
            `${t.name} can also cover ${datesLabel(days)}`,
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
            chat: false,
            days,
          };
          data.responses.push(r);
        }
        if (invitedHere)
          event(
            data,
            r,
            `${t.name} can cover ${datesLabel(days)}, not every day. Book to confirm those days.`,
          );
        notify(
          data,
          s.venue,
          `${t.name} can cover`,
          `${shiftLabel(s)} · ${partial ? datesLabel(days) : serviceLabel(s.days[0])}${partial ? ` (${days.length} of ${s.days.length} days)` : ""}`,
          `shift/${s.id}`,
        );
      } else {
        const existing = data.bookings.find(
          (x) => x.shift === s.id && x.talent === talent && !x.cancelled,
        );
        if (
          !r ||
          (action.type === "accept"
            ? r.status !== "invited" || r.talent !== a.actor
            : !(
                s.venue === a.actor &&
                (r.status === "can-cover" ||
                  (r.status === "booked" && existing))
              ))
        )
          throw new Error("This response is no longer available to book.");
        // Accepting an invitation takes every open date. Booking a response
        // takes the days the venue picks from what that person offered.
        const bookable = action.type === "accept" ? open : bookableDates(data, s, r);
        const days =
          action.type === "book" && a.days?.length
            ? [...new Set(a.days)].sort()
            : bookable;
        if (!days.length)
          throw new Error(
            "The days they offered are already covered. You have not booked them.",
          );
        if (!days.every((d) => bookable.includes(d)))
          throw new Error(
            "You can only book days this person offered that are still open.",
          );
        if (s.together && !existing && days.length < s.days.length)
          throw new Error(
            "Each person must cover every day of this shift. Book every day or choose someone else.",
          );
        const clash = days.filter((d) => !free.includes(d));
        if (clash.length)
          throw new Error(
            action.type === "accept"
              ? "You're booked elsewhere on one of these days. Choose “I can do some days” instead."
              : "No longer available — booked elsewhere for overlapping hours.",
          );
        r.status = "booked";
        r.chat = true;
        let b: Booking;
        if (existing) {
          existing.days = [...new Set([...existing.days, ...days])].sort();
          b = existing;
        } else {
          b = {
            id: uid(),
            shift: s.id,
            talent,
            days,
            cancelled: false,
            bookedAt: data.now,
            outcomes: {},
          };
          data.bookings.unshift(b);
        }
        event(
          data,
          r,
          `${existing ? "Added to the booking" : "Booked"}: ${datesLabel(days)}. Both sides are committed to the hours and pay shown above.`,
        );
        // The person who said the second yes already knows; tell the other side.
        if (action.type === "book")
          notify(
            data,
            talent,
            existing
              ? `${venueName} added ${datesLabel(days)} to your booking`
              : `You're booked at ${venueName}`,
            `${shiftLabel(s)} · ${datesLabel(b.days)} · ${s.days[0].start}–${s.days[0].end}`,
            `booking/${b.id}`,
          );
        else
          notify(
            data,
            s.venue,
            `${t.name} accepted`,
            `Booked for ${shiftLabel(s)} · ${datesLabel(days)}`,
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
              event(data, o, "The days you offered have been covered");
              notify(
                data,
                o.talent,
                "The days you offered have been covered",
                `${venueName} · ${shiftLabel(s)}`,
                `shift/${s.id}`,
              );
            });
        trimClashes(data, b);
      }
    }
  }
  if (action.type === "realert") {
    const s = data.shifts.find((s) => s.id === action.shift)!;
    if (s.venue !== action.actor || s.status !== "open" || s.mode !== "post")
      throw new Error("This shift is no longer open.");
    const open = openDates(data, s);
    const first = s.days.find((d) => d.date === open[0])!;
    const busy = data.responses
      .filter(
        (r) =>
          r.shift === s.id && ["can-cover", "booked", "invited"].includes(r.status),
      )
      .map((r) => r.talent);
    data.members
      .filter(
        (m) =>
          m.side === "talent" &&
          m.approved &&
          m.alert !== "off" &&
          m.roles.some((r) => s.roles.includes(r)) &&
          !busy.includes(m.id) &&
          availableDates(data, m.id, s).length > 0,
      )
      .forEach((m) =>
        notify(
          data,
          m.id,
          `${member(data, s.venue).name} still needs cover`,
          `${shiftLabel(s)} · ${datesLabel(open)} · ${first.start}–${first.end} · £${s.rate}/h`,
          `shift/${s.id}`,
        ),
      );
  }
  if (action.type === "ask-owner") {
    const s = data.shifts.find((s) => s.id === action.shift)!;
    if (s.venue !== action.actor || s.status !== "open")
      throw new Error("This shift is no longer open.");
    if (!s.ownerAlerted) {
      s.ownerAlerted = true;
      notify(
        data,
        "owner",
        "A venue asked for help with cover",
        `${member(data, s.venue).name} · ${shiftLabel(s)} · ${serviceLabel(s.days[0])}`,
        `shift/${s.id}`,
      );
    }
  }
  if (action.type === "close") {
    const s = data.shifts.find((s) => s.id === action.shift)!;
    if (s.venue !== action.actor || s.status !== "open")
      throw new Error("This shift is already closed or filled.");
    s.status = "closed";
    closeWaiting(data, s, `Shift closed: ${action.reason}`);
  }
  if (action.type === "cancel") {
    const b = data.bookings.find((b) => b.id === action.booking)!;
    const s = data.shifts.find((s) => s.id === b.shift)!;
    if (
      ![s.venue, b.talent].includes(action.actor) ||
      b.cancelled ||
      bookingPast(data, b)
    )
      throw new Error(
        "This booking cannot be cancelled. Report an issue for past work.",
      );
    if (!action.reason.trim()) throw new Error("Choose a cancellation reason.");
    b.cancelled = true;
    b.reason = action.reason;
    b.by = action.actor;
    b.cancelledAt = data.now;
    const r = data.responses.find(
      (r) => r.shift === s.id && r.talent === b.talent,
    )!;
    r.status = "cancelled";
    event(
      data,
      r,
      `Booking cancelled by ${member(data, action.actor).name}: ${action.reason}. Completed services stay in history.`,
    );
    notify(
      data,
      action.actor === s.venue ? b.talent : s.venue,
      `${member(data, action.actor).name} cancelled`,
      `${shiftLabel(s)} · ${datesLabel(b.days)} · ${action.reason}`,
      `booking/${b.id}`,
    );
    // A filled shift reopens for the future days that now need someone.
    if (s.status === "filled" && openDates(data, s).length) s.status = "open";
    // Cancellation releases the commitment, but never silently republishes availability.
    for (const day of bookingServices(data, b).filter((d) => d.to > data.now))
      data.availability = data.availability.filter(
        (a) => !(a.member === b.talent && a.date === day.date),
      );
    notify(
      data,
      "owner",
      "Cancellation to review",
      `${member(data, action.actor).name} cancelled ${shiftLabel(s)}${Date.parse(s.days[0].from) - Date.parse(data.now) < 86400000 ? " within 24 hours" : ""}.`,
      `booking/${b.id}`,
    );
  }
  if (action.type === "open-thread") {
    const other = member(data, action.with);
    const me = member(data, action.actor);
    if (!other?.approved || !me || other.side === me.side)
      throw new Error("Venues and talent can message each other.");
    const venue = me.side === "venue" ? me.id : other.id;
    const talent = me.side === "talent" ? me.id : other.id;
    data.threads ??= [];
    let t = threadBetween(data, venue, talent);
    if (!t) {
      t = { id: uid(), venue, talent, started: data.now };
      data.threads.push(t);
    }
    if (action.context && me.side === "venue") t.context = action.context;
    const post = action.shift
      ? data.shifts.find((s) => s.id === action.shift && s.venue === venue)
      : undefined;
    if (post) {
      // A booking request from here starts from the post's terms.
      t.context = {
        family: post.family,
        role: post.roles.find((r) => member(data, talent).roles.includes(r)) || post.roles[0],
        dates: post.days.map((d) => d.date),
        start: post.days[0].start,
        end: post.days[0].end,
      };
      if (!data.messages.some((m) => m.response === t!.id && m.shift === post.id))
        data.messages.push({
          id: uid(),
          response: t.id,
          from: venue,
          text: `Job post: ${shiftLabel(post)}`,
          time: post.created,
          system: false,
          shift: post.id,
        });
    }
  }
  if (action.type === "send-offer") {
    const t = (data.threads ?? []).find((t) => t.id === action.thread);
    if (!t || t.venue !== action.actor)
      throw new Error("Only the venue in this conversation can send a booking.");
    const o = action.offer;
    if (!FAMILIES[o.family]?.roles.includes(o.role))
      throw new Error("Choose the position you need.");
    if (!(o.rate > 0) || !Number.isFinite(o.rate))
      throw new Error("Add an hourly rate in pounds.");
    const days = offerDays(o);
    if (days[0].from <= data.now)
      throw new Error("The shift must start in the future. Choose a later time.");
    data.offers ??= [];
    const previous = data.offers.filter(
      (x) => x.thread === t.id && ["sent", "changes"].includes(x.status),
    );
    previous.forEach((x) => (x.status = "replaced"));
    const offer: Offer = {
      id: uid(),
      thread: t.id,
      family: o.family,
      role: o.role,
      dates: [...new Set(o.dates)].sort(),
      start: o.start,
      end: o.end,
      rate: o.rate,
      note: o.note,
      status: "sent",
      time: data.now,
    };
    data.offers.push(offer);
    data.messages.push({
      id: uid(),
      response: t.id,
      from: action.actor,
      text: previous.length ? "Revised booking request" : "Booking request",
      time: data.now,
      system: false,
      offer: offer.id,
    });
    notify(
      data,
      t.talent,
      `${member(data, t.venue).name} ${previous.length ? "revised their booking request" : "wants to book you"}`,
      `${o.role} · ${datesLabel(o.dates)} · ${o.start}–${o.end} · £${o.rate}/h`,
      `chat/${t.id}`,
    );
  }
  if (action.type === "answer-offer") {
    const o = (data.offers ?? []).find((o) => o.id === action.offer);
    const t = (data.threads ?? []).find((t) => t.id === o?.thread);
    if (!o || !t || t.talent !== action.actor)
      throw new Error("This booking request is not yours to answer.");
    if (o.status !== "sent")
      throw new Error(
        o.status === "replaced"
          ? "The venue has sent a newer version. Answer that one instead."
          : "This booking request has already been answered.",
      );
    const venueName = member(data, t.venue).name;
    const talentName = member(data, t.talent).name;
    const days = offerDays(o);
    const label = `${datesLabel(o.dates)} · ${o.start}–${o.end}`;
    const system = (text: string) =>
      data.messages.push({
        id: uid(),
        response: t.id,
        from: "system",
        text,
        time: data.now,
        system: true,
      });
    if (action.answer === "accept") {
      if (days[0].from <= data.now)
        throw new Error("This shift has started. Ask the venue for a new date.");
      if (conflict(data, t.talent, days))
        throw new Error("You're booked elsewhere for these hours. Ask for changes instead.");
      const venue = member(data, t.venue);
      const s: Shift = {
        id: uid(),
        venue: venue.id,
        roles: [o.role],
        family: o.family,
        days,
        capacity: 1,
        rate: o.rate,
        note: o.note,
        mode: "invite",
        status: "filled",
        created: data.now,
        address: fullAddress(venue),
        contact: contactLine(venue),
        phone: venue.phone,
        ownerAlerted: false,
        together: days.length > 1,
      };
      data.shifts.unshift(s);
      data.responses.push({
        id: uid(),
        shift: s.id,
        talent: t.talent,
        source: "invite",
        status: "booked",
        note: "",
        chat: true,
        thread: t.id,
      });
      const b: Booking = {
        id: uid(),
        shift: s.id,
        talent: t.talent,
        days: days.map((d) => d.date),
        cancelled: false,
        bookedAt: data.now,
        outcomes: {},
      };
      data.bookings.unshift(b);
      o.status = "accepted";
      o.booking = b.id;
      system(`Booked: ${label} · £${o.rate}/h. Both sides are committed to these hours and pay.`);
      notify(
        data,
        t.venue,
        `${talentName} accepted`,
        `Booked for ${o.role} · ${label}`,
        `booking/${b.id}`,
      );
      trimClashes(data, b);
    } else if (action.answer === "decline") {
      o.status = "declined";
      system(`${talentName} declined this booking request.`);
      notify(data, t.venue, `${talentName} declined`, `${o.role} · ${label}`, `chat/${t.id}`);
    } else {
      o.status = "changes";
      o.reply = action.note?.trim() || "";
      if (o.reply)
        data.messages.push({
          id: uid(),
          response: t.id,
          from: t.talent,
          text: o.reply,
          time: data.now,
          system: false,
        });
      system(`${talentName} asked for changes. ${venueName} can send a revised booking.`);
      notify(
        data,
        t.venue,
        `${talentName} asked for changes`,
        o.reply || `${o.role} · ${label}`,
        `chat/${t.id}`,
      );
    }
  }
  const thread =
    (action.type === "open-chat" || action.type === "message") &&
    !data.responses.some((r) => r.id === action.response)
      ? (data.threads ?? []).find((t) => t.id === action.response)
      : undefined;
  if (thread && action.type === "message") {
    if (![thread.venue, thread.talent].includes(action.actor))
      throw new Error("This conversation is private.");
    if (!action.text.trim()) throw new Error("Write a message first.");
    data.messages.push({
      id: uid(),
      response: thread.id,
      from: action.actor,
      text: action.text.trim(),
      time: data.now,
      system: false,
    });
    data.messageDrafts[`${action.actor}/${thread.id}`] = "";
    notify(
      data,
      action.actor === thread.talent ? thread.venue : thread.talent,
      `Message from ${member(data, action.actor).name}`,
      action.text.trim(),
      `chat/${thread.id}`,
    );
  } else if (action.type === "open-chat" || action.type === "message") {
    const r = data.responses.find((r) => r.id === action.response)!;
    const s = data.shifts.find((s) => s.id === r.shift)!;
    if (![r.talent, s.venue].includes(action.actor))
      throw new Error("This conversation is private.");
    if (!r.chat && action.actor !== s.venue)
      throw new Error(
        "The venue will open a conversation after your response.",
      );
    r.chat = true;
    if (action.type === "message") {
      if (!action.text.trim()) throw new Error("Write a message first.");
      data.messages.push({
        id: uid(),
        response: r.id,
        from: action.actor,
        text: action.text.trim(),
        time: data.now,
        system: false,
      });
      data.messageDrafts[`${action.actor}/${r.id}`] = "";
      notify(
        data,
        action.actor === r.talent ? s.venue : r.talent,
        `Message from ${member(data, action.actor).name}`,
        action.text.trim(),
        `chat/${r.id}`,
      );
    }
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
  if (action.type === "outcome") {
    const b = data.bookings.find((b) => b.id === action.booking)!;
    const s = data.shifts.find((s) => s.id === b.shift)!;
    if (![b.talent, s.venue].includes(action.actor))
      throw new Error("This booking is private.");
    b.outcomes[action.actor] = action.value;
    if (action.value !== "Yes, worked")
      notify(
        data,
        "owner",
        "Booking issue reported",
        `${member(data, action.actor).name}: ${action.value}`,
        `booking/${b.id}`,
      );
  }
  return data;
}
export function unreadChat(data: Data, actor: string, r: { id: string }) {
  const messages = data.messages.filter((m) => m.response === r.id);
  const idx = messages.findIndex((m) => m.id === data.read[`${actor}/${r.id}`]);
  // Status events (booked, filled) show in the thread but aren't unread messages.
  return messages.slice(idx + 1).some((m) => m.from !== actor && !m.system);
}
