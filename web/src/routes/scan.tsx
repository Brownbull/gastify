import { useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileUpload } from "@/components/FileUpload";
import { ScanProgress } from "@/components/ScanProgress";
import { ScanError } from "@/components/ScanError";
import { ScanResult } from "@/components/ScanResult";
import { useScanUpload } from "@/hooks/useScanUpload";
import { useScanStream } from "@/hooks/useScanStream";
import { useScanStore } from "@/stores/scanStore";
import { PersonalOnlyNotice } from "@/components/PersonalOnlyNotice";
import { useQuota } from "@/hooks/useQuota";
import { useUiStore } from "@/stores/uiStore";

export const Route = createFileRoute("/scan")({
  component: ScanPage,
});

function ScanPage() {
  const phase = useScanStore((s) => s.phase);
  const { upload, isUploading } = useScanUpload();
  useScanStream();
  const inGroupMode = useUiStore((s) => s.activeScope.kind === "group");
  const quota = useQuota();

  const handleFileSelected = useCallback(
    (file: File) => {
      void upload(file);
    },
    [upload],
  );

  const handleRetry = useCallback(() => {
    useScanStore.getState().reset();
  }, []);

  const showUpload = phase === "idle";
  const showProgress =
    phase === "uploading" ||
    phase === "submitted" ||
    phase === "processing" ||
    phase === "extracting" ||
    phase === "categorizing" ||
    phase === "verified";
  const showResult = phase === "complete";
  const showError = phase === "failed";

  if (inGroupMode) return <PersonalOnlyNotice />;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1
          className="text-2xl font-semibold"
          style={{ color: "var(--text)" }}
        >
          Scan Receipt
        </h1>
        <p
          className="mt-1 text-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          Upload a receipt image to extract transaction data.
        </p>
        {quota.data && (
          <p className="mt-1 text-xs" data-testid="scan-quota" style={{ color: "var(--text-muted)" }}>
            {quota.data.features.scan.used}/{quota.data.features.scan.limit}
          </p>
        )}
      </div>

      {showUpload && (
        <FileUpload
          onFileSelected={handleFileSelected}
          disabled={isUploading}
        />
      )}

      {showProgress && <ScanProgress />}
      {showResult && <ScanResult />}
      {showError && <ScanError onRetry={handleRetry} />}
    </div>
  );
}
