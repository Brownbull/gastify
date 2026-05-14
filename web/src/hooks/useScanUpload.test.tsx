import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useScanUpload } from "./useScanUpload";
import { useScanStore } from "@/stores/scanStore";

const { mockAuth } = vi.hoisted(() => ({
  mockAuth: {
    currentUser: {
      getIdToken: vi.fn(),
    },
  },
}));

vi.mock("@/lib/firebase", () => ({
  auth: mockAuth,
}));

describe("useScanUpload", () => {
  beforeEach(() => {
    useScanStore.getState().reset();
    mockAuth.currentUser.getIdToken.mockResolvedValue("token-123");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("aborts an in-flight upload when the user submits another scan", async () => {
    const signals: AbortSignal[] = [];
    const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
      if (init?.signal instanceof AbortSignal) {
        signals.push(init.signal);
      }
      return new Promise<Response>(() => undefined);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useScanUpload());

    act(() => {
      void result.current.upload(
        new File(["first"], "first.jpg", { type: "image/jpeg" }),
      );
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));

    act(() => {
      void result.current.upload(
        new File(["second"], "second.jpg", { type: "image/jpeg" }),
      );
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);
  });
});
