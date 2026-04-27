/**
 * Story 14e-36a/b: Transaction Editor Store Module Exports
 *
 * Barrel exports for the transaction editor Zustand store.
 * Part 1 (14e-36a): Store foundation with types and actions (COMPLETE)
 * Part 2 (14e-36b): Selectors and tests (COMPLETE)
 * Part 3 (14e-36c): App.tsx migration
 */

// =============================================================================
// Core Store
// =============================================================================

export {
  useTransactionEditorStore,
  initialTransactionEditorState,
} from './useTransactionEditorStore';

// =============================================================================
// Selectors (Story 14e-36b)
// =============================================================================

// Individual state selectors
export {
  useCurrentTransaction,
  useEditorMode,
  useIsReadOnly,
  useIsSaving,
  useAnimateItems,
  useCreditUsedInSession,
  useNavigationList,
} from './selectors';

// Computed selectors
export {
  useIsEditing,
  useCanNavigate,
  useHasUnsavedChanges,
} from './selectors';

// Actions hook
export { useTransactionEditorActions } from './selectors';

// Direct access (for non-React code)
export {
  getTransactionEditorState,
  transactionEditorActions,
} from './selectors';

export type { TransactionEditorActionsType } from './selectors';

// =============================================================================
// Types
// =============================================================================

export type {
  TransactionEditorState,
  TransactionEditorActions,
} from './types';
