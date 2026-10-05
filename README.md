# Dyuknow

The main app uses the accepted MVP preview UI. Venue and talent flows
are a browser-local demo. Admin onboarding is the live data collection flow.

## Run locally

```sh
npm install
npm run dev
```

Open [the original landing page](http://localhost:3000). Its existing Login
flow opens [the main app](http://localhost:3000/app). `/app` and `/preview`
show the same demo and share the existing `dyuknow_mvp_preview_v7` browser
storage. The demo works without Supabase configuration.

Open [admin onboarding](http://localhost:3000/admin/onboarding) for real talent
and venue intake. Configure `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local` for this flow. It retains
its existing forms, uploads and database submission, with the added roles,
skills, custom skills, shift-alert preferences, dated availability, venue
address/postcode and team preferences.

## Compatibility

Old talent and venue dashboard, profile, booking and message URLs redirect to
the current demo. Old public onboarding URLs open the matching local demo
setup. Legacy chats and opportunity details with different sample IDs return
to the current messages or dashboard screens.

Real profile approval is managed through trusted database administration; the
demo has no owner workspace. No real SMS, payments or
public member setup are connected to the demo.

## Documentation

- [How to try the demo](docs/MVP-preview-walkthrough.md)
- [User flows](docs/mvp-user-flow.md)
- [Additive onboarding decisions and database mapping](docs/data-model.md)

The onboarding SQL in `supabase/migrations/` was already applied to the
existing database on 2 October 2026. UI promotion does not reapply it.

## Checks

```sh
npm run build
npm run test:preview
npm run test:onboarding
```
