/**
 * App.tsx - Main Application Component
 *
 * Root component that orchestrates the entire application:
 * - View routing and navigation state management
 * - User authentication and session handling
 * - Transaction and scan workflow coordination
 * - Theme, language, and user preferences
 * - Context providers (Auth, Scan, Analytics, HistoryFilters)
 *
 * View rendering is delegated to composition hooks (useXxxViewProps) and
 * render functions (viewRenderers.tsx). Handler logic is extracted to
 * app-level hooks (useTransactionHandlers, useScanHandlers, etc.).
 *
 * Story 15b-4f: Hook initialization composed into useAppDataHooks orchestrator.
 */
import { useEffect, useRef, useCallback, useMemo } from 'react';
// App architecture components
import { AppLayout, AppOverlays, shouldShowTopHeader } from './components/App';
import type { View } from '@app/types';
// Story 15b-0b: Direct import from viewRenderers (not barrel) to break circular deps
import {
    renderDashboardView,
    renderTrendsView,
    renderHistoryView,
    renderItemsView,
    renderStatementScanView,
    renderReportsView,
    renderRecentScansView,
    renderInsightsView,
    renderAlertsView,
} from './components/App/viewRenderers';
// Story 15b-4f: All hook initialization composed into single orchestrator
import { useAppDataHooks } from './app/hooks';
import { CategoriesFeature } from '@features/categories';
import { Toast } from '@/shared/ui';
// App-level handler hooks
import { useTransactionHandlers, useScanHandlers, useDialogHandlers } from './hooks/app';
import { AppProviders } from '@app/AppProviders';
import { DIALOG_TYPES } from '@shared/types/scanWorkflow';
import { LoginScreen } from './views/LoginScreen';
import { BatchCaptureView } from './views/BatchCaptureView';
import { SettingsView } from './views/SettingsView';
import { TransactionEditorView } from './views/TransactionEditorView';
import { Nav, ScanStatus } from './components/Nav';
import { TopHeader } from './components/TopHeader';
import { type SessionAction } from './components/session';
import { BatchUploadPreview, BatchProcessingOverlay } from '@features/scan/components';
import { NavigationBlocker } from './components/NavigationBlocker';
import { PWAUpdatePrompt } from './components/PWAUpdatePrompt';
import { PROCESSING_TIMEOUT_MS, useScanStore } from '@features/scan/store';
import {
    hasActiveTransactionConflict as hasActiveTransactionConflictUtil,
    processScan as processScanHandler,
    useScanInitiation,
} from '@features/scan';
import type { ScanInitiationProps } from '@features/scan';
import { usePendingScan, useScanLock } from '@features/scan/hooks';
import { useScanEventSubscription } from '@features/transaction-editor/hooks/useScanEventSubscription';
import { collection, query, where, getDocs, doc as firestoreDoc, deleteDoc } from 'firebase/firestore';
import type { ScanResult } from '@features/scan/handlers/processScan/types';
import type { FirestorePendingScan } from '@/types/pendingScan';
import type { TrustPromptEligibility } from './types/trust';
import { analyticsActions } from '@features/analytics/stores/useAnalyticsStore';
import { getQuarterFromMonth } from '@features/analytics/utils/analyticsHelpers';
import type { HistoryFilterState, TemporalFilterState } from '@/types/historyFilters';
import type { HistoryNavigationPayload } from '@features/analytics/utils/analyticsToHistoryFilters';
import { analyzeReceipt } from './services/gemini';
import { addTransaction as firestoreAddTransaction } from './services/firestore';
import {
    generateInsightForTransaction,
    silenceInsights,
    clearSilence,
    isInsightsSilenced,
    getLastWeekTotal,
    setLocalCache,
} from '@features/insights/services/insightEngineService';
import type { Transaction } from './types/transaction';
import {
    loadPersistedScanState,
    savePersistedScanState,
    clearPersistedScanState,
    clearLegacyBatchStorage,
} from './services/pendingScanStorage';
import { formatCurrency, DEFAULT_CURRENCY } from './utils/currency';
import { formatDate } from './utils/date';
import {
    expandStoreCategoryGroup,
    expandItemCategoryGroup,
    type StoreCategoryGroup,
    type ItemCategoryGroup,
} from './config/categoryColors';
import { applyCategoryMappings } from './utils/categoryMatcher';
import { classifyError, getErrorInfo } from './utils/errorHandler';
import { incrementMappingUsage } from './services/categoryMappingService';
import { incrementMerchantMappingUsage } from './services/merchantMappingService';
import { incrementItemNameMappingUsage } from './services/itemNameMappingService';
import { getCitiesForCountry } from './data/locations';
import {
    BatchReviewFeature,
    batchReviewActions,
    useBatchReviewHandlers,
} from '@features/batch-review';
import type { BatchReviewHandlersProps } from '@features/batch-review';
import { createBatchReceiptsFromResults } from './hooks/useBatchReview';
// Story 14e-21: FeatureOrchestrator - centralized feature composition
import { FeatureOrchestrator } from '@app/FeatureOrchestrator';
// Story 14e-41: reconcileItemsTotal moved to entity (single source of truth)
import { reconcileItemsTotal } from '@entities/transaction';
// Story 16-6: Workflow store for fields moved out of scan store
import { useWorkflowState, getWorkflowState } from '@shared/stores';
import type { ScanState } from '@shared/types/scanWorkflow';

function App() {
    // Story 15b-4f: All hook initialization composed into useAppDataHooks
    const { userContext, txData, mappingSystem, scans, viewHandlers } = useAppDataHooks();

    // Destructure userContext
    const {
        user, services, initError, signIn, signInWithTestCredentials, signOut,
        userPreferences, userCredits, deductUserCredits, deductUserSuperCredits,
        addUserCredits, addUserSuperCredits,
        recordToCelebrate, showRecordBanner, checkForRecords, dismissRecord,
        inAppNotifications, inAppNotificationsUnreadCount,
        markNotificationAsRead, markAllNotificationsAsRead,
        deleteInAppNotification, deleteAllInAppNotifications,
        prefersReducedMotion, db,
    } = userContext;

    // Destructure txData
    const { transactions, transactionsWithRecentScans } = txData;

    // Destructure mappingSystem
    const {
        mappings, findMerchantMatch, findItemNameMatch,
        insightProfile, insightCache, recordInsightShown,
        trackTransactionForInsight, incrementInsightCounter,
    } = mappingSystem;

    // Destructure scans
    const {
        scanState,
        startBatchScanContext, startStatementScanContext,
        dispatchBatchItemStart, dispatchBatchItemSuccess, dispatchBatchItemError, dispatchBatchComplete,
        setBatchEditingIndexContext, showScanDialog, dismissScanDialog, setScanContextImages,
        dispatchProcessStart, dispatchProcessSuccess,
        resetScanContext, restoreScanState, setSkipScanCompleteModal, setIsRescanning,
        isBatchModeFromContext, hasBatchReceipts,
        scanImages, setScanImages, setScanError, scanStoreType, setScanStoreType,
        scanCurrency, setScanCurrency, skipScanCompleteModal, isRescanning,
        scanOverlay, batchProcessing,
        batchSession, addToBatch, clearBatch,
        recordMerchantScan, checkTrusted, acceptTrust, declinePrompt,
    } = scans;

    // Story 16-6: Read workflow fields (images, batchReceipts, batchProgress, batchEditingIndex)
    // from the shared workflow store. Merge with scanState to create ScanState-compatible object
    // for consumers that still expect the full ScanState type.
    const workflowState = useWorkflowState();
    const scanStateComplete: ScanState = useMemo(() => ({
        ...scanState,
        images: workflowState.images,
        batchReceipts: workflowState.batchReceipts,
        batchProgress: workflowState.batchProgress,
        batchEditingIndex: workflowState.batchEditingIndex,
    }), [scanState, workflowState]);

    // Destructure viewHandlers
    const {
        view, settingsSubview, pendingHistoryFilters, pendingDistributionView, analyticsInitialState,
        setView, setSettingsSubview, saveScrollPosition,
        setPendingHistoryFilters, setPendingDistributionView,
        setAnalyticsInitialState, clearAnalyticsInitialState,
        currentTransaction, transactionNavigationList, isViewingReadOnly, creditUsedInSession,
        isTransactionSaving, animateEditViewItems, transactionEditorMode,
        setCurrentTransaction, setTransactionNavigationList, setIsViewingReadOnly,
        setCreditUsedInSession, setAnimateEditViewItems, setTransactionEditorMode,
        currentInsight, showInsightCard, showSessionComplete, sessionContext, showBatchSummary,
        hideInsight, showSessionCompleteOverlay, hideSessionCompleteOverlay,
        hideBatchSummaryOverlay,
        setCurrentInsight, setShowInsightCard, setShowBatchSummary, setSessionContext,
        showBatchPreview, setShowBatchPreview, isQuickSaving, setIsQuickSaving,
        trustActionsRef, creditActionsRef,
        lang, currency, dateFormat, theme, colorTheme, fontSize, fontFamily,
        defaultCountry, defaultCity,
        toastMessage, showToast, setToastMessage,
        fileInputRef, handleFileInputReady,
        t, openModalAction, closeModalAction, createDefaultTransaction,
    } = viewHandlers;

    const mainRef = useRef<HTMLDivElement>(null);

    // TD-18-4: Ref to hold processScan for retry handler (defined later at line ~695)
    const processScanRef = useRef<((images?: string[]) => Promise<void>) | null>(null);

    // Batch delete wrapper: surfaces partial-failure via toast (Story 15-TD-12)
    const handleDeleteAllInAppNotifications = useCallback(async () => {
        const result = await deleteAllInAppNotifications();
        if (result && result.failedBatches > 0) {
            showToast(t('batchPartialFailure'), 'warning');
        }
        return result;
    }, [deleteAllInAppNotifications, showToast, t]);

    // Transaction handlers (save, delete, wipe, export)
    const {
        saveTransaction,
        deleteTransaction,
        wipeDB,
        handleExportData,
    } = useTransactionHandlers({
        user,
        services,
        userPreferences,
        transactions,
        currency,
        // Insight generation
        insightProfile,
        insightCache,
        recordInsightShown,
        trackTransactionForInsight,
        incrementInsightCounter,
        // Batch session - adapt type (hook only uses receipts.length for batch mode detection)
        batchSession: batchSession ? { receipts: batchSession.receipts as any } : null,
        addToBatch,  // Both hook and useBatchSession use (tx, insight) signature
        // UI callbacks
        setToastMessage,
        setCurrentTransaction,
        setView,
        setCurrentInsight,
        setShowInsightCard,
        setShowBatchSummary,
        setSessionContext,
        // ScanContext integration
        setScanImages,
        // Batch editing context (for returning to batch-review after save)
        batchEditingIndex: workflowState.batchEditingIndex,
        clearBatchEditingIndex: () => setBatchEditingIndexContext(null),
        // Batch receipts (for discarding after save)
        batchReceipts: workflowState.batchReceipts,
        // Story 14e-34b: discardBatchReceipt removed - now using atomicBatchActions internally
        // Translation
        t,
    });

    // ==========================================================================
    // Story 14e-25a.1 (V1 fix): Navigation handlers moved from useNavigationHandlers to local wrappers
    // These use the navigation store actions + scroll/dialog handling
    // ==========================================================================

    // Filter clearing effects (from useNavigationHandlers)
    // Story 14.13: Clear filters when navigating away from history/insights/transaction-editor views
    useEffect(() => {
        if (
            view !== 'insights' &&
            view !== 'history' &&
            view !== 'items' &&
            view !== 'transaction-editor' &&
            pendingHistoryFilters
        ) {
            setPendingHistoryFilters(null);
        }
    }, [view, pendingHistoryFilters, setPendingHistoryFilters]);

    // Story 10a.2: Clear analytics initial state when navigating AWAY from trends view
    useEffect(() => {
        if (view !== 'trends' && analyticsInitialState) {
            clearAnalyticsInitialState();
        }
    }, [view, analyticsInitialState, clearAnalyticsInitialState]);

    // Story 15b-3f: Initialize analytics store when analyticsInitialState changes
    useEffect(() => {
        if (view === 'trends' && analyticsInitialState) {
            analyticsActions.initialize(analyticsInitialState);
        }
    }, [view, analyticsInitialState]);

    // Story 14.13 Session 7: Clear pending distribution view when navigating AWAY from trends
    useEffect(() => {
        if (
            view !== 'trends' &&
            view !== 'history' &&
            view !== 'items' &&
            view !== 'transaction-editor' &&
            pendingDistributionView
        ) {
            setPendingDistributionView(null);
        }
    }, [view, pendingDistributionView, setPendingDistributionView]);

    /**
     * Navigate to a view with scroll position management and filter clearing.
     * Story 14e-25a.1 (V1/V3 fix): Uses navigation store + mainRef for scrolling
     */
    const navigateToView = useCallback((targetView: View) => {
        // Save current scroll position using store (V3 fix)
        if (mainRef.current) {
            saveScrollPosition(view, mainRef.current.scrollTop);
        }

        // Story 14.13b: Clear filters when navigating to history/items from outside
        const isFromRelatedView =
            view === 'history' ||
            view === 'items' ||
            view === 'transaction-editor' ||
            view === 'trends' ||
            view === 'insights' ||
            view === 'dashboard';
        const isToHistoryOrItems = targetView === 'history' || targetView === 'items';
        if (isToHistoryOrItems && !isFromRelatedView) {
            setPendingHistoryFilters(null);
        }

        // Navigate using store (tracks previousView automatically)
        setView(targetView);

        // Story 14.24: Hide QuickSaveCard when navigating to a different view
        if (targetView !== 'transaction-editor' && targetView !== 'scan-result') {
            if (scanState.activeDialog?.type === DIALOG_TYPES.QUICKSAVE) {
                dismissScanDialog();
            }
        }

        // Reset scroll to top for the new view
        setTimeout(() => {
            if (mainRef.current) {
                mainRef.current.scrollTo(0, 0);
            }
        }, 0);
    }, [
        view,
        setView,
        mainRef,
        saveScrollPosition,
        setPendingHistoryFilters,
        scanState.activeDialog,
        dismissScanDialog,
    ]);

    // Story 14e-28: navigateBack removed - now in useTransactionEditorHandlers hook (uses navigation store)

    /**
     * Navigate from Analytics to History/Items with pre-applied filters.
     * Story 14e-25a.1 (V1 fix): Moved from useNavigationHandlers
     */
    const handleNavigateToHistory = useCallback((payload: HistoryNavigationPayload) => {
        // Build category filter based on payload
        let categoryFilter: HistoryFilterState['category'] = { level: 'all' };
        if (payload.category) {
            categoryFilter = { level: 'category', category: payload.category };
        } else if (payload.storeGroup) {
            const storeCategories = expandStoreCategoryGroup(payload.storeGroup as StoreCategoryGroup);
            categoryFilter = { level: 'category', category: storeCategories.join(',') };
        } else if (payload.itemGroup) {
            const itemCategories = expandItemCategoryGroup(payload.itemGroup as ItemCategoryGroup);
            categoryFilter = { level: 'group', group: itemCategories.join(',') };
        } else if (payload.itemCategory) {
            categoryFilter = { level: 'group', group: payload.itemCategory };
        }

        // Story 14.13a: Include drillDownPath for multi-dimension filtering
        if (payload.drillDownPath) {
            categoryFilter.drillDownPath = payload.drillDownPath;
        }

        const filterState: HistoryFilterState = {
            temporal: payload.temporal
                ? { ...payload.temporal, level: payload.temporal.level as TemporalFilterState['level'] }
                : { level: 'all' },
            category: categoryFilter,
            location: {},
        };

        // Store filters and navigate
        setPendingHistoryFilters(filterState);
        if (payload.sourceDistributionView) {
            setPendingDistributionView(payload.sourceDistributionView);
        }

        const targetView = payload.targetView || 'history';
        navigateToView(targetView);
    }, [navigateToView, setPendingHistoryFilters, setPendingDistributionView]);

    // Dialog handlers (conflict dialog uses Modal Manager)
    useDialogHandlers({
        scanState: scanStateComplete,
        setCurrentTransaction,
        resetScanState: resetScanContext,
        clearBatchImages: useCallback(() => setScanContextImages([]), [setScanContextImages]),
        createDefaultTransaction,
        setTransactionEditorMode,
        navigateToView,
        t,
        lang,
        formatCurrency,
    });


    // Scan handlers (overlay, quick save, currency/total mismatch)
    const {
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
    } = useScanHandlers({
        user,
        services,
        userPreferences,
        transactions,
        currency,
        lang,
        currentTransaction,
        // Insight generation
        insightProfile,
        insightCache,
        recordInsightShown,
        trackTransactionForInsight,
        incrementInsightCounter,
        // Batch session
        batchSession,
        addToBatch,
        // Trusted merchants
        checkTrusted,
        recordMerchantScan,
        // Item name mapping
        findItemNameMatch,
        categoryMappings: mappings,
        findMerchantMatch,
        applyCategoryMappings,
        incrementMappingUsage,
        incrementMerchantMappingUsage,
        incrementItemNameMappingUsage,
        // ScanContext actions
        showScanDialog,
        dismissScanDialog,
        dispatchProcessSuccess,
        resetScanContext,
        setScanImages,
        // Scan overlay
        scanOverlay,
        // UI callbacks
        setToastMessage,
        setCurrentTransaction,
        setView,
        navigateToView,
        setCurrentInsight,
        setShowInsightCard,
        setShowBatchSummary,
        setSessionContext,
        setAnimateEditViewItems,
        setSkipScanCompleteModal,
        setTransactionEditorMode,
        setIsQuickSaving,
        isQuickSaving,
        // Story 14e-39: Trust prompt - wrapper functions that call CreditFeature actions via ref
        setTrustPromptData: (data: TrustPromptEligibility | null) => {
            if (data) {
                trustActionsRef.current?.showTrustPromptAction(data);
            }
        },
        setShowTrustPrompt: (show: boolean) => {
            if (!show) {
                trustActionsRef.current?.hideTrustPrompt();
            }
            // When show=true, the data is set via setTrustPromptData which calls showTrustPromptAction
        },
        // Translation
        t,
        // TD-18-4: Retry support — ref indirection because processScan is defined later
        processScan: (images?: string[]) => processScanRef.current?.(images) ?? Promise.resolve(),
        userCreditsRemaining: userCredits.remaining,
    });

    // Story 14e-20a: Toast auto-dismiss is now handled by useToast hook

    // Story 14e-25d: Handler bundles removed - views now use direct hooks:
    // - Navigation: useNavigationActions() from @/shared/stores
    // - Toast: useToast() from @/shared/hooks
    // - Modals: useModalActions() from @/managers/ModalManager
    // - History navigation: useHistoryNavigation() from @/shared/hooks

    // Check for personal records after transactions change
    useEffect(() => {
        if (transactions.length > 0 && user?.uid) {
            checkForRecords(transactions);
        }
    }, [transactions, user?.uid, checkForRecords]);

    // Story 14e-20b: Settings persistence moved to useSettingsStore (Zustand persist middleware)

    // Load persisted scan state on user login (handles both single and batch modes)
    useEffect(() => {
        if (user?.uid) {
            const storedState = loadPersistedScanState(user.uid);
            if (storedState) {
                // Interrupted scans can't be recovered - show toast and clear storage
                if (storedState.phase === 'scanning') {
                    const message = storedState.mode === 'batch'
                        ? 'Procesamiento de lote interrumpido. Los créditos ya se usaron.'
                        : 'Escaneo interrumpido. Intenta de nuevo.';
                    setToastMessage({ text: message, type: 'info' });
                    clearPersistedScanState(user.uid);
                    return;
                }

                // Stale scan state (>1h old) — clear instead of restoring
                if (storedState.startedAt && Date.now() - storedState.startedAt > 60 * 60 * 1000) {
                    clearPersistedScanState(user.uid);
                    return;
                }

                // Clear any persisted dialog state — dialogs should not survive app restart
                if (storedState.activeDialog) {
                    storedState.activeDialog = null;
                }

                // Error state with no content - just show toast and clear
                if (storedState.phase === 'error' && storedState.images.length === 0 && storedState.results.length === 0) {
                    if (storedState.error) {
                        setToastMessage({ text: storedState.error, type: 'info' });
                    }
                    clearPersistedScanState(user.uid);
                    return;
                }

                restoreScanState(storedState);

                // Batch mode restoration
                // Story 14e-34a: setBatchImages removed - images already restored via restoreScanState
                if (storedState.mode === 'batch') {
                    if (storedState.phase === 'reviewing' && (storedState.results.length > 0 || storedState.batchReceipts)) {
                        setView('batch-review');
                    } else if (storedState.phase === 'capturing' && storedState.images.length > 0) {
                        setView('batch-capture');
                    }
                    return;
                }

                // Single mode restoration
                if (storedState.results.length > 0) {
                    setCurrentTransaction(storedState.results[0]);
                }

                // Navigate to appropriate view based on restored phase
                if (storedState.phase === 'reviewing' && storedState.results.length > 0) {
                    setView('scan-result');
                } else if (storedState.phase === 'capturing' && storedState.images.length > 0) {
                    setView('scan');
                } else if (storedState.phase === 'error' && (storedState.images.length > 0 || storedState.results.length > 0)) {
                    setView('scan');
                }
            }
        }
    }, [user?.uid, restoreScanState]);

    // Story 18-13b: Pending scan detection + resolution hooks
    /** Fallback deadline when processingDeadline is missing from Firestore doc (5 minutes) */
    const PENDING_SCAN_FALLBACK_DEADLINE_MS = 5 * 60 * 1000;
    const pendingScanId = useScanStore((s) => s.pendingScanId);

    const handlePendingScanCompleted = useCallback((result: ScanResult, imageUrls: string[]) => {
        // Feed result into processScan at Step 5 via asyncResult bypass
        processScanHandler({
            scan: {
                images: imageUrls,
                currency: userPreferences.defaultCurrency || DEFAULT_CURRENCY,
                storeType: 'auto',
                defaultCountry,
                defaultCity,
            },
            user: {
                userId: user?.uid || '',
                creditsRemaining: 999, // Bypass credit check — already deducted server-side
                defaultCurrency: userPreferences.defaultCurrency || DEFAULT_CURRENCY,
                transactions,
            },
            mapping: {
                mappings,
                applyCategoryMappings,
                findMerchantMatch,
                findItemNameMatch,
                incrementMappingUsage: (mappingId: string) => {
                    if (user && services) {
                        incrementMappingUsage(services.db, user.uid, services.appId, mappingId).catch(() => {});
                    }
                },
                incrementMerchantMappingUsage: (mappingId: string) => {
                    if (user && services) {
                        incrementMerchantMappingUsage(services.db, user.uid, services.appId, mappingId).catch(() => {});
                    }
                },
                incrementItemNameMappingUsage: (mappingId: string) => {
                    if (user && services) {
                        incrementItemNameMappingUsage(services.db, user.uid, services.appId, mappingId).catch(() => {});
                    }
                },
            },
            ui: { setToastMessage },
            scanOverlay,
            services: {
                analyzeReceipt,
                deductUserCredits: async () => true, // No-op — credit already deducted server-side
                addUserCredits: async () => {},
                getCitiesForCountry,
            },
            t,
            lang: lang as 'en' | 'es',
            asyncResult: result,
        });
    }, [user?.uid, userPreferences.defaultCurrency, defaultCountry, defaultCity, transactions, mappings, applyCategoryMappings, findMerchantMatch, findItemNameMatch, scanOverlay, t, lang, setToastMessage, getCitiesForCountry, services]);

    // Story 18-13b: Side-effect subscriptions — Firestore listeners update scan store state.
    // cancelPendingScan will be wired to ScanOverlay cancel button.
    // isLocked will be wired to Nav FAB disabled state.
    const { cancelPendingScan: _cancelPendingScan } = usePendingScan({
        scanId: pendingScanId,
        userId: user?.uid || '',
        onCompleted: handlePendingScanCompleted,
        t,
    });

    const { isLocked: isScanLocked } = useScanLock(user?.uid ?? null);

    // Listen for scan:completed events and set transaction in editor
    useScanEventSubscription();

    // Story 18-13b: Detect pending scans on app init (after auth)
    // Handles all states: processing → restore listener, completed → deliver result, failed → clean up
    useEffect(() => {
        if (!user?.uid) return;

        const detectPendingScans = async () => {
            if (!db) return;
            try {
                const q = query(
                    collection(db, 'pending_scans'),
                    where('userId', '==', user.uid)
                );
                const snapshot = await getDocs(q);
                if (snapshot.empty) return;

                for (const pendingDoc of snapshot.docs) {
                    const data = pendingDoc.data() as FirestorePendingScan;

                    if (data.status === 'processing') {
                        const deadlineMs = data.processingDeadline?.toMillis?.() ?? Date.now() + PENDING_SCAN_FALLBACK_DEADLINE_MS;
                        if (deadlineMs > Date.now()) {
                            // Still processing — restore listener
                            useScanStore.getState().setPendingScan(pendingDoc.id, deadlineMs);
                        }
                        // Past deadline — cleanupPendingScans CF will handle
                    } else if (data.status === 'completed' && data.result) {
                        // Completed result not yet consumed — deliver it now
                        const scanResult: ScanResult = {
                            merchant: data.result.merchant,
                            date: data.result.date,
                            total: data.result.total,
                            category: data.result.category,
                            items: (data.result.items || []).map((item: Record<string, unknown>) => ({
                                name: item.name as string,
                                totalPrice: item.totalPrice as number,
                                unitPrice: item.unitPrice as number | undefined,
                                qty: item.qty as number | undefined,
                                category: item.category as string | undefined,
                                subcategory: item.subcategory as string | undefined,
                            })),
                            imageUrls: data.result.imageUrls || data.imageUrls,
                            thumbnailUrl: data.result.thumbnailUrl,
                            currency: data.result.currency,
                            country: data.result.country,
                            city: data.result.city,
                            receiptType: data.result.receiptType,
                            promptVersion: data.result.promptVersion,
                            merchantSource: data.result.merchantSource,
                        };
                        handlePendingScanCompleted(scanResult, data.imageUrls);
                        // Delete consumed doc
                        await deleteDoc(firestoreDoc(db, 'pending_scans', pendingDoc.id));
                        break; // Process one at a time
                    } else if (data.status === 'failed') {
                        // Failed — delete silently (credit already refunded server-side)
                        await deleteDoc(firestoreDoc(db, 'pending_scans', pendingDoc.id));
                    }
                }
            } catch (error) {
                console.error('Failed to detect pending scans:', error);
            }
        };

        detectPendingScans();
    }, [user?.uid, handlePendingScanCompleted]);

    // Persist scan state to storage (primary persistence mechanism)
    const scanStateInitializedRef = useRef(false);
    useEffect(() => {
        if (!user?.uid) return;

        // Skip first run to let load effect run first
        if (!scanStateInitializedRef.current) {
            scanStateInitializedRef.current = true;
            return;
        }

        const hasContent = scanState.phase !== 'idle' &&
            (workflowState.images.length > 0 || scanState.results.length > 0 || workflowState.batchReceipts !== null);

        if (hasContent) {
            savePersistedScanState(user.uid, scanStateComplete);
            clearLegacyBatchStorage(user.uid);
        } else if (scanState.phase === 'idle') {
            clearPersistedScanState(user.uid);
            clearLegacyBatchStorage(user.uid);
        }
    }, [user?.uid, scanState, scanStateComplete, workflowState]);

    // Navigation guard - warn before closing with active transaction
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            const wfState = getWorkflowState();
            const hasActiveContent = scanState.phase !== 'idle' && (
                scanState.phase === 'scanning' ||
                scanState.results.length > 0 ||
                wfState.images.length > 0 ||
                wfState.batchReceipts !== null
            );

            if (hasActiveContent) {
                // Standard way to trigger browser's "Leave site?" dialog
                e.preventDefault();
                // Chrome requires returnValue to be set
                e.returnValue = '';
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [scanState]);

    // Sync scanCurrency with user's default preference when it loads
    useEffect(() => {
        if (userPreferences.defaultCurrency) {
            setScanCurrency(userPreferences.defaultCurrency);
        }
    }, [userPreferences.defaultCurrency]);

    // Story 14e-30: handleNewTransaction moved to useScanInitiation hook
    // Now available as scanInitiationHandlers.handleNewTransaction

    // Story 14e-40: Wrapper for extracted conflict detection utility
    // Check if there's an active transaction that would conflict with a new action
    const hasActiveTransactionConflict = useCallback(() => {
        return hasActiveTransactionConflictUtil(scanStateComplete, view);
    }, [scanStateComplete, view]);

    // Navigate to transaction editor with conflict detection
    // If scan is active, auto-navigate to scan view instead of showing dialog
    const navigateToTransactionEditor = (mode: 'new' | 'existing', transaction?: Transaction | null) => {
        const conflictCheck = hasActiveTransactionConflict();
        const isEditingSameTransaction = mode === 'existing' && transaction?.id &&
            scanState.results.length > 0 && scanState.results[0]?.id === transaction.id;

        if (conflictCheck.hasConflict && !isEditingSameTransaction) {
            // Auto-navigate to the active scan view - no dialog
            // Batch mode: go to batch-review
            // Single scan: go to transaction-editor (with the scanned transaction)
            if (scanState.mode === 'batch') {
                navigateToView('batch-review');
            } else {
                // Single scan - navigate to the scanned transaction
                if (scanState.results.length > 0) {
                    setCurrentTransaction(scanState.results[0]);
                }
                setTransactionEditorMode('new');
                navigateToView('transaction-editor');
            }
            return;
        }

        // No conflict, proceed with navigation
        setIsViewingReadOnly(false);
        setCreditUsedInSession(false);
        setTransactionEditorMode(mode);
        if (transaction) {
            setCurrentTransaction(transaction as any);
        } else if (mode === 'new') {
            setCurrentTransaction(createDefaultTransaction());
        }
        navigateToView('transaction-editor');
    };

    // Navigate to read-only transaction view (from HistoryView clicks)
    // Optional allTransactionIds enables multi-transaction navigation from ItemsView
    // If scan is active, auto-navigate to scan view instead
    const navigateToTransactionDetail = (transaction: Transaction, allTransactionIds?: string[]) => {
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
            return;
        }

        // No conflict, proceed with read-only view
        setIsViewingReadOnly(true);
        setCreditUsedInSession(false);
        setTransactionEditorMode('existing');
        setCurrentTransaction(transaction);
        setTransactionNavigationList(allTransactionIds && allTransactionIds.length > 1 ? allTransactionIds : null);
        navigateToView('transaction-editor');
    };

    // Story 14e-28: handleRequestEditFromReadOnly removed - now in useTransactionEditorHandlers hook

    // Story 14e-30: handleFileSelect moved to useScanInitiation hook

    /**
     * v9.7.0: Apply learned item name mappings to transaction items
     * Only applies when there's a merchant match (item mappings are scoped per-store).
     /**
     * processScan - Wrapper that calls the extracted processScan handler.
     * Story 14e-8c: Extract processScan Handler
     * Story 14e-43: Simplified - UI callbacks now use Zustand stores directly
     *
     * Collects all dependencies from App.tsx scope and passes them to the
     * extracted handler in src/features/scan/handlers/processScan/processScan.ts.
     *
     * The handler now accesses these stores directly (no callback injection needed):
     * - scanActions: processStart/Success/Error, showDialog, setImages, setSkipScanCompleteModal
     * - transactionEditorActions: setTransaction, setAnimateItems, setCreditUsed
     * - navigationActions: setView
     * - insightActions: showInsight, showBatchSummaryOverlay
     *
     * @param imagesToProcess - Optional images to process (avoids stale closure)
     */
    const processScan = useCallback(async (imagesToProcess?: string[]) => {
        // Collect images (parameter takes precedence to avoid stale closure)
        const images = imagesToProcess ?? scanImages;

        // Story 14e-43: Simplified call - most UI callbacks removed (now use stores directly)
        await processScanHandler({
            scan: {
                images,
                currency: scanCurrency,
                storeType: scanStoreType,
                defaultCountry,
                defaultCity,
            },
            user: {
                userId: user?.uid || '',
                creditsRemaining: userCredits.remaining,
                defaultCurrency: userPreferences.defaultCurrency || DEFAULT_CURRENCY,
                transactions,
            },
            mapping: {
                mappings,
                applyCategoryMappings,
                findMerchantMatch,
                findItemNameMatch, // Story 14e-42: Pure utility uses DI
                incrementMappingUsage: (mappingId: string) => {
                    if (user && services) {
                        incrementMappingUsage(services.db, user.uid, services.appId, mappingId)
                            .catch(err => console.error('Failed to increment mapping usage:', err));
                    }
                },
                incrementMerchantMappingUsage: (mappingId: string) => {
                    if (user && services) {
                        incrementMerchantMappingUsage(services.db, user.uid, services.appId, mappingId)
                            .catch(err => console.error('Failed to increment merchant mapping usage:', err));
                    }
                },
                incrementItemNameMappingUsage: (mappingId: string) => {
                    if (user && services) {
                        incrementItemNameMappingUsage(services.db, user.uid, services.appId, mappingId)
                            .catch(err => console.error('Failed to increment item name mapping usage:', err));
                    }
                },
            },
            // Story 14e-43: Only setToastMessage required - other callbacks now use stores directly
            ui: {
                setToastMessage,
            },
            scanOverlay,
            services: {
                analyzeReceipt, // Only used by handleRescan (separate path)
                deductUserCredits,
                addUserCredits,
                getCitiesForCountry,
            },
            t,
            lang,
            trustedAutoSave: {
                checkTrusted,
                saveTransaction: async (transaction: Transaction) => {
                    if (!services || !user) throw new Error('Services not available');
                    return firestoreAddTransaction(services.db, user.uid, services.appId, transaction);
                },
                generateInsight: async (transaction, history, profile, cache) => {
                    return generateInsightForTransaction(transaction, history, profile, cache);
                },
                addToBatch,
                recordMerchantScan,
                insightProfile: insightProfile || null,
                insightCache,
                isInsightsSilenced,
                batchSession,
                // Story 14e-43: onShowInsight/onShowBatchSummary removed - now use insightActions directly
            },
            prefersReducedMotion,
            processingTimeoutMs: PROCESSING_TIMEOUT_MS,
        });
    }, [
        scanImages,
        scanCurrency,
        scanStoreType,
        defaultCountry,
        defaultCity,
        user,
        services,
        userCredits.remaining,
        userPreferences.defaultCurrency,
        transactions,
        mappings,
        findMerchantMatch,
        // Story 14e-43: UI callback dependencies removed - stores are accessed directly
        setToastMessage,
        scanOverlay,
        deductUserCredits,
        addUserCredits,
        t,
        lang,
        checkTrusted,
        addToBatch,
        recordMerchantScan,
        insightProfile,
        insightCache,
        batchSession,
        prefersReducedMotion,
    ]);

    // TD-18-4: Update ref so retry handler can access processScan
    processScanRef.current = processScan;

    // Story 14e-30: handleRescan moved to useScanInitiation hook

    // ==========================================================================
    // Story 14e-29d: Batch Review Handlers Hook
    // ==========================================================================
    // Centralized batch handlers - used by BatchUploadPreview, CreditFeature, ScanFeature
    const batchHandlersConfig: BatchReviewHandlersProps = useMemo(() => ({
        // Core dependencies
        user,
        services,
        scanState: scanStateComplete,
        // State setters
        setBatchEditingIndexContext,
        setCurrentTransaction,
        setTransactionEditorMode,
        navigateToView,
        setView,
        // Story 14e-34a: setBatchImages removed - now uses useScanStore.setImages directly
        batchProcessing,
        resetScanContext,
        showScanDialog,
        dismissScanDialog,
        // Mapping functions
        mappings,
        applyCategoryMappings,
        findMerchantMatch,
        findItemNameMatch, // Story 14e-42: Pure utility uses DI
        // Credit check (handled by CreditFeature - optional props)
        userCredits,
        // Processing handler dependencies
        setShowBatchPreview,
        // Story 14e-39 (code review fix): Use ref-based wrapper instead of useState setter
        setShouldTriggerCreditCheck: () => {
            creditActionsRef.current?.triggerCreditCheck();
        },
        // Story 14e-34a: batchImages removed - now uses useScanStore.images directly
        scanCurrency,
        scanStoreType,
        batchProcessingExtended: batchProcessing,
        setScanImages,
        // Story 14e-39: Trust prompt clearing via CreditFeature actions ref
        clearTrustPrompt: () => {
            trustActionsRef.current?.hideTrustPrompt();
        },
    }), [
        user,
        services,
        scanStateComplete,
        setBatchEditingIndexContext,
        setCurrentTransaction,
        setTransactionEditorMode,
        navigateToView,
        setView,
        // Story 14e-34a: setBatchImages removed - now uses useScanStore.setImages
        batchProcessing,
        resetScanContext,
        showScanDialog,
        dismissScanDialog,
        mappings,
        applyCategoryMappings,
        findMerchantMatch,
        findItemNameMatch, // Story 14e-42: Pure utility uses DI
        userCredits,
        setShowBatchPreview,
        // Story 14e-39 (code review fix): setShouldTriggerCreditCheck removed - uses creditActionsRef
        // Story 14e-34a: batchImages removed - now uses useScanStore.images
        scanCurrency,
        scanStoreType,
        setScanImages,
    ]);

    const batchHandlers = useBatchReviewHandlers(batchHandlersConfig);

    // Story 14e-28b: TransactionEditorView now calls useTransactionEditorHandlers internally
    // Handler dependencies are passed via _testOverrides

    // Story 14e-29d: Batch handlers removed from App.tsx - now provided by useBatchReviewHandlers hook:
    // - handleCancelPreview, handleConfirmWithCreditCheck, handleProcessingStart
    // - handleCreditCheckComplete, handleReduceBatch
    // - handleDiscardConfirm, handleDiscardCancel, handleRemoveImage

    // ==========================================================================
    // Story 14e-30: Scan Initiation Handlers Hook
    // ==========================================================================
    const scanInitiationConfig: ScanInitiationProps = useMemo(() => ({
        // Core state
        scanState: scanStateComplete,
        hasBatchReceipts,
        scanImages,
        // Transaction state
        currentTransaction,
        createDefaultTransaction,
        // User preferences
        defaultCurrency: userPreferences.defaultCurrency || DEFAULT_CURRENCY,
        userCredits,
        lang: lang as 'en' | 'es',
        userId: user?.uid || '',
        // Actions
        setTransactionEditorMode,
        setCurrentTransaction,
        setScanImages,
        setScanError,
        setScanStoreType,
        setScanCurrency,
        // Story 14e-34a: setBatchImages removed - now uses useScanStore.setImages directly
        setShowBatchPreview,
        setToastMessage,
        setSkipScanCompleteModal,
        setCreditUsedInSession,
        setIsRescanning,
        deductUserCredits,
        addUserCredits,
        reconcileItemsTotal,
        t,
        // Refs
        fileInputRef,
    }), [
        scanStateComplete,
        hasBatchReceipts,
        scanImages,
        currentTransaction,
        createDefaultTransaction,
        userPreferences.defaultCurrency,
        userCredits,
        lang,
        user?.uid,
        setTransactionEditorMode,
        setCurrentTransaction,
        setScanImages,
        setScanError,
        setScanStoreType,
        setScanCurrency,
        // Story 14e-34a: setBatchImages removed
        setShowBatchPreview,
        setToastMessage,
        setSkipScanCompleteModal,
        setCreditUsedInSession,
        setIsRescanning,
        deductUserCredits,
        addUserCredits,
        reconcileItemsTotal,
        t,
        fileInputRef,
    ]);

    const scanInitiationHandlers = useScanInitiation(scanInitiationConfig);

    // Story 14e-30: Destructure handlers from scanInitiationHandlers for use in component
    const {
        handleNewTransaction,
        triggerScan,
        handleFileSelect,
        handleRescan,
        queueScanFromImages,
    } = scanInitiationHandlers;

    // Story 14e-39: Trust prompt handlers moved to CreditFeature
    // Callback for CreditFeature - called when user accepts trust
    const handleCreditFeatureAcceptTrust = useCallback(async (merchantName: string) => {
        await acceptTrust(merchantName);
        setToastMessage({ text: t('trustMerchantConfirm'), type: 'success' });
    }, [acceptTrust, setToastMessage, t]);

    // Callback for CreditFeature - called when user declines trust
    const handleCreditFeatureDeclineTrust = useCallback(async (merchantName: string) => {
        await declinePrompt(merchantName);
    }, [declinePrompt]);

    // Callback for CreditFeature - stores trust actions ref for useScanHandlers
    const handleTrustActionsReady = useCallback((actions: { showTrustPromptAction: (data: TrustPromptEligibility) => void; hideTrustPrompt: () => void }) => {
        trustActionsRef.current = actions;
    }, []);

    // Story 14e-39 (code review fix): Callback for CreditFeature - stores credit actions ref for useBatchReviewHandlers
    const handleCreditActionsReady = useCallback((actions: { triggerCreditCheck: () => void }) => {
        creditActionsRef.current = actions;
    }, []);

    // isDark needed for modal inline styles
    const isDark = theme === 'dark';

    // Scan status for Nav icon indicator ('processing' | 'ready' | 'idle')
    const scanStatus: ScanStatus = batchProcessing.isProcessing
        ? 'processing'
        : scanState.phase === 'scanning'
            ? 'processing'
            : hasBatchReceipts
                ? 'ready'
                : 'idle';

    // Synchronously update document.documentElement during render
    // This ensures CSS variables are available before children read them
    // Note: This is intentionally NOT in useEffect to avoid timing issues with useMemo
    if (typeof document !== 'undefined') {
        const html = document.documentElement;
        if (isDark) {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }
        if (colorTheme !== 'normal') {
            html.setAttribute('data-theme', colorTheme);
        } else {
            html.removeAttribute('data-theme');
        }
        html.setAttribute('data-font', fontFamily);
        if (fontSize === 'normal') {
            html.setAttribute('data-font-size', fontSize);
        } else {
            html.removeAttribute('data-font-size');
        }
    }

    // ==========================================================================
    // Computed values and composition hooks (MUST be before early returns for hooks)
    // ==========================================================================

    const activeTransactions = transactions;

    // ==========================================================================
    // View Props Composition (views own data via internal hooks)
    // ==========================================================================

    // TransactionEditorView _testOverrides provides App-level state coordination
    const transactionEditorOverrides = useMemo(() => ({
        // Data overrides (for useTransactionEditorData)
        currentTransaction,
        transactionEditorMode,
        isViewingReadOnly,
        transactionNavigationList,
        skipScanCompleteModal,
        isRescanning,
        isSaving: isTransactionSaving,
        animateItems: animateEditViewItems,
        creditUsedInSession,

        // Handler dependencies (for useTransactionEditorHandlers)
        // Story 14e-36c: Editor state/actions now from store, only external deps needed
        user,
        db,
        transactions,
        saveTransaction,
        deleteTransaction,
        processScan: queueScanFromImages,
        handleRescan,
        hasActiveTransactionConflict,
    }), [
        currentTransaction,
        transactionEditorMode,
        isViewingReadOnly,
        transactionNavigationList,
        skipScanCompleteModal,
        isRescanning,
        isTransactionSaving,
        animateEditViewItems,
        creditUsedInSession,
        user,
        db,
        transactions,
        saveTransaction,
        deleteTransaction,
        queueScanFromImages,
        handleRescan,
        hasActiveTransactionConflict,
    ]);

    // Story 14e-25b.2: DashboardView callbacks that need App-level state coordination
    // Data is now provided by useDashboardViewData hook inside DashboardView
    const dashboardCallbacks = useMemo(() => ({
        onViewTrends: (month: string | null) => {
            if (month) {
                const year = month.substring(0, 4);
                const quarter = getQuarterFromMonth(month);
                setAnalyticsInitialState({
                    temporal: {
                        level: 'month',
                        year,
                        quarter,
                        month,
                    },
                    category: { level: 'all' },
                    chartMode: 'aggregation',
                    drillDownMode: 'temporal',
                });
            } else {
                setAnalyticsInitialState(null);
            }
            setView('trends');
        },
        onEditTransaction: (transaction: any) => {
            navigateToTransactionDetail(transaction as Transaction);
        },
    }), [navigateToTransactionDetail, setView]);

    // Story 14e-25b.2: handleClearAllLearnedData removed - now handled by SettingsView directly

    // Story 14e-25c.1: useSettingsViewProps removed - SettingsView owns data via useSettingsViewData
    // Account action callbacks passed via _testOverrides for App-level state coordination

    // Story 14e-31: useItemsViewProps removed - ItemsView owns data via useItemsViewData
    // onEditTransaction callback passed via _testOverrides for App-level state coordination
    const handleItemsEditTransaction = useCallback((transactionId: string, allTransactionIds?: string[]) => {
        const tx = activeTransactions.find(t => t.id === transactionId);
        if (tx) {
            navigateToTransactionDetail(tx as Transaction, allTransactionIds);
        }
    }, [activeTransactions, navigateToTransactionDetail]);

    // =========================================================================
    // Early returns for loading/error states
    // These come AFTER hooks to satisfy React's rules of hooks
    // =========================================================================

    if (initError) {
        return <div className="p-10 text-center text-red-500 font-bold">Error: {initError}</div>;
    }

    if (!user) {
        return <LoginScreen onSignIn={signIn} onTestSignIn={signInWithTestCredentials} t={t} />;
    }

    return (
        // ScanProvider is in main.tsx - App uses useScan() directly
        <>
            {/* Story 14e-23b: App shell components - highest priority (z-60) */}
            <NavigationBlocker currentView={view} />
            <PWAUpdatePrompt language={lang} />

            {/* Non-scan overlays (insights, session, trust, batch summary, records)
              * Story 14e-23a: Scan overlays moved to ScanFeature (via FeatureOrchestrator)
              * Story 14e-23b: NavigationBlocker and PWAUpdatePrompt moved to App.tsx
              */}
            <AppOverlays
                // Core dependencies
                // Story 14e-23b: currentView and lang moved above (for NavigationBlocker/PWAUpdatePrompt)
                theme={theme as 'light' | 'dark'}
                t={t}
                // Story 14e-23a: Scan-related props removed (now in ScanFeature via FeatureOrchestrator)
                // Insight card props
                // Story 14e-37: Using store selectors
                showInsightCard={showInsightCard}
                currentInsight={currentInsight}
                onInsightDismiss={() => {
                    // Story 14e-37: Using store actions directly
                    hideInsight();
                    // Note: sessionContext remains in store, show session complete if context exists
                    if (sessionContext) {
                        showSessionCompleteOverlay(sessionContext);
                    }
                }}
                // Session complete props
                // Story 14e-37: Using store selectors
                showSessionComplete={showSessionComplete}
                sessionContext={sessionContext}
                onSessionCompleteDismiss={() => {
                    // Story 14e-37: Using store action (clears both flag and context)
                    hideSessionCompleteOverlay();
                }}
                onSessionCompleteAction={(action: SessionAction) => {
                    switch (action) {
                        case 'analytics':
                            setView('trends');
                            break;
                        case 'scan':
                            setView('dashboard');
                            break;
                        case 'history': {
                            const now = new Date();
                            const year = String(now.getFullYear());
                            const month = `${year}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                            handleNavigateToHistory({
                                temporal: {
                                    level: 'month',
                                    year,
                                    month,
                                },
                            });
                            break;
                        }
                    }
                }}
                // Personal record banner props
                showRecordBanner={showRecordBanner}
                recordToCelebrate={recordToCelebrate}
                onRecordDismiss={dismissRecord}
                // Batch summary props
                showBatchSummary={showBatchSummary}
                batchSession={batchSession}
                transactions={transactions}
                insightCache={insightCache}
                onBatchSummarySilence={() => {
                    const newCache = isInsightsSilenced(insightCache)
                        ? clearSilence(insightCache)
                        : silenceInsights(insightCache, 4);
                    setLocalCache(newCache);
                }}
                onBatchSummaryDismiss={() => {
                    // Story 14e-37: Using store action
                    hideBatchSummaryOverlay();
                    clearBatch();
                    setView('dashboard');
                }}
                // Story 14e-39: Trust merchant prompt props REMOVED - now managed by CreditFeature
                // Utility functions
                getLastWeekTotal={getLastWeekTotal}
                isInsightsSilenced={isInsightsSilenced}
            />
            {/* Story 14e-21: FeatureOrchestrator - centralized feature composition
              * Story 14e-23a: ScanFeature now handles all scan-related overlays
              * Composes ScanFeature, CreditFeature, and ModalManager.
              * Each feature handles its own visibility via internal Zustand store state.
              * BatchReviewFeature is rendered separately in view routing section (needs view context).
              */}
            <FeatureOrchestrator
                scanFeatureProps={{
                    // Core props
                    t,
                    theme: theme as 'light' | 'dark',
                    lang,
                    // Story 14e-23a fix: Pass current view for scan overlay visibility
                    // Single scan overlay should only show on scan-related views (matching batch mode)
                    currentView: view,
                    // Scan overlay handlers
                    onCancelProcessing: handleScanOverlayCancel,
                    onErrorDismiss: handleScanOverlayDismiss,
                    onRetry: handleScanOverlayRetry,
                    // Story 16-2: scanOverlay removed — reads from Zustand store
                    scanImages,
                    onScanOverlayCancel: handleScanOverlayCancel,
                    onScanOverlayRetry: handleScanOverlayRetry,
                    onScanOverlayDismiss: handleScanOverlayDismiss,
                    // Story 14e-23a: QuickSaveCard props (migrated from AppOverlays)
                    onQuickSave: handleQuickSave,
                    onQuickSaveEdit: handleQuickSaveEdit,
                    onQuickSaveCancel: handleQuickSaveCancel,
                    onQuickSaveComplete: handleQuickSaveComplete,
                    isQuickSaving,
                    currency,
                    formatCurrency,
                    userDefaultCountry: defaultCountry,
                    // Story 14e-23a: Currency/Total mismatch dialog props (migrated from AppOverlays)
                    userCurrency: userPreferences.defaultCurrency || DEFAULT_CURRENCY,
                    onCurrencyUseDetected: handleCurrencyUseDetected,
                    onCurrencyUseDefault: handleCurrencyUseDefault,
                    onCurrencyMismatchCancel: handleCurrencyMismatchCancel,
                    onTotalUseItemsSum: handleTotalUseItemsSum,
                    onTotalKeepOriginal: handleTotalKeepOriginal,
                    onTotalMismatchCancel: handleTotalMismatchCancel,
                    // Story 14e-23a: BatchCompleteModal props (migrated from AppOverlays)
                    userCreditsRemaining: userCredits.superRemaining ?? 0,
                    onBatchCompleteDismiss: dismissScanDialog,
                    onBatchCompleteNavigateToHistory: (payload) => {
                        dismissScanDialog();
                        handleNavigateToHistory(payload);
                    },
                    onBatchCompleteGoHome: () => {
                        dismissScanDialog();
                        setView('dashboard');
                    },
                    // Story 14e-23: BatchDiscardDialog props
                    // Story 14e-29d: Using batchHandlers from useBatchReviewHandlers hook
                    onBatchDiscardConfirm: batchHandlers.handleDiscardConfirm,
                    onBatchDiscardCancel: batchHandlers.handleDiscardCancel,
                    // Story 14e-30: File input props
                    onFileSelect: handleFileSelect,
                    onFileInputReady: handleFileInputReady,
                }}
                creditFeatureProps={{
                    user,
                    services,
                    // Story 14e-39 (code review fix): triggerCreditCheck prop REMOVED
                    // Credit check now triggered via onCreditActionsReady callback pattern
                    // Story 14e-29d: Using batchHandlers from useBatchReviewHandlers hook
                    onCreditCheckComplete: batchHandlers.handleCreditCheckComplete,
                    onBatchConfirmed: batchHandlers.handleProcessingStart,
                    onReduceBatch: batchHandlers.handleReduceBatch,
                    // Story 14e-34a / 16-6: Use workflow store (single source of truth)
                    batchImageCount: workflowState.images.length,
                    theme: theme as 'light' | 'dark',
                    t,
                    // Story 14e-39: Trust prompt callbacks
                    onAcceptTrust: handleCreditFeatureAcceptTrust,
                    onDeclineTrust: handleCreditFeatureDeclineTrust,
                    onTrustActionsReady: handleTrustActionsReady,
                    // Story 14e-39 (code review fix): Credit actions callback
                    onCreditActionsReady: handleCreditActionsReady,
                }}
            />

            {/* AppLayout provides app shell with theme classes */}
            <AppLayout theme={theme} colorTheme={colorTheme}>
            {/* Story 14e-30: File input moved to ScanFeature */}

            {/* Views that manage their own headers are excluded via shouldShowTopHeader() */}
            {shouldShowTopHeader(view) && (
                <TopHeader
                    variant={
                        view === 'settings' ? 'settings' :
                        'home'
                    }
                    viewTitle={
                        view === 'dashboard' ? 'gastify' :
                        undefined
                    }
                    title={undefined}
                    settingsSubview={
                        view === 'settings' && settingsSubview !== 'main'
                            ? t(`settings${settingsSubview.charAt(0).toUpperCase() + settingsSubview.slice(1)}Short`)
                            : undefined
                    }
                    onBack={
                        view === 'settings' ? () => {
                            if (settingsSubview !== 'main') {
                                setSettingsSubview('main');
                            } else {
                                setView('dashboard');
                            }
                        } :
                        undefined
                    }
                    onMenuClick={() => setView('settings')}
                    onNavigateToView={(targetView) => navigateToView(targetView as View)}
                    userName={user?.displayName || ''}
                    userEmail={user?.email || ''}
                    theme={theme}
                    t={t}
                    onLogoClick={() => {}}
                />
            )}

            {/* Main content area:
              * - Full-screen views (history, trends, reports, etc.) manage their own headers/padding
              * - Other views get default padding (p-3) with nav bar allowance (pb-24)
              * - ref enables scroll position management
              */}
            <main
                ref={mainRef}
                className={`flex-1 overflow-y-auto ${(view === 'reports' || view === 'history' || view === 'items' || view === 'trends' || view === 'scan-result' || view === 'edit' || view === 'transaction-editor' || view === 'batch-capture' || view === 'batch-review' || view === 'statement-scan' || view === 'recent-scans' || view === 'insights' || view === 'alerts') ? '' : 'p-3'}`}
                style={{
                    paddingBottom: (view === 'reports' || view === 'history' || view === 'items' || view === 'trends' || view === 'scan-result' || view === 'edit' || view === 'transaction-editor' || view === 'batch-capture' || view === 'batch-review' || view === 'statement-scan' || view === 'recent-scans' || view === 'insights' || view === 'alerts') ? '0' : 'calc(6rem + var(--safe-bottom, 0px))',
                    paddingTop: (view === 'history' || view === 'items' || view === 'reports' || view === 'trends' || view === 'scan-result' || view === 'edit' || view === 'transaction-editor' || view === 'batch-capture' || view === 'batch-review' || view === 'statement-scan' || view === 'recent-scans' || view === 'insights' || view === 'alerts')
                        ? '0'
                        : 'calc(5rem + env(safe-area-inset-top, 0px))'
                }}
            >
                {/* Story 14e-17b: CategoriesFeature provides category context to views.
                  * Views can use useCategoriesContext() to access category state.
                  */}
                <CategoriesFeature user={user} services={services}>
                {/* Story 15b-3g: AppProviders now only syncs fontFamily to Zustand.
                  * NotificationProvider removed (zero consumers).
                  */}
                <AppProviders
                    fontFamily={userPreferences?.fontFamily}
                >
                {view === 'dashboard' && renderDashboardView({
                    _testOverrides: dashboardCallbacks,
                })}

                {/* TransactionEditorView - Unified transaction editor */}
                {/* Story 14e-28b: TransactionEditorView now owns data via internal hooks */}
                {view === 'transaction-editor' && (
                    <TransactionEditorView
                        key={workflowState.batchEditingIndex !== null ? `batch-${workflowState.batchEditingIndex}` : 'single'}
                        _testOverrides={transactionEditorOverrides}
                    />
                )}

                {/* TrendsView with filters and analytics providers */}
                {/* Story 14e-25b.1: TrendsView now owns its data via useTrendsViewData hook */}
                {view === 'trends' && renderTrendsView({})}

                {/* InsightsView - insight history with inline header */}
                {/* Story 14e-25c.2: Minimal props - navigation via useNavigation() hook */}
                {view === 'insights' && renderInsightsView({
                    onEditTransaction: (transactionId: string) => {
                        const tx = transactions.find(t => t.id === transactionId);
                        if (tx) {
                            navigateToTransactionEditor('existing', tx);
                        }
                    },
                    theme,
                    t,
                })}

                {/* BatchCaptureView - batch mode from ScanContext */}
                {/* Story 14e-25c.2: Minimal props - navigation via useNavigation() hook */}
                {view === 'batch-capture' && (
                    <BatchCaptureView
                        onProcessBatch={async (images) => {
                            // Direct batch processing - no intermediate confirmation
                            // Story 14e-34a: Only use scan store (single source of truth)
                            setScanContextImages(images);

                            // Deduct super credit IMMEDIATELY to prevent exploits
                            // Credit is only restored if ALL API calls fail.
                            const deducted = await deductUserSuperCredits(1);
                            if (!deducted) {
                                setToastMessage({ text: t('noSuperCreditsMessage') || t('noCreditsMessage'), type: 'info' });
                                return;
                            }

                            // Navigate to batch-review to show processing progress
                            // Users can navigate away and return to see progress
                            setView('batch-review');

                            // Transition state machine to 'scanning' phase
                            dispatchProcessStart('super', 1);

                            // Start parallel processing with state machine callbacks
                            try {
                                const results = await batchProcessing.startProcessing(
                                    images,
                                    scanCurrency,
                                    scanStoreType !== 'auto' ? scanStoreType : undefined,
                                    {
                                        onItemStart: dispatchBatchItemStart,
                                        onItemSuccess: dispatchBatchItemSuccess,
                                        onItemError: dispatchBatchItemError,
                                        // Atomic state update with phase transition
                                        onComplete: (processingResults, imageUrls) => {
                                            const receipts = createBatchReceiptsFromResults(processingResults, imageUrls);
                                            // Story 14e-16: Load into both scan store (for legacy) and batch review store (for orchestrator)
                                            dispatchBatchComplete(receipts);
                                            batchReviewActions.loadBatch(receipts);
                                        },
                                    }
                                );

                                // Restore credit only if ALL API calls failed
                                const allFailed = results.every(r => !r.success);
                                if (allFailed) {
                                    await addUserSuperCredits(1);
                                    setToastMessage({ text: t('scanFailedCreditRefunded'), type: 'info' });
                                }

                                // batchReceipts set atomically in onComplete callback
                                // Persistence handled automatically via scanState save effect
                            } catch (e) {
                                // Restore credit on complete batch failure
                                console.error('Batch processing failed:', e);
                                await addUserSuperCredits(1);
                                const errorInfo = getErrorInfo(classifyError(e));
                                setToastMessage({ text: t('scanFailedCreditRefunded'), type: errorInfo.toastType });
                            }
                        }}
                        onSwitchToIndividual={() => {
                            // Reset context clears batch mode and persistence
                            resetScanContext();
                            // Story 14e-34a: Use scan store (single source of truth)
                            setScanContextImages([]); // Clear images when switching to individual
                            handleNewTransaction(false);
                        }}
                        theme={theme as 'light' | 'dark'}
                        t={t}
                        // Pass credits for header display and credit usage section
                        superCreditsAvailable={userCredits.superRemaining}
                        normalCreditsAvailable={userCredits.remaining}
                        // Story 14e-4: onCreditInfoClick removed - Nav uses Modal Manager directly
                        // Story 14e-34a / 16-6: Use workflow store (single source of truth)
                        imageDataUrls={workflowState.images}
                        onImagesChange={(dataUrls) => setScanContextImages(dataUrls)}
                    />
                )}

                {/* Story 14e-16: BatchReviewFeature orchestrator - phase-based rendering from Zustand store
                  * Story 14e-29c: Updated to use handlersConfig - feature owns handlers internally */}
                {view === 'batch-review' && (
                    <BatchReviewFeature
                        t={t}
                        theme={theme as 'light' | 'dark'}
                        currency={currency}
                        formatCurrency={formatCurrency}
                        credits={{
                            remaining: userCredits.remaining,
                            superRemaining: userCredits.superRemaining ?? 0,
                        }}
                        onCreditInfoClick={() => openModalAction('creditInfo', {
                            normalCredits: userCredits.remaining,
                            superCredits: userCredits.superRemaining ?? 0,
                            onClose: closeModalAction,
                        })}
                        processingStates={batchProcessing.states}
                        processingProgress={batchProcessing.progress}
                        onCancelProcessing={batchProcessing.cancel}
                        batchSession={batchSession ?? undefined}
                        handlersConfig={{
                            // Core dependencies
                            user,
                            services,
                            scanState: scanStateComplete,
                            // State setters
                            setBatchEditingIndexContext,
                            setCurrentTransaction,
                            setTransactionEditorMode,
                            navigateToView,
                            setView,
                            // Story 14e-34a: setBatchImages removed - now uses useScanStore.setImages directly
                            batchProcessing,
                            resetScanContext,
                            showScanDialog,
                            dismissScanDialog,
                            // Mapping functions
                            mappings,
                            applyCategoryMappings,
                            findMerchantMatch,
                            findItemNameMatch, // Story 14e-42: Pure utility uses DI
                            // Credit check functions (optional - handled by CreditFeature)
                            userCredits,
                            // checkCreditSufficiency, setCreditCheckResult, setShowCreditWarning
                            // are managed by CreditFeature - not passed here (Story 14e-29c)
                            // Processing handler dependencies (from Story 14e-29b)
                            setShowBatchPreview,
                            // Story 14e-39 (code review fix): Use ref-based wrapper instead of useState setter
                            setShouldTriggerCreditCheck: () => {
                                creditActionsRef.current?.triggerCreditCheck();
                            },
                            // Story 14e-34a: batchImages removed - now uses useScanStore.images directly
                            scanCurrency,
                            scanStoreType,
                            batchProcessingExtended: batchProcessing,
                            setScanImages,
                            // Story 14e-39: Trust prompt clearing via CreditFeature actions ref
                            clearTrustPrompt: () => {
                                trustActionsRef.current?.hideTrustPrompt();
                            },
                        }}
                        onRetryReceipt={(_receipt) => {
                            // Retry a failed receipt by re-processing
                            setToastMessage({ text: t('retryNotImplemented') || 'Retry not implemented', type: 'info' });
                        }}
                    />
                )}

                {/* Story 14e-25c.1: SettingsView now owns data via useSettingsViewData */}
                {view === 'settings' && (
                    <SettingsView
                        _testOverrides={{
                            onWipeDB: wipeDB,
                            onExportAll: handleExportData,
                            onSignOut: signOut,
                        }}
                    />
                )}
                {view === 'alerts' && renderAlertsView({
                    user,
                    navigateToView: (v: string) => navigateToView(v as View),
                    setView: (v: string) => setView(v as View),
                    t,
                    theme,
                    lang: lang as 'en' | 'es',
                    inAppNotifications,
                    markNotificationAsRead,
                    markAllNotificationsAsRead,
                    deleteInAppNotification,
                    deleteAllInAppNotifications: handleDeleteAllInAppNotifications,
                })}

                {/* Statement Scan Placeholder View */}
                {view === 'statement-scan' && renderStatementScanView({
                    theme,
                    t,
                    onBack: () => navigateToView('dashboard'),
                })}

                {/* Transaction History View - Story 14e-25a.2b: HistoryView now owns its data */}
                {view === 'history' && renderHistoryView({
                    initialState: pendingHistoryFilters || undefined,
                    onStateChange: setPendingHistoryFilters,
                    _testOverrides: {
                        onEditTransaction: (tx) => navigateToTransactionDetail(tx as Transaction),
                    },
                })}

                {/* Recent Scans View - latest scans sorted by scan date */}
                {view === 'recent-scans' && renderRecentScansView({
                    transactions: transactionsWithRecentScans as any,
                    theme,
                    currency,
                    dateFormat,
                    t,
                    formatCurrency,
                    formatDate: formatDate as any,
                    onBack: () => setView('dashboard'),
                    onEditTransaction: (tx) => navigateToTransactionDetail(tx as Transaction),
                    lang,
                    defaultCountry,
                    foreignLocationFormat: userPreferences.foreignLocationFormat,
                    userId: user?.uid,
                })}

                {/* Items History View - filtered navigation from analytics */}
                {/* Story 14e-31: ItemsView owns data via useItemsViewData, handler via _testOverrides */}
                {view === 'items' && renderItemsView({
                    initialState: pendingHistoryFilters || undefined,
                    onStateChange: setPendingHistoryFilters,
                    _testOverrides: {
                        onEditTransaction: handleItemsEditTransaction,
                    },
                })}

                {/* Weekly Reports View */}
                {/* Story 14e-25c.2: Minimal props - transactions via internal hooks, navigation via useNavigation() */}
                {view === 'reports' && renderReportsView({
                    theme,
                    t,
                })}
                </AppProviders>
                </CategoriesFeature>
            </main>

            <Nav
                view={view}
                setView={(v: string) => navigateToView(v as View)}
                onScanClick={() => {
                    // If in statement mode, return to statement view
                    if (scanState.mode === 'statement') {
                        navigateToView('statement-scan');
                        return;
                    }
                    // Check batch state first (in order of priority)
                    // 1. Batch processing in progress or results pending review
                    if (batchProcessing.isProcessing || hasBatchReceipts) {
                        navigateToView('batch-review');
                    }
                    // 2. Batch images captured but not yet processed - return to capture
                    // Story 14e-34a / 16-6: Use workflow store (single source of truth)
                    else if (workflowState.images.length > 0) {
                        if (!isBatchModeFromContext && user?.uid) {
                            startBatchScanContext(user.uid);
                        }
                        navigateToView('batch-capture');
                    }
                    // 3. Single-image scan in progress or complete - show transaction editor
                    else if (scanState.phase === 'scanning' || scanState.results.length > 0) {
                        navigateToView('transaction-editor');
                    }
                    // 4. No active scan - trigger new scan (blocked if scan in progress)
                    else if (isScanLocked) {
                        setToastMessage({ text: t('scanInProgress'), type: 'info' });
                    } else {
                        triggerScan();
                    }
                }}
                // Long-press on camera FAB - batch mode tracked via ScanContext
                onBatchClick={() => {
                    if (batchProcessing.isProcessing || hasBatchReceipts) {
                        // Batch processing or results pending - go to review
                        navigateToView('batch-review');
                    // Story 14e-34a / 16-6: Use workflow store (single source of truth)
                    } else if (workflowState.images.length > 0) {
                        // Batch images captured but not processed - return to capture
                        if (!isBatchModeFromContext && user?.uid) {
                            startBatchScanContext(user.uid);
                        }
                        navigateToView('batch-capture');
                    } else {
                        // No active batch - start new batch capture
                        // Story 14e-33 AC2: Clear previous batch session to prevent stale data
                        clearBatch();
                        // Story 14e-39: Clear any pending trust prompts via CreditFeature
                        trustActionsRef.current?.hideTrustPrompt();
                        if (user?.uid) {
                            startBatchScanContext(user.uid);
                        }
                        navigateToView('batch-capture');
                    }
                }}
                onTrendsClick={() => {
                    // Navigation state is managed by useAnalyticsStore (Zustand)
                    // Context resets to year level when mounted
                }}
                // Statement scan placeholder navigation
                onStatementClick={() => {
                    // Start statement scan in context and navigate to placeholder view
                    if (user?.uid) {
                        startStatementScanContext(user.uid);
                    }
                    navigateToView('statement-scan');
                }}
                theme={theme}
                t={t}
                scanStatus={scanStatus}
                // Display remaining scan credits on camera FAB
                scanCredits={userCredits.remaining}
                // Display super credits (tier 2) on camera FAB
                superCredits={userCredits.superRemaining}
                // Story 14e-4: onCreditInfoClick removed - Nav uses Modal Manager directly
                // Batch mode from ScanContext - tracks all phases (capturing, processing, reviewing)
                isBatchMode={isBatchModeFromContext || hasBatchReceipts}
                alertsBadgeCount={inAppNotificationsUnreadCount}
            />

            {/* Story 14e-23: Toast component (extracted from inline JSX) */}
            <Toast message={toastMessage} />

            {/* Story 14e-4: Credit Info Modal now rendered by ModalManager */}

            {/* Batch upload preview for multi-image selection with safe area padding */}
            {showBatchPreview && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
                    style={{ padding: 'calc(1rem + var(--safe-top, 0px)) calc(1rem + var(--safe-right, 0px)) calc(1rem + var(--safe-bottom, 0px)) calc(1rem + var(--safe-left, 0px))' }}
                >
                    {/* Story 14e-34a: BatchUploadPreview now reads images from useScanStore directly */}
                    <BatchUploadPreview
                        theme={theme as 'light' | 'dark'}
                        t={t}
                        onConfirm={batchHandlers.handleConfirmWithCreditCheck}
                        onCancel={batchHandlers.handleCancelPreview}
                        onRemoveImage={batchHandlers.handleRemoveImage}
                        credits={userCredits}
                        usesSuperCredits={true}
                    />
                </div>
            )}

            {/* Batch Processing Overlay - matches single scan UX */}
            <BatchProcessingOverlay
                visible={batchProcessing.isProcessing && (view === 'batch-capture' || view === 'batch-review')}
                theme={theme as 'light' | 'dark'}
                t={t}
                progress={batchProcessing.progress}
            />

            {/* Story 14e-23: BatchDiscardDialog now rendered by ScanFeature via FeatureOrchestrator */}

            </AppLayout>
        </>
    );
}

export default App;
