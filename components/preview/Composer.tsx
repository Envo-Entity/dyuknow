"use client";
import { useState } from "react";
import {
  FAMILIES,
  datePlus,
  londonDate,
  makeDays,
  isFree,
  conflict,
  serviceLabel,
  type ShiftDraft,
} from "@/lib/preview/model";
import { usePreview } from "./context";
import { Badge, Button, Empty, Field, Heading, Photo } from "./ui";
export function ShiftComposer({
  family,
  resumeInvite = false,
}: {
  family?: string;
  resumeInvite?: boolean;
}) {
  const { data, actor, me, act, go, toast } = usePreview();
  const [step, setStep] = useState(
    resumeInvite ? 4 : data.draft?.repeatTalent ? 2 : 1,
  );
  const [draft, setDraft] = useState<ShiftDraft>(() => ({
    roles: [],
    family: family || "Kitchen",
    date: datePlus(londonDate(data.now), 1),
    count: 1,
    start: "17:00",
    end: "23:00",
    capacity: 1,
    rate: me!.rate,
    note: me!.note,
    mode: "post",
    invitees: [],
    ...data.draft,
    ...(family && family !== data.draft?.family ? { family, roles: [] } : {}),
  }));
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
      validation = "This starts in the past. Choose a future time.";
  } catch (e) {
    validation = (e as Error).message;
  }
  const eligible = data.members.filter(
    (m) =>
      m.side === "talent" &&
      m.approved &&
      m.roles.some((r) => draft.roles.includes(r)),
  );
  const sorted = [...eligible].sort(
    (a, b) =>
      Number(me!.previous.includes(b.id)) -
        Number(me!.previous.includes(a.id)) ||
      Number(isFree(data, b.id, days)) - Number(isFree(data, a.id, days)) ||
      a.name.localeCompare(b.name),
  );
  function next() {
    if (step === 1 && !draft.roles.length)
      return toast("Choose at least one position.");
    if (step === 2 && validation) return toast(validation);
    setStep(step + 1);
  }
  function send() {
    const result = act(
      { type: "post", actor, draft },
      draft.mode === "post"
        ? "Shift sent. Your members have been notified."
        : "Invitations sent. Talent can now accept and book.",
    );
    if (result) go(`shift/${result.shifts[0].id}`);
  }
  return (
    <>
      <Heading
        title={
          draft.editing
            ? "Edit and resend"
            : draft.replacement
              ? "Find replacement cover"
              : draft.repeatTalent
                ? "Invite a familiar face again."
                : "Make service happen."
        }
        description="Who, when, and the terms. One connected request from here to the booking."
        back="home"
      />
      <div className="pv-composer">
        <aside className="pv-composer-art">
          <Photo src={FAMILIES[draft.family]?.photo} />
          <div>
            <h2>{draft.family}</h2>
            <p>
              {draft.roles.join(" or ") ||
                "Choose the positions you would take"}
            </p>
          </div>
        </aside>
        <div className="pv-composer-form">
          <div className="pv-steps" aria-label="Progress">
            {[
              "Which role",
              "When",
              "Review",
              ...(step === 4 ? ["Invite"] : []),
            ].map((s, i) => (
              <button
                key={s}
                disabled={i + 1 > step}
                onClick={() => setStep(i + 1)}
                aria-current={step === i + 1 ? "step" : undefined}
              >
                <span>{i + 1}</span>
                {s}
              </button>
            ))}
          </div>
          {step === 1 && (
            <>
              <h2>Who would you take?</h2>
              <p>
                Choose every grade that works for this service. Alerts reach
                everyone in these roles.
              </p>
              <Field label="Team">
                <select
                  value={draft.family}
                  onChange={(e) =>
                    update({ family: e.target.value, roles: [], invitees: [] })
                  }
                >
                  {Object.keys(FAMILIES).map((f) => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
              </Field>
              <div className="pv-chips pv-position-chips">
                {FAMILIES[draft.family].roles.map((role) => (
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
                    <span>
                      {
                        data.members.filter(
                          (m) =>
                            m.approved &&
                            m.side === "talent" &&
                            m.roles.includes(role),
                        ).length
                      }
                    </span>
                  </button>
                ))}
              </div>
              <Button onClick={next}>Continue to dates</Button>
            </>
          )}
          {step === 2 && (
            <>
              <h2>When do you need cover?</h2>
              <div className="pv-chips">
                {[0, 1].map((i) => (
                  <button
                    key={i}
                    className={
                      draft.date === datePlus(londonDate(data.now), i)
                        ? "selected"
                        : ""
                    }
                    onClick={() =>
                      update({ date: datePlus(londonDate(data.now), i) })
                    }
                  >
                    {i ? "Tomorrow" : "Today"}
                  </button>
                ))}
              </div>
              <div className="pv-form-grid">
                <Field label="First date">
                  <input
                    type="date"
                    min={londonDate(data.now)}
                    value={draft.date}
                    onChange={(e) => update({ date: e.target.value })}
                  />
                </Field>
                <Field label="Consecutive days">
                  <select
                    value={draft.count}
                    onChange={(e) => update({ count: Number(e.target.value) })}
                  >
                    {Array.from({ length: 7 }, (_, i) => (
                      <option key={i} value={i + 1}>
                        {i + 1} {i ? "days" : "day"}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Start time">
                  <input
                    type="time"
                    value={draft.start}
                    onChange={(e) => update({ start: e.target.value })}
                  />
                </Field>
                <Field label="End time">
                  <input
                    type="time"
                    value={draft.end}
                    onChange={(e) => update({ end: e.target.value })}
                  />
                </Field>
                <Field label="People needed">
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={draft.capacity}
                    onChange={(e) =>
                      update({ capacity: Number(e.target.value) })
                    }
                  />
                </Field>
              </div>
              {validation ? (
                <p className="pv-error" role="alert">
                  {validation}
                </p>
              ) : (
                <div className="pv-services">
                  {days.map((d) => (
                    <p key={d.date}>{serviceLabel(d)}</p>
                  ))}
                  <small>
                    Europe/London ·{" "}
                    {draft.count > 1
                      ? `Same hours each day. Each person covers all ${draft.count} days.`
                      : "End times before the start mean the next day."}
                  </small>
                </div>
              )}
              <Button disabled={!!validation} onClick={next}>
                Review shift
              </Button>
            </>
          )}
          {step === 3 && (
            <>
              <h2>Your shift, as talent sees it</h2>
              <h3>
                {draft.roles.join(" or ")} · {me!.name}
              </h3>
              <div className="pv-services">
                {days.map((d) => (
                  <p key={d.date}>{serviceLabel(d)}</p>
                ))}
                <small>
                  {draft.capacity} {draft.capacity === 1 ? "person" : "people"}{" "}
                  · London time
                </small>
              </div>
              <Field label="Pay · £ per hour">
                <input
                  type="number"
                  min="0.01"
                  step="0.5"
                  value={draft.rate}
                  onChange={(e) => update({ rate: Number(e.target.value) })}
                />
              </Field>
              {draft.rate < 12.71 && (
                <p className="pv-error">
                  This rate is below the £12.71 benchmark stated in the MVP
                  brief. Check the rate before sending.
                </p>
              )}
              <p className="pv-caption">
                Payment is arranged directly with the venue. Dyuknow records the
                agreed hourly rate.
              </p>
              <Field label="Note and preparation">
                <textarea
                  rows={3}
                  value={draft.note}
                  onChange={(e) => update({ note: e.target.value })}
                />
              </Field>
              <div className="pv-services">
                <p>{me!.address}</p>
                <p>
                  {me!.contact} · {me!.phone}
                </p>
                <small>Full arrival details are shared once booked.</small>
              </div>
              <div className="pv-reach">
                <strong>
                  {eligible.length
                    ? `${eligible.length} ${eligible.length === 1 ? "member" : "members"} in your chosen roles`
                    : `No ${draft.roles.join(" or ")} members yet`}
                </strong>
                <p>
                  {eligible.length
                    ? `${eligible.filter((m) => isFree(data, m.id, days)).length} marked themselves free for every date. Everyone in the roles is alerted.`
                    : "You can still send. The owner will be alerted to help find someone for you."}
                </p>
              </div>
              <Button
                disabled={!!validation || !(draft.rate > 0)}
                onClick={() => {
                  const value = {
                    ...draft,
                    mode: draft.repeatTalent
                      ? ("invite" as const)
                      : ("post" as const),
                  };
                  setDraft(value);
                  const result = act(
                    { type: "post", actor, draft: value },
                    draft.repeatTalent
                      ? "Personal invitation sent."
                      : "Shift sent. Your members have been notified.",
                  );
                  if (result) go(`shift/${result.shifts[0].id}`);
                }}
              >
                {draft.repeatTalent
                  ? `Send invite to ${data.members.find((m) => m.id === draft.repeatTalent)?.name.split(" ")[0]}`
                  : eligible.length
                    ? `Send to all ${eligible.length}`
                    : "Ask the owner for cover"}
              </Button>
              <Button
                variant="secondary"
                disabled={!eligible.length || !!validation}
                onClick={() => {
                  update({ mode: "invite" });
                  setStep(4);
                }}
              >
                Choose who to invite
              </Button>
              <p className="pv-caption">
                Role, dates, hours and pay freeze when sent. To change them
                later, use Edit and resend.
              </p>
            </>
          )}
          {step === 4 && (
            <>
              <h2>Your people, then free talent</h2>
              <p>
                Invite people in the selected roles. Availability not set is
                shown honestly; a confirmed conflict blocks an invitation.
              </p>
              {sorted.length ? (
                <div className="pv-candidates">
                  {sorted.map((t) => {
                    const clash = conflict(data, t.id, days);
                    return (
                      <div className="pv-candidate" key={t.id}>
                        <Photo src={t.photo} />
                        <div>
                          <button
                            className="pv-name-link"
                            onClick={() => {
                              act({ type: "save-draft", actor, draft });
                              go(`talent/${t.id}`);
                            }}
                          >
                            {t.name}
                          </button>
                          <p>{t.roles.join(" · ")}</p>
                          <small>{t.skills.slice(0, 3).join(" · ")}</small>
                          <Badge good={!clash && isFree(data, t.id, days)}>
                            {clash
                              ? "Booked then"
                              : me!.previous.includes(t.id)
                                ? "Your people"
                                : isFree(data, t.id, days)
                                  ? "Free for every date"
                                  : "Availability not set"}
                          </Badge>
                        </div>
                        <input
                          type="checkbox"
                          aria-label={`Invite ${t.name}`}
                          checked={draft.invitees.includes(t.id)}
                          disabled={!!clash}
                          onChange={() =>
                            update({
                              invitees: draft.invitees.includes(t.id)
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
                  title="No matching members"
                  text="Return to review and ask the owner to find cover."
                />
              )}
              {draft.invitees.length > draft.capacity && (
                <p className="pv-callout">
                  First{" "}
                  {draft.capacity === 1
                    ? "to accept is"
                    : `${draft.capacity} to accept are`}{" "}
                  booked. Others will be told it’s filled. Sending an invite is
                  your agreement to these terms.
                </p>
              )}
              <Button disabled={!draft.invitees.length} onClick={send}>
                Send{" "}
                {draft.invitees.length > 1
                  ? `${draft.invitees.length} invites`
                  : "invite"}
              </Button>
              <Button variant="secondary" onClick={() => setStep(3)}>
                Back to review
              </Button>
            </>
          )}
          <button
            className="pv-text-link"
            onClick={() => {
              act(
                { type: "save-draft", actor, draft },
                "Draft saved. Continue it from Book.",
              );
              go("home");
            }}
          >
            Save and finish later
          </button>
        </div>
      </div>
    </>
  );
}
