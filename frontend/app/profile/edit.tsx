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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { editProfileSchema } from '@/utils/validation';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Header } from '@/components/layout/Header';
import { COLORS } from '@/lib/constants';
import { getErrorMessage } from '@/utils/helpers';
import { useImagePicker } from '@/hooks/useImagePicker';
import { uploadProfileImage } from '@/lib/user';

type EditForm = z.infer<typeof editProfileSchema>;

export default function EditProfileScreen() {
  const { user, updateProfile, refreshProfile, isLoading } = useAuthStore();
  const { pickImage, imageUri } = useImagePicker();

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
      await updateProfile(data);
      if (imageUri) {
        await uploadProfileImage(imageUri);
        await refreshProfile();
      }
      Alert.alert('Success', 'Profile updated!', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Profile Settings" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <Avatar
              uri={imageUri ?? user?.profileImageUrl ?? undefined}
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

          <TouchableOpacity style={styles.changePasswordBtn} onPress={() => router.push('/profile/change-password')}>
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
  saveBtn: { marginTop: 8, marginBottom: 16 },
  changePasswordBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  changePasswordText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
});
