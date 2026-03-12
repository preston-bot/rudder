/**
 * HealthKit POC screen — raw swim workout data from Apple Health.
 *
 * Purpose: Validate what HealthKit actually gives us before building ingestion.
 * Fields to verify: distance, duration, pool length (metadata), HR availability.
 *
 * REQUIRES NATIVE BUILD:
 *   npx expo prebuild --platform ios
 *   npx expo run:ios
 */

import React, { useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useHealthKit } from '../../hooks/useHealthKit';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { formatDistance, formatDuration } from '../../lib/workout-engine';

export default function HealthWorkoutsScreen() {
  const { user } = useAuth();
  const { authorized, workouts, loading, syncing, syncedCount, error, requestPermissions, fetchSwimWorkouts, syncToSupabase } =
    useHealthKit(user?.id);

  useEffect(() => {
    if (authorized === true) fetchSwimWorkouts();
  }, [authorized]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text size="3xl" weight="bold">Apple Health</Text>
        <Text size="sm" variant="secondary" style={{ lineHeight: 20 }}>
          POC: raw swim data from HealthKit. Verifying fields available before building ingestion.
        </Text>

        {/* Auth status */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <Ionicons
              name={authorized === true ? 'checkmark-circle' : authorized === false ? 'close-circle' : 'ellipse-outline'}
              size={20}
              color={authorized === true ? Colors.status.ahead : authorized === false ? Colors.error : Colors.text.tertiary}
            />
            <Text size="sm" weight="semibold">
              {authorized === null ? 'Not connected' : authorized ? 'Connected' : 'Permission denied'}
            </Text>
          </View>
          {authorized !== true && (
            <Button
              label="Connect Apple Health"
              onPress={requestPermissions}
              loading={loading && authorized === null}
            />
          )}
        </Card>

        {/* Error */}
        {error && (
          <Card style={styles.errorCard}>
            <Text size="sm" style={{ color: Colors.error }}>{error}</Text>
          </Card>
        )}

        {/* Loading */}
        {loading && authorized === true && (
          <ActivityIndicator color={Colors.brand.primary} />
        )}

        {/* Sync to Rudder */}
        {workouts.length > 0 && (
          <Card style={styles.syncCard}>
            <Text size="sm" weight="semibold">
              {workouts.length} swim{workouts.length !== 1 ? 's' : ''} found
            </Text>
            {syncedCount !== null && (
              <Text size="sm" style={{ color: Colors.status.ahead }}>
                {syncedCount === 0 ? 'Already up to date.' : `${syncedCount} session${syncedCount !== 1 ? 's' : ''} synced to Rudder.`}
              </Text>
            )}
            <Button
              label="Sync to Rudder"
              loading={syncing}
              onPress={syncToSupabase}
              icon={<Ionicons name="sync-outline" size={18} color={Colors.text.inverse} />}
            />
          </Card>
        )}

        {/* Results */}
        {workouts.length > 0 && (
          <View style={styles.section}>
            <Text size="sm" variant="secondary" weight="semibold" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              Raw data
            </Text>
            {workouts.map((w) => (
              <WorkoutDebugCard key={w.id} workout={w} />
            ))}
          </View>
        )}

        {authorized === true && workouts.length === 0 && !loading && (
          <Card>
            <Text size="sm" variant="secondary" align="center">
              No swim workouts found in the last 90 days.{'\n'}
              Log a swim in the Fitness app first to test.
            </Text>
            <Button label="Refresh" variant="secondary" onPress={fetchSwimWorkouts} />
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function WorkoutDebugCard({ workout }: { workout: ReturnType<typeof useHealthKit>['workouts'][0] }) {
  const start = new Date(workout.startDate);
  const dateStr = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const timeStr = start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <Card style={styles.workoutCard}>
      <View style={styles.workoutHeader}>
        <Text size="md" weight="semibold">{dateStr} · {timeStr}</Text>
        <Text size="xs" variant="tertiary">{workout.sourceName}</Text>
      </View>

      <View style={styles.metaGrid}>
        <MetaField label="Distance" value={formatDistance(workout.distance)} ok={workout.distance > 0} />
        <MetaField label="Duration" value={formatDuration(workout.duration)} ok={workout.duration > 0} />
        {workout.calories !== null && (
          <MetaField label="Calories" value={`${Math.round(workout.calories)} kcal`} ok />
        )}
      </View>

      {/* Raw metadata — key for POC: see if pool length comes through */}
      {Object.keys(workout.metadata).length > 0 && (
        <View style={styles.metadataBox}>
          <Text size="xs" variant="tertiary" weight="semibold" style={{ marginBottom: 4 }}>
            RAW METADATA
          </Text>
          {Object.entries(workout.metadata).map(([key, value]) => (
            <Text key={key} size="xs" variant="secondary" style={{ fontFamily: 'monospace' }}>
              {key}: {JSON.stringify(value)}
            </Text>
          ))}
        </View>
      )}
    </Card>
  );
}

function MetaField({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <View style={styles.metaField}>
      <Ionicons
        name={ok ? 'checkmark-circle-outline' : 'alert-circle-outline'}
        size={14}
        color={ok ? Colors.status.ahead : Colors.error}
      />
      <Text size="xs" variant="secondary">{label}</Text>
      <Text size="sm" weight="semibold">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: Spacing['6'], gap: Spacing['4'], paddingBottom: Spacing['10'] },
  statusCard: { gap: Spacing['3'] },
  syncCard: { gap: Spacing['3'], borderWidth: 1, borderColor: Colors.brand.primary + '40' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['2'] },
  errorCard: { borderWidth: 1, borderColor: Colors.error },
  section: { gap: Spacing['3'] },
  workoutCard: { gap: Spacing['3'] },
  workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['4'] },
  metaField: { alignItems: 'flex-start', gap: 2 },
  metadataBox: {
    backgroundColor: Colors.bg.tertiary,
    borderRadius: BorderRadius.sm,
    padding: Spacing['3'],
    gap: 2,
  },
});
