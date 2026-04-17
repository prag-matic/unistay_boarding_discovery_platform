import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { COLORS } from '@/lib/constants';
import { deleteMarketplaceItem, getMarketplaceItemById, reportMarketplaceItem } from '@/lib/marketplace';
import { useAuthStore } from '@/store/auth.store';
import type { MarketplaceItem, MarketplaceReportReason } from '@/types/marketplace.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const REPORT_REASON_OPTIONS: { value: MarketplaceReportReason; label: string }[] = [
  { value: 'SPAM', label: 'Spam' },
  { value: 'SCAM', label: 'Scam' },
  { value: 'PROHIBITED_ITEM', label: 'Prohibited item' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'OTHER', label: 'Other' },
];

export default function MarketplaceItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReporting, setIsReporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [selectedReportReason, setSelectedReportReason] = useState<MarketplaceReportReason>('OTHER');
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!id) return;

    setIsLoading(true);
    getMarketplaceItemById(id)
      .then((response) => setItem(response.data.item))
      .catch(() => setItem(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleOpenReportDialog = () => {
    if (!item || !id) return;

    if (user && item.sellerId === user.id) {
      Alert.alert('Cannot report', 'You cannot report your own listing.');
      return;
    }

    setSelectedReportReason('OTHER');
    setIsReportModalVisible(true);
  };

  const handleReport = async () => {
    if (!item || !id) return;

    setIsReporting(true);
    try {
      await reportMarketplaceItem(id, selectedReportReason);
      setIsReportModalVisible(false);
      Alert.alert('Reported', 'Thank you. The listing has been reported.');
    } catch {
      Alert.alert('Error', 'Unable to submit the report right now.');
    } finally {
      setIsReporting(false);
    }
  };

  const handleDelete = () => {
    if (!item || !id) return;

    Alert.alert('Delete Listing', 'Are you sure you want to delete this advertisement?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setIsDeleting(true);
          try {
            await deleteMarketplaceItem(id);
            Alert.alert('Deleted', 'Your listing has been deleted.', [
              { text: 'OK', onPress: () => router.replace('/(tabs)/marketplace' as never) },
            ]);
          } catch {
            Alert.alert('Error', 'Unable to delete this listing right now.');
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.loadingWrap}>
        <Text style={styles.errorTitle}>Listing not found</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const image = item.images[0];
  const sellerName = item.seller
    ? `${item.seller.firstName} ${item.seller.lastName}`.trim()
    : 'Seller';
  const isOwner = user?.id === item.sellerId;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Image Gallery Carousel */}
        <View style={styles.carouselContainer}>
          {item.images.length === 0 ? (
            <View style={[styles.carouselImage, styles.carouselPlaceholder]}>
              <Ionicons name="cube-outline" size={56} color={COLORS.gray} />
            </View>
          ) : (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                setActiveImage(idx);
              }}
              scrollEventThrottle={16}
            >
              {item.images.map((img) => (
                <View key={img.id} style={{ width: SCREEN_WIDTH }}>
                  <Image source={{ uri: img.url }} style={styles.carouselImage} resizeMode="cover" />
                </View>
              ))}
            </ScrollView>
          )}
          {/* Pagination Dots */}
          {item.images.length > 1 && (
            <View style={styles.paginationDots}>
              {item.images.map((_, i) => (
                <View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
              ))}
            </View>
          )}
          {/* Back + Share Overlay */}
          <View style={styles.carouselOverlay}>
            <TouchableOpacity style={styles.carouselBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={COLORS.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.carouselBtn}>
              <Ionicons name="share-outline" size={20} color={COLORS.white} />
            </TouchableOpacity>
          </View>
          {/* Image Count Badge */}
          {item.images.length > 1 && (
            <View style={styles.imageCountBadge}>
              <Ionicons name="images-outline" size={12} color={COLORS.white} />
              <Text style={styles.imageCountText}>{item.images.length} photos</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* Title + Price Badge */}
          <View style={styles.titlePriceRow}>
            <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
            {item.adType === 'SELL' && item.price ? (
              <View style={styles.priceBadge}>
                <Text style={styles.priceAmount}>LKR {item.price.toLocaleString()}</Text>
              </View>
            ) : (
              <View style={styles.freeBadge}>
                <Text style={styles.freeBadgeText}>Free</Text>
              </View>
            )}
          </View>

          {/* Location Row */}
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={15} color={COLORS.primary} />
            <Text style={styles.locationText}>{item.city}, {item.district}</Text>
          </View>

          {/* Quick Info Pills */}
          <View style={styles.pillsRow}>
            <View style={styles.pill}>
              <Ionicons name="pricetag-outline" size={12} color={COLORS.primary} />
              <Text style={styles.pillText}>{item.category}</Text>
            </View>
            <View style={styles.pill}>
              <Ionicons name="checkbox-outline" size={12} color={COLORS.primary} />
              <Text style={styles.pillText}>{item.itemCondition.replace(/_/g, ' ')}</Text>
            </View>
            <View style={[styles.pill, item.adType === 'SELL' ? styles.pillSell : styles.pillGiveaway]}>
              <Ionicons 
                name={item.adType === 'SELL' ? 'cart-outline' : 'gift-outline'} 
                size={12} 
                color={item.adType === 'SELL' ? COLORS.primary : '#10B981'}
              />
              <Text style={[styles.pillText, item.adType === 'SELL' ? {} : { color: '#10B981' }]}>
                {item.adType}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Description */}
          <Text style={styles.sectionTitle}>About Item</Text>
          <Text style={styles.descriptionText}>{item.description}</Text>

          <View style={styles.divider} />

          {/* Item Details Card */}
          <View style={styles.detailsCard}>
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <Ionicons name="document-text-outline" size={18} color={COLORS.primary} />
                <View>
                  <Text style={styles.detailLabel}>Category</Text>
                  <Text style={styles.detailValue}>{item.category}</Text>
                </View>
              </View>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <Ionicons name="checkmark-done-circle-outline" size={18} color={COLORS.primary} />
                <View>
                  <Text style={styles.detailLabel}>Condition</Text>
                  <Text style={styles.detailValue}>{item.itemCondition.replace(/_/g, ' ')}</Text>
                </View>
              </View>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailRow}>
              <View style={styles.detailLeft}>
                <Ionicons name="location-sharp" size={18} color={COLORS.primary} />
                <View>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{item.city}, {item.district}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Seller Card */}
          <Text style={[styles.sectionTitle, styles.sellerSectionTitle]}>Seller Information</Text>
          <View style={styles.sellerCard}>
            <View style={styles.sellerAvatar}>
              <Text style={styles.sellerAvatarText}>{sellerName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sellerName}>{sellerName}</Text>
              {item.seller?.phone ? (
                <View style={styles.sellerPhoneRow}>
                  <Ionicons name="call-outline" size={12} color={COLORS.textSecondary} />
                  <Text style={styles.sellerPhone}>{item.seller.phone}</Text>
                </View>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        {isOwner ? (
          <>
            <TouchableOpacity
              style={styles.messageBtn}
              onPress={() => router.push(`/marketplace/create?id=${item.id}` as never)}
            >
              <Ionicons name="create-outline" size={16} color={COLORS.white} />
              <Text style={styles.messageBtnText}>Edit Listing</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteBtn} disabled={isDeleting} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={16} color={COLORS.red} />
              <Text style={styles.deleteBtnText}>{isDeleting ? 'Deleting...' : 'Delete'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={styles.messageBtn}
              onPress={() => router.push('/(tabs)/messages' as never)}
            >
              <Ionicons name="chatbubble-outline" size={16} color={COLORS.white} />
              <Text style={styles.messageBtnText}>Message Seller</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.reportBtn} disabled={isReporting} onPress={handleOpenReportDialog}>
              <Ionicons name="flag-outline" size={16} color={COLORS.red} />
              <Text style={styles.reportBtnText}>{isReporting ? 'Reporting...' : 'Report'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <Modal
        visible={isReportModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Report Listing</Text>
            <Text style={styles.modalSubTitle}>Select a reason for this report</Text>

            <View style={styles.reasonList}>
              {REPORT_REASON_OPTIONS.map((option) => {
                const isSelected = selectedReportReason === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[styles.reasonOption, isSelected && styles.reasonOptionSelected]}
                    onPress={() => setSelectedReportReason(option.value)}
                  >
                    <Text style={[styles.reasonOptionText, isSelected && styles.reasonOptionTextSelected]}>
                      {option.label}
                    </Text>
                    {isSelected ? <Ionicons name="checkmark" size={16} color={COLORS.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setIsReportModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, isReporting && styles.modalSubmitBtnDisabled]}
                disabled={isReporting}
                onPress={handleReport}
              >
                <Text style={styles.modalSubmitText}>{isReporting ? 'Submitting...' : 'Submit Report'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 120 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  /* Image Carousel Styles */
  carouselContainer: {
    width: SCREEN_WIDTH,
    height: 320,
    backgroundColor: COLORS.grayLight,
    position: 'relative',
  },
  carouselImage: {
    width: SCREEN_WIDTH,
    height: 320,
    backgroundColor: COLORS.grayLight,
  },
  carouselPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  paginationDots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dotActive: {
    backgroundColor: COLORS.white,
  },
  carouselOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  carouselBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  imageCountText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  /* Title + Price Section */
  titlePriceRow: {
    marginTop: 16,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: { flex: 1, fontSize: 22, fontWeight: '800', color: COLORS.text, lineHeight: 28 },
  priceBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  priceAmount: { fontSize: 16, fontWeight: '800', color: COLORS.white },
  freeBadge: {
    backgroundColor: '#10B98126',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  freeBadgeText: { fontSize: 14, fontWeight: '700', color: '#10B981' },
  /* Location Row */
  locationRow: {
    marginTop: 10,
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: { fontSize: 14, color: COLORS.textSecondary },
  /* Pills Row */
  pillsRow: {
    marginTop: 12,
    marginHorizontal: 16,
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.grayLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillSell: {
    backgroundColor: COLORS.grayLight,
  },
  pillGiveaway: {
    backgroundColor: '#10B98126',
  },
  pillText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  /* Divider */
  divider: {
    marginTop: 16,
    marginBottom: 16,
    height: 1,
    backgroundColor: COLORS.grayBorder,
    marginHorizontal: 16,
  },
  /* Section Title */
  sectionTitle: { marginHorizontal: 16, fontSize: 16, fontWeight: '700', color: COLORS.text },
  /* Description */
  descriptionText: { marginTop: 8, marginHorizontal: 16, fontSize: 14, lineHeight: 22, color: COLORS.text },
  /* Details Card */
  detailsCard: {
    marginHorizontal: 16,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    overflow: 'hidden',
  },
  detailRow: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailLabel: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  detailValue: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginTop: 2 },
  detailDivider: {
    height: 1,
    backgroundColor: COLORS.grayBorder,
    marginHorizontal: 14,
  },
  /* Seller Card */
  sellerSectionTitle: {
    marginBottom: 10,
  },
  sellerCard: {
    marginHorizontal: 16,
    marginBottom: 4,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sellerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EBF0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sellerAvatarText: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  sellerName: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  sellerPhoneRow: { marginTop: 4, flexDirection: 'row', alignItems: 'center', gap: 6 },
  sellerPhone: { fontSize: 13, color: COLORS.textSecondary },
  bottomBar: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayBorder,
    backgroundColor: COLORS.white,
  },
  messageBtn: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  messageBtnText: { color: COLORS.white, fontWeight: '700' },
  reportBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.red,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  reportBtnText: { color: COLORS.red, fontWeight: '700' },
  deleteBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.red,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  deleteBtnText: { color: COLORS.red, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  modalSheet: {
    borderRadius: 14,
    backgroundColor: COLORS.white,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  modalSubTitle: { marginTop: 4, fontSize: 13, color: COLORS.textSecondary },
  reasonList: { marginTop: 12, gap: 8 },
  reasonOption: {
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reasonOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.grayLight,
  },
  reasonOptionText: { fontSize: 14, color: COLORS.text },
  reasonOptionTextSelected: { color: COLORS.primary, fontWeight: '700' },
  modalActions: { marginTop: 14, flexDirection: 'row', gap: 10 },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  modalCancelText: { color: COLORS.text, fontWeight: '600' },
  modalSubmitBtn: {
    flex: 1.5,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    paddingVertical: 11,
    alignItems: 'center',
  },
  modalSubmitBtnDisabled: { opacity: 0.65 },
  modalSubmitText: { color: COLORS.white, fontWeight: '700' },
  errorTitle: { fontSize: 18, color: COLORS.text, fontWeight: '700' },
  backBtn: {
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backBtnText: { color: COLORS.white, fontWeight: '700' },
});
