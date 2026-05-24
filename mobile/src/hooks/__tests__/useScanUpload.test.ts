import { act, renderHook } from "@testing-library/react-native";
import { useScanUpload } from "../useScanUpload";
import {
  ScanUploadError,
  submitReceiptScan,
} from "../../lib/scanUpload";
import { submitScanTestCase } from "../../lib/scanTestCases";
import { useScanStore, type ReceiptScanAsset } from "../../stores/scanStore";
import { useSessionStore } from "../../stores/sessionStore";

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

jest.mock("../../lib/scanTestCases", () => ({
  submitScanTestCase: jest.fn(),
}));

const asset: ReceiptScanAsset = {
  fileName: "receipt.jpg",
  fileSize: 1234,
  mimeType: "image/jpeg",
  source: "library",
  uri: "file:///tmp/receipt.jpg",
};

const submission = {
  content_type: "image/jpeg",
  file_size_bytes: 1234,
  id: "scan-123",
  image_path: "scans/scan-123/original.jpg",
  original_filename: "receipt.jpg",
  ownership_scope_id: "scope-1",
  status: "queued",
  submitted_at: "2026-05-24T12:00:00Z",
};

describe("useScanUpload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useScanStore.getState().reset();
    useSessionStore.getState().reset();
    useSessionStore.getState().setSignedInUser({
      displayName: "Test User",
      email: "test@example.com",
      uid: "firebase-uid",
    });
  });

  it("does not apply a scan result after the mobile session is cleared", async () => {
    let resolveSubmission: (value: typeof submission) => void = () => undefined;
    jest.mocked(submitReceiptScan).mockReturnValue(
      new Promise((resolve) => {
        resolveSubmission = resolve;
      }),
    );
    const { result } = renderHook(() => useScanUpload());
    let uploadPromise: Promise<void> = Promise.resolve();

    await act(async () => {
      uploadPromise = result.current.uploadAsset(asset);
      await Promise.resolve();
    });

    expect(useScanStore.getState().phase).toBe("uploading");

    act(() => {
      useSessionStore.getState().reset();
      useScanStore.getState().reset();
    });
    resolveSubmission(submission);

    await act(async () => {
      await uploadPromise;
    });

    expect(useScanStore.getState()).toMatchObject({
      phase: "idle",
      scanId: null,
      submission: null,
    });
  });

  it("maps upload validation failures to stable scan error state", async () => {
    jest
      .mocked(submitReceiptScan)
      .mockRejectedValue(new ScanUploadError("invalid_file_type", "Unsupported image"));
    const { result } = renderHook(() => useScanUpload());

    await act(async () => {
      await result.current.uploadAsset(asset);
    });

    expect(useScanStore.getState()).toMatchObject({
      errorCode: "invalid_file_type",
      errorMessage: "Unsupported image",
      phase: "failed",
    });
  });

  it("does not apply a direct scan-test result after sign-out", async () => {
    let resolveSubmission: (value: typeof submission) => void = () => undefined;
    jest.mocked(submitScanTestCase).mockReturnValue(
      new Promise((resolve) => {
        resolveSubmission = resolve;
      }),
    );
    const { result } = renderHook(() => useScanUpload());
    let runPromise: Promise<void> = Promise.resolve();

    await act(async () => {
      runPromise = result.current.runTestCase("happy");
      await Promise.resolve();
    });

    expect(useScanStore.getState().selectedAsset).toMatchObject({
      fileName: "gastify-test-case-happy.jpg",
      source: "test-case",
    });

    act(() => {
      useSessionStore.getState().reset();
      useScanStore.getState().reset();
    });
    resolveSubmission(submission);

    await act(async () => {
      await runPromise;
    });

    expect(useScanStore.getState().phase).toBe("idle");
    expect(useScanStore.getState().scanId).toBeNull();
  });
});
