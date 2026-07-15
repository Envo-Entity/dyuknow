# Dyuknow — Design System

This is the design reference for Dyuknow, a premium talent-booking platform for
London's fine-dining and luxury hospitality scene. It documents the visual
language actually implemented in this codebase, so it stays in sync with the
app rather than the other way around. If you change a token or a pattern,
update this file in the same change.

Positioning in one line: **"Resy, but for the people instead of the tables."**
Curated, concierge, membership by referral. Never a job board, never gig-work
energy — see `PRODUCT.md` for the language rules this implies.

## The law

If a view only looks good once colour is added, the structure has failed —
fix the structure, never lean on paint. Every screen must read as premium in
pure greyscale first. Layout is the star: asymmetric bento mosaics,
content-as-tile cards, floating chrome, sticky context panels.

**2026 refresh:** pure greyscale-first was read as too monotone, so sage now
gets one additional job on top of its semantic ones — a single bold panel
fill as the hero moment of a view (the Fork screen's light-side panel, see
`ForkPanel`), mirroring the marketing site's black/sage two-up split. This is
still one sage element per view, just a larger one in that one spot; every
other sage usage stays a small semantic accent (see Colour below). Structure
still has to work in greyscale first — the sage fill should read as "the
premium panel" in mono too, not just as paint.

### Banned, on every viewport

Uniform grids of identical cards, vertical lists of plain rows, a bottom tab
bar, a search bar bolted across the top, a hamburger menu, a generic
horizontal navbar, SaaS marketing-site headers, footer sitemaps, or
sidebar-with-icon-list admin-dashboard chrome. Desktop is a crafted
application, not a stretched or centered website.

## Colour

Everything lives in `app/globals.css` as CSS custom properties, re-exposed to
Tailwind v4 via `@theme inline` so they're usable as `bg-*` / `text-*` /
`border-*` utilities directly (e.g. `bg-sage`, `text-label`).

| Token | Hex | Usage |
|---|---|---|
| `paper` | `#FFFFFF` | Page background |
| `ink` | `#050505` | Primary text, primary CTA fill, active chrome |
| `ink-soft` | `#4a4a4a` | Body copy (about text, room descriptions) |
| `muted` | `#7a7a7a` | Secondary text |
| `label` | `#8a8a8a` | Eyebrows, uppercase labels, captions |
| `faint` | `#9a9a9a` | Tertiary text, placeholders in dark contexts |
| `hairline` | `#b0b0b0` | Fine dividers, timestamp text |
| `mist` | `#F5F5F5` | Soft fill panels, chip backgrounds, empty states |
| `fog` | `#EFEFEF` | Photo-placeholder background |
| `border` | `#E7E7E7` | Default hairline borders (icon buttons, tag pills) |
| `border-soft` | `#F0F0F0` | Lighter dividers (chat header rule, chip cards) |
| `sage` | `#A8C5A0` | **The one accent.** Availability, verified, new, booked, active filter |
| `dot-inactive` | `#C9C9C9` | The "off" state of an availability/status dot |

Nothing exists outside this palette. No second accent, no gradients, no
tinted surfaces per role/category.

**Sage's jobs:** the "pass is open" dot on Venue Home, the availability dot +
pill on talent cards/profiles (the pill itself now gets a faint sage tint —
`bg-sage/25` — when available, see `AvailabilityBadge`), the "Verified" mark,
the "NEW · 12 min" badge on fresh feed items, the unread-message dot, the
active filter chip, the accepted-booking confirmation, and — as of the 2026
refresh — the Fork screen's light-side panel fill (`ForkPanel`'s non-dark
variant). Outside of that one hero-panel exception, sage stays a small
semantic accent; if you reach for it for anything else decorative, stop.

**CTA rule:** primary action = solid `bg-ink` pill with white text, one per
screen. Secondary = hairline `border-border` outline pill, or a circular
outline icon button (save/bookmark). The two Fork panels invert their arrow
circle to borrow the *other* panel's colour — dark (ink) panel gets a sage
circle, sage panel gets an ink circle — so each CTA still reads as "the
accent action" against its own background. Never invert the whole palette
per-surface beyond that pair.

## Typography

Two font families — this is the pairing used across all of Dyuknow's apps,
matching the marketing site:

- **Instrument Serif** (`--font-serif`, weight 400, italic available, loaded
  via `next/font/google` in `app/layout.tsx`) — person/venue names, quotes,
  and the italic-emphasis phrase inside a hero headline (see below). Used
  large: `clamp(...)` fluid sizing, scaling genuinely large on desktop (up to
  `92px`) rather than timidly.
- **Helvetica** (`--font-sans`, system stack: `"Helvetica Neue", Helvetica,
  Arial, sans-serif` — no webfont to load, it's a system font) — all UI text:
  labels, body copy, buttons, chips, chat, and the bold base of hero
  headlines.

**Hero headline pattern (2026 refresh):** the true hero headline of a screen
(Fork panels, Venue Home, Talent Home) is no longer set entirely in serif.
It's bold Helvetica for the base clause, with one closing phrase swapped to
`font-serif italic font-normal` for emphasis — e.g. "Who do you need
*today?*", "I'm short for *service*". This mirrors the marketing site's
mixed-weight headlines. Don't apply this to names, single-word page titles
("Messages", "Bookings"), or role labels — those stay plain serif, unsplit.

**Hero caption pattern (2026 refresh):** the one-line contextual caption
above a hero headline (Venue Home's "The pass is open · …", Talent Home's
"Good evening, Camille · …") is a small sage dot + `font-serif italic`
caption (`~15px`, `text-ink-soft`), not the uppercase-tracked Eyebrow style.
This is distinct from `Eyebrow` — structural/functional labels elsewhere
(breadcrumbs, section labels, filter states) keep the uppercase-tracked
convention below; only true hero captions get the italic-serif treatment.

Conventions:
- Eyebrows/labels (structural, not hero captions) are always `11px`,
  `font-semibold`, `uppercase`, `tracking-[0.14em]`, colour `text-label`. See
  `components/ui/Eyebrow.tsx`.
- Quotes (reviews, venue notes) are serif *italic*, `~17–17.5px`.
- Body copy (about text, room descriptions) is `14.5px/1.6`, `text-[#4a4a4a]`.
- On the sage Fork panel specifically, swap `text-label`/`text-muted` for
  `text-ink`/`text-ink-soft` — the grey label/muted tones don't hit 4.5:1
  against sage.

## Shape & elevation

- **Pills**: `rounded-full` for every button, chip, badge, and avatar.
- **Cards**: `24–30px` radius (`rounded-[26px]` is the most common card
  radius; hero panels and sheets go up to `30px`).
- **Chip/info-tile radius**: `16–18px`.
- No hard edges, no visible borders as a primary separator — depth comes from
  soft, diffuse shadows (e.g. `shadow-[0_12px_36px_rgba(5,5,5,0.08)]` on
  cards, deepening on hover). Borders (`border-border`) are used sparingly,
  only on outline buttons and tag pills, never on filled cards.
- Photo placeholders and content tiles overlap: a white/near-white caption
  chip floats over the bottom of a photo tile rather than sitting below it as
  a separate block (see the role mosaic and feed cards).

## Motion

Defined once in `globals.css`, applied as utility classes:

- `.animate-view-in` — the default page-enter transition (`translateY(12px)`
  → `0`, fade in, `cubic-bezier(.2,.7,.2,1)`, ~`0.45–0.5s`). Every screen
  wrapper (`components/layout/Page.tsx`, `ChatView`, the Fork page) uses this.
- `.animate-fade-in` — plain opacity fade for backdrops (account sheet,
  venue-detail modal scrim).
- `.animate-panel-in` — slide-in-from-right for the desktop venue-detail side
  panel (`translateX(32px)` → `0`).
- Hover state everywhere is **lift + shadow deepen**
  (`hover:-translate-y-1`/`-1.5`, larger shadow) — never a colour flip. Nav
  rail buttons lift `-translate-y-0.5` on hover.

## Layout patterns

- **Floating chrome, never boxed.** The identity pill (mobile, top-right) and
  the nav cluster (bottom-center pill on mobile, left vertical rail on
  desktop `lg:`) float over content with blur + shadow — they are never a
  docked bar or sidebar with a background panel.
- **Bento mosaics over grids.** Venue Home's role mosaic and the Talent
  opportunities feed both use explicit per-item `grid-column`/`grid-row`
  spans (see `SPAN_DESKTOP` maps in `RoleMosaic.tsx` / `OpportunityFeed.tsx`)
  to create an asymmetric hero-tile-plus-varied-tiles rhythm on desktop,
  rather than a uniform card grid.
- **Content-as-tile.** A photo placeholder, a serif name, and one headline
  metric — that's the whole card (`TalentCard`, `FeedCard`, role tiles).
  Resist adding more fields to a tile; put detail on the profile/detail
  screen instead.
- **Sticky context on desktop.** Two-column detail screens (`TalentProfile`,
  `MyProfile`, `ChatView`'s context panel) pin the left/gallery or the info
  column with `lg:sticky lg:top-11` so context never scrolls out of view
  while the user reads reviews or chats.
- **1024px is the desktop line**, which is Tailwind's default `lg:` — so
  every responsive transform in this app is a plain `lg:` prefix, no JS
  `matchMedia`/`window.innerWidth` checks anywhere. This was a deliberate
  simplification over the original prototype (which computed `isDesktop` in
  JS): CSS-only breakpoints avoid hydration mismatches and are the idiomatic
  Next.js/Tailwind way to do it.

## Photography

Every photo slot in the source design ships as a placeholder asset (a 4×4px
stand-in), meant to be swapped for real photography later — there is no real
photography to render yet. Rather than broken `<img>` tags, every "photo" in
this app is `components/ui/PhotoTile.tsx` (rectangular content tiles) or
`components/ui/Avatar.tsx` (circular avatars): a `bg-fog` panel with a large
centered serif monogram letter, `grayscale(1) contrast(1.06)` applied via the
`.ph-mono` class. This **is** the intended aesthetic (the original brief's
"editorial monogram fallback"), not a temporary gap — treat it as a first
-class visual, not a loading state. When real photography is supplied, drop
it into `PhotoTile`/`Avatar` as a background image behind the monogram layer
and keep the same grayscale/desaturated treatment (the design brief specifies
monochrome photography throughout; a `photoTreatment` enum — monochrome /
desaturated / colour — existed as a design-tool knob in the original file but
has no in-app settings UI, so we hard-code monochrome).

## Component inventory

```
components/
  ui/           Avatar, PhotoTile, VerifiedBadge, AvailabilityBadge,
                IconButton, BackButton, Chip, Eyebrow — the shared atoms.
  chrome/       AppChrome (owns account-sheet open state + derives the
                signed-in side from the route), NavRail, IdentityPill,
                AccountSheet.
  layout/       Page — the shared min-h-screen/padding wrapper used by
                every top-level screen ("hero" vs "detail" top-padding).
  fork/         ForkPanel — the Venue/Talent sign-in split.
  venue/        RoleMosaic, RoleGrid, TalentCard, TalentProfile — venue-side
                screens (browsing and booking talent).
  talent/       OpportunityFeed, FeedCard, VenueDetailContent,
                VenueDetailModal, MyProfile — talent-side screens.
  profile/      LookGallery, ChipsGrid, ReviewsList, AvailabilityStrip —
                shared between the venue's view of a talent profile and the
                talent's own editable profile.
  messages/     MessagesView, ConversationRow, StatusCard.
  chat/         ChatView, ChatBubble, ProposalCard, SystemMessage, Composer,
                ChatContextPanel.
  bookings/     BookingsView, BookingCard, PastRow.
  icons.tsx     Hand-drawn outline icon set (stroke-based, 1.8px stroke),
                matching the original's exact SVG paths.
```

`lib/data.ts` holds all mock content (talent roster, roles, feed, seed
conversations). `lib/store.tsx` is the single client Context that owns the
mutable, `localStorage`-persisted state (booking proposal, availability,
messages, read receipts, saved/intro flags) and the selectors that derive
from it (`availabilityOf`, `unreadForSide`, `computeDays`, etc.). `lib/cn.ts`
is a minimal classname-join helper (no `clsx`/`tailwind-merge` dependency).

## Implementation gotcha worth remembering

Tailwind v4 emits its utilities inside a CSS `@layer`. Any hand-written CSS
in `globals.css` that targets a bare element selector (e.g. `a { color: … }`)
**must** also live inside `@layer base`, or it will permanently win over
Tailwind utility classes like `text-white` regardless of specificity —
unlayered CSS always beats layered CSS. This bit us once already (dark
Fork-panel text and active nav-rail icons were invisible until this was
fixed) — see the `@layer base { … }` block in `app/globals.css`. Keep all
global element-selector styling inside that layer.

## Deliberate deviations from the original prototype

The app was rebuilt from a single-file Claude Design (`.dc.html`) prototype
into idiomatic Next.js. A few things were intentionally translated rather
than copied literally:

- **Real routes instead of hash-routing.** Every screen is a real Next.js
  route (`/venue`, `/venue/role/[roleId]`, `/talent/chat/[chatId]`, …) instead
  of a client-side hash router over one page.
- **The one true modal (Talent → venue request detail) uses Next.js
  Intercepting + Parallel Routes** (`app/talent/@modal/(.)venue/[feedId]`),
  so the desktop side-panel-over-the-feed behaviour is a first-class,
  shareable/refreshable route, not a JS-only overlay flag. On mobile the same
  component renders as a full-screen takeover instead of a panel — no
  device-width branching in JS, it's the same component with `lg:` classes.
- **CSS-only responsive breakpoints** (see above) instead of a JS
  `isDesktop` state.
