import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBoardingStore } from '@/store/boarding.store';
import { COLORS } from '@/lib/constants';
import type { BoardingType, GenderPreference } from '@/types/boarding.types';

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

const UNIVERSITIES = [
  'University of Colombo',
  'University of Moratuwa',
  'University of Kelaniya',
  'University of Peradeniya',
  'University of Sri Jayewardenepura',
  'University of Ruhuna',
  'Eastern University',
  'South Eastern University',
  'Rajarata University',
  'Sabaragamuwa University',
  'Wayamba University',
  'Uva Wellassa University',
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

export default function CreateStep1Screen() {
  const { createDraft, setCreateDraft } = useBoardingStore();

  const [title, setTitle] = useState(createDraft.title ?? '');
  const [description, setDescription] = useState(createDraft.description ?? '');
  const [type, setType] = useState<BoardingType | ''>(createDraft.boardingType ?? '');
  const [gender, setGender] = useState<GenderPreference | ''>(createDraft.genderPref ?? '');
  const [maxOccupants, setMaxOccupants] = useState(String(createDraft.maxOccupants ?? '1'));
  const [rent, setRent] = useState(String(createDraft.monthlyRent ?? ''));
  const [university, setUniversity] = useState(createDraft.nearUniversity ?? '');
  const [showUniList, setShowUniList] = useState(false);

  const validate = () => {
    if (!title.trim()) { Alert.alert('Required', 'Please enter a title.'); return false; }
    if (title.trim().length < 10) { Alert.alert('Invalid', 'Title must be at least 10 characters.'); return false; }
    if (!description.trim()) { Alert.alert('Required', 'Please enter a description.'); return false; }
    if (description.trim().length < 30) { Alert.alert('Invalid', 'Description must be at least 30 characters.'); return false; }
    if (!type) { Alert.alert('Required', 'Please select a boarding type.'); return false; }
    if (!gender) { Alert.alert('Required', 'Please select a gender preference.'); return false; }
    if (!rent || isNaN(Number(rent))) { Alert.alert('Required', 'Please enter a valid monthly rent.'); return false; }
    if (Number(rent) < 1000) { Alert.alert('Invalid', 'Monthly rent must be at least LKR 1,000.'); return false; }
    return true;
  };

  const handleNext = () => {
    if (!validate()) return;
    setCreateDraft({
      title: title.trim(),
      description: description.trim(),
      boardingType: type as BoardingType,
      genderPref: gender as GenderPreference,
      maxOccupants: parseInt(maxOccupants, 10) || 1,
      monthlyRent: parseInt(rent, 10),
      nearUniversity: university,
    });
    router.push('/boardings/create/step2' as never);
  };

  const handleSaveDraft = () => {
    setCreateDraft({
      title: title.trim(),
      description: description.trim(),
      boardingType: type,
      genderPref: gender,
      maxOccupants: parseInt(maxOccupants, 10) || 1,
      monthlyRent: parseInt(rent, 10) || 0,
      nearUniversity: university,
    });
    Alert.alert('Progress Saved', 'Your progress has been saved locally. Complete all steps to create your listing.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Listing</Text>
        <View style={{ width: 40 }} />
      </View>

      <ProgressBar step={1} total={5} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Basic Information</Text>

        <Text style={styles.label}>Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. The Hub Residences"
          placeholderTextColor={COLORS.grayBorder}
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          placeholder="Describe your boarding..."
          placeholderTextColor={COLORS.grayBorder}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
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
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setShowUniList((v) => !v)}
        >
          <Text style={university ? styles.dropdownValue : styles.dropdownPlaceholder}>
            {university || 'Select university...'}
          </Text>
          <Ionicons name={showUniList ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.gray} />
        </TouchableOpacity>
        {showUniList && (
          <View style={styles.dropdownMenu}>
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

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.draftBtn} onPress={handleSaveDraft}>
          <Text style={styles.draftBtnText}>Save as Draft</Text>
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
  textarea: { minHeight: 90, paddingTop: 12 },
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
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayBorder,
  },
  draftBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.grayBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  draftBtnText: { fontSize: 15, fontWeight: '600', color: COLORS.text },
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
