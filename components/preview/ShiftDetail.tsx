"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon } from "@/components/icons";
import {
  audience,
  availableDates,
  bookableDates,
  busyDates,
  bookedCount,
  bookingPast,
  bookingServices,
  coverage,
  datePlus,
  datesLabel,
  firstName,
  hoursOf,
  member,
  offeredDates,
  openDates,
  relativeDay,
  serviceLabel,
  shiftLabel,
  shortDay,
  allSkills,
  venueSummary,
  offerableDates,
  workedWith,
  type Booking,
  type Data,
  type Response,
  type Shift,
  type ShiftDraft,
  areaOf,
  fullAddress,
  contactLine,
} from "@/lib/preview/model";
import { usePreview } from "./context";
import { ProfileCard, useMessage } from "./Booking";
import {
  ActionBar,
  Badge,
  Button,
  Empty,
  Field,
  Heading,
  Modal,
  Photo,
  ProfilePhoto,
  ProfileName,
  InviteToggle,
  Row,
  Section,
  Services,
} from "./ui";

export function draftFrom(
  shift: Shift,
  now: string,
  extra: Partial<ShiftDraft> = {},
  dates?: string[],
): ShiftDraft {
  const future = shift.days.filter(
    (d) => d.from > now && (!dates || dates.includes(d.date)),
  );
  return {
    roles: shift.roles,
    family: shift.family,
    date: future[0]?.date || datePlus(now.slice(0, 10), 1),
    count: future.length || shift.days.length,
    dates: future.length ? future.map((d) => d.date) : undefined,
    start: shift.days[0].start,
    end: shift.days[0].end,
    capacity: shift.capacity,
    rate: shift.rate,
    note: shift.note,
    mode: "post",
    invitees: [],
    together: shift.together,
    ...extra,
  };
}
function when(data: Data, s: Shift, dates?: string[]) {
  const span = dates ?? s.days.map((d) => d.date);
  const first = s.days.find((d) => d.date === [...span].sort()[0])!;
  return `${span.length > 1 ? datesLabel(span) : relativeDay(first.date, data.now)} · ${first.start}–${first.end}`;
}
export function weekday(date: string) {
  return shortDay(date);
}
// "all 3 days", "Thu only", "2 days" — used on every per-day button.
export function daysPhrase(dates: string[], total: number) {
  if (total > 1 && dates.length === total) return `all ${total} days`;
  if (dates.length === 1) return `${weekday(dates[0])} only`;
  return `${dates.length} days`;
}

// The venue's yes. Used from the shift screen, the day tracker and chat.
export function BookConfirm({
  shift,
  talent,
  preselect,
  onClose,
}: {
  shift: Shift;
  talent: string;
  preselect?: string[];
  onClose: () => void;
}) {
  const { data, actor, act, go } = usePreview();
  const t = member(data, talent);
  const r = data.responses.find(
    (r) => r.shift === shift.id && r.talent === talent,
  )!;
  const bookable = bookableDates(data, shift, r);
  const choose = shift.days.length > 1 && !shift.together && bookable.length > 1;
  const [picked, setPicked] = useState<string[]>(
    preselect?.filter((d) => bookable.includes(d)) ?? bookable,
  );
  const extending = data.bookings.some(
    (b) => b.shift === shift.id && b.talent === talent && !b.cancelled,
  );
  return (
    <Modal title={`Book ${firstName(t)}?`} onClose={onClose}>
      <div className="pv-confirm-person">
        <Photo src={t.photo} alt={t.name} />
        <span>
          <strong>{t.name}</strong>
          <small>
            {shiftLabel(shift)} · £{shift.rate}/h
          </small>
        </span>
      </div>
      {choose ? (
        <div className="pv-day-picks">
          {bookable.map((date) => {
            const d = shift.days.find((x) => x.date === date)!;
            return (
              <label key={date}>
                <input
                  type="checkbox"
                  checked={picked.includes(date)}
                  onChange={(e) =>
                    setPicked(
                      e.target.checked
                        ? [...picked, date].sort()
                        : picked.filter((x) => x !== date),
                    )
                  }
                />
                <span>{serviceLabel(d)}</span>
              </label>
            );
          })}
        </div>
      ) : (
        <Services shift={shift} dates={bookable} />
      )}
      {extending && <p>Adds to {firstName(t)}’s booking.</p>}
      <Button
        disabled={!picked.length}
        onClick={() => {
          // Work out who will be told it's filled, so the venue hears it now.
          const c = coverage(data, shift);
          picked.forEach((d) => c[d].push(talent));
          const stillOpen = shift.days
            .filter((d) => c[d.date].length < shift.capacity)
            .map((d) => d.date);
          const told = data.responses.filter(
            (o) =>
              o.shift === shift.id &&
              o.talent !== talent &&
              (stillOpen.length
                ? o.status === "can-cover" &&
                  !offeredDates(shift, o).some((d) => stillOpen.includes(d))
                : ["can-cover", "invited"].includes(o.status)),
          );
          const next = act(
            { type: "book", actor, shift: shift.id, talent, days: picked },
            `${firstName(t)} is booked and has been texted.${
              told.length
                ? ` We’ve told ${told
                    .map((o) => firstName(member(data, o.talent)))
                    .join(" and ")} it’s filled.`
                : ""
            }`,
          );
          if (!next) return;
          onClose();
          const b = next.bookings.find(
            (b) => b.shift === shift.id && b.talent === talent && !b.cancelled,
          )!;
          go(`booking/${b.id}`);
        }}
      >
        Book {firstName(t)}
        {shift.days.length > 1 && picked.length
          ? ` · ${daysPhrase(picked, shift.days.length)}`
          : ""}
      </Button>
    </Modal>
  );
}
export function ShiftDetail({ id }: { id: string }) {
  const { data, actor, side, go } = usePreview();
  const s = data.shifts.find((s) => s.id === id);
  if (!s)
    return (
      <Empty
        title="Shift not found"
      >
        <Button onClick={() => go("home")}>Go home</Button>
      </Empty>
    );
  if (side === "talent") return <TalentShift s={s} />;
  return <VenueShift s={s} readOnly={side === "owner" || s.venue !== actor} />;
}
function ResponseCard({
  s,
  r,
  onBook,
}: {
  s: Shift;
  r: Response;
  onBook: () => void;
}) {
  const { data, actor, act, go } = usePreview();
  const t = member(data, r.talent);
  const venue = member(data, s.venue);
  const n = s.days.length;
  const offered = offeredDates(s, r);
  const bookable = bookableDates(data, s, r);
  const gone = offered.filter((d) => !bookable.includes(d));
  return (
    <div className="pv-response">
      <ProfilePhoto person={t} />
      <div>
        <button
          className="pv-name-link"
          onClick={() => go(`talent/${t.id}`)}
        >
          {t.name}
        </button>
        <p className="pv-muted">
          {t.roles.join(" · ")} · {areaOf(t)}
        </p>
        <div className="pv-pick-tags">
          {workedWith(data, venue.id, t.id) && <Badge good>Worked with you</Badge>}
          {n > 1 && (
            <Badge good={offered.length === n}>
              {offered.length === n
                ? `Offered all ${n} days`
                : `Offered ${offered.map(weekday).join(", ")}`}
              {gone.length ? ` (${gone.map(weekday).join(", ")} filled)` : ""}
            </Badge>
          )}
          {allSkills(t).slice(0, 3).map((skill) => (
            <Badge key={skill}>{skill}</Badge>
          ))}
        </div>
        {t.bio && <p className="pv-bio-clamp">{t.bio}</p>}
        {r.note && <p className="pv-response-note">“{r.note}”</p>}
        <div className="pv-actions">
          <Button onClick={onBook}>
            Book {firstName(t)}
            {n > 1 ? ` · ${daysPhrase(bookable, n)}` : ""}
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (act({ type: "open-chat", actor, response: r.id }))
                go(`chat/${r.id}`);
            }}
          >
            Message
          </Button>
        </div>
      </div>
    </div>
  );
}
function VenueShift({ s, readOnly }: { s: Shift; readOnly: boolean }) {
  const { data, actor, act, go, back } = usePreview();
  const message = useMessage();
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // The menu closes on Escape or a tap anywhere else.
  useEffect(() => {
    if (!menu) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setMenu(false);
    const away = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", away);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", away);
    };
  }, [menu]);
  const [modal, setModal] = useState<
    "close" | "note" | "invite" | null
  >(null);
  const [bookTalent, setBookTalent] = useState<{
    talent: string;
    days?: string[];
  } | null>(null);
  const [reason, setReason] = useState("Cover is no longer needed");
  const [note, setNote] = useState(s.note);
  const [invitees, setInvitees] = useState<string[]>([]);
  const responses = data.responses.filter((r) => r.shift === s.id);
  const canCover = responses.filter((r) => r.status === "can-cover");
  const everyDay = canCover.filter(
    (r) => offeredDates(s, r).length === s.days.length,
  );
  const someDays = canCover.filter((r) => !everyDay.includes(r));
  const invited = responses.filter((r) => r.status === "invited");
  const ended = responses.filter((r) =>
    ["declined", "withdrawn", "lapsed", "not-selected"].includes(r.status),
  );
  const bookings = data.bookings.filter((b) => b.shift === s.id);
  const replied = new Set(responses.map((r) => r.talent));
  const silent = audience(data, s).filter((id) => !replied.has(id));
  const c = coverage(data, s);
  const status = venueSummary(data, s);
  const open = s.status === "open";
  function editAndResend() {
    go(`compose/edit/${s.id}`);
  }
  const endedLabel = (r: Response) =>
    ({
      declined: "Declined",
      withdrawn: "Withdrew",
      lapsed: "Booked elsewhere",
      "not-selected": "Told it’s filled",
    })[r.status as "declined"];
  return (
    <>
      <div className="pv-topbar">
        <Button
          variant="quiet"
          className="pv-back"
          onClick={() => back(readOnly ? "home" : "bookings")}
        >
          <ArrowLeftIcon /> Back
        </Button>
        {!readOnly && open && (
          <div className="pv-menu" ref={menuRef}>
            <button
              className="pv-icon-button"
              aria-label="More actions"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <circle cx="5" cy="12" r="1.8" />
                <circle cx="12" cy="12" r="1.8" />
                <circle cx="19" cy="12" r="1.8" />
              </svg>
            </button>
            {menu && (
              <div className="pv-menu-list" role="menu">
                <button role="menuitem" onClick={() => { setMenu(false); setModal("invite"); }}>
                  Invite more people
                </button>
                <button role="menuitem" onClick={() => { setMenu(false); setNote(s.note); setModal("note"); }}>
                  Edit note
                </button>
                <button
                  role="menuitem"
                  disabled={!!bookedCount(data, s.id)}
                  onClick={editAndResend}
                >
                  Change time, pay or role
                </button>
                <button role="menuitem" onClick={() => { setMenu(false); setModal("close"); }}>
                  Close shift
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <Heading title={shiftLabel(s)} />
      <p className="pv-shift-meta">
        {when(data, s)} · £{s.rate}/h · {s.capacity}{" "}
        {s.capacity === 1 ? "person" : "people"}
        {s.days.length > 1 ? " each day" : ""}
      </p>
      {(responses.length > 0 || bookings.length > 0 || !open || s.ownerAlerted) && (
        <p className={`pv-status-line ${status.good ? "is-good" : ""}`}>
          {status.text}
        </p>
      )}
      {s.together && (
        <p className="pv-muted pv-small">
          Each person covers all {s.days.length} days.
        </p>
      )}
      {s.days.length > 1 && (
        <div className="pv-tracker">
          {s.days.map((d) => {
            const here = c[d.date];
            const left = s.capacity - here.length;
            // People still waiting to be booked for this day.
            const can = responses.filter(
              (r) =>
                ["can-cover", "booked"].includes(r.status) &&
                bookableDates(data, s, r).includes(d.date),
            );
            return (
              <div key={d.date} className={left <= 0 ? "is-done" : ""}>
                <div className="pv-tracker-head">
                  <strong>{serviceLabel(d)}</strong>
                  <Badge good={left <= 0}>
                    {here.length
                      ? `Booked · ${here.map((id) => firstName(member(data, id))).join(", ")}${left > 0 ? ` · ${left} more needed` : ""}`
                      : s.capacity > 1
                        ? `Open · ${s.capacity} needed`
                        : "Open"}
                  </Badge>
                </div>
                {left > 0 &&
                  (can.length ? (
                    <div className="pv-tracker-can">
                      <small>
                        {can.length} can cover:{" "}
                        {can
                          .map((r) => {
                            const o = offeredDates(s, r);
                            return `${firstName(member(data, r.talent))} (${o.length === s.days.length ? `all ${s.days.length} days` : o.length === 1 ? `${weekday(o[0])} only` : o.map(weekday).join(", ")})`;
                          })
                          .join(", ")}
                      </small>
                      {!readOnly && !s.together && (
                        <span className="pv-tracker-actions">
                          {can.map((r) => (
                            <Button
                              key={r.id}
                              variant="secondary"
                              onClick={() =>
                                setBookTalent({ talent: r.talent, days: [d.date] })
                              }
                            >
                              Book {firstName(member(data, r.talent))}
                            </Button>
                          ))}
                        </span>
                      )}
                    </div>
                  ) : (
                    <small className="pv-muted">Nobody has offered this day yet.</small>
                  ))}
              </div>
            );
          })}
        </div>
      )}
      {bookings.length > 0 && (
        <Section title="Booked">
          <div className="pv-rows">
            {bookings.map((b) => {
              const t = member(data, b.talent);
              const br = responses.find((r) => r.talent === b.talent);
              const more = br && !b.cancelled ? bookableDates(data, s, br) : [];
              return (
                <Row
                  key={b.id}
                  photo={t.photo}
                  name={t.name}
                  title={t.name}
                  sub={`${when(data, s, b.days)}${more.length ? ` · also offered ${more.map(weekday).join(", ")}` : ""}`}
                  status={b.cancelled ? "Cancelled" : "Booked"}
                  good={!b.cancelled}
                  onClick={() => go(`booking/${b.id}`)}
                />
              );
            })}
          </div>
        </Section>
      )}
      {canCover.length > 0 && (
        <Section
          title={
            s.days.length > 1 && someDays.length && everyDay.length
              ? "Can cover every day"
              : s.days.length > 1 && someDays.length
                ? "Can cover some days"
                : "Can cover"
          }
        >
          {(everyDay.length ? everyDay : someDays).map((r) =>
            readOnly ? (
              <p key={r.id}>{member(data, r.talent).name}</p>
            ) : (
              <ResponseCard
                key={r.id}
                s={s}
                r={r}
                onBook={() => setBookTalent({ talent: r.talent })}
              />
            ),
          )}
        </Section>
      )}
      {everyDay.length > 0 && someDays.length > 0 && (
        <Section title="Can cover some days">
          {someDays.map((r) => (
            <ResponseCard
              key={r.id}
              s={s}
              r={r}
              onBook={() => setBookTalent({ talent: r.talent })}
            />
          ))}
        </Section>
      )}
      {open &&
        !readOnly &&
        !responses.some(
          (r) =>
            ["can-cover", "booked"].includes(r.status) &&
            bookableDates(data, s, r).length > 0,
        ) && (
        <div className="pv-fallback">
          {bookings.length > 0 ? (
            // Someone is (or was) booked: say what's still needed, not "no replies".
            <h3>Find cover for {datesLabel(openDates(data, s))}</h3>
          ) : (
            <p>
              {s.ownerAlerted
                ? "Dyuknow is looking for someone."
                : "No replies yet."}
            </p>
          )}
          <div className="pv-actions">
            {bookings.length > 0 && s.mode === "post" && (
              <Button
                onClick={() =>
                  act(
                    { type: "realert", actor, shift: s.id },
                    `Texted everyone in ${s.roles.join(" or ")} who’s free then.`,
                  )
                }
              >
                Text everyone again
              </Button>
            )}
            <Button variant="secondary" onClick={() => setModal("invite")}>
              {bookings.length > 0 ? "Invite people" : "Invite more people"}
            </Button>
            {!s.ownerAlerted && (
              <Button
                variant="quiet"
                onClick={() =>
                  act(
                    { type: "ask-owner", actor, shift: s.id },
                    "Dyuknow is on it.",
                  )
                }
              >
                Ask Dyuknow to help
              </Button>
            )}
          </div>
        </div>
      )}
      {(invited.length > 0 || silent.length > 0 || ended.length > 0) && (
        <Section
          title={
            canCover.length || bookings.length || ended.length
              ? "Everyone else"
              : "Sent to"
          }
        >
          <div className="pv-talent-grid is-medium">
            {[
              ...invited.map((r) => [r.talent, "Invited · waiting", r.id] as const),
              ...(open ? silent.map((id) => [id, "No reply yet", ""] as const) : []),
              ...ended.map((r) => [r.talent, endedLabel(r), r.chat ? r.id : ""] as const),
            ].map(([id, status, chat]) => (
              <ProfileCard key={id} person={member(data, id)} size="medium" status={status}>
                {!readOnly && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      // An invitation already has its conversation; otherwise
                      // talk directly, starting from this job post.
                      chat ? go(`chat/${chat}`) : message(id, undefined, s.id)
                    }
                  >
                    Message
                  </Button>
                )}
              </ProfileCard>
            ))}
          </div>
        </Section>
      )}
      <Section title="Note to talent">
        <p className="pv-muted">{s.note || "No note."}</p>
      </Section>
      {bookTalent && (
        <BookConfirm
          shift={s}
          talent={bookTalent.talent}
          preselect={bookTalent.days}
          onClose={() => setBookTalent(null)}
        />
      )}
      {modal === "close" && (
        <Modal title="Close this shift?" onClose={() => setModal(null)}>
          {bookings.some((b) => !b.cancelled) && (
            <p>People already booked stay booked.</p>
          )}
          <Field label="Reason">
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option>Cover is no longer needed</option>
              <option>Cover found elsewhere</option>
              <option>Plans changed</option>
            </select>
          </Field>
          <Button
            onClick={() => {
              if (
                act(
                  { type: "close", actor, shift: s.id, reason },
                  "Shift closed. Anyone waiting has been told.",
                )
              )
                setModal(null);
            }}
          >
            Close shift
          </Button>
        </Modal>
      )}
      {modal === "note" && (
        <Modal title="Edit note" onClose={() => setModal(null)}>
          <Field label="Note to talent">
            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Field>
          <Button
            onClick={() => {
              if (
                act(
                  { type: "edit-note", actor, shift: s.id, note },
                  "Note saved.",
                )
              )
                setModal(null);
            }}
          >
            Save note
          </Button>
        </Modal>
      )}
      {modal === "invite" && (
        <Modal title="Invite more people" onClose={() => setModal(null)}>
          <p>First to accept is booked.</p>
          <div className="pv-pick-list">
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
                const blocked = !availableDates(data, t.id, s).length;
                return (
                  <div key={t.id} className={`pv-pick ${invitees.includes(t.id) ? "is-picked" : ""} ${blocked || existing ? "is-blocked" : ""}`}>
                    <ProfilePhoto person={t} />
                    <span className="pv-pick-text">
                      <strong><ProfileName person={t} /></strong>
                      <small>
                        {existing
                          ? existing.status === "booked"
                            ? "Booked on this shift"
                            : existing.status === "invited"
                              ? "Already invited"
                              : "Already said they can cover"
                          : blocked
                            ? "Booked elsewhere then"
                            : t.roles.join(" · ")}
                      </small>
                    </span>
                    <InviteToggle
                      name={t.name}
                      disabled={!!existing || blocked}
                      checked={invitees.includes(t.id)}
                      onChange={(checked) =>
                        setInvitees(
                          checked
                            ? [...invitees, t.id]
                            : invitees.filter((i) => i !== t.id),
                        )
                      }
                    />
                  </div>
                );
              })}
          </div>
          <Button
            disabled={!invitees.length}
            onClick={() => {
              if (
                act(
                  { type: "invite", actor, shift: s.id, talents: invitees },
                  invitees.length === 1 ? "Invite sent." : "Invites sent.",
                )
              ) {
                setInvitees([]);
                setModal(null);
              }
            }}
          >
            {invitees.length > 1 ? `Invite ${invitees.length} people` : "Send invite"}
          </Button>
        </Modal>
      )}
    </>
  );
}
function TalentShift({ s }: { s: Shift }) {
  const { data, actor, me, act, go, back } = usePreview();
  const [sheet, setSheet] = useState<
    "respond" | "some" | "more" | "accept" | null
  >(null);
  const [note, setNote] = useState("");
  const venue = member(data, s.venue);
  const r = data.responses.find((r) => r.shift === s.id && r.talent === actor);
  const free = availableDates(data, actor, s);
  const open = openDates(data, s);
  const busy = busyDates(data, actor, s);
  // Start from the days they can do, minus days they marked Not free.
  const suggested = s.together ? free : free.filter((d) => !busy.includes(d));
  const [picked, setPicked] = useState<string[]>(suggested);
  const b = data.bookings.find(
    (b) => b.shift === s.id && b.talent === actor && !b.cancelled,
  );
  const cancelled = data.bookings.find(
    (b) => b.shift === s.id && b.talent === actor && b.cancelled,
  );
  const myRole =
    s.roles.find((role) => me?.roles.includes(role)) || shiftLabel(s);
  const eligible = me?.roles.some((role) => s.roles.includes(role));
  const hours = hoursOf(s.days[0]);
  const multi = s.days.length > 1;
  const clashWith = (date: string) => {
    const day = s.days.find((d) => d.date === date)!;
    const other = data.bookings.find(
      (x) =>
        x.talent === actor &&
        !x.cancelled &&
        x.shift !== s.id &&
        bookingServices(data, x).some((d) => d.from < day.to && day.from < d.to),
    );
    return other
      ? member(data, data.shifts.find((x) => x.id === other.shift)!.venue).name
      : "";
  };
  function chat() {
    if (r && act({ type: "open-chat", actor, response: r.id }))
      go(`chat/${r.id}`);
  }
  function sendResponse() {
    const result = act(
      { type: "respond", actor, shift: s.id, note, days: picked },
      `Sent to ${venue.name}.`,
    );
    if (result) setSheet(null);
  }
  const waitingDates = r ? offeredDates(s, r) : [];
  // Open days this person hasn't offered yet, even if booked for others.
  const offerable = s.status === "open" ? offerableDates(data, actor, s) : [];
  const offerMore = offerable.length > 0 && (
    <Button
      variant={b ? "primary" : "quiet"}
      onClick={() => {
        const unmarked = offerable.filter((d) => !busy.includes(d));
        setPicked(unmarked.length ? unmarked : offerable);
        setSheet("more");
      }}
    >
      {offerable.length === 1 ? `Offer ${shortDay(offerable[0])}` : "Offer more days"}
    </Button>
  );
  let bar;
  if (b)
    bar = (
      <>
        <p className="pv-bar-note">
          <Badge good>You’re booked</Badge> {datesLabel(b.days)}
          {r && bookableDates(data, s, r).length > 0
            ? `. ${venue.name} may also book you for ${datesLabel(bookableDates(data, s, r))}.`
            : offerable.length
              ? `. ${datesLabel(offerable)} still ${offerable.length === 1 ? "needs" : "need"} someone.`
              : ""}
        </p>
        {offerMore}
        <Button
          variant={offerable.length ? "secondary" : "primary"}
          onClick={() => go(`booking/${b.id}`)}
        >
          View your booking
        </Button>
      </>
    );
  else if (cancelled)
    bar = (
      <p className="pv-bar-note">
        This booking was cancelled: {cancelled.reason}
      </p>
    );
  else if (r?.status === "can-cover")
    bar = (
      <>
        <p className="pv-bar-note">
          Waiting for {venue.name}
          {multi ? ` · ${datesLabel(waitingDates)}` : ""}. You’re not booked yet.
        </p>
        <div className="pv-bar-row">
          {r.chat && <Button onClick={chat}>Message</Button>}
          <Button
            variant="secondary"
            onClick={() =>
              act(
                { type: "withdraw", actor, shift: s.id },
                "Withdrawn.",
                { undo: true },
              )
            }
          >
            Withdraw
          </Button>
        </div>
        {offerMore}
      </>
    );
  else if (r?.status === "invited" && s.status === "open") {
    const clash = open.some((d) => !free.includes(d));
    bar = (
      <>
        <p className="pv-bar-note">
          {venue.name} invited you.
          {clash && free.length
            ? " You’re booked elsewhere on part of it."
            : !free.length
              ? " You’re booked elsewhere then."
              : " Accepting books you."}
        </p>
        <div className="pv-bar-row">
          <Button
            disabled={clash}
            onClick={() => setSheet("accept")}
          >
            {multi && open.length > 1 ? `Accept all ${open.length} days` : "Accept and book"}
          </Button>
          {multi && !s.together && free.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => {
                setPicked(suggested);
                setSheet("some");
              }}
            >
              I can do some days
            </Button>
          )}
        </div>
        <div className="pv-bar-row">
          <Button variant="quiet" onClick={chat}>
            Message
          </Button>
          <Button
            variant="quiet"
            onClick={() =>
              act(
                { type: "decline", actor, shift: s.id },
                `Declined. ${venue.name} has been told.`,
                { undo: true },
              )
            }
          >
            Decline
          </Button>
        </div>
      </>
    );
  } else if (s.status !== "open" || r?.status === "declined")
    bar = (
      <>
        <p className="pv-bar-note">
          {r?.status === "declined"
            ? "You declined this invitation."
            : r?.status === "lapsed"
              ? "You’re booked elsewhere at this time."
              : s.status === "expired"
                ? "This shift has started."
                : s.status === "closed"
                  ? "The venue closed this shift."
                  : "This shift has been filled."}
        </p>
        <Button variant="secondary" onClick={() => go("home")}>
          See other shifts
        </Button>
      </>
    );
  else if (s.mode === "invite")
    bar = null;
  else if (!eligible)
    bar = (
      <p className="pv-bar-note">
        This shift is for {shiftLabel(s)}, which isn’t on your profile.
      </p>
    );
  else if (s.together && free.length < s.days.length)
    bar = (
      <p className="pv-bar-note">
        {venue.name} needs each person to cover all {s.days.length} days.{" "}
        {free.length
          ? `You’re at ${s.days.map((d) => clashWith(d.date)).find(Boolean) || "another venue"} on ${s.days
              .filter((d) => !free.includes(d.date))
              .map((d) => weekday(d.date))
              .join(", ")}.`
          : ""}
      </p>
    );
  else if (!free.length)
    bar = (
      <p className="pv-bar-note">
        You’re booked at {clashWith(s.days[0].date) || "another venue"} then.
      </p>
    );
  else
    bar = (
      <Button
        onClick={() => {
          setPicked(suggested);
          setSheet("respond");
        }}
      >
        {multi && free.length < s.days.length
          ? `I can do ${free.length} of ${s.days.length} days`
          : "I can cover this"}
      </Button>
    );
  return (
    <>
      <Button variant="quiet" className="pv-back" onClick={() => back("home")}>
        <ArrowLeftIcon /> Back
      </Button>
      <div className="pv-talent-shift">
        <button className="pv-venue-hero-link" aria-label={`View ${venue.name}’s public profile`} onClick={() => go(`venue/${venue.id}`)}>
          <Photo src={venue.photo} alt={venue.name} className="pv-venue-hero" />
        </button>
        <div className="pv-talent-shift-body">
          <button
            className="pv-eyebrow-link"
            onClick={() => go(`venue/${venue.id}`)}
          >
            {areaOf(venue)}
          </button>
          <h1 className="pv-venue-title"><button onClick={() => go(`venue/${venue.id}`)}>{venue.name}</button></h1>
          {venue.venue && [...venue.venue.types, ...venue.venue.cuisines].length > 0 && (
            <p className="pv-muted">
              {[...venue.venue.types, ...venue.venue.cuisines].join(" · ")}
            </p>
          )}
          <p className="pv-role-line">
            {r?.status === "invited" ? myRole : shiftLabel(s)}
          </p>
          <div className="pv-facts">
            <div>
              <small>When</small>
              <strong>{when(data, s)}</strong>
              {multi && (
                <span>
                  {s.days.length} days ·{" "}
                  {s.together ? "each person covers every day" : "same hours"}
                </span>
              )}
            </div>
            <div>
              <small>Pay</small>
              <strong>£{s.rate} / hour</strong>
              <span>
                About £{Math.round(s.rate * hours)} a day · {hours} hours
              </span>
            </div>
          </div>
          {multi && (
            <div className="pv-coverage">
              {s.days.map((d) => {
                const clash = clashWith(d.date);
                const filled = !open.includes(d.date);
                return (
                  <div key={d.date}>
                    <span>{serviceLabel(d)}</span>
                    <span>
                      {b?.days.includes(d.date)
                        ? "You’re booked"
                        : clash
                          ? `You’re at ${clash}`
                          : filled
                            ? d.from <= data.now
                              ? "Started"
                              : "Covered"
                            : r &&
                                ["can-cover", "booked"].includes(r.status) &&
                                waitingDates.includes(d.date)
                              ? "Offered"
                              : "Open"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {s.note && (
            <>
              <h3>Note from {venue.name}</h3>
              <p className="pv-muted">{s.note}</p>
            </>
          )}
          {b && (
            <>
              <h3>Address</h3>
              <p className="pv-muted">{s.address || fullAddress(venue)}</p>
            </>
          )}
          {bar && <ActionBar>{bar}</ActionBar>}
        </div>
      </div>
      {(sheet === "respond" || sheet === "some" || sheet === "more") && (
        <Modal
          title={
            sheet === "more"
              ? "Offer more days"
              : sheet === "some"
                ? "Which days can you do?"
                : `Tell ${venue.name} you can cover`
          }
          onClose={() => setSheet(null)}
        >
          {multi && (
            <div className="pv-day-picks">
              {s.days.map((d) => {
                const more = sheet === "more";
                const can = (more ? offerable : free).includes(d.date);
                const clash = clashWith(d.date);
                const marked = busy.includes(d.date);
                const mineBooked = b?.days.includes(d.date);
                const offeredAlready = more && waitingDates.includes(d.date);
                return (
                  <label key={d.date} className={can ? "" : "is-blocked"}>
                    <input
                      type="checkbox"
                      disabled={!can || !!s.together}
                      checked={picked.includes(d.date)}
                      onChange={(e) =>
                        setPicked(
                          e.target.checked
                            ? [...picked, d.date]
                            : picked.filter((x) => x !== d.date),
                        )
                      }
                    />
                    <span>{serviceLabel(d)}</span>
                    {!can ? (
                      <small>
                        {mineBooked
                          ? "You’re booked"
                          : offeredAlready
                            ? "Already offered"
                            : clash
                              ? `You’re at ${clash}`
                              : "Covered"}
                      </small>
                    ) : marked ? (
                      <small>You marked this day not free</small>
                    ) : null}
                  </label>
                );
              })}
            </div>
          )}
          {!multi && <Services shift={s} />}
          {s.together && sheet !== "more" && (
            <p>Each person covers all {s.days.length} days.</p>
          )}
          <p>You’re not booked until {venue.name} confirms.</p>
          {sheet !== "more" && (
            <Field label={`Note to ${venue.name} · optional`}>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Happy to help. I know a busy grill section."
              />
            </Field>
          )}
          <Button disabled={!picked.length} onClick={sendResponse}>
            {sheet === "more"
              ? picked.length === 1
                ? `Offer ${shortDay(picked[0])}`
                : `Offer ${picked.length} more days`
              : !multi
              ? `Send to ${venue.name}`
              : picked.length === s.days.length
                ? `Offer all ${s.days.length} days`
                : picked.length === 1
                  ? `Offer 1 day (${weekday(picked[0])} only)`
                  : picked.length
                    ? `Offer ${picked.length} of ${s.days.length} days`
                    : "Tick the days you can do"}
          </Button>
        </Modal>
      )}
      {sheet === "accept" && (
        <Modal title="Accept and book?" onClose={() => setSheet(null)}>
          <Services shift={s} dates={open} />
          <Button
            onClick={() => {
              const next = act(
                { type: "accept", actor, shift: s.id },
                `You’re booked at ${venue.name}.`,
              );
              if (next) {
                setSheet(null);
                go(`booking/${next.bookings[0].id}`);
              }
            }}
          >
            Accept and book
          </Button>
        </Modal>
      )}
    </>
  );
}
function ics(data: Data, b: Booking, s: Shift, venueName: string, address: string) {
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
    ...bookingServices(data, b).map((d, i) =>
      [
        "BEGIN:VEVENT",
        `UID:${b.id}-${i}@dyuknow.preview`,
        `DTSTAMP:${stamp(data.now)}`,
        `DTSTART:${stamp(d.from)}`,
        `DTEND:${stamp(d.to)}`,
        `SUMMARY:${esc(`${shiftLabel(s)} at ${venueName}`)}`,
        `LOCATION:${esc(address)}`,
        `DESCRIPTION:${esc(`£${s.rate}/hour. ${s.note}`)}`,
        "END:VEVENT",
      ].join("\r\n"),
    ),
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([content], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `dyuknow-${venueName.toLowerCase().replace(/\W+/g, "-")}.ics`;
  a.click();
  URL.revokeObjectURL(url);
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
        text="Open a booking from your schedule."
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
      <Empty title="This booking is private" text="Open one of your own bookings." />
    );
  const services = bookingServices(data, b);
  const first = services[0];
  const past = bookingPast(data, b);
  const started = first.from <= data.now;
  const future = services.filter((d) => d.from > data.now);
  const address = s.address || fullAddress(v);
  const contact = `${s.contact || contactLine(v)} · ${s.phone || v.phone}`;
  const venueView = side !== "talent";
  const rel = relativeDay(first.date, data.now);
  const whenWords = ["Today", "Tomorrow"].includes(rel)
    ? rel.toLowerCase()
    : `on ${rel}`;
  const title = b.cancelled
    ? "Booking cancelled"
    : past
      ? "Past booking"
      : venueView
        ? started
          ? `${firstName(t)} is on service`
          : `${firstName(t)}’s coming ${whenWords} at ${first.start}`
        : started
          ? `You’re on service at ${v.name}`
          : `You’re booked at ${v.name}`;
  function again(mode: "replacement" | "again") {
    // A cancellation reopens the original shift, so look for cover there.
    if (mode === "replacement" && s.status === "open") return go(`shift/${s.id}`);
    go(`compose/${mode === "replacement" ? "replace" : "again"}/${b!.id}`);
  }
  const person = venueView ? t : v;
  return (
    <>
      <Heading title={title} back="bookings" />
      <div className="pv-booking">
        <div className="pv-confirm-person pv-booking-person">
          <ProfilePhoto person={person} />
          <span>
            <strong><ProfileName person={person} /></strong>
            <small>
              {venueView ? t.roles.join(" · ") : `${shiftLabel(s)} · ${areaOf(v)}`}
            </small>
            {venueView && <small>{t.phone}</small>}
          </span>
        </div>
        {b.cancelled && (
          <div className="pv-callout">
            <h3>Cancelled by {member(data, b.by!).name}</h3>
            <p>{b.reason}</p>
          </div>
        )}
        <Section title={venueView ? "When" : "When and pay"}>
          <Services shift={s} dates={b.days} />
          <p>
            £{s.rate}/h · {shiftLabel(s)} · paid directly by {v.name}
          </p>
        </Section>
        {!b.cancelled && !past && (
          <Section title={venueView ? `What ${firstName(t)} has` : "Getting there"}>
            <dl className="pv-arrival">
              <div>
                <dt>Address</dt>
                <dd>
                  {address}
                  {!venueView && (
                    <a
                      className="pv-text-link"
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Directions
                    </a>
                  )}
                </dd>
              </div>
              <div>
                <dt>On-site contact</dt>
                <dd>{contact}</dd>
              </div>
              <div>
                <dt>Note</dt>
                <dd>{s.note || "No note."}</dd>
              </div>
            </dl>
          </Section>
        )}
        {side !== "owner" && (
          <div className="pv-actions">
            <Button onClick={() => go(`chat/${r.id}`)}>
              Message {firstName(person)}
            </Button>
            <a className="pv-button pv-secondary" href={`tel:${(venueView ? t.phone : s.phone || v.phone).replace(/\s/g, "")}`}>
              Call
            </a>
            {!b.cancelled && !past && (
              <Button variant="secondary" onClick={() => ics(data, b, s, v.name, address)}>
                Add to calendar
              </Button>
            )}
          </div>
        )}
        {venueView &&
          side === "venue" &&
          ((b.cancelled && future.length > 0) ||
            (b.outcomes[actor] && b.outcomes[actor] !== "Yes, worked")) && (
            <div className="pv-callout">
              <Button onClick={() => again("replacement")}>Find a replacement</Button>
            </div>
          )}
        {b.cancelled && side === "talent" && (
          <button className="pv-text-link" onClick={() => go("bookings")}>
            Update when you’re free
          </button>
        )}
        {past && !b.cancelled && side !== "owner" && !b.outcomes[actor] && (
          <Section title="Did it go ahead?">
              <div className="pv-actions">
                <Button
                  variant="secondary"
                  onClick={() =>
                    act(
                      { type: "outcome", actor, booking: id, value: "Yes, worked" },
                      "Thanks.",
                    )
                  }
                >
                  Yes
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
                  There was a problem
                </Button>
              </div>
          </Section>
        )}
        {side === "venue" && (past || b.cancelled) && (
          <Button variant="secondary" onClick={() => again("again")}>
            Book {firstName(t)} again
          </Button>
        )}
        {!past && !b.cancelled && side !== "owner" && (
          <div className="pv-actions pv-sensitive-actions">
            <Button
              variant="quiet"
              onClick={() => {
                setReport("");
                setIssue(true);
              }}
            >
              Report a problem
            </Button>
            <Button variant="quiet" className="pv-danger-text" onClick={() => setCancel(true)}>
              Cancel booking
            </Button>
          </div>
        )}
        {side === "owner" && (
          <Section title="Private reports">
            {Object.entries(b.outcomes).length ? (
              Object.entries(b.outcomes).map(([m, value]) => (
                <p key={m}>
                  {member(data, m).name}: {value}
                </p>
              ))
            ) : (
              <p className="pv-muted">Nothing reported.</p>
            )}
          </Section>
        )}
      </div>
      {cancel && (
        <Modal title="Cancel this booking?" onClose={() => setCancel(false)}>
          <Services shift={s} dates={future.map((d) => d.date)} />
          <Field label="Reason">
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="">Choose a reason</option>
              <option>Illness or emergency</option>
              <option>Plans changed</option>
              <option>Unable to travel</option>
              {venueView && <option>Cover no longer needed</option>}
              <option>Other</option>
            </select>
          </Field>
          <Field label="Anything to add · optional">
            <textarea value={extra} onChange={(e) => setExtra(e.target.value)} rows={2} />
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
                  `Cancelled. ${venueView ? firstName(t) : v.name} has been texted.`,
                )
              )
                setCancel(false);
            }}
          >
            Cancel booking · text {venueView ? firstName(t) : v.name}
          </Button>
          <Button variant="quiet" onClick={() => setCancel(false)}>
            Keep booking
          </Button>
        </Modal>
      )}
      {issue && (
        <Modal title="Report a problem" onClose={() => setIssue(false)}>
          <Field label="What happened?">
            <textarea value={report} onChange={(e) => setReport(e.target.value)} rows={3} />
          </Field>
          <Button
            disabled={!report.trim()}
            onClick={() => {
              if (
                act(
                  { type: "outcome", actor, booking: id, value: report },
                  "Reported.",
                )
              )
                setIssue(false);
            }}
          >
            Send
          </Button>
        </Modal>
      )}
    </>
  );
}
