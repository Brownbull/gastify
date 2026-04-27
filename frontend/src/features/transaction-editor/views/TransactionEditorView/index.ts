/**
 * Story 14e-28b: TransactionEditorView barrel exports
 *
 * Exports:
 * - TransactionEditorView component (wrapper that calls hooks internally)
 * - useTransactionEditorData hook (data composition)
 * - useTransactionEditorHandlers hook (handler extraction)
 * - Types for props and interfaces
 */

// Story 14e-28b: Wrapper component that calls hooks internally
export {
    TransactionEditorView,
    type TransactionEditorViewProps,
    type TransactionEditorViewTestOverrides,
} from './TransactionEditorViewWrapper';

export {
    useTransactionEditorHandlers,
    type UseTransactionEditorHandlersProps,
    type UseTransactionEditorHandlersReturn,
} from './useTransactionEditorHandlers';

export {
    useTransactionEditorData,
    type TransactionEditorDataOverrides,
    type UseTransactionEditorDataReturn,
    type ScanButtonState,
} from './useTransactionEditorData';
