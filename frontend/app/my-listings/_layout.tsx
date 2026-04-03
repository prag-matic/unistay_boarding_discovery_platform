import { Stack } from 'expo-router';

export default function MyListingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="payments" />
      <Stack.Screen name="payment-detail" />
      <Stack.Screen name="payment-history" />
      <Stack.Screen name="reviews" />
    </Stack>
  );
}
