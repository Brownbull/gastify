/**
 * Story 14e-13: Batch Review Store Selectors
 *
 * Memoized selector hooks for efficient state subscription.
 * Components only re-render when their specific subscribed values change.
 *
 * Architecture Reference:
 * - docs/sprint-artifacts/epic14e-feature-architecture/architecture-decision.md (ADR-018)
 * - src/features/scan/store/selectors.ts (pattern reference)
 *
 * Categories:
 * - Phase: useBatchReviewPhase, useIsBatchReviewing, useIsEditing, useIsSaving, useIsComplete, useHasBatchError
 * - Data: useBatchItems, useCurrentBatchItem, useCurrentBatchIndex, useEditingReceiptId
 * - Computed: useBatchProgress, useBatchTotalAmount, useValidBatchCount, useIsBatchEmpty
 * - Actions: useBatchReviewActions, getBatchReviewState, batchReviewActions
 */

import { useShallow } from 'zustand/react/shallow';
import { useBatchReviewStore } from './useBatchReviewStore';
import type { BatchReceipt } from '@/types/batchReceipt';

// =============================================================================
// Phase Selectors (AC1)
// =============================================================================

/**
 * Select current batch review phase.
 * Re-renders only when phase changes.
 */
export const useBatchReviewPhase = () => useBatchReviewStore((s) => s.phase);

/**
 * True if currently reviewing batch receipts.
 * Re-renders only when reviewing status changes.
 */
export const useIsBatchReviewing = () => useBatchReviewStore((s) => s.phase === 'reviewing');

/**
 * True if currently editing a receipt.
 * Re-renders only when editing status changes.
 */
export const useIsEditing = () => useBatchReviewStore((s) => s.phase === 'editing');

/**
 * True if save operation is in progress.
 * Re-renders only when saving status changes.
 */
export const useIsSaving = () => useBatchReviewStore((s) => s.phase === 'saving');

/**
 * True if batch review is complete.
 * Re-renders only when complete status changes.
 */
export const useIsComplete = () => useBatchReviewStore((s) => s.phase === 'complete');

/**
 * True if batch review has a fatal error.
 * Re-renders only when error status changes.
 */
export const useHasBatchError = () => useBatchReviewStore((s) => s.phase === 'error');

// =============================================================================
// Data Selectors (AC2)
// =============================================================================

/**
 * Get all batch items.
 * Re-renders when items array changes.
 */
export const useBatchItems = () => useBatchReviewStore((s) => s.items);

/**
 * Get the current batch index.
 * Re-renders only when currentIndex changes.
 */
export const useCurrentBatchIndex = () => useBatchReviewStore((s) => s.currentIndex);

/**
 * Get the ID of the receipt being edited.
 * Re-renders only when editingReceiptId changes.
 */
export const useEditingReceiptId = () => useBatchReviewStore((s) => s.editingReceiptId);

/**
 * Get whether batch ever had items (for auto-complete detection).
 * Persists across component remounts unlike a React ref.
 * Re-renders only when hadItems changes.
 */
export const useHadItems = () => useBatchReviewStore((s) => s.hadItems);

/**
 * Get the currently selected batch item (derived).
 * Returns undefined if index is out of bounds.
 * Re-renders when items or currentIndex changes.
 */
export const useCurrentBatchItem = () =>
  useBatchReviewStore((s) => s.items[s.currentIndex]);

// =============================================================================
// Computed Selectors (AC3)
// =============================================================================

/**
 * Get batch progress information.
 * Returns { current, total, saved, failed } for progress display.
 * Re-renders when any of these values change.
 */
export const useBatchProgress = () =>
  useBatchReviewStore(
    useShallow((s) => ({
      current: s.currentIndex,
      total: s.items.length,
      saved: s.savedCount,
      failed: s.failedCount,
    }))
  );

/**
 * Get total amount of all valid (non-error) receipts.
 * Used for displaying aggregate totals.
 * Re-renders when items change.
 */
export const useBatchTotalAmount = () =>
  useBatchReviewStore((s) =>
    s.items
      .filter((item) => item.status !== 'error')
      .reduce((sum, item) => sum + (item.transaction.total || 0), 0)
  );

/**
 * Get count of valid (non-error) receipts.
 * Re-renders when items change.
 */
export const useValidBatchCount = () =>
  useBatchReviewStore((s) =>
    s.items.filter((item) => item.status !== 'error').length
  );

/**
 * True if batch is empty (no items).
 * Re-renders when items.length changes.
 */
export const useIsBatchEmpty = () => useBatchReviewStore((s) => s.items.length === 0);

// =============================================================================
// Actions Hook (AC4)
// =============================================================================

/**
 * Hook to access all batch review store actions with stable references.
 * Actions are extracted from the store state using useShallow,
 * ensuring stable references across re-renders.
 *
 * Usage:
 * ```tsx
 * const { loadBatch, selectItem, saveStart } = useBatchReviewActions();
 *
 * // Load a batch
 * loadBatch(receipts);
 *
 * // Select an item
 * selectItem(2);
 * ```
 */
export const useBatchReviewActions = () =>
  useBatchReviewStore(
    useShallow((s) => ({
      // Lifecycle actions
      loadBatch: s.loadBatch,
      reset: s.reset,

      // Item actions
      selectItem: s.selectItem,
      updateItem: s.updateItem,
      discardItem: s.discardItem,

      // Edit actions
      startEditing: s.startEditing,
      finishEditing: s.finishEditing,

      // Save actions
      saveStart: s.saveStart,
      saveItemSuccess: s.saveItemSuccess,
      saveItemFailure: s.saveItemFailure,
      saveComplete: s.saveComplete,
    }))
  );

// =============================================================================
// Direct Access Functions (AC5)
// =============================================================================

/**
 * Get current batch review state snapshot (for non-React code).
 *
 * Usage:
 * ```ts
 * const state = getBatchReviewState();
 * if (state.phase === 'reviewing') {
 *   // Can proceed with save
 * }
 * ```
 */
export const getBatchReviewState = () => useBatchReviewStore.getState();

/**
 * Direct action access for non-React code (handlers, services).
 * These actions work outside the React component tree.
 *
 * Usage:
 * ```ts
 * import { batchReviewActions } from '@features/batch-review';
 *
 * // In a handler
 * batchReviewActions.saveStart();
 * batchReviewActions.saveItemSuccess('receipt-1');
 * ```
 */
export const batchReviewActions = {
  // Lifecycle actions
  loadBatch: (receipts: BatchReceipt[]) =>
    useBatchReviewStore.getState().loadBatch(receipts),
  reset: () => useBatchReviewStore.getState().reset(),

  // Item actions
  selectItem: (index: number) =>
    useBatchReviewStore.getState().selectItem(index),
  updateItem: (id: string, updates: Partial<BatchReceipt>) =>
    useBatchReviewStore.getState().updateItem(id, updates),
  discardItem: (id: string) =>
    useBatchReviewStore.getState().discardItem(id),

  // Edit actions
  startEditing: (id: string) =>
    useBatchReviewStore.getState().startEditing(id),
  finishEditing: () => useBatchReviewStore.getState().finishEditing(),

  // Save actions
  saveStart: () => useBatchReviewStore.getState().saveStart(),
  saveItemSuccess: (id: string) =>
    useBatchReviewStore.getState().saveItemSuccess(id),
  saveItemFailure: (id: string, error: string) =>
    useBatchReviewStore.getState().saveItemFailure(id, error),
  saveComplete: () => useBatchReviewStore.getState().saveComplete(),
} as const;

// Export the type for batchReviewActions
export type BatchReviewActionsType = typeof batchReviewActions;
