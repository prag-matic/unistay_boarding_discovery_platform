import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  getMyListings,
  updateBoarding,
  deactivateBoarding,
  submitBoardingForApproval,
  uploadBoardingImages,
  deleteBoardingImage,
} from '@/lib/boarding';
import type { UpdateBoardingPayload } from '@/lib/boarding';
import { COLORS } from '@/lib/constants';
import type { Boarding, BoardingType, GenderPreference, AmenityName, BoardingImage } from '@/types/boarding.types';

type ApiError = { response?: { data?: { message?: string; details?: { field: string; message: string }[] } } };

const BOARDING_TYPES: { label: string; value: BoardingType }[] = [
  { label: 'Single Room', value: 'SINGLE_ROOM' },
  { label: 'Shared Room', value: 'SHARED_ROOM' },
  { label: 'Annex', value: 'ANNEX' },
  { label: 'House', value: 'HOUSE' },
];

const GENDER_OPTIONS: { label: string; value: GenderPreference }[] = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' },
  { label: 'Any', value: 'ANY' },
];

const AMENITY_OPTIONS: { key: AmenityName; label: string; icon: string }[] = [
  { key: 'WIFI', label: 'WiFi', icon: 'wifi-outline' },
  { key: 'PARKING', label: 'Parking', icon: 'car-outline' },
  { key: 'AIR_CONDITIONING', label: 'Air Conditioning', icon: 'snow-outline' },
  { key: 'HOT_WATER', label: 'Hot Water', icon: 'water-outline' },
  { key: 'SECURITY', label: 'Security', icon: 'shield-checkmark-outline' },
  { key: 'KITCHEN', label: 'Kitchen', icon: 'restaurant-outline' },
  { key: 'LAUNDRY', label: 'Laundry', icon: 'shirt-outline' },
  { key: 'GENERATOR', label: 'Generator', icon: 'flash-outline' },
  { key: 'WATER_TANK', label: 'Water Tank', icon: 'water-outline' },
  { key: 'GYM', label: 'Gym', icon: 'barbell-outline' },
  { key: 'SWIMMING_POOL', label: 'Swimming Pool', icon: 'water-outline' },
  { key: 'STUDY_ROOM', label: 'Study Room', icon: 'library-outline' },
  { key: 'COMMON_AREA', label: 'Common Area', icon: 'people-outline' },
  { key: 'BALCONY', label: 'Balcony', icon: 'home-outline' },
];

const DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Batticaloa', 'Ampara',
  'Trincomalee', 'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa',
  'Badulla', 'Monaragala', 'Ratnapura', 'Kegalle',
];

const UNIVERSITIES = [
  'University of Colombo', 'University of Moratuwa', 'University of Kelaniya',
  'University of Peradeniya', 'University of Sri Jayewardenepura', 'University of Ruhuna',
  'Eastern University', 'South Eastern University', 'Rajarata University',
  'Sabaragamuwa University', 'Wayamba University', 'Uva Wellassa University',
];

const MAX_IMAGES = 10;
const SRI_LANKA_LAT_MIN = 5.9;
const SRI_LANKA_LAT_MAX = 9.9;
const SRI_LANKA_LNG_MIN = 79.5;
const SRI_LANKA_LNG_MAX = 81.9;

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionDivider} />
    </View>
  );
}

export default function EditBoardingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
    const LOG = '[EditBoardingScreen]';

  const [boarding, setBoarding] = useState<Boarding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Basic info
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<BoardingType>('SINGLE_ROOM');
  const [gender, setGender] = useState<GenderPreference>('ANY');
  const [rent, setRent] = useState('');
  const [maxOccupants, setMaxOccupants] = useState('1');
  const [university, setUniversity] = useState('');
  const [showUniList, setShowUniList] = useState(false);

  // Location
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [showDistricts, setShowDistricts] = useState(false);
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  // Amenities
  const [amenities, setAmenities] = useState<AmenityName[]>([]);

  // Rules
  const [rules, setRules] = useState<string[]>([]);
  const [newRule, setNewRule] = useState('');
  const [showRuleInput, setShowRuleInput] = useState(false);

  // Images
  const [existingImages, setExistingImages] = useState<BoardingImage[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const [newImageUris, setNewImageUris] = useState<string[]>([]);

  useEffect(() => {
    console.log(`${LOG} useEffect:start`, { id });

    if (!id) {
      console.warn(`${LOG} Missing route param: id`);
      return;
    }

    console.log(`${LOG} Fetching boarding by id`, { id });
    getMyListings()
      .then((result) => {
        const b = result.data.boardings.find((listing) => listing.id === id);
        if (!b) {
          throw new Error('Listing not found');
        }
        console.log(`${LOG} Fetch success`, {
          boardingId: b?.id,
          status: b?.status,
          amenitiesCount: b?.amenities?.length,
          rulesCount: b?.rules?.length,
          imagesCount: b?.images?.length,
        });

        setBoarding(b);
        // Basic info
        setTitle(b.title);
        setDescription(b.description);
        setType(b.boardingType);
        setGender(b.genderPref);
        setRent(String(b.monthlyRent));
        setMaxOccupants(String(b.maxOccupants));
        setUniversity(b.nearUniversity ?? '');
        // Location
        setAddress(b.address ?? '');
        setCity(b.city);
        setDistrict(b.district);
        setLat(b.latitude != null ? String(b.latitude) : '');
        setLng(b.longitude != null ? String(b.longitude) : '');
        // Amenities
        setAmenities(b.amenities.map((a) => a.name));
        // Rules
        setRules(b.rules.map((r) => r.rule));
        // Images
        setExistingImages(b.images);
      })
      .catch((err: unknown) => {
        console.error(`${LOG} Fetch failed`, err);
        Alert.alert('Error', 'Failed to load the listing. Please try again.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      })
      .finally(() => {
        console.log(`${LOG} useEffect:finished`);
        setIsLoading(false);
      });
  }, [id]);

  const isLocked = boarding?.status === 'ACTIVE';
  const totalImages = existingImages.filter((img) => !deletedImageIds.includes(img.id)).length + newImageUris.length;

  const toggleAmenity = (key: AmenityName) => {
    setAmenities((prev) => prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]);
  };

  const handleUseLocation = () => {
    setLat('6.9271');
    setLng('79.8612');
    Alert.alert('Location Set', 'Using mock location: Colombo, Sri Lanka');
  };

  const handleAddPhoto = async () => {
    if (totalImages >= MAX_IMAGES) {
      Alert.alert('Limit Reached', `You can upload a maximum of ${MAX_IMAGES} images.`);
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - totalImages,
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const uris = result.assets.map((a) => a.uri);
      setNewImageUris((prev) => [...prev, ...uris].slice(0, MAX_IMAGES - existingImages.filter((img) => !deletedImageIds.includes(img.id)).length));
    }
  };

  const handleRemoveExistingImage = (imageId: string) => {
    setDeletedImageIds((prev) => [...prev, imageId]);
  };

  const handleRemoveNewImage = (uri: string) => {
    setNewImageUris((prev) => prev.filter((u) => u !== uri));
  };

  const handleSetPrimaryNew = (uri: string) => {
    setNewImageUris((prev) => {
      const idx = prev.indexOf(uri);
      if (idx <= 0) return prev;
      const reordered = [...prev];
      reordered.splice(idx, 1);
      reordered.unshift(uri);
      return reordered;
    });
  };

  const handleSetPrimaryExisting = (imageId: string) => {
    setExistingImages((prev) => {
      const idx = prev.findIndex((img) => img.id === imageId);
      if (idx <= 0) return prev;
      const reordered = [...prev];
      const [item] = reordered.splice(idx, 1);
      reordered.unshift(item);
      return reordered;
    });
  };

  const handleAddRule = () => {
    if (!newRule.trim()) return;
    setRules((prev) => [...prev, newRule.trim()]);
    setNewRule('');
    setShowRuleInput(false);
  };

    const validate = (): boolean => {
    if (!title.trim()) { console.warn(`${LOG} Validation failed: title missing`); Alert.alert('Required', 'Please enter a title.'); return false; }
    if (title.trim().length < 10) { console.warn(`${LOG} Validation failed: title too short`, { length: title.trim().length }); Alert.alert('Invalid', 'Title must be at least 10 characters.'); return false; }
    if (!description.trim()) { console.warn(`${LOG} Validation failed: description missing`); Alert.alert('Required', 'Please enter a description.'); return false; }
    if (description.trim().length < 30) { console.warn(`${LOG} Validation failed: description too short`, { length: description.trim().length }); Alert.alert('Invalid', 'Description must be at least 30 characters.'); return false; }
    const rentNum = parseInt(rent, 10);
    if (isNaN(rentNum) || rentNum < 1000) { console.warn(`${LOG} Validation failed: invalid rent`, { rent }); Alert.alert('Invalid', 'Monthly rent must be at least LKR 1,000.'); return false; }
    if (!city.trim()) { console.warn(`${LOG} Validation failed: city missing`); Alert.alert('Required', 'Please enter a city.'); return false; }
    if (!district) { console.warn(`${LOG} Validation failed: district missing`); Alert.alert('Required', 'Please select a district.'); return false; }
    if (lat.trim()) {
      const latNum = parseFloat(lat);
      if (isNaN(latNum) || latNum < SRI_LANKA_LAT_MIN || latNum > SRI_LANKA_LAT_MAX) {
        console.warn(`${LOG} Validation failed: invalid latitude`, { lat });
        Alert.alert('Invalid', `Latitude must be within Sri Lanka (${SRI_LANKA_LAT_MIN}–${SRI_LANKA_LAT_MAX}).`);
        return false;
      }
    }
    if (lng.trim()) {
      const lngNum = parseFloat(lng);
      if (isNaN(lngNum) || lngNum < SRI_LANKA_LNG_MIN || lngNum > SRI_LANKA_LNG_MAX) {
        console.warn(`${LOG} Validation failed: invalid longitude`, { lng });
        Alert.alert('Invalid', `Longitude must be within Sri Lanka (${SRI_LANKA_LNG_MIN}–${SRI_LANKA_LNG_MAX}).`);
        return false;
      }
    }
    console.log(`${LOG} Validation passed`);
    return true;
  };

  const doSave = async () => {
    if (!boarding) {
      console.warn(`${LOG} Save aborted: boarding is null`);
      return;
    }
    if (!validate()) return;

    const payload: UpdateBoardingPayload = {
      title: title.trim(),
      description: description.trim(),
      boardingType: type,
      genderPref: gender,
      monthlyRent: parseInt(rent, 10),
      maxOccupants: parseInt(maxOccupants, 10),
      city: city.trim(),
      district,
      amenities,
      rules,
    };
    if (address.trim()) payload.address = address.trim();
    if (lat.trim()) payload.latitude = parseFloat(lat);
    if (lng.trim()) payload.longitude = parseFloat(lng);
    if (university) payload.nearUniversity = university;

    console.log(`${LOG} Save start`, {
      boardingId: boarding.id,
      deletedImageIdsCount: deletedImageIds.length,
      newImageUrisCount: newImageUris.length,
      payload,
    });

    setIsSaving(true);
    try {
      if (isLocked) {
        console.log(`${LOG} Deactivating boarding before edit`, { boardingId: boarding.id });
        await deactivateBoarding(boarding.id);
        console.log(`${LOG} Deactivate success`);
      }

      console.log(`${LOG} Calling updateBoarding`);
      const result = await updateBoarding(boarding.id, payload);
      const updatedId = result.data.boarding.id;
      console.log(`${LOG} updateBoarding success`, { updatedId });

      // Delete removed images
      for (const imgId of deletedImageIds) {
        console.log(`${LOG} Deleting image`, { imgId });
        await deleteBoardingImage(updatedId, imgId);
      }
      if (deletedImageIds.length > 0) {
        console.log(`${LOG} Deleted images done`, { count: deletedImageIds.length });
      }

      // Upload new images
      if (newImageUris.length > 0) {
        console.log(`${LOG} Uploading new images`, { count: newImageUris.length });
        const formData = new FormData();
        newImageUris.forEach((uri, index) => {
          const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
          const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
          formData.append('images', { uri, name: `image_${index}.${ext}`, type: mime } as unknown as Blob);
        });
        await uploadBoardingImages(updatedId, formData);
        console.log(`${LOG} Image upload success`);
      }

      if (isLocked) {
        console.log(`${LOG} Submitting for approval`, { updatedId });
        await submitBoardingForApproval(updatedId);
        console.log(`${LOG} submitBoardingForApproval success`);
        Alert.alert(
          'Resubmitted',
          'Your changes have been saved and the listing has been submitted for re-review.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
      } else {
        Alert.alert('Saved', 'Changes saved successfully.', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (err: unknown) {
      console.error(`${LOG} Save failed`, err);
      const data = (err as ApiError)?.response?.data;
      console.error(`${LOG} Save failed response data`, data);

      const message =
        data?.details?.map((d) => d.message).join('\n') ??
        data?.message ??
        'Failed to save. Please try again.';
      Alert.alert('Error', message);
    } finally {
      console.log(`${LOG} Save finished`);
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    if (isLocked) {
      Alert.alert(
        'Editing Active Listing',
        'Saving changes will temporarily deactivate this listing for re-review. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: doSave },
        ],
      );
      return;
    }
    doSave();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} style={styles.loadingIndicator} />
      </SafeAreaView>
    );
  }

  const visibleExistingImages = existingImages.filter((img) => !deletedImageIds.includes(img.id));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Listing</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLocked && (
        <View style={styles.warningBanner}>
          <Ionicons name="warning-outline" size={18} color={COLORS.orange} />
          <Text style={styles.warningText}>Editing will temporarily deactivate this listing for re-review</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Section 1: Basic Information ── */}
        <SectionHeader title="Basic Information" />

        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. The Hub Residences"
          placeholderTextColor={COLORS.grayBorder}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Describe your boarding..."
          placeholderTextColor={COLORS.grayBorder}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />

        <Text style={styles.label}>Boarding Type *</Text>
        <View style={styles.chipRow}>
          {BOARDING_TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.chip, type === t.value && styles.chipActive]}
              onPress={() => setType(t.value)}
            >
              <Text style={[styles.chipText, type === t.value && styles.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Gender Preference *</Text>
        <View style={styles.chipRow}>
          {GENDER_OPTIONS.map((g) => (
            <TouchableOpacity
              key={g.value}
              style={[styles.chip, gender === g.value && styles.chipActive]}
              onPress={() => setGender(g.value)}
            >
              <Text style={[styles.chipText, gender === g.value && styles.chipTextActive]}>{g.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Max Occupants</Text>
        <View style={styles.stepperRow}>
          <TouchableOpacity
            style={styles.stepperBtn}
            onPress={() => setMaxOccupants((v) => String(Math.max(1, parseInt(v, 10) - 1)))}
          >
            <Ionicons name="remove" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.stepperValue}>{maxOccupants}</Text>
          <TouchableOpacity
            style={styles.stepperBtn}
            onPress={() => setMaxOccupants((v) => String(Math.min(20, parseInt(v, 10) + 1)))}
          >
            <Ionicons name="add" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Monthly Rent (LKR) *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 15000"
          placeholderTextColor={COLORS.grayBorder}
          value={rent}
          onChangeText={setRent}
          keyboardType="number-pad"
        />

        <Text style={styles.label}>Nearest University</Text>
        <TouchableOpacity style={styles.dropdown} onPress={() => { setShowUniList((v) => !v); setShowDistricts(false); }}>
          <Text style={university ? styles.dropdownValue : styles.dropdownPlaceholder}>
            {university || 'Select university...'}
          </Text>
          <Ionicons name={showUniList ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.gray} />
        </TouchableOpacity>
        {showUniList && (
          <View style={styles.dropdownMenu}>
            {university !== '' && (
              <TouchableOpacity style={styles.dropdownItem} onPress={() => { setUniversity(''); setShowUniList(false); }}>
                <Text style={[styles.dropdownItemText, { color: COLORS.gray }]}>— None —</Text>
              </TouchableOpacity>
            )}
            {UNIVERSITIES.map((u) => (
              <TouchableOpacity
                key={u}
                style={styles.dropdownItem}
                onPress={() => { setUniversity(u); setShowUniList(false); }}
              >
                <Text style={[styles.dropdownItemText, university === u && styles.dropdownItemActive]}>{u}</Text>
                {university === u && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* ── Section 2: Location ── */}
        <SectionHeader title="Location" />

        <Text style={styles.label}>Address Line</Text>
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
        <TouchableOpacity style={styles.dropdown} onPress={() => { setShowDistricts((v) => !v); setShowUniList(false); }}>
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

        <Text style={styles.label}>Map Location</Text>
        <View style={styles.mapPlaceholder}>
          <Ionicons name="map-outline" size={36} color={COLORS.gray} />
          <Text style={styles.mapPlaceholderText}>Interactive map coming soon</Text>
        </View>
        <TouchableOpacity style={styles.locationBtn} onPress={handleUseLocation}>
          <Ionicons name="locate-outline" size={16} color={COLORS.primary} />
          <Text style={styles.locationBtnText}>Use My Current Location</Text>
        </TouchableOpacity>

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

        {/* ── Section 3: Amenities ── */}
        <SectionHeader title="Amenities" />

        <View style={styles.amenityGrid}>
          {AMENITY_OPTIONS.map(({ key, label, icon }) => {
            const active = amenities.includes(key);
            return (
              <TouchableOpacity
                key={key}
                style={[styles.amenityChip, active && styles.amenityChipActive]}
                onPress={() => toggleAmenity(key)}
                activeOpacity={0.8}
              >
                <Ionicons name={icon as never} size={18} color={active ? COLORS.primary : COLORS.gray} />
                <Text style={[styles.amenityChipText, active && styles.amenityChipTextActive]}>{label}</Text>
                {active && <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Section 4: House Rules ── */}
        <SectionHeader title="House Rules" />

        {rules.length === 0 && !showRuleInput && (
          <Text style={styles.emptyHint}>No rules added yet. Tap below to add house rules.</Text>
        )}

        {rules.map((rule, index) => (
          <View key={index} style={styles.ruleRow}>
            <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.primary} />
            <Text style={styles.ruleText}>{rule}</Text>
            <TouchableOpacity onPress={() => setRules((prev) => prev.filter((_, i) => i !== index))}>
              <Ionicons name="close-circle" size={20} color={COLORS.red} />
            </TouchableOpacity>
          </View>
        ))}

        {showRuleInput ? (
          <View style={styles.ruleInputRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="e.g. No smoking"
              placeholderTextColor={COLORS.grayBorder}
              value={newRule}
              onChangeText={setNewRule}
              onSubmitEditing={handleAddRule}
              returnKeyType="done"
              autoFocus
            />
            <TouchableOpacity style={styles.ruleAddBtn} onPress={handleAddRule}>
              <Ionicons name="checkmark" size={20} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.ruleCancelBtn} onPress={() => { setNewRule(''); setShowRuleInput(false); }}>
              <Ionicons name="close" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addRuleBtn} onPress={() => setShowRuleInput(true)}>
            <Ionicons name="add-circle-outline" size={20} color={COLORS.primary} />
            <Text style={styles.addRuleBtnText}>Add Rule</Text>
          </TouchableOpacity>
        )}

        {/* ── Section 5: Photos ── */}
        <SectionHeader title="Photos" />
        <Text style={styles.photoHint}>
          {totalImages} / {MAX_IMAGES} photos. First image is the primary photo.
        </Text>

        <View style={styles.imageGrid}>
          {/* Existing images */}
          {visibleExistingImages.map((img, index) => {
            const isPrimary = index === 0 && newImageUris.length === 0;
            return (
              <View key={img.id} style={[styles.imageCell, isPrimary && styles.imageCellPrimary]}>
                <Image source={{ uri: img.url }} style={styles.cellImage} />
                {isPrimary && (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>Primary</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.imageDeleteBtn} onPress={() => handleRemoveExistingImage(img.id)}>
                  <Ionicons name="close-circle" size={22} color={COLORS.red} />
                </TouchableOpacity>
                {!isPrimary && (
                  <TouchableOpacity style={styles.setPrimaryBtn} onPress={() => handleSetPrimaryExisting(img.id)}>
                    <Text style={styles.setPrimaryText}>Set Primary</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* New images */}
          {newImageUris.map((uri, index) => {
            const isPrimary = visibleExistingImages.length === 0 && index === 0;
            return (
              <View key={uri} style={[styles.imageCell, isPrimary && styles.imageCellPrimary]}>
                <Image source={{ uri }} style={styles.cellImage} />
                {isPrimary && (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryBadgeText}>Primary</Text>
                  </View>
                )}
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>New</Text>
                </View>
                <TouchableOpacity style={styles.imageDeleteBtn} onPress={() => handleRemoveNewImage(uri)}>
                  <Ionicons name="close-circle" size={22} color={COLORS.red} />
                </TouchableOpacity>
                {!isPrimary && visibleExistingImages.length === 0 && (
                  <TouchableOpacity style={styles.setPrimaryBtn} onPress={() => handleSetPrimaryNew(uri)}>
                    <Text style={styles.setPrimaryText}>Set Primary</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

          {/* Add button */}
          {totalImages < MAX_IMAGES && (
            <TouchableOpacity style={styles.addImageCell} onPress={handleAddPhoto} activeOpacity={0.75}>
              <Ionicons name="camera-outline" size={32} color={COLORS.primary} />
              <Text style={styles.addImageText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {totalImages === 0 && (
          <View style={styles.noImagesHint}>
            <Ionicons name="images-outline" size={36} color={COLORS.grayBorder} />
            <Text style={styles.noImagesHintText}>Add at least 1 image before submitting for approval</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.saveBtnText}>{isLocked ? 'Save & Resubmit' : 'Save Changes'}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingIndicator: { flex: 1, alignSelf: 'center' },
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  warningText: { fontSize: 13, color: COLORS.orange, fontWeight: '500', flex: 1 },
  content: { padding: 20 },
  // Section headers
  sectionHeader: { marginTop: 24, marginBottom: 4 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: COLORS.text, marginBottom: 6 },
  sectionDivider: { height: 2, backgroundColor: COLORS.primary, borderRadius: 2, width: 40 },
  // Labels and inputs
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6, marginTop: 14 },
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
  textarea: { minHeight: 100, paddingTop: 12 },
  // Chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: COLORS.grayBorder,
    backgroundColor: COLORS.white,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: '#EBF0FF' },
  chipText: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  chipTextActive: { color: COLORS.primary, fontWeight: '700' },
  // Stepper
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  stepperBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: { fontSize: 18, fontWeight: '700', color: COLORS.text, minWidth: 30, textAlign: 'center' },
  // Dropdown
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
    marginBottom: 2,
  },
  dropdownValue: { fontSize: 15, color: COLORS.text },
  dropdownPlaceholder: { fontSize: 15, color: COLORS.grayBorder },
  dropdownMenu: {
    backgroundColor: COLORS.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    marginBottom: 8,
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
  // Map
  mapPlaceholder: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 12,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    marginTop: 6,
  },
  mapPlaceholderText: { fontSize: 13, color: COLORS.textSecondary },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EBF0FF',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
  },
  locationBtnText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  coordsRow: { flexDirection: 'row', gap: 10 },
  coordInput: { backgroundColor: COLORS.grayLight },
  // Amenities grid
  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: COLORS.grayBorder,
  },
  amenityChipActive: { borderColor: COLORS.primary, backgroundColor: '#EBF0FF' },
  amenityChipText: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  amenityChipTextActive: { color: COLORS.primary, fontWeight: '600' },
  // Rules
  emptyHint: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 10 },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
  },
  ruleText: { flex: 1, fontSize: 14, color: COLORS.text },
  ruleInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  ruleAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleCancelBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  addRuleBtnText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  // Photos
  photoHint: { fontSize: 13, color: COLORS.textSecondary, marginTop: 8, marginBottom: 12 },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imageCell: {
    width: '47%',
    aspectRatio: 1.3,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: COLORS.grayBorder,
  },
  imageCellPrimary: { borderColor: COLORS.primary, borderWidth: 2 },
  cellImage: { width: '100%', height: '100%' },
  primaryBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  primaryBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.white },
  newBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: COLORS.green,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  newBadgeText: { fontSize: 10, fontWeight: '700', color: COLORS.white },
  imageDeleteBtn: { position: 'absolute', top: 6, right: 6 },
  setPrimaryBtn: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  setPrimaryText: { fontSize: 10, fontWeight: '600', color: COLORS.white },
  addImageCell: {
    width: '47%',
    aspectRatio: 1.3,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.grayBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  addImageText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  noImagesHint: { alignItems: 'center', gap: 8, paddingVertical: 16 },
  noImagesHintText: { fontSize: 13, color: COLORS.gray, textAlign: 'center' },
  // Footer
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayBorder,
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.grayBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
  saveBtn: {
    flex: 2,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  saveBtnDisabled: { opacity: 0.7 },
});
