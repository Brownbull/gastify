/**
 * Story 14e-14c: Batch Discard Handlers
 *
 * Extracted handlers for batch review discard operations.
 * Part 3 of 4: Discard and credit check handlers.
 *
 * Source: src/App.tsx:1904-1926 (handleBatchReviewBack, handleBatchDiscardConfirm, handleBatchDiscardCancel)
 */

import { DIALOG_TYPES } from '@shared/types/scanWorkflow';
import type { DiscardContext } from './types';
import { batchReviewActions } from '../store';

/**
 * Handle back navigation from batch review.
 * Shows confirmation dialog if there are receipts to potentially discard (credit was spent).
 * Otherwise, navigates directly to dashboard.
 *
 * @param context - Dependencies for discard operation
 */
export function handleReviewBack(context: DiscardContext): void {
  const {
    hasBatchReceipts,
    showScanDialog,
    setBatchImages,
    batchProcessing,
    resetScanContext,
    setView,
  } = context;

  // Show confirmation if results exist (credit was spent)
  if (hasBatchReceipts) {
    showScanDialog(DIALOG_TYPES.BATCH_DISCARD, {});
    return;
  }

  // No results to lose - navigate directly
  setBatchImages([]);
  batchProcessing.reset();
  resetScanContext();
  // Reset batch review store to idle state
  batchReviewActions.reset();
  setView('dashboard');
}

/**
 * Confirm discarding batch results.
 * Dismisses dialog, clears all batch state, and navigates to dashboard.
 *
 * @param context - Dependencies for discard operation
 */
export function confirmDiscard(context: DiscardContext): void {
  const {
    dismissScanDialog,
    setBatchImages,
    batchProcessing,
    resetScanContext,
    setView,
  } = context;

  dismissScanDialog();
  setBatchImages([]);
  batchProcessing.reset();
  resetScanContext();
  // Reset batch review store to idle state
  batchReviewActions.reset();
  setView('dashboard');
}

/**
 * Cancel the discard operation.
 * Dismisses the confirmation dialog without discarding anything.
 *
 * @param context - Dependencies for discard operation
 */
export function cancelDiscard(context: DiscardContext): void {
  const { dismissScanDialog } = context;
  dismissScanDialog();
}
