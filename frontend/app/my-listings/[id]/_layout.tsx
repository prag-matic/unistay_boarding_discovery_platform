import { Stack } from 'expo-router';

export default function MyListingDetailLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="edit" />
      <Stack.Screen name="analytics" />
    </Stack>
  );
}
