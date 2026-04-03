import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '@/lib/api';
import { changePasswordSchema } from '@/utils/validation';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PasswordStrengthIndicator } from '@/components/ui/PasswordStrengthIndicator';
import { Button } from '@/components/ui/Button';
import { Header } from '@/components/layout/Header';
import { COLORS } from '@/lib/constants';
import { getErrorMessage } from '@/utils/helpers';

type ChangeForm = z.infer<typeof changePasswordSchema>;

export default function ChangePasswordScreen() {
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ChangeForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const newPasswordValue = watch('newPassword');

  const onSubmit = async (data: ChangeForm) => {
    try {
      await api.put('/users/me/password', data);
      Alert.alert('Success', 'Password updated!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Change Password" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Controller
            control={control}
            name="currentPassword"
            render={({ field: { onChange, value } }) => (
              <PasswordInput
                label="Current Password"
                value={value}
                onChangeText={onChange}
                placeholder="••••••••"
                error={errors.currentPassword?.message}
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.gray} />}
              />
            )}
          />

          <Controller
            control={control}
            name="newPassword"
            render={({ field: { onChange, value } }) => (
              <PasswordInput
                label="New Password"
                value={value}
                onChangeText={onChange}
                placeholder="••••••••"
                error={errors.newPassword?.message}
              />
            )}
          />

          {newPasswordValue.length > 0 && (
            <PasswordStrengthIndicator password={newPasswordValue} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20 },
  updateBtn: { marginTop: 8 },
});
