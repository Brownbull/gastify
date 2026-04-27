/**
 * Story 14e-12a: Batch Review Zustand Store Types
 *
 * Type definitions for the batch review Zustand store.
 * Part 1 of 2: Store structure, types, lifecycle actions, and item actions.
 * Part 2 (14e-12b): Save/edit actions, phase guards, comprehensive tests.
 *
 * Architecture Reference:
 * - docs/sprint-artifacts/epic14e-feature-architecture/architecture-decision.md (ADR-018)
 * - src/features/scan/store/useScanStore.ts (pattern reference)
 */

import type { BatchReceipt } from '@/types/batchReceipt';

// =============================================================================
// Phase Type (AC2)
// =============================================================================

/**
 * Batch review phases representing the state machine.
 * - idle: No batch review active
 * - loading: Transforming processing results to BatchReceipts
 * - reviewing: User reviewing receipts (main phase)
 * - editing: User editing a specific receipt
 * - saving: Save operation in progress
 * - complete: All receipts saved successfully
 * - error: Fatal error (e.g., save failed for all)
 */
export type BatchReviewPhase =
  | 'idle'
  | 'loading'
  | 'reviewing'
  | 'editing'
  | 'saving'
  | 'complete'
  | 'error';

// =============================================================================
// State Interface (AC3)
// =============================================================================

/**
 * State interface for the batch review store.
 */
export interface BatchReviewState {
  /** Current phase of batch review */
  phase: BatchReviewPhase;
  /** List of batch receipts to review */
  items: BatchReceipt[];
  /** Index of currently selected receipt */
  currentIndex: number;
  /** Number of receipts saved successfully */
  savedCount: number;
  /** Number of receipts that failed to save */
  failedCount: number;
  /** Error message if in error phase */
  error: string | null;
  /** ID of receipt currently being edited (null if not editing) */
  editingReceiptId: string | null;
  /** Flag indicating if batch ever had items (for auto-complete detection) */
  hadItems: boolean;
}

// =============================================================================
// Actions Interface (AC5, AC6 - lifecycle and item actions only for 14e-12a)
// =============================================================================

/**
 * Actions interface for the batch review store.
 * Part 1 (14e-12a): Lifecycle and item actions.
 * Part 2 (14e-12b): Save/edit actions with phase guards.
 */
export interface BatchReviewActions {
  // Lifecycle actions (AC5 - 14e-12a)
  /**
   * Load a batch of receipts for review.
   * Transitions from idle to reviewing phase.
   */
  loadBatch: (receipts: BatchReceipt[]) => void;

  /**
   * Reset the store to initial idle state.
   * Clears all items, counters, and error state.
   */
  reset: () => void;

  // Item actions (AC6 - 14e-12a)
  /**
   * Select a receipt by index.
   * @param index - Index of the receipt to select
   */
  selectItem: (index: number) => void;

  /**
   * Update a receipt by ID.
   * @param id - ID of the receipt to update
   * @param updates - Partial updates to apply
   */
  updateItem: (id: string, updates: Partial<BatchReceipt>) => void;

  /**
   * Discard a receipt by ID (remove from items array).
   * @param id - ID of the receipt to discard
   */
  discardItem: (id: string) => void;

  // Save actions (AC1 - 14e-12b)
  /**
   * Start save operation.
   * Transitions reviewing → saving.
   * @phase_guard Only allowed from 'reviewing' phase.
   */
  saveStart: () => void;

  /**
   * Record successful save of a receipt.
   * Increments savedCount.
   * @param id - ID of the receipt that was saved
   */
  saveItemSuccess: (id: string) => void;

  /**
   * Record failed save of a receipt.
   * Increments failedCount.
   * @param id - ID of the receipt that failed to save
   * @param error - Error message describing the failure
   */
  saveItemFailure: (id: string, error: string) => void;

  /**
   * Complete save operation.
   * Transitions saving → complete (if any succeeded) or error (if all failed).
   */
  saveComplete: () => void;

  // Edit actions (AC2 - 14e-12b)
  /**
   * Start editing a specific receipt.
   * Transitions reviewing → editing.
   * @param id - ID of the receipt to edit
   * @phase_guard Only allowed from 'reviewing' phase.
   */
  startEditing: (id: string) => void;

  /**
   * Finish editing.
   * Transitions editing → reviewing.
   * @phase_guard Only allowed from 'editing' phase.
   */
  finishEditing: () => void;
}
