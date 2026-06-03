-- Add explicit available-weekdays to user_profiles so plan generation can
-- schedule sessions only on days the swimmer is actually available.
alter table public.user_profiles
  add column if not exists available_weekdays text[]
  not null default '{}';

comment on column public.user_profiles.available_weekdays is
  'Days of the week the swimmer can train. Lowercase three-letter codes (mon, tue, wed, thu, fri, sat, sun). Empty array = no preference; AI distributes sessions evenly.';
