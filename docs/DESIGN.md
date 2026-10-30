# Dyuknow mobile — design direction

Source of truth for every screen. Read with `src/theme/tokens.ts` and `docs/FEATURES.md`.

## Who it's for
London fine-dining venues booking talent (chefs, pastry, bar, sommeliers, floor) for one-off services, and the talent who work them. Mostly on phones, often mid-service, sometimes older eyes. Invite-only, free, no ads. Real data only: the live Supabase project.

## The object: the kitchen pass
The pass is the steel shelf where tickets hang on the rail under the heat lamp. Every chef and every manager trusts it.

| Pass | Interface |
|---|---|
| The pass (shelf) | `page` background |
| A ticket / docket | `Ticket` card: a shift, a booking, a request |
| The ticket under the lamp | **ink** filled ticket = waiting on you (a request to answer, a yes to book, hours to confirm) |
| A spiked ticket | done: sage word + check ("Booked", "Worked 6.25 h") |
| The member pass | onboarding's final card, profile header |

Rejects: white list with a blue accent, gig-app urgency, dashboards, stats, marketing copy.

## Colour means one thing each
- **ink** `#141712` — primary buttons and "waiting on you". Primary buttons are ink (near-white in dark mode).
- **sage** `#a8c5a0` / sage-soft `#d3e2cc` with `#35532b` text — settled: booked, available, verified, worked. Never a button.
- **danger** `#9c3333` — unread dots and destructive actions only.
- Neutral greys for everything else. Status is always a **word + symbol**, never colour alone.
- Only tokens, never raw hex in a screen. Light and dark both work.

## Type
- Instrument Serif (400, italic) for names, venue names, screen titles, the wordmark, and the one italic phrase in a hero headline ("Who do you need *for service?*").
- Helvetica Neue (iOS) / system sans (Android), weights 400/600/700, for everything else.
- Times, counts, money: `tabular` prop on `Text` (tabular numerals).
- No uppercase eyebrows except `label` style for small section labels.

## Phone parts, not web parts
- Tabs: native tabs (Liquid Glass on iOS, Material on Android). Venue's "Post a job" is the prominent tab.
- Headers: native stack headers; large titles on tab roots that collapse on scroll.
- Sheets: `formSheet` with detents for every self-contained task (book, which days, cancel days, confirm hours, close, send to more, crop). Android sheets have no header — render title inside.
- Forms: grouped Settings-style rows (`FormSection` + `TextRow`, `SwitchRow`, `PickerRow`, `TimeRow`). Never boxed fields with labels above.
- Menus: `Stack.Toolbar.Menu` for "⋯" actions.
- Icons: `<Icon name>` from `src/ui/icons.ts` only.

## One plain action per thing
- One labelled primary action per screen ("Book Camille · 3 days", "Send", "Accept"). Bare icons only for universally known controls (back, close, send).
- A check means done, never "do this".
- Rows: two lines max — what it is, then the one detail that matters.
- No dead ends: every empty state offers the next step; every pushed screen has back.

## Real data only
Designed loading (skeleton tickets), empty (one sentence + next step) and error (one line + Try again) states on every list. Nothing happened = "no data", never a perfect score. Offline: one plain line.

## Everyone
- Larger-text mode (Account › Text size) via `useTheme().scale`; respect Dynamic Type too.
- 44pt minimum targets (`theme.hit`). Secondary text ≥ 4.5:1.
- `accessibilityLabel`/`accessibilityRole` on every control; toasts are announced.
- Reduce Motion: fades instead of movement.
- Copy: British English, short, plain, specific. "Booking request", "Job post", "I can do this", "Book", "Accept", "Cancel days", "Confirm hours". No filler subtitles.

## Motion and haptics
- Animate only changes: button → check, ticket lighting, pass seal, progress. Use `theme.motion` tokens only.
- Haptics (`src/ui/haptics.ts`): `commit()` on save/send/book/confirm success, `warn()` on refusal, `select()` on picker ticks. Never on every tap.

## Kit first
Feature code only arranges `src/ui` parts. Need something new? Ask for it to be added to the kit; never build it locally.
