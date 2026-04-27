/**
 * Story 14c-refactor.21: useNavigationHandlers Hook
 *
 * Extracts navigation handlers from App.tsx into a reusable hook.
 * Handles view switching, filter management, and scroll position restoration.
 *
 * Features:
 * - View navigation with scroll position preservation
 * - Filter clearing on view changes (preserves 14.13b logic)
 * - Analytics drill-down navigation with filter state
 * - Back navigation with scroll position restoration
 * - QuickSave dialog dismissal on navigation
 *
 * Architecture Reference: Epic 14c-refactor - App.tsx Handler Extraction
 * Story 14e-45: NavigationContext removed - navigation via useNavigationStore
 *
 * Dependencies:
 * - ScanContext (for dialog dismissal)
 * - useHistoryFiltersStore (filter state management via Zustand)
 *
 * @example
 * ```tsx
 * function App() {
 *   const {
 *     navigateToView,
 *     navigateBack,
 *     handleNavigateToHistory,
 *   } = useNavigationHandlers({
 *     view,
 *     setView,
 *     previousView,
 *     setPreviousView,
 *     mainRef,
 *     scrollPositionsRef,
 *     // Filter state
 *     pendingHistoryFilters,
 *     setPendingHistoryFilters,
 *     pendingDistributionView,
 *     setPendingDistributionView,
 *     // ScanContext integration
 *     scanState,
 *     dismissScanDialog,
 *   });
 *
 *   return <Nav onViewChange={navigateToView} />;
 * }
 * ```
 */

import { useCallback, useEffect, useMemo } from 'react';
import type { RefObject } from 'react';
import type { View } from '@app/types';
import type { HistoryFilterState, TemporalFilterState } from '@/types/historyFilters';
import type { HistoryNavigationPayload } from '@/types/navigation';
import type { AnalyticsNavigationState } from '../../types/analytics';
import type { ScanState } from '@shared/types/scanWorkflow';
import { DIALOG_TYPES } from '@shared/types/scanWorkflow';
import {
    expandStoreCategoryGroup,
    expandItemCategoryGroup,
    type StoreCategoryGroup,
    type ItemCategoryGroup,
} from '../../config/categoryColors';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for useNavigationHandlers hook
 */
export interface UseNavigationHandlersProps {
    /** Current view */
    view: View;
    /** Set current view */
    setView: (view: View) => void;
    /** Previous view (for back navigation) */
    previousView: View;
    /** Set previous view */
    setPreviousView: (view: View) => void;
    /** Main content scroll container ref */
    mainRef: RefObject<HTMLDivElement>;
    /** Scroll positions per view */
    scrollPositionsRef: RefObject<Record<string, number>>;

    // Filter state
    /** Pending history filters (for analytics to history navigation) */
    pendingHistoryFilters: HistoryFilterState | null;
    /** Set pending history filters */
    setPendingHistoryFilters: (filters: HistoryFilterState | null) => void;
    /** Pending distribution view for back navigation */
    pendingDistributionView: 'treemap' | 'donut' | null;
    /** Set pending distribution view */
    setPendingDistributionView: (view: 'treemap' | 'donut' | null) => void;
    /** Analytics initial state for "This Month" navigation */
    analyticsInitialState: AnalyticsNavigationState | null;
    /** Set analytics initial state */
    setAnalyticsInitialState: (state: AnalyticsNavigationState | null) => void;

    // ScanContext integration
    /** Current scan state (for dialog checking) */
    scanState: ScanState;
    /** Dismiss active scan dialog */
    dismissScanDialog: () => void;
}

/**
 * Result returned by useNavigationHandlers
 */
export interface UseNavigationHandlersResult {
    /**
     * Navigate to a view while tracking the previous view for back navigation.
     * Saves scroll position before navigating and clears filters when appropriate.
     *
     * @param targetView - The view to navigate to
     */
    navigateToView: (targetView: View) => void;

    /**
     * Navigate back to the previous view or dashboard.
     * Restores scroll position for the target view.
     */
    navigateBack: () => void;

    /**
     * Navigate from Analytics to History/Items with pre-applied filters.
     * Called when user clicks a transaction count badge on analytics views.
     *
     * @param payload - Navigation payload with filter configuration
     */
    handleNavigateToHistory: (payload: HistoryNavigationPayload) => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook that provides navigation handlers extracted from App.tsx.
 *
 * Handles:
 * - View switching with scroll position management
 * - Filter clearing on view changes (Story 14.13b logic)
 * - Analytics drill-down navigation
 * - Back navigation with scroll restoration
 */
export function useNavigationHandlers(props: UseNavigationHandlersProps): UseNavigationHandlersResult {
    const {
        view,
        setView,
        previousView,
        setPreviousView,
        mainRef,
        scrollPositionsRef,
        pendingHistoryFilters,
        setPendingHistoryFilters,
        pendingDistributionView,
        setPendingDistributionView,
        analyticsInitialState,
        setAnalyticsInitialState,
        scanState,
        dismissScanDialog,
    } = props;

    // ===========================================================================
    // Filter Clearing Effects (Story 14.13b)
    // ===========================================================================

    /**
     * Story 14.13: Clear filters when navigating away from history/insights/transaction-editor views.
     * This ensures navigating to Analytics, then drilling down to History shows filters,
     * but returning to Dashboard and navigating to History shows unfiltered transactions.
     */
    useEffect(() => {
        // Clear filters when navigating away from history/insights/transaction-editor views
        // transaction-editor is included because users drill into it from filtered history
        // and should return to the same filtered view when pressing back
        // Story 14.13 Session 5: 'items' added for filtered navigation from analytics count mode
        if (
            view !== 'insights' &&
            view !== 'history' &&
            view !== 'items' &&
            view !== 'transaction-editor' &&
            pendingHistoryFilters
        ) {
            setPendingHistoryFilters(null);
        }
    }, [view]); // Only depend on view, not pendingHistoryFilters
    // Note: ESLint exhaustive-deps is intentionally limited here

    /**
     * Story 10a.2: Clear analytics initial state when navigating AWAY from trends view.
     * This ensures initial state is applied when entering trends, but cleared when leaving
     * so that returning to trends normally shows year-level view.
     */
    useEffect(() => {
        if (view !== 'trends' && analyticsInitialState) {
            setAnalyticsInitialState(null);
        }
    }, [view]); // Only depend on view, not analyticsInitialState
    // Note: ESLint exhaustive-deps is intentionally limited here

    /**
     * Story 14.13 Session 7: Clear pending distribution view when navigating AWAY from trends.
     * This ensures the distribution view is restored when returning to trends from history/items,
     * but cleared when leaving so subsequent visits start fresh.
     */
    useEffect(() => {
        if (
            view !== 'trends' &&
            view !== 'history' &&
            view !== 'items' &&
            view !== 'transaction-editor' &&
            pendingDistributionView
        ) {
            setPendingDistributionView(null);
        }
    }, [view]); // Only depend on view, not pendingDistributionView
    // Note: ESLint exhaustive-deps is intentionally limited here

    // ===========================================================================
    // Navigation Handlers
    // ===========================================================================

    /**
     * Story 14.15b: Navigate to a view while tracking the previous view for back navigation.
     * Story 14.22: Also saves scroll position before navigating.
     * Story 14.13b: Clear filters when navigating to history/items from outside (fresh start).
     */
    const navigateToView = useCallback((targetView: View) => {
        // Save current scroll position before navigating
        if (mainRef.current && scrollPositionsRef.current) {
            scrollPositionsRef.current[view] = mainRef.current.scrollTop;
        }
        setPreviousView(view);

        // Story 14.13b: Clear filters when navigating to history/items from outside
        // This gives a "fresh start" when selecting from Profile menu while on Dashboard, Settings, etc.
        // Filters persist when: navigating within history/items or viewing transaction detail and coming back
        // Story 14.13: Also preserve filters when navigating from trends/insights (analytics drill-down)
        // Story 14.13 Session 11: Also preserve filters when navigating from dashboard (treemap clicks)
        const isFromRelatedView =
            view === 'history' ||
            view === 'items' ||
            view === 'transaction-editor' ||
            view === 'trends' ||
            view === 'insights' ||
            view === 'dashboard';
        const isToHistoryOrItems = targetView === 'history' || targetView === 'items';
        if (isToHistoryOrItems && !isFromRelatedView) {
            setPendingHistoryFilters(null);
        }

        setView(targetView);

        // Story 14.24: Hide QuickSaveCard when navigating to a different view
        // This prevents the modal from floating over other views
        // Story 14d.6: Dismiss QuickSave dialog via context (local state removed)
        if (targetView !== 'transaction-editor' && targetView !== 'scan-result') {
            if (scanState.activeDialog?.type === DIALOG_TYPES.QUICKSAVE) {
                dismissScanDialog();
            }
        }

        // Reset scroll to top for the new view
        setTimeout(() => {
            if (mainRef.current) {
                mainRef.current.scrollTo(0, 0);
            }
        }, 0);
    }, [
        view,
        setView,
        setPreviousView,
        mainRef,
        scrollPositionsRef,
        setPendingHistoryFilters,
        scanState.activeDialog,
        dismissScanDialog,
    ]);

    /**
     * Story 14.15b: Navigate back to the previous view (fallback to dashboard).
     * Story 14.16b: If previousView is same as current or invalid, always fallback to dashboard.
     * Story 14.22: Also restores scroll position when navigating back.
     */
    const navigateBack = useCallback(() => {
        // Always go to dashboard if:
        // 1. previousView is the same as current view (would be a no-op)
        // 2. previousView is undefined/falsy
        // 3. previousView is 'dashboard' (already the home screen)
        const targetView = previousView && previousView !== view ? previousView : 'dashboard';
        setView(targetView);

        // Restore scroll position for the target view
        setTimeout(() => {
            if (mainRef.current && scrollPositionsRef.current) {
                const savedPosition = scrollPositionsRef.current[targetView] || 0;
                mainRef.current.scrollTo(0, savedPosition);
            }
        }, 0);
    }, [previousView, view, setView, mainRef, scrollPositionsRef]);

    /**
     * Story 9.20: Handler for navigating from Analytics to History with pre-applied filters (AC #4).
     * Story 14.22: Navigate to History view with pre-applied filters.
     * This is called when user clicks a transaction count badge on analytics views.
     * Story 14.13 Session 5: Now supports targetView to navigate to 'items' for product counts.
     * Story 14.13a: Now supports drillDownPath for multi-dimension filtering.
     */
    const handleNavigateToHistory = useCallback((payload: HistoryNavigationPayload) => {
        // Create a complete filter state from the navigation payload
        // Default to 'all' level if temporal/category not provided

        // Build category filter based on what's in the payload
        // Priority: category > storeGroup > itemGroup > itemCategory
        let categoryFilter: HistoryFilterState['category'] = { level: 'all' };
        if (payload.category) {
            // Store category filter (e.g., "Supermarket")
            categoryFilter = { level: 'category', category: payload.category };
        } else if (payload.storeGroup) {
            // Store group filter (e.g., "supermercados") - expand to all categories in the group
            const storeCategories = expandStoreCategoryGroup(payload.storeGroup as StoreCategoryGroup);
            categoryFilter = { level: 'category', category: storeCategories.join(',') };
        } else if (payload.itemGroup) {
            // Item group filter (e.g., "food-fresh") - expand to all item categories in the group
            const itemCategories = expandItemCategoryGroup(payload.itemGroup as ItemCategoryGroup);
            categoryFilter = { level: 'group', group: itemCategories.join(',') };
        } else if (payload.itemCategory) {
            // Item category filter (e.g., "Bakery") - filter by item.category field directly
            categoryFilter = { level: 'group', group: payload.itemCategory };
        }

        // Story 14.13a: Include drillDownPath in category filter for multi-dimension filtering
        // This allows ItemsView/HistoryView to filter by multiple dimensions simultaneously
        // (e.g., items from "Supermercado" that are in "Alimentos Frescos" group)
        if (payload.drillDownPath) {
            categoryFilter.drillDownPath = payload.drillDownPath;
        }

        const filterState: HistoryFilterState = {
            temporal: payload.temporal
                ? { ...payload.temporal, level: payload.temporal.level as TemporalFilterState['level'] }
                : { level: 'all' },
            category: categoryFilter,
            location: {},
        };

        // Store the filters to be applied when History/Items view loads
        setPendingHistoryFilters(filterState);

        // Story 14.13 Session 7: Store source distribution view for back navigation
        // If user navigated from donut chart, remember to restore it on back
        if (payload.sourceDistributionView) {
            setPendingDistributionView(payload.sourceDistributionView);
        }

        // Story 14.13 Session 5: Navigate to target view based on countMode toggle
        // 'items' = Productos view, 'history' = Compras view (default)
        const targetView = payload.targetView || 'history';
        navigateToView(targetView);
    }, [navigateToView, setPendingHistoryFilters, setPendingDistributionView]);

    // ===========================================================================
    // Return Result
    // ===========================================================================

    // Story 14e-25d: ViewHandlersContext deleted - this hook used by App.tsx directly
    return useMemo<UseNavigationHandlersResult>(
        () => ({
            navigateToView,
            navigateBack,
            handleNavigateToHistory,
        }),
        [navigateToView, navigateBack, handleNavigateToHistory]
    );
}
