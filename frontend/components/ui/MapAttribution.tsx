import React from 'react';
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Displays "© OpenStreetMap contributors" on a map view.
 *
 * Required by the OpenStreetMap tile usage policy and the ODbL license for any
 * map that displays OSM data or tiles. Place inside the containing View that
 * wraps the MapView so that absolute positioning works correctly.
 *
 * See: https://www.openstreetmap.org/copyright
 */
export function MapAttribution({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <Text style={styles.text}>© OpenStreetMap contributors</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  text: {
    fontSize: 9,
    color: '#333333',
  },
});
