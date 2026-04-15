import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { useBoardingStore } from '@/store/boarding.store';
import { useLocationPickerStore } from '@/store/location-picker.store';
import { COLORS } from '@/lib/constants';

const DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Batticaloa', 'Ampara',
  'Trincomalee', 'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa',
  'Badulla', 'Monaragala', 'Ratnapura', 'Kegalle',
];

const SRI_LANKA_LAT_MIN = 5.9;
const SRI_LANKA_LAT_MAX = 9.9;
const SRI_LANKA_LNG_MIN = 79.5;
const SRI_LANKA_LNG_MAX = 81.9;

const SRI_LANKA_INITIAL_REGION = {
  latitude: 6.915137412076758,
  longitude: 79.9731566669944,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

const MAP_CAMERA_BOUNDARY = {
  northEast: { latitude: 7.035961932644662, longitude: 80.19100325001236 },
  southWest: { latitude: 6.8302835564392455, longitude: 79.89361663337401 },
};

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.progressContainer}>
      <Text style={styles.progressLabel}>Step {step} of {total}</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${(step / total) * 100}%` }]} />
      </View>
    </View>
  );
}

export default function CreateStep2Screen() {
  const { createDraft, setCreateDraft } = useBoardingStore();
  const { pending, clearPending } = useLocationPickerStore();

  const [address, setAddress] = useState(createDraft.address ?? '');
  const [city, setCity] = useState(createDraft.city ?? '');
  const [district, setDistrict] = useState(createDraft.district ?? '');
  const [showDistricts, setShowDistricts] = useState(false);
  const [lat, setLat] = useState(String(createDraft.latitude ?? ''));
  const [lng, setLng] = useState(String(createDraft.longitude ?? ''));
  const [isLocating, setIsLocating] = useState(false);
  const mapRef = useRef<MapView>(null);

  // Apply coordinates returned from the location picker
  useFocusEffect(
    useCallback(() => {
      if (pending) {
        setLat(pending.lat.toFixed(6));
        setLng(pending.lng.toFixed(6));
        clearPending();
      }
    }, [pending, clearPending]),
  );

  const handleUseLocation = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to use this feature. Please enable it in your device settings.',
        );
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Low,
      });
      const { latitude, longitude } = location.coords;
      setLat(latitude.toFixed(6));
      setLng(longitude.toFixed(6));
      mapRef.current?.animateToRegion(
        { latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 },
        600,
      );
    } catch {
      Alert.alert('Error', 'Could not retrieve your current location. Please try again.');
    } finally {
      setIsLocating(false);
    }
  };

  const validate = () => {
    if (!address.trim()) { Alert.alert('Required', 'Please enter an address.'); return false; }
    if (!city.trim()) { Alert.alert('Required', 'Please enter a city.'); return false; }
    if (!district) { Alert.alert('Required', 'Please select a district.'); return false; }
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!lat || isNaN(latNum)) { Alert.alert('Required', 'Please set the map location (latitude).'); return false; }
    if (!lng || isNaN(lngNum)) { Alert.alert('Required', 'Please set the map location (longitude).'); return false; }
    if (latNum < SRI_LANKA_LAT_MIN || latNum > SRI_LANKA_LAT_MAX) { Alert.alert('Invalid', `Latitude must be within Sri Lanka (${SRI_LANKA_LAT_MIN} – ${SRI_LANKA_LAT_MAX}).`); return false; }
    if (lngNum < SRI_LANKA_LNG_MIN || lngNum > SRI_LANKA_LNG_MAX) { Alert.alert('Invalid', `Longitude must be within Sri Lanka (${SRI_LANKA_LNG_MIN} – ${SRI_LANKA_LNG_MAX}).`); return false; }
    return true;
  };

  const handleNext = () => {
    if (!validate()) return;
    setCreateDraft({
      address: address.trim(),
      city: city.trim(),
      district,
      latitude: parseFloat(lat),
      longitude: parseFloat(lng),
    });
    router.push('/boardings/create/step3' as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Listing</Text>
        <View style={{ width: 40 }} />
      </View>

      <ProgressBar step={2} total={5} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Location</Text>

        <Text style={styles.label}>Address Line *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 123 Kandy Road"
          placeholderTextColor={COLORS.grayBorder}
          value={address}
          onChangeText={setAddress}
        />

        <Text style={styles.label}>City *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Kelaniya"
          placeholderTextColor={COLORS.grayBorder}
          value={city}
          onChangeText={setCity}
        />

        <Text style={styles.label}>District *</Text>
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

        {/* Map Location Picker */}
        <Text style={styles.label}>Map Location *</Text>
        <Text style={styles.mapHint}>Drag the map to position the pin on your boarding's exact location</Text>
        <View style={styles.mapContainer}>
          {/* Read-only preview shown once a location is set */}
          {lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng)) && (
            <View style={styles.mapViewWrapper}>
              <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                region={{
                  latitude: parseFloat(lat),
                  longitude: parseFloat(lng),
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }}
                cameraBoundary={MAP_CAMERA_BOUNDARY}
                minZoomLevel={14}
                maxZoomLevel={18}
                scrollEnabled={false}
                zoomEnabled={false}
                rotateEnabled={false}
                pitchEnabled={false}
              >
                <Marker coordinate={{ latitude: parseFloat(lat), longitude: parseFloat(lng) }}>
                  <View style={styles.locationPin}>
                    <Ionicons name="location" size={32} color={COLORS.primary} />
                  </View>
                </Marker>
              </MapView>
            </View>
          )}

          {/* Open full-screen picker */}
          <TouchableOpacity
            style={styles.pickOnMapBtn}
            onPress={() =>
              router.push(
                `/location-picker?initialLat=${lat || ''}&initialLng=${lng || ''}` as never,
              )
            }
          >
            <Ionicons name="map-outline" size={16} color={COLORS.primary} />
            <Text style={styles.pickOnMapText}>
              {lat && lng ? 'Change Location on Map' : 'Pick Location on Map'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.locationBtn, isLocating && styles.locationBtnDisabled]}
            onPress={handleUseLocation}
            disabled={isLocating}
          >
            <Ionicons name="locate-outline" size={16} color={isLocating ? COLORS.gray : COLORS.primary} />
            <Text style={[styles.locationBtnText, isLocating && styles.locationBtnTextDisabled]}>
              {isLocating ? 'Getting Location...' : 'Use My Current Location'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.coordsRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Latitude</Text>
            <TextInput
              style={[styles.input, styles.coordInput]}
              placeholder="e.g. 7.0000"
              placeholderTextColor={COLORS.grayBorder}
              value={lat}
              onChangeText={setLat}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Longitude</Text>
            <TextInput
              style={[styles.input, styles.coordInput]}
              placeholder="e.g. 79.9000"
              placeholderTextColor={COLORS.grayBorder}
              value={lng}
              onChangeText={setLng}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.backFooterBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={18} color={COLORS.text} />
          <Text style={styles.backFooterBtnText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextBtnText}>Next</Text>
          <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
        </TouchableOpacity>
      </View>
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
  progressContainer: { padding: 16, backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.grayBorder },
  progressLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 6 },
  progressTrack: { height: 4, backgroundColor: COLORS.grayLight, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  content: { padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    marginBottom: 4,
  },
  dropdownValue: { fontSize: 15, color: COLORS.text },
  dropdownPlaceholder: { fontSize: 15, color: COLORS.grayBorder },
  dropdownMenu: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    marginBottom: 10,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },
  dropdownItemText: { fontSize: 14, color: COLORS.text },
  dropdownItemActive: { color: COLORS.primary, fontWeight: '600' },
  mapContainer: { gap: 8 },
  mapViewWrapper: {
    height: 180,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapHint: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
  locationPin: { alignItems: 'center' },
  pickOnMapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  pickOnMapText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EBF0FF',
    borderRadius: 10,
    padding: 12,
  },
  locationBtnDisabled: { backgroundColor: COLORS.grayLight },
  locationBtnText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  locationBtnTextDisabled: { color: COLORS.gray },
  coordsRow: { flexDirection: 'row', gap: 10 },
  coordInput: { backgroundColor: COLORS.grayLight },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayBorder,
  },
  backFooterBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.grayBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  backFooterBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  nextBtn: {
    flex: 2,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
});
