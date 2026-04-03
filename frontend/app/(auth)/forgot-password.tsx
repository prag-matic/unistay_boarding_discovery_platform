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
import { router } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { forgotPasswordSchema } from '@/utils/validation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { COLORS } from '@/lib/constants';
import { getErrorMessage } from '@/utils/helpers';

type ForgotForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotForm) => {
    try {
      await api.post('/auth/forgot-password', data);
      Alert.alert('Email Sent', 'Check your email for a reset link.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="shield-checkmark" size={72} color={COLORS.primary} />
        </View>

        <Text style={styles.heading}>Forgot Password?</Text>
        <Text style={styles.description}>
          Don&apos;t worry! It happens. Please enter the email address associated with
          your account.
        </Text>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Email Address"
              value={value}
              onChangeText={onChange}
              placeholder="student@university.edu"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email?.message}
              leftIcon={<Ionicons name="mail-outline" size={18} color={COLORS.gray} />}
            />
          )}
        />

        <Button
          title="Send Reset Link"
          onPress={handleSubmit(onSubmit)}
          loading={isSubmitting}
          style={styles.sendBtn}
        />

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Remember your password? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.loginLink}>Log in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { padding: 24, paddingTop: 60 },
  backBtn: { marginBottom: 24 },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  heading: { fontSize: 26, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  description: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22, marginBottom: 32 },
  sendBtn: { marginBottom: 24 },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { fontSize: 14, color: COLORS.textSecondary },
  loginLink: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
});
