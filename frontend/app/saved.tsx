import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSavedBoardings, unsaveBoarding } from '@/lib/saved-boarding';
import { useBoardingStore } from '@/store/boarding.store';
import { COLORS } from '@/lib/constants';
import type { Boarding } from '@/types/boarding.types';

export default function SavedBoardingsScreen() {
  const { setSavedIds } = useBoardingStore();
  const [boardings, setBoardings] = useState<Boarding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadSaved = useCallback(async (refresh = false) => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    try {
      const result = await getSavedBoardings();
      const saved = result.data.saved;
      setBoardings(saved.map((s) => s.boarding));
      // Do NOT call setSavedIds here — it would overwrite the store and reset
      // heart icons on Home/Search. The store is seeded once in (tabs)/_layout
      // and kept in sync by useSaveBoarding. Only unsave (handleUnsave below)
      // needs to remove an id from the store.
    } catch {
      Alert.alert('Error', 'Failed to load saved boardings. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadSaved(); }, [loadSaved]));

  const handleUnsave = (boarding: Boarding) => {
    Alert.alert(
      'Remove from Saved',
      `Remove "${boarding.title}" from your saved list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            // Optimistic update
            setBoardings((prev) => prev.filter((b) => b.id !== boarding.id));
            setSavedIds(
              useBoardingStore.getState().savedIds.filter((id) => id !== boarding.id),
            );
            try {
              await unsaveBoarding(boarding.id);
            } catch {
              // Revert on failure
              setBoardings((prev) => [...prev, boarding]);
              setSavedIds([...useBoardingStore.getState().savedIds, boarding.id]);
              Alert.alert('Error', 'Failed to remove from saved. Please try again.');
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saved Boardings</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Boardings</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={boardings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => loadSaved(true)}
            tintColor={COLORS.primary}
          />
        }
        renderItem={({ item }) => {
          const primaryImage = item.images[0];
          return (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.85}
              onPress={() => router.push(`/boardings/${item.slug}` as never)}
            >
              <View style={styles.cardImageContainer}>
                {primaryImage ? (
                  <Image source={{ uri: primaryImage.url }} style={styles.cardImage} />
                ) : (
                  <View style={[styles.cardImage, styles.imagePlaceholder]}>
                    <Ionicons name="home-outline" size={28} color={COLORS.gray} />
                  </View>
                )}
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.cardAddress} numberOfLines={1}>
                  <Ionicons name="location-outline" size={11} color={COLORS.gray} /> {item.city}, {item.district}
                </Text>
                <Text style={styles.cardPrice}>
                  {item.monthlyRent ? `LKR ${item.monthlyRent.toLocaleString()}` : '—'}
                  <Text style={styles.perMonth}>/mo</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={styles.unsaveBtn}
                onPress={() => handleUnsave(item)}
                hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
              >
                <Ionicons name="heart" size={22} color={COLORS.red} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={64} color={COLORS.grayBorder} />
            <Text style={styles.emptyTitle}>No saved boardings yet</Text>
            <Text style={styles.emptySub}>Tap the heart icon on any listing to save it here</Text>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => router.push('/(tabs)/search' as never)}
            >
              <Text style={styles.exploreBtnText}>Explore Boardings</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  cardImageContainer: {},
  cardImage: { width: 100, height: 120 },
  imagePlaceholder: { backgroundColor: COLORS.grayLight, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, padding: 12, gap: 4 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  cardAddress: { fontSize: 12, color: COLORS.textSecondary },
  cardPrice: { fontSize: 15, fontWeight: '800', color: COLORS.primary },
  perMonth: { fontSize: 11, fontWeight: '400', color: COLORS.textSecondary },
  unsaveBtn: { padding: 12, alignSelf: 'center' },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  emptySub: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' },
  exploreBtn: {
    marginTop: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  exploreBtnText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
});
