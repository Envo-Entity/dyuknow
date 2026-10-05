"use client";
// Finding people by team and time, and choosing who to send a booking
// request to.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeftIcon, ArrowRightIcon } from "@/components/icons";
import {
  FAMILIES,
  MAX_DAYS,
  allSkills,
  areaOf,
  datePlus,
  datesLabel,
  datesSummary,
  daysFor,
  displayDate,
  firstName,
  joinNames,
  londonDate,
  member,
  openAnswer,
  rankTalent,
  standing,
  standingLabel,
  threadBetween,
  workedWith,
  type Member,
  type Service,
} from "@/lib/preview/model";
import { replaceRoute } from "@/lib/preview/store";
import { usePreview } from "./context";
import { ActionBar, Button, Empty, Heading, InviteToggle, Photo } from "./ui";

export type When = { dates: string[]; start: string; end: string };
const WHEN_KEY = "pv-when-v2";
const MAX_DATES = MAX_DAYS;
// How far ahead the date tiles go: four two-week pages, eight weeks.
const WINDOWS_AHEAD = 4;
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
    return daysFor(w);
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
export function WindowNav({
  label,
  prev,
  next,
  onClear,
}: {
  label: string;
  prev?: () => void;
  next?: () => void;
  onClear?: () => void;
}) {
  return (
    <div className="pv-window-nav">
      <strong>{label}</strong>
      <span>
        {onClear && (
          <button className="pv-clear-dates" onClick={onClear}>
            Clear
          </button>
        )}
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

// The one date picker: two weeks of day tiles at a time, arrows to move,
// tap to choose any number of days, Clear to start again. Used to ask for
// cover, to set availability and during setup.
export function DatePicker({
  value,
  onChange,
  max,
  last,
  windows,
  note,
  tone,
  label = "Dates",
  size = "small",
}: {
  value: string[];
  onChange: (dates: string[]) => void;
  max?: number;
  // The latest date that can be chosen.
  last?: string;
  windows?: number;
  // A word under the day number, e.g. "Booked".
  note?: (date: string) => string | undefined;
  tone?: (date: string) => "free" | "not-free" | undefined;
  label?: string;
  // Large: big tiles with room for a full line about each day (Availability).
  size?: "small" | "large";
}) {
  const { data } = usePreview();
  const today = londonDate(data.now);
  const w = useWindow(today, value[0] || today, windows);
  const full = !!max && value.length >= max;
  return (
    <div className="pv-date-picker">
      <WindowNav {...w} onClear={value.length ? () => onChange([]) : undefined} />
      {size === "large" ? (
        <div className="pv-date-grid" role="group" aria-label={label}>
          {w.dates.map((d) => {
            const on = value.includes(d);
            return (
              <button
                key={d}
                aria-pressed={on}
                className={`${on ? "selected" : ""} ${tone?.(d) || ""}`}
                disabled={(!on && full) || (!!last && d > last)}
                onClick={() => onChange(on ? value.filter((x) => x !== d) : [...value, d].sort())}
              >
                <span>{displayDate(d).slice(0, 3)}</span>
                <strong>{Number(d.slice(-2))}</strong>
                <small>{note?.(d)}</small>
              </button>
            );
          })}
        </div>
      ) : (
      <div className="pv-date-picks" role="group" aria-label={label}>
        {w.dates.map((d, i) => {
          const on = value.includes(d);
          const words = note?.(d);
          return (
            <button
              key={d}
              aria-pressed={on}
              className={`${on ? "selected" : ""} ${tone?.(d) ? `is-${tone(d)}` : ""}`}
              style={{ "--i": i } as React.CSSProperties}
              disabled={(!on && full) || (!!last && d > last)}
              onClick={() => onChange(on ? value.filter((x) => x !== d) : [...value, d].sort())}
            >
              <small>{d === today ? "Today" : displayDate(d).split(" ")[0]}</small>
              <strong>{Number(d.slice(-2))}</strong>
              {words && <em>{words}</em>}
            </button>
          );
        })}
      </div>
      )}
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
// Dates and hours: two weeks of day tiles (any of them, up to 14), then
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
  const [open, setOpen] = useState(!collapsible);
  // Once fully open, the time wheels may drop below the panel.
  const [settled, setSettled] = useState(false);
  const set = (patch: Partial<When>) => {
    const next = { ...value, ...patch };
    if (next.dates.length) saveWhen(next);
    onChange(next);
  };
  const full = value.dates.length >= MAX_DATES;
  const days = whenDays(value);
  const preset = PRESETS.find(([, start, end]) => value.start === start && value.end === end)?.[0];
  const glance = datesSummary(value.dates);
  const summary = !value.dates.length
    ? "Choose a date"
    : !days.length
      ? "Choose different start and end times"
      : `${datesLabel(value.dates)} · ${value.start}–${value.end}${full ? ` · up to ${MAX_DATES} dates` : ""}`;
  const body = (
    <>
      <div className="pv-when-days">
        <DatePicker value={value.dates} max={MAX_DATES} onChange={(dates) => set({ dates })} />
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
        <span className="pv-when-dates">
          <small>When</small>
          <strong>{value.dates.length ? glance.main : "Choose a date"}</strong>
          {glance.sub && <small className="pv-when-sub">{glance.sub}</small>}
        </span>
        <span className="pv-when-time">
          <small>{preset || "Hours"}</small>
          <strong>
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

// Opens (or reuses) the one conversation with this person.
export function useMessage() {
  const { actor, act, go } = usePreview();
  return (person: string) => {
    const next = act({ type: "open-thread", actor, with: person });
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
// The team a booking request starts from: the one this person works in.
export function familyOf(t: Member, fallback = "Kitchen") {
  return (
    Object.keys(FAMILIES).find((f) => t.roles.some((r) => FAMILIES[f].roles.includes(r))) ||
    fallback
  );
}
// Large card on a team list: free or not for the chosen time, and pay. Tick
// people to send them one booking request.
function TalentCard({
  t,
  when,
  picked,
  onPick,
}: {
  t: Member;
  when: When;
  picked: boolean;
  onPick: (picked: boolean) => void;
}) {
  const { data, actor, go } = usePreview();
  const message = useMessage();
  const days = whenDays(when);
  // Already answering one of this venue's asks for these hours: go there
  // instead of sending a second one.
  const open = days.length ? openAnswer(data, actor, t.id, days) : undefined;
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
        {open ? (
          <Button onClick={() => go(`shift/${open.shift}`)}>
            {open.status === "booked"
              ? "Booked with you"
              : open.status === "invited"
                ? "Request sent · View"
                : "Said yes · Book"}
          </Button>
        ) : (
          <label className={`pv-pick-person ${picked ? "is-picked" : ""}`}>
            <InviteToggle name={t.name} checked={picked} onChange={onPick} />
            <span>{picked ? "Added" : "Add to request"}</span>
          </label>
        )}
        <Button variant="secondary" onClick={() => message(t.id)}>
          Message
        </Button>
      </div>
    </ProfileCard>
  );
}

// Book → a team: everyone, the people who fit and are free first. Tick who
// to ask, then send them one booking request.
export function TeamList({ family, initial }: { family: string; initial: When }) {
  const { data, actor, go } = usePreview();
  const [when, setWhen] = useState(initial);
  const [role, setRole] = useState<string | undefined>();
  const [picked, setPicked] = useState<string[]>([]);
  if (!FAMILIES[family])
    return (
      <Empty title="Team not found">
        <Button onClick={() => go("home")}>Back to Book</Button>
      </Empty>
    );
  const days = whenDays(when);
  const { free, unavailable, others } = rankTalent(data, actor, family, role, days);
  const card = (t: Member) => (
    <TalentCard
      key={t.id}
      t={t}
      when={when}
      picked={picked.includes(t.id)}
      onPick={(on) => setPicked(on ? [...picked, t.id] : picked.filter((id) => id !== t.id))}
    />
  );
  const names = picked.map((id) => firstName(member(data, id)));
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
      {picked.length > 0 && (
        <ActionBar>
          <p className="pv-bar-note">They say yes, then you choose who to book.</p>
          <Button onClick={() => go(`new/${family}/${picked.join(",")}${role ? `/${role}` : ""}`)}>
            Send booking request to {picked.length > 2 ? `${picked.length} people` : joinNames(names)}
          </Button>
        </ActionBar>
      )}
    </>
  );
}

// The team bento: Book and Post a job both start by choosing a team.
// The teams this venue usually needs come first.
export function TeamMosaic({
  caption,
  onPick,
}: {
  caption: (team: Member[]) => string;
  onPick: (team: string) => void;
}) {
  const { data, me } = usePreview();
  return (
    <div className="pv-role-mosaic">
      {Object.entries(FAMILIES)
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
          return (
            <button key={name} className={`pv-role pv-role-${i}`} onClick={() => onPick(name)}>
              <Photo src={family.photo} />
              <div>
                <h2>{name}</h2>
                <span className="pv-role-count">
                  {caption(team)} <ArrowRightIcon size={18} />
                </span>
              </div>
            </button>
          );
        })}
    </div>
  );
}
// Post a job: choose a team, then the same form a booking request uses.
export function JobPostStart() {
  const { go } = usePreview();
  return (
    <>
      <Heading title="Post a job" back="home" />
      <TeamMosaic
        caption={(team) =>
          team.length ? `Texts ${team.length} ${team.length === 1 ? "person" : "people"}` : "Nobody in this team yet"
        }
        onPick={(name) => go(`new/${name}`)}
      />
    </>
  );
}
