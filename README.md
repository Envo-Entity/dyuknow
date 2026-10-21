# Dyuknow

`/app` is the real app, running on Supabase: email-code sign-in, self-serve
onboarding, profiles, job posts, booking requests, booking, messages and
in-app notifications. `/preview` keeps the old browser-only demo.
`/admin/onboarding` is the original intake form and still writes to the
onboarding archive (`talent_profiles`, `venue_profiles`), which the app never
reads or writes.

| Address | What it is |
| --- | --- |
| `/` | Landing page. Login goes to `/login`. |
| `/login` | Sign in with email and password. Create an account (confirmed with a 6-digit email code). Forgot password (6-digit code, then a new password). |
| `/join`, `/join/talent`, `/join/venue` | Onboarding for a signed-in person with no profile yet. |
| `/app` | The app, for signed-in members. |
| `/admin` | Approve members and check documents. Only logins in the `admins` table. |
| `/admin/onboarding` | Original intake form (unchanged). |
| `/preview` | Old browser-only demo (unchanged). |

## Run locally

```sh
npm install
npm run dev
```

`.env.local` needs (see `.env.example`):

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` and `SEED_PASSWORD`, used only by the seed, wipe and
  concurrency scripts on your machine

## Fake data

```sh
npm run seed     # fake venues, talent, shifts, a booking, messages, notices
npm run wipe     # removes every @example.com account and its data
```

Fake logins (password is `SEED_PASSWORD`; sign in normally at `/login`, locally or on the live site): `spruce@`, `sea@`, `harper@` (venues),
`poppy@`, `camille@`, `theo@`, `ethan@`, `noor@`, `ines@` (talent),
`maya@` (talent waiting for approval), all `@example.com`, plus the admin
`admin@dyuknow.com`.

To be a venue and talent at the same time, use two addresses: one tab on
`http://localhost:3000`, the other on `http://127.0.0.1:3000`. Each keeps its
own sign-in.

## Database

Migrations are in `supabase/migrations/`, applied in order to the live project.
The backend design is in `docs/backend/` (start with `00-build-brief.md`).
Database tests are in `supabase/tests/`; each runs inside a transaction that
rolls back, and can be run with the Supabase SQL editor or MCP.

## Checks

```sh
npm run build
npm run test:preview        # demo rules
npm run test:onboarding     # onboarding forms
npm run test:concurrency    # live: simultaneous bookings (needs the seed)
```

## Documentation

- [Backend design and build brief](docs/backend/)
- [User flows](docs/mvp-user-flow.md)
- [How to try the old demo](docs/MVP-preview-walkthrough.md)
- [Onboarding archive decisions](docs/data-model.md)
