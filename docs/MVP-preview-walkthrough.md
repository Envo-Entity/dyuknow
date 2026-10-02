# MVP preview: walk both sides of the pass

Built on branch `MVP-preview`. The current flow is based on `mvp-user-flow.md` v2.

Run `npm run dev`, then open **http://localhost:3000/preview**. The root `/` opens the same preview on this branch. Click **Explore the walkthrough** for an interactive, checkable guide to all eleven stories below.

## Where to enter

- **Venue:** click **I’m a venue · Enter as Spruce**.
- **Talent:** click **I’m talent · Enter as Poppy**.
- **Invitation recipient:** choose **Camille** from **Choose Camille for the invitation story**.
- **Other roles and venues:** click **Switch account** in the header, select Venue or Talent, then a member.
- **Owner:** Switch account → Owner → Dyuknow owner.

No onboarding or credentials are needed for the main stories. Optional sample phone sign-in and new-member setup let you explore those journeys too. The phone demo code is `123456`.

The preview clock starts at **1 October 2026, 10:00 Europe/London**. It stays under your control; use Preview controls to advance it. Sample contacts, member biographies, photography and venue addresses are illustrative. Nothing creates a real booking, sends SMS or moves money.

Stories 1–5 form one connected sequence. Use the suggested dates to keep bookings separate. For alternative outcomes and time-based stories, reset the sample world first when necessary; resetting also restores the clock.

## 1. Post, respond, message, book

1. Enter as **Spruce**. Choose **Kitchen → CDP → Continue to dates**.
2. Keep tomorrow, 17:00–23:00, one person. Choose **Review shift → Send to all 2**.
3. Switch account → Talent → **Poppy Bertram**. Open **Notifications** (the bell), then the new Spruce shift.
4. Click **I can cover this**, confirm travel and every service, optionally add a note, then **Send my response**. Poppy is waiting; she is not booked.
5. Switch to **Spruce**. Click the response in the home attention strip or Notifications. Click **Message** beside Poppy; send a question.
6. Switch to **Poppy → Messages**. Read and reply in the Spruce thread. The unread dot clears for this thread; the venue still has a booking decision.
7. Switch to **Spruce**, open the request and click **Book → Book Poppy**. This is the second yes: both are committed.
8. Switch to **Poppy → My shifts → Upcoming**, or her confirmation notification. See the same dates, rate, full arrival address, contact, conversation, Directions and Add to calendar.

## 2. Personal invitation

Camille starts with a Saturday invitation from The Sea The Sea. Open the pinned invitation. **Message** can be used before deciding. **Accept → confirm travel → Accept and book** confirms immediately. Switch to The Sea The Sea → Bookings → Upcoming to see the matching booking.

## 3. First acceptance wins

As Spruce, create a CDP shift on **8 October**. On Review choose **Choose who to invite**, select Poppy and Theo for one place, and send. The first-acceptance explanation appears before sending. Accept as Poppy, then switch to Theo and open his invitation: it is filled and cannot be accepted. Neither person is falsely told they were booked.

A posted shift also has **Invite specific people** on its detail screen. Those invitations use that same shift’s capacity and candidate records.

## 4. Several dates, several people

As Harper Privé, create CDP cover starting **10 October**, with **3 consecutive days** and **People needed = 2**. Respond as Poppy and Theo, confirming all dates. Book one as Harper: the request stays open at 1 of 2. Book the second: it fills. Each booking contains three explicit services, and its calendar file has three events.

## 5. Cancellation and replacement

After story 1, open Poppy’s Upcoming booking. Choose **Cancel booking → reason → Cancel and notify**. Spruce gets a cancellation notification; both retain the history. Poppy’s hours are not automatically republished as free.

As Spruce, open the cancelled booking → **Find a replacement**. Review the prefilled remaining dates and terms, then send the new request. Respond as Theo and book him. The original cancellation and new booking remain separate records.

Venue cancellation uses the same explicit flow and notifies talent. Cancelling a multi-day booking after time advances retains completed services and applies to the remaining services. Booked terms cannot be edited in place.

## 6. Withdraw, decline, close, edit

- Respond as Poppy, then **Withdraw response** before the venue books. Spruce sees Withdrawn.
- Decline Camille’s seeded invitation. The Sea The Sea sees Declined. Reset stories first if you already accepted it.
- As the venue, **Close unfilled places** requires a reason and informs waiting members. Already confirmed bookings remain.
- **Edit and resend** closes the original request, informs waiting people, and creates a new request with revised role/date/hour/pay terms. It is disabled if anyone is booked.
- **Edit preparation note** changes just the note freely, keeping the agreed role, dates, hours and pay.

## 7. Availability and browsing

Talent → My shifts → the **14-day availability strip**, or Shifts → **Update availability**. Select a date, choose Free all day, Free from–to or Not free. Copy to other chosen dates and save. Blank dates mean Not set. Booked intervals remain blocked and open their booking details.

Venue → Review → Choose who to invite orders past collaborators first, then people whose published availability covers every service, then availability not set. Known confirmed conflicts disable invitations. Skills appear as profile information, never a fabricated match score.

Talent Shifts has **Your roles / All roles**, role/date/area/pay filters, and **Fits my published availability**. The **Venues** toggle opens approved rooms and their genuine open-shift counts. There is no cold messaging without a response or invitation.

Create an overnight service with 22:00–02:00 to see both dates. Everything uses Europe/London. Ambiguous or nonexistent daylight-saving times require another selection rather than guessing a time.

## 8. Failure, competition and stale links

Open **Preview controls**:

- **Go offline:** try an action or message. No false success appears; drafts remain. Reconnect and retry.
- **Fail next save:** the next substantive action fails once without creating a booking or message. Retry succeeds.
- On a shift: **Fill this shift with another person** executes an actual sample response/acceptance from another eligible person. Old links display Filled.
- On an open talent shift: **Create an overlapping booking for me** commits the talent to another venue for those hours. Pending overlapping responses lapse; a late booking/acceptance is blocked.
- **Advance to this shift’s start:** unfilled places expire. Old links cannot book after the first start.

The store refreshes when another tab writes. Use two tabs in the same browser if you prefer one side per tab. Separate browsers or devices have separate worlds. Actual cross-device transactions and concurrent database guarantees are outside this frontend preview.

## 9. No supply, no reply, owner help

Create Sommelier cover: there are no members in that role, so the review says so. **Ask the owner for cover** keeps a real open request and generates owner/venue notifications.

For a same-day shift with no responses, **Advance 30 minutes**. The owner receives a help request and the venue sees that help is underway. Switch to Owner to inspect the shift, members, bookings, cancellation history and private reports.

## 10. After service, issues and book again

Spruce → Bookings → Past contains a seeded Poppy booking. Each side can privately report Yes, worked, No-show or an issue. Only the owner sees those outcomes.

For a new booking use **Preview controls → Finish this booking**. It moves to Past with Outcome not reported; elapsed time does not invent attendance.

**Book Poppy again** starts a personal invitation with the previous role, hours and pay, asking for new dates. An upcoming booking also offers **Report an issue / running late**. Reporting alerts the owner without cancelling the booking. After a venue no-show or issue report, **Find a replacement** opens a new prefilled request; review its future dates and hours before sending.

Advance the clock to 18:00 the day before a future booking to generate its reminder notification. Same-day reminders use two hours before service, avoiding duplicate reminders for very late bookings. Preview controls also creates the weekly availability nudge.

## 11. Joining, claiming and profile defaults

From welcome:

- **Try phone sign-in / claim a profile:** enter a sample existing phone, then code `123456`. Confirm the preloaded profile and review it. Invalid-code, resend and change-phone paths are available.
- **Explore new-member setup:** use the prefilled sample form for Talent or Venue. Drafts restore if you close and return. Talent can select any of the next seven dates, choose day or evening hours, or skip initial availability. Finish and see Waiting for approval.
- Switch to Owner → Members → **Approve** the new person. Switch back: the approval notice unlocks their workspace.
- Profile → Edit profile and alerts lets talent change biography, roles, predefined/custom skills and role-alert preference. Venue profiles supply address, rate, on-site contact and preparation defaults for new shifts. Existing agreed pay/dates/hours retain their original values.
- Sign out returns to welcome. Returning accounts keep their activity in this browser.

## Starting over and checks

**Preview controls → Reset stories → Yes, reset sample world** restores all initial sample members, invitations and shifts. It affects only `dyuknow_mvp_preview_v1` storage; the legacy app’s data stays separate.

Validation commands:

```sh
npm run test:preview
npx tsc --noEmit
npx eslint components/preview lib/preview app/preview app/page.tsx proxy.ts
npm run build
```

The domain tests cover the connected posting/booking lifecycle, conversation gates, invitations, multi-person bundles, conflict prevention, withdrawal, cancellation, resend, owner fallback, offline/failure states, expiry, DST, approval and reminders.
