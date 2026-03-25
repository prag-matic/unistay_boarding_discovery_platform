import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBoardingStore } from '@/store/boarding.store';
import { COLORS } from '@/lib/constants';
import type { AmenityName } from '@/types/boarding.types';

const AMENITY_OPTIONS: { key: AmenityName; label: string; icon: string; description: string }[] = [
  { key: 'WIFI', label: 'WiFi', icon: 'wifi-outline', description: 'High-speed internet connection' },
  { key: 'PARKING', label: 'Parking', icon: 'car-outline', description: 'Dedicated vehicle parking available' },
  { key: 'AIR_CONDITIONING', label: 'Air Conditioning', icon: 'snow-outline', description: 'Air conditioning in rooms' },
  { key: 'HOT_WATER', label: 'Hot Water', icon: 'water-outline', description: '24/7 hot water supply' },
  { key: 'SECURITY', label: 'Security', icon: 'shield-checkmark-outline', description: '24/7 security service' },
  { key: 'KITCHEN', label: 'Kitchen', icon: 'restaurant-outline', description: 'Shared or private kitchen access' },
  { key: 'LAUNDRY', label: 'Laundry', icon: 'shirt-outline', description: 'Laundry facilities available' },
  { key: 'GENERATOR', label: 'Generator', icon: 'flash-outline', description: 'Backup power generator' },
  { key: 'WATER_TANK', label: 'Water Tank', icon: 'water-outline', description: 'Overhead water storage tank' },
  { key: 'GYM', label: 'Gym', icon: 'barbell-outline', description: 'Fitness center on premises' },
  { key: 'SWIMMING_POOL', label: 'Swimming Pool', icon: 'water-outline', description: 'Swimming pool available' },
  { key: 'STUDY_ROOM', label: 'Study Room', icon: 'library-outline', description: 'Quiet study room available' },
  { key: 'COMMON_AREA', label: 'Common Area', icon: 'people-outline', description: 'Shared common lounge area' },
  { key: 'BALCONY', label: 'Balcony', icon: 'home-outline', description: 'Private or shared balcony' },
];

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

export default function CreateStep3Screen() {
  const { createDraft, setCreateDraft } = useBoardingStore();

  const [selectedAmenities, setSelectedAmenities] = useState<AmenityName[]>(
    createDraft.amenities ?? [],
  );

  const toggle = (key: AmenityName) => {
    setSelectedAmenities((prev) =>
      prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key],
    );
  };

  const handleNext = () => {
    setCreateDraft({ amenities: selectedAmenities });
    router.push('/boardings/create/step4' as never);
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

      <ProgressBar step={3} total={5} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Amenities</Text>
        <Text style={styles.subtitle}>Select all amenities available at your property</Text>

        {AMENITY_OPTIONS.map(({ key, label, icon, description }) => {
          const active = selectedAmenities.includes(key);
          return (
            <TouchableOpacity
              key={key}
              style={[styles.amenityCard, active && styles.amenityCardActive]}
              activeOpacity={0.85}
              onPress={() => toggle(key)}
            >
              <View style={[styles.amenityIcon, active && styles.amenityIconActive]}>
                <Ionicons name={icon as never} size={24} color={active ? COLORS.white : COLORS.gray} />
              </View>
              <View style={styles.amenityInfo}>
                <Text style={[styles.amenityLabel, active && styles.amenityLabelActive]}>{label}</Text>
                <Text style={styles.amenityDesc}>{description}</Text>
              </View>
              <View style={[styles.amenityCheck, active && styles.amenityCheckActive]}>
                {active && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
              </View>
            </TouchableOpacity>
          );
        })}
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
  content: { padding: 20, gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  amenityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: COLORS.grayBorder,
  },
  amenityCardActive: { borderColor: COLORS.primary, backgroundColor: '#F5F8FF' },
  amenityIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.grayLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amenityIconActive: { backgroundColor: COLORS.primary },
  amenityInfo: { flex: 1 },
  amenityLabel: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  amenityLabelActive: { color: COLORS.primary },
  amenityDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  amenityCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.grayBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amenityCheckActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
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
