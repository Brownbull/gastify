/**
 * useBatchProcessing Hook
 *
 * Story 12.2: Parallel Processing Service
 * React hook for managing batch image processing state with
 * parallel execution, status tracking, and cancellation support.
 *
 * @see docs/sprint-artifacts/epic12/story-12.2-parallel-processing-service.md
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import {
  processImagesInParallel,
  retryImage,
  getBatchSummary,
  isBatchComplete,
  getSuccessfulTransactions,
  getFailedStates,
  ImageProcessingState,
  ProcessingResult,
  BatchProcessingOptions,
} from '@features/batch-review/services/batchProcessingService';
import type { Transaction } from '@/types/transaction';
import { ReceiptType } from '@/services/gemini';
import { DEFAULT_CURRENCY } from '@/utils/currency';

/**
 * Story 14d.5b: Callbacks for ScanContext integration.
 * These callbacks allow App.tsx to dispatch actions to ScanContext during processing.
 */
export interface BatchProcessingCallbacks {
  /** Called when processing starts for an image (by index) */
  onItemStart?: (index: number) => void;
  /** Called when an image is successfully processed */
  onItemSuccess?: (index: number, result: Transaction) => void;
  /** Called when an image fails to process */
  onItemError?: (index: number, error: string) => void;
  /** Called when all images have been processed.
   * Story 14d.5: Now passes results and images for atomic batchReceipts creation.
   */
  onComplete?: (results: ProcessingResult[], images: string[]) => void;
}

/**
 * Return type for the useBatchProcessing hook.
 */
export interface UseBatchProcessingReturn {
  /** Current processing states for all images */
  states: ImageProcessingState[];
  /** Whether processing is currently active */
  isProcessing: boolean;
  /** Overall progress (current/total) */
  progress: { current: number; total: number };
  /** Start processing a batch of images. Story 14d.5b: Now accepts optional callbacks. */
  startProcessing: (
    images: string[],
    currency: string,
    receiptType?: ReceiptType,
    callbacks?: BatchProcessingCallbacks
  ) => Promise<ProcessingResult[]>;
  /** Cancel ongoing processing (AC #5) */
  cancel: () => void;
  /** Retry a specific failed image (AC #6) */
  retry: (imageId: string, imageDataUrl: string) => Promise<ProcessingResult>;
  /** Reset all state */
  reset: () => void;
  /** Summary statistics */
  summary: ReturnType<typeof getBatchSummary>;
  /** Whether batch is complete */
  isComplete: boolean;
  /** Get successful transactions */
  successfulTransactions: Transaction[];
  /** Get failed states for retry UI */
  failedStates: ImageProcessingState[];
  /** Total results after completion */
  results: ProcessingResult[];
}

/**
 * Hook for managing parallel batch processing of receipt images.
 *
 * Features:
 * - Parallel processing with concurrency limit (AC #1)
 * - Real-time status tracking per image (AC #2)
 * - Overall progress indication (AC #3)
 * - Error isolation (AC #4)
 * - Cancellation support (AC #5)
 * - Retry for failed images (AC #6)
 * - Results collection (AC #7)
 *
 * @param concurrencyLimit - Maximum concurrent API calls (default: 3)
 * @returns Batch processing state and handlers
 *
 * @example
 * ```tsx
 * const { startProcessing, states, progress, cancel } = useBatchProcessing();
 *
 * // Start processing
 * const results = await startProcessing(images, 'CLP');
 *
 * // Monitor progress
 * console.log(`${progress.current}/${progress.total}`);
 *
 * // Cancel if needed
 * cancel();
 * ```
 */
export function useBatchProcessing(concurrencyLimit = 3): UseBatchProcessingReturn {
  // State
  const [states, setStates] = useState<ImageProcessingState[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<ProcessingResult[]>([]);

  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Processing options ref for retry
  const optionsRef = useRef<Pick<BatchProcessingOptions, 'currency' | 'receiptType'>>({
    currency: DEFAULT_CURRENCY,
  });

  /**
   * Start processing a batch of images.
   * Story 14d.5b: Now accepts optional callbacks for ScanContext integration.
   */
  const startProcessing = useCallback(
    async (
      images: string[],
      currency: string,
      receiptType?: ReceiptType,
      callbacks?: BatchProcessingCallbacks
    ): Promise<ProcessingResult[]> => {
      // Don't start if already processing
      if (isProcessing) {
        if (import.meta.env.DEV) {
          console.warn('Batch processing already in progress');
        }
        return [];
      }

      // Reset state
      setStates([]);
      setResults([]);
      setProgress({ current: 0, total: images.length });
      setIsProcessing(true);

      // Store options for retry
      optionsRef.current = { currency, receiptType };

      // Create abort controller
      abortControllerRef.current = new AbortController();

      const options: BatchProcessingOptions = {
        concurrencyLimit,
        currency,
        receiptType,
      };

      // Story 14d.5b: Track which items have had callbacks called to prevent duplicates
      const callbacksCalled = {
        started: new Set<number>(),
        succeeded: new Set<number>(),
        failed: new Set<number>(),
      };

      try {
        const processingResults = await processImagesInParallel(
          images,
          options,
          // Story 14d.5b: Enhanced state callback to also dispatch to ScanContext
          (newStates) => {
            setStates([...newStates]);

            // Call context callbacks for state transitions (only once per item)
            if (callbacks) {
              newStates.forEach((state, index) => {
                // Track which items have started - only call onItemStart once per item
                if (
                  state.status === 'processing' &&
                  !callbacksCalled.started.has(index)
                ) {
                  callbacksCalled.started.add(index);
                  callbacks.onItemStart?.(index);
                }

                // Track completed items - only call once when status changes to ready
                if (
                  state.status === 'ready' &&
                  state.result &&
                  !callbacksCalled.succeeded.has(index)
                ) {
                  callbacksCalled.succeeded.add(index);
                  callbacks.onItemSuccess?.(index, state.result);
                }

                // Track failed items - only call once when status changes to error
                if (
                  state.status === 'error' &&
                  state.error &&
                  !callbacksCalled.failed.has(index)
                ) {
                  callbacksCalled.failed.add(index);
                  callbacks.onItemError?.(index, state.error);
                }
              });
            }
          },
          (current, total) => setProgress({ current, total }),
          abortControllerRef.current.signal
        );

        setResults(processingResults);

        // Story 14d.5b: Call onComplete after all processing finishes
        // Story 14d.5: Now passes results and images for atomic batchReceipts creation
        callbacks?.onComplete?.(processingResults, images);

        return processingResults;
      } finally {
        setIsProcessing(false);
        abortControllerRef.current = null;
      }
    },
    [isProcessing, concurrencyLimit]
  );

  /**
   * Cancel ongoing processing.
   * Stops pending images but allows in-progress API calls to complete.
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * Retry a specific failed image.
   */
  const retry = useCallback(
    async (imageId: string, imageDataUrl: string): Promise<ProcessingResult> => {
      // Find the state for this image
      const stateIndex = states.findIndex((s) => s.id === imageId);
      if (stateIndex === -1) {
        throw new Error(`Image with ID ${imageId} not found`);
      }

      // Update state to processing
      setStates((prev) => {
        const updated = [...prev];
        updated[stateIndex] = {
          ...updated[stateIndex],
          status: 'processing',
          progress: 0,
          error: undefined,
          startedAt: new Date(),
          completedAt: undefined,
        };
        return updated;
      });

      // Retry the image
      const result = await retryImage(imageDataUrl, optionsRef.current);

      // Update state with result
      setStates((prev) => {
        const updated = [...prev];
        updated[stateIndex] = {
          ...updated[stateIndex],
          status: result.success ? 'ready' : 'error',
          progress: result.success ? 100 : 0,
          result: result.result,
          error: result.error,
          completedAt: new Date(),
        };
        return updated;
      });

      // Update results
      setResults((prev) => {
        const updated = [...prev];
        // Find by index since retry result has index 0
        const originalIndex = states[stateIndex].index;
        const resultIndex = updated.findIndex((r) => r.index === originalIndex);
        if (resultIndex !== -1) {
          updated[resultIndex] = {
            ...result,
            id: imageId,
            index: originalIndex,
          };
        } else {
          updated.push({
            ...result,
            id: imageId,
            index: originalIndex,
          });
        }
        return updated;
      });

      return {
        ...result,
        id: imageId,
        index: states[stateIndex].index,
      };
    },
    [states]
  );

  /**
   * Reset all state.
   */
  const reset = useCallback(() => {
    cancel();
    setStates([]);
    setResults([]);
    setProgress({ current: 0, total: 0 });
    setIsProcessing(false);
  }, [cancel]);

  // Computed values
  const summary = useMemo(() => getBatchSummary(states), [states]);
  const isComplete = useMemo(() => states.length > 0 && isBatchComplete(states), [states]);
  const successfulTransactions = useMemo(() => getSuccessfulTransactions(states), [states]);
  const failedStates = useMemo(() => getFailedStates(states), [states]);

  return {
    states,
    isProcessing,
    progress,
    startProcessing,
    cancel,
    retry,
    reset,
    summary,
    isComplete,
    successfulTransactions,
    failedStates,
    results,
  };
}

export default useBatchProcessing;
