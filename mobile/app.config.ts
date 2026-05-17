import type { ConfigContext, ExpoConfig } from "expo/config";

const iosGoogleServicesFile = process.env.GOOGLE_SERVICE_INFO_PLIST;
const androidGoogleServicesFile = process.env.GOOGLE_SERVICES_JSON;

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Gastify",
  slug: "gastify-mobile",
  scheme: "gastify",
  version: "0.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  platforms: ["ios", "android"],
  extra: {
    eas: {
      projectId: "eecbbed5-3325-4687-9756-c3b1135e3de5",
    },
    apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:8000",
    googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "",
    googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "",
    e2eAuthEnabled: process.env.EXPO_PUBLIC_E2E_AUTH_ENABLED === "true",
    e2eAuthMode: process.env.EXPO_PUBLIC_E2E_AUTH_MODE ?? "staging",
    firebaseAuthEmulatorHost:
      process.env.EXPO_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST ?? "",
    e2eAuthEmail: process.env.EXPO_PUBLIC_E2E_AUTH_EMAIL ?? "",
    e2eAuthPassword: process.env.EXPO_PUBLIC_E2E_AUTH_PASSWORD ?? "",
  },
  ios: {
    bundleIdentifier: "com.gastify.mobile",
    supportsTablet: false,
    ...(iosGoogleServicesFile
      ? { googleServicesFile: iosGoogleServicesFile }
      : {}),
  },
  android: {
    package: "com.gastify.mobile",
    adaptiveIcon: {
      backgroundColor: "#0f172a",
    },
    ...(androidGoogleServicesFile
      ? { googleServicesFile: androidGoogleServicesFile }
      : {}),
  },
  plugins: [
    "@react-native-firebase/app",
    "@react-native-firebase/auth",
    "@react-native-google-signin/google-signin",
    "expo-secure-store",
  ],
});
