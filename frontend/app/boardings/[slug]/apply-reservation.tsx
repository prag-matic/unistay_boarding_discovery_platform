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
import { createReservation } from '@/lib/reservation';
import { COLORS } from '@/lib/constants';

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

export default function ApplyReservationScreen() {
  const { boardingId, boardingTitle, monthlyRent } = useLocalSearchParams<{
    boardingId: string;
    boardingTitle: string;
    monthlyRent: string;
  }>();

  const availableDays = getDaysFromToday(60);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [specialRequests, setSpecialRequests] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rentAmount = monthlyRent ? Number(monthlyRent) : null;

  const formatDateISO = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async () => {
    if (!selectedDate) {
      Alert.alert('Incomplete', 'Please select a move-in date.');
      return;
    }
    if (!boardingId) {
      Alert.alert('Error', 'Boarding information is missing.');
      return;
    }
    if (specialRequests.trim().length > 1000) {
      Alert.alert('Too Long', 'Special requests must be 1000 characters or less.');
      return;
    }
    setIsSubmitting(true);
    try {
      await createReservation({
        boardingId,
        moveInDate: formatDateISO(selectedDate),
        ...(specialRequests.trim() ? { specialRequests: specialRequests.trim() } : {}),
      });
      Alert.alert(
        'Application Submitted!',
        'Your reservation application has been submitted. The owner will review it and approve or reject it.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { message?: string; details?: { field: string; message: string }[] } } })?.response?.data;
      if (errData?.details?.length) {
        const fieldErrors = errData.details.map((d) => `• ${d.message}`).join('\n');
        Alert.alert('Validation Error', fieldErrors);
      } else {
        Alert.alert('Error', errData?.message ?? 'Failed to submit reservation. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group days by month for display
  const months: { label: string; days: Date[] }[] = [];
  for (const day of availableDays) {
    const label = `${MONTH_NAMES[day.getMonth()]} ${day.getFullYear()}`;
    const last = months[months.length - 1];
    if (last && last.label === label) {
      last.days.push(day);
    } else {
      months.push({ label, days: [day] });
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Apply for Reservation</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Boarding info */}
        {boardingTitle ? (
          <View style={styles.boardingInfoCard}>
            <Ionicons name="home-outline" size={18} color={COLORS.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.boardingInfoTitle} numberOfLines={2}>{boardingTitle}</Text>
              {rentAmount ? (
                <Text style={styles.boardingInfoRent}>
                  LKR {rentAmount.toLocaleString()} / month
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Notice */}
        <View style={styles.noticeCard}>
          <Ionicons name="information-circle-outline" size={18} color={COLORS.primary} />
          <Text style={styles.noticeText}>
            The system will verify the boarding is not full and you have no other active reservations.
            Upon approval, <Text style={styles.noticeBold}>12 monthly rental periods</Text> will be generated automatically.
          </Text>
        </View>

        {/* Move-in date picker */}
        <Text style={styles.sectionTitle}>Select Move-in Date</Text>
        {months.map(({ label, days }) => (
          <View key={label}>
            <Text style={styles.monthLabel}>{label}</Text>
            <View style={styles.calendarGrid}>
              {/* Empty cells for day alignment */}
              {Array.from({ length: days[0].getDay() }).map((_, i) => (
                <View key={`empty-${i}`} style={styles.calendarCell} />
              ))}
              {days.map((day) => {
                const isSelected =
                  selectedDate !== null && formatDateISO(day) === formatDateISO(selectedDate);
                return (
                  <TouchableOpacity
                    key={day.toISOString()}
                    style={[styles.calendarCell, isSelected && styles.calendarCellSelected]}
                    onPress={() => setSelectedDate(day)}
                  >
                    <Text style={[styles.calendarCellText, isSelected && styles.calendarCellTextSelected]}>
                      {day.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Special requests */}
        <Text style={styles.sectionTitle}>Special Requests (optional)</Text>
        <TextInput
          style={styles.messageInput}
          placeholder="E.g. Need a quiet room near study area"
          placeholderTextColor={COLORS.gray}
          value={specialRequests}
          onChangeText={setSpecialRequests}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          maxLength={1000}
        />

        {/* Summary */}
        {selectedDate && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Reservation Summary</Text>
            <View style={styles.summaryRow}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
              <Text style={styles.summaryLabel}>Move-in Date</Text>
              <Text style={styles.summaryValue}>
                {DAY_NAMES[selectedDate.getDay()]}, {selectedDate.getDate()}{' '}
                {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
              </Text>
            </View>
            {rentAmount ? (
              <View style={styles.summaryRow}>
                <Ionicons name="cash-outline" size={16} color={COLORS.primary} />
                <Text style={styles.summaryLabel}>Monthly Rent</Text>
                <Text style={styles.summaryValue}>LKR {rentAmount.toLocaleString()}</Text>
              </View>
            ) : null}
            <View style={styles.summaryRow}>
              <Ionicons name="document-text-outline" size={16} color={COLORS.primary} />
              <Text style={styles.summaryLabel}>Rental Periods</Text>
              <Text style={styles.summaryValue}>12 months generated on approval</Text>
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
            (!selectedDate || isSubmitting) && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedDate || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Ionicons name="home-outline" size={18} color={COLORS.white} />
              <Text style={styles.submitBtnText}>Submit Application</Text>
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
  boardingInfoTitle: { fontSize: 14, fontWeight: '600', color: COLORS.primary },
  boardingInfoRent: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },

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
  },

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

  monthLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  calendarCell: {
    width: `${100 / 7}%` as unknown as number,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  calendarCellSelected: { backgroundColor: COLORS.primary },
  calendarCellText: { fontSize: 14, color: COLORS.text, fontWeight: '500' },
  calendarCellTextSelected: { color: COLORS.white, fontWeight: '700' },

  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.grayBorder,
    gap: 10,
    marginTop: 8,
  },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryLabel: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  summaryValue: { fontSize: 13, color: COLORS.text, fontWeight: '600' },

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
