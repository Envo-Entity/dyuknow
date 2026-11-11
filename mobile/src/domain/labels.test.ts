import test from "node:test";
import assert from "node:assert/strict";
import { areaOf, datesLabel, datesSummary, endedLabel, freeLabel, joinNames, responseLabel, serviceLabel } from "./labels.ts";
import { makeDays } from "./shifts.ts";
import type { Response } from "./types.ts";

test("serviceLabel shows same-day hours with a dash and overnight hours with the next day", () => {
  const [day] = makeDays({ dates: ["2026-10-02"], start: "17:00", end: "23:00" });
  assert.equal(serviceLabel(day), "Fri 2 Oct · 17:00–23:00");
  const [late] = makeDays({ dates: ["2026-10-02"], start: "22:00", end: "02:00" });
  assert.equal(serviceLabel(late), "Fri 2 Oct · 22:00 → Sat 3 Oct 02:00");
  const [eom] = makeDays({ dates: ["2026-10-31"], start: "23:00", end: "01:00" });
  assert.equal(serviceLabel(eom), "Sat 31 Oct · 23:00 → Sun 1 Nov 01:00");
});

test("datesLabel groups back-to-back days and names the month once", () => {
  assert.equal(datesLabel([]), "");
  assert.equal(datesLabel(["2026-10-05"]), "Mon 5 Oct");
  assert.equal(datesLabel(["2026-10-07", "2026-10-05", "2026-10-06"]), "Mon 5–Wed 7 Oct");
  assert.equal(datesLabel(["2026-10-03", "2026-10-04", "2026-10-13"]), "Sat 3–Sun 4, Tue 13 Oct");
  assert.equal(datesLabel(["2026-10-31", "2026-11-01"]), "Sat 31 Oct–Sun 1 Nov");
  assert.equal(datesLabel(["2026-09-29", "2026-09-30"]), "Tue 29–Wed 30 Sept");
  assert.equal(datesLabel(["2026-10-05", "2026-10-05"]), "Mon 5 Oct");
});

test("datesSummary reads two runs in full and counts more", () => {
  assert.deepEqual(datesSummary(["2026-10-03", "2026-10-04", "2026-10-13"]), { main: "Sat 3–Sun 4, Tue 13 Oct", sub: "" });
  assert.deepEqual(datesSummary(["2026-10-03", "2026-10-06", "2026-10-09", "2026-10-20"]), {
    main: "4 days",
    sub: "Sat 3 – Tue 20 Oct",
  });
  assert.deepEqual(datesSummary(["2026-10-30", "2026-11-02", "2026-11-05"]), {
    main: "3 days",
    sub: "Fri 30 Oct – Thu 5 Nov",
  });
});

test("areaOf shows the outward code, or the postcode as typed", () => {
  assert.equal(areaOf({ postcode: "TW9 1UA" }), "TW9");
  assert.equal(areaOf({ postcode: "sw1x0aw" }), "SW1X");
  assert.equal(areaOf({ postcode: "TW9" }), "TW9");
  assert.equal(areaOf({ postcode: "" }), "");
  assert.equal(areaOf({ postcode: "", shownPostcode: " w1k 5db " }), "W1K 5DB");
});

test("answer labels prefer the end reason", () => {
  const r = (patch: Partial<Response>): Response => ({ id: "r", shift: "s", talent: "t", source: "response", status: "can-cover", ...patch });
  assert.equal(responseLabel(r({})), "Said yes");
  assert.equal(responseLabel(r({ status: "invited" })), "Booking request");
  assert.equal(responseLabel(r({ status: "lapsed" })), "Booked elsewhere");
  assert.equal(responseLabel(r({ status: "not-selected", endReason: "venue-closed" })), "Cancelled");
  assert.equal(responseLabel(r({ status: "lapsed", endReason: "shift-started" })), "Started");
  assert.equal(endedLabel(r({ endReason: "venue-closed" }), "Spruce"), "Cancelled by Spruce");
  assert.equal(endedLabel(r({ endReason: "venue-closed" })), "Cancelled by the venue");
  assert.equal(endedLabel(r({ endReason: "filled" })), "Filled by someone else");
  assert.equal(endedLabel(r({})), undefined);
});

test("small labels", () => {
  assert.equal(joinNames(["Theo"]), "Theo");
  assert.equal(joinNames(["Theo", "Poppy", "Inès"]), "Theo, Poppy and Inès");
  assert.equal(freeLabel({ member: "m", date: "2026-10-01", kind: "free", start: "00:00", end: "00:00" }), "All day");
  assert.equal(freeLabel({ member: "m", date: "2026-10-01", kind: "free", start: "16:00", end: "23:59" }), "16:00–23:59");
});
