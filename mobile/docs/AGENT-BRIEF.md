# Brief for every feature agent

You are building part of **Dyuknow mobile**, `/Users/shivansh/Code/Envo/dyuknow-mobile`. It is an Expo SDK 58 app (React Native 0.88, expo-router 58, React 19.3, TypeScript, React Compiler on) that rebuilds the member app of the Dyuknow website at `/Users/shivansh/Code/Envo/dyuknow`. Dyuknow is invite-only: London fine-dining venues book chefs, bar and floor talent for one-off services. Your screens must make a first-time user think "this is beautifully made". The bar is calm, native and premium, like a top Apple Design Award app.

## Hard rules
- **It must run in Expo Go.** Only use packages already in `package.json`, and never add a dependency.
- **The backend is reused as it is.** No SQL, no migrations, no edge functions, and never sign in or call RPCs while testing. All backend access goes through `@/data` (actions, store) and `@/data/supabase`.
- **Don't trust your memory of Expo.** The SDK 58 docs for tabs, stack, modals, toolbar, symbols and glass are in `/private/tmp/claude-501/-Users-shivansh-Code-Envo-dyuknow/6d358939-c347-4ded-8d5d-848cce8297d1/scratchpad/expo/`. For anything else, fetch `https://docs.expo.dev/versions/latest/sdk/<pkg>.md` or read `node_modules` type definitions.
- **The website is the behavioural reference. Do not copy its UI code**; build native equivalents. Keep every piece of copy, every rule and every RPC call identical to the spec.

## Read before writing
1. `docs/FEATURES.md`: the exhaustive functional spec. Your screens' sections are authoritative, and so is section 10, "Mobile decisions".
2. `docs/DESIGN.md`: the design direction (the kitchen pass and its tickets, one meaning per colour, native parts).
3. `docs/KIT.md`: the UI kit API. **Feature code only arranges kit parts from `@/ui`.** Never use a raw hex value, never hand-roll a button, card, row or badge, and never import `react-native` Text/Pressable for visible UI where a kit part exists.
4. `src/domain/index.ts`: the ported business rules and labels. They keep the same names as `lib/preview/model.ts` on the web, so screen logic can follow the website's screen code.
5. `src/data/`: `store.tsx`, `actions.ts`, `load.ts`, `auth.ts`, `upload.ts` and `drafts.ts`. Another agent may still be finishing `store.tsx`. If it is missing or incomplete, code against this contract and re-check before you finish:
   ```ts
   useLive(): { status: 'loading'|'signed-out'|'no-member'|'admin-only'|'ready'|'error'; data: Data|null; me: Member|null;
     side: 'talent'|'venue'|null; approved: boolean;
     badges: { unreadNotifications: number; unreadConversationIds: string[]; needsYou: number; accountAttention: boolean };
     userId?: string; email?: string; error: string|null; reload(): Promise<void>;
     run<T>(key: string, fn: (clientRef: string) => Promise<T>, opts?: { success?: string | ((r: T) => string) }): Promise<T|undefined>;
     logout(): Promise<void> }
   ```
   Every write goes through `run`. It de-duplicates repeated taps, shows the toast, fires the haptic and reloads. `run` resolves `undefined` on failure, and the failure has already been toasted.
6. The routing is already set up: `src/app/_layout.tsx` (root Stack with guards, sheet presentation options), `src/features/shell/*` (native tabs, `TabStack` with large serif titles, `HeaderActions` bell) and stub files for every route.

## How to build a screen
- Route files in `src/app/...` stay thin. They read params and render a component from `src/features/<your-area>/`.
- **Tab roots:**
  - Set `<Stack.Screen options={{ title: '…' }} />`.
  - Render `<HeaderActions />`.
  - Use `<Screen onRefresh>` with the ScrollView first so the large title collapses.
- **Pushed screens:**
  - Native header, title set dynamically.
  - Use a `Stack.Toolbar.Menu` for "⋯" actions. Read the toolbar docs: Android needs image icons, so use `Stack.Toolbar.View` with `<Icon>` on Android.
  - A single primary action goes in `StickyAction`.
- **Sheets** (`src/app/sheet/*`):
  - Use `<SheetScreen>`. Pass ids and choices through route params (`router.push({ pathname: '/sheet/book-confirm', params: {...} })`).
  - The sheet calls `run(...)` itself, then `router.back()` (and navigates further if the spec says so).
- **Data:**
  - Read `useLive().data` with the domain helpers.
  - Every list needs designed loading (`Loading`), empty (`Empty` with the next step) and error (`ErrorState`) states.
  - Respect the approval gate (`WaitingForApproval`) wherever the spec says.
- **Status** is always a word plus a symbol (`Badge`). Ink means it's waiting on you and sage means settled; never use colour alone.
- **Copy** is verbatim from FEATURES.md, in British English.
- **Accessibility:** set `accessibilityLabel` on every control without visible text, a 44pt minimum hit area (`theme.hit`), and support larger text (`useTheme().scale` is already applied inside kit parts).
- **Motion** only when something changes (for example `Button done=` after a successful commit), using `theme.motion`.
- **Kit gaps:** if you truly need a kit part that doesn't exist, build the smallest version inside `src/features/<your-area>/` and list it in your report as "kit candidate". Do NOT edit `src/ui`, `src/theme`, `src/data`, `src/domain`, `src/features/shell` or files owned by other agents.

## Before you finish
- `cd /Users/shivansh/Code/Envo/dyuknow-mobile && npx tsc --noEmit`, and fix every error in YOUR files. Report errors in others' files rather than fixing them.
- Don't commit, and don't start the dev server. The integrator runs the app.
- **Report:**
  - The files you wrote.
  - Which spec items are done, and any you couldn't do.
  - Kit candidates.
  - Anything that needs another agent's screen, such as a route and the params you push to it.

## Route contract (use exactly these when navigating to another agent's screen)
- `/shift/[id]` (shift id) · `/booking/[id]` · `/chat/[id]` (conversation id) · `/talent/[id]` (member id) · `/venue/[id]` (member id)
- `/team/[team]?dates=<YYYY-MM-DD,csv>&time=<HH:MM-HH:MM>`
- `/compose?team=<Team>&to=<talentIds csv>&position=<Position>&again=<shiftId>&from=chat&chat=<conversationId>` (all optional except team, or again)
- `/notifications` · `/account` · `/profile-edit`
- Sheets: `/sheet/which-days?shiftId=` · `/sheet/book-confirm?shiftId=&talentId=&dates=<csv preselect, optional>` · `/sheet/cancel-days?bookingId=` · `/sheet/confirm-hours?bookingId=&date=` · `/sheet/close-shift?shiftId=` · `/sheet/send-more?shiftId=`
- Tabs: talent `/t/shifts` `/t/availability` `/t/messages` `/t/profile`; venue `/v/book` `/v/bookings` `/v/post` `/v/messages` `/v/profile`.
- Opening a conversation with someone: `const r = await run('open:'+id, () => actions.openConversation(id)); if (r) router.push('/chat/'+r.conversationId)` (check the actual action name/return in `src/data/actions.ts`); if a thread already exists in `data`, push it directly.
- Photo crop is NOT a route: show `<PhotoCropper>` inside a React Native `<Modal presentationStyle="fullScreen" animationType="slide">` in your own screen.
- `shift/[id].tsx` is owned by agent F and renders `<TalentShift id>` (exported by agent C from `src/features/talent/TalentShift.tsx`) when `side === 'talent'`, else F's `<VenueShift id>`.
