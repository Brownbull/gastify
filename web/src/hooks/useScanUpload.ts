import { useCallback, useRef } from "react";
import { auth } from "@/lib/firebase";
import { useScanStore, type ScanSubmissionResult } from "@/stores/scanStore";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export function useScanUpload() {
  const { phase, startUpload, uploadComplete, uploadFailed } = useScanStore();
  const abortRef = useRef<AbortController | null>(null);

  const upload = useCallback(
    async (file: File) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      startUpload();

      try {
        const user = auth.currentUser;
        if (!user) {
          uploadFailed("Not authenticated");
          return;
        }

        const token = await user.getIdToken();
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch(`${API_BASE}/api/v1/scans`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          const detail =
            (body as { detail?: string } | null)?.detail ??
            `Upload failed (${response.status})`;
          uploadFailed(detail);
          return;
        }

        const submission: ScanSubmissionResult = await response.json();
        uploadComplete(submission);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        const message =
          err instanceof Error ? err.message : "Upload failed unexpectedly";
        uploadFailed(message);
      }
    },
    [startUpload, uploadComplete, uploadFailed],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    useScanStore.getState().reset();
  }, []);

  return { upload, cancel, isUploading: phase === "uploading" };
}
