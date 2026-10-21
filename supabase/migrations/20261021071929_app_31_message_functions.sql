-- Dyuknow app backend, step 31 (Agent B): conversations, messages and
-- notification read markers. Specified in 05-booking-engine.md under
-- "Conversations and notifications".

-- ---------------------------------------------------------------------------
-- open_conversation
-- ---------------------------------------------------------------------------
create function public.open_conversation(p_other_member_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me public.members := private.require_member();
  other public.members;
begin
  if not me.approved then
    raise exception 'Your profile is waiting for approval.';
  end if;
  select * into other from public.members where id = p_other_member_id;
  if not found or not other.approved or other.deleted_at is not null or other.side = me.side then
    raise exception 'Venues and talent can message each other.';
  end if;
  return jsonb_build_object('conversation_id',
    case me.side when 'venue' then private.conversation_for(me.id, other.id)
                 else private.conversation_for(other.id, me.id) end);
end $$;

-- ---------------------------------------------------------------------------
-- send_message
-- ---------------------------------------------------------------------------
create function public.send_message(p_conversation_id uuid, p_body text, p_client_ref uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me public.members := private.require_member();
  c public.conversations;
  v_other uuid;
  other public.members;
  v_prior jsonb;
  v_body text := btrim(coalesce(p_body, ''));
  v_id bigint;
  v_seq integer;
  t timestamptz;
begin
  select * into c from public.conversations where id = p_conversation_id;
  if not found or me.id not in (c.venue_id, c.talent_id) then
    raise exception 'This conversation is private.';
  end if;
  v_other := case when me.id = c.venue_id then c.talent_id else c.venue_id end;

  -- Lock both people, shared, in id order.
  perform 1 from public.members where id in (me.id, v_other) order by id for share;
  t := clock_timestamp();

  select * into me from public.members where id = me.id;
  if me.deleted_at is not null then
    raise exception 'Sign in to continue.';
  end if;
  if not me.approved then
    raise exception 'Your profile is waiting for approval.';
  end if;

  v_prior := private.receipt_begin(me.id, p_client_ref, 'send_message');
  if v_prior is not null then
    return v_prior;
  end if;

  if v_body = '' then
    raise exception 'Write a message first.';
  end if;
  if char_length(v_body) > 2000 then
    raise exception 'Keep messages under 2,000 characters.';
  end if;
  select * into other from public.members where id = v_other;
  if other.deleted_at is not null or not other.approved then
    raise exception '% can’t get messages right now.', private.member_display_name(v_other);
  end if;

  v_id := private.add_message(p_conversation_id, 'text', me.id, v_body, null);
  select seq into v_seq from public.messages where id = v_id;

  insert into public.conversation_reads (conversation_id, member_id, last_read_seq, read_at)
  values (p_conversation_id, me.id, v_seq, clock_timestamp())
  on conflict (conversation_id, member_id) do update
    set last_read_seq = greatest(public.conversation_reads.last_read_seq, excluded.last_read_seq),
        read_at = excluded.read_at;

  return private.receipt_end(me.id, p_client_ref, jsonb_build_object('message_id', v_id, 'seq', v_seq));
end $$;

-- ---------------------------------------------------------------------------
-- mark_conversation_read
-- ---------------------------------------------------------------------------
create function public.mark_conversation_read(p_conversation_id uuid, p_up_to_seq int)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me public.members := private.require_member();
  c public.conversations;
  v_mark integer;
begin
  select * into c from public.conversations where id = p_conversation_id;
  if not found or me.id not in (c.venue_id, c.talent_id) then
    raise exception 'This conversation is private.';
  end if;
  v_mark := greatest(least(coalesce(p_up_to_seq, c.last_seq), c.last_seq), 0);
  insert into public.conversation_reads (conversation_id, member_id, last_read_seq, read_at)
  values (p_conversation_id, me.id, v_mark, clock_timestamp())
  on conflict (conversation_id, member_id) do update
    set last_read_seq = greatest(public.conversation_reads.last_read_seq, excluded.last_read_seq),
        read_at = excluded.read_at;
  return '{}'::jsonb;
end $$;

-- ---------------------------------------------------------------------------
-- mark_notifications_read: by ids, by target, or all (both null).
-- ---------------------------------------------------------------------------
create function public.mark_notifications_read(p_ids bigint[], p_target text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  me public.members := private.require_member();
  n integer;
begin
  update public.notifications
     set read_at = clock_timestamp()
   where member_id = me.id and read_at is null
     and ((p_ids is null and p_target is null)
          or id = any (p_ids)
          or target = p_target);
  get diagnostics n = row_count;
  return jsonb_build_object('marked', n);
end $$;

revoke all on function public.open_conversation(uuid), public.send_message(uuid, text, uuid),
  public.mark_conversation_read(uuid, int), public.mark_notifications_read(bigint[], text)
  from public, anon, authenticated;
grant execute on function public.open_conversation(uuid), public.send_message(uuid, text, uuid),
  public.mark_conversation_read(uuid, int), public.mark_notifications_read(bigint[], text)
  to authenticated;
