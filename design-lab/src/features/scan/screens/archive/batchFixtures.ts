/**
 * Batch-scan model — the per-receipt queue state for ScanBatchReviewScreen.
 * Each captured image processes independently; rows land done (merchant/total
 * extracted), failed (retry/discard), or stay processing.
 */
export type BatchItemStatus = "processing" | "done" | "failed";

export interface BatchReceipt {
  id: number;
  status: BatchItemStatus;
  /** extracted when done. */
  merchant?: string;
  total?: number;
  /** L1 store-category id (thumbnail tint) when done. */
  category?: string;
  /** message when failed. */
  error?: string;
}

/** a representative mid-flight queue: a few done, one processing, one failed. */
export const SAMPLE_BATCH: BatchReceipt[] = [
  { id: 1, status: "done", merchant: "Supermercado Líder", total: 28350, category: "supermercados" },
  { id: 2, status: "done", merchant: "Farmacia Cruz Verde", total: 8990, category: "salud-bienestar" },
  { id: 3, status: "processing" },
  { id: 4, status: "done", merchant: "Copec", total: 45200, category: "transporte-vehiculo" },
  { id: 5, status: "failed", error: "No pudimos leer la imagen" },
];

export interface BatchCounts {
  done: number;
  processing: number;
  failed: number;
}

export function batchCounts(items: BatchReceipt[]): BatchCounts {
  return {
    done: items.filter((i) => i.status === "done").length,
    processing: items.filter((i) => i.status === "processing").length,
    failed: items.filter((i) => i.status === "failed").length,
  };
}
