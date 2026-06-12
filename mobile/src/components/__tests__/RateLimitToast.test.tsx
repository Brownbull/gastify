import { act, fireEvent, render } from "@testing-library/react-native";
import { RateLimitToast } from "../RateLimitToast";

// Capture the listener the toast registers so the test can fire 429 events.
let registered: ((seconds: number) => void) | null = null;
jest.mock("../../lib/api", () => ({
  onRateLimited: (listener: (seconds: number) => void) => {
    registered = listener;
    return () => {
      registered = null;
    };
  },
}));

function fireRateLimit(seconds: number) {
  act(() => {
    registered?.(seconds);
  });
}

describe("RateLimitToast", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    registered = null;
  });
  afterEach(() => {
    act(() => jest.runOnlyPendingTimers());
    jest.useRealTimers();
  });

  it("renders nothing until a 429 fires", () => {
    const { queryByTestId } = render(<RateLimitToast />);
    expect(queryByTestId("rate-limit-toast")).toBeNull();
  });

  it("shows the retry-after seconds", () => {
    const { getByTestId } = render(<RateLimitToast />);
    fireRateLimit(15);
    expect(getByTestId("rate-limit-toast")).toHaveTextContent(/15s/);
  });

  it("shows a generic message when Retry-After is 0", () => {
    const { getByTestId } = render(<RateLimitToast />);
    fireRateLimit(0);
    expect(getByTestId("rate-limit-toast")).toHaveTextContent(/in a moment/);
  });

  it("auto-dismisses after 5s", () => {
    const { queryByTestId } = render(<RateLimitToast />);
    fireRateLimit(5);
    expect(queryByTestId("rate-limit-toast")).not.toBeNull();
    act(() => jest.advanceTimersByTime(5000));
    expect(queryByTestId("rate-limit-toast")).toBeNull();
  });

  it("dismisses on the dismiss button", () => {
    const { getByTestId, queryByTestId } = render(<RateLimitToast />);
    fireRateLimit(30);
    fireEvent.press(getByTestId("rate-limit-toast-dismiss"));
    expect(queryByTestId("rate-limit-toast")).toBeNull();
  });
});
