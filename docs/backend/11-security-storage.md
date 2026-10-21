## Security rules and file storage

The database decides who can read and change every row; the browser, the Next.js server and the proxy only decide what to show. Every app table has row-level security (rules in the database that decide which rows each signed-in person can read). Nobody writes to a table directly, and nobody runs a function they aren't on the list for.

### Who can read each table

Each signed-in member reads only the rows below, and strangers read nothing. Who can see what owns the rules for each kind of viewer; this table is how they are written into the database.

| Table or view | Rows a member can read |
|---|---|
| members | Their own row. |
| talents, venues | Their own row, every column. |
| talent_cards | Their own card. An approved venue also reads approved talent who aren't deleted. Anyone reads the talent they share a conversation or booking with. |
| venue_cards | The mirror image: own card, approved venues for an approved talent, and venues they share a conversation or booking with. |
| availability | Their own. An approved venue also reads the rows of approved talent. |
| documents | Their own rows: type, status, file name and any reject reason. |
| positions, document_types | Any signed-in person. They're reference lists. |
| shifts, shift_days, shift_day_cover | A venue reads its own shifts. A talent reads shifts they have an answer on. An approved talent also reads open job posts from approved venues. |
| answers, answer_days | A venue reads answers on its own shifts. A talent reads their own. |
| bookings, booking_days | A venue reads bookings on its own shifts. A talent reads their own. |
| conversations, messages | The two people in the conversation. |
| conversation_reads, notifications | Their own. |
| call_receipts, admins, admin_actions | Nobody, through the app. |

The onboarding tables, talent_profiles and venue_profiles, aren't in this list. This build never reads or writes them and leaves their rules as they are (see The onboarding door stays open, below).

Admins get no extra rows from these rules, because the owner may also run a venue. Their member screens and live updates must then show only their own data. /admin reads through four admin-only functions (see Who can see what → Functions that only read), and the rest through the Supabase dashboard.

The app still filters every query by the caller's own member id, rather than trusting the rules alone to narrow the rows. Counts and lists then stay right even if a rule is wider than intended.

### Helpers the rules use

The rules use three small helpers in a private schema (a separate area of the database that the API can't reach):

- private.current_member_id(): the caller's member id.
- private.approved_member_ids(): the ids of members whose approved is true and who aren't deleted.
- private.is_admin(): whether the caller's login is listed in admins (see Admins below).

Each helper is marked stable and security definer, with an empty search path. Row rules and live updates run as the signed-in role, so that role needs these two rights, and no others in the private schema:

```sql
grant usage on schema private to authenticated;
grant execute on function private.current_member_id(), private.approved_member_ids(), private.is_admin() to authenticated;
```

- Rules call a helper inside a sub-select, as (select private.current_member_id()). Postgres then runs it once per query instead of once per row.
- The approval check uses the list form: member_id in (select private.approved_member_ids()). That also runs once per query.
- The shared steps in the private schema, such as notify and book_days, stay out of reach of every login.

### Writing: only through functions

Members have no insert, update or delete rights on any table. Every change is a database function that checks the caller and the rules, then saves in one transaction.

- Supabase gives anon (not signed in) and authenticated (signed in) full rights on new tables by default.
- A migration takes back insert, update, delete, truncate, references and trigger on every app table, and every right from anon. The default for future tables changes too, so a new table starts closed.
- Profile edits also go through functions, because every rule depends on who is calling. Which answers each function accepts is in The booking engine → create_my_profile and update_my_profile.
- Members can never set anything on their members row: approved, approved_at, user_id and side are set only by functions. Approval changes only through admin_set_approval.
- In talents and venues, members can never set member_id, onboarding_completed_at, home_area, area, display_name or photo_path. Those functions refuse unknown answer keys.

Column-level grants (database permissions on single columns) were considered and not used. A grant can say which columns, but not which values. It can't check that a position is on the list, a bio is under 250 characters, or a postcode is filled.

### Who can run each function

Every function Dyuknow adds to the database is on one list, with the role allowed to run it. Anything not on the list can't be run by any login. This list is the grant allowlist the tests check.

Two defaults must be taken back first. Postgres lets everyone (PUBLIC) run a new function.

In this project, Supabase also grants every new public function straight to anon and authenticated. So revoking from PUBLIC alone leaves both able to call it.

Build step 1 installs the extensions first, then runs:

```sql
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
alter default privileges for role postgres
  revoke execute on functions from public;
```

- The second line has no "in schema", because Postgres can't take back a right granted to everyone one schema at a time.
- Extensions go in first, so their own functions keep working.
- These defaults affect only functions made from now on. Functions that already exist, including the onboarding ones, keep their rights.
- Every function's migration then starts from nothing: it revokes all rights from public, anon and authenticated, then grants exactly the role below.

| Group | Functions | Granted to | Checked inside |
|---|---|---|---|
| Member actions | post_shift, send_to_more, say_yes, decline_request, withdraw_yes, close_shift, book_talent, cancel_days, confirm_day, open_conversation, send_message, mark_conversation_read, mark_notifications_read, set_availability, create_my_profile, update_my_profile, set_my_photo, update_my_settings, request_account_deletion, keep_my_account, save_document | authenticated | The caller's own login, member, side and approval |
| Member reads | get_booking_contact, get_badge_counts, get_busy_times, am_i_admin | authenticated | The same |
| Admin | admin_set_approval, admin_review_document, admin_list_members, admin_get_member, admin_list_documents, admin_list_stale_logins | authenticated | private.is_admin(): the caller's login is listed in admins |
| Row-rule helpers | private.current_member_id, private.approved_member_ids, private.is_admin | authenticated | They only answer questions about the caller |
| Everything else | Every other private function, such as notify, book_days and the sweep, and every trigger function Dyuknow adds | Nobody | They run only inside other functions, triggers and table checks |

- anon can run no app function. The sign-in pages need no database function.
- There is no service-role-only group in this build. Nothing in the database is written for the service-role key; the seed and wipe scripts use it from the developer's machine only (see Keys and secrets).
- The onboarding's own functions, such as valid_custom_skills and valid_dated_availability, are outside this list and keep their current rights. The onboarding form's anonymous inserts still run them as table checks.
- Functions added later, such as those for email or for deleting accounts, join this list when they are built.

Views and tables follow the same idea. talent_cards, venue_cards and shift_day_cover can be read by authenticated. App tables can be read by authenticated, through their row rules, and nothing else. anon reads nothing from the app.

A test in CI (the checks that run on every change) compares the live database with this list:

```
for each Dyuknow app function in the public and private schemas:
    who = which of anon and authenticated may run it        -- has_function_privilege
    require who matches its row in the allowlist            -- anon: never
for each app table and view in public:
    require anon has no rights at all
    require authenticated has select only, and only where the allowlist says
```

The onboarding tables and functions are left out of the test, since this build doesn't change them.

Supabase's security advisor flags any security definer function that anon or authenticated can run. The member and admin functions are expected there; any other function of the app in that list is a failure. The advisor also keeps flagging the onboarding tables' anonymous insert rules until they are closed.

### Database function rules

Every function that changes data follows the same rules, so none can be tricked into acting for someone else. These functions are security definer: they run with their owner's rights, not the caller's, which is why the rules matter.

1. Each function sets an empty search path, the list of schemas Postgres looks in for a bare table name. So it names every table with its schema, such as public.shifts, and a planted look-alike table can't be picked up.
2. The first step finds the caller from their login, with auth.uid(). A member id or actor is never taken from the input.
3. The function checks side, approval and the rules, then raises a plain-language error if anything fails. The error undoes everything in the call.
4. "Doesn't exist" and "not yours" give the same message, so nobody can probe for other people's ids.
5. Rows are locked in the order set in The booking engine → Locking.
6. Admin functions begin with private.is_admin().
7. A function returns only what the caller may see, usually ids and a status.
8. Every rule in Who can see what has a database test that signs in as each kind of viewer.

### Views that read for the viewer

Other members' profiles are read only through talent_cards and venue_cards, which hold only the columns listed in Tables. Before a booking nobody sees an address, a full postcode or a phone number, only the area.

- A view is a saved query that looks like a table. These two run with their owner's rights (security_invoker off), because they must read talents, venues and members rows the viewer can't.
- So each one checks who is asking, whether they're approved, which side they're on, and which rows match.
- Both are created with security_barrier on. Postgres then applies the view's own checks before any filter the caller adds.
- Supabase's security advisor flags views like these. They're recorded as deliberate exceptions, each with a test.
- shift_day_cover runs with the reader's rights (security_invoker on), so the shifts rules govern it. It shows counts, never names.
- Busy times come from get_busy_times. It needs an approved venue caller and a range within the next 8 weeks, and shows times, never which venue.
- Contact details come only from get_booking_contact, which checks the contact window on every call (see The booking engine).
- Never shown to another member: date of birth, a talent's full postcode, any email address, any document file or document status.

### Live updates

Realtime (Supabase's live updates) pushes new and changed rows to open apps, for three tables only. This is the one list; other sections point here.

| Table | Events sent | Why |
|---|---|---|
| notifications | New and changed rows | The bell and notice list update, and a notice read on one device clears on the others. |
| messages | New rows | New messages appear in an open chat and light the Messages dot. |
| conversation_reads | New and changed rows | Reading a chat on the phone clears the dot on the laptop. |

Deleted rows are never sent. Supabase doesn't apply row rules to delete events, so a delete would reach every subscriber with the deleted row's key. The app never deletes these rows, and the publish setting below is a second guard, which also covers the wipe script's deletes.

The migration that sets up Realtime runs:

```sql
alter publication supabase_realtime set (publish = 'insert, update');
```

- The app subscribes to inserts and updates only, with the signed-in session.
- Supabase checks each new or changed row against that member's read rule before sending it. That check runs as authenticated, which is why the helpers need their grant.
- Because admins get no extra rows, an owner who is also a member receives only their own updates.
- Other screens refresh when they come back into view, and when a notice arrives.
- If membership grows a lot, these can move to Realtime broadcast, with the same rules.

### File storage

The app's files live in two new buckets: member-photos is public, member-documents is private. Every file a member adds goes into a folder named after their login id, and members can't write into anyone else's folder.

| Bucket | Action | Allowed for | Rule |
|---|---|---|---|
| member-photos (public) | View | Anyone with the exact link | Public files. Nobody can list the bucket. |
| | Upload | A member: a login with a members row that isn't deleted | Into `<login id>`/ only, with a new random name. JPEG, PNG or WebP, at most 5 MB. At most 2 files in the folder. |
| | Delete | The member | Their own folder, except the photo their profile shows. |
| | Overwrite | Nobody | A new photo is a new file. |
| member-documents (private) | Upload | Any signed-in person, with or without a profile | Into `<login id>`/ only, named after the document type plus a random part. JPEG, PNG or PDF, at most 10 MB. At most 10 files in the folder. |
| | Open | The member | Files in their own `<login id>`/ folder only. |
| | Open | Admins | Any file. |
| | Delete | The member | Their own folder, and only files no documents row points to. |
| | Overwrite | Nobody | Replacing makes a new file. |

"Admins" here means private.is_admin(). Admins can open document files but can't add or delete any. Other deletions are done by the wipe script, or by the owner from the Storage page.

- **Documents may upload before the profile exists**, so onboarding sends them as they're chosen. They are private, so nobody can use them to host content.
- **Photos upload only once the profile exists**, then set_my_photo saves the path in photo_path. A login with no profile can't put anything in the public bucket, and a member can keep at most one spare file there.
- That cap replaces a scheduled clean-up of public files, which would need an edge function, since SQL can't delete stored files.
- So every member can replace and delete their own photo. After a replacement, the app deletes the old file at once, and an old picture never stays public.
- **Replacing a document** means uploading the new file, saving it with save_document, then deleting the old file from the member's folder.
- Documents open only through signed links, temporary addresses that stop working after 5 minutes.
- An owner query lists files no row points to; they are deleted from the Storage page. Removing a deleted member's files comes with account deletion, a later step.
- **Fake data.** The seed script uploads the fake members' photos from public/assets/ into member-photos/`<fake login id>`/, using the service-role key. The wipe script removes them.
- **The old buckets**, profile-photos and verification-documents, belong to onboarding. This build doesn't read them, write them or change their rules.

Photos stay public, by decision:

- Cards show many photos at once. Signed links would need a server round trip per photo and would defeat caching.
- A photo is something the member chose to show.
- Names are random, nobody can list the bucket, and links reach people only through the app.

### Keys and secrets

Only the publishable key ever reaches a browser. The service-role key, which bypasses every rule, stays on the developer's machine and is used only by the seed and wipe scripts. Supabase's dashboard calls it the secret key; this document calls it the service-role key, after its role, service_role.

| Key | Where it lives | What it can do | Used by |
|---|---|---|---|
| Publishable key (sb_publishable_…) | Browser and Next.js, as NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Only what the signed-in person's rules allow | The app. .env.local already holds this one. |
| Service-role key (Supabase's secret key, sb_secret_…) | The developer's machine only, as SUPABASE_SERVICE_ROLE_KEY | Everything | The seed and wipe scripts. Never in the repository, never in the app's hosting. |
| Resend SMTP key (later) | Supabase Auth SMTP settings | Send login codes from the Dyuknow domain | Supabase Auth. Entered by the owner as a later setup step (see Build order and open decisions). |

- The Next.js app, /admin included, never holds the service-role key. The admin page calls admin functions as the signed-in admin.
- No key is written into the repository.

The project still has the older keys switched on: a JWT-style anon key and service_role key. The seed and wipe scripts use the new secret key. Once nothing uses the older keys, they are switched off at launch.

The new keys are better because each can be rotated on its own. The older service_role key can't be rotated without rotating everything signed with it.

### Test sign-in

Real sign-in is an email and a 6-digit code. For testing, /login also shows an email-and-password "test sign-in" form, but only when NEXT_PUBLIC_DEV_LOGIN is true.

- NEXT_PUBLIC_DEV_LOGIN must be off in production. It is set only in local and preview environments.
- Only the seeded fake logins, with `@example.com` addresses, have passwords. Real logins never have one, so the form can't sign them in.
- The flag only hides the form; Supabase's password sign-in stays switched on for the project. That is safe because the only passwords belong to fake accounts, and the wipe script removes them before real users are imported.

### Admins: a table

Admins are the logins listed in the admins table, checked live on every call. private.is_admin() is true when the caller's login is in admins, and nothing else.

- Every admin function and the admin storage rule use it.
- **Why a table, not a login label.** A label in the login's app_metadata is copied into the session token. It lingers there until the token renews, up to an hour. Removing a row from admins works on the very next call.
- The table is easy to read in SQL. Rows are added only by SQL in the Supabase dashboard; adding the owner's login is one SQL line in the setup checklist.
- am_i_admin tells the app whether the caller passes private.is_admin() (is_admin). It answers only about the caller.
- An admin can approve anyone and open every document, so the admin's mailbox is the key to it. The owner's Supabase account and mailbox should both use two-step sign-in.

### Open sign-up: limits and abuse protection

Anyone can create a login, so the defences assume strangers will. The main one is approval: an unapproved login sees nobody and reaches nobody.

- **Sign-in limits** (Supabase Auth): one code per email per minute, codes expire in 10 minutes, and code checks are limited per internet address. The project's hourly email limit is raised once Resend SMTP is set; until then Supabase's built-in email sends only a few codes an hour, which is one reason test sign-in uses passwords.
- There is no spam check on code requests in this build. A script could use up the hourly code limit, so nobody could sign in for that hour. If that happens, a spam check can be added later.
- **One profile per login:** members.user_id is unique.
- **Files:** type and size limits per bucket, own folder only. At most 2 photos per member, and nothing public before a profile exists. At most 10 documents per login.
- **Lists:** the API returns at most 1,000 rows per request, and every long list is paged.
- **Text:** bio 250 characters; shift note and message 2,000.
- **Email:** the only emails in this build are login codes, sent by Supabase Auth to the address that asked.
- **Watching:** for the first month, the owner looks weekly at the Supabase Auth logs, and at Resend's bounce and complaint rates once Resend is set up.
- **Clean-up:** admin_list_stale_logins lists logins with no members row after 7 days. The owner removes them from the Supabase dashboard.

Limits on how often one member can act, such as messages a minute, wait until later. With a handful of hand-approved members, approval is the defence.

### The onboarding door stays open

The onboarding tables (talent_profiles, venue_profiles), the old buckets (profile-photos, verification-documents) and /admin/onboarding keep their current anonymous insert and upload rules during this build. This is a known open door: anyone on the internet can still add onboarding rows and files without signing in, as today. It is closed later, when the real users are imported into the app tables.

The new app tables and buckets never allow anonymous access.
