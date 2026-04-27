/**
 * Story 14e-28: useTransactionEditorData Hook
 *
 * Composition hook that encapsulates all TransactionEditorView data needs.
 * This hook owns data fetching and state derivation, allowing TransactionEditorView
 * to own its data without prop drilling from App.tsx.
 *
 * Architecture:
 * - Calls useAuth() for user/services
 * - Calls useThemeSettings() for theme/locale settings
 * - Calls useUserPreferences() for user defaults
 * - Calls useUserCredits() for credit display
 * - Accesses ScanStore (Zustand) for scan state
 * - Provides formatters (t, formatCurrency) internally
 *
 * Note: Some data still comes via props (currentTransaction, etc.) because
 * it's managed by App.tsx for cross-view coordination. These are passed
 * via _testOverrides pattern.
 *
 * @example
 * ```tsx
 * function TransactionEditorView(props) {
 *   const data = useTransactionEditorData(props._testOverrides);
 *   // Data comes from hook - minimal props needed
 * }
 * ```
 */

import { useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useUserCredits } from '@/hooks/useUserCredits';
// Story 15-7c: Theme settings from Zustand store (ThemeContext removed)
import { useThemeSettings } from '@/shared/stores';
import { useTransactions } from '@/hooks/useTransactions';
import { useCategoryMappings } from '@/hooks/useCategoryMappings';
import { useMerchantMappings } from '@/hooks/useMerchantMappings';
import { useSubcategoryMappings } from '@/hooks/useSubcategoryMappings';
import { useItemNameMappings } from '@/hooks/useItemNameMappings';
import { formatCurrency as formatCurrencyUtil } from '@/utils/currency';
import { TRANSLATIONS } from '@/utils/translations';
import { STORE_CATEGORIES } from '@/config/constants';
import type { Transaction } from '@/types/transaction';
import type { StoreCategory, ItemCategory } from '../../../../../shared/schema/categories';
import type { UserCredits } from '@/types/scan';
import type { Language, Theme } from '@/types/settings';
import type { ItemNameMapping } from '@/types/itemNameMapping';

// Zustand store imports
// Story 16-6: error still on scan store; phase/processing from shared workflow store
import { useScanStore } from '@features/scan/store';
import {
    useWorkflowPhase as useScanPhase,
    useWorkflowIsProcessing as useIsProcessing,
} from '@shared/stores';
import {
    useWorkflowImages,
    useWorkflowBatchEditingIndex,
    useWorkflowBatchReceipts,
} from '@/shared/stores';

// Shared utilities (Story 14e-28 review follow-up: extracted to eliminate duplication)
import {
    deriveScanButtonState,
    computeBatchContext,
    type ScanButtonState,
} from '@/shared/utils';

// Re-export ScanButtonState type for backwards compatibility
export type { ScanButtonState } from '@/shared/utils';

/**
 * Props passed via _testOverrides for App-level state coordination.
 * These cannot be derived by the hook because they're managed by App.tsx.
 */
export interface TransactionEditorDataOverrides {
    // Transaction state (App.tsx managed)
    currentTransaction: Transaction | null;
    transactionEditorMode: 'new' | 'existing';
    isViewingReadOnly: boolean;
    transactionNavigationList: string[] | null;

    // Scan state overrides (for batch editing context)
    skipScanCompleteModal?: boolean;
    isRescanning?: boolean;

    // UI state
    isSaving?: boolean;
    animateItems?: boolean;
    creditUsedInSession?: boolean;
}

/**
 * Return type for useTransactionEditorData hook.
 */
export interface UseTransactionEditorDataReturn {
    // Core
    transaction: Transaction | null;
    mode: 'new' | 'existing';
    readOnly: boolean;
    isOtherUserTransaction: boolean;
    ownerId?: string;
    ownerProfile?: { displayName?: string; photoURL?: string | null } | null;

    // Scan state
    scanButtonState: ScanButtonState;
    isProcessing: boolean;
    processingEta: number | null;
    scanError: string | null;
    skipScanCompleteModal: boolean;
    thumbnailUrl?: string;
    pendingImageUrl?: string;
    isRescanning: boolean;

    // UI settings
    theme: Theme;
    t: (key: string) => string;
    formatCurrency: (amount: number, currency: string) => string;
    currency: string;
    lang: Language;
    credits: UserCredits;
    storeCategories: string[];
    distinctAliases: string[];

    // Context
    batchContext: { index: number; total: number } | null;
    defaultCity: string;
    defaultCountry: string;
    isSaving: boolean;
    animateItems: boolean;
    creditUsed: boolean;

    // Cross-store suggestions
    itemNameMappings: ItemNameMapping[];

    // Mapping functions (for learning callbacks)
    saveMapping: (item: string, category: StoreCategory, source?: 'user' | 'ai') => Promise<string>;
    saveMerchantMapping: (originalMerchant: string, targetMerchant: string, storeCategory?: StoreCategory) => Promise<string>;
    saveSubcategoryMapping: (item: string, subcategory: string, source?: 'user' | 'ai') => Promise<string>;
    saveItemNameMapping: (normalizedMerchant: string, originalItemName: string, targetItemName: string, targetCategory?: ItemCategory) => Promise<string>;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * useTransactionEditorData - Composition hook for TransactionEditorView data.
 *
 * Encapsulates all data fetching and state derivation that was previously
 * done in useTransactionEditorViewProps and App.tsx.
 *
 * @param overrides - Data that must come from App.tsx (cross-view coordination)
 * @returns UseTransactionEditorDataReturn - All data needed by TransactionEditorView
 */
export function useTransactionEditorData(
    overrides?: TransactionEditorDataOverrides
): UseTransactionEditorDataReturn {
    // === Auth & Services ===
    const { user, services } = useAuth();

    // === Theme/Locale Settings ===
    const { theme, lang, currency } = useThemeSettings();

    // === User Preferences ===
    const { preferences } = useUserPreferences(user, services);
    const defaultCity = preferences.defaultCity || '';
    const defaultCountry = preferences.defaultCountry || '';

    // === User Credits ===
    const { credits: userCredits } = useUserCredits(user);

    // === Transactions (for distinct aliases) ===
    const transactions = useTransactions(user, services);

    // Extract distinct aliases from transactions
    const distinctAliases = useMemo(() => {
        const aliases = new Set<string>();
        transactions.forEach(d => {
            if (d.alias) aliases.add(d.alias);
        });
        return Array.from(aliases).sort();
    }, [transactions]);

    // === Category Mappings ===
    const { saveMapping } = useCategoryMappings(user, services);
    const { saveMapping: saveMerchantMapping } = useMerchantMappings(user, services);
    const { saveMapping: saveSubcategoryMapping } = useSubcategoryMappings(user, services);
    const { mappings: itemNameMappings, saveMapping: saveItemNameMappingInternal } = useItemNameMappings(user, services);

    // Wrap saveItemNameMapping to match the expected type signature
    const saveItemNameMapping = useCallback(
        async (normalizedMerchant: string, originalItemName: string, targetItemName: string, targetCategory?: ItemCategory) => {
            return saveItemNameMappingInternal(
                normalizedMerchant,
                originalItemName,
                targetItemName,
                targetCategory
            );
        },
        [saveItemNameMappingInternal]
    );

    // === Scan State from Zustand ===
    // Story 16-6: Error still on scan store (scan-internal), phase/processing from shared store
    const scanError = useScanStore((s) => s.error);
    const scanPhase = useScanPhase();
    const isProcessing = useIsProcessing();

    // Story 16-6: images, batchEditingIndex, batchReceipts moved to workflow store
    const workflowImages = useWorkflowImages();
    const workflowBatchEditingIndex = useWorkflowBatchEditingIndex();
    const workflowBatchReceipts = useWorkflowBatchReceipts();

    // Derive scan button state
    const scanButtonState = deriveScanButtonState(scanPhase);

    // === Overrides (App.tsx managed state) ===
    const currentTransaction = overrides?.currentTransaction ?? null;
    const transactionEditorMode = overrides?.transactionEditorMode ?? 'new';
    const isViewingReadOnly = overrides?.isViewingReadOnly ?? false;
    const transactionNavigationList = overrides?.transactionNavigationList ?? null;
    const skipScanCompleteModal = overrides?.skipScanCompleteModal ?? false;
    const isRescanning = overrides?.isRescanning ?? false;
    const isSaving = overrides?.isSaving ?? false;
    const animateItems = overrides?.animateItems ?? false;
    const creditUsedInSession = overrides?.creditUsedInSession ?? false;

    // === Computed Values ===

    // Pending image URL - show during pending/scanning states
    const pendingImageUrl = useMemo(() => {
        const isPendingOrScanning = scanButtonState === 'pending' || scanButtonState === 'scanning';
        return isPendingOrScanning && workflowImages.length > 0 ? workflowImages[0] : undefined;
    }, [scanButtonState, workflowImages]);

    // Thumbnail URL with fallback
    const thumbnailUrl = useMemo(() => {
        return currentTransaction?.thumbnailUrl ||
            (workflowImages.length > 0 ? workflowImages[0] : undefined);
    }, [currentTransaction?.thumbnailUrl, workflowImages]);

    // Batch context
    const batchContext = useMemo(() => {
        return computeBatchContext(
            workflowBatchEditingIndex,
            workflowBatchReceipts,
            transactionNavigationList,
            currentTransaction?.id
        );
    }, [
        workflowBatchEditingIndex,
        workflowBatchReceipts,
        transactionNavigationList,
        currentTransaction?.id,
    ]);

    // All transactions are owned by the current user (shared groups removed)
    const isOtherUserTransaction = false;
    const ownerProfile = undefined;

    // === Formatters ===
    const t = useCallback(
        (key: string): string => {
            const translations = TRANSLATIONS[lang] || TRANSLATIONS.en;
            return (translations as Record<string, string>)[key] || key;
        },
        [lang]
    );

    const formatCurrency = useCallback(
        (amount: number, currencyCode: string): string => {
            return formatCurrencyUtil(amount, currencyCode);
        },
        []
    );

    // === Return Complete Data ===
    return {
        // Core
        transaction: currentTransaction,
        mode: transactionEditorMode,
        readOnly: isViewingReadOnly,
        isOtherUserTransaction,
        ownerId: undefined,
        ownerProfile,

        // Scan state
        scanButtonState,
        isProcessing,
        processingEta: null, // Not currently tracked
        scanError,
        skipScanCompleteModal,
        thumbnailUrl,
        pendingImageUrl,
        isRescanning,

        // UI settings
        theme,
        t,
        formatCurrency,
        currency,
        lang,
        credits: userCredits,
        storeCategories: STORE_CATEGORIES as unknown as string[],
        distinctAliases: distinctAliases || [],

        // Context
        batchContext,
        defaultCity,
        defaultCountry,
        isSaving,
        animateItems,
        creditUsed: creditUsedInSession,

        // Cross-store suggestions
        itemNameMappings,

        // Mapping functions
        saveMapping,
        saveMerchantMapping,
        saveSubcategoryMapping,
        saveItemNameMapping,
    };
}
