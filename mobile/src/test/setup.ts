import "react-native-gesture-handler/jestSetup";

jest.mock("expo-constants", () => ({
  expoConfig: {
    extra: {
      apiBaseUrl: "http://localhost:8000",
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
