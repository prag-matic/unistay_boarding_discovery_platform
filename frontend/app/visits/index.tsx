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
import { getMyVisitRequests, cancelVisitRequest } from '@/lib/visit';
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
  const hours = d.getHours();
  const suffix = hours < 12 ? 'AM' : 'PM';
  const display = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  const time = `${display}:${String(d.getMinutes()).padStart(2, '0')} ${suffix}`;
  return `${date}, ${time}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const hours = d.getHours();
  const suffix = hours < 12 ? 'AM' : 'PM';
  const display = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
  return `${display}:${String(d.getMinutes()).padStart(2, '0')} ${suffix}`;
}

export default function MyVisitsScreen() {
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const loadVisits = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getMyVisitRequests();
      setVisits(result.data.visitRequests);
    } catch {
      Alert.alert('Error', 'Failed to load visit requests. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadVisits(); }, [loadVisits]));

  const handleCancel = (id: string) => {
    Alert.alert(
      'Cancel Visit Request',
      'Are you sure you want to cancel this visit request?',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(id);
            try {
              const result = await cancelVisitRequest(id);
              setVisits((prev) =>
                prev.map((v) => (v.id === id ? result.data.visitRequest : v)),
              );
            } catch (err: unknown) {
              const message =
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
                'Failed to cancel visit request.';
              Alert.alert('Error', message);
            } finally {
              setCancellingId(null);
            }
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: VisitRequest }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.boarding.title}</Text>
          <Text style={styles.cardAddress} numberOfLines={1}>
            <Ionicons name="location-outline" size={12} color={COLORS.gray} />{' '}
            {item.boarding.address}, {item.boarding.city}
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
            <Text style={styles.rejectionLabel}>Rejection Reason:</Text>
            <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
          </View>
        )}
      </View>

      {(item.status === 'PENDING' || item.status === 'APPROVED') && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => handleCancel(item.id)}
          disabled={cancellingId === item.id}
        >
          {cancellingId === item.id ? (
            <ActivityIndicator size="small" color={COLORS.red} />
          ) : (
            <Text style={styles.cancelBtnText}>Cancel Request</Text>
          )}
        </TouchableOpacity>
      )}

      {item.status === 'APPROVED' && (
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => router.push(`/boardings/${item.boarding.slug}` as never)}
        >
          <Text style={styles.viewBtnText}>View Boarding</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Visit Requests</Text>
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
              <Text style={styles.emptyTitle}>No visit requests yet</Text>
              <Text style={styles.emptySub}>
                Browse boardings and schedule a visit to get started
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
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  divider: { height: 1, backgroundColor: COLORS.grayLight },

  cardBody: { padding: 14, gap: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },

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

  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
  },
  viewBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

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

