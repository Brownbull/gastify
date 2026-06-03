import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

vi.mock("@/lib/firebase", () => ({ auth: { currentUser: null } }));

const { submitScan, getScanStatus, triggerProcess, discardTransactions } =
  vi.hoisted(() => ({
    submitScan: vi.fn(),
    getScanStatus: vi.fn(),
    triggerProcess: vi.fn(),
    discardTransactions: vi.fn(),
  }));

vi.mock("@/lib/batchScan", () => ({
  submitScan,
  getScanStatus,
  triggerProcess,
  discardTransactions,
  BatchScanError: class BatchScanError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

import { useBatchScan } from "./useBatchScan";
import { useBatchScanStore } from "@/stores/batchScanStore";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function input(localId: string, name: string) {
  return {
    localId,
    file: new File(["x"], name, { type: "image/jpeg" }),
    fileName: name,
    previewUrl: null,
  };
}

describe("useBatchScan", () => {
  beforeEach(() => {
    useBatchScanStore.getState().reset();
    vi.clearAllMocks();
  });

  it("uploads each receipt then polls every scan to a terminal status", async () => {
    submitScan
      .mockResolvedValueOnce({ id: "scan-a" })
      .mockResolvedValueOnce({ id: "scan-b" });
    getScanStatus.mockImplementation(async (scanId: string) =>
      scanId === "scan-a"
        ? {
            id: scanId,
            status: "completed",
            error_code: null,
            error_message: null,
            transaction_id: "txn-a",
          }
        : {
            id: scanId,
            status: "failed",
            error_code: "INVALID_IMAGE",
            error_message: "bad image",
            transaction_id: null,
          },
    );

    const { result } = renderHook(
      () => useBatchScan({ pollIntervalMs: 1, maxPollAttempts: 5 }),
      { wrapper },
    );

    await act(async () => {
      await result.current.start([input("a", "a.jpg"), input("b", "b.jpg")]);
    });

    const state = useBatchScanStore.getState();
    expect(state.phase).toBe("review");
    const byId = Object.fromEntries(state.items.map((i) => [i.localId, i]));
    expect(byId.a.status).toBe("completed");
    expect(byId.a.transactionId).toBe("txn-a");
    expect(byId.b.status).toBe("failed");
    expect(submitScan).toHaveBeenCalledTimes(2);
  });

  it("marks an item failed when its upload rejects (no polling)", async () => {
    submitScan.mockRejectedValueOnce(new Error("network down"));

    const { result } = renderHook(
      () => useBatchScan({ pollIntervalMs: 1, maxPollAttempts: 3 }),
      { wrapper },
    );

    await act(async () => {
      await result.current.start([input("a", "a.jpg")]);
    });

    expect(useBatchScanStore.getState().items[0].status).toBe("failed");
    expect(getScanStatus).not.toHaveBeenCalled();
  });

  it("discards a saved item by deleting its transaction", async () => {
    submitScan.mockResolvedValueOnce({ id: "scan-a" });
    getScanStatus.mockResolvedValue({
      id: "scan-a",
      status: "completed",
      error_code: null,
      error_message: null,
      transaction_id: "txn-a",
    });

    const { result } = renderHook(
      () => useBatchScan({ pollIntervalMs: 1, maxPollAttempts: 5 }),
      { wrapper },
    );

    await act(async () => {
      await result.current.start([input("a", "a.jpg")]);
    });
    await act(async () => {
      await result.current.discard("a");
    });

    expect(discardTransactions).toHaveBeenCalledWith(["txn-a"], undefined);
    expect(useBatchScanStore.getState().items[0].status).toBe("discarded");
  });
});
