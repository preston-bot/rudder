/**
 * New Race entry — the anchor for the entire training plan.
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../hooks/useAuth';
import { useRaces } from '../../hooks/useRace';
import { useProfile } from '../../hooks/useProfile';
import { buildAndSaveTrainingPlan } from '../../lib/claude';
import { Button } from '../../components/ui/Button';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import type { RaceEnvironment, GoalType, RacePriority, FocusArea, PoolLength } from '../../types';

const ENVIRONMENTS: { value: RaceEnvironment; label: string }[] = [
  { value: 'lake', label: 'Lake' },
  { value: 'ocean', label: 'Ocean' },
  { value: 'river', label: 'River' },
  { value: 'pool', label: 'Pool' },
];

const GOAL_TYPES: { value: GoalType; label: string; description: string }[] = [
  { value: 'finish', label: 'Finish strong', description: 'Cross the line feeling in control' },
  { value: 'time', label: 'Time goal', description: 'Target a specific finish window' },
  { value: 'age_group', label: 'Age group', description: 'Compete within your age group' },
  { value: 'podium', label: 'Podium', description: 'Top 3 overall' },
  { value: 'survive', label: 'Just survive', description: 'First open water race — arrive intact' },
];

const FOCUS_AREAS: { value: FocusArea; label: string }[] = [
  { value: 'endurance', label: 'Endurance' },
  { value: 'pace_control', label: 'Pace control' },
  { value: 'speed', label: 'Speed' },
  { value: 'ow_skills', label: 'Open water skills' },
];

const POOL_LENGTHS: { value: PoolLength; label: string }[] = [
  { value: '25m', label: '25m' },
  { value: '25y', label: '25y' },
  { value: '20m', label: '20m' },
];

const PRIORITIES: { value: RacePriority; label: string; description: string }[] = [
  { value: 'A', label: 'A race', description: 'Peak event — plan built around this' },
  { value: 'B', label: 'B race', description: 'Important but secondary' },
  { value: 'C', label: 'C race', description: 'Training race, low stakes' },
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

type Step = 'race' | 'goal' | 'context';

export default function NewRaceScreen() {
  const { user } = useAuth();
  const { createRace } = useRaces(user?.id);
  const { updateProfile } = useProfile(user?.id);

  const [step, setStep] = useState<Step>('race');
  const [loading, setLoading] = useState(false);

  // Step 1 — race
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

  // Build an ISO date (YYYY-MM-DD) from the DD/MM/YYYY inputs, or '' if incomplete/invalid
  const raceDate = (() => {
    const d = parseInt(dateDay, 10);
    const m = parseInt(dateMonth, 10);
    const y = parseInt(dateYear, 10);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return '';
    if (d < 1 || d > 31 || m < 1 || m > 12 || y < 2024 || y > 2100) return '';
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  })();

  // Step 2 — goal
  const [goalType, setGoalType] = useState<GoalType>('finish');
  const [goalTimeHours, setGoalTimeHours] = useState('');
  const [goalTimeMins, setGoalTimeMins] = useState('');

  // Step 3 — context
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [poolLengths, setPoolLengths] = useState<PoolLength[]>(['25y']);
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);

  function togglePoolLength(pl: PoolLength) {
    setPoolLengths((prev) =>
      prev.includes(pl) ? prev.filter((p) => p !== pl) : [...prev, pl],
    );
  }

  function toggleFocusArea(fa: FocusArea) {
    if (focusAreas.includes(fa)) {
      setFocusAreas(focusAreas.filter((f) => f !== fa));
    } else if (focusAreas.length < 2) {
      setFocusAreas([...focusAreas, fa]);
    }
  }

  async function handleSubmit() {
    if (!user) return;
    setLoading(true);
    try {
      const distanceMeters = Math.round(parseFloat(distance) * TO_METERS[distanceUnit]);
      const goalTimeSec =
        goalType === 'time'
          ? parseInt(goalTimeHours || '0') * 3600 + parseInt(goalTimeMins || '0') * 60
          : null;

      // Persist training context to profile so the edge function can read it
      await updateProfile({
        available_days_per_week: daysPerWeek,
        pool_lengths: poolLengths,
      });

      const race = await createRace({
        user_id: user.id,
        name: raceName,
        date: raceDate,
        location,
        environment,
        distance_meters: distanceMeters,
        temp_celsius: null,
        wetsuit_allowed: wetsuit,
        goal_type: goalType,
        goal_time_seconds: goalTimeSec,
        priority,
      });

      // Generate + save the plan. If this fails, the race is still saved —
      // send the user to the Arc tab where they can retry plan generation
      // instead of losing everything they just entered.
      try {
        await buildAndSaveTrainingPlan(race, focusAreas, user.id);
        router.replace('/(app)/');
      } catch (planErr: any) {
        Alert.alert(
          'Race saved — plan needs a retry',
          "We couldn't build your training plan just now. Open the Arc tab to try again.",
        );
        router.replace('/(app)/arc');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={80}
      >
      {/* Step indicator */}
      <View style={styles.stepIndicator}>
        {(['race', 'goal', 'context'] as Step[]).map((s, i) => (
          <View
            key={s}
            style={[
              styles.stepDot,
              step === s && styles.stepDotActive,
              (['race', 'goal', 'context'] as Step[]).indexOf(step) > i && styles.stepDotDone,
            ]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {step === 'race' && (
          <RaceStep
            raceName={raceName} setRaceName={setRaceName}
            dateDay={dateDay} setDateDay={setDateDay}
            dateMonth={dateMonth} setDateMonth={setDateMonth}
            dateYear={dateYear} setDateYear={setDateYear}
            location={location} setLocation={setLocation}
            distance={distance} setDistance={setDistance}
            distanceUnit={distanceUnit} setDistanceUnit={setDistanceUnit}
            environment={environment} setEnvironment={setEnvironment}
            priority={priority} setPriority={setPriority}
            wetsuit={wetsuit} setWetsuit={setWetsuit}
          />
        )}

        {step === 'goal' && (
          <GoalStep
            goalType={goalType} setGoalType={setGoalType}
            goalTimeHours={goalTimeHours} setGoalTimeHours={setGoalTimeHours}
            goalTimeMins={goalTimeMins} setGoalTimeMins={setGoalTimeMins}
          />
        )}

        {step === 'context' && (
          <ContextStep
            daysPerWeek={daysPerWeek} setDaysPerWeek={setDaysPerWeek}
            poolLengths={poolLengths} togglePoolLength={togglePoolLength}
            focusAreas={focusAreas} toggleFocusArea={toggleFocusArea}
          />
        )}

        {/* Navigation */}
        <View style={styles.nav}>
          {step !== 'race' && (
            <Button
              label="Back"
              variant="ghost"
              onPress={() => setStep(step === 'goal' ? 'race' : 'goal')}
            />
          )}
          {step !== 'context' ? (
            <Button
              label="Next"
              fullWidth={step === 'race'}
              onPress={() => setStep(step === 'race' ? 'goal' : 'context')}
              disabled={step === 'race' && (!raceName || !raceDate || !distance)}
            />
          ) : (
            <Button
              label="Build my plan"
              onPress={handleSubmit}
              loading={loading}
              disabled={focusAreas.length === 0}
            />
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Step sub-components ───────────────────────────────────────────────────────

function FieldLabel({ children }: { children: string }) {
  return <Text size="sm" variant="secondary" weight="medium">{children}</Text>;
}

function StyledInput({ style, ...props }: React.ComponentProps<typeof TextInput>) {
  return (
    <TextInput
      placeholderTextColor={Colors.text.tertiary}
      selectionColor={Colors.brand.primary}
      {...props}
      style={[inputStyle, style]}
    />
  );
}

const inputStyle = {
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

function ChipRow<T extends string>({
  options,
  selected,
  onSelect,
  multi = false,
}: {
  options: { value: T; label: string }[];
  selected: T | T[];
  onSelect: (v: T) => void;
  multi?: boolean;
}) {
  const selectedArr = Array.isArray(selected) ? selected : [selected];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing['2'] }}>
      {options.map((opt) => {
        const active = selectedArr.includes(opt.value);
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

function RaceStep({ raceName, setRaceName, dateDay, setDateDay, dateMonth, setDateMonth, dateYear, setDateYear, location, setLocation, distance, setDistance, distanceUnit, setDistanceUnit, environment, setEnvironment, priority, setPriority, wetsuit, setWetsuit }: any) {
  return (
    <View style={styles.stepContent}>
      <Text size="3xl" weight="bold">Your race</Text>
      <Text size="sm" variant="secondary">This becomes the anchor for your entire training plan.</Text>

      <View style={styles.field}>
        <FieldLabel>Race name *</FieldLabel>
        <StyledInput value={raceName} onChangeText={setRaceName} placeholder="e.g. Seafair Triathlon" />
      </View>

      <View style={styles.field}>
        <FieldLabel>Race date * (DD / MM / YYYY)</FieldLabel>
        <View style={{ flexDirection: 'row', gap: Spacing['2'], alignItems: 'center' }}>
          <StyledInput value={dateDay} onChangeText={setDateDay} placeholder="DD" keyboardType="number-pad" maxLength={2} style={{ width: 64, textAlign: 'center' }} />
          <Text variant="secondary">/</Text>
          <StyledInput value={dateMonth} onChangeText={setDateMonth} placeholder="MM" keyboardType="number-pad" maxLength={2} style={{ width: 64, textAlign: 'center' }} />
          <Text variant="secondary">/</Text>
          <StyledInput value={dateYear} onChangeText={setDateYear} placeholder="YYYY" keyboardType="number-pad" maxLength={4} style={{ width: 84, textAlign: 'center' }} />
        </View>
      </View>

      <View style={styles.field}>
        <FieldLabel>Location</FieldLabel>
        <StyledInput value={location} onChangeText={setLocation} placeholder="City, State" />
      </View>

      <View style={styles.field}>
        <FieldLabel>Distance *</FieldLabel>
        <View style={{ flexDirection: 'row', gap: Spacing['2'], alignItems: 'center' }}>
          <StyledInput value={distance} onChangeText={setDistance} placeholder="e.g. 1500" keyboardType="numeric" style={{ flex: 1 }} />
        </View>
        <View style={{ marginTop: Spacing['2'] }}>
          <ChipRow options={DISTANCE_UNITS} selected={distanceUnit} onSelect={setDistanceUnit} />
        </View>
      </View>

      <View style={styles.field}>
        <FieldLabel>Environment</FieldLabel>
        <ChipRow options={ENVIRONMENTS} selected={environment} onSelect={setEnvironment} />
      </View>

      <View style={styles.field}>
        <FieldLabel>Priority</FieldLabel>
        {PRIORITIES.map((p) => (
          <Pressable key={p.value} onPress={() => setPriority(p.value)} style={[styles.goalCard, priority === p.value && styles.goalCardActive]}>
            <Text size="md" weight="semibold">{p.label}</Text>
            <Text size="sm" variant="secondary">{p.description}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.field}>
        <FieldLabel>Planning on Wetsuit?</FieldLabel>
        <ChipRow options={[{ value: 'yes' as any, label: 'Yes' }, { value: 'no' as any, label: 'No' }, { value: 'unknown' as any, label: 'Unknown' }]} selected={wetsuit === true ? 'yes' : wetsuit === false ? 'no' : 'unknown'} onSelect={(v: any) => setWetsuit(v === 'yes' ? true : v === 'no' ? false : null)} />
      </View>
    </View>
  );
}

function GoalStep({ goalType, setGoalType, goalTimeHours, setGoalTimeHours, goalTimeMins, setGoalTimeMins }: any) {
  return (
    <View style={styles.stepContent}>
      <Text size="3xl" weight="bold">Define your goal</Text>
      <Text size="sm" variant="secondary">This shapes the intent behind every session.</Text>

      {GOAL_TYPES.map((g) => (
        <Pressable key={g.value} onPress={() => setGoalType(g.value)} style={[styles.goalCard, goalType === g.value && styles.goalCardActive]}>
          <Text size="md" weight="semibold">{g.label}</Text>
          <Text size="sm" variant="secondary">{g.description}</Text>
        </Pressable>
      ))}

      {goalType === 'time' && (
        <View style={styles.field}>
          <FieldLabel>Target time</FieldLabel>
          <View style={{ flexDirection: 'row', gap: Spacing['2'], alignItems: 'center' }}>
            <StyledInput value={goalTimeHours} onChangeText={setGoalTimeHours} placeholder="0" keyboardType="numeric" style={{ width: 60, textAlign: 'center' }} />
            <Text variant="secondary">h</Text>
            <StyledInput value={goalTimeMins} onChangeText={setGoalTimeMins} placeholder="30" keyboardType="numeric" style={{ width: 60, textAlign: 'center' }} />
            <Text variant="secondary">m</Text>
          </View>
        </View>
      )}
    </View>
  );
}

function ContextStep({ daysPerWeek, setDaysPerWeek, poolLengths, togglePoolLength, focusAreas, toggleFocusArea }: any) {
  return (
    <View style={styles.stepContent}>
      <Text size="3xl" weight="bold">Your training context</Text>
      <Text size="sm" variant="secondary">Rudder fits the plan to your life, not the other way around.</Text>

      <View style={styles.field}>
        <FieldLabel>Training days per week</FieldLabel>
        <View style={{ flexDirection: 'row', gap: Spacing['2'] }}>
          {[2, 3, 4, 5, 6].map((d) => (
            <Pressable key={d} onPress={() => setDaysPerWeek(d)} style={[styles.chip, daysPerWeek === d && styles.chipActive]}>
              <Text size="md" weight="semibold" style={daysPerWeek === d ? { color: Colors.text.inverse } : undefined}>{d}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.field}>
        <FieldLabel>Pool lengths you use</FieldLabel>
        <ChipRow options={POOL_LENGTHS} selected={poolLengths} onSelect={togglePoolLength} multi />
      </View>

      <View style={styles.field}>
        <FieldLabel>Focus areas (pick up to 2)</FieldLabel>
        <ChipRow options={FOCUS_AREAS} selected={focusAreas} onSelect={toggleFocusArea} multi />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing['2'],
    paddingVertical: Spacing['3'],
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border.default,
  },
  stepDotActive: {
    backgroundColor: Colors.brand.primary,
    width: 24,
  },
  stepDotDone: {
    backgroundColor: Colors.status.ahead,
  },
  scroll: {
    padding: Spacing['6'],
    gap: Spacing['4'],
    paddingBottom: Spacing['10'],
  },
  stepContent: {
    gap: Spacing['4'],
  },
  field: {
    gap: Spacing['2'],
  },
  goalCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    padding: Spacing['4'],
    gap: Spacing['1'],
  },
  goalCardActive: {
    borderColor: Colors.brand.primary,
    backgroundColor: Colors.bg.tertiary,
  },
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
  nav: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing['3'],
    marginTop: Spacing['4'],
  },
});
