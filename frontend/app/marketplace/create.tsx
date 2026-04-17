import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { COLORS } from '@/lib/constants';
import {
  createMarketplaceItem,
  deleteMarketplaceImage,
  deleteMarketplaceItem,
  getMarketplaceItemById,
  MARKETPLACE_CATEGORIES,
  updateMarketplaceItem,
  uploadMarketplaceImages,
} from '@/lib/marketplace';
import { useAuthStore } from '@/store/auth.store';
import { useMarketplaceStore } from '@/store/marketplace.store';
import type { MarketplaceAdType, MarketplaceCondition, MarketplaceImage } from '@/types/marketplace.types';

const AD_TYPES: MarketplaceAdType[] = ['SELL', 'GIVEAWAY'];
const CONDITIONS: MarketplaceCondition[] = ['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'POOR'];
const MAX_IMAGES = 4;

type SelectedImage = {
  uri: string;
  name: string;
  type: string;
};

function getFallbackImageType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'heic') return 'image/heic';
  if (ext === 'heif') return 'image/heif';
  return 'image/jpeg';
}

export default function CreateMarketplaceItemScreen() {
  const { id: listingId } = useLocalSearchParams<{ id?: string }>();
  const { user } = useAuthStore();
  const { createDraft, setCreateDraft, clearCreateDraft } = useMarketplaceStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [existingImages, setExistingImages] = useState<MarketplaceImage[]>([]);
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([]);
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);
  const [isLoadingItem, setIsLoadingItem] = useState(false);

  const isEditMode = Boolean(listingId);

  useEffect(() => {
    if (!isEditMode || !listingId) return;

    setIsLoadingItem(true);
    getMarketplaceItemById(listingId)
      .then((response) => {
        const item = response.data.item;
        if (user && item.sellerId !== user.id) {
          Alert.alert('Unauthorized', 'You can only edit your own listing.');
          router.back();
          return;
        }

        setCreateDraft({
          title: item.title,
          description: item.description,
          adType: item.adType,
          category: item.category,
          itemCondition: item.itemCondition,
          price: item.price,
          city: item.city,
          district: item.district,
        });
        setExistingImages(item.images ?? []);
        setRemovedImageIds([]);
        setImages([]);
      })
      .catch(() => {
        Alert.alert('Error', 'Unable to load listing details for editing.');
        router.back();
      })
      .finally(() => setIsLoadingItem(false));
  }, [isEditMode, listingId, setCreateDraft, user]);

  const pickImages = async () => {
    const currentTotalImages = existingImages.length + images.length;
    if (currentTotalImages >= MAX_IMAGES) {
      Alert.alert('Limit Reached', `You can upload a maximum of ${MAX_IMAGES} images.`);
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo library access to add images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_IMAGES - currentTotalImages,
      quality: 0.8,
    });

    if (result.canceled || !result.assets.length) return;

    setImages((prev) => {
      const next = [
        ...prev,
        ...result.assets.map((asset, index) => ({
          uri: asset.uri,
          name: asset.fileName ?? `marketplace_${Date.now()}_${index + 1}.jpg`,
          type: asset.mimeType ?? getFallbackImageType(asset.uri),
        })),
      ];

      const combined = next;
      return combined.slice(0, MAX_IMAGES - existingImages.length);
    });
  };

  const removeImage = (uri: string) => {
    setImages((prev) => prev.filter((item) => item.uri !== uri));
  };

  const removeExistingImage = (imageId: string) => {
    setExistingImages((prev) => prev.filter((img) => img.id !== imageId));
    setRemovedImageIds((prev) => (prev.includes(imageId) ? prev : [...prev, imageId]));
  };

  const canSubmit = useMemo(() => {
    if (!createDraft.title || !createDraft.description || !createDraft.category) return false;
    if (!createDraft.city || !createDraft.district || !createDraft.itemCondition) return false;
    if (createDraft.adType === 'SELL' && !createDraft.price) return false;
    return true;
  }, [createDraft]);

  const submit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const payload = {
        title: createDraft.title as string,
        description: createDraft.description as string,
        adType: (createDraft.adType ?? 'SELL') as MarketplaceAdType,
        category: createDraft.category as string,
        itemCondition: createDraft.itemCondition as MarketplaceCondition,
        price:
          createDraft.adType === 'SELL' && createDraft.price
            ? Number(createDraft.price)
            : undefined,
        city: createDraft.city as string,
        district: createDraft.district as string,
      };

      if (isEditMode && listingId) {
        const response = await updateMarketplaceItem(listingId, payload);

        if (removedImageIds.length > 0) {
          await Promise.all(
            removedImageIds.map((imageId) => deleteMarketplaceImage(listingId, imageId)),
          );
        }

        if (images.length > 0) {
          const formData = new FormData();
          images.forEach((image) => {
            formData.append('images', {
              uri: image.uri,
              name: image.name,
              type: image.type,
            } as never);
          });
          await uploadMarketplaceImages(listingId, formData);
        }

        clearCreateDraft();
        setImages([]);
        setExistingImages([]);
        setRemovedImageIds([]);
        Alert.alert('Success', 'Marketplace listing updated successfully.', [
          {
            text: 'View Listing',
            onPress: () => router.replace(`/marketplace/${response.data.item.id}` as never),
          },
        ]);
        return;
      }

      const response = await createMarketplaceItem(payload);

      if (images.length > 0) {
        const formData = new FormData();
        images.forEach((image) => {
          formData.append('images', {
            uri: image.uri,
            name: image.name,
            type: image.type,
          } as never);
        });
        try {
          await uploadMarketplaceImages(response.data.item.id, formData);
        } catch {
          await deleteMarketplaceItem(response.data.item.id).catch(() => undefined);
          throw new Error('Image upload failed');
        }
      }

      clearCreateDraft();
      setImages([]);
      setExistingImages([]);
      setRemovedImageIds([]);
      Alert.alert('Success', 'Marketplace listing created successfully.', [
        {
          text: 'View Listing',
          onPress: () => router.replace(`/marketplace/${response.data.item.id}` as never),
        },
      ]);
    } catch {
      Alert.alert('Error', isEditMode ? 'Unable to update listing right now.' : 'Unable to create listing right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderChip = <T extends string>(
    value: T,
    selected: T | undefined,
    onPress: (v: T) => void,
  ) => (
    <TouchableOpacity
      key={value}
      style={[styles.chip, selected === value && styles.chipActive]}
      onPress={() => onPress(value)}
    >
      <Text style={[styles.chipText, selected === value && styles.chipTextActive]}>
        {value.replace('_', ' ')}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {isLoadingItem ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.heading}>{isEditMode ? 'Edit Marketplace Listing' : 'Create Marketplace Listing'}</Text>

        <Text style={styles.label}>Photos</Text>
        <Text style={styles.helperText}>
          Add up to {MAX_IMAGES} images. The first image will appear as the cover photo.
        </Text>

        <View style={styles.imageGrid}>
          {existingImages.map((image) => (
            <View key={image.id} style={styles.imageTile}>
              <Image source={{ uri: image.url }} style={styles.imagePreview} />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeExistingImage(image.id)}>
                <Ionicons name="close" size={14} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          ))}

          {images.map((image) => (
            <View key={image.uri} style={styles.imageTile}>
              <Image source={{ uri: image.uri }} style={styles.imagePreview} />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(image.uri)}>
                <Ionicons name="close" size={14} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          ))}

          {existingImages.length + images.length < MAX_IMAGES && (
            <TouchableOpacity style={styles.addImageTile} onPress={pickImages}>
              <Ionicons name="image-outline" size={24} color={COLORS.primary} />
              <Text style={styles.addImageText}>Add Photos</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.label}>Title</Text>
        <TextInput
          value={createDraft.title ?? ''}
          onChangeText={(title) => setCreateDraft({ title })}
          style={styles.input}
          placeholder="What are you offering?"
          placeholderTextColor={COLORS.gray}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          value={createDraft.description ?? ''}
          onChangeText={(description) => setCreateDraft({ description })}
          style={[styles.input, styles.textArea]}
          multiline
          placeholder="Add details, pickup info, and item condition"
          placeholderTextColor={COLORS.gray}
        />

        <Text style={styles.label}>Ad Type</Text>
        <View style={styles.chipRow}>
          {AD_TYPES.map((value) =>
            renderChip(value, createDraft.adType as MarketplaceAdType | undefined, (adType) =>
              setCreateDraft({ adType }),
            ),
          )}
        </View>

        <Text style={styles.label}>Condition</Text>
        <View style={styles.chipRow}>
          {CONDITIONS.map((value) =>
            renderChip(
              value,
              createDraft.itemCondition as MarketplaceCondition | undefined,
              (itemCondition) => setCreateDraft({ itemCondition }),
            ),
          )}
        </View>

        <Text style={styles.label}>Category</Text>
        <TouchableOpacity
          style={styles.dropdown}
          onPress={() => setShowCategoryOptions((prev) => !prev)}
          activeOpacity={0.85}
        >
          <Text style={createDraft.category ? styles.dropdownValue : styles.dropdownPlaceholder}>
            {createDraft.category || 'Select category'}
          </Text>
          <Ionicons
            name={showCategoryOptions ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={COLORS.gray}
          />
        </TouchableOpacity>

        {showCategoryOptions && (
          <View style={styles.dropdownMenu}>
            {MARKETPLACE_CATEGORIES.map((category) => {
              const isActive = createDraft.category === category;
              return (
                <TouchableOpacity
                  key={category}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setCreateDraft({ category });
                    setShowCategoryOptions(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemActive]}>
                    {category}
                  </Text>
                  {isActive && <Ionicons name="checkmark" size={16} color={COLORS.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {createDraft.adType !== 'GIVEAWAY' && (
          <>
            <Text style={styles.label}>Price (LKR)</Text>
            <TextInput
              value={createDraft.price ? String(createDraft.price) : ''}
              onChangeText={(price) => setCreateDraft({ price: Number(price) || undefined })}
              style={styles.input}
              placeholder="Enter selling price"
              keyboardType="numeric"
              placeholderTextColor={COLORS.gray}
            />
          </>
        )}

        <Text style={styles.label}>City</Text>
        <TextInput
          value={createDraft.city ?? ''}
          onChangeText={(city) => setCreateDraft({ city })}
          style={styles.input}
          placeholder="City"
          placeholderTextColor={COLORS.gray}
        />

        <Text style={styles.label}>District</Text>
        <TextInput
          value={createDraft.district ?? ''}
          onChangeText={(district) => setCreateDraft({ district })}
          style={styles.input}
          placeholder="District"
          placeholderTextColor={COLORS.gray}
        />

        <TouchableOpacity
          style={[styles.submitBtn, (!canSubmit || isSubmitting) && styles.submitBtnDisabled]}
          disabled={!canSubmit || isSubmitting}
          onPress={submit}
        >
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitBtnText}>{isEditMode ? 'Save Changes' : 'Create Listing'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 28 },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heading: { fontSize: 22, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  label: { marginTop: 12, marginBottom: 6, fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' },
  helperText: { marginBottom: 8, fontSize: 12, color: COLORS.textSecondary },
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 6 },
  imageTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.grayLight,
  },
  imagePreview: { width: '100%', height: '100%' },
  removeImageBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageTile: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: COLORS.primary,
    backgroundColor: '#EBF0FF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  addImageText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  dropdown: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownValue: { color: COLORS.text, fontSize: 14 },
  dropdownPlaceholder: { color: COLORS.gray, fontSize: 14 },
  dropdownMenu: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.grayBorder,
  },
  dropdownItemText: { color: COLORS.text, fontSize: 14 },
  dropdownItemActive: { color: COLORS.primary, fontWeight: '700' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    backgroundColor: COLORS.white,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.grayLight,
  },
  chipText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: COLORS.primary },
  submitBtn: {
    marginTop: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: 13,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
});
