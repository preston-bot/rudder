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

// react-native-watch-connectivity is iOS only
let WatchConnectivity: any = null;
if (Platform.OS === 'ios') {
  try {
    WatchConnectivity = require('react-native-watch-connectivity');
  } catch {
    // Expo Go or Android — silently ignore
  }
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
    if (!WatchConnectivity) return;

    let unsubPaired: (() => void) | undefined;
    let unsubReachable: (() => void) | undefined;

    try {
      // Check initial state
      Promise.all([
        WatchConnectivity.getIsPaired(),
        WatchConnectivity.getIsWatchAppInstalled(),
        WatchConnectivity.getReachability(),
      ]).then(([paired, watchAppInstalled, reachable]: [boolean, boolean, boolean]) => {
        setState((s) => ({ ...s, supported: true, paired, watchAppInstalled, reachable }));
      }).catch(() => {
        setState((s) => ({ ...s, supported: false }));
      });

      // Listen for reachability changes
      unsubReachable = WatchConnectivity.subscribeToWatchReachability(
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
    if (!WatchConnectivity) {
      setState((s) => ({ ...s, error: 'WatchConnectivity not available (needs native build)' }));
      return;
    }

    setState((s) => ({ ...s, sending: true, error: null }));

    try {
      const payload = buildPayload(session);
      const message = { type: 'rudder_workout', workout: payload };

      if (state.reachable) {
        // Watch app is open — send immediately
        await WatchConnectivity.sendMessage(message);
      } else {
        // Watch app not open — queue for next launch via Application Context
        // Application context is a dictionary that the Watch reads when it opens
        await WatchConnectivity.updateApplicationContext(message);
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
