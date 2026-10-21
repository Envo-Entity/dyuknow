-- Dyuknow app backend, step 4: who can read what. Nobody writes to these tables
-- directly; every change goes through a database function.

do $$
declare t text;
begin
  foreach t in array array[
    'positions','document_types','members','talents','venues','availability','documents',
    'admins','admin_actions','notifications','call_receipts','shifts','shift_days','answers',
    'answer_days','bookings','booking_days','conversations','messages','conversation_reads']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
  end loop;
  foreach t in array array[
    'positions','document_types','members','talents','venues','availability','documents',
    'notifications','shifts','shift_days','answers','answer_days','bookings','booking_days',
    'conversations','messages','conversation_reads']
  loop
    execute format('grant select on table public.%I to authenticated', t);
  end loop;
end $$;

-- Reference lists: any signed-in person.
create policy positions_read on public.positions for select to authenticated using (true);
create policy document_types_read on public.document_types for select to authenticated using (true);

-- Own rows.
create policy members_own on public.members for select to authenticated
  using (user_id = (select auth.uid()));
create policy talents_own on public.talents for select to authenticated
  using (member_id = (select private.current_member_id()));
create policy venues_own on public.venues for select to authenticated
  using (member_id = (select private.current_member_id()));
create policy documents_own on public.documents for select to authenticated
  using (member_id = (select private.current_member_id()));
create policy notifications_own on public.notifications for select to authenticated
  using (member_id = (select private.current_member_id()));
create policy conversation_reads_own on public.conversation_reads for select to authenticated
  using (member_id = (select private.current_member_id()));

-- Is the caller an approved venue (or talent)?
create function private.caller_is_approved(p_side text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.members
                 where user_id = auth.uid() and side = p_side and approved and deleted_at is null);
$$;
revoke all on function private.caller_is_approved(text) from public, anon;
grant execute on function private.caller_is_approved(text) to authenticated;

-- Availability: own, and approved talent's rows for an approved venue.
create policy availability_read on public.availability for select to authenticated
  using (member_id = (select private.current_member_id())
         or ((select private.caller_is_approved('venue'))
             and member_id in (select private.approved_member_ids())));

-- Shifts a member may see: a venue's own; ones a talent has an answer on;
-- open job posts from approved venues for an approved talent.
create function private.visible_shift_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  with me as (select id, side, approved from public.members where user_id = auth.uid() and deleted_at is null)
  select s.id from public.shifts s, me where me.side = 'venue' and s.venue_id = me.id
  union
  select a.shift_id from public.answers a, me where me.side = 'talent' and a.talent_id = me.id
  union
  select s.id from public.shifts s, me
   where me.side = 'talent' and me.approved and s.mode = 'post' and s.status = 'open'
     and s.venue_id in (select id from public.members where approved and deleted_at is null);
$$;
revoke all on function private.visible_shift_ids() from public, anon;
grant execute on function private.visible_shift_ids() to authenticated;

create policy shifts_read on public.shifts for select to authenticated
  using (id in (select private.visible_shift_ids()));
create policy shift_days_read on public.shift_days for select to authenticated
  using (shift_id in (select private.visible_shift_ids()));

-- Answers and bookings: a venue sees those on its own shifts; talent their own.
create function private.own_shift_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select s.id from public.shifts s
  where s.venue_id = (select id from public.members where user_id = auth.uid() and deleted_at is null);
$$;
revoke all on function private.own_shift_ids() from public, anon;
grant execute on function private.own_shift_ids() to authenticated;

create policy answers_read on public.answers for select to authenticated
  using (talent_id = (select private.current_member_id()) or shift_id in (select private.own_shift_ids()));
create policy answer_days_read on public.answer_days for select to authenticated
  using (answer_id in (select id from public.answers));
create policy bookings_read on public.bookings for select to authenticated
  using (talent_id = (select private.current_member_id()) or shift_id in (select private.own_shift_ids()));
create policy booking_days_read on public.booking_days for select to authenticated
  using (talent_id = (select private.current_member_id()) or shift_id in (select private.own_shift_ids()));

-- Conversations and messages: the two people.
create policy conversations_read on public.conversations for select to authenticated
  using ((select private.current_member_id()) in (venue_id, talent_id));
create policy messages_read on public.messages for select to authenticated
  using (conversation_id in (select id from public.conversations));

-- ---------------------------------------------------------------------------
-- Cards: the only way members see each other's profiles.
-- ---------------------------------------------------------------------------
-- Members who share a conversation or a booking with the caller.
create function private.contact_member_ids()
returns setof uuid language sql stable security definer set search_path = '' as $$
  with me as (select id from public.members where user_id = auth.uid() and deleted_at is null)
  select c.venue_id from public.conversations c, me where c.talent_id = me.id
  union select c.talent_id from public.conversations c, me where c.venue_id = me.id
  union select b.talent_id from public.bookings b join public.shifts s on s.id = b.shift_id, me where s.venue_id = me.id
  union select s.venue_id from public.bookings b join public.shifts s on s.id = b.shift_id, me where b.talent_id = me.id
  union select a.talent_id from public.answers a join public.shifts s on s.id = a.shift_id, me where s.venue_id = me.id
  union select s.venue_id from public.answers a join public.shifts s on s.id = a.shift_id, me where a.talent_id = me.id;
$$;
revoke all on function private.contact_member_ids() from public, anon;
grant execute on function private.contact_member_ids() to authenticated;

-- Verified, public document labels per member.
create function private.verified_labels(p_member uuid)
returns text[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(t.label order by t.sort_order), '{}')
  from public.documents d join public.document_types t on t.code = d.doc_type
  where d.member_id = p_member and d.status = 'verified' and t.public_tick;
$$;
revoke all on function private.verified_labels(uuid) from public, anon;
grant execute on function private.verified_labels(uuid) to authenticated;

create view public.talent_cards with (security_barrier = true) as
  select m.id as member_id,
    case when m.deleted_at is null then t.full_name else 'Former member' end as full_name,
    case when m.deleted_at is null then t.photo_path end as photo_path,
    case when m.deleted_at is null then t.positions else '{}'::text[] end as positions,
    case when m.deleted_at is null then t.skills else '{}'::text[] end as skills,
    case when m.deleted_at is null then t.custom_skills else '{}'::text[] end as custom_skills,
    case when m.deleted_at is null then t.home_area end as home_area,
    case when m.deleted_at is null then t.bio end as bio,
    case when m.deleted_at is null then round(t.minimum_same_day_rate_gbp * 100)::integer end as minimum_pay_pence,
    case when m.deleted_at is null then private.verified_labels(m.id) else '{}'::text[] end as verified_documents,
    (m.approved and m.deleted_at is null) as active
  from public.members m join public.talents t on t.member_id = m.id
  where m.id = (select private.current_member_id())
     or (m.approved and m.deleted_at is null and (select private.caller_is_approved('venue')))
     or m.id in (select private.contact_member_ids());

create view public.venue_cards with (security_barrier = true) as
  select m.id as member_id,
    case when m.deleted_at is null then v.display_name else 'Former member' end as display_name,
    case when m.deleted_at is null then v.photo_path end as photo_path,
    case when m.deleted_at is null then v.area end as area,
    case when m.deleted_at is null then v.bio end as bio,
    case when m.deleted_at is null then v.venue_types else '{}'::text[] end as venue_types,
    case when m.deleted_at is null then v.cuisines else '{}'::text[] end as cuisines,
    case when m.deleted_at is null then v.instagram_handle end as instagram_handle,
    case when m.deleted_at is null then private.verified_labels(m.id) else '{}'::text[] end as verified_documents,
    (m.approved and m.deleted_at is null) as active
  from public.members m join public.venues v on v.member_id = m.id
  where m.id = (select private.current_member_id())
     or (m.approved and m.deleted_at is null and (select private.caller_is_approved('talent')))
     or m.id in (select private.contact_member_ids());

-- Places left per day, without names; runs with the reader's own rights.
create view public.shift_day_cover with (security_invoker = true) as
  select d.id as shift_day_id, d.shift_id, d.day_date, d.starts_at, d.ends_at,
         s.capacity, d.booked_count, (s.capacity - d.booked_count)::integer as places_left,
         (d.booked_count < s.capacity and d.starts_at > now()) as is_open
  from public.shift_days d join public.shifts s on s.id = d.shift_id;

revoke all on public.talent_cards, public.venue_cards, public.shift_day_cover from anon, authenticated;
grant select on public.talent_cards, public.venue_cards, public.shift_day_cover to authenticated;
