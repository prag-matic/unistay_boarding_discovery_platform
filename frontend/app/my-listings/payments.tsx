import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Image,
  Linking,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getBoardingPayments, confirmPayment, rejectPayment } from '@/lib/payment';
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

const FILTER_OPTIONS: { label: string; value: PaymentStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Rejected', value: 'REJECTED' },
];

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
export default function OwnerPaymentsDashboard() {
  const [payments, setPayments] = useState<DetailedPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<PaymentStatus | 'ALL'>('ALL');
  const [isActing, setIsActing] = useState(false);

  // Reject modal
  const [rejectModalId, setRejectModalId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Proof modal
  const [proofPayment, setProofPayment] = useState<DetailedPayment | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getBoardingPayments();
      setPayments(res.data.payments);
    } catch {
      Alert.alert('Error', 'Failed to load payments. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const filtered =
    activeFilter === 'ALL'
      ? payments
      : payments.filter((p) => p.status === activeFilter);

  const handleConfirm = (id: string) => {
    Alert.alert(
      'Confirm Payment',
      'Mark this payment as confirmed? The rental period status will update automatically.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setIsActing(true);
            try {
              const res = await confirmPayment(id);
              setPayments((prev) => prev.map((p) => (p.id === id ? res.data.payment : p)));
            } catch (err: unknown) {
              const msg =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'Failed to confirm payment.';
              Alert.alert('Error', msg);
            } finally {
              setIsActing(false);
            }
          },
        },
      ],
    );
  };

  const openRejectModal = (id: string) => {
    setRejectionReason('');
    setRejectModalId(id);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Required', 'Please provide a rejection reason.');
      return;
    }
    if (!rejectModalId) return;
    setIsActing(true);
    try {
      const res = await rejectPayment(rejectModalId, { reason: rejectionReason.trim() });
      setPayments((prev) => prev.map((p) => (p.id === rejectModalId ? res.data.payment : p)));
      setRejectModalId(null);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to reject payment.';
      Alert.alert('Error', msg);
    } finally {
      setIsActing(false);
    }
  };

  const handleCardPress = (item: DetailedPayment) => {
    router.push({
      pathname: '/my-listings/payment-detail',
      params: { data: JSON.stringify(item) },
    } as never);
  };

  const renderItem = ({ item }: { item: DetailedPayment }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleCardPress(item)}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeader}>
        <View style={{ flex: 1, gap: 2 }}>
          {/* Tenant name */}
          {(item.student ?? item.reservation?.student) && (
            <Text style={styles.tenantName}>
              {(item.student ?? item.reservation!.student)!.firstName}{' '}
              {(item.student ?? item.reservation!.student)!.lastName}
            </Text>
          )}
          {(item.student?.email ?? item.reservation?.student?.email) ? (
            <Text style={styles.tenantEmail}>
              {item.student?.email ?? item.reservation!.student!.email}
            </Text>
          ) : null}
          {item.reservation?.boarding?.title && (
            <Text style={styles.boardingName} numberOfLines={1}>
              {item.reservation.boarding.title}
            </Text>
          )}
          <Text style={styles.periodLabel}>
            {item.rentalPeriod?.periodLabel ?? '—'}
            {item.rentalPeriod?.dueDate ? `  ·  Due ${formatDate(item.rentalPeriod.dueDate)}` : ''}
          </Text>
        </View>
        <View style={styles.rightCol}>
          <Text style={styles.amount}>
            LKR {Number(item.amount).toLocaleString()}
          </Text>
          <Text style={styles.method}>{METHOD_LABELS[item.paymentMethod] ?? item.paymentMethod}</Text>
          <Text style={styles.dateText}>{formatDate(item.paidAt ?? item.createdAt)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_BG[item.status] }]}>
            <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
              {item.status}
            </Text>
          </View>
        </View>
      </View>

      {/* Ref number */}
      {item.referenceNumber && (
        <View style={styles.refRow}>
          <Ionicons name="receipt-outline" size={13} color={COLORS.gray} />
          <Text style={styles.refText}>Ref: {item.referenceNumber}</Text>
        </View>
      )}

      {/* Confirmation info */}
      {item.status === 'CONFIRMED' && item.confirmedAt && (
        <View style={styles.refRow}>
          <Ionicons name="checkmark-circle-outline" size={13} color={COLORS.green} />
          <Text style={[styles.refText, { color: COLORS.green }]}>
            Confirmed {formatDate(item.confirmedAt)}
          </Text>
        </View>
      )}

      {/* Rejection reason (shown on rejected items) */}
      {item.status === 'REJECTED' && item.rejectionReason && (
        <View style={styles.rejectionCard}>
          <Text style={styles.rejectionLabel}>Your Reason:</Text>
          <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
        </View>
      )}

      {/* Action row (PENDING only) */}
      {item.status === 'PENDING' && (
        <View style={styles.actionRow}>
          {item.proofImageUrl && (
            <TouchableOpacity
              style={styles.proofBtn}
              onPress={(e) => { e.stopPropagation?.(); setProofPayment(item); }}
            >
              <Ionicons name="image-outline" size={15} color={COLORS.primary} />
              <Text style={styles.proofBtnText}>View Proof</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={(e) => { e.stopPropagation?.(); openRejectModal(item.id); }}
            disabled={isActing}
          >
            <Ionicons name="close-outline" size={15} color={COLORS.red} />
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={(e) => { e.stopPropagation?.(); handleConfirm(item.id); }}
            disabled={isActing}
          >
            <Ionicons name="checkmark-outline" size={15} color={COLORS.white} />
            <Text style={styles.confirmBtnText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tenant Payments</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => router.push('/my-listings/payment-history' as never)}
          >
            <Ionicons name="time-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={load}>
            <Ionicons name="refresh-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterTab, activeFilter === f.value && styles.filterTabActive]}
            onPress={() => setActiveFilter(f.value)}
          >
            <Text
              style={[styles.filterTabText, activeFilter === f.value && styles.filterTabTextActive]}
            >
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="cash-outline" size={64} color={COLORS.grayBorder} />
              <Text style={styles.emptyTitle}>
                {activeFilter === 'ALL' ? 'No payments yet' : `No ${activeFilter.toLowerCase()} payments`}
              </Text>
              <Text style={styles.emptySub}>
                Tenant payment submissions for your properties will appear here.
              </Text>
            </View>
          }
        />
      )}

      {/* ── Reject Modal ── */}
      <Modal
        visible={!!rejectModalId}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModalId(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Payment</Text>
              <TouchableOpacity onPress={() => setRejectModalId(null)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Please provide a reason for rejecting this payment.
            </Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="e.g. Transfer slip is illegible"
              placeholderTextColor={COLORS.gray}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectModalId(null)}
                disabled={isActing}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalRejectBtn, isActing && { opacity: 0.6 }]}
                onPress={handleReject}
                disabled={isActing}
              >
                {isActing ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.modalRejectText}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Proof Modal ── */}
      <Modal
        visible={!!proofPayment}
        transparent
        animationType="fade"
        onRequestClose={() => setProofPayment(null)}
      >
        <View style={styles.proofOverlay}>
          <View style={styles.proofModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Proof</Text>
              <TouchableOpacity onPress={() => setProofPayment(null)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            {proofPayment?.referenceNumber && (
              <Text style={styles.proofRef}>Ref: {proofPayment.referenceNumber}</Text>
            )}
            {proofPayment?.proofImageUrl ? (
              <>
                <Image
                  source={{ uri: proofPayment.proofImageUrl }}
                  style={styles.proofImage}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={styles.openUrlBtn}
                  onPress={() => proofPayment.proofImageUrl && Linking.openURL(proofPayment.proofImageUrl)}
                >
                  <Ionicons name="open-outline" size={15} color={COLORS.primary} />
                  <Text style={styles.openUrlText}>Open full image</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.noProofText}>No proof image attached.</Text>
            )}
          </View>
        </View>
      </Modal>
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
  headerRight: { flexDirection: 'row', gap: 4 },
  headerIconBtn: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },

  filterRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayBorder,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: COLORS.grayLight,
  },
  filterTabActive: { backgroundColor: COLORS.primary },
  filterTabText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  filterTabTextActive: { color: COLORS.white },

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
  tenantName: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  tenantEmail: { fontSize: 11, color: COLORS.textSecondary },
  boardingName: { fontSize: 12, color: COLORS.textSecondary },
  periodLabel: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  rightCol: { alignItems: 'flex-end', gap: 3 },
  amount: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  method: { fontSize: 11, color: COLORS.textSecondary },
  dateText: { fontSize: 11, color: COLORS.textSecondary },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  statusText: { fontSize: 11, fontWeight: '700' },

  refRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  refText: { fontSize: 12, color: COLORS.textSecondary },

  rejectionCard: {
    backgroundColor: '#FFF1F0',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  rejectionLabel: { fontSize: 11, fontWeight: '700', color: COLORS.red, marginBottom: 2 },
  rejectionText: { fontSize: 13, color: COLORS.text },

  actionRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
    paddingTop: 10,
  },
  proofBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  proofBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.red,
  },
  rejectBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.red },
  confirmBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.green,
  },
  confirmBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.white },

  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },

  // Reject modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  modalSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 14, lineHeight: 20 },
  reasonInput: {
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 100,
    marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.grayBorder,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  modalRejectBtn: {
    flex: 1,
    backgroundColor: COLORS.red,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalRejectText: { fontSize: 14, fontWeight: '700', color: COLORS.white },

  // Proof modal
  proofOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  proofModal: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  proofRef: { fontSize: 13, color: COLORS.textSecondary },
  proofImage: { width: '100%', height: 280, borderRadius: 12 },
  noProofText: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 20 },
  openUrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  openUrlText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
});
