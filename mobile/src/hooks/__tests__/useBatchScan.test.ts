import { createElement, type ReactNode } from "react";
import { act, renderHook } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

jest.mock("../../lib/scanUpload", () => ({
  ScanUploadError: class ScanUploadError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
  submitReceiptScan: jest.fn(),
}));
jest.mock("../../lib/scanTestCases", () => ({ submitScanTestCase: jest.fn() }));
jest.mock("../../lib/scans", () => ({ getScan: jest.fn() }));
jest.mock("../../lib/transactions", () => ({ batchDeleteTransactions: jest.fn() }));
jest.mock("../../lib/api", () => ({
  apiClient: { POST: jest.fn().mockResolvedValue({}) },
}));

import { useBatchScan } from "../useBatchScan";
import { useBatchScanStore, type BatchScanInput } from "../../stores/batchScanStore";
import { submitScanTestCase } from "../../lib/scanTestCases";
import { getScan } from "../../lib/scans";
import { batchDeleteTransactions } from "../../lib/transactions";

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

function testCaseInput(localId: string, caseId: string): BatchScanInput {
  return { localId, label: caseId, source: { kind: "testCase", caseId } };
}

describe("useBatchScan", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useBatchScanStore.getState().reset();
  });

  it("submits each receipt then polls every scan to a terminal status", async () => {
    jest
      .mocked(submitScanTestCase)
      .mockResolvedValueOnce({ id: "scan-a" } as never)
      .mockResolvedValueOnce({ id: "scan-b" } as never);
    jest.mocked(getScan).mockImplementation(async (scanId: string) =>
      scanId === "scan-a"
        ? ({
            id: scanId,
            status: "completed",
            transaction_id: "txn-a",
            error_code: null,
            error_message: null,
          } as never)
        : ({
            id: scanId,
            status: "failed",
            transaction_id: null,
            error_code: "INVALID_IMAGE",
            error_message: "bad image",
          } as never),
    );

    const { result } = renderHook(
      () => useBatchScan({ pollIntervalMs: 1, maxPollAttempts: 5 }),
      { wrapper },
    );

    await act(async () => {
      await result.current.start([
        testCaseInput("a", "happy"),
        testCaseInput("b", "failure"),
      ]);
    });

    const state = useBatchScanStore.getState();
    expect(state.phase).toBe("review");
    const byId = Object.fromEntries(state.items.map((i) => [i.localId, i]));
    expect(byId.a.status).toBe("completed");
    expect(byId.a.transactionId).toBe("txn-a");
    expect(byId.b.status).toBe("failed");
    expect(submitScanTestCase).toHaveBeenCalledTimes(2);
  });

  it("marks an item failed when its submission rejects (no polling)", async () => {
    jest.mocked(submitScanTestCase).mockRejectedValueOnce(new Error("network down"));

    const { result } = renderHook(
      () => useBatchScan({ pollIntervalMs: 1, maxPollAttempts: 3 }),
      { wrapper },
    );

    await act(async () => {
      await result.current.start([testCaseInput("a", "happy")]);
    });

    expect(useBatchScanStore.getState().items[0].status).toBe("failed");
    expect(getScan).not.toHaveBeenCalled();
  });

  it("discards a saved item by deleting its transaction", async () => {
    jest.mocked(submitScanTestCase).mockResolvedValueOnce({ id: "scan-a" } as never);
    jest.mocked(getScan).mockResolvedValue({
      id: "scan-a",
      status: "completed",
      transaction_id: "txn-a",
      error_code: null,
      error_message: null,
    } as never);

    const { result } = renderHook(
      () => useBatchScan({ pollIntervalMs: 1, maxPollAttempts: 5 }),
      { wrapper },
    );

    await act(async () => {
      await result.current.start([testCaseInput("a", "happy")]);
    });
    await act(async () => {
      await result.current.discard("a");
    });

    expect(batchDeleteTransactions).toHaveBeenCalledWith(["txn-a"]);
    expect(useBatchScanStore.getState().items[0].status).toBe("discarded");
  });
});
