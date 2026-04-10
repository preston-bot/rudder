/**
 * Apple HealthKit integration — POC
 *
 * IMPORTANT: This hook only works in a native dev build (not Expo Go).
 * Run: npx expo prebuild --platform ios && npx expo run:ios
 * Or use EAS dev client: eas build --profile development --platform ios
 *
 * What this POC validates:
 * 1. Permission request works
 * 2. We can pull swim workouts (HKWorkoutActivityType = 46)
 * 3. What fields come through: distance, duration, totalEnergyBurned
 * 4. Whether pool length metadata is available
 * 5. HR samples during workout window
 */

import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';
import type { PoolLength } from '../types';

// react-native-health is iOS only — lazy-load to avoid crashing on iPad
// where HealthKit native module may throw during TurboModule init.
let _healthKit: any = null;
let _healthUnit: any = null;
let _healthKitLoaded = false;

function getHealthKit() {
  if (!_healthKitLoaded) {
    _healthKitLoaded = true;
    if (Platform.OS === 'ios') {
      try {
        const pkg = require('react-native-health');
        _healthKit = pkg.default;
        _healthUnit = pkg.HealthUnit;
      } catch {
        // not available in Expo Go — silently ignore
      }
    }
  }
  return { AppleHealthKit: _healthKit, HealthUnit: _healthUnit };
}

export interface RawHealthWorkout {
  id: string;
  startDate: string;
  endDate: string;
  duration: number;        // seconds
  distance: number;        // meters
  calories: number | null;
  metadata: Record<string, unknown>;
  sourceName: string;
}

export interface HealthKitState {
  authorized: boolean | null; // null = unknown, true = granted, false = denied
  workouts: RawHealthWorkout[];
  loading: boolean;
  syncing: boolean;
  syncedCount: number | null;
  error: string | null;
}

/** Best-effort pool length from HealthKit metadata */
function guessPoolLength(metadata: Record<string, unknown>): PoolLength {
  // Some apps write HKSwimmingPoolLength in meters
  const raw = metadata['HKSwimmingPoolLength'] ?? metadata['poolLength'];
  if (typeof raw === 'number') {
    if (raw <= 20.5) return '20m';
    if (raw <= 25.5) return '25m'; // could be 25y but default to 25m
  }
  return '25m'; // safest default
}

function getPermissions() {
  const { AppleHealthKit } = getHealthKit();
  if (!AppleHealthKit) return null;
  return {
    permissions: {
      read: [
        AppleHealthKit.Constants.Permissions.Workout,
        AppleHealthKit.Constants.Permissions.HeartRate,
        AppleHealthKit.Constants.Permissions.DistanceSwimming,
        AppleHealthKit.Constants.Permissions.SwimmingStrokeCount,
      ],
      write: [
        AppleHealthKit.Constants.Permissions.Workout,
      ],
    },
  };
}

export function useHealthKit(userId?: string) {
  const [state, setState] = useState<HealthKitState>({
    authorized: null,
    workouts: [],
    loading: false,
    syncing: false,
    syncedCount: null,
    error: null,
  });

  const requestPermissions = useCallback(() => {
    const { AppleHealthKit } = getHealthKit();
    const perms = getPermissions();
    if (!AppleHealthKit || !perms) {
      setState((s) => ({ ...s, error: 'HealthKit not available (needs native build)' }));
      return;
    }

    setState((s) => ({ ...s, loading: true, error: null }));

    AppleHealthKit.initHealthKit(perms, (err: string) => {
      if (err) {
        setState((s) => ({ ...s, loading: false, authorized: false, error: err }));
        return;
      }
      setState((s) => ({ ...s, authorized: true }));
      fetchSwimWorkouts();
    });
  }, []);

  const fetchSwimWorkouts = useCallback(() => {
    const { AppleHealthKit } = getHealthKit();
    if (!AppleHealthKit) return;

    const options = {
      startDate: new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      type: 'Swimming',
    };

    AppleHealthKit.getWorkouts(options, (err: string, results: any[]) => {
      if (err) {
        setState((s) => ({ ...s, loading: false, error: `Workouts fetch failed: ${err}` }));
        return;
      }

      const workouts: RawHealthWorkout[] = (results ?? []).map((w) => ({
        id: w.id ?? w.uuid ?? String(w.startDate),
        startDate: w.startDate,
        endDate: w.endDate,
        duration: w.duration ?? 0,
        distance: w.totalDistance ?? w.distance ?? 0,
        calories: w.totalEnergyBurned ?? null,
        metadata: w.metadata ?? {},
        sourceName: w.sourceName ?? w.sourceId ?? 'Unknown',
      }));

      setState((s) => ({ ...s, workouts, loading: false }));
    });
  }, []);

  /**
   * Convert fetched HealthKit workouts to SwimSessions and insert into Supabase.
   * Deduplicates by start_time — skips any already in the DB.
   */
  const syncToSupabase = useCallback(async () => {
    if (!userId || state.workouts.length === 0) return;

    setState((s) => ({ ...s, syncing: true, error: null }));

    try {
      // Fetch existing apple_health session start times to dedup
      const { data: existing } = await supabase
        .from('swim_sessions')
        .select('start_time')
        .eq('user_id', userId)
        .eq('source', 'apple_health');

      const existingTimes = new Set((existing ?? []).map((s) => s.start_time));

      const newWorkouts = state.workouts.filter(
        (w) => !existingTimes.has(new Date(w.startDate).toISOString()),
      );

      if (newWorkouts.length === 0) {
        setState((s) => ({ ...s, syncing: false, syncedCount: 0 }));
        return;
      }

      const rows = newWorkouts.map((w) => {
        const totalSeconds = Math.round(w.duration);
        const avgPace = w.distance > 0 ? (totalSeconds / w.distance) * 100 : 0;
        const poolLength = guessPoolLength(w.metadata);

        return {
          user_id: userId,
          source: 'apple_health' as const,
          start_time: new Date(w.startDate).toISOString(),
          end_time: new Date(w.endDate).toISOString(),
          pool_length: poolLength,
          total_distance_meters: w.distance,
          total_time_seconds: totalSeconds,
          moving_time_seconds: totalSeconds,
          rest_time_seconds: 0,
          avg_pace_per_100: avgPace,
          stroke: 'freestyle' as const, // HealthKit doesn't reliably give stroke type
          avg_hr: null,
          max_hr: null,
          intervals: [],
          rpe: null,
          notes: `Imported from ${w.sourceName}`,
          rudder_flags: ['apple_health_import'],
        };
      });

      const { error } = await supabase.from('swim_sessions').insert(rows);
      if (error) throw error;

      setState((s) => ({ ...s, syncing: false, syncedCount: rows.length }));
    } catch (e: any) {
      setState((s) => ({ ...s, syncing: false, error: `Sync failed: ${e.message}` }));
    }
  }, [userId, state.workouts]);

  return { ...state, requestPermissions, fetchSwimWorkouts, syncToSupabase };
}
