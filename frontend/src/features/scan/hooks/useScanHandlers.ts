/**
 * Story 14c-refactor.20: useScanHandlers Hook
 *
 * Extracts scan-related event handlers from App.tsx into a reusable hook.
 * Handles scan overlay, quick save, currency/total mismatch dialogs, and
 * provides helper functions for scan flow management.
 *
 * Note: The core `processScan` function remains in App.tsx due to its deep
 * integration with multiple state variables and complex async flows.
 * This hook extracts the dialog handlers and utility functions that are
 * more easily modularized.
 *
 * Features:
 * - Scan overlay state handlers (cancel, retry, dismiss)
 * - Quick save handlers (save, edit, cancel, complete)
 * - Currency mismatch dialog handlers
 * - Total mismatch dialog handlers
 * - Conflict dialog handlers
 * - Item name mapping applier utility
 *
 * Architecture Reference: Epic 14c-refactor - App.tsx Handler Extraction
 * Dependencies:
 * - ScanContext (state machine, dialogs)
 * - useUserCredits (credit operations)
 * - useTrustedMerchants (auto-save eligibility)
 * - useItemNameMappings (learned name application)
 *
 * @example
 * ```tsx
 * function App() {
 *   const {
 *     handleScanOverlayCancel,
 *     handleQuickSave,
 *     handleCurrencyUseDetected,
 *   } = useScanHandlers({ ... });
 *
 *   return <ScanOverlay onCancel={handleScanOverlayCancel} />;
 * }
 * ```
 */

import { useCallback, useMemo } from 'react';
import type { Transaction, TransactionItem } from '@/types/transaction';
import type {
    CurrencyMismatchDialogData,
    TotalMismatchDialogData,
    QuickSaveDialogData,
} from '../types/scanStateMachine';
import { createTransactionRepository } from '@/repositories/transactionRepository';
import {
    generateInsightForTransaction,
    isInsightsSilenced,
    getDefaultCache,
} from '@features/insights/services/insightEngineService';
import { parseStrictNumber } from '@/utils/validation';
import { hasValidItems } from '@/utils/transactionValidation';
// Story 14e-41: reconcileItemsTotal moved to entity (single source of truth)
import { reconcileItemsTotal as entityReconcileItemsTotal } from '@entities/transaction';
// Story 14e-42: applyItemNameMappings moved to @features/categories (single source of truth)
import { applyItemNameMappings as pureApplyItemNameMappings } from '@/features/categories';
import { classifyError, getErrorInfo } from '@/utils/errorHandler';
// TD-18-22: Copy pending scan images to permanent receipts path after save
import { copyPendingToReceipts } from '../services/pendingScanUpload';
// Story 15b-5a: Direct store access for error recovery reset
import { useScanStore } from '../store/useScanStore';

// Story 15b-2l: Types extracted to scanHandlerTypes.ts
import type { UseScanHandlersProps, UseScanHandlersResult } from './scanHandlerTypes';
export type { UseScanHandlersProps, UseScanHandlersResult } from './scanHandlerTypes';
// Story 15b-2l: Flow routing extracted to useScanFlowRouter.ts
import { useScanFlowRouter } from './useScanFlowRouter';

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to manage scan-related event handlers.
 *
 * Extracts dialog and utility handlers from App.tsx while keeping
 * the core processScan function in place (due to deep integration).
 *
 * @param props - Dependencies for scan handlers
 * @returns Scan handlers and utilities
 */
export function useScanHandlers(
    props: UseScanHandlersProps
): UseScanHandlersResult {
    const {
        user,
        services,
        userPreferences,
        transactions,
        // Reserved for future use
        currency: _currency,
        lang,
        // Reserved for future use
        currentTransaction: _currentTransaction,
        insightProfile,
        insightCache,
        recordInsightShown,
        trackTransactionForInsight,
        incrementInsightCounter,
        batchSession,
        addToBatch,
        checkTrusted,
        recordMerchantScan,
        findItemNameMatch,
        // Mapping props (Story 14c-refactor.22a)
        categoryMappings,
        findMerchantMatch,
        applyCategoryMappings,
        incrementMappingUsage,
        incrementMerchantMappingUsage,
        incrementItemNameMappingUsage,
        showScanDialog,
        dismissScanDialog,
        dispatchProcessSuccess,
        // Reserved for future use
        resetScanContext: _resetScanContext,
        setScanImages,
        scanOverlay,
        setToastMessage,
        setCurrentTransaction,
        setView,
        navigateToView,
        setCurrentInsight,
        setShowInsightCard,
        setShowBatchSummary,
        // Reserved for future use
        setSessionContext: _setSessionContext,
        setAnimateEditViewItems,
        setSkipScanCompleteModal,
        setTransactionEditorMode,
        setIsQuickSaving,
        isQuickSaving,
        setTrustPromptData,
        setShowTrustPrompt,
        t,
    } = props;
    // Silence unused variable warnings - these are reserved for future integration
    void _currency;
    void _currentTransaction;
    void _resetScanContext;
    void _setSessionContext;

    // =========================================================================
    // Utility Functions
    // =========================================================================

    /**
     * Apply learned item name mappings to transaction items.
     * Only applies when there's a merchant match (item mappings are scoped per-store).
     *
     * Story 14e-42: Wrapper around pure utility with findItemNameMatch bound from context.
     */
    const applyItemNameMappings = useCallback((
        transaction: Transaction,
        normalizedMerchant: string
    ): { transaction: Transaction; appliedIds: string[] } => {
        return pureApplyItemNameMappings(transaction, normalizedMerchant, findItemNameMatch);
    }, [findItemNameMatch]);

    /**
     * Reconcile transaction total with sum of items.
     * If there's a discrepancy, adds a surplus or discount item to balance.
     *
     * Story 14e-41: Wrapper around entity function with lang bound from context.
     */
    const reconcileItemsTotal = useCallback((
        items: TransactionItem[],
        receiptTotal: number
    ) => entityReconcileItemsTotal(items, receiptTotal, lang as 'en' | 'es'), [lang]);

    // =========================================================================
    // Flow Router (Story 15b-2l: extracted to useScanFlowRouter)
    // =========================================================================

    const { continueScanWithTransaction, proceedAfterCurrencyResolved } = useScanFlowRouter({
        user,
        services,
        userPreferences,
        categoryMappings,
        findMerchantMatch,
        applyCategoryMappings,
        applyItemNameMappings,
        incrementMappingUsage,
        incrementMerchantMappingUsage,
        incrementItemNameMappingUsage,
        checkTrusted,
        dispatchProcessSuccess,
        showScanDialog,
        setCurrentTransaction,
        setToastMessage,
        setView,
        setSkipScanCompleteModal,
        setAnimateEditViewItems,
        t,
    });

    // =========================================================================
    // Scan Overlay Handlers
    // =========================================================================

    /**
     * Handle cancel from scan overlay.
     * Returns to dashboard and resets scan state.
     */
    const handleScanOverlayCancel = useCallback(() => {
        scanOverlay.reset();
        // Reset scan store to idle so _guardPhase unblocks subsequent scan attempts
        useScanStore.getState().reset();
        setScanImages([]);
        setCurrentTransaction(null);
        setView('dashboard');
    }, [scanOverlay, setScanImages, setCurrentTransaction, setView]);

    /**
     * Handle retry from scan overlay error state.
     * TD-18-4: Stash images before reset, check credits, re-trigger processScan.
     * processScan handles its own credit lifecycle (deduct → process → refund on error).
     */
    const handleScanOverlayRetry = useCallback(() => {
        // All scans go through async pipeline — retry = dismiss + scan again
        scanOverlay.reset();
        useScanStore.getState().reset();
        setScanImages([]);
        setCurrentTransaction(null);
        setView('dashboard');
        setToastMessage({ text: t('scanRetryMessage') || 'Please try scanning again', type: 'info' });
    }, [scanOverlay, setScanImages, setCurrentTransaction, setView, setToastMessage, t]);

    /**
     * Handle dismiss from scan overlay error state.
     * Story 16-3: Full reset (matching retry pattern) so gallery path works after errors.
     */
    const handleScanOverlayDismiss = useCallback(() => {
        scanOverlay.reset();
        // Reset scan store to idle so startSingle/_guardPhase allows new scan
        useScanStore.getState().reset();
        setScanImages([]);
        setCurrentTransaction(null);
        setView('dashboard');
    }, [scanOverlay, setScanImages, setCurrentTransaction, setView]);

    // =========================================================================
    // Quick Save Handlers
    // =========================================================================

    /**
     * Handle quick save completion (called after success animation).
     */
    const handleQuickSaveComplete = useCallback(() => {
        dismissScanDialog();
        setScanImages([]);
        setView('dashboard');
    }, [dismissScanDialog, setScanImages, setView]);

    /**
     * Handle quick save button click.
     * Validates transaction, saves to Firestore, generates insight.
     */
    const handleQuickSave = useCallback(async (dialogData?: QuickSaveDialogData) => {
        const transaction = dialogData?.transaction;
        if (!services || !user || !transaction || isQuickSaving) return;

        // Validate transaction has at least one valid item
        if (!hasValidItems(transaction.items)) {
            setCurrentTransaction(transaction);
            setToastMessage({ text: t('itemsRequired') || 'Add at least one item', type: 'info' });
            navigateToView('transaction-editor');
            return;
        }

        setIsQuickSaving(true);

        const tDoc = {
            ...transaction,
            total: parseStrictNumber(transaction.total),
        };

        try {
            incrementInsightCounter();

            const profile = insightProfile || {
                schemaVersion: 1 as const,
                firstTransactionDate: null as any,
                totalTransactions: 0,
                recentInsights: [],
            };

            const cacheOrDefault = insightCache || getDefaultCache();
            const silenced = isInsightsSilenced(cacheOrDefault);

            // Transient repo: factory-from-context pattern — intentional for single async flow (TD-15b-27)
            const repo = createTransactionRepository({ db: services.db, userId: user.uid, appId: services.appId });
            const transactionId = await repo.add(tDoc);
            const txWithId = { ...tDoc, id: transactionId } as Transaction;

            // TD-18-22: Copy scan images from pending to permanent path (fire-and-forget)
            if (tDoc.imageUrls && tDoc.imageUrls.length > 0) {
                copyPendingToReceipts(tDoc.imageUrls, user.uid, transactionId)
                    .then(newUrls => repo.update(transactionId, { imageUrls: newUrls }))
                    .catch(err => console.warn('Failed to copy scan images to receipts:', err));
            }

            const insight = await generateInsightForTransaction(
                txWithId,
                transactions,
                profile,
                cacheOrDefault
            );

            addToBatch(txWithId, insight);

            // Show insight card (unless silenced or in batch mode)
            if (!silenced) {
                const willBeBatchMode = (batchSession?.receipts.length ?? 0) + 1 >= 3;
                if (willBeBatchMode) {
                    setShowBatchSummary(true);
                } else {
                    setCurrentInsight(insight);
                    setShowInsightCard(true);
                }
            }

            // Record insight shown (if applicable)
            if (insight && insight.id !== 'building_profile') {
                recordInsightShown(insight.id, transactionId, {
                    title: insight.title,
                    message: insight.message,
                    icon: insight.icon || '',
                    category: insight.category as string,
                }).catch(err => console.warn('Failed to record insight:', err));
            }

            // Track transaction for profile stats
            const txDate = tDoc.date ? new Date(tDoc.date) : new Date();
            trackTransactionForInsight(txDate)
                .catch(err => console.warn('Failed to track transaction:', err));

            // Record scan for trust tracking
            // Story 14c-refactor.22a: Integrated trust prompt handling
            const merchantAlias = tDoc.alias || tDoc.merchant;
            if (merchantAlias) {
                try {
                    const eligibility = await recordMerchantScan(merchantAlias, false);
                    // AC #3: Show trust prompt if eligible
                    if (eligibility.shouldShowPrompt) {
                        setTrustPromptData(eligibility);
                        setShowTrustPrompt(true);
                    }
                } catch (err) {
                    console.warn('Failed to record merchant scan:', err);
                }
            }

        } catch (error) {
            console.error('Quick save failed:', error);
            const errorInfo = getErrorInfo(classifyError(error));
            setToastMessage({ text: t(errorInfo.messageKey), type: errorInfo.toastType });
            dismissScanDialog();
        } finally {
            setIsQuickSaving(false);
        }
    }, [
        services,
        user,
        isQuickSaving,
        transactions,
        insightProfile,
        insightCache,
        batchSession,
        incrementInsightCounter,
        addToBatch,
        recordInsightShown,
        trackTransactionForInsight,
        recordMerchantScan,
        setIsQuickSaving,
        setCurrentTransaction,
        setToastMessage,
        navigateToView,
        setCurrentInsight,
        setShowInsightCard,
        setShowBatchSummary,
        dismissScanDialog,
        setTrustPromptData,
        setShowTrustPrompt,
        t,
    ]);

    /**
     * Handle edit from quick save card.
     * Navigates to transaction editor view.
     */
    const handleQuickSaveEdit = useCallback((dialogData?: QuickSaveDialogData) => {
        const transaction = dialogData?.transaction;
        if (transaction) {
            setCurrentTransaction(transaction);
        }
        setTransactionEditorMode('new');
        setSkipScanCompleteModal(true);
        setView('transaction-editor');
    }, [setCurrentTransaction, setTransactionEditorMode, setSkipScanCompleteModal, setView]);

    /**
     * Handle cancel from quick save card.
     * Returns to dashboard.
     */
    const handleQuickSaveCancel = useCallback((_dialogData?: QuickSaveDialogData) => {
        dismissScanDialog();
        setCurrentTransaction(null);
        setScanImages([]);
        setView('dashboard');
    }, [dismissScanDialog, setCurrentTransaction, setScanImages, setView]);

    // =========================================================================
    // Currency Mismatch Handlers
    // =========================================================================

    /**
     * Handle use detected currency from mismatch dialog.
     */
    const handleCurrencyUseDetected = useCallback(async (dialogData?: CurrencyMismatchDialogData) => {
        if (!dialogData) return;
        const transaction = dialogData.pendingTransaction as Transaction;
        const hasDiscrepancy = dialogData.hasDiscrepancy;

        dismissScanDialog();

        if (hasDiscrepancy) {
            setToastMessage({ text: t('discrepancyWarning'), type: 'info' });
        }

        // Use proceedAfterCurrencyResolved instead of continueScanWithTransaction
        // because mappings are already applied before currency dialog is shown
        await proceedAfterCurrencyResolved(transaction);
    }, [dismissScanDialog, proceedAfterCurrencyResolved, setToastMessage, t]);

    /**
     * Handle use default currency from mismatch dialog.
     */
    const handleCurrencyUseDefault = useCallback(async (dialogData?: CurrencyMismatchDialogData) => {
        if (!dialogData) return;
        const transaction = {
            ...dialogData.pendingTransaction,
            currency: userPreferences.defaultCurrency,
        };
        const hasDiscrepancy = dialogData.hasDiscrepancy;

        dismissScanDialog();

        if (hasDiscrepancy) {
            setToastMessage({ text: t('discrepancyWarning'), type: 'info' });
        }

        // Use proceedAfterCurrencyResolved instead of continueScanWithTransaction
        // because mappings are already applied before currency dialog is shown
        await proceedAfterCurrencyResolved(transaction as Transaction);
    }, [userPreferences.defaultCurrency, dismissScanDialog, proceedAfterCurrencyResolved, setToastMessage, t]);

    /**
     * Handle cancel from currency mismatch dialog.
     */
    const handleCurrencyMismatchCancel = useCallback((_dialogData?: CurrencyMismatchDialogData) => {
        dismissScanDialog();
        setCurrentTransaction(null);
        setScanImages([]);
        setView('dashboard');
    }, [dismissScanDialog, setCurrentTransaction, setScanImages, setView]);

    // =========================================================================
    // Total Mismatch Handlers
    // =========================================================================

    /**
     * Handle use items sum as total from mismatch dialog.
     */
    const handleTotalUseItemsSum = useCallback((dialogData?: TotalMismatchDialogData) => {
        if (!dialogData) return;
        const { validationResult, pendingTransaction, parsedItems } = dialogData;

        const correctedTransaction: Transaction = {
            ...pendingTransaction as Transaction,
            total: validationResult.itemsSum,
            items: parsedItems as Transaction['items'],
        };

        dismissScanDialog();
        continueScanWithTransaction(correctedTransaction);
        setToastMessage({ text: t('totalCorrected') || 'Total corregido', type: 'success' });
    }, [dismissScanDialog, continueScanWithTransaction, setToastMessage, t]);

    /**
     * Handle keep original total from mismatch dialog.
     */
    const handleTotalKeepOriginal = useCallback((dialogData?: TotalMismatchDialogData) => {
        if (!dialogData) return;
        const { pendingTransaction, parsedItems } = dialogData;

        const { items: reconciledItems } = reconcileItemsTotal(
            parsedItems as Transaction['items'],
            (pendingTransaction as Transaction).total
        );

        const transaction: Transaction = {
            ...pendingTransaction as Transaction,
            items: reconciledItems,
        };

        dismissScanDialog();
        continueScanWithTransaction(transaction);
    }, [reconcileItemsTotal, dismissScanDialog, continueScanWithTransaction]);

    /**
     * Handle cancel from total mismatch dialog.
     */
    const handleTotalMismatchCancel = useCallback((_dialogData?: TotalMismatchDialogData) => {
        dismissScanDialog();
        setCurrentTransaction(null);
        setScanImages([]);
        setView('dashboard');
    }, [dismissScanDialog, setCurrentTransaction, setScanImages, setView]);

    // =========================================================================
    // Return
    // =========================================================================

    return useMemo<UseScanHandlersResult>(
        () => ({
            // Scan overlay handlers
            handleScanOverlayCancel,
            handleScanOverlayRetry,
            handleScanOverlayDismiss,

            // Quick save handlers
            handleQuickSaveComplete,
            handleQuickSave,
            handleQuickSaveEdit,
            handleQuickSaveCancel,

            // Currency mismatch handlers
            handleCurrencyUseDetected,
            handleCurrencyUseDefault,
            handleCurrencyMismatchCancel,

            // Total mismatch handlers
            handleTotalUseItemsSum,
            handleTotalKeepOriginal,
            handleTotalMismatchCancel,

            // Utilities
            applyItemNameMappings,
            reconcileItemsTotal,
            continueScanWithTransaction,
        }),
        [
            handleScanOverlayCancel,
            handleScanOverlayRetry,
            handleScanOverlayDismiss,
            handleQuickSaveComplete,
            handleQuickSave,
            handleQuickSaveEdit,
            handleQuickSaveCancel,
            handleCurrencyUseDetected,
            handleCurrencyUseDefault,
            handleCurrencyMismatchCancel,
            handleTotalUseItemsSum,
            handleTotalKeepOriginal,
            handleTotalMismatchCancel,
            applyItemNameMappings,
            reconcileItemsTotal,
            continueScanWithTransaction,
        ]
    );
}

export default useScanHandlers;
