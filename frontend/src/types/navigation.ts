/**
 * Navigation Types — Shared across analytics, history, and scan features
 *
 * These types define the contract for cross-feature navigation payloads.
 * Extracted from analyticsToHistoryFilters.ts to avoid shared -> features
 * upward dependency in Feature-Sliced Design.
 *
 * Story 9.20: Analytics Transaction Count & History Navigation
 * Story 14.13a: Multi-level drill-down filter support
 */

/**
 * Story 14.13a: Drill-down path structure for multi-level filter preservation.
 * Contains accumulated context from analytics drill-down navigation.
 */
export interface DrillDownPath {
  /** Store category group (e.g., "supermercados") */
  storeGroup?: string;
  /** Store category (e.g., "Supermercado") */
  storeCategory?: string;
  /** Item category group (e.g., "food-fresh") */
  itemGroup?: string;
  /** Item category (e.g., "Carnes y Mariscos") */
  itemCategory?: string;
  /** Subcategory (e.g., "Res") */
  subcategory?: string;
}

/**
 * Payload structure for navigating to History with pre-applied filters.
 * Used by DrillDownGrid to communicate filter intent to parent components.
 *
 * Story 14.13 Session 5: Extended to support item-based navigation
 * Story 14.13a: Extended to support multi-level drill-down filters
 */
export interface HistoryNavigationPayload {
  /** Store category filter (e.g., "Supermarket", "Restaurant", or comma-separated list) */
  category?: string;
  /** Store category group filter (e.g., "Essentials", "Entertainment") */
  storeGroup?: string;
  /** Item category group filter (e.g., "Produce", "Beverages") */
  itemGroup?: string;
  /** Item category/subcategory filter (e.g., "Fruits", "Soft Drinks") */
  itemCategory?: string;
  /** Temporal filter with level and period values */
  temporal?: {
    level: string;
    year?: string;
    month?: string;
    quarter?: string;
  };
  /**
   * Story 14.13a: Full drill-down path for multi-dimension filtering.
   * When present, allows filtering by multiple dimensions simultaneously.
   */
  drillDownPath?: DrillDownPath;
  /**
   * Story 14.13 Session 5: Target view for navigation.
   * - 'history': Navigate to Compras (transaction list)
   * - 'items': Navigate to Productos (item list)
   */
  targetView?: 'history' | 'items';
  /**
   * Story 14.13 Session 7: Source distribution view for back navigation.
   * Allows restoring drill-down position when navigating back.
   */
  sourceDistributionView?: 'donut' | 'treemap';
}
