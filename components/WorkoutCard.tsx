import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius, Typography } from '../constants/theme';
import { Text } from './ui/Text';
import { Card } from './ui/Card';
import { formatDistance, formatDuration } from '../lib/workout-engine';
import type { PlannedSession } from '../types';

const EFFORT_COLORS = {
  easy: Colors.effort.easy,
  aerobic: Colors.effort.aerobic,
  threshold: Colors.effort.threshold,
  speed: Colors.effort.speed,
};

const SESSION_TYPE_LABELS = {
  long: 'Long Swim',
  pace: 'Pace',
  intervals: 'Intervals',
  skills: 'Skills',
  benchmark: 'Benchmark',
};

interface Props {
  session: PlannedSession;
  showDate?: boolean;
}

export function WorkoutCard({ session, showDate = false }: Props) {
  const isPast = new Date(session.date) < new Date() && !session.completed;
  const isToday =
    new Date(session.date).toDateString() === new Date().toDateString();

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/workout/${session.session_id}`);
  }

  return (
    <Pressable onPress={handlePress} style={({ pressed }) => pressed && { opacity: 0.8 }}>
      <Card style={[styles.card, isToday && styles.cardToday, session.completed && styles.cardCompleted]}>
        {/* Header row */}
        <View style={styles.header}>
          <View style={styles.typeRow}>
            <View style={[styles.effortDot, { backgroundColor: EFFORT_COLORS[session.effort_band] }]} />
            <Text size="xs" weight="semibold" variant="secondary" style={{ textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {SESSION_TYPE_LABELS[session.type]}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            {session.completed && (
              <Text size="xs" weight="semibold" style={{ color: Colors.status.onTarget }}>Done</Text>
            )}
            {session.skipped && (
              <Text size="xs" weight="semibold" style={{ color: Colors.text.tertiary }}>Skipped</Text>
            )}
            {isToday && !session.completed && (
              <Text size="xs" weight="semibold" style={{ color: Colors.brand.accent }}>Today</Text>
            )}
            {isPast && (
              <Text size="xs" variant="tertiary">Missed</Text>
            )}
          </View>
        </View>

        {/* Intent */}
        <Text size="lg" weight="semibold" style={styles.intent}>
          {session.intent}
        </Text>

        {showDate && (
          <Text size="sm" variant="secondary">
            {new Date(session.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        )}

        {/* Metrics row */}
        <View style={styles.metrics}>
          <Metric label="Distance" value={formatDistance(session.total_distance_meters)} />
          <View style={styles.metricDivider} />
          <Metric label="Time" value={`~${session.total_time_minutes}m`} />
          <View style={styles.metricDivider} />
          <Metric label="Pool" value={session.pool_length} />
        </View>
      </Card>
    </Pressable>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text size="xs" variant="tertiary">{label}</Text>
      <Text size="md" weight="semibold">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing['2'],
  },
  cardToday: {
    borderWidth: 1,
    borderColor: Colors.brand.primary,
  },
  cardCompleted: {
    opacity: 0.6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  effortDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusBadge: {},
  intent: {
    lineHeight: 26,
  },
  metrics: {
    flexDirection: 'row',
    gap: Spacing['4'],
    marginTop: Spacing['1'],
  },
  metric: {
    gap: 2,
  },
  metricDivider: {
    width: 1,
    backgroundColor: Colors.border.subtle,
    alignSelf: 'stretch',
    marginVertical: 2,
  },
});
