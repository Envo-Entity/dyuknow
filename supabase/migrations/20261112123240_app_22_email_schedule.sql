-- Dyuknow email, step 2: run the send-emails edge function every minute, and
-- queue complete-account emails every hour.
--
-- The shared secret is made here at random and kept only in Vault; the cron
-- job reads it from Vault and the function checks it against Vault, so it
-- never appears in a file. The function's address is kept in Vault too.

create extension if not exists pg_net with schema extensions;

select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'send_emails_secret',
                           'Shared secret: pg_cron -> send-emails edge function')
where not exists (select 1 from vault.secrets where name = 'send_emails_secret');

select vault.create_secret('https://htzvzmwrbglfomzfwfpg.supabase.co/functions/v1/send-emails', 'send_emails_url',
                           'Address of the send-emails edge function')
where not exists (select 1 from vault.secrets where name = 'send_emails_url');

-- Calls the function only when an email is due, so an empty outbox costs nothing.
create function private.kick_send_emails()
returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_url text;
  v_secret text;
begin
  if not exists (select 1 from public.email_outbox o
                 where (o.status = 'pending' and o.next_try_at <= now())
                    or (o.status = 'sending' and o.claimed_at < now() - interval '10 minutes')) then
    return null;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'send_emails_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'send_emails_secret';
  if v_url is null or v_secret is null then
    raise warning 'send-emails: address or secret missing from Vault';
    return null;
  end if;
  return net.http_post(
    url := v_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-dyuknow-secret', v_secret),
    timeout_milliseconds := 60000);
end $$;
revoke all on function private.kick_send_emails() from public, anon, authenticated;

select cron.schedule('dyuknow-send-emails', '* * * * *', 'select private.kick_send_emails()');
select cron.schedule('dyuknow-complete-account', '17 * * * *', 'select private.queue_complete_account()');
