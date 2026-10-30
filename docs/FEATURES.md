# Dyuknow member app: functional spec (React Native rebuild)

Source of truth: the live web app in `/Users/shivansh/Code/Envo/dyuknow` — `components/preview/*` in `live` mode, `lib/live/*`, `lib/preview/model.ts`, `components/auth/*`, `components/onboarding/*`, `lib/onboardingSelfServe.ts`, `docs/backend/*.md`, `supabase/migrations/20261021*` and `20261023*`.

This file says **what** each screen does: copy, rules, calls. Look and feel are in `docs/DESIGN.md`.

Conventions in this file:

- Copy in `code` or in quotes is **verbatim**. Keep the typographic apostrophe `’` where it is shown. A few strings use a straight `'`, and those are kept as well.
- `{x}` is a value filled in at runtime.
- "Helper `x()`" means the function of that name in `lib/preview/model.ts`. Port that file's logic as-is to `src/lib/model.ts`. Every screen reads the same `Data` object (see §1.2).
- "Toast" means the shared feedback bar (see §1.6). "Inline error" means the error line inside an open sheet (see §1.6).
- The talent's "Availability" tab is the web's `bookings` page for talent, and the venue's "Book" tab is the web's `home` page.

---

## 0. Route map (web hash route → expo-router)

The web app keeps everything after `#/{side}/{memberId}/`. In the real app the side and the member come only from the session, and the address is ignored.

| Web page | RN route | Notes |
|---|---|---|
| `/login` stage signin | `(auth)/sign-in` | |
| `/login` stage signup | `(auth)/create` | |
| `/login` stage signup-code | `(auth)/code` | Confirms a new account by email code. |
| `/login` stages forgot → reset-code | `(auth)/reset` | One screen, two steps: email, then code and new password. |
| `/join` | `join/index` | |
| `/join/talent` | `join/talent` | |
| `/join/venue` | `join/venue` | |
| talent `home` | `(talent)/shifts` | |
| talent `bookings` and `availability` | `(talent)/availability` | Web `availability` is the same editor with a Back button. Notices target `availability`. |
| `messages` | `(talent)/messages`, `(venue)/messages` | |
| `profile` | `(talent)/profile`, `(venue)/profile` | |
| venue `home` | `(venue)/book` | |
| venue `bookings` | `(venue)/bookings` | |
| venue `post` | `(venue)/post` | The round "Post a job" button in the middle of the tab bar. |
| `shift/<id>` | `shift/[id]` | |
| `booking/<id>` | `booking/[id]` | |
| `chat/<id>` | `chat/[id]` | `id` is a conversation id. |
| `talent/<memberId>` | `talent/[id]` | |
| `venue/<memberId>` | `venue/[id]` | |
| `team/<Team>/<d1,d2,…>/<HH:MM-HH:MM>` | `team/[team]?dates=d1,d2&time=HH:MM-HH:MM` | `team` is one of `Kitchen`, `Pastry`, `Bar`, `Sommelier`, `Floor`. |
| `new/<Team>` | `compose?team=<Team>` | Job post. |
| `new/<Team>/<id1,id2>` | `compose?team=&to=id1,id2` | Booking request. |
| `new/<Team>/<ids>/<Position>` | `compose?team=&to=&position=<Position>` | URL-encode the position. Web `-` means "no position". |
| `new/<Team>/<ids>/-/chat` | `compose?team=&to=&from=chat` | |
| `again/<shiftId>` | `compose?again=<shiftId>` | `to` defaults to everyone the original request went to. |
| `again/<shiftId>/<ids>` | `compose?again=&to=` | |
| `again/<shiftId>/<ids>/chat` | `compose?again=&to=&from=chat` | |
| `notifications` | `notifications` | |
| `account` | `account` | |
| modals | `sheet/which-days`, `sheet/book-confirm`, `sheet/cancel-days`, `sheet/confirm-hours`, `sheet/close-shift`, `sheet/send-more`, `sheet/crop` | See each screen for its params. |

Notice targets are stored in the database as `shift/<id>`, `booking/<id>`, `availability`, `profile` or `account`. Map each one to the route above.

---

## 1. Global behaviours

### 1.1 Session and where a person belongs

The app starts (and returns to the foreground) through the same checks as `loadLive` (`lib/live/load.ts`):

1. With no Supabase session, go to `(auth)/sign-in`.
2. With a session but no `members` row for `auth.uid()`, go to `join/index`.
3. Otherwise load the snapshot (§1.2) and open the tabs for `members.side`.
   - While the member isn't approved, the first screen is the Profile tab. See the approval gate, §1.3.

After sign-in, `destinationAfterSignIn` (`components/auth/routing.ts`) decides the next screen:

- A member row → the app.
- An admin with no member row → the web's `/admin`. The mobile app has no admin, so treat this as "no member" → `join/index`. This case is open; see the report.
- Anyone else → `join/index`.

The `join/*` screens bounce a person who already has a member row to the app (`requireJoinViewer`).

Loading states for the app shell:

- While the first load runs: an empty state with title `Loading…`.
- If the first load fails: an empty state with title `Couldn’t load Dyuknow`, the error text (fallback `Couldn’t load Dyuknow.`), and a button `Try again` that reloads.
- If a later reload fails, keep the old data on screen and do nothing visible.

### 1.2 The snapshot (`Data`)

One load reads everything the member may see. Row-level security filters it; the queries are in `lib/live/load.ts` and are mirrored in `src/lib/load.ts`. It builds the `Data` shape from `model.ts`:

`now, members, shifts, responses, bookings, messages, notices, availability, threads, read, messageDrafts`

Side fields: `me` (`members` row: `id, side, approved, deletion_requested_at, deleted_at`), `userId`, `email`, `docCodes` (label → code), `rejected` (label → reason), `seqs`, `lastSeq`, `myReads`, `photoPath`, `badges`.

What the load does, in order:

- Reads the own `talents` or `venues` row, `talent_cards`, `venue_cards`, and `availability` from today−1 to today+56.
- Reads own `documents`, `document_types`, `shifts` (newest first), `shift_days`, `answers`, `answer_days`, `bookings`, `booking_days`, `conversations`, `messages` (ordered by `created_at`, then `seq`), own `conversation_reads`, and own `notifications` (newest 200).
- **Talent only:**
  - `rpc('get_accept_flags', {p_shift_ids})` for every request-mode shift. It sets `shift.acceptBooks`, which decides whether "Accept" books at once.
  - Adds stand-in bookings (talent id `__someone`) so places-left counts stay right. Talent never see who else is booked.
- **Approved venue only:** `rpc('get_busy_times', {p_talent_ids (≤100 per call), p_from: today, p_to: today+55})`. Each busy time becomes a stand-in shift (venue `__elsewhere`, named "Another venue"), so helper `standing()` reports "Already booked" without saying where.
- **Approved member:** for every non-cancelled booking whose last live day ended less than 48 h ago, `rpc('get_booking_contact', {p_booking_id})`.
  - Talent receive the venue's `street_address`, `postcode`, `contact_name`, `contact_position` and `contact_phone`.
  - Venues receive the talent's `mobile_number`.
- `rpc('get_badge_counts')` → `badges`.
- A day still `booked` 48 h after it ended is shown as worked at the planned hours, with `auto: true`, before the sweep has written it.
- An open shift with no future open day and a day short shows as `expired`. Waiting answers on it show as `lapsed` with `endReason: 'shift-started'`.
- Anyone referenced but not visible becomes a stand-in member, named `Another venue`, `Someone` or `Dyuknow member`, with `approved: false`.
- `members.postcode`: talent and venue cards carry the postcode **exactly as typed** (`shownPostcode`). Helper `areaOf()` therefore shows the typed postcode upper-cased, e.g. `TW9 1UA`. It is not cut to `TW9`.
- Unsent chat drafts come from device storage. On web the key is `dyuknow_drafts_<memberId>`, holding a map `"<memberId>/<conversationId>" → text`. Use AsyncStorage.

### 1.3 Approval gate

`approved` means `members.approved && !members.deleted_at`. While it is false:

- The app opens on the Profile tab.
- These screens show only an empty state, title `Waiting for approval`, text `Dyuknow is checking your profile. We’ll let you know here when you’re approved.`:
  - `(talent)/shifts`, `(venue)/book`, `(venue)/post`, `team/[team]`, `compose`, `talent/[id]`, `venue/[id]`
  - Messages, when the member has no conversations
  - `(venue)/bookings`, when the venue has no shifts of its own
- Still allowed:
  - Profile and its edits, photo, Account (documents, alerts, deletion, log out), Notifications.
  - Talent Availability.
  - Any existing shift, booking or chat history.
- Profile shows the badge `Waiting for approval` under the photo.
- Server refusals for unapproved callers read `Your profile is waiting for approval.` This applies to posting, sending, saying yes, booking, messaging, open_conversation and get_busy_times.
  - Declining, withdrawing, closing, cancelling days and confirming hours don't need approval.
- When the `approved` notice arrives, Realtime triggers a reload and the next render shows the full app.

### 1.4 Header, tab bar and badges

**Header** (every tab screen):

- The wordmark `Dyuknow`; tapping it goes to the first tab.
- The bell button. Accessibility label `Notifications`, or `Notifications, {n} unread`.
  - A red count shows when there are unread notices: `1`–`9`, then `9+`.
  - The web counts `data.notices.filter(!read)`. `badges.unread_notifications` is the same number.
- The account button: own photo (or an account icon). A red dot shows when `accountAttention`.
  - `accountAttention` = `badges.account_attention`, or, when badges are missing, any rejected document.
- The account button opens a menu:
  - Name in bold. Under it `me.roles.join(" · ")` for talent, `areaOf(me)` for venues.
  - `My profile` → Profile tab.
  - `Account` (with a red dot when attention) → `account`.
  - `Log out` → §1.10.

**Tab bar:**

| Side | Tabs, in order |
|---|---|
| Talent | `Shifts`, `Availability`, `Messages`, `Profile` |
| Venue | `Book`, `Bookings`, a round centre button (label "Post a job", plus icon) → `(venue)/post`, `Messages`, `Profile` |

- **Messages dot.** A red dot on Messages when any conversation is unread (helper `unreadChat()` over the member's threads). `badges.unread_conversation_ids` gives the same set.
- **Needs-you count.** `badges.needs_you`, shown in a sage circle on `Shifts` (talent) or `Bookings` (venue). Hidden when 0. Only acting clears it.
  - Talent: booking requests still waiting on open shifts.
  - Venue: open shifts with a yes it can still book, or a reopened day, plus bookings with an ended day waiting for hours.
  - If badges are missing, count locally:
    - Talent: responses with `status==='invited'` on open shifts.
    - Venue: `can-cover` responses on its open shifts.

### 1.5 Realtime and refresh

- After the first load, subscribe to one channel `member-<memberId>`:
  - `notifications`, every event, filter `member_id=eq.<memberId>`.
  - `messages`, INSERT, no filter. RLS limits it to own conversations.
  - `conversation_reads`, every event, filter `member_id=eq.<memberId>`.
- Any event schedules a reload 300 ms later (debounced). Reaching status `SUBSCRIBED` also schedules one, to catch up after a dropped connection.
- Also reload when the app returns to the foreground (web: tab visible), and every 60 s while it's in the foreground.
- Only one load runs at a time. A request made during a load runs once more after it finishes.
- After every successful action that isn't local (§1.6), reload the whole snapshot.
- **Opening `shift/[id]` or `booking/[id]`** calls `rpc('mark_notifications_read', {p_ids: null, p_target: 'shift/<id>' | 'booking/<id>'})`. It runs only if some unread notice has that target, then reloads.

### 1.6 `run`: actions, toasts and errors

Every tap that changes data goes through one `act(action, successText?)` function (`Shell.act` in PreviewApp.tsx).

1. **Duplicate guard.** If the same action (same JSON) is already in flight, return null and do nothing. Also disable the pressed button while it runs.
2. **Call** `runLive(action)` (`lib/live/actions.ts`), which makes exactly one RPC (see each screen).
3. **On success:**
   - Show a toast with `outcome.success ?? successText` when there is text.
   - When there is none, clear any existing toast, except after the quiet actions (read-chat, read-notice, draft-message).
   - Then reload and return the fresh `Data`. The caller usually navigates.
4. **On error:** show the error's message in an error toast (role alert) and return null. While a sheet is open the same error also shows **inside the sheet**, under its buttons (`Modal` reads `error`).
5. **Error mapping** (`plain()`):
   - A network failure (`/failed to fetch|networkerror|load failed/i`) → `Couldn’t save. Check your connection and try again.`
   - Everything else is shown **as the server's message**. Refusals are SQLSTATE P0001 plain sentences.
   - With no snapshot yet → `Couldn’t save. Try again.`
6. **Toast.** It has the text and a close button (label `Dismiss notification`).
   - On web it stays until it's closed or replaced. It doesn't time out, because Undo is demo only.
   - A toast belongs to the member who saw it and never carries over to another account.
7. **Client-side validation** messages go through the same toast (`toast(text)` shows an error toast).

**Local actions**, which don't reload:

- `open-thread` when the conversation already exists.
- `read-notice` / `read-chat` when nothing is unread, or when the RPC failed. Reading is quiet: a failure leaves the dot for next time.
- `draft-message`, which only writes device storage.

### 1.7 `client_ref`

These ten RPCs take `p_client_ref uuid`:

`post_shift, send_to_more, say_yes, decline_request, withdraw_yes, close_shift, book_talent, cancel_days, confirm_day, send_message`

- The web makes a fresh `crypto.randomUUID()` for every call.
- In RN, make one per tap and reuse it if the same tap is retried automatically.
- The server returns the stored result for a repeated ref. A ref reused for a different function → `Couldn’t save. Try again.`

### 1.8 London time and label formats

All dates and clock times are Europe/London. Dates are `YYYY-MM-DD` strings. Instants are ISO strings compared as strings. Port these helpers exactly:

| Helper | Output examples |
|---|---|
| `londonDate(iso)` | `2026-10-08` |
| `displayDate(date)` | `Thu 8 Oct`. en-GB writes September as `Sept`, e.g. `Sun 6 Sept`. Match whatever Intl gives on device; Hermes needs full ICU. |
| `shortDay(date)` | `Thu 8` |
| `relativeDay(date, now)` | `Today`, `Tomorrow`, else `Thu 8 Oct` |
| `serviceLabel(day)` | `Thu 8 Oct · 17:00–23:00`; overnight `Thu 8 Oct · 22:00 → Fri 9 Oct 02:00` |
| `datesLabel(dates)` | `Mon 5 Oct`; `Mon 5–Wed 7 Oct`; `Sat 3–Sun 4, Tue 13 Oct`. Across months each date keeps its month: `Sat 31 Oct–Sun 1 Nov`. |
| `datesSummary(dates)` | Up to 2 runs: `{main: datesLabel, sub: ""}`. 3 runs or more: `{main: "7 days", sub: "Sat 3 – Tue 20 Oct"}`, or across months `Sat 31 Oct – Tue 10 Nov`. |
| `clockLabel(iso)` | `8 Oct, 14:05` (day, short month, 24-hour time) |
| `freeLabel(a)` | `All day` (00:00–00:00), else `16:00–23:59` |
| `daysPhrase(dates,total)` (ShiftDetail.tsx) | `all 3 days`, `Thu 8 only`, `2 days` |
| `shiftLabel(s)` | positions joined with ` or `: `CDP or Sous Chef` |
| `joinNames(list)` | `Poppy`, `Poppy and Theo`, `Poppy, Theo and Camille` |
| `firstName(m)` | Talent: first word of the name. Venue: the whole name. |
| Two-week window label (`useWindow`) | `Thu 30 – Wed 12 Nov` |
| Money | `£{rate}` with the raw number (`£18`, `£18.5`), followed by `/h`, ` / hour` or `/hour` as each screen shows. |
| Hours | `hoursOf(day)` = (to − from) / 3 600 000, e.g. `6`, `6.5` |

Building instants:

- `londonInstant(date, time)` refuses times that don't exist or happen twice when the clocks change:
  - `That time happens twice when the clocks go back. Choose another.`
  - `That time doesn’t exist when the clocks go forward. Choose another.`
- `makeDays(draft)` builds the days of a shift from dates plus start and end. An end earlier than the start means it ends the next day. It throws:
  - `Choose between 1 and 14 dates.`
  - `Choose different start and end times.`

### 1.9 Shared pickers (used by several screens)

**DatePicker** (`Booking.tsx`):

- Shows two weeks of day tiles at a time, starting today. A page is 14 days, and there are 4 pages (8 weeks, today…today+55) unless the screen passes another number.
- The nav row shows the window label, `Clear` (only when something is chosen), and the arrows `Previous two weeks` / `Next two weeks`. An arrow is disabled at either end.
- The first window shown is the one holding the first chosen date.
- Tapping a tile toggles it, and the selection stays sorted.
  - With `max` reached, unchosen tiles are disabled.
  - Tiles after `last` are disabled.
- **Small tiles:** a label (`Today` or the weekday `Thu`), the day number, and an optional note.
- **Large tiles** (Availability): the weekday (3 letters), the day number, and a note line. The tone is `free` or `not-free`.

**TimeSelect:**

- A field showing its label (`From` / `To`) and the value `HH:MM`.
- Tapping it opens two wheels: hours `00`–`23` and minutes in 5-minute steps. An odd saved minute such as `59` is added to the minute wheel.
- A `Done` button closes it.

**DateTimeBar:**

- The DatePicker (max 14 dates), then presets, then the From/To TimeSelects.
- Presets: `Lunch` 11:00–16:00, `Dinner` 17:00–23:00, `Late` 22:00–02:00. Each tile shows its name and `{start}–{end}`; the matching one is highlighted.
- **Open form** (used in compose) has a summary line under it:
  - no dates → `Choose a date`
  - invalid hours → `Choose different start and end times`
  - else `{datesLabel} · {start}–{end}`, plus ` · up to 14 dates` when 14 are chosen
- **Collapsible form** (Book, team list) has a head row:
  - `When` and `datesSummary.main` (or `Choose a date`), with the summary's `sub` under it when present.
  - The preset name, or `Hours`, and `{start}–{end}`.
  - `Change` when closed, `Done` when open. The head is disabled while open with invalid hours.
- **Saved "when".** Each change with at least one date is kept for the session (web: sessionStorage `pv-when-v2`).
  - A kept value whose dates are all today or later is restored.
  - Otherwise the default is `{dates: [tomorrow], start: "17:00", end: "23:00"}` (`savedWhen`).
  - Book, the team list and compose share this value.

### 1.10 Log out

Available from the header menu and Account → `Log out`.

1. Clear this member's chat drafts.
2. Clear every onboarding draft (`dyuknow.join-draft.*`).
3. `supabase.auth.signOut()`.
4. Replace the stack with `(auth)/sign-in`.

The web gives no confirmation.

### 1.11 Upload limits and file copy

| What | Accepted | Limit | Error copy |
|---|---|---|---|
| Profile photo (app) | JPEG, PNG, WebP; cropped to 4:5, then compressed to a JPEG of about 200 KB | 5 MB (bucket `member-photos`, at most 2 files per login folder) | `Choose a JPEG, PNG or WebP photo.`, `Choose a photo up to 5 MB.`; server `Upload a photo up to 5 MB.`, `That upload didn’t finish. Add the file again.` |
| Document (app, Account) | JPEG, PNG, PDF | 10 MB (bucket `member-documents`, private, at most 10 files) | `Upload a JPEG, PNG or PDF.`, `Choose a file up to 10 MB.`, `Choose one of the listed documents.`; server `Upload a photo or PDF up to 10 MB.` |
| Storage folder full | | | `You can keep at most {n} files here. Remove one first.` |
| Onboarding document | image/HEIC (compressed to JPEG) or PDF | 10 MB | `Upload a photo or PDF up to 10 MB.`, `That upload didn’t finish. Add the file again.`, `Couldn’t save. Check your connection and try again.`; read failure `Couldn't read that file — try another.` |
| Onboarding photo | any image, HEIC included (converted) | best effort | `Couldn't read that image — try another, or take a new photo.` |

Storage paths:

- Photo: `member-photos/<auth uid>/<uuid>.jpg`.
- Document: `member-documents/<auth uid>/<doc code>-<uuid>.<ext>`.
- Upload with `upsert: false`.
- A storage error mentioning size becomes the 5 MB or 10 MB line above.
- After `set_my_photo` or `save_document`, delete the returned `old_path`. If the RPC fails, delete the file just uploaded.

### 1.12 Photo crop rules (`sheet/crop`, from `components/ui/PhotoCropper.tsx`)

Params: a picked image.

- Title `Position your photo`. Text `Drag to move it. This is how it will look everywhere on Dyuknow.`
- The frame is **4:5 portrait** (`PHOTO_ASPECT = 4/5`).
  - At zoom 1 the image covers the frame, like object-fit cover.
  - The `Zoom` slider runs from 1 to 3 (pinch on RN).
  - Dragging pans the image. The image never leaves a gap inside the frame.
  - Arrow keys move it 12 px (web only).
- HEIC is converted to JPEG before showing.
- `Cancel` (or tapping the backdrop) closes the sheet.
- `Use photo` is disabled until the image is ready, and reads `Saving…` while cropping.
- The output is exactly the frame's area as a JPEG, at most 1080 px wide (1080×1350), quality 0.92. Callers then compress it (≈200 KB target: quality steps 0.85 down to 0.35, max dimension 1600 shrinking by ×0.75 down to 400).
- Errors: `Couldn't read that image — try another.`, `Couldn't crop that image — try another.`

---

## 2. Auth screens (`components/auth/LoginForm.tsx`)

The rules below hold on every auth screen:

- The wordmark `Dyuknow` sits at the top.
- Typing clears the error.
- A busy flag disables the submit button.
- Codes are 6 digits. A new code can be asked for 60 s after the last one. Passwords need at least 8 characters.
- If a session already exists when an auth screen opens, route on at once (§1.1).
- While routing, show a spinner and `Signing you in…`.

Messages:

| Key | Copy |
|---|---|
| badEmail | `Enter a valid email address.` |
| wrongLogin | `That email and password don’t match. Check them, or reset your password.` |
| shortPassword | `Use at least 8 characters.` |
| mismatch | `The two passwords don’t match.` |
| wrongCode | `That code is wrong or has expired. Check it, or send a new one.` |
| tooSoon | `Wait a minute before asking for another code.` |
| noConnection | `Couldn’t reach Dyuknow. Check your connection and try again.` |
| weakPassword | `Choose a stronger password.` |
| samePassword | `Choose a password you haven’t used here before.` |

How Supabase errors map:

- Send errors: a retryable fetch error → noConnection; 429 or rate-limit codes → tooSoon; `email_address_invalid` or `validation_failed` → badEmail; `weak_password` → weakPassword; anything else → noConnection.
- Code errors: an AuthApiError → wrongCode; anything else → noConnection.

The email is trimmed and lower-cased before every call. It must match `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, else badEmail.

Shared fields:

- Email: label `Email address`, placeholder `e.g. camille@email.com`, email keyboard, no autocapitalise.
- Password fields: labels `Password`, `Confirm password`, `New password`, `Confirm new password`.
- Code: label `6-digit code`, placeholder `••••••`, digits only (paste is cut to 6), one-time-code autofill.

### `(auth)/sign-in`

- Eyebrow `Sign in`, title `Welcome back.`
- Fields: email, `Password`.
- Button `Sign in` (`Signing in…` while busy). It is disabled while either field is empty.
- Calls `signInWithPassword`.
  - Error `email_not_confirmed`: call `auth.resend({type:'signup', email})`, start the 60 s timer and go to `(auth)/code`. A resend failure shows its send error.
  - Any other error: noConnection if retryable, else wrongLogin.
  - Success: route on (§1.1).
- Links: `Forgot password?` → `(auth)/reset`; `New here?` followed by `Create an account` → `(auth)/create`.

### `(auth)/create`

- Eyebrow `Create an account`, title `Join Dyuknow.`, description `We’ll email you a 6-digit code to confirm it’s you.`
- Fields: email, `Password`, `Confirm password`. Hint `At least 8 characters.`
- Button `Create account` (`Creating…`). It is disabled while any field is empty.
- Checks, in order: badEmail, shortPassword, mismatch.
- `auth.signUp({email, password})`.
  - Error → its send error.
  - A session came back → route on.
  - Otherwise start the timer and go to `(auth)/code`.
- Link: `Already have an account?` followed by `Sign in` → `(auth)/sign-in`.

### `(auth)/code`

- Eyebrow `Create an account`, title `Check your email.`, description `We sent a 6-digit code to {email}. Enter it to confirm your account.`
- The code field. Typing the 6th digit submits on its own.
- Button `Confirm` (`Checking…`). It is disabled unless 6 digits are entered.
- `auth.verifyOtp({email, token, type:'signup'})`: error → its code error; success → route on.
- Under the button:
  - `Use a different email` → `(auth)/create`, clearing code and passwords.
  - Then either `New code in {s}s` (counting down) or `Send a new code`, which calls `auth.resend({type:'signup'})` and restarts the timer.

### `(auth)/reset`

**Step 1** (web stage forgot):

- Eyebrow `Forgot password`, title `Reset your password.`, description `Enter your email and we’ll send you a 6-digit code.`
- The email field. Button `Send code` (`Sending…`), disabled while empty.
- Calls `auth.resetPasswordForEmail(email)`.
  - Only a 429 or a retryable error shows an error.
  - Otherwise, whether or not the address has an account, start the timer and go to step 2. This screen must not reveal who has an account.
- Link `Back to sign in`.

**Step 2** (web stage reset-code):

- Eyebrow `Forgot password`, title `Choose a new password.`, description `If {email} has an account, we’ve sent it a 6-digit code.`
- Fields: code, `New password`, `Confirm new password`.
- Button `Save password and sign in` (`Saving…`), disabled unless the code is 6 digits and both passwords are filled.
- Checks: a code that isn't 6 digits → wrongCode, then shortPassword, then mismatch.
- `verifyOtp({type:'recovery'})`: error → its code error.
- Then `auth.updateUser({password})`: `same_password` → samePassword; `weak_password` → weakPassword; anything else → noConnection.
- Success: route on.
- Resend row: `Use a different email` → step 1, plus the timer or `Send a new code` (which calls `resetPasswordForEmail` again).

---

## 3. Join and onboarding

### `join/index` (`components/auth/JoinPicker.tsx`)

Who: signed in with no member row.

- Title `Who are you?`
- Text `Choose once. Your answers stay on this device until you submit.`
- Two big panels, each a button:

  1. **Venue** (sage):
     - Eyebrow `Venue`. Heading `Venue, looking ` followed by italic `to hire`.
     - Body `A restaurant, hotel, bar or venue — set up your listing and book vetted, verified talent.`
     - Label `Continue your venue profile` if a venue draft exists, else `Set up your venue`.
     - Sub-label `Draft saved on this device` when the draft's side is venue and a venue draft exists.
  2. **Talent** (dark):
     - Eyebrow `Talent`. Heading `Talent, looking ` followed by italic `for work`.
     - Body `A chef, front of house, bar, events or management pro — build your profile and take shifts worth taking.`
     - Label `Continue your profile` if a talent draft exists, else `Build your profile`.
     - Sub-label `Draft saved on this device` when the draft's side is talent and a talent draft exists.

- Tapping a panel saves `draft.side` and pushes `join/venue` or `join/talent`.

**Drafts:**

- One per login, in device storage under `dyuknow.join-draft.<authUid>`, holding `{side, talent:{identity, step}, venue:{identity, step}}`.
- Every answer and every step change is saved.
- If storage overflows, save without files (photo and documents set to null).
- A resumed draft opens at `min(step, 7)` for talent and `min(step, 6)` for venues. The last step submits on open, so a draft resumes one step before it.
- The draft is cleared after a successful submit, and on logout.

**Onboarding shell** (both forms):

- A round back button at top left: it goes to the previous step. At step 0 it is hidden and disabled.
- A row of progress dots, one per step. The current dot is long; on the final step every dot fills sage.
- Every step ends with a `Continue` button.

**Shared controls:**

- **ChipField:** label plus chips that toggle. With `allowCustom` it adds a `+` chip; tapping it opens an input (placeholder `Add your own`) that adds the value on Enter or blur, and Escape cancels. Custom values show as selected chips, and tapping one removes it.
- **CheckboxGroup:** square checkboxes, one per option.
- **SwitchField:** label plus a switch.
- **TextareaField:** label, a counter `{n} / {max}`, and hard truncation at max.
- **UploadRow:** label, plus ` · optional` and ` · {note}`. A button shows the file name or `Tap to upload`, and the action `Change` or `Upload`. Accepts image/HEIC/PDF; images are compressed to JPEG.
- **FormField:** label, input, optional prefix (`£`).

### `join/talent` (`components/onboarding/TalentOnboarding.tsx`, self-serve mode), 9 steps (0–8)

**Step 0** — eyebrow `Talent`, title `Tell us about yourself.`

- `Full name`, placeholder `e.g. Camille Aubert`
- `Mobile number`, placeholder `e.g. 07700 900123`, phone keyboard
- `Email address`, read-only: shows the login email, with `This is the email you sign in with.`
- `Home postcode`, placeholder `e.g. W1J 8HA`
- `Date of birth`, a date input
- When name, mobile or postcode is empty: hint `Add your name, mobile number and postcode to continue.` and Continue is disabled.

**Step 1 — Photo.** Eyebrow `Photo`, title `Add a photo.`, description `Venues see this before they book you. You can change it anytime from your profile.`

- A 4:5 tile button: `Tap to add a photo`, or the chosen photo.
- A button `Choose a photo` / `Change photo`.
- Picking opens `sheet/crop`. The result is compressed and kept in the draft as a data URL.
- Optional: Continue is always enabled.

**Step 2 — Your role.** Eyebrow `Your role`, title `What do you do?`, description `Keep your main category, then choose every position and skill that fits across all five teams.`

- `Category`: single choice from `Chef`, `Front of House`.
- Five position fields, labelled `{Team} positions · choose all that apply` (TEAMS, §8):
  - Kitchen: Demi CDP, CDP, Senior CDP, Junior Sous, Sous Chef, Head Chef, Executive Chef
  - Pastry: Pastry Chef
  - Bar: Bartender, Mixologist
  - Sommelier: Sommelier
  - Floor: Maître d’, Restaurant Manager, Supervisor, Section Waiter, Waiter, Host
- `Kitchen skills` and `Front of house skills` (SKILL_GROUPS, §8). Multi-select.
- `Your own skills · optional`: custom chips. The add chip is labelled `Add your own skill`, max 80 characters, followed by the hint `Add a specific skill in up to 80 characters.`
  - helper `addCustomSkill` trims the value and collapses spaces.
  - It rejects an empty value or one over 80 characters, and a case-insensitive duplicate of an existing custom or catalogue skill.
- With no position chosen: hint `Choose at least one position to continue.` and Continue is disabled.

**Step 3 — Experience.** Eyebrow `Experience`, title `Where have you worked?`, description `Your time in hospitality, and up to three recent kitchens or floors.`

- `Years in hospitality`: single choice from `0–2`, `3–5`, `5–10`, `10+`.
- `Recent employers`, up to 3 entries:
  - Each entry is headed `Employer {n}` with a `Remove` button.
  - Fields: `Restaurant` (`e.g. The Larkspur`), `Position` (`e.g. Sous Chef`), `Dates` (`e.g. 2022–2024`).
  - Add button `Add an employer` / `Add another employer`, hidden at 3.
- Optional.

**Step 4 — Availability & pay.** Eyebrow `Availability & pay`, title `When, where and for what?`, description `Venues only ever see what's open — you can change this anytime from your profile.`

- `Available today?`: a switch.
- `Preferred shifts`: multi-select from `Breakfast`, `Lunch`, `Dinner`, `Late`, `Weekdays`, `Weekends`.
- `Maximum travel`: single choice from `3 miles`, `5 miles`, `10 miles`, `Anywhere`.
- `Preferred areas`: checkboxes for `West London`, `East London`, `Central`, `North`, `South`.
- `Preferred hourly rate`: single choice from `£18`, `£20`, `£22+`.
- `Minimum same-day rate`: prefix `£`, placeholder `e.g. 25`, decimal keyboard.
- **Dated availability** section:
  - Heading `When are you free?` with the tag `Optional`.
  - Text `Add specific dates and hours in London time. Your general availability preferences above stay as they are.`
  - A row of the next 14 days, labelled like `Thu 8 Oct`, plus a date field `Availability date` (min today).
  - Choosing a date that already has an entry loads that entry. Otherwise the defaults are `Free from–to`, 16:00 and 23:59.
  - Chips under `Availability on this date`: `Free all day`, `Free from–to`, `Not free`.
  - With `Free from–to`: time fields `Free from` and `Free until`. When the end is before the start, show `Ends the following day.`
  - The button reads `Update date` if the date already has an entry, else `Add date`. It validates that one entry; errors show inline.
  - The saved list shows `{YYYY-MM-DD} · Not free`, `{date} · Free all day`, or `{date} · {start}–{end}` with ` (+1 day)` for overnight, each with `Remove`.
  - "Free all day" is stored as 00:00–00:00.
- `Shift alerts`: a select with `All shifts in your positions` (all), `Today and tomorrow only` (soon), `Off` (off). Default all.
- Continue runs `validateDatedAvailability` over every entry. On error it shows inline and stays. Its messages:
  - `Choose a valid availability date.`
  - `An availability date has passed. Update it or remove it before continuing.`
  - `Choose each availability date once.`
  - `Choose whether you’re free on each date.`
  - `Choose a start and end time for each date.`
  - `Use different start and end times, or choose Free all day.`

**Step 5 — Verification.** Eyebrow `Verification`, title `Prove you're good to work.`, description `Held privately for the owner to review.`

- `Right to Work (visa / passport)`
- `Food Safety Certificate`, marked ` · optional`. Shown **only** when a Kitchen or Pastry position is chosen.
- `CV`, marked ` · optional · recommended`.
- Not required.

**Step 6 — About you.** Eyebrow `About you`, title `Tell venues about yourself.`, description `A couple of lines — calm, specific, no fluff.`

- `About you`: textarea, max 250, placeholder `e.g. Calm under pressure. Five years in Michelin kitchens. Happy on garnish, meat or pass.`
- `What are you known for? Choose up to 3.`: chips plus custom values, at most 3 in total. A 4th tap does nothing.
  - Category Chef: `Calm under pressure`, `Strong organiser`, `Great on service`, `Excellent prep`, `Fast learner`, `Clean worker`, `Team player`, `Great with junior chefs`, `Reliable`, `Problem solver`, `Creative`, `Strong palate`.
  - Otherwise (FOH): `Warm personality`, `Excellent wine knowledge`, `Fast service`, `Great communicator`, `Upselling`, `Calm under pressure`, `Cocktail knowledge`, `Coffee`, `Leadership`, `Professional`.
  - A custom value is ignored if it is a case-insensitive duplicate.

**Step 7 — Community.** Eyebrow `Community`, title `Our community agreement.`, description `Every venue and every worker on Dyuknow agrees to the same standard.`

- Checkboxes: `Turn up on time`, `Treat every venue with respect`, `Give notice if cancelling`, `Represent Dyuknow professionally`.
- Continue is disabled until all four are ticked.

**Step 8 — Complete (pass screen).** Submits the moment it opens.

- A sage "pass" showing:
  - The avatar: photo, or a monogram of the first letter of the name, or `?`.
  - A status seal: a spinner while submitting, a tick when saved, a cross on error.
  - Eyebrow `Dyuknow member`, the name (or `You're in`), and meta = the positions joined with `, `, or the category.
- Rows: `Member since` · `Today`; `Experience` · {years band} when set; `Available` · `Today` when the switch is on.
- Headline `Welcome aboard ` followed by italic `profile ready.`
- Body `Your profile is submitted for the owner to review. You can look around while you wait for approval.`
- The error line, when there is one.
- Button:
  - `Saving…` (disabled) while submitting.
  - `Try again` on error; it re-submits.
  - `Enter Dyuknow` once saved; it opens the app, landing on Profile under the approval gate.

**Submit** (`submitTalentSelfServe`):

1. Validate dated availability again. Its message is a refusal.
2. Upload documents: `right-to-work`; `food-hygiene` only if the positions are kitchen ones; `cv`. Each must be JPEG, PNG or PDF, 1 byte to 10 MB, else `Upload a photo or PDF up to 10 MB.`
   - Bad data → `That upload didn’t finish. Add the file again.`
   - A file already uploaded in this session isn't uploaded again.
3. `rpc('create_my_profile', {p_side:'talent', p_answers, p_files:[{kind, storage_path, original_filename}], p_availability:[{day_date, kind, start_time, end_time}]})`.
   - `p_answers` keys: `full_name, mobile_number, home_postcode, date_of_birth, category, positions, skills, custom_skills, known_for` (catalogue traits only), `custom_known_for` (the rest), `years_band, employment_history` (only non-empty entries), `bio, preferred_shifts, max_travel, preferred_areas, preferred_hourly_rate, minimum_same_day_rate_gbp, shift_alerts, agreed_turn_up_on_time, agreed_treat_venues_with_respect, agreed_give_notice_if_cancelling, agreed_represent_professionally`.
   - Blank text becomes null.
   - `minimum_same_day_rate_gbp` must match `^\d+(\.\d{1,2})?$` after removing `£`, else `Enter the minimum same-day rate in pounds, like 20 or 20.50.`
4. With a photo: upload it to `member-photos`, then `rpc('set_my_photo', {p_storage_path})`. This is best effort: on failure delete the file and carry on.
5. Clear the draft.

Errors:

- A P0001 refusal shows its message.
- A network error → `Couldn’t save. Check your connection and try again.`
- Anything else → `Couldn’t save. Try again.`
- create_my_profile's own refusals:
  - `Sign in to continue.`, `Choose venue or talent.`, `Check your answers and try again.`
  - `Add a name.`, `Add a postcode.`, `Choose at least one position.`, `Add a mobile number.`
  - `Agree to all four to continue.`, `Choose from the list.`, `Keep your bio under 250 characters.`
  - `That upload didn’t finish. Add the file again.`, `Choose one of the listed documents.`, `Upload a photo or PDF up to 10 MB.`, `Choose dates in the next 8 weeks.`, plus the two clock-change messages.
- A double submit returns the same member.

### `join/venue` (`components/onboarding/VenueOnboarding.tsx`), 8 steps (0–7)

**Step 0** — eyebrow `Your venue`, title `Tell us about your venue.`, description `What we're called, who to reach, and how to find us.`

- `Business name` (`e.g. The Larkspur`)
- `Trading name` (`e.g. Larkspur Mayfair`)
- `Registered company (optional)` (`e.g. Larkspur Hospitality Ltd`)
- `Street address` (`e.g. 14 Church Road, Richmond, London`)
- `Venue postcode` (`e.g. TW9 1UA`), followed by the note `Talent see your area before booking. The full address is shared once booked.`
- `Website` (`e.g. thelarkspur.co.uk`)
- `Instagram` (`e.g. @thelarkspur`)
- `Contact person` (`e.g. Jonathan Reeve`)
- `Position` (`e.g. General Manager`)
- `Phone` (`e.g. 020 7946 0958`, phone keyboard)
- `Email` (`e.g. jonathan@thelarkspur.co.uk`). It is pre-filled with the login email and stays editable.
- Missing hint: `Add {list} to continue.`, where the list joins with `, ` whichever of these are missing:
  - `a name` (missing only when both business and trading name are empty)
  - `the street address`
  - `a postcode`
  - `the contact person`
  - `their phone`
- Continue is disabled while anything is missing.

**Step 1 — Photo.** As for talent, with the description `Talent see this before they say yes to a pass. You can change it anytime.`

**Step 2** — eyebrow `Your venue`, title `What kind of room is it?`, description `Helps us match the right talent to your kitchen and floor.`

- `Venue type`: multi-select from VENUE_TYPES.
- `Cuisine`: multi-select from CUISINES.
- `Number of covers`: single choice from `0–30`, `30–60`, `60–100`, `100+`.
- `Average team size` (`e.g. 18`, numeric).
- `Average team vacancies per week` (`e.g. 2`, numeric).

**Step 3 — Staffing.** Eyebrow `Staffing`, title `What do you usually need covered?`, description `We'll surface the right talent first. You can change this anytime.`

- `Roles you need`: `Chefs`, `FOH`, `Bartenders`, `Managers`, `Events`.
- `Teams you need · choose all that apply`: `Kitchen`, `Pastry`, `Bar`, `Sommelier`, `Floor`. With no answer yet, it starts from the roles: Chefs → Kitchen+Pastry, FOH → Floor, Managers → Floor, Bartenders → Bar.
- `Typical shifts`: as SHIFT_TYPES.
- `Typical notice`: `Today`, `Tomorrow`, `Planned`.

**Step 4** — eyebrow `Venue standards & pay`, title `What's it like to work your floor?`, description `Sets expectations before anyone takes the pass.`

- `Dress code`: single choice from `Chef whites`, `Blacks`, `Casual`.
- Switches: `Uniform provided?`, `Staff meal?`.
- `Typical hourly rate — Chef` (`£`, `e.g. 20`).
- `Typical hourly rate — FOH` (`£`, `e.g. 18`).

**Step 5** — eyebrow `About your venue`, title `Tell talent about your venue.`, description `A couple of lines — what it's like to work your room.`

- `About your venue`: textarea, max 250, placeholder `e.g. Independent neighbourhood restaurant serving seasonal British cooking. Fast paced but supportive team.`
- `What's your venue known for? Choose up to 3.`: `Fast-paced service`, `Great team culture`, `Fine dining standards`, `Creative food`, `Training`, `Supportive management`, `Excellent food`, `Career progression`. At most 3; no custom values.

**Step 6** — eyebrow `Community promise`, title `Our community promise.`, the same description as talent.

- Checkboxes: `Pay fairly`, `Treat temporary team like our own`, `Provide a clear brief`, `Rate honestly`.
- All four are required.

**Step 7 — Complete.**

- The pass has a dark avatar, eyebrow `Dyuknow venue`, the name (trading name, else business name, else `Your venue`), and meta = the venue types joined with ` · `.
- Rows: `Member since` · `Today`; `Covers` · {band} when set; `Team` · {size} when set.
- Headline `Welcome aboard — ` followed by italic `venue ready.`
- Body `Your venue is submitted for the owner to review. You can look around while you wait for approval.`
- The same buttons and states as talent.

**Submit:** `create_my_profile` with `p_side:'venue'`, `p_files: []`, `p_availability: []`, then the photo as for talent.

- `p_answers` keys: `business_name, trading_name, registered_company, website, instagram_handle, contact_name, contact_position, contact_phone, contact_email, street_address, postcode, venue_types, cuisines, covers_band, average_team_size, average_team_vacancies_per_week, roles_needed, teams_needed, typical_shifts, typical_notice, dress_code, uniform_provided, staff_meal, typical_hourly_rate_chef_gbp, typical_hourly_rate_foh_gbp, bio, known_for, agreed_pay_fairly, agreed_treat_team_like_our_own, agreed_provide_clear_brief, agreed_rate_honestly`.
- Team size and vacancies must be whole numbers, else `Enter the team size as a whole number.` / `Enter the vacancies per week as a whole number.`
- Rates follow the pounds rule above: `Enter the chef rate in pounds, like 20 or 20.50.` / `Enter the front-of-house rate in pounds, like 20 or 20.50.`
- Server refusals for venues: `Add a name.`, `Add the street address.`, `Add a postcode.`, `Add the on-site contact’s name.`, `Add the on-site contact’s phone.`, `Agree to all four to continue.`, `Choose from the list.`, `Keep your bio under 250 characters.`

---

## 4. Talent tabs

### `(talent)/shifts` (web `TalentHome`, Discovery.tsx)

Who: approved talent. Otherwise the gate (§1.3) applies.

Reads `data.responses` (own), own `data.bookings`, `data.shifts`, venue members; helpers `bookingServices`, `availableDates`, `offeredDates`, `relativeDay`, `datesLabel`, `endedLabel`, `shiftLabel`.

Sections, in order. Each section is hidden when empty unless noted.

1. **Heading** `Shifts`.

2. **`Upcoming shifts`.** Own bookings not cancelled whose last active day hasn't ended, sorted by the first active day's start, ascending. Each card shows:
   - The venue photo (→ `venue/[id]`).
   - Badge `You’re booked`.
   - The venue name (→ `venue/[id]`).
   - A line `{relativeDay(first)} · {start}–{end}`, plus ` · {b.days.length} days` when there is more than one day, then ` · {shiftLabel}`.
   - An arrow button (label `View booking details`) → `booking/[id]`.

3. **`Booking requests`.** Responses with `status==='invited'` on shifts with `status==='open'`. Each is a row:
   - Venue photo and name, both linking to the venue.
   - Title shiftLabel.
   - Sub `whenLine(shift, offeredDates)`: `datesLabel(span)` when it covers more than one day, else `relativeDay`, followed by ` · {start}–{end}`.
   - Badge `Waiting for you` (attention style).
   - Tapping the row → `shift/[id]`.

4. **`Waiting to be booked`.** Responses with `status==='can-cover'`, as rows with the badge `Waiting`.

5. **`Open jobs`** (always shown).
   - The feed is shifts that are `mode==='post'` and `status==='open'`, that share a position with me, that I haven't answered, and where `availableDates(me)` isn't empty.
   - "Answered" means a response of mine on the shift whose status isn't one of withdrawn, declined, cancelled, not-selected or lapsed.
   - Sorted by first day start, ascending.
   - Shown as a grid of **ShiftCards**:
     - The venue photo, or the team tile photo when there is none.
     - Top line: `areaOf(venue)`. An optional badge `You can do {free} of {n} days` when I can't do every day.
     - The venue name, then shiftLabel.
     - The date line: `{main} · {sub}` (datesSummary) for multi-day, else `relativeDay`, followed by ` · {start}–{end}`.
     - For multi-day, `{n} days needed`.
     - Foot `£{rate}` with ` / hour`.
     - Tapping → `shift/[id]`.
   - Empty: title `No open jobs in your positions right now`, text `Venues can still book you straight from your profile. Keep your availability up to date.`

6. **`Venues on Dyuknow`.** Every approved venue, sorted by the number of open job posts (descending), then by name. Each **VenueCard** shows:
   - Photo, area, and a badge `1 open job` or `{n} open jobs` when there are any.
   - Name, and types plus cuisines joined with ` · `.
   - Foot `See venue`.
   - Tapping → `venue/[id]`.

7. **`Past and closed ({n})`**, collapsed by default, where n = past bookings + ended answers.
   - First, past bookings (cancelled, or last day ended) as **BookingRows**:
     - The other party's photo and name; title shiftLabel.
     - Sub whenLine over all days if cancelled, else over the active days.
     - Status `Cancelled` / `Past` / `Booked`; good when booked.
   - Then answers with status withdrawn, declined, not-selected or lapsed, as rows whose status is:
     - `endedLabel(r, venueName)` in long form: `Filled by someone else` | `Cancelled by {Venue}` | `Booked elsewhere` | `This shift has started.` | `Ended`.
     - Without an end reason: `Withdrawn` / `Declined` / `Filled by someone else` / `Booked elsewhere`.

### `(talent)/availability` (web `AvailabilityEditor`, MemberViews.tsx)

Who: talent, approved or not.

- The tab version has no Back. The `availability` notice target opens the same screen; a Back there falls back to Shifts.
- Reads `data.availability` (own) and own bookings via `bookingServices`.

Layout:

1. Heading `When are you free?`
2. **Large DatePicker** (8 weeks).
   - Starts with `[today]` selected.
   - Each tile's note:
     - `Booked · {venue name}` if a booking covers that date. An overnight booking also marks the next date.
     - Else `Not free`, or `freeLabel(a)` (`All day` / `HH:MM–HH:MM`), or `Not set`.
   - The tile tone comes from the mark's kind.
   - When going from no selection to one date that already has a mark, the form preloads it: kind `Not free`, `All day` (00:00–00:00) or `Hours`, plus its start and end.
3. **`Your bookings`.** Every booked service of mine that hasn't ended. Each button shows:
   - Badge `Booked`.
   - `{serviceLabel} · {venue name}`.
   - `View booking` → `booking/[id]`.
   - Empty: `No bookings yet.`
4. **Form:**
   - Title: `Choose days` (none), `displayDate(d)` (one), or `{n} days`. With more than one date, a sub-line with `datesLabel`.
   - Chips: `Free all day`, `Free from–to`, `Not free`. The default is Free from–to, 16:00–23:59.
     - Choosing Free from–to while start equals end resets the times to 16:00–23:59.
   - With Free from–to: From/To TimeSelects.
   - Button `Save {n} days` or `Save availability`, disabled with no date chosen.
     - Calls `set_availability({p_dates (unique, sorted), p_kind: 'not-free'|'free', p_start_time, p_end_time})`. Free all day sends 00:00/00:00; Not free sends the current times, and the server stores 00:00.
     - Toast `Availability saved.`
     - Client refusal: `Choose at least one date.`
     - Server refusals: `Only talent set availability.`, `Choose at least one date.`, `Choose dates in the next 8 weeks.`, `Choose different start and end times.`, and the clock-change messages.
   - A date can't be set back to "Not set".

### `(talent)/messages` and `(venue)/messages` (web `Messages`)

Who: both sides. Under the gate when there are no conversations.

Rows are the member's threads, sorted by the position of their last message, newest first. Each row has:

- The other person's photo and name (→ their card), with a red dot when `unreadChat()`.
- An about-line from the **latest shift card** in the thread: `{shiftLabel} · {datesLabel(all shift days)}`, else `Message`.
- Preview: the last message's text, else `No messages yet`. Tapping it → `chat/[id]` (label `Open conversation with {name}`).
- A badge `responseLabel(r)` for the other talent's answer on that shift:
  - From the end reason in short form: `Filled` / `Cancelled` / `Booked elsewhere` / `Started` / `Ended`.
  - Else by status: `Booking request`, `Said yes`, `Booked`, `Cancelled`, `Declined`, `Withdrawn`, `Filled`, `Booked elsewhere`.
  - Good style when booked. Attention style for talent when invited, and for a venue when can-cover.

Empty: title `No conversations yet`, button `Find people` (venue) or `See open jobs` (talent) → first tab.

### `(talent)/profile` and `(venue)/profile` (web `Profile`)

Who: the member themself. Allowed while waiting for approval.

**View mode:**

- Heading = own name. For talent, a description of the positions joined with ` · `.
- The photo (4:5; monogram fallback). Badge `Waiting for approval` if not approved.
- Button `Add a photo` / `Change photo`.
  - Pick a JPEG, PNG or WebP, then `sheet/crop`, then the `photo` action.
  - The `photo` action checks the type (`Choose a JPEG, PNG or WebP photo.`), compresses, checks the size (`Choose a photo up to 5 MB.`), uploads, then calls `set_my_photo({p_storage_path})` and deletes `old_path`.
  - Toast `Photo saved.`
- The verified line (when any): a tick, then `Verified by Dyuknow · {labels joined " · "}`.
- The bio, or `No bio yet.`
- Talent: skill chips. Venue: VenueFacts — types plus cuisines joined with ` · `, and the Instagram handle as a link to `https://instagram.com/{handle without @}`.
- Info list:
  - Talent: `Postcode` = postcode; `Minimum pay` = `£{minRate} per hour`, or `Not set`.
  - Venue: `Address` = `fullAddress` (street, postcode); `On-site contact` = `contactLine` (`{name} · {role}`).
- Buttons:
  - `Edit profile`.
  - `View as a venue` (talent) or `View as talent` (venue) → own `talent/[id]` or `venue/[id]`.

**Edit mode** (heading `Edit profile`):

- `Name` (talent) or `Venue name` (venue).
- `Bio · {n}/250`: max 250. Placeholder for talent: `e.g. 8 years on grill. Ex-Core by Clare Smyth. Calm on a busy pass.` For venues: `What it’s like to work here.`
- Venue: `Street address`.
- `Home postcode` (talent) or `Postcode` (venue).
- `Mobile number` (talent) with hint `Only shared with a venue that books you.` / `On-site phone` (venue) with hint `Only shared with talent you book.` Phone keyboard; no code is sent.
- Talent:
  - `Positions`, with a sub-heading per team and chips from TEAMS.
  - `Skills`, with a sub-heading per group from SKILL_GROUPS (`Kitchen`, `Front of house`). Custom skills already held stay selected but have no chip.
  - `Minimum pay · £ per hour`: number, min 0, step 0.5. Empty clears it.
- Venue:
  - `On-site contact name`, `Their role`.
  - `Venue type` chips (VENUE_TYPES), `Cuisine` chips (CUISINES).
  - `Instagram`, placeholder `@yourvenue`.
- Buttons `Save profile` and `Cancel`.

Save:

- Client checks, in order, each as a toast: `Add a name.`, `Add a postcode.`, `Choose at least one position.` (talent).
- Then the `profile` action sends **only the changed fields**, trimmed, to `update_my_profile({p_changes})`.
  - Talent keys: `full_name, bio, home_postcode, mobile_number, positions, skills` (catalogue only) plus `custom_skills` (the rest), and `minimum_same_day_rate_gbp` (number or null).
  - Venue keys: `name, bio, postcode, contact_phone, street_address, contact_name, contact_position, venue_types, cuisines, instagram_handle`.
  - Nothing changed → no call.
- Toast `Profile saved.`, back to view mode.
- Server refusals: `Check your answers and try again.`, `Add a name.`, `Add a postcode.`, `Choose at least one position.`, `Add a mobile number.`, `Add the street address.`, `Add the on-site contact’s name.`, `Add the on-site contact’s phone.`, `Choose from the list.`, `Keep your bio under 250 characters.`

---

## 5. Venue tabs

### `(venue)/book` (web `VenueHome`)

Who: approved venue.

1. Heading `Who do you need ` followed by italic `for service?`
2. A collapsible DateTimeBar holding the shared "when" (§1.9).
3. The **team mosaic**:
   - Five team tiles (Kitchen, Pastry, Bar, Sommelier, Floor), each with its tile photo. Sorted by how many shifts this venue has posted in that team, descending; ties keep the catalogue order.
   - Each tile shows the team name and the caption `{n} available` plus an arrow. n = approved talent in the team whose `standing(talent, days)` is `free` for the chosen when.
   - Tapping → `team/[team]?dates=&time=` with the current when, or `savedWhen()` if it has no dates.
4. **`Coming up`**, hidden when empty. The first 3 of this venue's bookings that aren't cancelled and haven't ended, sorted by first day start. Shown as BookingRows (talent photo and name, title shiftLabel, sub whenLine of active days, status `Booked`) → `booking/[id]`.

### `team/[team]` (web `TeamList`, Booking.tsx)

Params: `team`; `dates` (comma-separated YYYY-MM-DD); `time` (`HH:MM-HH:MM`). With bad or missing params, use `savedWhen()`. An unknown team shows empty `Team not found` with the button `Back to Book`.

1. Heading = team name. Description `{free.length} available`. Back.
2. A collapsible DateTimeBar. Changes update the route params in place (replace), without reloading.
3. Position chips: `Any position` (the default), then each team position. These filter the list.
4. **Talent grid.** `rankTalent(data, venue, team, role, days)` gives the approved talent who hold the role, or any team position.
   - Order: **free first**, then not free. Within each group, people who **worked with you** come first (`workedWith()`: any confirmed worked day at this venue), then by name.
   - Each **large ProfileCard** shows:
     - The photo (→ `talent/[id]`) with a status pill: `standingLabel()` when days are valid, else `Choose a time`. The free style applies when standing is `free`.
     - `standingLabel` values: `Available`, `Already booked`, `Not available`, `No availability set`, `Available {k} of {n} days`, `Available {start}–{end} only`, `Available other hours`.
     - A flag `Worked with you` when it applies.
     - Name, and `{roles joined " · "} · {area}`.
     - Pay `From £{minRate} / hour`, or `No minimum pay set`.
     - Up to 3 skills joined with ` · `.
   - Card actions:
     - If `openAnswer(data, venue, talent, days)` exists (an invited, can-cover or booked answer on another of this venue's open asks that overlaps these hours), one button → `shift/[thatShift]`, reading `Booked`, `Request sent` or `Said yes · Book`.
     - Otherwise a pick toggle (label `Choose {name}`) with the text `Add to request` / `Added`.
     - Always a `Message` button (§7.3 open-thread).
5. A link card: `Can’t find anyone?`, with `Post a job for every {role}` when a position is chosen, else `Post a job for all {team} staff` → `compose?team=`.
6. A **pinned action bar** while anyone is picked: `Send booking request to {names}` → `compose?team=&to=<ids>&position=<role if chosen>`.
   - `{names}` is `joinNames(first names)`, or `{n} people` when more than 2 are picked.

### `(venue)/post` (web `JobPostStart`)

- Heading `Post a job`, with Back to Book.
- The same team mosaic, with the caption `Post to this team`, or `Nobody in this team yet` when the team has no approved talent.
- Tapping a team → `compose?team=`.

### `(venue)/bookings` (web `WorkHub`)

Who: venue. Under the gate when it has no own shifts.

Data:

- `bookings`: this venue's bookings.
- `coming`: not cancelled, last day not ended; sorted by first day start.
- `pastBookings`: cancelled, or ended.
- `toConfirm`: not cancelled, with a day that has ended and has no log entry yet.
- `open`: own shifts with `status==='open'`, sorted by first day start.
- `decide`: open shifts where `venueSummary(s).needs` is true.
- `waiting`: the other open shifts.
- `closed`: own shifts that are closed or expired with no booking on them.

Sections:

1. Heading `Bookings`.
2. If `open`, `coming` and `toConfirm` are all empty: empty state `No bookings yet` with the button `Find cover` → Book.
3. **`Needs you`**: the `decide` shifts as VenueShiftRows, then the `toConfirm` bookings as BookingRows.
4. **`Upcoming`**: `coming` as BookingRows.
5. **`Waiting for replies`**: `waiting` as VenueShiftRows.
6. **`Past and cancelled ({n})`**, collapsed: pastBookings, then closed shifts.

**VenueShiftRow:**

- The team tile photo; title shiftLabel.
- Sub `{sentTo} · {whenLine}`. `sentTo` is `Job post`, or `Request · {first names joined ", "}`, or `Request · {n} people` when more than 2.
- Status = `venueSummary(s).text`, good or attention as it says.
- Tapping → `shift/[id]`.

**`venueSummary(s)`**, the venue's one status line, checked in this order:

1. filled → `Filled` (good)
2. expired → `Started unfilled`
3. closed → `Declined` if `declinedByAll` (`closedBy==='all-declined'`), else `Cancelled`
4. Approved can-cover or booked answers with bookable days left → `{prefix}{n} said yes · Book` (good, needs). The prefix `Cover needed again · ` applies when a cancelled day has reopened.
5. When there are active or dropped bookings:
   - **Single day:**
     - With capacity over 1: `{booked} of {capacity} booked`.
     - Else, if a day has reopened, the line is only `Cover needed again`.
     - Otherwise: `Needs someone`.
   - **Multi-day:** for the open days, `{Thu 8, Fri 9} each need {k} [more] person|people` when every day needs the same, else `Thu 8 needs 1 more person · Fri 9 needs 2 people`. `more` appears when someone is already booked that day.
   - A dropped day together with people still invited → `Waiting for {names}`.
   - Prefixed with `Cover needed again · ` when a day dropped (needs).
6. Otherwise: `Waiting for {joinNames(invited first names)}` for requests with someone still invited, else `No replies yet`.

---

## 6. Shift detail `shift/[id]` (web `ShiftDetail`)

Not found: empty `Shift not found`, button `Go home`.

Opening the screen marks notices for `shift/<id>` as read (§1.5).

- Talent → §6.1.
- Venue → §6.2. It is read-only if the shift isn't theirs.

### 6.1 Talent shift (web `TalentShift`)

Computed values:

- `r` — my response.
- `free` — `availableDates(me, s)`: open, not started, and no clash with my other bookings.
- `open` — `openDates(s)`.
- `busy` — dates I marked Not free.
- `suggested` — free minus busy.
- `b` — my active booking. `cancelled` — my cancelled booking.
- `invited` — `r.status==='invited'`.
- `accept` — invited, and `bookOnAccept(s)`, which uses `s.acceptBooks` from get_accept_flags.
- `eligible` — invited, or I hold one of the positions.
- `multi` — more than one day.
- `clashWith(date)` — the name of the venue where I'm booked at an overlapping time, or `''`.

**Body**, top to bottom:

1. `Back` (falls back to Shifts).
2. The venue hero photo (label `View {venue}’s public profile`) → `venue/[id]`.
3. An eyebrow link `Booking request · {area}` or `Job post · {area}` → venue.
4. The venue name as a large title link → venue.
5. Types plus cuisines joined with ` · `, when any.
6. The role line: the first shift position I hold when invited, else shiftLabel.
7. Facts:
   - `When`: `{whenLine}`, plus `{n} days · same hours` when multi.
   - `Pay`: `£{rate} / hour`, with `About £{round(rate×hours)} a day · {hours} hours`.
8. **Coverage list** (multi only). One row per day: `serviceLabel`, then a status, checked in this order:
   - `You’re booked` — my active day.
   - `You’re at {venue}` — a clash.
   - `Started` — not open and already started.
   - `Filled` — not open.
   - `You said yes` — my can-cover or booked answer offered that day.
   - `Open`.
9. `Note from {venue}` with the note, when there is one.
10. `Address` with `fullAddress(venue)`, when I have an active booking.
11. The action bar (below).

**Action bar priority (live).** The first rule that matches wins:

1. **Invited and the shift is open.**
   - If `free` is non-empty: a row of [**sayYes**, secondary `Decline`], then a quiet `Message {venue}`.
   - Else the clash note: `You’re booked at {clashWith(first day) || "another venue"} then.`
2. **I have an active booking.**
   - Note: badge `You’re booked`, then ` {datesLabel(my active days)}`. Add `. {venue} may also book you for {datesLabel(bookable)}.` when my answer still has bookable days.
   - Button `View your booking` → `booking/[id]`.
   - When the shift is open and the cancelled days of this booking are now free and not in my answer: a secondary `Offer {datesLabel(offerAgain)} again`. It calls say_yes with those dates.
3. **My answer is can-cover.**
   - Note `Waiting for {venue} to book you.`; when multi, `Waiting for {venue} to book you · {datesLabel(my offered dates)}.`
   - Buttons: `Message` (open-thread), and secondary `Withdraw`.
   - Withdraw calls `withdraw_yes({p_shift_id, p_client_ref})`, toast `Withdrawn.`
4. **The shift isn't open.** endedNote (below), then secondary `See open jobs` → Shifts.
5. **My answer ended** (declined, withdrawn, lapsed, not-selected or cancelled), **and** (it was a cancelled booking, or a job post in my positions), **and** `free` is non-empty: endedNote, then **sayYes**.
6. **My answer ended** otherwise: endedNote, then `See open jobs`.
7. **A request not sent to me:** `This request was sent to someone else.`
8. **Not eligible:** `This job is for {shiftLabel} only.`
9. **No free day:** the clash note, as in rule 1.
10. Otherwise **sayYes**.

**endedNote:**

- First `endedLabel(r, venue)` in long form: `Filled by someone else` | `Cancelled by {Venue}` | `Booked elsewhere` | `This shift has started.` | `Ended`.
- Else by response status:
  - declined → `You declined.`
  - withdrawn → `You withdrew.`
  - cancelled → `This booking was cancelled: {reason}`, or `This booking was cancelled.`
- Else by shift status:
  - expired → `This shift has started.`
  - closed → `{venue} cancelled this request|job post: {closeReason}`, or the same ending with `.`
- Else `Filled by someone else.`

**sayYes button:**

- Label: when multi and `free` covers fewer days than the shift, `{Accept|I can do} {free.length} of {n} days`. Otherwise `Accept` (when `accept`) or `I can do this`.
- Single day: send at once with `free`.
- Multi: open `sheet/which-days`, preselecting `suggested`.

**Respond** (`say_yes({p_shift_id, p_dates (given, or else free; unique, sorted), p_client_ref})`):

- Toast `You’re booked at {venue}.` when the result is `booked`, else `Sent to {venue}.`
- Close the sheet. When Accept booked me, navigate to `booking/[booking_id]`.
- Server refusals:
  - `This shift no longer exists.`, `This shift has already started.`, `This shift is no longer available.`
  - `You’ve already said yes to this.`, `This job is for other positions.`, `You’re booked elsewhere at that time.`
  - `Choose dates from this shift.`, `One of those days isn’t available any more. Check the days and try again.`
  - `Choose a talent member.`, `Your profile is waiting for approval.`

**Decline:** `decline_request({p_shift_id, p_client_ref})`, toast `Declined.` Refusals: `This shift has already started.`, `This has already been answered.`, `This shift no longer exists.`

#### `sheet/which-days` (params: shiftId)

- Title `Which days can you do?`
- One checkbox row per shift day showing `serviceLabel`.
  - Disabled when not free, with the small text `You’re at {venue}` (a clash) or `Filled`.
  - A day I marked not free shows `You marked this day not free`; it stays tickable but starts unticked.
- Button:
  - Nothing ticked: `Tick the days you can do`, disabled.
  - Else `{Accept|Yes to} all {n} days` when every day is ticked, or `{Accept|Yes to} {datesLabel(picked)}`.
- Tapping it runs Respond with the picked dates.

### 6.2 Venue shift (web `VenueShift`)

Read-only when `s.venue !== me`; then booking, invite, close and message actions are hidden.

Computed values:

- `responses` — all answers on the shift.
- `canCover` — status can-cover. `everyDay` offered every day; `someDays` the rest.
- `invited` — status invited.
- `ended` — declined, withdrawn, lapsed or not-selected.
- `bookings` — bookings on the shift. `c` = `coverage(s)`.
- `status` = `venueSummary(s)`.
- `earlier` — only while open: not-selected answers whose end reason is `filled` (or missing), from approved talent who now have available dates. These are people who said yes before it filled.

**Sections, in order:**

1. **Top bar.**
   - `Back` falls back to Bookings, or to Book when read-only.
   - When owned and open, a `More actions` menu (⋯):
     - `Send to more people` → `sheet/send-more`.
     - `Cancel request` (request mode) or `Remove job post` (post mode) → `sheet/close-shift`.
   - The menu closes on tapping elsewhere.
2. Eyebrow `Booking request` or `Job post`.
3. Title shiftLabel.
4. Meta `{whenLine} · £{rate}/h · {capacity} person|people`, plus ` each day` when multi.
5. **Status line** `status.text` (good style when good). Shown when there are any responses, any bookings, or the shift isn't open.
6. **Day tracker** (multi only). One block per day:
   - Head: `serviceLabel`, plus a badge:
     - `Booked · {first names joined ", "}`, plus ` · {left} more needed` when places are left.
     - Else `Open · {capacity} needed` when capacity is over 1, else `Open`.
     - Good style when full.
   - When places are left:
     - With people who can do it (can-cover or booked answers with this day bookable): `{k} can do it: {Name (all N days|Thu 8 only|Thu 8, Fri 9)}, …`. When owned, one secondary button per person, `Book {first}` → `sheet/book-confirm` with that day preselected.
     - Otherwise `No one yet.`
7. **`Booked`.** Rows per booking:
   - Talent photo and name.
   - Sub `{whenLine(active days, or all days if cancelled)}`, plus ` · can also do {Thu 8, Fri 9}` when their answer has more bookable days.
   - Status `Cancelled` / `Booked` (good).
   - Tapping → `booking/[id]`.
8. **Said-yes section.** Shown when there are any can-cover answers.
   - Title: `Can do every day` when the shift is multi and there are both everyDay and someDays answers; `Can do some days` when there are only someDays; else `Said yes`.
   - It lists everyDay, or someDays when there is no everyDay. Read-only shows names only.
   - Each **ResponseCard**:
     - Photo, plus a name link → `talent/[id]`.
     - `{roles " · "} · {area}`.
     - Tags:
       - `Worked with you` (good).
       - Multi only: `Can do all {n} days` (good), or `Can do {Thu 8, Fri 9}`, plus ` ({Sat 10} filled)` for offered days no longer bookable.
       - Up to 3 skills.
     - The bio, clamped.
     - Buttons:
       - `Book {first}`, plus ` · {daysPhrase(bookable, n)}` when multi → `sheet/book-confirm`.
       - Secondary `Message`.
9. **`Can do some days`.** A second section, shown only when both everyDay and someDays exist; it holds the someDays cards.
10. **All-declined fallback.** When owned, request mode, closed and `declinedByAll`:
    - `Everyone declined.` when more than one person was asked, else `{first} declined.`
    - Button `Send new request` → `compose?again=<id>`.
11. **No-replies fallback.** When open and owned, and no can-cover or booked answer has bookable days:
    - With bookings: heading `Find someone for {datesLabel(openDates)}`. Without: `No replies yet.`
    - When `earlier` is non-empty: `{names} said yes before it filled. Ask again and they can accept in one tap.`
    - Buttons: `Ask {first} again` for each person in earlier, then secondary `Send to more people`.
    - Ask again calls `send_to_more({p_shift_id, p_talent_ids:[id], p_client_ref})`, toast `Sent to {first}.`
12. **Others / Sent to.** Shown when anyone is invited or ended.
    - Title `Others` when anyone said yes or is booked; else `Sent to` for requests, `Others` for posts.
    - A grid of **medium ProfileCards** (photo, name, roles · area) with a status:
      - Invited → `No reply yet`.
      - Ended → `Said yes earlier` (for those in earlier), else `endedLabel(r, venue)` (long form), else `Declined` / `Withdrew` / `Booked elsewhere` / `Filled by someone else`.
    - Buttons when owned:
      - `New request` → `compose?again=<id>&to=<talentId>`, when the status is `Declined`, request mode, and not declinedByAll.
      - `Ask again`, when `Said yes earlier`.
      - Always secondary `Message`.
13. **`Note`**: the note, or `No note.`

#### `sheet/book-confirm` (params: shiftId, talentId, days? — preselected dates)

Also opened from the day tracker and from chat cards.

- `bookable` = `bookableDates(s, r)`: offered, still open, not already booked for them.
- Title `Book {first}?`
- The person: photo, name, and `{shiftLabel} · £{rate}/h`.
- When the shift is multi and more than one day is bookable: checkboxes per bookable day (`serviceLabel`), pre-ticked with the preselect ∩ bookable, or all bookable. Otherwise a plain list of the bookable services.
- `Adds to {first}’s booking.` when they already have an active booking here.
- Button `Book {first}`, plus ` · {daysPhrase(picked, n)}` when multi. Disabled with nothing picked.
  - Calls `book_talent({p_shift_id, p_talent_id, p_dates (picked, or else bookable; sorted), p_client_ref})`.
  - Toast `{first} is booked.`, close the sheet, navigate to `booking/[booking_id]`.
- Refusals:
  - `This shift no longer exists.`, `This shift has already started.`, `This shift is no longer available.`
  - `{first} can’t be booked any more.`, `The days they said yes to are already filled.`
  - `{first} is booked elsewhere at that time.`, `Book only days they said yes to that are still open.`
  - `One of those days isn’t available any more. Check the days and try again.`

#### `sheet/close-shift` (params: shiftId)

- Title `Cancel this request?` or `Remove this job post?`
- `People already booked stay booked.` when any active booking exists.
- `Reason`: a select of `Cover is no longer needed` (the default), `Cover found elsewhere`, `Plans changed`.
- Button `Cancel request` or `Remove job post`.
  - Calls `close_shift({p_shift_id, p_reason, p_client_ref})`.
  - Toast `Request cancelled.` or `Job post removed.`, then close the sheet and stay on the shift.
- Refusals: `This has already ended.`, `Choose a reason.`, `This shift no longer exists.`

#### `sheet/send-more` (params: shiftId)

- Title `Send to more people`.
- Every approved talent, those holding any of the shift's positions first.
- Each row: photo, name, and a sub-line:
  - With an existing invited, can-cover or booked answer: `Booked`, `Already sent` or `Already said yes`.
  - Else, with no available date: `Booked elsewhere then`.
  - Else their roles joined with ` · `.
- A toggle (label `Choose {name}`), disabled when there is an existing answer or they're blocked.
- Button `Send to {n} people` when more than one is picked, else `Send`. Disabled with nothing picked.
  - Calls `send_to_more({p_shift_id, p_talent_ids, p_client_ref})`. Toast `Sent.`, clear the picks, close.
- Refusals:
  - `Choose at least one person.`, `This shift is no longer open.`, `This shift no longer exists.`, `Choose up to 100 people.`
  - Per person: `{first} is already booked then.`, `You’ve already asked {first} for this time.`, `{first} already said yes to your job post for this time.`, `{first} is booked elsewhere then.`, `Choose talent members to send this to.`

---

## 7. Other pushed screens

### 7.1 `booking/[id]` (web `BookingDetail`)

Who: the booking's venue or talent. Anyone else, or an unknown id: empty `Booking not found`.

Opening it marks notices for `booking/<id>` as read.

Computed values:

- `services` = `bookingServices(b)`: active days, or all days if fully cancelled.
- `first` = `services[0]`.
- `past` = `bookingPast()`: no days, or the last day has ended.
- `started` = the first day has begun.
- `future` = services not yet started (empty when cancelled).
- `records` = `dayRecords(b)`.
- The person shown is the talent (venue view) or the venue (talent view).

**Title:**

- `Booking cancelled` when cancelled.
- Else `Past booking` when past.
- Venue view: `{first} is on service` once started, else `{first}’s coming {when} at {start}`, where `{when}` is `today`, `tomorrow` or `on Thu 8 Oct`.
- Talent view: `You’re on service at {venue}` once started, else `You’re booked at {venue}`.

**Sections:**

1. **Person:**
   - Photo and name (→ their card).
   - Venue view: the talent's roles joined with ` · `, and their phone.
   - Talent view: `{shiftLabel} · {area}`.
2. **Cancelled callout** (when cancelled): `Cancelled by {name of who cancelled}`, with the reason.
3. **`Days`.** One row per booked day: `serviceLabel`, a detail line, and a badge or button.

   | Day status | Detail line | Badge (venue / talent) |
   |---|---|---|
   | booked | `{hours} hours · about £{pay}` | `Booked` (good) |
   | to-confirm (ended, nothing recorded) | venue: `Confirms automatically after 48 hours`; talent: `{venue} has 48 hours to confirm` | venue: the button `Confirm hours` → `sheet/confirm-hours`; talent: `Waiting for hours` |
   | worked | `{start}–{end} · {hours} hours · £{pay}`, plus ` · confirmed automatically` when auto | `Worked` (good) |
   | no-show | `Not paid` | `Didn’t show` |
   | cancelled | `{name of who cancelled}: {reason}` | `Cancelled` |

   - pay = round(hours × rate, 2).
   - Footer: `£{rate}/h · {shiftLabel} · paid by {venue}`. When days have been worked, add ` · {sum} hours worked`, and ` so far` when any day is still booked or to-confirm.
4. **Arrival** (not cancelled, not past). Titled `Shared with {first}` (venue) or `Getting there` (talent).
   - `Address`: fullAddress. Talent also get a link `Directions` → `https://www.google.com/maps/search/?api=1&query={encoded address}`.
   - `On-site contact`: `{contactLine} · {venue phone}`.
   - `Note`: the note, or `No note.`
   - The contact details come only from get_booking_contact, inside the window that ends 48 h after the last live day.
5. **Actions:**
   - `Message {first}` (open-thread).
   - `Call`, a `tel:` link to the talent phone (venue) or the venue phone (talent).
   - `Add to calendar` when not cancelled and not past. On web it makes an .ics file with one event per active day: title `{shiftLabel} at {venue}`, location the address, description `£{rate}/hour. {note}`. Use the native calendar or share sheet.
6. **Reopened callout** (venue view, shift open, open dates exist, and some day of this booking was cancelled):
   - `{datesLabel(openDates)} needs someone again.` (or `need` for several dates).
   - Button `Find someone` → `shift/[id]`.
7. `Book {first} again` (venue view, past or cancelled) → `compose?team={teamOf(shift)}&to={talentId}`.
8. **Cancel** (when future days exist): a quiet danger button `Cancel days` (more than one future day) or `Cancel booking` → `sheet/cancel-days`, with every future day pre-ticked.

#### `sheet/cancel-days` (params: bookingId)

- Title `Which days are you cancelling?` (more than one future day) or `Cancel this booking?`
- With more than one future day: checkboxes per future day (`serviceLabel`). Otherwise the single service.
- Text: venue `{first} is told and the day reopens.`; talent `{venue} is told and can find someone else.`
- `Reason` select:
  - `Choose a reason` (empty).
  - `Illness or emergency`, `Plans changed`, `Unable to travel`.
  - `Cover no longer needed` (venue only).
  - `Other`.
- `Anything to add · optional`: a textarea.
- Danger button: `Cancel {n} days`, `Cancel {Thu 8}`, or `Cancel booking` when none is ticked. Disabled without a reason or with no day ticked.
  - Calls `cancel_days({p_booking_id, p_dates (sorted), p_reason: "{reason}" or "{reason} — {extra}", p_client_ref})`.
  - Toast `Cancelled.`, then close.
- Quiet `Keep booking` closes the sheet.
- Refusals:
  - `This booking can no longer be cancelled.`, `This booking is already cancelled.`
  - `That day is already cancelled.`, `Those days are already cancelled.`
  - `Only days that haven’t started can be cancelled.`, `Choose a reason.`, `Keep the reason under 500 characters.`

#### `sheet/confirm-hours` (params: bookingId, date)

Venue only.

- Title `Hours on {displayDate(date)}`.
- Text `Change the times if {first} started or finished at a different time.`
- From/To TimeSelects, preset to the day's recorded or planned start and end.
- Button `Confirm {start}–{end}`.
  - Calls `confirm_day({p_booking_id, p_day_date, p_outcome:'worked', p_start_time, p_end_time, p_client_ref})`.
  - Toast `Hours confirmed.`, then close.
- Quiet danger `{first} didn’t show`.
  - Calls `confirm_day({…, p_outcome:'no-show', p_start_time:null, p_end_time:null})`.
  - Toast `Marked as a no-show.`
- Refusals:
  - `Only the venue confirms the hours worked.`, `This day has already been recorded.`
  - `You can confirm a day once it has finished.`, `Choose different start and end times.`, `Check your answers and try again.`

### 7.2 `compose` (web `ShiftComposer`, Composer.tsx)

Who: approved venue.

Params:

- `team` — the team name.
- `to` — talent ids, comma-separated. Unknown ids and non-talent ids are dropped.
- `position`.
- `again` — the id of one of my shifts. When set, the team = `teamOf(again.roles)`, and `to` defaults to everyone the original request went to (source invite).
- `from=chat`.

**Pre-fill.** With `again`:

- roles = its positions; dates = all its days; start and end = its times.
- capacity, rate and note = its values.

Otherwise:

- **roles**, the first of these that applies:
  - `[position]`, if `position` is in the team.
  - The positions within the team held by the chosen people (unique).
  - The roles of this venue's most recent shift in the team (`lastAsk(team)`).
  - `[]`.
- **dates**: the dates of the shared "when", or `[tomorrow]`. **start and end**: the shared when's times (default 17:00–23:00).
- **capacity** 1.
- **rate**: the most recent shift in the team's rate, or 0.
- **note**: the most recent shift in the team's note, else the note of the most recent shift in any team, else empty.

**Mode.** It is a request when `to` is non-empty, otherwise a job post. Removing every person from To turns it into a job post.

Layout:

1. **Heading.** `Booking request`, or `{team} job post`. Back.
2. **`To`.**
   - Request: one chip per person, with photo, name and a remove ✕ (label `Remove {name}`).
   - Post: `Everyone in {roles joined " or "}.`, or `Everyone in the position you choose.` when no role is chosen.
3. **`Position`.** Multi-select chips of the team's positions. In post mode each chip also shows a count of approved talent with that position.
4. **`When`.**
   - An open DateTimeBar (max 14 dates). Changes also update the shared when.
   - Then the computed days: one `serviceLabel` line each, plus `Same hours each day` when there is more than one.
   - **Already-asked warnings**, one per chosen person with an `openAnswer()` for these hours:
     - Text from `alreadyAsked()`: `{first} is already booked then.`, `You’ve already asked {first} for this time.`, or `{first} already said yes to your job post for this time.`
     - Then a link `Book` (when they said yes) or `View` → `shift/[thatShift]`.
     - Then ` · ` and `Remove`, which drops them from To.
   - **Duplicate warning.** `similarShift()` finds my open shift with an overlapping position and overlapping hours.
     - In request mode, when that shift still has open dates:
       - `Your {roles " or "} {job post|request} for {datesLabel(openDates(dup))} still needs someone. Send it to {names} instead?`
       - Button `Send that job to {names}` → `send_to_more({dup.id, to})`, toast `Sent to {names}.`, then → `shift/[dup.id]`.
     - Otherwise: `You already have a {job post|request} for {roles " or "} then.`, with a link `View` → `shift/[dup.id]`.
5. **`Pay`** and people.
   - Pay: `£` input (aria `Pay per hour in pounds`, min 0.5, step 0.5, placeholder `0`) with `/ hour`.
   - `People needed`, or `People needed each day` when there is more than one day: a stepper from 1 to 5 (labels `One fewer person` / `One more person`).
6. **Pay warnings:**
   - When 0 < rate < 12.71: `£{rate}/h is below the National Living Wage (£12.71).`
   - In request mode, when rate ≥ 12.71 and below the highest minimum of the chosen people: `Below the minimum for {joinNames("{first} (£{minRate}/h)" for each person whose minimum is above the rate)}.`
7. **`Note`.**
   - The heading has a link `Edit`, hidden while editing.
   - Not editing: the note, or `No note`.
   - Editing: a textarea (aria `Note to talent`).

**Validation**, the first of these that applies:

1. `makeDays` errors: `Choose between 1 and 14 dates.`, `Choose different start and end times.`, or a clock-change message.
2. The first day has already started → `That start time has passed.`
3. No position → `Choose at least one position.`
4. Any already-asked person → `alreadyAsked()` for the first one.

The validation text shows inline as an error line (role alert) **only** when at least one position is chosen and there is no already-asked warning. The submit button is disabled whenever there is any validation.

**Submit** (action bar):

- Label: `Send booking request to {joinNames(first names) | "{n} people" when more than 2}`, or `Post job`.
- Calls `post_shift({p_team, p_positions, p_dates, p_start_time, p_end_time, p_capacity, p_rate_pence: round(rate×100), p_note, p_to (unique ids), p_client_ref})`.
- Success toast:
  - A post the server says reached nobody (`mode==='post' && alerted_count===0`): `Nobody will be alerted about this job post. Try sending booking requests instead.`
  - Else, a request to one person for one place: `Sent. {first} is booked as soon as they accept.`
  - Else a request: `Sent to {names}. Book whoever says yes.`
  - Else a post: `Job posted.`
- Then: with `from=chat`, go back (pop to the chat; the new card is the confirmation). Otherwise replace with `shift/[shift_id]`.
- Server refusals:
  - `Choose the position you need.`, `Add the pay per hour.`, `Choose between 1 and 5 people.`
  - `Keep the note under 2,000 characters.`, `That start time has passed.`, `Choose dates in the next 8 weeks.`, `Choose between 1 and 14 dates.`, `Choose different start and end times.`
  - `Only venues can send shifts.`, `Choose up to 100 people.`, plus the send_request per-person refusals (§6.2 send-more).
  - `Couldn’t save. Try again.` after 3 lock retries.

### 7.3 `chat/[id]` (web `Thread` + `Conversation`)

Who: either member of the conversation. Anyone else: empty `Conversation not found`, button `Back to messages`.

**Open-thread** (every `Message …` button in the app; `useMessage`):

- If a conversation with that person exists, open it.
- Otherwise call `open_conversation({p_other_member_id})`, reload, and navigate to `chat/[conversation_id]`.
- Refusals: `Venues and talent can message each other.`, `Your profile is waiting for approval.`

**Header:** Back (to Messages), the other person's photo and name (→ their card).

**Pinned panel:**

- Venue view: `{first} · from £{minRate}/h` or `{first} · no minimum set`, with their roles joined with ` · ` (or their bio) under it. Button `Send booking request` → `compose?team={familyOf(talent)}&to={talentId}&from=chat`. `familyOf` is the first team holding one of their positions, falling back to Kitchen.
- Talent view: `{venue name} · {area}`, with the bio under it.

**Messages**, in order (seq):

- A **shift card** for messages carrying a shift (§7.3.1).
- A **system line** (kind event) in grey, centred. The text comes from the server, e.g. `Booked: Mon 5–Wed 7 Oct · 17:00–23:00 · £18/h.`, `Poppy Bertram accepted. Booked: …`, `Added to the booking: …`, `Filled by someone else.`, `This shift has started`, `{Name} is now booked elsewhere at this time.`, `{Name} cancelled {dates}: {reason}.`, `{Name} declined.`, `{Name} withdrew.`, `{Name} is no longer available.`
- A **text bubble**, aligned right when mine: sender name, text, `clockLabel(time)`.
- With no messages: `No messages yet.`

**Composer:**

- A multi-line input (label `Your message`, placeholder `Write a message…`) that grows to 120 px.
- The draft saves to device storage on every keystroke, per member and conversation.
- Send (label `Send message`) is disabled while the text is blank.
  - Calls `send_message({p_conversation_id, p_body: trimmed, p_client_ref})`.
  - Clears the draft and reloads. No toast.
- Client refusal: `Write a message first.`
- Server refusals: `Keep messages under 2,000 characters.`, `{name} can’t get messages right now.`, `This conversation is private.`, `Your profile is waiting for approval.`

**Reading:** on open, and whenever the last message changes while the chat is open, call `mark_conversation_read({p_conversation_id, p_up_to_seq: lastSeq})`. Skip the call when already read up to that seq.

#### 7.3.1 Chat shift card rules (web `ShiftMessage`)

Per card:

- `s` = the card's shift (no card if it isn't visible).
- `person` = the thread's talent. `r` = their answer on `s`. `b` = their active booking on `s`.
- `fromTalent` = the card was sent by the talent (a yes card such as `Can do it`, `Can do {dates}` or `Can also do {dates}`).
- `dates` = the talent's offered dates when fromTalent, else all the shift's days.
- `latest` = this is the newest card for this shift in the thread. **Only the latest card for a shift carries an action**, so a thread never offers the same Book twice.

Layout:

- **Head:**
  - `{first} said yes` when fromTalent, else `Booking request · {venue}` or `Job post · {venue}`.
  - Then ` · {clockLabel(time)}`.
  - A status badge:
    - With no answer: `Open` / `Filled` / `Cancelled`, from the shift status.
    - invited: talent sees `Waiting for you`; venue sees `Waiting for {first}`.
    - can-cover: venue sees `{first} said yes`; talent sees `Waiting for {venue}`.
    - Else `responseLabel(r)`.
    - Good style when booked. Attention style when the talent sees an invite, or when the venue can book.
- **Title:** shiftLabel.
- **`When`:** `{datesLabel(dates)} · {start}–{end}`, plus `{n} days · same hours` when there is more than one date.
- **`Pay`:** `£{rate}/hour`, with `About £{round(rate × hours × dates)} in all · {hours × dates} hours`.
- **`Note`:** shown when there is a note and the card isn't fromTalent.

**Action**, the first of these that applies:

1. Latest card, the venue viewing, the answer is can-cover, the shift is open and bookable dates exist → button `Book {first}` → `sheet/book-confirm`.
2. An active booking exists → link `View booking` → `booking/[id]`.
3. Latest card, the talent viewing, the answer is invited and the shift is open → button `Answer` → `shift/[id]`.
4. Latest card, the venue viewing, request mode and the answer is declined → button `Send new request` → `compose?again=<shiftId>&to=<talentId>&from=chat`.
5. Otherwise a link `View request` (request mode) or `View job post` → `shift/[id]`.

### 7.4 `talent/[id]` (web `TalentProfile`)

Who: approved venues, and the talent themself. Not a talent, or not visible: empty `Profile not found`.

- Heading = name. Description `{roles " · "} · {area}`. Back.
- The photo.
- Badge `Worked with you` when it applies.
- The verified line, then the bio, then the skill chips.
- `Minimum pay`: `£{minRate} per hour`, or `Not set`.
- Venue only: buttons `Send booking request` → `compose?team={familyOf(t)}&to={id}`, and secondary `Message {first}`.
- **`Free on`:** chips for their free marks dated today or later, taking the first 7 in loaded order: `{displayDate} · {freeLabel}`. When they have no free mark at all: `Availability not set`.

### 7.5 `venue/[id]` (web `VenueDetail`)

Who: approved talent, and the venue itself ("View as talent"). Not found: empty `Venue not found`.

- Heading = name. Description = area. Back.
- The photo, the verified line, the bio, and VenueFacts (types · cuisines, Instagram link).
- **Talent only:**
  - When a conversation with this venue exists and holds at least one message: button `Open conversation` → `chat/[id]`.
  - Otherwise the muted text `Venues start conversations. Apply to an open job, or keep your availability up to date so {venue} can book you.`
- When I have an active booking with this venue: `Address` = fullAddress, and `On-site contact` = `{contactLine} · {phone}`.
- **`Open jobs`:** this venue's open job posts as ShiftCards.
  - Empty: title `No open jobs here`, text `When {venue} posts a job, it shows here.`, button `See open jobs` → Shifts.

### 7.6 `notifications` (web `Notifications`)

Who: any member.

- Heading `Notifications`, with a secondary button `Mark all read` → `mark_notifications_read({p_ids:null, p_target:null})`.
- The list: own notices, newest first (up to 200).
  - Each row: a dot (red when unread), the title, the body, `{clockLabel(time)} · London`, and `View`.
  - Tapping marks that one read (`p_ids:[id]`) and navigates to its target route (§0).
- Empty: `You’re all caught up`.

**Notice kinds.** The server writes the wording. This table is from `docs/backend/07-notifications.md`; titles and bodies are shown as `Title · body`.

To **talent**:

| Kind | Title · body | Opens |
|---|---|---|
| booking-request | `{Venue} sent you a booking request` · `{positions} · {dates} · {hours} · {rate}` | shift |
| job-posted | `{Venue} posted a job` · `{positions} · {dates} · {hours} · {rate}` (one day: `{positions} · {day} · {rate}`) | shift |
| booked | `You're booked at {Venue}` · `{positions} · {all booked dates} · {hours}` | booking |
| days-added | `{Venue} added {new dates} to your booking` · `{positions} · {all booked dates} · {hours}` | booking |
| filled-by-other | `Filled by someone else` · `{Venue} · {positions}` | shift |
| shift-filled | `This shift has been filled` · `{Venue} · {positions}` | shift |
| shift-closed | `Cancelled by {Venue}: {reason}` · `{Venue} · {positions}` | shift |
| shift-started | `This shift has started` · `{Venue} · {positions}` | shift |
| days-cancelled | `{Venue} cancelled` · `{positions} · {cancelled dates} · {reason}` | booking |
| hours-confirmed | `{Venue} confirmed {n} hours` · `{date} · {worked hours} · £{pay}` | booking |
| no-show | `{Venue} marked you as a no-show` · `{date}` | booking |
| reminder | `Your shift at {Venue}` · `{day}. The address is in your booking.` | booking |

To **venues**:

| Kind | Title · body | Opens |
|---|---|---|
| said-yes | `{Talent} can do it` · `{positions} · {dates they can do} · {hours}`, plus ` ({k} of {n} days)` when not every day | shift |
| accepted | `{Talent} accepted` · `{positions} · {dates} · {hours}. They're booked.` | booking |
| declined | `{Talent} declined` · `{positions} · {dates} · {hours}` | shift |
| withdrew | `{Talent} withdrew` · `{positions} · {dates they had offered} · {hours}` | shift |
| booked-elsewhere | `{Talent} is booked elsewhere` · `{positions} · {clashing dates}` | shift |
| days-cancelled | `{Talent} cancelled` · `{positions} · {cancelled dates} · {reason}` | booking |
| shift-unfilled | `Shift started unfilled` · `{positions} · {dates}` | shift |
| unavailable | `{Talent} is no longer available` · `{positions} · {dates}` | shift |

To **either side**:

| Kind | Title · body | Opens |
|---|---|---|
| approved | `You're approved` · talent: `Venues can now find you. Add the days you're free.` / venue: `You can now post jobs and send booking requests.` | `availability` (talent), `profile` (venue) |
| document-verified | `{Document} verified` · `It now shows on your profile.` (CV: `Dyuknow has checked it.`) | `account` |
| document-rejected | `{Document} not accepted` · `{reason}. Upload a new one.` | `account` |

These make **no notice**:

- The member's own actions.
- Hours confirmed automatically.
- A request closing because everyone declined.
- A filled shift reopening.
- An invited answer that loses some days but keeps others.
- A lapse caused by the same venue booking the person on another shift.
- Booked people when a shift is closed.
- Creating or editing a profile, saving availability, uploading a document.
- Losing approval.
- Chat texts, which light the Messages dot instead.

Job-post alerts follow `talents.shift_alerts`:

- `all` — every post in their positions.
- `soon` — posts whose first day is today or tomorrow (London).
- `off` — none.

In every case the talent must be approved, must not have asked for deletion, and must have at least one free day on the post.

### 7.7 `account` (web `AccountPage`, Account.tsx)

Who: any member.

- Heading `Account`.
- An index of jump links: `Verification`, `Notifications`, `Help`, `Account`.

Cards, in order:

1. **`Verification`** (talent) or **`Business verification`** (venue).
   - Text `{verified} of {total} checked. Your profile shows a tick, never the file.`
   - **Documents per side** (`requiredDocs()`; the labels are `document_types.label`):
     - Venue: `Business registration`, `Premises licence`.
     - Talent: `Right to work`, `Photo ID`, then `Food hygiene certificate` if any position is in Kitchen or Pastry, else `Allergen awareness`.
     - The CV is never listed here.
   - One row per document: name, a detail line, a badge and a button.

     | State | Detail | Badge | Button |
     |---|---|---|---|
     | rejected (latest upload) | `{reason without trailing punctuation}. Upload a new one.`, or just `Upload a new one.` | `Not accepted` | `Replace` (secondary) |
     | verified | `Checked {displayDate(reviewed or uploaded)}` | `Verified` (good) | `Replace` (secondary) |
     | review | `{file name} · usually within a day` | `Being checked` | `Replace` (secondary) |
     | missing | `Upload a JPEG, PNG or PDF` | `Needed` (attention) | `Upload` (primary) |

   - The button opens a file or document picker (JPEG, PNG, PDF), then runs the `upload-doc` action:
     - The document code comes from `docCodes[label]`; if it's missing, `Choose one of the listed documents.`
     - Type check `Upload a JPEG, PNG or PDF.` and size check `Choose a file up to 10 MB.`
     - Upload to `member-documents/<uid>/<code>-<uuid>.<ext>`.
     - `save_document({p_doc_type, p_storage_path, p_original_filename})`, then delete `old_path`.
     - Toast `{label} sent to Dyuknow to check.` A new upload goes back to review, and the rejected state clears.
2. **`Notifications`.**
   - Text `Notices show in the app, on the bell.`
   - Talent only: a row `New job posts` with the hint `In your positions`, and a select of SHIFT_ALERTS (`All shifts in your positions`, `Today and tomorrow only`, `Off`).
   - A change calls `update_my_settings({p_shift_alerts})`, toast `Saved.` Refusal `Check your answers and try again.`
3. **`Help`:** a `Call` link `+44 20 7946 0000` (tel) and an `Email` link `help@dyuknow.example` (mailto). These are placeholders.
4. **`Account`:**
   - `Email`, showing the login email (read-only).
   - Secondary `Log out` (§1.10).
   - With no deletion requested: a quiet danger button `Delete account` → a confirm sheet:
     - Title `Delete your account?`
     - Text `Upcoming bookings stay until they’re done or cancelled. Dyuknow removes your profile and documents, then gets in touch to confirm.`
     - Danger button `Request deletion` → `request_account_deletion()`, toast `Deletion requested.`
     - Quiet `Keep my account` closes the sheet.
   - After a deletion request: the text `Deletion requested {clockLabel(at)}. Dyuknow will be in touch to confirm.` and a link `Keep my account` → `keep_my_account()`, toast `Deletion request withdrawn.`
   - A request stops job-post alerts. Nothing else changes.

---

## 8. Option lists (`lib/catalogue.ts`, `lib/data.ts`)

- **TEAMS / positions:**
  - Kitchen: `Demi CDP`, `CDP`, `Senior CDP`, `Junior Sous`, `Sous Chef`, `Head Chef`, `Executive Chef`.
  - Pastry: `Pastry Chef`.
  - Bar: `Bartender`, `Mixologist`.
  - Sommelier: `Sommelier`.
  - Floor: `Maître d’`, `Restaurant Manager`, `Supervisor`, `Section Waiter`, `Waiter`, `Host`.
  - The spelling must match exactly. The server matches positions by string.
- **SKILL_GROUPS:**
  - Kitchen: Grill, Fish, Meat, Pasta, Pastry, Bakery, Breakfast, High Volume, Fine Dining, Open Fire, Wood Oven, Sushi, Sushi / Fish Specialist, Butchery, Events, Private Dining, Production Kitchen.
  - Front of house: Wine Service, Cocktails, Coffee, Silver Service, Events, Hotel, Fine Dining, High Volume, Reservations, Guest Relations, Barista.
  - `SKILLS` is the unique union of both groups.
- **SHIFT_ALERTS:** all `All shifts in your positions`; soon `Today and tomorrow only`; off `Off`.
- **VENUE_TYPES:** Restaurant, Hotel, Pub, Bar, Private Members Club, Events, Catering, Bakery, Other.
- **CUISINES:** British, Italian, French, Spanish, Seafood, Asian, Indian, Japanese, Chinese, Middle Eastern, American, Mexican, Mediterranean, Modern European, Other.
- **Other lists:**
  - COVERS_BANDS `0–30`, `30–60`, `60–100`, `100+`.
  - DRESS_CODES `Chef whites`, `Blacks`, `Casual`.
  - VENUE_KNOWN_FOR, TEAM_CATEGORIES, YEARS_BANDS, SHIFT_TYPES, MAX_TRAVEL_OPTIONS, LONDON_AREAS, HOURLY_RATE_OPTIONS, CHEF_KNOWN_FOR, FOH_KNOWN_FOR, TEAM_AGREEMENTS, ROLES_NEEDED, TYPICAL_NOTICE and VENUE_AGREEMENTS are listed in full in §3.
- **Team tile photos:** Kitchen `role-headchef-tile`, Pastry `talent-pastry-dish-1`, Bar `talent-bartender-1`, Sommelier `talent-sommelier-1`, Floor `talent-maitred-1` (web `/assets/*.webp`).

---

## 9. Not in the app

- **Push notifications.** The backend sends no push, no email and no SMS about activity. Notices live only in the bell (§7.6), and arrive live through Realtime while the app is open. Email notifications are planned later (an outbox plus Resend), with no table changes.
- **Reviews and ratings.** There are none, although onboarding asks venues to agree to "Rate honestly".
- **Editing a posted shift.** A posted shift can't be edited. The venue can only send it to more people, close it (`close_shift`), or start a new one from it (`compose?again=`).
- **Payments.** Pay amounts are shown only. The venue pays the talent directly ("paid by {venue}").
- **Admin.** Approving members and checking documents happen only on the web `/admin`. The web's `/admin/onboarding` intake form is also outside the app.
- **Landing page.** Not in the app. It opens straight to sign-in.
- **Demo-only features**, not rebuilt:
  - The Preview pill, account switcher, preview controls, walkthrough (Stories) and Undo on toasts.
  - Phone sign-in and SMS codes, changing the phone with a text code, and the text toggles (Bookings, Messages, Reminders).
  - Setup inside the app.
- **Changing the sign-in email, and deleting an account** for real. Deletion is only recorded as a request.
- **Messaging without approval, and seeing contact details outside the 48-hour window.** The server refuses both.

---

## 10. Mobile decisions on the web's ambiguities
Where the web app is unclear or inconsistent, the app does this:
1. Sign-in is email + password; codes only confirm a new account and reset a password (as `LoginForm.tsx`).
2. Admin with no member row → `admin-only`: "The Dyuknow team area is on the web." + Log out.
3. Onboarding step 0 has Back to "Who are you?".
4. "Available today?" stays on the form and pass as on web (not saved — the backend has no column).
5. Documents follow Account.tsx; CV uploaded at onboarding is not listed in Account (as web).
6. Talent can message a venue from a shift they're answering ("Message {Venue}"), as web; the venue page note stays.
7. `client_ref` is reused when the same tap is retried after a network failure (the backend's intent).
8. Money: whole pounds as `£18`, otherwise two decimals `£18.50`, always tabular.
9. Toasts auto-dismiss (3.5 s success, 6 s error) and can be tapped away.
10. Bell and Messages counts come from `get_badge_counts()` where available.
11. Bookings hub: a booking appears once — under "Needs you" if it needs you, otherwise Upcoming/Past.
12. Back fallbacks go to the screen the person came from, else the side's home tab.
13–18: as web.
