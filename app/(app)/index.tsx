/**
 * The Reveal — Home screen
 * Race name + date, target window, countdown, motivational truth, CTA to arc.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useRaces } from '../../hooks/useRace';
import { useTrainingPlan } from '../../hooks/useWorkouts';
import { getRevealCopy } from '../../lib/claude';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Colors, Spacing } from '../../constants/theme';
import { daysToRace, formatDistance } from '../../lib/workout-engine';

const FALLBACK_LINE = 'Train steady. Arrive sharp. Leave nothing behind.';

export default function RevealScreen() {
  const { user } = useAuth();
  const { primaryRace, loading: racesLoading } = useRaces(user?.id);
  const { plan, loading: planLoading } = useTrainingPlan(primaryRace?.race_id);
  const [motivationalLine, setMotivationalLine] = useState(FALLBACK_LINE);

  const days = primaryRace ? daysToRace(primaryRace.date) : null;
  const weeks = days !== null ? Math.floor(days / 7) : null;

  // Fetch Claude-generated copy once race + plan are loaded
  useEffect(() => {
    if (!primaryRace || days === null) return;
    getRevealCopy({
      race: primaryRace,
      days_to_race: days,
      current_phase: plan?.current_phase ?? 'base',
      trend_flag: plan?.trend_flag ?? null,
    })
      .then((r) => setMotivationalLine(r.motivational_line))
      .catch(() => {}); // silently keep fallback on error
  }, [primaryRace?.race_id, plan?.current_phase]);

  // ─── No race state ───────────────────────────────────────────────────────

  if (!racesLoading && !primaryRace) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <Text size="3xl" weight="bold" align="center">
            Drop your anchor.
          </Text>
          <Text size="md" variant="secondary" align="center" style={{ lineHeight: 24 }}>
            Add your race and Rudder builds your training plan around it.
          </Text>
          <Button
            label="Add a race"
            onPress={() => router.push('/race/new')}
            style={{ marginTop: Spacing['4'] }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Race found ──────────────────────────────────────────────────────────

  const raceDate = primaryRace
    ? new Date(primaryRace.date).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text size="xs" weight="semibold" variant="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            Rudder
          </Text>
          <Pressable onPress={() => router.push('/(app)/profile')}>
            <Ionicons name="person-circle-outline" size={28} color={Colors.text.secondary} />
          </Pressable>
        </View>

        {/* Race hero */}
        <View style={styles.hero}>
          <Text size="xs" variant="secondary" weight="semibold" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            {primaryRace?.priority} Race
          </Text>
          <Text size="4xl" weight="heavy" style={{ marginTop: Spacing['1'], lineHeight: 44 }}>
            {primaryRace?.name}
          </Text>
          <Text size="md" variant="secondary" style={{ marginTop: Spacing['1'] }}>
            {raceDate}
          </Text>
        </View>

        {/* Race details card */}
        <Card style={styles.raceCard}>
          <View style={styles.raceRow}>
            <RaceDetail icon="navigate-outline" label="Distance" value={formatDistance(primaryRace?.distance_meters ?? 0)} />
            <RaceDetail icon="water-outline" label="Environment" value={capitalize(primaryRace?.environment ?? '')} />
            <RaceDetail icon="flag-outline" label="Goal" value={goalLabel(primaryRace?.goal_type ?? 'finish')} />
          </View>
        </Card>

        {/* Countdown */}
        <LinearGradient
          colors={[Colors.bg.secondary, Colors.bg.tertiary]}
          style={styles.countdown}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text size="5xl" weight="heavy" style={{ color: Colors.brand.accent }}>
            {days}
          </Text>
          <Text size="md" variant="secondary">
            {days === 1 ? 'day' : 'days'} to {primaryRace?.name}
          </Text>
          {plan && (
            <Text size="sm" variant="secondary" style={{ marginTop: Spacing['1'] }}>
              {capitalize(plan.current_phase)} phase · {plan.compliance_score !== null ? `${Math.round(plan.compliance_score * 100)}% on plan` : 'Building baseline'}
            </Text>
          )}
        </LinearGradient>

        {/* Motivational line */}
        <Text size="md" variant="secondary" align="center" style={styles.motivational}>
          "{motivationalLine}"
        </Text>

        {/* CTA */}
        <Button
          label="View My Training Arc"
          fullWidth
          onPress={() => router.push('/(app)/arc')}
          icon={<Ionicons name="analytics-outline" size={18} color={Colors.text.inverse} />}
        />

        {/* Phase reminder */}
        {weeks !== null && (weeks === 8 || weeks === 4 || weeks === 2) && (
          <Card style={styles.checkInBanner} bordered>
            <Text size="sm" weight="semibold" style={{ color: Colors.status.behind }}>
              {weeks}-week check-in available
            </Text>
            <Text size="sm" variant="secondary">
              How are you feeling about the plan?
            </Text>
            <Button
              label="Check in now"
              variant="ghost"
              onPress={() => router.push({ pathname: '/check-in', params: { race_id: primaryRace!.race_id, weeks_out: weeks } })}
            />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function RaceDetail({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.raceDetail}>
      <Ionicons name={icon as any} size={16} color={Colors.text.secondary} />
      <Text size="xs" variant="secondary">{label}</Text>
      <Text size="sm" weight="semibold">{value}</Text>
    </View>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function goalLabel(goal: string) {
  const map: Record<string, string> = {
    finish: 'Finish',
    time: 'Time goal',
    age_group: 'Age group',
    podium: 'Podium',
    survive: 'Survive it',
  };
  return map[goal] ?? goal;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  scroll: {
    padding: Spacing['6'],
    gap: Spacing['4'],
    paddingBottom: Spacing['10'],
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing['4'],
  },
  hero: {
    gap: Spacing['1'],
  },
  raceCard: {
    padding: Spacing['4'],
  },
  raceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  raceDetail: {
    alignItems: 'center',
    gap: Spacing['1'],
    flex: 1,
  },
  countdown: {
    borderRadius: 16,
    padding: Spacing['6'],
    alignItems: 'center',
    gap: Spacing['1'],
  },
  motivational: {
    lineHeight: 24,
    fontStyle: 'italic',
    paddingHorizontal: Spacing['4'],
  },
  checkInBanner: {
    gap: Spacing['2'],
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing['8'],
    gap: Spacing['4'],
  },
});
