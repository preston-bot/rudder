/**
 * Edit Race — minimal edit form for an existing race.
 * Does NOT regenerate the training plan when fields change.
 * If the user needs a fresh plan, they can delete + recreate.
 */

import React, { useState, useEffect } from 'react';
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
import { useRace, useRaces } from '../../../hooks/useRace';
import { Button } from '../../../components/ui/Button';
import { Text } from '../../../components/ui/Text';
import { Colors, Spacing, BorderRadius } from '../../../constants/theme';
import type { RaceEnvironment, GoalType, RacePriority } from '../../../types';

const ENVIRONMENTS: { value: RaceEnvironment; label: string }[] = [
  { value: 'lake', label: 'Lake' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'river', label: 'River' },
  { value: 'pool', label: 'Pool' },
];

const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: 'finish', label: 'Finish strong' },
  { value: 'time', label: 'Time goal' },
  { value: 'age_group', label: 'Age group' },
  { value: 'podium', label: 'Podium' },
  { value: 'survive', label: 'Just survive' },
];

const PRIORITIES: { value: RacePriority; label: string }[] = [
  { value: 'A', label: 'A race' },
  { value: 'B', label: 'B race' },
  { value: 'C', label: 'C race' },
];

type DistanceUnit = 'm' | 'yd' | 'km' | 'mi';
const DISTANCE_UNITS: { value: DistanceUnit; label: string }[] = [
  { value: 'm', label: 'm' },
  { value: 'yd', label: 'yd' },
  { value: 'km', label: 'km' },
  { value: 'mi', label: 'mi' },
];
const TO_METERS: Record<DistanceUnit, number> = {
  m: 1,
  yd: 0.9144,
  km: 1000,
  mi: 1609.344,
};

export default function EditRaceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { race, loading: raceLoading } = useRace(id);
  const { updateRace } = useRaces(user?.id);

  const [raceName, setRaceName] = useState('');
  const [dateDay, setDateDay] = useState('');
  const [dateMonth, setDateMonth] = useState('');
  const [dateYear, setDateYear] = useState('');
  const [location, setLocation] = useState('');
  const [distance, setDistance] = useState('');
  const [distanceUnit, setDistanceUnit] = useState<DistanceUnit>('m');
  const [environment, setEnvironment] = useState<RaceEnvironment>('lake');
  const [priority, setPriority] = useState<RacePriority>('A');
  const [wetsuit, setWetsuit] = useState<boolean | null>(null);
  const [goalType, setGoalType] = useState<GoalType>('finish');
  const [goalTimeHours, setGoalTimeHours] = useState('');
  const [goalTimeMins, setGoalTimeMins] = useState('');
  const [saving, setSaving] = useState(false);

  // Prefill from the loaded race
  useEffect(() => {
    if (!race) return;
    setRaceName(race.name);
    const [y, m, d] = race.date.split('-');
    setDateYear(y ?? '');
    setDateMonth(m ?? '');
    setDateDay(d ?? '');
    setLocation(race.location ?? '');
    setDistance(String(race.distance_meters));
    setDistanceUnit('m');
    setEnvironment(race.environment);
    setPriority(race.priority);
    setWetsuit(race.wetsuit_allowed);
    setGoalType(race.goal_type);
    if (race.goal_time_seconds) {
      setGoalTimeHours(String(Math.floor(race.goal_time_seconds / 3600)));
      setGoalTimeMins(String(Math.floor((race.goal_time_seconds % 3600) / 60)));
    }
  }, [race?.race_id]);

  const raceDate = (() => {
    const d = parseInt(dateDay, 10);
    const m = parseInt(dateMonth, 10);
    const y = parseInt(dateYear, 10);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return '';
    if (d < 1 || d > 31 || m < 1 || m > 12 || y < 2024 || y > 2100) return '';
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  })();

  async function handleSave() {
    if (!race) return;
    if (!raceName || !raceDate || !distance) {
      Alert.alert('Missing info', 'Name, date, and distance are required.');
      return;
    }
    setSaving(true);
    try {
      const distanceMeters = Math.round(parseFloat(distance) * TO_METERS[distanceUnit]);
      const goalTimeSec =
        goalType === 'time'
          ? parseInt(goalTimeHours || '0') * 3600 + parseInt(goalTimeMins || '0') * 60
          : null;

      await updateRace(race.race_id, {
        name: raceName,
        date: raceDate,
        location,
        environment,
        distance_meters: distanceMeters,
        wetsuit_allowed: wetsuit,
        goal_type: goalType,
        goal_time_seconds: goalTimeSec,
        priority,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Could not save', e.message);
    } finally {
      setSaving(false);
    }
  }

  if (raceLoading || !race) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text variant="secondary">Loading...</Text>
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
          <Text size="3xl" weight="bold">Edit race</Text>
          <Text size="sm" variant="secondary">
            Changes apply to the race only. They won't regenerate your training plan.
          </Text>

          <Field label="Race name *">
            <StyledInput value={raceName} onChangeText={setRaceName} />
          </Field>

          <Field label="Race date * (DD / MM / YYYY)">
            <View style={styles.dateRow}>
              <StyledInput value={dateDay} onChangeText={setDateDay} keyboardType="number-pad" maxLength={2} style={styles.dateInput} placeholder="DD" />
              <Text variant="secondary">/</Text>
              <StyledInput value={dateMonth} onChangeText={setDateMonth} keyboardType="number-pad" maxLength={2} style={styles.dateInput} placeholder="MM" />
              <Text variant="secondary">/</Text>
              <StyledInput value={dateYear} onChangeText={setDateYear} keyboardType="number-pad" maxLength={4} style={styles.yearInput} placeholder="YYYY" />
            </View>
          </Field>

          <Field label="Location">
            <StyledInput value={location} onChangeText={setLocation} placeholder="City, State" />
          </Field>

          <Field label="Distance *">
            <StyledInput value={distance} onChangeText={setDistance} keyboardType="numeric" placeholder="e.g. 1500" />
            <View style={{ marginTop: Spacing['2'] }}>
              <ChipRow options={DISTANCE_UNITS} selected={distanceUnit} onSelect={setDistanceUnit} />
            </View>
          </Field>

          <Field label="Environment">
            <ChipRow options={ENVIRONMENTS} selected={environment} onSelect={setEnvironment} />
          </Field>

          <Field label="Priority">
            <ChipRow options={PRIORITIES} selected={priority} onSelect={setPriority} />
          </Field>

          <Field label="Planning on Wetsuit?">
            <ChipRow
              options={[
                { value: 'yes' as const, label: 'Yes' },
                { value: 'no' as const, label: 'No' },
                { value: 'unknown' as const, label: 'Unknown' },
              ]}
              selected={wetsuit === true ? 'yes' : wetsuit === false ? 'no' : 'unknown'}
              onSelect={(v) =>
                setWetsuit(v === 'yes' ? true : v === 'no' ? false : null)
              }
            />
          </Field>

          <Field label="Goal">
            <ChipRow options={GOAL_TYPES} selected={goalType} onSelect={setGoalType} />
          </Field>

          {goalType === 'time' && (
            <Field label="Target time">
              <View style={styles.dateRow}>
                <StyledInput value={goalTimeHours} onChangeText={setGoalTimeHours} keyboardType="number-pad" maxLength={2} style={styles.dateInput} placeholder="0" />
                <Text variant="secondary">h</Text>
                <StyledInput value={goalTimeMins} onChangeText={setGoalTimeMins} keyboardType="number-pad" maxLength={2} style={styles.dateInput} placeholder="30" />
                <Text variant="secondary">m</Text>
              </View>
            </Field>
          )}

          <Button label="Save changes" fullWidth onPress={handleSave} loading={saving} />
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  field: { gap: Spacing['2'] },
  dateRow: { flexDirection: 'row', gap: Spacing['2'], alignItems: 'center' },
  dateInput: { width: 64, textAlign: 'center' },
  yearInput: { width: 84, textAlign: 'center' },
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
