/**
 * Analytics Navigation Types
 *
 * Defines the type system for dual-axis navigation (temporal + category)
 * in the analytics views. All navigation state flows through useAnalyticsStore.
 *
 * @see Story 15b-3f: Migrated from AnalyticsContext to Zustand store
 */

// ============================================================================
// Temporal Hierarchy Types
// ============================================================================

/**
 * Temporal hierarchy levels for analytics navigation.
 * Users can drill down: Year → Quarter → Month → Week → Day
 */
export type TemporalLevel = 'year' | 'quarter' | 'month' | 'week' | 'day';

/**
 * Temporal position in the navigation hierarchy.
 * Each level builds on the previous - e.g., week requires month to be set.
 */
export interface TemporalPosition {
  level: TemporalLevel;
  year: string;              // "2024"
  quarter?: string;          // "Q1" | "Q2" | "Q3" | "Q4"
  month?: string;            // "2024-10" (YYYY-MM format)
  week?: number;             // 1-5 (week index within month, month-aligned chunks)
  day?: string;              // "2024-10-15" (YYYY-MM-DD format)
}

// ============================================================================
// Category Hierarchy Types
// ============================================================================

/**
 * Category hierarchy levels for analytics filtering.
 * Users can filter: All Categories → Category → Group → Subcategory
 */
export type CategoryLevel = 'all' | 'category' | 'group' | 'subcategory';

/**
 * Category filter position in the navigation hierarchy.
 * Each level requires its parent - e.g., subcategory requires group.
 */
export interface CategoryPosition {
  level: CategoryLevel;
  category?: string;         // "Food", "Transport", etc.
  group?: string;            // "Groceries", "Restaurants", etc.
  subcategory?: string;      // "Meats", "Produce", etc.
}

// ============================================================================
// Chart Mode Types
// ============================================================================

/**
 * Chart display mode for analytics.
 * - aggregation: Shows "what" (pie/bar by category)
 * - comparison: Shows "when" (grouped bar comparing time periods)
 */
export type ChartMode = 'aggregation' | 'comparison';

/**
 * Drill-down display mode for analytics cards section.
 * - temporal: Shows time period cards (Q1-Q4, months, weeks, days)
 * - category: Shows spending category cards (Supermarket, Veterinary, etc.)
 *
 * Story 7.16: Toggle allows users to switch between viewing
 * temporal drill-down cards or category drill-down cards.
 */
export type DrillDownMode = 'temporal' | 'category';

// ============================================================================
// Complete Navigation State
// ============================================================================

/**
 * Complete analytics navigation state.
 * Single source of truth for all analytics views.
 *
 * @example
 * {
 *   temporal: { level: 'month', year: '2024', quarter: 'Q4', month: '2024-10' },
 *   category: { level: 'category', category: 'Food' },
 *   chartMode: 'aggregation'
 * }
 */
export interface AnalyticsNavigationState {
  temporal: TemporalPosition;
  category: CategoryPosition;
  chartMode: ChartMode;
  drillDownMode: DrillDownMode;
}

// ============================================================================
// Navigation Actions (for useReducer)
// ============================================================================

/**
 * Navigation actions for the analytics reducer.
 *
 * CRITICAL: Dual-axis independence - changing temporal preserves category and vice versa.
 *
 * - SET_TEMPORAL_LEVEL: Navigate to a temporal position (preserves category)
 * - SET_CATEGORY_FILTER: Apply a category filter (preserves temporal)
 * - TOGGLE_CHART_MODE: Switch between aggregation and comparison
 * - TOGGLE_DRILLDOWN_MODE: Switch between temporal and category drill-down cards (Story 7.16)
 * - RESET_TO_YEAR: Reset temporal to year level (preserves category)
 * - CLEAR_CATEGORY_FILTER: Clear category filter to 'all' (preserves temporal)
 */
export type NavigationAction =
  | { type: 'SET_TEMPORAL_LEVEL'; payload: TemporalPosition }
  | { type: 'SET_CATEGORY_FILTER'; payload: CategoryPosition }
  | { type: 'TOGGLE_CHART_MODE' }
  | { type: 'TOGGLE_DRILLDOWN_MODE' }
  | { type: 'RESET_TO_YEAR'; payload: { year: string } }
  | { type: 'CLEAR_CATEGORY_FILTER' };

// ============================================================================
// Derived Data Types (for computed values)
// ============================================================================

/**
 * Summary data for a time period (used by drill-down cards).
 */
export interface PeriodSummary {
  label: string;             // "Q4", "October", "Oct 1-7"
  value: string;             // The key value (e.g., "Q4", "2024-10", week index)
  total: number;
  transactionCount: number;
}

/**
 * Summary data for a category (used by charts and drill-down cards).
 */
export interface CategorySummary {
  label: string;             // "Food", "Groceries", "Meats"
  total: number;
  percentage: number;        // Of current view total (0-100)
  color: string;             // From getColor() utility
}

/**
 * Data structure for chart rendering.
 */
export interface ChartData {
  label: string;
  value: number;
  color: string;
  segments?: ChartData[];    // For stacked/comparison charts
}

// ============================================================================
// Context Value Type
// ============================================================================

// Story 15b-3f: AnalyticsContextValue removed (dead code — zero imports after Zustand migration).
