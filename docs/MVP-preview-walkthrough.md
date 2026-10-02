# MVP preview: how to try it

Promoted from `MVP-preview` into the main demo app, following [mvp-user-flow.md](mvp-user-flow.md).

Run `npm run dev`, then open **http://localhost:3000/app**. The root `/` and `/preview` open the same demo, using the same browser storage and sample world.

**Real intake stays at `/admin/onboarding`.** It uses the expanded talent and venue forms and saves to the existing Supabase profile tables. Public demo setup and the demo owner workspace stay local to the browser. Old `/app/talent/*` and `/app/venue/*` links redirect into the current demo; old public onboarding links open the local member setup.

- **Venue:** I'm a venue · Enter as Spruce. **Talent:** I'm talent · Enter as Poppy.
- **Other people:** Switch account (top right) → Venue, Talent or Owner.
- **Step-by-step stories:** the **Walkthrough** link in the green strip. It covers posting and booking, invitations, partial cover across several days, first-acceptance-wins, cancellation and replacement, and owner help.
- **Texts:** the link in the green strip shows the SMS messages that account would have received. The real product has no in-app notifications page.
- **Preview controls:** move the clock, go offline, fail a save, or have another person act first.

The clock starts at 1 October 2026, 10:00 London. Everything is stored in this browser only (`dyuknow_mvp_preview_v4`). No real account, SMS or payment is created. **Preview controls → Reset stories** starts over.

Checks:

```sh
npm run test:preview
npx tsc --noEmit
npx eslint components/preview lib/preview app/preview app/page.tsx proxy.ts
npm run build
```
