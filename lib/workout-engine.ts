/**
 * Deterministic workout engine utilities.
 * These run client-side without AI — pure math and rules.
 */

import type {
  Race,
  TrainingPhase,
  PoolLength,
  SwimSession,
  SwimInterval,
} from '../types';

// ─── Date / time utilities ────────────────────────────────────────────────────

export function daysToRace(raceDate: string): number {
  const race = new Date(raceDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  race.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((race.getTime() - today.getTime()) / 86_400_000));
}

export function weeksToRace(raceDate: string): number {
  return Math.floor(daysToRace(raceDate) / 7);
}

// ─── Phase detection ──────────────────────────────────────────────────────────

/**
 * Heuristic-only phase assignment.
 * AI adjusts this based on athlete readiness; this is the fallback.
 */
export function inferPhase(raceDate: string): TrainingPhase {
  const weeks = weeksToRace(raceDate);
  if (weeks >= 10) return 'base';
  if (weeks >= 6) return 'build';
  if (weeks >= 2) return 'specific';
  return 'taper';
}

// ─── Pool length normalization ────────────────────────────────────────────────

const POOL_LENGTH_METERS: Record<PoolLength, number> = {
  '20m': 20,
  '25y': 22.86,
  '25m': 25,
};

export function poolLengthMeters(length: PoolLength): number {
  return POOL_LENGTH_METERS[length];
}

/**
 * Normalize a distance recorded in one pool to its true-meter equivalent.
 * Garmin often reports lap counts, not true distance, for 25y pools.
 */
export function normalizeDistance(
  recorded_meters: number,
  pool_length: PoolLength,
): number {
  if (pool_length === '25y') {
    // Garmin typically reports 25m for 25y laps — correct to actual yards→meters
    const laps = Math.round(recorded_meters / 25);
    return laps * 22.86;
  }
  return recorded_meters;
}

/**
 * Normalize pace from one pool length to a common 100m pace.
 */
export function normalizePaceTo100m(
  pace_per_100: number,
  pool_length: PoolLength,
): number {
  const actual_m = POOL_LENGTH_METERS[pool_length];
  const factor = actual_m / 100;
  return pace_per_100 * factor;
}

// ─── Session reconstruction ───────────────────────────────────────────────────

/**
 * Detect "false rest" — time when the swimmer was standing on the wall
 * beyond a reasonable rest window for the interval context.
 *
 * Heuristic: rest > 90s in a distance swim context → likely false rest.
 */
export function flagFalseRest(intervals: SwimInterval[]): SwimInterval[] {
  return intervals.map((interval) => ({
    ...interval,
    is_false_rest:
      interval.rest_seconds > 90 && interval.distance_meters >= 200,
  }));
}

/**
 * Compute true moving time, excluding false rest.
 */
export function computeMovingTime(session: SwimSession): number {
  return session.intervals.reduce((acc, interval) => {
    const rest = interval.is_false_rest ? 0 : interval.rest_seconds;
    return acc + interval.duration_seconds + rest;
  }, 0);
}

// ─── Pace zones ───────────────────────────────────────────────────────────────

/**
 * Derive pace zones from a known threshold (CSS) pace.
 * All values in seconds per 100m.
 */
export function derivePaceZones(css_pace_per_100m: number) {
  return {
    easy: [css_pace_per_100m * 1.2, css_pace_per_100m * 1.4] as [number, number],
    aerobic: [css_pace_per_100m * 1.05, css_pace_per_100m * 1.2] as [number, number],
    threshold: [css_pace_per_100m * 0.97, css_pace_per_100m * 1.05] as [number, number],
    speed: [css_pace_per_100m * 0.85, css_pace_per_100m * 0.97] as [number, number],
  };
}

/**
 * Critical Swim Speed — estimated from 400m and 1000m benchmark times.
 * CSS = (D2 - D1) / (T2 - T1), normalized to per-100m.
 */
export function estimateCSS(time_400_seconds: number, time_1000_seconds: number): number {
  const css_raw = (1000 - 400) / (time_1000_seconds - time_400_seconds);
  return 100 / css_raw; // seconds per 100m
}

// ─── Display formatters ───────────────────────────────────────────────────────

export function formatPace(seconds_per_100m: number): string {
  const mins = Math.floor(seconds_per_100m / 60);
  const secs = Math.round(seconds_per_100m % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}/100m`;
}

export function formatDuration(total_seconds: number): string {
  const h = Math.floor(total_seconds / 3600);
  const m = Math.floor((total_seconds % 3600) / 60);
  const s = Math.round(total_seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatDistance(meters: number, prefer_yards = false): string {
  if (prefer_yards) {
    const yards = Math.round(meters * 1.09361);
    return yards >= 1760
      ? `${(yards / 1760).toFixed(1)} mi`
      : `${yards}y`;
  }
  return meters >= 1000
    ? `${(meters / 1000).toFixed(1)}k`
    : `${Math.round(meters)}m`;
}
