-- Dyuknow app backend, step 13: the booking reads (get_booking_contact,
-- get_busy_times, get_badge_counts) and admin_set_approval.

-- ---------------------------------------------------------------------------
-- get_booking_contact: the other side's contact details, in the contact window.
-- ---------------------------------------------------------------------------
create function public.get_booking_contact(p_booking_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  me public.members;
  v_shift public.shifts;
  b public.bookings;
  v_last timestamptz;
  v_closes timestamptz;
  v public.venues;
  tl public.talents;
begin
  me := private.require_member();
  select * into b from public.bookings where id = p_booking_id;
  if found then
    select * into v_shift from public.shifts where id = b.shift_id;
    select max(ends_at) into v_last from public.booking_days where booking_id = b.id and status <> 'cancelled';
    v_closes := v_last + interval '48 hours';
  end if;
  if not me.approved or b.id is null or b.status <> 'active' or me.id not in (b.talent_id, v_shift.venue_id)
     or v_closes is null or clock_timestamp() >= v_closes then
    raise exception 'Contact details aren’t available for this booking.';
  end if;
  if me.id = b.talent_id then
    select * into v from public.venues where member_id = v_shift.venue_id;
    return jsonb_build_object('street_address', v.street_address, 'postcode', v.postcode,
                              'contact_name', v.contact_name, 'contact_position', v.contact_position,
                              'contact_phone', v.contact_phone, 'window_closes_at', v_closes);
  end if;
  select * into tl from public.talents where member_id = b.talent_id;
  return jsonb_build_object('mobile_number', tl.mobile_number, 'window_closes_at', v_closes);
end $$;

-- ---------------------------------------------------------------------------
-- get_busy_times: when talent are booked, never where. Approved venues only.
-- ---------------------------------------------------------------------------
create function public.get_busy_times(p_talent_ids uuid[], p_from date, p_to date)
returns table (talent_id uuid, starts_at timestamptz, ends_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  me public.members;
  v_today date := private.london_date(clock_timestamp());
  v_ids uuid[];
begin
  me := private.require_member();
  if me.side <> 'venue' then
    raise exception 'Only venues can see when people are booked.';
  end if;
  if not me.approved then
    raise exception 'Your profile is waiting for approval.';
  end if;
  select coalesce(array_agg(distinct x), '{}') into v_ids from unnest(p_talent_ids) x where x is not null;
  if cardinality(v_ids) = 0 then
    return;
  end if;
  if cardinality(v_ids) > 100 then
    raise exception 'Choose up to 100 people.';
  end if;
  if p_from is null or p_to is null or p_from < v_today or p_to > v_today + 55 or p_from > p_to then
    raise exception 'Choose dates in the next 8 weeks.';
  end if;
  return query
    select bd.talent_id, bd.starts_at, bd.ends_at
    from public.booking_days bd
    join public.members m on m.id = bd.talent_id
    where bd.talent_id = any(v_ids)
      and m.side = 'talent' and m.approved and m.deleted_at is null
      and bd.status <> 'cancelled'
      and bd.starts_at < ((p_to + 1)::timestamp at time zone 'Europe/London')
      and bd.ends_at > (p_from::timestamp at time zone 'Europe/London')
    order by bd.talent_id, bd.starts_at;
end $$;

-- ---------------------------------------------------------------------------
-- get_badge_counts: every red dot and the needs-you count in one read.
-- ---------------------------------------------------------------------------
create function public.get_badge_counts()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
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
               or exists (select 1 from public.booking_days bd
                          where bd.shift_id = s.id and bd.status = 'cancelled'
                            and bd.shift_day_id = any(private.open_days(s.id, t)))));
    end if;
  end if;

  select exists (select 1 from public.documents where member_id = me.id and status = 'rejected') into v_attention;

  return jsonb_build_object('unread_notifications', v_unread, 'unread_conversation_ids', to_jsonb(v_convs),
                            'needs_you', v_needs, 'account_attention', v_attention);
end $$;

-- ---------------------------------------------------------------------------
-- admin_set_approval: approve a member, or take approval away and end what
-- they had waiting.
-- ---------------------------------------------------------------------------
create function private.waiting_shifts_of(p_member uuid)
returns uuid[] language sql stable security definer set search_path = '' as $$
  select coalesce(array_agg(distinct x), '{}') from (
    select a.shift_id as x from public.answers a
     where a.talent_id = p_member and a.status in ('invited','can-cover')
    union
    select s.id from public.shifts s where s.venue_id = p_member and s.status = 'open') z;
$$;

create function private.admin_set_approval_work(p_member uuid, p_approved boolean, p_note text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  t timestamptz;
  m public.members;
  v_shifts uuid[];
  v_missing text[];
  r record;
begin
  perform set_config('dyuknow.admin_user_id', auth.uid()::text, true);
  perform set_config('dyuknow.admin_note', coalesce(p_note, ''), true);
  if p_approved then
    perform private.lock_set('{}', array[p_member]);
    select * into m from public.members where id = p_member;
    if not found or m.deleted_at is not null then
      raise exception 'That member can’t be found.';
    end if;
    v_missing := private.profile_missing_fields(p_member);
    if cardinality(v_missing) > 0 then
      raise exception 'This profile is missing: %.', array_to_string(v_missing, ', ');
    end if;
    if not m.approved then
      update public.members set approved = true where id = p_member;
    end if;
    return '{}'::jsonb;
  end if;

  v_shifts := private.waiting_shifts_of(p_member);
  perform private.lock_set(v_shifts, array[p_member]);
  perform private.restart_if_grown(v_shifts, private.waiting_shifts_of(p_member));
  t := private.settle_all(v_shifts);
  select * into m from public.members where id = p_member;
  if not found or m.deleted_at is not null then
    raise exception 'That member can’t be found.';
  end if;
  if m.approved then
    update public.members set approved = false where id = p_member;
  end if;
  if m.side = 'talent' then
    for r in select a.id from public.answers a
             where a.talent_id = p_member and a.status in ('invited','can-cover') order by a.shift_id loop
      perform private.end_unavailable(r.id, t);
    end loop;
  else
    for r in select s.id from public.shifts s
             where s.venue_id = p_member and s.status = 'open' order by s.id loop
      perform private.close_for_dyuknow(r.id, t);
    end loop;
  end if;
  return '{}'::jsonb;
end $$;

create function public.admin_set_approval(p_member_id uuid, p_approved boolean, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v jsonb; n int := 0;
begin
  if not private.is_admin() then
    raise exception 'Only Dyuknow can do this.';
  end if;
  if p_approved is null then
    raise exception 'Check your answers and try again.';
  end if;
  loop
    begin
      perform private.buf_reset();
      v := private.admin_set_approval_work(p_member_id, p_approved, p_note);
      perform private.buf_flush();
      exit;
    exception when deadlock_detected or sqlstate 'DK002' then
      n := n + 1;
      if n >= 3 then raise exception 'Couldn’t save. Try again.'; end if;
    end;
  end loop;
  return v;
end $$;

revoke all on function private.waiting_shifts_of(uuid), private.admin_set_approval_work(uuid, boolean, text)
  from public, anon, authenticated;
revoke all on function public.get_booking_contact(uuid), public.get_busy_times(uuid[], date, date),
  public.get_badge_counts(), public.admin_set_approval(uuid, boolean, text)
  from public, anon, authenticated;
grant execute on function public.get_booking_contact(uuid), public.get_busy_times(uuid[], date, date),
  public.get_badge_counts(), public.admin_set_approval(uuid, boolean, text)
  to authenticated;
