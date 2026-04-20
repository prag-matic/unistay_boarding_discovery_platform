import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBoardingStore } from '@/store/boarding.store';
import {
  createBoarding,
  uploadBoardingImages,
  submitBoardingForApproval,
} from '@/lib/boarding';
import type { CreateBoardingPayload } from '@/lib/boarding';
import { COLORS } from '@/lib/constants';
import type { BoardingType, GenderPreference } from '@/types/boarding.types';

const DEFAULT_UNIVERSITY = 'SLIIT';
const RULE_SUGGESTIONS = [
  'No smoking inside rooms',
  'Quiet hours after 10:00 PM',
  'Visitors allowed only in common areas',
  'Keep shared kitchen clean after use',
  'Monthly rent must be paid on time',
  'Report maintenance issues promptly',
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

async function buildAndUploadImages(boardingId: string, imageUris: string[]) {
  if (imageUris.length === 0) return;
  const formData = new FormData();
  imageUris.forEach((uri, index) => {
    const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    formData.append('images', {
      uri,
      name: `image_${index}.${ext}`,
      type: mime,
    } as unknown as Blob);
  });
  await uploadBoardingImages(boardingId, formData);
}

type ApiError = { response?: { data?: { message?: string; details?: { field: string; message: string }[] } } };

function extractErrorMessage(err: unknown): string {
  const data = (err as ApiError)?.response?.data;
  if (!data) return 'Something went wrong. Please try again.';
  const { details, message } = data;
  if (details && details.length > 0) {
    return details.map((d) => d.message).join('\n');
  }
  return message ?? 'Something went wrong. Please try again.';
}

export default function CreateStep5Screen() {
  const { createDraft, setCreateDraft, clearCreateDraft } = useBoardingStore();
  const [rules, setRules] = useState<string[]>(createDraft.rules ?? []);
  const [showRuleInput, setShowRuleInput] = useState(false);
  const [newRule, setNewRule] = useState('');
  const [successVisible, setSuccessVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isDuplicateRule = (value: string) =>
    rules.some((rule) => rule.toLowerCase() === value.toLowerCase());

  const handleAddRule = () => {
    const value = newRule.trim();
    if (!value) return;
    if (isDuplicateRule(value)) {
      Alert.alert('Duplicate Rule', 'This rule is already added.');
      return;
    }
    setRules((prev) => [...prev, value]);
    setNewRule('');
    setShowRuleInput(false);
  };

  const handleSelectSuggestion = (suggestion: string) => {
    if (isDuplicateRule(suggestion)) return;
    setRules((prev) => [...prev, suggestion]);
  };

  const handleDeleteRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const buildPayload = (): CreateBoardingPayload => {
    const university = createDraft.nearUniversity?.trim() || DEFAULT_UNIVERSITY;
    const payload: CreateBoardingPayload = {
      title: createDraft.title ?? '',
      description: createDraft.description ?? '',
      city: createDraft.city ?? '',
      district: createDraft.district ?? '',
      monthlyRent: createDraft.monthlyRent ?? 0,
      boardingType: createDraft.boardingType as BoardingType,
      genderPref: createDraft.genderPref as GenderPreference,
      latitude: createDraft.latitude ?? 0,
      longitude: createDraft.longitude ?? 0,
      maxOccupants: createDraft.maxOccupants ?? 1,
      amenities: createDraft.amenities ?? [],
      rules,
      nearUniversity: university,
    };
    const addr = createDraft.address?.trim();
    if (addr) payload.address = addr;
    return payload;
  };

  const validateDraft = () => {
    if (!createDraft.title?.trim()) {
      Alert.alert('Incomplete', 'Please go back and enter a title (Step 1).');
      return false;
    }
    if ((createDraft.title?.trim().length ?? 0) < 10) {
      Alert.alert('Incomplete', 'Title must be at least 10 characters (Step 1).');
      return false;
    }
    if (!createDraft.description?.trim()) {
      Alert.alert('Incomplete', 'Please go back and enter a description (Step 1).');
      return false;
    }
    if ((createDraft.description?.trim().length ?? 0) < 30) {
      Alert.alert('Incomplete', 'Description must be at least 30 characters (Step 1).');
      return false;
    }
    if (!createDraft.boardingType) {
      Alert.alert('Incomplete', 'Please go back and select a boarding type (Step 1).');
      return false;
    }
    if (!createDraft.genderPref) {
      Alert.alert('Incomplete', 'Please go back and select a gender preference (Step 1).');
      return false;
    }
    if (!createDraft.monthlyRent || createDraft.monthlyRent < 1000) {
      Alert.alert('Incomplete', 'Per-person monthly rent must be at least LKR 1,000 (Step 1).');
      return false;
    }
    if (!createDraft.city?.trim()) {
      Alert.alert('Incomplete', 'Please go back and enter a city (Step 2).');
      return false;
    }
    if (!createDraft.district?.trim()) {
      Alert.alert('Incomplete', 'Please go back and select a district (Step 2).');
      return false;
    }
    const lat = createDraft.latitude;
    const lng = createDraft.longitude;
    if (lat === undefined || lat === null || isNaN(lat)) {
      Alert.alert('Incomplete', 'Please go back and set the map location (Step 2).');
      return false;
    }
    if (lng === undefined || lng === null || isNaN(lng)) {
      Alert.alert('Incomplete', 'Please go back and set the map location (Step 2).');
      return false;
    }
    return true;
  };

  const handleSaveDraft = async () => {
    setCreateDraft({ rules });
    if (!validateDraft()) return;

    setIsSubmitting(true);
    try {
      const result = await createBoarding(buildPayload());
      const boardingId = result.data.boarding.id;
      await buildAndUploadImages(boardingId, createDraft.imageUris ?? []);
      Alert.alert('Draft Saved', 'Your listing has been saved as a draft.', [
        { text: 'OK', onPress: () => { clearCreateDraft(); router.push('/my-listings' as never); } },
      ]);
    } catch (err: unknown) {
      Alert.alert('Error', extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    setCreateDraft({ rules });
    if (!validateDraft()) return;

    if ((createDraft.imageUris ?? []).length === 0) {
      Alert.alert('Images Required', 'Please go back and add at least 1 photo (Step 4) before submitting for approval.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createBoarding(buildPayload());
      const boardingId = result.data.boarding.id;
      await buildAndUploadImages(boardingId, createDraft.imageUris ?? []);
      await submitBoardingForApproval(boardingId);
      setSuccessVisible(true);
    } catch (err: unknown) {
      Alert.alert('Error', extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const TYPE_LABELS: Record<string, string> = {
    SINGLE_ROOM: 'Single Room', SHARED_ROOM: 'Shared Room',
    ANNEX: 'Annex', HOUSE: 'House',
  };
  const GENDER_LABELS: Record<string, string> = {
    MALE: 'Male',
    FEMALE: 'Female',
    ANY: 'Any',
  };

  const imageUris = createDraft.imageUris ?? [];
  const addressParts = (createDraft.address ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const addressLine1 = addressParts[0] ?? '';
  const addressLine2 = addressParts.slice(1).join(', ');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Listing</Text>
        <View style={{ width: 40 }} />
      </View>

      <ProgressBar step={5} total={5} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* House Rules */}
        <Text style={styles.sectionTitle}>House Rules</Text>
        <Text style={styles.helperText}>Add rules that help students understand expectations before booking.</Text>

        {rules.length === 0 && (
          <View style={styles.ruleEmptyState}>
            <Ionicons name="information-circle-outline" size={16} color={COLORS.primary} />
            <Text style={styles.ruleEmptyStateText}>No rules added yet. Add at least a few clear rules for residents.</Text>
          </View>
        )}

        {rules.map((rule, i) => (
          <View key={i} style={styles.ruleItem}>
            <Ionicons name="ellipse" size={6} color={COLORS.primary} />
            <Text style={styles.ruleText}>{rule}</Text>
            <TouchableOpacity onPress={() => handleDeleteRule(i)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Ionicons name="trash-outline" size={16} color={COLORS.red} />
            </TouchableOpacity>
          </View>
        ))}

        {showRuleInput ? (
          <View style={styles.ruleInputRow}>
            <TextInput
              style={styles.ruleInput}
              placeholder="e.g. No smoking on premises"
              placeholderTextColor={COLORS.grayBorder}
              value={newRule}
              onChangeText={setNewRule}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddRule}
            />
            <TouchableOpacity style={styles.ruleAddBtn} onPress={handleAddRule}>
              <Ionicons name="checkmark" size={20} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowRuleInput(false); setNewRule(''); }}>
              <Ionicons name="close" size={20} color={COLORS.gray} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.addRuleBtn} onPress={() => setShowRuleInput(true)}>
            <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
            <Text style={styles.addRuleBtnText}>+ Add Rule</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.suggestionTitle}>Quick Suggestions</Text>
        <View style={styles.suggestionWrap}>
          {RULE_SUGGESTIONS.map((suggestion) => {
            const selected = isDuplicateRule(suggestion);
            return (
              <TouchableOpacity
                key={suggestion}
                style={[styles.suggestionChip, selected && styles.suggestionChipSelected]}
                onPress={() => handleSelectSuggestion(suggestion)}
                disabled={selected}
              >
                <Text style={[styles.suggestionChipText, selected && styles.suggestionChipTextSelected]}>
                  {suggestion}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Review Summary */}
        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Review Summary</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{createDraft.title || 'Listing title not set'}</Text>
          <Text style={styles.summaryDescription}>
            {createDraft.description?.trim() || '—'}
          </Text>
          <View style={styles.summaryMetaWrap}>
            <View style={styles.summaryMetaChip}>
              <Text style={styles.summaryMetaChipText}>
                {createDraft.boardingType ? TYPE_LABELS[createDraft.boardingType] : 'Type not set'}
              </Text>
            </View>
            <View style={styles.summaryMetaChip}>
              <Text style={styles.summaryMetaChipText}>
                {createDraft.genderPref ? GENDER_LABELS[createDraft.genderPref] : 'Gender not set'}
              </Text>
            </View>
            <View style={styles.summaryMetaChipPrimary}>
              <Text style={styles.summaryMetaChipPrimaryText}>
                {createDraft.monthlyRent ? `LKR ${createDraft.monthlyRent.toLocaleString()} / person` : 'Rent not set'}
              </Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>University</Text>
            <Text style={styles.summaryValue}>{createDraft.nearUniversity || DEFAULT_UNIVERSITY}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Address Line 1</Text>
            <Text style={styles.summaryValue}>{addressLine1 || '—'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Address Line 2</Text>
            <Text style={styles.summaryValue}>{addressLine2 || '—'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>City / District</Text>
            <Text style={styles.summaryValue}>
              {[createDraft.city, createDraft.district].filter(Boolean).join(', ') || '—'}
            </Text>
          </View>

          <Text style={styles.summarySectionLabel}>Amenities</Text>
          <View style={styles.amenitySummaryRow}>
            {(createDraft.amenities ?? []).length > 0 ? (
              (createDraft.amenities ?? []).map((amenity) => (
                <View key={amenity} style={styles.amenityChip}>
                  <Text style={styles.amenityChipText}>
                    {amenity
                      .replace(/_/g, ' ')
                      .toLowerCase()
                      .replace(/\b\w/g, (char) => char.toUpperCase())}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.summaryValue}>None selected</Text>
            )}
          </View>

          {/* Image thumbnails */}
          {imageUris.length > 0 && (
            <>
              <Text style={styles.summarySectionLabel}>Photos ({imageUris.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.thumbRow}>
                  {imageUris.map((uri) => (
                    <Image key={uri} source={{ uri }} style={styles.thumb} />
                  ))}
                </View>
              </ScrollView>
            </>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerRow}>
          <TouchableOpacity
            style={[styles.draftBtn, isSubmitting && styles.btnDisabled]}
            onPress={handleSaveDraft}
            disabled={isSubmitting}
          >
            <Text style={styles.draftBtnText}>Save Draft</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.footerRow}>
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitBtnText}>Submit for Approval</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Success Modal */}
      <Modal visible={successVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.successIcon}>
              <Ionicons name="checkmark-circle" size={56} color={COLORS.green} />
            </View>
            <Text style={styles.modalTitle}>Submitted!</Text>
            <Text style={styles.modalSubtitle}>
              Your listing has been submitted for approval. You will be notified once it goes live.
            </Text>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => {
                setSuccessVisible(false);
                clearCreateDraft();
                router.push('/my-listings' as never);
              }}
            >
              <Text style={styles.modalBtnText}>Go to My Listings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, marginBottom: 16 },
  helperText: { fontSize: 13, color: COLORS.textSecondary, marginTop: -4, marginBottom: 10, lineHeight: 18 },
  ruleEmptyState: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EBF0FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primary,
    padding: 10,
    marginBottom: 8,
  },
  ruleEmptyStateText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight,
  },
  ruleText: { flex: 1, fontSize: 14, color: COLORS.text },
  ruleInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  ruleInput: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
  },
  ruleAddBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRuleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  addRuleBtnText: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },
  suggestionTitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 4, marginBottom: 8 },
  suggestionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  suggestionChip: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  suggestionChipSelected: { backgroundColor: '#EBF0FF', borderColor: COLORS.primary },
  suggestionChipText: { fontSize: 12, color: COLORS.text },
  suggestionChipTextSelected: { color: COLORS.primary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: COLORS.grayLight, marginVertical: 20 },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    overflow: 'hidden',
    padding: 18,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 0,
  },
  summaryTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text, lineHeight: 24 },
  summaryMetaWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summaryMetaChip: {
    backgroundColor: COLORS.grayLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  summaryMetaChipText: { fontSize: 12, color: COLORS.text, fontWeight: '600' },
  summaryMetaChipPrimary: {
    backgroundColor: '#EBF0FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  summaryMetaChipPrimaryText: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  summaryDivider: { height: 1, backgroundColor: COLORS.grayLight, marginTop: 2, marginBottom: 2 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  summaryLabel: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },
  summaryValue: { fontSize: 14, fontWeight: '600', color: COLORS.text, flex: 1.4, textAlign: 'right' },
  summarySectionLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8, marginBottom: 2 },
  summaryDescription: { fontSize: 14, color: COLORS.text, lineHeight: 21 },
  amenitySummaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  amenityChip: { backgroundColor: '#EBF0FF', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  amenityChipText: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  thumbRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  thumb: { width: 64, height: 64, borderRadius: 8 },
  footer: {
    gap: 10,
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayBorder,
  },
  footerRow: {
    flexDirection: 'row',
    gap: 12,
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
  submitBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
  btnDisabled: { opacity: 0.6 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 30 },
  modalCard: { backgroundColor: COLORS.white, borderRadius: 20, padding: 30, alignItems: 'center', gap: 12, width: '100%' },
  successIcon: { marginBottom: 4 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
  modalSubtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  modalBtn: { marginTop: 8, backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  modalBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
});
