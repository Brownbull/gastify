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

// react-native-gifted-charts renders through react-native-svg (a native module).
// Unit tests assert the plain-Text legend/caption, not the SVG arcs, so stub the
// charts to lightweight Views and avoid pulling the native svg module into jest.
jest.mock("react-native-gifted-charts", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Stub = (props: Record<string, unknown>) => React.createElement(View, props);
  return { PieChart: Stub, BarChart: Stub, LineChart: Stub, LineChartBicolor: Stub };
});
