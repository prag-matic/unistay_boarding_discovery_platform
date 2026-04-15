import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '@/lib/constants';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'success' | 'warning' | 'error';
  pill?: boolean;
  style?: ViewStyle;
}

export function Badge({ label, variant = 'primary', pill = false, style }: BadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        pill && styles.pill,
        variant === 'primary' && styles.primary,
        variant === 'success' && styles.success,
        variant === 'warning' && styles.warning,
        variant === 'error' && styles.error,
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === 'primary' && styles.textPrimary,
          variant === 'success' && styles.textSuccess,
          variant === 'warning' && styles.textWarning,
          variant === 'error' && styles.textError,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  pill: {
    borderRadius: 999,
  },
  primary: { backgroundColor: '#EBF0FF' },
  success: { backgroundColor: '#D1FAE5' },
  warning: { backgroundColor: '#FEF3C7' },
  error: { backgroundColor: '#FEE2E2' },
  text: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  textPrimary: { color: COLORS.primary },
  textSuccess: { color: COLORS.green },
  textWarning: { color: COLORS.orange },
  textError: { color: COLORS.red },
});
