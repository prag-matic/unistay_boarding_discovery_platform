import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMyListings, deactivateBoarding, activateBoarding } from '@/lib/boarding';
import { COLORS } from '@/lib/constants';
import type { Boarding, BoardingStatus } from '@/types/boarding.types';

const TABS: { label: string; value: BoardingStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'Inactive', value: 'INACTIVE' },
  { label: 'Pending', value: 'PENDING_APPROVAL' },
  { label: 'Rejected', value: 'REJECTED' },
];

const STATUS_COLORS: Record<BoardingStatus, string> = {
  ACTIVE: '#D1FAE5',
  DRAFT: '#F3F4F6',
  INACTIVE: '#FEF3C7',
  PENDING_APPROVAL: '#EBF0FF',
  REJECTED: '#FEE2E2',
};

const STATUS_TEXT_COLORS: Record<BoardingStatus, string> = {
  ACTIVE: COLORS.green,
  DRAFT: COLORS.textSecondary,
  INACTIVE: COLORS.orange,
  PENDING_APPROVAL: COLORS.primary,
  REJECTED: COLORS.red,
};

export default function MyListingsScreen() {
  const [activeTab, setActiveTab] = useState<BoardingStatus | 'ALL'>('ALL');
  const [listings, setListings] = useState<Boarding[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadListings = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getMyListings();
      setListings(result.data.boardings);
    } catch {
      Alert.alert('Error', 'Failed to load your listings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadListings(); }, [loadListings]));

  const filtered = activeTab === 'ALL' ? listings : listings.filter((b) => b.status === activeTab);

  const handleDeactivate = (boarding: Boarding) => {
    Alert.alert('Deactivate Listing', `Deactivate "${boarding.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate',
        style: 'destructive',
        onPress: async () => {
          try {
            await deactivateBoarding(boarding.id);
            setListings((prev) =>
              prev.map((b) => (b.id === boarding.id ? { ...b, status: 'INACTIVE' } : b)),
            );
          } catch {
            Alert.alert('Error', 'Failed to deactivate the listing. Please try again.');
          }
        },
      },
    ]);
  };

  const handleActivate = (boarding: Boarding) => {
    Alert.alert('Activate Listing', `Activate "${boarding.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Activate',
        onPress: async () => {
          try {
            await activateBoarding(boarding.id);
            setListings((prev) =>
              prev.map((b) => (b.id === boarding.id ? { ...b, status: 'ACTIVE' } : b)),
            );
          } catch {
            Alert.alert('Error', 'Failed to activate the listing. Please try again.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Boarding }) => {
    const primaryImage = item.images[0];
    return (
      <View style={styles.card}>
        <View style={styles.cardImageContainer}>
          {primaryImage ? (
            <Image source={{ uri: primaryImage.url }} style={styles.cardImage} />
          ) : (
            <View style={[styles.cardImage, styles.imagePlaceholder]}>
              <Ionicons name="home-outline" size={24} color={COLORS.gray} />
            </View>
          )}
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] }]}>
            <Text style={[styles.statusText, { color: STATUS_TEXT_COLORS[item.status] }]}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
        </View>
        <View style={styles.cardBody}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => {
                const actions: { text: string; style?: 'cancel' | 'default' | 'destructive'; onPress?: () => void }[] = [];
                if (item.status === 'ACTIVE') {
                  actions.push({ text: 'Deactivate', style: 'destructive', onPress: () => handleDeactivate(item) });
                }
                if (item.status === 'INACTIVE') {
                  actions.push({ text: 'Activate', onPress: () => handleActivate(item) });
                }
                actions.push({ text: 'Edit', onPress: () => router.push(`/my-listings/${item.id}/edit` as never) });
                actions.push({ text: 'Cancel', style: 'cancel' });
                Alert.alert(item.title, 'Choose an action', actions);
              }}
            >
              <Ionicons name="ellipsis-vertical" size={18} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
          <Text style={styles.cardOccupancy}>
            Occupancy: {item.currentOccupants}/{item.maxOccupants}
          </Text>
          <Text style={styles.cardPrice}>
            {item.monthlyRent ? `LKR ${item.monthlyRent.toLocaleString()}/mo` : '—'}
          </Text>
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push(`/my-listings/${item.id}/edit` as never)}
            >
              <Ionicons name="pencil-outline" size={14} color={COLORS.primary} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.analyticsBtn}
              onPress={() => router.push(`/my-listings/${item.id}/analytics` as never)}
            >
              <Ionicons name="bar-chart-outline" size={14} color={COLORS.white} />
              <Text style={styles.analyticsBtnText}>Analytics</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Listings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        <FlatList
          data={TABS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(t) => t.value}
          contentContainerStyle={styles.tabBarContent}
          renderItem={({ item: tab }) => (
            <TouchableOpacity
              style={[styles.tab, activeTab === tab.value && styles.tabActive]}
              onPress={() => setActiveTab(tab.value)}
            >
              <Text style={[styles.tabText, activeTab === tab.value && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          )}
        />
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
              <Ionicons name="home-outline" size={64} color={COLORS.grayBorder} />
              <Text style={styles.emptyTitle}>No listings yet</Text>
              <Text style={styles.emptySub}>Create your first listing to get started</Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => router.push('/boardings/create/step1' as never)}
      >
        <Ionicons name="add" size={28} color={COLORS.white} />
      </TouchableOpacity>
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
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: COLORS.text },
  tabBar: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayBorder,
  },
  tabBarContent: { paddingHorizontal: 16, gap: 6, paddingVertical: 10 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: COLORS.grayLight,
  },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.white, fontWeight: '700' },
  list: { padding: 16, gap: 12, paddingBottom: 100 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  cardImageContainer: { position: 'relative' },
  cardImage: { width: 110, height: 130 },
  imagePlaceholder: { backgroundColor: COLORS.grayLight, alignItems: 'center', justifyContent: 'center' },
  statusBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusText: { fontSize: 10, fontWeight: '700' },
  cardBody: { flex: 1, padding: 12 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.text, marginRight: 8 },
  menuBtn: { padding: 2 },
  cardOccupancy: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4 },
  cardPrice: { fontSize: 15, fontWeight: '800', color: COLORS.primary, marginTop: 4 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 8 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  analyticsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  analyticsBtnText: { fontSize: 12, color: COLORS.white, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
