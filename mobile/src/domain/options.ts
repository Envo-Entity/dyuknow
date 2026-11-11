// Onboarding and profile option lists, ported from the website's lib/data.ts
// (only the live lists; the website's mock world is not ported).
import { TEAMS, SKILL_GROUPS, VENUE_TYPES, CUISINES, COVERS_BANDS, DRESS_CODES, VENUE_KNOWN_FOR } from "./catalogue.ts";

export { VENUE_TYPES, CUISINES, COVERS_BANDS, DRESS_CODES, VENUE_KNOWN_FOR };

export const TEAM_CATEGORIES = ["Chef", "Front of House"];

// Legacy categories remain available; onboarding also shows all five teams.
export const CHEF_POSITIONS: string[] = [...TEAMS.Kitchen, ...TEAMS.Pastry];
export const FOH_POSITIONS: string[] = [...TEAMS.Floor, ...TEAMS.Bar, ...TEAMS.Sommelier];

export const CHEF_SKILLS: string[] = [...SKILL_GROUPS.Kitchen];
export const FOH_SKILLS: string[] = [...SKILL_GROUPS["Front of house"]];

export const YEARS_BANDS = ["0–2", "3–5", "5–10", "10+"];

export const SHIFT_TYPES = ["Breakfast", "Lunch", "Dinner", "Late", "Weekdays", "Weekends"];

export const MAX_TRAVEL_OPTIONS = ["3 miles", "5 miles", "10 miles", "Anywhere"];

export const LONDON_AREAS = ["West London", "East London", "Central", "North", "South"];

export const HOURLY_RATE_OPTIONS = ["£18", "£20", "£22+"];

export const CHEF_KNOWN_FOR = [
  "Calm under pressure",
  "Strong organiser",
  "Great on service",
  "Excellent prep",
  "Fast learner",
  "Clean worker",
  "Team player",
  "Great with junior chefs",
  "Reliable",
  "Problem solver",
  "Creative",
  "Strong palate",
];

export const FOH_KNOWN_FOR = [
  "Warm personality",
  "Excellent wine knowledge",
  "Fast service",
  "Great communicator",
  "Upselling",
  "Calm under pressure",
  "Cocktail knowledge",
  "Coffee",
  "Leadership",
  "Professional",
];

export function knownForOptions(category: string): string[] {
  return category === "Chef" ? CHEF_KNOWN_FOR : FOH_KNOWN_FOR;
}

export const TEAM_AGREEMENTS = [
  "Turn up on time",
  "Treat every venue with respect",
  "Give notice if cancelling",
  "Represent Dyuknow professionally",
];

export const ROLES_NEEDED = ["Chefs", "FOH", "Bartenders", "Managers", "Events"];

export const TYPICAL_NOTICE = ["Today", "Tomorrow", "Planned"];

export const VENUE_AGREEMENTS = [
  "Pay fairly",
  "Treat temporary team like our own",
  "Provide a clear brief",
  "Rate honestly",
];
