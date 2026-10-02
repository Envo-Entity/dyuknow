"use client";
import { useState } from "react";
import { BookingsIcon, ArrowRightIcon } from "@/components/icons";
import {
  FAMILIES,
  bookedCount,
  conflict,
  isFree,
  member,
  londonDate,
  displayDate,
  datePlus,
  type Shift,
} from "@/lib/preview/model";
import { usePreview } from "./context";
import {
  Badge,
  Button,
  Empty,
  Field,
  Heading,
  Photo,
  Segments,
  ShiftCard,
} from "./ui";
export function VenueHome() {
  const { data, actor, me, go } = usePreview();
  const waiting = data.responses.filter(
    (r) =>
      r.status === "can-cover" &&
      data.shifts.some(
        (s) => s.id === r.shift && s.venue === actor && s.status === "open",
      ),
  );
  const upcoming = data.bookings.find(
    (b) =>
      !b.cancelled &&
      data.shifts.find((s) => s.id === b.shift)!.venue === actor &&
      data.shifts.find((s) => s.id === b.shift)!.days.at(-1)!.to > data.now,
  );
  return (
    <>
      <Heading
        title={
          <>
            Who do you need <em>for service?</em>
          </>
        }
        description={`Welcome back, ${me?.name}. Find cover for today, tomorrow or a few days ahead.`}
      />
      {waiting.length > 0 && (
        <button
          className="pv-attention"
          onClick={() => go(`shift/${waiting[0].shift}`)}
        >
          <span>
            <strong>
              {waiting.length}{" "}
              {waiting.length === 1 ? "person can" : "people can"} cover
            </strong>
            <small>
              Your responses are ready to review. Book when you’re ready.
            </small>
          </span>
          <ArrowRightIcon />
        </button>
      )}
      {data.draft && (
        <div className="pv-inline">
          <span>You have an unfinished shift. Your details are saved.</span>
          <Button variant="secondary" onClick={() => go("new")}>
            Continue draft
          </Button>
        </div>
      )}
      <div className="pv-role-mosaic">
        {Object.entries(FAMILIES).map(([name, family], i) => (
          <button
            key={name}
            className={`pv-role pv-role-${i}`}
            onClick={() => go(`new/${name}`)}
          >
            <Photo src={family.photo} />
            <div>
              <span>{family.caption}</span>
              <h2>{name}</h2>
              <span className="pv-role-count">
                {
                  data.members.filter(
                    (m) =>
                      m.side === "talent" &&
                      m.approved &&
                      m.roles.some((r) => family.roles.includes(r)),
                  ).length
                }{" "}
                members <ArrowRightIcon size={18} />
              </span>
            </div>
          </button>
        ))}
      </div>
      <div className="pv-inline pv-home-note">
        <BookingsIcon />
        <p>
          Choose a role, add dates and pay, then send to everyone in that role
          or invite your own shortlist.
        </p>
        <Button variant="secondary" onClick={() => go("bookings")}>
          Your bookings
        </Button>
      </div>
      {upcoming && (
        <section>
          <h2 className="pv-section-title">Next service</h2>
          <ShiftCard
            shift={data.shifts.find((s) => s.id === upcoming.shift)!}
            label="Booked"
            onClick={() => go(`booking/${upcoming.id}`)}
          />
        </section>
      )}
    </>
  );
}
export function TalentHome() {
  const { data, actor, me, go } = usePreview();
  const [view, setView] = useState("Shifts");
  const [scope, setScope] = useState("Your roles");
  const [role, setRole] = useState("");
  const [date, setDate] = useState("");
  const [area, setArea] = useState("");
  const [pay, setPay] = useState("");
  const [free, setFree] = useState(false);
  const invites = data.responses.filter(
    (r) => r.talent === actor && r.status === "invited",
  );
  const shifts = data.shifts.filter(
    (s) =>
      s.mode === "post" &&
      s.status === "open" &&
      (scope === "All roles" || me!.roles.some((r) => s.roles.includes(r))) &&
      (!role || s.roles.includes(role)) &&
      (!date || s.days.some((d) => d.date === date)) &&
      (!area || member(data, s.venue).area === area) &&
      (!pay || s.rate >= Number(pay)) &&
      (!free || isFree(data, actor, s.days)),
  );
  return (
    <>
      <Heading
        title={
          <>
            A good room. <em>Your next service.</em>
          </>
        }
        description={`Hello, ${me?.name.split(" ")[0]}. London shifts, with your roles first.`}
      />
      <div className="pv-home-controls">
        <Segments
          options={["Shifts", "Venues"]}
          value={view}
          onChange={setView}
        />
        <Button variant="quiet" onClick={() => go("availability")}>
          Update availability <ArrowRightIcon size={16} />
        </Button>
      </div>
      {view === "Venues" ? (
        <VenueDirectory />
      ) : (
        <>
          {invites.length > 0 && (
            <section>
              <h2 className="pv-section-title">Invited personally</h2>
              <div className="pv-card-grid">
                {invites.map((r) => (
                  <ShiftCard
                    key={r.id}
                    shift={data.shifts.find((s) => s.id === r.shift)!}
                    label="Invitation · decision needed"
                  />
                ))}
              </div>
            </section>
          )}
          <section>
            <div className="pv-section-head">
              <h2 className="pv-section-title">Shifts for you</h2>
              <Segments
                options={["Your roles", "All roles"]}
                value={scope}
                onChange={setScope}
              />
            </div>
            <div className="pv-filters">
              <Field label="Role">
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="">Any role</option>
                  {Object.values(FAMILIES)
                    .flatMap((f) => f.roles)
                    .map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                </select>
              </Field>
              <Field label="Date">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </Field>
              <Field label="Area">
                <select value={area} onChange={(e) => setArea(e.target.value)}>
                  <option value="">Anywhere in London</option>
                  {data.members
                    .filter((m) => m.side === "venue")
                    .map((v) => (
                      <option key={v.id}>{v.area}</option>
                    ))}
                </select>
              </Field>
              <Field label="Minimum £ / hour">
                <input
                  type="number"
                  min="0"
                  placeholder="Any rate"
                  value={pay}
                  onChange={(e) => setPay(e.target.value)}
                />
              </Field>
            </div>
            <div className="pv-inline">
              <label className="pv-check">
                <input
                  type="checkbox"
                  checked={free}
                  onChange={(e) => setFree(e.target.checked)}
                />{" "}
                Fits my published availability
              </label>
              <Button
                variant="quiet"
                onClick={() => {
                  setRole("");
                  setDate("");
                  setArea("");
                  setPay("");
                  setFree(false);
                }}
              >
                Clear filters
              </Button>
            </div>
            {shifts.length ? (
              <div className="pv-card-grid">
                {shifts
                  .sort(
                    (a, b) =>
                      Number(me!.roles.some((r) => b.roles.includes(r))) -
                        Number(me!.roles.some((r) => a.roles.includes(r))) ||
                      a.days[0].from.localeCompare(b.days[0].from),
                  )
                  .map((s) => {
                    const r = data.responses.find(
                      (r) => r.shift === s.id && r.talent === actor,
                    );
                    return (
                      <ShiftCard
                        key={s.id}
                        shift={s}
                        label={
                          conflict(data, actor, s.days)
                            ? "Conflicts with a booking"
                            : r?.status === "can-cover"
                              ? "Waiting to hear"
                              : me!.roles.some((r) => s.roles.includes(r))
                                ? "Matches your role"
                                : "Other role"
                        }
                      />
                    );
                  })}
              </div>
            ) : (
              <Empty
                title="No shifts for these filters"
                text="Try other dates or explore all London roles. Your alerts still follow the roles on your profile."
              >
                <Button
                  onClick={() => {
                    setScope("All roles");
                    setRole("");
                    setDate("");
                    setArea("");
                    setPay("");
                    setFree(false);
                  }}
                >
                  See all open shifts
                </Button>
                <Button variant="secondary" onClick={() => setView("Venues")}>
                  Browse venues
                </Button>
              </Empty>
            )}
          </section>
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
                <span>{v.area} · London</span>
                <h2>{v.name}</h2>
                <p>{v.bio}</p>
                <Badge>
                  {count ? `${count} open shifts` : "No open shifts"}
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
      <Heading title={v.name} description={`${v.area} · London`} back="home" />
      <div className="pv-profile-hero">
        <Photo src={v.photo} />
        <div>
          <h2>A little about the room</h2>
          <p>{v.bio}</p>
          <Badge good>Member of Dyuknow</Badge>
          <p>Conversation starts with a shift response or an invitation.</p>
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
        <Empty
          title="No open shifts here"
          text="This venue is a member, but is not looking for cover right now."
        >
          <Button onClick={() => go("home")}>Explore other shifts</Button>
        </Empty>
      )}
    </>
  );
}
export function WorkHub() {
  const { data, actor, side, go } = usePreview();
  const [view, setView] = useState(side === "venue" ? "Open" : "Upcoming");
  const mine = (s: Shift) =>
    side === "venue"
      ? s.venue === actor
      : data.responses.some((r) => r.shift === s.id && r.talent === actor);
  const bookings = data.bookings
    .filter((b) =>
      side === "venue"
        ? data.shifts.find((s) => s.id === b.shift)!.venue === actor
        : b.talent === actor,
    )
    .filter((b) =>
      view === "Cancelled"
        ? b.cancelled
        : !b.cancelled &&
          (view === "Past"
            ? data.shifts.find((s) => s.id === b.shift)!.days.at(-1)!.to <=
              data.now
            : data.shifts.find((s) => s.id === b.shift)!.days.at(-1)!.to >
              data.now),
    );
  const shifts = data.shifts.filter(
    (s) =>
      mine(s) &&
      (view === "Open"
        ? s.status === "open"
        : view === "Waiting to hear"
          ? data.responses.some(
              (r) =>
                r.shift === s.id &&
                r.talent === actor &&
                ["invited", "can-cover"].includes(r.status),
            )
          : ["closed", "expired"].includes(s.status) ||
            data.responses.some(
              (r) =>
                r.shift === s.id &&
                r.talent === actor &&
                ["withdrawn", "declined", "not-selected", "lapsed"].includes(
                  r.status,
                ),
            )),
  );
  const listing = ["Open", "Waiting to hear", "Closed"].includes(view);
  const today = londonDate(data.now);
  const avail = data.availability.filter(
    (a) => a.member === actor && a.date >= today && a.kind === "free",
  );
  return (
    <>
      <Heading
        title={side === "venue" ? "Bookings" : "My shifts"}
        description={
          side === "venue"
            ? "Your open requests, agreed services and history."
            : "What’s agreed, what’s waiting, and when you’re free."
        }
      />
      {side === "talent" && (
        <button
          className="pv-availability-summary"
          onClick={() => go("availability")}
        >
          <div>
            <h2>Your next 14 days</h2>
            <p>
              {avail.length
                ? `${avail.length} dates with published availability`
                : "Availability not set — you’ll still get role alerts"}
            </p>
          </div>
          <span className="pv-mini-days">
            {Array.from({ length: 14 }, (_, i) => {
              const d = datePlus(today, i);
              const booked = data.bookings
                .filter(
                  (b) =>
                    b.talent === actor &&
                    !b.cancelled &&
                    data.shifts
                      .find((s) => s.id === b.shift)
                      ?.days.some((day) => day.date === d),
                )
                .map(
                  (b) =>
                    member(
                      data,
                      data.shifts.find((s) => s.id === b.shift)!.venue,
                    ).name,
                );
              return (
                <span
                  className={
                    booked.length
                      ? "is-booked"
                      : avail.some((a) => a.date === d)
                        ? "is-free"
                        : ""
                  }
                  key={d}
                >
                  {displayDate(d).slice(0, 3)}
                  <strong>{d.slice(-2)}</strong>
                  <small>
                    {booked.length
                      ? [...new Set(booked)].join(" · ")
                      : avail.some((a) => a.date === d)
                        ? "Free"
                        : "Not set"}
                  </small>
                </span>
              );
            })}
          </span>
          <ArrowRightIcon />
        </button>
      )}
      <Segments
        options={
          side === "venue"
            ? ["Open", "Upcoming", "Past", "Cancelled", "Closed"]
            : ["Upcoming", "Waiting to hear", "Past", "Cancelled", "Closed"]
        }
        value={view}
        onChange={setView}
      />
      {(listing ? shifts.length : bookings.length) ? (
        <div className="pv-card-grid pv-hub-grid">
          {listing
            ? shifts.map((s) => {
                const r = data.responses.find(
                  (r) => r.shift === s.id && r.talent === actor,
                );
                return (
                  <ShiftCard
                    key={s.id}
                    shift={s}
                    label={
                      side === "venue"
                        ? `${bookedCount(data, s.id)} of ${s.capacity} booked`
                        : r?.status === "invited"
                          ? "Invitation · answer needed"
                          : r?.status === "can-cover"
                            ? "Waiting to hear"
                            : r?.status.replaceAll("-", " ")
                    }
                  />
                );
              })
            : bookings.map((b) => (
                <ShiftCard
                  key={b.id}
                  shift={data.shifts.find((s) => s.id === b.shift)!}
                  label={
                    b.cancelled
                      ? "Cancelled"
                      : view === "Past"
                        ? "Past"
                        : "Booked"
                  }
                  onClick={() => go(`booking/${b.id}`)}
                />
              ))}
        </div>
      ) : (
        <Empty
          title={
            view === "Upcoming"
              ? "Your next service starts here"
              : `Nothing in ${view.toLowerCase()} yet`
          }
          text={
            view === "Upcoming"
              ? "Confirmed bookings appear here. A response to a shift is still waiting until the venue books it."
              : "Your activity will stay here as you go through each story."
          }
        >
          <Button onClick={() => go("home")}>
            {side === "venue" ? "Start a shift" : "Explore shifts"}
          </Button>
        </Empty>
      )}
    </>
  );
}
