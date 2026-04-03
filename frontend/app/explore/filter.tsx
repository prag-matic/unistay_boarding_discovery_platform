import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  PanResponder,
  LayoutChangeEvent,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBoardingStore } from '@/store/boarding.store';
import { COLORS } from '@/lib/constants';
import type { BoardingType, GenderPreference, BoardingFilters, AmenityName } from '@/types/boarding.types';

// ─── Constants ─────────────────────────────────────────────────────────────────

// NOTE: DISTRICTS and location-related state kept here for future re-enabling
// const DISTRICTS = [
//   'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
//   'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Batticaloa', 'Ampara',
//   'Trincomalee', 'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa',
//   'Badulla', 'Monaragala', 'Ratnapura', 'Kegalle',
// ];

const BOARDING_TYPES: { label: string; value: BoardingType }[] = [
  { label: 'Single Room', value: 'SINGLE_ROOM' },
  { label: 'Shared Room', value: 'SHARED_ROOM' },
  { label: 'Annex', value: 'ANNEX' },
  { label: 'House', value: 'HOUSE' },
];

const GENDER_OPTIONS: { label: string; value: GenderPreference }[] = [
  { label: 'Male Only', value: 'MALE' },
  { label: 'Female Only', value: 'FEMALE' },
  { label: 'Any Gender', value: 'ANY' },
];

const AMENITY_OPTIONS: { key: AmenityName; label: string; icon: string }[] = [
  { key: 'WIFI', label: 'WiFi', icon: 'wifi-outline' },
  { key: 'PARKING', label: 'Parking', icon: 'car-outline' },
  { key: 'AIR_CONDITIONING', label: 'A/C', icon: 'snow-outline' },
  { key: 'HOT_WATER', label: 'Hot Water', icon: 'water-outline' },
  { key: 'SECURITY', label: 'Security', icon: 'shield-checkmark-outline' },
  { key: 'KITCHEN', label: 'Kitchen', icon: 'restaurant-outline' },
  { key: 'LAUNDRY', label: 'Laundry', icon: 'shirt-outline' },
  { key: 'GENERATOR', label: 'Generator', icon: 'flash-outline' },
  { key: 'WATER_TANK', label: 'Water Tank', icon: 'beaker-outline' },
  { key: 'GYM', label: 'Gym', icon: 'barbell-outline' },
  { key: 'SWIMMING_POOL', label: 'Pool', icon: 'water-outline' },
  { key: 'STUDY_ROOM', label: 'Study Room', icon: 'book-outline' },
  { key: 'COMMON_AREA', label: 'Common Area', icon: 'people-outline' },
  { key: 'BALCONY', label: 'Balcony', icon: 'sunny-outline' },
];

const PRICE_MIN = 0;
const PRICE_MAX = 100000;
const PRICE_STEP = 1000;
const THUMB_SIZE = 26;
const TRACK_H = 4;

// ─── Dual Range Slider ─────────────────────────────────────────────────────────
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
  // trackW drives re-renders so thumb positions update; trackWRef lets the
  // PanResponder handlers (created once) always read the latest width.
  const [trackW, setTrackW] = useState(0);
  const trackWRef = useRef(0);

  // Refs to track latest values inside PanResponder (avoid stale closures)
  const lowRef = useRef(low);
  const highRef = useRef(high);
  lowRef.current = low;
  highRef.current = high;

  // Drag-start positions (pixels from track left edge)
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
      onPanResponderMove: (_, ges) => {
        if (trackWRef.current === 0) return;
        const newPx = clamp(
          lowStartPx.current + ges.dx,
          0,
          valToPx(highRef.current) - THUMB_SIZE,
        );
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
      onPanResponderMove: (_, ges) => {
        if (trackWRef.current === 0) return;
        const newPx = clamp(
          highStartPx.current + ges.dx,
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

  // Compute pixel positions from current track width (numeric, no type casts)
  const lowPx = trackW > 0 ? ((low - min) / (max - min)) * trackW : 0;
  const highPx = trackW > 0 ? ((high - min) / (max - min)) * trackW : trackW;

  return (
    <View>
      {/* Track container — thumbs are absolutely positioned inside */}
      <View style={styles.sliderTrackContainer} onLayout={onTrackLayout}>
        {/* Grey base track */}
        <View style={styles.sliderTrack} />
        {/* Coloured selected range */}
        {trackW > 0 && (
          <View
            style={[
              styles.sliderRange,
              { left: lowPx, width: highPx - lowPx },
            ]}
          />
        )}
        {/* Low thumb */}
        {trackW > 0 && (
          <View
            {...lowPan.panHandlers}
            style={[styles.sliderThumb, { left: lowPx - THUMB_SIZE / 2 }]}
          />
        )}
        {/* High thumb */}
        {trackW > 0 && (
          <View
            {...highPan.panHandlers}
            style={[styles.sliderThumb, { left: highPx - THUMB_SIZE / 2 }]}
          />
        )}
      </View>
      {/* Value labels */}
      <View style={styles.sliderLabels}>
        <Text style={styles.sliderLabel}>LKR {low.toLocaleString()}</Text>
        <Text style={styles.sliderLabel}>LKR {high.toLocaleString()}</Text>
      </View>
    </View>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function FilterScreen() {
  const { filters, setFilters, clearFilters } = useBoardingStore();
  const scrollRef = useRef<ScrollView>(null);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  // Price state (slider)
  const [minRent, setMinRent] = useState(filters.minRent ?? PRICE_MIN);
  const [maxRent, setMaxRent] = useState(filters.maxRent ?? PRICE_MAX);

  // Other filter state
  // NOTE: district / city kept as state for future re-enabling
  // const [district, setDistrict] = useState(filters.district ?? '');
  // const [city, setCity] = useState(filters.city ?? '');
  const [boardingType, setBoardingType] = useState<BoardingType | undefined>(filters.boardingType);
  const [genderPref, setGenderPref] = useState<GenderPreference | undefined>(filters.genderPref);
  const [selectedAmenities, setSelectedAmenities] = useState<AmenityName[]>(filters.amenities ?? []);
  // NOTE: nearUniversity kept as state for future re-enabling
  // const [nearUniversity, setNearUniversity] = useState(filters.nearUniversity ?? '');

  const toggleAmenity = (key: AmenityName) => {
    setSelectedAmenities((prev) =>
      prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key],
    );
  };

  const handleClearAll = () => {
    // setDistrict('');
    // setCity('');
    setMinRent(PRICE_MIN);
    setMaxRent(PRICE_MAX);
    setBoardingType(undefined);
    setGenderPref(undefined);
    setSelectedAmenities([]);
    // setNearUniversity('');
    clearFilters();
  };

  const handleShowResults = () => {
    const newFilters: BoardingFilters = {};
    // if (district) newFilters.district = district;
    // if (city) newFilters.city = city;
    if (minRent > PRICE_MIN) newFilters.minRent = minRent;
    if (maxRent < PRICE_MAX) newFilters.maxRent = maxRent;
    if (boardingType) newFilters.boardingType = boardingType;
    if (genderPref) newFilters.genderPref = genderPref;
    if (selectedAmenities.length) newFilters.amenities = selectedAmenities;
    // if (nearUniversity) newFilters.nearUniversity = nearUniversity;
    setFilters(newFilters);
    router.back();
  };

  const activeCount =
    (minRent > PRICE_MIN ? 1 : 0) +
    (maxRent < PRICE_MAX ? 1 : 0) +
    (boardingType ? 1 : 0) +
    (genderPref ? 1 : 0) +
    selectedAmenities.length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Filters</Text>
        <TouchableOpacity onPress={handleClearAll}>
          <Text style={styles.clearBtn}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={scrollEnabled}
      >

        {/* ── LOCATION (commented out — re-enable when location search is ready) ──
        <Text style={styles.sectionTitle}>Location</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setShowDistricts((v) => !v)}
        >
          <Text style={district ? styles.dropdownValue : styles.dropdownPlaceholder}>
            {district || 'Select District'}
          </Text>
          <Ionicons name={showDistricts ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.gray} />
        </TouchableOpacity>
        {showDistricts && (
          <View style={styles.dropdownMenu}>
            <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
              {DISTRICTS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={styles.dropdownItem}
                  onPress={() => { setDistrict(d); setShowDistricts(false); }}
                >
                  <Text style={[styles.dropdownItemText, district === d && styles.dropdownItemActive]}>{d}</Text>
                  {district === d && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
        <TextInput
          style={styles.input}
          placeholder="City (e.g. Kelaniya)"
          placeholderTextColor={COLORS.grayBorder}
          value={city}
          onChangeText={setCity}
        />
        ── END LOCATION ── */}

        {/* ── Price Range ── */}
        <Text style={styles.sectionTitle}>Price Range (LKR / month)</Text>
        <View style={styles.priceRangeCard}>
          <DualRangeSlider
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={PRICE_STEP}
            low={minRent}
            high={maxRent}
            onLowChange={setMinRent}
            onHighChange={setMaxRent}
            onDragStart={() => setScrollEnabled(false)}
            onDragEnd={() => setScrollEnabled(true)}
          />
        </View>

        {/* ── Boarding Type ── */}
        <Text style={styles.sectionTitle}>Boarding Type</Text>
        <View style={styles.chipRow}>
          {BOARDING_TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.pill, boardingType === t.value && styles.pillActive]}
              onPress={() => setBoardingType(boardingType === t.value ? undefined : t.value)}
            >
              <Text style={[styles.pillText, boardingType === t.value && styles.pillTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Gender Preference ── */}
        <Text style={styles.sectionTitle}>Gender Preference</Text>
        <View style={styles.chipRow}>
          {GENDER_OPTIONS.map((g) => (
            <TouchableOpacity
              key={g.value}
              style={[styles.pill, genderPref === g.value && styles.pillActive]}
              onPress={() => setGenderPref(genderPref === g.value ? undefined : g.value)}
            >
              <Text style={[styles.pillText, genderPref === g.value && styles.pillTextActive]}>
                {g.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Amenities (togglable pills) ── */}
        <Text style={styles.sectionTitle}>Amenities</Text>
        <View style={styles.chipRow}>
          {AMENITY_OPTIONS.map(({ key, label, icon }) => {
            const active = selectedAmenities.includes(key);
            return (
              <TouchableOpacity
                key={key}
                style={[styles.amenityPill, active && styles.amenityPillActive]}
                onPress={() => toggleAmenity(key)}
              >
                <Ionicons
                  name={icon as never}
                  size={14}
                  color={active ? COLORS.white : COLORS.textSecondary}
                />
                <Text style={[styles.amenityPillText, active && styles.amenityPillTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── NEAR UNIVERSITY (commented out — re-enable when proximity search is ready) ──
        <Text style={styles.sectionTitle}>Near University</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. University of Colombo"
          placeholderTextColor={COLORS.grayBorder}
          value={nearUniversity}
          onChangeText={setNearUniversity}
        />
        ── END NEAR UNIVERSITY ── */}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.clearAllBtn} onPress={handleClearAll}>
          <Text style={styles.clearAllBtnText}>Clear All</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.showResultsBtn} onPress={handleShowResults}>
          <Text style={styles.showResultsBtnText}>
            Show Results{activeCount > 0 ? ` (${activeCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayBorder,
  },
  closeBtn: { width: 36 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: COLORS.text },
  clearBtn: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },

  // Content
  content: { padding: 20 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    marginTop: 20,
  },

  // Price range card
  priceRangeCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  // Dual slider
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

  // Pills (boarding type + gender)
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: COLORS.grayBorder,
    backgroundColor: COLORS.white,
  },
  pillActive: { borderColor: COLORS.primary, backgroundColor: '#EBF0FF' },
  pillText: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  pillTextActive: { color: COLORS.primary, fontWeight: '700' },

  // Amenity pills
  amenityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1.5,
    borderColor: COLORS.grayBorder,
    backgroundColor: COLORS.white,
  },
  amenityPillActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  amenityPillText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  amenityPillTextActive: { color: COLORS.white, fontWeight: '600' },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayBorder,
  },
  clearAllBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.grayBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearAllBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  showResultsBtn: {
    flex: 2,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showResultsBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
});
