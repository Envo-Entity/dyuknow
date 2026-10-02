"use client";
import { useState } from "react";
import { ArrowRightIcon } from "@/components/icons";
import {
  FAMILIES,
  availableDates,
  bookingServices,
  datesLabel,
  firstName,
  member,
  offeredDates,
  londonDate,
  displayDate,
  datePlus,
  relativeDay,
  shiftLabel,
  shortDay,
  offerableDates,
  venueSummary,
  type Booking,
  type Data,
  type Shift,
  areaOf,
} from "@/lib/preview/model";
import { usePreview } from "./context";
import { VenueFacts } from "./MemberViews";
import {
  Badge,
  Button,
  Empty,
  Heading,
  Photo,
  Row,
  Section,
  Segments,
  ShiftCard,
} from "./ui";

function whenLine(data: Data, s: Shift, dates?: string[]) {
  const first = dates
    ? s.days.find((d) => d.date === [...dates].sort()[0])!
    : s.days[0];
  const span = dates ?? s.days.map((d) => d.date);
  return `${span.length > 1 ? datesLabel(span) : relativeDay(first.date, data.now)} · ${first.start}–${first.end}`;
}
function VenueShiftRow({ s }: { s: Shift }) {
  const { data, go } = usePreview();
  const status = venueSummary(data, s);
  return (
    <Row
      photo={FAMILIES[s.family].photo}
      name={s.family}
      title={shiftLabel(s)}
      sub={whenLine(data, s)}
      status={status.text}
      good={status.good}
      onClick={() => go(`shift/${s.id}`)}
    />
  );
}
function BookingRow({ b }: { b: Booking }) {
  const { data, side, go } = usePreview();
  const s = data.shifts.find((s) => s.id === b.shift)!;
  const other = member(data, side === "venue" ? b.talent : s.venue);
  const past = bookingServices(data, b).at(-1)!.to <= data.now;
  return (
    <Row
      photo={other.photo}
      name={other.name}
      title={`${other.name} · ${shiftLabel(s)}`}
      sub={whenLine(data, s, b.days)}
      status={b.cancelled ? "Cancelled" : past ? "Past" : "Booked"}
      good={!b.cancelled && !past}
      onClick={() => go(`booking/${b.id}`)}
    />
  );
}
function myBookings(data: Data, actor: string, side: string) {
  return data.bookings.filter((b) =>
    side === "venue"
      ? data.shifts.find((s) => s.id === b.shift)!.venue === actor
      : b.talent === actor,
  );
}
function upcomingFirst(data: Data, list: Booking[]) {
  return list
    .filter((b) => !b.cancelled && bookingServices(data, b).at(-1)!.to > data.now)
    .sort((a, b) =>
      bookingServices(data, a)[0].from.localeCompare(
        bookingServices(data, b)[0].from,
      ),
    );
}
// An unsent draft says exactly what it is, and can be thrown away.
function DraftCard() {
  const { data, actor, act, go } = usePreview();
  const d = data.draft!;
  const [kind, id] = (d.origin || "").split("/");
  const roles = d.roles?.join(" or ") || d.family || "";
  const label =
    kind === "edit"
      ? `Unsent changes to your ${roles} shift`
      : kind === "again"
        ? `Unsent invite to ${firstName(member(data, d.repeatTalent!))}`
        : kind === "replace"
          ? `Unsent replacement for your ${roles} shift`
          : `Unsent ${d.family?.toLowerCase()} shift`;
  return (
    <div className="pv-attention pv-draft">
      <strong>{label}</strong>
      <span className="pv-draft-actions">
        <Button
          variant="secondary"
          onClick={() => act({ type: "save-draft", actor, draft: null }, "Draft discarded.")}
        >
          Discard
        </Button>
        <Button onClick={() => go(kind ? `compose/${kind}/${id}` : "new")}>
          Continue
        </Button>
      </span>
    </div>
  );
}
export function VenueHome() {
  const { data, actor, me, go } = usePreview();
  const open = data.shifts
    .filter((s) => s.venue === actor && s.status === "open")
    .sort((a, b) => a.days[0].from.localeCompare(b.days[0].from));
  const coming = upcomingFirst(data, myBookings(data, actor, "venue")).slice(
    0,
    3,
  );
  return (
    <>
      <Heading
        title={
          <>
            Who do you need <em>for service?</em>
          </>
        }
        description={`${me?.name} · ${(me ? areaOf(me) : '')}`}
      />
      {open.length > 0 && (
        <Section title="Your open shifts">
          <div className="pv-rows">
            {open.map((s) => (
              <VenueShiftRow key={s.id} s={s} />
            ))}
          </div>
        </Section>
      )}
      {data.draft && <DraftCard />}
      <div className="pv-role-mosaic">
        {Object.entries(FAMILIES)
          // The teams this venue said it usually needs come first.
          .sort(
            ([a], [b]) =>
              Number(me?.venue?.teamsNeeded.includes(b)) -
              Number(me?.venue?.teamsNeeded.includes(a)),
          )
          .map(([name, family], i) => {
          const count = data.members.filter(
            (m) =>
              m.side === "talent" &&
              m.approved &&
              m.roles.some((r) => family.roles.includes(r)),
          ).length;
          return (
            <button
              key={name}
              className={`pv-role pv-role-${i}`}
              onClick={() => go(`new/${name}`)}
            >
              <Photo src={family.photo} />
              <div>
                <h2>{name}</h2>
                <span className="pv-role-count">
                  {count
                    ? `${count} ${count === 1 ? "member" : "members"}`
                    : "We’ll help you find someone"}{" "}
                  <ArrowRightIcon size={18} />
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {coming.length > 0 && (
        <Section title="Coming up">
          <div className="pv-rows">
            {coming.map((b) => (
              <BookingRow key={b.id} b={b} />
            ))}
          </div>
        </Section>
      )}
    </>
  );
}
function NextBooking({ b }: { b: Booking }) {
  const { data, go } = usePreview();
  const s = data.shifts.find((s) => s.id === b.shift)!;
  const v = member(data, s.venue);
  const first = bookingServices(data, b)[0];
  return (
    <button className="pv-next" onClick={() => go(`booking/${b.id}`)}>
      <Photo src={v.photo} alt={v.name} />
      <span>
        <Badge good>You’re booked</Badge>
        <strong>{v.name}</strong>
        <small>
          {relativeDay(first.date, data.now)} · {first.start}–{first.end}
          {b.days.length > 1 ? ` · ${b.days.length} days` : ""} ·{" "}
          {shiftLabel(s)}
        </small>
      </span>
      <ArrowRightIcon />
    </button>
  );
}
export function TalentHome() {
  const { data, actor, me, go } = usePreview();
  const [view, setView] = useState("Shifts");
  const [others, setOthers] = useState(false);
  const mine = data.responses.filter((r) => r.talent === actor);
  const next = upcomingFirst(data, myBookings(data, actor, "talent"))[0];
  const invites = mine.filter(
    (r) =>
      r.status === "invited" &&
      data.shifts.find((s) => s.id === r.shift)!.status === "open",
  );
  const waiting = mine.filter((r) => r.status === "can-cover");
  // Hidden once answered, unless the person is booked for some days and
  // others are still open for them to offer.
  const answered = (s: Shift) =>
    mine.some(
      (r) =>
        r.shift === s.id &&
        !["withdrawn", "declined", "cancelled", "not-selected", "lapsed"].includes(r.status) &&
        !(r.status === "booked" && offerableDates(data, actor, s).length),
    );
  const feed = data.shifts
    .filter(
      (s) =>
        s.mode === "post" &&
        s.status === "open" &&
        !answered(s) &&
        availableDates(data, actor, s).length > 0 &&
        // A one-person-for-every-day shift only suits someone free every day.
        (!s.together ||
          availableDates(data, actor, s).length === s.days.length),
    )
    .sort((a, b) => a.days[0].from.localeCompare(b.days[0].from));
  const forMe = feed.filter((s) => me!.roles.some((r) => s.roles.includes(r)));
  const other = feed.filter((s) => !forMe.includes(s));
  return (
    <>
      <Heading
        title={
          <>
            Available shifts
          </>
        }
        description={`Hello, ${me?.name.split(" ")[0]}.`}
      />
      <div className="pv-home-controls">
        <Segments
          options={["Shifts", "Venues"]}
          value={view}
          onChange={setView}
        />
        <Button variant="quiet" onClick={() => go("availability")}>
          When I’m free <ArrowRightIcon size={16} />
        </Button>
      </div>
      {view === "Venues" ? (
        <VenueDirectory />
      ) : (
        <>
          {next && <NextBooking b={next} />}
          {invites.length > 0 && (
            <Section title="Invited you">
              <div className="pv-card-grid">
                {invites.map((r) => (
                  <ShiftCard
                    key={r.id}
                    shift={data.shifts.find((s) => s.id === r.shift)!}
                    label="Invited you"
                    good
                  />
                ))}
              </div>
            </Section>
          )}
          {waiting.length > 0 && (
            <Section title="Waiting to hear">
              <div className="pv-rows">
                {waiting.map((r) => {
                  const s = data.shifts.find((s) => s.id === r.shift)!;
                  const v = member(data, s.venue);
                  return (
                    <Row
                      key={r.id}
                      photo={v.photo}
                      name={v.name}
                      title={`${v.name} · ${shiftLabel(s)}`}
                      sub={whenLine(data, s, offeredDates(s, r))}
                      status="Waiting"
                      onClick={() => go(`shift/${s.id}`)}
                    />
                  );
                })}
              </div>
            </Section>
          )}
          <Section title="Shifts for you">
            {forMe.length ? (
              <div className="pv-card-grid">
                {forMe.map((s) => {
                  const free = availableDates(data, actor, s);
                  const mineHere = data.bookings.find(
                    (b) => b.shift === s.id && b.talent === actor && !b.cancelled,
                  );
                  const more = offerableDates(data, actor, s);
                  return (
                    <ShiftCard
                      key={s.id}
                      shift={s}
                      good={!!mineHere}
                      label={
                        mineHere
                          ? `Booked ${mineHere.days.map(shortDay).join(", ")} · ${more.map(shortDay).join(", ")} still open`
                          : free.length < s.days.length
                            ? `You can do ${free.length} of ${s.days.length} days`
                            : undefined
                      }
                    />
                  );
                })}
              </div>
            ) : (
              <Empty title="Nothing new for your roles right now" />
            )}
          </Section>
          {other.length > 0 && (
            <div className="pv-more">
              <Button variant="secondary" onClick={() => setOthers(!others)}>
                {others ? "Hide" : "Show"} shifts in other roles ({other.length})
              </Button>
              {others && (
                <div className="pv-card-grid">
                  {other.map((s) => (
                    <ShiftCard key={s.id} shift={s} label="Other role" />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
function VenueDirectory() {
  const { data, go } = usePreview();
  return (
    <div className="pv-venues">
      {data.members
        .filter((m) => m.side === "venue" && m.approved)
        .map((v) => {
          const count = data.shifts.filter(
            (s) => s.venue === v.id && s.mode === "post" && s.status === "open",
          ).length;
          return (
            <button
              key={v.id}
              className="pv-venue-card"
              onClick={() => go(`venue/${v.id}`)}
            >
              <Photo src={v.photo} />
              <div>
                <span>{areaOf(v)} · London</span>
                <h2>{v.name}</h2>
                <p>{v.bio}</p>
                <Badge>
                  {count
                    ? `${count} open ${count === 1 ? "shift" : "shifts"}`
                    : "No open shifts"}
                </Badge>
              </div>
            </button>
          );
        })}
    </div>
  );
}
export function VenueDetail({ id }: { id: string }) {
  const { data, go } = usePreview();
  const v = member(data, id);
  if (!v)
    return (
      <Empty title="Venue not found" text="Return to the venue directory." />
    );
  const shifts = data.shifts.filter(
    (s) => s.venue === id && s.mode === "post" && s.status === "open",
  );
  return (
    <>
      <Heading title={v.name} description={areaOf(v)} back="home" />
      <div className="pv-profile-hero">
        <Photo src={v.photo} alt={v.name} />
        <div>
          {v.bio && <p>{v.bio}</p>}
          <VenueFacts v={v} />
        </div>
      </div>
      <h2 className="pv-section-title">Open shifts</h2>
      {shifts.length ? (
        <div className="pv-card-grid">
          {shifts.map((s) => (
            <ShiftCard key={s.id} shift={s} />
          ))}
        </div>
      ) : (
        <Empty title="No open shifts here">
          <Button onClick={() => go("home")}>See other shifts</Button>
        </Empty>
      )}
    </>
  );
}
function AvailabilityStrip() {
  const { data, actor, go } = usePreview();
  const today = londonDate(data.now);
  const avail = data.availability.filter(
    (a) => a.member === actor && a.date >= today && a.kind === "free",
  );
  const booked = data.bookings
    .filter((b) => b.talent === actor && !b.cancelled)
    .flatMap((b) =>
      b.days.map((date) => ({
        date,
        venue: member(data, data.shifts.find((s) => s.id === b.shift)!.venue)
          .name,
      })),
    );
  return (
    <button className="pv-availability-summary" onClick={() => go("availability")}>
      <div>
        <h2>When you’re free</h2>
        {!avail.length && <p>Not set</p>}
      </div>
      <span className="pv-mini-days">
        {Array.from({ length: 14 }, (_, i) => {
          const d = datePlus(today, i);
          const here = booked.filter((b) => b.date === d).map((b) => b.venue);
          const free = avail.some((a) => a.date === d);
          return (
            <span
              className={here.length ? "is-booked" : free ? "is-free" : ""}
              key={d}
            >
              {displayDate(d).slice(0, 3)}
              <strong>{d.slice(-2)}</strong>
              <small>
                {here.length
                  ? [...new Set(here)].join(" · ")
                  : free
                    ? "Free"
                    : data.availability.some(
                          (a) => a.member === actor && a.date === d && a.kind === "not-free",
                        )
                      ? "Not free"
                      : "Not set"}
              </small>
            </span>
          );
        })}
      </span>
      <ArrowRightIcon />
    </button>
  );
}
export function WorkHub() {
  const { data, actor, side, go } = usePreview();
  const bookings = myBookings(data, actor, side);
  const coming = upcomingFirst(data, bookings);
  const pastBookings = bookings.filter(
    (b) => b.cancelled || bookingServices(data, b).at(-1)!.to <= data.now,
  );
  if (side === "venue") {
    const open = data.shifts
      .filter((s) => s.venue === actor && s.status === "open")
      .sort((a, b) => a.days[0].from.localeCompare(b.days[0].from));
    const needs = open.filter((s) => venueSummary(data, s).needs);
    const rest = open.filter((s) => !needs.includes(s));
    const closed = data.shifts.filter(
      (s) =>
        s.venue === actor &&
        ["closed", "expired"].includes(s.status) &&
        !bookings.some((b) => b.shift === s.id),
    );
    const history = pastBookings.length + closed.length;
    return (
      <>
        <Heading title="Bookings" />
        {!open.length && !coming.length && (
          <Empty title="Nothing booked or open">
            <Button onClick={() => go("home")}>Find cover</Button>
          </Empty>
        )}
        {needs.length > 0 && (
          <Section title="Needs you">
            <div className="pv-rows">
              {needs.map((s) => (
                <VenueShiftRow key={s.id} s={s} />
              ))}
            </div>
          </Section>
        )}
        {rest.length > 0 && (
          <Section title="Open">
            <div className="pv-rows">
              {rest.map((s) => (
                <VenueShiftRow key={s.id} s={s} />
              ))}
            </div>
          </Section>
        )}
        {coming.length > 0 && (
          <Section title="Coming up">
            <div className="pv-rows">
              {coming.map((b) => (
                <BookingRow key={b.id} b={b} />
              ))}
            </div>
          </Section>
        )}
        {history > 0 && (
          <details className="pv-history">
            <summary>Past and cancelled ({history})</summary>
            <div className="pv-rows">
              {pastBookings.map((b) => (
                <BookingRow key={b.id} b={b} />
              ))}
              {closed.map((s) => (
                <VenueShiftRow key={s.id} s={s} />
              ))}
            </div>
          </details>
        )}
      </>
    );
  }
  const mine = data.responses.filter((r) => r.talent === actor);
  const invites = mine.filter(
    (r) =>
      r.status === "invited" &&
      data.shifts.find((s) => s.id === r.shift)!.status === "open",
  );
  const waiting = mine.filter((r) => r.status === "can-cover");
  const ended = mine.filter((r) =>
    ["withdrawn", "declined", "not-selected", "lapsed"].includes(r.status),
  );
  const history = pastBookings.length + ended.length;
  const responseRow = (r: (typeof mine)[number], status: string) => {
    const s = data.shifts.find((s) => s.id === r.shift)!;
    const v = member(data, s.venue);
    return (
      <Row
        key={r.id}
        photo={v.photo}
        name={v.name}
        title={`${v.name} · ${shiftLabel(s)}`}
        sub={whenLine(data, s, offeredDates(s, r))}
        status={status}
        good={status === "Invited you"}
        onClick={() => go(`shift/${s.id}`)}
      />
    );
  };
  return (
    <>
      <Heading title="My shifts" />
      <AvailabilityStrip />
      {coming.length > 0 && (
        <Section title="Coming up">
          <div className="pv-rows">
            {coming.map((b) => (
              <BookingRow key={b.id} b={b} />
            ))}
          </div>
        </Section>
      )}
      {invites.length > 0 && (
        <Section title="Invited you">
          <div className="pv-rows">
            {invites.map((r) => responseRow(r, "Invited you"))}
          </div>
        </Section>
      )}
      {waiting.length > 0 && (
        <Section title="Waiting to hear">
          <div className="pv-rows">
            {waiting.map((r) => responseRow(r, "Waiting"))}
          </div>
        </Section>
      )}
      {!coming.length && !invites.length && !waiting.length && (
        <Empty title="No shifts yet">
          <Button onClick={() => go("home")}>See shifts</Button>
        </Empty>
      )}
      {history > 0 && (
        <details className="pv-history">
          <summary>Past and closed ({history})</summary>
          <div className="pv-rows">
            {pastBookings.map((b) => (
              <BookingRow key={b.id} b={b} />
            ))}
            {ended.map((r) =>
              responseRow(
                r,
                {
                  withdrawn: "Withdrawn",
                  declined: "Declined",
                  "not-selected": "Filled by someone else",
                  lapsed: "No longer available",
                }[r.status as "withdrawn"] || r.status,
              ),
            )}
          </div>
        </details>
      )}
    </>
  );
}
