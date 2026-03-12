import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { adjustTrainingPlan } from '../lib/claude';
import { useRace } from '../hooks/useRace';
import { useTrainingPlan } from '../hooks/useWorkouts';
import { CheckInModal } from '../components/CheckInModal';
import { supabase } from '../lib/supabase';
import type { CheckInStatus, CheckInWeek } from '../types';

export default function CheckInScreen() {
  const { race_id, weeks_out } = useLocalSearchParams<{ race_id: string; weeks_out: string }>();
  const { user } = useAuth();
  const { race } = useRace(race_id);
  const { plan, refresh } = useTrainingPlan(race_id);
  const [submitting, setSubmitting] = useState(false);

  const weeksOut = parseInt(weeks_out ?? '8') as CheckInWeek;

  async function handleCheckIn(status: CheckInStatus) {
    if (!user || !plan || !race) return;
    setSubmitting(true);
    try {
      // Record check-in
      await supabase.from('check_ins').insert({
        user_id: user.id,
        race_id,
        weeks_out: weeksOut,
        status,
        created_at: new Date().toISOString(),
      });

      // Trigger plan adjustment via Claude and persist the result
      const result = await adjustTrainingPlan({
        plan,
        profile: {} as any,
        race,
        trigger: { type: 'check_in', status, weeks_out: weeksOut },
      });

      const { error: planError } = await supabase
        .from('training_plans')
        .update({
          phases: result.updated_plan.phases,
          current_phase: result.updated_plan.current_phase,
          last_adjustment_explanation: result.user_visible_explanation,
          last_adjustment_reason: 'check_in',
          last_adjusted_at: new Date().toISOString(),
        })
        .eq('plan_id', plan.plan_id);

      if (planError) throw planError;
      await refresh();
      router.back();
    } catch (e: any) {
      Alert.alert('Check-in failed', e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CheckInModal
      visible
      weeksOut={weeksOut}
      onSubmit={handleCheckIn}
      onDismiss={() => router.back()}
    />
  );
}
