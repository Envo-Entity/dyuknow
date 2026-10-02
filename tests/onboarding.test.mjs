import test from "node:test";
import assert from "node:assert/strict";
import { SKILLS, TEAMS } from "../lib/catalogue.ts";
import { addCustomSkill, teamsFromLegacyRoles, venueDisplayName, validateDatedAvailability, upcomingDates, londonToday } from "../lib/onboardingModel.ts";

test("the shared catalogue keeps old skill values and every new preview option", () => {
  for (const skill of ["Barista", "Sushi / Fish Specialist", "Coffee", "Sushi", "Guest Relations"]) assert.ok(SKILLS.includes(skill));
  assert.ok(TEAMS.Sommelier.includes("Sommelier"));
  assert.ok(TEAMS.Floor.includes("Maître d’"));
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
const entry = { date, kind: "free", start: "16:00", end: "23:59" };
test("dated availability is optional and accepts all-day, overnight, and not-free entries", () => {
  assert.equal(validateDatedAvailability([], date), null);
  for (const patch of [{}, { start: "00:00", end: "00:00" }, { start: "22:00", end: "02:00" }, { kind: "not-free", start: "00:00", end: "00:00" }])
    assert.equal(validateDatedAvailability([{ ...entry, ...patch }], date), null);
});

test("invalid, duplicate, stale or malformed dated availability produces actionable validation", () => {
  for (const patch of [{ date: "2026-02-30" }, { date: "2026-10-01" }, { start: "25:00" }, { end: "16:00" }, { kind: "maybe" }, { date: "" }])
    assert.ok(validateDatedAvailability([{ ...entry, ...patch }], date));
  assert.match(validateDatedAvailability([entry, entry], date), /once/);
});

test("availability dates use London time across BST and calendar boundaries", () => {
  assert.equal(londonToday(new Date("2026-10-02T23:30:00Z")), "2026-10-03");
  assert.equal(londonToday(new Date("2026-10-26T23:30:00Z")), "2026-10-26");
  assert.deepEqual(upcomingDates("2026-12-31", 3), ["2026-12-31", "2027-01-01", "2027-01-02"]);
});
