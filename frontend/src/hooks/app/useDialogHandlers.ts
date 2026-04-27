/**
 * Story 14c-refactor.21: useDialogHandlers Hook
 *
 * Extracts dialog/modal handlers from App.tsx into a reusable hook.
 * Handles toast notifications and transaction conflict dialogs.
 *
 * Features:
 * - Toast notification management with auto-dismiss
 * - Transaction conflict dialog via Modal Manager
 * - Unified modal management pattern
 *
 * Story 14e-4: Credit info modal moved to Modal Manager.
 * Story 14e-5: Transaction conflict dialog moved to Modal Manager.
 *
 * Use `openModal('creditInfo', {...})` instead of this hook for credit info.
 * Transaction conflict dialog is opened via `openConflictDialog()` which uses Modal Manager.
 *
 * Architecture Reference: Epic 14c-refactor - App.tsx Handler Extraction
 * Dependencies:
 * - ScanContext (for scanState access)
 * - React state management
 * - Modal Manager for conflict dialog rendering
 *
 * @example
 * ```tsx
 * function App() {
 *   const {
 *     // Toast
 *     toastMessage,
 *     setToastMessage,
 *     showToast,
 *     // Conflict Dialog (Story 14e-5: Now uses Modal Manager)
 *     openConflictDialog,
 *   } = useDialogHandlers({
 *     scanState,
 *     setCurrentTransaction,
 *     setScanImages,
 *     createDefaultTransaction,
 *     setTransactionEditorMode,
 *     navigateToView,
 *     t,
 *     lang,
 *     formatCurrency,
 *   });
 *
 *   // Conflict dialog is rendered by ModalManager, not in App.tsx
 *   return (
 *     <>
 *       {toastMessage && <Toast message={toastMessage} />}
 *       <ModalManager />
 *     </>
 *   );
 * }
 * ```
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { Transaction } from '../../types/transaction';
import type { ScanState } from '@shared/types/scanWorkflow';
import type { ConflictingTransaction, ConflictReason } from '@/types/conflict';
import type { View } from '@app/types';
import { openModalDirect, closeModalDirect } from '@managers/ModalManager';

// =============================================================================
// Types
// =============================================================================

import type { ToastMessage, ToastType } from '@/shared/hooks';
export type { ToastMessage };

/**
 * Conflict dialog data structure
 */
export interface ConflictDialogData {
    conflictingTransaction: ConflictingTransaction;
    conflictReason: ConflictReason;
    pendingAction: {
        mode: 'new' | 'existing';
        transaction?: Transaction | null;
    };
}

/**
 * Props for useDialogHandlers hook
 */
export interface UseDialogHandlersProps {
    /** Current scan state (for conflict dialog handlers) */
    scanState: ScanState;
    /** Set current transaction */
    setCurrentTransaction: (tx: Transaction | null) => void;
    /**
     * Reset scan state to idle.
     * Bug fix: Previously used setScanImages([]) which only works in 'capturing' phase.
     * During batch scanning (phase='scanning'), SET_IMAGES is ignored.
     * This function properly resets state in all phases.
     */
    resetScanState: () => void;
    /**
     * Clear batch images state (App.tsx local state, separate from scan state machine).
     * Must be called alongside resetScanState to fully clear batch mode.
     */
    clearBatchImages: () => void;
    /** Create default transaction factory */
    createDefaultTransaction: () => Transaction;
    /** Set transaction editor mode */
    setTransactionEditorMode: (mode: 'new' | 'existing') => void;
    /** Navigate to a view */
    navigateToView: (view: View) => void;
    /** Auto-dismiss timeout for toasts (default: 3000ms) */
    toastAutoHideMs?: number;
    /** Translation function for conflict dialog (Story 14e-5) */
    t: (key: string) => string;
    /** Language for conflict dialog (Story 14e-5) */
    lang?: 'en' | 'es';
    /** Currency formatter for conflict dialog (Story 14e-5) */
    formatCurrency?: (amount: number, currency: string) => string;
}

/**
 * Result returned by useDialogHandlers
 */
export interface UseDialogHandlersResult {
    // ===========================================================================
    // Toast State & Handlers
    // ===========================================================================
    /** Current toast message (null if none) */
    toastMessage: ToastMessage | null;
    /** Set toast message directly */
    setToastMessage: (msg: ToastMessage | null) => void;
    /**
     * Show a toast notification.
     * @param text - Toast message text
     * @param type - Toast type ('success' or 'info')
     */
    showToast: (text: string, type: ToastType) => void;

    // ===========================================================================
    // Conflict Dialog
    // Story 14e-5: Conflict dialog now uses Modal Manager
    // The dialog is rendered by ModalManager component, not AppOverlays
    // ===========================================================================
    /**
     * Open conflict dialog via Modal Manager.
     * @param conflictingTransaction - The transaction that conflicts
     * @param conflictReason - Why there's a conflict
     * @param pendingAction - The action the user was trying to perform
     */
    openConflictDialog: (
        conflictingTransaction: ConflictingTransaction,
        conflictReason: ConflictReason,
        pendingAction: ConflictDialogData['pendingAction']
    ) => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook that provides dialog/modal handlers extracted from App.tsx.
 *
 * Handles:
 * - Toast notifications with auto-dismiss
 * - Transaction conflict dialog via Modal Manager (Story 14e-5)
 */
export function useDialogHandlers(props: UseDialogHandlersProps): UseDialogHandlersResult {
    const {
        scanState,
        setCurrentTransaction,
        resetScanState,
        clearBatchImages,
        createDefaultTransaction,
        setTransactionEditorMode,
        navigateToView,
        toastAutoHideMs = 3000,
        t,
        lang = 'es',
        formatCurrency,
    } = props;

    // ===========================================================================
    // Toast State
    // ===========================================================================

    const [toastMessage, setToastMessage] = useState<ToastMessage | null>(null);

    // Auto-dismiss toast after timeout
    useEffect(() => {
        if (toastMessage) {
            const timer = setTimeout(() => setToastMessage(null), toastAutoHideMs);
            return () => clearTimeout(timer);
        }
    }, [toastMessage, toastAutoHideMs]);

    /**
     * Show a toast notification.
     */
    const showToast = useCallback((text: string, type: ToastType) => {
        setToastMessage({ text, type });
    }, []);

    // ===========================================================================
    // Conflict Dialog (Story 14e-5: Uses Modal Manager)
    // ===========================================================================

    // Store pending action in ref to access from callbacks without stale closure
    const pendingActionRef = useRef<ConflictDialogData['pendingAction'] | null>(null);

    /**
     * Story 14.24: Close conflict dialog without doing anything (stay on current view).
     */
    const handleConflictClose = useCallback(() => {
        closeModalDirect();
        pendingActionRef.current = null;
    }, []);

    /**
     * Story 14d.4e: Navigate to the conflicting transaction/scan.
     * Bug fix: Handle batch mode differently - navigate to batch-review, not transaction-editor.
     */
    const handleConflictViewCurrent = useCallback(() => {
        closeModalDirect();
        pendingActionRef.current = null;

        // Batch mode: Navigate to batch-review where processing/results are shown
        if (scanState.mode === 'batch') {
            navigateToView('batch-review');
            return;
        }

        // Single scan mode: Navigate to transaction-editor with the scanned result
        // Story 14d.4e: Use scanState.results[0] instead of pendingScan.analyzedTransaction
        if (scanState.results.length > 0) {
            setCurrentTransaction(scanState.results[0]);
        }
        setTransactionEditorMode('new');
        navigateToView('transaction-editor');
    }, [scanState.mode, scanState.results, setCurrentTransaction, setTransactionEditorMode, navigateToView]);

    /**
     * Story 14d.4e: Discard the conflicting transaction and proceed with the pending action.
     */
    const handleConflictDiscard = useCallback(() => {
        closeModalDirect();

        // Clear the conflicting pending scan
        // Bug fix: Use resetScanState() instead of setScanImages([]).
        // setScanImages([]) only works in 'capturing' phase. During batch scan
        // (phase='scanning'), SET_IMAGES is ignored, leaving state uncleaned.
        // Also clear batchImages which is separate App.tsx local state.
        setCurrentTransaction(null);
        resetScanState();
        clearBatchImages();

        // If we had reserved credits, they're lost (already confirmed to Firestore)
        // This is expected - user chose to discard knowing they'd lose the credit

        // Now execute the pending action (read from ref to avoid stale closure)
        const pendingAction = pendingActionRef.current;
        if (pendingAction) {
            const { mode, transaction } = pendingAction;
            pendingActionRef.current = null;

            // Call navigateToTransactionEditor directly without conflict check
            // (we just cleared the conflict)
            setTransactionEditorMode(mode);
            if (transaction) {
                setCurrentTransaction(transaction as Transaction);
            } else if (mode === 'new') {
                setCurrentTransaction(createDefaultTransaction());
            }
            navigateToView('transaction-editor');
        } else {
            pendingActionRef.current = null;
        }
    }, [
        setCurrentTransaction,
        resetScanState,
        clearBatchImages,
        setTransactionEditorMode,
        createDefaultTransaction,
        navigateToView,
    ]);

    /**
     * Open conflict dialog via Modal Manager.
     * Story 14e-5: Uses openModalDirect instead of local state.
     */
    const openConflictDialog = useCallback((
        conflictingTransaction: ConflictingTransaction,
        conflictReason: ConflictReason,
        pendingAction: ConflictDialogData['pendingAction']
    ) => {
        // Store pending action in ref for handler access
        pendingActionRef.current = pendingAction;

        // Open modal via Modal Manager
        openModalDirect('transactionConflict', {
            conflictingTransaction,
            conflictReason,
            onContinueCurrent: handleConflictClose,
            onViewConflicting: handleConflictViewCurrent,
            onDiscardConflicting: handleConflictDiscard,
            onClose: handleConflictClose,
            t,
            lang,
            formatCurrency,
        });
    }, [handleConflictClose, handleConflictViewCurrent, handleConflictDiscard, t, lang, formatCurrency]);

    // ===========================================================================
    // Return Result
    // ===========================================================================

    // Story 14e-25d: ViewHandlersContext deleted - this hook used by App.tsx directly
    // Story 14e-4: Credit info modal removed - now uses Modal Manager
    // Story 14e-5: Conflict dialog state removed - now uses Modal Manager
    return useMemo<UseDialogHandlersResult>(
        () => ({
            // Toast
            toastMessage,
            setToastMessage,
            showToast,
            // Conflict Dialog (Story 14e-5: Uses Modal Manager, only exposes open function)
            openConflictDialog,
        }),
        [
            toastMessage,
            setToastMessage,
            showToast,
            openConflictDialog,
        ]
    );
}
