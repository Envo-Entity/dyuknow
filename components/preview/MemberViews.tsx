"use client";
import { useEffect, useState } from "react";
import {
  FAMILIES,
  SKILLS,
  clockLabel,
  member,
  shiftLabel,
  unreadChat,
  datePlus,
  displayDate,
  londonDate,
  serviceLabel,
  type Member,
} from "@/lib/preview/model";
import { usePreview } from "./context";
import { Badge, Button, Empty, Field, Heading, Photo, Services } from "./ui";
export function Messages() {
  const { data, actor, side, go } = usePreview();
  const threads = data.responses.filter(
    (r) =>
      r.chat &&
      (side === "venue"
        ? data.shifts.find((s) => s.id === r.shift)!.venue === actor
        : r.talent === actor),
  );
  return (
    <>
      <Heading
        title="Messages"
        description="A separate conversation for each shift and person. Terms stay pinned; chat never changes an agreement."
      />
      {threads.length ? (
        <div className="pv-thread-list">
          {threads.map((r) => {
            const s = data.shifts.find((s) => s.id === r.shift)!;
            const other = member(data, side === "venue" ? r.talent : s.venue);
            const messages = data.messages.filter((m) => m.response === r.id);
            const last = messages.at(-1);
            return (
              <button
                key={r.id}
                className="pv-thread-row"
                onClick={() => go(`chat/${r.id}`)}
              >
                <Photo src={other.photo} />
                <div>
                  <h2>
                    {other.name}
                    {unreadChat(data, actor, r) && (
                      <span
                        className="pv-unread-dot"
                        aria-label="Unread messages"
                      />
                    )}
                  </h2>
                  <p>
                    {shiftLabel(s)} · {displayDate(s.days[0].date)}
                  </p>
                  <small>
                    {last?.text || "Your conversation starts here."}
                  </small>
                </div>
                <Badge good={r.status === "booked"}>
                  {r.status === "booked"
                    ? "Booked"
                    : r.status === "invited"
                      ? "Invite waiting"
                      : r.status === "can-cover"
                        ? "Can cover"
                        : r.status.replaceAll("-", " ")}
                </Badge>
              </button>
            );
          })}
        </div>
      ) : (
        <Empty
          title="Your next conversation starts with a shift"
          text={
            side === "venue"
              ? "Post a shift, then message a person who responds. An invitation also opens a thread immediately."
              : "Respond to a shift and the venue can message you. Personal invitations include a Message button from the start."
          }
        >
          <Button onClick={() => go("home")}>
            {side === "venue" ? "Post a shift" : "Explore shifts"}
          </Button>
        </Empty>
      )}
    </>
  );
}
export function Thread({ id }: { id: string }) {
  const { data, actor, side, go, act } = usePreview();
  const r = data.responses.find((r) => r.id === id);
  const s = data.shifts.find((s) => s.id === r?.shift);
  const messages = data.messages.filter((m) => m.response === id);
  const last = messages.at(-1)?.id;
  const canRead = !!r?.chat && !!s && [s.venue, r.talent].includes(actor);
  useEffect(() => {
    if (canRead) act({ type: "read-chat", actor, response: id });
  }, [actor, id, last, canRead, act]); // Read only this thread, not the whole inbox.
  if (!r || !s || !r.chat || ![s.venue, r.talent].includes(actor))
    return (
      <Empty
        title="This conversation is private"
        text="Open an available thread from your inbox."
      />
    );
  const other = member(data, side === "venue" ? r.talent : s.venue);
  const text = data.messageDrafts[`${actor}/${id}`] || "";
  return (
    <>
      <Heading
        title={other.name}
        description={`${shiftLabel(s)} · ${displayDate(s.days[0].date)}`}
        back="messages"
      />
      <div className="pv-chat-layout">
        <aside className="pv-chat-context">
          <Photo src={other.photo} />
          <h2>{shiftLabel(s)}</h2>
          <Services shift={s} />
          <p className="pv-chat-pay">£{s.rate}/hour</p>
          <p>{s.note}</p>
          <Badge good={r.status === "booked"}>
            {r.status === "booked"
              ? "Booked"
              : r.status === "invited"
                ? "Invitation waiting"
                : r.status === "can-cover"
                  ? "Can cover · not booked yet"
                  : r.status.replaceAll("-", " ")}
          </Badge>
          <Button variant="secondary" onClick={() => go(`shift/${s.id}`)}>
            View shift and decision
          </Button>
          <p className="pv-caption">
            Messages don’t change dates, hours or pay. The pinned shift is the
            source of truth.
          </p>
        </aside>
        <div className="pv-chat-room">
          <div className="pv-chat-pinned">
            <strong>{shiftLabel(s)}</strong>
            <span>
              {displayDate(s.days[0].date)} · £{s.rate}/h
            </span>
            <button onClick={() => go(`shift/${s.id}`)}>View terms</button>
          </div>
          <div className="pv-chat-messages" aria-live="polite">
            {messages.length ? (
              messages.map((m) =>
                m.system ? (
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
                ),
              )
            ) : (
              <Empty
                title="Say hello"
                text="Ask about service or share arrival details."
              />
            )}
          </div>
          <form
            className="pv-chat-composer"
            onSubmit={(e) => {
              e.preventDefault();
              act(
                { type: "message", actor, response: id, text },
                "Message sent.",
              );
            }}
          >
            <label className="pv-sr-only" htmlFor="chat-message">
              Your message
            </label>
            <textarea
              id="chat-message"
              rows={2}
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
            <Button type="submit" disabled={!text.trim()}>
              Send
            </Button>
          </form>
          {data.offline && (
            <p className="pv-error">
              Offline. Your draft is kept; reconnect to send.
            </p>
          )}
          <p className="pv-caption">
            To reply from the other side, use Switch account. No automatic
            replies are generated.
          </p>
        </div>
      </div>
    </>
  );
}
export function Notifications() {
  const { data, actor, act, go } = usePreview();
  const notices = data.notices.filter((n) => n.to === actor);
  return (
    <>
      <Heading
        title="Notifications"
        description="Invites, replies and changes to your work, together in one place."
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
          text="New shift activity and messages will appear here."
        />
      )}
    </>
  );
}
export function AvailabilityEditor() {
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
      data.shifts
        .find((s) => s.id === b.shift)!
        .days.map((d) => ({
          ...d,
          venue: data.shifts.find((s) => s.id === b.shift)!.venue,
          booking: b.id,
        })),
    );
  return (
    <>
      <Heading
        title="When are you free?"
        description="Published availability helps venues browse. Shift alerts still reach your roles, even when this isn’t set."
        back="bookings"
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
          <p className="pv-caption">
            Blank means not set. Booked intervals stay blocked even if you mark
            other hours on that day free.
          </p>
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
                  "Availability saved. Venues see the saved hours.",
                );
            }}
          >
            Save availability
          </Button>
          <p className="pv-caption">
            Changing availability never cancels confirmed work. Open a booking
            to cancel it explicitly.
          </p>
        </div>
      </div>
    </>
  );
}
export function TalentProfile({ id }: { id: string }) {
  const { data, actor, go, act } = usePreview();
  const t = member(data, id);
  if (!t || t.side !== "talent")
    return (
      <Empty title="Member not found" text="Return to your selected roles." />
    );
  const days = (() => {
    if (!data.draft) return [];
    try {
      const d = data.draft;
      return Array.from({ length: d.count || 1 }, (_, i) => ({
        date: datePlus(d.date!, i),
        start: d.start!,
        end: d.end!,
        from: "",
        to: "",
      }));
    } catch {
      return [];
    }
  })();
  return (
    <>
      <Heading
        title={t.name}
        description={`${t.roles.join(" · ")} · ${t.area}`}
        back={data.draft ? "new" : "bookings"}
      />
      <div className="pv-profile-hero">
        <Photo src={t.photo} />
        <div>
          <Badge good>Member of Dyuknow</Badge>
          <h2>A little about {t.name.split(" ")[0]}</h2>
          <p>{t.bio}</p>
          <h3>Skills and experience</h3>
          <div className="pv-chips">
            {t.skills.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
          <p>
            Preferred rate: £{t.rate}/hour. A preference; each shift has its own
            agreed rate.
          </p>
          {data.draft && (
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
                  go("new/invite");
                }}
              >
                Choose {t.name.split(" ")[0]} to invite
              </Button>
            </>
          )}
          <p className="pv-caption">
            Profile content and photography are illustrative preview data. There
            are no inferred ratings or qualifications.
          </p>
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
        <p>
          Availability not set. This member can still answer a personal
          invitation.
        </p>
      )}
      <p className="pv-caption">
        You can message a member after they respond to a shift or when you send
        a personal invite.
      </p>
    </>
  );
}
export function Profile() {
  const { actor, me, side, act, toast } = usePreview();
  const [form, setForm] = useState<Member>(() => ({ ...me! }));
  const [custom, setCustom] = useState("");
  const [edit, setEdit] = useState(false);
  function toggle(field: "roles" | "skills", value: string) {
    setForm({
      ...form,
      [field]: form[field].includes(value)
        ? form[field].filter((v) => v !== value)
        : [...form[field], value],
    });
  }
  function save() {
    if (!form.name.trim() || (side === "talent" && !form.roles.length))
      return toast("Add a name and at least one supported role.");
    if (!(form.rate > 0)) return toast("Enter a positive hourly rate.");
    if (
      act(
        { type: "profile", actor, patch: form },
        "Profile saved. Your changes are visible in the preview.",
      )
    )
      setEdit(false);
  }
  return (
    <>
      <Heading
        title={edit ? "Make it yours." : me!.name}
        description={
          side === "talent"
            ? `${me!.roles.join(" · ")} · ${me!.area}`
            : `${me!.area} · London`
        }
      />
      <div className="pv-profile-layout">
        <aside>
          <Photo src={me!.photo} className="pv-detail-photo" />
          <Badge good={me!.approved}>
            {me!.approved ? "Member of Dyuknow" : "Waiting for approval"}
          </Badge>
        </aside>
        <div>
          {!edit ? (
            <>
              <h2>{side === "venue" ? "The room" : "Your public profile"}</h2>
              <p>{me!.bio}</p>
              {side === "talent" && (
                <div className="pv-chips">
                  {me!.skills.map((s) => (
                    <span key={s}>{s}</span>
                  ))}
                </div>
              )}
              <dl className="pv-profile-info">
                <div>
                  <dt>Phone</dt>
                  <dd>{me!.phone}</dd>
                </div>
                <div>
                  <dt>
                    {side === "venue" ? "Default rate" : "Preferred rate"}
                  </dt>
                  <dd>£{me!.rate}/hour</dd>
                </div>
                {side === "venue" ? (
                  <>
                    <div>
                      <dt>Address</dt>
                      <dd>{me!.address}</dd>
                    </div>
                    <div>
                      <dt>On-site contact</dt>
                      <dd>{me!.contact}</dd>
                    </div>
                    <div>
                      <dt>Preparation default</dt>
                      <dd>{me!.note}</dd>
                    </div>
                  </>
                ) : (
                  <div>
                    <dt>Shift alerts</dt>
                    <dd>
                      {me!.alert === "all"
                        ? "All shifts in your roles"
                        : me!.alert === "soon"
                          ? "Today and tomorrow only"
                          : "Off"}
                    </dd>
                  </div>
                )}
              </dl>
              <Button
                onClick={() => {
                  setForm({ ...me! });
                  setEdit(true);
                }}
              >
                Edit profile and {side === "venue" ? "defaults" : "alerts"}
              </Button>
            </>
          ) : (
            <>
              <Field label="Display name">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>
              <Field label="About">
                <textarea
                  rows={4}
                  value={form.bio}
                  onChange={(e) => setForm({ ...form, bio: e.target.value })}
                />
              </Field>
              <Field label="London area">
                <input
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                />
              </Field>
              <Field
                label={
                  side === "venue"
                    ? "Typical hourly rate · £"
                    : "Preferred hourly rate · £"
                }
              >
                <input
                  type="number"
                  min="0.01"
                  value={form.rate}
                  onChange={(e) =>
                    setForm({ ...form, rate: Number(e.target.value) })
                  }
                />
              </Field>
              {side === "venue" ? (
                <>
                  <Field label="Full work address">
                    <input
                      value={form.address}
                      onChange={(e) =>
                        setForm({ ...form, address: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="On-site contact">
                    <input
                      value={form.contact}
                      onChange={(e) =>
                        setForm({ ...form, contact: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Shift preparation defaults">
                    <textarea
                      rows={3}
                      value={form.note}
                      onChange={(e) =>
                        setForm({ ...form, note: e.target.value })
                      }
                    />
                  </Field>
                </>
              ) : (
                <>
                  <h3>Your roles</h3>
                  {Object.entries(FAMILIES).map(([f, def]) => (
                    <div key={f}>
                      <h4>{f}</h4>
                      <div className="pv-chips">
                        {def.roles.map((r) => (
                          <button
                            key={r}
                            className={form.roles.includes(r) ? "selected" : ""}
                            aria-pressed={form.roles.includes(r)}
                            onClick={() => toggle("roles", r)}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <h3>Skills</h3>
                  <div className="pv-chips">
                    {[...new Set([...SKILLS, ...form.skills])].map((s) => (
                      <button
                        key={s}
                        className={form.skills.includes(s) ? "selected" : ""}
                        aria-pressed={form.skills.includes(s)}
                        onClick={() => toggle("skills", s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="pv-inline">
                    <Field label="Add your own skill">
                      <input
                        value={custom}
                        onChange={(e) => setCustom(e.target.value)}
                      />
                    </Field>
                    <Button
                      variant="secondary"
                      disabled={!custom.trim()}
                      onClick={() => {
                        setForm({
                          ...form,
                          skills: [...new Set([...form.skills, custom.trim()])],
                        });
                        setCustom("");
                      }}
                    >
                      Add
                    </Button>
                  </div>
                  <Field label="Shift alert preference">
                    <select
                      value={form.alert}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          alert: e.target.value as Member["alert"],
                        })
                      }
                    >
                      <option value="all">All matching shifts</option>
                      <option value="soon">Today and tomorrow only</option>
                      <option value="off">Off</option>
                    </select>
                  </Field>
                  <p className="pv-caption">
                    For this preview, the notification inbox replaces SMS.
                    Invitations, bookings and cancellations still notify you.
                  </p>
                </>
              )}
              <div className="pv-actions">
                <Button onClick={save}>Save profile</Button>
                <Button variant="secondary" onClick={() => setEdit(false)}>
                  Discard changes
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
