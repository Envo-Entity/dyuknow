-- Place names instead of postcodes, and the Needs-you count stops nagging once
-- the venue has asked someone else to cover a cancelled day.

alter table public.talents add column area_name text check (char_length(area_name) <= 80);
alter table public.venues add column area_name text check (char_length(area_name) <= 80);
comment on column public.talents.area_name is 'Place name from the home postcode (e.g. Richmond upon Thames), shown to others instead of a postcode.';
comment on column public.venues.area_name is 'Place name from the postcode (e.g. Kensington and Chelsea), shown to talent before a booking.';

-- The app looks the name up from the postcode and saves it here.
create function public.set_my_area_name(p_area_name text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare m public.members := private.require_member(); v text := nullif(btrim(p_area_name), '');
begin
  if v is not null and char_length(v) > 80 then
    raise exception 'Check your answers and try again.';
  end if;
  if m.side = 'talent' then
    update public.talents set area_name = v where member_id = m.id;
  else
    update public.venues set area_name = v where member_id = m.id;
  end if;
  return '{}'::jsonb;
end $$;
revoke all on function public.set_my_area_name(text) from public, anon, authenticated;
grant execute on function public.set_my_area_name(text) to authenticated;

-- Cards gain the place name (added at the end so existing columns keep their places).
create or replace view public.talent_cards with (security_barrier = true) as
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
    (m.approved and m.deleted_at is null) as active,
    case when m.deleted_at is null then t.area_name end as area_name
  from public.members m join public.talents t on t.member_id = m.id
  where m.id = (select private.current_member_id())
     or (m.approved and m.deleted_at is null and (select private.caller_is_approved('venue')))
     or m.id in (select private.contact_member_ids());

create or replace view public.venue_cards with (security_barrier = true) as
  select m.id as member_id,
    case when m.deleted_at is null then v.display_name else 'Former member' end as display_name,
    case when m.deleted_at is null then v.photo_path end as photo_path,
    case when m.deleted_at is null then v.area end as area,
    case when m.deleted_at is null then v.bio end as bio,
    case when m.deleted_at is null then v.venue_types else '{}'::text[] end as venue_types,
    case when m.deleted_at is null then v.cuisines else '{}'::text[] end as cuisines,
    case when m.deleted_at is null then v.instagram_handle end as instagram_handle,
    case when m.deleted_at is null then private.verified_labels(m.id) else '{}'::text[] end as verified_documents,
    (m.approved and m.deleted_at is null) as active,
    case when m.deleted_at is null then v.area_name end as area_name
  from public.members m join public.venues v on v.member_id = m.id
  where m.id = (select private.current_member_id())
     or (m.approved and m.deleted_at is null and (select private.caller_is_approved('talent')))
     or m.id in (select private.contact_member_ids());

revoke all on public.talent_cards, public.venue_cards from anon, authenticated;
grant select on public.talent_cards, public.venue_cards to authenticated;

-- Needs you: a cancelled day that is open again counts only while nobody has
-- been asked to cover it (no one invited and waiting to answer).
create or replace function public.get_badge_counts()
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  me public.members;
  t timestamptz := clock_timestamp();
  v_unread int;
  v_convs uuid[];
  v_needs int := 0;
  v_attention boolean;
begin
  select * into me from public.members where user_id = auth.uid() and deleted_at is null;
  if not found then
    return jsonb_build_object('unread_notifications', 0, 'unread_conversation_ids', '[]'::jsonb,
                              'needs_you', 0, 'account_attention', false);
  end if;

  select count(*) into v_unread from public.notifications where member_id = me.id and read_at is null;

  select coalesce(array_agg(c.id order by c.last_message_at desc nulls last), '{}') into v_convs
  from public.conversations c
  left join public.conversation_reads r on r.conversation_id = c.id and r.member_id = me.id
  where me.id in (c.venue_id, c.talent_id)
    and exists (select 1 from public.messages mg
                where mg.conversation_id = c.id and mg.kind in ('text','card')
                  and mg.sender_id is not null and mg.sender_id <> me.id
                  and mg.seq > coalesce(r.last_read_seq, 0));

  if me.side = 'talent' then
    if me.approved then
      select count(*) into v_needs
      from public.answers a
      where a.talent_id = me.id and a.status = 'invited'
        and private.shift_state_now(a.shift_id, t) = 'open'
        and cardinality(private.free_days(me.id, a.shift_id, t)) > 0;
    end if;
  else
    select count(*) into v_needs
    from public.bookings b join public.shifts s on s.id = b.shift_id
    where s.venue_id = me.id
      and exists (select 1 from public.booking_days bd
                  where bd.booking_id = b.id and bd.status = 'booked'
                    and bd.ends_at <= t and bd.ends_at + interval '48 hours' > t);
    if me.approved then
      v_needs := v_needs + (
        select count(*) from public.shifts s
        where s.venue_id = me.id and private.shift_state_now(s.id, t) = 'open'
          and (exists (select 1 from public.answers a join public.members m on m.id = a.talent_id
                       where a.shift_id = s.id and a.status in ('can-cover','booked')
                         and m.approved and m.deleted_at is null
                         and cardinality(private.bookable_days(a.id, t)) > 0)
               or (exists (select 1 from public.booking_days bd
                           where bd.shift_id = s.id and bd.status = 'cancelled'
                             and bd.shift_day_id = any(private.open_days(s.id, t)))
                   and not exists (select 1 from public.answers a
                                   where a.shift_id = s.id and a.status = 'invited'))));
    end if;
  end if;

  select exists (select 1 from public.documents where member_id = me.id and status = 'rejected') into v_attention;

  return jsonb_build_object('unread_notifications', v_unread, 'unread_conversation_ids', to_jsonb(v_convs),
                            'needs_you', v_needs, 'account_attention', v_attention);
end $function$;
