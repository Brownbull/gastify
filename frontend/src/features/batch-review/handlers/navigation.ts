/**
 * Story 14e-14a: Batch Navigation Handlers
 *
 * Extracted from App.tsx handleBatchPrevious and handleBatchNext.
 * Handles navigation between batch receipts during batch review editing.
 *
 * Source: src/App.tsx:1637-1665
 */

import type { BatchNavigationContext } from './types';
import { buildTransactionWithThumbnail } from './utils';

/**
 * Navigate to the previous receipt in the batch.
 * Updates the batch editing index and current transaction.
 *
 * Bounds check: Returns early if at the first receipt (index 0) or no batch exists.
 *
 * @param context - Dependencies for navigation (scanState, setters)
 */
export function navigateToPreviousReceipt(context: BatchNavigationContext): void {
  const { scanState, setBatchEditingIndexContext, setCurrentTransaction } = context;

  const batchReceipts = scanState.batchReceipts;
  const currentIndex = scanState.batchEditingIndex;

  // Bounds check: return early if at start or no batch
  if (!batchReceipts || currentIndex === null || currentIndex <= 0) {
    return;
  }

  const prevIndex = currentIndex - 1;
  const prevReceipt = batchReceipts[prevIndex];

  if (prevReceipt) {
    setBatchEditingIndexContext(prevIndex);
    setCurrentTransaction(buildTransactionWithThumbnail(prevReceipt));
  }
}

/**
 * Navigate to the next receipt in the batch.
 * Updates the batch editing index and current transaction.
 *
 * Bounds check: Returns early if at the last receipt or no batch exists.
 *
 * @param context - Dependencies for navigation (scanState, setters)
 */
export function navigateToNextReceipt(context: BatchNavigationContext): void {
  const { scanState, setBatchEditingIndexContext, setCurrentTransaction } = context;

  const batchReceipts = scanState.batchReceipts;
  const currentIndex = scanState.batchEditingIndex;

  // Bounds check: return early if at end or no batch
  if (!batchReceipts || currentIndex === null || currentIndex >= batchReceipts.length - 1) {
    return;
  }

  const nextIndex = currentIndex + 1;
  const nextReceipt = batchReceipts[nextIndex];

  if (nextReceipt) {
    setBatchEditingIndexContext(nextIndex);
    setCurrentTransaction(buildTransactionWithThumbnail(nextReceipt));
  }
}
