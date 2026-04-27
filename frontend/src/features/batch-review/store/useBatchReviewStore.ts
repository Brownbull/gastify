/**
 * Story 14e-12a: Batch Review Zustand Store
 *
 * Zustand-based state management for the batch review flow.
 * This store manages batch receipt review with lifecycle and item actions.
 *
 * Part 1 (14e-12a): Store foundation, lifecycle actions, item actions
 * Part 2 (14e-12b): Save/edit actions, phase guards
 *
 * Architecture Reference:
 * - docs/sprint-artifacts/epic14e-feature-architecture/architecture-decision.md (ADR-018)
 * - src/features/scan/store/useScanStore.ts (pattern reference)
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { BatchReceipt } from '@/types/batchReceipt';
import type { BatchReviewState, BatchReviewActions } from './types';

// =============================================================================
// Initial State (AC4)
// =============================================================================

/**
 * Initial idle state for the batch review store.
 * All values reset to defaults.
 */
export const initialBatchReviewState: BatchReviewState = {
  phase: 'idle',
  items: [],
  currentIndex: 0,
  savedCount: 0,
  failedCount: 0,
  error: null,
  editingReceiptId: null,
  hadItems: false,
};

// =============================================================================
// Store Implementation (AC4, AC5, AC6)
// =============================================================================

export const useBatchReviewStore = create<BatchReviewState & BatchReviewActions>()(
  devtools(
    (set, get) => ({
      ...initialBatchReviewState,

      // =========================================================================
      // Lifecycle Actions (AC5)
      // =========================================================================

      /**
       * Load a batch of receipts for review.
       * Transitions from idle to reviewing phase.
       * Resets all counters and error state.
       */
      loadBatch: (receipts: BatchReceipt[]) => {
        const state = get();

        // Only allow loading from idle phase
        if (state.phase !== 'idle') {
          if (import.meta.env.DEV) {
            console.warn(
              `[BatchReviewStore] loadBatch blocked: phase is '${state.phase}', expected 'idle'`
            );
          }
          return;
        }

        set(
          {
            phase: 'reviewing',
            items: receipts,
            currentIndex: 0,
            savedCount: 0,
            failedCount: 0,
            error: null,
            editingReceiptId: null,
            hadItems: receipts.length > 0,
          },
          false,
          'batch-review/loadBatch'
        );
      },

      /**
       * Reset the store to initial idle state.
       * Always allowed - clears all state.
       */
      reset: () => {
        set(initialBatchReviewState, false, 'batch-review/reset');
      },

      // =========================================================================
      // Item Actions (AC6) - Only allowed during active phases
      // =========================================================================

      /**
       * Select a receipt by index.
       * Updates currentIndex if valid.
       * Only allowed during reviewing, editing, or saving phases.
       */
      selectItem: (index: number) => {
        const state = get();

        // Phase guard: only allow during active phases
        const allowedPhases = ['reviewing', 'editing', 'saving'];
        if (!allowedPhases.includes(state.phase)) {
          if (import.meta.env.DEV) {
            console.warn(
              `[BatchReviewStore] selectItem blocked: phase is '${state.phase}', expected one of [${allowedPhases.join(', ')}]`
            );
          }
          return;
        }

        // Validate index bounds
        if (index < 0 || index >= state.items.length) {
          if (import.meta.env.DEV) {
            console.warn(
              `[BatchReviewStore] selectItem: invalid index ${index}, items length is ${state.items.length}`
            );
          }
          return;
        }

        set({ currentIndex: index }, false, 'batch-review/selectItem');
      },

      /**
       * Update a receipt by ID.
       * Finds the receipt and applies partial updates.
       * Only allowed during reviewing or editing phases.
       */
      updateItem: (id: string, updates: Partial<BatchReceipt>) => {
        const state = get();

        // Phase guard: only allow during reviewing or editing
        const allowedPhases = ['reviewing', 'editing'];
        if (!allowedPhases.includes(state.phase)) {
          if (import.meta.env.DEV) {
            console.warn(
              `[BatchReviewStore] updateItem blocked: phase is '${state.phase}', expected one of [${allowedPhases.join(', ')}]`
            );
          }
          return;
        }

        const itemIndex = state.items.findIndex((item) => item.id === id);

        if (itemIndex === -1) {
          if (import.meta.env.DEV) {
            console.warn(
              `[BatchReviewStore] updateItem: receipt not found with id '${id}'`
            );
          }
          return;
        }

        const newItems = [...state.items];
        newItems[itemIndex] = { ...newItems[itemIndex], ...updates };

        set({ items: newItems }, false, 'batch-review/updateItem');
      },

      /**
       * Discard a receipt by ID.
       * Removes the receipt from the items array.
       * Adjusts currentIndex if needed.
       * Only allowed during reviewing or editing phases (blocked during saving - AC5).
       */
      discardItem: (id: string) => {
        const state = get();

        // Phase guard: blocked during saving (AC5)
        if (state.phase === 'saving') {
          if (import.meta.env.DEV) {
            console.warn(
              `[BatchReviewStore] Cannot discardItem - save in progress`
            );
          }
          return;
        }

        // Phase guard: only allow during reviewing or editing
        const allowedPhases = ['reviewing', 'editing'];
        if (!allowedPhases.includes(state.phase)) {
          if (import.meta.env.DEV) {
            console.warn(
              `[BatchReviewStore] discardItem blocked: phase is '${state.phase}', expected one of [${allowedPhases.join(', ')}]`
            );
          }
          return;
        }

        const itemIndex = state.items.findIndex((item) => item.id === id);

        if (itemIndex === -1) {
          if (import.meta.env.DEV) {
            console.warn(
              `[BatchReviewStore] discardItem: receipt not found with id '${id}'`
            );
          }
          return;
        }

        const newItems = state.items.filter((item) => item.id !== id);

        // Adjust currentIndex if necessary
        let newIndex = state.currentIndex;
        if (newItems.length === 0) {
          newIndex = 0;
        } else if (state.currentIndex >= newItems.length) {
          // If we deleted the last item and it was selected, move to new last item
          newIndex = newItems.length - 1;
        } else if (state.currentIndex > itemIndex) {
          // If we deleted an item before the current selection, adjust index
          newIndex = state.currentIndex - 1;
        }

        set(
          {
            items: newItems,
            currentIndex: newIndex,
          },
          false,
          'batch-review/discardItem'
        );
      },

      // =========================================================================
      // Save Actions (AC1 - 14e-12b)
      // =========================================================================

      /**
       * Start save operation.
       * Transitions reviewing → saving.
       * @phase_guard Only allowed from 'reviewing' phase (AC3).
       */
      saveStart: () => {
        const state = get();

        if (state.phase !== 'reviewing') {
          if (import.meta.env.DEV) {
            console.warn(
              `[BatchReviewStore] Cannot saveStart - invalid phase: ${state.phase}`
            );
          }
          return;
        }

        set({ phase: 'saving' }, false, 'batch-review/saveStart');
      },

      /**
       * Record successful save of a receipt.
       * Increments savedCount.
       * @param id - ID of the receipt that was saved (for tracking purposes)
       */
      saveItemSuccess: (_id: string) => {
        set(
          (state) => ({ savedCount: state.savedCount + 1 }),
          false,
          'batch-review/saveItemSuccess'
        );
      },

      /**
       * Record failed save of a receipt.
       * Increments failedCount.
       * @param id - ID of the receipt that failed (for tracking purposes)
       * @param error - Error message (logged in DEV mode)
       */
      saveItemFailure: (id: string, error: string) => {
        if (import.meta.env.DEV) {
          console.warn(
            `[BatchReviewStore] saveItemFailure: receipt '${id}' failed: ${error}`
          );
        }
        set(
          (state) => ({ failedCount: state.failedCount + 1 }),
          false,
          'batch-review/saveItemFailure'
        );
      },

      /**
       * Complete save operation.
       * Transitions saving → complete (if any succeeded) or error (if all failed).
       */
      saveComplete: () => {
        const { failedCount, items } = get();
        const total = items.length;

        if (total === 0) {
          // Edge case: empty batch
          set({ phase: 'complete' }, false, 'batch-review/saveComplete');
          return;
        }

        if (failedCount === total) {
          // All failed
          set(
            { phase: 'error', error: 'All items failed to save' },
            false,
            'batch-review/saveComplete'
          );
        } else {
          // Some or all succeeded
          set({ phase: 'complete' }, false, 'batch-review/saveComplete');
        }
      },

      // =========================================================================
      // Edit Actions (AC2 - 14e-12b)
      // =========================================================================

      /**
       * Start editing a specific receipt.
       * Transitions reviewing → editing.
       * @param id - ID of the receipt to edit
       * @phase_guard Only allowed from 'reviewing' phase (AC4).
       */
      startEditing: (id: string) => {
        const state = get();

        if (state.phase !== 'reviewing') {
          if (import.meta.env.DEV) {
            console.warn(
              `[BatchReviewStore] Cannot startEditing - invalid phase: ${state.phase}`
            );
          }
          return;
        }

        // Validate the receipt exists
        const itemExists = state.items.some((item) => item.id === id);
        if (!itemExists) {
          if (import.meta.env.DEV) {
            console.warn(
              `[BatchReviewStore] startEditing: receipt not found with id '${id}'`
            );
          }
          return;
        }

        set(
          { phase: 'editing', editingReceiptId: id },
          false,
          'batch-review/startEditing'
        );
      },

      /**
       * Finish editing.
       * Transitions editing → reviewing.
       * @phase_guard Only allowed from 'editing' phase (AC4).
       */
      finishEditing: () => {
        const state = get();

        if (state.phase !== 'editing') {
          if (import.meta.env.DEV) {
            console.warn(
              `[BatchReviewStore] Cannot finishEditing - invalid phase: ${state.phase}`
            );
          }
          return;
        }

        set(
          { phase: 'reviewing', editingReceiptId: null },
          false,
          'batch-review/finishEditing'
        );
      },
    }),
    {
      name: 'batch-review-store',
      enabled: import.meta.env.DEV,
    }
  )
);
