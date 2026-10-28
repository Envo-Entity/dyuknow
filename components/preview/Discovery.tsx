"use client";
import { useState } from "react";
import { ArrowRightIcon } from "@/components/icons";
import {
  FAMILIES,
  activeDays,
  availableDates,
  bookingServices,
  datesLabel,
  member,
  offeredDates,
  relativeDay,
  shiftLabel,
  firstName,
  venueSummary,
  endedLabel,
  standing,
  teamOf,
  type Booking,
  type Data,
  type Shift,
  areaOf,
  fullAddress,
  contactLine,
} from "@/lib/preview/model";
import { usePreview } from "./context";
import { AvailabilityEditor, VenueFacts, Verified } from "./MemberViews";
import { DateTimeBar, TeamMosaic, savedWhen, whenDays, whenPath } from "./Booking";
import {
  Badge,
  Button,
  Empty,
  Heading,
  Photo,
  ProfilePhoto,
  ProfileName,
  Row,
  Section,
  ShiftCard,
  VenueCard,
} from "./ui";

function whenLine(data: Data, s: Shift, dates?: string[]) {
  const first = dates
    ? s.days.find((d) => d.date === [...dates].sort()[0])!
    : s.days[0];
  const span = dates ?? s.days.map((d) => d.date);
  return `${span.length > 1 ? datesLabel(span) : relativeDay(first.date, data.now)} · ${first.start}–${first.end}`;
}
// Which kind of ask this is, in the venue's words: who it went to.
function sentTo(data: Data, s: Shift) {
  if (s.mode === "post") return "Job post";
  const names = data.responses
    .filter((r) => r.shift === s.id && r.source === "invite")
    .map((r) => firstName(member(data, r.talent)));
  return `Request · ${names.length > 2 ? `${names.length} people` : names.join(", ")}`;
}
function VenueShiftRow({ s }: { s: Shift }) {
  const { data, go } = usePreview();
  const status = venueSummary(data, s);
  const team = teamOf(s.roles);
  return (
    <Row
      photo={FAMILIES[team].photo}
      name={team}
      title={shiftLabel(s)}
      sub={`${sentTo(data, s)} · ${whenLine(data, s)}`}
      status={status.text}
      good={status.good}
      attention={status.needs}
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
      person={other}
      name={other.name}
      title={shiftLabel(s)}
      sub={whenLine(data, s, b.cancelled ? b.days : activeDays(b))}
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
export function VenueHome() {
  const { data, actor, go } = usePreview();
  const [when, setWhen] = useState(() => savedWhen(data.now));
  const days = whenDays(when);
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
      />
      <DateTimeBar collapsible value={when} onChange={setWhen} />
      <TeamMosaic
        caption={(team) => {
          const free = team.filter((m) => standing(data, m.id, days) === "free").length;
          return `${free} available`;
        }}
        onPick={(name) => go(whenPath(name, when.dates.length ? when : savedWhen(data.now)))}
      />
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
    <div className="pv-next">
      <ProfilePhoto person={v} />
      <span>
        <Badge good>You’re booked</Badge>
        <strong><ProfileName person={v} /></strong>
        <small>
          {relativeDay(first.date, data.now)} · {first.start}–{first.end}
          {b.days.length > 1 ? ` · ${b.days.length} days` : ""} ·{" "}
          {shiftLabel(s)}
        </small>
      </span>
      <button className="pv-icon-button" aria-label="View booking details" onClick={() => go(`booking/${b.id}`)}><ArrowRightIcon /></button>
    </div>
  );
}
export function TalentHome() {
  const { data, actor, me, go } = usePreview();
  const mine = data.responses.filter((r) => r.talent === actor);
  const bookings = myBookings(data, actor, "talent");
  const coming = upcomingFirst(data, bookings);
  const invites = mine.filter(
    (r) =>
      r.status === "invited" &&
      data.shifts.find((s) => s.id === r.shift)!.status === "open",
  );
  const waiting = mine.filter((r) => r.status === "can-cover");
  const ended = mine.filter((r) =>
    ["withdrawn", "declined", "not-selected", "lapsed"].includes(r.status),
  );
  const pastBookings = bookings.filter(
    (b) => b.cancelled || bookingServices(data, b).at(-1)!.to <= data.now,
  );
  const history = pastBookings.length + ended.length;
  // Hidden once answered; it then lives under the answer or the booking.
  const answered = (s: Shift) =>
    mine.some(
      (r) =>
        r.shift === s.id &&
        !["withdrawn", "declined", "cancelled", "not-selected", "lapsed"].includes(r.status),
    );
  // Open job posts in this person's positions they could still do.
  const feed = data.shifts
    .filter(
      (s) =>
        s.mode === "post" &&
        s.status === "open" &&
        me!.roles.some((r) => s.roles.includes(r)) &&
        !answered(s) &&
        availableDates(data, actor, s).length > 0,
    )
    .sort((a, b) => a.days[0].from.localeCompare(b.days[0].from));
  // Every venue on Dyuknow, hiring or not; those hiring come first.
  const venues = data.members
    .filter((m) => m.side === "venue" && m.approved)
    .map((v) => ({
      v,
      open: data.shifts.filter((s) => s.venue === v.id && s.mode === "post" && s.status === "open")
        .length,
    }))
    .sort((a, b) => b.open - a.open || a.v.name.localeCompare(b.v.name));
  const responseRow = (r: (typeof mine)[number], status: string) => {
    const s = data.shifts.find((s) => s.id === r.shift)!;
    const v = member(data, s.venue);
    return (
      <Row
        key={r.id}
        photo={v.photo}
        person={v}
        name={v.name}
        title={shiftLabel(s)}
        sub={whenLine(data, s, offeredDates(s, r))}
        status={status}
        attention={status === "Waiting for you"}
        onClick={() => go(`shift/${s.id}`)}
      />
    );
  };
  return (
    <>
      <Heading
        title="Shifts"
      />
      {coming.length > 0 && (
        <Section title="Upcoming shifts">
          <div className="pv-rows">
            {coming.map((b) => (
              <NextBooking key={b.id} b={b} />
            ))}
          </div>
        </Section>
      )}
      {invites.length > 0 && (
        <Section title="Booking requests">
          <div className="pv-rows">
            {invites.map((r) => responseRow(r, "Waiting for you"))}
          </div>
        </Section>
      )}
      {waiting.length > 0 && (
        <Section title="Waiting to be booked">
          <div className="pv-rows">
            {waiting.map((r) => responseRow(r, "Waiting"))}
          </div>
        </Section>
      )}
      <Section title="Open jobs">
        {feed.length ? (
          <div className="pv-card-grid">
            {feed.map((s) => {
              const free = availableDates(data, actor, s);
              return (
                <ShiftCard
                  key={s.id}
                  shift={s}
                  label={
                    free.length < s.days.length
                      ? `You can do ${free.length} of ${s.days.length} days`
                      : undefined
                  }
                />
              );
            })}
          </div>
        ) : (
          <Empty
            title="No open jobs in your positions right now"
            text="Venues can still book you straight from your profile. Keep your availability up to date."
          />
        )}
      </Section>
      {venues.length > 0 && (
        <Section title="Venues on Dyuknow">
          <div className="pv-card-grid">
            {venues.map(({ v, open }) => (
              <VenueCard key={v.id} venue={v} openJobs={open} />
            ))}
          </div>
        </Section>
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
                endedLabel(r, member(data, data.shifts.find((s) => s.id === r.shift)!.venue).name) ?? ({
                  withdrawn: "Withdrawn",
                  declined: "Declined",
                  "not-selected": "Filled by someone else",
                  lapsed: "Booked elsewhere",
                }[r.status as "withdrawn"] || r.status),
              ),
            )}
          </div>
        </details>
      )}
    </>
  );
}
export function VenueDetail({ id }: { id: string }) {
  const { data, actor, side, go, profileBack } = usePreview();
  const v = member(data, id);
  if (!v)
    return (
      <Empty title="Venue not found" />
    );
  const shifts = data.shifts.filter(
    (s) => s.venue === id && s.mode === "post" && s.status === "open",
  );
  const bookedHere = data.bookings.some((b) => b.talent === actor && !b.cancelled && data.shifts.some((s) => s.id === b.shift && s.venue === id));
  // Venues start conversations; talent reply once one exists.
  const thread = data.threads.find(
    (t) => t.venue === id && t.talent === actor && data.messages.some((m) => m.thread === t.id),
  );
  return (
    <>
      <Heading title={v.name} description={areaOf(v)} back={profileBack} />
      <div className="pv-profile-hero">
        <Photo src={v.photo} alt={v.name} />
        <div>
          <Verified m={v} />
          {v.bio && <p>{v.bio}</p>}
          <VenueFacts v={v} />
          {side === "talent" &&
            (thread ? (
              <div className="pv-actions">
                <Button onClick={() => go(`chat/${thread.id}`)}>Open conversation</Button>
              </div>
            ) : (
              <p className="pv-muted pv-small">
                Venues start conversations. Apply to an open job, or keep your availability up to
                date so {v.name} can book you.
              </p>
            ))}
          {v.venue && bookedHere && (
            <dl className="pv-profile-info">
              <div><dt>Address</dt><dd>{fullAddress(v)}</dd></div>
              <div><dt>On-site contact</dt><dd>{contactLine(v)} · {v.phone}</dd></div>
            </dl>
          )}
        </div>
      </div>
      <h2 className="pv-section-title">Open jobs</h2>
      {shifts.length ? (
        <div className="pv-card-grid">
          {shifts.map((s) => (
            <ShiftCard key={s.id} shift={s} />
          ))}
        </div>
      ) : (
        <Empty title="No open jobs here" text={`When ${v.name} posts a job, it shows here.`}>
          <Button onClick={() => go("home")}>See open jobs</Button>
        </Empty>
      )}
    </>
  );
}
export function WorkHub() {
  const { data, actor, side, go } = usePreview();
  if (side !== "venue") return <AvailabilityEditor />;
  const bookings = myBookings(data, actor, side);
  const coming = upcomingFirst(data, bookings);
  const pastBookings = bookings.filter(
    (b) => b.cancelled || bookingServices(data, b).at(-1)!.to <= data.now,
  );
  // Days that have finished and still need their hours confirmed.
  const toConfirm = bookings.filter(
    (b) =>
      !b.cancelled &&
      bookingServices(data, b).some((d) => d.to <= data.now && !b.log[d.date]),
  );
  const open = data.shifts
    .filter((s) => s.venue === actor && s.status === "open")
    .sort((a, b) => a.days[0].from.localeCompare(b.days[0].from));
  // A yes to book, or a cancelled day to fill: the venue's move.
  const decide = open.filter((s) => venueSummary(data, s).needs);
  const waiting = open.filter((s) => !decide.includes(s));
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
      {!open.length && !coming.length && !toConfirm.length && (
        <Empty title="No bookings yet">
          <Button onClick={() => go("home")}>Find cover</Button>
        </Empty>
      )}
      {(decide.length > 0 || toConfirm.length > 0) && (
        <Section title="Needs you">
          <div className="pv-rows">
            {decide.map((s) => (
              <VenueShiftRow key={s.id} s={s} />
            ))}
            {toConfirm.map((b) => (
              <BookingRow key={b.id} b={b} />
            ))}
          </div>
        </Section>
      )}
      {coming.length > 0 && (
        <Section title="Upcoming">
          <div className="pv-rows">
            {coming.map((b) => (
              <BookingRow key={b.id} b={b} />
            ))}
          </div>
        </Section>
      )}
      {waiting.length > 0 && (
        <Section title="Waiting for replies">
          <div className="pv-rows">
            {waiting.map((s) => (
              <VenueShiftRow key={s.id} s={s} />
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
