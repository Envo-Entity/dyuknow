# Building and releasing the Dyuknow app

Everything runs from the EAS CLI, from inside `mobile/`:

```bash
cd mobile
```

- **Expo project:** `@envo-entity/dyuknow` (ID `d7504bb0-02fc-4a96-ae7d-1469aa0f46f9`, set in `app.json`).
- **One environment.** Every build profile uses EAS's `production` environment (`"environment": "production"` in `eas.json`), so there is one set of env values. Staging, if ever needed, is a later addition.
- **Package manager:** bun. EAS sees `bun.lock` and installs with bun on its build machines.
- **Version numbers** are kept by EAS (`appVersionSource: remote`), and production builds increase the build number on their own. Bump the user-facing version (`version` in `app.json`) by hand when it matters.

## Env values
The app only uses public values, which end up inside the app anyway:

| Name | Where |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | EAS → production, plain text |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | EAS → production, plain text |

- EAS builds read them from Expo, not from your laptop.
- To get them locally for `bunx expo start`: `eas env:pull --environment production` (writes `.env.local`, which is git-ignored).
- To change one: `eas env:update --environment production --variable-name <NAME>`, or use the Expo dashboard.
- Never add the Supabase service-role key here. It has full database access.

## The three kinds of build

| Profile | iOS | Android | For |
|---|---|---|---|
| `development` | Dev build for registered iPhones | APK for phones and emulators | Day-to-day work, with `bunx expo start` |
| `development-simulator` | Dev build for the iOS Simulator | — | Simulator work |
| `preview` | Installed by link on registered iPhones | APK to send to anyone | Quick sharing |
| `production` | Store build → TestFlight → App Store | AAB → Play Store | Testers and releases |

iOS "internal" (`preview`) builds only install on iPhones registered with `eas device:create`. To share with people on iOS, TestFlight (a `production` build) is easier: invite them in App Store Connect.

## Commands

**Dev builds**
```bash
eas build -p ios --profile development-simulator   # then drag the .app onto the Simulator, or: eas build:run -p ios --latest
eas build -p ios --profile development             # your iPhone (register it first, below)
eas build -p android --profile development         # APK for phone or emulator: eas build:run -p android --latest
bunx expo start                                    # the dev build connects to this
```
Register an iPhone once, before its first dev or preview build:
```bash
eas device:create
```

**Internal sharing**
```bash
eas build -p android --profile preview   # APK link to send to anyone
eas build -p ios --profile preview       # registered iPhones only
```

**Store builds**
```bash
eas build -p all --profile production --auto-submit   # iOS → TestFlight, Android → Play internal testing
```
Or build and submit separately:
```bash
eas build -p ios --profile production && eas submit -p ios --latest
eas build -p android --profile production && eas submit -p android --latest
```

- **iOS:** the build lands in App Store Connect → TestFlight. Release to the App Store from App Store Connect.
- **Android:** submits to the Play Console "internal testing" track (`eas.json` → `submit.production.android.track`). Promote it to production in the Play Console.

## One-off setup still to do
1. **Bundle IDs:** done. Both are `com.dyuknow.app` in `app.json`. They can never change after the first store upload.
2. **iOS:** the first `eas build -p ios` asks to sign in to the Envo Apple Developer account and creates the certificates and profiles. EAS stores them; nothing to keep locally. The first `eas submit -p ios` creates the App Store Connect app if it doesn't exist.
3. **Android:**
   - Create the app in the Google Play Console.
   - Upload the **first** AAB by hand. Google requires this once; download it from the EAS build page.
   - For `eas submit` after that, create a Google service account with Play Console access and add its key with `eas credentials -p android` (Google Service Account). Keep the JSON key out of git.
4. **App icon and splash:** the template's icon and splash images in `assets/images/` and `assets/expo.icon` are still Expo's defaults and need Dyuknow artwork before the stores.

## Expo Go still works
`bunx expo start` and opening it in Expo Go still works, because the app uses no native code beyond what Expo Go ships. Dev builds are only needed for testing on a real build, or once a native module is added.

## Signing credentials (where they live)
- **iOS:** distribution certificate and App Store provisioning profile are stored on EAS (remote credentials) and on Envo's Apple team `BGV2P92TM3`. The certificate is **shared with Envo's other apps** (gudforus, app) and **expires 27 March 2027**. Renewing it means new profiles for every app using it; EAS offers this on the next build.
- **Android:** the signing keystore was generated on EAS (12 Nov 2026). Keep one private backup outside git: `eas credentials -p android` → Download existing keystore. Installed APKs only update if every later APK uses the same key.
- Nothing about signing is stored in this repo.
