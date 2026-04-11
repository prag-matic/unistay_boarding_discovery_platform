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
import { getMyReservations, getRentalPeriods, cancelReservation } from '@/lib/reservation';
import { COLORS } from '@/lib/constants';
import type { Reservation, RentalPeriod, ReservationStatus, RentalPeriodStatus } from '@/types/reservation.types';

const RES_STATUS_COLORS: Record<ReservationStatus, string> = {
  PENDING: '#FEF3C7',
  ACTIVE: '#D1FAE5',
  REJECTED: '#FEE2E2',
  COMPLETED: '#F3F4F6',
  CANCELLED: '#F3F4F6',
  EXPIRED: '#FEE2E2',
};

const RES_STATUS_TEXT_COLORS: Record<ReservationStatus, string> = {
  PENDING: COLORS.orange,
  ACTIVE: COLORS.green,
  REJECTED: COLORS.red,
  COMPLETED: COLORS.textSecondary,
  CANCELLED: COLORS.textSecondary,
  EXPIRED: COLORS.red,
};

const PERIOD_STATUS_COLORS: Record<RentalPeriodStatus, string> = {
  UPCOMING: '#EBF0FF',
  DUE: '#FEF3C7',
  PARTIALLY_PAID: '#FEF3C7',
  PAID: '#D1FAE5',
  OVERDUE: '#FEE2E2',
};

const PERIOD_STATUS_TEXT_COLORS: Record<RentalPeriodStatus, string> = {
  UPCOMING: COLORS.primary,
  DUE: COLORS.orange,
  PARTIALLY_PAID: COLORS.orange,
  PAID: COLORS.green,
  OVERDUE: COLORS.red,
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function RentalPeriodCard({ period }: { period: RentalPeriod }) {
  return (
    <View style={styles.periodCard}>
      <View style={styles.periodLeft}>
        <Text style={styles.periodLabel}>{period.periodLabel}</Text>
        <Text style={styles.periodDue}>Due: {formatDate(period.dueDate)}</Text>
        {period.payments.length > 0 && (
          <Text style={styles.periodPaid}>
            {period.payments.filter((p) => p.status === 'CONFIRMED').length} payment(s) confirmed
          </Text>
        )}
      </View>
      <View style={styles.periodRight}>
        <Text style={styles.periodAmount}>LKR {(period.amountDue ?? 0).toLocaleString()}</Text>
        <View style={[styles.periodStatusBadge, { backgroundColor: PERIOD_STATUS_COLORS[period.status] }]}>
          <Text style={[styles.periodStatusText, { color: PERIOD_STATUS_TEXT_COLORS[period.status] }]}>
            {period.status.replace('_', ' ')}
          </Text>
        </View>
      </View>
    </View>
  );
}

function ReservationCard({
  item,
  onCancelled,
}: {
  item: Reservation;
  onCancelled: (updated: Reservation) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [rentalPeriods, setRentalPeriods] = useState<RentalPeriod[]>(item.rentalPeriods ?? []);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleExpand = async () => {
    if (!expanded && rentalPeriods.length === 0 && item.status === 'ACTIVE') {
      setLoadingPeriods(true);
      try {
        const result = await getRentalPeriods(item.id);
        setRentalPeriods(result.data.rentalPeriods);
      } catch {
        Alert.alert('Error', 'Failed to load rental periods.');
      } finally {
        setLoadingPeriods(false);
      }
    }
    setExpanded((v) => !v);
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Reservation',
      item.status === 'ACTIVE'
        ? 'Cancelling an ACTIVE reservation will also decrement the occupancy count. Are you sure?'
        : 'Are you sure you want to cancel this reservation?',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Reservation',
          style: 'destructive',
          onPress: async () => {
            setCancelling(true);
            try {
              const result = await cancelReservation(item.id);
              onCancelled(result.data.reservation);
            } catch (err: unknown) {
              const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'Failed to cancel reservation.';
              Alert.alert('Error', message);
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.boarding.title}</Text>
          <Text style={styles.cardAddress} numberOfLines={1}>
            <Ionicons name="location-outline" size={12} color={COLORS.gray} />{' '}
            {[item.boarding.address, item.boarding.city].filter(Boolean).join(', ')}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: RES_STATUS_COLORS[item.status] }]}>
          <Text style={[styles.statusText, { color: RES_STATUS_TEXT_COLORS[item.status] }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={15} color={COLORS.primary} />
          <Text style={styles.infoText}>Move-in Date: {formatDate(item.moveInDate)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="cash-outline" size={15} color={COLORS.primary} />
          <Text style={styles.infoText}>
            {item.rentSnapshot
              ? `LKR ${item.rentSnapshot.toLocaleString()} / month`
              : '—'}
          </Text>
        </View>
        {item.specialRequests ? (
          <View style={styles.infoRow}>
            <Ionicons name="document-text-outline" size={15} color={COLORS.primary} />
            <Text style={styles.infoText} numberOfLines={2}>{item.specialRequests}</Text>
          </View>
        ) : null}
        {item.status === 'PENDING' && item.expiresAt && (
          <View style={styles.expiryRow}>
            <Ionicons name="time-outline" size={15} color={COLORS.orange} />
            <Text style={styles.expiryText}>
              Expires: {formatDate(item.expiresAt)}
            </Text>
          </View>
        )}
        {(item.status === 'REJECTED' || item.status === 'CANCELLED') && item.rejectionReason && (
          <View style={styles.rejectionCard}>
            <Text style={styles.rejectionLabel}>
              {item.status === 'REJECTED' ? 'Rejection Reason:' : 'Cancellation Reason:'}
            </Text>
            <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
          </View>
        )}
      </View>

      {/* Cancel button (PENDING or ACTIVE) */}
      {(item.status === 'PENDING' || item.status === 'ACTIVE') && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleCancel}
          disabled={cancelling}
        >
          {cancelling ? (
            <ActivityIndicator size="small" color={COLORS.red} />
          ) : (
            <Text style={styles.cancelBtnText}>Cancel Reservation</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Rental periods (only for ACTIVE) */}
      {item.status === 'ACTIVE' && (
        <>
          <TouchableOpacity style={styles.expandBtn} onPress={handleExpand}>
            <Text style={styles.expandBtnText}>
              {expanded ? 'Hide' : 'Show'} Rental Periods
            </Text>
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={COLORS.primary}
            />
          </TouchableOpacity>
          {expanded && (
            <View style={styles.periodsContainer}>
              {loadingPeriods ? (
                <ActivityIndicator color={COLORS.primary} style={{ padding: 16 }} />
              ) : rentalPeriods.length === 0 ? (
                <Text style={styles.noPeriodsText}>No rental periods found.</Text>
              ) : (
                rentalPeriods.map((p) => <RentalPeriodCard key={p.id} period={p} />)
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

export default function MyReservationsScreen() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadReservations = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getMyReservations();
      setReservations(result.data.reservations);
    } catch {
      Alert.alert('Error', 'Failed to load reservations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadReservations(); }, [loadReservations]));

  const handleCancelled = (updated: Reservation) => {
    setReservations((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reservations</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ReservationCard item={item} onCancelled={handleCancelled} />
          )}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="home-outline" size={64} color={COLORS.grayBorder} />
              <Text style={styles.emptyTitle}>No reservations yet</Text>
              <Text style={styles.emptySub}>
                Find a boarding and apply for a reservation to get started
              </Text>
              <TouchableOpacity
                style={styles.browseBtn}
                onPress={() => router.push('/(tabs)/search' as never)}
              >
                <Text style={styles.browseBtnText}>Browse Boardings</Text>
              </TouchableOpacity>
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  cardAddress: { fontSize: 12, color: COLORS.textSecondary },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  divider: { height: 1, backgroundColor: COLORS.grayLight },

  cardBody: { padding: 14, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },

  expiryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  expiryText: { fontSize: 12, color: COLORS.orange, fontWeight: '600' },

  rejectionCard: {
    backgroundColor: '#FFF1F0',
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  rejectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.red, marginBottom: 2 },
  rejectionText: { fontSize: 13, color: COLORS.text },

  cancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
  },
  cancelBtnText: { fontSize: 13, color: COLORS.red, fontWeight: '600' },

  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
  },
  expandBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  periodsContainer: { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  noPeriodsText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', padding: 16 },

  periodCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
  },
  periodLeft: { gap: 2, flex: 1 },
  periodLabel: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  periodDue: { fontSize: 12, color: COLORS.textSecondary },
  periodPaid: { fontSize: 12, color: COLORS.green },
  periodRight: { alignItems: 'flex-end', gap: 4 },
  periodAmount: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  periodStatusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  periodStatusText: { fontSize: 11, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  browseBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  browseBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
});

