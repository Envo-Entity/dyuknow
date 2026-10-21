## Scheduled jobs

Two timed jobs run inside the database with pg_cron (a scheduler built into Postgres). No rule depends on them. Every function settles what time has decided before it acts, so a late job only delays notices and stored statuses; it never changes an outcome.

### The jobs

The sweep does the booking work; the daily tidy does the housekeeping.

| Job | Runs | What it does |
|---|---|---|
| sweep | Every 5 minutes | Settles shifts whose time has come, confirms hours 48 hours after a day ends, and writes reminder notices. |
| daily tidy | 03:30 UTC every day | Trims old pg_cron run history and call receipts older than 7 days. |

pg_cron schedules are in UTC. That doesn't matter here, because every rule compares exact instants. If the owner's morning summary is built after the first release, it adds a daily job of its own.

### How the sweep stays safe

The sweep is a procedure, private.run_sweep(), that saves after every item. A procedure is like a function, but it can commit part-way through. So the sweep never holds more than one item's rows locked, and a member's call waits for at most one item.

- **One at a time.** At the start it takes a named lock that only the sweep uses (a session advisory lock). A second sweep that finds it taken stops at once. The lock is released at the end, or when the session ends.
- **One item, one transaction.** An item is one shift, booked day or booking. It is locked, changed and committed on its own. If it fails, only that item is undone, the error goes to the database log, and the next item carries on.
- **Never in anyone's way.** The item's main row is taken with SKIP LOCKED, which passes over a row a member's call is busy with; the next run picks it up.
- **Short waits only.** Anything else the item touches, such as a conversation row, is waited for at most 2 seconds (a lock timeout). After that the item is undone and left for the next run.
- **Its own clock per item.** Each item reads clock_timestamp() after its lock and uses it for every check and timestamp. A long run never judges by a stale time.
- **Only what is due.** Each step's query holds the time window itself and picks the oldest first. Rows that can never fall due are never picked, so they can't crowd out real work.
- **Same steps, same words.** It calls the shared steps settle_shift and notify (see The booking engine → Shared steps). Its lines and notices therefore match the functions' exactly.
- **Bounded.** Each step handles at most 500 items per run, and the run stops taking new items after 4 minutes. Anything left waits five minutes; after an outage, a few runs catch up.

```
procedure run_sweep():
  if another session holds the sweep lock: stop
  take the sweep lock
  for each step, 1 to 3:
     repeat until the step has nothing due, 500 items are done, or 4 minutes have passed:
        pick the next due item, passing over rows that are locked
        lock it; t = clock_timestamp()
        check it is still due at t; if so, do the step's work with t
        commit                                  -- or undo just this item on error, and log it
  release the sweep lock
```

### Step 1: shifts whose time has come

The sweep runs settle_shift on every open shift where time has decided something that no member's call has written yet.

```
due shifts: status open, and either
   no day with a place left starts after now, and some day was short of people   -- expiry
   or an invited or can-cover answer on it has no waiting day left                -- days started
ordered by the start of the shift's first day, oldest first

for each: lock it, passing over it if busy; t = clock_timestamp()
   settle_shift(shift, t)
```

settle_shift (see The booking engine → settle_shift and settle_answer) does one of two things:

- **Expiry.** The shift becomes expired. Everyone still invited or waiting lapses with the line "This shift has started" and a shift-started notice. The venue gets shift-unfilled.
- **Answers whose days have started.** A waiting answer whose every remaining day has started lapses the same way, while the shift stays open for later days.

Notes:

- A multi-day shift stays open while a later day still needs someone.
- People already booked stay booked.
- The venue gets shift-unfilled only when the shift expires (see What is not scheduled).
- If a member's call locked the shift first, it has already settled it, and the sweep finds nothing to do.
- An open shift whose days are all full was already made filled by the booking, so the sweep never meets one.

### Step 2: hours that confirm themselves

A booked day nobody recorded becomes worked, at the planned hours, 48 hours after it ends.

```
due days: booking_days with status booked and ends_at + 48 hours <= now, oldest ends_at first

for each: lock it, passing over it if busy; t = clock_timestamp()
   check it is still booked and ends_at + 48 hours <= t
   minutes = ends_at minus starts_at, in minutes      -- a clock change adds or removes an hour
   update day: status worked, auto_confirmed true, recorded_at t, recorded_by empty,
               worked_start_time and worked_end_time = the shift's planned times,
               worked_minutes minutes,
               pay_pence = minutes × rate_pence ÷ 60, rounded to the nearest penny
```

No notice and no conversation line are written, as in the demo.

### Step 3: reminders before a booking

Each booking gets one in-app reminder notice before its first booked day: 18:00 London the evening before, or 2 hours before the start if it was booked that same day.

For each active booking with reminded_at empty, the step's query works out two things:

- **first:** its earliest day that isn't cancelled;
- **remind_at:** first's start minus 2 hours if booked_at falls on first's London date, otherwise 18:00 London on the day before first's date.

```
due reminders: first starts after now, remind_at is after booked_at, and remind_at <= now;
               oldest remind_at first
for each: lock the booking, passing over it if busy; t = clock_timestamp()
   work out first and remind_at again; check reminded_at is still empty and the window holds at t
   update booking: reminded_at t
   notify(talent, reminder, the booking, first)      -- the notice names that day

passed reminders: first starts at or before now, and reminded_at is still empty
for each: lock the booking, passing over it if busy; t = clock_timestamp()
   update booking: reminded_at t, with no notice
   -- its first day has started, so it can never be reminded; marking it keeps the list short
```

The two queries are separate, so bookings that will never be reminded can't hold up the ones that are due.

- Only the first day that isn't cancelled is reminded. Later days of the same booking get none, as in the demo.
- A booking made after its reminder time, such as at 20:00 for tomorrow, gets none; the booked notice has just told them. It is marked once its first day starts.
- If the first day is cancelled, before or after its reminder, the next day still booked becomes the first. cancel_days empties reminded_at when it cancels the day that was reminded, so the new first day gets its own reminder.
- A reminder notice already written stays if its day is later cancelled; the days-cancelled notice follows it.
- reminded_at stops a second reminder even if a run repeats.
- The reminder is in-app only and always appears. There is no setting for it (see Notifications → Preferences).
- 18:00 never falls in a clock change, so that time always exists.

### The daily tidy

Once a day, the tidy removes records nobody needs any more.

```
at 03:30 UTC:
   delete pg_cron run history older than 7 days
   delete call_receipts created more than 7 days ago
```

Nothing else is deleted on a timer. Shifts, bookings, messages and notifications stay as history. Accounts are never deleted automatically; carrying out a deletion request is a later step (see Edge functions → Planned for later).

### Rules that hold even when a job is late

Every time rule is applied inside the functions as well, so a late sweep never lets anyone do something they shouldn't.

| Rule | How the functions apply it | Written by the sweep | What people see meanwhile |
|---|---|---|---|
| A day closes when it starts | open_days, free_days and waiting_days count only days starting after the call's clock. say_yes, book_talent and send_to_more never offer a started day, and cancel_days refuses one. | Never stored | No difference |
| A shift ends when no future day has a place | Any call that locks the shift settles it first. Calls that go ahead save the expiry themselves: cancel_days, admin_set_approval, and a booking elsewhere that trims it. Calls that would refuse do so as for an ended shift; the next table lists their messages. | Step 1, if no call got there first | If nobody touches the shift, its notices arrive up to 5 minutes late. Lists and counts judge by shift_state_now, so it never shows as open. |
| A waiting answer ends when its last day starts | The same settling | Step 1 | Counts use waiting_days, so it leaves Needs you on time; its notice may be up to 5 minutes late. |
| Hours confirm themselves after 48 hours | confirm_day refuses "This day has already been recorded." | Step 2 | The app shows the day as confirmed automatically once ends_at plus 48 hours has passed. |
| One reminder, before the shift | Nothing depends on it | Step 3 | It may come up to 5 minutes late, and never after the start. |
| Contact details only in the contact window | get_booking_contact compares with its own clock on every call | Never stored | No difference |
| Dates within 8 weeks | post_shift, set_availability and create_my_profile use the London date of the call's clock | Never stored | No difference |

What each call says about a shift whose time has run out:

| Call | Message |
|---|---|
| say_yes, book_talent | "This shift has already started." |
| decline_request, withdraw_yes | "This shift has already started." |
| close_shift | "This has already ended." |
| send_to_more | "This shift is no longer open." |

### What is not scheduled

Some timed messages from the demo, or that might be expected, deliberately don't exist.

- The demo's "Are you free this week?" nudge was a preview control. It has no notification kind and doesn't run.
- Venues get no reminder to confirm hours. Days waiting for hours show under Bookings → Needs you, and confirm themselves after 48 hours.
- A venue isn't told when one day of a multi-day shift starts short while later days are still open, or when the shift then fills. The day shows as short on the shift page.
- No account is deleted automatically after a deletion request (open decision).

### Setting up and watching the jobs

The jobs need two extensions and can be checked from the Supabase dashboard.

1. Install pg_cron, which is available but not installed, and btree_gist for the no-double-booking rule. pg_net and Vault aren't needed: no job calls out of the database.
2. Add the two pg_cron jobs, the sweep as `CALL private.run_sweep()`.
3. When building, check that the project's pg_cron can run a procedure that commits part-way. If it can't, schedule a function that handles at most 20 items per run, every minute, instead.
4. The admin can also run the sweep by hand from the SQL editor, with the same CALL.
5. pg_cron records every run in its history, and item errors go to the database log. A failed run, or no sweep for 15 minutes, means it needs a look.
6. The free plan pauses a project after about a week with no activity, and the jobs stop with it. Restore the project from the dashboard; the next sweep catches up.
