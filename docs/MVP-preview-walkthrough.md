# MVP preview: how to try it

Promoted from `MVP-preview` into the main demo app, following [mvp-user-flow.md](mvp-user-flow.md).

Run `npm run dev`, then open **http://localhost:3000** for the original landing page. Its existing Login flow opens the demo at `/app`. `/preview` opens the same demo, using the same browser storage and sample world as `/app`.

**Real intake stays at `/admin/onboarding`.** It uses the expanded talent and venue forms and saves to the existing Supabase profile tables. Public demo setup and the demo owner workspace stay local to the browser. Old `/app/talent/*` and `/app/venue/*` links redirect into the current demo; old public onboarding links open the local member setup.

- **Venue:** I'm a venue · Enter as Spruce. **Talent:** I'm talent · Enter as Poppy.
- **Other people:** your photo (top right) or Preview pill → Switch account → Venue, Talent or Owner.
- **Step-by-step stories:** **Preview** pill (bottom-right on desktop, top of the screen on phones) → **Walkthrough**. It covers finding vetted people and booking them in chat, job posts, invitations, partial cover across several days, first-acceptance-wins, cancellation and replacement, and owner help.
- **Texts:** Preview pill → Texts shows the SMS messages that account would have received. The real product has no in-app notifications page.
- **Preview controls** (in the Preview pill): move the clock, go offline, fail a save, or have another person act first.

The clock starts at 1 October 2026, 10:00 London. Everything is stored in this browser only (`dyuknow_mvp_preview_v7`). No real account, SMS or payment is created. **Preview controls → Reset stories** starts over.

## Story: Spruce books Theo for Wednesday

It's Thursday morning, and Spruce is short a CDP for next Wednesday's dinner service.

1. **Choose the time first.** Book opens on tomorrow with Dinner (17:00–23:00). Two weeks of day tiles sit at the top, with arrows to the next two. Alex unticks tomorrow and taps **Wed 7** and **Thu 8**. Hours are Lunch, Dinner or Late, or any From and To in half-hour steps. Each team tile counts who is free then ("3 of 4 free then").
2. **Open a team, see everyone.** Alex taps **Kitchen**, then **CDP**. While Dyuknow is small, nobody vetted is hidden. People show as big photo cards in one list:
   - first, people in the role who said they're free for those hours (Poppy);
   - then people in the role who are busy, booked or haven't set their calendar (Theo). They might still move things around;
   - then everyone else on Dyuknow, same team first.

   Each card carries its own status ("Free then", "Free 1 of 2 days", "Availability not set"), the person's positions, "Worked with you" and their **minimum pay**.
3. **Talk first.** Theo hasn't set his availability, but he's vetted. His card says he starts from £17/h. Alex taps **Message**. No shift is needed to talk, and talent can message a venue from its profile too.
4. **Send a booking card.** In the chat, Alex taps **Send booking request**. Position, dates and hours are already filled in from the list. Alex sets £15/h, sees the below-minimum warning, and sends it anyway. Theo receives a card, not a block of text.
5. **Talent answers on the card.** On Theo's **Shifts**, the card sits under **Invitations**. He can **Accept and book**, **Decline**, or **Ask for changes**. He asks: "£17 is my minimum, happy to do both nights."
6. **The venue revises.** Spruce's **Bookings → Open** shows "Asked for changes · Revise". Alex sends a revised card at £17, and the first card is marked as replaced.
7. **Accept is the booking.** Theo accepts and is booked for both nights straight away. The booking shows on Theo's **Upcoming shifts** and on Spruce's **Bookings**, and any cancellation is posted in the same conversation.

If Spruce would rather let people come to them, **Create a job post** opens team → position, dates, hours, pay → post or invite. On wide screens it's the black button under the sidebar; on phones it's the round **+** in the middle of the tab bar.

### Where things live now

- **Venue Bookings:** Today → Open (shifts and booking cards waiting on an answer) → Upcoming → Past and cancelled.
- **Talent Shifts:** Upcoming shifts → Invitations (including booking cards) → Waiting to hear → **Shifts / Venues** switch. Shifts lists your roles; **Show from other roles too** adds the rest to the same list. Past and closed sits at the bottom.
- **Talent My shifts:** the "When are you free?" screen only, two weeks at a time with arrows.

Checks:

```sh
npm run test:preview
npx tsc --noEmit
npx eslint components/preview lib/preview app/preview app/page.tsx proxy.ts
npm run build
```
