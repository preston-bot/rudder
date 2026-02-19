/**
 * Training Arc screen — the long view from today to race day.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { useRaces } from '../../hooks/useRace';
import { useTrainingPlan } from '../../hooks/useWorkouts';
import { TrainingArc } from '../../components/TrainingArc';
import { WorkoutCard } from '../../components/WorkoutCard';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Colors, Spacing } from '../../constants/theme';
import { daysToRace } from '../../lib/workout-engine';
import type { TrainingPhase, PhaseBlock } from '../../types';

const PHASE_DETAILS: Record<TrainingPhase, { label: string; description: string; principle: string }> = {
  base: {
    label: 'Base',
    description: 'Establish aerobic capacity and technical consistency to support future load.',
    principle: 'Phase ≠ time block. Phase = best next stimulus.',
  },
  build: {
    label: 'Build',
    description: 'Progressively increase intensity and density to improve performance ceilings.',
    principle: 'Durability is stable. Recovery supports load. Press.',
  },
  specific: {
    label: 'Specific',
    description: 'Align training stimuli with race demands — pace, duration, conditions.',
    principle: "Train how you'll race. Not harder. Smarter.",
  },
  taper: {
    label: 'Taper',
    description: 'Reduce volume while maintaining intensity to maximize race-day readiness.',
    principle: 'Race is imminent. Protect fitness. Enforce taper regardless of ego.',
  },
};

export default function ArcScreen() {
  const { user } = useAuth();
  const { primaryRace } = useRaces(user?.id);
  const { plan, loading } = useTrainingPlan(primaryRace?.race_id);
  const [selectedPhase, setSelectedPhase] = useState<TrainingPhase | null>(null);

  const activePhase = selectedPhase ?? plan?.current_phase ?? 'base';
  const days = primaryRace ? daysToRace(primaryRace.date) : null;

  // Find sessions for the selected phase
  const phaseBlock = plan?.phases.find((p) => p.phase === activePhase);
  const phaseSessions = phaseBlock?.weeks.flatMap((w) => w.sessions).slice(0, 4) ?? [];

  if (!plan && !loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text size="xl" weight="semibold" align="center">No training plan yet</Text>
          <Text size="sm" variant="secondary" align="center">Add a race to generate your training arc.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text size="xs" variant="secondary" weight="semibold" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            Training Arc
          </Text>
          {days !== null && (
            <Text size="sm" variant="secondary">
              {days} days to {primaryRace?.name}
            </Text>
          )}
        </View>

        {/* Arc visualization */}
        {plan && primaryRace && (
          <TrainingArc
            phases={plan.phases}
            currentPhase={plan.current_phase}
            raceDate={primaryRace.date}
            onPhasePress={(phase) => setSelectedPhase(phase === selectedPhase ? null : phase)}
          />
        )}

        {/* Phase detail */}
        <Card style={styles.phaseCard}>
          <Text size="xs" variant="secondary" weight="semibold" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            {PHASE_DETAILS[activePhase].label} Phase
          </Text>
          <Text size="md" weight="medium" style={{ marginTop: Spacing['1'], lineHeight: 22 }}>
            {PHASE_DETAILS[activePhase].description}
          </Text>
          <Text size="sm" variant="secondary" style={{ marginTop: Spacing['3'], fontStyle: 'italic', lineHeight: 20 }}>
            {PHASE_DETAILS[activePhase].principle}
          </Text>
        </Card>

        {/* Last plan adjustment */}
        {plan?.last_adjustment_explanation && (
          <Card style={styles.adjustmentCard} bordered>
            <Text size="xs" variant="secondary" weight="semibold" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              Plan updated
            </Text>
            <Text size="sm" style={{ marginTop: Spacing['1'], lineHeight: 20 }}>
              {plan.last_adjustment_explanation}
            </Text>
            {plan.last_adjusted_at && (
              <Text size="xs" variant="tertiary" style={{ marginTop: Spacing['2'] }}>
                {new Date(plan.last_adjusted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            )}
          </Card>
        )}

        {/* Sessions in selected phase */}
        {phaseSessions.length > 0 && (
          <View style={styles.sessionsSection}>
            <Text size="md" weight="semibold">
              Upcoming in {PHASE_DETAILS[activePhase].label}
            </Text>
            {phaseSessions.map((session) => (
              <WorkoutCard key={session.session_id} session={session} showDate />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  scroll: {
    padding: Spacing['6'],
    gap: Spacing['5'],
    paddingBottom: Spacing['10'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  phaseCard: {
    gap: Spacing['1'],
  },
  adjustmentCard: {
    borderColor: Colors.brand.primary + '60',
  },
  sessionsSection: {
    gap: Spacing['3'],
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['8'],
    gap: Spacing['3'],
  },
});
