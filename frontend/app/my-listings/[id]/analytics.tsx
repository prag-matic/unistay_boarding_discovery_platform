import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMyListings } from '@/lib/boarding';
import { COLORS } from '@/lib/constants';
import type { Boarding } from '@/types/boarding.types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CHART_WIDTH = SCREEN_WIDTH - 64;

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  color: string;
  bg: string;
}

function StatCard({ icon, label, value, color, bg }: StatCardProps) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg }]}>
      <View style={[styles.statIconBox, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon as never} size={22} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// Simple bar chart component using View heights
function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  return (
    <View style={styles.chartContainer}>
      <View style={styles.bars}>
        {data.map((item) => (
          <View key={item.label} style={styles.barGroup}>
            <Text style={styles.barValue}>{item.value}</Text>
            <View style={[styles.bar, { height: (item.value / maxVal) * 100 }]} />
            <Text style={styles.barLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Simple line chart (rendered as dots + connecting bar)
function LineChart({ data }: { data: { label: string; value: number }[] }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barW = (CHART_WIDTH - 32) / data.length;
  return (
    <View style={styles.lineChartContainer}>
      {data.map((item, i) => {
        const pct = item.value / maxVal;
        return (
          <View key={i} style={[styles.lineColumn, { width: barW }]}>
            <Text style={styles.lineValue}>{item.value}</Text>
            <View style={styles.lineTrack}>
              <View style={[styles.lineFill, { height: `${pct * 100}%` }]} />
            </View>
            <Text style={styles.lineLabel}>{item.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

export default function ListingAnalyticsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [boarding, setBoarding] = useState<Boarding | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getMyListings()
      .then((r) => {
        const found = r.data.boardings.find((b) => b.id === id);
        setBoarding(found ?? null);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [id]);

  const viewsByMonth = [
    { label: 'Oct', value: 45 },
    { label: 'Nov', value: 72 },
    { label: 'Dec', value: 61 },
    { label: 'Jan', value: 89 },
    { label: 'Feb', value: 110 },
    { label: 'Mar', value: 97 },
  ];

  const requestsByMonth = [
    { label: 'Oct', value: 3 },
    { label: 'Nov', value: 5 },
    { label: 'Dec', value: 2 },
    { label: 'Jan', value: 7 },
    { label: 'Feb', value: 9 },
    { label: 'Mar', value: 6 },
  ];

  const recentActivity = [
    { id: 'r1', icon: 'eye-outline', text: '5 new views today', time: '2h ago' },
    { id: 'r2', icon: 'heart-outline', text: 'Saved by 2 students', time: '3h ago' },
    { id: 'r3', icon: 'calendar-outline', text: 'New reservation request', time: '1d ago' },
    { id: 'r4', icon: 'eye-outline', text: '12 views this week', time: '3d ago' },
    { id: 'r5', icon: 'checkmark-circle-outline', text: 'Reservation approved', time: '5d ago' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Analytics</Text>
          {boarding && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>{boarding.title}</Text>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <StatCard icon="eye-outline" label="Total Views" value={474} color={COLORS.primary} bg="#EBF0FF" />
          <StatCard icon="heart-outline" label="Saves" value={32} color={COLORS.red} bg="#FEE2E2" />
          <StatCard icon="calendar-outline" label="Requests" value={32} color={COLORS.orange} bg="#FEF3C7" />
          <StatCard icon="checkmark-circle-outline" label="Approved" value={18} color={COLORS.green} bg="#D1FAE5" />
          <StatCard icon="star-outline" label="Avg Rating" value="4.5" color="#F59E0B" bg="#FFFBEB" />
          <StatCard icon="trending-up-outline" label="Conversion" value="56%" color="#8B5CF6" bg="#EDE9FE" />
        </View>

        {/* Views over time */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Views Over Time</Text>
          <Text style={styles.chartSubtitle}>Last 6 months</Text>
          <LineChart data={viewsByMonth} />
        </View>

        {/* Reservation requests by month */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Reservation Requests</Text>
          <Text style={styles.chartSubtitle}>By month</Text>
          <BarChart data={requestsByMonth} />
        </View>

        {/* Recent activity */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
        </View>
        <View style={styles.activityList}>
          {recentActivity.map((item) => (
            <View key={item.id} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name={item.icon as never} size={18} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activityText}>{item.text}</Text>
                <Text style={styles.activityTime}>{item.time}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 30 }} />
        </ScrollView>
      )}
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
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.text },
  headerSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  content: { padding: 20 },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  statCard: {
    width: '31%',
    borderRadius: 14,
    padding: 12,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  statIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statValue: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },

  // Charts
  chartCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  chartTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  chartSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 14 },

  // Bar chart
  chartContainer: { height: 140 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 4 },
  barGroup: { flex: 1, alignItems: 'center', gap: 4 },
  barValue: { fontSize: 10, color: COLORS.textSecondary },
  bar: { width: '70%', backgroundColor: COLORS.primary, borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 10, color: COLORS.textSecondary },

  // Line chart
  lineChartContainer: { flexDirection: 'row', height: 140, alignItems: 'flex-end', gap: 2 },
  lineColumn: { alignItems: 'center', gap: 4 },
  lineValue: { fontSize: 10, color: COLORS.textSecondary },
  lineTrack: { width: 8, height: 100, backgroundColor: COLORS.grayLight, borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  lineFill: { width: '100%', backgroundColor: COLORS.primary, borderRadius: 4 },
  lineLabel: { fontSize: 10, color: COLORS.textSecondary },

  // Activity
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  activityList: { gap: 8 },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EBF0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityText: { fontSize: 13, fontWeight: '500', color: COLORS.text },
  activityTime: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
});
