import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { COLORS, APP_VERSION } from '@/lib/constants';

interface MenuItem {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ReactNode;
  onPress: () => void;
  danger?: boolean;
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const mainMenuItems: MenuItem[] = [
    {
      id: 'profile-settings',
      label: 'Profile Settings',
      sublabel: 'Edit profile and change password',
      icon: <Ionicons name="person-circle-outline" size={20} color={COLORS.primary} />,
      onPress: () => router.push('/profile/edit'),
    },
    ...(user?.role === 'STUDENT'
      ? [
          {
            id: 'visits',
            label: 'My Visit Requests',
            sublabel: 'Scheduled property visits',
            icon: <Ionicons name="eye-outline" size={20} color={COLORS.primary} />,
            onPress: () => router.push('/visits' as never),
          },
          {
            id: 'reservations',
            label: 'My Reservations',
            sublabel: 'Current and past bookings',
            icon: <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />,
            onPress: () => router.push('/reservations' as never),
          },
        ]
      : []),
    ...(user?.role === 'OWNER'
      ? [
          {
            id: 'visit-requests',
            label: 'Visit Requests',
            sublabel: 'Review incoming visit requests',
            icon: <Ionicons name="eye-outline" size={20} color={COLORS.primary} />,
            onPress: () => router.push('/my-listings/visits' as never),
          },
          {
            id: 'reservation-applications',
            label: 'Reservation Applications',
            sublabel: 'Review incoming reservation requests',
            icon: <Ionicons name="document-text-outline" size={20} color={COLORS.primary} />,
            onPress: () => router.push('/my-listings/reservations' as never),
          },
          {
            id: 'tenants',
            label: 'Active Tenants',
            sublabel: 'Manage current tenants',
            icon: <Ionicons name="people-outline" size={20} color={COLORS.primary} />,
            onPress: () => router.push('/my-listings/tenants' as never),
          },
          {
            id: 'payments',
            label: 'Tenant Payments',
            sublabel: 'Review, approve or reject payments',
            icon: <Ionicons name="cash-outline" size={20} color={COLORS.primary} />,
            onPress: () => router.push('/my-listings/payments' as never),
          },
          {
            id: 'payment-history',
            label: 'Payment History',
            sublabel: 'Confirmed payments & earnings summary',
            icon: <Ionicons name="time-outline" size={20} color={COLORS.primary} />,
            onPress: () => router.push('/my-listings/payment-history' as never),
          },
        ]
      : []),
    {
      id: 'saved',
      label: 'Saved Boardings',
      sublabel: 'Wishlist',
      icon: <Ionicons name="heart-outline" size={20} color="#EF4444" />,
      onPress: () => router.push('/saved'),
    },
  ];

  const secondaryItems: MenuItem[] = [
    {
      id: 'settings',
      label: 'Settings',
      sublabel: 'App preferences, notifications',
      icon: <Ionicons name="settings-outline" size={20} color={COLORS.gray} />,
      onPress: () => router.push('/settings'),
    },
    {
      id: 'logout',
      label: 'Log Out',
      sublabel: '',
      icon: <MaterialIcons name="logout" size={20} color={COLORS.red} />,
      onPress: handleLogout,
      danger: true,
    },
  ];

  const renderMenuItem = (item: MenuItem) => (
    <TouchableOpacity key={item.id} style={styles.menuItem} onPress={item.onPress} activeOpacity={0.7}>
      <View style={styles.menuIconContainer}>{item.icon}</View>
      <View style={styles.menuText}>
        <Text style={[styles.menuLabel, item.danger && styles.dangerText]}>{item.label}</Text>
        {item.sublabel ? <Text style={styles.menuSublabel}>{item.sublabel}</Text> : null}
      </View>
      {!item.danger && <Ionicons name="chevron-forward" size={18} color={COLORS.grayBorder} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.avatarSection}>
          <Avatar
            uri={user?.profileImageUrl ?? undefined}
            firstName={user?.firstName}
            lastName={user?.lastName}
            size={100}
          />
          <Text style={styles.userName}>
            {user?.firstName ?? 'User'} {user?.lastName ?? ''}
          </Text>
          <View style={styles.badgeRow}>
            <Badge label={user?.role === 'OWNER' ? 'Property Owner' : 'Student'} variant="primary" pill />
            {user?.username ? <Text style={styles.username}>@{user.username}</Text> : null}
          </View>
          {user?.phone ? <Text style={styles.metaText}>{user.phone}</Text> : null}
          {user?.university ? <Text style={styles.metaText}>{user.university}</Text> : null}
        </View>

        <View style={styles.menuCard}>{mainMenuItems.map(renderMenuItem)}</View>
        <View style={[styles.menuCard, styles.menuCardSecondary]}>{secondaryItems.map(renderMenuItem)}</View>

        <Text style={styles.version}>UniStay v{APP_VERSION}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayBorder,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: COLORS.text },
  placeholder: { width: 40 },
  avatarSection: { alignItems: 'center', paddingVertical: 24, gap: 6 },
  userName: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginTop: 8 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  username: { fontSize: 14, color: COLORS.textSecondary },
  metaText: { fontSize: 14, color: COLORS.textSecondary },
  menuCard: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  menuCardSecondary: {},
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  menuSublabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  dangerText: { color: COLORS.red },
  version: { textAlign: 'center', fontSize: 12, color: COLORS.textSecondary, marginBottom: 32 },
});
