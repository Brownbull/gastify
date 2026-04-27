/**
 * Story 15b-2d: Pure filter functions extracted from ItemsView.tsx
 * All functions are pure TypeScript — NO React imports.
 * Internal to the ItemsView directory — NOT exported from the feature barrel.
 */

import { normalizeItemCategory } from '@/utils/categoryNormalizer';
import {
    expandStoreCategoryGroup,
    expandItemCategoryGroup,
    getItemCategoryGroup,
    getStoreCategoryGroup,
    type StoreCategoryGroup,
    type ItemCategoryGroup,
} from '@/config/categoryColors';
import type { StoreCategory } from '../../../../../shared/schema/categories';
import type { FlattenedItem } from '@/types/item';
import type { TemporalFilterState, CategoryFilterState } from '@/types/historyFilters';

//Temporal Date Range Computation
interface DateRange {
    start: string;
    end: string;
}

/**
 * Converts a temporal filter state into a start/end date range.
 * Returns undefined if no temporal filter is active (level === 'all' or no relevant fields set).
 */
export function computeTemporalDateRange(temporal: TemporalFilterState): DateRange | undefined {
    // Handle explicit date range (from Reports navigation)
    if (temporal.dateRange) {
        return { start: temporal.dateRange.start, end: temporal.dateRange.end };
    }

    // Year filter
    if (temporal.level === 'year' && temporal.year) {
        return {
            start: `${temporal.year}-01-01`,
            end: `${temporal.year}-12-31`,
        };
    }

    // Quarter filter
    if (temporal.level === 'quarter' && temporal.year && temporal.quarter) {
        const qNum = parseInt(temporal.quarter.replace('Q', ''), 10);
        const startMonth = (qNum - 1) * 3 + 1;
        const endMonth = qNum * 3;
        const lastDay = new Date(parseInt(temporal.year, 10), endMonth, 0).getDate();
        return {
            start: `${temporal.year}-${String(startMonth).padStart(2, '0')}-01`,
            end: `${temporal.year}-${String(endMonth).padStart(2, '0')}-${lastDay}`,
        };
    }

    // Month filter
    if (temporal.level === 'month' && temporal.month) {
        const [year, month] = temporal.month.split('-');
        const lastDay = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
        return {
            start: `${temporal.month}-01`,
            end: `${temporal.month}-${String(lastDay).padStart(2, '0')}`,
        };
    }

    // Week filter
    if (temporal.level === 'week' && temporal.month && temporal.week !== undefined) {
        const [year, month] = temporal.month.split('-');
        const daysInMonth = new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate();
        const weekStartDay = (temporal.week - 1) * 7 + 1;
        const weekEndDay = Math.min(temporal.week * 7, daysInMonth);
        return {
            start: `${temporal.month}-${String(weekStartDay).padStart(2, '0')}`,
            end: `${temporal.month}-${String(weekEndDay).padStart(2, '0')}`,
        };
    }

    // Day filter
    if (temporal.level === 'day' && temporal.day) {
        return { start: temporal.day, end: temporal.day };
    }

    return undefined;
}

//Drill-Down Filtering (multi-dimension)
/**
 * Applies drill-down path filters when navigating from TrendsView.
 * Handles storeCategory, storeGroup, itemGroup, itemCategory, and subcategory.
 */
export function applyDrillDownFilters(
    items: FlattenedItem[],
    drillDownPath: NonNullable<CategoryFilterState['drillDownPath']>,
): FlattenedItem[] {
    let result = items;

    // Apply store category filter (supports multi-select via comma-separated)
    if (drillDownPath.storeCategory) {
        const selectedStoreCategories = drillDownPath.storeCategory.includes(',')
            ? drillDownPath.storeCategory.split(',').map(c => c.trim().toLowerCase())
            : [drillDownPath.storeCategory.toLowerCase()];
        result = result.filter(item => {
            const itemCategoryLower = item.merchantCategory?.toLowerCase();
            return selectedStoreCategories.some(cat => cat === itemCategoryLower);
        });
    }

    // Apply store group filter (expand to all categories in group)
    // Only if storeCategory is not set (storeCategory is more specific)
    if (drillDownPath.storeGroup && !drillDownPath.storeCategory) {
        const targetGroup = drillDownPath.storeGroup as StoreCategoryGroup;

        if (targetGroup === 'otros') {
            result = result.filter(item => {
                const storeGroup = getStoreCategoryGroup(item.merchantCategory as StoreCategory);
                return storeGroup === 'otros';
            });
        } else {
            const groupCategories = expandStoreCategoryGroup(targetGroup);
            result = result.filter(item =>
                groupCategories.some(cat =>
                    item.merchantCategory === cat ||
                    item.merchantCategory?.toLowerCase() === cat.toLowerCase()
                )
            );
        }
    }

    // Apply item group filter (expand to all item categories in group)
    // Only if itemCategory is not set (itemCategory is more specific)
    if (drillDownPath.itemGroup && !drillDownPath.itemCategory) {
        const targetGroup = drillDownPath.itemGroup as ItemCategoryGroup;

        if (targetGroup === 'otros-item') {
            result = result.filter(item => {
                const normalizedCategory = normalizeItemCategory(item.category || 'Other');
                const itemGroup = getItemCategoryGroup(normalizedCategory);
                return itemGroup === 'otros-item';
            });
        } else {
            const itemCategories = expandItemCategoryGroup(targetGroup);
            result = result.filter(item => {
                const normalizedCategory = normalizeItemCategory(item.category || 'Other').toLowerCase();
                return itemCategories.some(cat => cat.toLowerCase() === normalizedCategory);
            });
        }
    }

    // Apply item category filter (supports multi-select via comma-separated)
    if (drillDownPath.itemCategory) {
        const selectedItemCategories = drillDownPath.itemCategory.includes(',')
            ? drillDownPath.itemCategory.split(',').map(c => c.trim().toLowerCase())
            : [drillDownPath.itemCategory.toLowerCase()];
        result = result.filter(item => {
            const normalizedCategory = normalizeItemCategory(item.category || 'Other').toLowerCase();
            return selectedItemCategories.some(cat => cat === normalizedCategory);
        });
    }

    // Apply subcategory filter
    if (drillDownPath.subcategory) {
        result = result.filter(item =>
            item.subcategory === drillDownPath.subcategory ||
            item.subcategory?.toLowerCase() === drillDownPath.subcategory?.toLowerCase()
        );
    }

    return result;
}

//Legacy Category Filtering (single-dimension)
/**
 * Applies legacy single-dimension category filters when drillDownPath is not present.
 * Handles group-level and category-level filtering.
 */
export function applyLegacyCategoryFilters(
    items: FlattenedItem[],
    categoryState: CategoryFilterState,
): FlattenedItem[] {
    let result = items;

    // Item category filter (group = item categories like "Carnes", "Lacteos")
    if (categoryState.level === 'group' && categoryState.group) {
        const selectedGroups = categoryState.group.split(',').map(g => g.trim().toLowerCase());
        result = result.filter(item => {
            const normalizedCategory = normalizeItemCategory(item.category || 'Other').toLowerCase();
            return selectedGroups.some(group =>
                normalizedCategory === group ||
                item.subcategory?.toLowerCase() === group ||
                normalizedCategory.includes(group)
            );
        });
    }

    // Store category filter (filter items by parent transaction's store category)
    if (categoryState.level === 'category' && categoryState.category) {
        const selectedStoreCategories = categoryState.category.split(',').map(c => c.trim());
        result = result.filter(item => {
            return selectedStoreCategories.some(storeCategory =>
                item.merchantCategory === storeCategory ||
                item.merchantCategory?.toLowerCase().includes(storeCategory.toLowerCase())
            );
        });
    }

    return result;
}

//Composed Filter Pipeline
/**
 * Applies all item filters in sequence: temporal date range → category (drill-down or legacy).
 * This is the main entry point used by ItemsView's filteredItems useMemo.
 *
 * Parameters are kept granular (temporal, category) instead of the full filterState
 * to maintain correct React memoization dependencies.
 */
export function applyAllItemsFilters(
    baseItems: FlattenedItem[],
    temporal: TemporalFilterState,
    category: CategoryFilterState,
): FlattenedItem[] {
    let result = baseItems;

    // Apply temporal date range filter
    const dateRange = computeTemporalDateRange(temporal);
    if (dateRange) {
        result = result.filter(item => {
            const itemDate = item.transactionDate;
            return itemDate >= dateRange.start && itemDate <= dateRange.end;
        });
    }

    // Apply category filters (drill-down or legacy)
    if (category.drillDownPath) {
        result = applyDrillDownFilters(result, category.drillDownPath);
    } else {
        result = applyLegacyCategoryFilters(result, category);
    }

    return result;
}
