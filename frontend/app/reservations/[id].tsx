import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getReservationById, getRentalPeriods, cancelReservation } from '@/lib/reservation';
import { createPayment, uploadProofImage } from '@/lib/payment';
import { COLORS } from '@/lib/constants';
import type { Reservation, RentalPeriod, ReservationStatus, RentalPeriodStatus, Payment, PaymentStatus } from '@/types/reservation.types';
import type { PaymentMethod } from '@/types/reservation.types';
import * as ImagePicker from 'expo-image-picker';

// ─── Status config ──────────────────────────────────────────────────────────────
const STATUS_BG: Record<ReservationStatus, string> = {
  PENDING: '#FEF3C7',
  ACTIVE: '#D1FAE5',
  REJECTED: '#FEE2E2',
  COMPLETED: '#F3F4F6',
  CANCELLED: '#F3F4F6',
  EXPIRED: '#FEE2E2',
};

const STATUS_COLOR: Record<ReservationStatus, string> = {
  PENDING: COLORS.orange,
  ACTIVE: COLORS.green,
  REJECTED: COLORS.red,
  COMPLETED: COLORS.textSecondary,
  CANCELLED: COLORS.textSecondary,
  EXPIRED: COLORS.red,
};

const PERIOD_STATUS_BG: Record<RentalPeriodStatus, string> = {
  UPCOMING: '#EBF0FF',
  DUE: '#FEF3C7',
  PARTIALLY_PAID: '#FEF3C7',
  PAID: '#D1FAE5',
  OVERDUE: '#FEE2E2',
};

const PERIOD_STATUS_COLOR: Record<RentalPeriodStatus, string> = {
  UPCOMING: COLORS.primary,
  DUE: COLORS.orange,
  PARTIALLY_PAID: COLORS.orange,
  PAID: COLORS.green,
  OVERDUE: COLORS.red,
};

const PAY_STATUS_BG: Record<PaymentStatus, string> = {
  PENDING:   '#FEF3C7',
  CONFIRMED: '#D1FAE5',
  REJECTED:  '#FEE2E2',
};
const PAY_STATUS_COLOR: Record<PaymentStatus, string> = {
  PENDING:   COLORS.orange,
  CONFIRMED: COLORS.green,
  REJECTED:  COLORS.red,
};

const PERIOD_PRIORITY: Record<RentalPeriodStatus, number> = {
  OVERDUE: 0, DUE: 1, PARTIALLY_PAID: 2, UPCOMING: 3, PAID: 99,
};

// ─── Helpers ────────────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}, ${h}:${m}`;
}

// ─── Rental Period Row ──────────────────────────────────────────────────────────
function RentalPeriodRow({ period }: { period: RentalPeriod }) {
  const confirmedTotal = period.payments
    .filter((p) => p.status === 'CONFIRMED')
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = Math.max(0, (period.amountDue ?? 0) - confirmedTotal);

  return (
    <View style={styles.periodRow}>
      <View style={styles.periodLeft}>
        <Text style={styles.periodLabel}>{period.periodLabel}</Text>
        <Text style={styles.periodDue}>Due: {formatDate(period.dueDate)}</Text>
        {confirmedTotal > 0 && (
          <Text style={styles.periodPaid}>
            Paid: LKR {confirmedTotal.toLocaleString()} · Remaining: LKR {remaining.toLocaleString()}
          </Text>
        )}
      </View>
      <View style={styles.periodRight}>
        <Text style={styles.periodAmount}>LKR {(period.amountDue ?? 0).toLocaleString()}</Text>
        <View style={[styles.periodBadge, { backgroundColor: PERIOD_STATUS_BG[period.status] }]}>
          <Text style={[styles.periodBadgeText, { color: PERIOD_STATUS_COLOR[period.status] }]}>
            {period.status.replace('_', ' ')}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Payment History types ───────────────────────────────────────────────────────
interface PaymentWithPeriod extends Payment { periodLabel: string; }

// ─── Payment History Row ─────────────────────────────────────────────────────────
function PaymentHistoryRow({ payment }: { payment: PaymentWithPeriod }) {
  return (
    <View style={styles.payHistoryRow}>
      <View style={styles.payHistoryLeft}>
        <Text style={styles.payHistoryPeriod}>{payment.periodLabel}</Text>
        <Text style={styles.payHistoryMeta}>
          {payment.paymentMethod.replace('_', ' ')} · {formatDate(payment.paidAt ?? payment.createdAt)}
        </Text>
        {payment.referenceNumber ? (
          <Text style={styles.payHistoryRef}>Ref: {payment.referenceNumber}</Text>
        ) : null}
        {payment.status === 'REJECTED' && payment.rejectionReason ? (
          <Text style={styles.payHistoryRejection}>Rejected: {payment.rejectionReason}</Text>
        ) : null}
      </View>
      <View style={styles.payHistoryRight}>
        <Text style={styles.payHistoryAmount}>LKR {Number(payment.amount).toLocaleString()}</Text>
        <View style={[styles.periodBadge, { backgroundColor: PAY_STATUS_BG[payment.status] }]}>
          <Text style={[styles.periodBadgeText, { color: PAY_STATUS_COLOR[payment.status] }]}>
            {payment.status}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Detail row helper ──────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={16} color={COLORS.primary} />
      </View>
      <View style={styles.infoTextWrap}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

// ─── Log Payment helpers ─────────────────────────────────────────────────────────
const PAYMENT_METHODS: { label: string; value: PaymentMethod }[] = [
  { label: 'Cash', value: 'CASH' },
  { label: 'Bank Transfer', value: 'BANK_TRANSFER' },
  { label: 'Online', value: 'ONLINE' },
];

function getPastDays(count: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < count; i++) {
    const d = new Date(today.getTime());
    d.setDate(today.getDate() - i);
    days.push(d);
  }
  return days;
}

// ─── Screen ─────────────────────────────────────────────────────────────────────
export default function ReservationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [rentalPeriods, setRentalPeriods] = useState<RentalPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [periodsExpanded, setPeriodsExpanded] = useState(false);

  // Log Payment Modal
  const [logPaymentPeriod, setLogPaymentPeriod] = useState<RentalPeriod | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('CASH');
  const [payDate, setPayDate] = useState<Date>(new Date());
  const [payRef, setPayRef] = useState('');
  const [proofUri, setProofUri] = useState<string | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const pastDays = getPastDays(30);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    getReservationById(id)
      .then(async (res) => {
        const resData = res.data.reservation;
        setReservation(resData);
        // Auto-load rental periods for ACTIVE reservations
        if (resData.status === 'ACTIVE') {
          setLoadingPeriods(true);
          try {
            const rp = await getRentalPeriods(resData.id);
            setRentalPeriods(rp.data.rentalPeriods);
          } catch {
            // Non-fatal: periods section will show empty state
          } finally {
            setLoadingPeriods(false);
          }
        }
      })
      .catch(() => Alert.alert('Error', 'Failed to load reservation details.'))
      .finally(() => setIsLoading(false));
  }, [id]);

  // ── Derived values ──────────────────────────────────────────────────────────
  /** The rental period needing the most urgent attention. */
  const currentPeriod = useMemo<RentalPeriod | null>(() => {
    if (rentalPeriods.length === 0) return null;
    return (
      [...rentalPeriods].sort((a, b) => {
        const pa = PERIOD_PRIORITY[a.status] ?? 99;
        const pb = PERIOD_PRIORITY[b.status] ?? 99;
        if (pa !== pb) return pa - pb;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      })[0] ?? null
    );
  }, [rentalPeriods]);

  /** Next unpaid period when the current one is already PAID. */
  const nextPeriod = useMemo<RentalPeriod | null>(() => {
    if (!currentPeriod || currentPeriod.status !== 'PAID') return null;
    return (
      rentalPeriods
        .filter((p) => p.id !== currentPeriod.id && p.status !== 'PAID')
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0] ?? null
    );
  }, [currentPeriod, rentalPeriods]);

  /** All payments from every rental period, newest first. */
  const allPayments = useMemo<PaymentWithPeriod[]>(() => {
    return rentalPeriods
      .flatMap((p) => p.payments.map((pay) => ({ ...pay, periodLabel: p.periodLabel })))
      .sort((a, b) => {
        const da = a.paidAt ?? a.createdAt;
        const db = b.paidAt ?? b.createdAt;
        return new Date(db).getTime() - new Date(da).getTime();
      });
  }, [rentalPeriods]);

  const handleTogglePeriods = async () => {
    // If periods weren't auto-loaded yet (shouldn't happen for ACTIVE), load them
    if (!periodsExpanded && rentalPeriods.length === 0 && reservation?.id) {
      setLoadingPeriods(true);
      try {
        const res = await getRentalPeriods(reservation.id);
        setRentalPeriods(res.data.rentalPeriods);
      } catch {
        Alert.alert('Error', 'Failed to load rental periods.');
      } finally {
        setLoadingPeriods(false);
      }
    }
    setPeriodsExpanded((v) => !v);
  };

  const handleCancel = () => {
    if (!reservation) return;
    Alert.alert(
      'Cancel Reservation',
      reservation.status === 'ACTIVE'
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
              const res = await cancelReservation(reservation.id);
              setReservation(res.data.reservation);
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

  // ── Log Payment handlers ─────────────────────────────────────────────────────
  const openLogPayment = (period: RentalPeriod) => {
    const confirmedTotal = period.payments
      .filter((p) => p.status === 'CONFIRMED')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const remaining = Math.max(0, (period.amountDue ?? 0) - confirmedTotal);
    setPayAmount(remaining > 0 ? String(remaining) : '');
    setPayMethod('CASH');
    setPayDate(new Date());
    setPayRef('');
    setProofUri(null);
    setLogPaymentPeriod(period);
  };

  const handlePickProof = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setProofUri(result.assets[0].uri);
    }
  };

  const handleSubmitPayment = async () => {
    if (!logPaymentPeriod || !reservation) return;
    const amount = Number(payAmount);
    if (!payAmount || isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid positive amount.');
      return;
    }
    if (payRef.length > 100) {
      Alert.alert('Too Long', 'Reference number must be 100 characters or less.');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      // Build paidAt: use selected date with current time. For past dates, cap
      // time at 23:59 to stay on that calendar day while remaining in the past.
      const now = new Date();
      const paid = new Date(payDate.getTime());
      const isToday = payDate.toDateString() === now.toDateString();
      if (isToday) {
        paid.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), 0);
      } else {
        paid.setHours(23, 59, 0, 0);
      }

      // Step 1: if a proof image was selected, upload it first to get a URL.
      let proofImageUrl: string | undefined;
      if (proofUri) {
        proofImageUrl = await uploadProofImage(proofUri);
      }

      const paymentPayload = {
        rentalPeriodId: logPaymentPeriod.id,
        reservationId: reservation.id,
        amount,
        paymentMethod: payMethod,
        paidAt: paid.toISOString(),
        ...(payRef.trim() ? { referenceNumber: payRef.trim() } : {}),
        ...(proofImageUrl ? { proofImageUrl } : {}),
      };

      await createPayment(paymentPayload);

      console.log('[handleSubmitPayment] payment created successfully');
      // Refresh rental periods
      const res = await getRentalPeriods(reservation.id);
      setRentalPeriods(res.data.rentalPeriods);
      setLogPaymentPeriod(null);
      Alert.alert('Payment Logged', 'Your payment has been submitted and is awaiting owner confirmation.');
    } catch (err: unknown) {
      console.error('[handleSubmitPayment] error:', err);
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to log payment.';
      Alert.alert('Error', msg);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Reservation Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!reservation) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>Reservation Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Reservation not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Reservation Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Status banner */}
        <View style={[styles.statusBanner, { backgroundColor: STATUS_BG[reservation.status] }]}>
          <Text style={[styles.statusBannerText, { color: STATUS_COLOR[reservation.status] }]}>
            {reservation.status}
          </Text>
          <Text style={styles.statusBannerSub}>
            {reservation.status === 'PENDING' && 'Awaiting owner approval'}
            {reservation.status === 'ACTIVE' && 'You are an active tenant'}
            {reservation.status === 'REJECTED' && 'Reservation was rejected'}
            {reservation.status === 'CANCELLED' && 'Reservation was cancelled'}
            {reservation.status === 'COMPLETED' && 'Tenancy completed'}
            {reservation.status === 'EXPIRED' && 'Reservation expired without approval'}
          </Text>
        </View>

        {/* Boarding section — tappable, links to the listing */}
        <TouchableOpacity
          style={styles.card}
          activeOpacity={0.8}
          onPress={() => router.push(`/boardings/${reservation.boarding.slug}` as never)}
        >
          <Text style={styles.cardSectionTitle}>Boarding</Text>
          <Text style={styles.boardingTitle}>{reservation.boarding.title}</Text>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.gray} />
            <Text style={styles.locationText}>
              {reservation.boarding.city}, {reservation.boarding.district}
            </Text>
          </View>
          <View style={styles.viewListingRow}>
            <Text style={styles.viewListingText}>View Listing</Text>
            <Ionicons name="arrow-forward" size={14} color={COLORS.primary} />
          </View>
        </TouchableOpacity>

        {/* Reservation details */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Details</Text>
          <InfoRow
            icon="calendar-outline"
            label="Move-in Date"
            value={formatDate(reservation.moveInDate)}
          />
          <InfoRow
            icon="cash-outline"
            label="Monthly Rent"
            value={reservation.rentSnapshot ? `LKR ${reservation.rentSnapshot.toLocaleString()}` : '—'}
          />
          <InfoRow
            icon="time-outline"
            label="Applied On"
            value={formatDateTime(reservation.createdAt)}
          />
          <InfoRow
            icon="refresh-outline"
            label="Last Updated"
            value={formatDateTime(reservation.updatedAt)}
          />
          {reservation.status === 'PENDING' && reservation.expiresAt && (
            <View style={styles.expiryBanner}>
              <Ionicons name="alert-circle-outline" size={16} color={COLORS.orange} />
              <Text style={styles.expiryText}>
                Expires on {formatDateTime(reservation.expiresAt)} — owner must approve before then
              </Text>
            </View>
          )}
        </View>

        {/* Special requests */}
        {reservation.specialRequests ? (
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Special Requests</Text>
            <Text style={styles.specialRequestsText}>{reservation.specialRequests}</Text>
          </View>
        ) : null}

        {/* Rejection / Cancellation reason */}
        {(reservation.status === 'REJECTED' || reservation.status === 'CANCELLED') &&
          reservation.rejectionReason ? (
          <View style={[styles.card, styles.rejectionCard]}>
            <Text style={styles.rejectionLabel}>
              {reservation.status === 'REJECTED' ? 'Rejection Reason' : 'Cancellation Reason'}
            </Text>
            <Text style={styles.rejectionText}>{reservation.rejectionReason}</Text>
          </View>
        ) : null}

        {/* Rental Periods (ACTIVE only) */}
        {reservation.status === 'ACTIVE' && (
          <View style={styles.card}>
            <TouchableOpacity style={styles.periodsHeader} onPress={handleTogglePeriods}>
              <Text style={styles.cardSectionTitle}>Rental Periods</Text>
              <Ionicons
                name={periodsExpanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={COLORS.primary}
              />
            </TouchableOpacity>
            {periodsExpanded && (
              <>
                {loadingPeriods ? (
                  <ActivityIndicator color={COLORS.primary} style={{ padding: 16 }} />
                ) : rentalPeriods.length === 0 ? (
                  <Text style={styles.emptyPeriodsText}>No rental periods found.</Text>
                ) : (
                  rentalPeriods.map((p) => (
                    <RentalPeriodRow
                      key={p.id}
                      period={p}
                    />
                  ))
                )}
              </>
            )}
          </View>
        )}

        {/* Log Payment card (ACTIVE reservations with an outstanding period) */}
        {reservation.status === 'ACTIVE' && currentPeriod && currentPeriod.status !== 'PAID' && (
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Payment Due</Text>
            <View style={styles.currentPeriodRow}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.periodLabel}>{currentPeriod.periodLabel}</Text>
                <Text style={styles.periodDue}>Due: {formatDate(currentPeriod.dueDate)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Text style={styles.periodAmount}>LKR {(currentPeriod.amountDue ?? 0).toLocaleString()}</Text>
                <View style={[styles.periodBadge, { backgroundColor: PERIOD_STATUS_BG[currentPeriod.status] }]}>
                  <Text style={[styles.periodBadgeText, { color: PERIOD_STATUS_COLOR[currentPeriod.status] }]}>
                    {currentPeriod.status.replace('_', ' ')}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.logPaymentBigBtn} onPress={() => openLogPayment(currentPeriod)}>
              <Ionicons name="add-circle-outline" size={18} color={COLORS.white} />
              <Text style={styles.logPaymentBigBtnText}>Log Payment</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Payment History (ACTIVE reservations with at least one payment) */}
        {reservation.status === 'ACTIVE' && allPayments.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardSectionTitle}>Payment History</Text>
            {allPayments.map((pay) => (
              <PaymentHistoryRow key={pay.id} payment={pay} />
            ))}
          </View>
        )}

        {/* Cancel button */}
        {(reservation.status === 'PENDING' || reservation.status === 'ACTIVE') && (
          <TouchableOpacity
            style={[styles.cancelBtn, cancelling && { opacity: 0.6 }]}
            onPress={handleCancel}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color={COLORS.red} />
            ) : (
              <>
                <Ionicons name="close-circle-outline" size={18} color={COLORS.red} />
                <Text style={styles.cancelBtnText}>Cancel Reservation</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Log Payment Modal ── */}
      <Modal
        visible={!!logPaymentPeriod}
        transparent
        animationType="slide"
        onRequestClose={() => setLogPaymentPeriod(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Payment</Text>
              <TouchableOpacity onPress={() => setLogPaymentPeriod(null)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            {logPaymentPeriod && (
              <Text style={styles.modalSubtitle}>
                Period: {logPaymentPeriod.periodLabel} · Due: LKR{' '}
                {(logPaymentPeriod.amountDue ?? 0).toLocaleString()}
              </Text>
            )}

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {/* Amount */}
              <Text style={styles.fieldLabel}>Amount (LKR) *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 14000"
                placeholderTextColor={COLORS.gray}
                keyboardType="numeric"
                value={payAmount}
                onChangeText={setPayAmount}
              />

              {/* Payment Method */}
              <Text style={styles.fieldLabel}>Payment Method *</Text>
              <View style={styles.methodRow}>
                {PAYMENT_METHODS.map((m) => (
                  <TouchableOpacity
                    key={m.value}
                    style={[
                      styles.methodBtn,
                      payMethod === m.value && styles.methodBtnActive,
                    ]}
                    onPress={() => setPayMethod(m.value)}
                  >
                    <Text
                      style={[
                        styles.methodBtnText,
                        payMethod === m.value && styles.methodBtnTextActive,
                      ]}
                    >
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Date Picker */}
              <Text style={styles.fieldLabel}>Payment Date *</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.datePicker}
                contentContainerStyle={styles.datePickerContent}
              >
                {pastDays.map((d, i) => {
                  const isSelected = d.toDateString() === payDate.toDateString();
                  const isToday = i === 0;
                  return (
                    <TouchableOpacity
                      key={d.toISOString()}
                      style={[styles.dateCell, isSelected && styles.dateCellActive]}
                      onPress={() => setPayDate(d)}
                    >
                      <Text style={[styles.dateCellDay, isSelected && styles.dateCellTextActive]}>
                        {isToday ? 'Today' : ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]}
                      </Text>
                      <Text style={[styles.dateCellNum, isSelected && styles.dateCellTextActive]}>
                        {d.getDate()}
                      </Text>
                      <Text style={[styles.dateCellMonth, isSelected && styles.dateCellTextActive]}>
                        {MONTH_NAMES[d.getMonth()]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Reference Number */}
              <Text style={styles.fieldLabel}>Reference Number (optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. TXN123456"
                placeholderTextColor={COLORS.gray}
                value={payRef}
                onChangeText={setPayRef}
                maxLength={100}
              />

              {/* Proof Image */}
              <Text style={styles.fieldLabel}>Proof Image (optional)</Text>
              <TouchableOpacity style={styles.proofBtn} onPress={handlePickProof}>
                <Ionicons
                  name={proofUri ? 'image' : 'cloud-upload-outline'}
                  size={20}
                  color={COLORS.primary}
                />
                <Text style={styles.proofBtnText}>
                  {proofUri ? 'Change Image' : 'Upload Proof'}
                </Text>
              </TouchableOpacity>
              {proofUri && (
                <Image source={{ uri: proofUri }} style={styles.proofPreview} resizeMode="cover" />
              )}

              <View style={{ height: 12 }} />
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setLogPaymentPeriod(null)}
                disabled={isSubmittingPayment}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, isSubmittingPayment && { opacity: 0.6 }]}
                onPress={handleSubmitPayment}
                disabled={isSubmittingPayment}
              >
                {isSubmittingPayment ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayBorder,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  topBarTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 15, color: COLORS.textSecondary },

  scrollContent: { padding: 16, gap: 12 },

  statusBanner: {
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  statusBannerText: { fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  statusBannerSub: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  cardSectionTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.6 },

  boardingTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 13, color: COLORS.textSecondary },
  viewListingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  viewListingText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EBF0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextWrap: { flex: 1, gap: 1 },
  infoLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: 14, color: COLORS.text, fontWeight: '600' },

  expiryBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
  },
  expiryText: { flex: 1, fontSize: 12, color: COLORS.orange, fontWeight: '600', lineHeight: 18 },

  specialRequestsText: { fontSize: 14, color: COLORS.text, lineHeight: 22 },

  rejectionCard: { borderWidth: 1, borderColor: '#FEE2E2', backgroundColor: '#FFF1F0' },
  rejectionLabel: { fontSize: 12, fontWeight: '700', color: COLORS.red, textTransform: 'uppercase', letterSpacing: 0.4 },
  rejectionText: { fontSize: 14, color: COLORS.text, lineHeight: 20 },

  periodsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyPeriodsText: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 8 },

  periodRow: {
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
  periodBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  periodBadgeText: { fontSize: 11, fontWeight: '700' },

  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: COLORS.red,
  },
  cancelBtnText: { fontSize: 15, color: COLORS.red, fontWeight: '700' },

  // Log Payment button on rental period rows
  logPaymentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    backgroundColor: '#EBF0FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  logPaymentBtnText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },

  // Log Payment big button (reservation page level)
  currentPeriodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
  },
  logPaymentBigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 13,
  },
  logPaymentBigBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.white },

  // Payment History rows
  payHistoryRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
    gap: 10,
  },
  payHistoryLeft: { flex: 1, gap: 2 },
  payHistoryPeriod: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  payHistoryMeta: { fontSize: 12, color: COLORS.textSecondary },
  payHistoryRef: { fontSize: 11, color: COLORS.textSecondary },
  payHistoryRejection: { fontSize: 11, color: COLORS.red },
  payHistoryRight: { alignItems: 'flex-end', gap: 4 },
  payHistoryAmount: { fontSize: 14, fontWeight: '800', color: COLORS.text },

  // Log Payment Modal
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
    marginBottom: 4,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  modalSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, marginTop: 12 },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
  },
  methodRow: { flexDirection: 'row', gap: 8 },
  methodBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.grayBorder,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  methodBtnActive: { borderColor: COLORS.primary, backgroundColor: '#EBF0FF' },
  methodBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  methodBtnTextActive: { color: COLORS.primary },
  datePicker: { marginBottom: 4 },
  datePickerContent: { gap: 8, paddingVertical: 4 },
  dateCell: {
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.grayBorder,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 58,
  },
  dateCellActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  dateCellDay: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '600' },
  dateCellNum: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  dateCellMonth: { fontSize: 10, color: COLORS.textSecondary },
  dateCellTextActive: { color: COLORS.white },
  proofBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderStyle: 'dashed',
  },
  proofBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  proofPreview: { width: '100%', height: 160, borderRadius: 10, marginTop: 8 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: COLORS.grayBorder,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  modalSubmitBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSubmitText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
});
