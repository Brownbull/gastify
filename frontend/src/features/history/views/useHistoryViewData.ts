/**
 * Story 14e-25a.2a: useHistoryViewData Hook
 * Story 14e-25a.2b: Extended for full HistoryView data ownership
 *
 * Composition hook that encapsulates all HistoryView data needs.
 * This hook owns data fetching, allowing HistoryView to own its data
 * without prop drilling from App.tsx.
 *
 * Architecture:
 * - Calls useAuth() for user/services
 * - Calls usePaginatedTransactions() for transaction data
 * - Calls useRecentScans() for recent scan merge
 * - Calls useTheme() for theme/locale settings
 * - Calls useUserPreferences() for user defaults
 * - Consumes pendingHistoryFilters from navigation store
 * - Provides formatters (t, formatCurrency, formatDate) internally
 *
 * @example
 * ```tsx
 * function HistoryView() {
 *   const data = useHistoryViewData();
 *   // All data comes from hook - no props needed
 * }
 * ```
 */

import { useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePaginatedTransactions } from '@/hooks/usePaginatedTransactions';
import { useRecentScans } from '@/hooks/useRecentScans';
import { mergeTransactionsWithRecentScans } from '@/utils/transactionMerge';
import { useUserPreferences } from '@/hooks/useUserPreferences';
// Story 15-7c: Theme settings from Zustand store (ThemeContext removed)
import { useThemeSettings } from '@/shared/stores';
import {
    useNavigationStore,
    usePendingHistoryFilters,
} from '@/shared/stores/useNavigationStore';
import { formatCurrency as formatCurrencyUtil } from '@/utils/currency';
import { formatDate as formatDateUtil } from '@/utils/date';
import { TRANSLATIONS } from '@/utils/translations';
import type { Transaction } from '@/types/transaction';
import type { HistoryFilterState } from '@/types/historyFilters';
import type { Language, Theme, ColorTheme, FontColorMode } from '@/types/settings';

// =============================================================================
// Types
// =============================================================================

/**
 * User info subset for HistoryView display
 */
export interface UserInfo {
    uid: string | null;
    displayName: string | null;
    email: string | null;
}

/**
 * Return type for useHistoryViewData hook.
 *
 * Story 14e-25a.2b: Extended to include ALL data HistoryView needs:
 * - Transaction data (merged, deduplicated)
 * - Pagination state and callbacks
 * - User info and app ID
 * - Theme/locale settings
 * - User preferences (defaults)
 * - Formatters (t, formatCurrency, formatDate)
 * - Group mode state
 */
export interface UseHistoryViewDataReturn {
    // === Transaction Data ===
    /** Merged transactions (recent scans + paginated), deduplicated */
    transactions: Transaction[];
    /** All transactions for duplicate detection (same as transactions) */
    allTransactions: Transaction[];

    // === Pagination ===
    /** Whether more pages are available */
    hasMore: boolean;
    /** Callback to load next page */
    loadMore: () => void;
    /** True while fetching next page */
    isLoadingMore: boolean;
    /** True if real-time listener hit limit (indicates pagination may be needed) */
    isAtListenerLimit: boolean;

    // === User Info ===
    /** User info for header display */
    user: UserInfo;
    /** App ID for Firestore paths */
    appId: string;

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

    // === User Preferences ===
    /** User's default city for legacy transactions */
    defaultCity: string;
    /** User's default country for legacy transactions */
    defaultCountry: string;
    /** Foreign location display format */
    foreignLocationFormat: 'code' | 'flag';

    // === Formatters ===
    /** Translation function */
    t: (key: string) => string;
    /** Currency formatting function */
    formatCurrency: (amount: number, currency: string) => string;
    /** Date formatting function */
    formatDate: (date: string, format: 'LatAm' | 'US') => string;

    // === Group Mode ===
    /** Whether viewing shared group transactions */
    isGroupMode: boolean;

    // === Filter State ===
    /** Pending history filters (consumed from navigation store) */
    pendingFilters: HistoryFilterState | null;

    // === Callbacks ===
    /**
     * Callback to edit a transaction.
     * In production, passed via _testOverrides from App.tsx to coordinate with
     * setCurrentTransaction and navigation. Default stub just logs.
     */
    onEditTransaction: (transaction: Transaction) => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * useHistoryViewData - Composition hook for HistoryView data.
 *
 * Story 14e-25a.2b: Extended to provide ALL data HistoryView needs.
 * Encapsulates all data fetching, settings, and formatters that were
 * previously passed as props from App.tsx.
 *
 * Data sources:
 * 1. useAuth() - user/services
 * 2. usePaginatedTransactions() - transaction data
 * 3. useRecentScans() - recent scan merge
 * 4. useTheme() - theme/locale settings
 * 5. useUserPreferences() - user defaults
 * 6. useViewMode() - group mode state
 * 7. Navigation store - pending filters
 *
 * @returns UseHistoryViewDataReturn - All data needed by HistoryView
 */
export function useHistoryViewData(): UseHistoryViewDataReturn {
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

    // === User Preferences ===
    const { preferences } = useUserPreferences(user, services);
    const defaultCity = preferences.defaultCity || '';
    const defaultCountry = preferences.defaultCountry || '';
    const foreignLocationFormat = preferences.foreignLocationFormat || 'code';

    // === Navigation Store ===
    const pendingHistoryFilters = usePendingHistoryFilters();
    const clearPendingFilters = useNavigationStore((s) => s.clearPendingFilters);

    // Consume pending filters on mount/change
    // Note: We don't apply filters here - that's useHistoryFiltersInit's job
    // We expose them via pendingFilters return value and clear after consumption
    useEffect(() => {
        if (pendingHistoryFilters) {
            // Clear filters after a microtask delay to allow useHistoryFiltersInit to read them
            const timer = setTimeout(() => {
                clearPendingFilters();
            }, 0);
            return () => clearTimeout(timer);
        }
    }, [pendingHistoryFilters, clearPendingFilters]);

    // === Transaction Data ===
    const {
        transactions: paginatedTransactions,
        hasMore,
        loadMore,
        loadingMore: isLoadingMore,
        isAtListenerLimit,
    } = usePaginatedTransactions(user, services);

    // Recent scans for merge
    const recentScans = useRecentScans(user, services);

    // Merge recent scans with paginated transactions (deduplication)
    const transactionsWithRecentScans = useMemo(
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
        transactions: transactionsWithRecentScans,
        allTransactions: transactionsWithRecentScans,

        // Pagination
        hasMore,
        loadMore,
        isLoadingMore,
        isAtListenerLimit,

        // User info
        user: userInfo,
        appId: services?.appId ?? '',

        // Theme/locale settings
        theme,
        colorTheme,
        fontColorMode,
        lang,
        currency,
        dateFormat,

        // User preferences
        defaultCity,
        defaultCountry,
        foreignLocationFormat,

        // Formatters
        t,
        formatCurrency,
        formatDate,

        // Group mode
        isGroupMode: false,

        // Filter state
        pendingFilters: pendingHistoryFilters,

        // Callbacks - stub implementation, override via _testOverrides in production
        // Story 14e-25a.2b: No-op stub - App.tsx passes real callback via _testOverrides
        // Story 14e-25a.2b (code review fix): Added DEV warning for missing callback
        onEditTransaction: (_transaction: Transaction) => {
            // No-op: In production, App.tsx passes the real callback via _testOverrides
            // to coordinate with setCurrentTransaction and navigation state
            if (import.meta.env.DEV) {
                console.warn(
                    '[useHistoryViewData] onEditTransaction called without _testOverrides. ' +
                    'Pass onEditTransaction via _testOverrides prop for production use.'
                );
            }
        },
    };
}
