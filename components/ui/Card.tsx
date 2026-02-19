import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { Colors, BorderRadius, Spacing, Shadow } from '../../constants/theme';

interface CardProps extends ViewProps {
  elevated?: boolean;
  bordered?: boolean;
}

export function Card({ elevated, bordered, style, children, ...props }: CardProps) {
  return (
    <View
      style={[
        styles.base,
        elevated && Shadow.md,
        bordered && styles.bordered,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: BorderRadius.lg,
    padding: Spacing['4'],
  },
  bordered: {
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
});
