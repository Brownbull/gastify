import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  submitScan,
  getScanStatus,
  triggerProcess,
  discardTransactions,
  BatchScanError,
  type BatchScanRequestOptions,
  type ScanStatusResult,
} from "@/lib/batchScan";
import {
  useBatchScanStore,
  type BatchItemPatch,
} from "@/stores/batchScanStore";
import { transactionKeys } from "./useTransactions";
import { insightsKeys } from "./useInsights";

/**
 * Orchestrates a batch of single-scans: seed the store, upload each image
 * sequentially (mvp — gentle on the worker pool), then poll every scan to a
 * terminal status. The backend auto-persists transactions, so completion is the
 * save; `discard` deletes a created transaction, `retry` re-queues a failed one.
 */

export interface BatchScanInput {
  localId: string;
  file: File;
  fileName: string;
  previewUrl: string | null;
}

export interface UseBatchScanOptions {
  pollIntervalMs?: number;
  maxPollAttempts?: number;
  requestOptions?: BatchScanRequestOptions;
}

const DEFAULT_POLL_INTERVAL_MS = 1500;
const DEFAULT_MAX_POLL_ATTEMPTS = 60; // ~90s ceiling at 1.5s cadence

const STATUS_PROGRESS: Record<string, number> = {
  submitted: 10,
  queued: 10,
  processing: 30,
  extracted: 55,
  categorized: 80,
};

function patchFromStatus(status: ScanStatusResult): BatchItemPatch {
  switch (status.status) {
    case "completed":
      return {
        status: "completed",
        progressPct: 100,
        transactionId: status.transaction_id,
      };
    case "needs_review":
      return {
        status: "needs_review",
        progressPct: 100,
        transactionId: status.transaction_id,
      };
    case "failed":
      return {
        status: "failed",
        progressPct: 100,
        errorCode: status.error_code ?? "scan_failed",
        errorMessage: status.error_message,
      };
    default:
      return {
        status: "processing",
        progressPct: STATUS_PROGRESS[status.status] ?? 30,
      };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useBatchScan(options: UseBatchScanOptions = {}) {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const maxPollAttempts = options.maxPollAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS;
  const requestOptions = options.requestOptions;

  const queryClient = useQueryClient();
  const runIdRef = useRef(0);
  const requeuedRef = useRef<Set<string>>(new Set());

  const seedBatch = useBatchScanStore((s) => s.start);
  const patchItem = useBatchScanStore((s) => s.patchItem);
  const reset = useBatchScanStore((s) => s.reset);

  const invalidateLedger = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
    void queryClient.invalidateQueries({ queryKey: insightsKeys.all });
  }, [queryClient]);

  const runPolling = useCallback(async (): Promise<void> => {
    const runId = ++runIdRef.current;

    for (let attempt = 0; attempt < maxPollAttempts; attempt++) {
      if (runIdRef.current !== runId) return;

      const pending = useBatchScanStore
        .getState()
        .items.filter((it) => it.status === "processing" && it.scanId);
      if (pending.length === 0) {
        invalidateLedger();
        return;
      }

      await Promise.all(
        pending.map(async (it) => {
          const scanId = it.scanId;
          if (!scanId) return;
          try {
            const status = await getScanStatus(scanId, requestOptions);
            if (status.status === "queued" && !requeuedRef.current.has(scanId)) {
              requeuedRef.current.add(scanId);
              await triggerProcess(scanId, requestOptions).catch(
                () => undefined,
              );
            }
            patchItem(it.localId, patchFromStatus(status));
          } catch {
            // transient poll failure — try again next tick
          }
        }),
      );

      if (runIdRef.current !== runId) return;
      const stillPending = useBatchScanStore
        .getState()
        .items.some((it) => it.status === "processing");
      if (!stillPending) {
        invalidateLedger();
        return;
      }

      await delay(pollIntervalMs);
    }

    // Attempts exhausted — settle any stragglers so the batch can reach review.
    if (runIdRef.current !== runId) return;
    for (const it of useBatchScanStore.getState().items) {
      if (it.status === "processing") {
        patchItem(it.localId, {
          status: "failed",
          progressPct: 100,
          errorCode: "timeout",
          errorMessage: "Scan timed out before completing",
        });
      }
    }
    invalidateLedger();
  }, [invalidateLedger, maxPollAttempts, patchItem, pollIntervalMs, requestOptions]);

  const start = useCallback(
    async (inputs: readonly BatchScanInput[]): Promise<void> => {
      if (inputs.length === 0) return;
      requeuedRef.current = new Set();

      seedBatch(
        inputs.map((i) => ({
          localId: i.localId,
          fileName: i.fileName,
          previewUrl: i.previewUrl,
        })),
      );

      for (const input of inputs) {
        try {
          const submission = await submitScan(input.file, requestOptions);
          patchItem(input.localId, {
            scanId: submission.id,
            status: "processing",
            progressPct: 15,
          });
        } catch (err) {
          patchItem(input.localId, {
            status: "failed",
            progressPct: 100,
            errorCode: err instanceof BatchScanError ? err.code : "upload_error",
            errorMessage: err instanceof Error ? err.message : "Upload failed",
          });
        }
      }

      await runPolling();
    },
    [patchItem, requestOptions, runPolling, seedBatch],
  );

  const discard = useCallback(
    async (localId: string): Promise<void> => {
      const item = useBatchScanStore
        .getState()
        .items.find((it) => it.localId === localId);
      if (!item) return;
      try {
        if (item.transactionId) {
          await discardTransactions([item.transactionId], requestOptions);
          invalidateLedger();
        }
        patchItem(localId, { status: "discarded" });
      } catch (err) {
        patchItem(localId, {
          errorCode: "discard_error",
          errorMessage: err instanceof Error ? err.message : "Discard failed",
        });
      }
    },
    [invalidateLedger, patchItem, requestOptions],
  );

  const retry = useCallback(
    async (localId: string): Promise<void> => {
      const item = useBatchScanStore
        .getState()
        .items.find((it) => it.localId === localId);
      if (!item?.scanId) return;
      try {
        await triggerProcess(item.scanId, requestOptions);
        patchItem(localId, {
          status: "processing",
          progressPct: 10,
          errorCode: null,
          errorMessage: null,
        });
        await runPolling();
      } catch (err) {
        patchItem(localId, {
          errorCode: "retry_error",
          errorMessage: err instanceof Error ? err.message : "Retry failed",
        });
      }
    },
    [patchItem, requestOptions, runPolling],
  );

  useEffect(() => {
    return () => {
      runIdRef.current = -1; // cancel any in-flight poll loop on unmount
    };
  }, []);

  return { start, discard, retry, reset };
}
