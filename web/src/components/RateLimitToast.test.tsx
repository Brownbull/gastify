import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { RateLimitToast } from "./RateLimitToast";
import { RATE_LIMIT_EVENT } from "@/lib/api";

function fireRateLimit(retryAfterSeconds: number) {
  act(() => {
    window.dispatchEvent(
      new CustomEvent(RATE_LIMIT_EVENT, { detail: { retryAfterSeconds } }),
    );
  });
}

describe("RateLimitToast", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("is hidden until a 429 event fires", () => {
    render(<RateLimitToast />);
    expect(screen.queryByTestId("rate-limit-toast")).toBeNull();
  });

  it("shows the retry-after message on a rate-limit event", () => {
    render(<RateLimitToast />);
    fireRateLimit(12);
    expect(screen.getByTestId("rate-limit-toast")).toHaveTextContent("12s");
  });

  it("shows a generic message when Retry-After is absent (0)", () => {
    render(<RateLimitToast />);
    fireRateLimit(0);
    const toast = screen.getByTestId("rate-limit-toast");
    expect(toast).toBeInTheDocument();
    expect(toast).not.toHaveTextContent(/\d+s/);
  });

  it("auto-dismisses after 5 seconds", () => {
    render(<RateLimitToast />);
    fireRateLimit(3);
    expect(screen.getByTestId("rate-limit-toast")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByTestId("rate-limit-toast")).toBeNull();
  });

  it("dismisses on the dismiss button", () => {
    render(<RateLimitToast />);
    fireRateLimit(30);
    act(() => {
      fireEvent.click(screen.getByTestId("rate-limit-toast-dismiss"));
    });
    expect(screen.queryByTestId("rate-limit-toast")).toBeNull();
  });
});
