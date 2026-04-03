const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Metro's default transformIgnorePatterns excludes all of node_modules from
// Babel transformation. Many React Native / Expo packages ship raw JSX or
// modern JS syntax in their published files (e.g. react-native-maps ships
// MapView.js with JSX at line 347), which causes "Unexpected token '<'" when
// Metro parses them without running Babel first.
//
// The pattern below is the standard community recommendation. It uses
// (jest-)?react-native as a PREFIX — without a trailing path separator — so
// every package whose name starts with "react-native" (react-native-maps,
// react-native-reanimated, react-native-gesture-handler, etc.) is correctly
// exempted and processed through babel-preset-expo.
config.transformer.transformIgnorePatterns = [
  /node_modules\/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?|@expo-google-fonts|react-navigation|@react-navigation\/.*|@unimodules\/.*|unimodules-|sentry-expo|native-base|react-native-svg|react-native-maps))/,
];

module.exports = config;
