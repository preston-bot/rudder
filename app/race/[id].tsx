import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useRace, useRaces } from '../../hooks/useRace';
import { useTrainingPlan } from '../../hooks/useWorkouts';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Colors, Spacing } from '../../constants/theme';
import { daysToRace, formatDistance, formatDuration } from '../../lib/workout-engine';

export default function RaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { race, loading } = useRace(id);
  const { updateRace } = useRaces(user?.id);
  const { plan } = useTrainingPlan(id);

  if (loading || !race) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.empty}>
          <Text variant="secondary">Loading race...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const days = daysToRace(race.date);
  const raceDate = new Date(race.date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  async function handleMarkComplete() {
    Alert.prompt(
      'Race complete!',
      'Enter your finish time (minutes)',
      async (value) => {
        if (!value) return;
        const mins = parseFloat(value);
        await updateRace(race.race_id, {
          completed: true,
          actual_time_seconds: Math.round(mins * 60),
        });
        router.back();
      },
      'plain-text',
      '',
      'numeric',
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Priority badge */}
        <View style={styles.badge}>
          <Text size="xs" weight="semibold" variant="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            {race.priority} Race
          </Text>
          {race.completed && (
            <Text size="xs" weight="semibold" style={{ color: Colors.status.ahead }}>
              Completed
            </Text>
          )}
        </View>

        {/* Race name + date */}
        <Text size="4xl" weight="heavy" style={{ lineHeight: 44 }}>{race.name}</Text>
        <Text size="md" variant="secondary">{raceDate}</Text>

        {/* Countdown */}
        {!race.completed && (
          <Card style={styles.countdown}>
            <Text size="5xl" weight="heavy" style={{ color: Colors.brand.accent }}>{days}</Text>
            <Text variant="secondary">{days === 1 ? 'day away' : 'days away'}</Text>
          </Card>
        )}

        {/* Details */}
        <Card>
          <View style={styles.detailGrid}>
            <Detail label="Distance" value={formatDistance(race.distance_meters)} />
            <Detail label="Environment" value={capitalize(race.environment)} />
            <Detail label="Location" value={race.location || '—'} />
            <Detail label="Goal" value={goalLabel(race.goal_type)} />
            {race.goal_time_seconds && (
              <Detail label="Target time" value={formatDuration(race.goal_time_seconds)} />
            )}
            {race.wetsuit_allowed !== null && (
              <Detail label="Wetsuit" value={race.wetsuit_allowed ? 'Allowed' : 'Not allowed'} />
            )}
          </View>
        </Card>

        {/* Plan summary */}
        {plan && (
          <Card>
            <Text size="sm" weight="semibold" variant="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing['2'] }}>
              Training Plan
            </Text>
            <Detail label="Current phase" value={capitalize(plan.current_phase)} />
            {plan.compliance_score !== null && (
              <Detail label="On-plan rate" value={`${Math.round(plan.compliance_score * 100)}%`} />
            )}
            {plan.trend_flag && (
              <Detail label="Trend" value={trendLabel(plan.trend_flag)} />
            )}
          </Card>
        )}

        {/* Actual result (post-race) */}
        {race.completed && race.actual_time_seconds && (
          <Card style={{ borderColor: Colors.status.ahead, borderWidth: 1 }}>
            <Text size="sm" weight="semibold" style={{ color: Colors.status.ahead, marginBottom: Spacing['2'] }}>
              Race result
            </Text>
            <Detail label="Finish time" value={formatDuration(race.actual_time_seconds)} />
            {race.goal_time_seconds && (
              <Detail
                label="vs. goal"
                value={
                  race.actual_time_seconds <= race.goal_time_seconds
                    ? `${formatDuration(race.goal_time_seconds - race.actual_time_seconds)} under`
                    : `${formatDuration(race.actual_time_seconds - race.goal_time_seconds)} over`
                }
              />
            )}
            {race.actual_place && <Detail label="Place" value={`#${race.actual_place}`} />}
          </Card>
        )}

        {/* Actions */}
        {!race.completed && (
          <Button
            label="Mark race as complete"
            variant="secondary"
            fullWidth
            onPress={handleMarkComplete}
            icon={<Ionicons name="checkmark-circle-outline" size={18} color={Colors.text.primary} />}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text size="xs" variant="tertiary">{label}</Text>
      <Text size="md" weight="medium">{value}</Text>
    </View>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function goalLabel(goal: string) {
  const map: Record<string, string> = {
    finish: 'Finish strong',
    time: 'Time goal',
    age_group: 'Age group',
    podium: 'Podium',
    survive: 'Just survive',
  };
  return map[goal] ?? goal;
}

function trendLabel(flag: string) {
  const map: Record<string, string> = {
    ahead: 'Ahead of plan',
    on_track: 'On track',
    behind: 'Behind',
  };
  return map[flag] ?? flag;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: Spacing['6'], gap: Spacing['4'], paddingBottom: Spacing['10'] },
  badge: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  countdown: { alignItems: 'center', gap: Spacing['1'], paddingVertical: Spacing['6'] },
  detailGrid: { gap: Spacing['3'] },
  detail: { gap: 2 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
