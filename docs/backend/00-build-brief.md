# Build brief for every agent working on the Dyuknow backend

Read this first. The design lives in the other files in this folder (01 is the
overview in the Claude Doc; 02–12 are copied here). Where this brief and those
files disagree, this brief wins, because it describes what is already built.

## Hard rules

- NEVER read, write, alter or drop `public.talent_profiles`, `public.venue_profiles`,
  the `profile-photos` / `verification-documents` buckets, their policies, or their
  functions (`valid_custom_skills`, `valid_dated_availability`). `/admin/onboarding`
  stays as it is. Their counts are 10 talent rows, 8 venue rows, 53 files; check
  they are unchanged after any migration you apply.
- Members never write to tables directly. Every change is a `SECURITY DEFINER`
  function with `set search_path = ''`, fully qualified names (`public.shifts`),
  finding the caller with `private.require_member()` / `auth.uid()`, never from input.
- Every function you add: `revoke all on function ... from public, anon, authenticated;`
  then `grant execute ... to authenticated` only if the app calls it. Internal steps
  go in schema `private` and get no grant.
- Refusals: `raise exception '<plain message from the design doc>';` (SQLSTATE P0001).
  The app shows the message as it is. The capacity trigger raises SQLSTATE `DK001`;
  the double-booking exclusion constraint raises `23P01`
  (constraint `booking_days_no_overlap`). Catch these and re-raise the plain
  messages the design gives.
- Never print or commit secret keys (`.env.local` holds `SUPABASE_SERVICE_ROLE_KEY`
  and `SEED_PASSWORD`; read them only from scripts).
- Fake data uses only `@example.com` logins, plus the admin `admin@dyuknow.com`.

## What already exists (applied to the live project)

Migrations in `supabase/migrations/20261021*`:
- Tables: positions, document_types (7 rows), members, talents, venues, availability,
  documents, admins, admin_actions, notifications, call_receipts, shifts, shift_days,
  answers, answer_days, bookings, booking_days, conversations, messages,
  conversation_reads. Columns as in 03-tables.md, with these specifics:
  - `members.approved` boolean, required, default false; an approval trigger
    (`private.on_approval_change`) sets `approved_at`, logs approve/unapprove in
    admin_actions and sends the `approved` notice. Pass the admin's login id and a
    note with `set_config('dyuknow.admin_user_id', ..., true)` and
    `set_config('dyuknow.admin_note', ..., true)` before updating.
  - `talents.minimum_same_day_rate_gbp` (numeric pounds) is the minimum pay venues see.
  - `booking_days` has the exclusion constraint and the capacity trigger
    (`private.booking_days_capacity`) that keeps `shift_days.booked_count`.
- Views: `talent_cards`, `venue_cards` (owner rights, self-filtering), `shift_day_cover`.
- RLS select policies for authenticated on every app table; no write grants.
- Buckets `member-photos` (public, 5 MB, jpeg/png/webp, `<login id>/` folders, max 2
  files) and `member-documents` (private, 10 MB, jpeg/png/pdf, max 10 files).
- Realtime publication: notifications, messages, conversation_reads (insert, update).
- Extensions: btree_gist, pg_cron (pg_net not installed, not needed).

Private helpers you can call:
- `private.require_member()` returns the caller's `public.members` row or raises
  "Sign in to continue." / "Create your profile first."
- `private.current_member_id()`, `private.approved_member_ids()`, `private.is_admin()`.
- `private.london_instant(date, time)` -> timestamptz, refusing clock-change times.
- `private.london_date(timestamptz)` -> London date.
- `private.notify(member, kind, title, body, target, actor, shift, booking)` writes
  one in-app notice (skips deleted members). The caller builds the wording
  (07-notifications.md "Every event").
- `private.conversation_for(venue, talent)` -> conversation id (find or start).
- `private.add_message(conversation, kind, sender, body, shift)`,
  `private.add_card(shift, talent, sender, body)`, `private.add_event(shift, talent, body)`.
- `private.receipt_begin(member, client_ref, fn_name)` returns null to go ahead or
  the stored jsonb result for a repeat tap; `private.receipt_end(member, client_ref, result)`
  stores the result and returns it.

## How to apply and record a migration

1. Write the SQL in a file under `supabase/migrations/` named `app_NN_<name>.sql.tmp`.
2. Apply it with the Supabase MCP tool `apply_migration` (name `app_NN_<name>`).
3. Read the recorded version:
   `select version from supabase_migrations.schema_migrations where name = 'app_NN_<name>'`
   and rename the file to `<version>_app_NN_<name>.sql`.
4. Fixing a function later: write a new migration with `create or replace function`.
   Never edit an applied migration file.

## How to test against the live database without leaving anything behind

Run everything inside one transaction that ends in `rollback`, with `execute_sql`:

```sql
begin;
insert into auth.users (id, instance_id, aud, role, email) values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','t1@example.com');
-- insert members / talents / venues / shifts as the owner here
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select public.some_function(...);       -- acts as that user
reset role;                             -- back to owner to inspect
select ... ;
rollback;
```

To switch user inside the same test, `reset role`, then set the claims again and
`set local role authenticated`. Keep each test file in `supabase/tests/<area>.sql`
as a series of `do $$ ... assert ... $$` blocks inside `begin ... rollback`, so it can
be re-run any time with execute_sql. A test must leave zero rows behind.

## Ownership (so parallel agents don't collide)

- Agent A (booking engine): every function in 05-booking-engine.md under Shared steps,
  Shifts and answers, Bookings, plus `get_booking_contact`, `get_busy_times`,
  `get_badge_counts`, `admin_set_approval`, the sweep and daily tidy (06), and the
  pg_cron jobs. Migrations `app_10_*` to `app_29_*`. Tests `supabase/tests/booking*.sql`.
- Agent B (profiles, messages, admin): `create_my_profile`, `update_my_profile`,
  `set_my_photo`, `update_my_settings`, `request_account_deletion`, `keep_my_account`,
  `save_document`, `set_availability`, `open_conversation`, `send_message`,
  `mark_conversation_read`, `mark_notifications_read`, `am_i_admin`,
  `admin_review_document`, `admin_list_members`, `admin_get_member`,
  `admin_list_documents`, `admin_list_stale_logins`. Migrations `app_30_*` to `app_49_*`.
  Tests `supabase/tests/profile*.sql`, `messages*.sql`, `admin*.sql`.
- Agent C (app data layer), D (sign-in + /join), E (/admin page), F (seed + wipe):
  front-end and scripts only; they don't apply migrations. If they need a database
  change, they write it down in their final report.

## Function signatures (agreed, so the front end can code against them now)

All take named arguments (supabase-js `rpc('name', { p_x: ... })`) and return jsonb
unless noted. Arguments are prefixed `p_`.

Agent A:
- `post_shift(p_team text, p_positions text[], p_dates date[], p_start_time time, p_end_time time, p_capacity int, p_rate_pence int, p_note text, p_to uuid[], p_client_ref uuid)` -> `{shift_id, mode, in_position_count, alerted_count}`
- `send_to_more(p_shift_id uuid, p_talent_ids uuid[], p_client_ref uuid)` -> `{sent}`
- `say_yes(p_shift_id uuid, p_dates date[], p_client_ref uuid)` -> `{result: 'booked'|'said-yes', booking_id}`
- `decline_request(p_shift_id uuid, p_client_ref uuid)` -> `{shift_status}`
- `withdraw_yes(p_shift_id uuid, p_client_ref uuid)` -> `{shift_status}`
- `close_shift(p_shift_id uuid, p_reason text, p_client_ref uuid)` -> `{}`
- `book_talent(p_shift_id uuid, p_talent_id uuid, p_dates date[], p_client_ref uuid)` -> `{booking_id, shift_status}`
- `cancel_days(p_booking_id uuid, p_dates date[], p_reason text, p_client_ref uuid)` -> `{booking_status, shift_status}`
- `confirm_day(p_booking_id uuid, p_day_date date, p_outcome text, p_start_time time, p_end_time time, p_client_ref uuid)` -> `{worked_minutes, pay_pence}`
- `get_booking_contact(p_booking_id uuid)` -> `{street_address, postcode, contact_name, contact_position, contact_phone}` or `{mobile_number}`, plus `window_closes_at`
- `get_busy_times(p_talent_ids uuid[], p_from date, p_to date)` -> table(talent_id uuid, starts_at timestamptz, ends_at timestamptz)
- `get_badge_counts()` -> `{unread_notifications, unread_conversation_ids, needs_you, account_attention}`
- `admin_set_approval(p_member_id uuid, p_approved boolean, p_note text)` -> `{}`

Agent B:
- `create_my_profile(p_side text, p_answers jsonb, p_files jsonb, p_availability jsonb)` -> `{member_id, side, approved}`
  (`p_files`: `[{kind, storage_path, original_filename}]`; `p_availability`: `[{day_date, kind, start_time, end_time}]`)
- `update_my_profile(p_changes jsonb)` -> `{}` (keys as in 05: talent `full_name, bio, home_postcode, positions, skills, custom_skills, mobile_number, minimum_same_day_rate_gbp`; venue `name, bio, street_address, postcode, contact_name, contact_position, contact_phone, venue_types, cuisines, instagram_handle`)
- `set_my_photo(p_storage_path text)` -> `{old_path}`
- `update_my_settings(p_shift_alerts text)` -> `{}`
- `request_account_deletion()` -> `{requested_at}`, `keep_my_account()` -> `{}`
- `save_document(p_doc_type text, p_storage_path text, p_original_filename text)` -> `{document_id, old_path}`
- `set_availability(p_dates date[], p_kind text, p_start_time time, p_end_time time)` -> `{saved}`
- `open_conversation(p_other_member_id uuid)` -> `{conversation_id}`
- `send_message(p_conversation_id uuid, p_body text, p_client_ref uuid)` -> `{message_id, seq}`
- `mark_conversation_read(p_conversation_id uuid, p_up_to_seq int)` -> `{}`
- `mark_notifications_read(p_ids bigint[], p_target text)` -> `{marked}` (both null = all)
- `am_i_admin()` -> `{is_admin}`
- `admin_review_document(p_document_id uuid, p_verdict text, p_reason text)` -> `{}`
- `admin_list_members(p_status text)`, `admin_get_member(p_member_id uuid)`, `admin_list_documents(p_status text)`, `admin_list_stale_logins(p_older_than_days int)` -> jsonb arrays/objects
- `get_document_url` is not a function: admins and owners open files with Storage
  `createSignedUrl(path, 300)`; the bucket policy already allows it.
