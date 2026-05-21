import { useCallback, useRef } from "react";
import {
  ScanUploadError,
  submitReceiptScan,
} from "../lib/scanUpload";
import { submitScanTestCase } from "../lib/scanTestCases";
import {
  useScanStore,
  type ReceiptScanAsset,
} from "../stores/scanStore";

export function useScanUpload() {
  const phase = useScanStore((state) => state.phase);
  const startUpload = useScanStore((state) => state.startUpload);
  const uploadComplete = useScanStore((state) => state.uploadComplete);
  const failScan = useScanStore((state) => state.failScan);
  const abortRef = useRef<AbortController | null>(null);

  const uploadAsset = useCallback(
    async (asset: ReceiptScanAsset) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      startUpload(asset);

      try {
        const submission = await submitReceiptScan(asset, {
          signal: controller.signal,
        });
        uploadComplete(submission);
      } catch (err: unknown) {
        if (isAbortError(err)) return;

        if (err instanceof ScanUploadError) {
          failScan(err.code, err.message);
          return;
        }

        failScan(
          "upload_error",
          err instanceof Error ? err.message : "Upload failed unexpectedly",
        );
      }
    },
    [failScan, startUpload, uploadComplete],
  );

  const runTestCase = useCallback(
    async (caseId: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      startUpload({
        uri: `test-case://${caseId}`,
        fileName: `gastify-test-case-${caseId}.jpg`,
        mimeType: "image/jpeg",
        source: "test-case",
      });

      try {
        const submission = await submitScanTestCase(caseId, {
          signal: controller.signal,
        });
        uploadComplete(submission);
      } catch (err: unknown) {
        if (isAbortError(err)) return;

        if (err instanceof ScanUploadError) {
          failScan(err.code, err.message);
          return;
        }

        failScan(
          "upload_error",
          err instanceof Error ? err.message : "Scan test case failed unexpectedly",
        );
      }
    },
    [failScan, startUpload, uploadComplete],
  );

  const cancelUpload = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    useScanStore.getState().reset();
  }, []);

  return {
    cancelUpload,
    isUploading: phase === "uploading",
    runTestCase,
    uploadAsset,
  };
}

function isAbortError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === "AbortError" || err.message.toLowerCase().includes("aborted"))
  );
}
