/**
 * Single workout detail screen.
 * Shows the intent, intervals, and post-swim reflection input.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { formatDistance, formatDuration } from '../../lib/workout-engine';

const EFFORT_LABELS = {
  easy: 'Easy',
  aerobic: 'Aerobic',
  threshold: 'Threshold',
  speed: 'Speed',
};
const EFFORT_COLORS = {
  easy: Colors.effort.easy,
  aerobic: Colors.effort.aerobic,
  threshold: Colors.effort.threshold,
  speed: Colors.effort.speed,
};
const RPE_LABELS: Record<number, string> = {
  1: 'Very easy',
  2: 'Easy',
  3: 'Moderate',
  4: 'Somewhat hard',
  5: 'Hard',
  6: 'Hard',
  7: 'Very hard',
  8: 'Very hard',
  9: 'Extremely hard',
  10: 'Max effort',
};

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [rpe, setRpe] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // In a real app, fetch session from Supabase by id
  // For scaffold, display placeholder data
  const isManual = id === 'manual';

  async function handleMarkDone() {
    if (!rpe) {
      Alert.alert('How hard was it?', 'Select an RPE before saving.');
      return;
    }
    setSaving(true);
    // TODO: update session in Supabase, trigger plan adjustment check
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    router.back();
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Session type badge */}
        <View style={styles.badge}>
          <View style={[styles.effortDot, { backgroundColor: Colors.effort.aerobic }]} />
          <Text size="xs" weight="semibold" variant="secondary" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            {isManual ? 'Manual Log' : 'Long Swim'}
          </Text>
        </View>

        {/* Intent */}
        <Text size="3xl" weight="bold" style={{ lineHeight: 38 }}>
          {isManual ? 'Log your swim' : 'Aerobic depth'}
        </Text>
        <Text size="md" variant="secondary" style={{ lineHeight: 24 }}>
          {isManual
            ? 'Enter the details of your swim below.'
            : 'Today is about swimming long without drifting. Hold your pace. Don\'t race it.'}
        </Text>

        {/* Key metrics */}
        {!isManual && (
          <Card style={styles.metricsCard}>
            <View style={styles.metricsRow}>
              <Metric label="Distance" value="3,000m" icon="navigate-outline" />
              <Metric label="Time" value="~65 min" icon="time-outline" />
              <Metric label="Pool" value="25y" icon="water-outline" />
            </View>
            <View style={styles.effortBadge}>
              <View style={[styles.effortDot, { backgroundColor: Colors.effort.aerobic }]} />
              <Text size="sm" weight="semibold" style={{ color: Colors.effort.aerobic }}>
                Aerobic effort
              </Text>
            </View>
          </Card>
        )}

        {/* Intervals */}
        {!isManual && (
          <View style={styles.section}>
            <Text size="md" weight="semibold">Structure</Text>
            {MOCK_INTERVALS.map((interval, i) => (
              <Card key={i} style={styles.intervalCard}>
                <View style={styles.intervalHeader}>
                  <Text size="sm" weight="semibold">{interval.label}</Text>
                  <View style={[styles.effortPill, { backgroundColor: EFFORT_COLORS[interval.effort] + '30' }]}>
                    <Text size="xs" weight="semibold" style={{ color: EFFORT_COLORS[interval.effort] }}>
                      {EFFORT_LABELS[interval.effort]}
                    </Text>
                  </View>
                </View>
                <Text size="sm" variant="secondary">{interval.note}</Text>
              </Card>
            ))}
          </View>
        )}

        {/* RPE selector */}
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
                style={{ minWidth: 40, flex: 1 }}
              />
            ))}
          </View>
          {rpe && (
            <Text size="sm" variant="secondary" align="center">{RPE_LABELS[rpe]}</Text>
          )}
        </View>

        {/* CTA */}
        <Button
          label="Mark as done"
          fullWidth
          loading={saving}
          onPress={handleMarkDone}
          icon={<Ionicons name="checkmark-circle-outline" size={18} color={Colors.text.inverse} />}
        />

        <Button
          label="Skip this session"
          variant="ghost"
          fullWidth
          onPress={() => router.back()}
        />
      </ScrollView>
    </SafeAreaView>
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

const MOCK_INTERVALS = [
  { label: '400m warm-up', effort: 'easy' as const, note: 'Build into it. Any stroke.' },
  { label: '3×800m @ aerobic', effort: 'aerobic' as const, note: '30s rest between each. Hold a pace you could sustain for an hour.' },
  { label: '4×100m @ threshold', effort: 'threshold' as const, note: '15s rest. This is where you learn your ceiling.' },
  { label: '200m cool-down', effort: 'easy' as const, note: 'Backstroke welcome.' },
];

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
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  effortDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  metricsCard: {
    gap: Spacing['3'],
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  metric: {
    alignItems: 'center',
    gap: Spacing['1'],
  },
  effortBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  effortPill: {
    paddingHorizontal: Spacing['2'],
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  section: {
    gap: Spacing['3'],
  },
  intervalCard: {
    gap: Spacing['1'],
  },
  intervalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rpeRow: {
    flexDirection: 'row',
    gap: Spacing['1'],
  },
});
