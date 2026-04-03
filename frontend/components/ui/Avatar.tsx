import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '@/lib/constants';
import { getInitials } from '@/utils/helpers';

interface AvatarProps {
  uri?: string;
  firstName?: string;
  lastName?: string;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ uri, firstName = '', lastName = '', size = 60, style }: AvatarProps) {
  const initials = getInitials(firstName || 'U', lastName || 'B');

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initials}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  initials: {
    color: COLORS.white,
    fontWeight: '700',
  },
});
