/**
 * TrendsView Types
 *
 * Story 15-5b: Extracted from TrendsView.tsx
 *
 * Shared types used across TrendsView helper functions, sub-components,
 * and the main TrendsView component.
 */

/** Time period granularity for pills */
export type TimePeriod = 'week' | 'month' | 'quarter' | 'year';

/** Current period state */
export interface CurrentPeriod {
    year: number;
    month: number;
    quarter: number;
    week: number;
}

/** Carousel slide index */
// 0 = Distribution, 1 = Tendencia
export type CarouselSlide = 0 | 1;

/** View toggle state per slide */
export type DistributionView = 'treemap' | 'donut';
export type TendenciaView = 'list' | 'sankey';

/**
 * Story 14.14b: Donut chart view mode - controls what data level is displayed
 * - 'store-groups': Transaction category groups (Essential, Lifestyle, etc.)
 * - 'store-categories': Transaction categories (Supermercado, Restaurante, etc.) - DEFAULT
 * - 'item-groups': Item category groups (Fresh Food, Packaged Food, etc.)
 * - 'item-categories': Item categories (Carnes y Mariscos, Lácteos, etc.)
 */
export type DonutViewMode = 'store-groups' | 'store-categories' | 'item-groups' | 'item-categories';

/** Category data for treemap/charts */
export interface CategoryData {
    name: string;
    value: number;
    count: number;  // Transaction count
    itemCount: number;  // Story 14.13 Session 5: Item/product count for count mode toggle
    color: string;
    fgColor: string;  // Story 14.21: Foreground color for text contrast
    percent: number;
    categoryCount?: number;  // Number of categories aggregated (only for "Más" group)
    transactionIds?: Set<string>;  // Story 14.14b Session 6: Track unique transactions
}

/** Trend data with sparkline */
export interface TrendData extends CategoryData {
    sparkline: number[];
    change: number;
    /** Story 14.13.2: Period comparison fields */
    previousValue?: number;
    changeDirection?: 'up' | 'down' | 'same' | 'new';
}

// DrillDownPath and HistoryNavigationPayload live in @/types/navigation.ts (canonical)
// Import from there, not from this file.
