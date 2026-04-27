/**
 * useScanWorkflowOrchestrator - Composes scan state, actions, overlays,
 * batch session, trusted merchants, and critical wrapper callbacks.
 *
 * CRITICAL: setScanImages auto-transition logic must be preserved exactly.
 *
 * Story 15b-4f: App.tsx fan-out reduction
 */
import { useCallback } from 'react';
import {
    useScanStore,
    useScanActions,
    useIsProcessing,
    useScanMode,
    useSkipScanCompleteModal,
    useIsRescanning,
} from '@features/scan/store';
import { getWorkflowState, useWorkflowImages, useWorkflowBatchReceipts } from '@shared/stores';
// Story 16-2: useScanOverlayState removed — overlay state now in Zustand store
import { useBatchProcessing } from '../../hooks/useBatchProcessing';
import { useBatchSession } from '../../hooks/useBatchSession';
import { useTrustedMerchants } from '../../hooks/useTrustedMerchants';
import { DEFAULT_CURRENCY } from '../../utils/currency';
import type { ReceiptType } from '../../services/gemini';
import type { SupportedCurrency } from '@/types/preferences';
import type { User } from 'firebase/auth';
import type { Services } from '../../contexts/AuthContext';

export function useScanWorkflowOrchestrator(
    user: User | null,
    services: Services | null,
) {
    // Scan state from Zustand store
    const scanState = useScanStore();
    const scanMode = useScanMode();
    const isContextProcessing = useIsProcessing();

    // Scan actions from Zustand store
    const {
        startSingle: startScanContext,
        startBatch: startBatchScanContext,
        startStatement: startStatementScanContext,
        batchItemStart: dispatchBatchItemStart,
        batchItemSuccess: dispatchBatchItemSuccess,
        batchItemError: dispatchBatchItemError,
        batchComplete: dispatchBatchComplete,
        setBatchEditingIndex: setBatchEditingIndexContext,
        showDialog: showScanDialogZustand,
        dismissDialog: dismissScanDialog,
        setImages: setScanContextImages,
        processStart: dispatchProcessStart,
        processSuccess: dispatchProcessSuccess,
        processError: dispatchProcessError,
        reset: resetScanContext,
        restoreState: restoreScanState,
        setSkipScanCompleteModal,
        setIsRescanning,
    } = useScanActions();

    // Wrapper to maintain old showDialog(type, data) signature
    const showScanDialog = useCallback((type: string, data?: unknown) => {
        showScanDialogZustand({ type, data } as any);
    }, [showScanDialogZustand]);

    // Computed values derived from Zustand state
    const isBatchModeFromContext = scanMode === 'batch';

    // Wrapper functions for setStoreType and setCurrency (use restoreState)
    const setScanContextStoreType = useCallback((storeType: ReceiptType) => {
        restoreScanState({ storeType });
    }, [restoreScanState]);

    const setScanContextCurrency = useCallback((currency: string) => {
        restoreScanState({ currency });
    }, [restoreScanState]);

    // Helper for batch receipts existence check (Story 16-6: read from workflow store)
    const workflowBatchReceipts = useWorkflowBatchReceipts();
    const hasBatchReceipts = (workflowBatchReceipts?.length ?? 0) > 0;

    // ==========================================================================
    // State Variable Migrations - ScanContext wrappers for backward compatibility
    // ==========================================================================

    // scanImages wrapper - auto-transitions to 'capturing' phase when setting images
    // Story 16-6: images moved to shared workflow store
    const workflowImages = useWorkflowImages();
    const scanImages = workflowImages;
    const setScanImages = useCallback((newImages: string[] | ((prev: string[]) => string[])) => {
        const currentImages = getWorkflowState().images;
        const imagesToSet = typeof newImages === 'function'
            ? newImages(currentImages)
            : newImages;

        // Auto-transition to 'capturing' phase if needed
        if (scanState.phase === 'idle' && imagesToSet.length > 0 && user?.uid) {
            startScanContext(user.uid);
            // setTimeout(0) defers to next tick to allow state transition
            setTimeout(() => setScanContextImages(imagesToSet), 0);
        } else if (imagesToSet.length === 0) {
            // Clearing images resets to idle state
            resetScanContext();
        } else {
            setScanContextImages(imagesToSet);
        }
    }, [workflowImages, scanState.phase, user?.uid, startScanContext, setScanContextImages, resetScanContext]);

    // Story 14e-28b: scanError now accessed internally by TransactionEditorView via Zustand store
    const setScanError = useCallback((error: string | null) => {
        if (error) {
            dispatchProcessError(error);
        }
    }, [dispatchProcessError]);

    // isAnalyzing - derived from state machine phase (Story 14e-25d: setter removed - no-op)
    const isAnalyzing = isContextProcessing;

    // scanStoreType wrapper
    const scanStoreType = (scanState.storeType || 'auto') as ReceiptType;
    const setScanStoreType = useCallback((storeType: ReceiptType) => {
        setScanContextStoreType(storeType);
    }, [setScanContextStoreType]);

    // scanCurrency wrapper
    const scanCurrency = (scanState.currency || DEFAULT_CURRENCY) as SupportedCurrency;
    const setScanCurrency = useCallback((currency: SupportedCurrency) => {
        setScanContextCurrency(currency);
    }, [setScanContextCurrency]);

    // Story 14e-38: UI flag for scan complete modal suppression - from Zustand store
    const skipScanCompleteModal = useSkipScanCompleteModal();
    const isRescanning = useIsRescanning();

    // Story 16-2: overlay state now read from Zustand store via selectors
    const scanOverlay = {
        state: scanState.overlayState,
        progress: scanState.overlayProgress,
        eta: scanState.overlayEta,
        error: scanState.overlayError,
        // Actions from store
        startUpload: useScanStore.getState().startOverlayUpload,
        setProgress: useScanStore.getState().setOverlayProgress,
        startProcessing: useScanStore.getState().startOverlayProcessing,
        setReady: useScanStore.getState().setOverlayReady,
        setError: useScanStore.getState().setOverlayError,
        reset: useScanStore.getState().resetOverlay,
        retry: useScanStore.getState().retryOverlay,
    };
    const batchProcessing = useBatchProcessing(3);

    // Batch session tracking for multi-receipt scanning
    const {
        session: batchSession,
        addToBatch,
        clearBatch,
    } = useBatchSession();

    // Trusted merchants for auto-save functionality
    const {
        recordMerchantScan,
        checkTrusted,
        acceptTrust,
        declinePrompt,
    } = useTrustedMerchants(user, services);

    return {
        scanState,
        scanMode,
        isContextProcessing,
        // Scan actions (all destructured)
        startScanContext,
        startBatchScanContext,
        startStatementScanContext,
        dispatchBatchItemStart,
        dispatchBatchItemSuccess,
        dispatchBatchItemError,
        dispatchBatchComplete,
        setBatchEditingIndexContext,
        showScanDialog,
        dismissScanDialog,
        setScanContextImages,
        dispatchProcessStart,
        dispatchProcessSuccess,
        dispatchProcessError,
        resetScanContext,
        restoreScanState,
        setSkipScanCompleteModal,
        setIsRescanning,
        // Computed values
        isBatchModeFromContext,
        hasBatchReceipts,
        isAnalyzing,
        // Wrapper state
        scanImages,
        setScanImages,
        setScanError,
        scanStoreType,
        setScanStoreType,
        scanCurrency,
        setScanCurrency,
        skipScanCompleteModal,
        isRescanning,
        // Overlay + batch
        scanOverlay,
        batchProcessing,
        batchSession,
        addToBatch,
        clearBatch,
        // Trusted merchants
        recordMerchantScan,
        checkTrusted,
        acceptTrust,
        declinePrompt,
    };
}
