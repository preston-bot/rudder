/**
 * Single workout detail screen.
 * Fetches the planned session from the active training plan, shows intent +
 * intervals, and handles post-swim RPE + "mark done" save.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { formatDistance } from '../../lib/workout-engine';
import { useAuth } from '../../hooks/useAuth';
import { useRaces } from '../../hooks/useRace';
import { useTrainingPlan, getPlannedSession } from '../../hooks/useWorkouts';
import { useWatchKit } from '../../hooks/useWatchKit';
import type { PlannedInterval } from '../../types';

const EFFORT_LABELS = {
  easy: 'Easy', aerobic: 'Aerobic', threshold: 'Threshold', speed: 'Speed',
};
const EFFORT_COLORS = {
  easy: Colors.effort.easy, aerobic: Colors.effort.aerobic,
  threshold: Colors.effort.threshold, speed: Colors.effort.speed,
};
const RPE_LABELS: Record<number, string> = {
  1: 'Very easy', 2: 'Easy', 3: 'Moderate', 4: 'Somewhat hard',
  5: 'Hard', 6: 'Hard', 7: 'Very hard', 8: 'Very hard',
  9: 'Extremely hard', 10: 'Max effort',
};

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { primaryRace } = useRaces(user?.id);
  const { plan, loading, markSessionDone, skipSession } = useTrainingPlan(primaryRace?.race_id);
  const { paired, watchAppInstalled, reachable, sending, lastSentAt, sendWorkout } = useWatchKit();

  const [rpe, setRpe] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const session = plan && id ? getPlannedSession(plan, id) : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.brand.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text variant="secondary">Session not found.</Text>
          <Button label="Go back" variant="ghost" onPress={() => router.back()} style={{ marginTop: Spacing['4'] }} />
        </View>
      </SafeAreaView>
    );
  }

  async function handleMarkDone() {
    if (!rpe) {
      Alert.alert('How hard was it?', 'Select an RPE before saving.');
      return;
    }
    setSaving(true);
    try {
      await markSessionDone(session!.session_id, rpe);
      router.back();
    } catch (e: any) {
      Alert.alert('Error saving', e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    Alert.alert(
      'Skip this session?',
      'It will be marked as skipped. The plan adapts around it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: async () => {
            await skipSession(session!.session_id);
            router.back();
          },
        },
      ],
    );
  }

  const effortColor = EFFORT_COLORS[session.effort_band];
  const sessionDate = new Date(session.date).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Type + date */}
        <View style={styles.badge}>
          <View style={[styles.effortDot, { backgroundColor: effortColor }]} />
          <Text size="xs" weight="semibold" variant="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            {session.type.charAt(0).toUpperCase() + session.type.slice(1)}
          </Text>
          <Text size="xs" variant="tertiary">· {sessionDate}</Text>
        </View>

        {/* Intent */}
        <Text size="3xl" weight="bold" style={{ lineHeight: 38 }}>
          {session.intent}
        </Text>
        <Text size="md" variant="secondary" style={{ lineHeight: 24 }}>
          {session.intent_description}
        </Text>

        {/* Completed / skipped banners */}
        {session.completed && (
          <Card style={[styles.statusCard, { borderColor: Colors.status.ahead }]}>
            <Ionicons name="checkmark-circle" size={18} color={Colors.status.ahead} />
            <Text size="sm" weight="semibold" style={{ color: Colors.status.ahead }}>Completed</Text>
          </Card>
        )}
        {session.skipped && (
          <Card style={[styles.statusCard, { borderColor: Colors.text.tertiary }]}>
            <Text size="sm" variant="secondary">This session was skipped.</Text>
          </Card>
        )}

        {/* Key metrics */}
        <Card style={styles.metricsCard}>
          <View style={styles.metricsRow}>
            <Metric label="Distance" value={formatDistance(session.total_distance_meters)} icon="navigate-outline" />
            <Metric label="Time" value={`~${session.total_time_minutes}m`} icon="time-outline" />
            <Metric label="Pool" value={session.pool_length} icon="water-outline" />
          </View>
          <View style={styles.effortBadge}>
            <View style={[styles.effortDot, { backgroundColor: effortColor }]} />
            <Text size="sm" weight="semibold" style={{ color: effortColor }}>
              {EFFORT_LABELS[session.effort_band]} effort
            </Text>
          </View>
        </Card>

        {/* Intervals */}
        {session.intervals.length > 0 && (
          <View style={styles.section}>
            <Text size="md" weight="semibold">Structure</Text>
            {session.intervals.map((interval, i) => (
              <IntervalRow key={i} interval={interval} />
            ))}
          </View>
        )}

        {/* Send to Watch */}
        {paired && watchAppInstalled && !session.completed && !session.skipped && (
          <Card style={styles.watchCard}>
            <View style={styles.watchRow}>
              <Ionicons name="watch-outline" size={20} color={reachable ? Colors.status.ahead : Colors.text.secondary} />
              <View style={{ flex: 1 }}>
                <Text size="sm" weight="semibold">Send to Watch</Text>
                <Text size="xs" variant="tertiary">
                  {reachable ? 'Watch app is active' : 'Watch app not open — queued on save'}
                </Text>
              </View>
              <Button
                label={lastSentAt ? 'Resend' : 'Send'}
                variant="secondary"
                size="sm"
                loading={sending}
                onPress={() => sendWorkout(session!)}
              />
            </View>
            {lastSentAt && (
              <Text size="xs" variant="secondary" style={{ color: Colors.status.ahead }}>
                Sent at {new Date(lastSentAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </Card>
        )}

        {/* RPE + actions — only if not already resolved */}
        {!session.completed && !session.skipped && (
          <>
            <View style={styles.section}>
              <Text size="md" weight="semibold">How hard was it? (RPE 1–10)</Text>
              <View style={styles.rpeRow}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <Button
                    key={n}
                    label={String(n)}
                    variant={rpe === n ? 'primary' : 'secondary'}
                    size="sm"
                    onPress={() => setRpe(n)}
                    style={{ minWidth: 36, flex: 1 }}
                  />
                ))}
              </View>
              {rpe !== null && (
                <Text size="sm" variant="secondary" align="center">{RPE_LABELS[rpe]}</Text>
              )}
            </View>

            <Button
              label="Mark as done"
              fullWidth
              loading={saving}
              onPress={handleMarkDone}
              icon={<Ionicons name="checkmark-circle-outline" size={18} color={Colors.text.inverse} />}
            />
            <Button label="Skip this session" variant="ghost" fullWidth onPress={handleSkip} />
          </>
        )}

        {(session.completed || session.skipped) && (
          <Button label="Back" variant="secondary" fullWidth onPress={() => router.back()} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function IntervalRow({ interval }: { interval: PlannedInterval }) {
  const effortColor = EFFORT_COLORS[interval.effort_band];
  return (
    <Card style={styles.intervalCard}>
      <View style={styles.intervalHeader}>
        <Text size="sm" weight="semibold">
          {interval.reps > 1 ? `${interval.reps}×` : ''}{formatDistance(interval.distance_meters)}
        </Text>
        <View style={[styles.effortPill, { backgroundColor: effortColor + '30' }]}>
          <Text size="xs" weight="semibold" style={{ color: effortColor }}>
            {EFFORT_LABELS[interval.effort_band]}
          </Text>
        </View>
      </View>
      {interval.rest_seconds > 0 && (
        <Text size="xs" variant="tertiary">{interval.rest_seconds}s rest</Text>
      )}
      {interval.note && (
        <Text size="sm" variant="secondary" style={{ lineHeight: 18 }}>{interval.note}</Text>
      )}
    </Card>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon as any} size={16} color={Colors.text.secondary} />
      <Text size="xs" variant="secondary">{label}</Text>
      <Text size="md" weight="semibold">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: Spacing['6'], gap: Spacing['4'], paddingBottom: Spacing['10'] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing['4'] },
  badge: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  effortDot: { width: 8, height: 8, borderRadius: 4 },
  statusCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'], borderWidth: 1 },
  metricsCard: { gap: Spacing['3'] },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  metric: { alignItems: 'center', gap: Spacing['1'] },
  effortBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  effortPill: { paddingHorizontal: Spacing['2'], paddingVertical: 2, borderRadius: BorderRadius.full },
  section: { gap: Spacing['3'] },
  intervalCard: { gap: Spacing['1'] },
  intervalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rpeRow: { flexDirection: 'row', gap: Spacing['1'] },
  watchCard: { gap: Spacing['2'] },
  watchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
});
