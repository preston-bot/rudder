/**
 * Claude AI integration for Rudder
 *
 * IMPORTANT: The Anthropic API key must NEVER be exposed to the client.
 * All Claude calls are routed through a Supabase Edge Function (`/functions/v1/ai`).
 * The edge function holds the server-side ANTHROPIC_API_KEY.
 *
 * This module provides typed wrappers around those edge function calls.
 */

import { supabase } from './supabase';
import type {
  Race,
  UserProfile,
  TrainingPlan,
  SwimSession,
  CheckInStatus,
  FocusArea,
} from '../types';

// ─── Helper ──────────────────────────────────────────────────────────────────

async function callAI<T>(
  action: string,
  payload: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('ai', {
    body: { action, ...payload },
  });

  if (error) throw new Error(`AI call failed [${action}]: ${error.message}`);
  return data as T;
}

// ─── Plan Generation ─────────────────────────────────────────────────────────

export interface GeneratePlanInput {
  profile: UserProfile;
  race: Race;
  focus_areas: FocusArea[];
  has_benchmark: boolean;
}

export async function generateTrainingPlan(
  input: GeneratePlanInput,
): Promise<TrainingPlan> {
  return callAI<TrainingPlan>('generate_plan', input);
}

// ─── Plan Adjustment ─────────────────────────────────────────────────────────

export interface AdjustPlanInput {
  plan: TrainingPlan;
  profile: UserProfile;
  race: Race;
  trigger:
    | { type: 'missed_session'; session_ids: string[] }
    | { type: 'check_in'; status: CheckInStatus; weeks_out: 4 | 8 }
    | { type: 'benchmark_updated'; new_pace: number }
    | { type: 'recovery_signal'; hrv_trend: 'improving' | 'declining'; sleep_score: number };
}

export interface AdjustPlanResult {
  updated_plan: TrainingPlan;
  user_visible_explanation: string; // "You missed two swims — we've shifted Thursday's session..."
  deltas: PlanDelta[];
}

export interface PlanDelta {
  session_id: string;
  field: 'volume' | 'intensity' | 'recovery' | 'date';
  before: unknown;
  after: unknown;
  reason: string;
}

export async function adjustTrainingPlan(
  input: AdjustPlanInput,
): Promise<AdjustPlanResult> {
  return callAI<AdjustPlanResult>('adjust_plan', input);
}

// ─── Session Interpretation ──────────────────────────────────────────────────

export interface InterpretSessionInput {
  raw_session: Partial<SwimSession>;
  pool_length_declared: string | null;
  profile: Pick<UserProfile, 'pool_lengths' | 'pace_zones'>;
}

export interface InterpretSessionResult {
  cleaned_session: SwimSession;
  flags: string[];           // e.g. ['false_rest_detected', 'pool_length_corrected']
  summary: string;           // one-line human summary
}

export async function interpretSwimSession(
  input: InterpretSessionInput,
): Promise<InterpretSessionResult> {
  return callAI<InterpretSessionResult>('interpret_session', input);
}

// ─── Motivational Copy ───────────────────────────────────────────────────────

export interface RevealCopyInput {
  race: Race;
  days_to_race: number;
  current_phase: string;
  trend_flag: string | null;
}

export async function getRevealCopy(
  input: RevealCopyInput,
): Promise<{ motivational_line: string }> {
  return callAI<{ motivational_line: string }>('reveal_copy', input);
}
