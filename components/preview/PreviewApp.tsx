"use client";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import {
  AccountIcon,
  BookingsIcon,
  HomeIcon,
  MessagesIcon,
  ArrowRightIcon,
  CloseIcon,
  PlusIcon,
} from "@/components/icons";
import {
  usePreviewData,
  usePreviewRoute,
  dispatch,
  navigateRoute,
  navigateBack,
  resetPreview,
  restorePreview,
} from "@/lib/preview/store";
import {
  FAMILIES,
  SKILLS,
  datePlus,
  londonDate,
  member,
  clockLabel,
  uid,
  unreadChat,
  allSkills,
  defaultRate,
  fullAddress,
  type Action,
  type Data,
  type Member,
  type Side,
  type ShiftDraft,
  areaOf,
} from "@/lib/preview/model";
import { PreviewContext, usePreview } from "./context";
import { SHIFT_ALERTS } from "@/lib/catalogue";
import { addCustomSkill } from "@/lib/onboardingModel";
import {
  Badge,
  Button,
  Empty,
  Field,
  Modal,
  Photo,
  Segments,
} from "./ui";
import { VenueHome, TalentHome, WorkHub, VenueDetail } from "./Discovery";
import { ShiftComposer } from "./Composer";
import { DatePicker, JobPostStart, TeamList, parseWhen, savedWhen } from "./Booking";
import { ShiftDetail, BookingDetail } from "./ShiftDetail";
import {
  AvailabilityEditor,
  Messages,
  Notifications,
  Profile,
  TalentProfile,
  Thread,
} from "./MemberViews";
import { Stories } from "./Stories";
import { AccountPage } from "./Account";
import { Chips } from "./MemberViews";
import { TEAMS, TEAM_NAMES } from "@/lib/catalogue";
import "./preview.css";
export function PreviewApp() {
  const rawData = usePreviewData();
  // The snapshot an Undo returns to; a ref keeps `act` stable.
  const latest = useRef(rawData);
  useEffect(() => {
    latest.current = rawData;
  }, [rawData]);
  const route = usePreviewRoute();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [route]);
  const parts = route.split("/").filter(Boolean);
  const side = (parts[0] === "talent" ? "talent" : "venue") as Side;
  const actor = parts[1] || "";
  const data = rawData;
  const page = parts[2] || "home";
  const id = parts[3];
  const me = data.members.find((m) => m.id === actor);
  const entry = !actor || !me;
  const [accounts, setAccounts] = useState(false);
  const [controls, setControls] = useState(false);
  const [rawFeedback, setRawFeedback] = useState<{
    text: string;
    error: boolean;
    for: string;
    undo?: Data;
  } | null>(null);
  // A message meant for one account never carries over to another.
  const feedback = rawFeedback?.for === actor ? rawFeedback : null;
  const setFeedback = useCallback(
    (value: { text: string; error: boolean; undo?: Data } | null) =>
      setRawFeedback(
        value && {
          ...value,
          // The account in the address bar at the moment the message is shown.
          for: window.location.hash.slice(1).split("/").filter(Boolean)[1] || "",
        },
      ),
    [],
  );
  const toast = useCallback(
    (text: string) => setFeedback({ text, error: true }),
    [setFeedback],
  );
  const act = useCallback(
    (action: Action, success?: string, options?: { undo?: boolean }): Data | null => {
      try {
        const before = options?.undo ? latest.current : undefined;
        const next = dispatch(action);
        if (success) setFeedback({ text: success, error: false, undo: before });
        else if (
          ![
            "read-chat",
            "read-notice",
            "draft-message",
            "save-setup",
            "settings",
          ].includes(action.type)
        )
          setFeedback(null);
        return next;
      } catch (e) {
        setFeedback({ text: (e as Error).message, error: true });
        return null;
      }
    },
    [setFeedback],
  );
  // An Undo offer lasts a few seconds, then the answer stands.
  useEffect(() => {
    if (!rawFeedback?.undo) return;
    const timer = setTimeout(() => setRawFeedback(null), 6000);
    return () => clearTimeout(timer);
  }, [rawFeedback]);
  const [profileBack, setProfileBack] = useState("home");
  function go(path: string) {
    if (/^(talent|venue)\//.test(path) && !["talent", "venue"].includes(page))
      setProfileBack(parts.slice(2).join("/") || "home");
    navigateRoute(`/${side}/${actor}/${path === "home" ? "home" : path}`);
  }
  const unread = data.notices.filter((n) => n.to === actor && !n.read).length;
  const myThreads = data.threads.filter(
    (t) => (side === "venue" ? t.venue : t.talent) === actor,
  );
  // Decisions waiting on this person: booking requests to answer for talent,
  // people to book for the venue.
  const decisions =
    side === "talent"
      ? data.responses.filter(
          (r) =>
            r.talent === actor &&
            r.status === "invited" &&
            data.shifts.find((s) => s.id === r.shift)?.status === "open",
        ).length
      : data.responses.filter(
          (r) =>
            r.status === "can-cover" &&
            data.shifts.some(
              (s) =>
                s.id === r.shift && s.venue === actor && s.status === "open",
            ),
        ).length;
  // Talent decide on Shifts; venues on Bookings.
  const decisionsOn = side === "talent" ? "home" : "bookings";
  const messageUnread = myThreads.some((t) => unreadChat(data, actor, t));
  const nav = [
    {
      path: "home",
      label: side === "venue" ? "Book" : "Shifts",
      icon: HomeIcon,
    },
    {
      path: "bookings",
      label: side === "venue" ? "Bookings" : "Availability",
      icon: BookingsIcon,
    },
    { path: "messages", label: "Messages", icon: MessagesIcon },
    { path: "profile", label: "Profile", icon: AccountIcon },
  ];
  let content;
  if (entry)
    content = <Welcome key={`${side}/${actor}`} initialSetupSide={actor === "setup" ? side : null} />;
  else if (page === "guide") content = <Stories />;
  else if (page === "home")
    content = side === "venue" ? <VenueHome /> : <TalentHome />;
  else if (page === "bookings") content = <WorkHub key={actor} />;
  else if (page === "team" && side === "venue" && id)
    content = (
      <TeamList
        key={id}
        family={id}
        initial={parseWhen(parts[4], parts[5]) || savedWhen(data.now)}
      />
    );
  else if (page === "post" && side === "venue") content = <JobPostStart />;
  // new/<team>[/<people>[/<position>]]: one form for a job post (no people)
  // or a booking request (the people it goes to).
  else if (page === "new" && side === "venue" && FAMILIES[id])
    content = (
      <ShiftComposer
        key={parts.slice(3).join("/")}
        family={id}
        to={parts[4] ? parts[4].split(",") : []}
        role={parts[5] ? decodeURIComponent(parts[5]) : undefined}
      />
    );
  else if (page === "shift")
    content = <ShiftDetail key={`${actor}-${id}`} id={id} />;
  else if (page === "booking")
    content = <BookingDetail key={`${actor}-${id}`} id={id} />;
  else if (page === "messages") content = <Messages />;
  else if (page === "chat") content = <Thread key={`${actor}-${id}`} id={id} />;
  else if (page === "notifications") content = <Notifications />;
  else if (page === "availability" && side === "talent")
    content = <AvailabilityEditor back="home" />;
  else if (page === "profile" && me) content = <Profile key={actor} />;
  else if (page === "account" && me) content = <AccountPage />;
  else if (page === "talent") content = <TalentProfile id={id} />;
  else if (page === "venue") content = <VenueDetail id={id} />;
  else
    content = (
      <Empty
        title="Page not found"
      >
        <Button onClick={() => go("home")}>Go home</Button>
      </Empty>
    );
  return (
    <PreviewContext.Provider
      value={{
        data,
        actor,
        side,
        me,
        go,
        back: (fallback: string) => navigateBack(`/${side}/${actor}/${fallback}`),
        act,
        toast,
        error: feedback?.error ? feedback.text : "",
        profileBack,
      }}
    >
      <div
        className={`pv-app ${page === "chat" ? "pv-chat-screen" : ""} ${
          // Task screens get the whole phone; Back returns to the tabs.
          ["new", "shift", "booking", "chat", "talent", "venue", "availability"].includes(page)
            ? "pv-focus"
            : ""
        }`}
      >
        <PreviewPill
          clock={clockLabel(data.now)}
          texts={!entry ? unread : undefined}
          onTexts={() => go("notifications")}
          onGuide={entry ? undefined : () => go("guide")}
          onControls={() => setControls(true)}
          onAccounts={entry ? undefined : () => setAccounts(true)}
        />
        {!entry && (
          <>
            <header className="pv-header">
              <button className="pv-wordmark" onClick={() => go("home")}>
                Dyuknow
              </button>
              <AccountMenu
                name={me!.name}
                detail={me!.roles.length ? me!.roles.join(" · ") : areaOf(me!)}
                photo={me!.photo}
                onProfile={() => go("profile")}
                onAccount={() => go("account")}
              />
            </header>
            <nav className="pv-nav" aria-label="Main navigation">
              {nav.map((item, i) => (
                <Fragment key={item.path}>
                {/* Phones: Post a job is the round button in the middle of the bar. */}
                {i === 2 && side === "venue" && (
                  <button
                    className={`pv-nav-post ${page === "post" ? "active" : ""}`}
                    onClick={() => go("post")}
                    aria-label="Post a job"
                  >
                    <span><PlusIcon size={24} /></span>
                  </button>
                )}
                <button
                  onClick={() => go(item.path)}
                  className={`${page === item.path ? "active" : ""} ${item.path === "profile" ? "pv-nav-profile" : ""}`}
                  aria-current={page === item.path ? "page" : undefined}
                >
                  <item.icon />
                  <span>{item.label}</span>
                  {item.path === "messages" && messageUnread && (
                    <span
                      className="pv-unread-dot"
                      aria-label="Unread messages"
                    />
                  )}
                  {item.path === decisionsOn && decisions > 0 && (
                    <span className="pv-nav-count">{decisions}</span>
                  )}
                </button>
                </Fragment>
              ))}
            </nav>
            {side === "venue" && (
              <button
                className={`pv-post-job ${page === "post" ? "active" : ""}`}
                onClick={() => go("post")}
                aria-current={page === "post" ? "page" : undefined}
              >
                <PlusIcon size={16} />
                <span>Post a job</span>
              </button>
            )}
          </>
        )}
        <main
          className={entry ? "pv-entry-main" : "pv-main"}
          key={entry ? "entry" : `${side}/${actor}/${page}/${id || ""}`}
        >
          {content}
        </main>
        {feedback && (
          <div
            className={`pv-toast ${feedback.error ? "error" : ""}`}
            role={feedback.error ? "alert" : "status"}
          >
            <span>{feedback.text}</span>
            {feedback.undo && (
              <button
                className="pv-toast-undo"
                onClick={() => {
                  restorePreview(feedback.undo!);
                  setFeedback(null);
                }}
              >
                Undo
              </button>
            )}
            <button
              aria-label="Dismiss notification"
              onClick={() => setFeedback(null)}
            >
              <CloseIcon />
            </button>
          </div>
        )}
        {accounts && (
          <AccountSwitcher
            onClose={() => {
              setAccounts(false);
              setFeedback(null);
            }}
          />
        )}
        {controls && (
          <PreviewControls
            page={page}
            id={id}
            onClose={() => {
              setControls(false);
              setFeedback(null);
            }}
          />
        )}
      </div>
    </PreviewContext.Provider>
  );
}
function Welcome({ initialSetupSide = null }: { initialSetupSide?: "venue" | "talent" | null }) {
  const { data } = usePreview();
  const [choose, setChoose] = useState<Side | null>(null);
  const [phone, setPhone] = useState(false);
  const [setup, setSetup] = useState<"venue" | "talent" | null>(initialSetupSide);
  return (
    <>
      <div className="pv-entry-top">
        <span className="pv-wordmark">Dyuknow</span>
        <button onClick={() => navigateRoute("/venue/spruce/guide")}>
          Explore the walkthrough <ArrowRightIcon size={16} />
        </button>
      </div>
      <div className="pv-entry-heading">
        <h1>
          Which side of the <em>pass are you on?</em>
        </h1>
        <p>
          Hospitality cover in London. A service, a day, a few days.
        </p>
      </div>
      <div className="pv-entry-panels">
        <section className="pv-entry-panel venue">
          <div>
            <h2>
              I’m short
              <br />
              for <em>service.</em>
            </h2>
            <p>
              Pick a date and a team, send a booking request, or post a job.
            </p>
          </div>
          <div className="pv-entry-member">
            <Photo src={member(data, "spruce").photo} />
            <span>
              Spruce<small>Venue · Richmond</small>
            </span>
            <ArrowRightIcon />
          </div>
          <Button onClick={() => navigateRoute("/venue/spruce/home")}>
            I’m a venue · Enter as Spruce
          </Button>
          <button className="pv-entry-link" onClick={() => setChoose("venue")}>
            Choose another venue
          </button>
        </section>
        <section className="pv-entry-panel talent">
          <div>
            <h2>
              I’m available
              <br />
              to <em>work.</em>
            </h2>
            <p>
              Set your availability, answer booking requests, say yes to open jobs.
            </p>
          </div>
          <div className="pv-entry-member">
            <Photo src={member(data, "poppy").photo} />
            <span>
              Poppy Bertram<small>CDP · Richmond</small>
            </span>
            <ArrowRightIcon />
          </div>
          <Button onClick={() => navigateRoute("/talent/poppy/home")}>
            I’m talent · Enter as Poppy
          </Button>
          <button className="pv-entry-link" onClick={() => setChoose("talent")}>
            Choose Camille for the booking request story
          </button>
        </section>
      </div>
      <div className="pv-entry-bottom">
        <p>Frontend preview. No real account, payment or SMS is created.</p>
        <div>
          <button onClick={() => setPhone(true)}>
            Try phone sign-in / claim a profile
          </button>
          <button onClick={() => setSetup("talent")}>
            Explore new-member setup
          </button>
        </div>
      </div>
      {choose && (
        <AccountSwitcher initial={choose} onClose={() => setChoose(null)} />
      )}
      {phone && (
        <PhoneLogin
          onClose={() => setPhone(false)}
          onSetup={(side) => {
            setPhone(false);
            setSetup(side);
          }}
        />
      )}
      {setup && (
        <Setup
          key={setup}
          side={setup}
          onSide={setSetup}
          onClose={() => setSetup(null)}
        />
      )}
    </>
  );
}
function AccountSwitcher({
  initial,
  onClose,
}: {
  initial?: Side;
  onClose: () => void;
}) {
  const { data, actor } = usePreview();
  const [side, setSide] = useState(initial || "venue");
  return (
    <Modal title="Walk in their shoes" onClose={onClose}>
      <p>
        Every account shares the same sample world. Switch to see what your last
        action did for the other person.
      </p>
      <Segments
        options={["venue", "talent"]}
        value={side}
        onChange={(v) => setSide(v as Side)}
      />
      <div className="pv-account-list">
          {data.members
            .filter((m) => m.side === side)
            .map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  navigateRoute(`/${side}/${m.id}/home`);
                  onClose();
                }}
              >
                <Photo src={m.photo} />
                <span>
                  {m.name}
                  <small>{m.roles.length ? m.roles.join(" · ") : areaOf(m)}</small>
                </span>
                {actor === m.id ? (
                  <Badge good>Current</Badge>
                ) : (
                  <ArrowRightIcon />
                )}
              </button>
            ))}
      </div>
      <button
        className="pv-text-link"
        onClick={() => {
          navigateRoute("/");
          onClose();
        }}
      >
        Sign out to welcome screen
      </button>
    </Modal>
  );
}
function PhoneLogin({
  onClose,
  onSetup,
}: {
  onClose: () => void;
  onSetup: (side: "venue" | "talent") => void;
}) {
  const { data, toast } = usePreview();
  const [number, setNumber] = useState("+44 7700 900201");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState(1);
  const [claim, setClaim] = useState<Member | null>(null);
  const normalize = (s: string) => s.replace(/\D/g, "");
  return (
    <Modal
      title={
        claim
          ? `Is this ${claim.name}?`
          : stage === 1
            ? "Sign in by phone"
            : "Your text code"
      }
      onClose={onClose}
    >
      {claim ? (
        <>
          <Photo src={claim.photo} className="pv-claim-photo" />
          <p>
            Dyuknow preloaded this profile. Review it instead of starting
            again.
          </p>
          <Button
            onClick={() => {
              navigateRoute(`/${claim.side}/${claim.id}/profile`);
              onClose();
            }}
          >
            Claim existing profile
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              setClaim(null);
              setStage(1);
            }}
          >
            Use a different phone
          </Button>
        </>
      ) : stage === 1 ? (
        <>
          <p>This is simulated. Use a sample number; no text is sent.</p>
          <Field label="Phone number">
            <input
              type="tel"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
            />
          </Field>
          <p className="pv-caption">
            Poppy: +44 7700 900201 · Spruce: +44 7700 900101
          </p>
          <Button
            onClick={() => {
              if (normalize(number).length < 10)
                return toast("Enter a complete sample phone number.");
              setStage(2);
            }}
          >
            Continue to text code
          </Button>
        </>
      ) : (
        <>
          <p>
            Demo code: <strong>123456</strong>. Your verified number is also
            your alert destination in the real flow.
          </p>
          <Field label="Six-digit code">
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              maxLength={6}
              onChange={(e) => setCode(e.target.value)}
            />
          </Field>
          <Button
            onClick={() => {
              if (code !== "123456")
                return toast(
                  "That code doesn’t match. Use the preview code 123456.",
                );
              const m = data.members.find(
                (m) => normalize(m.phone) === normalize(number),
              );
              if (m) setClaim(m);
              else onSetup("talent");
            }}
          >
            Verify code
          </Button>
          <div className="pv-actions">
            <Button variant="quiet" onClick={() => setStage(1)}>
              Change phone
            </Button>
            <Button
              variant="quiet"
              onClick={() =>
                toast("Preview code resent: 123456. No SMS was sent.")
              }
            >
              Resend code
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
function Setup({
  side,
  onSide,
  onClose,
}: {
  side: "venue" | "talent";
  onSide: (side: "venue" | "talent") => void;
  onClose: () => void;
}) {
  const { data, act, toast } = usePreview();
  const [step, rawSetStep] = useState(data.setupDrafts?.[side]?.step || 1);
  const [customSkill, setCustomSkill] = useState("");
  const [availabilityDates, rawSetDates] = useState<string[]>(
    data.setupDrafts?.[side]?.availabilityDates || [
      datePlus(londonDate(data.now), 1),
    ],
  );
  const [availabilityPeriod, rawSetPeriod] = useState<"day" | "evening">(
    data.setupDrafts?.[side]?.availabilityPeriod || "evening",
  );
  const [availability, rawSetAvailability] = useState(
    data.setupDrafts?.[side]?.availability ?? true,
  );
  const [form, rawSetForm] = useState<Member>(
    () =>
      data.setupDrafts?.[side]?.member || {
        id: uid(),
        side,
        name: side === "talent" ? "Alex Morgan" : "The Orchard",
        phone: side === "talent" ? "+44 7700 900299" : "+44 7700 900199",
        email: side === "talent" ? "alex@example.com" : "hello@theorchard.example",
        postcode: side === "talent" ? "SW11 1AA" : "TW9 1AB",
        photo: "",
        bio:
          side === "talent"
            ? "Four years on sections in London kitchens. Calm on a busy service."
            : "A neighbourhood restaurant in Richmond.",
        roles: side === "talent" ? ["CDP"] : [],
        skills: side === "talent" ? ["Grill"] : [],
        customSkills: [],
        approved: false,
        alert: "all",
        // Only what this short setup asks; everything else starts empty.
        venue:
          side === "venue"
            ? {
                address: "10 High Street, Richmond, London",
                contactName: "Alex",
                contactRole: "Manager",
                types: [],
                cuisines: [],
                covers: "",
                teamSize: 0,
                website: "",
                instagram: "",
                knownFor: [],
                teamsNeeded: ["Kitchen"],
                dressCode: "Chef whites",
                uniform: true,
                staffMeal: true,
                rateChef: 18,
                rateFoh: 16,
                vacancies: 0,
              }
            : undefined,
      },
  );
  function saveDraft(
    value: Member,
    nextStep = step,
    free = availability,
    dates = availabilityDates,
    period = availabilityPeriod,
  ) {
    act({
      type: "save-setup",
      side,
      draft: {
        member: value,
        step: nextStep,
        availability: free,
        availabilityDates: dates,
        availabilityPeriod: period,
      },
    });
  }
  function setForm(value: Member) {
    rawSetForm(value);
    saveDraft(value);
  }
  function setStep(value: number) {
    rawSetStep(value);
    saveDraft(form, value);
  }
  function setAvailability(value: boolean) {
    rawSetAvailability(value);
    saveDraft(form, step, value);
  }
  function changeSide(v: "venue" | "talent") {
    onSide(v);
  }
  return (
    <Modal
      title={step === 3 ? "Your member preview" : "A little about you"}
      onClose={onClose}
    >
      <div className="pv-steps">
        <span>1 · Profile</span>
        <span>2 · Where and when</span>
        <span>3 · Preview</span>
      </div>
      {step === 1 && (
        <>
          <Segments
            options={["talent", "venue"]}
            value={side}
            onChange={(v) => changeSide(v as "talent" | "venue")}
          />
          <Field label={side === "venue" ? "Venue name" : "Display name"}>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Short introduction">
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={3}
            />
          </Field>
          {side === "talent" && (
            <>
              <h3>Positions</h3>
              {TEAM_NAMES.map((team) => (
                <Chips
                  key={team}
                  options={TEAMS[team]}
                  selected={form.roles}
                  onChange={(roles) => setForm({ ...form, roles })}
                />
              ))}
              <h3>Skills</h3>
              <Chips
                options={SKILLS}
                selected={form.skills}
                onChange={(skills) => setForm({ ...form, skills })}
              />
              {form.customSkills.length > 0 && (
                <Chips
                  options={form.customSkills}
                  selected={form.customSkills}
                  onChange={(customSkills) => setForm({ ...form, customSkills })}
                />
              )}
              <div className="pv-inline">
                <Field label="Add your own skill">
                  <input
                    maxLength={80}
                    value={customSkill}
                    onChange={(e) => setCustomSkill(e.target.value)}
                  />
                </Field>
                <Button
                  variant="secondary"
                  disabled={!customSkill.trim()}
                  onClick={() => {
                    setForm({
                      ...form,
                      customSkills: addCustomSkill(form.customSkills, customSkill, form.skills),
                    });
                    setCustomSkill("");
                  }}
                >
                  Add
                </Button>
              </div>
            </>
          )}
          <Button
            onClick={() => {
              if (!form.name.trim() || !form.bio.trim())
                return toast("Add your name and a short introduction.");
              setStep(2);
            }}
          >
            Continue
          </Button>
        </>
      )}
      {step === 2 && (
        <>
          <Field label="Phone · sample number">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          {side === "venue" && form.venue && (
            <Field label="Street address">
              <input
                value={form.venue.address}
                onChange={(e) =>
                  setForm({ ...form, venue: { ...form.venue!, address: e.target.value } })
                }
              />
            </Field>
          )}
          <Field label={side === "venue" ? "Postcode" : "Home postcode"}>
            <input
              value={form.postcode}
              onChange={(e) => setForm({ ...form, postcode: e.target.value })}
            />
          </Field>
          {side === "venue" && form.venue ? (
            <>
              <div className="pv-form-grid">
                <Field label="On-site contact name">
                  <input
                    value={form.venue.contactName}
                    onChange={(e) =>
                      setForm({ ...form, venue: { ...form.venue!, contactName: e.target.value } })
                    }
                  />
                </Field>
                <Field label="Their role">
                  <input
                    value={form.venue.contactRole}
                    onChange={(e) =>
                      setForm({ ...form, venue: { ...form.venue!, contactRole: e.target.value } })
                    }
                  />
                </Field>
                <Field label="Kitchen and pastry · £ per hour">
                  <input
                    type="number"
                    value={form.venue.rateChef}
                    onChange={(e) =>
                      setForm({ ...form, venue: { ...form.venue!, rateChef: Number(e.target.value) } })
                    }
                  />
                </Field>
                <Field label="Front of house · £ per hour">
                  <input
                    type="number"
                    value={form.venue.rateFoh}
                    onChange={(e) =>
                      setForm({ ...form, venue: { ...form.venue!, rateFoh: Number(e.target.value) } })
                    }
                  />
                </Field>
              </div>
              <h3>Teams you usually need</h3>
              <Chips
                options={TEAM_NAMES}
                selected={form.venue.teamsNeeded}
                onChange={(teamsNeeded) =>
                  setForm({ ...form, venue: { ...form.venue!, teamsNeeded } })
                }
              />
            </>
          ) : (
            <>
              <Field label="Shift alerts">
                <select value={form.alert} onChange={(e) => setForm({ ...form, alert: e.target.value as Member["alert"] })}>
                  {SHIFT_ALERTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </Field>
              <label className="pv-check">
                <input
                  type="checkbox"
                  checked={availability}
                  onChange={(e) => setAvailability(e.target.checked)}
                />{" "}
                Publish some availability for the next seven days
              </label>
              {availability && (
                <>
                  <DatePicker
                    value={availabilityDates}
                    windows={1}
                    last={datePlus(londonDate(data.now), 6)}
                    onChange={(dates) => {
                      rawSetDates(dates);
                      saveDraft(form, step, availability, dates);
                    }}
                  />
                  <Segments
                    options={["day", "evening"]}
                    value={availabilityPeriod}
                    onChange={(v) => {
                      rawSetPeriod(v as "day" | "evening");
                      saveDraft(
                        form,
                        step,
                        availability,
                        availabilityDates,
                        v as "day" | "evening",
                      );
                    }}
                  />
                  <p className="pv-caption">
                    Day: 09:00–17:00 · Evening: 16:00–23:59 · London time
                  </p>
                </>
              )}
              <p className="pv-caption">
                Optional. You’ll still get role alerts if you skip availability.
              </p>
            </>
          )}
          <Button
            onClick={() => {
              if (
                !form.postcode.trim() ||
                form.phone.replace(/\D/g, "").length < 10 ||
                (side === "venue" &&
                  (!form.venue?.address.trim() || !form.venue?.contactName.trim()))
              )
                return toast(
                  "Add a postcode, a complete sample phone and the venue’s address and contact.",
                );
              setStep(3);
            }}
          >
            Preview my profile
          </Button>
        </>
      )}
      {step === 3 && (
        <>
          <h3>{form.name}</h3>
          <p>
            {side === "talent" ? `${form.roles.join(" · ")} · ` : ""}
            {areaOf(form)}
          </p>
          <p>{form.bio}</p>
          <p>{side === "venue" ? fullAddress(form) : allSkills(form).join(" · ")}</p>
          <Button
            onClick={() => {
              const result = act(
                {
                  type: "join",
                  availabilityDates:
                    side === "talent" && availability ? availabilityDates : [],
                  availabilityPeriod,
                  member: {
                    ...form,
                    side,
                    roles:
                      side === "venue"
                        ? []
                        : form.roles.length
                          ? form.roles
                          : ["CDP"],
                  },
                },
                "Profile created.",
              );
              if (result) {
                navigateRoute(`/${side}/${form.id}/home`);
                onClose();
              }
            }}
          >
            Finish setup
          </Button>
        </>
      )}
      {step > 1 && (
        <Button variant="quiet" onClick={() => setStep(step - 1)}>
          Back
        </Button>
      )}
      <p className="pv-caption">
        Prefilled sample information lets you try setup without supplying
        personal data.
      </p>
    </Modal>
  );
}
function PreviewControls({
  page,
  id,
  onClose,
}: {
  page: string;
  id?: string;
  onClose: () => void;
}) {
  const { data, actor, side, act, go, toast } = usePreview();
  const [reset, setReset] = useState(false);
  const b =
    page === "booking" ? data.bookings.find((b) => b.id === id) : undefined;
  const shift =
    page === "shift"
      ? data.shifts.find((s) => s.id === id)
      : b
        ? data.shifts.find((s) => s.id === b.shift)
        : undefined;
  // Another person says yes and the venue books them: the real two steps.
  function fillOther() {
    if (!shift || shift.status !== "open") return;
    const other = data.members.find(
      (m) =>
        m.side === "talent" &&
        m.id !== actor &&
        (shift.mode === "post"
          ? m.roles.some((r) => shift.roles.includes(r))
          : data.responses.some(
              (r) => r.shift === shift.id && r.talent === m.id && r.status === "invited",
            )) &&
        !data.bookings.some(
          (b) => b.shift === shift.id && b.talent === m.id && !b.cancelled,
        ) &&
        !data.responses.some(
          (r) =>
            r.shift === shift.id &&
            r.talent === m.id &&
            ["lapsed", "not-selected", "declined", "withdrawn"].includes(r.status),
        ),
    );
    if (!other)
      return toast(
        shift.mode === "post"
          ? "No other sample member in this position. Try a CDP job with Poppy and Theo."
          : "Send this request to another person first.",
      );
    const r = data.responses.find(
      (r) => r.shift === shift.id && r.talent === other.id,
    );
    if (r?.status !== "can-cover" && !act({ type: "respond", actor: other.id, shift: shift.id }))
      return;
    act(
      { type: "book", actor: shift.venue, shift: shift.id, talent: other.id },
      `${other.name} said yes and was booked. Everyone else waiting sees the real state.`,
    );
  }
  // Another venue books this talent for the same hours.
  function overlapping() {
    if (!shift || side !== "talent") return;
    const me = member(data, actor);
    const venue = data.members.find(
      (m) => m.side === "venue" && m.id !== shift.venue,
    )!;
    const family = Object.entries(FAMILIES).find(([, f]) =>
      f.roles.includes(me.roles[0]),
    )![0];
    const d: ShiftDraft = {
      family,
      roles: [me.roles[0]],
      date: shift.days[0].date,
      count: shift.days.length,
      start: shift.days[0].start,
      end: shift.days[0].end,
      capacity: 1,
      rate: defaultRate(venue, family),
      note: "Overlapping sample service for the conflict story.",
      to: [actor],
    };
    const next = act({ type: "post", actor: venue.id, draft: d });
    if (!next) return;
    const id = next.shifts[0].id;
    if (act({ type: "respond", actor, shift: id }))
      act(
        { type: "book", actor: venue.id, shift: id, talent: actor },
        `${venue.name} booked you for the same hours. Clashing answers have lapsed.`,
      );
  }
  return (
    <Modal title="Try the moments between screens" onClose={onClose}>
      <p>
        These controls only affect this browser’s sample world. They replace
        waiting for time or another person during your walkthrough.
      </p>
      <div className="pv-control-list">
        <div>
          <span>
            <strong>Connection</strong>
            <small>
              {data.offline
                ? "Offline — changes cannot be saved"
                : "Online — local preview saves enabled"}
            </small>
          </span>
          <Button
            variant="secondary"
            onClick={() => act({ type: "settings", offline: !data.offline })}
          >
            {data.offline ? "Reconnect" : "Go offline"}
          </Button>
        </div>
        <div>
          <span>
            <strong>Save failure</strong>
            <small>Next user action fails once, preserving the draft.</small>
          </span>
          <Button
            variant="secondary"
            onClick={() => act({ type: "settings", failNext: !data.failNext })}
          >
            {data.failNext ? "Failure armed · cancel" : "Fail next save"}
          </Button>
        </div>
        <div>
          <span>
            <strong>Preview clock</strong>
            <small>{clockLabel(data.now)} · London</small>
          </span>
          <Button
            variant="secondary"
            onClick={() =>
              act(
                {
                  type: "advance",
                  until: new Date(Date.parse(data.now) + 1800000).toISOString(),
                },
                "Time advanced.",
              )
            }
          >
            Advance 30 minutes
          </Button>
        </div>
        {shift && (
          <>
            <div>
              <span>
                <strong>Shift expiry</strong>
                <small>Close unfilled places at the first service start.</small>
              </span>
              <Button
                variant="secondary"
                disabled={shift.days[0].from <= data.now}
                onClick={() =>
                  act(
                    { type: "advance", until: shift.days[0].from },
                    "Shift start reached. Unfilled places are closed.",
                  )
                }
              >
                Advance to this shift’s start
              </Button>
            </div>
            {shift.status === "open" && (
              <div>
                <span>
                  <strong>Another person acts first</strong>
                  <small>Another person says yes and the venue books them.</small>
                </span>
                <Button variant="secondary" onClick={fillOther}>
                  Fill this shift with another person
                </Button>
              </div>
            )}
            {side === "talent" && shift.status === "open" && (
              <div>
                <span>
                  <strong>Overlapping commitment</strong>
                  <small>
                    Book this talent with another venue for these hours.
                  </small>
                </span>
                <Button variant="secondary" onClick={overlapping}>
                  Create an overlapping booking for me
                </Button>
              </div>
            )}
            {b && !b.cancelled && shift.days.at(-1)!.to > data.now && (
              <div>
                <span>
                  <strong>After service</strong>
                  <small>
                    Move past the last day so the venue can confirm hours.
                  </small>
                </span>
                <Button
                  variant="secondary"
                  onClick={() =>
                    act(
                      { type: "advance", until: shift.days.at(-1)!.to },
                      "Service ended. The venue can now confirm the hours.",
                    )
                  }
                >
                  Finish this booking
                </Button>
              </div>
            )}
          </>
        )}
        <div>
          <span>
            <strong>Weekly availability nudge</strong>
            <small>
              Try the notification that brings talent to the editor.
            </small>
          </span>
          <Button
            variant="secondary"
            onClick={() => {
              if (side === "talent") {
                act(
                  { type: "nudge", actor },
                  "Weekly availability nudge added to your notification inbox.",
                );
                go("notifications");
                onClose();
              } else toast("Switch to talent first to update availability.");
            }}
          >
            Update this week
          </Button>
        </div>
        <div>
          <span>
            <strong>Start fresh</strong>
            <small>
              Restore the sample world and clear preview activity.
            </small>
          </span>
          <Button variant="quiet" onClick={() => setReset(true)}>
            Reset stories
          </Button>
        </div>
      </div>
      {reset && (
        <div className="pv-callout">
          <p>
            Reset all MVP preview changes in this browser? The original app data
            stays separate.
          </p>
          <Button
            onClick={() => {
              resetPreview();
              navigateRoute("/");
              onClose();
            }}
          >
            Yes, reset sample world
          </Button>
          <Button variant="quiet" onClick={() => setReset(false)}>
            Keep my activity
          </Button>
        </div>
      )}
    </Modal>
  );
}

// The demo's own tools, kept out of the product's way: one small pill that
// opens Texts, the walkthrough, preview controls and account switching.
function PreviewPill({
  clock,
  texts,
  onTexts,
  onGuide,
  onControls,
  onAccounts,
}: {
  clock: string;
  texts?: number;
  onTexts: () => void;
  onGuide?: () => void;
  onControls: () => void;
  onAccounts?: () => void;
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
  const pick = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  return (
    <div className={`pv-preview-pill ${open ? "is-open" : ""}`} ref={ref}>
      <button aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="pv-dot" />
        Preview<span className="pv-pill-clock"> · {clock}</span>
        {!!texts && <span className="pv-pill-count">{texts}</span>}
      </button>
      {open && (
        <div className="pv-pill-menu" role="menu">
          {texts !== undefined && (
            <button role="menuitem" onClick={pick(onTexts)}>
              Texts{texts ? ` (${texts})` : ""}
            </button>
          )}
          {onGuide && (
            <button role="menuitem" onClick={pick(onGuide)}>
              Walkthrough
            </button>
          )}
          <button role="menuitem" onClick={pick(onControls)}>
            Preview controls
          </button>
          {onAccounts && (
            <button role="menuitem" onClick={pick(onAccounts)}>
              Switch account
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// The signed-in person, top right on wide screens: their profile and log out.
// Phones reach the same from the Profile tab.
function AccountMenu({
  name,
  detail,
  photo,
  onProfile,
  onAccount,
}: {
  name: string;
  detail: string;
  photo?: string;
  onProfile?: () => void;
  onAccount?: () => void;
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
  return (
    <div className="pv-account" ref={ref}>
      <button
        className="pv-account-button"
        aria-label={`${name}: account`}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {photo ? <Photo src={photo} alt={name} /> : <AccountIcon />}
      </button>
      {open && (
        <div className="pv-account-menu" role="menu">
          <div className="pv-account-who">
            <strong>{name}</strong>
            <small>{detail}</small>
          </div>
          {onProfile && (
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onProfile();
              }}
            >
              <AccountIcon size={18} /> My profile
            </button>
          )}
          {onAccount && (
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onAccount();
              }}
            >
              <SettingsIcon /> Account
            </button>
          )}
          <button role="menuitem" onClick={() => navigateRoute("/")}>
            <LogOutIcon /> Log out
          </button>
        </div>
      )}
    </div>
  );
}
function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </svg>
  );
}
export function LogOutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 4h3.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H14" />
      <path d="M10 8l-4 4 4 4" />
      <path d="M6 12h10" />
    </svg>
  );
}
