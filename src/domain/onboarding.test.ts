import test from "node:test";
import assert from "node:assert/strict";
import { POSITIONS, SKILLS, TEAMS } from "./catalogue.ts";
import {
  EMPTY_TALENT_IDENTITY,
  EMPTY_VENUE_IDENTITY,
  addCustomSkill,
  needsKitchenDocuments,
  resumeTalent,
  resumeVenue,
  talentAnswers,
  teamsFromLegacyRoles,
  validateDatedAvailability,
  venueAnswers,
  venueDisplayName,
  venueStepZeroMissing,
} from "./onboarding.ts";
import { TEAM_AGREEMENTS } from "./options.ts";
import { isRefusal } from "./errors.ts";
import { FAMILIES, teamOf } from "./teams.ts";
import { requiredDocs } from "./account.ts";
import type { DatedAvailability, TalentIdentity } from "./types.ts";

test("the shared catalogue keeps old skill values and every new option", () => {
  for (const skill of ["Barista", "Sushi / Fish Specialist", "Coffee", "Sushi", "Guest Relations"]) assert.ok(SKILLS.includes(skill));
  assert.ok((TEAMS.Sommelier as readonly string[]).includes("Sommelier"));
  assert.ok((TEAMS.Floor as readonly string[]).includes("Maître d’"));
  assert.equal(new Set(POSITIONS).size, POSITIONS.length);
  assert.equal(POSITIONS.length, 17);
  assert.deepEqual(Object.keys(TEAMS), ["Kitchen", "Pastry", "Bar", "Sommelier", "Floor"]);
  assert.deepEqual(Object.keys(FAMILIES), Object.keys(TEAMS));
  assert.equal(teamOf(["Bartender"]), "Bar");
  assert.equal(teamOf(["Nope"]), "Kitchen");
});

test("custom skills preserve existing answers, normalize spacing, and reject duplicates and empty or oversized values", () => {
  const current = ["Seasonal British"];
  assert.deepEqual(addCustomSkill(current, "  Chocolate   work  "), ["Seasonal British", "Chocolate work"]);
  for (const value of ["seasonal british", " coffee ", "  ", "x".repeat(81)]) assert.deepEqual(addCustomSkill(current, value), current);
  assert.deepEqual(current, ["Seasonal British"]);
});

test("legacy venue roles infer teams without removing Events or changing the source answers", () => {
  const roles = ["Chefs", "FOH", "Managers", "Bartenders", "Events"];
  assert.deepEqual(teamsFromLegacyRoles(roles), ["Kitchen", "Pastry", "Bar", "Floor"]);
  assert.deepEqual(roles, ["Chefs", "FOH", "Managers", "Bartenders", "Events"]);
  assert.deepEqual(teamsFromLegacyRoles(["Events"]), []);
});

test("venue display names prefer trading name and fall back without modifying either answer", () => {
  const venue = { name: "Business Ltd", tradingName: "  The Orchard  " };
  assert.equal(venueDisplayName(venue), "The Orchard");
  assert.equal(venueDisplayName({ ...venue, tradingName: " " }), "Business Ltd");
  assert.equal(venue.tradingName, "  The Orchard  ");
});

const date = "2026-10-02";
const entry: DatedAvailability = { date, kind: "free", start: "16:00", end: "23:59" };
test("dated availability is optional and accepts all-day, overnight, and not-free entries", () => {
  assert.equal(validateDatedAvailability([], date), null);
  for (const patch of [{}, { start: "00:00", end: "00:00" }, { start: "22:00", end: "02:00" }, { kind: "not-free" as const, start: "00:00", end: "00:00" }])
    assert.equal(validateDatedAvailability([{ ...entry, ...patch }], date), null);
});

test("invalid, duplicate, stale or malformed dated availability produces actionable validation", () => {
  for (const patch of [{ date: "2026-02-30" }, { date: "2026-10-01" }, { start: "25:00" }, { end: "16:00" }, { kind: "maybe" }, { date: "" }])
    assert.ok(validateDatedAvailability([{ ...entry, ...patch } as DatedAvailability], date));
  assert.match(validateDatedAvailability([entry, entry], date)!, /once/);
});

const identity = (patch: Partial<TalentIdentity> = {}): TalentIdentity => ({
  ...EMPTY_TALENT_IDENTITY,
  name: "  Poppy Bertram ",
  mobile: "07700 900201",
  postcode: "TW9 2AA",
  category: "Chef",
  positions: ["CDP"],
  skills: ["Grill"],
  customSkills: ["Seasonal British"],
  knownFor: ["Reliable", "Makes great staff meals"],
  employers: [
    { restaurant: "Spruce", position: "CDP", dates: "2024–2026" },
    { restaurant: " ", position: "", dates: "" },
  ],
  minSameDayRate: "£20.50",
  agreedCommunity: [TEAM_AGREEMENTS[0], TEAM_AGREEMENTS[2]],
  ...patch,
});

test("talentAnswers maps the answers to the talents columns", () => {
  const a = talentAnswers(identity());
  assert.equal(a.full_name, "Poppy Bertram");
  assert.equal(a.date_of_birth, null);
  assert.equal(a.bio, null);
  assert.deepEqual(a.positions, ["CDP"]);
  assert.deepEqual(a.custom_skills, ["Seasonal British"]);
  // Known-for traits from the list stay; anything typed is custom.
  assert.deepEqual(a.known_for, ["Reliable"]);
  assert.deepEqual(a.custom_known_for, ["Makes great staff meals"]);
  assert.deepEqual(a.employment_history, [{ restaurant: "Spruce", position: "CDP", dates: "2024–2026" }]);
  assert.equal(a.minimum_same_day_rate_gbp, 20.5);
  assert.equal(a.shift_alerts, "all");
  assert.equal(a.agreed_turn_up_on_time, true);
  assert.equal(a.agreed_treat_venues_with_respect, false);
  assert.equal(a.agreed_give_notice_if_cancelling, true);
  assert.equal(a.agreed_represent_professionally, false);
  assert.equal(talentAnswers(identity({ minSameDayRate: " " })).minimum_same_day_rate_gbp, null);
  assert.ok(!("email" in a));
});

test("talentAnswers and venueAnswers refuse money and counts they can't read", () => {
  assert.throws(
    () => talentAnswers(identity({ minSameDayRate: "20ish" })),
    (e: unknown) => isRefusal(e) && e.message === "Enter the minimum same-day rate in pounds, like 20 or 20.50.",
  );
  assert.throws(
    () => venueAnswers({ ...EMPTY_VENUE_IDENTITY, teamSize: "4.5" }),
    (e: unknown) => isRefusal(e) && e.message === "Enter the team size as a whole number.",
  );
  const v = venueAnswers({ ...EMPTY_VENUE_IDENTITY, name: "Spruce Ltd", rateChef: "18", needs: ["Chefs"], teamsNeeded: undefined as never });
  assert.equal(v.business_name, "Spruce Ltd");
  assert.equal(v.typical_hourly_rate_chef_gbp, 18);
  assert.deepEqual(v.teams_needed, ["Kitchen", "Pastry"]);
});

test("kitchen documents follow the positions; drafts resume one step before the submit", () => {
  assert.equal(needsKitchenDocuments(["Waiter"]), false);
  assert.equal(needsKitchenDocuments(["Waiter", "Pastry Chef"]), true);
  assert.deepEqual(requiredDocs({ side: "talent", roles: ["Waiter"] }), ["Right to work", "Photo ID", "Allergen awareness"]);
  const t = resumeTalent({ side: "talent", talent: { identity: identity(), step: 8 }, venue: null }, "me@x.com");
  assert.equal(t.step, 7);
  assert.equal(t.identity.email, "me@x.com");
  const v = resumeVenue({ side: null, talent: null, venue: null }, "me@x.com");
  assert.equal(v.step, 0);
  assert.equal(v.identity.contactEmail, "me@x.com");
  assert.equal(resumeVenue({ side: "venue", talent: null, venue: { identity: EMPTY_VENUE_IDENTITY, step: 9 } }, "x").step, 6);
  assert.equal(venueStepZeroMissing(EMPTY_VENUE_IDENTITY), "a name, the street address, a postcode, the contact person, their phone");
});
