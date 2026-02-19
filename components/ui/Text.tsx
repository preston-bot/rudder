import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { Colors, Typography } from '../../constants/theme';

interface RudderTextProps extends TextProps {
  variant?: 'primary' | 'secondary' | 'tertiary' | 'inverse';
  size?: keyof typeof Typography;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold' | 'heavy';
  align?: 'left' | 'center' | 'right';
}

export function Text({
  variant = 'primary',
  size = 'md',
  weight = 'regular',
  align,
  style,
  ...props
}: RudderTextProps) {
  return (
    <RNText
      style={[
        {
          color: Colors.text[variant],
          fontSize: typeof Typography[size] === 'number' ? Typography[size] as number : Typography.md,
          fontWeight: Typography[weight],
          textAlign: align,
        },
        style,
      ]}
      {...props}
    />
  );
}

export function Heading({
  level = 1,
  ...props
}: RudderTextProps & { level?: 1 | 2 | 3 | 4 }) {
  const sizeMap = { 1: '4xl', 2: '3xl', 3: '2xl', 4: 'xl' } as const;
  const weightMap = { 1: 'heavy', 2: 'bold', 3: 'bold', 4: 'semibold' } as const;
  return (
    <Text
      size={sizeMap[level]}
      weight={weightMap[level]}
      {...props}
    />
  );
}
