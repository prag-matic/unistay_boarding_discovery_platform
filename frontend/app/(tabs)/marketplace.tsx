import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  LayoutChangeEvent,
  Modal,
  PanResponder,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { COLORS } from '@/lib/constants';
import { MARKETPLACE_CATEGORIES, getMyMarketplaceAds, searchMarketplaceItems } from '@/lib/marketplace';
import { useMarketplaceStore } from '@/store/marketplace.store';
import { useAuthStore } from '@/store/auth.store';
import type { MarketplaceAdType, MarketplaceItem } from '@/types/marketplace.types';

const PRICE_MIN = 0;
const PRICE_MAX = 100000;
const PRICE_STEP = 1000;
const THUMB_SIZE = 26;
const TRACK_H = 4;

interface DualRangeSliderProps {
  min: number;
  max: number;
  step: number;
  low: number;
  high: number;
  onLowChange: (v: number) => void;
  onHighChange: (v: number) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

function DualRangeSlider({
  min,
  max,
  step,
  low,
  high,
  onLowChange,
  onHighChange,
  onDragStart,
  onDragEnd,
}: DualRangeSliderProps) {
  const [trackW, setTrackW] = useState(0);
  const trackWRef = useRef(0);
  const lowRef = useRef(low);
  const highRef = useRef(high);
  lowRef.current = low;
  highRef.current = high;

  const lowStartPx = useRef(0);
  const highStartPx = useRef(0);

  const valToPx = (v: number) => ((v - min) / (max - min)) * trackWRef.current;
  const pxToVal = (px: number) => {
    const raw = (px / trackWRef.current) * (max - min) + min;
    return Math.round(raw / step) * step;
  };
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

  const lowPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        lowStartPx.current = valToPx(lowRef.current);
        onDragStart?.();
      },
      onPanResponderMove: (_, gesture) => {
        if (trackWRef.current === 0) return;
        const newPx = clamp(lowStartPx.current + gesture.dx, 0, valToPx(highRef.current) - THUMB_SIZE);
        const newVal = clamp(pxToVal(newPx), min, highRef.current - step);
        onLowChange(newVal);
      },
      onPanResponderRelease: () => onDragEnd?.(),
      onPanResponderTerminate: () => onDragEnd?.(),
    }),
  ).current;

  const highPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        highStartPx.current = valToPx(highRef.current);
        onDragStart?.();
      },
      onPanResponderMove: (_, gesture) => {
        if (trackWRef.current === 0) return;
        const newPx = clamp(
          highStartPx.current + gesture.dx,
          valToPx(lowRef.current) + THUMB_SIZE,
          trackWRef.current,
        );
        const newVal = clamp(pxToVal(newPx), lowRef.current + step, max);
        onHighChange(newVal);
      },
      onPanResponderRelease: () => onDragEnd?.(),
      onPanResponderTerminate: () => onDragEnd?.(),
    }),
  ).current;

  const onTrackLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    trackWRef.current = w;
    setTrackW(w);
  };

  const lowPx = trackW > 0 ? ((low - min) / (max - min)) * trackW : 0;
  const highPx = trackW > 0 ? ((high - min) / (max - min)) * trackW : trackW;

  return (
    <View>
      <View style={styles.sliderTrackContainer} onLayout={onTrackLayout}>
        <View style={styles.sliderTrack} />
        {trackW > 0 && <View style={[styles.sliderRange, { left: lowPx, width: highPx - lowPx }]} />}
        {trackW > 0 && <View {...lowPan.panHandlers} style={[styles.sliderThumb, { left: lowPx - THUMB_SIZE / 2 }]} />}
        {trackW > 0 && (
          <View {...highPan.panHandlers} style={[styles.sliderThumb, { left: highPx - THUMB_SIZE / 2 }]} />
        )}
      </View>
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabel}>LKR {low.toLocaleString()}</Text>
        <Text style={styles.sliderLabel}>LKR {high.toLocaleString()}</Text>
      </View>
    </View>
  );
}

function MarketplaceCard({ item }: { item: MarketplaceItem }) {
  const firstImage = item.images[0];

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() => router.push(`/marketplace/${item.id}` as never)}
    >
      {firstImage ? (
        <Image source={{ uri: firstImage.url }} style={styles.image} />
      ) : (
        <View style={[styles.image, styles.placeholder]}>
          <Ionicons name="cube-outline" size={28} color={COLORS.gray} />
        </View>
      )}

      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.title}>
            {item.title}
          </Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{item.adType}</Text>
          </View>
        </View>

        <Text style={styles.location} numberOfLines={1}>
          {item.city}, {item.district}
        </Text>

        <Text style={styles.category}>{item.category}</Text>

        <Text style={styles.price}>
          {item.adType === 'SELL' && item.price ? `LKR ${item.price.toLocaleString()}` : 'Free'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function MarketplaceTabScreen() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);
  const [filterScrollEnabled, setFilterScrollEnabled] = useState(true);

  const { items, myAds, setItems, setMyAds, filters, setFilters, clearFilters } = useMarketplaceStore();
  const { user } = useAuthStore();

  const [draftAdType, setDraftAdType] = useState<MarketplaceAdType | undefined>(filters.adType);
  const [draftCategory, setDraftCategory] = useState(filters.category ?? '');
  const [draftCity, setDraftCity] = useState(filters.city ?? '');
  const [draftDistrict, setDraftDistrict] = useState(filters.district ?? '');
  const [draftMinPrice, setDraftMinPrice] = useState(filters.minPrice ?? PRICE_MIN);
  const [draftMaxPrice, setDraftMaxPrice] = useState(filters.maxPrice ?? PRICE_MAX);

  const resetDraftFromFilters = useCallback(() => {
    setDraftAdType(filters.adType);
    setDraftCategory(filters.category ?? '');
    setDraftCity(filters.city ?? '');
    setDraftDistrict(filters.district ?? '');
    setDraftMinPrice(filters.minPrice ?? PRICE_MIN);
    setDraftMaxPrice(filters.maxPrice ?? PRICE_MAX);
  }, [filters]);

  const openFilters = () => {
    resetDraftFromFilters();
    setShowCategoryOptions(false);
    setFiltersVisible(true);
  };

  const fetchMarketplace = async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const response = await searchMarketplaceItems({
        size: 50,
        search: query || undefined,
        ...filters,
      });
      setItems(response.data.items);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMarketplace();
    }, 250);

    return () => clearTimeout(timer);
  }, [query, filters]);

  useFocusEffect(
    useCallback(() => {
      if (user?.role !== 'STUDENT') return;
      getMyMarketplaceAds()
        .then((response) => setMyAds(response.data.items))
        .catch(() => setMyAds([]));
    }, [setMyAds, user?.role]),
  );

  const canCreate = user?.role === 'STUDENT';

  const headerSubtitle = useMemo(() => {
    if (!canCreate) return `${items.length} listing${items.length === 1 ? '' : 's'}`;
    return `${items.length} listing${items.length === 1 ? '' : 's'} · ${myAds.length} mine`;
  }, [canCreate, items.length, myAds.length]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.adType) count += 1;
    if (filters.category) count += 1;
    if (filters.city) count += 1;
    if (filters.district) count += 1;
    if (filters.minPrice !== undefined) count += 1;
    if (filters.maxPrice !== undefined) count += 1;
    return count;
  }, [filters]);

  const clearAllDraftFilters = () => {
    setDraftAdType(undefined);
    setDraftCategory('');
    setDraftCity('');
    setDraftDistrict('');
    setDraftMinPrice(PRICE_MIN);
    setDraftMaxPrice(PRICE_MAX);
    setShowCategoryOptions(false);
  };

  const applyFilters = () => {
    setFilters({
      adType: draftAdType,
      category: draftCategory || undefined,
      city: draftCity || undefined,
      district: draftDistrict || undefined,
      minPrice: draftMinPrice > PRICE_MIN ? draftMinPrice : undefined,
      maxPrice: draftMaxPrice < PRICE_MAX ? draftMaxPrice : undefined,
    });
    setFiltersVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>Marketplace</Text>
          <Text style={styles.subHeading}>{headerSubtitle}</Text>
        </View>
        {canCreate && (
          <TouchableOpacity
            style={styles.myItemsBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/marketplace/my-items' as never)}
          >
            <Ionicons name="briefcase-outline" size={14} color={COLORS.primary} />
            <Text style={styles.myItemsBtnText}>My Ads</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={COLORS.gray} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            style={styles.searchInput}
            placeholder="Search items"
            placeholderTextColor={COLORS.gray}
          />
        </View>

        <TouchableOpacity
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={openFilters}
          activeOpacity={0.85}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color={activeFilterCount > 0 ? COLORS.white : COLORS.text}
          />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MarketplaceCard item={item} />}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchMarketplace(true)}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="pricetags-outline" size={56} color={COLORS.grayBorder} />
              <Text style={styles.emptyTitle}>No listings yet</Text>
              <Text style={styles.emptySub}>Try another search or adjust filters</Text>
              {activeFilterCount > 0 && (
                <TouchableOpacity
                  style={styles.emptyClearBtn}
                  onPress={() => {
                    clearFilters();
                    resetDraftFromFilters();
                  }}
                >
                  <Text style={styles.emptyClearText}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {canCreate && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.88}
          onPress={() => router.push('/marketplace/create' as never)}
        >
          <Ionicons name="add" size={28} color={COLORS.white} />
        </TouchableOpacity>
      )}

      <Modal
        visible={filtersVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFiltersVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setFiltersVisible(false)} />

          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filters</Text>
              <TouchableOpacity onPress={clearAllDraftFilters}>
                <Text style={styles.modalClear}>Clear All</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
              scrollEnabled={filterScrollEnabled}
            >
              <Text style={styles.sectionLabel}>Ad Type</Text>
              <View style={styles.chipRow}>
                <FilterChip label="All" active={!draftAdType} onPress={() => setDraftAdType(undefined)} />
                <FilterChip label="Sell" active={draftAdType === 'SELL'} onPress={() => setDraftAdType('SELL')} />
                <FilterChip
                  label="Giveaway"
                  active={draftAdType === 'GIVEAWAY'}
                  onPress={() => setDraftAdType('GIVEAWAY')}
                />
              </View>

              <Text style={styles.sectionLabel}>Category</Text>
              <TouchableOpacity
                style={styles.dropdown}
                activeOpacity={0.85}
                onPress={() => setShowCategoryOptions((prev) => !prev)}
              >
                <Text style={draftCategory ? styles.dropdownValue : styles.dropdownPlaceholder}>
                  {draftCategory || 'All categories'}
                </Text>
                <Ionicons
                  name={showCategoryOptions ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={COLORS.gray}
                />
              </TouchableOpacity>

              {showCategoryOptions && (
                <View style={styles.dropdownMenu}>
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => {
                      setDraftCategory('');
                      setShowCategoryOptions(false);
                    }}
                  >
                    <Text style={[styles.dropdownItemText, !draftCategory && styles.dropdownItemActive]}>
                      All categories
                    </Text>
                    {!draftCategory && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
                  </TouchableOpacity>

                  {MARKETPLACE_CATEGORIES.map((category) => {
                    const isActive = draftCategory === category;
                    return (
                      <TouchableOpacity
                        key={category}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setDraftCategory(category);
                          setShowCategoryOptions(false);
                        }}
                      >
                        <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemActive]}>
                          {category}
                        </Text>
                        {isActive && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <Text style={styles.sectionLabel}>City</Text>
              <TextInput
                style={styles.input}
                placeholder="City"
                placeholderTextColor={COLORS.gray}
                value={draftCity}
                onChangeText={setDraftCity}
              />

              <Text style={styles.sectionLabel}>District</Text>
              <TextInput
                style={styles.input}
                placeholder="District"
                placeholderTextColor={COLORS.gray}
                value={draftDistrict}
                onChangeText={setDraftDistrict}
              />

              <Text style={styles.sectionLabel}>Price Range (LKR)</Text>
              <View style={styles.priceRangeCard}>
                <DualRangeSlider
                  min={PRICE_MIN}
                  max={PRICE_MAX}
                  step={PRICE_STEP}
                  low={draftMinPrice}
                  high={draftMaxPrice}
                  onLowChange={setDraftMinPrice}
                  onHighChange={setDraftMaxPrice}
                  onDragStart={() => setFilterScrollEnabled(false)}
                  onDragEnd={() => setFilterScrollEnabled(true)}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.resetBtn}
                onPress={() => {
                  clearFilters();
                  clearAllDraftFilters();
                  setFiltersVisible(false);
                }}
              >
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={applyFilters}>
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  subHeading: { marginTop: 4, color: COLORS.textSecondary, fontSize: 13 },
  myItemsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.white,
  },
  myItemsBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  searchRow: {
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  searchWrap: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterBadge: {
    position: 'absolute',
    right: -5,
    top: -5,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 10, paddingBottom: 100 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    overflow: 'hidden',
  },
  image: { width: '100%', height: 170, backgroundColor: COLORS.grayLight },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  cardBody: { padding: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text },
  typeBadge: {
    borderRadius: 999,
    backgroundColor: COLORS.grayLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typeBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.textSecondary },
  location: { marginTop: 5, color: COLORS.textSecondary, fontSize: 13 },
  category: { marginTop: 4, color: COLORS.gray, fontSize: 12 },
  price: { marginTop: 8, color: COLORS.primary, fontSize: 16, fontWeight: '800' },
  emptyState: { alignItems: 'center', paddingTop: 90, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 13, color: COLORS.textSecondary },
  emptyClearBtn: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyClearText: { color: COLORS.text, fontWeight: '600', fontSize: 13 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  modalSheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '84%',
    overflow: 'hidden',
  },
  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.grayBorder,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  modalClear: { fontSize: 13, fontWeight: '700', color: COLORS.red },
  modalContent: { paddingHorizontal: 16, paddingBottom: 14 },
  sectionLabel: {
    marginBottom: 8,
    marginTop: 14,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: COLORS.grayLight,
  },
  filterChipActive: { backgroundColor: COLORS.primary },
  filterChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  filterChipTextActive: { color: COLORS.white },
  input: {
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.white,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: { color: COLORS.text, fontSize: 14 },
  dropdownPlaceholder: { color: COLORS.gray, fontSize: 14 },
  dropdownMenu: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.grayBorder,
  },
  dropdownItemText: { color: COLORS.text, fontSize: 14 },
  dropdownItemActive: { color: COLORS.primary, fontWeight: '700' },
  priceRangeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
  },
  sliderTrackContainer: {
    height: THUMB_SIZE,
    justifyContent: 'center',
    position: 'relative',
  },
  sliderTrack: {
    height: TRACK_H,
    backgroundColor: COLORS.grayBorder,
    borderRadius: TRACK_H / 2,
  },
  sliderRange: {
    position: 'absolute',
    height: TRACK_H,
    backgroundColor: COLORS.primary,
    borderRadius: TRACK_H / 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: COLORS.white,
    borderWidth: 2.5,
    borderColor: COLORS.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 5,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  sliderLabel: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayBorder,
    backgroundColor: COLORS.white,
  },
  resetBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: { fontSize: 14, color: COLORS.text, fontWeight: '600' },
  applyBtn: {
    flex: 2,
    height: 48,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: { fontSize: 14, color: COLORS.white, fontWeight: '700' },
});
