// ─── Auth ───────────────────────────────────────────────────────────────────

export type AuthProvider = 'apple' | 'google';

// ─── User Profile ────────────────────────────────────────────────────────────

export type UnitsPreference = 'yards' | 'meters';
export type PoolLength = '20m' | '25y' | '25m';
export type DominantStroke = 'freestyle' | 'backstroke' | 'breaststroke' | 'butterfly';
export type InjuryFlag = 'shoulder' | 'knee' | 'back' | 'hip' | 'neck';
export type ExperienceLevel = 'novice' | 'experienced' | 'competitive';
export type PrimaryIdentity = 'swimmer' | 'triathlete' | 'ow_specialist';
export type MissTolerance = 'low_guilt' | 'adaptive' | 'strict';

export interface BenchmarkSet {
  distance: number; // meters
  pool_length: PoolLength;
  avg_pace: number; // seconds per 100
  date: string; // ISO date
}

export interface PaceZones {
  easy: [number, number];       // [min, max] sec/100
  aerobic: [number, number];
  threshold: [number, number];
  speed: [number, number];
}

export interface ConnectedDevice {
  provider: 'garmin' | 'apple_health';
  connected_at: string;
  last_sync: string | null;
}

export interface UserProfile {
  user_id: string;
  auth_provider: AuthProvider;
  created_at: string;
  timezone: string;
  units_preference: UnitsPreference;
  pool_lengths: PoolLength[];

  // Physical baseline
  age: number | null;
  sex: 'male' | 'female' | 'other' | null;
  height_cm: number | null;
  weight_kg: number | null;
  dominant_stroke: DominantStroke;
  injury_flags: InjuryFlag[];
  medical_constraints: string | null;

  // Training context
  experience_level: ExperienceLevel;
  primary_identity: PrimaryIdentity;
  available_days_per_week: number;
  preferred_session_duration_min: number;
  preferred_session_duration_max: number;
  typical_constraints: string[];
  miss_tolerance: MissTolerance;

  // Performance
  benchmark_sets: BenchmarkSet[];
  recent_volume_4w: number | null; // meters
  pace_zones: PaceZones | null;
  critical_swim_speed: number | null; // sec/100

  // Devices
  connected_devices: ConnectedDevice[];
  sync_hr: boolean;
  sync_hrv: boolean;
  sync_sleep: boolean;

  // Meta
  subscription_status: 'free' | 'paid';
}

// ─── Races ───────────────────────────────────────────────────────────────────

export type RaceEnvironment = 'lake' | 'ocean' | 'river' | 'pool';
export type GoalType = 'finish' | 'time' | 'age_group' | 'podium' | 'survive';
export type RacePriority = 'A' | 'B' | 'C';

export interface Race {
  race_id: string;
  user_id: string;
  name: string;
  date: string; // ISO date
  location: string;
  environment: RaceEnvironment;
  distance_meters: number;
  temp_celsius: number | null;
  wetsuit_allowed: boolean | null;
  goal_type: GoalType;
  goal_time_seconds: number | null; // null if goal != 'time'
  priority: RacePriority;
  created_at: string;
  completed: boolean;
  actual_time_seconds: number | null;
  actual_place: number | null;
  notes: string | null;
}

// ─── Training Plan ───────────────────────────────────────────────────────────

export type TrainingPhase = 'base' | 'build' | 'specific' | 'taper';
export type FocusArea = 'endurance' | 'pace_control' | 'speed' | 'ow_skills';

export interface PhaseBlock {
  phase: TrainingPhase;
  start_date: string;
  end_date: string;
  description: string;
  weeks: WeekBlock[];
}

export interface WeekBlock {
  week_number: number;
  start_date: string;
  sessions: PlannedSession[];
}

export interface PlannedSession {
  session_id: string;
  date: string;
  type: 'long' | 'pace' | 'intervals' | 'skills' | 'benchmark';
  intent: string;         // e.g. "Aerobic depth"
  intent_description: string; // e.g. "Today is about swimming long without drifting."
  pool_length: PoolLength;
  total_distance_meters: number;
  total_time_minutes: number;
  effort_band: 'easy' | 'aerobic' | 'threshold' | 'speed';
  intervals: PlannedInterval[];
  completed: boolean;
  skipped: boolean;
  actual_session_id: string | null;
}

export interface PlannedInterval {
  reps: number;
  distance_meters: number;
  rest_seconds: number;
  effort_band: 'easy' | 'aerobic' | 'threshold' | 'speed';
  note: string | null;
}

export interface TrainingPlan {
  plan_id: string;
  race_id: string;
  user_id: string;
  created_at: string;
  last_adjusted_at: string;
  last_adjustment_reason: string | null;
  last_adjustment_explanation: string | null; // user-visible
  current_phase: TrainingPhase;
  phases: PhaseBlock[];
  focus_areas: FocusArea[];
  compliance_score: number | null; // 0–1
  trend_flag: 'ahead' | 'on_track' | 'behind' | null;
}

// ─── Swim Sessions (actual/logged) ───────────────────────────────────────────

export type StrokeType = 'freestyle' | 'backstroke' | 'breaststroke' | 'butterfly' | 'mixed';
export type DataSource = 'garmin' | 'apple_health' | 'manual';

export interface SwimInterval {
  sequence: number;
  distance_meters: number;
  duration_seconds: number;
  pace_per_100: number;
  rest_seconds: number;
  turn_count: number | null;
  stroke: StrokeType;
  is_false_rest: boolean; // Rudder flagged standing-on-wall time
}

export interface SwimSession {
  session_id: string;
  user_id: string;
  source: DataSource;
  start_time: string;
  end_time: string;
  pool_length: PoolLength;
  total_distance_meters: number;
  total_time_seconds: number;
  moving_time_seconds: number;
  rest_time_seconds: number;
  avg_pace_per_100: number;
  stroke: StrokeType;
  avg_hr: number | null;
  max_hr: number | null;
  intervals: SwimInterval[];
  rpe: number | null; // 1–10
  notes: string | null;
  rudder_flags: string[]; // e.g. ['false_rest_detected', 'pool_length_corrected']
}

// ─── Check-Ins ───────────────────────────────────────────────────────────────

export type CheckInWeek = 8 | 4;
export type CheckInStatus = 'ahead' | 'on_target' | 'behind';

export interface CheckIn {
  check_in_id: string;
  user_id: string;
  race_id: string;
  weeks_out: CheckInWeek;
  status: CheckInStatus;
  confidence_level: number | null; // 1–5
  notes: string | null;
  created_at: string;
  plan_adjustment_summary: string | null;
}

// ─── Navigation (Expo Router typed routes) ───────────────────────────────────

export type RootStackParamList = {
  '(auth)/sign-in': undefined;
  '(app)/index': undefined;
  '(app)/arc': undefined;
  '(app)/week': undefined;
  '(app)/profile': undefined;
  'race/new': undefined;
  'race/[id]': { id: string };
  'workout/[id]': { id: string };
  'check-in': { race_id: string; weeks_out: CheckInWeek };
};
