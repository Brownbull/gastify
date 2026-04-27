/**
 * Analytics Store — Story 15b-3f
 *
 * Zustand store replacing AnalyticsContext's useReducer state management.
 * State shape matches AnalyticsNavigationState (temporal, category, chartMode, drillDownMode).
 * All actions call validateNavigationState() to prevent impossible states.
 *
 * Consumer API: useAnalyticsNavigation hook (unchanged).
 * Direct store access: analyticsActions (imperative use outside React).
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  AnalyticsNavigationState,
  NavigationAction,
  TemporalPosition,
  CategoryPosition,
} from '@/types/analytics';
import {
  validateNavigationState,
  getDefaultNavigationState,
  getCurrentYear,
} from '@features/analytics/utils/analyticsHelpers';

// ============================================================================
// Store State & Actions Interface
// ============================================================================

interface AnalyticsStoreState extends AnalyticsNavigationState {
  /** Set temporal position (preserves category — dual-axis independence) */
  setTemporalLevel: (payload: TemporalPosition) => void;
  /** Set category filter (preserves temporal — dual-axis independence) */
  setCategoryFilter: (payload: CategoryPosition) => void;
  /** Toggle between aggregation and comparison chart modes */
  toggleChartMode: () => void;
  /** Toggle between temporal and category drill-down modes */
  toggleDrillDownMode: () => void;
  /** Reset temporal to year level (preserves category) */
  resetToYear: (year: string) => void;
  /** Clear category filter to 'all' (preserves temporal) */
  clearCategoryFilter: () => void;
  /** Initialize store with full state (navigation restoration) */
  initialize: (state?: AnalyticsNavigationState) => void;
  /** Backward-compatible dispatch for NavigationAction objects */
  dispatch: (action: NavigationAction) => void;
}

// ============================================================================
// Store Definition
// ============================================================================

export const useAnalyticsStore = create<AnalyticsStoreState>()(
  devtools(
    (set, get) => {
      /** Validate state and apply to store — single source of truth for all mutations */
      const setValidated = (state: AnalyticsNavigationState, actionName: string) => {
        const validated = validateNavigationState(state);
        set(
          { temporal: validated.temporal, category: validated.category, chartMode: validated.chartMode, drillDownMode: validated.drillDownMode },
          false,
          actionName
        );
      };

      return {
      ...getDefaultNavigationState(getCurrentYear()),

      setTemporalLevel: (payload) => {
        const { category, chartMode, drillDownMode } = get();
        setValidated({ temporal: payload, category, chartMode, drillDownMode }, 'analytics/setTemporalLevel');
      },

      setCategoryFilter: (payload) => {
        const { temporal, chartMode, drillDownMode } = get();
        setValidated({ temporal, category: payload, chartMode, drillDownMode }, 'analytics/setCategoryFilter');
      },

      toggleChartMode: () => {
        const { temporal, category, chartMode, drillDownMode } = get();
        setValidated({
          temporal, category,
          chartMode: chartMode === 'aggregation' ? 'comparison' : 'aggregation',
          drillDownMode,
        }, 'analytics/toggleChartMode');
      },

      toggleDrillDownMode: () => {
        const { temporal, category, chartMode, drillDownMode } = get();
        setValidated({
          temporal, category, chartMode,
          drillDownMode: drillDownMode === 'temporal' ? 'category' : 'temporal',
        }, 'analytics/toggleDrillDownMode');
      },

      resetToYear: (year) => {
        const { category, chartMode, drillDownMode } = get();
        setValidated({ temporal: { level: 'year', year }, category, chartMode, drillDownMode }, 'analytics/resetToYear');
      },

      clearCategoryFilter: () => {
        const { temporal, chartMode, drillDownMode } = get();
        setValidated({ temporal, category: { level: 'all' }, chartMode, drillDownMode }, 'analytics/clearCategoryFilter');
      },

      initialize: (state) => {
        const newState = state ?? getDefaultNavigationState(getCurrentYear());
        setValidated(newState, 'analytics/initialize');
      },

      dispatch: (action) => {
        const store = get();
        switch (action.type) {
          case 'SET_TEMPORAL_LEVEL':
            store.setTemporalLevel(action.payload);
            break;
          case 'SET_CATEGORY_FILTER':
            store.setCategoryFilter(action.payload);
            break;
          case 'TOGGLE_CHART_MODE':
            store.toggleChartMode();
            break;
          case 'TOGGLE_DRILLDOWN_MODE':
            store.toggleDrillDownMode();
            break;
          case 'RESET_TO_YEAR':
            store.resetToYear(action.payload.year);
            break;
          case 'CLEAR_CATEGORY_FILTER':
            store.clearCategoryFilter();
            break;
        }
      },
    };
    },
    { name: 'analytics-store', enabled: import.meta.env.DEV }
  )
);

// ============================================================================
// Imperative Actions (for use outside React components)
// ============================================================================

export const analyticsActions = {
  setTemporalLevel: (payload: TemporalPosition) =>
    useAnalyticsStore.getState().setTemporalLevel(payload),
  setCategoryFilter: (payload: CategoryPosition) =>
    useAnalyticsStore.getState().setCategoryFilter(payload),
  toggleChartMode: () =>
    useAnalyticsStore.getState().toggleChartMode(),
  toggleDrillDownMode: () =>
    useAnalyticsStore.getState().toggleDrillDownMode(),
  resetToYear: (year: string) =>
    useAnalyticsStore.getState().resetToYear(year),
  clearCategoryFilter: () =>
    useAnalyticsStore.getState().clearCategoryFilter(),
  initialize: (state?: AnalyticsNavigationState) =>
    useAnalyticsStore.getState().initialize(state),
  dispatch: (action: NavigationAction) =>
    useAnalyticsStore.getState().dispatch(action),
  getState: (): AnalyticsNavigationState => {
    const { temporal, category, chartMode, drillDownMode } = useAnalyticsStore.getState();
    return { temporal, category, chartMode, drillDownMode };
  },
};
