import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { poolLengthMeters } from '../lib/workout-engine';
import { adjustTrainingPlan } from '../lib/claude';
import type { TrainingPlan, PlannedSession, SwimSession, PoolLength, StrokeType, Race } from '../types';

// ─── Utility ──────────────────────────────────────────────────────────────────

/** Find a planned session anywhere in the plan by session_id. */
export function getPlannedSession(
  plan: TrainingPlan,
  sessionId: string,
): PlannedSession | null {
  for (const phase of plan.phases) {
    for (const week of phase.weeks) {
      const found = week.sessions.find((s) => s.session_id === sessionId);
      if (found) return found;
    }
  }
  return null;
}

/** Derive trend flag from a compliance score (0–1). */
function computeTrendFlag(compliance: number | null): 'ahead' | 'on_track' | 'behind' | null {
  if (compliance === null) return null;
  if (compliance >= 0.85) return 'ahead';
  if (compliance >= 0.65) return 'on_track';
  return 'behind';
}

/** Recalculate compliance from a phases array. */
function calcCompliance(phases: TrainingPlan['phases']): number | null {
  const allPast = phases
    .flatMap((p) => p.weeks.flatMap((w) => w.sessions))
    .filter((s) => new Date(s.date) <= new Date());
  return allPast.length > 0
    ? allPast.filter((s) => s.completed).length / allPast.length
    : null;
}

// ─── Training Plan ────────────────────────────────────────────────────────────

export function useTrainingPlan(race_id: string | undefined) {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    if (!race_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('training_plans')
      .select('*')
      .eq('race_id', race_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      setError(error.message);
    } else {
      setPlan(data ?? null);
    }
    setLoading(false);
  }, [race_id]);

  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);

  /**
   * Mark a planned session as complete.
   * Updates the plan JSONB, recalculates compliance, and links the swim session.
   */
  async function markSessionDone(
    sessionId: string,
    rpe: number,
    swimSessionId?: string,
  ) {
    if (!plan) throw new Error('No plan loaded');

    const updatedPhases = plan.phases.map((phase) => ({
      ...phase,
      weeks: phase.weeks.map((week) => ({
        ...week,
        sessions: week.sessions.map((s) =>
          s.session_id === sessionId
            ? { ...s, completed: true, actual_session_id: swimSessionId ?? null }
            : s,
        ),
      })),
    }));

    const compliance = calcCompliance(updatedPhases);

    const { error } = await supabase
      .from('training_plans')
      .update({
        phases: updatedPhases,
        compliance_score: compliance,
        trend_flag: computeTrendFlag(compliance),
      })
      .eq('plan_id', plan.plan_id);

    if (error) throw error;
    await fetchPlan();
  }

  /** Mark a session as skipped. Flags it without penalizing compliance. */
  async function skipSession(sessionId: string) {
    if (!plan) throw new Error('No plan loaded');

    const updatedPhases = plan.phases.map((phase) => ({
      ...phase,
      weeks: phase.weeks.map((week) => ({
        ...week,
        sessions: week.sessions.map((s) =>
          s.session_id === sessionId ? { ...s, skipped: true } : s,
        ),
      })),
    }));

    const compliance = calcCompliance(updatedPhases);

    const { error } = await supabase
      .from('training_plans')
      .update({
        phases: updatedPhases,
        compliance_score: compliance,
        trend_flag: computeTrendFlag(compliance),
      })
      .eq('plan_id', plan.plan_id);

    if (error) throw error;
    await fetchPlan();
  }

  /**
   * Detect past-due missed sessions and trigger Claude to adapt the plan.
   * Runs at most once per day (guarded by last_adjusted_at).
   * Call this on screen mount from the week or reveal screen.
   */
  async function detectAndAdaptMissedSessions(race: Race) {
    if (!plan) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Cooldown: skip if plan was already adapted today
    if (plan.last_adjusted_at) {
      const lastAdjusted = new Date(plan.last_adjusted_at);
      lastAdjusted.setHours(0, 0, 0, 0);
      if (lastAdjusted.getTime() >= today.getTime()) return;
    }

    const missedSessions = plan.phases
      .flatMap((p) => p.weeks.flatMap((w) => w.sessions))
      .filter((s) => {
        const d = new Date(s.date);
        d.setHours(0, 0, 0, 0);
        return d < today && !s.completed && !s.skipped;
      });

    if (missedSessions.length === 0) return;

    const result = await adjustTrainingPlan({
      plan,
      profile: {} as any,
      race,
      trigger: { type: 'missed_session', session_ids: missedSessions.map((s) => s.session_id) },
    });

    const updatedCompliance = calcCompliance(result.updated_plan.phases);

    const { error } = await supabase
      .from('training_plans')
      .update({
        phases: result.updated_plan.phases,
        current_phase: result.updated_plan.current_phase,
        compliance_score: updatedCompliance,
        trend_flag: computeTrendFlag(updatedCompliance),
        last_adjustment_explanation: result.user_visible_explanation,
        last_adjustment_reason: 'missed_session',
        last_adjusted_at: new Date().toISOString(),
      })
      .eq('plan_id', plan.plan_id);

    if (error) throw error;
    await fetchPlan();
  }

  return { plan, loading, error, refresh: fetchPlan, markSessionDone, skipSession, detectAndAdaptMissedSessions };
}

// ─── This Week ────────────────────────────────────────────────────────────────

export function useThisWeekSessions(plan: TrainingPlan | null): PlannedSession[] {
  if (!plan) return [];

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  for (const phase of plan.phases) {
    for (const week of phase.weeks) {
      const weekStart = new Date(week.start_date);
      if (weekStart >= startOfWeek && weekStart <= endOfWeek) {
        return week.sessions;
      }
    }
  }

  // Fallback: match sessions by individual date
  return plan.phases
    .flatMap((p) => p.weeks.flatMap((w) => w.sessions))
    .filter((s) => {
      const d = new Date(s.date);
      return d >= startOfWeek && d <= endOfWeek;
    });
}

// ─── Swim Sessions (logged / completed) ──────────────────────────────────────

export function useSwimSessions(userId: string | undefined) {
  const [sessions, setSessions] = useState<SwimSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('swim_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false })
      .limit(20);

    setSessions(data ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  async function logManualSession(params: {
    user_id: string;
    pool_length: PoolLength;
    distance_meters: number;
    duration_minutes: number;
    stroke: StrokeType;
    rpe: number;
    notes: string;
  }): Promise<SwimSession> {
    const totalSeconds = Math.round(params.duration_minutes * 60);
    const avgPace = (totalSeconds / params.distance_meters) * 100; // sec/100m

    const now = new Date();
    const startTime = new Date(now.getTime() - totalSeconds * 1000).toISOString();

    const sessionData = {
      user_id: params.user_id,
      source: 'manual' as const,
      start_time: startTime,
      end_time: now.toISOString(),
      pool_length: params.pool_length,
      total_distance_meters: params.distance_meters,
      total_time_seconds: totalSeconds,
      moving_time_seconds: totalSeconds,
      rest_time_seconds: 0,
      avg_pace_per_100: avgPace,
      stroke: params.stroke,
      avg_hr: null,
      max_hr: null,
      intervals: [],
      rpe: params.rpe,
      notes: params.notes || null,
      rudder_flags: ['manual_entry'],
    };

    const { data, error } = await supabase
      .from('swim_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) throw error;
    setSessions((prev) => [data, ...prev]);
    return data as SwimSession;
  }

  return { sessions, loading, logManualSession, refresh: fetchSessions };
}
