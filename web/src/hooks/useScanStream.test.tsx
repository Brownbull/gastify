import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useScanStream } from "./useScanStream";
import { useScanStore, type ScanSubmissionResult } from "@/stores/scanStore";
import { MockEventSource } from "@/test/mocks";

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

const submission: ScanSubmissionResult = {
  id: "scan-1",
  ownership_scope_id: "scope-1",
  status: "submitted",
  original_filename: "receipt.jpg",
  content_type: "image/jpeg",
  file_size_bytes: 1024,
  image_path: "receipts/scan-1.jpg",
  thumbnail_path: null,
  submitted_at: "2026-05-13T12:00:00Z",
};

describe("useScanStream", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    MockEventSource.instances = [];
    mockAuth.currentUser.getIdToken.mockReset();
    useScanStore.getState().reset();
    vi.stubGlobal("EventSource", MockEventSource);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("refreshes the auth token when reconnecting after a stream error", async () => {
    mockAuth.currentUser.getIdToken
      .mockResolvedValueOnce("token-1")
      .mockResolvedValueOnce("token-2");
    useScanStore.getState().uploadComplete(submission);

    const { unmount } = renderHook(() => useScanStream());

    await act(async () => {
      await Promise.resolve();
    });

    expect(MockEventSource.instances).toHaveLength(1);
    expect(MockEventSource.instances[0].url).toContain("token=token-1");

    MockEventSource.instances[0].fail();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
      await Promise.resolve();
    });

    expect(MockEventSource.instances).toHaveLength(2);
    expect(MockEventSource.instances[1].url).toContain("token=token-2");
    expect(mockAuth.currentUser.getIdToken).toHaveBeenCalledTimes(2);

    MockEventSource.instances[1].emit("scan_complete", {
      event_type: "scan_complete",
      scan_id: "scan-1",
      step: "done",
      progress_pct: 100,
      data: { status: "completed" },
    });

    expect(useScanStore.getState()).toMatchObject({
      phase: "complete",
      result: expect.objectContaining({ status: "completed" }),
    });

    unmount();
  });
});
