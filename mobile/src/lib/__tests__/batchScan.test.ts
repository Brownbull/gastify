import { scanStatusToPatch } from "../batchScan";
import type { ScanResult } from "../scans";

function scan(partial: Partial<ScanResult>): ScanResult {
  return {
    id: "scan-1",
    status: "processing",
    submitted_at: "2026-06-03T00:00:00Z",
    ...partial,
  } as ScanResult;
}

describe("scanStatusToPatch", () => {
  it("maps completed → completed carrying the transaction id", () => {
    expect(
      scanStatusToPatch(scan({ status: "completed", transaction_id: "txn-1" })),
    ).toEqual({ status: "completed", progressPct: 100, transactionId: "txn-1" });
  });

  it("maps needs_review → needs_review carrying the transaction id", () => {
    expect(
      scanStatusToPatch(scan({ status: "needs_review", transaction_id: "txn-2" })),
    ).toEqual({ status: "needs_review", progressPct: 100, transactionId: "txn-2" });
  });

  it("maps failed → failed carrying the error", () => {
    expect(
      scanStatusToPatch(
        scan({
          status: "failed",
          error_code: "INVALID_IMAGE",
          error_message: "bad image",
        }),
      ),
    ).toEqual({
      status: "failed",
      progressPct: 100,
      errorCode: "INVALID_IMAGE",
      errorMessage: "bad image",
    });
  });

  it("maps in-flight statuses → processing with staged progress", () => {
    expect(scanStatusToPatch(scan({ status: "submitted" })).progressPct).toBe(10);
    expect(scanStatusToPatch(scan({ status: "extracted" })).progressPct).toBe(55);
    expect(scanStatusToPatch(scan({ status: "categorized" })).progressPct).toBe(80);
    expect(scanStatusToPatch(scan({ status: "processing" }))).toEqual({
      status: "processing",
      progressPct: 30,
    });
  });
});
