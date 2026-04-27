/**
 * Story 14e-28: useTransactionEditorHandlers Hook
 *
 * Extracts all TransactionEditorView handlers from App.tsx.
 * This hook encapsulates business logic for:
 * - Save/Cancel operations with batch mode routing
 * - Scan processing (photo select, process, retry, rescan)
 * - Batch/List navigation (prev/next)
 * - Group membership changes
 * - Read-only to edit mode conversion
 *
 * Architecture:
 * - Uses Zustand stores directly: ScanStore, NavigationStore, BatchReviewStore
 * - Accesses services via props (user, services)
 * - Returns handlers and computed navigation state
 *
 * Dependencies:
 * - @features/scan/store - ScanStore for scan state and actions
 * - @shared/events - Event bus for cross-feature communication (Story 16-7)
 * - @/shared/stores - NavigationStore for view navigation
 * - @managers/ModalManager - Modal actions
 *
 * @example
 * ```tsx
 * // Story 14e-36c: Editor state now from Zustand store, minimal props needed
 * function TransactionEditorView(props) {
 *   const handlers = useTransactionEditorHandlers({
 *     user,
 *     transactions,
 *     saveTransaction,
 *     deleteTransaction,
 *     processScan,
 *     handleRescan,
 *     hasActiveTransactionConflict,
 *   });
 *
 *   return (
 *     <button onClick={handlers.handleSave}>Save</button>
 *   );
 * }
 * ```
 */

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { User } from 'firebase/auth';
import type { Transaction } from '@/types/transaction';

// Store imports
import {
    useScanStore,
    useScanActions,
} from '@features/scan/store';
// Story 14e-40: ConflictResult type from scan utils
import type { ConflictResult } from '@features/scan';
// Story 16-7: batchReviewActions replaced by event bus (AC-ARCH-NO-2)
import { appEvents } from '@shared/events';
import {
    useNavigationActions,
    useWorkflowImages,
    useWorkflowBatchEditingIndex,
    useWorkflowBatchReceipts,
    getWorkflowState,
} from '@/shared/stores';
// Story 14e-36c: Transaction editor store (replaces App.tsx props)
// Story 15b-1c: Use intra-feature relative import to avoid circular dependency via barrel
import {
    useCurrentTransaction,
    useEditorMode,
    useNavigationList,
    useIsSaving,
    useTransactionEditorActions,
} from '../../store';

// Service imports
// Story 14d-v2-1.1: updateMemberTimestampsForTransaction removed (Epic 14c cleanup)

// =============================================================================
// Types
// =============================================================================

/**
 * Props for useTransactionEditorHandlers hook.
 * Story 14e-36c: Editor state now comes from Zustand store, not props.
 * Remaining props are for external dependencies not in the store.
 */
export interface UseTransactionEditorHandlersProps {
    // User and auth
    user: User | null;

    // Transaction data for list navigation (not in editor store)
    transactions: Transaction[];

    // Transaction handlers from useTransactionHandlers
    saveTransaction: (tx: Transaction) => Promise<string | void>;
    deleteTransaction: (id: string) => void;

    // Scan handlers from useScanHandlers
    processScan: (images?: string[]) => void;
    handleRescan: () => Promise<void>;

    // Story 14e-40: Conflict detection - now using extracted utility type
    hasActiveTransactionConflict: () => ConflictResult;
}

/**
 * Return type for useTransactionEditorHandlers hook.
 */
export interface UseTransactionEditorHandlersReturn {
    // Core transaction operations
    handleUpdateTransaction: (transaction: Transaction) => void;
    handleSave: (transaction: Transaction) => Promise<void>;
    handleCancel: () => void;
    handleDelete: ((id: string) => void) | undefined;

    // Scan operations
    handlePhotoSelect: (file: File) => void;
    handleProcessScan: () => void;
    handleRetry: () => void;
    handleRescan: (() => Promise<void>) | undefined;

    // Batch/List navigation
    handleBatchPrevious: (() => void) | undefined;
    handleBatchNext: (() => void) | undefined;
    handleBatchModeClick: () => void;

    // Group operations
    handleGroupsChange: (groupIds: string[]) => Promise<void>;

    // Read-only mode
    handleRequestEdit: () => void;

    // Navigation context (computed values)
    canNavigatePrevious: boolean;
    canNavigateNext: boolean;
    navigationLabel: string | null;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * useTransactionEditorHandlers - Extracts all TransactionEditorView handlers.
 *
 * CRITICAL: This hook contains business logic previously in App.tsx.
 * All handlers coordinate with:
 * - ScanStore (Zustand) for scan state
 * - BatchReviewStore (Zustand) for batch operations
 * - NavigationStore (Zustand) for view changes
 * - Props for App-level state that needs coordination
 *
 * @param props - Handler dependencies from App.tsx
 * @returns UseTransactionEditorHandlersReturn - All handlers and computed state
 */
export function useTransactionEditorHandlers(
    props: UseTransactionEditorHandlersProps
): UseTransactionEditorHandlersReturn {
    // Story 14e-36c: Only external dependencies come from props
    const {
        user,
        transactions,
        saveTransaction,
        deleteTransaction,
        processScan,
        handleRescan,
        hasActiveTransactionConflict,
    } = props;

    const queryClient = useQueryClient();

    // ==========================================================================
    // Store Access
    // ==========================================================================

    // Story 14e-36c: Transaction editor state from Zustand store (not props)
    const currentTransaction = useCurrentTransaction();
    const transactionEditorMode = useEditorMode();
    const transactionNavigationList = useNavigationList();
    const isTransactionSaving = useIsSaving();
    const {
        setTransaction: setCurrentTransaction,
        setMode: setTransactionEditorMode,
        setReadOnly: setIsViewingReadOnly,
        setNavigationList: setTransactionNavigationList,
        setSaving: setIsTransactionSaving,
        setAnimateItems: setAnimateEditViewItems,
        setCreditUsed: setCreditUsedInSession,
    } = useTransactionEditorActions();

    const scanState = useScanStore();
    const {
        setImages: setScanContextImages,
        setBatchEditingIndex: setBatchEditingIndexContext,
        updateBatchReceipt: updateBatchReceiptContext,
        processError: dispatchProcessError,
        reset: resetScanContext,
        startBatch: startBatchScanContext,
    } = useScanActions();

    // Story 16-6: images, batchEditingIndex, batchReceipts moved to workflow store
    const workflowImages = useWorkflowImages();
    const workflowBatchEditingIndex = useWorkflowBatchEditingIndex();
    const workflowBatchReceipts = useWorkflowBatchReceipts();

    const { setView, navigateBack, navigateToView } = useNavigationActions();

    // ==========================================================================
    // Scan Image Wrapper (mirrors App.tsx pattern)
    // ==========================================================================

    const setScanImages = useCallback((newImages: string[] | ((prev: string[]) => string[])) => {
        const imagesToSet = typeof newImages === 'function'
            ? newImages(getWorkflowState().images)
            : newImages;

        if (scanState.phase === 'idle' && imagesToSet.length > 0 && user?.uid) {
            // This case is handled by startSingle in the caller
            setScanContextImages(imagesToSet);
        } else if (imagesToSet.length === 0) {
            resetScanContext();
        } else {
            setScanContextImages(imagesToSet);
        }
    }, [workflowImages, scanState.phase, user?.uid, setScanContextImages, resetScanContext]);

    const setScanError = useCallback((error: string | null) => {
        if (error) {
            dispatchProcessError(error);
        }
    }, [dispatchProcessError]);

    // ==========================================================================
    // Batch Navigation Handlers (internal)
    // ==========================================================================

    const handleBatchPreviousInternal = useCallback(() => {
        if (workflowBatchEditingIndex === null || !workflowBatchReceipts) return;
        if (workflowBatchEditingIndex > 0) {
            const newIndex = workflowBatchEditingIndex - 1;
            setBatchEditingIndexContext(newIndex);
            const prevReceipt = workflowBatchReceipts[newIndex];
            if (prevReceipt?.transaction) {
                setCurrentTransaction(prevReceipt.transaction);
            }
        }
    }, [workflowBatchEditingIndex, workflowBatchReceipts, setBatchEditingIndexContext, setCurrentTransaction]);

    const handleBatchNextInternal = useCallback(() => {
        if (workflowBatchEditingIndex === null || !workflowBatchReceipts) return;
        if (workflowBatchEditingIndex < workflowBatchReceipts.length - 1) {
            const newIndex = workflowBatchEditingIndex + 1;
            setBatchEditingIndexContext(newIndex);
            const nextReceipt = workflowBatchReceipts[newIndex];
            if (nextReceipt?.transaction) {
                setCurrentTransaction(nextReceipt.transaction);
            }
        }
    }, [workflowBatchEditingIndex, workflowBatchReceipts, setBatchEditingIndexContext, setCurrentTransaction]);

    // ==========================================================================
    // Transaction List Navigation Handlers (internal)
    // ==========================================================================

    const handleTransactionListPrevious = useCallback(() => {
        if (!transactionNavigationList || !currentTransaction?.id) return;
        const currentIndex = transactionNavigationList.indexOf(currentTransaction.id);
        if (currentIndex <= 0) return;
        const prevId = transactionNavigationList[currentIndex - 1];
        const prevTx = transactions.find(t => t.id === prevId);
        if (prevTx) {
            setCurrentTransaction(prevTx);
        }
    }, [transactionNavigationList, currentTransaction?.id, transactions, setCurrentTransaction]);

    const handleTransactionListNext = useCallback(() => {
        if (!transactionNavigationList || !currentTransaction?.id) return;
        const currentIndex = transactionNavigationList.indexOf(currentTransaction.id);
        if (currentIndex < 0 || currentIndex >= transactionNavigationList.length - 1) return;
        const nextId = transactionNavigationList[currentIndex + 1];
        const nextTx = transactions.find(t => t.id === nextId);
        if (nextTx) {
            setCurrentTransaction(nextTx);
        }
    }, [transactionNavigationList, currentTransaction?.id, transactions, setCurrentTransaction]);

    // ==========================================================================
    // Core Transaction Handlers
    // ==========================================================================

    /**
     * Handle transaction update from editor (for UI state + batch context sync)
     */
    const handleUpdateTransaction = useCallback((trans: Transaction) => {
        setCurrentTransaction(trans);
        // Sync with batch context if editing a batch receipt
        if (workflowBatchEditingIndex !== null && workflowBatchReceipts) {
            const receiptId = workflowBatchReceipts[workflowBatchEditingIndex]?.id;
            if (receiptId) {
                updateBatchReceiptContext(receiptId, { transaction: trans });
            }
        }
    }, [workflowBatchEditingIndex, workflowBatchReceipts, updateBatchReceiptContext, setCurrentTransaction]);

    /**
     * Handle save from editor
     */
    const handleSave = useCallback(async (trans: Transaction) => {
        if (isTransactionSaving) return;
        setIsTransactionSaving(true);
        // Capture batch editing state BEFORE saveTransaction clears it
        const wasInBatchEditingMode = workflowBatchEditingIndex !== null;
        try {
            await saveTransaction(trans);
            // Bug fix: Only clear scan images when NOT in batch editing mode.
            // saveTransaction already handles navigation back to batch-review.
            // Clearing images here would trigger resetScanContext() and wipe all batch receipts.
            if (!wasInBatchEditingMode) {
                setScanImages([]);
            }
            setScanError(null);
            setCurrentTransaction(null);
            setIsViewingReadOnly(false);
            setCreditUsedInSession(false);
            setTransactionNavigationList(null);
        } finally {
            setIsTransactionSaving(false);
        }
    }, [
        isTransactionSaving,
        saveTransaction,
        setScanImages,
        setScanError,
        workflowBatchEditingIndex,
        setIsTransactionSaving,
        setCurrentTransaction,
        setIsViewingReadOnly,
        setCreditUsedInSession,
        setTransactionNavigationList,
    ]);

    /**
     * Handle cancel from editor
     */
    const handleCancel = useCallback(() => {
        // Bug fix: Only clear scan images when NOT in batch editing mode.
        // Clearing images triggers resetScanContext() which would wipe all batch receipts.
        if (workflowBatchEditingIndex === null) {
            setScanImages([]);
        }
        setScanError(null);
        setCurrentTransaction(null);
        setAnimateEditViewItems(false);
        setIsViewingReadOnly(false);
        setCreditUsedInSession(false);
        setTransactionNavigationList(null);
        if (workflowBatchEditingIndex !== null) {
            setBatchEditingIndexContext(null);
            // Story 16-7: Emit event instead of cross-feature store call (AC-2)
            // TD-16-5: Renamed to match cancel-path semantics (AC-3)
            appEvents.emit('batch:editing-finished', {});
            setView('batch-review');
        } else {
            navigateBack();
        }
    }, [
        setScanImages,
        setScanError,
        workflowBatchEditingIndex,
        setBatchEditingIndexContext,
        navigateBack,
        setView,
        setCurrentTransaction,
        setAnimateEditViewItems,
        setIsViewingReadOnly,
        setCreditUsedInSession,
        setTransactionNavigationList,
    ]);

    /**
     * Handle delete (existing transactions only)
     */
    const handleDelete = useMemo(() => {
        return transactionEditorMode === 'existing' ? deleteTransaction : undefined;
    }, [transactionEditorMode, deleteTransaction]);

    // ==========================================================================
    // Scan Handlers
    // ==========================================================================

    /**
     * Handle photo select from editor
     */
    const handlePhotoSelect = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            setScanImages([base64]);
        };
        reader.readAsDataURL(file);
    }, [setScanImages]);

    /**
     * Handle process scan from editor
     */
    const handleProcessScan = useCallback(() => {
        processScan();
    }, [processScan]);

    /**
     * Handle retry from editor
     */
    const handleRetry = useCallback(() => {
        setScanError(null);
        processScan();
    }, [setScanError, processScan]);

    /**
     * Handle rescan from editor (existing transactions only)
     */
    const handleRescanCallback = useMemo(() => {
        return transactionEditorMode === 'existing' ? async () => {
            await handleRescan();
        } : undefined;
    }, [transactionEditorMode, handleRescan]);

    // ==========================================================================
    // Batch/List Navigation Handlers
    // ==========================================================================

    /**
     * Handle batch previous (conditional on batch vs list context)
     */
    const handleBatchPrevious = useMemo(() => {
        if (workflowBatchEditingIndex !== null) {
            return handleBatchPreviousInternal;
        }
        if (transactionNavigationList) {
            return handleTransactionListPrevious;
        }
        return undefined;
    }, [workflowBatchEditingIndex, transactionNavigationList, handleBatchPreviousInternal, handleTransactionListPrevious]);

    /**
     * Handle batch next (conditional on batch vs list context)
     */
    const handleBatchNext = useMemo(() => {
        if (workflowBatchEditingIndex !== null) {
            return handleBatchNextInternal;
        }
        if (transactionNavigationList) {
            return handleTransactionListNext;
        }
        return undefined;
    }, [workflowBatchEditingIndex, transactionNavigationList, handleBatchNextInternal, handleTransactionListNext]);

    /**
     * Handle batch mode click from editor
     */
    const handleBatchModeClick = useCallback(() => {
        if (user?.uid) {
            startBatchScanContext(user.uid);
        }
        navigateToView('batch-capture');
    }, [user?.uid, startBatchScanContext, navigateToView]);

    // ==========================================================================
    // Group Operations
    // ==========================================================================

    /**
     * Handle groups change from editor (complex cache update logic)
     */
    const handleGroupsChange = useCallback(async (groupIds: string[]) => {
        if (!user?.uid || !currentTransaction) return;

        if (import.meta.env.DEV) {
            console.log('[TransactionEditor] onGroupsChange:', {
                transactionId: currentTransaction.id,
                newGroupIds: groupIds,
            });
        }

        // Invalidate transaction cache
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
    }, [user?.uid, currentTransaction, queryClient]);

    // ==========================================================================
    // Read-Only Mode Handler
    // ==========================================================================

    /**
     * Handle edit request from read-only view (performs conflict check)
     * If scan is active, auto-navigate to scan view instead of showing dialog
     */
    const handleRequestEdit = useCallback(() => {
        const conflictCheck = hasActiveTransactionConflict();

        if (conflictCheck.hasConflict) {
            // Auto-navigate to the active scan view - no dialog
            if (scanState.mode === 'batch') {
                navigateToView('batch-review');
            } else {
                if (scanState.results.length > 0) {
                    setCurrentTransaction(scanState.results[0]);
                }
                setTransactionEditorMode('new');
                navigateToView('transaction-editor');
            }
        } else {
            setIsViewingReadOnly(false);
        }
    }, [
        hasActiveTransactionConflict,
        scanState.mode,
        scanState.results,
        navigateToView,
        setCurrentTransaction,
        setTransactionEditorMode,
        setIsViewingReadOnly,
    ]);

    // ==========================================================================
    // Navigation Context (Computed Values)
    // ==========================================================================

    const canNavigatePrevious = useMemo(() => {
        if (workflowBatchEditingIndex !== null && workflowBatchReceipts) {
            return workflowBatchEditingIndex > 0;
        }
        if (transactionNavigationList && currentTransaction?.id) {
            const currentIndex = transactionNavigationList.indexOf(currentTransaction.id);
            return currentIndex > 0;
        }
        return false;
    }, [workflowBatchEditingIndex, workflowBatchReceipts, transactionNavigationList, currentTransaction?.id]);

    const canNavigateNext = useMemo(() => {
        if (workflowBatchEditingIndex !== null && workflowBatchReceipts) {
            return workflowBatchEditingIndex < workflowBatchReceipts.length - 1;
        }
        if (transactionNavigationList && currentTransaction?.id) {
            const currentIndex = transactionNavigationList.indexOf(currentTransaction.id);
            return currentIndex >= 0 && currentIndex < transactionNavigationList.length - 1;
        }
        return false;
    }, [workflowBatchEditingIndex, workflowBatchReceipts, transactionNavigationList, currentTransaction?.id]);

    const navigationLabel = useMemo(() => {
        if (workflowBatchEditingIndex !== null && workflowBatchReceipts) {
            return `${workflowBatchEditingIndex + 1} de ${workflowBatchReceipts.length}`;
        }
        if (transactionNavigationList && currentTransaction?.id) {
            const currentIndex = transactionNavigationList.indexOf(currentTransaction.id);
            if (currentIndex >= 0) {
                return `${currentIndex + 1} de ${transactionNavigationList.length}`;
            }
        }
        return null;
    }, [workflowBatchEditingIndex, workflowBatchReceipts, transactionNavigationList, currentTransaction?.id]);

    // ==========================================================================
    // Return
    // ==========================================================================

    return {
        // Core transaction operations
        handleUpdateTransaction,
        handleSave,
        handleCancel,
        handleDelete,

        // Scan operations
        handlePhotoSelect,
        handleProcessScan,
        handleRetry,
        handleRescan: handleRescanCallback,

        // Batch/List navigation
        handleBatchPrevious,
        handleBatchNext,
        handleBatchModeClick,

        // Group operations
        handleGroupsChange,

        // Read-only mode
        handleRequestEdit,

        // Navigation context
        canNavigatePrevious,
        canNavigateNext,
        navigationLabel,
    };
}
