# Dyuknow — Product

## What it is

Dyuknow is a premium talent-booking platform for London's elite fine-dining
and luxury hospitality venues. When a venue's head chef is away, they open
Dyuknow and **book** vetted, verified talent — for a single service, a
weekend, or a week-long *residency*.

**Positioning: "Resy, but for the people instead of the tables."** Curated,
concierge, membership by referral only. Never a job board. Never gig-work
energy.

This repo is a UI-only prototype: no backend, all data mocked in
`lib/data.ts`, but every interaction actually works and persists locally (see
"What's real" below).

## Language system (non-negotiable)

Use: **book, talent, cover, booking, residency, guest chef.**

Never: hire, recruiter, worker, job, listing, gig, shift, apply.

A week of cover is *"Guest Head Chef, this weekend only,"* not a shift. The
fork screen asks *"Who are you today?"* — never "Sign in as." Venue Home asks
*"Who do you need tonight?"* — never "Search talent." This isn't cosmetic:
the whole point of the product is that it doesn't feel like a job board, and
the copy is the first thing that would give that away.

## The two sides

Dyuknow is a two-sided marketplace. This prototype hard-codes one demo
identity per side (no multi-user auth):

- **Venue** — signed in as **The Larkspur** (one Michelin star, Mayfair,
  head chef away Fri 12 – Sun 14 Sep). Venues browse roles, browse talent,
  and send booking proposals.
- **Talent** — signed in as **Camille Aubert** (ex-The Fat Duck, ex-Core by
  Clare Smyth, live-fire modern British, Head Chef, verified). Talent browse
  an opportunities feed, request intros, and accept/decline proposals.

Both identities are visible to each other by design — the whole demo is
built around one specific match (The Larkspur ↔ Camille), so the state
(messages, the booking proposal) is genuinely shared between the two
"logged in as" views, exactly as it would be if two different people were
using two different browsers against the same backend.

## The five roles

One card template; featured metrics swap per role. Rate is shown low/muted,
or as "Rate on request."

1. **Head Chef** — pedigree, cuisine, Michelin/Rosette level, years at level,
   brigade size led, availability, rating + covers completed.
2. **Sommelier** — certification first (Master Sommelier / WSET / MW), region
   specialism, languages, years.
3. **Pastry Chef** — image-led lookbook, discipline (viennoiserie, plated,
   showpiece), pedigree, competitions.
4. **Bartender** — bar pedigree (World's 50 Best tier), competition
   placements, style.
5. **Maître d'** — rooms run, covers-per-night managed, languages, service
   specialism.

Verified members get a small sage checkmark. Scarcity language appears
throughout: *"4 viewing · closes 20:00"*, *"2 other venues viewing"*,
*"NEW · 12 min ago"*.

## Screens

| Screen | Route(s) | What it's for |
|---|---|---|
| Fork | `/` | "Who are you today?" — choose Venue or Talent |
| Venue Home | `/venue` | Role mosaic — "Who do you need tonight?" |
| Role Grid | `/venue/role/[roleId]` | Talent available for one role |
| Talent Profile (venue view) | `/venue/t/[talentId]` | Full profile, message/request-intro CTA |
| Talent Home | `/talent` | Opportunities feed — "Venues booking near you," filterable by cuisine tag |
| Venue Request Detail | `/talent/venue/[feedId]` (+ intercepted modal on desktop) | One venue's request: room, dates, rate, GM note |
| Messages | `/venue/messages`, `/talent/messages` | Conversation list; desktop also shows a booking status card |
| Chat + Proposal | `/venue/chat/[chatId]`, `/talent/chat/[chatId]` | Real-time-feeling thread; booking proposal lives as a structured card inside it |
| Bookings Hub | `/venue/bookings`, `/talent/bookings` | Upcoming (confirmed) + Past bookings, visible from both sides |
| My Profile & Availability | `/talent/me` | Camille's own profile, with an editable 7-day availability strip |

Persistent chrome (identity pill + nav rail + account sheet) wraps every
signed-in screen; see `components/chrome/AppChrome.tsx`.

## Core flow: booking Camille for the weekend

1. **Venue** opens Venue Home, taps **Head Chef**, sees Camille as the top
   match, opens her profile, taps **Message Camille**.
2. In chat, Venue taps **Send booking proposal** — this posts a structured
   proposal card (*Guest Head Chef · Fri 12 – Sun 14 Sep · £750/day ·
   The Larkspur*) into the shared conversation and flips the global proposal
   state to `sent`.
3. **Talent** sees the same conversation (from the Talent side) with
   **Accept booking** / **Decline** actions on that same card.
4. Accepting flips the proposal to `accepted`: a system message appears in
   the thread ("Booked · Guest Head Chef · Fri 12 – Sun 14 Sep"), a sage
   "Booked · Fri – Sun" badge appears wherever Camille/the booking is shown,
   and the booking now appears in **both** sides' Bookings Hub.
5. Declining flips it to `declined`, which re-enables the "Send booking
   proposal" button for the venue.

This proposal state (`none → sent → accepted/declined`) is the one true state
machine in the app — see `lib/store.tsx`'s `sendProposal` /
`acceptProposal` / `declineProposal`, and `proposalStatus()` for the label it
renders as everywhere (chat, messages status card, availability badges,
bookings hub).

## Secondary interactions

- **Request intro** — for feed/talent items that don't already have a
  conversation (`convo: null` in `lib/data.ts`), the CTA is "Request intro"
  instead of "Message" — clicking it just flips a boolean (`intros[id]`) and
  relabels the button "Intro requested." No conversation is created (matches
  the source design; these are meant to route through a concierge, off-app).
- **Save / bookmark** — a toggle per talent/feed item (`saved[id]`), shown as
  a filled vs outline bookmark icon. Cosmetic only — there is no "Saved" list
  screen yet.
- **Availability** — Camille's 7-day strip (`avail: Record<DayCode,
  boolean>`). Editable only from `/talent/me`; read-only everywhere else it's
  shown (her profile as seen by a venue). Toggling a day is disabled once
  that day is booked. Availability across Fri/Sat/Sun specifically also
  drives the "Available this weekend" vs "Limited availability" badge shown
  on her card in the Head Chef role grid.
- **Unread / badges** — the Messages nav icon shows a sage dot if any
  conversation for that side is unread; the Bookings nav icon shows one until
  that side has viewed the bookings hub at least once after a state change
  (`seenBooking`).

## Data model (see `lib/types.ts` + `lib/data.ts`)

- **Talent** — the 8-person roster (`camille`, `theo`, `aiden`, `ines`,
  `elodie`, `noor`, `dario`, `beatrice`), each with pedigree, spec, chips,
  lookbook, about, reviews, and an optional `convo` id.
- **RoleDef** — the 5 roles, each pointing at a `top` talent (if any) plus a
  list of other talent ids.
- **FeedItem** — the 4 venue requests Camille sees (`larkspur`, `meridian`,
  `ansley`, `belgravia`), each with an optional `convo` id and a `cta` of
  `"conversation"` or `"intro"`.
- **ConvoMeta** / **ChatMessage** — the 3 seed conversations and their
  message threads (`text` / `proposal` / `system` kinds).
- **AppData** (the one mutable, persisted blob) — `proposal`, `avail`,
  `convos`, `read`, `seenBooking`, `saved`, `intros`. Lives in
  `lib/store.tsx`'s `AppStoreProvider`, persisted to `localStorage` under
  `dyuknow_v1`, hydrated client-side after mount (server always renders the
  defaults, to avoid a hydration mismatch).

## What's real vs. mocked

**Real (actually works, persists across reloads via `localStorage`):**
routing, the booking-proposal state machine, chat messages (both sides can
"send" and see each other's messages, since it's one shared store), read
receipts, availability toggling, save/bookmark, request-intro, filtering the
opportunities feed.

**Mocked / not built:** authentication (no login — the two identities are
fixed), any identity other than The Larkspur / Camille, a real backend
(everything is `localStorage` on one device — Venue and Talent "seeing each
other's" messages only works because they share the same browser storage),
payments/rates beyond display text, the concierge/referral vetting process
itself, push notifications, a "Saved" list screen.

## Source

This app was rebuilt 1:1 (then adapted to idiomatic Next.js — see
`DESIGN.md`'s "Deliberate deviations" section) from a Claude Design
prototype. The original creative brief — full layout law, banned patterns,
responsive transformation spec, and colour/shape rules — is preserved in
`DESIGN.md`; treat that file as the canonical design reference going forward.
