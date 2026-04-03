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
import { getMyPayments } from '@/lib/payment';
import { COLORS } from '@/lib/constants';
import type { DetailedPayment } from '@/types/payment.types';
import type { PaymentStatus } from '@/types/reservation.types';

// ─── Status config ───────────────────────────────────────────────────────────────
const STATUS_BG: Record<PaymentStatus, string> = {
  PENDING: '#FEF3C7',
  CONFIRMED: '#D1FAE5',
  REJECTED: '#FEE2E2',
};

const STATUS_COLOR: Record<PaymentStatus, string> = {
  PENDING: COLORS.orange,
  CONFIRMED: COLORS.green,
  REJECTED: COLORS.red,
};

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  ONLINE: 'Online',
};

// ─── Helpers ────────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

// ─── Screen ─────────────────────────────────────────────────────────────────────
export default function MyPaymentsScreen() {
  const [payments, setPayments] = useState<DetailedPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getMyPayments();
      setPayments(res.data.payments);
    } catch {
      Alert.alert('Error', 'Failed to load payment history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = ({ item }: { item: DetailedPayment }) => {
    const isExpanded = expandedId === item.id;
    const showRejection = item.status === 'REJECTED' && item.rejectionReason;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={showRejection ? 0.8 : 1}
        onPress={() => {
          if (showRejection) {
            setExpandedId(isExpanded ? null : item.id);
          }
        }}
      >
        <View style={styles.cardHeader}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.periodLabel}>
              {item.rentalPeriod?.periodLabel ?? '—'}
            </Text>
            {item.reservation?.boarding?.title && (
              <Text style={styles.boardingName} numberOfLines={1}>
                {item.reservation.boarding.title}
              </Text>
            )}
            <Text style={styles.dateText}>{formatDate(item.paidAt ?? item.createdAt)}</Text>
          </View>
          <View style={styles.rightCol}>
            <Text style={styles.amount}>
              LKR {Number(item.amount).toLocaleString()}
            </Text>
            <Text style={styles.method}>{METHOD_LABELS[item.paymentMethod] ?? item.paymentMethod}</Text>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_BG[item.status] }]}>
              <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
                {item.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Reference number */}
        {item.referenceNumber && (
          <View style={styles.refRow}>
            <Ionicons name="receipt-outline" size={13} color={COLORS.gray} />
            <Text style={styles.refText}>Ref: {item.referenceNumber}</Text>
          </View>
        )}

        {/* Rejection reason (expandable) */}
        {item.status === 'REJECTED' && (
          <View style={styles.rejectionHint}>
            <Ionicons name="information-circle-outline" size={14} color={COLORS.red} />
            <Text style={styles.rejectionHintText}>
              {isExpanded ? 'Tap to collapse' : 'Tap to see rejection reason'}
            </Text>
          </View>
        )}
        {isExpanded && item.rejectionReason && (
          <View style={styles.rejectionCard}>
            <Text style={styles.rejectionLabel}>Rejection Reason</Text>
            <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Payments</Text>
        <TouchableOpacity style={styles.backBtn} onPress={load}>
          <Ionicons name="refresh-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="cash-outline" size={64} color={COLORS.grayBorder} />
              <Text style={styles.emptyTitle}>No payments yet</Text>
              <Text style={styles.emptySub}>
                Payments you log against your rental periods will appear here.
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

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  periodLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  boardingName: { fontSize: 12, color: COLORS.textSecondary },
  dateText: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  rightCol: { alignItems: 'flex-end', gap: 4 },
  amount: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  method: { fontSize: 11, color: COLORS.textSecondary },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  refRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  refText: { fontSize: 12, color: COLORS.textSecondary },

  rejectionHint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rejectionHintText: { fontSize: 12, color: COLORS.red },
  rejectionCard: {
    backgroundColor: '#FFF1F0',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  rejectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.red, marginBottom: 2 },
  rejectionText: { fontSize: 13, color: COLORS.text, lineHeight: 20 },

  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
});
