-- Rudder — Supabase Database Schema
-- Run this in the Supabase SQL editor for your project.

-- ─── Extensions ──────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ─── User Profiles ────────────────────────────────────────────────────────────
create table public.user_profiles (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  auth_provider    text not null,
  created_at       timestamptz not null default now(),
  timezone         text not null default 'UTC',
  units_preference text not null default 'meters' check (units_preference in ('yards', 'meters')),
  pool_lengths     text[] not null default '{"25m"}',

  -- Physical baseline
  age              int,
  sex              text check (sex in ('male', 'female', 'other')),
  height_cm        numeric,
  weight_kg        numeric,
  dominant_stroke  text not null default 'freestyle',
  injury_flags     text[] not null default '{}',
  medical_constraints text,

  -- Training context
  experience_level text not null default 'novice' check (experience_level in ('novice', 'experienced', 'competitive')),
  primary_identity text not null default 'swimmer' check (primary_identity in ('swimmer', 'triathlete', 'ow_specialist')),
  available_days_per_week int not null default 3,
  preferred_session_duration_min int not null default 30,
  preferred_session_duration_max int not null default 90,
  typical_constraints text[] not null default '{}',
  miss_tolerance   text not null default 'adaptive' check (miss_tolerance in ('low_guilt', 'adaptive', 'strict')),

  -- Performance
  benchmark_sets   jsonb not null default '[]',
  recent_volume_4w numeric,
  pace_zones       jsonb,
  critical_swim_speed numeric,

  -- Devices
  connected_devices jsonb not null default '[]',
  sync_hr          boolean not null default false,
  sync_hrv         boolean not null default false,
  sync_sleep       boolean not null default false,

  -- Account
  subscription_status text not null default 'free' check (subscription_status in ('free', 'paid'))
);

alter table public.user_profiles enable row level security;
create policy "Users can manage their own profile"
  on public.user_profiles for all using (auth.uid() = user_id);

-- ─── Races ────────────────────────────────────────────────────────────────────
create table public.races (
  race_id          uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  date             date not null,
  location         text not null default '',
  environment      text not null check (environment in ('lake', 'ocean', 'river', 'pool')),
  distance_meters  numeric not null,
  temp_celsius     numeric,
  wetsuit_allowed  boolean,
  goal_type        text not null check (goal_type in ('finish', 'time', 'age_group', 'podium', 'survive')),
  goal_time_seconds int,
  priority         text not null default 'A' check (priority in ('A', 'B', 'C')),
  created_at       timestamptz not null default now(),
  completed        boolean not null default false,
  actual_time_seconds int,
  actual_place     int,
  notes            text
);

alter table public.races enable row level security;
create policy "Users can manage their own races"
  on public.races for all using (auth.uid() = user_id);

create index races_user_date on public.races(user_id, date);

-- ─── Training Plans ───────────────────────────────────────────────────────────
create table public.training_plans (
  plan_id                    uuid primary key default uuid_generate_v4(),
  race_id                    uuid not null references public.races(race_id) on delete cascade,
  user_id                    uuid not null references auth.users(id) on delete cascade,
  created_at                 timestamptz not null default now(),
  last_adjusted_at           timestamptz not null default now(),
  last_adjustment_reason     text,
  last_adjustment_explanation text,   -- user-visible
  current_phase              text not null default 'base',
  phases                     jsonb not null default '[]',  -- PhaseBlock[]
  focus_areas                text[] not null default '{}',
  compliance_score           numeric check (compliance_score >= 0 and compliance_score <= 1),
  trend_flag                 text check (trend_flag in ('ahead', 'on_track', 'behind'))
);

alter table public.training_plans enable row level security;
create policy "Users can manage their own plans"
  on public.training_plans for all using (auth.uid() = user_id);

create index plans_race on public.training_plans(race_id);

-- ─── Swim Sessions ────────────────────────────────────────────────────────────
create table public.swim_sessions (
  session_id            uuid primary key default uuid_generate_v4(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  source                text not null check (source in ('garmin', 'apple_health', 'manual')),
  start_time            timestamptz not null,
  end_time              timestamptz not null,
  pool_length           text not null,
  total_distance_meters numeric not null,
  total_time_seconds    int not null,
  moving_time_seconds   int not null,
  rest_time_seconds     int not null default 0,
  avg_pace_per_100      numeric not null,
  stroke                text not null default 'freestyle',
  avg_hr                int,
  max_hr                int,
  intervals             jsonb not null default '[]',  -- SwimInterval[]
  rpe                   int check (rpe >= 1 and rpe <= 10),
  notes                 text,
  rudder_flags          text[] not null default '{}'
);

alter table public.swim_sessions enable row level security;
create policy "Users can manage their own sessions"
  on public.swim_sessions for all using (auth.uid() = user_id);

create index sessions_user_time on public.swim_sessions(user_id, start_time desc);

-- ─── Check-Ins ────────────────────────────────────────────────────────────────
create table public.check_ins (
  check_in_id              uuid primary key default uuid_generate_v4(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  race_id                  uuid not null references public.races(race_id) on delete cascade,
  weeks_out                int not null check (weeks_out in (4, 8)),
  status                   text not null check (status in ('ahead', 'on_target', 'behind')),
  confidence_level         int check (confidence_level >= 1 and confidence_level <= 5),
  notes                    text,
  created_at               timestamptz not null default now(),
  plan_adjustment_summary  text,
  unique (race_id, weeks_out)  -- one check-in per milestone per race
);

alter table public.check_ins enable row level security;
create policy "Users can manage their own check-ins"
  on public.check_ins for all using (auth.uid() = user_id);

-- ─── Trigger: auto-create user profile on sign-up ─────────────────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles (user_id, auth_provider)
  values (
    new.id,
    coalesce(new.raw_app_meta_data->>'provider', 'email')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
