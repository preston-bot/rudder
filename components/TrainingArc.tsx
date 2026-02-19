/**
 * TrainingArc — the horizontal arc from Today → Race Day
 * Shows phases as labeled segments along a curved path.
 *
 * Uses react-native-svg for the arc and phase markers.
 */

import React, { useMemo } from 'react';
import { View, Pressable, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText } from 'react-native-svg';
import { Colors, Typography, Spacing } from '../constants/theme';
import { Text } from './ui/Text';
import type { TrainingPhase, PhaseBlock } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ARC_WIDTH = SCREEN_WIDTH - Spacing['8'] * 2;
const ARC_HEIGHT = 120;
const PHASE_COLORS: Record<TrainingPhase, string> = {
  base: Colors.phase.base,
  build: Colors.phase.build,
  specific: Colors.phase.specific,
  taper: Colors.phase.taper,
};
const PHASE_LABELS: Record<TrainingPhase, string> = {
  base: 'Base',
  build: 'Build',
  specific: 'Specific',
  taper: 'Taper',
};
const PHASE_DESCRIPTIONS: Record<TrainingPhase, string> = {
  base: 'Establish aerobic capacity and technical consistency.',
  build: 'Progressively increase intensity and density.',
  specific: 'Align training stimuli with race demands.',
  taper: 'Reduce volume, maintain intensity, arrive sharp.',
};

interface Props {
  phases: PhaseBlock[];
  currentPhase: TrainingPhase;
  raceDate: string;
  onPhasePress?: (phase: TrainingPhase) => void;
}

export function TrainingArc({ phases, currentPhase, raceDate, onPhasePress }: Props) {
  const totalDays = useMemo(() => {
    if (!phases.length) return 84;
    const start = new Date(phases[0].start_date);
    const end = new Date(raceDate);
    return Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
  }, [phases, raceDate]);

  const today = new Date();
  const planStart = phases.length ? new Date(phases[0].start_date) : today;
  const daysElapsed = Math.max(
    0,
    Math.floor((today.getTime() - planStart.getTime()) / 86_400_000),
  );
  const progressRatio = Math.min(1, daysElapsed / totalDays);

  // Build arc path — a gentle upward arc from left to right
  const arcD = `M 0 ${ARC_HEIGHT} Q ${ARC_WIDTH / 2} 20 ${ARC_WIDTH} ${ARC_HEIGHT}`;

  // Map a day offset to an (x,y) point on the quadratic bezier
  function pointOnArc(ratio: number): { x: number; y: number } {
    const t = ratio;
    const x = 2 * (1 - t) * t * (ARC_WIDTH / 2) + t * t * ARC_WIDTH;
    const y =
      (1 - t) * (1 - t) * ARC_HEIGHT +
      2 * (1 - t) * t * 20 +
      t * t * ARC_HEIGHT;
    return { x, y };
  }

  const phaseMarkers = useMemo(() => {
    if (!phases.length) return [];
    return phases.map((phase) => {
      const startDay = Math.ceil(
        (new Date(phase.start_date).getTime() - planStart.getTime()) / 86_400_000,
      );
      const ratio = Math.min(1, Math.max(0, startDay / totalDays));
      return { phase: phase.phase, ratio, point: pointOnArc(ratio) };
    });
  }, [phases, planStart, totalDays]);

  const progressPoint = pointOnArc(progressRatio);

  return (
    <View style={styles.container}>
      <Svg width={ARC_WIDTH} height={ARC_HEIGHT + 40}>
        {/* Ghost arc (full path) */}
        <Path d={arcD} stroke={Colors.border.subtle} strokeWidth={2} fill="none" />

        {/* Filled progress arc — drawn as a partial bezier via approximation */}
        <Path
          d={`M 0 ${ARC_HEIGHT} Q ${ARC_WIDTH / 2} 20 ${progressPoint.x} ${progressPoint.y}`}
          stroke={Colors.brand.primary}
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
        />

        {/* Phase markers */}
        {phaseMarkers.map(({ phase, point }) => (
          <React.Fragment key={phase}>
            <Circle
              cx={point.x}
              cy={point.y}
              r={6}
              fill={PHASE_COLORS[phase]}
              stroke={Colors.bg.primary}
              strokeWidth={2}
            />
          </React.Fragment>
        ))}

        {/* Current position dot */}
        <Circle
          cx={progressPoint.x}
          cy={progressPoint.y}
          r={8}
          fill={Colors.brand.primary}
          stroke={Colors.bg.primary}
          strokeWidth={3}
        />

        {/* Race day marker */}
        <Circle
          cx={ARC_WIDTH}
          cy={ARC_HEIGHT}
          r={6}
          fill={Colors.status.ahead}
          stroke={Colors.bg.primary}
          strokeWidth={2}
        />
        <SvgText
          x={ARC_WIDTH - 4}
          y={ARC_HEIGHT + 18}
          fill={Colors.text.secondary}
          fontSize={Typography.xs}
          textAnchor="end"
        >
          Race Day
        </SvgText>
        <SvgText
          x={4}
          y={ARC_HEIGHT + 18}
          fill={Colors.text.secondary}
          fontSize={Typography.xs}
          textAnchor="start"
        >
          Today
        </SvgText>
      </Svg>

      {/* Phase legend */}
      <View style={styles.legend}>
        {phases.map(({ phase }) => (
          <Pressable
            key={phase}
            style={[
              styles.legendItem,
              currentPhase === phase && styles.legendItemActive,
            ]}
            onPress={() => onPhasePress?.(phase)}
          >
            <View style={[styles.legendDot, { backgroundColor: PHASE_COLORS[phase] }]} />
            <Text
              size="xs"
              weight={currentPhase === phase ? 'semibold' : 'regular'}
              variant={currentPhase === phase ? 'primary' : 'secondary'}
            >
              {PHASE_LABELS[phase]}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Active phase description */}
      <Text size="sm" variant="secondary" style={styles.phaseDescription}>
        {PHASE_DESCRIPTIONS[currentPhase]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing['3'],
  },
  legend: {
    flexDirection: 'row',
    gap: Spacing['3'],
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['1'],
    paddingVertical: Spacing['1'],
    paddingHorizontal: Spacing['2'],
    borderRadius: 20,
  },
  legendItemActive: {
    backgroundColor: Colors.bg.tertiary,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  phaseDescription: {
    lineHeight: 20,
  },
});
