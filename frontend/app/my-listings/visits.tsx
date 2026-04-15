import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getReceivedVisitRequests, approveVisitRequest, rejectVisitRequest } from '@/lib/visit';
import { COLORS } from '@/lib/constants';
import type { VisitRequest, VisitStatus } from '@/types/visit.types';

const STATUS_COLORS: Record<VisitStatus, string> = {
  PENDING: '#FEF3C7',
  APPROVED: '#D1FAE5',
  REJECTED: '#FEE2E2',
  CANCELLED: '#F3F4F6',
  EXPIRED: '#F3F4F6',
};

const STATUS_TEXT_COLORS: Record<VisitStatus, string> = {
  PENDING: COLORS.orange,
  APPROVED: COLORS.green,
  REJECTED: COLORS.red,
  CANCELLED: COLORS.textSecondary,
  EXPIRED: COLORS.textSecondary,
};

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatDateTime(iso: string) {
  const d = new Date(iso);
  const date = `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
  const h = d.getHours();
  const suffix = h < 12 ? 'AM' : 'PM';
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${date}, ${display}:${String(d.getMinutes()).padStart(2, '0')} ${suffix}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const suffix = h < 12 ? 'AM' : 'PM';
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${display}:${String(d.getMinutes()).padStart(2, '0')} ${suffix}`;
}

export default function ManageVisitsScreen() {
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isActing, setIsActing] = useState(false);

  const loadVisits = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getReceivedVisitRequests();
      setVisits(result.data.visitRequests);
    } catch {
      Alert.alert('Error', 'Failed to load visit requests. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadVisits(); }, [loadVisits]));

  const handleApprove = (id: string) => {
    Alert.alert('Approve Visit', 'Are you sure you want to approve this visit request?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          setIsActing(true);
          try {
            const result = await approveVisitRequest(id);
            setVisits((prev) =>
              prev.map((v) => (v.id === id ? result.data.visitRequest : v)),
            );
          } catch (err: unknown) {
            const message =
              (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Failed to approve visit request.';
            Alert.alert('Error', message);
          } finally {
            setIsActing(false);
          }
        },
      },
    ]);
  };

  const openRejectModal = (id: string) => {
    setSelectedVisitId(id);
    setRejectionReason('');
    setRejectModalVisible(true);
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Required', 'Please provide a rejection reason.');
      return;
    }
    if (!selectedVisitId) return;
    setIsActing(true);
    try {
      const result = await rejectVisitRequest(selectedVisitId, {
        reason: rejectionReason.trim(),
      });
      setVisits((prev) =>
        prev.map((v) => (v.id === selectedVisitId ? result.data.visitRequest : v)),
      );
      setRejectModalVisible(false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to reject visit request.';
      Alert.alert('Error', message);
    } finally {
      setIsActing(false);
    }
  };

  const renderItem = ({ item }: { item: VisitRequest }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.boarding.title}</Text>
          <Text style={styles.cardAddress} numberOfLines={1}>
            <Ionicons name="location-outline" size={12} color={COLORS.gray} />{' '}
            {item.boarding.city}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] }]}>
          <Text style={[styles.statusText, { color: STATUS_TEXT_COLORS[item.status] }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardBody}>
        {/* Student info */}
        {item.student && (
          <View style={styles.studentRow}>
            <View style={styles.studentAvatar}>
              <Text style={styles.studentAvatarText}>
                {item.student.firstName.charAt(0)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.studentName}>
                {item.student.firstName} {item.student.lastName}
              </Text>
              <Text style={styles.studentEmail}>{item.student.email}</Text>
            </View>
          </View>
        )}

        <View style={styles.infoRow}>
          <Ionicons name="calendar-outline" size={15} color={COLORS.primary} />
          <Text style={styles.infoText}>
            {formatDateTime(item.requestedStartAt)} – {formatTime(item.requestedEndAt)}
          </Text>
        </View>
        {item.message ? (
          <View style={styles.infoRow}>
            <Ionicons name="chatbubble-outline" size={15} color={COLORS.primary} />
            <Text style={styles.infoText} numberOfLines={2}>{item.message}</Text>
          </View>
        ) : null}
        {item.status === 'PENDING' && (
          <View style={styles.infoRow}>
            <Ionicons name="hourglass-outline" size={15} color={COLORS.orange} />
            <Text style={[styles.infoText, { color: COLORS.orange }]}>
              Expires: {formatDateTime(item.expiresAt)}
            </Text>
          </View>
        )}
        {item.status === 'REJECTED' && item.rejectionReason && (
          <View style={styles.rejectionCard}>
            <Text style={styles.rejectionLabel}>Your Rejection Reason:</Text>
            <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
          </View>
        )}
      </View>

      {item.status === 'PENDING' && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.rejectBtn}
            onPress={() => openRejectModal(item.id)}
            disabled={isActing}
          >
            <Ionicons name="close-outline" size={16} color={COLORS.red} />
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.approveBtn}
            onPress={() => handleApprove(item.id)}
            disabled={isActing}
          >
            <Ionicons name="checkmark-outline" size={16} color={COLORS.white} />
            <Text style={styles.approveBtnText}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Visit Requests</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={visits}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color={COLORS.grayBorder} />
              <Text style={styles.emptyTitle}>No visit requests</Text>
              <Text style={styles.emptySub}>
                Students will send visit requests to your properties here
              </Text>
            </View>
          }
        />
      )}

      {/* Rejection Modal */}
      <Modal
        visible={rejectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRejectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Visit Request</Text>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Please provide a reason for rejecting this visit request.
            </Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter rejection reason..."
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

  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 10,
  },
  studentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  studentName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  studentEmail: { fontSize: 12, color: COLORS.textSecondary },

  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, color: COLORS.textSecondary },

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

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.red,
  },
  rejectBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.red },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.green,
  },
  approveBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.white },

  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },

  // Modal
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
});
