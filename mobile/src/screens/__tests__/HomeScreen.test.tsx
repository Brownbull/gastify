import { fireEvent, render } from "@testing-library/react-native";
import { HomeScreen } from "../HomeScreen";
import { useAuth } from "../../providers/AuthProvider";
import { useSessionStore } from "../../stores/sessionStore";

jest.mock("../../providers/AuthProvider", () => ({
  useAuth: jest.fn(),
}));

describe("HomeScreen", () => {
  const signOut = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useSessionStore.getState().reset();
    jest.mocked(useAuth).mockReturnValue({
      error: null,
      loading: false,
      signInWithGoogle: jest.fn(),
      signInWithTestUser: jest.fn(),
      signOut,
      user: {
        uid: "firebase-uid",
      } as never,
    });
  });

  it("shows signed-in user state and exposes sign-out by stable testID", () => {
    useSessionStore.getState().setSignedInUser({
      displayName: "Test User",
      email: "test@example.com",
      uid: "firebase-uid",
    });

    const screen = render(<HomeScreen />);

    expect(screen.getByTestId("home-screen")).toBeTruthy();
    expect(screen.getByTestId("signed-in-user-value").props.children).toBe(
      "test@example.com",
    );

    fireEvent.press(screen.getByTestId("sign-out-button"));
    expect(signOut).toHaveBeenCalled();
  });
});
