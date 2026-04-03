import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { resetPasswordSchema } from '@/utils/validation';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PasswordStrengthIndicator } from '@/components/ui/PasswordStrengthIndicator';
import { Button } from '@/components/ui/Button';
import { COLORS } from '@/lib/constants';
import { getErrorMessage } from '@/utils/helpers';

type ResetForm = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const passwordValue = watch('password');

  const onSubmit = async (data: ResetForm) => {
    try {
      await api.post('/auth/reset-password', { token, password: data.password });
      Alert.alert('Success', 'Your password has been updated.', [
        { text: 'Log In', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerBrand}>UniStay</Text>
        </View>

        <Text style={styles.heading}>Set New Password</Text>
        <Text style={styles.description}>
          Create a new, strong password for your account. It must be different from
          previously used passwords.
        </Text>

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <PasswordInput
              label="New Password"
              value={value}
              onChangeText={onChange}
              placeholder="••••••••"
              error={errors.password?.message}
            />
          )}
        />

        {passwordValue.length > 0 && (
          <PasswordStrengthIndicator password={passwordValue} />
        )}

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, value } }) => (
            <PasswordInput
              label="Confirm New Password"
              value={value}
              onChangeText={onChange}
              placeholder="Re-enter password"
              error={errors.confirmPassword?.message}
            />
          )}
        />

        <Button
          title="Update Password"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          style={styles.updateBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { padding: 24, paddingTop: 56 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 },
  headerBrand: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  heading: { fontSize: 26, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  description: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 24 },
  updateBtn: { marginTop: 8 },
});
