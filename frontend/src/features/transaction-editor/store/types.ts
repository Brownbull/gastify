/**
 * Story 14e-36a: Transaction Editor Store Types
 *
 * Type definitions for the transaction editor Zustand store.
 * Manages 7 related useState calls from App.tsx for transaction editing.
 *
 * Architecture Reference:
 * - docs/sprint-artifacts/epic14e-feature-architecture/architecture-decision.md (ADR-018)
 * - src/features/batch-review/store/types.ts (pattern reference)
 */

import type { Transaction } from '@/types/transaction';

// =============================================================================
// State Interface (AC2)
// =============================================================================

/**
 * State interface for the transaction editor store.
 * Consolidates 7 related useState calls from App.tsx:
 * - currentTransaction (line 521)
 * - transactionNavigationList (line 523)
 * - isViewingReadOnly (line 525)
 * - creditUsedInSession (line 527)
 * - transactionEditorMode (line 543)
 * - isTransactionSaving (line 541)
 * - animateEditViewItems (line 542)
 */
export interface TransactionEditorState {
  /** Currently active transaction being edited or viewed */
  currentTransaction: Transaction | null;
  /** List of transaction IDs for multi-transaction navigation */
  navigationList: string[] | null;
  /** Editor mode: 'new' for creating, 'existing' for editing */
  mode: 'new' | 'existing';
  /** Whether viewing in read-only mode (non-editable detail view) */
  isReadOnly: boolean;
  /** Whether credit was used in this editing session */
  creditUsedInSession: boolean;
  /** Whether to animate item entry in the edit view */
  animateItems: boolean;
  /** Whether a save operation is in progress */
  isSaving: boolean;
}

// =============================================================================
// Actions Interface (AC4)
// =============================================================================

/**
 * Actions interface for the transaction editor store.
 * Provides all state management operations for the editor.
 */
export interface TransactionEditorActions {
  /**
   * Set the current transaction.
   * @param tx - Transaction to set, or null to clear
   */
  setTransaction: (tx: Transaction | null) => void;

  /**
   * Clear the current transaction (sets to null).
   * Convenience action for explicit clearing.
   */
  clearTransaction: () => void;

  /**
   * Set the editor mode.
   * @param mode - 'new' for creating, 'existing' for editing
   */
  setMode: (mode: 'new' | 'existing') => void;

  /**
   * Set read-only viewing mode.
   * @param readOnly - true for read-only, false for editable
   */
  setReadOnly: (readOnly: boolean) => void;

  /**
   * Set credit used flag for session tracking.
   * @param used - true if credit was used
   */
  setCreditUsed: (used: boolean) => void;

  /**
   * Set item animation flag.
   * @param animate - true to enable item animation
   */
  setAnimateItems: (animate: boolean) => void;

  /**
   * Set navigation list for multi-transaction browsing.
   * @param ids - Array of transaction IDs, or null to clear
   */
  setNavigationList: (ids: string[] | null) => void;

  /**
   * Set saving state flag.
   * @param saving - true when save is in progress
   */
  setSaving: (saving: boolean) => void;

  /**
   * Reset all state to initial values.
   * Clears transaction, navigation list, and resets all flags.
   */
  reset: () => void;
}
