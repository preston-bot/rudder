/**
 * Races list screen.
 * Shows all upcoming and completed races.
 * Entry point from Profile → Races row.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useRaces } from '../hooks/useRace';
import { Text } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { daysToRace, formatDistance } from '../lib/workout-engine';
import type { Race } from '../types';

const PRIORITY_COLORS: Record<string, string> = {
  A: Colors.brand.accent,
  B: Colors.brand.primary,
  C: Colors.text.tertiary,
};

export default function RacesScreen() {
  const { user } = useAuth();
  const { races, loading } = useRaces(user?.id);

  const upcoming = races.filter((r) => !r.completed && new Date(r.date) >= new Date());
  const completed = races.filter((r) => r.completed || new Date(r.date) < new Date());

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.brand.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Upcoming */}
        {upcoming.length > 0 && (
          <View style={styles.section}>
            <Text size="xs" variant="tertiary" weight="semibold" style={styles.sectionLabel}>
              UPCOMING
            </Text>
            {upcoming.map((race) => (
              <RaceCard key={race.race_id} race={race} />
            ))}
          </View>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <View style={styles.section}>
            <Text size="xs" variant="tertiary" weight="semibold" style={styles.sectionLabel}>
              COMPLETED
            </Text>
            {completed.map((race) => (
              <RaceCard key={race.race_id} race={race} />
            ))}
          </View>
        )}

        {races.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="flag-outline" size={40} color={Colors.text.tertiary} />
            <Text size="lg" weight="semibold" align="center">No races yet</Text>
            <Text size="sm" variant="secondary" align="center" style={{ lineHeight: 20 }}>
              Add your target race and Rudder builds your training plan around it.
            </Text>
          </View>
        )}

        <Button
          label="Add a race"
          fullWidth
          onPress={() => router.push('/race/new')}
          icon={<Ionicons name="add-circle-outline" size={18} color={Colors.text.inverse} />}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function RaceCard({ race }: { race: Race }) {
  const days = daysToRace(race.date);
  const raceDate = new Date(race.date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const priorityColor = PRIORITY_COLORS[race.priority] ?? Colors.text.tertiary;

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/race/[id]', params: { id: race.race_id } })}
      style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
    >
      <Card style={styles.raceCard}>
        {/* Left accent */}
        <View style={[styles.priorityAccent, { backgroundColor: priorityColor }]} />

        <View style={{ flex: 1, gap: Spacing['1'] }}>
          <View style={styles.raceHeader}>
            <Text size="md" weight="semibold" style={{ flex: 1 }} numberOfLines={1}>
              {race.name}
            </Text>
            <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
              <Text size="xs" weight="semibold" style={{ color: priorityColor }}>
                {race.priority}
              </Text>
            </View>
          </View>

          <Text size="sm" variant="secondary">{raceDate}</Text>

          <View style={styles.raceMeta}>
            <View style={styles.metaChip}>
              <Ionicons name="navigate-outline" size={12} color={Colors.text.tertiary} />
              <Text size="xs" variant="tertiary">{formatDistance(race.distance_meters)}</Text>
            </View>
            <View style={styles.metaChip}>
              <Ionicons name="water-outline" size={12} color={Colors.text.tertiary} />
              <Text size="xs" variant="tertiary" style={{ textTransform: 'capitalize' }}>{race.environment}</Text>
            </View>
            {race.completed ? (
              <View style={styles.metaChip}>
                <Ionicons name="checkmark-circle" size={12} color={Colors.status.ahead} />
                <Text size="xs" style={{ color: Colors.status.ahead }}>Done</Text>
              </View>
            ) : (
              <View style={styles.metaChip}>
                <Ionicons name="time-outline" size={12} color={Colors.text.tertiary} />
                <Text size="xs" variant="tertiary">{days} days</Text>
              </View>
            )}
          </View>
        </View>

        <Ionicons name="chevron-forward" size={16} color={Colors.text.tertiary} />
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: Spacing['6'], gap: Spacing['5'], paddingBottom: Spacing['10'] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: { gap: Spacing['3'] },
  sectionLabel: { letterSpacing: 1, marginLeft: Spacing['1'] },
  empty: {
    alignItems: 'center',
    gap: Spacing['3'],
    paddingVertical: Spacing['10'],
  },
  raceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    paddingLeft: 0,
    overflow: 'hidden',
  },
  priorityAccent: {
    width: 4,
    alignSelf: 'stretch',
    borderTopLeftRadius: BorderRadius.md,
    borderBottomLeftRadius: BorderRadius.md,
  },
  raceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  priorityBadge: {
    paddingHorizontal: Spacing['2'],
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  raceMeta: {
    flexDirection: 'row',
    gap: Spacing['3'],
    flexWrap: 'wrap',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
