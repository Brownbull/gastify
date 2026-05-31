import { applyScanStatus } from "../scanProgressFallback";
import { useScanStore } from "../../stores/scanStore";
import type { ScanResult } from "../scans";

function scan(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    id: "scan-1",
    status: "processing",
    submitted_at: "2026-05-30T10:00:00Z",
    ...overrides,
  };
}

describe("applyScanStatus", () => {
  beforeEach(() => {
    useScanStore.getState().reset();
  });

  it("maps an in-flight status to non-terminal progress", () => {
    const terminal = applyScanStatus(scan({ status: "processing" }));
    expect(terminal).toBe(false);
    expect(useScanStore.getState().phase).toBe("processing");
  });

  it("maps completed to a terminal scan_complete carrying transaction_id", () => {
    const terminal = applyScanStatus(scan({ status: "completed", transaction_id: "txn-99" }));
    expect(terminal).toBe(true);
    const s = useScanStore.getState();
    expect(s.phase).toBe("complete");
    expect(s.result?.transaction_id).toBe("txn-99");
  });

  it("maps needs_review to a terminal completion with its transaction", () => {
    const terminal = applyScanStatus(scan({ status: "needs_review", transaction_id: "txn-7" }));
    expect(terminal).toBe(true);
    const s = useScanStore.getState();
    expect(s.phase).toBe("complete");
    expect(s.result?.transaction_id).toBe("txn-7");
  });

  it("maps failed to a terminal failure with the error code", () => {
    const terminal = applyScanStatus(
      scan({ status: "failed", error_code: "TIMEOUT_ERROR", error_message: "boom" }),
    );
    expect(terminal).toBe(true);
    const s = useScanStore.getState();
    expect(s.phase).toBe("failed");
    expect(s.errorCode).toBe("timeout_error");
  });
});
