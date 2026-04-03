import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth.store';
import { getBoardingBySlug } from '@/lib/boarding';
import { getBoardingReviewsById, getReviewStats } from '@/lib/review';
import { useSaveBoarding } from '@/hooks/useSaveBoarding';
import { COLORS } from '@/lib/constants';
import type { Boarding, AmenityName } from '@/types/boarding.types';
import type { Review, ReviewStats } from '@/types/review.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_DESCRIPTION_PREVIEW_LENGTH = 200;
const FOOTER_HEIGHT = 74;

const TYPE_LABELS: Record<string, string> = {
  SINGLE_ROOM: 'Single Room',
  SHARED_ROOM: 'Shared Room',
  ANNEX: 'Annex',
  HOUSE: 'House',
};

const GENDER_LABELS: Record<string, string> = {
  MALE: 'Male Only',
  FEMALE: 'Female Only',
  ANY: 'Any Gender',
};

const AMENITY_META: Record<AmenityName, { icon: string; label: string }> = {
  WIFI: { icon: 'wifi-outline', label: 'WiFi' },
  PARKING: { icon: 'car-outline', label: 'Parking' },
  AIR_CONDITIONING: { icon: 'snow-outline', label: 'AC' },
  HOT_WATER: { icon: 'water-outline', label: 'Hot Water' },
  SECURITY: { icon: 'shield-checkmark-outline', label: 'Security' },
  KITCHEN: { icon: 'restaurant-outline', label: 'Kitchen' },
  LAUNDRY: { icon: 'shirt-outline', label: 'Laundry' },
  GENERATOR: { icon: 'flash-outline', label: 'Generator' },
  GYM: { icon: 'barbell-outline', label: 'Gym' },
  SWIMMING_POOL: { icon: 'water-outline', label: 'Swimming Pool' },
  STUDY_ROOM: { icon: 'book-outline', label: 'Study Room' },
  COMMON_AREA: { icon: 'people-outline', label: 'Common Area' },
  BALCONY: { icon: 'home-outline', label: 'Balcony' },
  WATER_TANK: { icon: 'water-outline', label: 'Water Tank' },
};

function StarRow({ rating }: { rating: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Ionicons
          key={s}
          name={s <= Math.round(rating) ? 'star' : 'star-outline'}
          size={13}
          color="#F59E0B"
        />
      ))}
    </View>
  );
}

export default function BoardingDetailsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { user } = useAuthStore();

  const [boarding, setBoarding] = useState<Boarding | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [descExpanded, setDescExpanded] = useState(false);

  const { saved, toggleSave } = useSaveBoarding(boarding?.id ?? '');
  const isOwner = user?.role === 'OWNER';
  const isOwnListing = isOwner && boarding !== null && boarding.ownerId === user?.id;
  const isAvailable = boarding !== null && boarding.currentOccupants < boarding.maxOccupants;

  useEffect(() => {
    if (!slug) return;
    setIsLoading(true);
    getBoardingBySlug(slug)
      .then((r) => {
        setBoarding(r.data.boarding);
        const id = r.data.boarding.id;
        return Promise.all([
          getBoardingReviewsById(id, { limit: 3 }),
          getReviewStats(id),
        ]);
      })
      .then(([reviewsRes, statsRes]) => {
        setReviews(reviewsRes.data.reviews);
        setReviewStats(statsRes.data);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [slug]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!boarding) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.gray} />
          <Text style={styles.notFoundText}>Boarding not found</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.goBackBtn}>
            <Text style={styles.goBackBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const availableAmenities = boarding.amenities.filter((a) => a.name in AMENITY_META);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Image Carousel */}
        <View style={styles.carouselContainer}>
          <FlatList
            data={boarding.images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(img) => img.id}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setActiveImage(idx);
            }}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => router.push(`/boardings/${slug}/gallery` as never)}
              >
                <Image source={{ uri: item.url }} style={styles.carouselImage} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={[styles.carouselImage, styles.carouselPlaceholder]}>
                <Ionicons name="home-outline" size={56} color={COLORS.gray} />
              </View>
            }
          />
          {boarding.images.length > 1 && (
            <View style={styles.paginationDots}>
              {boarding.images.map((_, i) => (
                <View key={i} style={[styles.dot, i === activeImage && styles.dotActive]} />
              ))}
            </View>
          )}
          {/* Back + Share + Save */}
          <View style={styles.carouselOverlay}>
            <TouchableOpacity style={styles.carouselBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={20} color={COLORS.white} />
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={styles.carouselBtn}>
                <Ionicons name="share-outline" size={20} color={COLORS.white} />
              </TouchableOpacity>
              {!isOwner && (
                <TouchableOpacity style={styles.carouselBtn} onPress={toggleSave}>
                  <Ionicons
                    name={saved ? 'heart' : 'heart-outline'}
                    size={20}
                    color={saved ? '#FF6B6B' : COLORS.white}
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>
          {/* Image count badge */}
          {boarding.images.length > 1 && (
            <TouchableOpacity
              style={styles.imageCountBadge}
              onPress={() => router.push(`/boardings/${slug}/gallery` as never)}
            >
              <Ionicons name="images-outline" size={12} color={COLORS.white} />
              <Text style={styles.imageCountText}>{boarding.images.length} photos</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.content}>
          {/* ── Title + Monthly Rent (top of hierarchy) ── */}
          <View style={styles.titleRentRow}>
            <Text style={styles.title} numberOfLines={2}>{boarding.title}</Text>
            <View style={styles.rentBadge}>
              <Text style={styles.rentAmount}>
                LKR {boarding.monthlyRent.toLocaleString()}
              </Text>
              <Text style={styles.rentPer}>/mo</Text>
            </View>
          </View>

          {/* Location */}
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={15} color={COLORS.primary} />
            <Text style={styles.locationText}>{boarding.address}, {boarding.city}</Text>
          </View>
          {boarding.nearUniversity && (
            <View style={styles.uniRow}>
              <Ionicons name="school-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.uniText}>Near {boarding.nearUniversity}</Text>
            </View>
          )}

          {/* Quick badges row */}
          <View style={styles.badgesRow}>
            <View style={styles.badge}>
              <Ionicons name="home-outline" size={12} color={COLORS.primary} />
              <Text style={styles.badgeText}>{TYPE_LABELS[boarding.boardingType]}</Text>
            </View>
            <View style={styles.badge}>
              <Ionicons name="person-outline" size={12} color={COLORS.primary} />
              <Text style={styles.badgeText}>{GENDER_LABELS[boarding.genderPref]}</Text>
            </View>
            <View style={[styles.badge, isAvailable ? styles.badgeAvailable : styles.badgeFull]}>
              <Ionicons
                name={isAvailable ? 'checkmark-circle-outline' : 'close-circle-outline'}
                size={12}
                color={isAvailable ? COLORS.green : COLORS.red}
              />
              <Text style={[styles.badgeText, isAvailable ? styles.badgeAvailableText : styles.badgeFullText]}>
                {isAvailable ? 'Available' : 'Full'}
              </Text>
            </View>
          </View>

          {/* Occupancy bar */}
          <View style={styles.occupancyCard}>
            <View style={styles.occupancyLabelRow}>
              <Text style={styles.occupancyLabel}>Occupancy</Text>
              <Text style={styles.occupancyCount}>
                {boarding.currentOccupants} / {boarding.maxOccupants} occupied
              </Text>
            </View>
            <View style={styles.occupancyBarTrack}>
              <View
                style={[
                  styles.occupancyBarFill,
                  {
                    width: `${Math.min(
                      100,
                      (boarding.currentOccupants / boarding.maxOccupants) * 100,
                    )}%` as never,
                    backgroundColor: isAvailable ? COLORS.primary : COLORS.red,
                  },
                ]}
              />
            </View>
          </View>

          <View style={styles.divider} />

          {/* ── Description (higher in hierarchy) ── */}
          <Text style={styles.sectionTitle}>About This Place</Text>
          <Text
            style={styles.descriptionText}
            numberOfLines={descExpanded ? undefined : 4}
          >
            {boarding.description}
          </Text>
          {boarding.description.length > MAX_DESCRIPTION_PREVIEW_LENGTH && (
            <TouchableOpacity onPress={() => setDescExpanded((v) => !v)} style={styles.expandBtn}>
              <Text style={styles.expandLink}>{descExpanded ? 'Show less' : 'Read more'}</Text>
              <Ionicons
                name={descExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={COLORS.primary}
              />
            </TouchableOpacity>
          )}

          <View style={styles.divider} />

          {/* ── Amenities (available only) ── */}
          {availableAmenities.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Amenities</Text>
              <View style={styles.amenitiesGrid}>
                {availableAmenities.map((amenity) => {
                  const meta = AMENITY_META[amenity.name];
                  return (
                    <View key={amenity.id} style={styles.amenityChip}>
                      <Ionicons name={meta.icon as never} size={16} color={COLORS.primary} />
                      <Text style={styles.amenityChipText}>{meta.label}</Text>
                    </View>
                  );
                })}
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* ── House Rules ── */}
          {boarding.rules.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>House Rules</Text>
              <View style={styles.rulesCard}>
                {boarding.rules.map((ruleItem, idx) => (
                  <View
                    key={ruleItem.id}
                    style={[
                      styles.ruleItem,
                      idx < boarding.rules.length - 1 && styles.ruleItemBorder,
                    ]}
                  >
                    <View style={styles.ruleDot} />
                    <Text style={styles.ruleText}>{ruleItem.rule}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* ── Location ── */}
          <Text style={styles.sectionTitle}>Location</Text>
          <TouchableOpacity
            style={styles.mapCard}
            onPress={() => router.push('/explore/map' as never)}
            activeOpacity={0.85}
          >
            <View style={styles.mapIconWrap}>
              <Ionicons name="map-outline" size={28} color={COLORS.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mapCardTitle}>{boarding.city}, {boarding.district}</Text>
              <Text style={styles.mapCardSub}>{boarding.address}</Text>
            </View>
            <View style={styles.mapCardArrow}>
              <Ionicons name="chevron-forward" size={18} color={COLORS.primary} />
            </View>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* ── Owner Info ── */}
          <Text style={styles.sectionTitle}>Listed By</Text>
          <View style={styles.ownerCard}>
            <View style={styles.ownerAvatar}>
              <Text style={styles.ownerAvatarText}>
                {boarding.owner.firstName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.ownerName}>
                {boarding.owner.firstName} {boarding.owner.lastName}
              </Text>
              <Text style={styles.ownerRole}>Property Owner</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* ── Reviews ── */}
          <View style={styles.reviewsHeader}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            <TouchableOpacity onPress={() => router.push(`/boardings/${slug}/reviews` as never)}>
              <Text style={styles.seeAllLink}>See all</Text>
            </TouchableOpacity>
          </View>
          {reviewStats && reviewStats.totalReviews > 0 && (
            <TouchableOpacity
              style={styles.statsCard}
              activeOpacity={0.85}
              onPress={() => router.push(`/boardings/${slug}/reviews` as never)}
            >
              <View style={styles.statsLeft}>
                <Text style={styles.statsAvg}>{reviewStats.averageRating.toFixed(1)}</Text>
                <StarRow rating={reviewStats.averageRating} />
                <Text style={styles.statsTotal}>{reviewStats.totalReviews} review{reviewStats.totalReviews !== 1 ? 's' : ''}</Text>
              </View>
              <View style={styles.statsRight}>
                {([5, 4, 3, 2, 1] as const).map((star) => {
                  const count = reviewStats.ratingDistribution[star] ?? 0;
                  const pct = reviewStats.totalReviews > 0 ? (count / reviewStats.totalReviews) * 100 : 0;
                  return (
                    <View key={star} style={styles.barRow}>
                      <Text style={styles.barLabel}>{star}</Text>
                      <Ionicons name="star" size={10} color="#F59E0B" />
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${pct}%` as any }]} />
                      </View>
                      <Text style={styles.barCount}>{count}</Text>
                    </View>
                  );
                })}
              </View>
            </TouchableOpacity>
          )}
          {reviews.length === 0 ? (
            <View style={styles.noReviewsContainer}>
              <Text style={styles.noReviewsText}>No reviews yet.</Text>
              {!isOwnListing && (
                <TouchableOpacity
                  style={styles.addReviewBtn}
                  onPress={() => router.push(`/boardings/${slug}/reviews` as never)}
                >
                  <Ionicons name="star-outline" size={15} color={COLORS.primary} />
                  <Text style={styles.addReviewBtnText}>Add Review</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            (() => {
              const topReview = reviews
                .filter((r) => r.comment)
                .sort((a, b) => b.rating - a.rating)[0] ?? reviews[0];
              return (
                <View key={topReview.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <View style={styles.reviewAvatar}>
                      <Text style={styles.reviewAvatarText}>
                        {topReview.reviewerName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.reviewerName}>{topReview.reviewerName}</Text>
                      <StarRow rating={topReview.rating} />
                    </View>
                    <Text style={styles.reviewDate}>
                      {new Date(topReview.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>
                  {topReview.comment ? (
                    <Text style={styles.reviewComment}>{topReview.comment}</Text>
                  ) : null}
                </View>
              );
            })()
          )}
        </View>
      </ScrollView>

      {/* ── Floating Action Buttons ── */}
      <View style={styles.fabContainer}>
        <TouchableOpacity
          style={[styles.fab, styles.fabSecondary]}
          onPress={() => router.push('/explore/map' as never)}
          activeOpacity={0.85}
        >
          <Ionicons name="map-outline" size={20} color={COLORS.primary} />
          <Text style={styles.fabSecondaryText}>Map</Text>
        </TouchableOpacity>
        {!isOwnListing && (
          <TouchableOpacity
            style={[styles.fab, styles.fabPrimary]}
            onPress={() =>
              Alert.alert('Coming Soon', 'Contact Owner feature will be available soon!')
            }
            activeOpacity={0.85}
          >
            <Ionicons name="call-outline" size={20} color={COLORS.white} />
            <Text style={styles.fabPrimaryText}>Contact Owner</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Sticky Footer ── */}
      <View style={styles.footer}>
        {isOwnListing ? (
          <>
            <TouchableOpacity
              style={[styles.footerBtn, styles.footerBtnSecondary]}
              onPress={() => router.push(`/my-listings/${boarding.id}/analytics` as never)}
            >
              <Ionicons name="bar-chart-outline" size={16} color={COLORS.primary} />
              <Text style={styles.footerBtnSecondaryText}>Analytics</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerBtn, styles.footerBtnPrimary]}
              onPress={() => router.push(`/my-listings/${boarding.id}/edit` as never)}
            >
              <Ionicons name="create-outline" size={16} color={COLORS.white} />
              <Text style={styles.footerBtnPrimaryText}>Edit Listing</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {!isOwner && (
              <TouchableOpacity
                style={[styles.footerBtn, styles.footerBtnSecondary]}
                onPress={() =>
                  router.push({
                    pathname: `/boardings/${slug}/schedule-visit` as never,
                    params: { boardingId: boarding.id, boardingTitle: boarding.title },
                  })
                }
              >
                <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                <Text style={styles.footerBtnSecondaryText}>Schedule Visit</Text>
              </TouchableOpacity>
            )}
            {!isOwner && isAvailable && (
              <TouchableOpacity
                style={[styles.footerBtn, styles.footerBtnPrimary]}
                onPress={() =>
                  router.push({
                    pathname: `/boardings/${slug}/apply-reservation` as never,
                    params: {
                      boardingId: boarding.id,
                      boardingTitle: boarding.title,
                      monthlyRent: String(boarding.monthlyRent),
                    },
                  })
                }
              >
                <Ionicons name="checkmark-circle-outline" size={16} color={COLORS.white} />
                <Text style={styles.footerBtnPrimaryText}>Reserve Now</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingBottom: 160 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  notFoundText: { fontSize: 16, color: COLORS.textSecondary, fontWeight: '600' },
  goBackBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
  },
  goBackBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },

  // Carousel
  carouselContainer: { position: 'relative' },
  carouselImage: { width: SCREEN_WIDTH, height: 300 },
  carouselPlaceholder: { backgroundColor: COLORS.grayLight, alignItems: 'center', justifyContent: 'center' },
  paginationDots: {
    position: 'absolute',
    bottom: 14,
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: COLORS.white, width: 20 },
  carouselOverlay: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  carouselBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  imageCountText: { fontSize: 11, color: COLORS.white, fontWeight: '600' },

  // Content
  content: { paddingHorizontal: 18, paddingTop: 18 },

  // Title + Rent
  titleRentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  title: { flex: 1, fontSize: 21, fontWeight: '800', color: COLORS.text, lineHeight: 28 },
  rentBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 2,
  },
  rentAmount: { fontSize: 16, fontWeight: '800', color: COLORS.white },
  rentPer: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginLeft: 2 },

  // Location
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  locationText: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  uniRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  uniText: { fontSize: 12, color: COLORS.textSecondary },

  // Badges
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF0FF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  badgeAvailable: { backgroundColor: '#D1FAE5' },
  badgeFull: { backgroundColor: '#FEE2E2' },
  badgeAvailableText: { color: COLORS.green },
  badgeFullText: { color: COLORS.red },

  // Occupancy
  occupancyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    marginBottom: 4,
  },
  occupancyLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  occupancyLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  occupancyCount: { fontSize: 13, color: COLORS.textSecondary },
  occupancyBarTrack: {
    height: 6,
    backgroundColor: COLORS.grayLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  occupancyBarFill: { height: 6, borderRadius: 4 },

  divider: { height: 1, backgroundColor: COLORS.grayLight, marginVertical: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },

  // Description
  descriptionText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 23 },
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  expandLink: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  // Amenities
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EBF0FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  amenityChipText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },

  // House Rules
  rulesCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
  },
  ruleItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  ruleItemBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.grayLight },
  ruleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    flexShrink: 0,
  },
  ruleText: { fontSize: 14, color: COLORS.textSecondary, flex: 1 },

  // Map card
  mapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
  },
  mapIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EBF0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  mapCardSub: { fontSize: 12, color: COLORS.textSecondary },
  mapCardArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EBF0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Owner card
  ownerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
  },
  ownerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerAvatarText: { color: COLORS.white, fontWeight: '800', fontSize: 18 },
  ownerName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  ownerRole: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  // Reviews
  reviewsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllLink: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  noReviewsText: { fontSize: 14, color: COLORS.textSecondary, fontStyle: 'italic' },
  noReviewsContainer: { gap: 10 },
  addReviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#EBF0FF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addReviewBtnText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  reviewCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  reviewAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewAvatarText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  reviewerName: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 3 },
  reviewDate: { fontSize: 11, color: COLORS.gray },
  reviewComment: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  // Review stats card
  statsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    gap: 16,
  },
  statsLeft: { alignItems: 'center', justifyContent: 'center', gap: 4, minWidth: 56 },
  statsAvg: { fontSize: 32, fontWeight: '800', color: COLORS.text, lineHeight: 36 },
  statsTotal: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  statsRight: { flex: 1, gap: 4, justifyContent: 'center' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  barLabel: { fontSize: 11, color: COLORS.textSecondary, width: 8, textAlign: 'right' },
  barTrack: { flex: 1, height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: '#F59E0B', borderRadius: 3 },
  barCount: { fontSize: 11, color: COLORS.textSecondary, width: 18, textAlign: 'right' },

  // Floating Action Buttons
  fabContainer: {
    position: 'absolute',
    bottom: FOOTER_HEIGHT + 8,
    right: 16,
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 10,
  },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  fabPrimary: { backgroundColor: COLORS.primary },
  fabSecondary: { backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.primary },
  fabPrimaryText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  fabSecondaryText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },

  // Footer
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayBorder,
  },
  footerBtn: {
    flex: 1,
    flexDirection: 'row',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerBtnPrimary: { backgroundColor: COLORS.primary },
  footerBtnSecondary: { borderWidth: 1.5, borderColor: COLORS.primary },
  footerBtnPrimaryText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
  footerBtnSecondaryText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
});
