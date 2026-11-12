-- Dyuknow email, step 1: the outbox, and what queues into it.
--
-- Emails are written to public.email_outbox in the same transaction as the
-- change they report, then the send-emails edge function sends them through
-- Resend (see docs/backend/07-notifications.md -> Email).
--
--   notify()                      booking emails, next to the in-app notice
--   members insert (at commit)    welcome-talent / welcome-venue, once per member
--   hourly cron                   complete-account, once per login
--
-- account-ready is sent by hand (scripts/send-welcome.mjs) and never queued here.

-- ---------------------------------------------------------------------------
-- The outbox
-- ---------------------------------------------------------------------------
create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references public.members (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  notification_id bigint references public.notifications (id) on delete set null,
  to_email text,
  kind text not null,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempts int not null default 0,
  next_try_at timestamptz not null default now(),
  claimed_at timestamptz,
  resend_id text,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint email_outbox_recipient check (member_id is not null or user_id is not null)
);
comment on table public.email_outbox is
  'Emails waiting for, or already given to, Resend. Written by database functions; sent by the send-emails edge function. No member access.';

-- One welcome per member and one complete-account per login, ever.
create unique index email_outbox_one_welcome on public.email_outbox (member_id)
  where kind in ('welcome-talent', 'welcome-venue');
create unique index email_outbox_one_complete_account on public.email_outbox (user_id)
  where kind = 'complete-account';
create index email_outbox_due on public.email_outbox (next_try_at) where status = 'pending';
create index email_outbox_member on public.email_outbox (member_id);
create index email_outbox_user on public.email_outbox (user_id);
create index email_outbox_notification on public.email_outbox (notification_id);

alter table public.email_outbox enable row level security;
revoke all on public.email_outbox from public, anon, authenticated;
grant select, insert, update, delete on public.email_outbox to service_role;

-- ---------------------------------------------------------------------------
-- Booking emails: the template's data, built when the notice is written
-- ---------------------------------------------------------------------------
-- Names, labels and dates are fixed at this moment, like the notice's own text.
-- p_body is the notice's second line; said-yes takes its dates from it, since
-- that is exactly what the talent offered this time.
create function private.email_data(
  p_kind text, p_member uuid, p_side text, p_body text, p_target text,
  p_actor uuid, p_shift uuid, p_booking uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  s public.shifts;
  d jsonb;
  v_positions text;
  v_hours text;
  v_rest text;
  v_cut int;
  v_days uuid[];
  v_reason text;
  v_talent uuid;
  v_all int;
  ri record;
begin
  select * into s from public.shifts where id = p_shift;
  v_positions := private.shift_label(s.positions);
  v_hours := private.shift_hours(s.id);
  d := jsonb_build_object(
    'member_id', p_member, 'side', p_side, 'target', p_target,
    'shift_id', p_shift, 'booking_id', p_booking,
    'venue', private.member_name(s.venue_id),
    'positions', v_positions,
    'dates', private.days_label(private.all_days(s.id)),
    'hours', v_hours,
    'rate', private.fmt_pay(s.rate_pence) || '/h');

  if p_side = 'venue' then
    v_talent := coalesce((select talent_id from public.bookings where id = p_booking), p_actor);
    if v_talent is not null then
      d := d || jsonb_build_object('talent', private.member_name(v_talent));
    end if;
  end if;

  if p_kind = 'booked' then
    -- Every day now booked, as in the notice.
    d := d || jsonb_build_object('dates', private.days_label(private.booked_days_here(p_member, s.id)));

  elsif p_kind = 'accepted' then
    select coalesce(array_agg(bd.shift_day_id), '{}') into v_days
    from public.booking_days bd where bd.booking_id = p_booking and bd.status <> 'cancelled';
    d := d || jsonb_build_object('dates', private.days_label(v_days));

  elsif p_kind = 'said-yes' then
    -- The notice reads "{positions} · {dates} · {hours}[ (k of n days)]".
    v_rest := coalesce(p_body, '');
    if left(v_rest, char_length(v_positions) + 3) = v_positions || ' · ' then
      v_rest := substr(v_rest, char_length(v_positions) + 4);
      v_cut := position(' · ' || v_hours in v_rest);
    else
      v_cut := 0;
    end if;
    if v_cut > 0 then
      d := d || jsonb_build_object('dates', left(v_rest, v_cut - 1),
                                   'partial', substring(v_rest from '\((\d+ of \d+ days)\)$'));
    else
      -- Fallback: what they've offered and aren't booked for.
      select coalesce(array_agg(x), '{}') into v_days
      from unnest(private.offered_days((select id from public.answers where shift_id = s.id and talent_id = p_actor))) x
      where not (x = any(private.booked_days_here(p_actor, s.id)));
      v_all := cardinality(private.all_days(s.id));
      d := d || jsonb_build_object('dates', private.days_label(v_days),
        'partial', case when cardinality(v_days) < v_all then cardinality(v_days) || ' of ' || v_all || ' days' end);
    end if;

  elsif p_kind in ('days-cancelled-talent', 'days-cancelled-venue') then
    -- The days this cancellation took: cancel_days stamps them all with one time.
    select coalesce(array_agg(bd.shift_day_id), '{}'), max(bd.cancel_reason) into v_days, v_reason
    from public.booking_days bd
    where bd.booking_id = p_booking and bd.status = 'cancelled'
      and bd.recorded_at = (select max(x.recorded_at) from public.booking_days x
                            where x.booking_id = p_booking and x.status = 'cancelled');
    d := d || jsonb_build_object('cancelled', private.days_label(v_days),
                                 'reason', regexp_replace(btrim(coalesce(v_reason, '')), '\.+$', ''));

  elsif p_kind = 'shift-closed' then
    d := d || jsonb_build_object('reason', regexp_replace(btrim(coalesce(s.close_reason, '')), '\.+$', ''));

  elsif p_kind = 'reminder' then
    select * into ri from private.reminder_info(p_booking);
    d := d || jsonb_build_object(
      'day', private.service_label(ri.first_date, s.start_time, s.end_time),
      'dates', private.days_label(private.booked_days_here(p_member, s.id)));
  end if;
  -- booking-request, declined and shift-unfilled use every day of the shift.
  return d;
end $$;
revoke all on function private.email_data(text, uuid, text, text, text, uuid, uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- notify(): unchanged for the notice, and now queues the matching email.
-- Only these notices email. Everything else (days-added, job-posted, approved,
-- document-*, filled-by-other, ...) stays in-app only.
-- ---------------------------------------------------------------------------
create or replace function private.notify(
  p_member uuid, p_kind text, p_title text, p_body text, p_target text,
  p_actor uuid default null, p_shift uuid default null, p_booking uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_side text;
  v_notice bigint;
  v_email text;
begin
  select side into v_side from public.members where id = p_member and deleted_at is null;
  if not found then return; end if;
  insert into public.notifications (member_id, kind, title, body, target, actor_id, shift_id, booking_id, created_at)
  values (p_member, p_kind, p_title, coalesce(p_body, ''), p_target, p_actor, p_shift, p_booking, clock_timestamp())
  returning id into v_notice;

  v_email := case
    when p_kind = 'days-cancelled' then 'days-cancelled-' || v_side
    when p_kind in ('booking-request', 'booked', 'shift-closed', 'reminder',
                    'said-yes', 'accepted', 'declined', 'shift-unfilled') then p_kind
  end;
  if v_email is null then return; end if;
  -- An email must never undo the change it reports: if building it fails,
  -- the notice stands and the email is left out.
  begin
    insert into public.email_outbox (member_id, notification_id, kind, data)
    values (p_member, v_notice, v_email,
            private.email_data(v_email, p_member, v_side, p_body, p_target, p_actor, p_shift, p_booking));
  exception when others then
    raise warning 'email_outbox: % not queued for notice %: %', v_email, v_notice, sqlerrm;
  end;
end $$;
revoke all on function private.notify(uuid, text, text, text, text, uuid, uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Welcome: once per member, at commit, so the talents/venues row (and so the
-- name) written later in the same transaction is there.
-- ---------------------------------------------------------------------------
create function private.queue_welcome()
returns trigger language plpgsql security definer set search_path = '' as $$
declare m public.members;
begin
  select * into m from public.members where id = new.id and deleted_at is null;
  if not found then return null; end if;
  insert into public.email_outbox (member_id, kind, data)
  values (m.id, 'welcome-' || m.side,
          jsonb_build_object('name', nullif(private.first_name(m.id), ''), 'side', m.side, 'member_id', m.id,
                             'target', case when m.side = 'talent' then 'availability' else 'home' end))
  on conflict do nothing;
  return null;
end $$;
revoke all on function private.queue_welcome() from public, anon, authenticated;
create constraint trigger members_queue_welcome
  after insert on public.members
  deferrable initially deferred
  for each row execute function private.queue_welcome();

-- ---------------------------------------------------------------------------
-- complete-account: logins over 24 hours old with no member, once each.
-- Only confirmed addresses (they can sign in to finish), no test or admin
-- logins. Run hourly by pg_cron.
-- ---------------------------------------------------------------------------
create function private.complete_account_due()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select u.id from auth.users u
  where u.created_at < now() - interval '24 hours'
    and u.email is not null and u.email_confirmed_at is not null
    and u.deleted_at is null and not coalesce(u.is_anonymous, false)
    and lower(u.email) not like '%@example.com'
    and not exists (select 1 from public.members m where m.user_id = u.id)
    and not exists (select 1 from public.admins a where a.user_id = u.id)
    and not exists (select 1 from public.email_outbox o where o.user_id = u.id and o.kind = 'complete-account');
$$;

create function private.queue_complete_account()
returns int language sql security definer set search_path = '' as $$
  with q as (
    insert into public.email_outbox (user_id, kind, data)
    select d, 'complete-account', '{}'::jsonb from private.complete_account_due() d
    on conflict do nothing
    returning 1)
  select count(*)::int from q;
$$;
revoke all on function private.complete_account_due(), private.queue_complete_account() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- For the send-emails edge function (service role only)
-- ---------------------------------------------------------------------------
-- Takes up to p_limit due emails, marks them sending and returns each with its
-- address from auth.users. A row left in sending for 10 minutes (a crashed
-- run) is taken again; Resend's idempotency key stops a double send.
create function public.email_claim(p_limit int default 10)
returns table (id uuid, kind text, data jsonb, to_email text, attempts int, skip_reason text)
language sql volatile security definer set search_path = '' as $$
  update public.email_outbox o
     set status = 'failed', error = coalesce(o.error, 'Stopped while sending, 5 times')
   where o.status = 'sending' and o.claimed_at < now() - interval '10 minutes' and o.attempts >= 5;

  with picked as (
    select o.id from public.email_outbox o
    where (o.status = 'pending' and o.next_try_at <= now())
       or (o.status = 'sending' and o.claimed_at < now() - interval '10 minutes')
    order by o.next_try_at, o.created_at
    limit greatest(1, least(coalesce(p_limit, 10), 50))
    for update skip locked
  ), addr as (
    select o.id, m.deleted_at as member_deleted, coalesce(o.to_email, au.email) as email
    from picked p
    join public.email_outbox o on o.id = p.id
    left join public.members m on m.id = o.member_id
    left join auth.users au on au.id = coalesce(m.user_id, o.user_id)
  ), upd as (
    update public.email_outbox o
       set status = 'sending', attempts = o.attempts + 1, claimed_at = now(), to_email = a.email
      from addr a where o.id = a.id
    returning o.id, o.kind, o.data, o.to_email, o.attempts, a.member_deleted
  )
  select u.id, u.kind, u.data, u.to_email, u.attempts,
         case when u.member_deleted is not null then 'member deleted'
              when u.to_email is null then 'no email address' end
  from upd u;
$$;

-- p_result: sent, skipped (with a reason), retry (try again later) or failed (never).
-- A retry after the 5th attempt is a failure. Waits: 1, 5, 25, 125 minutes.
create function public.email_mark(p_id uuid, p_result text, p_resend_id text default null, p_error text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare o public.email_outbox;
begin
  select * into o from public.email_outbox where id = p_id for update;
  if not found or o.status <> 'sending' then return; end if;
  if p_result = 'sent' then
    update public.email_outbox set status = 'sent', sent_at = now(), resend_id = p_resend_id, error = null
     where id = p_id;
  elsif p_result = 'skipped' then
    update public.email_outbox set status = 'skipped', error = p_error where id = p_id;
  elsif p_result = 'retry' and o.attempts < 5 then
    update public.email_outbox
       set status = 'pending', error = p_error,
           next_try_at = now() + interval '1 minute' * power(5, greatest(o.attempts - 1, 0))
     where id = p_id;
  elsif p_result in ('retry', 'failed') then
    update public.email_outbox set status = 'failed', error = p_error where id = p_id;
  else
    raise exception 'Unknown result %', p_result;
  end if;
end $$;

-- The function's settings, from Vault: the shared secret the cron job sends,
-- the Resend key and the allowlist (safety mode). Function env vars, when set,
-- take precedence for the key and the allowlist.
create function public.email_config()
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_object_agg(name, decrypted_secret), '{}'::jsonb)
  from vault.decrypted_secrets
  where name in ('send_emails_secret', 'resend_api_key', 'email_allowlist');
$$;

-- Sets or clears (empty value) the Resend key or the allowlist in Vault.
create function public.email_set_config(p_name text, p_value text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_name not in ('resend_api_key', 'email_allowlist') then
    raise exception 'Unknown email setting %', p_name;
  end if;
  select id into v_id from vault.secrets where name = p_name;
  if coalesce(btrim(p_value), '') = '' then
    delete from vault.secrets where id = v_id;
  elsif v_id is null then
    perform vault.create_secret(btrim(p_value), p_name);
  else
    perform vault.update_secret(v_id, btrim(p_value));
  end if;
end $$;

revoke all on function public.email_claim(int), public.email_mark(uuid, text, text, text),
  public.email_config(), public.email_set_config(text, text) from public, anon, authenticated;
grant execute on function public.email_claim(int), public.email_mark(uuid, text, text, text),
  public.email_config(), public.email_set_config(text, text) to service_role;
