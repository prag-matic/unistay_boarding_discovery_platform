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
import { getBoardingPayments } from '@/lib/payment';
import { COLORS } from '@/lib/constants';
import type { DetailedPayment } from '@/types/payment.types';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  ONLINE: 'Online',
};

// ─── Per-tenant group ────────────────────────────────────────────────────────
interface TenantGroup {
  studentId: string;
  studentName: string;
  studentEmail: string;
  boardingTitle: string;
  payments: DetailedPayment[];
  totalPaid: number;
}

function buildGroups(payments: DetailedPayment[]): TenantGroup[] {
  const map = new Map<string, TenantGroup>();
  for (const p of payments) {
    const key = p.studentId;
    if (!map.has(key)) {
      map.set(key, {
        studentId: key,
        studentName: (p.student ?? p.reservation?.student)
          ? `${(p.student ?? p.reservation!.student)!.firstName} ${(p.student ?? p.reservation!.student)!.lastName}`
          : 'Unknown Tenant',
        studentEmail: p.student?.email ?? p.reservation?.student?.email ?? '',
        boardingTitle: p.reservation?.boarding?.title ?? '—',
        payments: [],
        totalPaid: 0,
      });
    }
    const group = map.get(key)!;
    group.payments.push(p);
    group.totalPaid += Number(p.amount);
  }
  // Sort each group's payments newest-first
  for (const g of map.values()) {
    g.payments.sort(
      (a, b) =>
        new Date(b.confirmedAt ?? b.createdAt).getTime() -
        new Date(a.confirmedAt ?? a.createdAt).getTime(),
    );
  }
  return Array.from(map.values()).sort((a, b) => b.totalPaid - a.totalPaid);
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function PaymentHistoryScreen() {
  const [allPayments, setAllPayments] = useState<DetailedPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getBoardingPayments();
      setAllPayments(res.data.payments);
    } catch {
      Alert.alert('Error', 'Failed to load payment history. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const confirmed = allPayments.filter((p) => p.status === 'CONFIRMED');
  const pending = allPayments.filter((p) => p.status === 'PENDING');
  const rejected = allPayments.filter((p) => p.status === 'REJECTED');
  const totalCollected = confirmed.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalPending = pending.reduce((sum, p) => sum + Number(p.amount), 0);

  const groups = buildGroups(confirmed);

  const handlePaymentPress = (payment: DetailedPayment) => {
    router.push({
      pathname: '/my-listings/payment-detail',
      params: { data: JSON.stringify(payment) },
    } as never);
  };

  const renderPaymentRow = (payment: DetailedPayment) => (
    <TouchableOpacity
      key={payment.id}
      style={styles.paymentRow}
      onPress={() => handlePaymentPress(payment)}
      activeOpacity={0.7}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rowPeriod}>{payment.rentalPeriod?.periodLabel ?? '—'}</Text>
        <Text style={styles.rowMethod}>
          {METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}
          {payment.referenceNumber ? `  ·  Ref: ${payment.referenceNumber}` : ''}
        </Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <Text style={styles.rowAmount}>LKR {Number(payment.amount).toLocaleString()}</Text>
        <Text style={styles.rowDate}>{formatDate(payment.confirmedAt ?? payment.paidAt)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.grayBorder} style={{ marginLeft: 4 }} />
    </TouchableOpacity>
  );

  const renderGroup = ({ item }: { item: TenantGroup }) => {
    const isExpanded = expandedTenant === item.studentId;
    return (
      <View style={styles.groupCard}>
        {/* Group header */}
        <TouchableOpacity
          style={styles.groupHeader}
          onPress={() => setExpandedTenant(isExpanded ? null : item.studentId)}
          activeOpacity={0.7}
        >
          <View style={styles.groupAvatar}>
            <Text style={styles.groupAvatarText}>
              {item.studentName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.groupName}>{item.studentName}</Text>
            {item.studentEmail ? (
              <Text style={styles.groupEmail}>{item.studentEmail}</Text>
            ) : null}
            <Text style={styles.groupBoarding} numberOfLines={1}>{item.boardingTitle}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4, marginLeft: 8 }}>
            <Text style={styles.groupTotal}>LKR {item.totalPaid.toLocaleString()}</Text>
            <Text style={styles.groupCount}>{item.payments.length} payment{item.payments.length !== 1 ? 's' : ''}</Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={COLORS.gray}
            />
          </View>
        </TouchableOpacity>

        {/* Expanded payment rows */}
        {isExpanded && (
          <View style={styles.groupPayments}>
            <View style={styles.divider} />
            {item.payments.map(renderPaymentRow)}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment History</Text>
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
          data={groups}
          keyExtractor={(item) => item.studentId}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {/* Summary stats */}
              <View style={styles.statsRow}>
                <View style={[styles.statCard, styles.statCardGreen]}>
                  <Ionicons name="checkmark-circle-outline" size={22} color={COLORS.green} />
                  <Text style={styles.statAmount}>LKR {totalCollected.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Total Collected</Text>
                  <Text style={styles.statCount}>{confirmed.length} payments</Text>
                </View>
                <View style={[styles.statCard, styles.statCardOrange]}>
                  <Ionicons name="time-outline" size={22} color={COLORS.orange} />
                  <Text style={styles.statAmount}>LKR {totalPending.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Pending Review</Text>
                  <Text style={styles.statCount}>{pending.length} payments</Text>
                </View>
              </View>
              {rejected.length > 0 && (
                <View style={styles.rejectedBar}>
                  <Ionicons name="close-circle-outline" size={16} color={COLORS.red} />
                  <Text style={styles.rejectedBarText}>
                    {rejected.length} payment{rejected.length !== 1 ? 's' : ''} rejected this period
                  </Text>
                </View>
              )}
              {groups.length > 0 && (
                <Text style={styles.sectionHeading}>Confirmed Payments by Tenant</Text>
              )}
            </>
          }
          renderItem={renderGroup}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={64} color={COLORS.grayBorder} />
              <Text style={styles.emptyTitle}>No confirmed payments yet</Text>
              <Text style={styles.emptySub}>
                Confirmed tenant payments will be grouped by tenant here.
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

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    gap: 4,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  statCardGreen: { backgroundColor: '#F0FDF4' },
  statCardOrange: { backgroundColor: '#FFF7ED' },
  statAmount: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginTop: 2 },
  statLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  statCount: { fontSize: 11, color: COLORS.textSecondary },

  rejectedBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF1F0',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 4,
  },
  rejectedBarText: { fontSize: 13, color: COLORS.red, fontWeight: '500' },

  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    marginTop: 4,
  },

  groupCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  groupAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupAvatarText: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  groupName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  groupEmail: { fontSize: 12, color: COLORS.textSecondary },
  groupBoarding: { fontSize: 12, color: COLORS.primary, fontWeight: '500' },
  groupTotal: { fontSize: 14, fontWeight: '800', color: COLORS.green },
  groupCount: { fontSize: 11, color: COLORS.textSecondary },

  groupPayments: { paddingHorizontal: 14, paddingBottom: 12, gap: 0 },
  divider: { height: 1, backgroundColor: COLORS.grayLight, marginBottom: 8 },

  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
    gap: 8,
  },
  rowPeriod: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  rowMethod: { fontSize: 11, color: COLORS.textSecondary },
  rowAmount: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  rowDate: { fontSize: 11, color: COLORS.textSecondary },

  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
});
