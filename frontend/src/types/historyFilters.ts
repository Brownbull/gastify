/**
 * History Filter Types — Story 15-TD-7
 *
 * Canonical location for all history filter types, extracted from HistoryFiltersContext.
 * These types are consumed by the Zustand store, hooks, utils, and UI components.
 *
 * @see src/shared/stores/useHistoryFiltersStore.ts (state management)
 * @see src/shared/hooks/useHistoryFilters.ts (consumer hook)
 */

// ============================================================================
// Filter State Types
// ============================================================================

/**
 * Temporal filter state for filtering by time period.
 * Hierarchical: All -> Year -> Quarter -> Month -> Week -> Day
 * Story 9.19: Initial implementation (Year -> Month -> Week -> Day)
 * Story 9.20: Added quarter level for analytics navigation
 */
export interface TemporalFilterState {
    level: 'all' | 'year' | 'quarter' | 'month' | 'week' | 'day';
    year?: string;      // "2024"
    quarter?: string;   // "Q1", "Q2", "Q3", "Q4" (Story 9.20)
    month?: string;     // "2024-12"
    week?: number;      // 1-5 (week within month)
    day?: string;       // "2024-12-15"
    /** Story 14.16: Date range for ISO week filtering (used by Reports navigation) */
    dateRange?: { start: string; end: string }; // "2024-12-30" format
}

/**
 * Category filter state for filtering by spending category.
 * Hierarchical: All -> Store Category -> Item Group -> Subcategory
 *
 * Story 14.13a: Extended to support multi-level drill-down filters.
 * - drillDownPath: Accumulated context from analytics drill-down navigation
 * - Allows filtering by store category AND item group simultaneously
 */
export interface CategoryFilterState {
    level: 'all' | 'category' | 'group' | 'subcategory';
    category?: string;    // Store category (e.g., "Supermarket")
    group?: string;       // Item group (e.g., "Produce")
    subcategory?: string; // Item subcategory (e.g., "Fruits")

    /**
     * Story 14.13a: Accumulated drill-down path from TrendsView navigation.
     * Contains all filter dimensions from the drill-down hierarchy.
     * When present, enables multi-dimension filtering (e.g., items in "Supermercado" + "Alimentos Frescos").
     */
    drillDownPath?: {
        storeGroup?: string;     // Store category group (e.g., "supermercados")
        storeCategory?: string;  // Store category (e.g., "Supermercado")
        itemGroup?: string;      // Item category group (e.g., "food-fresh")
        itemCategory?: string;   // Item category (e.g., "Carnes y Mariscos")
        subcategory?: string;    // Subcategory (e.g., "Res")
    };
}

/**
 * Location filter state for filtering by country/city.
 * Two-level hierarchy: Country -> City
 *
 * Story 14.36: Extended to support multi-select cities from multiple countries.
 * - selectedCities: Comma-separated city codes (e.g., "santiago,mendoza,lima")
 * - When selectedCities is present, it takes priority over legacy city field
 * - country field is used for display purposes (primary country)
 */
export interface LocationFilterState {
    country?: string;   // "Chile" - Primary country for display
    city?: string;      // "Santiago" - Legacy single-city selection
    /** Story 14.36: Comma-separated city codes for multi-select */
    selectedCities?: string;
}

/**
 * Complete history filter state.
 */
export interface HistoryFilterState {
    temporal: TemporalFilterState;
    category: CategoryFilterState;
    location: LocationFilterState;
}

/**
 * Filter actions for the history reducer.
 */
export type HistoryFilterAction =
    | { type: 'SET_TEMPORAL_FILTER'; payload: TemporalFilterState }
    | { type: 'SET_CATEGORY_FILTER'; payload: CategoryFilterState }
    | { type: 'SET_LOCATION_FILTER'; payload: LocationFilterState }
    | { type: 'CLEAR_TEMPORAL' }
    | { type: 'CLEAR_CATEGORY' }
    | { type: 'CLEAR_LOCATION' }
    | { type: 'CLEAR_ALL_FILTERS' };

