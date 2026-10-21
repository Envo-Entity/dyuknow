## Who can see what

Each member sees everything of their own, the other side's public card once both are approved, and contact details only around a booking. Signed-out visitors see nothing from the app. Admins are left out of every member rule and read through their own admin functions instead.

### Kinds of viewer

The app has four kinds of viewer, and the admin stands apart from them.

- **Approved venue**: a signed-in venue member whose members.approved is true.
- **Approved talent**: a signed-in talent member whose members.approved is true.
- **Not approved**: a member still waiting for approval, or one whose approval was taken away (paused). Only a paused member can have any history.
- **Signed out**: anyone not signed in. Someone signed in without a profile is treated the same, except that they can create their own profile.
- **Admin**: a login listed in admins (see Tables → admins). An admin who is also a member sees, in the app, only what that member would see.

### What each viewer can see and do

The database enforces every line of this table, whatever the screens show.

| What | Approved venue | Approved talent | Not approved | Signed out |
|---|---|---|---|---|
| Own profile, documents, settings and notifications | Yes | Yes | Yes | No |
| Talent cards: name, photo, positions, skills, area, bio, minimum pay, verified document names | Approved talent, plus talent in their own conversations and bookings | Own card only | Own card, plus people in their own conversations and bookings | No |
| Venue cards: name, photo, area, bio, types, cuisines, Instagram, verified document names | Own card only | Approved venues, plus venues in their own conversations and bookings | Own card, plus people in their own conversations and bookings | No |
| Talent availability: free, not free, free hours | Approved talent | Own | Own, if talent | No |
| When a talent is already booked, never where | Approved talent, up to 8 weeks ahead | Own bookings | No | No |
| Job posts | Own | Open posts from approved venues, and any shift they have answered | Own history only | No |
| Booking requests | Own | Requests sent to them | Own history only | No |
| Who said yes, and for which days | On own shifts | Own answers only; other people appear only as places left | Own history only | No |
| Bookings and booked days | On own shifts | Own | Own | No |
| Contact details: venue street address, full postcode, on-site contact, phones | The booked talent's mobile, in the contact window | The venue's address, on-site contact and phone, in the contact window | No | No |
| Conversations and messages | Own | Own | Own, read only | No |
| Document files | Files they uploaded | Files they uploaded | Files they uploaded | No |
| Change own profile, photo and settings; upload documents; ask for deletion | Yes | Yes | Yes | Create a profile, once signed in |
| Set availability | No | Yes | Yes, if talent | No |
| Post a job, send booking requests, send to more people | Yes | No | No | No |
| Close their own open ask | Yes | No | Yes | No |
| Say I can do this, or Accept | No | Yes | No | No |
| Decline a request, or Withdraw a yes | No | Yes | Yes | No |
| Book | Yes, from days people said yes to | Only by Accept | No | No |
| Cancel booked days that haven't started | Yes | Yes | Yes | No |
| Confirm hours or record a no-show | Yes, once, after the day ends | No | Yes, if a venue | No |
| Start a conversation and send messages | With approved talent | With approved venues | No | No |

Members never see the admin list or the admin log.

### How the rules are enforced

Row-level security (rules in the database that decide which rows each signed-in person can read) is switched on for every table. Six more guards sit on top of it.

- Nobody writes to a table directly. Every change is a database function that checks the caller, their approval and the rules, then saves everything together or nothing (see The booking engine).
- Admins are left out of every row rule on member tables. So an admin who also runs a venue sees only that venue's rows, lists, counts and live updates.
- The app also filters every query by the caller's own member id. This second guard keeps lists and counts right even if a rule were ever too wide.
- Other people's profiles are read only through the talent_cards and venue_cards views (see Tables). The talents and venues tables show each member only their own row.
- Contact details are read only through get_booking_contact, and other people's booked times only through get_busy_times (see Functions that only read, below).
- Live updates (Realtime) carry new and changed rows of notifications, messages and conversation_reads. Supabase checks each one against the receiver's row rules before sending it. Deletions are never sent (see Security rules and file storage → Live updates).

The new app tables and buckets never allow anonymous access. The onboarding tables (talent_profiles, venue_profiles), their old buckets and /admin/onboarding are outside this build and keep their current anonymous insert rules for now (see Security rules and file storage → The onboarding door stays open).

### Before and after a booking

Before a booking, each side sees only the other's area, never an address or a phone number. The contact window opens when a booking is made. It closes 48 hours after the end of the booking's last day that isn't cancelled, which is when unconfirmed hours confirm themselves.

| Detail | Before a booking | In the contact window | After the window |
|---|---|---|---|
| Venue area, such as TW9 | Approved talent | Yes | Yes |
| Venue street address and full postcode | No | The booked talent | No |
| Venue on-site contact name, role and phone | No | The booked talent | No |
| Talent area | Approved venues | Yes | Yes |
| Talent mobile number | No | The booking venue | No |
| Talent full postcode, date of birth | Never | Never | Never |
| Anyone's email address | Never | Never | Never |

- The caller must be approved and not deleted, so a paused member gets no contact details, even inside the window.
- A fully cancelled booking has no window. A booking with some days cancelled keeps one, timed by the days still on it.
- The address never appears in job posts, booking requests, chat cards or notifications. The in-app reminder links to the booking, which shows the address inside the window.
- The conversation stays open after the window closes, so either side can still write through the app.

Onboarding answers that aren't on a card stay between the member and Dyuknow.

- For talent: date of birth, full postcode, years, employers, known for, category, preferred shifts, areas and travel, the CV, and whichever pay answer isn't on the card (open decision 2). Their email is the login email, which no other member ever sees.
- For venues: business and company names, website, contact email, covers, team size, vacancies, roles and teams needed, typical shifts and notice, dress code, uniform, staff meal and typical rates.

### Approval

Approval gates starting anything with other people, never ending it. An unapproved member can build their profile but can't be found, asked, booked or messaged.

While waiting for approval, a member:

- can fill and edit their profile, add a photo, upload documents and, for talent, set availability, so everything is ready on approval;
- doesn't appear in team lists, booking request lists or job post alerts, and can't open anyone else's card;
- sees no job posts, because anyone can sign up and job details stay with approved members.

When the admin takes approval away:

- everything still waiting on the member ends at once: their open answers and their open asks (see The booking engine → admin_set_approval);
- booked days stay booked, and the member can still cancel days that haven't started and, for a venue, confirm hours;
- they keep read access to their history: their bookings, their conversations and the cards of the people in them;
- they can't message, start anything new or see contact details.

A paused talent therefore can't see the address of a booking still to come. Before pausing someone with booked days ahead, the owner settles those days with both sides (open decision).

### Same side and other work

Talent never see other talent, and venues never see other venues or their shifts. A talent learns about other people only as numbers, such as "1 place left". A venue learns about a talent's other work only as "Already booked", "Booked elsewhere" or the booked-elsewhere notification, never which venue.

### Documents

Document files stay private between the member and Dyuknow. They sit in the private member-documents bucket and open only through links that stop working after 5 minutes.

- A member can open the files in their own folder, which are the ones they uploaded. Admins can open any of them.
- Files sent through the old onboarding form stay in the onboarding buckets, which this build doesn't touch.
- Other members see only the label of a verified document as a tick, such as "Right to work". They never see the file, or whether a document is missing, being checked or rejected.

### Admin

Admins read and act through /admin and their own database functions, never through the member rules. Each admin function first checks that the caller's login is listed in admins.

- **Acting:** admin_set_approval (Approve or Unapprove) and admin_review_document (Verify or Reject), both in The booking engine. Actually deleting accounts is a later step; for now members can only ask for deletion.
- **Reading:** the admin lists under Functions that only read, below. Other people's document files open through 5-minute links that only admins may request.
- **The Supabase dashboard** gives full access as the database owner. It is for fixing mistakes only, because changes made there skip the functions' checks.

### Signed-out visitors

A signed-out visitor sees only the public website. Profile photos in member-photos are files at public addresses, so anyone holding a photo's exact link can open it. Those links reach people only through the app (see Security rules and file storage).

### Functions that only read

Four member reads and four admin lists need more than a row rule, so each is a database function that checks its caller. Each runs with its owner's rights, learns the caller from their login, and can be called only by signed-in users.

#### get_booking_contact

Gives each side of a booking the other side's contact details, during the contact window only.

**Who can call:** the booking's venue or its talent, approved and not deleted.

**Input:** booking_id.

**Output**

| Caller | What comes back |
|---|---|
| The booked talent | The venue's street_address, postcode, contact_name, contact_position and contact_phone. |
| The venue | The talent's mobile_number. |
| Either | window_closes_at, so the screen can say how long the details stay. |

A blank profile field comes back empty. Email addresses and dates of birth are never returned.

**Refuses when:** anything is wrong. The booking doesn't exist, isn't theirs, is fully cancelled, or its window has closed, or the caller isn't approved. Every case gives the same message, so nobody can probe other people's bookings: "Contact details aren’t available for this booking." (new)

**Steps**

```
me = the caller's member
require me is approved and not deleted
booking = the booking with this id
require booking exists, booking.status is active, and I am its venue or its talent
last_end = the latest ends_at among its days that aren't cancelled
closes_at = last_end + 48 hours
require now is before closes_at              -- the window opened at booked_at
if I am the talent:
   return the venue's street_address, postcode, contact_name,
          contact_position and contact_phone, with closes_at
else:
   return the talent's mobile_number, with closes_at
```

The booking's "Getting there" and "Shared with" panels, the Call button, the calendar file's location and the talent's shift address all read from it. Outside the window those places show the area only.

#### get_busy_times

Tells an approved venue when talent are already booked, without saying where.

**Who can call:** an approved venue that isn't deleted.

**Input**

| Input | Type | What it holds |
|---|---|---|
| talent_ids | uuid[] | The talent to check, at most 100. |
| from_date, to_date | date | London dates, from today to 8 weeks ahead (today plus 55 days). |

**Output:** one row per booked day: talent_id, starts_at and ends_at. Days on the venue's own shifts are included too. The app matches them with its own bookings, to show "Already booked" rather than "Booked elsewhere then".

**Refuses when:**

1. The caller isn't an approved venue: the shared refusals (see The booking engine → Rules every function follows).
2. More than 100 talent: "Choose up to 100 people." (new)
3. A date outside the 8 weeks, or from_date after to_date: "Choose dates in the next 8 weeks."

**Steps**

```
me = the calling venue (signed in, approved, not deleted)
require 1 to 100 talent ids
require from_date is London today or later, to_date is no later than today + 55 days
range = London midnight at the start of from_date, to London midnight after to_date
for each id that is an approved talent who isn't deleted:   -- others are left out silently
   return each of their booking_days that isn't cancelled and overlaps range:
      talent_id, starts_at, ends_at
```

Inside the booking functions, clashes are worked out from booking_days directly (see The booking engine → free_days), never through this function.

#### get_badge_counts

Returns every red dot and count for the caller in one call.

**Who can call:** any signed-in person. Someone with no members row, or a deleted one, gets zeros.

**Input:** none.

**Output**

| Field | What it holds |
|---|---|
| unread_notifications | How many of their notifications have read_at empty. |
| unread_conversation_ids | Their conversations holding a text or card from the other person past their read marker. |
| needs_you | The Shifts count for talent, or the Bookings count for venues. |
| account_attention | True when one of their documents is rejected and not yet replaced. |

What each count includes, and when the app asks, is in Notifications → Red dots and counts.

**Refuses when:** never.

**Steps**

```
me = the caller's member; if there is none, or it is deleted: return zeros
count my notifications where read_at is empty
list my conversations with a text or card from the other person
   whose seq is above my conversation_reads marker (no marker: any)
count my needs-you items, as Notifications defines them
account_attention = I have a document with status rejected
return the four values
```

#### am_i_admin

Says whether the caller is an admin, so the app knows whether to show the /admin link.

**Who can call:** any signed-in person. **Input:** none. **Output:** is_admin, about the caller only. It is true when the caller's login is listed in admins.

**Steps**

```
return is_admin = private.is_admin()
   -- the admin rule is in Security rules and file storage → Admins
```

#### Admin lists

The /admin page reads through four admin-only functions. Each refuses anyone else with "Only Dyuknow can do this.", and returns at most 200 rows.

| Function | Input | What it returns |
|---|---|---|
| admin_list_members | status: waiting, approved, deletion-requested or all | Member id, side, name, login email, approved, the fields still missing for approval, created_at and deletion_requested_at. |
| admin_get_member | member_id | The members row, their whole talents or venues row, the login email, and their documents with status. |
| admin_list_documents | status, default review | Document id, member, label, file name and uploaded_at, oldest first. |
| admin_list_stale_logins | older_than_days, default 7 | Logins with no members row older than that: login id, email, created_at and last sign-in. |

```
require the caller's login is in admins          -- private.is_admin()
read the rows with the function's own rights      -- auth.users included, for login emails
return only the columns listed
```

These functions are the only way the app reads other members' private rows. Being an admin never widens what the member screens show.