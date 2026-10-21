## Build order and open decisions

Build in eleven small steps against the live Supabase project, each tested on its own with fake data. This build is sign-in, self-serve onboarding, profiles, asks, answers, booking, messages, in-app notifications and the days after a booking. Email, real users and deleting accounts come after it.

### How the work is done

- All work happens on one branch. Each step ends with a commit, and the build ends with one pull request.
- Every database change is a migration file in the repo, applied to the live project in order.
- New tables, functions and buckets sit beside the onboarding archive. No step changes talent_profiles, venue_profiles, profile-photos, verification-documents or /admin/onboarding.

### Build order

Each step lists what ships and how to tell it works. Nothing a step needs arrives in a later step.

1. **Groundwork.** Pull the applied migrations into the repo; only one is there, under a different timestamp. Add the Supabase config.
   - Install btree_gist and pg_cron.
   - Close the default rights for new tables and functions, and take back set_updated_at's rights. See Security rules and file storage → Who can run each function.
   - Add the private schema with its row-rule helpers, including private.is_admin(), and their grants.
   - Add the reference lists, positions and document_types.
   - Add the grant check to CI.
   - Works when: the repo's migrations match the live database, the grant check passes, and a test confirms positions match lib/catalogue.ts.
2. **Accounts and profiles.** Add members, talents, venues, documents, availability, admins, admin_actions, notifications and call_receipts, with their row rules.
   - Add the member-photos and member-documents buckets with their storage rules.
   - Add the talent_cards and venue_cards views.
   - Add create_my_profile, update_my_profile, set_my_photo, save_document, set_availability, update_my_settings, request_account_deletion, keep_my_account, am_i_admin, admin_set_approval, admin_review_document and the admin lists (admin_list_members, admin_get_member, admin_list_documents, admin_list_stale_logins).
   - Works when: a test for every line of Who can see what passes for each kind of viewer, and the onboarding archive's row counts and rules are unchanged.
3. **Seed and wipe.** Write scripts/seed.mjs, supabase/seed/fake.sql, supabase/seed/wipe.sql and scripts/wipe.mjs, as in Fake data now, real users later. Seed the fake people, profiles, documents, photos and availability.
   - Shifts, answers, bookings and messages are added to the seed in the steps that create their tables.
   - Works when: the seed runs twice without duplicates, the wipe leaves the app tables and new buckets empty, and the checks after seeding pass.
4. **Sign-in and self-serve onboarding.** Build /login with the email code and, behind NEXT_PUBLIC_DEV_LOGIN, the test sign-in form. Build log out in place of the fake Google modal, and /login?next=.
   - Build /join and the two forms with their fixes, drafts and uploads into member-documents and member-photos, saving through create_my_profile.
   - Build /app's addresses, with identity from the session, and the waiting state.
   - Works when: a fake login signs in with a password, and a team member's email signs in with a code. A new person fills /join on a phone, closes the browser mid-form, comes back, and submits without retyping.
5. **The app's profiles, availability and account, and notices.** Wire Profile, photo editing, documents, Availability and Account to the database.
   - Add the notifications list, the bell, the red dots and the needs-you count, with get_badge_counts and mark_notifications_read.
   - Add Realtime for notifications, with deleted rows never sent.
   - Works when: a fake member edits their profile and availability, uploads a document, and asks for deletion and keeps their account. A notice written in SQL appears live on another device.
6. **Messages.** Add conversations, messages and conversation_reads: starting a conversation, sending, read markers, the Messages dot and live updates. Add messages and conversation_reads to the Realtime publication. Add the seed's messages.
   - Works when: two fake members chat on two phones, and the dot clears on both devices on reading.
7. **Asks and answers.** Add shifts, shift_days, answers, answer_days and shift_day_cover.
   - Venues post jobs, send booking requests, send to more people and close. Talent see Open jobs and say I can do this, Accept, Decline or Withdraw.
   - Team lists use availability. Cards, grey lines and notices go out; shift alerts decide who gets job-posted.
   - Add the seed's shifts and answers.
   - Works when: the ask and answer stories in tests/mvp-preview.test.mjs pass against the database.
8. **Booking.** Add bookings and booking_days with the no-double-booking and capacity rules. Venues book, Accept books, clashing answers are trimmed and full shifts fill.
   - Add get_booking_contact, and get_busy_times so team lists show "Already booked". Add the seed's booking.
   - Works when: the booking stories pass, and two venues pressing Book on one person at once make exactly one booking.
9. **After the booking.** Add cancelling days, confirming hours or recording a no-show, the five-minute sweep and the daily tidy.
   - The sweep closes started days, expires unfilled shifts, confirms hours after 48 hours, tells venues about unfilled shifts and writes in-app reminders.
   - Works when: the time-based stories pass, including one where the sweep runs late. Database tests use past times instead of moving the clock.
10. **A small /admin page.** Two lists: waiting for approval, with Approve and Unapprove (admin_set_approval), and documents to check, with Verify and Reject (admin_review_document). Documents open through 5-minute signed links.
    - Works when: admin@example.com approves the waiting pastry chef, she gets the approved notice live, and a member can't open /admin or any admin function.
11. **Finish.** Remove the demo shortcuts from /app and point Login at /login.
    - Change every "text" and "SMS" in the app's copy to in-app wording.
    - Rerun the seed and the checks, then open the pull request.
    - Works when: a search of the app's copy finds no promise of a text message or an email, and the full booking story in Sign-up, login and onboarding runs with fake logins.

### Why the days after a booking are in the first release

Cancelling days, confirming hours and reminders belong in the first release, because the app already shows them and the data goes wrong without them.

- **Cancel days.** Without it, a talent who falls ill can only send a message. The day stays booked and holds the place, so the venue can't book anyone else.
- **Confirm hours and the 48-hour rule.** Without them, every finished day waits for hours forever. The venue's "Needs you" list grows each shift, and the record payments will need never forms.
- **The sweep.** Functions already judge by the clock, so nothing unsafe happens without it. But started shifts would still show as open, and no venue would hear "Shift started unfilled".
- **Reminders.** The Account page promises one, and a missed reminder can mean a missed shift. Once the sweep exists, it's one more query and one more notice.

### After this build

These come later, because nothing in this build depends on them.

- Email: Resend set up as Supabase's email server, then a send-emails edge function, with notify() queueing an email for chosen kinds of notice.
- Inviting and importing real users: wipe the fake data, import the onboarding records, approve (see Fake data now, real users later → Later: real users).
- Closing the anonymous insert rules on the onboarding archive.
- Actually deleting accounts, with a delete-account edge function. Until then, members can only ask, and the owner acts by hand.
- Turnstile or another spam check on /login, if sign-up abuse appears.
- Two-step sign-in for admins, if wanted.
- Limits on how often one member can act, such as 30 messages a minute or 20 new asks an hour. Approval is the defence for now.
- The Supabase Pro plan, for no pausing, daily backups and branching.
- Switching off the older JWT-style keys once nothing uses them.
- Required documents that block something, if decided.
- Reminders for every day of a multi-day booking, not just the first.
- More than one login per venue.
- A record of late cancellations (founder question 5).
- Realtime broadcast in place of row changes, if membership grows a lot.
- SMS, and the phone app, using the same database, functions and sign-in.

### Secrets and setup you enter later

None of this is needed to build or test with fake data. The owner, or the developer with the owner, enters it when real users are near.

**Supabase Auth**

- [ ] Custom SMTP: host smtp.resend.com, port 465, username resend, password a Resend API key used only for this, sender name Dyuknow.
- [ ] Email code length 6 and expiry 600 seconds.
- [ ] Sign-in templates (Confirm signup, Magic link, Change email address) showing {{ .Token }} and no link, as in Sign-up, login and onboarding.
- [ ] Site URL and redirect URLs.
- [ ] Raise the auth email rate limit from 30 to 100 an hour.

**Resend**

- [ ] Verify the sending domain with SPF, DKIM and DMARC records.
- [ ] Choose the sender address.

**App hosting environment variables**

- [ ] NEXT_PUBLIC_SUPABASE_URL.
- [ ] NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
- [ ] NEXT_PUBLIC_DEV_LOGIN: true in preview deployments only, off in production.

**Developer machine only**

- [ ] SUPABASE_SERVICE_ROLE_KEY (or the new secret key) and SEED_PASSWORD in .env.local, for the seed and wipe scripts. Never in the repo or the hosting settings.

**Admins**

- [ ] Add the owner's login to admins, with one line of SQL, after they first sign in.

### Open decisions

Each line is a question for the owner, with the default this design assumes until it's answered.

**Profiles and documents**

- [ ] Which documents are required, and for whom? Default: all seven types listed in Account, none marked required, and documents never block anything.
- [ ] Which number is the "minimum hourly pay" venues see? Default: minimum_same_day_rate_gbp; preferred_hourly_rate stays private.
- [ ] Does the onboarding food safety certificate count as the food hygiene certificate? Default: yes.
- [ ] Keep the custom "known for" option in onboarding? Default: yes, saved in custom_known_for.
- [ ] Is a mobile number required for talent, and a contact phone for venues? Default: yes for every live member, so the booked side can call; create_my_profile, update_my_profile and admin_set_approval check it.
- [ ] Does a venue's name edit change its trading name? Default: yes; business_name keeps the onboarding answer.
- [ ] Is there a minimum age? Default: no check in the app; the owner looks at the date of birth before approving.

**Privacy and access**

- [ ] How long does the contact window last? Default: from booking until 48 hours after the last booked day ends.
- [ ] What can a member do after approval is taken away? Default: as set out in Who can see what → Approval.
- [ ] What happens to a paused member's booked days still to come? Default: before pausing someone with booked days ahead, the owner settles those days with both sides.
- [ ] Do unapproved members see job posts? Default: no.
- [ ] What happens to a deleted member's history? Default: bookings and messages stay, and the other side sees them as set out in Who can see what.
- [ ] Use the new wording, such as "Cancelled by the venue", "Started", "Ended", "No longer on Dyuknow", "{name} is no longer available.", "Can also do {dates}" and "Not accepted" with the reason? Default: yes. Booked people can also offer cancelled days again.
- [ ] Limit messages and shift notes to 2,000 characters, and cancel reasons to 500? Default: yes.
- [ ] One login per venue in the first release? Default: yes.

**Booking rules**

- [ ] Refuse dates more than 8 weeks ahead in the database, not just on screen? Default: yes.
- [ ] Drop Undo after I can do this, Decline and Withdraw, since the other side may already be told? Default: yes, with a confirm step before each.
- [ ] Remind only before the first booked day? Default: yes, as in the demo.
- [ ] Must a venue pick a reason to close a shift? Default: yes.

**Sign-in and the owner's workspace**

- [ ] Which address will login codes come from, and what is the site address? Default: a dyuknow.com sender such as hello@dyuknow.com, with the app on dyuknow.com.
- [ ] Should the owner be told when someone signs up? Default: no; new profiles appear on the /admin waiting list.
- [ ] Who are the admins? Default: the owner and the developer.
- [ ] Do members stay signed in until they log out? Default: yes, on each device.
- [ ] Which notices could later also become emails? Default: decided when email is added; in this build every notice is in-app.
- [ ] Which help contact does Account show, given the demo's phone and email are made up? Default: one real support email, no phone.
- [ ] Keep the browser-only demo at /preview? Default: keep it until real users arrive, then remove it.
- [ ] Build /admin, though docs/mvp-user-flow.md kept approval in database administration? Default: yes, kept to two lists, because document checks need signed links.

**Founder questions (docs/mvp-user-flow.md)**

- [ ] How far ahead do venues know they need cover? Default: up to 8 weeks.
- [ ] Is multi-day cover back-to-back or scattered? Default: up to 14 dates in any pattern within the 8 weeks.
- [ ] When does a venue insist on the same person every day, and does kitchen differ from front of house? Default: venues book per day and may mix people.
- [ ] How often do shifts run over, and who agrees the final hours? Default: the venue confirms actual hours; planned hours confirm themselves after 48 hours.
- [ ] Should late cancellations (under 24 hours) count against someone? Default: not counted; the reason is kept.
- [ ] Does the hourly rate ever differ between days of one ask? Default: one rate per ask.
- [ ] Does a venue start from "a CDP on Sunday" or from "Poppy"? Default: both, through job posts and team lists.
