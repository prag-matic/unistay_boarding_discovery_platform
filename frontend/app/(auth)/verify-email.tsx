import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { storage } from '@/lib/storage';
import { Button } from '@/components/ui/Button';
import { COLORS } from '@/lib/constants';
import { formatCountdown, getErrorMessage } from '@/utils/helpers';

export default function VerifyEmailScreen() {
  const { email, token } = useLocalSearchParams<{ email?: string; token?: string }>();
  const user = useAuthStore((state) => state.user);
  const [countdown, setCountdown] = useState(59);
  const [canResend, setCanResend] = useState(false);
  const [isVerifyingToken, setIsVerifyingToken] = useState(false);
  const [tokenVerificationState, setTokenVerificationState] = useState<
    'idle' | 'success' | 'error'
  >('idle');
  const [tokenMessage, setTokenMessage] = useState('');

  useEffect(() => {
    if (!token) return;

    const verifyToken = async () => {
      setIsVerifyingToken(true);
      setTokenVerificationState('idle');
      setTokenMessage('');
      try {
        const response = await api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
        setTokenVerificationState('success');
        setTokenMessage(response.data?.message ?? 'Email verified successfully.');

        if (user) {
          const updatedUser = { ...user, isVerified: true };
          useAuthStore.setState({ user: updatedUser });
          await storage.setUser(updatedUser);
        }
      } catch (err) {
        setTokenVerificationState('error');
        setTokenMessage(getErrorMessage(err));
      } finally {
        setIsVerifyingToken(false);
      }
    };

    void verifyToken();
  }, [token, user]);

  useEffect(() => {
    if (token) return;
    if (countdown <= 0) {
      setCanResend(true);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleOpenEmail = () => {
    Linking.openURL('mailto:').catch(() =>
      Alert.alert('Error', 'Could not open email app')
    );
  };

  const handleResend = async () => {
    try {
      await api.post('/auth/resend-verification', { email });
      setCountdown(59);
      setCanResend(false);
      Alert.alert('Sent', 'Verification email resent!');
    } catch (err) {
      Alert.alert('Error', getErrorMessage(err));
    }
  };

  const renderTokenFlow = () => {
    if (isVerifyingToken) {
      return (
        <>
          <Text style={styles.heading}>Verifying your email</Text>
          <Text style={styles.description}>Please wait while we verify your token.</Text>
          <View style={styles.illustration}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        </>
      );
    }

    const success = tokenVerificationState === 'success';

    return (
      <>
        <Text style={styles.heading}>{success ? 'Email Verified' : 'Verification Failed'}</Text>
        <Text style={styles.description}>{tokenMessage}</Text>

        <View style={styles.illustration}>
          <Ionicons
            name={success ? 'checkmark-circle' : 'close-circle'}
            size={80}
            color={success ? COLORS.green : COLORS.red}
          />
        </View>

        <Button
          title={success ? 'Continue to Login' : 'Go to Login'}
          onPress={() =>
            success
              ? router.replace({ pathname: '/(auth)/login', params: { verified: '1' } })
              : router.replace('/(auth)/login')
          }
          style={styles.openBtn}
        />
      </>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <View style={styles.logo}>
          <Text style={styles.logoIcon}>🎓</Text>
        </View>
      </View>

      {token ? (
        renderTokenFlow()
      ) : (
        <>
          <Text style={styles.heading}>Verify Your Email</Text>
          <Text style={styles.description}>
            We sent a verification link to{' '}
            <Text style={styles.email}>{email || 'your email'}</Text>
          </Text>

          {/* Illustration */}
          <View style={styles.illustration}>
            <Ionicons name="mail" size={80} color={COLORS.primary} />
          </View>

          <Button
            title="Open Email App"
            onPress={handleOpenEmail}
            variant="outline"
            style={styles.openBtn}
          />

          <View style={styles.resendRow}>
            {canResend ? (
              <TouchableOpacity onPress={handleResend}>
                <Text style={styles.resendLink}>Resend verification email</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.countdownText}>
                Resend code in {formatCountdown(countdown)}
              </Text>
            )}
          </View>

          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  content: { padding: 24, alignItems: 'center', paddingTop: 60 },
  logoContainer: { marginBottom: 24 },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: { fontSize: 30 },
  heading: { fontSize: 26, fontWeight: '700', color: COLORS.text, marginBottom: 12, textAlign: 'center' },
  description: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  email: { fontWeight: '700', color: COLORS.text },
  illustration: {
    marginVertical: 40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#EBF0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openBtn: { width: '100%' },
  resendRow: { marginTop: 24 },
  countdownText: { fontSize: 14, color: COLORS.textSecondary },
  resendLink: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  skipBtn: { marginTop: 24 },
  skipText: { fontSize: 14, color: COLORS.textSecondary },
});
