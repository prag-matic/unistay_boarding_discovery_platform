import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPasswordStrength } from '@/utils/password';
import { COLORS } from '@/lib/constants';

interface PasswordStrengthIndicatorProps {
  password: string;
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const { score, label, color, requirements } = getPasswordStrength(password);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.strengthLabel}>Password strength</Text>
        <Text style={[styles.strengthValue, { color }]}>{label}</Text>
      </View>
      <View style={styles.segments}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.segment,
              { backgroundColor: i < score ? color : COLORS.grayBorder },
            ]}
          />
        ))}
      </View>
      <Text style={styles.reqTitle}>REQUIREMENTS</Text>
      {requirements.map((req) => (
        <View key={req.label} style={styles.reqRow}>
          <Ionicons
            name={req.met ? 'checkmark-circle' : 'ellipse-outline'}
            size={16}
            color={req.met ? COLORS.green : COLORS.gray}
          />
          <Text style={[styles.reqText, req.met && styles.reqMet]}>{req.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  strengthLabel: { fontSize: 13, color: COLORS.textSecondary },
  strengthValue: { fontSize: 13, fontWeight: '600' },
  segments: { flexDirection: 'row', gap: 4, marginBottom: 12 },
  segment: { flex: 1, height: 4, borderRadius: 2 },
  reqTitle: { fontSize: 11, fontWeight: '700', color: COLORS.gray, marginBottom: 8, letterSpacing: 0.5 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  reqText: { fontSize: 13, color: COLORS.textSecondary },
  reqMet: { color: COLORS.green },
});
