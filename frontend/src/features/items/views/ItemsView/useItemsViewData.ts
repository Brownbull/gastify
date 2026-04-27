/**
 * Story 14e-31: useItemsViewData Hook
 *
 * Composition hook that encapsulates all ItemsView data needs.
 * This hook owns data fetching, allowing ItemsView to own its data
 * without prop drilling from App.tsx.
 *
 * Architecture:
 * - Calls useAuth() for user/services
 * - Calls usePaginatedTransactions() for transaction data
 * - Calls useRecentScans() for recent scan merge
 * - Calls useThemeSettings() for theme/locale settings
 * - Provides formatters (t, formatCurrency, formatDate) internally
 *
 * Note: onEditTransaction handler is provided via _testOverrides from App.tsx
 * because it requires coordination with App.tsx state (currentTransaction,
 * transactionEditorMode, transactionNavigationList).
 *
 * @example
 * ```tsx
 * function ItemsView({ _testOverrides }) {
 *   const data = useItemsViewData();
 *   const { onEditTransaction } = { ...data, ..._testOverrides };
 *   // All data comes from hook - handlers overridden from App.tsx
 * }
 * ```
 */

import { useMemo, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePaginatedTransactions } from '@/hooks/usePaginatedTransactions';
import { useRecentScans } from '@/hooks/useRecentScans';
import { mergeTransactionsWithRecentScans } from '@/utils/transactionMerge';
// Story 15-7c: Theme settings from Zustand store (ThemeContext removed)
import { useThemeSettings } from '@/shared/stores';
import { formatCurrency as formatCurrencyUtil } from '@/utils/currency';
import { formatDate as formatDateUtil } from '@/utils/date';
import { TRANSLATIONS } from '@/utils/translations';
import type { Transaction } from '@/types/transaction';
import type { Language, Theme, ColorTheme, FontColorMode } from '@/types/settings';

// =============================================================================
// Types
// =============================================================================

/**
 * User info subset for ItemsView display
 */
export interface UserInfo {
    uid: string | null;
    displayName: string | null;
    email: string | null;
}

/**
 * Return type for useItemsViewData hook.
 *
 * Provides all data ItemsView needs:
 * - Transaction data (merged, deduplicated)
 * - User info
 * - Theme/locale settings
 * - Formatters (t, formatCurrency, formatDate)
 * - Handler stub (overridden via _testOverrides)
 */
export interface UseItemsViewDataReturn {
    // === Transaction Data ===
    /** Merged transactions (recent scans + paginated), deduplicated */
    transactions: Transaction[];

    // === User Info ===
    /** User info for header display */
    user: UserInfo;
    /** App ID for Firestore paths */
    appId: string;
    /** User display name for profile */
    userName: string;
    /** User email for profile */
    userEmail: string;
    /** User ID */
    userId: string | null;

    // === Theme/Locale Settings ===
    /** Light or dark mode */
    theme: Theme;
    /** Color theme for category colors */
    colorTheme: ColorTheme;
    /** Font color mode (colorful/plain) */
    fontColorMode: FontColorMode;
    /** Current language */
    lang: Language;
    /** Default currency */
    currency: string;
    /** Date format preference */
    dateFormat: 'LatAm' | 'US';
    /** User's default country for foreign location detection */
    defaultCountry: string;

    // === Formatters ===
    /** Translation function */
    t: (key: string) => string;
    /** Currency formatting function */
    formatCurrency: (amount: number, currency: string) => string;
    /** Date formatting function */
    formatDate: (date: string, format: 'LatAm' | 'US') => string;

    // === Callbacks ===
    /**
     * Callback to edit a transaction.
     * In production, passed via _testOverrides from App.tsx to coordinate with
     * setCurrentTransaction and navigation state.
     *
     * @param transactionId - ID of the transaction to edit
     * @param allTransactionIds - Optional list of all transaction IDs for multi-transaction navigation
     */
    onEditTransaction: (transactionId: string, allTransactionIds?: string[]) => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * useItemsViewData - Composition hook for ItemsView data.
 *
 * Story 14e-31: Provides ALL data ItemsView needs.
 * Encapsulates all data fetching, settings, and formatters that were
 * previously passed as props from App.tsx via useItemsViewProps.
 *
 * Data sources:
 * 1. useAuth() - user/services
 * 2. usePaginatedTransactions() - transaction data
 * 3. useRecentScans() - recent scan merge
 * 4. useThemeSettings() - theme/locale settings
 *
 * @returns UseItemsViewDataReturn - All data needed by ItemsView
 */
export function useItemsViewData(): UseItemsViewDataReturn {
    // === Auth & Services ===
    const { user, services } = useAuth();

    // === Theme/Locale Settings ===
    const {
        theme,
        colorTheme,
        fontColorMode,
        lang,
        currency,
        dateFormat,
    } = useThemeSettings();

    // User's default country (not in theme context, use preference or default to Chile)
    const defaultCountry = 'CL';

    // === Transaction Data ===
    const { transactions: paginatedTransactions } = usePaginatedTransactions(user, services);

    // Recent scans for merge
    const recentScans = useRecentScans(user, services);

    // Merge recent scans with paginated transactions (deduplication)
    const transactions = useMemo(
        () => mergeTransactionsWithRecentScans(paginatedTransactions, recentScans),
        [paginatedTransactions, recentScans]
    );

    // === User Info ===
    const userInfo: UserInfo = useMemo(
        () => ({
            uid: user?.uid ?? null,
            displayName: user?.displayName ?? null,
            email: user?.email ?? null,
        }),
        [user?.uid, user?.displayName, user?.email]
    );

    // === Formatters ===
    // Translation function - memoized to prevent unnecessary re-renders
    const t = useCallback(
        (key: string): string => {
            const translations = TRANSLATIONS[lang] || TRANSLATIONS.en;
            return (translations as Record<string, string>)[key] || key;
        },
        [lang]
    );

    // Currency formatter - stable reference
    const formatCurrency = useCallback(
        (amount: number, currencyCode: string): string => {
            return formatCurrencyUtil(amount, currencyCode);
        },
        []
    );

    // Date formatter - stable reference
    const formatDate = useCallback(
        (date: string, format: 'LatAm' | 'US'): string => {
            return formatDateUtil(date, format);
        },
        []
    );

    // === Return Complete Data ===
    return {
        // Transaction data
        transactions,

        // User info
        user: userInfo,
        appId: services?.appId ?? '',
        userName: user?.displayName ?? '',
        userEmail: user?.email ?? '',
        userId: user?.uid ?? null,

        // Theme/locale settings
        theme,
        colorTheme,
        fontColorMode,
        lang,
        currency,
        dateFormat,
        defaultCountry,

        // Formatters
        t,
        formatCurrency,
        formatDate,

        // Callbacks - stub implementation, override via _testOverrides in production
        // Story 14e-31: No-op stub - App.tsx passes the real callback via _testOverrides
        // to coordinate with setCurrentTransaction and navigation state
        onEditTransaction: (_transactionId: string, _allTransactionIds?: string[]) => {
            // No-op: In production, App.tsx passes the real callback via _testOverrides
            // to coordinate with setCurrentTransaction and navigation state
            if (import.meta.env.DEV) {
                console.warn(
                    '[useItemsViewData] onEditTransaction called without _testOverrides. ' +
                    'Pass onEditTransaction via _testOverrides prop for production use.'
                );
            }
        },
    };
}
