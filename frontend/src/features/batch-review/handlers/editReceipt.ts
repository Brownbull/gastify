/**
 * Story 14e-14b: Batch Edit Receipt Handler
 *
 * Extracted from App.tsx handleBatchEditReceipt.
 * Handles editing a receipt during batch review.
 *
 * Source: src/App.tsx:1626-1635
 */

import type { BatchReceipt } from '@/types/batchReceipt';
import type { BatchEditContext } from './types';
import { buildTransactionWithThumbnail } from './utils';
// Story 14e-16: Import store actions to sync editing phase
import { batchReviewActions } from '../store';

/**
 * Edit a batch receipt during batch review.
 * Opens the transaction editor with the selected receipt's data.
 *
 * @param receipt - The batch receipt to edit
 * @param batchIndex - 1-based index from UI (will be converted to 0-based)
 * @param context - Dependencies for editing (setters, navigation)
 *
 * @example
 * ```tsx
 * // In BatchReviewView
 * const handleEditReceipt = (receipt, index, total, allReceipts) => {
 *   editBatchReceipt(receipt, index, {
 *     setBatchEditingIndexContext,
 *     setCurrentTransaction,
 *     setTransactionEditorMode,
 *     navigateToView,
 *   });
 * };
 * ```
 */
export function editBatchReceipt(
  receipt: BatchReceipt,
  batchIndex: number,
  context: BatchEditContext
): void {
  const {
    setBatchEditingIndexContext,
    setCurrentTransaction,
    setTransactionEditorMode,
    navigateToView,
  } = context;

  // Story 14e-16: Sync batch review store phase to 'editing'
  // This allows finishEditing() to work correctly when saving from edit mode
  batchReviewActions.startEditing(receipt.id);

  // Convert 1-based UI index to 0-based internal index
  const zeroBasedIndex = batchIndex - 1;
  setBatchEditingIndexContext(zeroBasedIndex);

  // Set transaction with thumbnail if available
  const transactionWithThumbnail = buildTransactionWithThumbnail(receipt);
  setCurrentTransaction(transactionWithThumbnail);

  // Set editor mode and navigate
  setTransactionEditorMode('existing');
  navigateToView('transaction-editor');
}
