import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Callout, UrlTile } from 'react-native-maps';
import { searchBoardings } from '@/lib/boarding';
import { COLORS } from '@/lib/constants';
import type { Boarding } from '@/types/boarding.types';

// Sri Lanka centre as the default region
const INITIAL_REGION = {
  latitude: 7.8731,
  longitude: 80.7718,
  latitudeDelta: 4.0,
  longitudeDelta: 4.0,
};

export default function MapViewScreen() {
  const [selected, setSelected] = useState<Boarding | null>(null);
  const [query, setQuery] = useState('');
  const [allBoardings, setAllBoardings] = useState<Boarding[]>([]);

  useEffect(() => {
    searchBoardings({ size: 100 })
      .then((r) => setAllBoardings(r.data.boarding))
      .catch(() => {});
  }, []);

  const filtered = query
    ? allBoardings.filter(
        (b) =>
          b.title.toLowerCase().includes(query.toLowerCase()) ||
          b.city.toLowerCase().includes(query.toLowerCase()),
      )
    : allBoardings;

  return (
    <SafeAreaView style={styles.container}>
      <MapView
        style={styles.map}
        mapType="none"
        initialRegion={INITIAL_REGION}
        showsUserLocation
        showsMyLocationButton
      >
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
        {filtered.map((boarding) => (
          <Marker
            key={boarding.id}
            coordinate={{ latitude: boarding.latitude ?? 7.8731, longitude: boarding.longitude ?? 80.7718 }}
            onPress={() => setSelected(selected?.id === boarding.id ? null : boarding)}
          >
            <View style={styles.marker}>
              <Text style={styles.markerText}>
                {boarding.monthlyRent ? `LKR ${(boarding.monthlyRent / 1000).toFixed(0)}k` : '—'}
              </Text>
            </View>
            <Callout tooltip>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle} numberOfLines={1}>
                  {boarding.title}
                </Text>
                <Text style={styles.calloutSub}>
                  {boarding.city}, {boarding.district}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Top overlay: Back + Search + Buttons */}
      <View style={styles.topOverlay}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={COLORS.gray} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search on map..."
            placeholderTextColor={COLORS.grayBorder}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push('/explore/filter' as never)}
        >
          <Ionicons name="options-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.back()}
        >
          <Ionicons name="list-outline" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Bottom sheet preview */}
      {selected && (
        <View style={styles.bottomSheet}>
          <View style={styles.bottomSheetHandle} />
          <View style={styles.previewRow}>
            {selected.images[0] ? (
              <Image source={{ uri: selected.images[0].url }} style={styles.previewImage} />
            ) : (
              <View style={[styles.previewImage, styles.previewImagePlaceholder]}>
                <Ionicons name="home-outline" size={24} color={COLORS.gray} />
              </View>
            )}
            <View style={styles.previewInfo}>
              <Text style={styles.previewTitle} numberOfLines={1}>{selected.title}</Text>
              <Text style={styles.previewAddress} numberOfLines={1}>{selected.city}, {selected.district}</Text>
              <Text style={styles.previewPrice}>
                {selected.monthlyRent ? `LKR ${selected.monthlyRent.toLocaleString()}/mo` : '—'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSelected(null)} style={styles.closePreview}>
              <Ionicons name="close" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.viewDetailsBtn}
            onPress={() => router.push(`/boardings/${selected.slug}` as never)}
          >
            <Text style={styles.viewDetailsBtnText}>View Details</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  // Markers
  marker: {
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
  markerText: { fontSize: 12, fontWeight: '700', color: COLORS.white },

  // Callout
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

  // Top overlay
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },

  // Bottom sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  bottomSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.grayBorder,
    alignSelf: 'center',
    marginBottom: 12,
  },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  previewImage: { width: 72, height: 72, borderRadius: 10 },
  previewImagePlaceholder: { backgroundColor: COLORS.grayLight, alignItems: 'center', justifyContent: 'center' },
  previewInfo: { flex: 1 },
  previewTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  previewAddress: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  previewPrice: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginTop: 4 },
  closePreview: { padding: 4 },
  viewDetailsBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewDetailsBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
});

