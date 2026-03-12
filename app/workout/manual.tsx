/**
 * Manual swim logging screen.
 * For when no wearable data is available — swimmer enters what they did.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  TextInput,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import { formatPace } from '../../lib/workout-engine';
import { useAuth } from '../../hooks/useAuth';
import { useSwimSessions } from '../../hooks/useWorkouts';
import type { PoolLength, StrokeType } from '../../types';

const POOL_OPTIONS: { value: PoolLength; label: string }[] = [
  { value: '25y', label: '25 yards' },
  { value: '25m', label: '25 meters' },
  { value: '20m', label: '20 meters' },
];

const STROKE_OPTIONS: { value: StrokeType; label: string }[] = [
  { value: 'freestyle', label: 'Freestyle' },
  { value: 'backstroke', label: 'Backstroke' },
  { value: 'breaststroke', label: 'Breaststroke' },
  { value: 'butterfly', label: 'Butterfly' },
  { value: 'mixed', label: 'Mixed' },
];

const RPE_LABELS: Record<number, string> = {
  1: 'Very easy', 2: 'Easy', 3: 'Moderate', 4: 'Somewhat hard',
  5: 'Hard', 6: 'Hard', 7: 'Very hard', 8: 'Very hard',
  9: 'Extremely hard', 10: 'Max effort',
};

export default function ManualLogScreen() {
  const { user } = useAuth();
  const { logManualSession } = useSwimSessions(user?.id);

  const [poolLength, setPoolLength] = useState<PoolLength>('25y');
  const [distanceStr, setDistanceStr] = useState('');
  const [durationStr, setDurationStr] = useState('');
  const [stroke, setStroke] = useState<StrokeType>('freestyle');
  const [rpe, setRpe] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Live pace preview
  const distance = parseFloat(distanceStr) || 0;
  const duration = parseFloat(durationStr) || 0;
  const pacePreview =
    distance > 0 && duration > 0
      ? formatPace((duration * 60) / distance * 100)
      : null;

  function select<T>(setter: (v: T) => void, value: T) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setter(value);
  }

  async function handleSave() {
    if (!user) return;
    if (!distance || distance <= 0) {
      Alert.alert('Missing distance', 'Enter how far you swam.');
      return;
    }
    if (!duration || duration <= 0) {
      Alert.alert('Missing duration', 'Enter how long you swam.');
      return;
    }
    if (!rpe) {
      Alert.alert('How hard was it?', 'Select an RPE before saving.');
      return;
    }

    setSaving(true);
    try {
      await logManualSession({
        user_id: user.id,
        pool_length: poolLength,
        distance_meters: distance,
        duration_minutes: duration,
        stroke,
        rpe,
        notes,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Error saving swim', e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text size="3xl" weight="bold">Log a swim</Text>
        <Text size="sm" variant="secondary" style={{ lineHeight: 20 }}>
          No device? No problem. Tell Rudder what you did.
        </Text>

        {/* Pool length */}
        <Section label="Pool length">
          <ChipRow
            options={POOL_OPTIONS}
            selected={poolLength}
            onSelect={(v) => select(setPoolLength, v)}
          />
        </Section>

        {/* Distance */}
        <Section label="Distance (meters)">
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={distanceStr}
              onChangeText={setDistanceStr}
              placeholder="e.g. 2000"
              keyboardType="numeric"
              placeholderTextColor={Colors.text.tertiary}
              selectionColor={Colors.brand.primary}
            />
            <Text variant="secondary" style={styles.inputUnit}>m</Text>
          </View>
        </Section>

        {/* Duration */}
        <Section label="Duration (minutes)">
          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={durationStr}
              onChangeText={setDurationStr}
              placeholder="e.g. 45"
              keyboardType="decimal-pad"
              placeholderTextColor={Colors.text.tertiary}
              selectionColor={Colors.brand.primary}
            />
            <Text variant="secondary" style={styles.inputUnit}>min</Text>
          </View>
          {pacePreview && (
            <Text size="sm" style={{ color: Colors.brand.accent }}>
              Avg pace: {pacePreview}
            </Text>
          )}
        </Section>

        {/* Stroke */}
        <Section label="Primary stroke">
          <ChipRow
            options={STROKE_OPTIONS}
            selected={stroke}
            onSelect={(v) => select(setStroke, v)}
          />
        </Section>

        {/* RPE */}
        <Section label="Effort (RPE 1–10)">
          <View style={styles.rpeRow}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <Pressable
                key={n}
                onPress={() => select(setRpe, n)}
                style={[styles.rpeButton, rpe === n && styles.rpeButtonActive]}
              >
                <Text
                  size="sm"
                  weight="semibold"
                  style={rpe === n ? { color: Colors.text.inverse } : { color: Colors.text.secondary }}
                >
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>
          {rpe !== null && (
            <Text size="sm" variant="secondary" align="center">{RPE_LABELS[rpe]}</Text>
          )}
        </Section>

        {/* Notes */}
        <Section label="Notes (optional)">
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="How did it feel? Anything to flag?"
            placeholderTextColor={Colors.text.tertiary}
            selectionColor={Colors.brand.primary}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </Section>

        {/* Save */}
        <Button
          label="Log swim"
          fullWidth
          loading={saving}
          onPress={handleSave}
          icon={<Ionicons name="water-outline" size={18} color={Colors.text.inverse} />}
        />
        <Button label="Cancel" variant="ghost" fullWidth onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text size="sm" weight="medium" variant="secondary">{label}</Text>
      {children}
    </View>
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
            <Text
              size="sm"
              weight={active ? 'semibold' : 'regular'}
              style={active ? { color: Colors.text.inverse } : undefined}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: Spacing['6'], gap: Spacing['5'], paddingBottom: Spacing['10'] },
  section: { gap: Spacing['2'] },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.secondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    paddingRight: Spacing['4'],
  },
  input: {
    flex: 1,
    color: Colors.text.primary,
    fontSize: 15,
    paddingHorizontal: Spacing['4'],
    paddingVertical: Spacing['3'],
    minHeight: 48,
  },
  inputUnit: {
    fontSize: 15,
  },
  notesInput: {
    flex: undefined,
    backgroundColor: Colors.bg.secondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    paddingHorizontal: Spacing['4'],
    paddingTop: Spacing['3'],
    minHeight: 80,
  },
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
  rpeRow: { flexDirection: 'row', gap: Spacing['1'] },
  rpeButton: {
    flex: 1,
    minWidth: 32,
    height: 40,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.bg.secondary,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rpeButtonActive: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
});
