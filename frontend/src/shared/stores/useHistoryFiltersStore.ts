/**
 * History Filters Store — Story 15-7a
 *
 * Zustand store replacing HistoryFiltersContext's useReducer state management.
 * Story 15b-3g: HistoryFiltersProvider deleted — initialization now via useHistoryFiltersInit hook.
 *
 * State shape matches the original HistoryFilterState interface.
 * dispatch() processes HistoryFilterAction objects for backward compatibility.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type {
    HistoryFilterState,
    HistoryFilterAction,
} from '@/types/historyFilters';

// ============================================================================
// Default State
// ============================================================================

function getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

/**
 * Get default filter state.
 * Story 14.13b: Default temporal filter is current month (not "all time").
 */
export function getDefaultFilterState(): HistoryFilterState {
    const currentMonth = getCurrentMonth();
    return {
        temporal: {
            level: 'month',
            year: currentMonth.split('-')[0],
            month: currentMonth,
        },
        category: { level: 'all' },
        location: {},
    };
}

// ============================================================================
// Reducer Logic (moved from HistoryFiltersContext)
// ============================================================================

/**
 * History filters reducer.
 * CRITICAL: Filters are independent — changing one doesn't reset others (AC #5).
 */
function historyFiltersReducer(
    state: HistoryFilterState,
    action: HistoryFilterAction
): HistoryFilterState {
    switch (action.type) {
        case 'SET_TEMPORAL_FILTER':
            return { ...state, temporal: action.payload };
        case 'SET_CATEGORY_FILTER':
            return { ...state, category: action.payload };
        case 'SET_LOCATION_FILTER':
            return { ...state, location: action.payload };
        case 'CLEAR_TEMPORAL':
            return { ...state, temporal: { level: 'all' } };
        case 'CLEAR_CATEGORY':
            return { ...state, category: { level: 'all' } };
        case 'CLEAR_LOCATION':
            return { ...state, location: {} };
        case 'CLEAR_ALL_FILTERS':
            return getDefaultFilterState();
        default:
            return state;
    }
}

// ============================================================================
// Store Definition
// ============================================================================

interface HistoryFiltersStoreState extends HistoryFilterState {
    /** Process a filter action (backward-compatible with useReducer dispatch) */
    dispatch: (action: HistoryFilterAction) => void;
    /** Initialize filters (called by useHistoryFiltersInit on mount) */
    initializeFilters: (state: HistoryFilterState) => void;
}

export const useHistoryFiltersStore = create<HistoryFiltersStoreState>()(
    devtools(
        (set, get) => ({
            ...getDefaultFilterState(),

            dispatch: (action) => {
                const { temporal, category, location } = get();
                const currentState: HistoryFilterState = { temporal, category, location };
                const newState = historyFiltersReducer(currentState, action);
                set(newState, false, `historyFilters/${action.type}`);
            },

            initializeFilters: (state) => {
                set(
                    { temporal: state.temporal, category: state.category, location: state.location },
                    false,
                    'historyFilters/initialize'
                );
            },
        }),
        { name: 'history-filters-store', enabled: import.meta.env.DEV }
    )
);

// ============================================================================
// Typed Selectors
// ============================================================================

/** Get complete filter state as a memoized object */
export const useHistoryFiltersState = () =>
    useHistoryFiltersStore(
        useShallow((s) => ({ temporal: s.temporal, category: s.category, location: s.location }))
    );

/** Get dispatch function (stable reference) */
export const useHistoryFiltersDispatch = () =>
    useHistoryFiltersStore((s) => s.dispatch);

// ============================================================================
// Imperative Actions (for use outside React components)
// ============================================================================

export const historyFiltersActions = {
    dispatch: (action: HistoryFilterAction) =>
        useHistoryFiltersStore.getState().dispatch(action),
    initializeFilters: (state: HistoryFilterState) =>
        useHistoryFiltersStore.getState().initializeFilters(state),
    getState: (): HistoryFilterState => {
        const { temporal, category, location } = useHistoryFiltersStore.getState();
        return { temporal, category, location };
    },
};
