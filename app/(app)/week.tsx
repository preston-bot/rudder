/**
 * This Week screen — the only week that matters.
 * 3-4 swims, clearly differentiated, labeled by WHY not what.
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useRaces } from '../../hooks/useRace';
import { useTrainingPlan, useThisWeekSessions } from '../../hooks/useWorkouts';
import { WorkoutCard } from '../../components/WorkoutCard';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Colors, Spacing } from '../../constants/theme';
import { daysToRace } from '../../lib/workout-engine';

export default function WeekScreen() {
  const { user } = useAuth();
  const { primaryRace } = useRaces(user?.id);
  const { plan, loading, refresh } = useTrainingPlan(primaryRace?.race_id);
  const sessions = useThisWeekSessions(plan);

  const days = primaryRace ? daysToRace(primaryRace.date) : null;
  const completedCount = sessions.filter((s) => s.completed).length;
  const totalCount = sessions.length;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.brand.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text size="xs" variant="secondary" weight="semibold" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
            This Week
          </Text>
          <Text size="sm" variant="secondary">{today}</Text>
        </View>

        {/* Race reminder */}
        {days !== null && (
          <Card style={styles.raceReminder}>
            <Text size="sm" variant="secondary">
              {days} {days === 1 ? 'day' : 'days'} to{' '}
              <Text size="sm" weight="semibold">{primaryRace?.name}</Text>
            </Text>
          </Card>
        )}

        {/* Progress indicator */}
        {totalCount > 0 && (
          <View style={styles.progress}>
            <Text size="sm" variant="secondary">
              {completedCount} of {totalCount} sessions complete
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${(completedCount / totalCount) * 100}%` as any },
                ]}
              />
            </View>
          </View>
        )}

        {/* Session list */}
        {sessions.length > 0 ? (
          <View style={styles.sessions}>
            {sessions.map((session) => (
              <WorkoutCard key={session.session_id} session={session} showDate />
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Text size="xl" weight="semibold" align="center">Rest week or no plan yet</Text>
            <Text size="sm" variant="secondary" align="center">
              {plan ? 'Nothing scheduled this week. Enjoy the recovery.' : 'Add a race to get your weekly sessions.'}
            </Text>
          </View>
        )}

        {/* Log manual swim */}
        <Button
          label="Log a swim manually"
          variant="secondary"
          fullWidth
          icon={<Ionicons name="add-circle-outline" size={18} color={Colors.text.primary} />}
          onPress={() => router.push('/workout/manual')}
        />

        {/* Plan adjustment notice */}
        {plan?.last_adjustment_explanation && (
          <Card style={styles.adjustment} bordered>
            <Ionicons name="information-circle-outline" size={18} color={Colors.brand.accent} />
            <View style={{ flex: 1 }}>
              <Text size="sm" weight="semibold">Plan adjusted</Text>
              <Text size="sm" variant="secondary" style={{ marginTop: 2, lineHeight: 18 }}>
                {plan.last_adjustment_explanation}
              </Text>
            </View>
          </Card>
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
    gap: Spacing['4'],
    paddingBottom: Spacing['10'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  raceReminder: {
    padding: Spacing['3'],
  },
  progress: {
    gap: Spacing['2'],
  },
  progressBar: {
    height: 4,
    backgroundColor: Colors.bg.tertiary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.brand.primary,
    borderRadius: 2,
  },
  sessions: {
    gap: Spacing['3'],
  },
  empty: {
    paddingVertical: Spacing['10'],
    alignItems: 'center',
    gap: Spacing['3'],
  },
  adjustment: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing['3'],
    borderColor: Colors.brand.primary + '40',
  },
});
