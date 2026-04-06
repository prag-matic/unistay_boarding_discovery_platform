// app.config.js – dynamic Expo config that reads environment variables.
// See: https://docs.expo.dev/workflow/configuration/
//
// Required environment variable:
//   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY  – Google Maps Platform API key with
//   "Maps SDK for Android" and "Maps SDK for iOS" enabled.
//   Copy .env.example → .env and fill in the key before running the app.

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

/** @type {import('expo/config').ExpoConfig} */
export default {
  name: 'UniStay',
  slug: 'unistay',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'unistay',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/icon.png',
    resizeMode: 'contain',
    backgroundColor: '#4A7BF7',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.unistay.app',
    config: {
      googleMapsApiKey,
    },
  },
  android: {
    splash: {
      image: './assets/icon.png',
      resizeMode: 'contain',
      backgroundColor: '#4A7BF7',
    },
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#4A7BF7',
    },
    package: 'com.unistay.app',
    config: {
      googleMaps: {
        apiKey: googleMapsApiKey,
      },
    },
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-image-picker',
    'expo-location',
    [
      'expo-splash-screen',
      {
        image: './assets/icon.png',
        resizeMode: 'contain',
        backgroundColor: '#4A7BF7',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: '6a4c5a82-2712-4ec7-b830-955785eaffc7',
    },
  },
};
