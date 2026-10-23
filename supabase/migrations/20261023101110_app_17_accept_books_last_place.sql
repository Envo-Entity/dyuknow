-- Accept books straight away in two cases:
-- 1. a booking request sent to one person for one place (as before);
-- 2. the venue asked exactly one person for the last open place on an open
--    shift, e.g. asking someone again after a cancellation reopened a day.
create or replace function private.book_on_accept(p_shift uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select
    (s.mode = 'request' and s.capacity = 1
       and (select count(*) from public.answers a where a.shift_id = s.id and a.source = 'invite') = 1)
    or
    (s.status = 'open'
       and (select count(*) from public.answers a where a.shift_id = s.id and a.status = 'invited') = 1
       and (select coalesce(sum(s.capacity - d.booked_count), 0) from public.shift_days d
             where d.shift_id = s.id and d.starts_at > clock_timestamp() and d.booked_count < s.capacity) = 1)
  from public.shifts s where s.id = p_shift;
$$;
