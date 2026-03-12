/**
 * Physical Baseline screen.
 * Captures the training context fields that shape plan generation.
 * Accessible from the Profile tab → "Physical baseline" row.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { Text } from '../../components/ui/Text';
import { Button } from '../../components/ui/Button';
import { Colors, Spacing, BorderRadius } from '../../constants/theme';
import type {
  ExperienceLevel,
  PrimaryIdentity,
  MissTolerance,
  DominantStroke,
  InjuryFlag,
} from '../../types';

const EXPERIENCE_OPTIONS: { value: ExperienceLevel; label: string; description: string }[] = [
  { value: 'novice', label: 'Novice', description: 'Building base, shorter distances' },
  { value: 'experienced', label: 'Experienced', description: 'Regular training, race history' },
  { value: 'competitive', label: 'Competitive', description: 'High volume, podium-focused' },
];

const IDENTITY_OPTIONS: { value: PrimaryIdentity; label: string }[] = [
  { value: 'swimmer', label: 'Swimmer' },
  { value: 'triathlete', label: 'Triathlete' },
  { value: 'ow_specialist', label: 'OW Specialist' },
];

const TOLERANCE_OPTIONS: { value: MissTolerance; label: string; description: string }[] = [
  { value: 'low_guilt', label: 'Flexible', description: 'Life happens. Build around it, no guilt.' },
  { value: 'adaptive', label: 'Adaptive', description: 'Adjust when needed, stay on track otherwise.' },
  { value: 'strict', label: 'Committed', description: 'Full load. Miss nothing if possible.' },
];

const STROKE_OPTIONS: { value: DominantStroke; label: string }[] = [
  { value: 'freestyle', label: 'Freestyle' },
  { value: 'backstroke', label: 'Backstroke' },
  { value: 'breaststroke', label: 'Breaststroke' },
  { value: 'butterfly', label: 'Butterfly' },
];

const INJURY_OPTIONS: { value: InjuryFlag; label: string }[] = [
  { value: 'shoulder', label: 'Shoulder' },
  { value: 'knee', label: 'Knee' },
  { value: 'back', label: 'Back' },
  { value: 'hip', label: 'Hip' },
  { value: 'neck', label: 'Neck' },
];

const DURATION_OPTIONS = [
  { label: '30–45m', min: 30, max: 45 },
  { label: '45–60m', min: 45, max: 60 },
  { label: '60–75m', min: 60, max: 75 },
  { label: '75–90m', min: 75, max: 90 },
  { label: '90m+', min: 90, max: 120 },
];

export default function BaselineScreen() {
  const { user } = useAuth();
  const { profile, loading, updateProfile } = useProfile(user?.id);
  const [saving, setSaving] = useState(false);

  const [experience, setExperience] = useState<ExperienceLevel>('experienced');
  const [identity, setIdentity] = useState<PrimaryIdentity>('swimmer');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [durationIndex, setDurationIndex] = useState(1); // 45–60m default
  const [tolerance, setTolerance] = useState<MissTolerance>('adaptive');
  const [stroke, setStroke] = useState<DominantStroke>('freestyle');
  const [injuries, setInjuries] = useState<InjuryFlag[]>([]);

  // Pre-fill from existing profile when loaded
  useEffect(() => {
    if (!profile) return;
    if (profile.experience_level) setExperience(profile.experience_level);
    if (profile.primary_identity) setIdentity(profile.primary_identity);
    if (profile.available_days_per_week) setDaysPerWeek(profile.available_days_per_week);
    if (profile.miss_tolerance) setTolerance(profile.miss_tolerance);
    if (profile.dominant_stroke) setStroke(profile.dominant_stroke as DominantStroke);
    if (profile.injury_flags?.length) setInjuries(profile.injury_flags as InjuryFlag[]);
    if (profile.preferred_session_duration_min) {
      const idx = DURATION_OPTIONS.findIndex(
        (d) => d.min === profile.preferred_session_duration_min,
      );
      if (idx !== -1) setDurationIndex(idx);
    }
  }, [profile]);

  function tap<T>(setter: (v: T) => void, value: T) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setter(value);
  }

  function toggleInjury(flag: InjuryFlag) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInjuries((prev) =>
      prev.includes(flag) ? prev.filter((f) => f !== flag) : [...prev, flag],
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      const dur = DURATION_OPTIONS[durationIndex];
      await updateProfile({
        experience_level: experience,
        primary_identity: identity,
        available_days_per_week: daysPerWeek,
        preferred_session_duration_min: dur.min,
        preferred_session_duration_max: dur.max,
        miss_tolerance: tolerance,
        dominant_stroke: stroke,
        injury_flags: injuries,
      });
      router.back();
    } catch (e: any) {
      Alert.alert('Could not save', e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text size="3xl" weight="bold">Physical baseline</Text>
        <Text size="sm" variant="secondary" style={{ lineHeight: 20 }}>
          This shapes every session Rudder builds for you.
        </Text>

        {/* Experience */}
        <Section label="Experience level">
          {EXPERIENCE_OPTIONS.map((opt) => {
            const active = experience === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => tap(setExperience, opt.value)}
                style={[styles.optionCard, active && styles.optionCardActive]}
              >
                <Text size="md" weight="semibold">{opt.label}</Text>
                <Text size="sm" variant="secondary">{opt.description}</Text>
              </Pressable>
            );
          })}
        </Section>

        {/* Identity */}
        <Section label="Primary identity">
          <View style={styles.chips}>
            {IDENTITY_OPTIONS.map((opt) => {
              const active = identity === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => tap(setIdentity, opt.value)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text size="sm" weight={active ? 'semibold' : 'regular'} style={active ? { color: Colors.text.inverse } : undefined}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {/* Days per week */}
        <Section label="Training days per week">
          <View style={styles.chips}>
            {[2, 3, 4, 5, 6].map((d) => {
              const active = daysPerWeek === d;
              return (
                <Pressable
                  key={d}
                  onPress={() => tap(setDaysPerWeek, d)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text size="md" weight="semibold" style={active ? { color: Colors.text.inverse } : undefined}>{d}</Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {/* Session duration */}
        <Section label="Typical session duration">
          <View style={styles.chips}>
            {DURATION_OPTIONS.map((opt, i) => {
              const active = durationIndex === i;
              return (
                <Pressable
                  key={opt.label}
                  onPress={() => tap(setDurationIndex, i)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text size="sm" weight={active ? 'semibold' : 'regular'} style={active ? { color: Colors.text.inverse } : undefined}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {/* Miss tolerance */}
        <Section label="How do you handle a missed session?">
          {TOLERANCE_OPTIONS.map((opt) => {
            const active = tolerance === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => tap(setTolerance, opt.value)}
                style={[styles.optionCard, active && styles.optionCardActive]}
              >
                <Text size="md" weight="semibold">{opt.label}</Text>
                <Text size="sm" variant="secondary">{opt.description}</Text>
              </Pressable>
            );
          })}
        </Section>

        {/* Dominant stroke */}
        <Section label="Primary stroke">
          <View style={styles.chips}>
            {STROKE_OPTIONS.map((opt) => {
              const active = stroke === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => tap(setStroke, opt.value)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Text size="sm" weight={active ? 'semibold' : 'regular'} style={active ? { color: Colors.text.inverse } : undefined}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        {/* Injury flags */}
        <Section label="Any active limitations? (optional)">
          <View style={styles.chips}>
            {INJURY_OPTIONS.map((opt) => {
              const active = injuries.includes(opt.value);
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => toggleInjury(opt.value)}
                  style={[styles.chip, active && styles.chipInjury]}
                >
                  <Text size="sm" weight={active ? 'semibold' : 'regular'} style={active ? { color: Colors.text.inverse } : undefined}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Section>

        <Button label="Save" fullWidth loading={saving} onPress={handleSave} />
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg.primary },
  scroll: { padding: Spacing['6'], gap: Spacing['5'], paddingBottom: Spacing['10'] },
  section: { gap: Spacing['2'] },
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
  chipInjury: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  optionCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    padding: Spacing['4'],
    gap: Spacing['1'],
  },
  optionCardActive: {
    borderColor: Colors.brand.primary,
    backgroundColor: Colors.bg.tertiary,
  },
});
