import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getReceivedReservations, completeReservation } from '@/lib/reservation';
import { COLORS } from '@/lib/constants';
import type { Reservation } from '@/types/reservation.types';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

export default function ManageTenantsScreen() {
  const [tenants, setTenants] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActing, setIsActing] = useState(false);

  const loadTenants = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getReceivedReservations();
      // Only show ACTIVE reservations in the tenants view
      setTenants(result.data.reservations.filter((r) => r.status === 'ACTIVE'));
    } catch {
      Alert.alert('Error', 'Failed to load tenants. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadTenants(); }, [loadTenants]));

  const handleComplete = (reservation: Reservation) => {
    if (!reservation.student) return;
    Alert.alert(
      'Mark as Completed',
      `Mark ${reservation.student.firstName} ${reservation.student.lastName}'s stay at "${reservation.boarding.title}" as completed? This will free up an occupancy spot.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          style: 'destructive',
          onPress: async () => {
            setIsActing(true);
            try {
              const result = await completeReservation(reservation.id);
              setTenants((prev) =>
                prev.filter((t) => t.id !== result.data.reservation.id),
              );
            } catch (err: unknown) {
              const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'Failed to complete reservation.';
              Alert.alert('Error', message);
            } finally {
              setIsActing(false);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: Reservation }) => (
    <View style={styles.card}>
      {/* Tenant Info */}
      {item.student && (
        <View style={styles.tenantHeader}>
          <View style={styles.tenantAvatar}>
            <Text style={styles.tenantAvatarText}>
              {item.student.firstName.charAt(0)}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tenantName}>
              {item.student.firstName} {item.student.lastName}
            </Text>
            <Text style={styles.tenantEmail}>{item.student.email}</Text>
            {item.student.phone && (
              <Text style={styles.tenantPhone}>{item.student.phone}</Text>
            )}
            {item.student.university && (
              <Text style={styles.tenantUniversity}>{item.student.university}</Text>
            )}
          </View>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>ACTIVE</Text>
          </View>
        </View>
      )}

      <View style={styles.divider} />

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="home-outline" size={15} color={COLORS.primary} />
          <Text style={styles.infoText} numberOfLines={1}>{item.boarding.title}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={15} color={COLORS.primary} />
          <Text style={styles.infoText}>Move-in: {formatDate(item.moveInDate)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={15} color={COLORS.primary} />
          <Text style={styles.infoText}>
            {item.rentSnapshot
              ? `LKR ${item.rentSnapshot.toLocaleString()} / month`
              : '—'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.completeBtn, isActing && { opacity: 0.6 }]}
        onPress={() => handleComplete(item)}
        disabled={isActing}
      >
        <Ionicons name="checkmark-done-outline" size={16} color={COLORS.white} />
        <Text style={styles.completeBtnText}>Mark as Completed (Move Out)</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Active Tenants</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={tenants}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            tenants.length > 0 ? (
              <View style={styles.countCard}>
                <Ionicons name="people-outline" size={20} color={COLORS.primary} />
                <Text style={styles.countText}>
                  {tenants.length} active tenant{tenants.length !== 1 ? 's' : ''}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color={COLORS.grayBorder} />
              <Text style={styles.emptyTitle}>No active tenants</Text>
              <Text style={styles.emptySub}>
                Approved reservations will appear here as active tenants
              </Text>
            </View>
          }
        />
      )}
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
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 12, paddingBottom: 40 },

  countCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EBF0FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 4,
  },
  countText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  tenantHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  tenantAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tenantAvatarText: { color: COLORS.white, fontWeight: '700', fontSize: 18 },
  tenantName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  tenantEmail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  tenantPhone: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  tenantUniversity: { fontSize: 11, color: COLORS.primary, marginTop: 2 },
  activeBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.green },

  divider: { height: 1, backgroundColor: COLORS.grayLight },

  cardBody: { padding: 14, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },

  completeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.orange,
  },
  completeBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.white },

  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
});
