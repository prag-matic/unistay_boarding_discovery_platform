import React from 'react';
import { SafeAreaView, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '@/lib/constants';

interface SafeScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function SafeScreen({ children, style }: SafeScreenProps) {
  return (
    <SafeAreaView style={[styles.container, style]}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});
