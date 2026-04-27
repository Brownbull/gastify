/**
 * useBatchReview Hook
 *
 * Story 12.3: Batch Review Queue
 * React hook for managing batch review state, including editing,
 * discarding, and saving all receipts.
 *
 * Story 14d.5c + 14e-11: Store Adapter Integration
 * The hook supports two modes:
 * 1. Standalone mode: Manages local state from processingResults (for tests)
 * 2. Context mode: Reads/writes via store adapter (production uses Zustand)
 *
 * When `useContext: true` is passed in options, the hook delegates all
 * state management to the scan Zustand store via the adapter interface.
 *
 * @see docs/sprint-artifacts/epic12/story-12.3-batch-review-queue.md
 * @see docs/sprint-artifacts/epic14d/stories/story-14d.5c-review-flow-migration.md
 */

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { Transaction } from '@/types/transaction';
// Story 14d.5c: Import BatchReceipt from types file to avoid circular dependency
import type { BatchReceipt, BatchReceiptStatus } from '@/types/batchReceipt';
// Re-export for backwards compatibility
export type { BatchReceipt, BatchReceiptStatus };
import { ImageProcessingState, ProcessingResult } from '@features/batch-review/services/batchProcessingService';
import { calculateConfidence, QUICK_SAVE_CONFIDENCE_THRESHOLD } from '@/utils/confidenceCheck';

/**
 * Story 14d.5c + 14e-11: Minimal adapter interface for scan store integration.
 *
 * This interface abstracts the scan state source, allowing the hook to work with
 * either Zustand store (production) or mock data (tests). Components create an
 * adapter object from Zustand selectors and pass it to this hook.
 */
interface BatchReviewStoreAdapter {
  state: {
    batchReceipts: BatchReceipt[] | null;
  };
  updateBatchReceipt: (id: string, updates: Partial<BatchReceipt>) => void;
  discardBatchReceipt: (id: string) => void;
}

/**
 * Return type for the useBatchReview hook.
 */
export interface UseBatchReviewReturn {
  /** All receipts in the review queue */
  receipts: BatchReceipt[];
  /** Total amount across all valid receipts */
  totalAmount: number;
  /** Detected currency from receipts (if all same), otherwise undefined */
  detectedCurrency: string | undefined;
  /** Count of valid (non-error) receipts */
  validCount: number;
  /** Count of receipts needing review */
  reviewCount: number;
  /** Count of error receipts */
  errorCount: number;
  /** Whether save all is in progress */
  isSaving: boolean;
  /** Current save progress (0 to total) */
  saveProgress: number;
  /** Update a receipt's transaction data (marks as edited) */
  updateReceipt: (id: string, transaction: Transaction) => void;
  /** Discard a receipt from the batch */
  discardReceipt: (id: string) => void;
  /** Save all valid receipts to Firestore (Story 14.15: also returns saved transactions) */
  saveAll: (
    saveTransaction: (transaction: Transaction) => Promise<string>
  ) => Promise<{ saved: string[]; failed: string[]; savedTransactions: Transaction[] }>;
  /** Story 12.1 v9.7.0: Save a single receipt and remove from batch */
  saveOne: (
    id: string,
    saveTransaction: (transaction: Transaction) => Promise<string>
  ) => Promise<{ transactionId: string | null; transaction: Transaction | null }>;
  /** Get a receipt by ID for editing */
  getReceipt: (id: string) => BatchReceipt | undefined;
  /** Check if batch is empty (all discarded) */
  isEmpty: boolean;
}

/**
 * Determine receipt status based on processing result and confidence.
 */
function determineReceiptStatus(
  result: ProcessingResult | ImageProcessingState
): BatchReceiptStatus {
  // Error state
  if ('success' in result && !result.success) {
    return 'error';
  }
  if ('status' in result && result.status === 'error') {
    return 'error';
  }

  // Get transaction for confidence check
  const transaction = 'result' in result ? result.result : undefined;
  if (!transaction) {
    return 'error';
  }

  // Calculate confidence
  const confidence = calculateConfidence(transaction);
  return confidence >= QUICK_SAVE_CONFIDENCE_THRESHOLD ? 'ready' : 'review';
}

/**
 * Story 14d.5c: Create BatchReceipt[] from ProcessingResult[].
 *
 * This is the transformation function used when batch processing completes.
 * It converts the raw ProcessingResult[] into BatchReceipt[] with status
 * and confidence metadata for the review UI.
 *
 * @param processingResults - Results from useBatchProcessing
 * @param imageDataUrls - Original image data URLs for display
 * @returns BatchReceipt[] ready for review
 */
export function createBatchReceiptsFromResults(
  processingResults: ProcessingResult[],
  imageDataUrls: string[] = []
): BatchReceipt[] {
  return processingResults.map((result) => {
    const transaction = result.result || {
      merchant: '',
      date: new Date().toISOString().split('T')[0],
      total: 0,
      category: 'Other' as const,
      items: [],
    };

    const status = determineReceiptStatus(result);
    const confidence = result.success && result.result
      ? calculateConfidence(result.result)
      : 0;

    return {
      id: result.id,
      index: result.index,
      imageUrl: imageDataUrls[result.index],
      transaction,
      status,
      confidence,
      error: result.error,
    };
  });
}

/**
 * Story 14d.5c: Options for useBatchReview hook.
 */
export interface UseBatchReviewOptions {
  /**
   * When true, the hook reads from and writes to scan Zustand store.
   * When false (default), the hook manages local state.
   *
   * Use false for tests, true for production.
   */
  useContext?: boolean;

  /**
   * Story 14d.5c + 14e-11: Injected store adapter.
   *
   * When provided, this adapter is used to read/write scan state.
   * This is the preferred way to integrate with store as it avoids
   * module resolution issues during tests.
   *
   * In production, pass an adapter created from Zustand store selectors.
   * In tests without store, simply omit this option.
   */
  scanContext?: BatchReviewStoreAdapter | null;
}

/**
 * Hook for managing batch review state.
 *
 * Story 14d.5c: Now supports context mode for state machine integration.
 *
 * @param processingResults - Results from parallel processing (Story 12.2)
 * @param imageDataUrls - Original image data URLs for display
 * @param options - Configuration options (see UseBatchReviewOptions)
 * @returns Batch review state and handlers
 *
 * @example
 * ```tsx
 * // Production usage (context mode)
 * const review = useBatchReview(processingResults, imageDataUrls, { useContext: true });
 *
 * // Test usage (standalone mode)
 * const review = useBatchReview(processingResults, imageDataUrls);
 * ```
 */
export function useBatchReview(
  processingResults: ProcessingResult[],
  imageDataUrls: string[] = [],
  options: UseBatchReviewOptions = {}
): UseBatchReviewReturn {
  const { useContext: useContextMode = false, scanContext = null } = options;

  // Story 14d.5c: Use injected context if provided, otherwise default to null
  // This avoids importing useScanOptional which can cause module resolution issues in tests
  const isContextModeActive = useContextMode && scanContext !== null;

  // Initialize receipts from processing results (used for local state)
  const initialReceipts = useMemo<BatchReceipt[]>(() => {
    return createBatchReceiptsFromResults(processingResults, imageDataUrls);
  }, [processingResults, imageDataUrls]);

  // Local state (used when not in context mode)
  const [localReceipts, setLocalReceipts] = useState<BatchReceipt[]>(initialReceipts);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);

  // Story 14d.5c: Determine which receipts to use based on mode
  // Context mode: read from scanContext.state.batchReceipts
  // Local mode: use local state
  const receipts = isContextModeActive
    ? (scanContext.state.batchReceipts ?? [])
    : localReceipts;

  // Story 14.30.8: Track processingResults reference to detect actual changes
  // Using a ref prevents infinite loops caused by initialReceipts dependency
  const prevProcessingResultsRef = useRef<ProcessingResult[]>(processingResults);

  // Sync local receipts when processingResults actually changes (local mode only)
  // Story 14.30.8: Only sync when the processingResults array reference changes,
  // NOT when initialReceipts changes (which would cause infinite loop after updateReceipt)
  useEffect(() => {
    if (!isContextModeActive && processingResults !== prevProcessingResultsRef.current) {
      prevProcessingResultsRef.current = processingResults;
      if (processingResults.length > 0) {
        setLocalReceipts(initialReceipts);
      }
    }
  }, [isContextModeActive, processingResults, initialReceipts]);

  /**
   * Update a receipt's transaction data.
   * Marks the receipt as 'edited' and recalculates confidence.
   *
   * Story 14d.5c + 14e-11: In context mode, dispatches to scan store.
   */
  const updateReceipt = useCallback((id: string, transaction: Transaction) => {
    const confidence = calculateConfidence(transaction);
    const updates: Partial<BatchReceipt> = {
      transaction,
      status: 'edited' as const,
      confidence,
    };

    if (isContextModeActive && scanContext) {
      // Context mode: update via scan store adapter
      scanContext.updateBatchReceipt(id, updates);
    } else {
      // Local mode: update local state
      setLocalReceipts((prev) =>
        prev.map((receipt) => {
          if (receipt.id !== id) return receipt;
          return { ...receipt, ...updates };
        })
      );
    }
  }, [isContextModeActive, scanContext]);

  /**
   * Discard a receipt from the batch.
   *
   * Story 14d.5c + 14e-11: In context mode, dispatches to scan store.
   */
  const discardReceipt = useCallback((id: string) => {
    if (isContextModeActive && scanContext) {
      // Context mode: discard via scan store adapter
      scanContext.discardBatchReceipt(id);
    } else {
      // Local mode: update local state
      setLocalReceipts((prev) => prev.filter((receipt) => receipt.id !== id));
    }
  }, [isContextModeActive, scanContext]);

  /**
   * Get a receipt by ID for editing.
   */
  const getReceipt = useCallback(
    (id: string): BatchReceipt | undefined => {
      return receipts.find((r) => r.id === id);
    },
    [receipts]
  );

  /**
   * Save all valid receipts to Firestore.
   * Story 14.15: Also returns saved transactions for batch complete modal.
   */
  const saveAll = useCallback(
    async (
      saveTransaction: (transaction: Transaction) => Promise<string>
    ): Promise<{ saved: string[]; failed: string[]; savedTransactions: Transaction[] }> => {
      // Get valid receipts (non-error)
      const validReceipts = receipts.filter((r) => r.status !== 'error');

      if (validReceipts.length === 0) {
        return { saved: [], failed: [], savedTransactions: [] };
      }

      setIsSaving(true);
      setSaveProgress(0);

      const saved: string[] = [];
      const failed: string[] = [];
      const savedTransactions: Transaction[] = [];

      // Save each receipt sequentially
      for (let i = 0; i < validReceipts.length; i++) {
        const receipt = validReceipts[i];

        try {
          const transactionId = await saveTransaction(receipt.transaction);
          saved.push(transactionId);
          // Story 14.15: Store transaction with ID for batch complete modal
          savedTransactions.push({ ...receipt.transaction, id: transactionId });
        } catch (error) {
          console.error(`Failed to save receipt ${receipt.id}:`, error instanceof Error ? error.message : String(error));
          failed.push(receipt.id);
        }

        setSaveProgress(i + 1);
      }

      setIsSaving(false);
      return { saved, failed, savedTransactions };
    },
    [receipts]
  );

  /**
   * Story 12.1 v9.7.0: Save a single receipt and remove it from the batch.
   *
   * Story 14d.5c: In context mode, uses context's discard method after save.
   */
  const saveOne = useCallback(
    async (
      id: string,
      saveTransaction: (transaction: Transaction) => Promise<string>
    ): Promise<{ transactionId: string | null; transaction: Transaction | null }> => {
      const receipt = receipts.find((r) => r.id === id);
      if (!receipt || receipt.status === 'error') {
        return { transactionId: null, transaction: null };
      }

      try {
        const transactionId = await saveTransaction(receipt.transaction);
        // Remove from batch after successful save
        if (isContextModeActive && scanContext) {
          scanContext.discardBatchReceipt(id);
        } else {
          setLocalReceipts((prev) => prev.filter((r) => r.id !== id));
        }
        return {
          transactionId,
          transaction: { ...receipt.transaction, id: transactionId },
        };
      } catch (error) {
        console.error(`Failed to save receipt ${id}:`, error instanceof Error ? error.message : String(error));
        return { transactionId: null, transaction: null };
      }
    },
    [receipts, isContextModeActive, scanContext]
  );

  // Computed values
  const validReceipts = useMemo(
    () => receipts.filter((r) => r.status !== 'error'),
    [receipts]
  );

  const totalAmount = useMemo(
    () => validReceipts.reduce((sum, r) => sum + (r.transaction.total || 0), 0),
    [validReceipts]
  );

  // Detect the predominant currency from receipts (for display purposes)
  // If all receipts have the same currency, use that; otherwise undefined
  const detectedCurrency = useMemo(() => {
    const currencies = validReceipts
      .map((r) => r.transaction.currency)
      .filter((c): c is string => Boolean(c));

    if (currencies.length === 0) return undefined;

    // Check if all currencies are the same
    const firstCurrency = currencies[0];
    const allSame = currencies.every((c) => c === firstCurrency);

    return allSame ? firstCurrency : undefined;
  }, [validReceipts]);

  const validCount = validReceipts.length;

  const reviewCount = useMemo(
    () => receipts.filter((r) => r.status === 'review').length,
    [receipts]
  );

  const errorCount = useMemo(
    () => receipts.filter((r) => r.status === 'error').length,
    [receipts]
  );

  const isEmpty = receipts.length === 0;

  return {
    receipts,
    totalAmount,
    detectedCurrency,
    validCount,
    reviewCount,
    errorCount,
    isSaving,
    saveProgress,
    updateReceipt,
    discardReceipt,
    saveAll,
    saveOne,
    getReceipt,
    isEmpty,
  };
}

export default useBatchReview;
