## Fake data now, real users later

This build is tested with fake people only. They live in the new app tables and buckets of the live Supabase project, beside the onboarding archive, which nothing here touches. One script seeds them, another wipes them, and real users come in later, once the owner says the app is ready.

### Why fake data, and why in the live project

The app needs believable venues, talent, shifts and bookings to build and test against, and there is only one Supabase project.

- **One project.** The project is on the free plan, so there is no branching and no second project to test in. The app tables are created in the live project.
- **Kept apart.** The onboarding archive (talent_profiles, venue_profiles, and the profile-photos and verification-documents buckets) holds the 18 real records. The app never reads or writes them, so fake data can't mix with real people.
- **Easy to tell apart.** Every fake login has an @example.com address. Nothing real can use that domain, so the wipe finds fake data by it.
- **Real sign-in can't reach real people yet.** Until the owner connects Resend, login codes only reach the Supabase team (see Sign-up, login and onboarding → Supabase Auth and Resend settings). The fake logins have passwords and use the test sign-in form instead.
- **Pausing.** The free plan pauses a project after about a week with no activity. If that happens, restore it from the Supabase dashboard; the data stays.

### What the seed creates

The seed ports the demo's seed() in lib/preview/model.ts, so the real app opens on the same world the demo shows. It adds one waiting member, a fake admin and a few messages, which the demo doesn't have.

The demo's dates are fixed around 1 October 2026. The seed moves every date by the same amount so that "now" is the day it runs: the open shifts fall in the coming days and the past booking a few days back.

| What | Rows | From the demo |
|---|---|---|
| Venues | 3, all approved | Spruce (Richmond), The Sea The Sea (Chelsea), Harper Privé (Mayfair), each with address, on-site contact, type, cuisine and Instagram |
| Talent | 6 approved, shift alerts all | Poppy Bertram (CDP), Camille Aubert (Head Chef), Theo Marchetti (CDP), Ethan Russell (Sous Chef), Noor Haddad (Bartender), Inès Laurent (Waiter), with bio, positions, skills and minimum rate |
| Waiting talent | 1, not approved | New: a pastry chef with one document in review, so /admin has someone to approve |
| Admin | 1 login in admins, no members row | New: admin@example.com, to test /admin |
| Documents | One per required type for each member, mostly verified | Theo's food hygiene certificate is in review; Noor's allergen awareness is missing. Each points to a small placeholder PDF in member-documents. |
| Availability | 14 days of free evenings (16:00 to 23:59) for every approved talent except Theo | Poppy is not free on day 6 |
| Shifts | 7 | Spruce Friday CDP post; Sea Saturday Head Chef request to Camille; Harper 3-day CDP weekend; Sea 3-day Sous Chef residency; Harper late bar shift; Spruce floor Waiter post; one past Spruce CDP shift, filled |
| Answers | 2 | Camille's waiting booking request; Poppy's booked answer on the past shift |
| Bookings | 1, with 1 booking day | Poppy at Spruce on the past shift, hours confirmed as worked, 17:00 to 23:00 |
| Notifications | 9 | booking-request to Camille; job-posted to each talent whose positions match each of the 5 job posts |
| Conversations and messages | 2 conversations, about 6 messages | New: Spruce and Poppy about the past booking (read), and The Sea The Sea and Camille about the request (one unread, so the Messages dot shows) |

The seed writes straight into the tables as the database owner. It is the only writer that skips the app's functions, and only because some of this history (a finished booking) can't be made through them today.

### Fake logins

Each fake person gets a login with an @example.com address and a password, marked confirmed so no code is needed.

- Addresses follow the demo ids: spruce@, sea@, harper@, poppy@, camille@, theo@, ethan@, noor@, ines@, the waiting pastry chef, and admin@, all @example.com.
- They all share one test password, read from SEED_PASSWORD in the developer's .env.local. .env.example names the variable; the password itself is never committed.
- Only these logins have passwords. Real people sign in with codes only.

### Photos

Photos come from the images already in public/assets/, uploaded to member-photos/`<login id>`/ so each fake member's photo_path works exactly like a real one.

| File in public/assets/ | Used for |
|---|---|
| venue-larkspur-dining.webp | Spruce |
| venue-hotel-bar.webp | The Sea The Sea |
| venue-members-club.webp | Harper Privé |
| talent-chef-4.webp | Poppy |
| talent-camille-portrait.webp | Camille |
| talent-chef-2.webp | Theo |
| talent-chef-3.webp | Ethan |
| talent-bartender-1.webp | Noor |
| talent-maitred-1.webp | Inès |
| talent-pastry-1.webp | The waiting pastry chef |
| talent-sommelier-1.webp | Not used (spare portrait) |
| talent-camille-dish-1.webp, talent-camille-dish-2.webp, talent-camille-dish-3.webp, talent-pastry-dish-1.webp | Not used: the app has no gallery |
| role-headchef-tile.webp | Not used: a landing page tile |

The seven photos in public/assets/landing/ belong to the landing page and aren't uploaded. All the files stay in public/assets/; the seed only copies them.

### How the seed runs

The seed has two parts, run from the developer's machine: a Node script for logins and files, then SQL for everything else. Both are safe to run again.

1. **scripts/seed.mjs** reads NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local. The key never leaves that machine and is never committed.
2. It refuses to run unless every address it will create ends in @example.com.
3. For each fake person it creates the login, or, if it exists, resets its password to SEED_PASSWORD.
4. It uploads each photo to member-photos/`<login id>`/seed.webp and each placeholder document to member-documents/`<login id>`/, overwriting the same names on a rerun.
5. **supabase/seed/fake.sql** is then run in the SQL editor (or with psql). It finds each login by email in auth.users, so it needs no ids pasted in.
6. It first removes the app rows of every @example.com member, as the wipe does, then inserts the rows in the table above, with dates moved to today.
7. It inserts the admin@example.com login into admins.

Rerunning gives the same people with fresh dates, never duplicates.

### The wipe

The wipe removes every trace of the fake data and nothing else. It never touches the onboarding archive or the old buckets.

1. **SQL (supabase/seed/wipe.sql)** finds the members whose login email ends in @example.com.
2. It deletes, for those members: notifications, conversation_reads, messages, conversations, booking_days, bookings, answer_days, answers, shift_days, shifts, call_receipts, availability, documents, admin_actions, talents, venues and members. It deletes @example.com rows from admins.
3. It lists any other app members it finds, such as a team member's test sign-up through /join, and leaves them for the developer to decide.
4. **scripts/wipe.mjs** then deletes the `<login id>`/ folders of those logins in member-photos and member-documents, and deletes the @example.com logins.
5. The scripts only ever name the app tables, member-photos and member-documents. talent_profiles, venue_profiles, profile-photos and verification-documents appear nowhere in them.

### Checks after seeding

Run these counts after each seed. The onboarding counts are also checked after each wipe.

| Check | Expected |
|---|---|
| talent_profiles, venue_profiles rows | 10 and 8, unchanged |
| Files in profile-photos and verification-documents | Unchanged |
| @example.com logins | 11 |
| members | 10: 3 venues, 7 talent |
| members with approved true | 9 |
| admins rows for @example.com | 1 |
| shifts, answers, bookings, booking_days | 7, 2, 1, 1 |
| Availability rows | 70 |
| Notifications | 9 |
| Conversations | 2 |
| Members whose photo_path has no file in member-photos | 0 |
| Documents whose storage_path has no file in member-documents | 0 |

And by hand, with the test sign-in form:

- Poppy sees the open CDP jobs, her past booking with confirmed hours, and her job-posted notices.
- Camille sees Sea's booking request and an unread message.
- Spruce sees its two posts and Poppy in its team list.
- The waiting pastry chef sees only her own profile and the waiting line.
- admin@example.com sees the pastry chef on the waiting list and Theo's document to check.

### Later: real users

Real users come in after this build, when the owner says the app is ready. In outline:

1. **Wipe the fake data** with the wipe script, and check the app tables are empty.
2. **Import the onboarding records** with a one-off script, record by record, for the people the owner confirms. It creates each login, copies the answers into members and talents or venues, copies photos and documents into member-photos and member-documents, and copies future dated availability into availability. The archive itself stays as it is.
3. **The owner approves** each imported member whose required answers are complete, from /admin.
4. **Turn on Resend as Supabase's email server** (see Build order and open decisions → Secrets and setup you enter later), so login codes reach everyone. Then real members sign in with their email and a code.

The details of the import, such as which records are real and how each email is confirmed, are decided then.
