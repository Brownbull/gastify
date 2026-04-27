/**
 * Drill-Down Helpers
 *
 * Story 15-TD-5b: Extracted from TrendsView.tsx
 *
 * Pure functions for computing drill-down category data based on
 * view mode, drill-down level, and path. Used by both treemap
 * and tendencia slides.
 */

import { STORE_CATEGORY_GROUPS } from '@/config/categoryColors';
import type { Transaction } from '@/types/transaction';
import {
    computeSubcategoryData,
    computeItemGroupsForStore,
    computeItemCategoriesInGroup,
    computeAllCategoryData,
} from './aggregationHelpers';
import type { DonutViewMode, CategoryData } from './types';

/**
 * Resolves drill-down categories for any view mode, level, and path.
 *
 * This is the common drill-down resolution logic shared by both
 * the treemap slide and the tendencia slide. Given a set of transactions,
 * a view mode, drill level, and path, it returns the appropriate
 * CategoryData[] for that level.
 *
 * @param transactions The transactions to aggregate from
 * @param donutViewMode The base view mode
 * @param drillDownLevel The current drill-down depth (0 = none)
 * @param drillDownPath The accumulated path names
 * @param allCategoryData Pre-computed top-level store categories (for store-groups L1 filter)
 */
export function resolveDrillDownCategories(
    transactions: Transaction[],
    donutViewMode: DonutViewMode,
    drillDownLevel: number,
    drillDownPath: string[],
    allCategoryData?: CategoryData[],
): CategoryData[] {
    if (drillDownLevel === 0) return [];

    const path = drillDownPath;

    if (donutViewMode === 'store-categories') {
        if (drillDownLevel === 1 && path[0]) {
            return computeItemGroupsForStore(transactions, path[0]);
        } else if (drillDownLevel === 2 && path[1] && path[0]) {
            return computeItemCategoriesInGroup(transactions, path[1], path[0]);
        } else if (drillDownLevel === 3 && path[2]) {
            return computeSubcategoryData(transactions, path[2]);
        }
    }

    if (donutViewMode === 'store-groups') {
        if (drillDownLevel === 1 && path[0]) {
            // Level 1: Store categories in this store group
            const categorySource = allCategoryData ?? computeAllCategoryData(transactions);
            return categorySource.filter(cat => {
                const catGroup = STORE_CATEGORY_GROUPS[cat.name as keyof typeof STORE_CATEGORY_GROUPS];
                return catGroup === path[0];
            });
        } else if (drillDownLevel === 2 && path[1]) {
            return computeItemGroupsForStore(transactions, path[1]);
        } else if (drillDownLevel === 3 && path[2] && path[1]) {
            return computeItemCategoriesInGroup(transactions, path[2], path[1]);
        }
    }

    if (donutViewMode === 'item-groups') {
        if (drillDownLevel === 1 && path[0]) {
            return computeItemCategoriesInGroup(transactions, path[0]);
        } else if (drillDownLevel === 2 && path[1]) {
            return computeSubcategoryData(transactions, path[1]);
        }
    }

    if (donutViewMode === 'item-categories') {
        if (drillDownLevel === 1 && path[0]) {
            return computeSubcategoryData(transactions, path[0]);
        }
    }

    return [];
}
