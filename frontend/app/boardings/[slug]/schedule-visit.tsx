import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createVisitRequest } from '@/lib/visit';
import { COLORS } from '@/lib/constants';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getDaysFromToday(count: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 1; i <= count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Available start-hour options (24-h). Slots are 30 min; end = start + 30 min. */
const HOUR_SLOTS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function formatHour(h: number) {
  const suffix = h < 12 ? 'AM' : 'PM';
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${display}:00 ${suffix}`;
}

/** Build an ISO-8601 datetime string for the given Date + hour (local TZ). */
function buildISO(date: Date, hour: number): string {
  const d = new Date(date);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

// ─── Screen ────────────────────────────────────────────────────────────────────
export default function ScheduleVisitScreen() {
  const { slug, boardingId, boardingTitle } = useLocalSearchParams<{
    slug: string;
    boardingId: string;
    boardingTitle: string;
  }>();

  const availableDays = getDaysFromToday(14);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStartHour, setSelectedStartHour] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDateISO = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isReady = selectedDate !== null && selectedStartHour !== null;

  const handleSubmit = async () => {
    if (!isReady) {
      Alert.alert('Incomplete', 'Please select a date and time slot.');
      return;
    }
    if (!boardingId) {
      Alert.alert('Error', 'Boarding information is missing.');
      return;
    }
    setIsSubmitting(true);
    try {
      await createVisitRequest({
        boardingId,
        requestedStartAt: buildISO(selectedDate, selectedStartHour),
        requestedEndAt: buildISO(selectedDate, selectedStartHour + 1),
        ...(message.trim() ? { message: message.trim() } : {}),
      });
      Alert.alert(
        'Visit Requested!',
        'Your visit request has been submitted. The owner will review it shortly. It expires in 72 hours if not approved.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err: unknown) {
      const apiMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Failed to submit visit request. Please try again.';
      Alert.alert('Error', apiMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule a Visit</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Boarding name */}
        {boardingTitle ? (
          <View style={styles.boardingInfoCard}>
            <Ionicons name="home-outline" size={18} color={COLORS.primary} />
            <Text style={styles.boardingInfoText} numberOfLines={2}>{boardingTitle}</Text>
          </View>
        ) : null}

        {/* Notice */}
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
          <Text style={styles.noticeText}>
            Your request will be <Text style={styles.noticeBold}>PENDING</Text> until the owner
            reviews it. It expires automatically in{' '}
            <Text style={styles.noticeBold}>72 hours</Text> if not acted upon.
          </Text>
        </View>

        {/* Date picker */}
        <Text style={styles.sectionTitle}>Select Date</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateList}
        >
          {availableDays.map((day) => {
            const isSelected =
              selectedDate !== null && formatDateISO(day) === formatDateISO(selectedDate);
            return (
              <TouchableOpacity
                key={day.toISOString()}
                style={[styles.dateCard, isSelected && styles.dateCardSelected]}
                onPress={() => setSelectedDate(day)}
              >
                <Text style={[styles.dateDayName, isSelected && styles.dateTextSelected]}>
                  {DAY_NAMES[day.getDay()]}
                </Text>
                <Text style={[styles.dateDayNumber, isSelected && styles.dateTextSelected]}>
                  {day.getDate()}
                </Text>
                <Text style={[styles.dateMonth, isSelected && styles.dateTextSelected]}>
                  {MONTH_NAMES[day.getMonth()]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Time slot picker */}
        <Text style={styles.sectionTitle}>Select Start Time (1-hour visit)</Text>
        <View style={styles.timeslotGrid}>
          {HOUR_SLOTS.map((h) => {
            const isSelected = selectedStartHour === h;
            return (
              <TouchableOpacity
                key={h}
                style={[styles.timeslotCard, isSelected && styles.timeslotCardSelected]}
                onPress={() => setSelectedStartHour(h)}
              >
                <Text style={[styles.timeslotText, isSelected && styles.timeslotTextSelected]}>
                  {formatHour(h)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Optional message */}
        <Text style={styles.sectionTitle}>Message to Owner (optional)</Text>
        <TextInput
          style={styles.messageInput}
          placeholder="E.g. Can I inspect the room and washroom?"
          placeholderTextColor={COLORS.gray}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          maxLength={1000}
        />

        {/* Summary */}
        {selectedDate && selectedStartHour !== null && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Visit Summary</Text>
            <View style={styles.summaryRow}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
              <Text style={styles.summaryText}>
                {DAY_NAMES[selectedDate.getDay()]}, {selectedDate.getDate()}{' '}
                {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Ionicons name="time-outline" size={16} color={COLORS.primary} />
              <Text style={styles.summaryText}>
                {formatHour(selectedStartHour)} – {formatHour(selectedStartHour + 1)}
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!isReady || isSubmitting) && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!isReady || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="calendar-outline" size={18} color={COLORS.white} />
              <Text style={styles.submitBtnText}>Request Visit</Text>
            </>
          )}
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
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },

  content: { padding: 20 },

  boardingInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#EBF0FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  boardingInfoText: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.primary },

  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  noticeText: { flex: 1, fontSize: 13, color: '#92400E', lineHeight: 20 },
  noticeBold: { fontWeight: '700' },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
    marginTop: 4,
  },

  dateList: { paddingBottom: 4, gap: 10, marginBottom: 20 },
  dateCard: {
    width: 64,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.grayBorder,
    gap: 2,
  },
  dateCardSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dateDayName: { fontSize: 11, fontWeight: '500', color: COLORS.textSecondary },
  dateDayNumber: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  dateMonth: { fontSize: 11, fontWeight: '500', color: COLORS.textSecondary },
  dateTextSelected: { color: COLORS.white },

  timeslotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  timeslotCard: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.grayBorder,
  },
  timeslotCardSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  timeslotText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  timeslotTextSelected: { color: COLORS.white },

  messageInput: {
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: COLORS.text,
    minHeight: 80,
    marginBottom: 20,
    backgroundColor: COLORS.white,
  },

  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    gap: 10,
  },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryText: { fontSize: 14, color: COLORS.textSecondary },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayBorder,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
  },
  submitBtnDisabled: { backgroundColor: COLORS.grayBorder },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
});

