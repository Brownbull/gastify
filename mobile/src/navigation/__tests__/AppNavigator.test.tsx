import type { ComponentType, ReactNode } from "react";
import { render } from "@testing-library/react-native";
import { AppNavigator } from "../AppNavigator";
import { useAuth } from "../../providers/AuthProvider";

jest.mock("../../providers/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../screens/HomeScreen", () => ({
  HomeScreen: () => {
    const { Text } = require("react-native");
    return <Text testID="home-screen">Home</Text>;
  },
}));

jest.mock("../../screens/TransactionsScreen", () => ({
  TransactionsScreen: () => {
    const { Text } = require("react-native");
    return <Text testID="transactions-screen">Transactions</Text>;
  },
}));

jest.mock("../../screens/StatementsScreen", () => ({
  StatementsScreen: () => {
    const { Text } = require("react-native");
    return <Text testID="statements-screen">Statements</Text>;
  },
}));

jest.mock("../../screens/InsightsScreen", () => ({
  InsightsScreen: () => {
    const { Text } = require("react-native");
    return <Text testID="insights-screen">Insights</Text>;
  },
}));

jest.mock("../../screens/TransactionDetailScreen", () => ({
  TransactionDetailScreen: () => {
    const { Text } = require("react-native");
    return <Text testID="transaction-detail-screen">Detail</Text>;
  },
}));

jest.mock("../../screens/SettingsScreen", () => ({
  SettingsScreen: () => {
    const { Text } = require("react-native");
    return <Text testID="settings-screen">Settings</Text>;
  },
}));

jest.mock("../../screens/SignInScreen", () => ({
  SignInScreen: () => {
    const { Text } = require("react-native");
    return <Text testID="sign-in-screen">Sign in</Text>;
  },
}));

jest.mock("@react-navigation/native", () => ({
  NavigationContainer: ({ children }: { children: ReactNode }) => children,
}));

jest.mock("@react-navigation/native-stack", () => ({
  createNativeStackNavigator: () => ({
    Navigator: ({ children }: { children: ReactNode }) => children,
    Screen: ({ component: Component }: { component: ComponentType }) => (
      <Component />
    ),
  }),
}));

describe("AppNavigator", () => {
  it("renders the loading gate while auth state is unresolved", () => {
    jest.mocked(useAuth).mockReturnValue({
      error: null,
      loading: true,
      signInWithGoogle: jest.fn(),
      signInWithTestUser: jest.fn(),
      signOut: jest.fn(),
      user: null,
    });

    const screen = render(<AppNavigator />);

    expect(screen.getByTestId("mobile-auth-loading")).toBeTruthy();
  });

  it("renders sign-in stack when signed out", () => {
    jest.mocked(useAuth).mockReturnValue({
      error: null,
      loading: false,
      signInWithGoogle: jest.fn(),
      signInWithTestUser: jest.fn(),
      signOut: jest.fn(),
      user: null,
    });

    const screen = render(<AppNavigator />);

    expect(screen.getByTestId("sign-in-screen")).toBeTruthy();
  });

  it("renders home stack when signed in", () => {
    jest.mocked(useAuth).mockReturnValue({
      error: null,
      loading: false,
      signInWithGoogle: jest.fn(),
      signInWithTestUser: jest.fn(),
      signOut: jest.fn(),
      user: { uid: "firebase-uid" } as never,
    });

    const screen = render(<AppNavigator />);

    expect(screen.getByTestId("home-screen")).toBeTruthy();
  });
});
