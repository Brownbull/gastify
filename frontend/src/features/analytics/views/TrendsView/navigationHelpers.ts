/**
 * Navigation Helpers
 *
 * Story 15-TD-5b: Extracted from TrendsView.tsx
 *
 * Pure functions that build HistoryNavigationPayload objects for
 * treemap cell clicks and trend list count clicks.
 *
 * These are pure functions with no React dependencies.
 */

import {
    expandStoreCategoryGroup,
    expandItemCategoryGroup,
    type StoreCategoryGroup,
    type ItemCategoryGroup,
} from '@/config/categoryColors';
import type { HistoryNavigationPayload, DrillDownPath } from '@/types/navigation';
import type { DonutViewMode, TimePeriod, CurrentPeriod, CategoryData } from './types';

/**
 * Determines the current display mode based on base view mode and treemap drill-down level.
 *
 * Drill-down structure depends on base viewMode:
 * - store-categories: L0=storeCategories, L1=itemGroups, L2=itemCategories, L3=subcategories
 * - store-groups: L0=storeGroups, L1=storeCategories, L2=itemGroups, L3=itemCategories
 * - item-groups: L0=itemGroups, L1=itemCategories, L2=subcategories
 * - item-categories: L0=itemCategories, L1=subcategories
 */
export function getDisplayModeAtDrillLevel(
    donutViewMode: DonutViewMode,
    drillDownLevel: number,
): 'store-groups' | 'store-categories' | 'item-groups' | 'item-categories' | 'subcategories' {
    if (drillDownLevel === 0) return donutViewMode;

    if (donutViewMode === 'store-categories') {
        if (drillDownLevel === 1) return 'item-groups';
        if (drillDownLevel === 2) return 'item-categories';
        return 'subcategories';
    }
    if (donutViewMode === 'store-groups') {
        if (drillDownLevel === 1) return 'store-categories';
        if (drillDownLevel === 2) return 'item-groups';
        if (drillDownLevel === 3) return 'item-categories';
        return 'subcategories';
    }
    if (donutViewMode === 'item-groups') {
        if (drillDownLevel === 1) return 'item-categories';
        return 'subcategories';
    }
    // item-categories
    return 'subcategories';
}

/**
 * Story 15-TD-5b: Variant of getDisplayModeAtDrillLevel that returns DonutViewMode.
 * At the subcategories level, returns 'item-categories' (the closest DonutViewMode).
 * Used by treemap and trend list to determine emoji/translation lookup mode.
 */
export function getDonutViewModeAtDrillLevel(
    donutViewMode: DonutViewMode,
    drillDownLevel: number,
): DonutViewMode {
    const mode = getDisplayModeAtDrillLevel(donutViewMode, drillDownLevel);
    return mode === 'subcategories' ? 'item-categories' : mode;
}

/**
 * Get max drill-down level for a given view mode.
 * Used by both treemap and trend drill-down logic.
 */
export function getMaxDrillDownLevel(donutViewMode: DonutViewMode): number {
    switch (donutViewMode) {
        case 'store-groups':
            return 3;
        case 'store-categories':
            return 3;
        case 'item-groups':
            return 2;
        case 'item-categories':
            return 1;
        default:
            return 3;
    }
}

/**
 * Populates parent context in a DrillDownPath based on view mode hierarchy.
 */
function populateParentPath(
    drillDownPath: string[],
    donutViewMode: DonutViewMode,
    target: DrillDownPath
): void {
    switch (donutViewMode) {
        case 'store-categories':
            if (drillDownPath[0]) target.storeCategory = drillDownPath[0];
            if (drillDownPath[1]) target.itemGroup = drillDownPath[1];
            if (drillDownPath[2]) target.itemCategory = drillDownPath[2];
            break;
        case 'store-groups':
            if (drillDownPath[0]) target.storeGroup = drillDownPath[0];
            if (drillDownPath[1]) target.storeCategory = drillDownPath[1];
            if (drillDownPath[2]) target.itemGroup = drillDownPath[2];
            if (drillDownPath[3]) target.itemCategory = drillDownPath[3];
            break;
        case 'item-groups':
            if (drillDownPath[0]) target.itemGroup = drillDownPath[0];
            if (drillDownPath[1]) target.itemCategory = drillDownPath[1];
            break;
        case 'item-categories':
            if (drillDownPath[0]) target.itemCategory = drillDownPath[0];
            break;
    }
}

/**
 * Applies category/group filter and "Mas" expansion to a navigation payload.
 */
function applyCategoryFilter(
    payload: HistoryNavigationPayload,
    displayMode: 'store-groups' | 'store-categories' | 'item-groups' | 'item-categories' | 'subcategories',
    categoryName: string,
    isAggregatedGroup: boolean,
    otroCategories: CategoryData[],
    drillDownPathObj: DrillDownPath,
): void {
    if (displayMode === 'store-categories') {
        if (isAggregatedGroup && otroCategories.length > 0) {
            payload.category = otroCategories.map(c => c.name).join(',');
        } else {
            drillDownPathObj.storeCategory = categoryName;
            payload.category = categoryName;
        }
    } else if (displayMode === 'store-groups') {
        if (isAggregatedGroup && otroCategories.length > 0) {
            const allCategories = otroCategories.flatMap(c =>
                expandStoreCategoryGroup(c.name as StoreCategoryGroup)
            );
            payload.category = allCategories.join(',');
        } else {
            drillDownPathObj.storeGroup = categoryName;
            payload.storeGroup = categoryName;
        }
    } else if (displayMode === 'item-groups') {
        if (isAggregatedGroup && otroCategories.length > 0) {
            const allItemCategories = otroCategories.flatMap(c =>
                expandItemCategoryGroup(c.name as ItemCategoryGroup)
            );
            payload.itemCategory = allItemCategories.join(',');
        } else {
            drillDownPathObj.itemGroup = categoryName;
            payload.itemGroup = categoryName;
        }
    } else if (displayMode === 'item-categories') {
        if (isAggregatedGroup && otroCategories.length > 0) {
            payload.itemCategory = otroCategories.map(c => c.name).join(',');
        } else {
            drillDownPathObj.itemCategory = categoryName;
            payload.itemCategory = categoryName;
        }
    }
    // 'subcategories' case: handled separately by callers (treemap adds subcategory to path)
}

/**
 * Appends a temporal filter section to a navigation payload.
 */
function applyTemporalFilter(
    payload: HistoryNavigationPayload,
    timePeriod: TimePeriod,
    currentPeriod: CurrentPeriod,
): void {
    payload.temporal = {
        level: timePeriod,
        year: String(currentPeriod.year),
    };
    if (timePeriod === 'month' || timePeriod === 'week') {
        payload.temporal.month = `${currentPeriod.year}-${String(currentPeriod.month).padStart(2, '0')}`;
    }
    if (timePeriod === 'quarter') {
        payload.temporal.quarter = `Q${currentPeriod.quarter}`;
    }
}

// ============================================================================
// Treemap Navigation Payload
// ============================================================================

export interface BuildTreemapNavPayloadArgs {
    categoryName: string;
    countMode: 'transactions' | 'items';
    donutViewMode: DonutViewMode;
    timePeriod: TimePeriod;
    currentPeriod: CurrentPeriod;
    treemapDrillDownLevel: number;
    treemapDrillDownPath: string[];
    otroCategories: CategoryData[];
}

/**
 * Story 14.22 / 14.13 Session 19: Build treemap navigation payload.
 * Returns null if nothing to navigate to.
 */
export function buildTreemapNavigationPayload(args: BuildTreemapNavPayloadArgs): HistoryNavigationPayload {
    const {
        categoryName, countMode, donutViewMode, timePeriod, currentPeriod,
        treemapDrillDownLevel, treemapDrillDownPath, otroCategories,
    } = args;

    const payload: HistoryNavigationPayload = {
        targetView: countMode === 'items' ? 'items' : 'history',
    };

    const isAggregatedGroup = categoryName === 'M\u00e1s' || categoryName === 'More';
    const currentDisplayMode = getDisplayModeAtDrillLevel(donutViewMode, treemapDrillDownLevel);

    // Set the appropriate filter based on current display mode (NOT base viewMode)
    const treemapPath: DrillDownPath = {};

    // Apply category filter (modifies payload and treemapPath)
    applyCategoryFilter(payload, currentDisplayMode, categoryName, isAggregatedGroup, otroCategories, treemapPath);

    // For subcategories display mode, category is in drillDownPath.subcategory (no payload filter)

    // Build drillDownPath including parent path when drilled down
    if (!isAggregatedGroup) {
        // Add parent context from drill-down path
        if (treemapDrillDownLevel > 0 && treemapDrillDownPath.length > 0) {
            populateParentPath(treemapDrillDownPath, donutViewMode, treemapPath);
        }

        // Add current clicked category to the appropriate level
        if (currentDisplayMode === 'store-groups') {
            treemapPath.storeGroup = categoryName;
        } else if (currentDisplayMode === 'store-categories') {
            treemapPath.storeCategory = categoryName;
        } else if (currentDisplayMode === 'item-groups') {
            treemapPath.itemGroup = categoryName;
        } else if (currentDisplayMode === 'item-categories') {
            treemapPath.itemCategory = categoryName;
        } else if (currentDisplayMode === 'subcategories') {
            treemapPath.subcategory = categoryName;
        }

        if (Object.keys(treemapPath).length > 0) {
            payload.drillDownPath = treemapPath;
        }
    }

    // Temporal filter
    applyTemporalFilter(payload, timePeriod, currentPeriod);

    // Source distribution view
    payload.sourceDistributionView = 'treemap';

    return payload;
}

// ============================================================================
// Trend Navigation Payload
// ============================================================================

export interface BuildTrendNavPayloadArgs {
    categoryName: string;
    countMode: 'transactions' | 'items';
    donutViewMode: DonutViewMode;
    effectiveViewMode: DonutViewMode;
    timePeriod: TimePeriod;
    currentPeriod: CurrentPeriod;
    trendDrillDownLevel: number;
    trendDrillDownPath: string[];
    otroTrendCategories: CategoryData[];
}

/**
 * Story 14.13.2: Build trend count click navigation payload.
 */
export function buildTrendNavigationPayload(args: BuildTrendNavPayloadArgs): HistoryNavigationPayload {
    const {
        categoryName, countMode, donutViewMode, effectiveViewMode, timePeriod, currentPeriod,
        trendDrillDownLevel, trendDrillDownPath, otroTrendCategories,
    } = args;

    const payload: HistoryNavigationPayload = {
        targetView: countMode === 'items' ? 'items' : 'history',
        sourceDistributionView: 'treemap', // Using treemap as source for Tendencia
    };

    const isAggregatedGroup = categoryName === 'M\u00e1s' || categoryName === 'More';
    const trendPath: DrillDownPath = {};

    // Add parent context from drill-down path based on view mode hierarchy
    if (trendDrillDownLevel > 0 && trendDrillDownPath.length > 0) {
        populateParentPath(trendDrillDownPath, donutViewMode, trendPath);
    }

    // Apply category filter using effective view mode
    applyCategoryFilter(payload, effectiveViewMode, categoryName, isAggregatedGroup, otroTrendCategories, trendPath);

    // Include drillDownPath if we have any accumulated context (skip for aggregated groups)
    if (!isAggregatedGroup && Object.keys(trendPath).length > 0) {
        payload.drillDownPath = trendPath;
    }

    // Temporal filter
    applyTemporalFilter(payload, timePeriod, currentPeriod);

    return payload;
}
