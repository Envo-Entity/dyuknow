"use client";
import { useState } from "react";
import {
  FAMILIES,
  datePlus,
  londonDate,
  makeDays,
  firstName,
  openDates,
  datesLabel,
  joinNames,
  member,
  openAnswer,
  serviceLabel,
  similarShift,
  lastAsk,
  alreadyAsked,
  type Shift,
  type ShiftDraft,
} from "@/lib/preview/model";
import { CloseIcon } from "@/components/icons";
import { usePreview } from "./context";
import { ActionBar, Button, Heading, Photo } from "./ui";
import { DateTimeBar, savedWhen } from "./Booking";

// The one form for asking for cover. With people in `to` it sends them a
// booking request; with nobody it posts a job to everyone in the position.
// `from`: an earlier ask to start again from, e.g. after a decline.
export function ShiftComposer({
  family,
  to: initialTo = [],
  role,
  from,
  fromChat = false,
}: {
  family: string;
  to?: string[];
  role?: string;
  from?: Shift;
  fromChat?: boolean;
}) {
  const { data, actor, act, go, toast, back } = usePreview();
  const [editingNote, setEditingNote] = useState(false);
  const tomorrow = datePlus(londonDate(data.now), 1);
  const [draft, setDraft] = useState<ShiftDraft>(() => {
    const to = initialTo.filter((id) => data.members.some((m) => m.id === id && m.side === "talent"));
    // Start from what this venue asked for last time in this team: pay and
    // note carry over, so nothing needs setting up in advance.
    const last = lastAsk(data, actor, family);
    const anyLast = last || lastAsk(data, actor);
    if (from)
      return {
        roles: from.roles,
        family,
        date: from.days[0].date,
        count: 1,
        dates: from.days.map((d) => d.date),
        start: from.days[0].start,
        end: from.days[0].end,
        capacity: from.capacity,
        rate: from.rate,
        note: from.note,
        to,
      };
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
      rate: last?.rate || 0,
      note: anyLast?.note || "",
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
      validation = "That start time has passed.";
  } catch (e) {
    validation = (e as Error).message;
  }
  if (!validation && !draft.roles.length)
    validation = "Choose at least one position.";
  const request = draft.to.length > 0;
  const people = draft.to.map((id) => member(data, id));
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
  // Each one is explained on its own line below, with what to do about it.
  if (!validation && taken.length) validation = alreadyAsked(taken[0].p, taken[0].r!.status);
  async function send() {
    if (validation) return toast(validation);
    const one = people.length === 1 && draft.capacity === 1;
    const result = await act(
      { type: "post", actor, draft },
      request
        ? one
          ? `Sent. ${firstName(people[0])} is booked as soon as they accept.`
          : `Sent to ${joinNames(people.map(firstName))}. Book whoever says yes.`
        : "Job posted.",
    );
    if (!result) return;
    // From a chat, the new card in the thread is the confirmation.
    if (fromChat) back(`shift/${result.shifts[0].id}`);
    else go(`shift/${result.shifts[0].id}`);
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
              update({ dates: w.dates, start: w.start, end: w.end })
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
              {alreadyAsked(p, r!.status)}{" "}
              <button className="pv-text-link" onClick={() => go(`shift/${r!.shift}`)}>
                {r!.status === "can-cover" ? "Book" : "View"}
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
          {duplicate && request && openDates(data, duplicate).length > 0 ? (
            // An open shift for these hours still needs someone: send that one
            // instead of starting a second shift for the same place.
            <div className="pv-warning">
              <p>
                Your {duplicate.roles.join(" or ")}{" "}
                {duplicate.mode === "post" ? "job post" : "request"} for{" "}
                {datesLabel(openDates(data, duplicate))} still needs someone. Send it to{" "}
                {joinNames(people.map(firstName))} instead?
              </p>
              <div className="pv-actions">
                <Button
                  onClick={async () => {
                    const ok = await act(
                      { type: "invite", actor, shift: duplicate.id, talents: draft.to },
                      `Sent to ${joinNames(people.map(firstName))}.`,
                    );
                    if (ok) go(`shift/${duplicate.id}`);
                  }}
                >
                  Send that job to {joinNames(people.map(firstName))}
                </Button>
              </div>
            </div>
          ) : duplicate && (
            <p className="pv-warning">
              You already have a {duplicate.mode === "post" ? "job post" : "request"} for{" "}
              {duplicate.roles.join(" or ")} then.{" "}
              <button
                className="pv-text-link"
                onClick={() => go(`shift/${duplicate.id}`)}
              >
                View
              </button>
            </p>
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
                placeholder="0"
                value={draft.rate || ""}
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
            Below the minimum for {joinNames(people.filter((p) => (p.minRate || 0) > draft.rate).map((p) => `${firstName(p)} (£${p.minRate}/h)`))}.
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
      {validation && draft.roles.length > 0 && !taken.length && (
        <p className="pv-error" role="alert">
          {validation}
        </p>
      )}
      <ActionBar>
        <Button disabled={!!validation} onClick={send}>
          {request
            ? `Send booking request to ${people.length > 2 ? `${people.length} people` : joinNames(people.map(firstName))}`
            : "Post job"}
        </Button>
      </ActionBar>
    </>
  );
}
