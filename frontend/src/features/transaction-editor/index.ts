/**
 * Feature: Transaction Editor
 *
 * Transaction editor Zustand store for managing editing state.
 * Consolidates 7 related useState calls from App.tsx.
 *
 * Story 14e-36a: Store foundation with types and actions (COMPLETE)
 * Story 14e-36b: Selectors and tests (COMPLETE)
 * Story 14e-36c: App.tsx migration
 */

// =============================================================================
// Store (Story 14e-36a)
// =============================================================================

export {
  useTransactionEditorStore,
  initialTransactionEditorState,
} from './store';

export type {
  TransactionEditorState,
  TransactionEditorActions,
} from './store';

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
} from './store';

// Computed selectors
export {
  useIsEditing,
  useCanNavigate,
  useHasUnsavedChanges,
} from './store';

// Actions hook
export { useTransactionEditorActions } from './store';

// Direct access (for non-React code)
export {
  getTransactionEditorState,
  transactionEditorActions,
} from './store';

export type { TransactionEditorActionsType } from './store';

// =============================================================================
// Components (Story TD-15b-3)
// =============================================================================

export * from './components';

// =============================================================================
// Views (Story 15b-1c)
// =============================================================================

export * from './views';

// =============================================================================
// Hooks (Story 15b-1c)
// =============================================================================

export * from './hooks';
