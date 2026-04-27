/**
 * Scan Flow Router Sub-Hook
 *
 * Story 15b-2l: Extracted from useScanHandlers.ts.
 * Handles the scan flow routing decision tree:
 * - Apply category/merchant/item mappings
 * - Check currency mismatch
 * - Route to trusted auto-save, quick save, or edit view
 *
 * This hook receives ALL dependencies via props (dependency injection).
 * It does NOT access context or stores directly.
 */

import { useCallback } from 'react';
import type { Firestore } from 'firebase/firestore';
import type { Transaction } from '@/types/transaction';
import type { View } from '@app/types';
import type { ToastMessage } from '@/shared/hooks';
import type {
    CurrencyMismatchDialogData,
    QuickSaveDialogData,
} from '../types/scanStateMachine';
import { DIALOG_TYPES } from '../types/scanStateMachine';
import { createTransactionRepository } from '@/repositories/transactionRepository';
import { shouldShowQuickSave, calculateConfidence } from '@/utils/confidenceCheck';

/**
 * Props for useScanFlowRouter hook.
 * All dependencies are injected — no context or store access.
 */
export interface UseScanFlowRouterProps {
    user: { uid: string } | null;
    services: { db: Firestore; appId: string } | null;
    userPreferences: { defaultCurrency?: string };
    categoryMappings: unknown[];
    findMerchantMatch: (merchantName: string) => {
        confidence: number;
        mapping: {
            id?: string;
            targetMerchant: string;
            normalizedMerchant: string;
            storeCategory?: string;
        };
    } | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applyCategoryMappings: (transaction: Transaction, mappings: any) => { transaction: Transaction; appliedMappingIds: string[] };
    applyItemNameMappings: (
        transaction: Transaction,
        normalizedMerchant: string
    ) => { transaction: Transaction; appliedIds: string[] };
    incrementMappingUsage: (db: Firestore, userId: string, appId: string, mappingId: string) => Promise<void>;
    incrementMerchantMappingUsage: (db: Firestore, userId: string, appId: string, mappingId: string) => Promise<void>;
    incrementItemNameMappingUsage: (db: Firestore, userId: string, appId: string, mappingId: string) => Promise<void>;
    checkTrusted: (merchantName: string) => Promise<boolean>;
    dispatchProcessSuccess: (results: Transaction[]) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    showScanDialog: (type: any, data?: any) => void;
    setCurrentTransaction: (tx: Transaction | null) => void;
    setToastMessage: (msg: ToastMessage | null) => void;
    setView: (view: View) => void;
    setSkipScanCompleteModal: (skip: boolean) => void;
    setAnimateEditViewItems: (animate: boolean) => void;
    t: (key: string) => string;
}

/**
 * Result returned by useScanFlowRouter hook.
 */
export interface UseScanFlowRouterResult {
    continueScanWithTransaction: (transaction: Transaction) => Promise<void>;
    proceedAfterCurrencyResolved: (transaction: Transaction) => Promise<void>;
}

/**
 * Sub-hook that handles scan flow routing after a transaction is processed.
 *
 * `continueScanWithTransaction`: Full flow — applies mappings, checks currency, routes.
 * `proceedAfterCurrencyResolved`: Post-currency flow — skips mappings, routes only.
 */
export function useScanFlowRouter(props: UseScanFlowRouterProps): UseScanFlowRouterResult {
    const {
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
    } = props;

    /**
     * Helper to continue scan flow after currency/total resolution.
     * Story 14c-refactor.22a: Now applies category/merchant/item mappings
     * and checks for currency mismatch (matches inline App.tsx behavior).
     */
    const continueScanWithTransaction = useCallback(async (transaction: Transaction) => {
        // Story 6.4: Apply learned category mappings (AC#1-4)
        const { transaction: categorizedTransaction, appliedMappingIds } =
            applyCategoryMappings(transaction, categoryMappings);

        // Story 6.4 AC#5: Increment usage count for applied mappings (fire-and-forget)
        if (appliedMappingIds.length > 0 && user && services) {
            appliedMappingIds.forEach(mappingId => {
                incrementMappingUsage(services.db, user.uid, services.appId, mappingId)
                    .catch(err => console.error('Failed to increment mapping usage:', err));
            });
        }

        // Story 9.5: Apply learned merchant→alias mapping
        let finalTransaction = categorizedTransaction;
        const merchantMatch = findMerchantMatch(categorizedTransaction.merchant);
        if (merchantMatch && merchantMatch.confidence > 0.7) {
            finalTransaction = {
                ...finalTransaction,
                alias: merchantMatch.mapping.targetMerchant,
                ...(merchantMatch.mapping.storeCategory && { category: merchantMatch.mapping.storeCategory as Transaction['category'] }),
                merchantSource: 'learned' as const,
            };
            if (merchantMatch.mapping.id && user && services) {
                incrementMerchantMappingUsage(services.db, user.uid, services.appId, merchantMatch.mapping.id)
                    .catch(err => console.error('Failed to increment merchant mapping usage:', err));
            }

            // v9.7.0: Apply learned item name mappings (scoped to this merchant)
            const { transaction: txWithItemNames, appliedIds: itemNameMappingIds } = applyItemNameMappings(
                finalTransaction,
                merchantMatch.mapping.normalizedMerchant
            );
            finalTransaction = txWithItemNames;

            // Increment item name mapping usage counts (fire-and-forget)
            if (itemNameMappingIds.length > 0 && user && services) {
                itemNameMappingIds.forEach(id => {
                    incrementItemNameMappingUsage(services.db, user.uid, services.appId, id)
                        .catch(err => console.error('Failed to increment item name mapping usage:', err));
                });
            }
        }

        // Currency handling: if no currency, use default
        if (!finalTransaction.currency && userPreferences.defaultCurrency) {
            finalTransaction = {
                ...finalTransaction,
                currency: userPreferences.defaultCurrency,
            };
        }

        // Check for currency mismatch
        const detectedCurrency = finalTransaction.currency;
        const userDefaultCurrency = userPreferences.defaultCurrency;
        if (detectedCurrency && userDefaultCurrency && detectedCurrency !== userDefaultCurrency) {
            const dialogData: CurrencyMismatchDialogData = {
                detectedCurrency,
                pendingTransaction: finalTransaction,
                hasDiscrepancy: false,
            };
            showScanDialog(DIALOG_TYPES.CURRENCY_MISMATCH, dialogData);
            return;
        }

        // Set as current transaction and continue
        setCurrentTransaction(finalTransaction);

        // Check trusted merchant and determine flow
        const merchantAlias = finalTransaction.alias || finalTransaction.merchant;
        const isTrusted = merchantAlias ? await checkTrusted(merchantAlias) : false;
        const willShowQuickSave = !isTrusted && shouldShowQuickSave(finalTransaction);

        setSkipScanCompleteModal(true);
        dispatchProcessSuccess([finalTransaction]);

        if (isTrusted && services && user) {
            // Auto-save for trusted merchants
            // Transient repo: factory-from-context pattern — intentional for single async flow (TD-15b-27)
            try {
                const repo = createTransactionRepository({ db: services.db, userId: user.uid, appId: services.appId });
                await repo.add(finalTransaction);
                setCurrentTransaction(null);
                setToastMessage({ text: t('autoSaved'), type: 'success' });
                setView('dashboard');
            } catch (err) {
                console.error('Auto-save failed:', err);
                if (shouldShowQuickSave(finalTransaction)) {
                    const qsDialogData: QuickSaveDialogData = {
                        transaction: finalTransaction,
                        confidence: calculateConfidence(finalTransaction),
                    };
                    showScanDialog(DIALOG_TYPES.QUICKSAVE, qsDialogData);
                }
            }
        } else if (willShowQuickSave) {
            const qsDialogData: QuickSaveDialogData = {
                transaction: finalTransaction,
                confidence: calculateConfidence(finalTransaction),
            };
            showScanDialog(DIALOG_TYPES.QUICKSAVE, qsDialogData);
        } else {
            // Low confidence: Stay on editor for manual review
            setAnimateEditViewItems(true);
        }
    }, [
        services,
        user,
        userPreferences.defaultCurrency,
        categoryMappings,
        applyCategoryMappings,
        findMerchantMatch,
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
    ]);

    /**
     * Helper to proceed with scan flow after currency has been resolved.
     * Used by currency mismatch handlers. Skips mapping application (already done)
     * and currency check (already resolved).
     */
    const proceedAfterCurrencyResolved = useCallback(async (transaction: Transaction) => {
        const merchantAlias = transaction.alias || transaction.merchant;
        const isTrusted = merchantAlias ? await checkTrusted(merchantAlias) : false;
        const willShowQuickSave = !isTrusted && shouldShowQuickSave(transaction);

        setSkipScanCompleteModal(true);
        dispatchProcessSuccess([transaction]);
        setCurrentTransaction(transaction);

        if (isTrusted && services && user) {
            // Auto-save for trusted merchants
            // Transient repo: factory-from-context pattern — intentional for single async flow (TD-15b-27)
            try {
                const repo = createTransactionRepository({ db: services.db, userId: user.uid, appId: services.appId });
                await repo.add(transaction);
                setCurrentTransaction(null);
                setToastMessage({ text: t('autoSaved'), type: 'success' });
                setView('dashboard');
            } catch (err) {
                console.error('Auto-save failed:', err);
                if (shouldShowQuickSave(transaction)) {
                    const qsDialogData: QuickSaveDialogData = {
                        transaction: transaction,
                        confidence: calculateConfidence(transaction),
                    };
                    showScanDialog(DIALOG_TYPES.QUICKSAVE, qsDialogData);
                }
            }
        } else if (willShowQuickSave) {
            const qsDialogData: QuickSaveDialogData = {
                transaction: transaction,
                confidence: calculateConfidence(transaction),
            };
            showScanDialog(DIALOG_TYPES.QUICKSAVE, qsDialogData);
        } else {
            // Low confidence: Stay on editor for manual review
            setAnimateEditViewItems(true);
        }
    }, [
        services,
        user,
        checkTrusted,
        dispatchProcessSuccess,
        showScanDialog,
        setCurrentTransaction,
        setToastMessage,
        setView,
        setSkipScanCompleteModal,
        setAnimateEditViewItems,
        t,
    ]);

    return { continueScanWithTransaction, proceedAfterCurrencyResolved };
}
