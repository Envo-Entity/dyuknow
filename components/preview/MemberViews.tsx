"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeftIcon, CheckIcon, SendIcon } from "@/components/icons";
import {
  TEAMS,
  TEAM_NAMES,
  SKILL_GROUPS,
  VENUE_TYPES,
  CUISINES,
  COVERS_BANDS,
  DRESS_CODES,
  VENUE_KNOWN_FOR,
} from "@/lib/catalogue";
import { addCustomSkill } from "@/lib/onboardingModel";
import {
  clockLabel,
  allSkills,
  contactLine,
  defaultNote,
  fullAddress,
  hoursOf,
  workedWith,
  member,
  shiftLabel,
  unreadChat,
  datePlus,
  displayDate,
  londonDate,
  serviceLabel,
  bookingServices,
  bookableDates,
  datesLabel,
  firstName,
  offeredDates,
  responseLabel,
  verifiedDocs,
  type Data,
  type Member,
  type Message,
  type Shift,
  areaOf,
} from "@/lib/preview/model";
import { usePreview } from "./context";
import { Badge, Button, Empty, Field, Heading, Photo, ProfilePhoto, ProfileName } from "./ui";
import { BookConfirm } from "./ShiftDetail";
import { DatePicker, TimeSelect, familyOf, useMessage } from "./Booking";
// The latest shift card in a conversation: what the pair is talking about.
function latestShift(data: Data, thread: string) {
  const id = data.messages.findLast((m) => m.thread === thread && m.shift)?.shift;
  return data.shifts.find((s) => s.id === id);
}
export function Messages() {
  const { data, actor, side, go } = usePreview();
  // Most recent conversation first; messages are stored in the order sent.
  const lastIndex = (id: string) =>
    data.messages.findLastIndex((m) => m.thread === id);
  const rows = data.threads
    .filter((t) => (side === "venue" ? t.venue : t.talent) === actor)
    .map((t) => {
      const s = latestShift(data, t.id);
      const r = s && data.responses.find((r) => r.shift === s.id && r.talent === t.talent);
      return {
        id: t.id,
        other: member(data, side === "venue" ? t.talent : t.venue),
        about: s ? `${shiftLabel(s)} · ${datesLabel(s.days.map((d) => d.date))}` : "Message",
        status: r ? responseLabel(r) : "",
        good: r?.status === "booked",
        attention: side === "talent" ? r?.status === "invited" : r?.status === "can-cover",
      };
    })
    .sort((a, b) => lastIndex(b.id) - lastIndex(a.id));
  return (
    <>
      <Heading
        title="Messages"
      />
      {rows.length ? (
        <div className="pv-thread-list">
          {rows.map((row) => {
            const last = data.messages.filter((m) => m.thread === row.id).at(-1);
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
                    {last?.text || "No messages yet"}
                  </button>
                </div>
                {row.status ? <Badge good={row.good} attention={row.attention}>{row.status}</Badge> : <span />}
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
            {side === "venue" ? "Find people" : "See open jobs"}
          </Button>
        </Empty>
      )}
    </>
  );
}
// The one conversation between a venue and a talent member.
export function Thread({ id }: { id: string }) {
  const { data, actor, side, go } = usePreview();
  const t = data.threads.find((t) => t.id === id);
  if (!t || ![t.venue, t.talent].includes(actor))
    return (
      <Empty
        title="This conversation is private"
        text="Open an available thread from your inbox."
      >
        <Button onClick={() => go("messages")}>Back to messages</Button>
      </Empty>
    );
  const other = member(data, side === "venue" ? t.talent : t.venue);
  return (
    <Conversation
      id={id}
      other={other}
      pinned={
        <div className="pv-chat-pinned">
          <span>
            <strong>
              {side === "venue"
                ? `${firstName(other)} · ${other.minRate ? `from £${other.minRate}/h` : "minimum pay not set"}`
                : `${other.name} · ${areaOf(other)}`}
            </strong>
            <small>{other.roles.length ? other.roles.join(" · ") : other.bio}</small>
          </span>
          {side === "venue" && (
            <Button onClick={() => go(`new/${familyOf(other)}/${other.id}`)}>
              Send booking request
            </Button>
          )}
        </div>
      }
    />
  );
}
// A booking request, job post or yes, shown as a card in the conversation.
// The talent answers on the shift; the venue books from the card.
function ShiftMessage({ m, talent }: { m: Message; talent: string }) {
  const { data, actor, side, go } = usePreview();
  const [booking, setBooking] = useState(false);
  const s = data.shifts.find((x) => x.id === m.shift) as Shift | undefined;
  if (!s) return null;
  const venue = member(data, s.venue);
  const person = member(data, talent);
  const r = data.responses.find((r) => r.shift === s.id && r.talent === talent);
  const b = data.bookings.find((b) => b.shift === s.id && b.talent === talent && !b.cancelled);
  const fromTalent = m.from === talent;
  const dates = fromTalent && r ? offeredDates(s, r) : s.days.map((d) => d.date);
  const hours = hoursOf(s.days[0]);
  const open = s.status === "open";
  const status = !r
    ? open ? "Open" : s.status === "filled" ? "Filled" : "Closed"
    : r.status === "invited"
      ? side === "talent" ? "Waiting for you" : `Waiting for ${firstName(person)}`
      : r.status === "can-cover"
        ? side === "venue" ? `${firstName(person)} can do it` : `Waiting for ${venue.name}`
        : responseLabel(r);
  const canBook = side === "venue" && r?.status === "can-cover" && open && bookableDates(data, s, r).length > 0;
  return (
    <div className={`pv-offer ${m.from === actor ? "from-me" : ""} is-${r?.status || s.status}`}>
      <div className="pv-offer-head">
        <small>
          {fromTalent
            ? `${firstName(person)} said yes`
            : s.mode === "request"
              ? `Booking request · ${venue.name}`
              : `Job post · ${venue.name}`}{" "}
          · {clockLabel(m.time)}
        </small>
        <Badge good={r?.status === "booked"} attention={(side === "talent" && r?.status === "invited") || canBook}>
          {status}
        </Badge>
      </div>
      <h3>{shiftLabel(s)}</h3>
      <dl>
        <div>
          <dt>When</dt>
          <dd>
            {datesLabel(dates)} · {s.days[0].start}–{s.days[0].end}
            {dates.length > 1 && <small>{dates.length} days · same hours</small>}
          </dd>
        </div>
        <div>
          <dt>Pay</dt>
          <dd>
            £{s.rate}/hour
            <small>
              About £{Math.round(s.rate * hours * dates.length)} in all · {hours * dates.length} hours
            </small>
          </dd>
        </div>
        {s.note && !fromTalent && (
          <div>
            <dt>Note</dt>
            <dd>{s.note}</dd>
          </div>
        )}
      </dl>
      {canBook ? (
        <Button onClick={() => setBooking(true)}>Book {firstName(person)}</Button>
      ) : b ? (
        <button className="pv-text-link" onClick={() => go(`booking/${b.id}`)}>
          View booking
        </button>
      ) : side === "talent" && r?.status === "invited" && open ? (
        <Button onClick={() => go(`shift/${s.id}`)}>Answer</Button>
      ) : (
        <button className="pv-text-link" onClick={() => go(`shift/${s.id}`)}>
          {s.mode === "request" ? "View request" : "View job post"}
        </button>
      )}
      {booking && <BookConfirm shift={s} talent={talent} onClose={() => setBooking(false)} />}
    </div>
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
  const { data, actor, act, back } = usePreview();
  const conversation = useRef<HTMLDivElement>(null);
  const messageList = useRef<HTMLDivElement>(null);
  const messageInput = useRef<HTMLTextAreaElement>(null);
  const messages = data.messages.filter((m) => m.thread === id);
  const talent = data.threads.find((t) => t.id === id)?.talent || "";
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
    act({ type: "read-chat", actor, thread: id });
  }, [actor, id, last, act]); // Read only this thread, not the whole inbox.
  return (
    <div className="pv-conversation" ref={conversation}>
      <header className="pv-conversation-header">
        <button className="pv-icon-button" aria-label="Back" onClick={() => back("messages")}><ArrowLeftIcon size={22} /></button>
        <ProfilePhoto person={other} />
        <div className="pv-conversation-person">
          <h1><ProfileName person={other} /></h1>
        </div>
      </header>
      <div className="pv-chat-layout">
        <div className="pv-chat-room">
          {pinned}
          <div className="pv-chat-messages" ref={messageList} aria-live="polite" role="log" aria-label="Conversation messages">
            {messages.length ? (
              messages.map((m) => {
                if (m.shift) return <ShiftMessage key={m.id} m={m} talent={talent} />;
                return m.system ? (
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
                    <small>{clockLabel(m.time)}</small>
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
              act({ type: "message", actor, thread: id, text });
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
                  thread: id,
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
  const [selected, setSelected] = useState<string[]>([today]);
  const [kind, setKind] = useState("Hours");
  const [start, setStart] = useState("16:00");
  const [end, setEnd] = useState("23:59");
  const mark = (d: string) =>
    data.availability.find((a) => a.member === actor && a.date === d);
  // Choosing a first day shows what it's already set to.
  function choose(dates: string[]) {
    const added = dates.find((d) => !selected.includes(d));
    setSelected(dates);
    const a = added && !selected.length ? mark(added) : undefined;
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
  const bookedOn = (d: string) =>
    booked.find((b) => b.date === d || (b.end < b.start && datePlus(b.date, 1) === d));
  return (
    <>
      <Heading
        title="When are you free?"
        back={back}
      />
      <div className="pv-availability-layout">
        <div>
          <DatePicker
            value={selected}
            onChange={choose}
            size="large"
            note={(d) => {
              const a = mark(d);
              const b = bookedOn(d);
              return b
                ? `Booked · ${member(data, b.venue).name}`
                : a?.kind === "not-free"
                  ? "Not free"
                  : a
                    ? `${a.start}–${a.end}`
                    : "Not set";
            }}
            tone={(d) => mark(d)?.kind}
          />
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
            {!selected.length
              ? "Choose days"
              : selected.length === 1
                ? displayDate(selected[0])
                : `${selected.length} days`}
          </h2>
          {selected.length > 1 && <p className="pv-muted">{datesLabel(selected)}</p>}
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
            <div className="pv-time-pair">
              <TimeSelect label="From" value={start} onChange={setStart} />
              <TimeSelect label="To" value={end} onChange={setEnd} />
            </div>
          )}
          <Button
            disabled={!selected.length}
            onClick={() =>
              act(
                {
                  type: "availability",
                  actor,
                  dates: selected,
                  kind: kind === "Not free" ? "not-free" : "free",
                  // A full day is an explicit midnight-to-midnight interval.
                  start: kind === "All day" ? "00:00" : start,
                  end: kind === "All day" ? "00:00" : end,
                },
                "Availability saved.",
              )
            }
          >
            Save {selected.length > 1 ? `${selected.length} days` : "availability"}
          </Button>
        </div>
      </div>
    </>
  );
}
export function TalentProfile({ id }: { id: string }) {
  const { data, actor, side, go, profileBack } = usePreview();
  const message = useMessage();
  const t = member(data, id);
  if (!t || t.side !== "talent")
    return (
      <Empty title="Member not found" text="Return to your selected roles." />
    );
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
          <Verified m={t} />
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
          {side === "venue" && (
            <div className="pv-actions">
              <Button onClick={() => go(`new/${familyOf(t)}/${t.id}`)}>Send booking request</Button>
              <Button variant="secondary" onClick={() => message(id)}>Message {firstName(t)}</Button>
            </div>
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
  const { actor, me, side, act, toast, go } = usePreview();
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
              <Verified m={me!} />
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
              <div className="pv-actions">
                <Button
                  onClick={() => {
                    setForm(structuredClone(me!));
                    setEdit(true);
                  }}
                >
                  Edit profile
                </Button>
                <Button variant="secondary" onClick={() => go(`${side}/${actor}`)}>
                  See it as {side === "talent" ? "a venue" : "talent"} does
                </Button>
              </div>
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

// Which documents Dyuknow has checked: ticks on a public profile.
export function Verified({ m }: { m: Member }) {
  const docs = verifiedDocs(m);
  if (!docs.length) return null;
  return (
    <p className="pv-verified">
      <CheckIcon size={12} />
      Verified by Dyuknow · {docs.join(" · ")}
    </p>
  );
}
