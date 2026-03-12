# Rudder — Project Status

## What's Been Done

### Infrastructure
- [x] Expo SDK 54 project scaffolded with TypeScript
- [x] expo-router v6 file-based navigation configured
- [x] Supabase project connected (auth, database, edge functions)
- [x] EAS Build configured (project ID registered at expo.dev)
- [x] GitHub repository created and code pushed (`github.com/preston-bot/rudder`)
- [x] `.gitignore` configured to exclude node_modules, build artifacts, secrets
- [x] `.gitattributes` added — normalizes line endings (LF) for Mac/Windows compatibility
- [x] `.env` removed from git tracking — credentials no longer exposed in repo
- [x] `.env.example` in repo as template for new developers

### Backend
- [x] Full PostgreSQL schema created (`supabase/schema.sql`)
  - `user_profiles`, `races`, `training_plans`, `swim_sessions`, `check_ins`
- [x] Row Level Security (RLS) policies on all tables
- [x] Auto-create profile trigger on new user signup
- [x] Supabase Edge Function (`/functions/v1/ai`) deployed with Anthropic API key
- [x] Four AI handlers: generate_plan, adjust_plan, interpret_session, reveal_copy

### Authentication
- [x] Apple Sign-In with SHA-256 nonce (expo-crypto)
- [x] Google OAuth via Supabase
- [x] SSR-safe session storage (no AsyncStorage on web)
- [x] Auth state managed via `hooks/useAuth.ts`

### Screens
- [x] Sign-in screen (`app/(auth)/sign-in.tsx`)
- [x] "The Reveal" home screen — race hero, countdown, motivational line (`app/(app)/index.tsx`)
- [x] Training Arc screen — SVG visualization, phase markers (`app/(app)/arc.tsx`)
- [x] This Week screen — session list, progress bar (`app/(app)/week.tsx`)
- [x] Profile / settings screen (`app/(app)/profile.tsx`)
- [x] Race entry wizard — 3-step flow, saves and generates plan (`app/race/new.tsx`)
- [x] Workout detail — intervals, RPE selector, mark done/skip (`app/workout/[id].tsx`)
- [x] Check-in flow — 8w/4w status, triggers plan adjustment (`app/check-in.tsx`)
- [x] Auth callback handler (`app/auth/callback.tsx`)
- [x] HealthKit session browser (`app/health/workouts.tsx`)
- [x] Baseline assessment screen (`app/profile/baseline.tsx`)
- [x] Benchmark (CSS test) screen (`app/profile/benchmark.tsx`)
- [x] Manual workout entry (`app/workout/manual.tsx`)
- [x] Races list screen (`app/races.tsx`)

### Hooks & Logic
- [x] `useAuth` — Apple/Google sign-in, session management
- [x] `useWorkouts` — training plan fetch, markSessionDone, skipSession
- [x] `useRace` / `useRaces` — race queries
- [x] `useProfile` — user profile read/write
- [x] `useHealthKit` — HealthKit permission + session fetch
- [x] `useWatchKit` — WatchKit pairing status + sendWorkout
- [x] `useNotifications` — push notification registration
- [x] `lib/workout-engine.ts` — deterministic utilities (distance format, pace normalization, phase inference, CSS estimation)
- [x] `lib/claude.ts` — client-side API calls to edge function

### Components & Design
- [x] Design system: Colors, Spacing, Typography, BorderRadius (`constants/theme.ts`)
- [x] `Button`, `Card`, `Text` UI components
- [x] `WorkoutCard` — session card with effort color
- [x] `CheckInModal` — ahead / on_target / behind selector
- [x] `TrainingArc` — SVG arc from Today to Race Day

---

## What Needs To Be Done

### High Priority (App won't work without these)
- [ ] **Supabase environment variables** — `SUPABASE_URL` and `SUPABASE_ANON_KEY` need to be set in a `.env` file and wired into the app
- [ ] **Anthropic API key** — needs to be set as a Supabase secret (`supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`)
- [ ] **Apple Developer account** — required to build for iOS (EAS Build, HealthKit entitlements, App Store)
- [ ] **EAS Build run** — first iOS build has never been compiled; native modules won't work until this is done
- [ ] **Supabase schema applied** — the SQL in `supabase/schema.sql` needs to be run against the actual Supabase project

### Medium Priority (Core features incomplete)
- [ ] **Google Sign-In redirect URL** — needs to be configured in Supabase Auth settings and `app.json`
- [ ] **Push notifications** — `useNotifications` hook exists but notification triggers (check-in reminders, plan adjustments) are not wired up
- [ ] **HealthKit session matching** — logic to match a completed HealthKit swim to a planned session is not fully implemented
- [ ] **Benchmark flow** — CSS (Critical Swim Speed) test UI exists but the calculation result is not saved back to the user profile
- [ ] **Training Arc SVG** — the arc component needs real phase data wired in (currently may show placeholder state)
- [ ] **Races list screen** — `app/races.tsx` exists but may not be linked from navigation

### Lower Priority (Polish)
- [ ] **App icon and splash screen** — currently using 1×1 pixel placeholders; real assets needed before any TestFlight or App Store submission
- [ ] **Empty states** — screens need proper empty state UI when no race or plan exists yet
- [ ] **Error boundaries** — no global error handling if Supabase or Claude calls fail
- [ ] **Offline support** — app assumes connectivity; no caching or offline fallback
- [ ] **Android testing** — all development has been iOS-focused; Android layout and HealthKit equivalent (Google Fit / Health Connect) not addressed
- [ ] **Web version** — partially works but iOS-specific imports (HealthKit, WatchKit, Apple Auth) cause errors on web

---

## Current Challenges

### 1. Can't Test on a Real Device Yet
**Problem:** The app uses native iOS modules — HealthKit (`react-native-health`) and WatchKit (`react-native-watch-connectivity`) — that are not available in the Expo Go app. Expo Go only supports Expo's built-in SDK modules.

**Solution:** An EAS Build (custom development build) must be compiled and installed on a physical iPhone. This requires:
- An Apple Developer account ($99/year)
- Running `eas build --platform ios --profile development`
- Installing the resulting `.ipa` file on the test device

**Status:** EAS is configured and logged in. Waiting on Apple Developer account.

### 2. Supabase Not Yet Wired Up
**Problem:** The `.env` file with `SUPABASE_URL` and `SUPABASE_ANON_KEY` has not been created, and the database schema has not been applied to the live Supabase project.

**Solution:**
1. Create `.env` at the project root with the keys from the Supabase dashboard
2. Run `supabase/schema.sql` in the Supabase SQL editor
3. Deploy the edge function: `supabase functions deploy ai`
4. Set the Anthropic API key: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`

### 3. No Apple Developer Account
**Problem:** Apple Sign-In, HealthKit, and App Store distribution all require an Apple Developer account. The app cannot be fully tested on iOS without one.

**Cost:** $99/year at developer.apple.com

### 4. Web Errors from iOS-Only Imports
**Problem:** Several hooks import iOS-only native modules at the top level. When the web bundler processes these files, it crashes because the modules don't exist in a browser environment.

**Solution:** Wrap iOS-only imports in platform checks (`Platform.OS === 'ios'`) or use dynamic imports so they are only loaded on iOS.

### 5. App Assets Are Placeholders
**Problem:** `icon.png`, `splash.png`, `adaptive-icon.png`, and `favicon.png` are currently 1×1 pixel placeholder images. The app will launch but look unprofessional.

**Solution:** Real artwork needs to be designed and exported at the correct dimensions before any public testing or submission.

### ~~6. Cross-Platform Dev Environment~~ ✅ Resolved
Mac and Windows developers can now work on the repo without line-ending conflicts. `.gitattributes` enforces LF normalization. README updated with correct install command (`--legacy-peer-deps`) and Xcode note for iOS.

---

## Immediate Next Steps (Recommended Order)

1. Create a `.env` file with Supabase credentials
2. Run the schema SQL in Supabase dashboard
3. Deploy the edge function and set the Anthropic API key
4. Sign up for Apple Developer account
5. Run `eas build --platform ios --profile development`
6. Install the build on a test iPhone and verify auth + plan generation works end to end
