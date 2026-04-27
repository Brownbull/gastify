/**
 * TrendsView Helpers — Barrel Re-export
 *
 * Story 15-TD-5: Split into 3 files by concern.
 * This file re-exports everything for backward compatibility.
 *
 * @see periodHelpers.ts — Constants, period labels, currency formatting, filtering
 * @see aggregationHelpers.ts — Category data computation from transactions
 * @see treemapHelpers.ts — Treemap display grouping, trend category grouping
 */

// Period & formatting
export {
    MONTH_NAMES_ES,
    MONTH_NAMES_EN,
    CAROUSEL_TITLES_BASE,
    getPeriodLabel,
    formatShortCurrency,
    filterByPeriod,
} from './periodHelpers';

// Category aggregation
export {
    computeAllCategoryData,
    computeItemCategoryData,
    computeSubcategoryData,
    computeItemGroupsForStore,
    computeItemCategoriesInGroup,
} from './aggregationHelpers';

// Treemap & trend grouping
export {
    computeTreemapCategories,
    computeTrendCategories,
} from './treemapHelpers';
