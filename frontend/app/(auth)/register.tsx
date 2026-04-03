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
import { useAuthStore } from '@/store/auth.store';
import { studentRegisterSchema, ownerRegisterSchema } from '@/utils/validation';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { COLORS } from '@/lib/constants';
import { getErrorMessage } from '@/utils/helpers';

type StudentForm = z.infer<typeof studentRegisterSchema>;
type OwnerForm = z.infer<typeof ownerRegisterSchema>;

export default function RegisterScreen() {
  const { role } = useLocalSearchParams<{ role: 'student' | 'owner' }>();
  const { register: registerUser, isLoading } = useAuthStore();
  const isStudent = role === 'student';

  const studentForm = useForm<StudentForm>({
    resolver: zodResolver(studentRegisterSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      university: '',
      password: '',
      confirmPassword: '',
      terms: undefined,
    },
  });

  const ownerForm = useForm<OwnerForm>({
    resolver: zodResolver(ownerRegisterSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      nicNumber: '',
      password: '',
      confirmPassword: '',
      terms: undefined,
    },
  });

  const onSubmitStudent = async (data: StudentForm) => {
    try {
      await registerUser({ ...data, role: 'student' });
      router.push({ pathname: '/(auth)/verify-email', params: { email: data.email } });
    } catch (err) {
      Alert.alert('Registration Failed', getErrorMessage(err));
    }
  };

  const onSubmitOwner = async (data: OwnerForm) => {
    try {
      await registerUser({ ...data, role: 'owner' });
      router.push({ pathname: '/(auth)/verify-email', params: { email: data.email } });
    } catch (err) {
      Alert.alert('Registration Failed', getErrorMessage(err));
    }
  };

  if (isStudent) {
    const { control, handleSubmit, formState: { errors } } = studentForm;
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>

          <View style={styles.headingRow}>
            <Text style={styles.heading}>Create Account</Text>
            <Badge label="Student" variant="primary" pill />
          </View>
          <Text style={styles.subheading}>
            Join UniStay to discover your perfect student home.
          </Text>

          <View style={styles.nameRow}>
            <Controller
              control={control}
              name="firstName"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="First Name"
                  value={value}
                  onChangeText={onChange}
                  placeholder="John"
                  error={errors.firstName?.message}
                  containerStyle={styles.halfInput}
                />
              )}
            />
            <Controller
              control={control}
              name="lastName"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Last Name"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Doe"
                  error={errors.lastName?.message}
                  containerStyle={styles.halfInput}
                />
              )}
            />
          </View>

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

          <Controller
            control={control}
            name="university"
            render={({ field: { onChange, value } }) => (
              <Input
                label="University"
                value={value}
                onChangeText={onChange}
                placeholder="Search your university..."
                error={errors.university?.message}
                leftIcon={<Ionicons name="school-outline" size={18} color={COLORS.gray} />}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <PasswordInput
                label="Password"
                value={value}
                onChangeText={onChange}
                placeholder="••••••••"
                error={errors.password?.message}
                leftIcon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.gray} />}
              />
            )}
          />

          <Controller
            control={control}
            name="confirmPassword"
            render={({ field: { onChange, value } }) => (
              <PasswordInput
                label="Confirm Password"
                value={value}
                onChangeText={onChange}
                placeholder="••••••••"
                error={errors.confirmPassword?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="terms"
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <View style={styles.termsRow}>
                <TouchableOpacity
                  style={[styles.checkbox, value && styles.checkboxChecked]}
                  onPress={() => onChange(value ? undefined : true)}
                >
                  {value && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
                </TouchableOpacity>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text style={styles.link}>Terms &amp; Conditions</Text> and{' '}
                  <Text style={styles.link}>Privacy Policy.</Text>
                </Text>
                {error && <Text style={styles.errorText}>{error.message}</Text>}
              </View>
            )}
          />

          <Button
            title="Create Account →"
            onPress={handleSubmit(onSubmitStudent)}
            loading={isLoading}
            style={styles.submitBtn}
          />

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.loginLink}>Log In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Owner form
  const { control, handleSubmit, formState: { errors } } = ownerForm;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.headingRow}>
          <Text style={styles.heading}>Create Owner Account</Text>
          <Badge label="PROPERTY OWNER" variant="primary" />
        </View>

        <Controller
          control={control}
          name="firstName"
          render={({ field: { onChange, value } }) => (
            <Input
              label="First Name"
              value={value}
              onChangeText={onChange}
              placeholder="John"
              error={errors.firstName?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="lastName"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Last Name"
              value={value}
              onChangeText={onChange}
              placeholder="Doe"
              error={errors.lastName?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Email Address"
              value={value}
              onChangeText={onChange}
              placeholder="owner@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              error={errors.email?.message}
              leftIcon={<Ionicons name="mail-outline" size={18} color={COLORS.gray} />}
            />
          )}
        />

        <Controller
          control={control}
          name="phone"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Phone Number"
              value={value}
              onChangeText={onChange}
              placeholder="+1 (555) 000-0000"
              keyboardType="phone-pad"
              error={errors.phone?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="nicNumber"
          render={({ field: { onChange, value } }) => (
            <Input
              label="NIC Number"
              value={value}
              onChangeText={onChange}
              placeholder="Enter your ID number"
              error={errors.nicNumber?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <PasswordInput
              label="Password"
              value={value}
              onChangeText={onChange}
              placeholder="••••••••"
              error={errors.password?.message}
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color={COLORS.gray} />}
            />
          )}
        />
        <Text style={styles.hint}>Must be at least 8 characters long</Text>

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, value } }) => (
            <PasswordInput
              label="Confirm Password"
              value={value}
              onChangeText={onChange}
              placeholder="Re-enter password"
              error={errors.confirmPassword?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="terms"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <View>
              <View style={styles.termsRow}>
                <TouchableOpacity
                  style={[styles.checkbox, value && styles.checkboxChecked]}
                  onPress={() => onChange(value ? undefined : true)}
                >
                  {value && <Ionicons name="checkmark" size={14} color={COLORS.white} />}
                </TouchableOpacity>
                <Text style={styles.termsText}>
                  By registering, you agree to our{' '}
                  <Text style={styles.link}>Terms of Service</Text> &amp;{' '}
                  <Text style={styles.link}>Privacy Policy.</Text>
                </Text>
              </View>
              {error && <Text style={styles.errorText}>{error.message}</Text>}
            </View>
          )}
        />

        <Button
          title="Create Account →"
          onPress={handleSubmit(onSubmitOwner)}
          loading={isLoading}
          style={styles.submitBtn}
        />

        <View style={styles.loginRow}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.loginLink}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { padding: 24, paddingTop: 60 },
  backBtn: { marginBottom: 16 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 8 },
  heading: { fontSize: 24, fontWeight: '700', color: COLORS.text },
  subheading: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 24, lineHeight: 20 },
  nameRow: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 16 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: COLORS.grayBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  termsText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
  link: { color: COLORS.primary },
  submitBtn: { marginBottom: 20 },
  loginRow: { flexDirection: 'row', justifyContent: 'center' },
  loginText: { fontSize: 14, color: COLORS.textSecondary },
  loginLink: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  errorText: { fontSize: 12, color: COLORS.error, marginTop: 4 },
  hint: { fontSize: 12, color: COLORS.textSecondary, marginTop: -12, marginBottom: 16, marginLeft: 2 },
});
