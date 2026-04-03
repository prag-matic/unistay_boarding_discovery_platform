import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  ListRenderItem,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import MapView, { Marker, Callout, UrlTile } from 'react-native-maps';
import { useAuthStore } from '@/store/auth.store';
import { useBoardingStore } from '@/store/boarding.store';
import { useSaveBoarding } from '@/hooks/useSaveBoarding';
import { searchBoardings } from '@/lib/boarding';
import { COLORS } from '@/lib/constants';
import type { Boarding, SortOption } from '@/types/boarding.types';

// ─── Constants ────────────────────────────────────────────────────────────────

const BTN_SIZE = 44; // uniform height for search bar AND icon buttons

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: 'Relevance', value: 'RELEVANCE' },
  { label: 'Price ↑', value: 'PRICE_ASC' },
  { label: 'Price ↓', value: 'PRICE_DESC' },
  { label: 'Newest', value: 'NEWEST' },
];

const TYPE_LABELS: Record<string, string> = {
  SINGLE_ROOM: 'Single Room',
  SHARED_ROOM: 'Shared Room',
  ANNEX: 'Annex',
  HOUSE: 'House',
};

const GENDER_LABELS: Record<string, string> = {
  MALE: 'Male Only',
  FEMALE: 'Female Only',
  ANY: 'Any Gender',
};

// Top amenities to surface on card
const AMENITY_ICONS: Record<string, string> = {
  WIFI: 'wifi-outline',
  PARKING: 'car-outline',
  AIR_CONDITIONING: 'snow-outline',
  HOT_WATER: 'water-outline',
  SECURITY: 'shield-checkmark-outline',
};
const TOP_AMENITIES = Object.keys(AMENITY_ICONS);

// Sri Lanka centre (used for default map region and fallback marker coordinates)
const DEFAULT_LATITUDE = 7.8731;
const DEFAULT_LONGITUDE = 80.7718;
const MAP_REGION = {
  latitude: DEFAULT_LATITUDE,
  longitude: DEFAULT_LONGITUDE,
  latitudeDelta: 4.0,
  longitudeDelta: 4.0,
};

// ─── Boarding List Card (full-width, horizontal) ──────────────────────────────
function BoardingCard({ item }: { item: Boarding }) {
  const { user } = useAuthStore();
  const { saved, toggleSave } = useSaveBoarding(item.id);
  const isStudent = user?.role !== 'OWNER';
  const primaryImage = item.images[0];
  const isAvailable = item.currentOccupants < item.maxOccupants;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.88}
      onPress={() => router.push(`/boardings/${item.slug}` as never)}
    >
      {/* Left: image */}
      <View style={styles.cardImgWrap}>
        {primaryImage ? (
          <Image source={{ uri: primaryImage.url }} style={styles.cardImg} />
        ) : (
          <View style={[styles.cardImg, styles.cardImgPlaceholder]}>
            <Ionicons name="home-outline" size={32} color={COLORS.gray} />
          </View>
        )}
        {/* Availability dot */}
        <View style={[styles.availDot, isAvailable ? styles.availDotGreen : styles.availDotRed]} />
        {/* Heart */}
        {isStudent && (
          <TouchableOpacity
            style={styles.heartBtn}
            onPress={toggleSave}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons
              name={saved ? 'heart' : 'heart-outline'}
              size={16}
              color={saved ? COLORS.red : COLORS.white}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Right: content */}
      <View style={styles.cardContent}>
        {/* Title */}
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

        {/* Location */}
        <View style={styles.cardLocRow}>
          <Ionicons name="location-outline" size={12} color={COLORS.gray} />
          <Text style={styles.cardLoc} numberOfLines={1}>{item.city}{item.district ? `, ${item.district}` : ''}</Text>
        </View>

        {/* Price — prominent */}
        <Text style={styles.cardPrice}>
          {item.monthlyRent
            ? <>LKR <Text style={styles.cardPriceAmount}>{item.monthlyRent.toLocaleString()}</Text><Text style={styles.cardPriceSuffix}>/mo</Text></>
            : '—'}
        </Text>

        {/* Badges row */}
        <View style={styles.badgeRow}>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>{TYPE_LABELS[item.boardingType] ?? item.boardingType}</Text>
          </View>
          {item.genderPref && item.genderPref !== 'ANY' && (
            <View style={styles.genderBadge}>
              <Text style={styles.genderBadgeText}>{GENDER_LABELS[item.genderPref]}</Text>
            </View>
          )}
        </View>

        {/* Amenities */}
        <View style={styles.amenityRow}>
          {TOP_AMENITIES.map((name) => {
            const active = item.amenities.some((a) => a.name === name);
            return (
              <View key={name} style={[styles.amenityIcon, !active && styles.amenityIconInactive]}>
                <Ionicons
                  name={AMENITY_ICONS[name] as never}
                  size={13}
                  color={active ? COLORS.primary : COLORS.grayBorder}
                />
              </View>
            );
          })}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Map preview bottom sheet ─────────────────────────────────────────────────
function MapBottomSheet({
  boarding,
  onClose,
}: {
  boarding: Boarding;
  onClose: () => void;
}) {
  return (
    <View style={styles.bottomSheet}>
      <View style={styles.bsHandle} />
      <View style={styles.bsRow}>
        {boarding.images[0] ? (
          <Image source={{ uri: boarding.images[0].url }} style={styles.bsImage} />
        ) : (
          <View style={[styles.bsImage, styles.bsImagePlaceholder]}>
            <Ionicons name="home-outline" size={24} color={COLORS.gray} />
          </View>
        )}
        <View style={styles.bsInfo}>
          <Text style={styles.bsTitle} numberOfLines={1}>{boarding.title}</Text>
          <Text style={styles.bsLocation} numberOfLines={1}>{boarding.city}, {boarding.district}</Text>
          <Text style={styles.bsPrice}>
            {boarding.monthlyRent ? `LKR ${boarding.monthlyRent.toLocaleString()}/mo` : '—'}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.bsClose}>
          <Ionicons name="close" size={20} color={COLORS.gray} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={styles.bsDetailsBtn}
        onPress={() => router.push(`/boardings/${boarding.slug}` as never)}
      >
        <Text style={styles.bsDetailsBtnText}>View Details</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ExploreScreen() {
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [mapSelected, setMapSelected] = useState<Boarding | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [boardings, setBoardings] = useState<Boarding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const { filters, sortOption, setSortOption, clearFilters } = useBoardingStore();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sortParams = useMemo(() => {
    if (sortOption === 'PRICE_ASC') return { sortBy: 'monthlyRent' as const, sortDir: 'asc' as const };
    if (sortOption === 'PRICE_DESC') return { sortBy: 'monthlyRent' as const, sortDir: 'desc' as const };
    if (sortOption === 'NEWEST') return { sortBy: 'createdAt' as const, sortDir: 'desc' as const };
    return {};
  }, [sortOption]);

  const fetchBoardings = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const result = await searchBoardings({
        search: query || undefined,
        city: filters.city,
        district: filters.district,
        minRent: filters.minRent,
        maxRent: filters.maxRent,
        boardingType: filters.boardingType,
        genderPref: filters.genderPref,
        amenities: filters.amenities,
        nearUniversity: filters.nearUniversity,
        size: 50,
        ...sortParams,
      });
      setBoardings(result.data.boarding);
      setTotal(result.data.pagination.total);
    } catch {
      setBoardings([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { fetchBoardings(); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, filters, sortParams]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.district) n++;
    if (filters.city) n++;
    if (filters.minRent) n++;
    if (filters.maxRent) n++;
    if (filters.boardingType) n++;
    if (filters.genderPref) n++;
    if (filters.amenities?.length) n += filters.amenities.length;
    if (filters.nearUniversity) n++;
    return n;
  }, [filters]);

  const renderItem: ListRenderItem<Boarding> = ({ item }) => <BoardingCard item={item} />;

  return (
    <SafeAreaView style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        {/* Row 0: page heading */}
        <View style={styles.headingRow}>
          <Text style={styles.headingText}>Explore</Text>
        </View>

        {/* Row 1: search + filter */}
        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={17} color={COLORS.gray} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search boardings..."
              placeholderTextColor="#9CA3AF"
              value={query}
              onChangeText={setQuery}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={17} color={COLORS.gray} />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter button */}
          <TouchableOpacity
            style={[styles.iconBtn, activeFilterCount > 0 && styles.iconBtnActive]}
            onPress={() => router.push('/explore/filter' as never)}
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

        {/* Row 2: result count + sort (only in list mode) */}
        {viewMode === 'list' && (
          <View style={styles.metaRow}>
            <Text style={styles.resultCount}>
              {isLoading ? 'Searching…' : `${total} result${total !== 1 ? 's' : ''}`}
            </Text>
            <View>
              <TouchableOpacity
                style={styles.sortBtn}
                onPress={() => setShowSortMenu((v) => !v)}
              >
                <Ionicons name="swap-vertical-outline" size={14} color={COLORS.primary} />
                <Text style={styles.sortBtnText}>
                  {SORT_OPTIONS.find((s) => s.value === sortOption)?.label ?? 'Sort'}
                </Text>
                <Ionicons
                  name={showSortMenu ? 'chevron-up' : 'chevron-down'}
                  size={13}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
              {showSortMenu && (
                <View style={styles.sortMenu}>
                  {SORT_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={styles.sortMenuItem}
                      onPress={() => { setSortOption(opt.value); setShowSortMenu(false); }}
                    >
                      <Text style={[styles.sortMenuText, sortOption === opt.value && styles.sortMenuTextActive]}>
                        {opt.label}
                      </Text>
                      {sortOption === opt.value && (
                        <Ionicons name="checkmark" size={14} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}
      </View>

      {/* ── Content: List or Map ── */}
      {viewMode === 'list' ? (
        isLoading && !isRefreshing ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={boardings}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onScrollBeginDrag={() => setShowSortMenu(false)}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={() => fetchBoardings(true)}
                tintColor={COLORS.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Ionicons name="search-outline" size={52} color={COLORS.grayBorder} />
                <Text style={styles.emptyTitle}>No boardings found</Text>
                <Text style={styles.emptySubtitle}>Try adjusting your search or filters</Text>
                {activeFilterCount > 0 && (
                  <TouchableOpacity style={styles.emptyResetBtn} onPress={clearFilters}>
                    <Text style={styles.emptyResetText}>Clear Filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            }
          />
        )
      ) : (
        /* ── Map view ── */
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            mapType="none"
            initialRegion={MAP_REGION}
            showsUserLocation
            showsMyLocationButton
          >
            <UrlTile
              urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
              maximumZ={19}
              flipY={false}
            />
            {boardings.map((b) => (
              <Marker
                key={b.id}
                coordinate={{ latitude: b.latitude ?? DEFAULT_LATITUDE, longitude: b.longitude ?? DEFAULT_LONGITUDE }}
                onPress={() => setMapSelected(mapSelected?.id === b.id ? null : b)}
              >
                <View style={styles.mapMarker}>
                  <Text style={styles.mapMarkerText}>
                    {b.monthlyRent ? `LKR ${(b.monthlyRent / 1000).toFixed(0)}k` : '—'}
                  </Text>
                </View>
                <Callout tooltip>
                  <View style={styles.callout}>
                    <Text style={styles.calloutTitle} numberOfLines={1}>{b.title}</Text>
                    <Text style={styles.calloutSub}>{b.city}</Text>
                  </View>
                </Callout>
              </Marker>
            ))}
          </MapView>
          {/* Boarding preview bottom sheet */}
          {mapSelected && (
            <MapBottomSheet
              boarding={mapSelected}
              onClose={() => setMapSelected(null)}
            />
          )}
        </View>
      )}

      {/* ── Clear Filters FAB (pill, bottom-center) ── */}
      {activeFilterCount > 0 && (
        <TouchableOpacity
          style={styles.clearFiltersFab}
          activeOpacity={0.85}
          onPress={clearFilters}
        >
          <Ionicons name="close-circle-outline" size={17} color={COLORS.white} />
          <Text style={styles.clearFiltersFabText}>Clear Filters</Text>
        </TouchableOpacity>
      )}

      {/* ── View Toggle FAB (round, bottom-right) ── */}
      <TouchableOpacity
        style={styles.viewToggleFab}
        activeOpacity={0.85}
        onPress={() => { setShowSortMenu(false); setMapSelected(null); setViewMode((v) => (v === 'list' ? 'map' : 'list')); }}
      >
        <Ionicons
          name={viewMode === 'list' ? 'map-outline' : 'list-outline'}
          size={22}
          color={COLORS.white}
        />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // ── Header
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayBorder,
    zIndex: 10,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headingText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    letterSpacing: -0.5,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchBar: {
    flex: 1,
    height: BTN_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  iconBtn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: 12,
    backgroundColor: COLORS.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnActive: { backgroundColor: COLORS.primary },
  filterBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: COLORS.red,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: { fontSize: 10, color: COLORS.white, fontWeight: '700' },

  // ── Meta row (list mode only)
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultCount: { fontSize: 12, color: COLORS.textSecondary },
  sortBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sortBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  sortMenu: {
    position: 'absolute',
    right: 0,
    top: 24,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    minWidth: 160,
    zIndex: 100,
  },
  sortMenuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },
  sortMenuText: { fontSize: 14, color: COLORS.text },
  sortMenuTextActive: { color: COLORS.primary, fontWeight: '600' },

  // ── List
  listContent: { padding: 14, paddingBottom: 100, gap: 12 },

  // ── Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  cardImgWrap: {
    width: 116,
    alignSelf: 'stretch',
    minHeight: 120,
    position: 'relative',
    overflow: 'hidden',
  },
  cardImg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cardImgPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availDot: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  availDotGreen: { backgroundColor: '#22C55E' },
  availDotRed: { backgroundColor: '#EF4444' },
  heartBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 5,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 20,
  },
  cardLocRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  cardLoc: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },

  // Price — emphasised
  cardPrice: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  cardPriceAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.primary,
  },
  cardPriceSuffix: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.textSecondary,
  },

  // Badges
  badgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  typeBadge: {
    backgroundColor: '#EBF0FF',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  typeBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  genderBadge: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  genderBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },

  // Amenity icons strip
  amenityRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
  amenityIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#EBF0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amenityIconInactive: { backgroundColor: COLORS.grayLight },

  // ── Map
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  mapMarker: {
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  mapMarkerText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  callout: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 8,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  calloutTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  calloutSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },

  // ── Map bottom sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  bsHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.grayBorder,
    alignSelf: 'center',
    marginBottom: 12,
  },
  bsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  bsImage: { width: 72, height: 72, borderRadius: 10 },
  bsImagePlaceholder: {
    backgroundColor: COLORS.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bsInfo: { flex: 1 },
  bsTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  bsLocation: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  bsPrice: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginTop: 4 },
  bsClose: { padding: 4 },
  bsDetailsBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  bsDetailsBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },

  // ── Empty state
  emptyState: { alignItems: 'center', paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  emptySubtitle: { fontSize: 14, color: COLORS.textSecondary },
  emptyResetBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  emptyResetText: { fontSize: 14, color: COLORS.white, fontWeight: '600' },

  // ── Clear Filters FAB (bottom-center pill)
  clearFiltersFab: {
    position: 'absolute',
    bottom: 88,                // above the view-toggle FAB
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#374151', // dark neutral so it doesn't clash with the primary FAB
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 11,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 7,
  },
  clearFiltersFabText: { fontSize: 13, fontWeight: '700', color: COLORS.white },

  // ── View Toggle FAB (round, bottom-right)
  viewToggleFab: {
    position: 'absolute',
    bottom: 28,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 8,
  },
});
