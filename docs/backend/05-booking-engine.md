## The booking engine

Every change a member makes is one call to a database function, which saves everything or nothing. The functions port the demo's rules in lib/preview/model.ts, apart from the fixes under Changes from the demo. This section is the only specification of the functions that change data; other sections point here. The read-only functions are specified in Who can see what → Functions that only read.

Who may read what is in Who can see what. Timed work is in Scheduled jobs, and the wording of every notice is in Notifications.

### How a function runs

The app calls each function by name through supabase-js, as an RPC (a remote call to a database function). Each function runs with its owner's rights (SECURITY DEFINER), so it can write tables that members can't touch. Each sets an empty search path (the list of places Postgres looks for a table named without its schema), so every table is written in full, such as public.shifts.

Every function works through the same steps, in this order:

1. **Find the caller.** The caller comes from their login, through auth.uid(), never from the input. Their members row is looked up, without a lock yet, so the function knows what to lock.
2. **Lock.** It locks every row two people could change at once, in one fixed order (see Locking).
3. **Read the clock once.** After the last lock it reads the time with clock_timestamp() into t. Every check and every timestamp it writes uses t, including created_at. Postgres's now() isn't used: it is the moment the call began, which can be seconds before a lock was granted.
4. **Settle.** Each shift it locked is brought up to date by settle_shift. A shift whose time has run out expires, and waiting answers whose days have all started end. So a late sweep only delays notices; it never changes an outcome.
5. **Check the caller, after the locks.** An admin who takes approval away a moment earlier is therefore always seen.
   - The caller needs a members row that isn't deleted. Otherwise: "Sign in to continue." A login with no members row may call only create_my_profile; anything else says "Create your profile first."
   - Venue actions refuse talent, and the reverse, with the demo's message where one exists.
   - Posting, sending, saying yes, booking and messaging need an approved member: members.approved is true. Otherwise: "Your profile is waiting for approval."
   - Declining, withdrawing, closing an ask, cancelling or confirming booked days don't need approval. Nor does looking after one's own profile, settings, documents and availability.
6. **Check the caller may see what they named.** This comes before any other refusal about it. An id they can't see gets the same message as one that doesn't exist, so a refusal never reveals a name or a shift's state.
7. **Check the rest, then write.** Each function lists its refusals in the order they're checked.

These also hold throughout:

- **All or nothing.** Each call is one transaction (a set of changes saved together or not at all). A refusal undoes everything, including what settle_shift wrote; the sweep writes that again within five minutes.
- **London time.** Dates and clock times are London ones, turned into exact instants by london_instant. A clock time that happens twice, or not at all, when the clocks change is refused.
- **Safe to tap twice.** Ten functions take a required client_ref, a random id the app makes for one tap and reuses on a retry (see Tables → call_receipts). It isn't repeated in each input table.
  - They are post_shift, send_to_more, say_yes, decline_request, withdraw_yes, close_shift, book_talent, cancel_days, confirm_day and send_message.
  - Right after finding the caller, each inserts a receipt (caller, client_ref, function name), doing nothing if one exists.
  - If one exists, it returns that receipt's stored result. A receipt for a different function is refused with "Couldn’t save. Try again."
  - The last step stores the result.
- **Other repeats are refused accurately.** A fresh tap (a new client_ref) of say_yes, book_talent or cancel_days after a success gets a true message, such as "You’ve already said yes to this." The app also disables each button while its call runs.
- **Plain refusals.** Every refusal raises one error code with a plain message, which the app shows as it is. Any other error shows "Couldn’t save. Try again."
- **Side effects in the same call.** Cards, grey lines and notices are written in the same transaction as the change. Their texts use names as they are at that moment, and are never rewritten.

### Locking

Two people acting at once are kept apart by row locks, always taken in the same order. A row lock makes any other call that wants the same row wait until this call finishes.

1. Shift rows, in id order.
2. Member rows, in id order: always the caller's, plus the talent's when a venue acts on one.
3. The booking, then its booked days. The capacity trigger then locks each shift day it books.

Conversations come last, in id order. A call saves all its cards, lines and messages at its end, sorted by conversation id, each taking the conversation's next seq under its lock (see Tables → conversations). An answer is only ever changed by a call that holds its shift's lock.

#### Look, lock, look again

A call that may change answers on other shifts first finds those shifts without locking anything. It locks them all in id order, locks the member rows, then looks again. If the set has grown, because another call saved a new answer or booking in between, it starts again.

```
lock_set(find_shifts, members, then):
  shifts = find_shifts()                         -- a plain read, no locks
  lock every shift in shifts, in id order
  lock every member in members, in id order
  lock the rows in then (a booking, then its days), if any
  if find_shifts() now finds a shift not in shifts: start again
  t = clock_timestamp()
  for each shift in shifts: settle_shift(shift, t)
  return t
```

Most functions use lock_set, passing a single shift or none. confirm_day and admin_review_document lock their one row directly.

In the Steps below, add_card and add_event appear where the change happens. The code collects those writes and saves them at the end of the call, sorted by conversation id, as the order above requires.

A thin wrapper around every function the app calls handles "start again". It runs the work inside a savepoint (a marker that lets one attempt be undone, and its locks released, on its own). After a "start again" or a deadlock (Postgres error 40P01), it undoes that attempt and tries again, at most twice more. Then the person sees "Couldn’t save. Try again."

A deadlock is two calls each waiting for a row the other holds; Postgres stops one of them. The fixed order makes deadlocks rare, and the wrapper covers the rest.

| Function | Shifts locked | Member rows locked | Then |
|---|---|---|---|
| post_shift | None: the new shift is invisible until saved | The venue and every recipient | |
| send_to_more | The shift | The venue and every new recipient | |
| say_yes | The shift, plus every shift where the talent has an invited, can-cover or booked answer overlapping it | The talent | Their booking here, on an Accept |
| decline_request, withdraw_yes | The shift | The talent | |
| close_shift | The shift | The venue | |
| book_talent | The shift, plus every shift where the talent has an invited, can-cover or booked answer overlapping it | The venue and the talent | The talent's booking here |
| cancel_days | The booking's shift | The venue and the talent | The booking, then its days |
| confirm_day | None | None | The booked day |
| send_message | None | Both people, shared | The conversation, through the new message |
| create_my_profile | None | None: the per-login lock instead (see create_my_profile) | |
| Profile, settings, documents, availability | None | The caller | |
| admin_set_approval | Taking approval away: the shifts of the talent's waiting answers, or the venue's open shifts | The member | |
| The sweep | One shift, booking or booked day per item | None | See Scheduled jobs |

A shared lock (FOR SHARE) lets other readers through but makes a change to that row wait. Every other lock is exclusive (FOR UPDATE).

What the order buys:

- **The shift lock** queues every change on one shift: saying yes, booking, declining, withdrawing, cancelling, closing and the sweep. Places left, Filled and Declined are worked out from settled data. If Withdraw lands first, Book then sees the withdrawn answer and refuses "{first} can’t be booked any more."
- **The talent's member lock** queues every booking of that person, on any shift. When two venues press Book on one person for clashing hours, the second waits, sees the first booking, and refuses "{first} is booked elsewhere at that time."
- **The caller's member lock** makes the admin wait for a call already running before taking approval away. Any call that starts later sees the change and refuses.
- **Locking the other shifts first** means no other call can be deciding an answer there while a booking trims it. Two venues booking two people on two overlapping shifts lock the same pair in the same order, so one simply waits.

Two database rules back this up, so a missed check can never do harm:

- **No double booking.** The exclusion constraint on booking_days (see Tables → booking_days) refuses overlapping days for one talent.
- **No overbooking.** The capacity trigger refuses a booked day beyond the shift's capacity.

If either fires, the whole call is undone. The message depends on who called:

| Caller | Double booking refused | Overbooking refused |
|---|---|---|
| book_talent, by the venue | "{first} is booked elsewhere at that time." | "Book only days they said yes to that are still open." |
| say_yes as an Accept, by the talent | "One of those days isn’t available any more. Check the days and try again." | The same |

### Shared steps

The functions share internal steps kept in a private schema (an area of the database the app can't call). Each takes t, the call's clock.

#### Which days count

| Step | What it gives |
|---|---|
| open_days(shift, t) | Days with fewer than capacity people booked that start after t. |
| free_days(talent, shift, t) | Open days that don't overlap the talent's booked days (not cancelled) on other shifts. |
| offered_days(answer) | The answer's answer_days, or every day of the shift when it has none (an invited answer). |
| waiting_days(answer, t) | Offered days that are also free_days: what the answer could still lead to. A waiting answer with none left ends (see settle_answer). |
| bookable_days(answer, t) | waiting_days minus days already in the person's active booking on this shift. Book offers these, and counts and summaries use them, so a venue is never offered a day the person can't take. |
| shift_state_now(shift, t) | The shift's status as of t. An open shift with no open day left and a day short of people counts as expired. Read paths use it too. |
| open_answer(venue, talent, days) | The talent's live answer on another shift of this venue that overlaps these days. Live means invited or can-cover on an open shift, or booked. Booked answers compare their active booked days; others their offered days. |
| book_on_accept(shift) | True for a booking request with capacity 1 where exactly one answer has source invite, whatever its status. |
| declined_by_all(shift) | True for an open booking request with no active booking, where every invite answer, at least one, is declined, withdrawn, or lapsed as booked-elsewhere or unavailable. Nobody is left who could answer it. |
| alert_recipients(shift, t) | Who a job post alerts (see below). |

alert_recipients is the one definition of who hears about a job post; Notifications points here. A talent is alerted when all of these hold:

- they are approved, not deleted, and haven't asked for their account to be deleted;
- they hold at least one of the shift's positions;
- their talents.shift_alerts is all, or soon with the first date no later than London tomorrow;
- free_days(talent, shift, t) isn't empty, so they aren't already booked across every day of the post.

#### Helpers

| Step | What it does |
|---|---|
| london_instant(date, time) | Turns a London date and clock time into an exact instant, refusing clock-change times (below). |
| make_days(dates, start, end) | Drops repeated dates, sorts them, checks 1 to 14 dates and different times, and works out each day's start and end (below). |
| add_card(shift, talent, sender, body) | Finds or starts the venue–talent conversation and adds a card about the shift. |
| add_event(shift, talent, body) | The same, for a grey status line: kind event, no sender. |
| notify(member, kind, about) | Writes a notifications row, and nothing else. about holds the actor, shift, booking, the days involved, any reason, hours or pay, and for a reminder its booked day. The row stores actor_id, shift_id and booking_id. The title and second line come from that kind's row in Notifications → Every event. Deleted members are skipped. |

Finding or starting a conversation means "insert (venue, talent), doing nothing if it exists, then read it". Two calls at once therefore never trip the unique key. Read markers and availability are saved the same way: "insert, or update the row that is there".

Adding any message, whether by add_card, add_event or send_message, first runs "update the conversation: last_seq + 1, last_message_at t, returning last_seq". The message is saved with that seq, and no trigger moves last_message_at.

Postgres turns any local time into an instant without complaint, even one the clocks skip or repeat. So the check converts the result back:

```
london_instant(date, time):
  x = date and time, read as London time
  if x, shown in London time, isn't that date and time:
     refuse "That time doesn’t exist when the clocks go forward. Choose another."
  if x minus 1 hour, or x plus 1 hour, shown in London time, is also that date and time:
     refuse "That time happens twice when the clocks go back. Choose another."
  return x

make_days(dates, start, end):
  dates = the dates without repeats, sorted
  require 1 to 14 dates                  else refuse "Choose between 1 and 14 dates."
  require a start and an end that differ else refuse "Choose different start and end times."
  for each date:
     starts_at = london_instant(date, start)
     ends_at   = london_instant(date + 1 if end is earlier than start, else date, end)
```

For example, 01:30 on 25 October 2026 happens twice, and 01:30 on 28 March 2027 doesn't exist.

#### Text formats

Cards and grey lines are built inside the database, with the formats the app shows. Notices use the same formats (see Notifications).

| Name | Example | Rule |
|---|---|---|
| name | Poppy Bertram, Spruce | Talent: full_name. Venue: display_name. |
| first name | Poppy, Spruce | Talent: the first word of full_name. Venue: the whole display_name. Used in refusals. |
| shift label | CDP or Sous Chef | The shift's positions joined with " or ". |
| dates label | Thu 8 Oct; Mon 5–Wed 7 Oct; Sat 3–Sun 4, Tue 6 Oct | Back-to-back dates become ranges. The month appears once when every date shares it; otherwise each date carries its own. |
| service label | Thu 8 Oct · 17:00–23:00 | One day and its hours. Overnight reads "Thu 8 Oct · 22:00 → Fri 9 Oct 02:00". |
| start–end | 17:00–23:00 | The shift's London start and end times. |
| pay | £18, £18.50 | Pence shown as pounds. Pence appear only when not zero. |
| hours worked | 6, 7.5 | worked_minutes divided by 60, up to two decimals, no trailing zeros. |
| terms | Mon 5–Wed 7 Oct · 17:00–23:00 · £18/h. | Dates label, start–end and pay per hour, used in booking lines. |

#### settle_shift and settle_answer

settle_shift applies everything time has decided about one shift. Every call that locks a shift runs it first, and the sweep runs it on shifts nobody has touched.

```
settle_shift(shift, t):                           -- the shift is locked
  if shift.status isn't open: return
  if shift_state_now(shift, t) is expired:
     update shift: status expired
     close_waiting(shift, lapsed, shift-started, kind shift-started,
                   line "This shift has started")
     notify(venue, shift-unfilled, shift, every day)
     return
  for each invited or can-cover answer on the shift:
     settle_answer(answer, t, because time)
```

settle_answer ends a waiting answer that has nothing left to act on, with the reason that ended it. So no answer sits under Booking requests or Said yes without a day it could still be booked for.

```
settle_answer(answer, t, because):
  if answer isn't invited or can-cover: return
  if waiting_days(answer, t) isn't empty: return
  if because is time:                              -- its last remaining day has started
     update answer: lapsed, end_reason shift-started
     add_event "This shift has started"
     notify(talent, shift-started, shift)
  if because is filled:                            -- a booking on this shift took its last day
     update answer: not-selected, end_reason filled
     add_event "Filled by someone else."
     notify(talent, filled-by-other, shift)
  if because is a booking elsewhere (from trim_clashes, with where and the clashing days):
     update answer: lapsed, end_reason booked-elsewhere
     add_event "{talent name} is now booked {where} at this time."
     if that booking is at another venue:
        notify(venue, booked-elsewhere, shift, the clashing days)
     close_if_declined_by_all(shift, t)
```

Each reason is applied the moment it happens. So the only answers the sweep ever ends are those whose days have started.

#### send_request

Sends a booking request on a shift to one person; post_shift and send_to_more both use it.

```
send_request(shift, talent, t):                   -- the talent's member row is locked
  require talent is an approved, not deleted talent member
      else refuse "Choose talent members to send this to."
  clash = open_answer(shift's venue, talent, every day of shift), ignoring this shift
  if clash is booked:    refuse "{first} is already booked then."
  if clash is invited:   refuse "You’ve already asked {first} for this time."
  if clash is can-cover: refuse "{first} already said yes to your job post for this time."
  if free_days(talent, shift, t) is empty: refuse "{first} is booked elsewhere then."
  answer = the answer for (shift, talent), if any
  if answer is invited, can-cover or booked: return      -- already waiting or booked; send nothing
  if answer exists:
     update answer: status invited, source invite, end_reason empty
     delete its answer_days                              -- the request asks for every day again
  else:
     insert answer: source invite, status invited
  add_card(shift, talent, sender venue, "Booking request")
  notify(talent, booking-request, shift, every day)
```

#### book_days

Books days for the person behind an answer, then settles everyone else that booking affects.

```
book_days(shift, answer, days, accepted, t):      -- every shift and member involved is locked
  booking = the talent's active booking on this shift, if any (locked)
  update answer: status booked, end_reason empty
  if there is no booking: insert booking: status active, booked_at t
  for each day: insert booking_day: status booked, copying the day's start and end
      -- the exclusion constraint and the capacity trigger check each row
  terms = "{dates label of days} · {start}–{end} · £{rate}/h."
  if accepted:
     add_event "{talent name} accepted. Booked: {terms}"
     notify(venue, accepted, booking, days)
  else if the booking already existed:
     add_event "Added to the booking: {terms}"
     notify(talent, days-added, booking, days)
  else:
     add_event "Booked: {terms}"
     notify(talent, booked, booking, days)
  if open_days(shift, t) is empty:
     update shift: status filled
     close_waiting(shift, not-selected, filled, kind shift-filled,
                   line "This shift has been filled")
  else:
     for each other invited or can-cover answer on the shift:
        settle_answer(it, t, because filled)
  trim_clashes(talent, booking, t)
  return booking
```

Whoever acted isn't notified: a talent who accepted gets nothing, and neither does a venue that booked.

#### close_waiting

Ends every invited or can-cover answer on a shift with one line and one kind of notice. Booked answers are never touched.

```
close_waiting(shift, status, end_reason, kind, line):
  for each answer on the shift with status invited or can-cover:
     update it: status, end_reason
     add_event line
     notify(its talent, kind, shift)
```

#### trim_clashes

A new booking settles the person's other answers, at any venue, whose days it overlaps.

```
trim_clashes(talent, booking, t):                 -- the shifts of these answers are locked
  booked = the booking's days that aren't cancelled
  for each answer of the talent on another shift, with status invited, can-cover or booked:
     other = that answer's shift
     if other.status isn't open: continue           -- it was settled when it was locked
     clashing = offered_days(answer) that overlap any booked day
     if clashing is empty: continue
     if the answer is booked:
        delete clashing from its answer_days       -- quietly: offered there, never booked
        continue
     where = "on another {venue name} shift" if other has the booking's venue, else "elsewhere"
     left = waiting_days(answer, t)                -- the new booking's days are no longer free
     if left is empty:
        settle_answer(answer, t, because a booking elsewhere, where, clashing)
     else if the answer is can-cover:
        delete clashing from its answer_days
        add_event(other, "{talent name} is now booked {where} on {dates label of clashing}.
                          Still free {dates label of left}.")
     -- an invited answer with days left is unchanged; they can still answer for those days
```

The talent isn't told about their own trimmed or lapsed answers.

#### end_unavailable, close_for_dyuknow and close_if_declined_by_all

These end things when a member's approval is taken away, and close a request nobody can answer.

```
end_unavailable(answer, t):           -- the talent's approval was taken away
  update answer: lapsed, end_reason unavailable
  add_event "{talent name} is no longer available."
  notify(venue, unavailable, shift, offered_days(answer))
  close_if_declined_by_all(shift, t)

close_for_dyuknow(shift, t):          -- the venue's approval was taken away
  update shift: status closed, closed_by dyuknow, close_reason "No longer on Dyuknow", closed_at t
  close_waiting(shift, not-selected, venue-closed, kind shift-closed,
                line "Cancelled by {venue}: No longer on Dyuknow")

close_if_declined_by_all(shift, t):
  if declined_by_all(shift):
     update shift: status closed, closed_by all-declined, closed_at t
     -- no line and no notice: the venue has already heard from or about each person
```

### The functions at a glance

The app calls thirty-one functions, and nothing else calls any. "Granted to" is the only role allowed to run each one; every other right is taken away (see Security rules and file storage → Who can run each function). An admin is a login listed in the admins table: private.is_admin() checks the caller's login is there, and nothing more.

| Function | Called by | Granted to | What it does |
|---|---|---|---|
| post_shift | Venue | authenticated | Sends a booking request or posts a job. |
| send_to_more | Venue | authenticated | Sends an open shift to more people. |
| say_yes | Talent | authenticated | I can do this, or Accept. Also offers more days on a booking. |
| decline_request | Talent | authenticated | Turns down a booking request. |
| withdraw_yes | Talent | authenticated | Takes back a yes. |
| close_shift | Venue | authenticated | Cancels a request or removes a job post. |
| book_talent | Venue | authenticated | Books a person for days they said yes to. |
| cancel_days | Either side of a booking | authenticated | Cancels booked days that haven't started. |
| confirm_day | The booking's venue | authenticated | Confirms hours, or records a no-show. |
| get_booking_contact | Either side of a booking | authenticated | Reads the address or phone, only in the contact window (see Who can see what → Functions that only read). |
| open_conversation | Either side | authenticated | Finds or starts a conversation. |
| send_message | Either side | authenticated | Sends a chat message. |
| mark_conversation_read | Either side | authenticated | Moves their read marker. |
| mark_notifications_read | Any member | authenticated | Clears notice red dots. |
| get_badge_counts | Any signed-in person | authenticated | Returns every dot and count at once (see Who can see what → Functions that only read). |
| get_busy_times | Approved venue | authenticated | When talent are already booked, never where (see Who can see what → Functions that only read). |
| set_availability | Talent | authenticated | Marks dates free, free from–to, or not free. |
| create_my_profile | Signed in, no member yet | authenticated | Turns finished onboarding into a member and their talents or venues row. |
| update_my_profile | Any member | authenticated | Saves the profile fields the app edits. |
| set_my_photo | Any member | authenticated | Points the profile at a new photo. |
| update_my_settings | Talent | authenticated | Job-post alerts. |
| request_account_deletion, keep_my_account | Any member | authenticated | Asks for deletion, or withdraws the request. |
| save_document | Any member | authenticated | Records an uploaded document for checking. |
| am_i_admin | Any signed-in person | authenticated | Says whether the caller is an admin (see Who can see what → Functions that only read). |
| admin_set_approval | Admin | authenticated, then checked by private.is_admin() | Approves a member, or takes approval away. |
| admin_review_document | Admin | authenticated, then checked by private.is_admin() | Verifies or rejects a document. |
| admin_list_members, admin_get_member, admin_list_documents, admin_list_stale_logins | Admin | authenticated, then checked by private.is_admin() | The /admin lists (see Who can see what → Functions that only read). |

No function is granted to service_role, and this build has no edge functions.

### Shifts and answers

#### post_shift

Sends a booking request to chosen people, or posts a job to everyone in the positions; one form does both.

**Who can call:** an approved venue.

**Input**

| Input | Type | What it holds |
|---|---|---|
| team | text | Kitchen, Pastry, Bar, Sommelier or Floor. |
| positions | text[] | One or more positions in that team. |
| dates | date[] | 1 to 14 London dates. Repeats are dropped and the list is sorted. |
| start_time, end_time | time | London hours, the same every day. An end earlier than the start runs past midnight. |
| capacity | integer | People needed each day, 1 to 5. |
| rate_pence | integer | Pay per hour in pence. |
| note | text | Optional, up to 2,000 characters. |
| to | uuid[] | Talent member ids for a booking request. Empty means a job post. Repeats are dropped. |
| client_ref | uuid | A random id the app makes for this send. |

**Output:** the shift id; its mode, request or post; in_position_count, how many approved talent hold any of the positions; and alerted_count, how many a job post alerted. When a job post alerts nobody, the composer says "Nobody will be alerted about this job post. Try sending booking requests instead." (new)

**Refuses when** (after the caller checks, in this order):

1. The caller is not a venue: "Only venues can send shifts."
2. No position, or one outside the team: "Choose the position you need."
3. rate_pence is not above 0: "Add the pay per hour."
4. capacity is not a whole number from 1 to 5: "Choose between 1 and 5 people."
5. The note is over 2,000 characters: "Keep the note under 2,000 characters." (new)
6. Fewer than 1 or more than 14 dates: "Choose between 1 and 14 dates."
7. Start equals end, or either is missing: "Choose different start and end times."
8. A time falls in a clock change: the two clock-change messages under Helpers.
9. The first day has started: "That start time has passed."
10. A date is after London today plus 55 days: "Choose dates in the next 8 weeks." (new)
11. Any recipient fails send_request. Its message is shown, and nobody is sent anything.

**Steps**

```
me = the calling venue
t = lock_set(no shifts, members: me and every recipient)
check me: a venue, approved, not deleted
insert the receipt (me, client_ref, post_shift); if it exists: return its stored result          -- a repeated tap
check positions, rate, capacity and note
days = make_days(dates, start_time, end_time)
require the first day starts after t
require the last date is no later than the London date of t, plus 55 days
recipients = to, without repeats
mode = request if recipients isn't empty, else post
insert the shift (status open, created_at t) and one shift_days row per day
if mode is request:
   for each recipient, in the order given:
      send_request(shift, recipient, t)           -- one refusal undoes everything
else:
   for each talent in alert_recipients(shift, t):
      notify(talent, job-posted, shift, every day)
store the result in the receipt, and return the shift id, mode, in_position_count and alerted_count
```

A request can go to someone outside the positions, as in the demo. A job post writes no card; the first card in that conversation is the talent's yes.

#### send_to_more

Sends an open shift to more people ("Send to more people"); the shift keeps its mode.

**Who can call:** the approved venue that owns the shift.

**Input:** shift_id; talent_ids, the people to add.

**Output:** how many people were newly sent it. Anyone already invited, waiting or booked is skipped quietly.

**Refuses when:**

1. The shift doesn't exist or isn't theirs: "This shift no longer exists."
2. It isn't open, or no day is open: "This shift is no longer open."
3. Nobody was chosen: "Choose at least one person."
4. Any person fails send_request. Its message is shown, and nobody is sent it.

**Steps**

```
me = the calling venue
t = lock_set(this shift, members: me and every chosen person)
check me: a venue, approved, not deleted
require the shift exists and is mine              else refuse 1
require it is open and open_days(shift, t) isn't empty
require talent_ids isn't empty
for each talent, in the order given: send_request(shift, talent, t)
return the number newly sent
```

Sending a job post to someone never turns their answer into an Accept: book_on_accept needs a booking request.

#### say_yes

Records "I can do this" for some or all days. On a booking request sent only to them for one place, it is the Accept and books them. On a shift where they are already booked, it offers the venue more days, such as a day that was cancelled.

**Who can call:** an approved talent.

**Input:** shift_id; dates, the days they can do. Optional: empty means every day still free for them.

**Output:** booked, with the booking id, for an Accept; otherwise said-yes. The app's message follows this result. So if the venue sent the request to more people while the screen was open, the talent still sees what really happened.

**Refuses when** (in this order):

1. They can't see it: they have no answer on it, and it isn't an open job post from an approved venue. "This shift no longer exists."
2. It has expired: "This shift has already started."
3. It is filled or closed, or no day is open: "This shift is no longer available."
4. Their answer is can-cover, or booked with no free day left to add: "You’ve already said yes to this."
5. They aren't invited or booked here, and it is a booking request or none of their positions fits: "This job is for other positions."
6. No dates given and no day is free for them: "You’re booked elsewhere at that time."
7. A date isn't a day of this shift: "Choose dates from this shift."
8. A date isn't free for them, or is already in their booking here: "One of those days isn’t available any more. Check the days and try again."

**Steps**

```
me = the calling talent
t = lock_set(this shift, plus the shifts of my invited, can-cover or booked answers
             that overlap it; members: me)
check me: talent, approved, not deleted
answer = my answer on this shift, if any
run the checks above, using free_days(me, shift, t)
if answer is booked:                                -- offering more days on a booking
   days = the dates given, or free_days(me, shift, t) minus my booked days here
   add days to my answer_days
   add_card(shift, me, sender me, "Can also do {dates label of days}")
   notify(venue, said-yes, shift, days)
   return said-yes
days = the dates given, without repeats, sorted; or free_days(me, shift, t)
accept = answer is invited and book_on_accept(shift)
if answer exists: update it: status can-cover, end_reason empty      -- source unchanged
else:             insert answer: source response, status can-cover
replace its answer_days with days                                     -- stored even for every day
if accept:
   booking = book_days(shift, answer, days, accepted, t)
   return booked, with the booking id
add_card(shift, me, sender me, "Can do it", or "Can do {dates label of days}" if not every day)
notify(venue, said-yes, shift, days)
return said-yes
```

Saying yes reserves nothing, so someone can say yes to two clashing shifts, even at one venue; whichever venue books first wins. An Accept for some days books only those days, and the shift stays open for the rest.

#### decline_request

Turns down a booking request.

**Who can call:** a talent the request was sent to. Approval isn't needed.

**Input:** shift_id.

**Output:** the shift's status afterwards: closed when nobody is left who could answer.

**Refuses when:**

1. They have no answer on this shift: "This shift no longer exists."
2. The shift has expired, or their answer ended because it started: "This shift has already started."
3. Their answer isn't invited: "This has already been answered."

**Steps**

```
me = the calling talent
t = lock_set(this shift, members: me)
check me: talent, not deleted
answer = my answer on this shift                    else refuse 1
if the shift is expired, or answer is lapsed with shift-started: refuse 2
require answer is invited                           else refuse 3
update answer: status declined
add_event "{my name} declined."
notify(venue, declined, shift, every day)
close_if_declined_by_all(shift, t)
return the shift's status
```

#### withdraw_yes

Takes back a yes before the venue books.

**Who can call:** a talent who said yes. Approval isn't needed.

**Input:** shift_id. **Output:** the shift's status afterwards.

**Refuses when:** as decline_request, except refusal 3 applies when the answer isn't can-cover.

**Steps:** as decline_request, except the can-cover answer becomes withdrawn. The line reads "{my name} withdrew.", and the venue gets withdrew with the days they had offered. close_if_declined_by_all runs the same way.

#### close_shift

Cancels a booking request or removes a job post; people already booked stay booked.

**Who can call:** the venue that owns the shift. Approval isn't needed.

**Input:** shift_id; reason, the one picked: Cover is no longer needed, Cover found elsewhere, or Plans changed.

**Output:** nothing.

**Refuses when:**

1. The shift doesn't exist or isn't theirs: "This shift no longer exists."
2. It isn't open, including when it has started unfilled: "This has already ended."
3. The reason is blank: "Choose a reason." The demo didn't check this.

**Steps**

```
me = the calling venue
t = lock_set(this shift, members: me)
check me: a venue, not deleted
require the shift is mine                          else refuse 1
require it is open                                 else refuse 2
require a reason                                   else refuse 3
update shift: status closed, closed_by venue, closed_at t, close_reason reason
close_waiting(shift, not-selected, venue-closed, kind shift-closed,
              line "Cancelled by {venue}: {reason}")
```

Booked people get no line and no notice. A closed shift never reopens, even if a booking on it is later cancelled.

### Bookings

#### book_talent

Books one person for days they said yes to; booking more of their days adds to the same booking.

**Who can call:** the approved venue that owns the shift.

**Input:** shift_id; talent_id; dates. Dates are optional: empty means every bookable day.

**Output:** the booking id and the shift's status afterwards.

The venue books several people with one call each, and different people on different days. Each call stands alone, so one person's refusal never undoes another's booking.

**Refuses when** (in this order):

1. The shift doesn't exist or isn't theirs: "This shift no longer exists."
2. The person has no answer on this shift: "This shift no longer exists." No name is given.
3. It has expired: "This shift has already started."
4. It is filled or closed, or no day is open: "This shift is no longer available."
5. The person is no longer approved, is deleted, or their answer isn't can-cover or booked: "{first} can’t be booked any more."
6. No dates given, and no day they offered is still open and not already in their booking: "The days they said yes to are already filled."
7. A date isn't one they offered that is still open and not already in their booking: "Book only days they said yes to that are still open."
8. A date, or with no dates given every remaining day, clashes with their booking elsewhere: "{first} is booked elsewhere at that time."

The name in refusals 5 and 8 is safe to show: anyone with an answer on the venue's shift already shares a conversation with it.

**Steps**

```
me = the calling venue
t = lock_set(this shift, plus the shifts of the talent's invited, can-cover or booked answers
             that overlap it; members: me and the talent)
check me: a venue, approved, not deleted
answer = the talent's answer on this shift
run the checks above
candidates = offered_days(answer) that are open and not already in their booking here
days = the dates given, without repeats, sorted;
       or, with none given, the candidates that are in free_days(talent, shift, t)
booking = book_days(shift, answer, days, not accepted, t)
return the booking id and the shift's status
```

With no dates given, days is exactly bookable_days(answer, t).

#### cancel_days

Cancels some or all booked days that haven't started; the other side is told, and a filled shift reopens for those days.

**Who can call:** the booking's venue or talent. Approval isn't needed.

**Input:** booking_id; dates, optional (empty means every day not yet started); reason. The reason is the one picked, plus any words added, joined as "{reason} — {words}". The reasons are Illness or emergency, Plans changed, Unable to travel, Cover no longer needed (venue only), and Other.

**Output:** the booking's status and the shift's status afterwards.

**Refuses when:**

1. The booking doesn't exist, the caller isn't on it, or it is fully cancelled: "This booking can no longer be cancelled."
2. No day is left to cancel, or a date isn't an active day that hasn't started: "Only days that haven’t started can be cancelled."
3. The reason is blank: "Choose a reason."
4. The reason is over 500 characters: "Keep the reason under 500 characters." (new)

**Steps**

```
me = the caller
t = lock_set(the booking's shift, members: its venue and its talent,
             then: the booking and its days)
check me: on this booking, not deleted                 else refuse 1
require the booking is active                          else refuse 1
future = its booked days that start after t
days = the dates given, without repeats; or every day in future
run the checks above
for each day: update booking_day: status cancelled, recorded_at t,
              recorded_by me, cancel_reason reason
delete those days from the answer's answer_days       -- not offered back unless they say yes again
if reminded_at is set and the booking's first day still booked before this call is one of those days:
   update booking: reminded_at empty           -- the next day still booked gets its own reminder
if no day of the booking is left uncancelled:
   update booking: status cancelled, cancelled_at t
   update answer: status cancelled
add_event "{my name} cancelled {dates label of days}: {reason}."
   -- no second full stop when the reason already ends with one
notify(the other side, days-cancelled, booking, days, reason)
if the shift is filled and open_days(shift, t) isn't empty:
   update shift: status open
return the booking's and the shift's status
```

The shift was settled when it was locked, so a shift whose time ran out is already expired, and expired or closed shifts never reopen. Both calendars free up at once, because cancelled days leave the exclusion constraint. Availability marks aren't touched.

The talent can offer a cancelled day again with I can do this (see say_yes), and the venue can then book it.

#### confirm_day

Records one finished day as worked, with its real hours, or as a no-show.

**Who can call:** the booking's venue. Approval isn't needed.

**Input:** booking_id; day_date; outcome, worked or no-show; start_time and end_time for worked, optional, defaulting to the planned hours.

**Output:** worked_minutes and pay_pence, for a worked day.

**Refuses when:**

1. The booking doesn't exist, or the caller isn't its venue: "Only the venue confirms the hours worked."
2. The day isn't in the booking, is already worked, no-show or cancelled, or ended 48 hours ago or more: "This day has already been recorded."
3. The day hasn't ended: "You can confirm a day once it has finished."
4. Worked, with start equal to end: "Choose different start and end times."
5. Worked, with a time in a clock change: the two clock-change messages.

**Steps**

```
me = the caller
lock the booked day; t = clock_timestamp()
run the checks above
if outcome is no-show:
   update day: status no-show, recorded_at t, recorded_by me
   notify(talent, no-show, booking, the day)
else:
   start = start_time or the planned start; end = end_time or the planned end
   start instant = london_instant(day_date, start)
   end instant   = london_instant(day_date + 1 if end is earlier than start, else day_date, end)
   minutes = end instant minus start instant, in minutes
   pay = minutes × rate_pence ÷ 60, rounded to the nearest penny
   update day: status worked, recorded_at t, recorded_by me, worked_start_time start,
               worked_end_time end, worked_minutes minutes, pay_pence pay
   notify(talent, hours-confirmed, booking, the day, hours worked and pay)
return minutes and pay
```

For example, 17:00 to 00:30 at £18 an hour is 450 minutes, 7.5 hours and £135. Each day is recorded once and never changed, and no conversation line is written.

Only the booked day is locked. A venue whose approval is taken away at the same moment can still confirm a finished day, which is harmless: confirming needs no approval.

#### get_booking_contact

Reads the other side's address or phone, only inside the contact window. It only reads, so its specification is in Who can see what → Functions that only read.

### Conversations and notifications

#### open_conversation

Finds the conversation with someone on the other side, or starts it.

**Who can call:** an approved member.

**Input:** other_member_id. **Output:** the conversation id.

**Refuses when:** the other person isn't an approved, not deleted member of the other side: "Venues and talent can message each other."

**Steps**

```
me = the caller (approved, not deleted)
require the other member is approved, not deleted, and on the other side
insert the conversation (venue, talent), doing nothing if it already exists
return its id
```

Opening a conversation writes no message.

#### send_message

Sends a chat message to the other person in a conversation.

**Who can call:** an approved member of the conversation.

**Input:** conversation_id; body; client_ref. **Output:** the message id.

**Refuses when:**

1. The conversation doesn't exist or isn't theirs: "This conversation is private."
2. The body is blank after trimming: "Write a message first."
3. The body is over 2,000 characters: "Keep messages under 2,000 characters." (new)
4. The other person is deleted or no longer approved: "{name} can’t get messages right now." (new)

**Steps**

```
me = the caller
t = lock_set(no shifts, members: both people in the conversation, shared)
check me: approved, not deleted
run check 1
insert the receipt (me, client_ref, send_message); if it exists: return its stored result     -- a repeated tap
run checks 2 to 4
update the conversation: last_seq + 1, last_message_at t, returning seq
insert message: kind text, sender me, body trimmed, seq, created_at t
   -- the conversation lock is the last lock this call takes
move my read marker to this seq
store the result in the receipt, and return the message id
```

No notifications row is written. The other person's Messages dot comes from their read marker.

#### mark_conversation_read

Moves the caller's read marker forward, which clears the Messages dot for that conversation.

**Who can call:** either person in the conversation. Approval isn't needed.

**Input:** conversation_id; up_to_seq, the seq of the newest message on screen. **Output:** nothing.

**Refuses when:** the conversation isn't theirs: "This conversation is private."

**Steps**

```
require I am one of its two people
marker = the smaller of up_to_seq and the conversation's last_seq
insert my conversation_reads row, or update it, keeping the larger of the old and new marker;
   read_at t
```

The app calls it when a conversation opens, and when a message arrives while it is open.

#### mark_notifications_read

Marks notices read, which clears their red dots.

**Who can call:** any member.

**Input:** one of: ids, a list of notice ids; target, such as `shift/<id>`; or nothing, for Mark all read. **Output:** how many were marked.

**Steps**

```
update my notifications where read_at is empty
   and (id is in ids, or target is target, or nothing was given)
set read_at = t
```

The app passes the target when a shift or booking page opens, so its notices clear. Reading a conversation never clears notices, and the reverse.

#### get_badge_counts

Returns every red dot and count in one read. Its specification is in Who can see what → Functions that only read, and what each count includes is in Notifications → Red dots and counts.

### Availability, profile and account

#### set_availability

Marks one or more dates as free all day, free between two times, or not free.

**Who can call:** a talent. Approval isn't needed.

**Input:** dates, London dates; kind, free or not-free; start_time and end_time, for free only. 00:00 to 00:00 means all day.

**Output:** how many dates were saved.

**Refuses when:**

1. The caller isn't talent: "Only talent set availability." (new)
2. No date chosen: "Choose at least one date."
3. A date is before today or after today plus 55 days: "Choose dates in the next 8 weeks." (new)
4. Free, with equal times other than 00:00 to 00:00: "Choose different start and end times."
5. Free, with a time in a clock change: the two clock-change messages.

**Steps**

```
me = the calling talent
t = lock_set(no shifts, members: me)
for each date, without repeats:
   if kind is free:
      starts_at = london_instant(date, start_time)
      ends_at   = london_instant(date + 1 if end_time <= start_time, else date, end_time)
      -- 00:00 to 00:00 runs from midnight to the next midnight
   else:
      store 00:00 to 00:00, with no instants
   insert my availability row for that date, or replace it; updated_at t
return the number of dates
```

Availability only guides venues; it never blocks saying yes or booking. A date can be changed but not set back to "Not set", as in the demo.

#### create_my_profile

Turns a finished onboarding into a member and their talents or venues row, linked to the login.

**Who can call:** a signed-in person.

**Input:**

| Input | What it holds |
|---|---|
| side | talent or venue. |
| answers | The onboarding answers, keyed by column name in talents or venues. Only the keys in the table below are accepted. |
| files | A list of: kind, storage_path, original_filename. kind is a document type code that suits the side (see Tables → document_types). Each file is already uploaded to `member-documents/<login id>/`. The photo isn't sent here: the app uploads it straight after and calls set_my_photo, because only members can add to member-photos. |
| availability | A list of: day_date, kind (free or not-free), start_time, end_time, as set_availability takes them. They are saved to the availability table. |

| Side | Answer keys accepted (columns of talents or venues) |
|---|---|
| Talent | full_name, mobile_number, home_postcode, date_of_birth, category, positions, skills, custom_skills, known_for, custom_known_for, years_band, employment_history, bio, preferred_shifts, max_travel, preferred_areas, preferred_hourly_rate, minimum_same_day_rate_gbp, shift_alerts, agreed_turn_up_on_time, agreed_treat_venues_with_respect, agreed_give_notice_if_cancelling, agreed_represent_professionally |
| Venue | business_name, trading_name, registered_company, website, instagram_handle, contact_name, contact_position, contact_phone, contact_email, street_address, postcode, venue_types, cuisines, covers_band, average_team_size, average_team_vacancies_per_week, roles_needed, teams_needed, typical_shifts, typical_notice, dress_code, uniform_provided, staff_meal, typical_hourly_rate_chef_gbp, typical_hourly_rate_foh_gbp, bio, known_for, agreed_pay_fairly, agreed_treat_team_like_our_own, agreed_provide_clear_brief, agreed_rate_honestly |
| Never accepted | member_id, photo_path (set only by set_my_photo), onboarding_completed_at, created_at, updated_at, home_area, area, display_name, and anything on members, such as approved |

talents has no email column: the login email is the identity.

The allowlist matters because the function runs with owner rights. A caller-chosen column such as photo_path could otherwise point at someone else's file.

**Output:** member_id, side, and approved, which is false for a new member.

**Refuses when:**

1. Not signed in: "Sign in to continue."
2. side is neither talent nor venue: "Choose venue or talent." (new)
3. An answer key isn't on the list for that side: "Check your answers and try again." (new)
4. Talent without a name, postcode, position or mobile number: "Add a name.", "Add a postcode.", "Choose at least one position." or "Add a mobile number." (new)
5. Venue without a name, street address, postcode, on-site contact or contact phone: "Add a name.", "Add the street address." (new), "Add a postcode.", "Add the on-site contact’s name." (new) or "Add the on-site contact’s phone." (new)
6. Not all four agreements ticked: "Agree to all four to continue." (new)
7. A list answer, such as a position or skill, isn't on its list: "Choose from the list." (new)
8. A bio over 250 characters: "Keep your bio under 250 characters." (new)
9. A file isn't in the login's own folder, or never arrived: "That upload didn’t finish. Add the file again." (new)
10. A document kind doesn't suit the side or positions: "Choose one of the listed documents."
11. A document that isn't a JPEG, PNG or PDF of 10 MB or less: "Upload a photo or PDF up to 10 MB." (new)
12. An availability date after today plus 55 days: "Choose dates in the next 8 weeks." A clock-change time: the two clock-change messages.
13. Any other check fails: "Check your answers and try again."

Phones are required by default; whether they should be is an open decision.

**Steps**

```
require a login                                          else refuse 1
take the per-login lock for the rest of the call         -- a second tab or tap waits here
if the login already has a members row: return that member unchanged
t = clock_timestamp()
require side; require every answer key is on the list for that side
clean the answers: trim text, blanks become empty, numbers become numbers
check required answers, lists and lengths
for each file:
   require it exists in member-documents under "<login id>/"
   read its type and size from storage, and check them
   a document kind must suit the side and, for talent, their positions
insert members: side, user_id = the login, approved false, created_at t
insert talents or venues: member_id, the accepted answers, onboarding_completed_at t
       -- no photo yet: the app adds it next with set_my_photo
for each document file: insert a documents row, status review
for each availability entry:
   if its date has passed: skip it                       -- it went past while the form was open
   save it to availability as set_availability does
-- no notice: new members wait on the /admin list
return the member id, side and approved false
```

The per-login lock is a transaction advisory lock (a named lock, here named after the login id, held until the call ends). It means a second tab or a double tap can never create two members for one login.

Uploading documents before the member exists is safe: files sit in the login's own folder, so a retry reuses them instead of making copies.

#### update_my_profile

Saves the profile fields the app lets a member edit.

**Who can call:** any member. Approval isn't needed.

**Input:** any of the fields below. Fields left out stay as they are; an empty value clears an optional one. Any other field is refused with "Check your answers and try again."

| Side | Fields |
|---|---|
| Talent | full_name, bio, home_postcode, positions, skills, custom_skills, mobile_number, minimum pay in pence |
| Venue | name, bio, street_address, postcode, contact_name, contact_position, contact_phone, venue_types, cuisines, instagram_handle |

**Output:** nothing.

**Refuses when:** a changed field fails the checks in create_my_profile, refusals 3 to 8 and 13. A required field can't be emptied.

**Steps**

```
me = the caller
t = lock_set(no shifts, members: me)
check the changed fields
talent: minimum pay is saved to the column open decision 2 picks; empty clears it
venue:  name is saved to trading_name; business_name keeps the onboarding answer
update my talents or venues row   -- home_area, area and display_name work themselves out
```

Shifts, answers and bookings already made don't change. Names already written in notices and conversation lines stay as they were. Other onboarding answers, the login email and the side can't be changed in the app.

#### set_my_photo

Points the profile at a newly uploaded photo.

**Who can call:** any member.

**Input:** storage_path of the new photo, in `member-photos/<login id>/`. **Output:** the old photo path, if there was one.

**Refuses when:**

1. The file isn't there: "That upload didn’t finish. Add the file again."
2. It isn't a JPEG, PNG or WebP of 5 MB or less: "Upload a photo up to 5 MB." (new)

**Steps**

```
require the file exists in member-photos under my login's folder, with an allowed type and size
old = my talents or venues row's photo_path
update my talents or venues row: photo_path = storage_path
return old
```

The app then deletes the old file through Storage, since it sits in the login's folder. Stored files are removed through the Storage service, never from SQL.

#### update_my_settings

Saves job-post alerts.

**Who can call:** a talent.

**Input:** shift_alerts: all, soon or off. **Output:** nothing.

**Refuses when:** the value isn't one of these, or the caller is a venue: "Check your answers and try again."

**Steps**

```
update my talents row: shift_alerts
```

shift_alerts decides which job posts make a notice for them; booking requests always do.

#### request_account_deletion and keep_my_account

Records a request to delete the account, or withdraws it.

**Who can call:** any member. **Input:** none. **Output:** the time of the request, or nothing.

**Steps**

```
request_account_deletion: if deletion_requested_at is empty: set it to t
keep_my_account:          set deletion_requested_at to empty
```

A request stops job-post alerts (see alert_recipients). Everything else stays, including the profile and bookings. This build only records the request: actually deleting an account is a later step, done by an edge function then.

#### save_document

Records a document the member has just uploaded, ready for Dyuknow to check.

**Who can call:** any member. Approval isn't needed.

**Input:** doc_type; storage_path, in `member-documents/<login id>/`; original_filename.

**Output:** the document id, and the replaced file's path if there was one.

**Refuses when:**

1. The type isn't on their list: "Choose one of the listed documents."
2. The file isn't in their folder: "That upload didn’t finish. Add the file again."
3. The file isn't a JPEG, PNG or PDF of 10 MB or less: "Upload a photo or PDF up to 10 MB." (new)

**Steps**

```
me = the caller
t = lock_set(no shifts, members: me)
require doc_type is for my side and its applies_to fits my positions
file = the stored object at storage_path
require it exists in member-documents under my login's folder, with an allowed type and size
old = my documents row of this type, if any
if old exists:
   update it: new path, filename, type and size, status review, uploaded_at t,
              reviewed_at, reviewed_by and reject_reason emptied
else:
   insert a documents row, status review, uploaded_at t
return the document id and old's file path
```

Type and size are read from the stored file, not from the app. The app then deletes the replaced file through Storage, since it sits in the login's folder.

### Admin

#### admin_set_approval

Approves a member, or takes approval away; taking it away ends what the member had waiting.

**Who can call:** an admin: private.is_admin() is true, because the caller's login is in admins.

**Input:** member_id; approved, true or false; note, optional, which the approval trigger keeps in admin_actions. The function hands the note and the admin's login id to the trigger as transaction-local settings (set_config with is_local true), which the trigger reads. **Output:** nothing.

**Refuses when:**

1. The caller isn't in admins: "Only Dyuknow can do this." (new)
2. The member doesn't exist or is deleted: "That member can’t be found." (new)
3. Approving a member whose talents or venues row lacks what a live member needs: "This profile is missing: {list}." (new)

**Steps**

```
require private.is_admin()
if approving:
   t = lock_set(no shifts, members: the member)
   require the member isn't deleted
   require the live fields on their talents or venues row, listing any missing
      -- talent: full name, home postcode, a position, mobile number, all four agreements
      -- venue: a name, street address, postcode, contact name, contact phone, all four agreements
   if members.approved is already true: return
   update members: approved true
      -- the approval trigger sets approved_at, logs approve in admin_actions with the note,
      -- and sends the approved notice
else:
   t = lock_set(talent: the shifts of their invited and can-cover answers;
                venue: their open shifts; members: the member)
   require the member isn't deleted
   if members.approved is true:
      update members: approved false
         -- the approval trigger clears approved_at and logs unapprove with the note
   talent: for each invited or can-cover answer: end_unavailable(answer, t)
   venue:  for each open shift: close_for_dyuknow(shift, t)
```

Bookings already made stand. The paused member can still cancel or confirm their booked days, decline, withdraw and close, but can't start anything new (see Who can see what → Approval). Nothing is restored if approval is given back.

Change approval only with this function. members.approved is its one home, and the approval trigger on members (see Tables → members) runs on every change to it. So a dashboard edit still logs and notifies through the trigger, but skips the missing-fields check and leaves waiting answers and open asks in place. No trigger sits on talents or venues.

#### admin_review_document

Verifies or rejects a document.

**Who can call:** an admin.

**Input:** document_id; verdict, verified or rejected; reason, for rejected, shown to the member. **Output:** nothing.

**Refuses when:**

1. The caller isn't in admins: "Only Dyuknow can do this."
2. The document doesn't exist: "That document can’t be found." (new)
3. Rejected with no reason: "Add a reason." (new)

**Steps**

```
require private.is_admin()
lock the document; t = clock_timestamp()
if it already has this verdict and reason: return            -- nothing to do
update it: status verdict, reviewed_at t, reviewed_by me,
           reject_reason (rejected only; emptied when verified)
insert admin_actions: verify-document or reject-document, the member, the document, note reason
notify(member, document-verified or document-rejected, the document, reason)
```

A verified document whose type has public_tick shows as a tick on the card straight away.

### What each action writes

Every card, grey line and notice comes from one of these actions. The notice kinds are the notifications.kind values (see Tables → notifications); their wording is in Notifications → Every event.

| Action | In the conversation | Notice kind, to whom |
|---|---|---|
| post_shift, booking request | Card "Booking request" from the venue, to each person | booking-request, each person |
| post_shift, job post | Nothing | job-posted, each of alert_recipients |
| send_to_more | Card "Booking request" to each new person | booking-request, each new person |
| say_yes | Card "Can do it" or "Can do {dates}" from the talent | said-yes, the venue |
| say_yes, more days on a booking | Card "Can also do {dates}" (new) | said-yes, the venue |
| say_yes as an Accept | Line "{name} accepted. Booked: {terms}" | accepted, the venue |
| book_talent | Line "Booked: {terms}" or "Added to the booking: {terms}" | booked or days-added, the talent |
| A booking that fills the shift | Line "This shift has been filled", to each person waiting | shift-filled, each person waiting |
| A booking that takes someone's last day | Line "Filled by someone else." | filled-by-other, that person |
| A booking that clashes with the person's other answers | Line "… Still free …", or "… at this time." when nothing is left | booked-elsewhere, the other venue, only when the answer ends and the venue is different |
| decline_request | Line "{name} declined." | declined, the venue |
| withdraw_yes | Line "{name} withdrew." | withdrew, the venue |
| close_shift | Line "Cancelled by {venue}: {reason}", to each person waiting | shift-closed, each person waiting |
| cancel_days | Line "{name} cancelled {dates}: {reason}." | days-cancelled, the other side |
| confirm_day | Nothing | hours-confirmed or no-show, the talent |
| send_message | The message itself | None: the Messages dot instead |
| Talent's approval taken away | Line "{name} is no longer available." on each waiting answer | unavailable, each venue |
| Venue's approval taken away | Line "Cancelled by {venue}: No longer on Dyuknow", to each person waiting | shift-closed, each person waiting |
| admin_set_approval, approving | Nothing | approved, the member, sent by the approval trigger |
| admin_review_document | Nothing | document-verified or document-rejected, the member |
| settle_shift, when the shift expires | Line "This shift has started", to each person waiting | shift-started, each person waiting; shift-unfilled, the venue |
| settle_shift, when someone's remaining days have all started | Line "This shift has started" | shift-started, that person |
| The sweep's reminders | Nothing | reminder, the talent (see Scheduled jobs) |

The person who acted is never notified about their own action. Notifications → Things that send nothing lists the rest.

### Changes from the demo

These functions fix demo gaps on purpose; everything else matches the demo.

- Decline works only from invited, and Withdraw only from can-cover.
- Sending a shift to someone again clears their old days.
- Approval is checked for the venue posting, sending and booking, and for talent being sent a request. Messaging needs both people approved.
- A call settles any shift it locks before acting, so a late sweep can't change an outcome. The demo got the same effect by running its sweep before every action.
- An invited or can-cover answer with no day left it could be booked for ends at once: filled, booked elsewhere or started. The demo left some waiting for ever.
- A booking also removes clashing days from the person's other bookings' offers, and venues are only offered days the person is free.
- A booking request closes when nobody is left who could answer it, counting people booked elsewhere or no longer available. The demo counted only declines.
- Someone whose booked day was cancelled can say yes to it again, as rule 6 of the settled flow says. The demo had no way back.
- Taking approval away ends the member's waiting answers or open asks. Paused members can still decline, withdraw and close.
- Job-post alerts skip people already booked across every day of the post, and people who asked to be deleted.
- Unknown ids, and ids the caller can't see, get the same plain message. A refusal never reveals a name or a shift's state.
- Send to more on a shift with no open day says "This shift is no longer open.", not "booked elsewhere then".
- Booking a talent whose approval was taken away says "{first} can’t be booked any more.", not "Choose a talent member."
- Declining or withdrawing on a started shift says "This shift has already started."
- A cancel reason ending in a full stop doesn't get a second one, and closing an ask needs a reason.
- Minimum pay can be cleared.
- The screens already kept dates within 8 weeks and bios to 250 characters; the database now checks both too. The 2,000-character limit on notes and messages and the 500-character limit on cancel reasons are new.
- Pay shows as £18.50, not £18.5.
- Undo isn't offered after I can do this, Decline or Withdraw, because the other side may already have been told (open decision).