## Edge functions

This build has one edge function, send-emails. An edge function is a small server program that Supabase runs on request. Sending email is the only job that has to reach outside the database on its own; everything else stays inside it.

### Why there aren't more

Every other job that might have been an edge function runs somewhere simpler.

| Job | Where it runs | Why |
|---|---|---|
| Every member action: post, answer, book, cancel, confirm hours, message, availability, profile, documents | Database functions, called as RPC (a remote call to a database function) | Each must be one transaction with row locks, so double booking is impossible. An edge function would need the service-role key and would skip the row rules. |
| Notices and red dots | Inside those same database functions, then Supabase Realtime | A notice is just a row written with its change (see Notifications). Its email is a row too, in email_outbox; only the sending happens outside. |
| Sign-in codes | Supabase Auth | Auth sends the 6-digit code email itself (see Sign-up, login and onboarding). |
| The five-minute sweep and the daily tidy | pg_cron, inside the database | They change only database rows (see Scheduled jobs). |
| Approving members and checking documents | Admin database functions | Pure data changes. |
| Photo and document uploads | The browser, straight into the member's own Storage folder | Storage rules check the folder, then a database function records the file. |
| Seeding and wiping fake data | Scripts run from the developer's machine with the service-role key | They run by hand, and the key never leaves that machine (see Fake data now, real users later). |

### send-emails

Sends what's waiting in email_outbox through Resend (see Notifications → Email). Code: supabase/functions/send-emails (index.ts, and templates.mjs, which scripts/emails/preview.mjs also renders).

- **Started by:** pg_cron every minute, through private.kick_send_emails(), and only when an email is due. It sends the shared secret from Vault in the x-dyuknow-secret header.
- **Who can call:** only a caller with that secret. JWT checks are off for this function; a call without the secret gets 401 before anything is read or sent.
- **Steps:** read settings (public.email_config()), check the secret, claim up to 10 emails (public.email_claim()), skip test, team and deleted addresses and anyone outside the allowlist, render, send each through Resend with the outbox id as Idempotency-Key, record each result (public.email_mark()).
- **Settings:** in Vault (send_emails_secret, send_emails_url, resend_api_key, email_allowlist). RESEND_API_KEY and EMAIL_ALLOWLIST as function secrets win over Vault when set.
- **Deploy:** `supabase functions deploy send-emails --no-verify-jwt`, or the Supabase MCP deploy with verify_jwt off.

### Planned for later

Two more edge functions come later, each when its feature is added.

| Function | What it will do | Started by |
|---|---|---|
| invite-member | Brings real users in: creates a login for an onboarding record, or for an address the owner types, and emails the invitation. | The admin, from /admin. |
| delete-account | Carries out a deletion request: closes the member's shifts and bookings, removes their files and deletes their login. | The admin, from /admin, after a member asks with request_account_deletion. |
