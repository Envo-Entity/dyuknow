<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Two apps in this repo
- **Website** (Next.js): the repo root. Deployed by Vercel from the root; `mobile/` is excluded from its build (`tsconfig.json`, `eslint.config.mjs`, `.vercelignore`).
- **Mobile app** (Expo, runs in Expo Go): `mobile/`, with its own `package.json`, `node_modules`, `.env.local` and rules in `mobile/AGENTS.md`. The Next.js note above does not apply there. Run with `cd mobile && bun install && bunx expo start`.
- Both use the same Supabase backend (`supabase/`). Package manager: bun for both.
