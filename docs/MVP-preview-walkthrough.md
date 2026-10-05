# MVP preview: how to try it

Promoted from `MVP-preview` into the main demo app, following [mvp-user-flow.md](mvp-user-flow.md).

Run `npm run dev`, then open **http://localhost:3000** for the original landing page. Its existing Login flow opens the demo at `/app`. `/preview` opens the same demo, using the same browser storage and sample world as `/app`.

**Real intake stays at `/admin/onboarding`.** It uses the expanded talent and venue forms and saves to the existing Supabase profile tables. Public demo setup and the demo owner workspace stay local to the browser. Old `/app/talent/*` and `/app/venue/*` links redirect into the current demo; old public onboarding links open the local member setup.

- **Venue:** I'm a venue · Enter as Spruce. **Talent:** I'm talent · Enter as Poppy.
- **Other people:** your photo (top right) or Preview pill → Switch account → Venue or Talent.
- **Step-by-step stories:** **Preview** pill → **Walkthrough**. It covers booking requests, job posts, booking different people on different days, same person for all days, answering a request, cancelling days and confirming hours.
- **Texts:** Preview pill → Texts shows the SMS messages that account would have received.
- **Preview controls** (in the Preview pill): move the clock, go offline, fail a save, have another person say yes and get booked, or finish a booking so its hours can be confirmed.

The clock starts at 1 October 2026, 10:00 London. Everything is stored in this browser only (`dyuknow_mvp_preview_v8`). No real account, SMS or payment is created. **Preview controls → Reset stories** starts over.

## Story: Spruce books Theo for Wednesday

1. **Choose the time.** Book opens on tomorrow at Dinner (17:00–23:00). Untick tomorrow and tap **Wed 7**.
2. **Open a team.** Tap **Kitchen**. Free people come first, then people who are busy or haven't set availability, then everyone else. Each card shows minimum pay.
3. **Pick people.** Tap **Add to request** on Theo and Poppy, then **Send booking request to Theo and Poppy**.
4. **Same form as a job post.** Position, dates, hours, pay, people needed and note are filled in. Send.
5. **They say yes.** As Theo: Shifts → Booking requests → open it → **I can do this** → Send. He's waiting, not booked. Do the same as Poppy.
6. **The venue books.** As Spruce: Bookings → Open → "2 can do it · Review" → **Book Theo**. Poppy is told it's filled.
7. **After the shift.** Preview controls → Finish this booking. Bookings → Confirm hours → confirm, or change the finish time.

To ask everyone instead, **Post a job** (the black button in the sidebar; the round **+** on phones) → team → the same form.

Checks:

```sh
npm run test:preview
npx tsc --noEmit
npx eslint components/preview lib/preview app/preview app/page.tsx proxy.ts
npm run build
```
