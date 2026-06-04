import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { BatchScanQueue, type QueuedFile } from "@/components/BatchScanQueue";
import { BatchScanReview } from "@/components/BatchScanReview";
import { useBatchScan } from "@/hooks/useBatchScan";
import { useBatchScanStore } from "@/stores/batchScanStore";
import { useI18n } from "@/hooks/useI18n";
import { PersonalOnlyNotice } from "@/components/PersonalOnlyNotice";
import { useUiStore } from "@/stores/uiStore";

export const Route = createFileRoute("/scan-batch")({
  component: BatchScanPage,
});

const MAX_FILES = 10;
let localIdCounter = 0;

function nextLocalId(): string {
  localIdCounter += 1;
  return `batch-${localIdCounter}`;
}

function BatchScanPage() {
  const { t } = useI18n();
  const phase = useBatchScanStore((s) => s.phase);
  const items = useBatchScanStore((s) => s.items);
  const { start, discard, retry } = useBatchScan();
  const inGroupMode = useUiStore((s) => s.activeScope.kind === "group");

  const [queued, setQueued] = useState<readonly QueuedFile[]>([]);
  const urlsRef = useRef<Set<string>>(new Set());

  const revokeAll = useCallback(() => {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current.clear();
  }, []);

  // Clean up object URLs and the global batch store when leaving the screen.
  useEffect(() => {
    return () => {
      revokeAll();
      useBatchScanStore.getState().reset();
    };
  }, [revokeAll]);

  const handleAddFiles = useCallback((files: File[]) => {
    setQueued((prev) => {
      const additions = files.map((file) => {
        const previewUrl = URL.createObjectURL(file);
        urlsRef.current.add(previewUrl);
        return {
          localId: nextLocalId(),
          file,
          fileName: file.name,
          previewUrl,
        } satisfies QueuedFile;
      });
      return [...prev, ...additions];
    });
  }, []);

  const handleRemove = useCallback((localId: string) => {
    setQueued((prev) => {
      const target = prev.find((q) => q.localId === localId);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
        urlsRef.current.delete(target.previewUrl);
      }
      return prev.filter((q) => q.localId !== localId);
    });
  }, []);

  const handleScan = useCallback(() => {
    if (queued.length === 0) return;
    void start(
      queued.map((q) => ({
        localId: q.localId,
        file: q.file,
        fileName: q.fileName,
        previewUrl: q.previewUrl,
      })),
    );
  }, [queued, start]);

  const handleReset = useCallback(() => {
    revokeAll();
    setQueued([]);
    useBatchScanStore.getState().reset();
  }, [revokeAll]);

  if (inGroupMode) return <PersonalOnlyNotice />;

  return (
    <div className="mx-auto max-w-xl space-y-6" data-testid="batch-scan-page">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
          {t("batch.title")}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          {t("batch.subtitle")}
        </p>
      </div>

      {phase === "idle" ? (
        <BatchScanQueue
          queued={queued}
          maxFiles={MAX_FILES}
          onAddFiles={handleAddFiles}
          onRemove={handleRemove}
          onScan={handleScan}
        />
      ) : (
        <BatchScanReview
          items={items}
          phase={phase}
          onDiscard={(id) => void discard(id)}
          onRetry={(id) => void retry(id)}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
