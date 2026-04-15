import { Stack } from 'expo-router';

export default function BoardingsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="[slug]/index" />
      <Stack.Screen name="[slug]/gallery" />
      <Stack.Screen name="[slug]/reviews" />
      <Stack.Screen name="create/step1" />
      <Stack.Screen name="create/step2" />
      <Stack.Screen name="create/step3" />
      <Stack.Screen name="create/step4" />
      <Stack.Screen name="create/step5" />
    </Stack>
  );
}
