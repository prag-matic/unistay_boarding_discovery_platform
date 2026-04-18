import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { getBoardingBySlug } from '@/lib/boarding';
import { COLORS } from '@/lib/constants';
import type { Boarding } from '@/types/boarding.types';

const DEFAULT_LATITUDE = 6.915137412076758;
const DEFAULT_LONGITUDE = 79.9731566669944;

const INITIAL_REGION = {
  latitude: DEFAULT_LATITUDE,
  longitude: DEFAULT_LONGITUDE,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

export default function MapViewScreen() {
  const { selectedSlug } = useLocalSearchParams<{ selectedSlug?: string }>();
  const [boarding, setBoarding] = useState<Boarding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    let mounted = true;

    if (!selectedSlug) {
      setBoarding(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    getBoardingBySlug(selectedSlug)
      .then((response) => {
        if (!mounted) return;
        setBoarding(response.data.boarding);
      })
      .catch(() => {
        if (!mounted) return;
        setBoarding(null);
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [selectedSlug]);

  useEffect(() => {
    if (!boarding || boarding.latitude == null || boarding.longitude == null) return;

    mapRef.current?.animateToRegion(
      {
        latitude: boarding.latitude,
        longitude: boarding.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      },
      350,
    );
  }, [boarding]);

  const markerCoordinate = useMemo(
    () => ({
      latitude: boarding?.latitude ?? DEFAULT_LATITUDE,
      longitude: boarding?.longitude ?? DEFAULT_LONGITUDE,
    }),
    [boarding],
  );

  const recenterToBoarding = () => {
    const latitude = boarding?.latitude ?? DEFAULT_LATITUDE;
    const longitude = boarding?.longitude ?? DEFAULT_LONGITUDE;

    mapRef.current?.animateToRegion(
      {
        latitude,
        longitude,
        latitudeDelta: boarding ? 0.008 : 0.02,
        longitudeDelta: boarding ? 0.008 : 0.02,
      },
      280,
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={INITIAL_REGION}
        minZoomLevel={14}
        maxZoomLevel={18}
        showsUserLocation
        showsMyLocationButton
      >
        {boarding && (
          <Marker
            coordinate={markerCoordinate}
            title={boarding.title}
            description={`${boarding.city}, ${boarding.district}`}
            pinColor={COLORS.red}
            zIndex={1000}
          />
        )}
      </MapView>

      <TouchableOpacity style={styles.recenterBtn} onPress={recenterToBoarding} activeOpacity={0.85}>
        <Ionicons name="locate" size={20} color={COLORS.primary} />
      </TouchableOpacity>

      {isLoading ? (
        <View style={styles.statusCard}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.statusText}>Loading location…</Text>
        </View>
      ) : !boarding ? (
        <View style={styles.statusCard}>
          <Ionicons name="alert-circle-outline" size={16} color={COLORS.gray} />
          <Text style={styles.statusText}>Selected boarding not found</Text>
        </View>
      ) : (
        <View style={styles.bottomSheet}>
          <View style={styles.bottomSheetHandle} />
          <View style={styles.previewRow}>
            {boarding.images[0] ? (
              <Image source={{ uri: boarding.images[0].url }} style={styles.previewImage} />
            ) : (
              <View style={[styles.previewImage, styles.previewImagePlaceholder]}>
                <Ionicons name="home-outline" size={24} color={COLORS.gray} />
              </View>
            )}
            <View style={styles.previewInfo}>
              <Text style={styles.previewTitle} numberOfLines={1}>{boarding.title}</Text>
              <Text style={styles.previewAddress} numberOfLines={1}>{boarding.address}</Text>
              <Text style={styles.previewPrice}>
                {boarding.monthlyRent ? `LKR ${boarding.monthlyRent.toLocaleString()}/mo` : '—'}
              </Text>
            </View>
          </View>

          <View style={styles.drawerActions}>
            <TouchableOpacity
              style={styles.goBackBtn}
              onPress={() => router.back()}
              activeOpacity={0.88}
            >
              <Ionicons name="arrow-back" size={16} color={COLORS.primary} />
              <Text style={styles.goBackBtnText}>Go Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.viewDetailsBtn}
              onPress={() => router.push(`/boardings/${boarding.slug}` as never)}
              activeOpacity={0.88}
            >
              <Text style={styles.viewDetailsBtnText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  map: { flex: 1 },

  recenterBtn: {
    position: 'absolute',
    right: 14,
    bottom: 128,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },

  statusCard: {
    position: 'absolute',
    top: 62,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  statusText: { fontSize: 12, color: COLORS.text, fontWeight: '600' },

  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 24,
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
  previewImagePlaceholder: {
    backgroundColor: COLORS.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewInfo: { flex: 1 },
  previewTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  previewAddress: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  previewPrice: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginTop: 4 },
  drawerActions: { flexDirection: 'row', gap: 10 },
  goBackBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
  },
  goBackBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  viewDetailsBtn: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  viewDetailsBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
});
