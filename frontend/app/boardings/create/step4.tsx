import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useBoardingStore } from '@/store/boarding.store';
import { COLORS } from '@/lib/constants';

const MAX_IMAGES = 10;

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

export default function CreateStep4Screen() {
  const { createDraft, setCreateDraft } = useBoardingStore();
  const [imageUris, setImageUris] = useState<string[]>(createDraft.imageUris ?? []);

  const handleAddPhoto = async () => {
    if (imageUris.length >= MAX_IMAGES) {
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
      selectionLimit: MAX_IMAGES - imageUris.length,
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      const newUris = result.assets.map((a) => a.uri);
      setImageUris((prev) => {
        const combined = [...prev, ...newUris];
        return combined.slice(0, MAX_IMAGES);
      });
    }
  };

  const handleDelete = (uri: string) => {
    setImageUris((prev) => prev.filter((u) => u !== uri));
  };

  const handleSetPrimary = (uri: string) => {
    setImageUris((prev) => {
      const idx = prev.indexOf(uri);
      if (idx <= 0) return prev;
      const reordered = [...prev];
      reordered.splice(idx, 1);
      reordered.unshift(uri);
      return reordered;
    });
  };

  const handleNext = () => {
    setCreateDraft({ imageUris });
    router.push('/boardings/create/step5' as never);
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

      <ProgressBar step={4} total={5} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Photos</Text>
        <Text style={styles.subtitle}>Add up to {MAX_IMAGES} photos. The first image will be the primary photo.</Text>

        <View style={styles.imageGrid}>
          {imageUris.map((uri, index) => (
            <View key={uri} style={[styles.imageCell, index === 0 && styles.imageCellPrimary]}>
              <Image source={{ uri }} style={styles.cellImage} />
              {index === 0 && (
                <View style={styles.primaryBadge}>
                  <Text style={styles.primaryBadgeText}>Primary</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDelete(uri)}
              >
                <Ionicons name="close-circle" size={22} color={COLORS.red} />
              </TouchableOpacity>
              {index !== 0 && (
                <TouchableOpacity
                  style={styles.setPrimaryBtn}
                  onPress={() => handleSetPrimary(uri)}
                >
                  <Text style={styles.setPrimaryText}>Set Primary</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}

          {imageUris.length < MAX_IMAGES && (
            <TouchableOpacity style={styles.addCell} onPress={handleAddPhoto} activeOpacity={0.75}>
              <Ionicons name="add" size={32} color={COLORS.primary} />
              <Text style={styles.addCellText}>Add Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        {imageUris.length === 0 && (
          <View style={styles.emptyHint}>
            <Ionicons name="images-outline" size={40} color={COLORS.grayBorder} />
            <Text style={styles.emptyHintText}>At least 1 image required to submit for approval</Text>
          </View>
        )}

        <Text style={styles.countLabel}>{imageUris.length} / {MAX_IMAGES} photos added</Text>
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
  content: { padding: 20, gap: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  subtitle: { fontSize: 14, color: COLORS.textSecondary },
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
  deleteBtn: { position: 'absolute', top: 6, right: 6 },
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
  addCell: {
    width: '47%',
    aspectRatio: 1.3,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.grayBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addCellText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },
  emptyHint: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  emptyHintText: { fontSize: 13, color: COLORS.gray },
  countLabel: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },
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
