# Emails and launch settings

Live since 12 Nov 2026.

## Launch settings

- **No approval wait.** `create_my_profile` saves new members as approved when they finish onboarding. No "approved" notice is sent. The admin can still un-approve someone.
- **Documents are optional.** Talent without right to work see a nudge on Profile and Account. Missing documents show "Not added", not "Needed".
- **Venues see document status.** Each talent document shows as Verified, Added (not checked yet) or Not added (`talent_cards.document_statuses`). Venues never see the file or the CV. A rejected document reads as Not added.
- The same changes are in the mobile app; phones get them from the next EAS build.

## How email works

1. `private.notify()` writes the in-app notice and, for the kinds below, a row in `public.email_outbox` in the same transaction.
2. pg_cron `dyuknow-send-emails` runs every minute and calls the `send-emails` edge function when something is due.
3. The function sends through Resend from `Dyuknow <hi@dyuknow.com>`. It uses the outbox id as the idempotency key and retries up to 5 times.
4. It never emails `@example.com` addresses or team logins (admin@, james@dyuknow.com, hi@shivansh.pro).

- **Templates:** `supabase/functions/send-emails/templates.mjs`.
- **Preview all emails:** run `node scripts/emails/preview.mjs`, then serve `scripts/emails/out` (e.g. `python3 -m http.server 4320 --directory scripts/emails/out`).
- **Images:** `public/email/`.

**Safe mode** sends only to listed addresses; everyone else's emails are marked skipped and never sent. It is off.

```sql
select public.email_set_config('email_allowlist', 'someone@example.org');  -- on
select public.email_set_config('email_allowlist', '');                     -- off
```

## Emails sent

★ = ends with James Sharp's photo and name (founder).

| Email | To | Sent when |
|---|---|---|
| ★ Welcome to Dyuknow | Talent / venue | Once, when they finish onboarding (trigger on `members` insert) |
| ★ Finish setting up your account | Anyone | 24 h after sign-up with no profile; once (hourly cron `dyuknow-complete-account`) |
| ★ Your account is ready | Anyone | By hand, `scripts/send-welcome.mjs`, when the owner creates a login |
| Sign-in code | Anyone | Every code request. Supabase Auth sends it (see To do) |
| Booking request | Talent | A venue sends them a request |
| You're booked | Talent | The venue books them (not when they tap Accept) |
| Days cancelled | Talent | The venue cancels some or all of their days |
| Shift cancelled | Talent | The venue closes a shift they were asked for or said yes to |
| Reminder | Talent | 18:00 the evening before the first booked day, or 2 h before if booked that day |
| Can do it | Venue | A talent says "I can do this" or offers more days |
| Accepted | Venue | A talent accepts a request sent only to them |
| Declined | Venue | A talent declines their request |
| Days cancelled | Venue | A booked talent cancels some or all of their days |
| Shift unfilled | Venue | A shift starts with places still empty |

**Paused** (template kept, never sent): You're approved and Document not accepted. Members are auto-approved and nobody reviews documents yet.

**In-app only:** days added, job posted, filled by someone else, shift filled, shift started, hours confirmed, no-show, withdrew, booked elsewhere, no longer available, document verified.

## To do

- **Supabase Auth email** (dashboard only):
  - SMTP `smtp.resend.com`, port 465, user `resend`, a Resend key as the password, sender `hi@dyuknow.com`.
  - 6-digit code, 600 s expiry, auth rate limit 100/h.
  - Paste `scripts/emails/out/supabase-sign-in-code.html` into the Confirm signup, Magic link, Reset password and Change email templates.
- **Mobile:** ship a new EAS build so phones get the document changes.
