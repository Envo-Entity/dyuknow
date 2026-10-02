import { SKILLS, TEAM_NAMES, type Team } from "./catalogue.ts";
import type { DatedAvailability } from "./types.ts";

const LEGACY_TEAMS: Record<string, Team[]> = {
  Chefs: ["Kitchen", "Pastry"],
  FOH: ["Floor"],
  Managers: ["Floor"],
  Bartenders: ["Bar"],
};

export function teamsFromLegacyRoles(roles: readonly string[]): Team[] {
  const teams = new Set(roles.flatMap((role) => LEGACY_TEAMS[role] ?? []));
  return TEAM_NAMES.filter((team) => teams.has(team));
}

export function venueDisplayName(venue: { name: string; tradingName: string }) {
  return venue.tradingName.trim() || venue.name.trim();
}

// Use the same policy in onboarding and both preview skill editors.
export function addCustomSkill(current: readonly string[], value: string, skills: readonly string[] = []) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > 80) return [...current];
  const exists = [...current, ...skills, ...SKILLS].some((s) => s.toLowerCase() === trimmed.toLowerCase());
  return exists ? [...current] : [...current, trimmed];
}

export function londonToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function upcomingDates(today: string, count = 14) {
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + offset);
    return date.toISOString().slice(0, 10);
  });
}

export function validateDatedAvailability(entries: readonly DatedAvailability[], today = londonToday()): string | null {
  const dates = new Set<string>();
  for (const entry of entries) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || Number.isNaN(Date.parse(`${entry.date}T12:00:00Z`)) || new Date(`${entry.date}T12:00:00Z`).toISOString().slice(0, 10) !== entry.date)
      return "Choose a valid availability date.";
    if (entry.date < today) return "An availability date has passed. Update it or remove it before continuing.";
    if (dates.has(entry.date)) return "Choose each availability date once.";
    dates.add(entry.date);
    if (entry.kind !== "free" && entry.kind !== "not-free") return "Choose whether you’re free on each date.";
    if (![entry.start, entry.end].every((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time))) return "Choose a start and end time for each date.";
    if (entry.start === entry.end && entry.start !== "00:00") return "Use different start and end times, or choose Free all day.";
  }
  return null;
}
