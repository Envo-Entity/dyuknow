"use client";
import { useState } from "react";
import {
  FAMILIES,
  datePlus,
  londonDate,
  makeDays,
  firstName,
  joinNames,
  member,
  openAnswer,
  serviceLabel,
  similarShift,
  defaultRate,
  defaultNote,
  type Shift,
  type ShiftDraft,
} from "@/lib/preview/model";
import { CloseIcon } from "@/components/icons";
import { usePreview } from "./context";
import { ActionBar, Button, Heading, Photo } from "./ui";
import { DateTimeBar, savedWhen } from "./Booking";

// The one form for asking for cover. With people in `to` it sends them a
// booking request; with nobody it posts a job to everyone in the position.
// Either way they say yes and the venue books.
export function ShiftComposer({
  family,
  to: initialTo = [],
  role,
}: {
  family: string;
  to?: string[];
  role?: string;
}) {
  const { data, actor, me, act, go, toast } = usePreview();
  const [editingNote, setEditingNote] = useState(false);
  const tomorrow = datePlus(londonDate(data.now), 1);
  const [draft, setDraft] = useState<ShiftDraft>(() => {
    const to = initialTo.filter((id) => data.members.some((m) => m.id === id && m.side === "talent"));
    // Start from what this venue asked for last time in this team.
    const last = data.shifts.find(
      (s) => s.venue === actor && s.family === family,
    ) as Shift | undefined;
    // The positions the chosen people work in this team.
    const theirs = [
      ...new Set(
        to.flatMap((id) =>
          member(data, id).roles.filter((r) => FAMILIES[family].roles.includes(r)),
        ),
      ),
    ];
    const when = savedWhen(data.now);
    return {
      roles:
        role && FAMILIES[family].roles.includes(role)
          ? [role]
          : theirs.length
            ? theirs
            : last?.roles || [],
      family,
      date: when.dates[0] || tomorrow,
      count: 1,
      dates: when.dates.length ? when.dates : [tomorrow],
      start: when.start,
      end: when.end,
      capacity: 1,
      // Pre-filled from the venue profile; each request can change them.
      rate: defaultRate(me!, family),
      note: defaultNote(me!),
      to,
    };
  });
  const dates = draft.dates ?? [];
  const update = (patch: Partial<ShiftDraft>) => setDraft({ ...draft, ...patch });
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
  const request = draft.to.length > 0;
  const people = draft.to.map((id) => member(data, id));
  const alerted = data.members.filter(
    (m) =>
      m.side === "talent" &&
      m.approved &&
      m.roles.some((r) => draft.roles.includes(r)) &&
      (m.alert === "all" ||
        (m.alert === "soon" && !!days.length && days[0].date <= tomorrow)),
  );
  const duplicate =
    days.length && draft.roles.length
      ? similarShift(data, actor, draft.roles, days)
      : undefined;
  const lowest = Math.max(0, ...people.map((p) => p.minRate || 0));
  // People already answering one of this venue's asks for these hours.
  const taken = days.length
    ? people
        .map((p) => ({ p, r: openAnswer(data, actor, p.id, days) }))
        .filter((x) => x.r)
    : [];
  if (!validation && taken.length)
    validation = `${joinNames(taken.map((x) => firstName(x.p)))} already ${taken.length === 1 ? "has" : "have"} an answer with you for these hours.`;
  function send() {
    if (validation) return toast(validation);
    const result = act(
      { type: "post", actor, draft },
      request
        ? `Sent to ${joinNames(people.map(firstName))}. You’ll book once they say yes.`
        : alerted.length
          ? `Posted. ${alerted.length <= 3 ? joinNames(alerted.map(firstName)) : `${alerted.length} people`} ${alerted.length === 1 ? "has" : "have"} been texted.`
          : "Posted.",
    );
    if (result) go(`shift/${result.shifts[0].id}`);
  }
  return (
    <>
      <Heading
        title={request ? "Booking request" : `${family} job post`}
        back={request ? `team/${family}` : "post"}
      />
      <div className="pv-form-card">
        <div className="pv-form-row">
          <h3>To</h3>
          {request ? (
            <div className="pv-to-list">
              {people.map((p) => (
                <span key={p.id} className="pv-to-person">
                  <Photo src={p.photo} alt={p.name} />
                  {p.name}
                  <button
                    aria-label={`Remove ${p.name}`}
                    onClick={() => update({ to: draft.to.filter((id) => id !== p.id) })}
                  >
                    <CloseIcon size={14} />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="pv-muted">
              Everyone in {draft.roles.length ? draft.roles.join(" or ") : "the position you choose"}.
              {alerted.length ? ` Texts ${alerted.length} ${alerted.length === 1 ? "person" : "people"}.` : ""}
            </p>
          )}
        </div>
        <div className="pv-form-row">
          <h3>Position</h3>
          <div className="pv-chips pv-position-chips">
            {FAMILIES[family].roles.map((r) => {
              const count = data.members.filter(
                (m) => m.approved && m.side === "talent" && m.roles.includes(r),
              ).length;
              return (
                <button
                  key={r}
                  aria-pressed={draft.roles.includes(r)}
                  className={draft.roles.includes(r) ? "selected" : ""}
                  onClick={() =>
                    update({
                      roles: draft.roles.includes(r)
                        ? draft.roles.filter((x) => x !== r)
                        : [...draft.roles, r],
                    })
                  }
                >
                  {r}
                  {!request && <span>{count}</span>}
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
          {taken.map(({ p, r }) => (
            <p key={p.id} className="pv-warning">
              {firstName(p)}{" "}
              {r!.status === "booked"
                ? "is already booked with you"
                : r!.status === "invited"
                  ? "already has your booking request"
                  : "already said yes to your job"}{" "}
              for these hours.{" "}
              <button className="pv-text-link" onClick={() => go(`shift/${r!.shift}`)}>
                {r!.status === "can-cover" ? "Book from there" : "Open it"}
              </button>
              {" · "}
              <button
                className="pv-text-link"
                onClick={() => update({ to: draft.to.filter((id) => id !== p.id) })}
              >
                Remove
              </button>
            </p>
          ))}
          {duplicate && (
            <p className="pv-warning">
              You already have an open {duplicate.roles.join(" or ")} request at
              this time.{" "}
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
              <span>
                Same person for all days
                <small>Only people who can do every day can say yes.</small>
              </span>
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
        {request && draft.rate >= 12.71 && draft.rate < lowest && (
          <p className="pv-warning">
            Below the minimum of {joinNames(people.filter((p) => (p.minRate || 0) > draft.rate).map(firstName))}.
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
        <p className="pv-bar-note">They say yes, then you choose who to book.</p>
        <Button disabled={!!validation} onClick={send}>
          {request
            ? `Send booking request to ${people.length > 2 ? `${people.length} people` : joinNames(people.map(firstName))}`
            : "Post job"}
        </Button>
      </ActionBar>
    </>
  );
}
