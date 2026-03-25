import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/Button';
import { COLORS } from '@/lib/constants';

type Role = 'student' | 'owner';

export default function RoleSelectScreen() {
  const [selected, setSelected] = useState<Role | null>(null);
  const { setSelectedRole } = useAuthStore();

  const handleContinue = () => {
    if (!selected) return;
    setSelectedRole(selected);
    router.push({ pathname: '/(auth)/register', params: { role: selected } });
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Logo */}
      <View style={styles.logoRow}>
        <View style={styles.logo}>
          <Text style={styles.logoIcon}>🎓</Text>
        </View>
        <Text style={styles.logoTitle}>UniStay</Text>
      </View>

      <Text style={styles.heading}>I am a...</Text>
      <Text style={styles.subheading}>Choose your role to get started</Text>

      {/* Cards */}
      <TouchableOpacity
        style={[styles.card, selected === 'student' && styles.cardSelected]}
        onPress={() => setSelected('student')}
        activeOpacity={0.8}
      >
        {selected === 'student' && (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
          </View>
        )}
        <View style={styles.cardIcon}>
          <Ionicons name="person" size={32} color={COLORS.primary} />
        </View>
        <Text style={styles.cardTitle}>Student</Text>
        <Text style={styles.cardDesc}>
          Looking for a boarding house near my university
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, selected === 'owner' && styles.cardSelected]}
        onPress={() => setSelected('owner')}
        activeOpacity={0.8}
      >
        {selected === 'owner' && (
          <View style={styles.checkmark}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
          </View>
        )}
        <View style={styles.cardIcon}>
          <MaterialIcons name="apartment" size={32} color={COLORS.primary} />
        </View>
        <Text style={styles.cardTitle}>Boarding Owner</Text>
        <Text style={styles.cardDesc}>
          I have a property to rent to students
        </Text>
      </TouchableOpacity>

      <Button
        title="Continue →"
        onPress={handleContinue}
        disabled={!selected}
        style={styles.continueBtn}
      />

      <Text style={styles.terms}>
        By continuing, you agree to our{' '}
        <Text style={styles.termsLink}>Terms of Service.</Text>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { padding: 24, paddingTop: 60 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 32 },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: { fontSize: 22 },
  logoTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text },
  heading: { fontSize: 28, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  subheading: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 32 },
  card: {
    borderWidth: 2,
    borderColor: COLORS.grayBorder,
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    position: 'relative',
    backgroundColor: COLORS.white,
  },
  cardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F4FF',
  },
  checkmark: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  cardIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#EBF0FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  cardDesc: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  continueBtn: { marginTop: 8, marginBottom: 20 },
  terms: { fontSize: 12, color: COLORS.textSecondary, textAlign: 'center' },
  termsLink: { color: COLORS.primary },
});
