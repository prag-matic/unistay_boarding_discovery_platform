import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Image,
  Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { confirmPayment, rejectPayment } from '@/lib/payment';
import { COLORS } from '@/lib/constants';
import type { DetailedPayment } from '@/types/payment.types';
import type { PaymentStatus } from '@/types/reservation.types';

// ─── Status config ───────────────────────────────────────────────────────────
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

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}, ${h}:${m}`;
}

function InfoRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, bold && styles.infoValueBold]}>{value}</Text>
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────
export default function PaymentDetailScreen() {
  const params = useLocalSearchParams<{ data: string }>();
  const [payment, setPayment] = useState<DetailedPayment>(() =>
    JSON.parse(params.data),
  );
  const [isActing, setIsActing] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [proofVisible, setProofVisible] = useState(false);

  const handleConfirm = () => {
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
              const res = await confirmPayment(payment.id);
              setPayment(res.data.payment);
            } catch (err: unknown) {
              const msg =
                (err as { response?: { data?: { message?: string } } })
                  ?.response?.data?.message ?? 'Failed to confirm payment.';
              Alert.alert('Error', msg);
            } finally {
              setIsActing(false);
            }
          },
        },
      ],
    );
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Required', 'Please provide a rejection reason.');
      return;
    }
    setIsActing(true);
    try {
      const res = await rejectPayment(payment.id, { reason: rejectionReason.trim() });
      setPayment(res.data.payment);
      setRejectModalVisible(false);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })
          ?.response?.data?.message ?? 'Failed to reject payment.';
      Alert.alert('Error', msg);
    } finally {
      setIsActing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Status hero */}
        <View style={[styles.statusHero, { backgroundColor: STATUS_BG[payment.status] }]}>
          <Text style={[styles.statusHeroAmount]}>
            LKR {Number(payment.amount).toLocaleString()}
          </Text>
          <View style={[styles.statusBadge, { borderColor: STATUS_COLOR[payment.status] }]}>
            <Text style={[styles.statusBadgeText, { color: STATUS_COLOR[payment.status] }]}>
              {payment.status}
            </Text>
          </View>
          <Text style={[styles.statusHeroSub, { color: STATUS_COLOR[payment.status] }]}>
            {payment.status === 'PENDING' && 'Awaiting your review'}
            {payment.status === 'CONFIRMED' && `Confirmed on ${formatDate(payment.confirmedAt)}`}
            {payment.status === 'REJECTED' && 'Payment was rejected'}
          </Text>
        </View>

        {/* Tenant section */}
        {(payment.student ?? payment.reservation?.student) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tenant</Text>
            <InfoRow
              label="Name"
              value={`${(payment.student ?? payment.reservation!.student)!.firstName} ${(payment.student ?? payment.reservation!.student)!.lastName}`}
              bold
            />
            <InfoRow label="Email" value={(payment.student ?? payment.reservation!.student)!.email} />
          </View>
        )}

        {/* Boarding section */}
        {payment.reservation?.boarding?.title && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Boarding</Text>
            <InfoRow label="Title" value={payment.reservation.boarding.title} />
          </View>
        )}

        {/* Rental period section */}
        {payment.rentalPeriod && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rental Period</Text>
            <InfoRow label="Period" value={payment.rentalPeriod.periodLabel} bold />
            <InfoRow label="Due Date" value={formatDate(payment.rentalPeriod.dueDate)} />
          </View>
        )}

        {/* Payment details section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <InfoRow
            label="Method"
            value={METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}
          />
          <InfoRow label="Paid On" value={formatDateTime(payment.paidAt ?? payment.createdAt)} />
          {payment.referenceNumber && (
            <InfoRow label="Reference No." value={payment.referenceNumber} />
          )}
          <InfoRow label="Submitted On" value={formatDateTime(payment.createdAt)} />
          {payment.confirmedAt && (
            <InfoRow label="Confirmed On" value={formatDateTime(payment.confirmedAt)} />
          )}
        </View>

        {/* Rejection reason */}
        {payment.status === 'REJECTED' && payment.rejectionReason && (
          <View style={[styles.section, styles.rejectionSection]}>
            <Text style={[styles.sectionTitle, { color: COLORS.red }]}>Rejection Reason</Text>
            <Text style={styles.rejectionText}>{payment.rejectionReason}</Text>
          </View>
        )}

        {/* Proof image */}
        {payment.proofImageUrl && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Proof</Text>
            <TouchableOpacity
              style={styles.proofThumbContainer}
              onPress={() => setProofVisible(true)}
              activeOpacity={0.85}
            >
              <Image
                source={{ uri: payment.proofImageUrl }}
                style={styles.proofThumb}
                resizeMode="cover"
              />
              <View style={styles.proofOverlayLabel}>
                <Ionicons name="expand-outline" size={16} color={COLORS.white} />
                <Text style={styles.proofOverlayText}>Tap to enlarge</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Action buttons (PENDING only) */}
        {payment.status === 'PENDING' && (
          <View style={styles.actionSection}>
            <TouchableOpacity
              style={[styles.rejectBtn, isActing && { opacity: 0.6 }]}
              onPress={() => {
                setRejectionReason('');
                setRejectModalVisible(true);
              }}
              disabled={isActing}
            >
              <Ionicons name="close-circle-outline" size={18} color={COLORS.red} />
              <Text style={styles.rejectBtnText}>Reject Payment</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmBtn, isActing && { opacity: 0.6 }]}
              onPress={handleConfirm}
              disabled={isActing}
            >
              {isActing ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.white} />
                  <Text style={styles.confirmBtnText}>Confirm Payment</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── Reject Modal ── */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Payment</Text>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
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
                onPress={() => setRejectModalVisible(false)}
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

      {/* ── Proof Full-Screen Modal ── */}
      <Modal
        visible={proofVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProofVisible(false)}
      >
        <View style={styles.proofModalOverlay}>
          <TouchableOpacity
            style={styles.proofCloseBtn}
            onPress={() => setProofVisible(false)}
          >
            <Ionicons name="close-circle" size={32} color={COLORS.white} />
          </TouchableOpacity>
          {payment.proofImageUrl && (
            <Image
              source={{ uri: payment.proofImageUrl }}
              style={styles.proofFullImage}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity
            style={styles.openUrlBtn}
            onPress={() =>
              payment.proofImageUrl && Linking.openURL(payment.proofImageUrl)
            }
          >
            <Ionicons name="open-outline" size={15} color={COLORS.white} />
            <Text style={styles.openUrlText}>Open in browser</Text>
          </TouchableOpacity>
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
  scroll: { padding: 16, gap: 12, paddingBottom: 40 },

  statusHero: {
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  statusHeroAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.text,
  },
  statusBadge: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  statusBadgeText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  statusHeroSub: { fontSize: 13, fontWeight: '500' },

  section: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  rejectionSection: { borderWidth: 1, borderColor: '#FEE2E2' },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoLabel: { fontSize: 14, color: COLORS.textSecondary, flex: 1 },
  infoValue: { fontSize: 14, color: COLORS.text, flex: 2, textAlign: 'right' },
  infoValueBold: { fontWeight: '700' },
  rejectionText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },

  proofThumbContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  proofThumb: { width: '100%', height: 180 },
  proofOverlayLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  proofOverlayText: { color: COLORS.white, fontSize: 13, fontWeight: '600' },

  actionSection: { gap: 10 },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.red,
  },
  rejectBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.red },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.green,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },

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

  // Proof full-screen modal
  proofModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  proofCloseBtn: { position: 'absolute', top: 48, right: 16 },
  proofFullImage: { width: '100%', height: '75%' },
  openUrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  openUrlText: { fontSize: 13, color: COLORS.white, fontWeight: '600' },
});
