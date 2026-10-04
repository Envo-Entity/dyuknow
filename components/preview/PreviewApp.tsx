"use client";
import { Fragment, useCallback, useEffect, useState } from "react";
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
  resetPreview,
} from "@/lib/preview/store";
import {
  FAMILIES,
  SKILLS,
  datePlus,
  londonDate,
  displayDate,
  member,
  clockLabel,
  uid,
  shiftLabel,
  unreadChat,
  currentOffer,
  serviceLabel,
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
  Heading,
  Modal,
  Photo,
  Segments,
  Services,
} from "./ui";
import { VenueHome, TalentHome, WorkHub, VenueDetail } from "./Discovery";
import { ShiftComposer } from "./Composer";
import { JobPostStart, TeamList, parseWhen, savedWhen } from "./Booking";
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
import { Chips } from "./MemberViews";
import { TEAMS, TEAM_NAMES } from "@/lib/catalogue";
import "./preview.css";
function Bell() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
      <path d="M10 21h4" />
    </svg>
  );
}
export function PreviewApp() {
  const rawData = usePreviewData();
  const route = usePreviewRoute();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [route]);
  const parts = route.split("/").filter(Boolean);
  const side = (
    ["venue", "talent", "owner"].includes(parts[0]) ? parts[0] : "venue"
  ) as Side;
  const actor = parts[1] || "";
  const data = { ...rawData, draft: rawData.drafts?.[actor] || null };
  const page = parts[2] || "home";
  const id = parts[3];
  const me = data.members.find((m) => m.id === actor);
  const entry = !actor || (side !== "owner" && !me);
  const [accounts, setAccounts] = useState(false);
  const [controls, setControls] = useState(false);
  const [rawFeedback, setRawFeedback] = useState<{
    text: string;
    error: boolean;
    for: string;
  } | null>(null);
  // A message meant for one account never carries over to another.
  const feedback = rawFeedback?.for === actor ? rawFeedback : null;
  const setFeedback = useCallback(
    (value: { text: string; error: boolean } | null) =>
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
    (action: Action, success?: string): Data | null => {
      try {
        const next = dispatch(action);
        if (success) setFeedback({ text: success, error: false });
        else if (
          ![
            "read-chat",
            "read-notice",
            "draft-message",
            "save-draft",
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
  const [profileBack, setProfileBack] = useState("home");
  function go(path: string) {
    if (/^(talent|venue)\//.test(path) && !["talent", "venue"].includes(page))
      setProfileBack(page === "new" ? "new/invite" : page === "compose" ? `${parts.slice(2, 5).join("/")}/invite` : parts.slice(2).join("/") || "home");
    navigateRoute(`/${side}/${actor}/${path === "home" ? "home" : path}`);
  }
  const unread = data.notices.filter((n) => n.to === actor && !n.read).length;
  const myThreads = (data.threads ?? []).filter(
    (t) => (side === "venue" ? t.venue : t.talent) === actor,
  );
  // Booking cards waiting on this person: an answer for talent, a revision
  // for the venue.
  const offersWaiting = myThreads.filter((t) =>
    side === "talent"
      ? currentOffer(data, t.id)?.status === "sent"
      : currentOffer(data, t.id)?.status === "changes",
  ).length;
  const decisions =
    offersWaiting +
    (side === "talent"
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
        ).length);
  // Talent decide on Shifts; venues on Bookings.
  const decisionsOn = side === "talent" ? "home" : "bookings";
  const messageUnread =
    myThreads.some((t) => unreadChat(data, actor, t)) ||
    data.responses.some(
      (r) =>
        r.chat &&
        !r.thread &&
        (side === "venue"
          ? data.shifts.find((s) => s.id === r.shift)!.venue === actor
          : r.talent === actor) &&
        unreadChat(data, actor, r),
    );
  const nav =
    side === "owner"
      ? [
          { path: "home", label: "Shifts", icon: HomeIcon },
          { path: "members", label: "Members", icon: AccountIcon },
          { path: "owner-bookings", label: "Bookings", icon: BookingsIcon },
          { path: "notifications", label: "Notifications", icon: Bell },
        ]
      : [
          {
            path: "home",
            label: side === "venue" ? "Book" : "Shifts",
            icon: HomeIcon,
          },
          {
            path: "bookings",
            label: side === "venue" ? "Bookings" : "My shifts",
            icon: BookingsIcon,
          },
          { path: "messages", label: "Messages", icon: MessagesIcon },
          { path: "profile", label: "Profile", icon: AccountIcon },
        ];
  let content;
  if (entry)
    content = <Welcome key={`${side}/${actor}`} initialSetupSide={actor === "setup" && side !== "owner" ? side : null} />;
  else if (page === "guide") content = <Stories />;
  else if (
    !me?.approved &&
    side !== "owner" &&
    !["profile", "notifications", "setup"].includes(page)
  )
    content = (
      <>
        <Heading
          title="We’ll let you know when you’re in."
        />
        {page === "shift" &&
          data.shifts.find((s) => s.id === id) &&
          (() => {
            const shift = data.shifts.find((s) => s.id === id)!;
            const venue = member(data, shift.venue);
            return (
              <section className="pv-terms">
                <h2>
                  {shiftLabel(shift)} · {venue.name}
                </h2>
                <p>
                  {areaOf(venue)} · London · £{shift.rate}/hour · {shift.capacity}{" "}
                  {shift.capacity === 1 ? "person" : "people"}
                </p>
                <Services shift={shift} />
                <p>{shift.note}</p>
              </section>
            );
          })()}
        <div className="pv-pending">
          <Badge>Waiting for approval</Badge>
          <p>
            For this preview, switch to Owner → Members → Approve {me!.name}.
            Then switch back here to experience the approval notification.
          </p>
          <Button onClick={() => go("profile")}>Edit my profile</Button>
          <Button variant="secondary" onClick={() => setAccounts(true)}>
            Switch to owner
          </Button>
        </div>
      </>
    );
  else if (
    side === "owner" &&
    ["home", "members", "owner-bookings"].includes(page)
  )
    content = <OwnerView view={page} />;
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
  else if (page === "new" && side === "venue")
    content = (
      <ShiftComposer
        key={id || "new"}
        family={FAMILIES[id] ? id : undefined}
        resumeInvite={id === "invite"}
      />
    );
  else if (page === "compose" && side === "venue" && id && parts[4])
    content = (
      <ShiftComposer key={`${id}/${parts[4]}`} origin={`${id}/${parts[4]}`} resumeInvite={parts[5] === "invite"} />
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
  else if (page === "talent") content = <TalentProfile id={id} />;
  else if (page === "venue") content = <VenueDetail id={id} />;
  else
    content = (
      <Empty
        title="Let’s get you back to service"
        text="Open your current shifts or bookings to continue."
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
        act,
        toast,
        error: feedback?.error ? feedback.text : "",
        profileBack,
      }}
    >
      <div
        className={`pv-app ${page === "chat" ? "pv-chat-screen" : ""} ${
          // Task screens get the whole phone; Back returns to the tabs.
          ["new", "compose", "shift", "booking", "chat", "talent", "venue", "availability"].includes(page)
            ? "pv-focus"
            : ""
        }`}
      >
        <div className="pv-preview-strip">
          <span>
            <span className="pv-dot" /> MVP preview · sample world ·{" "}
            {clockLabel(data.now)} London
          </span>
          <span className="pv-strip-links">
            {!entry && side !== "owner" && (
              <button onClick={() => go("notifications")}>
                Texts{unread ? ` (${unread})` : ""}
              </button>
            )}
            {!entry && <button onClick={() => go("guide")}>Walkthrough</button>}
            <button onClick={() => setControls(true)}>Preview controls</button>
          </span>
        </div>
        {!entry && (
          <>
            <header className="pv-header">
              <button className="pv-wordmark" onClick={() => go("home")}>
                Dyuknow
              </button>
              <div className="pv-header-actions">
                <button
                  className="pv-account-button"
                  onClick={() => setAccounts(true)}
                >
                  {me ? <Photo src={me.photo} /> : <AccountIcon />}
                  <span>
                    {me?.name || "Owner"}
                    <small>Switch account</small>
                  </span>
                </button>
              </div>
            </header>
            <nav className="pv-nav" aria-label="Main navigation">
              {nav.map((item, i) => (
                <Fragment key={item.path}>
                {/* Phones: the job post is the round button in the middle of the bar. */}
                {i === 2 && side === "venue" && me?.approved && (
                  <button
                    className={`pv-nav-post ${page === "post" ? "active" : ""}`}
                    onClick={() => go("post")}
                    aria-label="Create a job post"
                  >
                    <span><PlusIcon size={24} /></span>
                  </button>
                )}
                <button
                  onClick={() => go(item.path)}
                  className={page === item.path ? "active" : ""}
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
            {side === "venue" && me?.approved && (
              <button
                className={`pv-post-job ${page === "post" ? "active" : ""}`}
                onClick={() => go("post")}
                aria-current={page === "post" ? "page" : undefined}
              >
                <PlusIcon size={16} />
                <span>Create a job post</span>
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
              Post a shift, invite people you know, and see who’s coming.
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
              Find shifts and manage your availability.
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
            Choose Camille for the invitation story
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
          <button onClick={() => navigateRoute("/owner/owner/home")}>
            Owner workspace
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
        options={["venue", "talent", "owner"]}
        value={side}
        onChange={(v) => setSide(v as Side)}
      />
      {side === "owner" ? (
        <div className="pv-account-list">
          <button
            onClick={() => {
              navigateRoute("/owner/owner/home");
              onClose();
            }}
          >
            <AccountIcon />
            <span>
              Dyuknow owner
              <small>
                Approve members · help with cover · inspect bookings
              </small>
            </span>
            <ArrowRightIcon />
          </button>
        </div>
      ) : (
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
                  <small>
                    {m.roles.length ? m.roles.join(" · ") : areaOf(m)}
                    {!m.approved && " · Waiting for approval"}
                  </small>
                </span>
                {actor === m.id ? (
                  <Badge good>Current</Badge>
                ) : (
                  <ArrowRightIcon />
                )}
              </button>
            ))}
        </div>
      )}
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
            The owner preloaded this profile. Review it instead of starting
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
                  <div className="pv-chips">
                    {Array.from({ length: 7 }, (_, i) =>
                      datePlus(londonDate(data.now), i),
                    ).map((date) => (
                      <button
                        key={date}
                        aria-pressed={availabilityDates.includes(date)}
                        className={
                          availabilityDates.includes(date) ? "selected" : ""
                        }
                        onClick={() => {
                          const dates = availabilityDates.includes(date)
                            ? availabilityDates.filter((d) => d !== date)
                            : [...availabilityDates, date];
                          rawSetDates(dates);
                          saveDraft(form, step, availability, dates);
                        }}
                      >
                        {displayDate(date)}
                      </button>
                    ))}
                  </div>
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
          <p>Dyuknow approves every member before they can post or respond.</p>
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
                "Profile created. Waiting for owner approval.",
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
function OwnerView({ view }: { view: string }) {
  const { data, act, go } = usePreview();
  return (
    <>
      <Heading
        title={
          view === "members"
            ? "The people behind service."
            : view === "owner-bookings"
              ? "Every agreed service."
              : "Keep an eye on the room."
        }
        description="Owner preview. Approvals, cover needing help, cancellation history and private outcomes."
      />
      {view === "members" ? (
        <div className="pv-owner-list">
          {data.members.map((m) => (
            <div key={m.id} className="pv-candidate">
              <Photo src={m.photo} alt={m.name} />
              <div>
                <h2>{m.name}</h2>
                <p>
                  {[m.side, areaOf(m), ...m.roles].filter(Boolean).join(" · ")}
                </p>
                <p>{m.bio}</p>
                <small>
                  {m.phone} · {m.email}
                  {m.venue ? ` · ${m.venue.vacancies} vacancies in a typical week` : ""}
                </small>
              </div>
              {m.approved ? (
                <Badge good>Approved</Badge>
              ) : (
                <Button
                  onClick={() =>
                    act(
                      { type: "approve", actor: "owner", member: m.id },
                      `${m.name} approved. Their notification is ready.`,
                    )
                  }
                >
                  Approve
                </Button>
              )}
            </div>
          ))}
        </div>
      ) : view === "owner-bookings" ? (
        <div className="pv-owner-list">
          {data.bookings.map((b) => {
            const s = data.shifts.find((s) => s.id === b.shift)!;
            return (
              <button
                className="pv-owner-row"
                key={b.id}
                onClick={() => go(`booking/${b.id}`)}
              >
                <span>
                  <strong>
                    {member(data, s.venue).name} × {member(data, b.talent).name}
                  </strong>
                  <small>
                    {serviceLabel(s.days[0])} ·{" "}
                    {Object.values(b.outcomes).join(" · ") ||
                      "Outcome not reported"}
                  </small>
                </span>
                <Badge good={!b.cancelled}>
                  {b.cancelled
                    ? "Cancelled"
                    : s.days.at(-1)!.to <= data.now
                      ? "Past"
                      : "Booked"}
                </Badge>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="pv-owner-list">
          {data.shifts.map((s) => (
            <button
              key={s.id}
              className="pv-owner-row"
              onClick={() => go(`shift/${s.id}`)}
            >
              <span>
                <strong>
                  {member(data, s.venue).name} · {shiftLabel(s)}
                </strong>
                <small>
                  {serviceLabel(s.days[0])}
                  {s.ownerAlerted && " · Owner help requested"}
                </small>
              </span>
              <Badge>{s.status}</Badge>
            </button>
          ))}
        </div>
      )}
    </>
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
  function fillOther() {
    if (!shift || shift.status !== "open") return;
    const other = data.members.find(
      (m) =>
        m.side === "talent" &&
        m.approved &&
        m.id !== actor &&
        m.roles.some((r) => shift.roles.includes(r)) &&
        !data.bookings.some(
          (b) => b.shift === shift.id && b.talent === m.id && !b.cancelled,
        ) &&
        !data.responses.some(
          (r) =>
            r.shift === shift.id &&
            r.talent === m.id &&
            ["lapsed", "not-selected", "declined"].includes(r.status),
        ),
    );
    if (!other)
      return toast(
        "No other available sample member for this role. Try a posted CDP shift with Poppy and Theo.",
      );
    const r = data.responses.find(
      (r) => r.shift === shift.id && r.talent === other.id,
    );
    if (shift.mode === "invite") {
      if (!r || r.status !== "invited")
        return toast(
          "Invite another matching member first. This control accepts their real invitation.",
        );
      act(
        { type: "accept", actor: other.id, shift: shift.id },
        `${other.name} accepted the invitation.`,
      );
    } else {
      let next = data;
      if (r?.status !== "can-cover") {
        const result = act({
          type: "respond",
          actor: other.id,
          shift: shift.id,
          note: "I can cover this service.",
        });
        if (!result) return;
        next = result;
      }
      if (next)
        act(
          {
            type: "book",
            actor: shift.venue,
            shift: shift.id,
            talent: other.id,
          },
          `${other.name} was booked. Other waiting people see the true current state.`,
        );
    }
  }
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
      mode: "invite",
      invitees: [actor],
    };
    const next = act({ type: "post", actor: venue.id, draft: d });
    if (next)
      act(
        { type: "accept", actor, shift: next.shifts[0].id },
        "Another venue booked you. Overlapping responses have lapsed.",
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
                "Time advanced. Same-day fallback checked.",
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
                  <small>Use another real sample response or invitation.</small>
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
                    Move this booking to Past, with no assumed outcome.
                  </small>
                </span>
                <Button
                  variant="secondary"
                  onClick={() =>
                    act(
                      { type: "advance", until: shift.days.at(-1)!.to },
                      "Service ended. Both sides can report the outcome privately.",
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
              Restore seeded invitations and clear preview activity.
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
