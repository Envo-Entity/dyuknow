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
  relativeDay,
  shiftLabel,
  shortDay,
  offerableDates,
  venueSummary,
  currentOffer,
  openDates,
  standing,
  type Offer,
  type Booking,
  type Data,
  type Shift,
  areaOf,
  fullAddress,
  contactLine,
} from "@/lib/preview/model";
import { usePreview } from "./context";
import { AvailabilityEditor, VenueFacts } from "./MemberViews";
import { Chevron, DateTimeBar, savedWhen, useMessage, whenDays, whenPath } from "./Booking";
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
      person={other}
      name={other.name}
      title={shiftLabel(s)}
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
  const [when, setWhen] = useState(() => savedWhen(data.now));
  const days = whenDays(when);
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
      />
      <DateTimeBar label="When do you need someone?" value={when} onChange={setWhen} />
      <div className="pv-role-mosaic">
        {Object.entries(FAMILIES)
          // The teams this venue said it usually needs come first.
          .sort(
            ([a], [b]) =>
              Number(me?.venue?.teamsNeeded.includes(b)) -
              Number(me?.venue?.teamsNeeded.includes(a)),
          )
          .map(([name, family], i) => {
          const team = data.members.filter(
            (m) =>
              m.side === "talent" &&
              m.approved &&
              m.roles.some((r) => family.roles.includes(r)),
          );
          const free = team.filter((m) => standing(data, m.id, days) === "free").length;
          return (
            <button
              key={name}
              className={`pv-role pv-role-${i}`}
              onClick={() => go(whenPath(name, when.dates.length ? when : savedWhen(data.now)))}
            >
              <Photo src={family.photo} />
              <div>
                <h2>{name}</h2>
                <span className="pv-role-count">
                  {free} free then{" "}
                  <ArrowRightIcon size={18} />
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {data.draft && <DraftCard />}
      {open.length > 0 && (
        <Section title="Your open shifts">
          <div className="pv-rows">
            {open.map((s) => (
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
  const [others, setOthers] = useState(false);
  const [view, setView] = useState("Shifts");
  const mine = data.responses.filter((r) => r.talent === actor);
  const bookings = myBookings(data, actor, "talent");
  const coming = upcomingFirst(data, bookings);
  const invites = mine.filter(
    (r) =>
      r.status === "invited" &&
      data.shifts.find((s) => s.id === r.shift)!.status === "open",
  );
  const offers = (data.offers ?? []).filter(
    (o) =>
      o.status === "sent" &&
      (data.threads ?? []).some((t) => t.id === o.thread && t.talent === actor),
  );
  const waiting = mine.filter((r) => r.status === "can-cover");
  const ended = mine.filter((r) =>
    ["withdrawn", "declined", "not-selected", "lapsed"].includes(r.status),
  );
  const pastBookings = bookings.filter(
    (b) => b.cancelled || bookingServices(data, b).at(-1)!.to <= data.now,
  );
  const history = pastBookings.length + ended.length;
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
        good={status === "Invited you"}
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
      {(invites.length > 0 || offers.length > 0) && (
        <Section title="Invitations">
          <div className="pv-rows">
            {offers.map((o) => {
              const t = (data.threads ?? []).find((t) => t.id === o.thread)!;
              const v = member(data, t.venue);
              return (
                <Row
                  key={o.id}
                  photo={v.photo}
                  person={v}
                  name={v.name}
                  title={o.role}
                  sub={`${o.dates.length > 1 ? datesLabel(o.dates) : relativeDay(o.dates[0], data.now)} · ${o.start}–${o.end} · £${o.rate}/h`}
                  status="Booking request"
                  good
                  onClick={() => go(`chat/${t.id}`)}
                />
              );
            })}
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
      <div className="pv-home-controls">
        <Segments options={["Shifts", "Venues"]} value={view} onChange={setView} />
      </div>
      {view === "Venues" ? (
        <VenueDirectory />
      ) : (
        <>
          {forMe.length || (others && other.length) ? (
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
              {others && other.map((s) => <ShiftCard key={s.id} shift={s} label={shiftLabel(s)} />)}
            </div>
          ) : (
            <Empty title="Nothing new for your roles right now" />
          )}
          {other.length > 0 && (
            <button
              className="pv-reveal"
              aria-expanded={others}
              onClick={() => setOthers(!others)}
            >
              {others
                ? "Hide other roles"
                : `Show from other roles too (${other.length})`}
              <Chevron open={others} />
            </button>
          )}
        </>
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
  const { data, actor, side, go, profileBack } = usePreview();
  const message = useMessage();
  const v = member(data, id);
  if (!v)
    return (
      <Empty title="Venue not found" text="Return to the venue directory." />
    );
  const shifts = data.shifts.filter(
    (s) => s.venue === id && s.mode === "post" && s.status === "open",
  );
  const bookedHere = data.bookings.some((b) => b.talent === actor && !b.cancelled && data.shifts.some((s) => s.id === b.shift && s.venue === id));
  return (
    <>
      <Heading title={v.name} description={areaOf(v)} back={profileBack} />
      <div className="pv-profile-hero">
        <Photo src={v.photo} alt={v.name} />
        <div>
          {v.bio && <p>{v.bio}</p>}
          <VenueFacts v={v} />
          {side === "talent" && (
            <div className="pv-actions">
              <Button onClick={() => message(v.id)}>Message {v.name}</Button>
            </div>
          )}
          {v.venue && (
            <dl className="pv-profile-info">
              <div><dt>Typical rates</dt><dd>Kitchen and pastry £{v.venue.rateChef}/h · Front of house £{v.venue.rateFoh}/h</dd></div>
              {v.venue.dressCode && <div><dt>Dress code</dt><dd>{v.venue.dressCode}</dd></div>}
              <div><dt>Uniform</dt><dd>{v.venue.uniform ? "Provided" : "Not provided"}</dd></div>
              <div><dt>Staff meal</dt><dd>{v.venue.staffMeal ? "Provided" : "Not provided"}</dd></div>
              {bookedHere && <>
                <div><dt>Address</dt><dd>{fullAddress(v)}</dd></div>
                <div><dt>On-site contact</dt><dd>{contactLine(v)} · {v.phone}</dd></div>
              </>}
            </dl>
          )}
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
export function WorkHub() {
  const { data, actor, side, go } = usePreview();
  if (side !== "venue") return <AvailabilityEditor />;
  const today = londonDate(data.now);
  const bookings = myBookings(data, actor, side);
  const coming = upcomingFirst(data, bookings);
  const pastBookings = bookings.filter(
    (b) => b.cancelled || bookingServices(data, b).at(-1)!.to <= data.now,
  );
  const onToday = (dates: string[]) => dates.includes(today);
  const open = data.shifts
    .filter((s) => s.venue === actor && s.status === "open")
    // What needs a decision first, then soonest.
    .sort(
      (a, b) =>
        Number(venueSummary(data, b).needs) - Number(venueSummary(data, a).needs) ||
        a.days[0].from.localeCompare(b.days[0].from),
    );
  const todayBookings = coming.filter((b) => onToday(b.days));
  const todayOpen = open.filter((s) => onToday(openDates(data, s)));
  const later = coming.filter((b) => !todayBookings.includes(b));
  const laterOpen = open.filter((s) => !todayOpen.includes(s));
  // Booking cards sent from a conversation that still need the talent's answer
  // (or the venue's revision).
  const pending = (data.threads ?? [])
    .filter((t) => t.venue === actor)
    .map((t) => currentOffer(data, t.id))
    .filter((o): o is Offer => !!o && ["sent", "changes"].includes(o.status));
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
      {!open.length && !coming.length && !pending.length && (
        <Empty title="Nothing booked or open">
          <Button onClick={() => go("home")}>Find cover</Button>
        </Empty>
      )}
      {(todayBookings.length > 0 || todayOpen.length > 0) && (
        <Section title="Today">
          <div className="pv-rows">
            {todayBookings.map((b) => (
              <BookingRow key={b.id} b={b} />
            ))}
            {todayOpen.map((s) => (
              <VenueShiftRow key={s.id} s={s} />
            ))}
          </div>
        </Section>
      )}
      {(laterOpen.length > 0 || pending.length > 0) && (
        <Section title="Open">
          <div className="pv-rows">
            {pending.map((o) => {
              const t = (data.threads ?? []).find((t) => t.id === o.thread)!;
              const person = member(data, t.talent);
              return (
                <Row
                  key={o.id}
                  photo={person.photo}
                  person={person}
                  name={person.name}
                  title={o.role}
                  sub={`${o.dates.length > 1 ? datesLabel(o.dates) : relativeDay(o.dates[0], data.now)} · ${o.start}–${o.end} · £${o.rate}/h`}
                  status={o.status === "changes" ? "Asked for changes · Revise" : "Booking request sent"}
                  good={o.status === "changes"}
                  onClick={() => go(`chat/${t.id}`)}
                />
              );
            })}
            {laterOpen.map((s) => (
              <VenueShiftRow key={s.id} s={s} />
            ))}
          </div>
        </Section>
      )}
      {later.length > 0 && (
        <Section title="Upcoming">
          <div className="pv-rows">
            {later.map((b) => (
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
