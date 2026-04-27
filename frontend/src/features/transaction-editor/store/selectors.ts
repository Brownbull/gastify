/**
 * Story 14e-36b: Transaction Editor Store Selectors
 *
 * Memoized selector hooks for efficient state subscription.
 * Components only re-render when their specific subscribed values change.
 *
 * Architecture Reference:
 * - docs/sprint-artifacts/epic14e-feature-architecture/architecture-decision.md (ADR-018)
 * - src/features/batch-review/store/selectors.ts (pattern reference)
 *
 * Categories:
 * - Individual: useCurrentTransaction, useEditorMode, useIsReadOnly, useIsSaving, useAnimateItems, useCreditUsedInSession, useNavigationList
 * - Computed: useIsEditing, useCanNavigate, useHasUnsavedChanges
 * - Actions: useTransactionEditorActions, getTransactionEditorState, transactionEditorActions
 */

import { useShallow } from 'zustand/react/shallow';
import { useTransactionEditorStore } from './useTransactionEditorStore';
import type { Transaction } from '@/types/transaction';

// =============================================================================
// Individual State Selectors (AC1)
// =============================================================================

/**
 * Select current transaction being edited or viewed.
 * Re-renders only when currentTransaction changes.
 */
export const useCurrentTransaction = () =>
  useTransactionEditorStore((s) => s.currentTransaction);

/**
 * Select editor mode ('new' or 'existing').
 * Re-renders only when mode changes.
 */
export const useEditorMode = () =>
  useTransactionEditorStore((s) => s.mode);

/**
 * Select read-only state.
 * Re-renders only when isReadOnly changes.
 */
export const useIsReadOnly = () =>
  useTransactionEditorStore((s) => s.isReadOnly);

/**
 * Select saving state.
 * Re-renders only when isSaving changes.
 */
export const useIsSaving = () =>
  useTransactionEditorStore((s) => s.isSaving);

/**
 * Select animate items flag.
 * Re-renders only when animateItems changes.
 */
export const useAnimateItems = () =>
  useTransactionEditorStore((s) => s.animateItems);

/**
 * Select credit used in session flag.
 * Re-renders only when creditUsedInSession changes.
 */
export const useCreditUsedInSession = () =>
  useTransactionEditorStore((s) => s.creditUsedInSession);

/**
 * Select navigation list for multi-transaction browsing.
 * Re-renders only when navigationList changes.
 */
export const useNavigationList = () =>
  useTransactionEditorStore((s) => s.navigationList);

// =============================================================================
// Computed Selectors (AC2)
// =============================================================================

/**
 * True if currently editing a transaction (currentTransaction !== null).
 * Re-renders only when editing status changes.
 */
export const useIsEditing = () =>
  useTransactionEditorStore((s) => s.currentTransaction !== null);

/**
 * True if navigation between transactions is possible.
 * Returns navigationList !== null && navigationList.length > 1.
 * Re-renders only when navigation capability changes.
 */
export const useCanNavigate = () =>
  useTransactionEditorStore(
    (s) => s.navigationList !== null && s.navigationList.length > 1
  );

/**
 * True if there are unsaved changes.
 * Returns currentTransaction !== null && !isSaving.
 * Re-renders only when unsaved changes status changes.
 */
export const useHasUnsavedChanges = () =>
  useTransactionEditorStore(
    (s) => s.currentTransaction !== null && !s.isSaving
  );

// =============================================================================
// Actions Hook (AC3)
// =============================================================================

/**
 * Hook to access all transaction editor store actions with stable references.
 * Actions are extracted from the store state using useShallow,
 * ensuring stable references across re-renders.
 *
 * Usage:
 * ```tsx
 * const { setTransaction, clearTransaction, reset } = useTransactionEditorActions();
 *
 * // Set a transaction for editing
 * setTransaction(transaction);
 *
 * // Clear when done
 * clearTransaction();
 * ```
 */
export const useTransactionEditorActions = () =>
  useTransactionEditorStore(
    useShallow((s) => ({
      setTransaction: s.setTransaction,
      clearTransaction: s.clearTransaction,
      setMode: s.setMode,
      setReadOnly: s.setReadOnly,
      setCreditUsed: s.setCreditUsed,
      setAnimateItems: s.setAnimateItems,
      setNavigationList: s.setNavigationList,
      setSaving: s.setSaving,
      reset: s.reset,
    }))
  );

// =============================================================================
// Direct Access Functions (AC4)
// =============================================================================

/**
 * Get current transaction editor state snapshot (for non-React code).
 *
 * Usage:
 * ```ts
 * const state = getTransactionEditorState();
 * if (state.currentTransaction) {
 *   // Transaction is being edited
 * }
 * ```
 */
export const getTransactionEditorState = () => useTransactionEditorStore.getState();

/**
 * Direct action access for non-React code (handlers, services).
 * These actions work outside the React component tree.
 *
 * Usage:
 * ```ts
 * import { transactionEditorActions } from '@features/transaction-editor';
 *
 * // In a handler
 * transactionEditorActions.setTransaction(tx);
 * transactionEditorActions.setSaving(true);
 * ```
 */
export const transactionEditorActions = {
  setTransaction: (tx: Transaction | null) =>
    useTransactionEditorStore.getState().setTransaction(tx),
  clearTransaction: () =>
    useTransactionEditorStore.getState().clearTransaction(),
  setMode: (mode: 'new' | 'existing') =>
    useTransactionEditorStore.getState().setMode(mode),
  setReadOnly: (readOnly: boolean) =>
    useTransactionEditorStore.getState().setReadOnly(readOnly),
  setCreditUsed: (used: boolean) =>
    useTransactionEditorStore.getState().setCreditUsed(used),
  setAnimateItems: (animate: boolean) =>
    useTransactionEditorStore.getState().setAnimateItems(animate),
  setNavigationList: (ids: string[] | null) =>
    useTransactionEditorStore.getState().setNavigationList(ids),
  setSaving: (saving: boolean) =>
    useTransactionEditorStore.getState().setSaving(saving),
  reset: () =>
    useTransactionEditorStore.getState().reset(),
} as const;

// Export the type for transactionEditorActions
export type TransactionEditorActionsType = typeof transactionEditorActions;
