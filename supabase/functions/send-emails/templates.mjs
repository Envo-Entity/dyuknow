// Dyuknow email templates. Plain JS with no imports, so the send-emails edge
// function (Deno) imports this file as it is, and scripts/emails/preview.mjs
// (Node) renders the same file for a local preview.
//
//   render(kind, data) -> { subject, preheader, html, text }
//
// The wording follows docs/backend/07-notifications.md. Emails point back into
// the app and never carry chat text, documents, addresses or contact details.

export const SITE = "https://www.dyuknow.com";
// Where the email images live. The local preview points this at its own server.
export const ASSETS = globalThis.process?.env?.EMAIL_ASSETS ?? SITE;
export const BANNER = `${ASSETS}/email/banner-team.jpg`;

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const SERIF = "'Instrument Serif',Georgia,'Times New Roman',serif";

// ---------------------------------------------------------------------------
// Sign-off from James, on the onboarding emails only (welcome, account ready, approved)
// ---------------------------------------------------------------------------
export const SENDER = { name: "James Sharp", role: "Founder, Dyuknow" };
function signature() {
  return `<div style="margin:32px 0 0;padding:24px 0 0;border-top:1px solid #f0f0f0">
  <p style="font-size:15px;line-height:1.5;margin:0 0 14px;color:#4a4a4a">Thanks,</p>
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="vertical-align:middle;padding:0 14px 0 0"><img src="${ASSETS}/email/james-sharp.jpg" width="56" height="56" alt="" style="display:block;width:56px;height:56px;border-radius:50%;border:0"></td>
    <td style="vertical-align:middle;font-family:${FONT}">
      <p style="font-size:15px;font-weight:600;margin:0;color:#111">${esc(SENDER.name)}</p>
      <p style="font-size:13px;margin:2px 0 0;color:#7a7a7a">${esc(SENDER.role)}</p>
    </td>
  </tr></table>
</div>`;
}

// ---------------------------------------------------------------------------
// Layout: banner, eyebrow, headline, intro, details card, note, button, footer
// ---------------------------------------------------------------------------
function layout({ eyebrow, headline, intro, rows = [], note, button, preheader, founder, body }) {
  const card = rows.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;border-radius:12px;margin:0 0 24px">
${rows
  .map(
    ([k, v], i) => `<tr><td style="padding:${i ? "0" : "16px"} 20px ${i === rows.length - 1 ? "16px" : "10px"};font-family:${FONT};font-size:13px;color:#7a7a7a;width:96px;vertical-align:top">${esc(k)}</td><td style="padding:${i ? "0" : "16px"} 20px ${i === rows.length - 1 ? "16px" : "10px"} 0;font-family:${FONT};font-size:15px;color:#111;vertical-align:top">${esc(v)}</td></tr>`,
  )
  .join("\n")}
</table>`
    : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><title>${esc(headline)}</title></head>
<body style="margin:0;padding:0;background:#f5f5f5">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<div style="background:#f5f5f5;padding:24px 12px">
<div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden">
<a href="${SITE}" style="display:block;text-decoration:none"><img src="${BANNER}" width="600" alt="Dyuknow" style="display:block;width:100%;max-width:600px;height:auto;border:0;outline:none;font-family:Georgia,serif;font-size:32px;color:#050505"></a>
<div style="font-family:${FONT};max-width:480px;margin:0 auto;padding:32px 24px 36px;color:#111">
  <p style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:#7a9a72;margin:0 0 10px">${esc(eyebrow)}</p>
  <h1 style="font-family:${SERIF};font-weight:400;font-size:30px;line-height:1.15;margin:0 0 16px;color:#050505">${esc(headline)}</h1>
  ${intro ? `<p style="font-size:16px;line-height:1.5;margin:0 0 24px;color:#333">${intro}</p>` : ""}
  ${card}
  ${body ?? ""}
  ${note ? `<p style="font-size:15px;line-height:1.5;margin:0 0 24px;color:#4a4a4a">${note}</p>` : ""}
  ${button ? `<p style="margin:0"><a href="${esc(button.href)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px">${esc(button.label)}</a></p>` : ""}
  ${founder ? signature() : ""}
</div>
<div style="border-top:1px solid #f0f0f0;padding:20px 24px 28px;text-align:center;font-family:${FONT};font-size:12px;line-height:1.5;color:#9a9a9a">
  Dyuknow · Hospitality teams · London<br>
  You're getting this because you have a Dyuknow account.
</div>
</div>
</div>
</body></html>`;
}

function textVersion({ headline, introText, rows = [], noteText, button, founder, bodyText }) {
  return [
    headline,
    "",
    introText,
    rows.length ? "" : null,
    ...rows.map(([k, v]) => `${k}: ${v}`),
    noteText ? "" : null,
    noteText,
    button ? "" : null,
    button ? `${button.label}: ${button.href}` : null,
    "",
    bodyText ?? null,
    founder ? "Thanks," : null,
    founder ? `${SENDER.name}, ${SENDER.role}` : null,
    founder ? "" : null,
    "Dyuknow · Hospitality teams · London",
  ]
    .filter((l) => l !== null && l !== undefined)
    .join("\n");
}

// One email: strip tags from intro/note for the text part.
const plain = (s) => (s ? s.replace(/<[^>]+>/g, "") : s);
function email({ subject, preheader, eyebrow, headline, intro, rows, note, button, founder, body, bodyText }) {
  return {
    subject,
    preheader,
    html: layout({ eyebrow, headline, intro, rows, note, button, preheader, founder, body }),
    text: textVersion({ headline, introText: plain(intro), rows, noteText: plain(note), button, founder, bodyText }),
  };
}

const app = `${SITE}/app`;

// A button that opens the exact screen in the app. The app routes by hash,
// /app#/{side}/{member id}/{path}, and only for the signed-in member, so the
// link goes through /login?next=, which signs people in first if needed and
// otherwise sends them straight on. Without the ids it falls back to /app.
export function appLink(d, path = d?.target) {
  if (!d?.side || !d?.member_id || !path || !/^(talent|venue)$/.test(d.side)) return app;
  const next = `/app#/${d.side}/${d.member_id}/${path}`;
  return `${SITE}/login?next=${encodeURIComponent(next)}`;
}

// Numbered steps, each with a screenshot from the app (public/email/welcome).
function steps(list) {
  return list
    .map(
      (s, i) => `<div style="margin:0 0 36px">
  <p style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;color:#7a9a72;margin:0 0 6px">Step ${i + 1}</p>
  <h2 style="font-family:${SERIF};font-weight:400;font-size:24px;line-height:1.2;margin:0 0 8px;color:#050505">${esc(s.title)}</h2>
  <p style="font-size:15px;line-height:1.5;margin:0 0 16px;color:#4a4a4a">${esc(s.text)}</p>
  <img src="${ASSETS}/email/welcome/${s.image}.jpg" width="280" alt="${esc(s.alt)}" style="display:block;width:280px;max-width:100%;height:auto;border:0;margin:0 auto">
</div>`,
    )
    .join("\n");
}
const stepsText = (list) => list.map((s, i) => `${i + 1}. ${s.title}\n${s.text}`).join("\n\n");

const TALENT_STEPS = [
  {
    title: "Set your availability",
    text: "Tap the days you're free and the hours you can work. Venues only see you on those days, so you're only asked when you can say yes.",
    image: "talent-availability",
    alt: "The availability calendar in Dyuknow",
  },
  {
    title: "Answer booking requests",
    text: "When a venue wants you, the request shows the role, the dates, the hours and the pay. Accept and you're booked. Decline if it isn't right.",
    image: "talent-requests",
    alt: "A booking request waiting for an answer",
  },
  {
    title: "Turn up ready",
    text: "Your booking has the address, who to ask for on the day and what to wear. You can message the venue any time.",
    image: "talent-booked",
    alt: "A confirmed booking with the venue's details",
  },
];

const VENUE_STEPS = [
  {
    title: "Find cover",
    text: "Pick the day and the service, choose a team, then filter by position. You'll see who's available for that shift and what they charge.",
    image: "venue-find",
    alt: "Finding kitchen cover by date and position",
  },
  {
    title: "Chat before you book",
    text: "Message anyone to check the details. Your booking request and their answer sit in the same conversation.",
    image: "venue-chat",
    alt: "A chat between a venue and a chef",
  },
  {
    title: "Manage your cover",
    text: "Bookings shows who's coming, the requests still waiting for replies and your past shifts. Add days or cancel from there.",
    image: "venue-bookings",
    alt: "The venue's bookings list",
  },
];
const shiftRows = (d) => [
  ["Venue", d.venue],
  ["Role", d.positions],
  ["Dates", d.dates],
  ["Hours", d.hours],
  ...(d.rate ? [["Pay", d.rate]] : []),
];

// ---------------------------------------------------------------------------
// Every email, by kind
// ---------------------------------------------------------------------------
export const EMAILS = {
  // ---- Onboarding ------------------------------------------------------------
  "welcome-talent": {
    to: "Talent",
    when: "Once, when a talent finishes onboarding at /join, or when the owner sets up their account. Never sent again.",
    render: (d) =>
      email({
        subject: "Welcome to Dyuknow",
        preheader: "How to get booked for shifts at London's best venues.",
        eyebrow: "Welcome",
        headline: d.name ? `Welcome to Dyuknow, ${d.name}` : "Welcome to Dyuknow",
        intro:
          "Dyuknow connects London's restaurants, bars and hotels with chefs, front of house and bar staff for a service, a day or a few days. Here's how it works for you.",
        body: steps(TALENT_STEPS),
        bodyText: stepsText(TALENT_STEPS),
        button: { label: "Add my free days", href: appLink(d) },
        founder: true,
      }),
  },
  "welcome-venue": {
    to: "Venue",
    when: "Once, when a venue finishes onboarding at /join, or when the owner sets up their account. Never sent again.",
    render: (d) =>
      email({
        subject: "Welcome to Dyuknow",
        preheader: "How to find trusted cover for any service.",
        eyebrow: "Welcome",
        headline: d.name ? `Welcome to Dyuknow, ${d.name}` : "Welcome to Dyuknow",
        intro:
          "Dyuknow finds you trusted chefs, front of house and bar staff when you're short for a service, a day or a few days. Every profile shows which documents they've added and which we've checked. Here's how it works.",
        body: steps(VENUE_STEPS),
        bodyText: stepsText(VENUE_STEPS),
        button: { label: "Find cover", href: appLink(d) },
        founder: true,
      }),
  },

  "complete-account": {
    to: "Either side",
    when: "24 hours after someone signs up, if they still haven't picked venue or talent and submitted the onboarding form. Sent once.",
    render: () =>
      email({
        subject: "Finish setting up your Dyuknow account",
        preheader: "Tell us if you're a venue or looking for shifts.",
        eyebrow: "One step left",
        headline: "Finish setting up your account",
        intro:
          "You signed up for Dyuknow but haven't finished setting up. Tell us which side you're on and add a few details, and we'll get your account ready.",
        rows: [
          ["Venues", "Find vetted chefs, front of house and bar staff when you're short for a service."],
          ["Talent", "Get booked for shifts at London venues, on the days you choose."],
        ],
        note: "Nobody can see your account until it's finished, so pick up where you left off.",
        button: { label: "Finish my account", href: `${SITE}/join` },
        founder: true,
      }),
  },

  // ---- Account -------------------------------------------------------------
  "account-ready": {
    to: "Either side",
    when: "When the owner creates a login for someone from their onboarding form in /admin, so they can choose a password.",
    render: (d) =>
      email({
        subject: "Your Dyuknow account is ready",
        preheader: "Choose a password and sign in.",
        eyebrow: "Account ready",
        headline: d.name ? `${d.name}, your account is ready` : "Your account is ready",
        intro:
          "We've set up your account from the details you gave us, and it's approved and ready to use.",
        rows: [["Your email", d.email]],
        note:
          "To sign in for the first time, open the login page, tap <strong>Forgot password?</strong>, and type in the 6-digit code we email you. Then choose your password.",
        button: { label: "Choose my password", href: `${SITE}/login` },
        founder: true,
      }),
  },
  "sign-in-code": {
    to: "Either side",
    when: "Every time someone asks for a code on /login: signing up, signing in or Forgot password. Supabase Auth sends it; this is the design to paste into its template. The code lasts 10 minutes.",
    render: (d) =>
      email({
        subject: `${d.code} is your Dyuknow code`,
        preheader: "It works for the next 10 minutes.",
        eyebrow: "Sign-in code",
        headline: "Your sign-in code",
        intro: `<span style="display:inline-block;font-family:${FONT};font-size:34px;font-weight:700;letter-spacing:8px;color:#050505">${esc(d.code)}</span>`,
        note: "Type this code into Dyuknow to sign in. It works for the next 10 minutes. If you didn't ask for it, you can ignore this email.",
      }),
  },
  approved: {
    to: "Either side",
    paused: "Not sent for now: everyone is approved automatically at launch, and documents aren't reviewed yet. Kept for later.",
    when: "When the admin approves the member in /admin. Talent can then be found; venues can post jobs and send requests.",
    render: (d) =>
      email({
        subject: "You're approved on Dyuknow",
        preheader:
          d.side === "talent" ? "Venues can now find you." : "You can now post jobs and send booking requests.",
        eyebrow: "Approved",
        headline: "You're approved",
        intro:
          d.side === "talent"
            ? "Venues can now find you. Add the days you're free so they know when to ask."
            : "You can now post jobs and send booking requests.",
        button:
          d.side === "talent"
            ? { label: "Add my free days", href: appLink(d) }
            : { label: "Post a job", href: appLink(d) },
      }),
  },
  "document-rejected": {
    to: "Either side",
    paused: "Not sent for now: everyone is approved automatically at launch, and documents aren't reviewed yet. Kept for later.",
    when: "When the admin rejects a document the member uploaded (CV, right to work, food safety certificate), with the reason they picked.",
    render: (d) =>
      email({
        subject: `Your ${d.document} wasn't accepted`,
        preheader: d.reason,
        eyebrow: "Document",
        headline: `${d.document} not accepted`,
        intro: `${esc(d.reason)}.`,
        note: "Upload a new one from Account and we'll check it again.",
        button: { label: "Upload a new one", href: appLink(d) },
      }),
  },

  // ---- To talent -----------------------------------------------------------
  "booking-request": {
    to: "Talent",
    when: "When a venue sends this talent a booking request, or adds them to one with Send to more people.",
    render: (d) =>
      email({
        subject: `${d.venue} sent you a booking request`,
        preheader: `${d.positions} · ${d.dates} · ${d.rate}`,
        eyebrow: "Booking request",
        headline: `${d.venue} wants to book you`,
        intro: "Let them know if you can do it. The first answers usually get the booking.",
        rows: shiftRows(d),
        button: { label: "Answer the request", href: appLink(d) },
      }),
  },
  booked: {
    to: "Talent",
    when: "When the venue books this talent for a shift they said yes to. Not sent when the talent books themselves by tapping Accept.",
    render: (d) =>
      email({
        subject: `You're booked at ${d.venue}`,
        preheader: `${d.positions} · ${d.dates} · ${d.hours}`,
        eyebrow: "Booked",
        headline: `You're booked at ${d.venue}`,
        rows: shiftRows(d),
        note: "The address and everything else you need are in your booking.",
        button: { label: "View booking", href: appLink(d) },
      }),
  },
  "days-cancelled-talent": {
    to: "Talent",
    when: "When the venue cancels some or all of this talent's booked days, with the venue's reason.",
    render: (d) =>
      email({
        subject: `${d.venue} cancelled ${d.cancelled}`,
        preheader: d.reason,
        eyebrow: "Cancelled",
        headline: `${d.venue} cancelled`,
        rows: [["Venue", d.venue], ["Role", d.positions], ["Cancelled", d.cancelled], ["Reason", d.reason]],
        note: "Those days are free again in your availability.",
        button: { label: "View booking", href: appLink(d) },
      }),
  },
  "shift-closed": {
    to: "Talent",
    when: "When the venue closes a shift this talent was asked for or had said yes to but wasn't booked on yet. Booked people keep their booking and get nothing.",
    render: (d) =>
      email({
        subject: `${d.venue} cancelled a shift you were asked for`,
        preheader: d.reason,
        eyebrow: "Shift cancelled",
        headline: `Cancelled by ${d.venue}`,
        rows: [["Venue", d.venue], ["Role", d.positions], ["Dates", d.dates], ["Reason", d.reason]],
        note: "You don't need to do anything.",
        button: { label: "View shift", href: appLink(d) },
      }),
  },
  reminder: {
    to: "Talent",
    when: "Once per booking: at 18:00 London time the evening before the first booked day, or 2 hours before it starts if they were booked that same day.",
    render: (d) =>
      email({
        subject: `Reminder: your shift at ${d.venue}, ${d.day}`,
        preheader: "The address is in your booking.",
        eyebrow: "Reminder",
        headline: `Your shift at ${d.venue}`,
        rows: [["Venue", d.venue], ["Role", d.positions], ["When", d.day]],
        note: "The address is in your booking.",
        button: { label: "View booking", href: appLink(d) },
      }),
  },

  // ---- To venues -----------------------------------------------------------
  "said-yes": {
    to: "Venue",
    when: "When a talent taps I can do this on the venue's job post or request, or a booked talent offers more days on the shift.",
    render: (d) =>
      email({
        subject: `${d.talent} can do it`,
        preheader: `${d.positions} · ${d.dates}${d.partial ? ` (${d.partial})` : ""}`,
        eyebrow: "New answer",
        headline: `${d.talent} can do it`,
        rows: [
          ["Role", d.positions],
          ["Can do", d.partial ? `${d.dates} (${d.partial})` : d.dates],
          ["Hours", d.hours],
        ],
        note: "Book them before someone else does.",
        button: { label: "View answers", href: appLink(d) },
      }),
  },
  accepted: {
    to: "Venue",
    when: "When a talent accepts a booking request that went only to them for one place. Accepting books them straight away.",
    render: (d) =>
      email({
        subject: `${d.talent} accepted. They're booked.`,
        preheader: `${d.positions} · ${d.dates} · ${d.hours}`,
        eyebrow: "Booked",
        headline: `${d.talent} accepted`,
        intro: "They're booked. You don't need to do anything else.",
        rows: [["Role", d.positions], ["Dates", d.dates], ["Hours", d.hours]],
        button: { label: "View booking", href: appLink(d) },
      }),
  },
  declined: {
    to: "Venue",
    when: "When a talent declines the venue's booking request.",
    render: (d) =>
      email({
        subject: `${d.talent} declined your booking request`,
        preheader: `${d.positions} · ${d.dates}`,
        eyebrow: "Declined",
        headline: `${d.talent} declined`,
        rows: [["Role", d.positions], ["Dates", d.dates], ["Hours", d.hours]],
        note: "You can send the request to more people from the shift.",
        button: { label: "View shift", href: appLink(d) },
      }),
  },
  "days-cancelled-venue": {
    to: "Venue",
    when: "When a booked talent cancels some or all of their days, with their reason. Those places reopen on the shift.",
    render: (d) =>
      email({
        subject: `${d.talent} cancelled ${d.cancelled}`,
        preheader: d.reason,
        eyebrow: "Cancelled",
        headline: `${d.talent} cancelled`,
        rows: [["Role", d.positions], ["Cancelled", d.cancelled], ["Reason", d.reason]],
        note: "Those places are open again on your shift, so you can book someone else.",
        // The notice opens the booking; this button says shift, so it opens the shift.
        button: { label: "View shift", href: appLink(d, d.shift_id ? `shift/${d.shift_id}` : d.target) },
      }),
  },
  "shift-unfilled": {
    to: "Venue",
    when: "When a shift's start time arrives with places still empty. Checked by the five-minute sweep.",
    render: (d) =>
      email({
        subject: `Your shift started unfilled: ${d.positions}`,
        preheader: d.dates,
        eyebrow: "Unfilled",
        headline: "Shift started unfilled",
        rows: [["Role", d.positions], ["Dates", d.dates]],
        note: "Nobody was booked for it in time.",
        button: { label: "Post it again", href: appLink(d) },
      }),
  },
};

export function render(kind, data) {
  const e = EMAILS[kind];
  if (!e) throw new Error(`Unknown email kind: ${kind}`);
  return e.render(data);
}
