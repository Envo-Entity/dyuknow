"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, SendIcon } from "@/components/icons";
import {
  TEAMS,
  TEAM_NAMES,
  SKILL_GROUPS,
  VENUE_TYPES,
  CUISINES,
  COVERS_BANDS,
  DRESS_CODES,
  VENUE_KNOWN_FOR,
  SHIFT_ALERTS,
} from "@/lib/catalogue";
import { addCustomSkill } from "@/lib/onboardingModel";
import {
  clockLabel,
  allSkills,
  contactLine,
  defaultNote,
  fullAddress,
  makeDays,
  workedWith,
  type ShiftDraft,
  member,
  shiftLabel,
  unreadChat,
  datePlus,
  displayDate,
  londonDate,
  serviceLabel,
  bookingServices,
  datesLabel,
  firstName,
  offeredDates,
  currentOffer,
  type Member,
  areaOf,
} from "@/lib/preview/model";
import { usePreview } from "./context";
import { Badge, Button, Empty, Field, Heading, Photo, ProfilePhoto, ProfileName } from "./ui";
import { BookConfirm } from "./ShiftDetail";
import { OfferCard, OfferForm, useMessage } from "./Booking";
export function Messages() {
  const { data, actor, side, go } = usePreview();
  // Most recent conversation first; messages are stored in the order sent.
  const lastIndex = (id: string) =>
    data.messages.findLastIndex((m) => m.response === id);
  const rows = [
    // Shift conversations, unless they belong to a direct conversation.
    ...data.responses
      .filter(
        (r) =>
          r.chat &&
          !r.thread &&
          (side === "venue"
            ? data.shifts.find((s) => s.id === r.shift)!.venue === actor
            : r.talent === actor),
      )
      .map((r) => {
        const s = data.shifts.find((s) => s.id === r.shift)!;
        return {
          id: r.id,
          other: member(data, side === "venue" ? r.talent : s.venue),
          about: `${shiftLabel(s)} · ${displayDate(s.days[0].date)}`,
          status:
            r.status === "booked"
              ? "Booked"
              : r.status === "invited"
                ? "Invite waiting"
                : r.status === "can-cover"
                  ? "Can cover"
                  : r.status.replaceAll("-", " "),
          good: r.status === "booked",
        };
      }),
    ...(data.threads ?? [])
      .filter((t) => (side === "venue" ? t.venue : t.talent) === actor)
      .map((t) => {
        const o = currentOffer(data, t.id);
        return {
          id: t.id,
          other: member(data, side === "venue" ? t.talent : t.venue),
          about: o
            ? `${o.role} · ${datesLabel(o.dates)}`
            : "Direct message",
          status: o
            ? {
                sent: side === "talent" ? "Booking to answer" : "Booking sent",
                accepted: "Booked",
                declined: "Declined",
                changes: "Changes asked",
                replaced: "Revised",
              }[o.status]
            : "",
          good: o?.status === "accepted",
        };
      }),
  ].sort((a, b) => lastIndex(b.id) - lastIndex(a.id));
  return (
    <>
      <Heading
        title="Messages"
      />
      {rows.length ? (
        <div className="pv-thread-list">
          {rows.map((row) => {
            const last = data.messages.filter((m) => m.response === row.id).at(-1);
            return (
              <div
                key={row.id}
                className="pv-thread-row"
              >
                <ProfilePhoto person={row.other} />
                <div>
                  <h2>
                    <ProfileName person={row.other} />
                    {unreadChat(data, actor, row) && (
                      <span
                        className="pv-unread-dot"
                        aria-label="Unread messages"
                      />
                    )}
                  </h2>
                  <p>{row.about}</p>
                  <button className="pv-thread-open" onClick={() => go(`chat/${row.id}`)} aria-label={`Open conversation with ${row.other.name}`}>
                    {last?.text || "Your conversation starts here."}
                  </button>
                </div>
                {row.status ? <Badge good={row.good}>{row.status}</Badge> : <span />}
                <button className="pv-text-link pv-thread-action" onClick={() => go(`chat/${row.id}`)}>Open chat</button>
              </div>
            );
          })}
        </div>
      ) : (
        <Empty
          title="No conversations yet"
        >
          <Button onClick={() => go("home")}>
            {side === "venue" ? "Find people" : "Explore shifts"}
          </Button>
        </Empty>
      )}
    </>
  );
}
export function Thread({ id }: { id: string }) {
  const { data, actor, side, go } = usePreview();
  const [booking, setBooking] = useState(false);
  const r = data.responses.find((r) => r.id === id);
  // A booking made from a direct conversation keeps talking there.
  const direct = (data.threads ?? []).find((t) => t.id === (r?.thread || id));
  if (direct) return <DirectThread id={direct.id} />;
  const s = data.shifts.find((s) => s.id === r?.shift);
  if (!r || !s || !r.chat || ![s.venue, r.talent].includes(actor))
    return <PrivateThread />;
  const other = member(data, side === "venue" ? r.talent : s.venue);
  return (
    <>
      <Conversation
        id={id}
        other={other}
        pinned={
          <div className="pv-chat-pinned">
            <span>
              <strong>
                {side === "talent"
                  ? s.roles.find((role) => member(data, actor).roles.includes(role)) ||
                    shiftLabel(s)
                  : shiftLabel(s)}
              </strong>
              <small>
                {datesLabel(offeredDates(s, r))} · {s.days[0].start}–
                {s.days[0].end} · £{s.rate}/h
              </small>
            </span>
            {side === "venue" && r.status === "can-cover" && s.status === "open" ? (
              <Button onClick={() => setBooking(true)}>
                Book {firstName(other)}
              </Button>
            ) : side === "talent" && r.status === "invited" && s.status === "open" ? (
              <Button onClick={() => go(`shift/${s.id}`)}>Accept or decline</Button>
            ) : r.status === "booked" ? (
              <Button
                variant="secondary"
                onClick={() =>
                  go(
                    `booking/${data.bookings.find((b) => b.shift === s.id && b.talent === r.talent && !b.cancelled)?.id}`,
                  )
                }
              >
                Booked · details
              </Button>
            ) : (
              <button className="pv-text-link" onClick={() => go(`shift/${s.id}`)}>
                {side === "talent" && r.status === "can-cover"
                  ? "Waiting · view shift"
                  : "View shift"}
              </button>
            )}
          </div>
        }
      />
      {booking && (
        <BookConfirm
          shift={s}
          talent={r.talent}
          onClose={() => setBooking(false)}
        />
      )}
    </>
  );
}
function PrivateThread() {
  const { go } = usePreview();
  return (
    <Empty
      title="This conversation is private"
      text="Open an available thread from your inbox."
    ><Button onClick={() => go("messages")}>Back to messages</Button></Empty>
  );
}
// A conversation with no shift behind it. The venue books with a card.
function DirectThread({ id }: { id: string }) {
  const { data, actor, side } = usePreview();
  const [offering, setOffering] = useState(false);
  const t = (data.threads ?? []).find((t) => t.id === id)!;
  if (![t.venue, t.talent].includes(actor)) return <PrivateThread />;
  const other = member(data, side === "venue" ? t.talent : t.venue);
  const offer = currentOffer(data, id);
  return (
    <>
      <Conversation
        id={id}
        other={other}
        pinned={
          <div className="pv-chat-pinned">
            <span>
              <strong>
                {offer
                  ? `${offer.role} · ${
                      offer.status === "accepted"
                        ? "Booked"
                        : offer.status === "sent"
                          ? "Waiting for an answer"
                          : offer.status === "changes"
                            ? "Changes asked"
                            : "Declined"
                    }`
                  : side === "venue"
                    ? `${firstName(other)} · ${other.minRate ? `from £${other.minRate}/h` : "minimum pay not set"}`
                    : `${other.name} · ${areaOf(other)}`}
              </strong>
              <small>
                {offer
                  ? `${datesLabel(offer.dates)} · ${offer.start}–${offer.end} · £${offer.rate}/h`
                  : ""}
              </small>
            </span>
            {side === "venue" && (
              <Button
                variant={offer?.status === "sent" ? "secondary" : "primary"}
                onClick={() => setOffering(true)}
              >
                {offer?.status === "changes"
                  ? "Send revised booking"
                  : offer?.status === "sent"
                    ? "Revise booking"
                    : "Send booking request"}
              </Button>
            )}
          </div>
        }
      />
      {offering && <OfferForm thread={id} onClose={() => setOffering(false)} />}
    </>
  );
}
function Conversation({
  id,
  other,
  pinned,
}: {
  id: string;
  other: Member;
  pinned: React.ReactNode;
}) {
  const { data, actor, go, act } = usePreview();
  const conversation = useRef<HTMLDivElement>(null);
  const messageList = useRef<HTMLDivElement>(null);
  const messageInput = useRef<HTMLTextAreaElement>(null);
  const messages = data.messages.filter((m) => m.response === id);
  const last = messages.at(-1)?.id;
  const text = data.messageDrafts[`${actor}/${id}`] || "";
  useEffect(() => {
    if (messageList.current) messageList.current.scrollTop = messageList.current.scrollHeight;
  }, [last]);
  useEffect(() => {
    const input = messageInput.current;
    if (input) {
      input.style.height = "auto";
      input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
    }
  }, [text]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const resize = () => {
      conversation.current?.style.setProperty("--pv-chat-height", `${viewport?.height ?? window.innerHeight}px`);
      conversation.current?.style.setProperty("--pv-chat-top", `${viewport?.offsetTop ?? 0}px`);
    };
    resize();
    viewport?.addEventListener("resize", resize);
    viewport?.addEventListener("scroll", resize);
    window.addEventListener("resize", resize);
    return () => {
      viewport?.removeEventListener("resize", resize);
      viewport?.removeEventListener("scroll", resize);
      window.removeEventListener("resize", resize);
    };
  }, []);
  useEffect(() => {
    act({ type: "read-chat", actor, response: id });
  }, [actor, id, last, act]); // Read only this thread, not the whole inbox.
  return (
    <div className="pv-conversation" ref={conversation}>
      <header className="pv-conversation-header">
        <button className="pv-icon-button" aria-label="Back to messages" onClick={() => go("messages")}><ArrowLeftIcon size={22} /></button>
        <ProfilePhoto person={other} />
        <div className="pv-conversation-person">
          <h1><ProfileName person={other} /></h1>
          <button className="pv-text-link" onClick={() => go(`${other.side}/${other.id}`)}>View public profile</button>
        </div>
      </header>
      <div className="pv-chat-layout">
        <div className="pv-chat-room">
          {pinned}
          <div className="pv-chat-messages" ref={messageList} aria-live="polite" role="log" aria-label="Conversation messages">
            {messages.length ? (
              messages.map((m) => {
                const offer = m.offer && (data.offers ?? []).find((o) => o.id === m.offer);
                return offer ? (
                  <OfferCard key={m.id} offer={offer} mine={m.from === actor} />
                ) : m.system ? (
                  <div className="pv-system-message" key={m.id}>
                    {m.text}
                  </div>
                ) : (
                  <div
                    key={m.id}
                    className={`pv-message ${m.from === actor ? "from-me" : ""}`}
                  >
                    <small>{member(data, m.from).name}</small>
                    <p>{m.text}</p>
                    <small>{clockLabel(m.time)} · Sent</small>
                  </div>
                );
              })
            ) : (
              <p className="pv-muted pv-chat-empty">
                No messages yet.
              </p>
            )}
          </div>
          <form
            className="pv-chat-composer"
            onSubmit={(e) => {
              e.preventDefault();
              act({ type: "message", actor, response: id, text });
            }}
          >
            <label className="pv-sr-only" htmlFor="chat-message">
              Your message
            </label>
            <textarea
              ref={messageInput}
              id="chat-message"
              rows={1}
              placeholder="Write a message…"
              value={text}
              onChange={(e) =>
                act({
                  type: "draft-message",
                  actor,
                  response: id,
                  text: e.target.value,
                })
              }
            />
            <Button type="submit" disabled={!text.trim() || data.offline} aria-label="Send message">
              <SendIcon size={20} />
            </Button>
          </form>
          {data.offline && (
            <p className="pv-error">
              Offline. Your draft is kept; reconnect to send.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
export function Notifications() {
  const { data, actor, act, go } = usePreview();
  const notices = data.notices.filter((n) => n.to === actor);
  return (
    <>
      <Heading
        title="Texts"
        description="Preview only: the SMS messages this account would have received."
      >
        <Button
          variant="secondary"
          onClick={() => act({ type: "read-notice", actor })}
        >
          Mark all read
        </Button>
      </Heading>
      {notices.length ? (
        <div className="pv-notification-list">
          {notices.map((n) => (
            <button
              key={n.id}
              className={`pv-notification ${n.read ? "" : "unread"}`}
              onClick={() => {
                act({ type: "read-notice", actor, id: n.id });
                go(n.target);
              }}
            >
              <span className={n.read ? "pv-read-dot" : "pv-unread-dot"} />
              <div>
                <h2>{n.title}</h2>
                <p>{n.text}</p>
                <small>{clockLabel(n.time)} · London</small>
              </div>
              <span>View</span>
            </button>
          ))}
        </div>
      ) : (
        <Empty
          title="You’re all caught up"
        />
      )}
    </>
  );
}
export function AvailabilityEditor({ back }: { back?: string }) {
  const { data, actor, act, go } = usePreview();
  const today = londonDate(data.now);
  const dates = Array.from({ length: 14 }, (_, i) => datePlus(today, i));
  const [selected, setSelected] = useState<string[]>([today]);
  const [kind, setKind] = useState("Hours");
  const [start, setStart] = useState("16:00");
  const [end, setEnd] = useState("23:59");
  function select(d: string) {
    setSelected([d]);
    const a = data.availability.find((a) => a.member === actor && a.date === d);
    if (a) {
      setKind(
        a.kind === "not-free"
          ? "Not free"
          : a.start === "00:00" && a.end === "00:00"
            ? "All day"
            : "Hours",
      );
      setStart(a.start);
      setEnd(a.end);
    }
  }
  const booked = data.bookings
    .filter((b) => b.talent === actor && !b.cancelled)
    .flatMap((b) =>
      bookingServices(data, b).map((d) => ({
          ...d,
          venue: data.shifts.find((s) => s.id === b.shift)!.venue,
          booking: b.id,
        })),
    );
  return (
    <>
      <Heading
        title="When are you free?"
        back={back}
      />
      <div className="pv-availability-layout">
        <div>
          <div className="pv-date-grid">
            {dates.map((d) => {
              const a = data.availability.find(
                (a) => a.member === actor && a.date === d,
              );
              const b = booked.find(
                (b) =>
                  b.date === d ||
                  (b.end < b.start && datePlus(b.date, 1) === d),
              );
              return (
                <button
                  key={d}
                  className={`${selected.includes(d) ? "selected" : ""} ${a?.kind === "free" ? "free" : ""}`}
                  onClick={() => select(d)}
                >
                  <span>{displayDate(d).slice(0, 3)}</span>
                  <strong>{Number(d.slice(-2))}</strong>
                  <small>
                    {b
                      ? `Booked · ${member(data, b.venue).name}`
                      : a?.kind === "not-free"
                        ? "Not free"
                        : a
                          ? `${a.start}–${a.end}`
                          : "Not set"}
                  </small>
                </button>
              );
            })}
          </div>
          <h2 className="pv-section-title">Your confirmed time</h2>
          {booked.filter((b) => b.to > data.now).length ? (
            booked
              .filter((b) => b.to > data.now)
              .map((b) => (
                <button
                  key={`${b.booking}-${b.date}`}
                  className="pv-booked-window"
                  onClick={() => go(`booking/${b.booking}`)}
                >
                  <Badge good>Booked</Badge>
                  <span>
                    {serviceLabel(b)} · {member(data, b.venue).name}
                  </span>
                  <span>View booking</span>
                </button>
              ))
          ) : (
            <p>No upcoming commitments.</p>
          )}
        </div>
        <div className="pv-availability-form">
          <h2>
            {selected.length === 1
              ? displayDate(selected[0])
              : `${selected.length} selected dates`}
          </h2>
          <div className="pv-chips">
            {["All day", "Hours", "Not free"].map((k) => (
              <button
                key={k}
                className={kind === k ? "selected" : ""}
                onClick={() => {
                  setKind(k);
                  if (k === "Hours" && start === end) {
                    setStart("16:00");
                    setEnd("23:59");
                  }
                }}
              >
                {k === "All day"
                  ? "Free all day"
                  : k === "Hours"
                    ? "Free from–to"
                    : k}
              </button>
            ))}
          </div>
          {kind === "Hours" && (
            <div className="pv-form-grid">
              <Field label="From">
                <input
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </Field>
              <Field label="To">
                <input
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </Field>
            </div>
          )}
          <h3>Copy to other dates</h3>
          <div className="pv-copy-dates">
            {dates.map((d) => (
              <label className="pv-check" key={d}>
                <input
                  type="checkbox"
                  checked={selected.includes(d)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, d]
                        : selected.filter((x) => x !== d),
                    )
                  }
                />
                {displayDate(d)}
              </label>
            ))}
          </div>
          <Button
            disabled={!selected.length}
            onClick={() => {
              if (kind === "All day") {
                // Represent a full day as an explicit midnight-to-midnight overnight interval.
                act(
                  {
                    type: "availability",
                    actor,
                    dates: selected,
                    kind: "free",
                    start: "00:00",
                    end: "00:00",
                  },
                  "Availability saved.",
                );
              } else
                act(
                  {
                    type: "availability",
                    actor,
                    dates: selected,
                    kind: kind === "Not free" ? "not-free" : "free",
                    start,
                    end,
                  },
                  "Availability saved.",
                );
            }}
          >
            Save availability
          </Button>
        </div>
      </div>
    </>
  );
}
export function TalentProfile({ id }: { id: string }) {
  const { data, actor, side, go, act, profileBack } = usePreview();
  const message = useMessage();
  const t = member(data, id);
  if (!t || t.side !== "talent")
    return (
      <Empty title="Member not found" text="Return to your selected roles." />
    );
  const days = (() => {
    if (!data.draft) return [];
    try {
      return makeDays(data.draft as ShiftDraft);
    } catch {
      return [];
    }
  })();
  return (
    <>
      <Heading
        title={t.name}
        description={`${t.roles.join(" · ")} · ${areaOf(t)}`}
        back={profileBack}
      />
      <div className="pv-profile-hero">
        <Photo src={t.photo} alt={t.name} />
        <div>
          {workedWith(data, actor, t.id) && <Badge good>Worked with you</Badge>}
          {t.bio && <p>{t.bio}</p>}
          {allSkills(t).length > 0 && (
            <div className="pv-chips">
              {allSkills(t).map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          )}
          <dl className="pv-profile-info">
            <div>
              <dt>Minimum pay</dt>
              <dd>{t.minRate ? `£${t.minRate} per hour` : "Not set"}</dd>
            </div>
          </dl>
          {side === "venue" && actor !== id && !(data.draft && /^(new|compose)\//.test(profileBack)) && (
            <div className="pv-actions">
              <Button onClick={() => message(id)}>Message {firstName(t)}</Button>
            </div>
          )}
          {data.draft && /^(new|compose)\//.test(profileBack) && (
            <>
              <p>Inviting for {data.draft.roles?.join(" or ")}.</p>
              {days.map((d) => (
                <p key={d.date}>{serviceLabel(d)}</p>
              ))}
              <Button
                onClick={() => {
                  act({
                    type: "save-draft",
                    actor,
                    draft: {
                      ...data.draft,
                      mode: "invite",
                      invitees: [
                        ...new Set([...(data.draft!.invitees || []), id]),
                      ],
                    },
                  });
                  go(profileBack);
                }}
              >
                Choose {t.name.split(" ")[0]} to invite
              </Button>
            </>
          )}
        </div>
      </div>
      <h2 className="pv-section-title">Published availability</h2>
      <div className="pv-chips">
        {data.availability
          .filter(
            (a) =>
              a.member === id &&
              a.kind === "free" &&
              a.date >= londonDate(data.now),
          )
          .slice(0, 7)
          .map((a) => (
            <span key={a.date}>
              {displayDate(a.date)} · {a.start}–{a.end}
            </span>
          ))}
      </div>
      {!data.availability.some((a) => a.member === id && a.kind === "free") && (
        <p className="pv-muted">Availability not set</p>
      )}
    </>
  );
}
export function Chips({
  options,
  selected,
  onChange,
  max,
}: {
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  max?: number;
}) {
  return (
    <div className="pv-chips">
      {options.map((o) => {
        const on = selected.includes(o);
        return (
          <button
            key={o}
            className={on ? "selected" : ""}
            aria-pressed={on}
            disabled={!on && !!max && selected.length >= max}
            onClick={() =>
              onChange(on ? selected.filter((x) => x !== o) : [...selected, o])
            }
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
function VenueFacts({ v }: { v: Member }) {
  const d = v.venue;
  if (!d) return null;
  const kind = [...d.types, ...d.cuisines].join(" · ");
  return (
    <div className="pv-venue-facts">
      {kind && <p className="pv-role-line">{kind}</p>}
      {d.knownFor.length > 0 && (
        <div className="pv-chips">
          {d.knownFor.map((k) => (
            <span key={k}>{k}</span>
          ))}
        </div>
      )}
      {(d.website || d.instagram) && (
        <p className="pv-links">
          {d.website && (
            <a href={`https://${d.website.replace(/^https?:\/\//, "")}`} target="_blank" rel="noreferrer">
              {d.website.replace(/^https?:\/\//, "")}
            </a>
          )}
          {d.instagram && (
            <a
              href={`https://instagram.com/${d.instagram.replace(/^@/, "")}`}
              target="_blank"
              rel="noreferrer"
            >
              {d.instagram}
            </a>
          )}
        </p>
      )}
    </div>
  );
}
export { VenueFacts };
export function Profile() {
  const { actor, me, side, act, toast } = usePreview();
  const [form, setForm] = useState<Member>(() => structuredClone(me!));
  const [custom, setCustom] = useState("");
  const [edit, setEdit] = useState(false);
  const v = form.venue;
  function setVenue(patch: Partial<NonNullable<Member["venue"]>>) {
    setForm({ ...form, venue: { ...form.venue!, ...patch } });
  }
  function save() {
    if (!form.name.trim()) return toast("Add a name.");
    if (!form.postcode.trim()) return toast("Add a postcode.");
    if (side === "talent" && !form.roles.length)
      return toast("Choose at least one position.");
    const patch =
      side === "talent"
        ? {
            name: form.name,
            bio: form.bio,
            phone: form.phone,
            email: form.email,
            postcode: form.postcode,
            roles: form.roles,
            skills: form.skills,
            customSkills: form.customSkills,
            alert: form.alert,
            minRate: form.minRate,
          }
        : {
            name: form.name,
            bio: form.bio,
            phone: form.phone,
            email: form.email,
            postcode: form.postcode,
            venue: form.venue,
          };
    if (act({ type: "profile", actor, patch }, "Profile saved.")) setEdit(false);
  }
  const d = me!.venue;
  return (
    <>
      <Heading
        title={edit ? "Edit profile" : me!.name}
        description={
          side === "talent"
            ? `${me!.roles.join(" · ")} · ${areaOf(me!)}`
            : areaOf(me!)
        }
      />
      <div className="pv-profile-layout">
        <aside>
          <Photo src={me!.photo} alt={me!.name} className="pv-detail-photo" />
          {!me!.approved && <Badge>Waiting for approval</Badge>}
        </aside>
        <div>
          {!edit ? (
            <>
              {me!.bio ? <p>{me!.bio}</p> : <p className="pv-muted">No bio yet.</p>}
              {side === "talent" ? (
                allSkills(me!).length > 0 && (
                  <div className="pv-chips">
                    {allSkills(me!).map((s) => (
                      <span key={s}>{s}</span>
                    ))}
                  </div>
                )
              ) : (
                <VenueFacts v={me!} />
              )}
              <dl className="pv-profile-info">
                <div>
                  <dt>Phone</dt>
                  <dd>{me!.phone}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{me!.email}</dd>
                </div>
                {side === "talent" ? (
                  <>
                    <div>
                      <dt>Postcode</dt>
                      <dd>{me!.postcode}</dd>
                    </div>
                    <div>
                      <dt>Minimum pay</dt>
                      <dd>{me!.minRate ? `£${me!.minRate} per hour` : "Not set"}</dd>
                    </div>
                    <div>
                      <dt>Shift alerts</dt>
                      <dd>
                        {me!.alert === "all"
                          ? "All shifts in your positions"
                          : me!.alert === "soon"
                            ? "Today and tomorrow only"
                            : "Off"}
                      </dd>
                    </div>
                  </>
                ) : (
                  d && (
                    <>
                      <div>
                        <dt>Address</dt>
                        <dd>{fullAddress(me!)}</dd>
                      </div>
                      <div>
                        <dt>On-site contact</dt>
                        <dd>{contactLine(me!)}</dd>
                      </div>
                      <div>
                        <dt>Teams you usually need</dt>
                        <dd>{d.teamsNeeded.join(" · ") || "Not set"}</dd>
                      </div>
                      <div>
                        <dt>New shifts start with</dt>
                        <dd>
                          Kitchen and pastry £{d.rateChef}/h · Front of house £{d.rateFoh}/h
                          <br />
                          {defaultNote(me!)}
                        </dd>
                      </div>
                      <div>
                        <dt>Vacancies in a typical week</dt>
                        <dd>{d.vacancies}</dd>
                      </div>
                    </>
                  )
                )}
              </dl>
              <Button
                onClick={() => {
                  setForm(structuredClone(me!));
                  setEdit(true);
                }}
              >
                Edit profile
              </Button>
            </>
          ) : (
            <>
              <Field label={side === "venue" ? "Venue name" : "Name"}>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field label={`Bio · ${form.bio.length}/250`}>
                <textarea
                  rows={4}
                  maxLength={250}
                  value={form.bio}
                  placeholder={
                    side === "talent"
                      ? "e.g. 8 years on grill. Ex-Core by Clare Smyth. Calm on a busy pass."
                      : "What it’s like to work your room."
                  }
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </Field>
              <Field label="Phone">
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
              <Field label="Email">
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              {side === "venue" && v && (
                <Field label="Street address">
                  <input value={v.address} onChange={(e) => setVenue({ address: e.target.value })} />
                </Field>
              )}
              <Field label={side === "venue" ? "Postcode" : "Home postcode"}>
                <input value={form.postcode} onChange={(e) => setForm({ ...form, postcode: e.target.value })} />
              </Field>
              {side === "talent" ? (
                <>
                  <h3>Positions</h3>
                  {TEAM_NAMES.map((team) => (
                    <div key={team}>
                      <h4>{team}</h4>
                      <Chips
                        options={TEAMS[team]}
                        selected={form.roles}
                        onChange={(roles) => setForm({ ...form, roles })}
                      />
                    </div>
                  ))}
                  <h3>Skills</h3>
                  {Object.entries(SKILL_GROUPS).map(([group, list]) => (
                    <div key={group}>
                      <h4>{group}</h4>
                      <Chips
                        options={list}
                        selected={form.skills}
                        onChange={(skills) => setForm({ ...form, skills })}
                      />
                    </div>
                  ))}
                  {form.customSkills.length > 0 && (
                    <Chips
                      options={form.customSkills}
                      selected={form.customSkills}
                      onChange={(customSkills) => setForm({ ...form, customSkills })}
                    />
                  )}
                  <div className="pv-inline">
                    <Field label="Add your own skill">
                      <input maxLength={80} value={custom} onChange={(e) => setCustom(e.target.value)} />
                    </Field>
                    <Button
                      variant="secondary"
                      disabled={!custom.trim()}
                      onClick={() => {
                        setForm({
                          ...form,
                          customSkills: addCustomSkill(form.customSkills, custom, form.skills),
                        });
                        setCustom("");
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <Field label="Minimum pay · £ per hour">
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={form.minRate ?? ""}
                      onChange={(e) =>
                        setForm({ ...form, minRate: e.target.value ? Number(e.target.value) : undefined })
                      }
                    />
                  </Field>
                  <Field label="Shift alerts">
                    <select
                      value={form.alert}
                      onChange={(e) => setForm({ ...form, alert: e.target.value as Member["alert"] })}
                    >
                      {SHIFT_ALERTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </Field>
                </>
              ) : (
                v && (
                  <>
                    <div className="pv-form-grid">
                      <Field label="On-site contact name">
                        <input value={v.contactName} onChange={(e) => setVenue({ contactName: e.target.value })} />
                      </Field>
                      <Field label="Their role">
                        <input value={v.contactRole} onChange={(e) => setVenue({ contactRole: e.target.value })} />
                      </Field>
                    </div>
                    <h3>Venue type</h3>
                    <Chips options={VENUE_TYPES} selected={v.types} onChange={(types) => setVenue({ types })} />
                    <h3>Cuisine</h3>
                    <Chips options={CUISINES} selected={v.cuisines} onChange={(cuisines) => setVenue({ cuisines })} />
                    <div className="pv-form-grid">
                      <Field label="Covers">
                        <select value={v.covers} onChange={(e) => setVenue({ covers: e.target.value })}>
                          {COVERS_BANDS.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Team size">
                        <input type="number" min={0} value={v.teamSize} onChange={(e) => setVenue({ teamSize: Number(e.target.value) })} />
                      </Field>
                      <Field label="Website">
                        <input value={v.website} onChange={(e) => setVenue({ website: e.target.value })} />
                      </Field>
                      <Field label="Instagram">
                        <input value={v.instagram} onChange={(e) => setVenue({ instagram: e.target.value })} />
                      </Field>
                    </div>
                    <h3>Known for · up to 3</h3>
                    <Chips options={VENUE_KNOWN_FOR} selected={v.knownFor} max={3} onChange={(knownFor) => setVenue({ knownFor })} />
                    <h3>Teams you usually need</h3>
                    <Chips options={TEAM_NAMES} selected={v.teamsNeeded} onChange={(teamsNeeded) => setVenue({ teamsNeeded })} />
                    <h3>New shifts start with</h3>
                    <div className="pv-form-grid">
                      <Field label="Kitchen and pastry · £ per hour">
                        <input type="number" min={0} value={v.rateChef} onChange={(e) => setVenue({ rateChef: Number(e.target.value) })} />
                      </Field>
                      <Field label="Front of house · £ per hour">
                        <input type="number" min={0} value={v.rateFoh} onChange={(e) => setVenue({ rateFoh: Number(e.target.value) })} />
                      </Field>
                      <Field label="Dress code">
                        <select value={v.dressCode} onChange={(e) => setVenue({ dressCode: e.target.value })}>
                          {DRESS_CODES.map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Vacancies in a typical week">
                        <input type="number" min={0} value={v.vacancies} onChange={(e) => setVenue({ vacancies: Number(e.target.value) })} />
                      </Field>
                    </div>
                    <label className="pv-check">
                      <input type="checkbox" checked={v.uniform} onChange={(e) => setVenue({ uniform: e.target.checked })} /> Uniform provided
                    </label>
                    <label className="pv-check">
                      <input type="checkbox" checked={v.staffMeal} onChange={(e) => setVenue({ staffMeal: e.target.checked })} /> Staff meal
                    </label>
                  </>
                )
              )}
              <div className="pv-actions">
                <Button onClick={save}>Save profile</Button>
                <Button variant="quiet" onClick={() => setEdit(false)}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
