---
name: Dyuknow MVP preview
description: The established hospitality design language applied to the frontend v2 cover journeys.
colors:
  paper: "#ffffff"
  preview-ink: "#141712"
  preview-muted: "#5d625c"
  sage: "#a8c5a0"
  surface: "#f5f6f2"
  positive-surface: "#e6eee2"
  positive-text: "#35532b"
  unread: "#9c3333"
  danger-surface: "#f7eeeb"
  danger-text: "#80322c"
  focus: "#3f6541"
  outline: "#dce0d8"
typography:
  display:
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif'
    fontSize: "clamp(36px, 4.1vw, 64px)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  title:
    fontFamily: "var(--font-instrument-serif), Georgia, serif"
    fontSize: "30px"
    fontWeight: 400
    lineHeight: 1.1
  body:
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif'
    fontSize: "15px"
    lineHeight: 1.6
  button:
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.3
rounded:
  field: "14px"
  caption: "20px"
  card: "25px"
  mosaic: "26px"
  chrome: "28px"
  entry: "30px"
spacing:
  action-gap: "10px"
  mosaic-gap: "16px"
  card-padding: "20px"
  card-gap: "24px"
components:
  button-primary:
    backgroundColor: "{colors.preview-ink}"
    textColor: "{colors.paper}"
    typography: "{typography.button}"
    rounded: "{rounded.chrome}"
    padding: "12px 21px"
  button-danger:
    backgroundColor: "{colors.danger-surface}"
    textColor: "{colors.danger-text}"
    typography: "{typography.button}"
    rounded: "{rounded.chrome}"
    padding: "12px 21px"
---

# Dyuknow MVP preview design

## Overview

**Scope:** `/preview`, and `/` on branch `MVP-preview`, both render `components/preview/PreviewApp.tsx`. This document describes that surface only. [DESIGN.md](../DESIGN.md) remains the established visual reference; [PRODUCT.md](../PRODUCT.md) supplies the curated hospitality positioning. This preview extends that world with the **Operate** mode: clear decisions, agreed terms and connected venue/talent journeys.

[mvp-user-flow.md](mvp-user-flow.md) v2 is authoritative for this surface's journey and language changes; [MVP-preview-walkthrough.md](MVP-preview-walkthrough.md) gives the eleven reproducible stories. Here, **shift** is the venue's request, **I can cover this** is a response, **invite** is the venue's offer, and **booked** is the confirmed agreement. This scoped vocabulary supersedes the older product language restriction on “shift”; it does not redefine the legacy app.

The visual authority is the existing Instrument Serif/Helvetica pairing, sage/ink/white palette, bundled monochrome hospitality photography, asymmetric role mosaic and rounded floating chrome. The source is `components/preview/preview.css` and `components/preview/ui.tsx`, with behavior in `lib/preview/model.ts` and `lib/preview/store.ts`. The frontmatter records actual preview values; it is not a new global token system.

**Preview boundary:** a shared browser-local sample world under `dyuknow_mvp_preview_v1`, with hash navigation, saved drafts, in-app notices and simulated transactions. Other tabs in the same browser refresh through storage events. Separate devices/browsers do not share state; database concurrency guarantees, real authentication, SMS, payments and a backend are outside this preview. The sample clock starts at 1 October 2026, 10:00 Europe/London and advances through Preview controls. Reset restores only the preview world.

## Colors

White carries the page and floating caption panels. The preview's slightly green ink and muted text keep the established neutral hospitality character. Sage fills the venue entry panel and marks selected chips, confirmed states, availability, attention panels and positive feedback; the talent entry panel reverses ink and sage for its CTA.

The red unread token marks message/notification attention. Warm danger tones identify destructive actions and failed saves. These are functional state colors in this surface, not additional role/category palettes. Labels accompany status colors; a response waiting for a venue decision never receives the booked treatment.

## Typography

Helvetica supplies headings, fields, buttons, chat and body text. Instrument Serif supplies the wordmark, role/card titles, venue/person names and italic emphasis in hero headlines. The font is inherited from `app/layout.tsx`; no new family is introduced.

The main heading uses the display token, stepping to 42px on mobile. Entry headings scale from 42–70px; entry panel headings from 38–60px, with a 46px mobile override. Serif section and card titles generally use 29–35px. Controls use 11–14px text, and supporting descriptions remain around 60–68 characters wide. Preview labels are readable sentence case; the legacy uppercase `Eyebrow` component is not applied indiscriminately to operational fields.

## Layout

The workspace uses a centered container (maximum 1180px) with desktop padding of 40px top, 48px right, 110px bottom and 165px left to clear the floating rail. Welcome uses a 1280px container and two contrasting entry panels. The sticky sample-world strip (34px minimum height) sits above a sticky workspace header; account switching, notifications and the walkthrough stay reachable through long stories.

The venue role mosaic has three columns (`1.1fr 1fr 1fr`) and two 225px rows; Kitchen spans both rows. Photo captions float inside tiles. Talent shifts use two columns of photo-led cards; composer, profile, chat and detail layouts pair context with tasks. Composer artwork and detail context remain sticky on desktop. Lists are used where decisions or conversations need direct comparison.

Responsive behavior is CSS-only:

- At 1050px and below, workspace padding and detail gaps tighten; filters use two columns.
- At 760px and below, workspace padding becomes 24px 20px 135px. The four labelled navigation controls form a floating bottom pill, 16px from its edges. Welcome, cards and detail/composer/profile layouts stack; desktop chat context is hidden while the pinned terms remain in the thread. The mosaic becomes two columns with a full-width Kitchen tile.
- The My shifts summary always includes all 14 dates: fourteen columns on wide screens, two rows of seven at 1100px and below. Booked dates show the venue name. The separate editor uses a four-column date grid plus copy-to-date controls.
- Mobile form fields use 16px text. Dialogs retain viewport margins and a height limit; feedback appears above the navigation (104px from the bottom). Segmented controls scroll horizontally when needed.

## Elevation & Depth

Depth comes from white caption panels overlapping photographs, quiet tonal surfaces and diffuse shadows. The floating navigation uses `0 10px 36px #14201012` on desktop and `0 6px 30px #14201024` on mobile. Shift cards use `0 10px 28px #1420100a`; dialogs use `0 30px 90px #14201033` with a `#17251470` backdrop. Secondary buttons use an inset outline rather than a filled panel.

Buttons lift 2px over 160ms; shift cards lift 3px over 180ms. Role photographs scale to 1.03 over 600ms. Reduced-motion preferences remove preview transitions and animations. Motion communicates interaction; it does not delay access to a task.

## Shapes

Cards and imagery use soft corners, with smaller inset caption panels. Entry panels are the broadest shape; fields are more compact. Buttons, badges, segmented controls and avatars remain pill or circular forms. Native dialogs use a 28px radius (24px on mobile), a circular close control and padded content (30px desktop; 24px 20px mobile). Fine rules separate terms, conversations and reports without boxing every row.

## Components

`ui.tsx` owns Button, Photo, Badge, Heading, Empty, Modal, Services, ShiftCard, Field and Segments. The preview has its own primitives, inheriting the visual world of `components/ui/*` without assuming those legacy variants or behavior are identical.

| Pattern | Actual usage and state |
| --- | --- |
| Buttons | Primary ink, secondary inset outline, quiet text, and warm danger. Minimum height 46px; disabled controls dim and use a blocked cursor. |
| Photo and cards | Bundled `/assets/*.webp` images crop with `object-fit: cover` and grayscale. Missing imagery uses a serif monogram; captions overlap images. Member/photo details are illustrative. |
| Fields and choices | Label-wrapped native inputs/selects/textarea, pale fill and 46px minimum height. Role/skill chips and Segments expose selected states where implemented. Native checkboxes use sage. |
| Navigation | Venue: Book, Bookings, Messages, Profile. Talent: Shifts, My shifts, Messages, Profile. Message red dots track unread chat; booking counts track pending decisions. Reading chat clears its dot; a decision persists until acted on. Owner has Shifts, Members, Bookings, Notifications. |
| Terms and confirmations | Services lists each date and its explicit hours, London timezone and same-person bundle rule. Shift/chat/booking screens share those terms. Posted response + venue Book, or invitation + talent Accept, supplies the two yeses. Invitations compete for actual remaining capacity. |
| Frozen agreement | Sending freezes roles, service dates/hours and hourly pay. Edit and resend closes the old request and creates a linked new request; it is blocked once anyone is booked. Preparation notes remain editable. Address/contact/phone are captured when sent so later profile defaults do not rewrite arrival details. Chat never renegotiates the stored terms. |
| Availability | Published free hours, Not free, Not set and booked intervals are distinct. Bookings block conflicting time; cancellation does not republish it as free. Availability changes never cancel a booking. |
| Recovery and history | Cancellation needs a reason, notifies the other side and retains history. No-show/issue reports are private to the owner. A venue can start a replacement after cancellation or a no-show/issue report; it is a new request with dates reviewed before sending. Elapsed time does not invent attendance. |
| Joining and approval | Setup saves its draft, predefined/custom skills, next-seven-day selections and Day (09:00–17:00) or Evening (16:00–23:59) hours; availability can be skipped. Pending members may edit their profile and inspect a linked shift's frozen terms, but cannot respond/accept until approval. |
| Notices and failures | In-app notices link to the affected record. Success uses `role="status"`; failures use `role="alert"`, including inside dialogs. Offline/failed actions show an explanation and retain drafts; they do not display a false success. Empty supply offers owner help. |

Accessibility is grounded in native controls and `<dialog>.showModal()`: dialogs have names, close buttons, Escape cancellation and backdrop dismissal. Navigation marks its current page; progress marks its current step; segmented selections and several chip groups use pressed state. Visible focus uses the focus token with a 2px outline and 4px offset. Chat updates use a polite live region. Photos default to empty alt text when surrounding content provides identity. These are observed features, not a claim of a complete accessibility certification; the mobile bell is currently 34px and the dialog close control 40px.

## Do's and Don'ts

- **Do** extend the existing hospitality world and keep operational decisions explicit. Preserve photo-led role selection and rounded floating chrome.
- **Do** show dates, hours, role and hourly pay before a commitment; use “waiting” until the second yes. Distinguish unread communication from decisions requiring action.
- **Do** retain all 14 schedule dates and booked venue labels on mobile. Keep pending linked terms legible while approval gates the action.
- **Do** retain original booking/report history when creating a replacement, and preserve drafts when an action fails.
- **Don't** add match scores, invented scarcity, unsupported ratings or verification claims. Skills describe experience; they do not fabricate ranking.
- **Don't** imply SMS delivery, real authentication, payment processing or cross-device transactions. Preview controls and the sample-world label must keep the simulation clear.
- **Don't** promote preview-specific language, breakpoints, lists or labelled navigation into a replacement of the root design system.

Evidence: `.impeccable/review/entry-desktop.png`, `desktop.png`, `mobile.png`, `talent-desktop.png` and `talent-mobile.png` record the entry and both home surfaces. `setup-skills.png`, `setup-week.png`, `pending-shift.png`, `no-show-replacement.png` and `fortnight-mobile.png` capture the four resolved follow-up areas: saved setup choices, pending linked terms, replacement after a private report, and the complete mobile fortnight. Source and these captures were checked together for this scoped document.
