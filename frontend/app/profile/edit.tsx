import React, { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { editProfileSchema } from '@/utils/validation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Header } from '@/components/layout/Header';
import api from '@/lib/api';
import { COLORS } from '@/lib/constants';
import { getErrorMessage } from '@/utils/helpers';
import { useImagePicker } from '@/hooks/useImagePicker';

type EditForm = z.infer<typeof editProfileSchema>;

export default function EditProfileScreen() {
  const { user, updateProfile, isLoading } = useAuthStore();
  const { pickImage, imageUri } = useImagePicker();
  const [isResendingVerification, setIsResendingVerification] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<EditForm>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
      phone: user?.phone ?? '',
      university: user?.university ?? '',
      nicNumber: user?.nicNumber ?? '',
    },
  });

  const onSubmit = async (data: EditForm) => {
    try {
      await updateProfile({ ...data, profileImageUrl: imageUri ?? user?.profileImageUrl });
      Alert.alert('Success', 'Profile updated!', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  const handleResendVerification = async () => {
    if (!user?.email) {
      Alert.alert('Error', 'Email address is not available.');
      return;
    }

    try {
      setIsResendingVerification(true);
      await api.post('/auth/resend-verification', { email: user.email });
      Alert.alert('Sent', 'Verification email resent successfully.');
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    } finally {
      setIsResendingVerification(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Edit Profile" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <Avatar
              uri={imageUri ?? user?.profileImageUrl}
              firstName={user?.firstName}
              lastName={user?.lastName}
              size={90}
            />
            <TouchableOpacity style={styles.changePhotoBtn} onPress={pickImage}>
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          <Controller
            control={control}
            name="firstName"
            render={({ field: { onChange, value } }) => (
              <Input
                label="First Name"
                value={value}
                onChangeText={onChange}
                placeholder="First Name"
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
                placeholder="Last Name"
                error={errors.lastName?.message}
              />
            )}
          />

          <Input
            label="Email Address"
            value={user?.email ?? ''}
            editable={false}
            placeholder="email@example.com"
            containerStyle={styles.disabledInput}
          />

          {!user?.isVerified ? (
            <View style={styles.verifySection}>
              <View style={styles.verifyStatusRow}>
                <Ionicons name="alert-circle-outline" size={16} color={COLORS.orange} />
                <Text style={styles.verifyStatusText}>Your email is not verified</Text>
              </View>
              <Button
                title="Resend Verification Email"
                onPress={handleResendVerification}
                loading={isResendingVerification}
                variant="outline"
                style={styles.resendBtn}
              />
            </View>
          ) : (
            <View style={styles.verifySection}>
              <View style={styles.verifyStatusRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.green} />
                <Text style={styles.verifyStatusSuccessText}>Your email is verified</Text>
              </View>
            </View>
          )}

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

          {user?.role === 'STUDENT' ? (
            <Controller
              control={control}
              name="university"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="University"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Your university"
                  error={errors.university?.message}
                />
              )}
            />
          ) : (
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
          )}

          <Button
            title="Save Changes"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            style={styles.saveBtn}
          />

          <TouchableOpacity
            style={styles.changePasswordBtn}
            onPress={() => router.push('/profile/change-password')}
          >
            <Ionicons name="lock-closed-outline" size={16} color={COLORS.primary} />
            <Text style={styles.changePasswordText}>Change Password</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  changePhotoBtn: { marginTop: 10 },
  changePhotoText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
  disabledInput: { opacity: 0.6 },
  verifySection: { marginTop: 4, marginBottom: 10 },
  verifyStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  verifyStatusText: { fontSize: 13, color: COLORS.orange, fontWeight: '500' },
  verifyStatusSuccessText: { fontSize: 13, color: COLORS.green, fontWeight: '500' },
  resendBtn: { height: 44 },
  saveBtn: { marginTop: 8, marginBottom: 16 },
  changePasswordBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  changePasswordText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
});
