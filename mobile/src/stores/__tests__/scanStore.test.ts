import { useScanStore, type ReceiptScanAsset } from "../scanStore";

const asset: ReceiptScanAsset = {
  uri: "file:///tmp/receipt.jpg",
  fileName: "receipt.jpg",
  mimeType: "image/jpeg",
  fileSize: 1234,
  source: "camera",
};

const submission = {
  id: "scan-123",
  ownership_scope_id: "scope-1",
  status: "queued",
  original_filename: "receipt.jpg",
  content_type: "image/jpeg",
  file_size_bytes: 1234,
  image_path: "scans/scan-123/original.jpg",
  submitted_at: "2026-05-17T12:00:00Z",
};

describe("scanStore", () => {
  beforeEach(() => {
    useScanStore.getState().reset();
  });

  it("tracks upload, backend progress, and completed result state", () => {
    useScanStore.getState().startUpload(asset);

    expect(useScanStore.getState()).toMatchObject({
      phase: "uploading",
      selectedAsset: asset,
      progressPct: 0,
    });

    useScanStore.getState().uploadComplete(submission);

    expect(useScanStore.getState()).toMatchObject({
      phase: "submitted",
      scanId: "scan-123",
      connectionStatus: "connecting",
    });

    useScanStore.getState().receiveEvent({
      event_type: "extraction_complete",
      scan_id: "scan-123",
      step: "stage1",
      progress_pct: 40,
      data: { confidence: 0.84 },
    });

    expect(useScanStore.getState()).toMatchObject({
      phase: "extracting",
      currentStep: "stage1",
      progressPct: 40,
    });

    useScanStore.getState().receiveEvent({
      event_type: "scan_complete",
      scan_id: "scan-123",
      step: "done",
      progress_pct: 100,
      data: {
        status: "needs_review",
        transaction_id: "txn-123",
        confidence_score: 0.51,
        is_new_merchant: true,
      },
    });

    expect(useScanStore.getState()).toMatchObject({
      phase: "complete",
      progressPct: 100,
      connectionStatus: "closed",
      result: {
        status: "needs_review",
        transaction_id: "txn-123",
        confidence_score: 0.51,
        is_new_merchant: true,
      },
    });
  });

  it("does not let a sparse poll scan_complete clobber a richer WS result", () => {
    const store = useScanStore.getState();
    // Rich WS scan_complete first (amounts + line items).
    store.receiveEvent({
      event_type: "scan_complete",
      scan_id: "scan-123",
      step: "done",
      progress_pct: 100,
      data: {
        status: "completed",
        transaction_id: "txn-1",
        total_amount: 15990,
        line_items: [{ name: "Leche", total_price: 15990 }],
      },
    });
    expect(useScanStore.getState().result?.total_amount).toBe(15990);

    // Sparse poll-fallback scan_complete (status + transaction_id only) must not wipe amounts.
    store.receiveEvent({
      event_type: "scan_complete",
      scan_id: "scan-123",
      step: "done",
      progress_pct: 100,
      data: { status: "completed", transaction_id: "txn-1" },
    });
    const result = useScanStore.getState().result;
    expect(result?.total_amount).toBe(15990);
    expect(result?.line_items).toHaveLength(1);
    expect(result?.transaction_id).toBe("txn-1");
  });

  it("normalizes backend scan failures for the UI", () => {
    useScanStore.getState().uploadComplete(submission);

    useScanStore.getState().receiveEvent({
      event_type: "scan_failed",
      scan_id: "scan-123",
      step: "stage1",
      progress_pct: 30,
      error: {
        code: "INVALID_IMAGE",
        message: "The selected receipt could not be read",
      },
    });

    expect(useScanStore.getState()).toMatchObject({
      phase: "failed",
      errorCode: "invalid_image",
      errorMessage: "The selected receipt could not be read",
      connectionStatus: "closed",
    });
  });
});
