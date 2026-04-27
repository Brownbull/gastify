/**
 * useAnalyticsNavigation Hook — Story 15b-3f
 *
 * Custom hook for accessing analytics navigation state.
 * This is the ONLY way components should access analytics state.
 * Internally delegates to useAnalyticsStore (Zustand).
 */

import { useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAnalyticsStore } from '../stores/useAnalyticsStore';
import type {
  AnalyticsNavigationState,
  NavigationAction,
  TemporalPosition,
  CategoryPosition,
  ChartMode,
  DrillDownMode,
  TemporalLevel,
  CategoryLevel,
} from '@/types/analytics';

/**
 * Return type for useAnalyticsNavigation hook.
 * Provides typed access to state, dispatch, and convenience selectors.
 */
export interface UseAnalyticsNavigationReturn {
  /** Complete navigation state */
  state: AnalyticsNavigationState;
  /** Dispatch function for navigation actions */
  dispatch: React.Dispatch<NavigationAction>;

  // Convenience selectors (memoized)
  /** Current temporal position */
  temporal: TemporalPosition;
  /** Current category filter */
  category: CategoryPosition;
  /** Current chart mode */
  chartMode: ChartMode;
  /** Current drill-down mode (Story 7.16) */
  drillDownMode: DrillDownMode;

  // Level accessors
  /** Current temporal level (year, quarter, month, week, day) */
  temporalLevel: TemporalLevel;
  /** Current category level (all, category, group, subcategory) */
  categoryLevel: CategoryLevel;

  // Boolean helpers
  /** True if at year level (no temporal drill-down) */
  isYearLevel: boolean;
  /** True if category filter is active (not 'all') */
  hasCategoryFilter: boolean;
  /** True if in comparison chart mode */
  isComparisonMode: boolean;
}

/**
 * Hook for accessing analytics navigation state.
 * Zustand stores are always available — no Provider required.
 *
 * @example
 * function MyComponent() {
 *   const { temporal, dispatch, isYearLevel } = useAnalyticsNavigation();
 *
 *   const handleDrillDown = () => {
 *     dispatch({ type: 'SET_TEMPORAL_LEVEL', payload: { level: 'quarter', year: '2024', quarter: 'Q4' } });
 *   };
 *
 *   return <div>Current year: {temporal.year}</div>;
 * }
 */
export function useAnalyticsNavigation(): UseAnalyticsNavigationReturn {
  const { temporal, category, chartMode, drillDownMode } = useAnalyticsStore(
    useShallow((s) => ({
      temporal: s.temporal,
      category: s.category,
      chartMode: s.chartMode,
      drillDownMode: s.drillDownMode,
    }))
  );

  const storeDispatch = useAnalyticsStore((s) => s.dispatch);

  // Backward-compatible dispatch matching React.Dispatch<NavigationAction> type
  const dispatch: React.Dispatch<NavigationAction> = useCallback(
    (action: NavigationAction) => {
      storeDispatch(action);
    },
    [storeDispatch]
  );

  const state: AnalyticsNavigationState = { temporal, category, chartMode, drillDownMode };

  return {
    state,
    dispatch,
    temporal,
    category,
    chartMode,
    drillDownMode,
    temporalLevel: temporal.level,
    categoryLevel: category.level,
    isYearLevel: temporal.level === 'year',
    hasCategoryFilter: category.level !== 'all',
    isComparisonMode: chartMode === 'comparison',
  };
}

/**
 * Type guard to check if a temporal level allows comparison mode.
 * Day level does not support comparison (no children to compare).
 */
export function supportsComparisonMode(level: TemporalLevel): boolean {
  return level !== 'day';
}

/**
 * Get the parent temporal level for breadcrumb navigation.
 * Returns null if already at year level.
 */
export function getParentTemporalLevel(level: TemporalLevel): TemporalLevel | null {
  switch (level) {
    case 'day':
      return 'week';
    case 'week':
      return 'month';
    case 'month':
      return 'quarter';
    case 'quarter':
      return 'year';
    case 'year':
      return null;
    default:
      return null;
  }
}

/**
 * Get the child temporal level for drill-down navigation.
 * Returns null if already at day level.
 */
export function getChildTemporalLevel(level: TemporalLevel): TemporalLevel | null {
  switch (level) {
    case 'year':
      return 'quarter';
    case 'quarter':
      return 'month';
    case 'month':
      return 'week';
    case 'week':
      return 'day';
    case 'day':
      return null;
    default:
      return null;
  }
}

/**
 * Get the parent category level for breadcrumb navigation.
 * Returns null if already at 'all' level.
 */
export function getParentCategoryLevel(level: CategoryLevel): CategoryLevel | null {
  switch (level) {
    case 'subcategory':
      return 'group';
    case 'group':
      return 'category';
    case 'category':
      return 'all';
    case 'all':
      return null;
    default:
      return null;
  }
}

/**
 * Get the child category level for drill-down navigation.
 * Returns null if already at subcategory level.
 */
export function getChildCategoryLevel(level: CategoryLevel): CategoryLevel | null {
  switch (level) {
    case 'all':
      return 'category';
    case 'category':
      return 'group';
    case 'group':
      return 'subcategory';
    case 'subcategory':
      return null;
    default:
      return null;
  }
}
