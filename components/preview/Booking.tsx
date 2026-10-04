"use client";
// Finding vetted people by team and time, and booking them from a
// conversation with a booking card.
import { useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, BookingsIcon } from "@/components/icons";
import {
  FAMILIES,
  allSkills,
  areaOf,
  datePlus,
  datesLabel,
  defaultNote,
  defaultRate,
  firstName,
  hoursOf,
  londonDate,
  member,
  offerDays,
  rankTalent,
  standing,
  standingLabel,
  threadBetween,
  workedWith,
  type Member,
  type Offer,
  type OfferTerms,
  type Service,
} from "@/lib/preview/model";
import { usePreview } from "./context";
import { Badge, Button, Empty, Field, Heading, Modal, Photo } from "./ui";

export type When = { dates: string[]; start: string; end: string };
const WHEN_KEY = "pv-when-v2";
const MAX_DATES = 7;
// How far ahead a venue can book.
const MONTHS_AHEAD = 6;
// The venue's chosen time survives moving between Book and a team list.
export function savedWhen(now: string): When {
  const today = londonDate(now);
  try {
    const value = JSON.parse(sessionStorage.getItem(WHEN_KEY) || "null");
    if (value?.dates?.length && value.dates.every((d: string) => d >= today))
      return value;
  } catch {
    /* No stored choice: start from tomorrow evening. */
  }
  return { dates: [datePlus(today, 1)], start: "17:00", end: "23:00" };
}
function saveWhen(value: When) {
  try {
    sessionStorage.setItem(WHEN_KEY, JSON.stringify(value));
  } catch {
    /* The choice still applies on this screen. */
  }
}
export function whenDays(w: When): Service[] {
  try {
    return offerDays(w);
  } catch {
    return [];
  }
}
export function whenPath(family: string, w: When) {
  return `team/${family}/${w.dates.join(",")}/${w.start}-${w.end}`;
}
export function parseWhen(dates?: string, hours?: string): When | undefined {
  if (!dates || !hours) return;
  const [start, end] = hours.split("-");
  return { dates: dates.split(",").filter(Boolean), start, end };
}

function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}
export function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`pv-chevron ${open ? "is-open" : ""}`}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// "2026-10" → the dates in that month's grid, Monday first, with blanks.
function monthGrid(month: string) {
  const first = new Date(`${month}-01T12:00:00Z`);
  const lead = (first.getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array(lead).fill(null);
  for (let d = `${month}-01`; d.startsWith(month); d = datePlus(d, 1)) cells.push(d);
  return cells;
}
function monthPlus(month: string, n: number) {
  const d = new Date(`${month}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 7);
}
function monthName(month: string) {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-01T12:00:00Z`),
  );
}

function Calendar({
  value,
  onChange,
  onDone,
}: {
  value: string[];
  onChange: (dates: string[]) => void;
  onDone: () => void;
}) {
  const { data } = usePreview();
  const today = londonDate(data.now);
  const first = today.slice(0, 7);
  const last = monthPlus(first, MONTHS_AHEAD);
  const lastDay = datePlus(monthPlus(last, 1) + "-01", -1);
  const [month, setMonth] = useState(value[0]?.slice(0, 7) || first);
  const full = value.length >= MAX_DATES;
  const toggle = (d: string) =>
    onChange(value.includes(d) ? value.filter((x) => x !== d) : [...value, d].sort());
  // Next Saturday and Sunday (today counts if it's the weekend).
  const wd = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
  const sat = wd === 6 ? datePlus(today, -1) : datePlus(today, 5 - wd);
  const quick: [string, string[]][] = [
    ["Today", [today]],
    ["Tomorrow", [datePlus(today, 1)]],
    ["This weekend", [sat, datePlus(sat, 1)].filter((d) => d >= today)],
    ["Next 7 days", Array.from({ length: 7 }, (_, i) => datePlus(today, i))],
  ];
  return (
    <div className="pv-calendar" role="group" aria-label="Choose dates">
      <div className="pv-calendar-quick">
        {quick.map(([label, dates]) => {
          const on = dates.length === value.length && dates.every((d) => value.includes(d));
          return (
            <button
              key={label}
              className={on ? "selected" : ""}
              aria-pressed={on}
              onClick={() => {
                onChange(dates);
                setMonth(dates[0].slice(0, 7));
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="pv-calendar-months">
        <button
          className="pv-icon-button pv-calendar-prev"
          aria-label="Previous month"
          disabled={month <= first}
          onClick={() => setMonth(monthPlus(month, -1))}
        >
          <ArrowLeftIcon size={18} />
        </button>
        <button
          className="pv-icon-button pv-calendar-next"
          aria-label="Next month"
          disabled={monthPlus(month, 1) >= last}
          onClick={() => setMonth(monthPlus(month, 1))}
        >
          <ArrowRightIcon size={18} />
        </button>
        {[month, monthPlus(month, 1)].map((m, i) => (
          <div key={m} className={`pv-month ${i ? "is-second" : ""}`}>
            <h3>{monthName(m)}</h3>
            <div className="pv-month-grid">
              {WEEKDAYS.map((w) => (
                <span key={w} className="pv-weekday">
                  {w.slice(0, 2)}
                </span>
              ))}
              {monthGrid(m).map((d, j) =>
                d ? (
                  <button
                    key={d}
                    className={`${value.includes(d) ? "selected" : ""} ${d === today ? "is-today" : ""}`}
                    aria-pressed={value.includes(d)}
                    aria-label={new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${d}T12:00:00Z`))}
                    disabled={d < today || d > lastDay || (full && !value.includes(d))}
                    onClick={() => toggle(d)}
                  >
                    {Number(d.slice(-2))}
                  </button>
                ) : (
                  <span key={`blank-${j}`} />
                ),
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="pv-calendar-foot">
        <span>
          {value.length
            ? `${value.length} ${value.length === 1 ? "date" : "dates"} · ${datesLabel(value)}`
            : "Tap the dates you need"}
          {full && <small>Up to {MAX_DATES} dates, same hours each day</small>}
        </span>
        {value.length > 0 && (
          <Button variant="quiet" onClick={() => onChange([])}>
            Clear
          </Button>
        )}
        <Button disabled={!value.length} onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}

// One compact line: dates and hours. The calendar opens below only while
// choosing, then folds away again.
export function DateTimeBar({
  value,
  onChange,
  label,
}: {
  value: When;
  onChange: (value: When) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const set = (patch: Partial<When>) => {
    const next = { ...value, ...patch };
    if (next.dates.length) saveWhen(next);
    onChange(next);
  };
  const days = whenDays(value);
  return (
    <div className={`pv-when ${open ? "is-open" : ""}`}>
      {label && <h2 className="pv-when-label">{label}</h2>}
      <div className="pv-when-bar">
        <button
          className="pv-when-field pv-when-dates"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <BookingsIcon />
          <span>
            <small>{value.dates.length > 1 ? `${value.dates.length} dates` : "Date"}</small>
            <strong>{value.dates.length ? datesLabel(value.dates) : "Choose dates"}</strong>
          </span>
          <Chevron open={open} />
        </button>
        <div className="pv-when-field pv-when-hours">
          <ClockIcon />
          <span>
            <small>Hours{value.dates.length > 1 ? " · each day" : ""}</small>
            <span className="pv-when-times">
              <input
                type="time"
                aria-label="Start time"
                value={value.start}
                onChange={(e) => set({ start: e.target.value })}
              />
              <span aria-hidden="true">–</span>
              <input
                type="time"
                aria-label="End time"
                value={value.end}
                onChange={(e) => set({ end: e.target.value })}
              />
            </span>
          </span>
        </div>
      </div>
      {!days.length && value.dates.length > 0 && (
        <p className="pv-error">Choose different start and end times.</p>
      )}
      {open && (
        <Calendar
          value={value.dates}
          onChange={(dates) => set({ dates })}
          onDone={() => setOpen(false)}
        />
      )}
    </div>
  );
}

// Opens (or reuses) the conversation with this person, carrying what the
// venue is looking for so the booking card starts filled in.
export function useMessage() {
  const { actor, act, go } = usePreview();
  return (person: string, context?: OfferTerms) => {
    const next = act({ type: "open-thread", actor, with: person, context });
    if (!next) return;
    const me = member(next, actor);
    const t = threadBetween(
      next,
      me.side === "venue" ? actor : person,
      me.side === "venue" ? person : actor,
    )!;
    go(`chat/${t.id}`);
  };
}

// A big photo card: who they are, whether they're free, and what they cost.
function TalentCard({
  t,
  when,
  family,
  role,
}: {
  t: Member;
  when: When;
  family: string;
  role?: string;
}) {
  const { data, actor, go } = usePreview();
  const message = useMessage();
  const days = whenDays(when);
  const where = standing(data, t.id, days);
  const fitting =
    role && t.roles.includes(role)
      ? role
      : t.roles.find((r) => FAMILIES[family].roles.includes(r)) || role || FAMILIES[family].roles[0];
  return (
    <article className="pv-talent-card">
      <button
        className="pv-talent-card-photo"
        onClick={() => go(`talent/${t.id}`)}
        aria-label={`View ${t.name}’s profile`}
      >
        <Photo src={t.photo} alt={t.name} />
        <span className={`pv-talent-status is-${where}`}>
          <span className="pv-dot" />
          {days.length ? standingLabel(data, t.id, days) : "Choose a time"}
        </span>
        {workedWith(data, actor, t.id) && (
          <span className="pv-talent-flag">Worked with you</span>
        )}
        <span className="pv-talent-card-name">
          <strong>{t.name}</strong>
          <small>
            {t.roles.join(" · ")} · {areaOf(t)}
          </small>
        </span>
      </button>
      <div className="pv-talent-card-body">
        <p className="pv-talent-card-pay">
          {t.minRate ? (
            <>
              <strong>£{t.minRate}</strong> / hour minimum
            </>
          ) : (
            "Minimum pay not set"
          )}
        </p>
        {allSkills(t).length > 0 && (
          <p className="pv-talent-card-skills">{allSkills(t).slice(0, 3).join(" · ")}</p>
        )}
        <div className="pv-talent-card-actions">
          <Button
            onClick={() =>
              message(
                t.id,
                days.length
                  ? { family, role: fitting, dates: when.dates, start: when.start, end: when.end }
                  : undefined,
              )
            }
          >
            Message
          </Button>
          <Button variant="secondary" onClick={() => go(`talent/${t.id}`)}>
            Profile
          </Button>
        </div>
      </div>
    </article>
  );
}

// Book → a team: everyone vetted, the people who fit and are free first.
export function TeamList({ family, initial }: { family: string; initial: When }) {
  const { data, actor, go } = usePreview();
  const [when, setWhen] = useState(initial);
  const [role, setRole] = useState<string | undefined>();
  if (!FAMILIES[family])
    return (
      <Empty title="Team not found">
        <Button onClick={() => go("home")}>Back to Book</Button>
      </Empty>
    );
  const days = whenDays(when);
  const { free, unavailable, others } = rankTalent(data, actor, family, role, days);
  const people = [...free, ...unavailable, ...others];
  return (
    <>
      <Heading
        title={family}
        description={`${free.length} free then`}
        back="home"
      />
      <DateTimeBar
        value={when}
        onChange={(next) => {
          setWhen(next);
          // Keep the address in step without reloading the list.
          if (next.dates.length)
            history.replaceState(null, "", `#/venue/${actor}/${whenPath(family, next)}`);
        }}
      />
      <div className="pv-chips pv-team-roles" role="group" aria-label="Position">
        <button className={!role ? "selected" : ""} aria-pressed={!role} onClick={() => setRole(undefined)}>
          Any position
        </button>
        {FAMILIES[family].roles.map((r) => (
          <button key={r} className={role === r ? "selected" : ""} aria-pressed={role === r} onClick={() => setRole(r)}>
            {r}
          </button>
        ))}
      </div>
      <div className="pv-talent-grid">
        {people.map((t) => (
          <TalentCard key={t.id} t={t} when={when} family={family} role={role} />
        ))}
      </div>
    </>
  );
}

// The detached sidebar action: choose a team, then the job post form.
export function JobPostStart() {
  const { me, go } = usePreview();
  return (
    <>
      <Heading title="Create a job post" back="home" />
      <div className="pv-team-tiles">
        {Object.entries(FAMILIES)
          .sort(
            ([a], [b]) =>
              Number(me?.venue?.teamsNeeded.includes(b)) -
              Number(me?.venue?.teamsNeeded.includes(a)),
          )
          .map(([name, f]) => (
            <button key={name} className="pv-team-tile" onClick={() => go(`new/${name}`)}>
              <Photo src={f.photo} />
              <span>
                <strong>{name}</strong>
                <small>{f.roles.slice(0, 4).join(" · ")}{f.roles.length > 4 ? " …" : ""}</small>
              </span>
              <ArrowRightIcon />
            </button>
          ))}
      </div>
    </>
  );
}

const STATUS: Record<Offer["status"], string> = {
  sent: "Waiting for an answer",
  accepted: "Booked",
  declined: "Declined",
  changes: "Changes asked",
  replaced: "Replaced by a newer version",
};
export function OfferCard({ offer, mine }: { offer: Offer; mine: boolean }) {
  const { data, actor, side, act, go } = usePreview();
  const [changes, setChanges] = useState(false);
  const [note, setNote] = useState("");
  const days = offerDays(offer);
  const hours = hoursOf(days[0]);
  const t = (data.threads ?? []).find((t) => t.id === offer.thread)!;
  const venue = member(data, t.venue);
  return (
    <div className={`pv-offer ${mine ? "from-me" : ""} is-${offer.status}`}>
      <div className="pv-offer-head">
        <small>Booking request · {venue.name}</small>
        <Badge good={offer.status === "accepted"}>{STATUS[offer.status]}</Badge>
      </div>
      <h3>{offer.role}</h3>
      <dl>
        <div>
          <dt>When</dt>
          <dd>
            {datesLabel(offer.dates)} · {offer.start}–{offer.end}
            {days.length > 1 && <small>{days.length} days · same hours</small>}
          </dd>
        </div>
        <div>
          <dt>Pay</dt>
          <dd>
            £{offer.rate}/hour
            <small>
              About £{Math.round(offer.rate * hours * days.length)} in all · {hours * days.length} hours
            </small>
          </dd>
        </div>
        <div>
          <dt>Where</dt>
          <dd>{areaOf(venue)}</dd>
        </div>
        {offer.note && (
          <div>
            <dt>Note</dt>
            <dd>{offer.note}</dd>
          </div>
        )}
      </dl>
      {offer.status === "changes" && offer.reply && (
        <p className="pv-response-note">“{offer.reply}”</p>
      )}
      {side === "talent" && offer.status === "sent" && !changes && (
        <div className="pv-actions">
          <Button
            onClick={() =>
              act(
                { type: "answer-offer", actor, offer: offer.id, answer: "accept" },
                `You’re booked at ${venue.name}.`,
              )
            }
          >
            Accept and book
          </Button>
          <Button variant="secondary" onClick={() => setChanges(true)}>
            Ask for changes
          </Button>
          <Button
            variant="quiet"
            onClick={() =>
              act(
                { type: "answer-offer", actor, offer: offer.id, answer: "decline" },
                "Declined. The venue has been told.",
              )
            }
          >
            Decline
          </Button>
        </div>
      )}
      {changes && (
        <div className="pv-offer-changes">
          <Field label="What would work for you?">
            <textarea
              rows={2}
              value={note}
              placeholder="e.g. I can do Fri and Sat, 18:00–23:00 at £18/h"
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <div className="pv-actions">
            <Button
              onClick={() => {
                if (
                  act(
                    { type: "answer-offer", actor, offer: offer.id, answer: "changes", note },
                    "Sent. The venue can now send a revised booking.",
                  )
                )
                  setChanges(false);
              }}
            >
              Send
            </Button>
            <Button variant="quiet" onClick={() => setChanges(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {offer.status === "accepted" && offer.booking && (
        <button className="pv-text-link" onClick={() => go(`booking/${offer.booking}`)}>
          View booking
        </button>
      )}
    </div>
  );
}

// The venue writes the booking card: position, dates, hours, pay and note.
export function OfferForm({
  thread,
  onClose,
}: {
  thread: string;
  onClose: () => void;
}) {
  const { data, actor, me, act } = usePreview();
  const t = (data.threads ?? []).find((t) => t.id === thread)!;
  const talent = member(data, t.talent);
  const last = (data.offers ?? []).filter((o) => o.thread === thread).at(-1);
  const reuse = last && last.status !== "accepted" ? last : undefined;
  const start: OfferTerms = reuse ||
    t.context || {
      family:
        Object.keys(FAMILIES).find((f) =>
          talent.roles.some((r) => FAMILIES[f].roles.includes(r)),
        ) || "Kitchen",
      role: "",
      ...savedWhen(data.now),
    };
  const family = start.family;
  const [form, setForm] = useState({
    ...start,
    role:
      start.role ||
      talent.roles.find((r) => FAMILIES[family].roles.includes(r)) ||
      FAMILIES[family].roles[0],
    rate: reuse ? reuse.rate : Math.max(defaultRate(me!, family), talent.minRate || 0),
    note: reuse ? reuse.note : defaultNote(me!),
  });
  const set = (patch: Partial<typeof form>) => setForm({ ...form, ...patch });
  const revising = last && ["sent", "changes"].includes(last.status);
  const days = whenDays(form);
  return (
    <Modal
      title={revising ? `Revise the booking for ${firstName(talent)}` : `Book ${firstName(talent)}`}
      onClose={onClose}
    >
      {last?.status === "changes" && last.reply && (
        <p className="pv-response-note">“{last.reply}”</p>
      )}
      <h3>Team</h3>
      <div className="pv-chips">
        {Object.keys(FAMILIES).map((f) => (
          <button
            key={f}
            className={form.family === f ? "selected" : ""}
            aria-pressed={form.family === f}
            onClick={() =>
              set({
                family: f,
                role: talent.roles.find((r) => FAMILIES[f].roles.includes(r)) || FAMILIES[f].roles[0],
                rate: Math.max(defaultRate(me!, f), talent.minRate || 0),
              })
            }
          >
            {f}
          </button>
        ))}
      </div>
      <h3>Position</h3>
      <div className="pv-chips">
        {FAMILIES[form.family].roles.map((r) => (
          <button
            key={r}
            className={form.role === r ? "selected" : ""}
            aria-pressed={form.role === r}
            onClick={() => set({ role: r })}
          >
            {r}
          </button>
        ))}
      </div>
      <h3>Dates and hours</h3>
      <DateTimeBar
        value={form}
        onChange={(w) => set({ dates: w.dates, start: w.start, end: w.end })}
      />
      <Field
        label="Pay · £ per hour"
        hint={
          talent.minRate
            ? `${firstName(talent)}’s minimum is £${talent.minRate}/h.`
            : `${firstName(talent)} hasn’t set a minimum.`
        }
      >
        <input
          type="number"
          min="0.5"
          step="0.5"
          value={form.rate}
          onChange={(e) => set({ rate: Number(e.target.value) })}
        />
      </Field>
      {!!talent.minRate && form.rate < talent.minRate && (
        <p className="pv-warning">
          That’s below {firstName(talent)}’s minimum. They may ask for changes.
        </p>
      )}
      <Field label="Note">
        <textarea rows={2} value={form.note} onChange={(e) => set({ note: e.target.value })} />
      </Field>
      <Button
        disabled={!days.length}
        onClick={() => {
          const result = act(
            {
              type: "send-offer",
              actor,
              thread,
              offer: {
                family: form.family,
                role: form.role,
                dates: form.dates,
                start: form.start,
                end: form.end,
                rate: form.rate,
                note: form.note,
              },
            },
            `Sent to ${firstName(talent)}. Accepting books them.`,
          );
          if (result) onClose();
        }}
      >
        {revising ? "Send revised booking" : "Send booking request"}
        {days.length > 1 ? ` · ${days.length} days` : ""}
      </Button>
    </Modal>
  );
}
