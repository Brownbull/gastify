/**
 * Story 14e-12a/13: Batch Review Store Module Exports
 *
 * Exports for the batch review Zustand store including:
 * - Core store hook and initial state
 * - Type definitions
 * - Selectors and action hooks
 * - Direct access functions for non-React code
 *
 * Part 1 (14e-12a): Foundation + lifecycle/item actions (COMPLETE)
 * Part 2 (14e-12b): Save/edit actions (COMPLETE)
 * Part 3 (14e-13): Selectors (COMPLETE)
 */

// =============================================================================
// Core Store
// =============================================================================

export { useBatchReviewStore, initialBatchReviewState } from './useBatchReviewStore';

// =============================================================================
// Types
// =============================================================================

export type {
  BatchReviewPhase,
  BatchReviewState,
  BatchReviewActions,
} from './types';

// =============================================================================
// Selectors (Story 14e-13)
// =============================================================================

export {
  // Phase selectors
  useBatchReviewPhase,
  useIsBatchReviewing,
  useIsEditing,
  useIsSaving,
  useIsComplete,
  useHasBatchError,
  // Data selectors
  useBatchItems,
  useCurrentBatchItem,
  useCurrentBatchIndex,
  useEditingReceiptId,
  useHadItems,
  // Computed selectors
  useBatchProgress,
  useBatchTotalAmount,
  useValidBatchCount,
  useIsBatchEmpty,
  // Actions hook
  useBatchReviewActions,
  // Direct access
  getBatchReviewState,
  batchReviewActions,
} from './selectors';

export type { BatchReviewActionsType } from './selectors';
