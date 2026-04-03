import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Header } from '@/components/layout/Header';
import { Toggle } from '@/components/ui/Toggle';
import { Card } from '@/components/ui/Card';
import { COLORS, APP_VERSION } from '@/lib/constants';

export default function SettingsScreen() {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);

  const handleClearCache = async () => {
    Alert.alert('Clear Cache', 'This will clear cached data. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter((k) => k.startsWith('cache_'));
            await AsyncStorage.multiRemove(cacheKeys);
            Alert.alert('Done', 'Cache cleared successfully.');
          } catch {
            Alert.alert('Error', 'Could not clear cache.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Settings" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notifications */}
        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <Card style={styles.card}>
          <Toggle
            label="Push Notifications"
            value={pushNotifications}
            onValueChange={setPushNotifications}
          />
          <View style={styles.divider} />
          <Toggle
            label="Email Notifications"
            value={emailNotifications}
            onValueChange={setEmailNotifications}
          />
          <View style={styles.divider} />
          <Toggle
            label="Dark Mode"
            value={false}
            onValueChange={() => {}}
            disabled
          />
          <Text style={styles.comingSoon}>Coming soon</Text>
        </Card>

        {/* App Info */}
        <Text style={styles.sectionLabel}>APP INFO</Text>
        <Card style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>{APP_VERSION}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Build</Text>
            <Text style={styles.infoValue}>240</Text>
          </View>
        </Card>

        {/* Cache */}
        <Text style={styles.sectionLabel}>STORAGE</Text>
        <Card style={styles.card}>
          <TouchableOpacity style={styles.clearRow} onPress={handleClearCache}>
            <Text style={styles.clearText}>Clear Cache</Text>
          </TouchableOpacity>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 16,
    marginLeft: 4,
  },
  card: { marginBottom: 0 },
  divider: { height: 1, backgroundColor: COLORS.grayLight, marginVertical: 2 },
  comingSoon: { fontSize: 11, color: COLORS.textSecondary, marginLeft: 4, marginBottom: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  infoLabel: { fontSize: 14, color: COLORS.text },
  infoValue: { fontSize: 14, color: COLORS.textSecondary },
  clearRow: { paddingVertical: 12 },
  clearText: { fontSize: 14, color: COLORS.red, fontWeight: '600' },
});
