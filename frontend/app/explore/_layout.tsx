import { Stack } from 'expo-router';

export default function ExploreLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="filter" />
      <Stack.Screen name="map" />
    </Stack>
  );
}
