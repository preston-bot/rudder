import React, { useState } from 'react';
import {
  Modal,
  View,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { Text } from './ui/Text';
import { Button } from './ui/Button';
import type { CheckInStatus, CheckInWeek } from '../types';

interface CheckInOption {
  status: CheckInStatus;
  emoji: string;
  label: string;
  color: string;
  rudderResponse: string;
  feel: string;
}

const OPTIONS: CheckInOption[] = [
  {
    status: 'ahead',
    emoji: '🟢',
    label: 'Ahead of the plan',
    color: Colors.status.ahead,
    rudderResponse:
      'Slightly sharper pace targets. One optional reach set appears next week. Language shifts from "hold" → "press, briefly".',
    feel: '"Oh… okay. We\'re playing a little."',
  },
  {
    status: 'on_target',
    emoji: '🔵',
    label: 'On target',
    color: Colors.status.onTarget,
    rudderResponse:
      'No changes to volume or structure. Reinforces rhythm and consistency.',
    feel: '"Good. Don\'t mess with it."',
  },
  {
    status: 'behind',
    emoji: '🟠',
    label: 'Behind the 8 ball',
    color: Colors.status.behind,
    rudderResponse:
      'Compresses the next block without calling it a cut. Priority swims get protected. If you only swim twice this week, make it these.',
    feel: '"Thank you for not yelling at me."',
  },
];

interface Props {
  visible: boolean;
  weeksOut: CheckInWeek;
  onSubmit: (status: CheckInStatus) => void;
  onDismiss: () => void;
}

export function CheckInModal({ visible, weeksOut, onSubmit, onDismiss }: Props) {
  const [selected, setSelected] = useState<CheckInStatus | null>(null);

  function handleSelect(status: CheckInStatus) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelected(status);
  }

  function handleSubmit() {
    if (!selected) return;
    onSubmit(selected);
    setSelected(null);
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
      <View style={styles.container}>
        <View style={styles.handle} />

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <Text size="sm" variant="secondary" weight="semibold" style={{ textTransform: 'uppercase', letterSpacing: 1 }}>
              {weeksOut}-week check in
            </Text>
            <Text size="3xl" weight="bold" style={{ marginTop: Spacing['2'] }}>
              How are you feeling about the plan?
            </Text>
            {weeksOut === 4 && (
              <Text size="sm" variant="secondary" style={{ marginTop: Spacing['3'], lineHeight: 20 }}>
                At 4 weeks out, confidence matters more than fitness. There's no punishment plan here.
              </Text>
            )}
            {weeksOut === 2 && (
              <Text size="sm" variant="secondary" style={{ marginTop: Spacing['3'], lineHeight: 20 }}>
                Two weeks out. The fitness is built. This check-in is about protecting it — and arriving intact.
              </Text>
            )}
          </View>

          {/* Options */}
          <View style={styles.options}>
            {OPTIONS.map((opt) => (
              <Pressable
                key={opt.status}
                style={[
                  styles.option,
                  selected === opt.status && { borderColor: opt.color, borderWidth: 2 },
                ]}
                onPress={() => handleSelect(opt.status)}
              >
                <View style={styles.optionHeader}>
                  <Text size="xl">{opt.emoji}</Text>
                  <Text size="lg" weight="semibold" style={{ flex: 1 }}>
                    {opt.label}
                  </Text>
                </View>

                {selected === opt.status && (
                  <View style={styles.optionDetail}>
                    <Text size="sm" variant="secondary" style={{ lineHeight: 20 }}>
                      {opt.rudderResponse}
                    </Text>
                    <Text size="sm" style={{ color: opt.color, marginTop: Spacing['2'], fontStyle: 'italic' }}>
                      {opt.feel}
                    </Text>
                  </View>
                )}
              </Pressable>
            ))}
          </View>

          {/* CTA */}
          <Button
            label="Save check-in"
            fullWidth
            disabled={!selected}
            onPress={handleSubmit}
            style={{ marginTop: Spacing['4'] }}
          />
          <Button
            label="Not now"
            variant="ghost"
            fullWidth
            onPress={onDismiss}
          />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    paddingTop: Spacing['3'],
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.border.default,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing['4'],
  },
  content: {
    padding: Spacing['6'],
    paddingBottom: Spacing['10'],
    gap: Spacing['4'],
  },
  header: {
    gap: Spacing['2'],
    marginBottom: Spacing['4'],
  },
  options: {
    gap: Spacing['3'],
  },
  option: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing['4'],
    borderWidth: 1,
    borderColor: Colors.border.subtle,
    gap: Spacing['2'],
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['3'],
  },
  optionDetail: {
    marginTop: Spacing['2'],
    paddingTop: Spacing['3'],
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
  },
});
