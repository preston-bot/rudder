import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Spacing, BorderRadius } from '../../constants/theme';
import { Text } from './Text';

interface ButtonProps extends PressableProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  fullWidth = false,
  onPress,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const handlePress = (e: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.(e);
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? Colors.text.inverse : Colors.text.primary}
          size="small"
        />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text
            weight="semibold"
            size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'}
            style={[
              styles.label,
              variant === 'primary' && { color: Colors.text.inverse },
              variant === 'ghost' && { color: Colors.brand.primary },
              variant === 'destructive' && { color: Colors.error },
            ]}
          >
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing['2'],
  },
  label: {},
  fullWidth: { width: '100%' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.4 },

  // Variants
  primary: {
    backgroundColor: Colors.brand.primary,
    paddingVertical: Spacing['3'],
    paddingHorizontal: Spacing['6'],
  },
  secondary: {
    backgroundColor: Colors.bg.tertiary,
    paddingVertical: Spacing['3'],
    paddingHorizontal: Spacing['6'],
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  ghost: {
    backgroundColor: 'transparent',
    paddingVertical: Spacing['3'],
    paddingHorizontal: Spacing['4'],
  },
  destructive: {
    backgroundColor: 'transparent',
    paddingVertical: Spacing['3'],
    paddingHorizontal: Spacing['4'],
    borderWidth: 1,
    borderColor: Colors.error,
  },

  // Sizes
  size_sm: { minHeight: 36 },
  size_md: { minHeight: 48 },
  size_lg: { minHeight: 56 },
});
