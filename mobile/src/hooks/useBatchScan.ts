import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { submitReceiptScan, ScanUploadError } from "../lib/scanUpload";
import { submitScanTestCase } from "../lib/scanTestCases";
import { getScan } from "../lib/scans";
import { apiClient } from "../lib/api";
import { batchDeleteTransactions } from "../lib/transactions";
import { scanStatusToPatch } from "../lib/batchScan";
import {
  useBatchScanStore,
  type BatchScanInput,
} from "../stores/batchScanStore";
import { transactionKeys } from "./useTransactions";
import { insightsKeys } from "./insightsKeys";

/**
 * Orchestrates a batch of receipts on mobile. Each input is either a captured
 * asset (camera / library) or a deterministic test case. Uploads run sequentially
 * (mvp), then every scan is polled to a terminal status. The backend auto-persists
 * transactions, so `discard` deletes a created transaction and `retry` re-queues a
 * failed one.
 */

export interface UseBatchScanOptions {
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

const DEFAULT_POLL_INTERVAL_MS = 1500;
const DEFAULT_MAX_POLL_ATTEMPTS = 60;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function submitInput(input: BatchScanInput): Promise<string> {
  if (input.source.kind === "asset") {
    const submission = await submitReceiptScan(input.source.asset);
    return submission.id;
  }
  const submission = await submitScanTestCase(input.source.caseId);
  return submission.id;
}

async function triggerProcess(scanId: string): Promise<void> {
  await apiClient.POST("/api/v1/scans/{scan_id}/process", {
    params: { path: { scan_id: scanId } },
  });
}

export function useBatchScan(options: UseBatchScanOptions = {}) {
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const maxPollAttempts = options.maxPollAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS;

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
            const scan = await getScan(scanId);
            if (scan.status === "queued" && !requeuedRef.current.has(scanId)) {
              requeuedRef.current.add(scanId);
              await triggerProcess(scanId).catch(() => undefined);
            }
            patchItem(it.localId, scanStatusToPatch(scan));
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
  }, [invalidateLedger, maxPollAttempts, patchItem, pollIntervalMs]);

  const start = useCallback(
    async (inputs: readonly BatchScanInput[]): Promise<void> => {
      if (inputs.length === 0) return;
      requeuedRef.current = new Set();

      seedBatch(inputs.map((i) => ({ localId: i.localId, label: i.label })));

      for (const input of inputs) {
        try {
          const scanId = await submitInput(input);
          patchItem(input.localId, {
            scanId,
            status: "processing",
            progressPct: 15,
          });
        } catch (err) {
          patchItem(input.localId, {
            status: "failed",
            progressPct: 100,
            errorCode: err instanceof ScanUploadError ? err.code : "upload_error",
            errorMessage: err instanceof Error ? err.message : "Upload failed",
          });
        }
      }

      await runPolling();
    },
    [patchItem, runPolling, seedBatch],
  );

  const discard = useCallback(
    async (localId: string): Promise<void> => {
      const item = useBatchScanStore
        .getState()
        .items.find((it) => it.localId === localId);
      if (!item) return;
      try {
        if (item.transactionId) {
          await batchDeleteTransactions([item.transactionId]);
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
    [invalidateLedger, patchItem],
  );

  const retry = useCallback(
    async (localId: string): Promise<void> => {
      const item = useBatchScanStore
        .getState()
        .items.find((it) => it.localId === localId);
      if (!item?.scanId) return;
      try {
        await triggerProcess(item.scanId);
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
    [patchItem, runPolling],
  );

  useEffect(() => {
    return () => {
      runIdRef.current = -1; // cancel any in-flight poll loop on unmount
    };
  }, []);

  return { start, discard, retry, reset };
}
