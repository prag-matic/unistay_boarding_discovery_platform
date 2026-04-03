import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/lib/constants';
import { useNotificationStore } from '@/store/notification.store';
import { useAuthStore } from '@/store/auth.store';
import { useBoardingStore } from '@/store/boarding.store';
import { getSavedBoardings } from '@/lib/saved-boarding';

function TabBarIcon({ name, color, size }: { name: string; color: string; size: number }) {
  return <Ionicons name={name as never} size={size} color={color} />;
}

function MessagesIcon({ color, size }: { color: string; size: number }) {
  const { unreadCount } = useNotificationStore();
  return (
    <View>
      <Ionicons name="chatbubbles-outline" size={size} color={color} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
        </View>
      )}
    </View>
  );
}

export default function TabsLayout() {
  const { isAuthenticated, user } = useAuthStore();
  const { setSavedIds } = useBoardingStore();

  // Seed saved boarding IDs so heart icons reflect persisted state
  // on Home and Search without requiring a visit to the Saved screen first.
  useEffect(() => {
    if (!isAuthenticated || user?.role === 'OWNER') return;
    getSavedBoardings()
      .then((r) => setSavedIds(r.data.saved.map((s) => s.boardingId)))
      .catch((err) => console.warn('[TabsLayout] Failed to load saved boarding IDs:', err));
  }, [isAuthenticated, user?.role, setSavedIds]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray,
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: COLORS.grayBorder,
          paddingBottom: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="search-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <MessagesIcon color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <TabBarIcon name="person-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: COLORS.red,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 10,
    color: COLORS.white,
    fontWeight: '700',
  },
});
