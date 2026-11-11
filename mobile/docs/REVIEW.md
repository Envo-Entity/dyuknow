# Review findings for wave 2 (fix every item in your area)

## Seen on the simulator
- **Native large titles render empty** under native tabs in SDK 58. `TabStack` now has `headerLargeTitleEnabled: false`. Every tab root must pass `title` to `<Screen title="…">`: Shifts, Availability, Messages, Profile, Bookings, Post a job. Book keeps its serif hero headline and needs no separate title. Use `headerLargeTitleEnabled` (not `headerLargeTitle`) where a pushed screen wants one, and check it actually draws.
- **Never size a box with `aspectRatio` inside a `flexWrap` row.** On iOS it collapses to zero height, which is why the team mosaic was invisible. Give it an explicit `height`.
- **Team list cards are too tall.** One full-width 4:5 photo per person fills the whole screen. Make them compact and scannable:
  - A 4:5 photo about 112pt wide on the left, with the name in serif, the status `Badge` and positions · area on the right.
  - Pay plus the top 3 skills underneath, and the actions in one row.
  - The big photo lives on `/talent/[id]`.
- **Toasts:** errors 6 s, success 3.5 s. The kit handles this.
- **Tab badges are now ink**, because they all mean "waiting on you".

## P0: broken flows
- **Availability:** the Save `StickyAction` sits under the floating tab bar. Use the kit's tab-aware `Screen` footer.
- **Reset password:** the screen unmounts mid-flow. Use the kit or data hold described in `KIT.md`.
- **Notifications:** opening a tab target pushes a duplicate tab navigator. Use `router.navigate`/`dismissTo` for `/t/*` and `/v/*`; keep `push` for `/shift`, `/booking` and `/account`.
- **`run` keys must include the arguments** (pass `opts.args`) so a retried tap with different choices doesn't reuse the old `client_ref`. Affected: `cancel:`, `close:`, `availability`, `profile`, `alerts`, `photo`, `doc:`.

## P1
- **Sheets briefly show "already recorded/cancelled" after success.** Navigate first, or keep a `done` flag (CancelDays, ConfirmHours).
- **Keyboard:** use the kit's keyboard-aware footer on both platforms (chat composer, StickyAction, onboarding footer, cancel-days, compose).
- **Errors inside sheets:** show the error inline (§1.6.4) using the kit's run-with-error API.
- **Badges:** never word-only for a status. Neutral now has a default symbol, so don't pass `icon={null}` for statuses. Change the "Not accepted" document status from danger to the attention or neutral tone.
- **Ink primary buttons:** one per screen. Make the others secondary:
  - VenueShift: Send new request / Ask X again / New request / Ask again.
  - Account: every document Upload.
  - TeamList: the per-card "Said yes · Book".
- **Larger text:** don't truncate key info. Use the Row `subtitleLines` and Badge wrapping.
- **Headings:** one style for groups of tickets (kit `GroupHeading`). `Section label` is only for form groups.
- **Spec gaps:**
  - Profile edit: the "Bio · {n}/250" label, the "Save profile" label (spoken and visible), the Account jump index.
  - Account Notifications copy is verbatim "Notices show in the app, on the bell.", then the extra line "Push notifications aren’t available yet." Venues get no empty Notifications card.
  - Chat: `clockLabel` times. The talent's pinned strip shows the bio when there are no types.
  - Compose: pay shows a "£" prefix and a "/ hour" suffix, with the accessibility label "Pay per hour in pounds".
  - Notifications: the empty state gets a next step.
  - Messages: a thread whose last item is a card previews that card (positions · dates), not "No messages yet".

## P2
- Mark-read is called twice on a shift (`shift/[id].tsx` and `TalentShift`): keep only the route's call.
- `open_conversation` should run quietly (kit `useMessage`).
- Pull-to-refresh spinner: use the kit's `useRefresh()` everywhere.
- Accessibility: `TextLink` hit area 44pt (kit), the Disclosure `expanded` state (kit), the Add-to-request `selected` state, links nested in tappable tickets should become separate rows or accessibility actions.
- Sheet padding indented twice, and the sheet background is page instead of card.
- A `SelectSheet` inside a `Section` draws a stray hairline: render it outside the Section.
- "Go home" on not-found screens: use `router.dismissTo`/`navigate`, not `replace`.
- Add to calendar: guard against duplicates, at least within the session.
- `keepFile`: clean up copied onboarding files after submit or logout.
- ConfirmCode: when no email is known, go back to sign-in.
- Composer `key` must not change on reload (`again`).
- An empty "Open jobs" ticket must not use `spiked`, which means done.
- Android ⋯ menu: use `Stack.Toolbar.Menu` on Android too (Material icons via `Stack.Toolbar.Icon`), or a `SelectSheet`, instead of `Alert.alert` without a Cancel.

## Kit consolidation: replace local copies with the kit and domain versions
`money`, `hoursLabel`, `whenLine`, `daysPhrase` and `sentTo` come from `@/domain`. `useMessage`, `useRefresh` and `LiveGate` come from the data layer or kit. `DetailRow`, `TextLink`, `IconButton`, `GroupHeading`, `Scrim`/`OnPhoto`, `Disclosure`, `PhotoCropModal`, `CheckRow` with photo, `StickyAction` danger and multi-line note, `Photo` with `source`, `TextRow` `stacked`/`prefix`/`suffix` and `CodeField` all come from the kit. Delete the local duplicates.
