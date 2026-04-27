/**
 * Batch Processing Service
 *
 * Story 12.2: Parallel Processing Service
 * Enables concurrent processing of multiple receipt images with status tracking,
 * error isolation, and cancellation support.
 *
 * @see docs/sprint-artifacts/epic12/story-12.2-parallel-processing-service.md
 */

import { analyzeReceipt, ReceiptType } from '@/services/gemini';
import type { Transaction } from '@/types/transaction';
import { extractErrorMessage } from '@/utils/errorHandler';

/**
 * Status of an individual image in the batch.
 * Follows state machine pattern from ADR-020.
 */
export type ImageProcessingStatus =
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'error';

/**
 * State of an individual image being processed.
 * Tracks status, progress, and results for UI display.
 */
export interface ImageProcessingState {
  /** Unique identifier for this image */
  id: string;
  /** Original image index in the batch */
  index: number;
  /** Current processing status */
  status: ImageProcessingStatus;
  /** Upload progress (0-100) */
  progress: number;
  /** Extracted transaction data (when status is 'ready') */
  result?: Transaction;
  /** Error message (when status is 'error') */
  error?: string;
  /** Processing start time */
  startedAt?: Date;
  /** Processing completion time */
  completedAt?: Date;
}

/**
 * Result of processing a single image.
 * Used for final batch results collection.
 */
export interface ProcessingResult {
  /** Image identifier */
  id: string;
  /** Image index in original batch */
  index: number;
  /** Whether processing succeeded */
  success: boolean;
  /** Extracted transaction data (if successful) */
  result?: Transaction;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Callback type for status updates.
 */
export type StatusCallback = (states: ImageProcessingState[]) => void;

/**
 * Callback type for progress updates.
 */
export type ProgressCallback = (current: number, total: number) => void;

/**
 * Configuration options for batch processing.
 */
export interface BatchProcessingOptions {
  /** Maximum concurrent requests (default: 3) */
  concurrencyLimit?: number;
  /** Currency code for receipt processing */
  currency: string;
  /** Optional store type hint */
  receiptType?: ReceiptType;
}

/** Default concurrency limit (AC #1) */
const DEFAULT_CONCURRENCY_LIMIT = 3;

/**
 * Generate a unique ID for a batch image.
 */
function generateImageId(index: number): string {
  return `batch-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Process multiple receipt images in parallel with concurrency limiting.
 *
 * Features:
 * - Concurrent processing with configurable limit (AC #1)
 * - Individual status tracking (AC #2)
 * - Progress callbacks (AC #3)
 * - Error isolation per image (AC #4)
 * - Cancellation support (AC #5)
 * - Retry capability (AC #6)
 *
 * @param images - Array of base64 image data URLs
 * @param options - Processing configuration
 * @param onStatusUpdate - Callback for real-time status updates
 * @param onProgress - Callback for overall progress updates
 * @param abortSignal - Optional AbortSignal for cancellation
 * @returns Array of processing results
 */
export async function processImagesInParallel(
  images: string[],
  options: BatchProcessingOptions,
  onStatusUpdate?: StatusCallback,
  onProgress?: ProgressCallback,
  abortSignal?: AbortSignal
): Promise<ProcessingResult[]> {
  const concurrencyLimit = options.concurrencyLimit ?? DEFAULT_CONCURRENCY_LIMIT;
  const { currency, receiptType } = options;

  // Initialize states for all images
  const states: ImageProcessingState[] = images.map((_, index) => ({
    id: generateImageId(index),
    index,
    status: 'pending' as const,
    progress: 0,
  }));

  // Emit initial state
  onStatusUpdate?.(states);
  onProgress?.(0, images.length);

  // Results collection
  const results: ProcessingResult[] = new Array(images.length);
  let completedCount = 0;

  // Create a queue of pending work
  const queue = [...states];

  /**
   * Worker function that processes images from the queue.
   * Each worker runs until the queue is empty or cancelled.
   */
  async function worker(): Promise<void> {
    while (queue.length > 0) {
      // Check for cancellation before starting next image
      if (abortSignal?.aborted) {
        break;
      }

      // Get next image from queue
      const state = queue.shift();
      if (!state) break;

      const imageDataUrl = images[state.index];

      try {
        // Update status to processing
        state.status = 'processing';
        state.startedAt = new Date();
        state.progress = 0;
        onStatusUpdate?.([...states]);

        // Process the image (AC #3: Individual processing)
        // Note: analyzeReceipt doesn't support progress, so we simulate it
        state.progress = 50;
        onStatusUpdate?.([...states]);

        const transaction = await analyzeReceipt(
          [imageDataUrl],
          currency,
          receiptType !== 'auto' ? receiptType : undefined
        );

        // Check for cancellation after API call (can't abort API call itself)
        if (abortSignal?.aborted) {
          // Mark as pending since we didn't save
          state.status = 'pending';
          state.progress = 0;
          onStatusUpdate?.([...states]);
          continue;
        }

        // Success!
        state.status = 'ready';
        state.progress = 100;
        state.result = transaction;
        state.completedAt = new Date();

        results[state.index] = {
          id: state.id,
          index: state.index,
          success: true,
          result: transaction,
        };

      } catch (error: unknown) {
        // Error handling (AC #4: Individual errors don't block others)
        state.status = 'error';
        state.progress = 0;
        state.error = extractErrorMessage(error);
        state.completedAt = new Date();

        results[state.index] = {
          id: state.id,
          index: state.index,
          success: false,
          error: state.error,
        };
      }

      // Update progress
      completedCount++;
      onProgress?.(completedCount, images.length);
      onStatusUpdate?.([...states]);
    }
  }

  // Start workers up to the concurrency limit
  const workerCount = Math.min(concurrencyLimit, images.length);
  const workers: Promise<void>[] = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push(worker());
  }

  // Wait for all workers to complete
  await Promise.all(workers);

  // Filter out undefined results (shouldn't happen, but be safe)
  return results.filter((r): r is ProcessingResult => r !== undefined);
}

/**
 * Retry processing for a single failed image.
 *
 * @param imageDataUrl - The image to retry
 * @param options - Processing configuration
 * @returns Processing result
 */
export async function retryImage(
  imageDataUrl: string,
  options: Pick<BatchProcessingOptions, 'currency' | 'receiptType'>
): Promise<ProcessingResult> {
  const id = generateImageId(0);
  const { currency, receiptType } = options;

  try {
    const transaction = await analyzeReceipt(
      [imageDataUrl],
      currency,
      receiptType !== 'auto' ? receiptType : undefined
    );

    return {
      id,
      index: 0,
      success: true,
      result: transaction,
    };
  } catch (error: unknown) {
    return {
      id,
      index: 0,
      success: false,
      error: extractErrorMessage(error),
    };
  }
}

/**
 * Calculate total processing time for completed items.
 *
 * @param states - Array of image processing states
 * @returns Total time in milliseconds
 */
export function calculateTotalProcessingTime(states: ImageProcessingState[]): number {
  return states.reduce((total, state) => {
    if (state.startedAt && state.completedAt) {
      return total + (state.completedAt.getTime() - state.startedAt.getTime());
    }
    return total;
  }, 0);
}

/**
 * Get summary statistics for a batch of processing states.
 *
 * @param states - Array of image processing states
 * @returns Summary object with counts by status
 */
export function getBatchSummary(states: ImageProcessingState[]): {
  total: number;
  pending: number;
  processing: number;
  ready: number;
  error: number;
  percentComplete: number;
} {
  const counts = {
    total: states.length,
    pending: 0,
    processing: 0,
    ready: 0,
    error: 0,
  };

  for (const state of states) {
    switch (state.status) {
      case 'pending':
      case 'uploading':
        counts.pending++;
        break;
      case 'processing':
        counts.processing++;
        break;
      case 'ready':
        counts.ready++;
        break;
      case 'error':
        counts.error++;
        break;
    }
  }

  const completed = counts.ready + counts.error;
  const percentComplete = counts.total > 0 ? Math.round((completed / counts.total) * 100) : 0;

  return { ...counts, percentComplete };
}

/**
 * Check if all images in a batch have completed (success or error).
 *
 * @param states - Array of image processing states
 * @returns True if all images are in terminal state
 */
export function isBatchComplete(states: ImageProcessingState[]): boolean {
  return states.every(state => state.status === 'ready' || state.status === 'error');
}

/**
 * Get successful results from processing states.
 *
 * @param states - Array of image processing states
 * @returns Array of transactions from successful extractions
 */
export function getSuccessfulTransactions(states: ImageProcessingState[]): Transaction[] {
  return states
    .filter(state => state.status === 'ready' && state.result)
    .map(state => state.result!);
}

/**
 * Get failed states for retry UI.
 *
 * @param states - Array of image processing states
 * @returns Array of failed states with their indices
 */
export function getFailedStates(states: ImageProcessingState[]): ImageProcessingState[] {
  return states.filter(state => state.status === 'error');
}
