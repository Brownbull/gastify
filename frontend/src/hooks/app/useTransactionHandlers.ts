/**
 * Story 14c-refactor.20: useTransactionHandlers Hook
 *
 * Extracts transaction CRUD handlers from App.tsx into a reusable hook.
 * Handles save, update, delete, wipe, and export operations for transactions.
 *
 * Features:
 * - Transaction save with insight generation (async, fire-and-forget)
 * - Update with cascade (Firestore document update)
 * - Delete with cascade (Firestore document removal)
 * - Wipe all transactions with confirmation
 * - CSV export for data portability
 * - Default transaction factory
 *
 * Architecture Reference: Epic 14c-refactor - App.tsx Handler Extraction
 * Dependencies:
 * - AuthContext (user, services)
 * - useUserPreferences (location, currency defaults)
 * - React Query (cache invalidation)
 *
 * @example
 * ```tsx
 * function App() {
 *   const { saveTransaction, deleteTransaction, createDefaultTransaction } = useTransactionHandlers({
 *     user,
 *     services,
 *     userPreferences,
 *     setToastMessage,
 *     setCurrentTransaction,
 *     setView,
 *   });
 *
 *   return <TransactionEditor onSave={saveTransaction} onDelete={deleteTransaction} />;
 * }
 * ```
 */

import { useCallback, useMemo } from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { Transaction } from '../../types/transaction';
import type { UserPreferences } from '@/types/preferences';
import type { Insight, UserInsightProfile, LocalInsightCache } from '../../types/insight';
import type { View } from '@app/types';
import { createTransactionRepository } from '@/repositories/transactionRepository';
import {
    generateInsightForTransaction,
    isInsightsSilenced,
    getDefaultCache,
} from '@features/insights/services/insightEngineService';
import { parseStrictNumber, getSafeDate } from '../../utils/validation';
import { downloadBasicData } from '../../utils/csvExport';
import { DEFAULT_CURRENCY } from '../../utils/currency';
// Story 14e-16: Import batch review actions to sync removal when saving from edit mode
// Story 14e-34b: Import atomic batch actions for race condition prevention
import { batchReviewActions, atomicBatchActions } from '@features/batch-review';

// =============================================================================
// Types
// =============================================================================

import type { ToastMessage } from '@/shared/hooks';
import { classifyError, getErrorInfo } from '@/utils/errorHandler';
// TD-18-22: Copy pending scan images to permanent receipts path after save
import { copyPendingToReceipts } from '@features/scan';

/**
 * Session context for insight display
 * (Matches SessionContext from components/session)
 */
interface SessionContextData {
    transactionsSaved: number;
    consecutiveDays: number;
    isFirstOfWeek: boolean;
    isPersonalRecord: boolean;
    totalAmount: number;
    currency: string;
    categoriesTouched: string[];
}

/**
 * Batch session interface for tracking multi-receipt scans
 */
interface BatchSessionReceipt {
    transaction: Transaction;
    insight: Insight | null;
}

interface BatchSession {
    receipts: BatchSessionReceipt[];
}

/**
 * Props for useTransactionHandlers hook
 */
export interface UseTransactionHandlersProps {
    /** Authenticated user (null if not signed in) */
    user: User | null;
    /** Firebase services (db, appId) */
    services: { db: Firestore; appId: string } | null;
    /** User preferences for defaults */
    userPreferences: UserPreferences;
    /** All transactions for insight generation context */
    transactions: Transaction[];
    /** Currency for display and defaults */
    currency: string;

    // Insight generation dependencies
    /** User insight profile for contextual insights */
    insightProfile: UserInsightProfile | null;
    /** Insight cache for silence and history */
    insightCache: LocalInsightCache | null;
    /** Record insight shown in history */
    recordInsightShown: (
        insightId: string,
        transactionId: string,
        content: { title: string; message: string; icon: string; category: string }
    ) => Promise<void>;
    /** Track transaction for profile stats */
    trackTransactionForInsight: (date: Date) => Promise<void>;
    /** Increment insight counter for sprinkle distribution */
    incrementInsightCounter: () => void;

    // Batch session for multi-receipt flow
    /** Current batch session state */
    batchSession: BatchSession | null;
    /** Add transaction to batch session */
    addToBatch: (tx: Transaction, insight: Insight | null) => void;

    // UI callbacks
    /** Show toast notification */
    setToastMessage: (msg: ToastMessage | null) => void;
    /** Set current transaction for editing */
    setCurrentTransaction: (tx: Transaction | null) => void;
    /** Navigate to view */
    setView: (view: View) => void;
    /** Set insight for display */
    setCurrentInsight: (insight: Insight | null) => void;
    /** Show/hide insight card */
    setShowInsightCard: (show: boolean) => void;
    /** Show/hide batch summary */
    setShowBatchSummary: (show: boolean) => void;
    /** Set session context for completion messaging */
    setSessionContext: (ctx: SessionContextData | null) => void;

    // ScanContext integration
    /** Clear scan images (resets state machine) */
    setScanImages: (images: string[]) => void;

    // Batch editing context (for returning to batch-review after save)
    /** Current batch editing index (null if not editing batch) */
    batchEditingIndex: number | null;
    /** Clear batch editing index after save */
    clearBatchEditingIndex: () => void;
    /** Batch receipts array (to get receipt ID for discard after save) */
    batchReceipts: Array<{ id: string }> | null;
    // Story 14e-34b: Removed discardBatchReceipt prop - now using atomicBatchActions internally

    // Translation function
    /** Translation function for i18n */
    t: (key: string) => string;
}

/**
 * Result returned by useTransactionHandlers hook
 */
export interface UseTransactionHandlersResult {
    /**
     * Save a new or update existing transaction.
     * Handles insight generation, mapping usage, and shared group timestamps.
     * @param transactionOverride - Optional transaction to save (uses currentTransaction if not provided)
     */
    saveTransaction: (transactionOverride?: Transaction) => Promise<void>;

    /**
     * Delete a transaction by ID.
     * Updates shared group timestamps if applicable.
     * @param id - Transaction ID to delete
     */
    deleteTransaction: (id: string) => Promise<void>;

    /**
     * Wipe all transactions for the current user.
     * Shows confirmation dialog before proceeding.
     */
    wipeDB: () => Promise<void>;

    /**
     * Export all transactions to CSV file.
     * Shows error toast if no transactions exist.
     */
    handleExportData: () => Promise<void>;

    /**
     * Create a default transaction with user preferences.
     * Story 14d-v2-1.1: Group auto-assignment removed (Epic 14c cleanup).
     */
    createDefaultTransaction: () => Transaction;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to manage transaction CRUD operations.
 *
 * Extracts transaction handlers from App.tsx to reduce complexity and improve testability.
 * All handlers use fire-and-forget pattern for Firestore operations because offline
 * persistence means operations may not resolve until server confirms.
 *
 * @param props - Dependencies for transaction operations
 * @returns Transaction handlers and state
 */
export function useTransactionHandlers(
    props: UseTransactionHandlersProps
): UseTransactionHandlersResult {
    const {
        user,
        services,
        userPreferences,
        transactions,
        currency,
        insightProfile,
        insightCache,
        recordInsightShown,
        trackTransactionForInsight,
        incrementInsightCounter,
        batchSession,
        addToBatch,
        setToastMessage,
        setCurrentTransaction,
        setView,
        setCurrentInsight,
        setShowInsightCard,
        setShowBatchSummary,
        setSessionContext,
        setScanImages,
        batchEditingIndex,
        clearBatchEditingIndex,
        batchReceipts,
        // Story 14e-34b: discardBatchReceipt removed - now using atomicBatchActions internally
        t,
    } = props;

    // Story 15b-3a: DAL migration — repository replaces direct service imports
    const txRepo = useMemo(
        () => services && user ? createTransactionRepository({ db: services.db, userId: user.uid, appId: services.appId }) : null,
        [services, user]
    );

    /**
     * Create a default transaction with user preferences.
     * Story 14d-v2-1.1: Group auto-assignment removed (Epic 14c cleanup).
     */
    const createDefaultTransaction = useCallback((): Transaction => {
        const baseTransaction: Transaction = {
            merchant: '',
            date: getSafeDate(null),
            total: 0,
            category: 'Supermarket',
            items: [],
            country: userPreferences.defaultCountry || '',
            city: userPreferences.defaultCity || '',
            currency: userPreferences.defaultCurrency || DEFAULT_CURRENCY,
        };

        return baseTransaction;
    }, [
        userPreferences.defaultCountry,
        userPreferences.defaultCity,
        userPreferences.defaultCurrency,
    ]);

    /**
     * Save a new or update existing transaction.
     *
     * For new transactions:
     * - Applies category mappings
     * - Applies merchant mappings
     * - Generates insight (async, fire-and-forget)
     * - Tracks transaction for profile stats
     * - Updates shared group member timestamps
     *
     * For existing transactions:
     * - Updates Firestore document
     * - Updates shared group member timestamps
     */
    const saveTransaction = useCallback(async (transactionOverride?: Transaction) => {
        const transactionToSave = transactionOverride;
        if (!services || !user || !transactionToSave || !txRepo) return;
        const tDoc = {
            ...transactionToSave,
            total: parseStrictNumber(transactionToSave.total),
        };

        // Story 14e-16: Capture batch editing state BEFORE clearing it
        // Used to skip insight card / session context when saving from batch mode
        const wasInBatchEditingMode = batchEditingIndex !== null;

        // Navigate immediately (optimistic UI)
        // If in batch editing mode, return to batch-review instead of dashboard
        if (batchEditingIndex !== null) {
            // Get the receipt ID before clearing the index
            const receiptId = batchReceipts?.[batchEditingIndex]?.id;
            clearBatchEditingIndex();
            // Story 14e-16: First transition from editing → reviewing phase,
            // then discard the item. This allows auto-complete logic in
            // BatchReviewFeature to detect when list becomes empty.
            batchReviewActions.finishEditing();
            // Remove the saved receipt from the batch list so it doesn't appear twice
            // Story 14e-16: Remove from both scan store and batch review store
            // Story 14e-34b: Use atomic action to prevent race conditions
            if (receiptId) {
                atomicBatchActions.discardReceiptAtomic(receiptId);
            }
            setView('batch-review');
        } else {
            setView('dashboard');
        }
        setCurrentTransaction(null);
        // Clear scan state (only for non-batch, batch keeps its images)
        if (batchEditingIndex === null) {
            setScanImages([]);
        }

        // Fire the Firestore operation and chain insight generation for new transactions
        if (transactionToSave.id) {
            // Update existing transaction - no insight generation
            txRepo.update(transactionToSave.id, tDoc)
                .catch(e => console.error('Update failed:', e));
        } else {
            // Increment scan counter for sprinkle distribution
            incrementInsightCounter();

            // Get profile or use default if not loaded yet
            const profile = insightProfile || {
                schemaVersion: 1 as const,
                firstTransactionDate: null as any,
                totalTransactions: 0,
                recentInsights: [],
            };

            // Check if insights are silenced
            const silenced = isInsightsSilenced(insightCache || getDefaultCache());

            // Fire and forget chain: add transaction → generate insight → record with real ID
            txRepo.add(tDoc)
                .then(async (transactionId) => {
                    // TD-18-22: Copy scan images from pending to permanent path (fire-and-forget)
                    if (tDoc.imageUrls && tDoc.imageUrls.length > 0) {
                        copyPendingToReceipts(tDoc.imageUrls, user!.uid, transactionId)
                            .then(newUrls => txRepo!.update(transactionId, { imageUrls: newUrls }))
                            .catch(err => console.warn('Failed to copy scan images to receipts:', err));
                    }

                    // Generate insight with real transaction ID
                    const txWithId = { ...tDoc, id: transactionId } as Transaction;
                    const insight = await generateInsightForTransaction(
                        txWithId,
                        transactions,
                        profile,
                        insightCache || getDefaultCache()
                    );

                    // Add transaction and insight to batch session
                    addToBatch(txWithId, insight);

                    // If silenced OR in batch editing mode, skip showing individual insight
                    // Story 14e-16: Don't show insight card when saving from batch edit mode
                    // The batch review flow handles completion differently
                    if (silenced || wasInBatchEditingMode) {
                        const txDate = tDoc.date ? new Date(tDoc.date) : new Date();
                        trackTransactionForInsight(txDate)
                            .catch(err => console.warn('Failed to track transaction:', err));
                        return;
                    }

                    // Show batch summary when 3+ receipts
                    const willBeBatchMode = (batchSession?.receipts.length ?? 0) + 1 >= 3;
                    if (willBeBatchMode) {
                        setShowBatchSummary(true);
                    } else {
                        // Standard insight card flow
                        setCurrentInsight(insight);
                        setShowInsightCard(true);
                        // Build session context for completion messaging
                        const sessionReceipts = batchSession?.receipts ?? [];
                        const transactionsSaved = sessionReceipts.length + 1;
                        setSessionContext({
                            transactionsSaved,
                            consecutiveDays: profile.totalTransactions > 0
                                ? Math.min(profile.totalTransactions, 30)
                                : 1,
                            isFirstOfWeek: new Date().getDay() === 1 && transactionsSaved === 1,
                            isPersonalRecord: false,
                            totalAmount: txWithId.total,
                            currency: txWithId.currency || currency,
                            categoriesTouched: txWithId.category ? [txWithId.category] : [],
                        });
                    }

                    // Record insight shown in UserInsightProfile (if not fallback)
                    if (insight && insight.id !== 'building_profile') {
                        recordInsightShown(insight.id, transactionId, {
                            title: insight.title,
                            message: insight.message,
                            icon: insight.icon || '',
                            category: insight.category as string,
                        }).catch(err => console.warn('Failed to record insight:', err));
                    }

                    // Track transaction for profile stats (fire-and-forget)
                    const txDate = tDoc.date ? new Date(tDoc.date) : new Date();
                    trackTransactionForInsight(txDate)
                        .catch(err => console.warn('Failed to track transaction:', err));
                })
                .catch(err => {
                    console.warn('Transaction save or insight generation failed:', err);
                    // Still add to batch even if insight generation failed
                    const txWithTemp = { ...tDoc, id: 'temp' } as Transaction;
                    addToBatch(txWithTemp, null);

                    // Show batch summary if in batch mode, otherwise fallback card
                    // Story 14e-16: Skip when saving from batch edit mode
                    if (!silenced && !wasInBatchEditingMode) {
                        const willBeBatchMode = (batchSession?.receipts.length ?? 0) + 1 >= 3;
                        if (willBeBatchMode) {
                            setShowBatchSummary(true);
                        } else {
                            // Show fallback on error - never show nothing
                            setCurrentInsight(null);
                            setShowInsightCard(true);
                            setSessionContext({
                                transactionsSaved: 1,
                                consecutiveDays: 1,
                                isFirstOfWeek: false,
                                isPersonalRecord: false,
                                totalAmount: tDoc.total,
                                currency: tDoc.currency || currency,
                                categoriesTouched: tDoc.category ? [tDoc.category] : [],
                            });
                        }
                    }
                });
        }
    }, [
        services,
        user,
        transactions,
        currency,
        insightProfile,
        insightCache,
        batchSession,
        incrementInsightCounter,
        addToBatch,
        recordInsightShown,
        trackTransactionForInsight,
        setView,
        setCurrentTransaction,
        setScanImages,
        batchEditingIndex,
        clearBatchEditingIndex,
        batchReceipts,
        // Story 14e-34b: discardBatchReceipt removed - now using atomicBatchActions internally
        setCurrentInsight,
        setShowInsightCard,
        setShowBatchSummary,
        setSessionContext,
        txRepo,
    ]);

    /**
     * Delete a transaction by ID.
     * Updates shared group member timestamps for cache invalidation.
     */
    const deleteTransaction = useCallback(async (id: string) => {
        if (!services || !user || !txRepo) return;

        // Get transaction for shared group handling
        // Note: currentTransaction may be stale, so we pass it from caller
        // This deletion will be caught by other members on next sync

        // Fire the delete (don't await)
        txRepo.delete(id)
            .catch(e => console.error('Delete failed:', e));

        // Navigate immediately
        setView('dashboard');
    }, [services, user, txRepo, setView]);

    /**
     * Wipe all transactions for the current user.
     * Shows browser confirmation dialog before proceeding.
     */
    const wipeDB = useCallback(async () => {
        if (!window.confirm(t('wipeConfirm'))) return;
        if (!services || !user || !txRepo) return;

        // Note: wiping state would be set here if we had state management
        // For now, caller should manage the state
        try {
            await txRepo.wipeAll();
            alert(t('cleaned'));
        } catch (e) {
            const info = getErrorInfo(classifyError(e));
            alert(t(info.titleKey));
        }
    }, [services, user, txRepo, t]);

    /**
     * Export all transactions to CSV file.
     * Uses requestAnimationFrame for non-blocking UI.
     */
    const handleExportData = useCallback(async () => {
        // Empty state handling
        if (transactions.length === 0) {
            setToastMessage({ text: t('noTransactionsToExport'), type: 'info' });
            return;
        }

        try {
            // Non-blocking UI with requestAnimationFrame
            await new Promise(resolve => requestAnimationFrame(resolve));
            downloadBasicData(transactions);
            setToastMessage({ text: t('exportSuccess'), type: 'success' });
        } catch (e) {
            console.error('Export failed:', e);
            const info = getErrorInfo(classifyError(e));
            setToastMessage({ text: t(info.messageKey), type: info.toastType });
        }
    }, [transactions, setToastMessage, t]);

    // Return handlers
    return useMemo<UseTransactionHandlersResult>(
        () => ({
            saveTransaction,
            deleteTransaction,
            wipeDB,
            handleExportData,
            createDefaultTransaction,
        }),
        [
            saveTransaction,
            deleteTransaction,
            wipeDB,
            handleExportData,
            createDefaultTransaction,
        ]
    );
}

export default useTransactionHandlers;
