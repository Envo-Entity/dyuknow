// Where talent stand for some hours, and who a venue sees for a team.
import { datePlus, londonInstant } from "./time.ts";
import { conflict, workedWith } from "./shifts.ts";
import { FAMILIES } from "./teams.ts";
import type { Data, Member, Service, Standing } from "./types.ts";

// Free for every one of these hours on their own calendar, and not booked.
export function isFree(data: Data, talent: string, days: Service[]) {
  if (conflict(data, talent, days)) return false;
  return days.every((day) =>
    data.availability
      .filter((a) => a.member === talent && a.kind === "free")
      .some((a) => {
        try {
          const start = londonInstant(a.date, a.start);
          const end = londonInstant(a.end <= a.start ? datePlus(a.date, 1) : a.date, a.end);
          return start <= day.from && end >= day.to;
        } catch {
          return false;
        }
      }),
  );
}
// Where a talent member stands for some hours, from their own calendar and
// their bookings. Only "free" means they said yes to those hours.
export function standing(data: Data, talent: string, days: Service[]): Standing {
  if (!days.length) return "not-set";
  if (conflict(data, talent, days)) return "booked";
  if (isFree(data, talent, days)) return "free";
  const marks = data.availability.filter((a) => a.member === talent && days.some((d) => d.date === a.date));
  if (marks.some((a) => a.kind === "not-free")) return "not-free";
  return marks.length ? "other-hours" : "not-set";
}
export function standingLabel(data: Data, talent: string, days: Service[]) {
  const s = standing(data, talent, days);
  if (s !== "free" && s !== "booked" && days.length > 1) {
    const k = days.filter((d) => standing(data, talent, [d]) === "free").length;
    if (k) return `Available ${k} of ${days.length} days`;
  }
  if (s === "other-hours") {
    const a = data.availability.find((a) => a.member === talent && a.date === days[0].date && a.kind === "free");
    return a ? `Available ${a.start}–${a.end} only` : "Available other hours";
  }
  return {
    free: "Available",
    booked: "Already booked",
    "not-free": "Not available",
    "not-set": "No availability set",
  }[s];
}
// Who a venue sees for a team at a time: everyone vetted in the position (or
// the team), split into free and not; each list by worked-here first, then name.
export function rankTalent(
  data: Data,
  venue: string,
  family: string,
  role: string | undefined,
  days: Service[],
) {
  const fits = (m: Member) =>
    role ? m.roles.includes(role) : m.roles.some((r) => FAMILIES[family]?.roles.includes(r));
  const free = (m: Member) => standing(data, m.id, days) === "free";
  const order = (a: Member, b: Member) =>
    Number(workedWith(data, venue, b.id)) - Number(workedWith(data, venue, a.id)) ||
    a.name.localeCompare(b.name);
  const talent = data.members.filter((m) => m.side === "talent" && m.approved && fits(m)).sort(order);
  return {
    free: talent.filter(free),
    unavailable: talent.filter((m) => !free(m)),
  };
}
