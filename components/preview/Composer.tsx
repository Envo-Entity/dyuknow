"use client";
import { useState } from "react";
import {
  FAMILIES,
  availableDates,
  datePlus,
  londonDate,
  makeDays,
  isFree,
  firstName,
  joinNames,
  member,
  relativeDay,
  serviceLabel,
  similarShift,
  workedWith,
  defaultRate,
  defaultNote,
  allSkills,
  type Shift,
  type ShiftDraft,
  areaOf,
} from "@/lib/preview/model";
import { usePreview } from "./context";
import { ActionBar, Badge, Button, Empty, Heading, ProfilePhoto, ProfileName, InviteToggle } from "./ui";
import { draftFrom } from "./ShiftDetail";
import { DateTimeBar, savedWhen } from "./Booking";

export function ShiftComposer({
  family,
  resumeInvite = false,
  origin,
}: {
  family?: string;
  resumeInvite?: boolean;
  // "edit/<shift>", "again/<booking>" or "replace/<booking>".
  origin?: string;
}) {
  const { data, actor, me, act, go, toast } = usePreview();
  const [view, setView] = useState<"form" | "invite">(
    resumeInvite ? "invite" : "form",
  );
  const [editingNote, setEditingNote] = useState(false);
  const tomorrow = datePlus(londonDate(data.now), 1);
  const [draft, setDraft] = useState<ShiftDraft>(() => {
    const fam = family || data.draft?.family || "Kitchen";
    // Start from what this venue asked for last time in this team.
    const last = data.shifts.find(
      (s) => s.venue === actor && s.family === fam,
    ) as Shift | undefined;
    // The dates the venue already chose on Book.
    const chosen = savedWhen(data.now).dates;
    const base: ShiftDraft = {
      roles: last?.roles || [],
      family: fam,
      date: chosen[0] || tomorrow,
      count: 1,
      dates: chosen.length ? chosen : [tomorrow],
      start: last?.days[0].start || "17:00",
      end: last?.days[0].end || "23:00",
      capacity: 1,
      // Pre-filled from the venue profile; each shift can change them.
      rate: defaultRate(me!, fam),
      note: defaultNote(me!),
      mode: "post",
      invitees: [],
    };
    // An unsent draft from the same place picks up where it left off.
    if (data.draft && (data.draft.origin || "") === (origin || "") &&
      (origin || !family || family === data.draft.family))
      return { ...base, ...data.draft } as ShiftDraft;
    if (origin) {
      const [kind, id] = origin.split("/");
      const b = data.bookings.find((x) => x.id === id);
      const shift = data.shifts.find((x) => x.id === (kind === "edit" ? id : b?.shift));
      if (shift) {
        if (kind === "edit") return draftFrom(shift, data.now, { editing: id, origin });
        if (kind === "again" && b)
          return draftFrom(shift, data.now, {
            dates: [tomorrow],
            capacity: 1,
            mode: "invite",
            invitees: [b.talent],
            repeatTalent: b.talent,
            together: false,
            origin,
          });
        if (kind === "replace" && b)
          return draftFrom(
            shift,
            data.now,
            { capacity: 1, replacement: shift.id, origin },
            b.days,
          );
      }
    }
    return base;
  });
  const dates = draft.dates ?? (() => {
    try {
      return makeDays(draft).map((d) => d.date);
    } catch {
      return [];
    }
  })();
  // Drafts are saved only after a real change, so opening and backing out
  // never leaves a phantom "unsent" shift behind.
  function update(patch: Partial<ShiftDraft>) {
    const value = { ...draft, ...patch };
    setDraft(value);
    act({ type: "save-draft", actor, draft: value });
  }
  let days: ReturnType<typeof makeDays> = [];
  let validation = "";
  try {
    days = makeDays(draft);
    if (days[0].from <= data.now)
      validation = "That start time has passed. Choose a later time.";
  } catch (e) {
    validation = (e as Error).message;
  }
  if (!validation && !draft.roles.length)
    validation = "Choose at least one position.";
  const eligible = data.members.filter(
    (m) =>
      m.side === "talent" &&
      m.approved &&
      m.roles.some((r) => draft.roles.includes(r)),
  );
  const alerted = eligible.filter(
    (m) =>
      m.alert === "all" ||
      (m.alert === "soon" && !!days.length && days[0].date <= tomorrow),
  );
  const repeat = draft.repeatTalent
    ? member(data, draft.repeatTalent)
    : undefined;
  const duplicate =
    days.length && draft.roles.length && !draft.editing
      ? similarShift(data, actor, draft.roles, days)
      : undefined;
  const sorted = [...eligible].sort(
    (a, b) =>
      Number(workedWith(data, actor, b.id)) -
        Number(workedWith(data, actor, a.id)) ||
      Number(isFree(data, b.id, days)) - Number(isFree(data, a.id, days)) ||
      a.name.localeCompare(b.name),
  );
  // A stand-in shift so per-day availability can be checked before sending.
  const preview = {
    id: "draft",
    venue: actor,
    roles: draft.roles,
    family: draft.family,
    days,
    capacity: draft.capacity,
    rate: draft.rate,
    note: draft.note,
    mode: "invite",
    status: "open",
    created: data.now,
    ownerAlerted: false,
  } as Shift;
  function send(mode: "post" | "invite") {
    if (validation) return toast(validation);
    const value = { ...draft, mode };
    const result = act(
      { type: "post", actor, draft: value },
      mode === "invite"
        ? "Invite sent."
        : alerted.length
          ? `Sent. ${joinNames(alerted.map(firstName))} ${alerted.length === 1 ? "has" : "have"} been texted.`
          : "Sent. Dyuknow is on it.",
    );
    if (result) go(`shift/${result.shifts[0].id}`);
  }
  const title = draft.editing
    ? "Edit and resend"
    : draft.replacement
      ? "Find a replacement"
      : repeat
        ? `Book ${firstName(repeat)} again`
        : `${draft.family} cover`;
  if (view === "invite")
    return (
      <>
        <Heading
          title="Who would you like to invite?"
          description={`${draft.roles.join(" or ")} · ${days.length ? `${relativeDay(days[0].date, data.now)} · ${draft.start}–${draft.end}` : ""}`}
        />
        <button className="pv-text-link pv-back-link" onClick={() => setView("form")}>
          ← Back to the shift
        </button>
        {sorted.length ? (
          <div className="pv-pick-list">
            {sorted.map((t) => {
              const free = availableDates(data, t.id, preview);
              const blocked = !free.length;
              const picked = draft.invitees.includes(t.id);
              return (
                <div
                  key={t.id}
                  className={`pv-pick ${picked ? "is-picked" : ""} ${blocked ? "is-blocked" : ""}`}
                >
                  <ProfilePhoto person={t} />
                  <span className="pv-pick-text">
                    <strong><ProfileName person={t} /></strong>
                    <small>
                      {t.roles.join(" · ")} · {areaOf(t)}
                    </small>
                    <span className="pv-pick-tags">
                      {workedWith(data, actor, t.id) && (
                        <Badge good>Worked with you</Badge>
                      )}
                      {blocked ? (
                        <Badge>Booked elsewhere then</Badge>
                      ) : isFree(data, t.id, days) ? (
                        <Badge good>Free then</Badge>
                      ) : free.length < days.length ? (
                        <Badge>
                          Free {free.length} of {days.length} days
                        </Badge>
                      ) : null}
                      {allSkills(t).slice(0, 3).map((s) => (
                        <Badge key={s}>{s}</Badge>
                      ))}
                    </span>
                    {t.bio && <span className="pv-bio-clamp">{t.bio}</span>}
                  </span>
                  <InviteToggle
                    name={t.name}
                    checked={picked}
                    disabled={blocked}
                    onChange={() =>
                      update({
                        invitees: picked
                          ? draft.invitees.filter((id) => id !== t.id)
                          : [...draft.invitees, t.id],
                      })
                    }
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <Empty
            title="No members in these roles yet"
          />
        )}
        <ActionBar>
          <p className="pv-bar-note">
            Accepting books them straight away.
            {draft.invitees.length > draft.capacity
              ? ` First ${draft.capacity === 1 ? "to accept is" : `${draft.capacity} to accept are`} booked.`
              : ""}
          </p>
          <Button
            disabled={!draft.invitees.length}
            onClick={() => send("invite")}
          >
            {draft.invitees.length === 1
              ? `Invite ${firstName(member(data, draft.invitees[0]))}`
              : draft.invitees.length
                ? `Invite ${draft.invitees.length} people`
                : "Choose who to invite"}
          </Button>
        </ActionBar>
      </>
    );
  return (
    <>
      <Heading title={title} back="home" />
      <div className="pv-form-card">
        <div className="pv-form-row">
          <h3>Who</h3>
          <div className="pv-chips pv-position-chips">
            {FAMILIES[draft.family].roles.map((role) => {
              const count = data.members.filter(
                (m) =>
                  m.approved && m.side === "talent" && m.roles.includes(role),
              ).length;
              return (
                <button
                  key={role}
                  aria-pressed={draft.roles.includes(role)}
                  className={draft.roles.includes(role) ? "selected" : ""}
                  onClick={() =>
                    update({
                      roles: draft.roles.includes(role)
                        ? draft.roles.filter((r) => r !== role)
                        : [...draft.roles, role],
                      invitees: [],
                    })
                  }
                >
                  {role}
                  <span>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="pv-form-row">
          <h3>When</h3>
          <DateTimeBar
            value={{ dates, start: draft.start, end: draft.end }}
            onChange={(w) =>
              update({
                dates: w.dates,
                start: w.start,
                end: w.end,
                together: w.dates.length > 1 && draft.together,
              })
            }
          />
          {!!days.length && (
            <div className="pv-day-list">
              {days.map((d) => (
                <p key={d.date}>{serviceLabel(d)}</p>
              ))}
              {days.length > 1 && <small>Same hours each day</small>}
            </div>
          )}
          {duplicate && (
            <p className="pv-warning">
              You already have an open {duplicate.roles.join(" or ")} shift at this
              time.{" "}
              <button
                className="pv-text-link"
                onClick={() => go(`shift/${duplicate.id}`)}
              >
                View it
              </button>
            </p>
          )}
          {days.length > 1 && (
            <label className="pv-toggle-row">
              <input
                type="checkbox"
                checked={!!draft.together}
                onChange={(e) => update({ together: e.target.checked })}
              />
              <span>Each person must cover every day</span>
            </label>
          )}
        </div>
        <div className="pv-form-row pv-form-split">
          <label>
            <h3>Pay</h3>
            <span className="pv-money">
              £
              <input
                type="number"
                min="0.5"
                step="0.5"
                aria-label="Pay per hour in pounds"
                value={draft.rate}
                onChange={(e) => update({ rate: Number(e.target.value) })}
              />
              <small>/ hour</small>
            </span>
          </label>
          <div>
            <h3>{days.length > 1 ? "People needed each day" : "People needed"}</h3>
            <span className="pv-stepper">
              <button
                aria-label="One fewer person"
                disabled={draft.capacity <= 1}
                onClick={() => update({ capacity: draft.capacity - 1 })}
              >
                −
              </button>
              <strong>{draft.capacity}</strong>
              <button
                aria-label="One more person"
                disabled={draft.capacity >= 5}
                onClick={() => update({ capacity: draft.capacity + 1 })}
              >
                +
              </button>
            </span>
          </div>
        </div>
        {draft.rate > 0 && draft.rate < 12.71 && (
          <p className="pv-warning">
            £{draft.rate}/h is below the National Living Wage (£12.71).
          </p>
        )}
        <div className="pv-form-row">
          <h3>
            Note{" "}
            {!editingNote && (
              <button
                className="pv-text-link"
                onClick={() => setEditingNote(true)}
              >
                Edit
              </button>
            )}
          </h3>
          {editingNote ? (
            <textarea
              className="pv-input"
              rows={3}
              aria-label="Note to talent"
              value={draft.note}
              onChange={(e) => update({ note: e.target.value })}
            />
          ) : (
            <p className="pv-muted">{draft.note || "No note"}</p>
          )}
        </div>
      </div>
      {validation && draft.roles.length > 0 && (
        <p className="pv-error" role="alert">
          {validation}
        </p>
      )}
      <ActionBar>
        {repeat ? (
          <Button
            disabled={!!validation}
            onClick={() => {
              const result = act(
                {
                  type: "post",
                  actor,
                  draft: { ...draft, mode: "invite", invitees: [repeat.id] },
                },
                `Invite sent. Accepting books ${firstName(repeat)}.`,
              );
              if (result) go(`shift/${result.shifts[0].id}`);
            }}
          >
            Invite {firstName(repeat)}
          </Button>
        ) : null}
        {repeat ? (
          <p className="pv-bar-note">
            Accepting books {firstName(repeat)} straight away.
          </p>
        ) : (
          <div className="pv-choices">
            <button
              className="pv-choice is-primary"
              disabled={!!validation}
              onClick={() => send("post")}
            >
              <strong>
                {alerted.length || !draft.roles.length
                  ? "Post shift"
                  : "Ask Dyuknow to find someone"}
              </strong>
              <small>
                {!draft.roles.length
                  ? "Choose a position first"
                  : alerted.length
                    ? `Texts ${alerted.length <= 3 ? joinNames(alerted.map(firstName)) : `${alerted.length} people`}`
                    : "No one has this role yet."}
              </small>
            </button>
            {eligible.length > 0 && (
              <button
                className="pv-choice"
                disabled={!!validation}
                onClick={() => setView("invite")}
              >
                <strong>Invite specific people</strong>
                <small>You choose who. Accepting books them straight away.</small>
              </button>
            )}
          </div>
        )}
      </ActionBar>
    </>
  );
}
