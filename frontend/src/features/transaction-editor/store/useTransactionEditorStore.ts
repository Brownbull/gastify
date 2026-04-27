/**
 * Story 14e-36a: Transaction Editor Zustand Store
 *
 * Zustand-based state management for the transaction editor.
 * Consolidates 7 related useState calls from App.tsx.
 *
 * Architecture Reference:
 * - docs/sprint-artifacts/epic14e-feature-architecture/architecture-decision.md (ADR-018)
 * - src/features/batch-review/store/useBatchReviewStore.ts (pattern reference)
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Transaction } from '@/types/transaction';
import type { TransactionEditorState, TransactionEditorActions } from './types';

// =============================================================================
// Initial State (AC3)
// =============================================================================

/**
 * Initial state for the transaction editor store.
 * Matches default values from App.tsx useState declarations.
 */
export const initialTransactionEditorState: TransactionEditorState = {
  currentTransaction: null,
  navigationList: null,
  mode: 'new',
  isReadOnly: false,
  creditUsedInSession: false,
  animateItems: false,
  isSaving: false,
};

// =============================================================================
// Store Implementation (AC3, AC4)
// =============================================================================

export const useTransactionEditorStore = create<TransactionEditorState & TransactionEditorActions>()(
  devtools(
    (set) => ({
      ...initialTransactionEditorState,

      // =========================================================================
      // Actions (AC4)
      // =========================================================================

      /**
       * Set the current transaction.
       * @param tx - Transaction to set, or null to clear
       */
      setTransaction: (tx: Transaction | null) => {
        set({ currentTransaction: tx }, false, 'transaction-editor/setTransaction');
      },

      /**
       * Clear the current transaction (sets to null).
       * Convenience action for explicit clearing.
       */
      clearTransaction: () => {
        set({ currentTransaction: null }, false, 'transaction-editor/clearTransaction');
      },

      /**
       * Set the editor mode.
       * @param mode - 'new' for creating, 'existing' for editing
       */
      setMode: (mode: 'new' | 'existing') => {
        set({ mode }, false, 'transaction-editor/setMode');
      },

      /**
       * Set read-only viewing mode.
       * @param readOnly - true for read-only, false for editable
       */
      setReadOnly: (readOnly: boolean) => {
        set({ isReadOnly: readOnly }, false, 'transaction-editor/setReadOnly');
      },

      /**
       * Set credit used flag for session tracking.
       * @param used - true if credit was used
       */
      setCreditUsed: (used: boolean) => {
        set({ creditUsedInSession: used }, false, 'transaction-editor/setCreditUsed');
      },

      /**
       * Set item animation flag.
       * @param animate - true to enable item animation
       */
      setAnimateItems: (animate: boolean) => {
        set({ animateItems: animate }, false, 'transaction-editor/setAnimateItems');
      },

      /**
       * Set navigation list for multi-transaction browsing.
       * @param ids - Array of transaction IDs, or null to clear
       */
      setNavigationList: (ids: string[] | null) => {
        set({ navigationList: ids }, false, 'transaction-editor/setNavigationList');
      },

      /**
       * Set saving state flag.
       * @param saving - true when save is in progress
       */
      setSaving: (saving: boolean) => {
        set({ isSaving: saving }, false, 'transaction-editor/setSaving');
      },

      /**
       * Reset all state to initial values.
       * Clears transaction, navigation list, and resets all flags.
       */
      reset: () => {
        set(initialTransactionEditorState, false, 'transaction-editor/reset');
      },
    }),
    {
      name: 'transaction-editor-store',
      enabled: import.meta.env.DEV,
    }
  )
);
