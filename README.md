# Rudder

A training companion app for open-water swimmers. Translates pool effort into open-water readiness, without spreadsheets or guesswork.

**Stack:** React Native (Expo) · Supabase · Claude (Anthropic)

---

## Project Structure

```
rudder/
├── app/                        # Expo Router screens
│   ├── (auth)/sign-in.tsx      # Apple + Google auth
│   ├── (app)/
│   │   ├── index.tsx           # The Reveal (home)
│   │   ├── arc.tsx             # Training Arc
│   │   ├── week.tsx            # This Week
│   │   └── profile.tsx         # Profile + settings
│   ├── race/new.tsx            # Race entry (3-step)
│   ├── workout/[id].tsx        # Single workout
│   └── check-in.tsx            # 8-week / 4-week check-in
│
├── components/
│   ├── ui/                     # Button, Card, Text
│   ├── TrainingArc.tsx         # SVG arc visualization
│   ├── WorkoutCard.tsx         # Session card
│   └── CheckInModal.tsx        # Check-in sheet
│
├── lib/
│   ├── supabase.ts             # Supabase client
│   ├── claude.ts               # AI calls (via edge function)
│   └── workout-engine.ts       # Deterministic utilities
│
├── hooks/
│   ├── useAuth.ts
│   ├── useRace.ts
│   └── useWorkouts.ts
│
├── types/index.ts              # All shared TypeScript types
├── constants/theme.ts          # Colors, typography, spacing
│
└── supabase/
    ├── schema.sql              # Full DB schema — run once in SQL editor
    └── functions/ai/index.ts  # Edge function (Claude proxy)
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Supabase project

1. Create a project at [supabase.com](https://supabase.com)
2. In the SQL editor, run `supabase/schema.sql`
3. Enable Apple and Google OAuth providers in Authentication → Providers
4. Copy your URL and anon key

### 3. Environment

```bash
cp .env.example .env
# Fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
```

### 4. Deploy the AI Edge Function

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref

supabase functions deploy ai
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

### 5. Run

```bash
# iOS simulator
npx expo start --ios

# Android emulator
npx expo start --android

# Physical device (Expo Go)
npx expo start
```

---

## Architecture Decisions

### Claude is server-side only
All AI calls go through the `supabase/functions/ai` Edge Function. The Anthropic API key never touches the client. The mobile app calls `supabase.functions.invoke('ai', { body: { action, ...payload } })`.

### No plan regeneration
When the plan is adjusted (missed session, check-in, recovery signal), Claude returns `deltas` — small adjustments to existing sessions. The full plan structure is never discarded, only mutated. This matches the spec: *"Adjustments are incremental on individual workouts."*

### Pool length normalization
Garmin and Apple Health both have known issues with 25y pools (reporting laps as 25m). Rudder reconstructs true distance using `lib/workout-engine.ts#normalizeDistance`.

### Wearable integration strategy
- **Apple Health** → via HealthKit (requires `expo-health` or native module in bare workflow)
- **Garmin Connect** → via Garmin Connect IQ / Connect API OAuth
- Everything else (Coros, Suunto, Polar) routes through Apple Health or Garmin as specified in scope

---

## MVP Proof of Concepts (pre-build checklist)

Per the spec, three things to validate before full build:

1. **Raw wearable data** — Pull a sample Garmin FIT file and Apple Health XML export. Map fields to `SwimSession` type. Confirm `SwimInterval` can be reconstructed from raw timestamps.

2. **AI plan generation** — Run `supabase/functions/ai/index.ts` locally with a sample race. Confirm Claude returns valid JSON matching `TrainingPlan` schema. Test adjustment deltas.

3. **Send to device** — Confirm Garmin Connect IQ SDK can receive a structured workout and sync completion data back. Apple Watch via HealthKit workouts. This is the hardest POC — validate early.

---

## Free vs Paid (feature flag ready)

`user_profiles.subscription_status` drives gating. Paid features:
- Garmin Connect sync
- Recovery signal inputs (HRV, sleep)
- Check-in plan adjustments
- Race completion analysis

Free tier: manual entry, basic plan, this week view.
