/**
 * Story 14e-25d: useHistoryNavigation Hook
 *
 * Provides the handleNavigateToHistory function for analytics-to-history navigation.
 * Navigates via TanStack Router with filter state encoded in URL search params.
 *
 * Used by: TrendsView, DashboardView for drill-down navigation to HistoryView/ItemsView.
 */

import { useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { historyFilterToSearchParams } from '@/lib/searchParamSerializers';
import type { HistoryFilterState, TemporalFilterState } from '@/types/historyFilters';
import type { HistoryNavigationPayload } from '@/types/navigation';
import {
    expandStoreCategoryGroup,
    expandItemCategoryGroup,
    type StoreCategoryGroup,
    type ItemCategoryGroup,
} from '@/config/categoryColors';

export function useHistoryNavigation() {
    const navigate = useNavigate();

    const handleNavigateToHistory = useCallback((payload: HistoryNavigationPayload) => {
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

        const searchParams = historyFilterToSearchParams(
            filterState,
            payload.sourceDistributionView,
        );
        const targetPath = payload.targetView === 'items' ? '/items' : '/history';
        navigate({ to: targetPath, search: searchParams });
    }, [navigate]);

    return { handleNavigateToHistory };
}
