/**
 * CSS Benchmark screen.
 * User enters 400m and 1000m time-trial times.
 * We compute Critical Swim Speed and derive pace zones.
 * Results saved to user_profiles: critical_swim_speed, pace_zones, benchmark_sets.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  Alert,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { estimateCSS, derivePaceZones, formatPace } from '../../lib/workout-engine';
import type { PoolLength, BenchmarkSet } from '../../types';

const POOL_OPTIONS: { value: PoolLength; label: string }[] = [
  { value: '25m', label: '25m' },
  { value: '25y', label: '25y' },
  { value: '20m', label: '20m' },
];

const ZONE_LABELS: Record<string, { label: string; description: string; color: string }> = {
  easy:      { label: 'Easy',      description: 'Recovery & aerobic base',  color: '#4CAF50' },
  aerobic:   { label: 'Aerobic',   description: 'Steady-state endurance',   color: '#2196F3' },
  threshold: { label: 'Threshold', description: 'CSS — race-pace work',     color: '#FF9800' },
  speed:     { label: 'Speed',     description: 'Sprint & neuromuscular',   color: '#F44336' },
};

function parseTime(mins: string, secs: string): number | null {
  const m = parseInt(mins, 10);
  const s = parseInt(secs, 10);
  if (isNaN(m) || isNaN(s) || s >= 60) return null;
  const total = m * 60 + s;
  return total > 0 ? total : null;
}

function formatSeconds(total: number): { mins: string; secs: string } {
  return {
    mins: String(Math.floor(total / 60)),
    secs: String(total % 60).padStart(2, '0'),
  };
}

interface TimeInputProps {
  label: string;
  hint: string;
  mins: string;
  secs: string;
  onChangeMins: (v: string) => void;
  onChangeSecs: (v: string) => void;
}

function TimeInput({ label, hint, mins, secs, onChangeMins, onChangeSecs }: TimeInputProps) {
  return (
    <View style={styles.timeInputBlock}>
      <Text size="sm" weight="semibold">{label}</Text>
      <Text size="xs" variant="tertiary">{hint}</Text>
      <View style={styles.timeRow}>
        <View style={styles.timeFieldWrap}>
          <TextInput
            style={styles.timeField}
            value={mins}
            onChangeText={onChangeMins}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="MM"
            placeholderTextColor={Colors.text.tertiary}
          />
          <Text size="xs" variant="tertiary">min</Text>
        </View>
        <Text size="lg" variant="secondary" style={{ alignSelf: 'center' }}>:</Text>
        <View style={styles.timeFieldWrap}>
          <TextInput
            style={styles.timeField}
            value={secs}
            onChangeText={onChangeSecs}
            keyboardType="number-pad"
            maxLength={2}
            placeholder="SS"
            placeholderTextColor={Colors.text.tertiary}
          />
          <Text size="xs" variant="tertiary">sec</Text>
        </View>
      </View>
    </View>
  );
}

export default function BenchmarkScreen() {
  const { user } = useAuth();
  const { profile, loading, updateProfile } = useProfile(user?.id);

  const [poolLength, setPoolLength] = useState<PoolLength>('25m');
  const [t400Mins, setT400Mins] = useState('');
  const [t400Secs, setT400Secs] = useState('');
  const [t1000Mins, setT1000Mins] = useState('');
  const [t1000Secs, setT1000Secs] = useState('');
  const [saving, setSaving] = useState(false);

  // Pre-fill if profile has existing CSS
  useEffect(() => {
    if (!profile) return;
    if (profile.pool_lengths?.length) {
      setPoolLength(profile.pool_lengths[0]);
    }
    // If there's a recent benchmark for 400m and 1000m, pre-fill times
    const b400 = profile.benchmark_sets?.find((b) => b.distance === 400);
    const b1000 = profile.benchmark_sets?.find((b) => b.distance === 1000);
    if (b400) {
      // avg_pace is sec/100m — back-calculate total time
      const totalSecs = Math.round((b400.avg_pace / 100) * 400);
      const f = formatSeconds(totalSecs);
      setT400Mins(f.mins);
      setT400Secs(f.secs);
    }
    if (b1000) {
      const totalSecs = Math.round((b1000.avg_pace / 100) * 1000);
      const f = formatSeconds(totalSecs);
      setT1000Mins(f.mins);
      setT1000Secs(f.secs);
    }
  }, [profile?.user_id]);

  const t400 = parseTime(t400Mins, t400Secs);
  const t1000 = parseTime(t1000Mins, t1000Secs);

  // CSS is valid only when both times are entered and 1000m > 400m (sanity check)
  const css = t400 && t1000 && t1000 > t400 ? estimateCSS(t400, t1000) : null;
  const zones = css ? derivePaceZones(css) : null;

  async function handleSave() {
    if (!css || !zones || !t400 || !t1000) {
      Alert.alert('Enter valid times', 'Make sure both times are filled in and the 1000m is slower than the 400m.');
      return;
    }

    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const newBenchmarks: BenchmarkSet[] = [
        { distance: 400,  pool_length: poolLength, avg_pace: (t400  / 400)  * 100, date: today },
        { distance: 1000, pool_length: poolLength, avg_pace: (t1000 / 1000) * 100, date: today },
      ];

      // Keep prior benchmarks for other distances; replace 400/1000 entries
      const existing = (profile?.benchmark_sets ?? []).filter(
        (b) => b.distance !== 400 && b.distance !== 1000,
      );

      await updateProfile({
        critical_swim_speed: css,
        pace_zones: zones,
        benchmark_sets: [...existing, ...newBenchmarks],
      });

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e: any) {
      Alert.alert('Save failed', e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text size="3xl" weight="bold">CSS Benchmark</Text>
        <Text size="sm" variant="secondary" style={{ lineHeight: 20 }}>
          Swim a 400m time trial, rest 10 minutes, then swim 1000m all-out.
          Enter your times below to calculate your Critical Swim Speed and pace zones.
        </Text>

        {/* Pool length */}
        <View style={styles.section}>
          <Text size="sm" weight="semibold">Pool length</Text>
          <View style={styles.chipRow}>
            {POOL_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => { setPoolLength(opt.value); Haptics.selectionAsync(); }}
                style={[styles.chip, poolLength === opt.value && styles.chipSelected]}
              >
                <Text
                  size="sm"
                  weight={poolLength === opt.value ? 'semibold' : 'regular'}
                  style={{ color: poolLength === opt.value ? Colors.text.inverse : Colors.text.primary }}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Time inputs */}
        <Card style={styles.timesCard}>
          <TimeInput
            label="400m time trial"
            hint="Swim 400m as fast as you can, continuously"
            mins={t400Mins}
            secs={t400Secs}
            onChangeMins={setT400Mins}
            onChangeSecs={setT400Secs}
          />
          <View style={styles.divider} />
          <TimeInput
            label="1000m time trial"
            hint="After 10 min rest — swim 1000m all-out"
            mins={t1000Mins}
            secs={t1000Secs}
            onChangeMins={setT1000Mins}
            onChangeSecs={setT1000Secs}
          />
        </Card>

        {/* Result */}
        {css && zones ? (
          <View style={styles.section}>
            <Card style={styles.cssCard}>
              <Text size="xs" variant="tertiary" weight="semibold" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
                Critical Swim Speed
              </Text>
              <Text size="4xl" weight="heavy" style={{ color: Colors.brand.accent }}>
                {formatPace(css)}
              </Text>
              <Text size="xs" variant="secondary">
                Your threshold pace — sustainable race-pace effort
              </Text>
            </Card>

            <Text size="xs" variant="tertiary" weight="semibold" style={{ textTransform: 'uppercase', letterSpacing: 1, marginTop: Spacing['2'] }}>
              Pace Zones
            </Text>
            {(Object.entries(zones) as [string, [number, number]][]).map(([zone, [lo, hi]]) => {
              const meta = ZONE_LABELS[zone];
              return (
                <Card key={zone} style={styles.zoneCard}>
                  <View style={[styles.zoneAccent, { backgroundColor: meta.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text size="sm" weight="semibold">{meta.label}</Text>
                    <Text size="xs" variant="tertiary">{meta.description}</Text>
                  </View>
                  <Text size="sm" weight="semibold" style={{ color: meta.color }}>
                    {formatPace(lo)} – {formatPace(hi)}
                  </Text>
                </Card>
              );
            })}
          </View>
        ) : (
          t400 && t1000 && t1000 <= t400 ? (
            <Card style={styles.errorCard}>
              <Text size="sm" style={{ color: Colors.error }}>
                1000m time must be slower than 400m time.
              </Text>
            </Card>
          ) : null
        )}

        <Button
          label="Save benchmark"
          loading={saving}
          onPress={handleSave}
          fullWidth
        />

        <Text size="xs" variant="tertiary" align="center" style={{ lineHeight: 18 }}>
          Repeat this test every 4–6 weeks.{'\n'}Your zones update automatically when you save.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: Spacing['6'], gap: Spacing['4'], paddingBottom: Spacing['10'] },
  section: { gap: Spacing['3'] },
  chipRow: { flexDirection: 'row', gap: Spacing['2'], flexWrap: 'wrap' },
  chip: {
    paddingHorizontal: Spacing['4'],
    paddingVertical: Spacing['2'],
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.bg.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  chipSelected: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  timesCard: { gap: Spacing['4'] },
  timeInputBlock: { gap: Spacing['2'] },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing['3'] },
  timeFieldWrap: { alignItems: 'center', gap: 4 },
  timeField: {
    width: 72,
    height: 52,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.bg.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    color: Colors.text.primary,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  divider: { height: 1, backgroundColor: Colors.border.subtle },
  cssCard: { alignItems: 'center', gap: Spacing['1'], padding: Spacing['5'] },
  zoneCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
    paddingVertical: Spacing['3'],
  },
  zoneAccent: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  errorCard: {
    borderWidth: 1,
    borderColor: Colors.error,
  },
});
