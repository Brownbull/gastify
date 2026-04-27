/**
 * useCategoryStatsPopup - Category statistics popup state and handlers
 *
 * Story 15b-2m: Extracted from TrendsView.tsx
 *
 * Encapsulates: popup open/close state, category type resolution (based on view mode
 * + drill-down level), navigation to history, statistics computation, translation helper.
 *
 * Note: Receives drill-down state and view mode as params (not owning them) because
 * those are shared with treemap/trend sections.
 */

import { useState, useCallback } from 'react';
import { getContrastTextColor, ALL_ITEM_CATEGORY_GROUPS, type ItemCategoryGroup } from '@/config/categoryColors';
import {
    translateCategory,
    translateStoreCategoryGroup,
    translateItemCategoryGroup,
} from '@/utils/categoryTranslations';
import { useCategoryStatistics, type CategoryFilterType } from '@features/analytics/hooks/useCategoryStatistics';
import type { HistoryNavigationPayload } from '@/types/navigation';
import type { Transaction } from '@/types/transaction';
import { sanitizeLocale } from '@/utils/validation';
import type { DonutViewMode, TimePeriod, CurrentPeriod } from './types';

export interface StatsPopupCategory {
    name: string;
    emoji: string;
    color: string;
    fgColor: string;
    type: CategoryFilterType;
}

export interface UseCategoryStatsPopupProps {
    donutViewMode: DonutViewMode;
    treemapDrillDownLevel: number;
    filteredTransactions: Transaction[];
    total: number;
    locale: string;
    timePeriod: TimePeriod;
    currentPeriod: CurrentPeriod;
    onNavigateToHistory?: (payload: HistoryNavigationPayload) => void;
}

export interface UseCategoryStatsPopupReturn {
    statsPopupOpen: boolean;
    statsPopupCategory: StatsPopupCategory | null;
    handleOpenStatsPopup: (categoryName: string, emoji: string, color: string) => void;
    handleCloseStatsPopup: () => void;
    handleStatsPopupViewHistory: () => void;
    categoryStatistics: ReturnType<typeof useCategoryStatistics>;
    getTranslatedCategoryName: (name: string, type: CategoryFilterType) => string;
}

export function useCategoryStatsPopup({
    donutViewMode,
    treemapDrillDownLevel,
    filteredTransactions,
    total,
    locale,
    timePeriod,
    currentPeriod,
    onNavigateToHistory,
}: UseCategoryStatsPopupProps): UseCategoryStatsPopupReturn {
    const [statsPopupOpen, setStatsPopupOpen] = useState(false);
    const [statsPopupCategory, setStatsPopupCategory] = useState<StatsPopupCategory | null>(null);

    // Story 14.40: Open category statistics popup
    // Determines the category type based on current view mode and drill-down level
    const handleOpenStatsPopup = useCallback((
        categoryName: string,
        emoji: string,
        color: string
    ) => {
        // Don't show popup for "Más" aggregated group
        const isAggregatedGroup = categoryName === 'Más' || categoryName === 'More';
        if (isAggregatedGroup) return;

        // Determine category type based on view mode and drill-down level
        let type: CategoryFilterType = 'store-category';

        if (donutViewMode === 'store-groups' && treemapDrillDownLevel === 0) {
            type = 'store-group';
        } else if (donutViewMode === 'store-categories' && treemapDrillDownLevel === 0) {
            type = 'store-category';
        } else if (donutViewMode === 'item-groups' && treemapDrillDownLevel === 0) {
            type = 'item-group';
        } else if (donutViewMode === 'item-categories' && treemapDrillDownLevel === 0) {
            type = 'item-category';
        } else {
            // At drill-down levels, type depends on what's displayed
            // Drill-down structure:
            // store-categories: L0=storeCategories, L1=itemGroups, L2=itemCategories
            // store-groups: L0=storeGroups, L1=storeCategories, L2=itemGroups, L3=itemCategories
            // item-groups: L0=itemGroups, L1=itemCategories
            // item-categories: L0=itemCategories
            if (donutViewMode === 'store-categories') {
                if (treemapDrillDownLevel === 1) type = 'item-group';
                else if (treemapDrillDownLevel >= 2) type = 'item-category';
            } else if (donutViewMode === 'store-groups') {
                if (treemapDrillDownLevel === 1) type = 'store-category';
                else if (treemapDrillDownLevel === 2) type = 'item-group';
                else type = 'item-category';
            } else if (donutViewMode === 'item-groups') {
                if (treemapDrillDownLevel >= 1) type = 'item-category';
            }
        }

        // Story 14.44: Get contrasting text color for popup header/button
        const fgColor = getContrastTextColor(color);

        setStatsPopupCategory({ name: categoryName, emoji, color, fgColor, type });
        setStatsPopupOpen(true);
    }, [donutViewMode, treemapDrillDownLevel]);

    // Story 14.40: Close statistics popup
    const handleCloseStatsPopup = useCallback(() => {
        setStatsPopupOpen(false);
        setStatsPopupCategory(null);
    }, []);

    // Story 14.40: Navigate to history from statistics popup
    const handleStatsPopupViewHistory = useCallback(() => {
        if (!onNavigateToHistory || !statsPopupCategory) return;

        const payload: HistoryNavigationPayload = {
            targetView: statsPopupCategory.type.startsWith('item') ? 'items' : 'history',
        };

        // Set the appropriate filter based on category type
        switch (statsPopupCategory.type) {
            case 'store-category':
                payload.category = statsPopupCategory.name;
                break;
            case 'store-group':
                payload.storeGroup = statsPopupCategory.name;
                break;
            case 'item-category':
                payload.itemCategory = statsPopupCategory.name;
                break;
            case 'item-group':
                payload.itemGroup = statsPopupCategory.name;
                break;
        }

        // Add temporal filter
        payload.temporal = {
            level: timePeriod,
            year: currentPeriod.year.toString(),
            month: `${currentPeriod.year}-${currentPeriod.month.toString().padStart(2, '0')}`,
            quarter: `Q${currentPeriod.quarter}`,
        };

        handleCloseStatsPopup();
        onNavigateToHistory(payload);
    }, [onNavigateToHistory, statsPopupCategory, timePeriod, currentPeriod, handleCloseStatsPopup]);

    // Calculate statistics for the selected category (if popup is open)
    const categoryStatistics = useCategoryStatistics({
        transactions: filteredTransactions,
        categoryName: statsPopupCategory?.name ?? '',
        categoryType: statsPopupCategory?.type ?? 'store-category',
        totalSpentAllCategories: total,
    });

    // Get translated category name for popup display
    const getTranslatedCategoryName = useCallback((name: string, type: CategoryFilterType): string => {
        const lang = sanitizeLocale(locale);
        if (type === 'store-category') {
            return translateCategory(name, lang);
        } else if (type === 'store-group') {
            return translateStoreCategoryGroup(name, lang);
        } else if (type === 'item-category') {
            return translateCategory(name, lang);
        } else if (type === 'item-group') {
            if (ALL_ITEM_CATEGORY_GROUPS.includes(name as ItemCategoryGroup)) {
                return translateItemCategoryGroup(name as ItemCategoryGroup, lang);
            }
            return name;
        }
        return name;
    }, [locale]);

    return {
        statsPopupOpen,
        statsPopupCategory,
        handleOpenStatsPopup,
        handleCloseStatsPopup,
        handleStatsPopupViewHistory,
        categoryStatistics,
        getTranslatedCategoryName,
    };
}
