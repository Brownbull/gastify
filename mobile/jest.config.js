module.exports = {
  preset: "react-native",
  setupFilesAfterEnv: ["<rootDir>/src/test/setup.ts"],
  testMatch: ["<rootDir>/src/**/*.test.{ts,tsx}"],
  transformIgnorePatterns: [
    "node_modules/(?!(jest-)?react-native|@react-native|@react-native-community|expo|@expo|@react-navigation|@react-native-firebase|@react-native-google-signin|react-native-safe-area-context|react-native-screens|react-native-gesture-handler|zustand)",
  ],
};
