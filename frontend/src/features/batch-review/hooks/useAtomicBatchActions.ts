/**
 * Story 14e-34b: Atomic Batch Operations Hook
 * Story 16-6: Migrated from scan store to shared workflow store (AC-4).
 *
 * Provides atomic (synchronous) operations that update both
 * useScanWorkflowStore and useBatchReviewStore in a single JS execution.
 *
 * Problem Solved:
 * Sequential updates to separate stores create race conditions.
 * When discarding the last receipt:
 * 1. discardItem() removes from batch review store
 * 2. Auto-complete effect triggers (sees empty items)
 * 3. handleBack() checks workflow store (still has items!)
 * 4. Shows discard dialog for already-discarded receipt
 *
 * Solution:
 * This hook provides atomic operations that update BOTH stores
 * synchronously (in the same JS event loop tick), preventing
 * any intermediate invalid state.
 */

import { useCallback } from 'react';
import type { BatchReceipt } from '@/types/batchReceipt';

// Direct store access - NOT hooks, to ensure synchronous updates
// Story 16-6: Uses shared workflow store (no scan store dependency per AC-4)
import { useScanWorkflowStore } from '@shared/stores/useScanWorkflowStore';
import { useBatchReviewStore } from '../store';

// =============================================================================
// Return Type Interface (AC3)
// =============================================================================

/**
 * Return type for the useAtomicBatchActions hook.
 * Contains all atomic batch operations.
 */
export interface AtomicBatchActions {
  /**
   * Atomically discard a receipt from both stores.
   * Both stores are updated synchronously in a single JS tick.
   *
   * @param id - The receipt ID to discard
   *
   * AC1: Both stores updated in single synchronous operation
   * AC5: No duplicate operations executed
   */
  discardReceiptAtomic: (id: string) => void;

  /**
   * Atomically update a receipt in both stores.
   * Both stores are updated synchronously with the same data.
   *
   * @param id - The receipt ID to update
   * @param updates - Partial updates to apply
   *
   * AC2: Both stores updated together
   * AC2: Mapping functions applied consistently
   */
  updateReceiptAtomic: (id: string, updates: Partial<BatchReceipt>) => void;
}

// =============================================================================
// Hook Implementation (AC1, AC2, AC3)
// =============================================================================

/**
 * Hook that provides atomic batch operations.
 *
 * CRITICAL: Uses getState() for synchronous store access.
 * This ensures both stores are updated in the same JS event loop tick,
 * preventing race conditions where effects observe intermediate states.
 *
 * AC1: Atomic Discard Operation - Both stores updated synchronously
 * AC2: Atomic Update Operation - Both stores updated together
 * AC3: Single Entry Point - All callers use this hook
 *
 * @returns Object containing atomic batch operations
 */
export function useAtomicBatchActions(): AtomicBatchActions {
  /**
   * Atomically discard a receipt from both stores.
   * Delegates to atomicBatchActions for DRY implementation.
   *
   * AC1: No intermediate invalid state possible
   * AC5: No duplicate operations - single function call updates both stores
   */
  const discardReceiptAtomic = useCallback((id: string) => {
    atomicBatchActions.discardReceiptAtomic(id);
  }, []);

  /**
   * Atomically update a receipt in both stores.
   * Delegates to atomicBatchActions for DRY implementation.
   *
   * AC2: Both stores updated together
   * AC2: Mapping functions applied consistently (same updates object)
   */
  const updateReceiptAtomic = useCallback((id: string, updates: Partial<BatchReceipt>) => {
    atomicBatchActions.updateReceiptAtomic(id, updates);
  }, []);

  return {
    discardReceiptAtomic,
    updateReceiptAtomic,
  };
}

// =============================================================================
// Direct Access Functions (for non-React code)
// =============================================================================

/**
 * Direct atomic discard for non-React code.
 * Updates both stores synchronously.
 *
 * Usage:
 * ```ts
 * import { atomicBatchActions } from '@features/batch-review';
 *
 * // In a service or handler
 * atomicBatchActions.discardReceiptAtomic(receiptId);
 * ```
 */
export const atomicBatchActions = {
  /**
   * Atomically discard a receipt from both stores.
   * @param id - The receipt ID to discard
   *
   * AC1: Both stores updated in single synchronous operation
   * AC5: No duplicate operations - single function call updates both stores
   */
  discardReceiptAtomic: (id: string) => {
    const workflowState = useScanWorkflowStore.getState();
    const reviewState = useBatchReviewStore.getState();

    // Update both stores in sequence (synchronous, no yields)
    // Order: workflow store first (source of batchReceipts), then review store (UI items)
    workflowState.discardBatchReceipt(id);
    reviewState.discardItem(id);

    // DEV logging for debugging race conditions
    if (import.meta.env.DEV) {
      const newWorkflowState = useScanWorkflowStore.getState();
      const newReviewState = useBatchReviewStore.getState();
      console.debug(
        '[atomicBatchActions] discardReceiptAtomic completed:',
        {
          discardedId: id,
          workflowBatchReceipts: newWorkflowState.batchReceipts?.length ?? 0,
          reviewItems: newReviewState.items.length,
        }
      );
    }
  },

  /**
   * Atomically update a receipt in both stores.
   * @param id - The receipt ID to update
   * @param updates - Partial updates to apply
   *
   * AC2: Both stores updated together with same data
   */
  updateReceiptAtomic: (id: string, updates: Partial<BatchReceipt>) => {
    const workflowState = useScanWorkflowStore.getState();
    const reviewState = useBatchReviewStore.getState();

    // Update both stores with same data (synchronous, no yields)
    workflowState.updateBatchReceipt(id, updates);
    reviewState.updateItem(id, updates);

    // DEV logging for debugging
    if (import.meta.env.DEV) {
      console.debug(
        '[atomicBatchActions] updateReceiptAtomic completed:',
        {
          updatedId: id,
          updateKeys: Object.keys(updates),
        }
      );
    }
  },
} as const;

export type AtomicBatchActionsType = typeof atomicBatchActions;