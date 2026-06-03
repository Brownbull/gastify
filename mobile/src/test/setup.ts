import "react-native-gesture-handler/jestSetup";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn().mockResolvedValue(null),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 0,
}));

jest.mock("expo-constants", () => ({
  expoConfig: {
    extra: {
      apiBaseUrl: "http://localhost:8000",
      eas: {
        projectId: "test-expo-project",
      },
      e2eAuthEnabled: false,
      e2eAuthMode: "staging",
      e2eAuthEmail: "",
      e2eAuthPassword: "",
      firebaseAuthEmulatorHost: "",
      googleIosClientId: "",
      googleWebClientId: "",
    },
  },
}));
