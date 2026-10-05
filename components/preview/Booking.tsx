"use client";
// Finding vetted people by team and time, and booking them from a
// conversation with a booking card.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/icons";
import {
  FAMILIES,
  allSkills,
  areaOf,
  datePlus,
  datesLabel,
  defaultNote,
  defaultRate,
  displayDate,
  firstName,
  hoursOf,
  londonDate,
  member,
  offerDays,
  rankTalent,
  serviceLabel,
  shiftLabel,
  clockLabel,
  standing,
  standingLabel,
  threadBetween,
  workedWith,
  type Member,
  type Offer,
  type OfferTerms,
  type Service,
} from "@/lib/preview/model";
import { replaceRoute } from "@/lib/preview/store";
import { usePreview } from "./context";
import { Badge, Button, Empty, Field, Heading, Modal, Photo } from "./ui";

export type When = { dates: string[]; start: string; end: string };
const WHEN_KEY = "pv-when-v2";
const MAX_DATES = 7;
// How far ahead the date tiles go: six two-week pages, about three months.
const WINDOWS_AHEAD = 6;
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

export function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`pv-chevron ${open ? "is-open" : ""}`}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

// Two weeks at a time, with arrows to the next two.
const WINDOW = 14;
export function useWindow(today: string, start = today, windows = WINDOWS_AHEAD) {
  const first = Math.max(
    0,
    Math.floor(
      (Date.parse(`${start}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) /
        (86400000 * WINDOW),
    ),
  );
  const [page, setPage] = useState(Math.min(first, windows - 1));
  const from = datePlus(today, page * WINDOW);
  const dates = Array.from({ length: WINDOW }, (_, i) => datePlus(from, i));
  return {
    dates,
    label: `${displayDate(dates[0]).replace(/ [A-Za-z]+$/, "")} – ${displayDate(dates[WINDOW - 1])}`,
    prev: page > 0 ? () => setPage(page - 1) : undefined,
    next: page < windows - 1 ? () => setPage(page + 1) : undefined,
  };
}
export function WindowNav({ label, prev, next }: { label: string; prev?: () => void; next?: () => void }) {
  return (
    <div className="pv-window-nav">
      <strong>{label}</strong>
      <span>
        <button className="pv-square-button" aria-label="Previous two weeks" disabled={!prev} onClick={prev}>
          <ArrowLeftIcon size={18} />
        </button>
        <button className="pv-square-button" aria-label="Next two weeks" disabled={!next} onClick={next}>
          <ArrowRightIcon size={18} />
        </button>
      </span>
    </div>
  );
}

// One scroll-snapping column of an iOS-style wheel.
const ROW = 40;
function Wheel({
  items,
  value,
  onChange,
  label,
}: {
  items: string[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const current = useRef(value);
  useEffect(() => {
    current.current = value;
  }, [value]);
  // Start on the chosen value.
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = Math.max(0, items.indexOf(value)) * ROW;
    // Only on open: later changes come from the wheel itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const to = (i: number) =>
    ref.current?.scrollTo({ top: Math.min(Math.max(i, 0), items.length - 1) * ROW, behavior: "smooth" });
  return (
    <div
      className="pv-wheel"
      ref={ref}
      role="listbox"
      aria-label={label}
      tabIndex={0}
      onScroll={() => {
        clearTimeout(settle.current);
        settle.current = setTimeout(() => {
          const i = Math.min(Math.max(Math.round((ref.current?.scrollTop || 0) / ROW), 0), items.length - 1);
          if (items[i] !== current.current) onChange(items[i]);
        }, 90);
      }}
      onKeyDown={(e) => {
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
        e.preventDefault();
        to(items.indexOf(current.current) + (e.key === "ArrowDown" ? 1 : -1));
      }}
    >
      <span className="pv-wheel-pad" />
      {items.map((item, i) => (
        <span
          key={item}
          role="option"
          aria-selected={item === value}
          className={`pv-wheel-item ${item === value ? "selected" : ""}`}
          onClick={() => to(i)}
        >
          {item}
        </span>
      ))}
      <span className="pv-wheel-pad" />
    </div>
  );
}
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
export function TimeSelect({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const away = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", away);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", away);
    };
  }, [open]);
  const [h, m] = value.split(":");
  // Keeps an odd saved minute (e.g. 23:59) on the wheel.
  const minutes = MINUTES.includes(m) ? MINUTES : [...MINUTES, m].sort();
  return (
    <div className="pv-time-select" ref={ref}>
      <button
        type="button"
        className="pv-time-field"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`${label}: ${value}`}
        onClick={() => setOpen(!open)}
      >
        <small>{label}</small>
        <strong>{value}</strong>
        <Chevron open={open} />
      </button>
      {open && (
        <div className="pv-time-menu" role="dialog" aria-label={label}>
          <div className="pv-wheels">
            <span className="pv-wheel-band" aria-hidden="true" />
            <Wheel label={`${label} hour`} items={HOURS} value={h} onChange={(x) => onChange(`${x}:${m}`)} />
            <span className="pv-wheel-colon" aria-hidden="true">:</span>
            <Wheel label={`${label} minutes`} items={minutes} value={m} onChange={(x) => onChange(`${h}:${x}`)} />
          </div>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </div>
      )}
    </div>
  );
}

const PRESETS: [string, string, string][] = [
  ["Lunch", "11:00", "16:00"],
  ["Dinner", "17:00", "23:00"],
  ["Late", "22:00", "02:00"],
];
// Dates and hours: two weeks of day tiles (any of them, up to seven), then
// the hours. On Book it folds to its summary line and grows open in place.
export function DateTimeBar({
  value,
  onChange,
  label,
  collapsible = false,
}: {
  value: When;
  onChange: (value: When) => void;
  label?: string;
  collapsible?: boolean;
}) {
  const { data } = usePreview();
  const [open, setOpen] = useState(!collapsible);
  // Once fully open, the time wheels may drop below the panel.
  const [settled, setSettled] = useState(false);
  const today = londonDate(data.now);
  const w = useWindow(today, value.dates[0] || today);
  const set = (patch: Partial<When>) => {
    const next = { ...value, ...patch };
    if (next.dates.length) saveWhen(next);
    onChange(next);
  };
  const full = value.dates.length >= MAX_DATES;
  const days = whenDays(value);
  const preset = PRESETS.find(([, start, end]) => value.start === start && value.end === end)?.[0];
  const summary = !value.dates.length
    ? "Choose a date"
    : !days.length
      ? "Choose different start and end times"
      : `${datesLabel(value.dates)} · ${value.start}–${value.end}${full ? " · up to 7 dates" : ""}`;
  const body = (
    <>
      <WindowNav {...w} />
      <div className="pv-date-picks pv-when-days" role="group" aria-label="Dates">
        {w.dates.map((d, i) => {
          const on = value.dates.includes(d);
          return (
            <button
              key={d}
              aria-pressed={on}
              className={on ? "selected" : ""}
              style={{ "--i": i } as React.CSSProperties}
              disabled={!on && full}
              onClick={() =>
                set({ dates: on ? value.dates.filter((x) => x !== d) : [...value.dates, d].sort() })
              }
            >
              <small>{d === today ? "Today" : displayDate(d).split(" ")[0]}</small>
              <strong>{Number(d.slice(-2))}</strong>
            </button>
          );
        })}
      </div>
      <div className="pv-when-hours">
        <div className="pv-presets" role="group" aria-label="Service">
          {PRESETS.map(([name, start, end]) => {
            const on = value.start === start && value.end === end;
            return (
              <button key={name} aria-pressed={on} className={on ? "selected" : ""} onClick={() => set({ start, end })}>
                {name}
                <small>
                  {start}–{end}
                </small>
              </button>
            );
          })}
        </div>
        <div className="pv-time-pair">
          <TimeSelect label="From" value={value.start} onChange={(start) => set({ start })} />
          <TimeSelect label="To" value={value.end} onChange={(end) => set({ end })} />
        </div>
      </div>
    </>
  );
  if (!collapsible)
    return (
      <div className="pv-when">
        {label && <h2 className="pv-when-label">{label}</h2>}
        {body}
        <p className="pv-when-summary">{summary}</p>
      </div>
    );
  return (
    <div className={`pv-when pv-when-fold ${open ? "is-open" : ""} ${open && settled ? "is-settled" : ""}`}>
      <button
        className="pv-when-head"
        aria-expanded={open}
        disabled={open && !days.length}
        onClick={() => {
          setSettled(false);
          setOpen(!open);
        }}
      >
        <span>
          <small>When</small>
          <strong>{value.dates.length ? datesLabel(value.dates) : "Choose a date"}</strong>
        </span>
        <span>
          <small>Hours</small>
          <strong>
            {preset ? `${preset} · ` : ""}
            {value.start}–{value.end}
          </strong>
        </span>
        <span className="pv-when-change">
          <span className="pv-when-change-label" key={open ? "done" : "change"}>
            {open ? "Done" : "Change"}
          </span>
          <Chevron open={open} />
        </span>
      </button>
      {/* Grows from nothing to its natural height; hidden content is inert. */}
      <div
        className="pv-when-body"
        inert={!open}
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget && open) setSettled(true);
        }}
      >
        <div className="pv-when-inner">{body}</div>
      </div>
    </div>
  );
}

// Opens (or reuses) the conversation with this person, carrying what the
// venue is looking for so the booking card starts filled in.
export function useMessage() {
  const { actor, act, go } = usePreview();
  return (person: string, context?: OfferTerms, shift?: string) => {
    const next = act({ type: "open-thread", actor, with: person, context, shift });
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

// The one profile card. Large on a team list; medium where people are a
// supporting list (who a shift was sent to). The photo opens the profile.
export function ProfileCard({
  person,
  size = "large",
  status,
  free = false,
  children,
}: {
  person: Member;
  size?: "large" | "medium";
  status?: string;
  free?: boolean;
  children?: ReactNode;
}) {
  const { data, actor, go } = usePreview();
  return (
    <article className={`pv-talent-card is-${size}`}>
      <button className="pv-talent-card-photo" onClick={() => go(`${person.side}/${person.id}`)}>
        <Photo src={person.photo} alt={person.name} />
        {status && (
          <span className={`pv-talent-status ${free ? "is-free" : ""}`}>
            <span className="pv-dot" />
            {status}
          </span>
        )}
        {size === "large" && person.side === "talent" && workedWith(data, actor, person.id) && (
          <span className="pv-talent-flag">Worked with you</span>
        )}
        <span className="pv-talent-card-name">
          <strong>{person.name}</strong>
          <small>
            {person.roles.length ? `${person.roles.join(" · ")} · ` : ""}
            {areaOf(person)}
          </small>
        </span>
      </button>
      {children && <div className="pv-talent-card-body">{children}</div>}
    </article>
  );
}
// Large card on a team list: free or not for the chosen time, and pay.
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
  const { data } = usePreview();
  const message = useMessage();
  const days = whenDays(when);
  const fitting =
    role && t.roles.includes(role)
      ? role
      : t.roles.find((r) => FAMILIES[family].roles.includes(r)) || role || FAMILIES[family].roles[0];
  return (
    <ProfileCard
      person={t}
      status={days.length ? standingLabel(data, t.id, days) : "Choose a time"}
      free={standing(data, t.id, days) === "free"}
    >
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
          Message {firstName(t)}
        </Button>
      </div>
    </ProfileCard>
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
  const card = (t: Member) => (
    <TalentCard key={t.id} t={t} when={when} family={family} role={role} />
  );
  return (
    <>
      <Heading
        title={family}
        description={`${free.length} free then`}
        back="home"
      />
      <DateTimeBar
        collapsible
        value={when}
        onChange={(next) => {
          setWhen(next);
          // Keep the address in step without reloading the list.
          if (next.dates.length)
            replaceRoute(`/venue/${actor}/${whenPath(family, next)}`);
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
      <div className="pv-talent-grid">{[...free, ...unavailable].map(card)}</div>
      {others.length > 0 && (
        <>
          <hr className="pv-team-divider" />
          <div className="pv-talent-grid">{others.map(card)}</div>
        </>
      )}
      <button className="pv-team-post" onClick={() => go(`new/${family}`)}>
        <span>
          <strong>Nobody right?</strong>
          <small>Post a job to everyone in {role || family}</small>
        </span>
        <ArrowRightIcon />
      </button>
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
  const [confirm, setConfirm] = useState(false);
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
          <Button onClick={() => setConfirm(true)}>Accept and book</Button>
          <Button variant="secondary" onClick={() => setChanges(true)}>
            Ask for changes
          </Button>
          <Button
            variant="quiet"
            onClick={() =>
              act(
                { type: "answer-offer", actor, offer: offer.id, answer: "decline" },
                `Declined. ${venue.name} has been told.`,
                { undo: true },
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
      {confirm && (
        <Modal title="Accept and book?" onClose={() => setConfirm(false)}>
          <div className="pv-confirm-person">
            <Photo src={venue.photo} alt={venue.name} />
            <span>
              <strong>{venue.name}</strong>
              <small>
                {offer.role} · £{offer.rate}/h
              </small>
            </span>
          </div>
          <div className="pv-services">
            {days.map((d) => (
              <p key={d.date}>{serviceLabel(d)}</p>
            ))}
          </div>
          <p>
            About £{Math.round(offer.rate * hours * days.length)} for {hours * days.length} hours.
          </p>
          <Button
            onClick={() => {
              const next = act(
                { type: "answer-offer", actor, offer: offer.id, answer: "accept" },
                `You’re booked at ${venue.name}.`,
              );
              if (!next) return;
              setConfirm(false);
              const booked = (next.offers ?? []).find((o) => o.id === offer.id)?.booking;
              if (booked) go(`booking/${booked}`);
            }}
          >
            Accept and book
          </Button>
          <Button variant="quiet" onClick={() => setConfirm(false)}>
            Not yet
          </Button>
        </Modal>
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

// The job post a conversation started from: what the person was sent.
export function JobPostCard({ shift, mine, time }: { shift: string; mine: boolean; time: string }) {
  const { data, side, go } = usePreview();
  const s = data.shifts.find((x) => x.id === shift);
  if (!s) return null;
  const venue = member(data, s.venue);
  const hours = hoursOf(s.days[0]);
  return (
    <div className={`pv-offer pv-job-card ${mine ? "from-me" : ""}`}>
      <div className="pv-offer-head">
        <small>
          Job post · {side === "venue" ? "texted" : `from ${venue.name}`} {clockLabel(time)}
        </small>
        <Badge>{s.status === "open" ? "Open" : s.status === "filled" ? "Filled" : "Closed"}</Badge>
      </div>
      <h3>{shiftLabel(s)}</h3>
      <dl>
        <div>
          <dt>When</dt>
          <dd>
            {datesLabel(s.days.map((d) => d.date))} · {s.days[0].start}–{s.days[0].end}
          </dd>
        </div>
        <div>
          <dt>Pay</dt>
          <dd>
            £{s.rate}/hour
            <small>
              About £{Math.round(s.rate * hours * s.days.length)} in all
            </small>
          </dd>
        </div>
        {s.note && (
          <div>
            <dt>Note</dt>
            <dd>{s.note}</dd>
          </div>
        )}
      </dl>
      <button className="pv-text-link" onClick={() => go(`shift/${s.id}`)}>
        View job post
      </button>
    </div>
  );
}
