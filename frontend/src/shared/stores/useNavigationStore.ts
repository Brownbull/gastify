/**
 * Story 14e-25a.1: Navigation Zustand Store
 *
 * Centralized navigation state management replacing useState calls in App.tsx.
 * Follows the Zustand store pattern established in Epic 14e (Story 14e-6a).
 *
 * State includes:
 * - Current view and previous view
 * - Settings subview navigation
 * - Scroll positions per view
 * - Cross-view navigation state (analytics, history filters, distribution view)
 *
 * Architecture Reference:
 * - Atlas 04-architecture.md: Zustand Store Pattern (Epic 14e)
 * - Story 14.13b: Filter persistence behavior
 * - Story 14c-refactor.21: useNavigationHandlers (being replaced)
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { View } from '@app/types';
import type { HistoryFilterState } from '@/types/historyFilters';
import type { AnalyticsNavigationState } from '@/types/analytics';

// =============================================================================
// Types
// =============================================================================

/**
 * Settings subview options.
 * Must match SettingsView internal subview handling.
 */
export type SettingsSubview =
    | 'main'
    | 'limites'
    | 'perfil'
    | 'preferencias'
    | 'escaneo'
    | 'suscripcion'
    | 'datos'
    | 'grupos'
    | 'app'
    | 'cuenta';

/**
 * Options for navigateToView action.
 */
export interface NavigateToViewOptions {
    /** History filters to apply when navigating to history/items */
    historyFilters?: HistoryFilterState;
    /** Analytics initial state when navigating to trends */
    analyticsState?: AnalyticsNavigationState;
    /** Distribution view for back navigation */
    distributionView?: 'treemap' | 'donut';
}

/**
 * Navigation store state.
 */
export interface NavigationState {
    /** Current active view */
    view: View;
    /** Previous view for back navigation */
    previousView: View;
    /** Current settings subview */
    settingsSubview: SettingsSubview;
    /** Scroll positions saved per view */
    scrollPositions: Record<string, number>;
    /** Pending history filters (for analytics to history navigation) */
    pendingHistoryFilters: HistoryFilterState | null;
    /** Pending distribution view for back navigation */
    pendingDistributionView: 'treemap' | 'donut' | null;
    /** Analytics initial state for TrendsView */
    analyticsInitialState: AnalyticsNavigationState | null;
}

/**
 * Navigation store actions.
 */
export interface NavigationActions {
    /**
     * Simple view setter (tracks previous view).
     * Used by components that just need to change view.
     */
    setView: (view: View) => void;

    /**
     * Navigate to a view with optional cross-view state.
     * Preserves previous view and handles pending state.
     */
    navigateToView: (view: View, options?: NavigateToViewOptions) => void;

    /**
     * Navigate back to previous view (fallback to dashboard).
     */
    navigateBack: () => void;

    /**
     * Set settings subview.
     */
    setSettingsSubview: (subview: SettingsSubview) => void;

    /**
     * Save scroll position for a view.
     */
    saveScrollPosition: (view: View, position: number) => void;

    /**
     * Get scroll position for a view.
     */
    getScrollPosition: (view: View) => number;

    /**
     * Clear all pending filters and cross-view state.
     * Called when TrendsView/HistoryView consume their initial state.
     */
    clearPendingFilters: () => void;

    /**
     * Clear analytics initial state only.
     * Called when navigating away from trends.
     */
    clearAnalyticsInitialState: () => void;

    /**
     * Set pending history filters directly.
     * Used by handleNavigateToHistory.
     */
    setPendingHistoryFilters: (filters: HistoryFilterState | null) => void;

    /**
     * Set pending distribution view directly.
     */
    setPendingDistributionView: (view: 'treemap' | 'donut' | null) => void;

    /**
     * Set analytics initial state directly.
     */
    setAnalyticsInitialState: (state: AnalyticsNavigationState | null) => void;
}

// =============================================================================
// Initial State
// =============================================================================

const initialNavigationState: NavigationState = {
    view: 'dashboard',
    previousView: 'dashboard',
    settingsSubview: 'main',
    scrollPositions: {},
    pendingHistoryFilters: null,
    pendingDistributionView: null,
    analyticsInitialState: null,
};

// =============================================================================
// Store Definition
// =============================================================================

export const useNavigationStore = create<NavigationState & NavigationActions>()(
    devtools(
        (set, get) => ({
            // Initial state
            ...initialNavigationState,

            // Actions
            setView: (view) =>
                set(
                    (state) => ({
                        previousView: state.view,
                        view,
                    }),
                    false,
                    'navigation/setView'
                ),

            navigateToView: (view, options = {}) =>
                set(
                    (state) => ({
                        previousView: state.view,
                        view,
                        pendingHistoryFilters: options.historyFilters ?? state.pendingHistoryFilters,
                        analyticsInitialState: options.analyticsState ?? state.analyticsInitialState,
                        pendingDistributionView: options.distributionView ?? state.pendingDistributionView,
                    }),
                    false,
                    'navigation/navigateToView'
                ),

            navigateBack: () =>
                set(
                    (state) => {
                        // If previous view is same as current or undefined, go to dashboard
                        const targetView =
                            state.previousView && state.previousView !== state.view
                                ? state.previousView
                                : 'dashboard';
                        return {
                            view: targetView,
                            previousView: state.view,
                        };
                    },
                    false,
                    'navigation/navigateBack'
                ),

            setSettingsSubview: (subview) =>
                set({ settingsSubview: subview }, false, 'navigation/setSettingsSubview'),

            saveScrollPosition: (view, position) =>
                set(
                    (state) => ({
                        scrollPositions: { ...state.scrollPositions, [view]: position },
                    }),
                    false,
                    'navigation/saveScrollPosition'
                ),

            getScrollPosition: (view) => {
                return get().scrollPositions[view] || 0;
            },

            clearPendingFilters: () =>
                set(
                    {
                        pendingHistoryFilters: null,
                        pendingDistributionView: null,
                    },
                    false,
                    'navigation/clearPendingFilters'
                ),

            clearAnalyticsInitialState: () =>
                set({ analyticsInitialState: null }, false, 'navigation/clearAnalyticsInitialState'),

            setPendingHistoryFilters: (filters) =>
                set({ pendingHistoryFilters: filters }, false, 'navigation/setPendingHistoryFilters'),

            setPendingDistributionView: (view) =>
                set({ pendingDistributionView: view }, false, 'navigation/setPendingDistributionView'),

            setAnalyticsInitialState: (state) =>
                set({ analyticsInitialState: state }, false, 'navigation/setAnalyticsInitialState'),
        }),
        { name: 'navigation-store', enabled: import.meta.env.DEV }
    )
);

// =============================================================================
// Typed Selectors (prevent unnecessary re-renders)
// =============================================================================

/** Get current view */
export const useCurrentView = () => useNavigationStore((s) => s.view);

/** Get previous view */
export const usePreviousView = () => useNavigationStore((s) => s.previousView);

/** Get settings subview */
export const useSettingsSubview = () => useNavigationStore((s) => s.settingsSubview);

/** Get pending history filters */
export const usePendingHistoryFilters = () => useNavigationStore((s) => s.pendingHistoryFilters);

/** Get pending distribution view */
export const usePendingDistributionView = () => useNavigationStore((s) => s.pendingDistributionView);

/** Get analytics initial state */
export const useAnalyticsInitialState = () => useNavigationStore((s) => s.analyticsInitialState);

/** Get navigation actions (stable reference via useShallow) */
export const useNavigationActions = () =>
    useNavigationStore(
        useShallow((s) => ({
            setView: s.setView,
            navigateToView: s.navigateToView,
            navigateBack: s.navigateBack,
            setSettingsSubview: s.setSettingsSubview,
            saveScrollPosition: s.saveScrollPosition,
            getScrollPosition: s.getScrollPosition,
            clearPendingFilters: s.clearPendingFilters,
            clearAnalyticsInitialState: s.clearAnalyticsInitialState,
            setPendingHistoryFilters: s.setPendingHistoryFilters,
            setPendingDistributionView: s.setPendingDistributionView,
            setAnalyticsInitialState: s.setAnalyticsInitialState,
        }))
    );

/**
 * Convenience hook combining view state and navigation actions.
 * For components that need both current view and ability to navigate.
 *
 * Story 14e-45: Added `goBack` (alias for navigateBack) and `navigateWithHistory`
 * (alias for navigateToView) for API compatibility with deleted NavigationContext.
 *
 * @example
 * const { view, setView, navigateToView, navigateBack } = useNavigation();
 * // Legacy API also available:
 * const { goBack, navigateWithHistory } = useNavigation();
 */
export const useNavigation = () =>
    useNavigationStore(
        useShallow((s) => ({
            view: s.view,
            previousView: s.previousView,
            settingsSubview: s.settingsSubview,
            setView: s.setView,
            navigateToView: s.navigateToView,
            navigateBack: s.navigateBack,
            setSettingsSubview: s.setSettingsSubview,
            // Story 14e-45: Legacy API aliases for NavigationContext compatibility
            goBack: s.navigateBack,
            navigateWithHistory: s.navigateToView,
        }))
    );

// =============================================================================
// Direct Access (for non-React code)
// =============================================================================

/**
 * Get current navigation state directly (non-reactive).
 * Use only in services or other non-React contexts.
 */
export const getNavigationState = () => useNavigationStore.getState();

/**
 * Navigation actions for non-React code.
 */
export const navigationActions = {
    setView: (view: View) => useNavigationStore.getState().setView(view),
    navigateToView: (view: View, options?: NavigateToViewOptions) =>
        useNavigationStore.getState().navigateToView(view, options),
    navigateBack: () => useNavigationStore.getState().navigateBack(),
    setSettingsSubview: (subview: SettingsSubview) =>
        useNavigationStore.getState().setSettingsSubview(subview),
    saveScrollPosition: (view: View, position: number) =>
        useNavigationStore.getState().saveScrollPosition(view, position),
    getScrollPosition: (view: View) => useNavigationStore.getState().getScrollPosition(view),
    clearPendingFilters: () => useNavigationStore.getState().clearPendingFilters(),
    clearAnalyticsInitialState: () => useNavigationStore.getState().clearAnalyticsInitialState(),
    setPendingHistoryFilters: (filters: HistoryFilterState | null) =>
        useNavigationStore.getState().setPendingHistoryFilters(filters),
    setPendingDistributionView: (view: 'treemap' | 'donut' | null) =>
        useNavigationStore.getState().setPendingDistributionView(view),
    setAnalyticsInitialState: (state: AnalyticsNavigationState | null) =>
        useNavigationStore.getState().setAnalyticsInitialState(state),
};
