/**
 * Story 14e-25d: useHistoryNavigation Hook
 *
 * Provides the handleNavigateToHistory function for analytics-to-history navigation.
 * This replaces the function previously provided via ViewHandlersContext.navigation.
 *
 * Used by: TrendsView, DashboardView for drill-down navigation to HistoryView/ItemsView.
 *
 * @example
 * ```tsx
 * const { handleNavigateToHistory } = useHistoryNavigation();
 * handleNavigateToHistory({
 *   category: 'Food',
 *   temporal: { level: 'month', year: 2026, month: 1 },
 *   targetView: 'history'
 * });
 * ```
 */

import { useCallback } from 'react';
import { useNavigationActions } from '@/shared/stores';
import type { HistoryFilterState, TemporalFilterState } from '@/types/historyFilters';
import type { HistoryNavigationPayload } from '@/types/navigation';
import {
    expandStoreCategoryGroup,
    expandItemCategoryGroup,
    type StoreCategoryGroup,
    type ItemCategoryGroup,
} from '@/config/categoryColors';

/**
 * Hook providing analytics-to-history navigation with filter building.
 *
 * @returns Object with handleNavigateToHistory function
 */
export function useHistoryNavigation() {
    const {
        setView,
        setPendingHistoryFilters,
        setPendingDistributionView,
    } = useNavigationActions();

    /**
     * Navigate from Analytics to History/Items with pre-applied filters.
     * Builds filter state from the payload and stores it for consumption by the target view.
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
        setView(targetView);
    }, [setView, setPendingHistoryFilters, setPendingDistributionView]);

    return { handleNavigateToHistory };
}
