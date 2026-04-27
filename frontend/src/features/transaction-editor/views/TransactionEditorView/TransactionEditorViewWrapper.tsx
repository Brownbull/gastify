/**
 * Story 14e-28b: TransactionEditorView Wrapper
 *
 * This wrapper allows TransactionEditorView to own its data by:
 * 1. Accepting minimal _testOverrides from App.tsx
 * 2. Calling useTransactionEditorData() for all data
 * 3. Calling useTransactionEditorHandlers() for all handlers
 * 4. Mapping hook returns to the existing component props
 *
 * Pattern matches: HistoryView, TrendsView, DashboardView, SettingsView
 */

import React from 'react';
import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { Transaction } from '@/types/transaction';

// Import the existing component (renamed to TransactionEditorViewInternal.tsx)
import { TransactionEditorView as TransactionEditorViewInternal } from '../TransactionEditorViewInternal';

// Import hooks
import { useTransactionEditorData, type TransactionEditorDataOverrides } from './useTransactionEditorData';
import { useTransactionEditorHandlers, type UseTransactionEditorHandlersProps } from './useTransactionEditorHandlers';

/**
 * Story 14e-28b: _testOverrides interface for App-level state coordination.
 * Story 14e-36c: Handler state now from Zustand store, only external deps needed.
 *
 * This combines data overrides (for useTransactionEditorData) and
 * handler dependencies (for useTransactionEditorHandlers).
 */
export interface TransactionEditorViewTestOverrides {
    // === Data overrides (for useTransactionEditorData) ===
    currentTransaction: Transaction | null;
    transactionEditorMode: 'new' | 'existing';
    isViewingReadOnly: boolean;
    transactionNavigationList: string[] | null;
    skipScanCompleteModal?: boolean;
    isRescanning?: boolean;
    isSaving?: boolean;
    animateItems?: boolean;
    creditUsedInSession?: boolean;

    // === Handler dependencies (for useTransactionEditorHandlers) ===
    // Story 14e-36c: Editor state/actions now from store, only external deps needed
    user: User | null;
    db: Firestore | null;
    transactions: Transaction[];
    saveTransaction: (tx: Transaction) => Promise<string | void>;
    deleteTransaction: (id: string) => void;
    processScan: (images?: string[]) => void;
    handleRescan: () => Promise<void>;
    hasActiveTransactionConflict: () => { hasConflict: boolean; reason?: string };
}

/**
 * Props for TransactionEditorView wrapper component
 */
export interface TransactionEditorViewProps {
    /**
     * App-level state coordination.
     * Contains data overrides + handler dependencies.
     */
    _testOverrides: TransactionEditorViewTestOverrides;
}

/**
 * TransactionEditorView - Wrapper that calls hooks internally
 *
 * Story 14e-28b: This wrapper enables the view to own its data.
 */
export const TransactionEditorView: React.FC<TransactionEditorViewProps> = ({
    _testOverrides,
}) => {
    // ==========================================================================
    // Build props for internal hooks
    // ==========================================================================

    const dataOverrides: TransactionEditorDataOverrides = {
        currentTransaction: _testOverrides.currentTransaction,
        transactionEditorMode: _testOverrides.transactionEditorMode,
        isViewingReadOnly: _testOverrides.isViewingReadOnly,
        transactionNavigationList: _testOverrides.transactionNavigationList,
        skipScanCompleteModal: _testOverrides.skipScanCompleteModal,
        isRescanning: _testOverrides.isRescanning,
        isSaving: _testOverrides.isSaving,
        animateItems: _testOverrides.animateItems,
        creditUsedInSession: _testOverrides.creditUsedInSession,
    };

    // Story 14e-36c: Editor state/actions now from store, only external deps passed
    const handlerProps: UseTransactionEditorHandlersProps = {
        user: _testOverrides.user,
        transactions: _testOverrides.transactions,
        saveTransaction: _testOverrides.saveTransaction,
        deleteTransaction: _testOverrides.deleteTransaction,
        processScan: _testOverrides.processScan,
        handleRescan: _testOverrides.handleRescan,
        hasActiveTransactionConflict: _testOverrides.hasActiveTransactionConflict,
    };

    // ==========================================================================
    // Call hooks to get data and handlers
    // ==========================================================================

    const data = useTransactionEditorData(dataOverrides);
    const handlers = useTransactionEditorHandlers(handlerProps);

    // ==========================================================================
    // Map hook returns to component props
    // ==========================================================================

    return (
        <TransactionEditorViewInternal
            // Core data
            transaction={data.transaction}
            mode={data.mode}
            readOnly={data.readOnly}
            isOtherUserTransaction={data.isOtherUserTransaction}
            ownerProfile={data.ownerProfile}
            ownerId={data.ownerId}

            // Scan state
            scanButtonState={data.scanButtonState}
            isProcessing={data.isProcessing}
            processingEta={data.processingEta}
            scanError={data.scanError}
            skipScanCompleteModal={data.skipScanCompleteModal}
            thumbnailUrl={data.thumbnailUrl}
            pendingImageUrl={data.pendingImageUrl}
            isRescanning={data.isRescanning}

            // UI settings
            theme={data.theme}
            t={data.t}
            formatCurrency={data.formatCurrency}
            currency={data.currency}
            lang={data.lang}
            credits={data.credits}
            storeCategories={data.storeCategories}
            distinctAliases={data.distinctAliases}

            // Context
            batchContext={data.batchContext}
            defaultCity={data.defaultCity}
            defaultCountry={data.defaultCountry}
            isSaving={data.isSaving}
            animateItems={data.animateItems}
            creditUsed={data.creditUsed}

            // Cross-store suggestions
            itemNameMappings={data.itemNameMappings}

            // Transaction operations (map handle* to on*)
            onUpdateTransaction={handlers.handleUpdateTransaction}
            onSave={handlers.handleSave}
            onCancel={handlers.handleCancel}
            onDelete={handlers.handleDelete}

            // Scan operations
            onPhotoSelect={handlers.handlePhotoSelect}
            onProcessScan={handlers.handleProcessScan}
            onRetry={handlers.handleRetry}
            onRescan={handlers.handleRescan}

            // Batch navigation
            onBatchPrevious={handlers.handleBatchPrevious}
            onBatchNext={handlers.handleBatchNext}
            onBatchModeClick={handlers.handleBatchModeClick}

            // Read-only mode
            onRequestEdit={handlers.handleRequestEdit}

            // Mapping callbacks (from data hook)
            onSaveMapping={data.saveMapping}
            onSaveMerchantMapping={data.saveMerchantMapping}
            onSaveSubcategoryMapping={data.saveSubcategoryMapping}
            onSaveItemNameMapping={data.saveItemNameMapping}
        />
    );
};

export default TransactionEditorView;
