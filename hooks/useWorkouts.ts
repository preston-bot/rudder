import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { TrainingPlan, PlannedSession, SwimSession } from '../types';

export function useTrainingPlan(race_id: string | undefined) {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    if (!race_id) return;
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

  return { plan, loading, error, refresh: fetchPlan };
}

export function useThisWeekSessions(plan: TrainingPlan | null): PlannedSession[] {
  if (!plan) return [];

  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  for (const phase of plan.phases) {
    for (const week of phase.weeks) {
      const weekStart = new Date(week.start_date);
      if (weekStart >= startOfWeek && weekStart <= endOfWeek) {
        return week.sessions;
      }
    }
  }

  // Fallback: find the current week by date matching
  const allSessions = plan.phases.flatMap((p) =>
    p.weeks.flatMap((w) => w.sessions),
  );

  return allSessions.filter((s) => {
    const d = new Date(s.date);
    return d >= startOfWeek && d <= endOfWeek;
  });
}

export function useSwimSessions(userId: string | undefined) {
  const [sessions, setSessions] = useState<SwimSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('swim_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setSessions(data ?? []);
        setLoading(false);
      });
  }, [userId]);

  async function logManualSession(session: Omit<SwimSession, 'session_id'>) {
    const { data, error } = await supabase
      .from('swim_sessions')
      .insert({ ...session, source: 'manual' })
      .select()
      .single();

    if (error) throw error;
    setSessions((prev) => [data, ...prev]);
    return data as SwimSession;
  }

  return { sessions, loading, logManualSession };
}
