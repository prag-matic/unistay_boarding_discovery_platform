import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useLocationPickerStore } from '@/store/location-picker.store';
import { COLORS } from '@/lib/constants';

const INITIAL_REGION: Region = {
  latitude: 6.915137412076758,
  longitude: 79.9731566669944,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

const CAMERA_BOUNDARY = {
  northEast: { latitude: 7.035961932644662, longitude: 80.19100325001236 },
  southWest: { latitude: 6.8302835564392455, longitude: 79.89361663337401 },
};

export default function LocationPickerScreen() {
  const { initialLat, initialLng } = useLocalSearchParams<{
    initialLat?: string;
    initialLng?: string;
  }>();

  const parsedLat = initialLat ? parseFloat(initialLat) : null;
  const parsedLng = initialLng ? parseFloat(initialLng) : null;
  const hasInitial = parsedLat !== null && !isNaN(parsedLat) && parsedLng !== null && !isNaN(parsedLng);

  const startRegion: Region = hasInitial
    ? { latitude: parsedLat!, longitude: parsedLng!, latitudeDelta: 0.02, longitudeDelta: 0.02 }
    : INITIAL_REGION;

  const [center, setCenter] = useState<{ latitude: number; longitude: number }>({
    latitude: startRegion.latitude,
    longitude: startRegion.longitude,
  });
  const [isLocating, setIsLocating] = useState(false);

  const mapRef = useRef<MapView>(null);
  const { setPending } = useLocationPickerStore();

  const handleRegionChangeComplete = (region: Region) => {
    setCenter({ latitude: region.latitude, longitude: region.longitude });
  };

  const handleUseMyLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required. Please enable it in your device settings.',
        );
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      const { latitude, longitude } = location.coords;
      const region: Region = { latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 };
      mapRef.current?.animateToRegion(region, 600);
      setCenter({ latitude, longitude });
    } catch {
      Alert.alert('Error', 'Could not retrieve your current location. Please try again.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleRecenter = () => {
    mapRef.current?.animateToRegion(INITIAL_REGION, 400);
  };

  const handleConfirm = () => {
    setPending(center.latitude, center.longitude);
    router.back();
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={PROVIDER_GOOGLE}
        initialRegion={startRegion}
        cameraBoundary={CAMERA_BOUNDARY}
        minZoomLevel={14}
        maxZoomLevel={18}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
      />

      {/* Centered pin overlay */}
      <View style={styles.pinOverlay} pointerEvents="none">
        <Ionicons name="location" size={40} color={COLORS.primary} />
        <View style={styles.pinShadow} />
      </View>

      {/* Top bar */}
      <SafeAreaView style={styles.topBar}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.coordBadge}>
          <Text style={styles.coordText}>
            {center.latitude.toFixed(6)}, {center.longitude.toFixed(6)}
          </Text>
        </View>
      </SafeAreaView>

      {/* Recenter button */}
      <TouchableOpacity style={styles.recenterBtn} onPress={handleRecenter}>
        <Ionicons name="locate" size={20} color={COLORS.primary} />
      </TouchableOpacity>

      {/* Bottom controls */}
      <SafeAreaView style={styles.bottomBar} edges={['bottom']}>
        <TouchableOpacity
          style={[styles.myLocationBtn, isLocating && styles.myLocationBtnDisabled]}
          onPress={handleUseMyLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color={COLORS.primary} />
          ) : (
            <Ionicons name="locate-outline" size={16} color={COLORS.primary} />
          )}
          <Text style={[styles.myLocationText, isLocating && styles.myLocationTextDisabled]}>
            {isLocating ? 'Getting Location…' : 'Use My Location'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
          <Ionicons name="checkmark" size={18} color={COLORS.white} />
          <Text style={styles.confirmText}>Confirm Location</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Centered pin
  pinOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    // shift up by half the pin height so the tip sits at center
    marginBottom: 40,
  },
  pinShadow: {
    width: 10,
    height: 4,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginTop: -4,
  },

  // Top bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
  },
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
  coordBadge: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  coordText: { fontSize: 13, color: COLORS.text, fontWeight: '500' },

  // Recenter
  recenterBtn: {
    position: 'absolute',
    right: 14,
    bottom: 130,
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

  // Bottom controls
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 10,
  },
  myLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EBF0FF',
    borderRadius: 10,
    padding: 12,
  },
  myLocationBtnDisabled: { backgroundColor: COLORS.grayLight },
  myLocationText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  myLocationTextDisabled: { color: COLORS.gray },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  confirmText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
});
