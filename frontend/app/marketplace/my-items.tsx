import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { COLORS } from '@/lib/constants';
import { deleteMarketplaceItem, getMyMarketplaceAds } from '@/lib/marketplace';
import type { MarketplaceItem } from '@/types/marketplace.types';

type MyItemsTab = 'ACTIVE' | 'TAKEN_DOWN';

export default function MyMarketplaceItemsScreen() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<MyItemsTab>('ACTIVE');

  const loadItems = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const response = await getMyMarketplaceAds();
      setItems(response.data.items);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadItems();
    }, []),
  );

  const activeItems = items.filter((item) => item.status !== 'TAKEN_DOWN');
  const takenDownItems = items.filter((item) => item.status === 'TAKEN_DOWN');
  const visibleItems = activeTab === 'ACTIVE' ? activeItems : takenDownItems;

  const onDelete = (itemId: string) => {
    Alert.alert('Delete Listing', 'Are you sure you want to delete this advertisement?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(itemId);
          try {
            await deleteMarketplaceItem(itemId);
            setItems((prev) => prev.filter((item) => item.id !== itemId));
          } catch {
            Alert.alert('Error', 'Unable to delete this listing right now.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.heading}>My Marketplace Items</Text>
          <Text style={styles.subHeading}>
            {visibleItems.length} listing{visibleItems.length === 1 ? '' : 's'}
          </Text>
        </View>
      </View>

      <View style={styles.tabsWrap}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'ACTIVE' && styles.tabBtnActive]}
          onPress={() => setActiveTab('ACTIVE')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'ACTIVE' && styles.tabBtnTextActive]}>
            Active ({activeItems.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'TAKEN_DOWN' && styles.tabBtnActive]}
          onPress={() => setActiveTab('TAKEN_DOWN')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'TAKEN_DOWN' && styles.tabBtnTextActive]}>
            Taken Down ({takenDownItems.length})
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadItems(true)}
            tintColor={COLORS.primary}
          />
        }
        renderItem={({ item }) => {
          const firstImage = item.images[0];
          return (
            <View style={styles.card}>
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.cardTop}
                onPress={() => router.push(`/marketplace/${item.id}` as never)}
              >
                {firstImage ? (
                  <Image source={{ uri: firstImage.url }} style={styles.image} />
                ) : (
                  <View style={[styles.image, styles.placeholder]}>
                    <Ionicons name="cube-outline" size={22} color={COLORS.gray} />
                  </View>
                )}

                <View style={styles.metaWrap}>
                  {activeTab === 'TAKEN_DOWN' ? (
                    <View style={styles.takenDownPill}>
                      <Ionicons name="alert-circle-outline" size={11} color={COLORS.red} />
                      <Text style={styles.takenDownPillText}>Taken Down</Text>
                    </View>
                  ) : null}
                  <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.meta} numberOfLines={1}>{item.city}, {item.district}</Text>
                  {activeTab === 'TAKEN_DOWN' ? (
                    <View style={styles.reasonWrap}>
                      <Ionicons name="alert-circle-outline" size={13} color={COLORS.red} />
                      <Text style={styles.reasonText} numberOfLines={2}>
                        {item.takedownReason || 'Taken down by moderation team'}
                      </Text>
                    </View>
                  ) : null}
                  <Text style={styles.price}>
                    {item.adType === 'SELL' && item.price ? `LKR ${item.price.toLocaleString()}` : 'Free'}
                  </Text>
                </View>
              </TouchableOpacity>

              {activeTab === 'ACTIVE' ? (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => router.push(`/marketplace/create?id=${item.id}` as never)}
                  >
                    <Ionicons name="create-outline" size={14} color={COLORS.primary} />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() => onDelete(item.id)}
                    disabled={deletingId === item.id}
                  >
                    <Ionicons name="trash-outline" size={14} color={COLORS.red} />
                    <Text style={styles.deleteBtnText}>{deletingId === item.id ? 'Deleting...' : 'Delete'}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.actionsRowSingle}>
                  <TouchableOpacity
                    style={styles.deleteBtnFull}
                    onPress={() => onDelete(item.id)}
                    disabled={deletingId === item.id}
                  >
                    <Ionicons name="trash-outline" size={14} color={COLORS.red} />
                    <Text style={styles.deleteBtnText}>{deletingId === item.id ? 'Deleting...' : 'Delete'}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="pricetags-outline" size={52} color={COLORS.grayBorder} />
            <Text style={styles.emptyTitle}>
              {activeTab === 'TAKEN_DOWN'
                ? 'No taken down listings'
                : 'No marketplace listings yet'}
            </Text>
            {activeTab === 'ACTIVE' ? (
              <TouchableOpacity
                style={styles.createBtn}
                onPress={() => router.push('/marketplace/create' as never)}
              >
                <Text style={styles.createBtnText}>Create Listing</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 10,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  subHeading: { marginTop: 3, color: COLORS.textSecondary, fontSize: 13 },
  tabsWrap: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tabBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    backgroundColor: COLORS.white,
    paddingVertical: 9,
    alignItems: 'center',
  },
  tabBtnActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF3FF',
  },
  tabBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  tabBtnTextActive: { color: COLORS.primary },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    overflow: 'hidden',
  },
  cardTop: { flexDirection: 'row', gap: 10, padding: 10 },
  image: { width: 90, height: 90, borderRadius: 10, backgroundColor: COLORS.grayLight },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  metaWrap: { flex: 1, justifyContent: 'center' },
  takenDownPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  takenDownPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.red,
  },
  title: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  meta: { marginTop: 4, color: COLORS.textSecondary, fontSize: 12 },
  reasonWrap: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 5,
  },
  reasonText: {
    flex: 1,
    color: COLORS.red,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  price: { marginTop: 8, fontSize: 15, fontWeight: '800', color: COLORS.primary },
  actionsRow: {
    borderTopWidth: 1,
    borderTopColor: COLORS.grayBorder,
    flexDirection: 'row',
    gap: 10,
    padding: 10,
  },
  actionsRowSingle: {
    borderTopWidth: 1,
    borderTopColor: COLORS.grayBorder,
    padding: 10,
  },
  editBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editBtnText: { color: COLORS.primary, fontWeight: '700' },
  deleteBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.red,
    borderRadius: 8,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  deleteBtnFull: {
    borderWidth: 1,
    borderColor: COLORS.red,
    borderRadius: 8,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  deleteBtnText: { color: COLORS.red, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 100, gap: 10 },
  emptyTitle: { fontSize: 16, color: COLORS.text, fontWeight: '700' },
  createBtn: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  createBtnText: { color: COLORS.white, fontWeight: '700' },
});
