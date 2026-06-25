import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const mockFirebaseSignOut = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
let authStateCallback: ((user: unknown) => void) | null = null;

const { prodTestAuthMock } = vi.hoisted(() => ({
  prodTestAuthMock: { enabled: false },
}));

vi.mock("firebase/auth", () => ({
  onAuthStateChanged: (_auth: unknown, cb: (user: unknown) => void) => {
    authStateCallback = cb;
    return vi.fn();
  },
  signInWithPopup: vi.fn(),
  signInWithEmailAndPassword: (...args: unknown[]) =>
    mockSignInWithEmailAndPassword(...args),
  signOut: (...args: unknown[]) => mockFirebaseSignOut(...args),
}));

vi.mock("@/lib/prodTestAuth", () => ({
  prodTestAuthConfig: prodTestAuthMock,
}));

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
  googleProvider: {},
}));

vi.mock("@/lib/api", () => ({
  setAuthToken: vi.fn(),
}));

const mockClearClientSession = vi.fn();
const mockBroadcastSignOut = vi.fn();
const mockIsSignOutBroadcast = vi.fn();

vi.mock("@/lib/sessionIsolation", () => ({
  clearClientSession: (...args: unknown[]) => mockClearClientSession(...args),
  broadcastSignOut: () => mockBroadcastSignOut(),
  isSignOutBroadcast: (...args: unknown[]) => mockIsSignOutBroadcast(...args),
}));

vi.mock("@/lib/i18n", () => ({
  translate: (key: string) => key,
  getPreferredLocale: () => "es" as const,
  setPreferredLocale: vi.fn(),
  SUPPORTED_LOCALES: ["es", "en", "pt"] as const,
  isSupportedLocale: (v: string) => ["es", "en", "pt"].includes(v),
  LOCALE_STORAGE_KEY: "gastify:locale",
  negotiateLocale: () => "es" as const,
}));

import { AuthProvider, useAuth } from "./useAuth";

function Wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

function simulateLoggedIn() {
  act(() => {
    authStateCallback?.({
      getIdToken: vi.fn().mockResolvedValue("token-123"),
      email: "test@example.com",
    });
  });
}

function dispatchStorageEvent(key: string, newValue: string | null) {
  const event = new StorageEvent("storage", { key, newValue });
  window.dispatchEvent(event);
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateCallback = null;
    mockIsSignOutBroadcast.mockReturnValue(false);
    prodTestAuthMock.enabled = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("clears session and broadcasts on explicit signOut", async () => {
    mockFirebaseSignOut.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    simulateLoggedIn();

    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockClearClientSession).toHaveBeenCalledWith();
    expect(mockBroadcastSignOut).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it("clears session on signOut even when Firebase throws", async () => {
    mockFirebaseSignOut.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    simulateLoggedIn();

    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await result.current.signOut();
    });

    expect(mockClearClientSession).toHaveBeenCalled();
    expect(mockBroadcastSignOut).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
  });

  it("handles storage-event sign-out from another tab", async () => {
    mockFirebaseSignOut.mockResolvedValue(undefined);
    mockIsSignOutBroadcast.mockReturnValue(true);

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    simulateLoggedIn();

    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      dispatchStorageEvent("gastify:sign-out", '{"at":1}');
    });

    await waitFor(() => expect(mockFirebaseSignOut).toHaveBeenCalled());
    await waitFor(() => expect(result.current.user).toBeNull());

    expect(mockClearClientSession).toHaveBeenCalledWith({
      preserveBroadcastMarker: true,
    });
  });

  it("ignores storage events that are not sign-out broadcasts", async () => {
    mockIsSignOutBroadcast.mockReturnValue(false);

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    simulateLoggedIn();

    await waitFor(() => expect(result.current.user).not.toBeNull());

    act(() => {
      dispatchStorageEvent("some-other-key", "value");
    });

    expect(result.current.user).not.toBeNull();
    expect(mockFirebaseSignOut).not.toHaveBeenCalled();
  });

  it("exposes no email/password sign-in when prod test auth is disabled", () => {
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });
    expect(result.current.signInWithEmailPassword).toBeNull();
  });

  it("signs in with email/password when prod test auth is enabled", async () => {
    prodTestAuthMock.enabled = true;
    mockSignInWithEmailAndPassword.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    expect(result.current.signInWithEmailPassword).not.toBeNull();

    await act(async () => {
      await result.current.signInWithEmailPassword!(
        "tester@example.com",
        "pw-123",
      );
    });

    expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      "tester@example.com",
      "pw-123",
    );
    expect(result.current.error).toBeNull();
  });

  it("surfaces an error when email/password sign-in fails", async () => {
    prodTestAuthMock.enabled = true;
    mockSignInWithEmailAndPassword.mockRejectedValue(
      new Error("auth/wrong-password"),
    );

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.signInWithEmailPassword!(
        "tester@example.com",
        "bad",
      );
    });

    expect(result.current.error).toBe("auth/wrong-password");
    expect(result.current.user).toBeNull();
  });

  it("sets session-expired error when token refresh fails", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    const mockGetIdToken = vi
      .fn()
      .mockResolvedValueOnce("token-123")
      .mockRejectedValueOnce(new Error("Token expired"));

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    await act(async () => {
      authStateCallback?.({
        getIdToken: mockGetIdToken,
        email: "test@example.com",
      });
    });

    await waitFor(() => expect(result.current.user).not.toBeNull());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    });

    await waitFor(() => {
      expect(result.current.error).toBe("auth.sessionExpired");
    });

    expect(result.current.user).toBeNull();
    expect(mockClearClientSession).toHaveBeenCalledWith({
      clearWebStorage: false,
    });
  });
});
