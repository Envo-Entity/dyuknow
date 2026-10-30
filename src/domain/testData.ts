// Test-only fixtures: a small world like the website's demo seed, built by
// hand (the demo's seed()/transition() are not part of the app).
import { datePlus } from "./time.ts";
import { makeDays } from "./shifts.ts";
import type { Booking, Data, Member, Response, Shift } from "./types.ts";

const venue = (id: string, name: string, postcode: string): Member => ({
  id,
  side: "venue",
  name,
  phone: "",
  postcode,
  photo: "",
  bio: "",
  roles: [],
  skills: [],
  approved: true,
  alert: "all",
  venue: { address: "", contactName: "", contactRole: "", types: [], cuisines: [], instagram: "" },
});
const talent = (id: string, name: string, roles: string[]): Member => ({
  id,
  side: "talent",
  name,
  phone: "",
  postcode: "",
  photo: "",
  bio: "",
  roles,
  skills: [],
  approved: true,
  alert: "all",
});

export const NOW = "2026-10-01T09:00:00.000Z";

export function world(): Data {
  const members = [
    venue("spruce", "Spruce", "TW9 1UA"),
    venue("sea", "The Sea The Sea", "SW1X 0AW"),
    venue("harper", "Harper Privé", "W1K 5DB"),
    talent("poppy", "Poppy Bertram", ["CDP", "Senior CDP"]),
    talent("camille", "Camille Aubert", ["Head Chef", "Sous Chef"]),
    talent("theo", "Theo Marchetti", ["CDP", "Senior CDP"]),
    talent("ethan", "Ethan Russell", ["Sous Chef", "Junior Sous"]),
    talent("noor", "Noor Haddad", ["Bartender", "Mixologist"]),
    talent("ines", "Inès Laurent", ["Waiter", "Host", "Section Waiter"]),
  ];
  const data: Data = {
    version: 3,
    now: NOW,
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
      data.availability.push({ member: m.id, date: datePlus("2026-10-01", i), kind: "free", start: "16:00", end: "23:59" });
  // Poppy has marked one evening as busy on her own calendar.
  data.availability = data.availability.map((a) =>
    a.member === "poppy" && a.date === "2026-10-06" ? { ...a, kind: "not-free" as const, start: "00:00", end: "00:00" } : a,
  );
  return data;
}

let n = 0;
export function addShift(
  data: Data,
  patch: Partial<Shift> & { dates?: string[]; start?: string; end?: string } = {},
): Shift {
  const { dates = ["2026-10-08"], start = "17:00", end = "23:00", ...rest } = patch;
  const s: Shift = {
    id: `s${++n}`,
    venue: "spruce",
    roles: ["CDP"],
    days: makeDays({ dates, start, end }),
    capacity: 1,
    rate: 18,
    note: "",
    mode: "post",
    status: "open",
    created: data.now,
    ...rest,
  };
  data.shifts.unshift(s);
  return s;
}
export function addResponse(data: Data, shift: Shift, talentId: string, patch: Partial<Response> = {}): Response {
  const r: Response = {
    id: `r${++n}`,
    shift: shift.id,
    talent: talentId,
    source: "response",
    status: "can-cover",
    ...patch,
  };
  data.responses.push(r);
  return r;
}
export function addBooking(data: Data, shift: Shift, talentId: string, days?: string[], patch: Partial<Booking> = {}): Booking {
  const b: Booking = {
    id: `b${++n}`,
    shift: shift.id,
    talent: talentId,
    days: days ?? shift.days.map((d) => d.date),
    cancelled: false,
    log: {},
    ...patch,
  };
  data.bookings.unshift(b);
  return b;
}
