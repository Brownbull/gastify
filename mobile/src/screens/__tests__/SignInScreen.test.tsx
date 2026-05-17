import { fireEvent, render } from "@testing-library/react-native";
import { SignInScreen } from "../SignInScreen";
import { useAuth } from "../../providers/AuthProvider";

jest.mock("../../providers/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../lib/mobileConfig", () => ({
  mobileConfig: {
    e2eAuthEnabled: true,
    e2eAuthMode: "staging",
  },
}));

describe("SignInScreen", () => {
  const signInWithGoogle = jest.fn();
  const signInWithTestUser = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(useAuth).mockReturnValue({
      error: null,
      loading: false,
      signInWithGoogle,
      signInWithTestUser,
      signOut: jest.fn(),
      user: null,
    });
  });

  it("exposes stable controls for Google and E2E staging auth", () => {
    const screen = render(<SignInScreen />);

    fireEvent.press(screen.getByTestId("google-sign-in-button"));
    fireEvent.press(screen.getByTestId("e2e-sign-in-button"));

    expect(screen.getByTestId("sign-in-screen")).toBeTruthy();
    expect(signInWithGoogle).toHaveBeenCalled();
    expect(signInWithTestUser).toHaveBeenCalled();
  });

  it("renders auth errors inline", () => {
    jest.mocked(useAuth).mockReturnValue({
      error: "Sign-in failed",
      loading: false,
      signInWithGoogle,
      signInWithTestUser,
      signOut: jest.fn(),
      user: null,
    });

    const screen = render(<SignInScreen />);

    expect(screen.getByText("Sign-in failed")).toBeTruthy();
  });
});
