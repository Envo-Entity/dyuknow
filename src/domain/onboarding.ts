// Self-serve onboarding rules: the website's lib/onboardingModel.ts and the
// pure parts of lib/onboardingSelfServe.ts and components/auth/JoinOnboarding.tsx.
import { SKILLS, TEAMS, TEAM_NAMES, type Team } from "./catalogue.ts";
import { CHEF_KNOWN_FOR, FOH_KNOWN_FOR, TEAM_AGREEMENTS, VENUE_AGREEMENTS } from "./options.ts";
import { londonToday } from "./time.ts";
import { Refusal } from "./errors.ts";
import type { DatedAvailability, TalentIdentity, VenueIdentity } from "./types.ts";

export type JoinSide = "talent" | "venue";

// Steps in each flow; the last one submits as soon as it opens.
export const TALENT_TOTAL_STEPS = 9;
export const VENUE_TOTAL_STEPS = 8;
// The last step submits as soon as it opens, so a resumed draft reopens one before it.
export const TALENT_LAST_RESUMABLE_STEP = 7;
export const VENUE_LAST_RESUMABLE_STEP = 6;
// Self-serve: at most three "known for" traits.
export const KNOWN_FOR_LIMIT = 3;

export const EMPTY_VENUE_IDENTITY: VenueIdentity = {
  name: "",
  bio: "",
  photo: null,
  needs: [],
  tradingName: "",
  registeredCompany: "",
  website: "",
  instagram: "",
  contactName: "",
  contactPosition: "",
  contactPhone: "",
  contactEmail: "",
  venueType: [],
  cuisine: [],
  covers: "",
  teamSize: "",
  teamVacanciesPerWeek: "",
  typicalShifts: [],
  typicalNotice: [],
  dressCode: "",
  uniformProvided: null,
  staffMeal: null,
  rateChef: "",
  rateFoh: "",
  knownFor: [],
  agreedCommunity: [],
  address: "",
  postcode: "",
  teamsNeeded: [],
};

export const EMPTY_TALENT_IDENTITY: TalentIdentity = {
  name: "",
  role: "",
  bio: "",
  photo: null,
  mobile: "",
  email: "",
  postcode: "",
  dob: "",
  category: "",
  positions: [],
  skills: [],
  yearsBand: "",
  employers: [],
  availableToday: false,
  preferredShifts: [],
  maxTravel: "",
  preferredAreas: [],
  preferredRate: "",
  minSameDayRate: "",
  rightToWork: null,
  foodSafetyCert: null,
  cv: null,
  knownFor: [],
  agreedCommunity: [],
  customSkills: [],
  shiftAlerts: "all",
  datedAvailability: [],
};

// One draft per login, on this device only (same shape as the website's).
export interface JoinDraft {
  side: JoinSide | null;
  talent: { identity: TalentIdentity; step: number } | null;
  venue: { identity: VenueIdentity; step: number } | null;
}
export const EMPTY_JOIN_DRAFT: JoinDraft = { side: null, talent: null, venue: null };

/** Where a resumed talent draft starts: its answers, the login email, a safe step. */
export function resumeTalent(draft: JoinDraft, email: string) {
  const saved = draft.talent;
  return {
    // The login email is the identity; it is shown read-only and never asked.
    identity: { ...EMPTY_TALENT_IDENTITY, ...saved?.identity, email } as TalentIdentity,
    step: Math.min(Math.max(saved?.step ?? 0, 0), TALENT_LAST_RESUMABLE_STEP),
  };
}
/** Where a resumed venue draft starts. The contact email starts as the login email. */
export function resumeVenue(draft: JoinDraft, email: string) {
  const saved = draft.venue;
  return {
    identity: (saved?.identity
      ? { ...EMPTY_VENUE_IDENTITY, ...saved.identity }
      : { ...EMPTY_VENUE_IDENTITY, contactEmail: email }) as VenueIdentity,
    step: Math.min(Math.max(saved?.step ?? 0, 0), VENUE_LAST_RESUMABLE_STEP),
  };
}

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
// The same policy in onboarding and both profile skill editors.
export function addCustomSkill(current: readonly string[], value: string, skills: readonly string[] = []) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed.length > 80) return [...current];
  const exists = [...current, ...skills, ...SKILLS].some((s) => s.toLowerCase() === trimmed.toLowerCase());
  return exists ? [...current] : [...current, trimmed];
}
export function validateDatedAvailability(entries: readonly DatedAvailability[], today = londonToday()): string | null {
  const dates = new Set<string>();
  for (const entry of entries) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(entry.date) ||
      Number.isNaN(Date.parse(`${entry.date}T12:00:00Z`)) ||
      new Date(`${entry.date}T12:00:00Z`).toISOString().slice(0, 10) !== entry.date
    )
      return "Choose a valid availability date.";
    if (entry.date < today) return "An availability date has passed. Update it or remove it before continuing.";
    if (dates.has(entry.date)) return "Choose each availability date once.";
    dates.add(entry.date);
    if (entry.kind !== "free" && entry.kind !== "not-free") return "Choose whether you’re free on each date.";
    if (![entry.start, entry.end].every((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time)))
      return "Choose a start and end time for each date.";
    if (entry.start === entry.end && entry.start !== "00:00")
      return "Use different start and end times, or choose Free all day.";
  }
  return null;
}

const KITCHEN_POSITIONS = new Set<string>([...TEAMS.Kitchen, ...TEAMS.Pastry]);
const KNOWN_FOR = new Set<string>([...CHEF_KNOWN_FOR, ...FOH_KNOWN_FOR]);

/** Food hygiene suits talent with at least one Kitchen or Pastry position. */
export function needsKitchenDocuments(positions: readonly string[]): boolean {
  return positions.some((p) => KITCHEN_POSITIONS.has(p));
}

function text(value: string | null | undefined): string | null {
  const trimmed = (value ?? "").trim();
  return trimmed ? trimmed : null;
}
function pounds(value: string, label: string): number | null {
  const trimmed = value.trim().replace(/^£/, "");
  if (!trimmed) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) throw new Refusal(`Enter the ${label} in pounds, like 20 or 20.50.`);
  return Number(trimmed);
}
function wholeNumber(value: string, label: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d+$/.test(trimmed)) throw new Refusal(`Enter the ${label} as a whole number.`);
  return Number(trimmed);
}

/** Talent answers in the talents table's column names (create_my_profile p_answers). Throws Refusal. */
export function talentAnswers(identity: TalentIdentity): Record<string, unknown> {
  const knownFor = identity.knownFor.filter((t) => KNOWN_FOR.has(t));
  const customKnownFor = identity.knownFor.filter((t) => !KNOWN_FOR.has(t));
  return {
    full_name: text(identity.name),
    mobile_number: text(identity.mobile),
    home_postcode: text(identity.postcode),
    date_of_birth: text(identity.dob),
    category: text(identity.category),
    positions: identity.positions,
    skills: identity.skills,
    custom_skills: identity.customSkills ?? [],
    known_for: knownFor,
    custom_known_for: customKnownFor,
    years_band: text(identity.yearsBand),
    employment_history: identity.employers.filter((e) => e.restaurant.trim() || e.position.trim() || e.dates.trim()),
    bio: text(identity.bio),
    preferred_shifts: identity.preferredShifts,
    max_travel: text(identity.maxTravel),
    preferred_areas: identity.preferredAreas,
    preferred_hourly_rate: text(identity.preferredRate),
    minimum_same_day_rate_gbp: pounds(identity.minSameDayRate, "minimum same-day rate"),
    shift_alerts: identity.shiftAlerts ?? "all",
    agreed_turn_up_on_time: identity.agreedCommunity.includes(TEAM_AGREEMENTS[0]),
    agreed_treat_venues_with_respect: identity.agreedCommunity.includes(TEAM_AGREEMENTS[1]),
    agreed_give_notice_if_cancelling: identity.agreedCommunity.includes(TEAM_AGREEMENTS[2]),
    agreed_represent_professionally: identity.agreedCommunity.includes(TEAM_AGREEMENTS[3]),
  };
}

/** Venue answers in the venues table's column names (create_my_profile p_answers). Throws Refusal. */
export function venueAnswers(identity: VenueIdentity): Record<string, unknown> {
  return {
    business_name: text(identity.name),
    trading_name: text(identity.tradingName),
    registered_company: text(identity.registeredCompany),
    website: text(identity.website),
    instagram_handle: text(identity.instagram),
    contact_name: text(identity.contactName),
    contact_position: text(identity.contactPosition),
    contact_phone: text(identity.contactPhone),
    contact_email: text(identity.contactEmail),
    street_address: text(identity.address),
    postcode: text(identity.postcode),
    venue_types: identity.venueType,
    cuisines: identity.cuisine,
    covers_band: text(identity.covers),
    average_team_size: wholeNumber(identity.teamSize, "team size"),
    average_team_vacancies_per_week: wholeNumber(identity.teamVacanciesPerWeek, "vacancies per week"),
    roles_needed: identity.needs,
    teams_needed: identity.teamsNeeded ?? teamsFromLegacyRoles(identity.needs),
    typical_shifts: identity.typicalShifts,
    typical_notice: identity.typicalNotice,
    dress_code: text(identity.dressCode),
    uniform_provided: identity.uniformProvided,
    staff_meal: identity.staffMeal,
    typical_hourly_rate_chef_gbp: pounds(identity.rateChef, "chef rate"),
    typical_hourly_rate_foh_gbp: pounds(identity.rateFoh, "front-of-house rate"),
    bio: text(identity.bio),
    known_for: identity.knownFor,
    agreed_pay_fairly: identity.agreedCommunity.includes(VENUE_AGREEMENTS[0]),
    agreed_treat_team_like_our_own: identity.agreedCommunity.includes(VENUE_AGREEMENTS[1]),
    agreed_provide_clear_brief: identity.agreedCommunity.includes(VENUE_AGREEMENTS[2]),
    agreed_rate_honestly: identity.agreedCommunity.includes(VENUE_AGREEMENTS[3]),
  };
}

/** The p_availability rows for create_my_profile. */
export function availabilityRows(entries: readonly DatedAvailability[]) {
  return entries.map((a) => ({ day_date: a.date, kind: a.kind, start_time: a.start, end_time: a.end }));
}

/** Step 0 of the talent flow: what's still missing before Continue works (self-serve). */
export function talentStepZeroReady(identity: Pick<TalentIdentity, "name" | "mobile" | "postcode">) {
  return !!(identity.name.trim() && identity.mobile.trim() && identity.postcode.trim());
}
/** Step 0 of the venue flow: the missing answers as one phrase, "" when ready. */
export function venueStepZeroMissing(identity: VenueIdentity) {
  return [
    !identity.name.trim() && !identity.tradingName.trim() && "a name",
    !identity.address.trim() && "the street address",
    !identity.postcode.trim() && "a postcode",
    !identity.contactName.trim() && "the contact person",
    !identity.contactPhone.trim() && "their phone",
  ]
    .filter(Boolean)
    .join(", ");
}
