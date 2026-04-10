/**
 * WatchKit / WatchConnectivity POC
 *
 * Sends a planned workout to a paired Apple Watch via WatchConnectivity.
 *
 * REQUIRES NATIVE BUILD + watchOS App target:
 *   npx expo prebuild --platform ios
 *   npx expo run:ios
 *
 * The Watch app must implement WCSessionDelegate to receive the message.
 * This file handles the iOS (phone) side only.
 *
 * What this validates:
 * 1. Reachability check — is the Watch app running?
 * 2. Sending structured workout data (intervals, distances, rest)
 * 3. Transferring persistent data via Application Context (survives Watch app restart)
 */

import { useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import type { PlannedSession } from '../types';

// react-native-watch-connectivity is iOS only — lazy-load to avoid
// crashing on iPad where the native module may throw during TurboModule init.
let _watchConnectivity: any = null;
let _watchLoaded = false;

function getWatchConnectivity() {
  if (!_watchLoaded) {
    _watchLoaded = true;
    if (Platform.OS === 'ios') {
      try {
        _watchConnectivity = require('react-native-watch-connectivity');
      } catch {
        // Expo Go or Android — silently ignore
      }
    }
  }
  return _watchConnectivity;
}

export interface WatchWorkoutPayload {
  session_id: string;
  intent: string;
  date: string;
  pool_length: string;
  total_distance_meters: number;
  total_time_minutes: number;
  effort_band: string;
  intervals: Array<{
    reps: number;
    distance_meters: number;
    rest_seconds: number;
    effort_band: string;
    note: string | null;
  }>;
}

export interface WatchKitState {
  supported: boolean;        // WatchConnectivity available on device
  paired: boolean;           // Watch is paired
  watchAppInstalled: boolean; // Rudder Watch app is installed
  reachable: boolean;        // Watch app is currently active/foreground
  sending: boolean;
  lastSentAt: string | null;
  error: string | null;
}

function buildPayload(session: PlannedSession): WatchWorkoutPayload {
  return {
    session_id: session.session_id,
    intent: session.intent,
    date: session.date,
    pool_length: session.pool_length,
    total_distance_meters: session.total_distance_meters,
    total_time_minutes: session.total_time_minutes,
    effort_band: session.effort_band,
    intervals: session.intervals.map((i) => ({
      reps: i.reps,
      distance_meters: i.distance_meters,
      rest_seconds: i.rest_seconds,
      effort_band: i.effort_band,
      note: i.note,
    })),
  };
}

export function useWatchKit() {
  const [state, setState] = useState<WatchKitState>({
    supported: false,
    paired: false,
    watchAppInstalled: false,
    reachable: false,
    sending: false,
    lastSentAt: null,
    error: null,
  });

  // Subscribe to reachability changes
  useEffect(() => {
    const WC = getWatchConnectivity();
    if (!WC) return;

    let unsubPaired: (() => void) | undefined;
    let unsubReachable: (() => void) | undefined;

    try {
      // Check initial state
      Promise.all([
        WC.getIsPaired(),
        WC.getIsWatchAppInstalled(),
        WC.getReachability(),
      ]).then(([paired, watchAppInstalled, reachable]: [boolean, boolean, boolean]) => {
        setState((s) => ({ ...s, supported: true, paired, watchAppInstalled, reachable }));
      }).catch(() => {
        setState((s) => ({ ...s, supported: false }));
      });

      // Listen for reachability changes
      unsubReachable = WC.subscribeToWatchReachability(
        (reachable: boolean) => setState((s) => ({ ...s, reachable })),
      );
    } catch {
      setState((s) => ({ ...s, supported: false }));
    }

    return () => {
      unsubPaired?.();
      unsubReachable?.();
    };
  }, []);

  /**
   * Send a planned session to the Watch.
   *
   * Strategy:
   * - If Watch is reachable (app in foreground): use sendMessage() for instant delivery
   * - Otherwise: use updateApplicationContext() so the Watch picks it up on next launch
   */
  const sendWorkout = useCallback(async (session: PlannedSession) => {
    const WC = getWatchConnectivity();
    if (!WC) {
      setState((s) => ({ ...s, error: 'WatchConnectivity not available (needs native build)' }));
      return;
    }

    setState((s) => ({ ...s, sending: true, error: null }));

    try {
      const payload = buildPayload(session);
      const message = { type: 'rudder_workout', workout: payload };

      if (state.reachable) {
        // Watch app is open — send immediately
        await WC.sendMessage(message);
      } else {
        // Watch app not open — queue for next launch via Application Context
        // Application context is a dictionary that the Watch reads when it opens
        await WC.updateApplicationContext(message);
      }

      setState((s) => ({
        ...s,
        sending: false,
        lastSentAt: new Date().toISOString(),
      }));
    } catch (e: any) {
      setState((s) => ({ ...s, sending: false, error: `Send failed: ${e.message}` }));
    }
  }, [state.reachable]);

  return { ...state, sendWorkout };
}
