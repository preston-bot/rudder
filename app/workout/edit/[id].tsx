/**
 * Edit a planned workout. Saves changes back into the training_plans
 * JSONB, which means the Arc reflects the new values immediately.
 *
 * Intervals are intentionally not editable here — they're complex and
 * better handled by a regeneration flow later. This MVP covers the
 * fields a swimmer most often wants to tweak: intent, distance, time,
 * effort, and type.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useAuth } from '../../../hooks/useAuth';
import { useRaces } from '../../../hooks/useRace';
import { useTrainingPlan, getPlannedSession } from '../../../hooks/useWorkouts';
import { Text } from '../../../components/ui/Text';
import { Button } from '../../../components/ui/Button';
import { Colors, Spacing, BorderRadius } from '../../../constants/theme';
import type { PoolLength, PlannedSession } from '../../../types';

type SessionType = PlannedSession['type'];
type EffortBand = PlannedSession['effort_band'];

const TYPE_OPTIONS: { value: SessionType; label: string }[] = [
  { value: 'long', label: 'Long' },
  { value: 'pace', label: 'Pace' },
  { value: 'intervals', label: 'Intervals' },
  { value: 'skills', label: 'Skills' },
  { value: 'benchmark', label: 'Benchmark' },
];

const EFFORT_OPTIONS: { value: EffortBand; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'aerobic', label: 'Aerobic' },
  { value: 'threshold', label: 'Threshold' },
  { value: 'speed', label: 'Speed' },
];

const POOL_OPTIONS: { value: PoolLength; label: string }[] = [
  { value: '25y', label: '25y' },
  { value: '25m', label: '25m' },
  { value: '20m', label: '20m' },
  { value: 'open_water', label: 'Open water' },
];

export default function EditWorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { primaryRace } = useRaces(user?.id);
  const { plan, loading, updateSessionFields } = useTrainingPlan(primaryRace?.race_id);

  const session = plan && id ? getPlannedSession(plan, id) : null;

  const [intent, setIntent] = useState('');
  const [intentDescription, setIntentDescription] = useState('');
  const [type, setType] = useState<SessionType>('long');
  const [effort, setEffort] = useState<EffortBand>('aerobic');
  const [poolLength, setPoolLength] = useState<PoolLength>('25m');
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) return;
    setIntent(session.intent);
    setIntentDescription(session.intent_description);
    setType(session.type);
    setEffort(session.effort_band);
    setPoolLength(session.pool_length);
    setDistance(String(session.total_distance_meters));
    setDuration(String(session.total_time_minutes));
  }, [session?.session_id]);

  async function handleSave() {
    if (!session) return;
    const distanceMeters = parseFloat(distance);
    const durationMins = parseFloat(duration);
    if (!distanceMeters || distanceMeters <= 0) {
      Alert.alert('Distance required', 'Enter a distance greater than zero.');
      return;
    }
    if (!durationMins || durationMins <= 0) {
      Alert.alert('Duration required', 'Enter a duration greater than zero.');
      return;
    }
    setSaving(true);
    try {
      await updateSessionFields(session.session_id, {
        intent: intent || session.intent,
        intent_description: intentDescription || session.intent_description,
        type,
        effort_band: effort,
        pool_length: poolLength,
        total_distance_meters: Math.round(distanceMeters),
        total_time_minutes: Math.round(durationMins),
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Could not save', e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;
  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text variant="secondary">Workout not found.</Text>
          <Button label="Go back" variant="ghost" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={80}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text size="3xl" weight="bold">Edit workout</Text>
          <Text size="sm" variant="secondary">
            Changes save into your plan and the Arc updates right away.
          </Text>

          <Field label="Intent">
            <StyledInput value={intent} onChangeText={setIntent} placeholder="e.g. Aerobic depth" />
          </Field>

          <Field label="Description">
            <StyledInput
              value={intentDescription}
              onChangeText={setIntentDescription}
              placeholder="One sentence about why this session matters"
              multiline
              numberOfLines={2}
              style={{ minHeight: 64, textAlignVertical: 'top' }}
            />
          </Field>

          <Field label="Type">
            <ChipRow options={TYPE_OPTIONS} selected={type} onSelect={setType} />
          </Field>

          <Field label="Effort">
            <ChipRow options={EFFORT_OPTIONS} selected={effort} onSelect={setEffort} />
          </Field>

          <Field label="Where">
            <ChipRow options={POOL_OPTIONS} selected={poolLength} onSelect={setPoolLength} />
          </Field>

          <Field label="Distance (meters)">
            <StyledInput value={distance} onChangeText={setDistance} keyboardType="numeric" placeholder="e.g. 2000" />
          </Field>

          <Field label="Time (minutes)">
            <StyledInput value={duration} onChangeText={setDuration} keyboardType="numeric" placeholder="e.g. 45" />
          </Field>

          <Button label="Save changes" fullWidth loading={saving} onPress={handleSave} />
          <Button label="Cancel" variant="ghost" fullWidth onPress={() => router.back()} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text size="sm" variant="secondary" weight="medium">{label}</Text>
      {children}
    </View>
  );
}

function StyledInput({ style, ...props }: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={Colors.text.tertiary}
      selectionColor={Colors.brand.primary}
      {...props}
      style={[inputBase, style]}
    />
  );
}

function ChipRow<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (v: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((opt) => {
        const active = opt.value === selected;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onSelect(opt.value)}
            style={[styles.chip, active && styles.chipActive]}
          >
            <Text size="sm" weight={active ? 'semibold' : 'regular'} style={active ? { color: Colors.text.inverse } : undefined}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const inputBase = {
  backgroundColor: Colors.bg.secondary,
  borderRadius: BorderRadius.md,
  borderWidth: 1,
  borderColor: Colors.border.subtle,
  color: Colors.text.primary,
  fontSize: 15,
  paddingHorizontal: Spacing['4'],
  paddingVertical: Spacing['3'],
  minHeight: 48,
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: Spacing['6'], gap: Spacing['4'], paddingBottom: Spacing['10'] },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: Spacing['3'] },
  field: { gap: Spacing['2'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['2'] },
  chip: {
    paddingHorizontal: Spacing['3'],
    paddingVertical: Spacing['2'],
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.bg.secondary,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  chipActive: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
});
