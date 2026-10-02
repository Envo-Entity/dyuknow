"use client";
import { useState } from "react";
import {
  FAMILIES,
  bookedCount,
  bookingPast,
  conflict,
  member,
  responseLabel,
  shiftLabel,
  datePlus,
  type Shift,
  type ShiftDraft,
  type Response,
} from "@/lib/preview/model";
import { usePreview } from "./context";
import {
  Badge,
  Button,
  Empty,
  Field,
  Heading,
  Modal,
  Photo,
  Services,
} from "./ui";
export function draftFrom(
  shift: Shift,
  now: string,
  extra: Partial<ShiftDraft> = {},
): ShiftDraft {
  const future = shift.days.filter((d) => d.from > now);
  return {
    roles: shift.roles,
    family: shift.family,
    date: future[0]?.date || datePlus(now.slice(0, 10), 1),
    count: future.length || shift.days.length,
    start: shift.days[0].start,
    end: shift.days[0].end,
    capacity: shift.capacity,
    rate: shift.rate,
    note: shift.note,
    mode: "post",
    invitees: [],
    ...extra,
  };
}
export function ShiftDetail({ id }: { id: string }) {
  const { data, actor, side, me, act, go } = usePreview();
  const s = data.shifts.find((s) => s.id === id);
  const [modal, setModal] = useState<"respond" | "accept" | "close" | null>(
    null,
  );
  const [bookTalent, setBookTalent] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("Cover is no longer needed");
  const [canArrive, setCanArrive] = useState(false);
  const [editNote, setEditNote] = useState(false);
  const [preparation, setPreparation] = useState("");
  const [invite, setInvite] = useState(false);
  const [invitees, setInvitees] = useState<string[]>([]);
  if (!s)
    return (
      <Empty
        title="Shift not found"
        text="This link may belong to an earlier preview. Return to your current shifts."
      >
        <Button onClick={() => go("home")}>Go home</Button>
      </Empty>
    );
  const venue = member(data, s.venue);
  const mine = side === "venue" && actor === s.venue;
  const r = data.responses.find((r) => r.shift === id && r.talent === actor);
  const responses = data.responses.filter((r) => r.shift === id);
  const clash =
    side === "talent" ? conflict(data, actor, s.days, s.id) : undefined;
  const eligible = me?.roles.some((role) => s.roles.includes(role));
  const b = data.bookings.find(
    (b) => b.shift === id && b.talent === actor && !b.cancelled,
  );
  const cancelledBooking = data.bookings.find(
    (b) => b.shift === id && b.talent === actor && b.cancelled,
  );
  function confirmResponse() {
    const result = act(
      {
        type: modal === "accept" ? "accept" : "respond",
        actor,
        shift: id,
        note,
      },
      modal === "accept"
        ? "Booking confirmed. You’re on the service."
        : `Sent to ${venue.name}. You’re not booked yet.`,
    );
    if (result) {
      setModal(null);
      if (modal === "accept") go(`booking/${result.bookings[0].id}`);
    }
  }
  function edit() {
    if (bookedCount(data, id)) return;
    act({
      type: "save-draft",
      actor,
      draft: draftFrom(s!, data.now, { editing: id }),
    });
    go("new");
  }
  function chat(response: Response) {
    if (act({ type: "open-chat", actor, response: response.id }))
      go(`chat/${response.id}`);
  }
  return (
    <>
      <Heading
        title={shiftLabel(s)}
        description={`${venue.name} · ${venue.area} · London`}
        back={side === "venue" ? "bookings" : "home"}
      >
        <Badge good={s.status === "filled"}>
          {s.status === "open"
            ? `${bookedCount(data, id)} of ${s.capacity} booked`
            : s.status}
        </Badge>
      </Heading>
      <div className="pv-detail-layout">
        <aside>
          <Photo src={FAMILIES[s.family].photo} className="pv-detail-photo" />
          <button
            className="pv-venue-stamp"
            onClick={() => go(`venue/${venue.id}`)}
          >
            <Photo src={venue.photo} />
            <span>
              <strong>{venue.name}</strong>
              <small>{venue.area} · View the room</small>
            </span>
          </button>
        </aside>
        <div className="pv-detail-main">
          <Services shift={s} />
          <div className="pv-rate">
            <strong>
              £{s.rate}
              <span> / hour</span>
            </strong>
            <p>Payment is arranged directly with the venue.</p>
          </div>
          <div className="pv-detail-note">
            <h2>The service</h2>
            <p>{s.note || "No specific preparation requested."}</p>
            <p>
              {s.capacity} {s.capacity === 1 ? "person" : "people"} needed
              {s.days.length > 1
                ? ` · Each person covers all ${s.days.length} days`
                : ""}
              .
            </p>
            {mine && (
              <Button
                variant="quiet"
                onClick={() => {
                  setPreparation(s.note);
                  setEditNote(true);
                }}
              >
                Edit preparation note
              </Button>
            )}
          </div>
          {s.replacement && (
            <p className="pv-callout">
              This replaces an earlier request. Review these dates and terms
              before committing.
            </p>
          )}
          {s.ownerAlerted && (
            <p className="pv-callout">
              The owner has been alerted to help find cover. This shift is still
              open until it fills or starts.
            </p>
          )}
          {mine && (
            <>
              <div className="pv-section-head">
                <h2>{s.mode === "post" ? "Responses" : "Invitations"}</h2>
                <Badge>
                  {bookedCount(data, id)} / {s.capacity} booked
                </Badge>
              </div>
              {!responses.length && (
                <Empty
                  title="Waiting for replies"
                  text={`Sent ${s.mode === "post" ? "to members in the selected roles" : "personally"}. New responses will appear here. For same-day cover, the owner is alerted if nobody responds in 30 minutes.`}
                />
              )}
              {responses.map((response) => (
                <div className="pv-candidate" key={response.id}>
                  <Photo src={member(data, response.talent).photo} />
                  <div>
                    <button
                      className="pv-name-link"
                      onClick={() => go(`talent/${response.talent}`)}
                    >
                      {member(data, response.talent).name}
                    </button>
                    <p>{member(data, response.talent).roles.join(" · ")}</p>
                    <Badge good={response.status === "booked"}>
                      {response.status === "can-cover"
                        ? "Can cover"
                        : responseLabel(response)}
                    </Badge>
                    {response.note && (
                      <p className="pv-response-note">“{response.note}”</p>
                    )}
                    <div className="pv-actions">
                      {response.status === "can-cover" &&
                        s.status === "open" && (
                          <Button
                            onClick={() => setBookTalent(response.talent)}
                          >
                            Book
                          </Button>
                        )}
                      {(response.chat || response.status === "can-cover") && (
                        <Button
                          variant="secondary"
                          onClick={() => chat(response)}
                        >
                          Message
                        </Button>
                      )}
                      {["booked", "cancelled"].includes(response.status) && (
                        <Button
                          variant="secondary"
                          onClick={() =>
                            go(
                              `booking/${data.bookings.find((b) => b.shift === id && b.talent === response.talent)?.id}`,
                            )
                          }
                        >
                          View booking
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {s.status === "open" && (
                <div className="pv-actions">
                  <Button
                    variant="secondary"
                    disabled={!!bookedCount(data, id)}
                    onClick={edit}
                  >
                    Edit and resend
                  </Button>
                  <Button variant="quiet" onClick={() => setModal("close")}>
                    Close unfilled places
                  </Button>
                  <Button variant="secondary" onClick={() => setInvite(true)}>
                    Invite specific people
                  </Button>
                </div>
              )}
              {!!bookedCount(data, id) && (
                <p className="pv-caption">
                  Booked terms stay fixed. Closing unfilled places doesn’t
                  cancel existing bookings.
                </p>
              )}
              <p className="pv-caption">
                Use Switch account to respond as talent. Replies are shared
                across this browser.
              </p>
            </>
          )}
          {side === "owner" && (
            <section>
              <h2>Responses and invitations</h2>
              {responses.length ? (
                responses.map((response) => (
                  <div className="pv-owner-row" key={response.id}>
                    <span>
                      {member(data, response.talent).name}
                      <small>{response.note}</small>
                    </span>
                    <Badge good={response.status === "booked"}>
                      {responseLabel(response)}
                    </Badge>
                  </div>
                ))
              ) : (
                <p>No replies yet.</p>
              )}
            </section>
          )}
          {side === "talent" && (
            <div className="pv-shift-decision">
              {b ? (
                <>
                  <Badge good>Booked</Badge>
                  <p>
                    You’re committed to the service. Your full arrival details
                    are ready.
                  </p>
                  <Button onClick={() => go(`booking/${b.id}`)}>
                    View your booking
                  </Button>
                </>
              ) : cancelledBooking ? (
                <>
                  <h2>This booking was cancelled</h2>
                  <p>{cancelledBooking.reason}</p>
                  <Button
                    variant="secondary"
                    onClick={() => go(`booking/${cancelledBooking.id}`)}
                  >
                    View cancelled booking
                  </Button>
                </>
              ) : r?.status === "can-cover" ? (
                <>
                  <h2>Waiting for {venue.name}</h2>
                  <p>
                    You’ve said you can cover. You are not booked until the
                    venue chooses you. No hours are reserved yet.
                  </p>
                  <div className="pv-actions">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        act(
                          { type: "withdraw", actor, shift: id },
                          "Response withdrawn. You were not booked.",
                        )
                      }
                    >
                      Withdraw response
                    </Button>
                    {r.chat && (
                      <Button onClick={() => chat(r)}>Message venue</Button>
                    )}
                  </div>
                </>
              ) : r?.status === "invited" && s.status === "open" ? (
                <>
                  <h2>{venue.name} invited you</h2>
                  <p>
                    Accepting confirms a booking. If there are more invitees
                    than places, the first to accept are booked.
                  </p>
                  {clash && (
                    <p className="pv-error">
                      You’re already booked for overlapping hours.
                    </p>
                  )}
                  <div className="pv-actions">
                    <Button
                      disabled={!!clash}
                      onClick={() => {
                        setCanArrive(false);
                        setModal("accept");
                      }}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        act(
                          { type: "decline", actor, shift: id },
                          "Invitation declined. The venue has been notified.",
                        )
                      }
                    >
                      Decline
                    </Button>
                    <Button variant="quiet" onClick={() => chat(r)}>
                      Message
                    </Button>
                  </div>
                </>
              ) : s.status !== "open" ||
                (r && ["not-selected", "lapsed"].includes(r.status)) ? (
                <>
                  <h2>
                    {s.status === "filled"
                      ? "This shift has been filled"
                      : s.status === "expired"
                        ? "This shift has started"
                        : r?.status === "lapsed"
                          ? "No longer available"
                          : "This shift is closed"}
                  </h2>
                  <p>
                    {r?.status === "lapsed"
                      ? "Your overlapping booking or the shift start ended this response. You were not booked here."
                      : "There’s no active booking for you on this shift. Your earlier activity stays in history."}
                  </p>
                  <Button variant="secondary" onClick={() => go("home")}>
                    Find other shifts
                  </Button>
                  {r?.chat && (
                    <Button variant="quiet" onClick={() => chat(r)}>
                      View conversation
                    </Button>
                  )}
                </>
              ) : s.mode === "invite" ? (
                <Empty
                  title={
                    r?.status === "declined"
                      ? "Invitation declined"
                      : "Private invitation"
                  }
                  text="This invitation is no longer waiting for your answer."
                />
              ) : (
                <>
                  <p>
                    {r?.status === "withdrawn"
                      ? "You withdrew before booking. You can respond again while the shift remains open."
                      : "A response tells the venue you can cover. The venue will decide whom to book."}
                  </p>
                  {clash && (
                    <p className="pv-error">
                      You’re booked at{" "}
                      {
                        member(
                          data,
                          data.shifts.find((x) => x.id === clash.shift)!.venue,
                        ).name
                      }{" "}
                      then.
                    </p>
                  )}
                  {!eligible && (
                    <p className="pv-caption">
                      This shift is for {shiftLabel(s)}. It isn’t one of your
                      current roles.
                    </p>
                  )}
                  <Button
                    disabled={!!clash || !eligible}
                    onClick={() => {
                      setCanArrive(false);
                      setModal("respond");
                    }}
                  >
                    {s.days.length > 1
                      ? `I can cover all ${s.days.length} days`
                      : "I can cover this"}
                  </Button>
                </>
              )}
            </div>
          )}
          {side !== "venue" && (
            <div className="pv-services">
              <p>Work area: {venue.area}, London</p>
              <small>
                {b
                  ? venue.address
                  : "Full address and on-site contact are shared once booked."}
              </small>
            </div>
          )}
        </div>
      </div>
      {(modal === "respond" || modal === "accept") && (
        <Modal
          title={
            modal === "accept" ? "Accept and book" : "Confirm you can cover"
          }
          onClose={() => setModal(null)}
        >
          <h3>
            {venue.name} · £{s.rate}/h
          </h3>
          <Services shift={s} />
          <p>
            {modal === "accept"
              ? "Accepting books you for all the dates above. Both sides will be notified."
              : "You are saying you can cover the dates and terms above. You won’t be booked until the venue books you."}
          </p>
          <p>
            {venue.area}, London · {s.note}
          </p>
          <label className="pv-check">
            <input
              type="checkbox"
              checked={canArrive}
              onChange={(e) => setCanArrive(e.target.checked)}
            />{" "}
            I can travel to {venue.area} and work every listed service.
          </label>
          {modal === "respond" && (
            <Field label="Note to the venue · optional">
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Happy to cover; I know the section well."
              />
            </Field>
          )}
          <Button disabled={!canArrive} onClick={confirmResponse}>
            {modal === "accept" ? "Accept and book" : "Send my response"}
          </Button>
          <p className="pv-caption">
            This confirms availability for this request only. It doesn’t publish
            these hours on your profile.
          </p>
        </Modal>
      )}
      {bookTalent && (
        <Modal
          title={`Book ${member(data, bookTalent).name.split(" ")[0]}`}
          onClose={() => setBookTalent(null)}
        >
          <p>
            Book {member(data, bookTalent).name} for these dates at £{s.rate}
            /hour? They have already said they can cover. Your confirmation
            books them.
          </p>
          <Services shift={s} />
          <Button
            onClick={() => {
              const next = act(
                { type: "book", actor, shift: id, talent: bookTalent },
                "Booking confirmed. Both sides have been notified.",
              );
              if (next) {
                setBookTalent(null);
                go(`booking/${next.bookings[0].id}`);
              }
            }}
          >
            Book {member(data, bookTalent).name.split(" ")[0]}
          </Button>
        </Modal>
      )}
      {modal === "close" && (
        <Modal title="Close unfilled places" onClose={() => setModal(null)}>
          <p>
            New responses stop. Anyone waiting is notified. Existing bookings
            stay confirmed.
          </p>
          <Field label="Reason">
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option>Cover is no longer needed</option>
              <option>Plans changed</option>
              <option>Cover found elsewhere</option>
            </select>
          </Field>
          <Button
            onClick={() => {
              if (
                act(
                  { type: "close", actor, shift: id, reason },
                  "Shift closed. Waiting members have been notified.",
                )
              )
                setModal(null);
            }}
          >
            Close shift
          </Button>
        </Modal>
      )}
      {editNote && (
        <Modal title="Edit preparation note" onClose={() => setEditNote(false)}>
          <p>
            The preparation note can change freely. Dates, role, hours and pay
            stay as agreed.
          </p>
          <Field label="Note and preparation">
            <textarea
              rows={4}
              value={preparation}
              onChange={(e) => setPreparation(e.target.value)}
            />
          </Field>
          <Button
            onClick={() => {
              if (
                act(
                  { type: "edit-note", actor, shift: id, note: preparation },
                  "Preparation note saved.",
                )
              )
                setEditNote(false);
            }}
          >
            Save note
          </Button>
        </Modal>
      )}
      {invite && (
        <Modal title="Invite to this shift" onClose={() => setInvite(false)}>
          <p>
            The terms above stay the same. Sending an invitation is your yes;
            accepting is theirs.
          </p>
          <Services shift={s} />
          <div className="pv-candidates">
            {data.members
              .filter(
                (t) =>
                  t.side === "talent" &&
                  t.approved &&
                  t.roles.some((role) => s.roles.includes(role)),
              )
              .map((t) => {
                const existing = responses.find(
                  (r) =>
                    r.talent === t.id &&
                    ["invited", "can-cover", "booked"].includes(r.status),
                );
                const blocked = !!conflict(data, t.id, s.days);
                return (
                  <label key={t.id} className="pv-candidate">
                    <Photo src={t.photo} />
                    <div>
                      <h2>{t.name}</h2>
                      <p>{t.roles.join(" · ")}</p>
                      <small>
                        {existing
                          ? responseLabel(existing)
                          : blocked
                            ? "Booked then"
                            : "Can be invited"}
                      </small>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!!existing || blocked}
                      checked={invitees.includes(t.id)}
                      onChange={(e) =>
                        setInvitees(
                          e.target.checked
                            ? [...invitees, t.id]
                            : invitees.filter((i) => i !== t.id),
                        )
                      }
                    />
                  </label>
                );
              })}
          </div>
          <p className="pv-callout">
            First to accept takes a remaining place. Others are told when it
            fills.
          </p>
          <Button
            disabled={!invitees.length}
            onClick={() => {
              if (
                act(
                  { type: "invite", actor, shift: id, talents: invitees },
                  "Invitations sent for this same shift.",
                )
              )
                setInvite(false);
            }}
          >
            Send invites
          </Button>
        </Modal>
      )}
    </>
  );
}
export function BookingDetail({ id }: { id: string }) {
  const { data, actor, side, act, go } = usePreview();
  const b = data.bookings.find((b) => b.id === id);
  const [cancel, setCancel] = useState(false);
  const [reason, setReason] = useState("");
  const [extra, setExtra] = useState("");
  const [issue, setIssue] = useState(false);
  const [report, setReport] = useState("");
  if (!b)
    return (
      <Empty
        title="Booking not found"
        text="Open a booking from your current schedule."
      />
    );
  const s = data.shifts.find((s) => s.id === b.shift)!;
  const v = member(data, s.venue);
  const t = member(data, b.talent);
  const r = data.responses.find(
    (r) => r.shift === s.id && r.talent === b.talent,
  )!;
  if (side !== "owner" && ![s.venue, b.talent].includes(actor))
    return (
      <Empty
        title="This booking is private"
        text="Switch to the venue or talent involved to view the booking."
      />
    );
  const past = bookingPast(data, b);
  const started = s.days[0].from <= data.now;
  const future = s.days.filter((d) => d.from > data.now);
  function again(mode: "replacement" | "again") {
    const draft = draftFrom(
      s,
      data.now,
      mode === "replacement"
        ? { capacity: 1, replacement: s.id }
        : {
            date: datePlus(data.now.slice(0, 10), 1),
            count: s.days.length,
            capacity: 1,
            mode: "invite",
            invitees: [t.id],
            repeatTalent: t.id,
          },
    );
    act({ type: "save-draft", actor, draft });
    go("new");
  }
  function calendar() {
    const stamp = (d: string) => d.replace(/[-:]/g, "").replace(/\.\d+/, "");
    const esc = (text: string) =>
      text
        .replace(/\\/g, "\\\\")
        .replace(/\n/g, "\\n")
        .replace(/,/g, "\\,")
        .replace(/;/g, "\\;");
    const content = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Dyuknow//MVP Preview//EN",
      ...s.days.map((d, i) =>
        [
          "BEGIN:VEVENT",
          `UID:${b!.id}-${i}@dyuknow.preview`,
          `DTSTAMP:${stamp(data.now)}`,
          `DTSTART:${stamp(d.from)}`,
          `DTEND:${stamp(d.to)}`,
          `SUMMARY:${esc(`${shiftLabel(s)} at ${v.name}`)}`,
          `LOCATION:${esc(s.address || v.address)}`,
          `DESCRIPTION:${esc(`£${s.rate}/hour. ${s.note}. Preview booking.`)}`,
          "END:VEVENT",
        ].join("\r\n"),
      ),
      "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/calendar" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `dyuknow-${v.id}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <Heading
        title={
          b.cancelled
            ? "Booking cancelled"
            : past
              ? "A service to remember."
              : "You’re booked."
        }
        description={`${v.name} × ${t.name}`}
        back="bookings"
      >
        <Badge good={!b.cancelled}>
          {b.cancelled
            ? "Cancelled"
            : past
              ? "Past"
              : started
                ? "In progress"
                : "Booking confirmed"}
        </Badge>
      </Heading>
      <div className="pv-detail-layout">
        <aside>
          <Photo
            src={side === "talent" ? v.photo : t.photo}
            className="pv-detail-photo"
          />
          <p className="pv-caption">
            The same agreed booking is visible to both sides.
          </p>
        </aside>
        <div className="pv-detail-main">
          <h2>{shiftLabel(s)}</h2>
          <Services shift={s} />
          <div className="pv-rate">
            <strong>
              £{s.rate}
              <span> / hour</span>
            </strong>
            <p>Payment directly with {v.name}.</p>
          </div>
          {b.cancelled && (
            <div className="pv-callout">
              <h3>Cancelled by {member(data, b.by!).name}</h3>
              <p>{b.reason}</p>
              <p>
                {started
                  ? "Completed services stay in history. The cancellation affects remaining services."
                  : "All dates in this booking are cancelled."}
              </p>
            </div>
          )}
          <div className="pv-arrival">
            <h2>Ready for service</h2>
            <dl>
              <div>
                <dt>Venue</dt>
                <dd>{v.name}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{s.address || v.address}</dd>
              </div>
              <div>
                <dt>On-site contact</dt>
                <dd>
                  {s.contact || v.contact} · {s.phone || v.phone}
                </dd>
              </div>
              <div>
                <dt>Talent contact</dt>
                <dd>
                  {t.name} · {t.phone}
                </dd>
              </div>
              <div>
                <dt>Preparation</dt>
                <dd>{s.note}</dd>
              </div>
            </dl>
            <p className="pv-caption">
              Contact numbers and addresses are sample preview details.
            </p>
          </div>
          {side !== "owner" && (
            <div className="pv-actions">
              <Button onClick={() => go(`chat/${r.id}`)}>
                Message {side === "talent" ? v.name : t.name.split(" ")[0]}
              </Button>
              {!b.cancelled && (
                <Button variant="secondary" onClick={calendar}>
                  Add to calendar
                </Button>
              )}
              <a
                className="pv-button pv-secondary"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.address || v.address)}`}
                target="_blank"
                rel="noreferrer"
              >
                Directions
              </a>
            </div>
          )}
          {side === "venue" &&
            ((b.cancelled && !!future.length) ||
              (b.outcomes[actor] && b.outcomes[actor] !== "Yes, worked")) && (
              <div className="pv-actions">
                <Button onClick={() => again("replacement")}>
                  Find a replacement
                </Button>
                <p className="pv-caption">
                  Review the dates before sending. A replacement is a new
                  request; the original booking and private report stay in
                  history.
                </p>
              </div>
            )}
          {b.cancelled && side === "talent" && (
            <>
              <p>
                Your cancelled hours aren’t automatically published as free.
                Update availability when you’re ready.
              </p>
              <Button variant="secondary" onClick={() => go("availability")}>
                Reopen my availability
              </Button>
            </>
          )}
          {past && !b.cancelled && side !== "owner" && (
            <div className="pv-outcome">
              <h2>Did the booking take place?</h2>
              <p>
                {b.outcomes[actor]
                  ? `Your private report: ${b.outcomes[actor]}`
                  : "Outcome not reported. Only the owner sees your answer."}
              </p>
              <div className="pv-actions">
                <Button
                  variant="secondary"
                  onClick={() =>
                    act(
                      {
                        type: "outcome",
                        actor,
                        booking: id,
                        value: "Yes, worked",
                      },
                      "Thanks. Your private report is saved.",
                    )
                  }
                >
                  Yes, worked
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setReport("No-show");
                    setIssue(true);
                  }}
                >
                  No-show
                </Button>
                <Button
                  variant="quiet"
                  onClick={() => {
                    setReport("There was an issue");
                    setIssue(true);
                  }}
                >
                  There was an issue
                </Button>
              </div>
            </div>
          )}
          {side === "venue" && (past || b.cancelled) && (
            <Button variant="secondary" onClick={() => again("again")}>
              Book {t.name.split(" ")[0]} again
            </Button>
          )}
          {!past && !b.cancelled && side !== "owner" && (
            <div className="pv-actions pv-sensitive-actions">
              <Button
                variant="quiet"
                onClick={() => {
                  setReport("Problem during service");
                  setIssue(true);
                }}
              >
                Report an issue / running late
              </Button>
              <Button variant="danger" onClick={() => setCancel(true)}>
                Cancel booking
              </Button>
            </div>
          )}
          {side === "owner" && (
            <div className="pv-services">
              <h3>Private member reports</h3>
              {Object.entries(b.outcomes).map(([m, value]) => (
                <p key={m}>
                  {member(data, m).name}: {value}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
      {cancel && (
        <Modal title="Cancel booking" onClose={() => setCancel(false)}>
          <p>
            The other side is notified immediately.{" "}
            {started
              ? "Completed services remain in history; remaining services are cancelled."
              : "This cancels the whole booking."}
          </p>
          <Services shift={{ ...s, days: future }} />
          <Field label="Reason · required">
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Choose a reason</option>
              <option>Illness or emergency</option>
              <option>Venue plans changed</option>
              <option>Unable to travel</option>
              <option>Cover no longer needed</option>
              <option>Other</option>
            </select>
          </Field>
          <Field label="More detail · optional">
            <textarea
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              rows={2}
            />
          </Field>
          <Button
            variant="danger"
            disabled={!reason}
            onClick={() => {
              if (
                act(
                  {
                    type: "cancel",
                    actor,
                    booking: id,
                    reason: `${reason}${extra ? ` — ${extra}` : ""}`,
                  },
                  "Booking cancelled. The other side has been notified.",
                )
              )
                setCancel(false);
            }}
          >
            Cancel and notify
          </Button>
        </Modal>
      )}
      {issue && (
        <Modal title="Tell the owner" onClose={() => setIssue(false)}>
          <p>
            The owner sees this privately and can help. Reporting does not
            cancel the booking.
          </p>
          <Field label="What happened?">
            <textarea
              value={report}
              onChange={(e) => setReport(e.target.value)}
              rows={3}
            />
          </Field>
          <Button
            disabled={!report.trim()}
            onClick={() => {
              if (
                act(
                  { type: "outcome", actor, booking: id, value: report },
                  "Issue reported privately to the owner.",
                )
              )
                setIssue(false);
            }}
          >
            Send private report
          </Button>
        </Modal>
      )}
    </>
  );
}
