/**
 * Story 15b-3g: History Filters Initialization Hook
 *
 * Replaces HistoryFiltersProvider — initializes Zustand store on mount
 * and syncs state changes back to the navigation store.
 *
 * Uses useLayoutEffect for initialization (prevents visual flash)
 * and useEffect for onChange sync (matches original Provider timing).
 */

import { useEffect, useLayoutEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
    useHistoryFiltersStore,
    getDefaultFilterState,
} from '@/shared/stores/useHistoryFiltersStore';
import type { HistoryFilterState } from '@/types/historyFilters';

interface UseHistoryFiltersInitOptions {
    initialState?: HistoryFilterState;
    onStateChange?: (state: HistoryFilterState) => void;
}

/**
 * Initialize history filters store and optionally sync state changes.
 *
 * Call at the top of view components that need history filter context.
 * For views without initialState/onStateChange (dashboard, trends),
 * call with no arguments to initialize with defaults.
 */
export function useHistoryFiltersInit(options?: UseHistoryFiltersInitOptions): void {
    const initializedRef = useRef(false);
    const initialState = options?.initialState;
    const onStateChange = options?.onStateChange;

    // Initialize store on mount (useLayoutEffect prevents visual flash)
    useLayoutEffect(() => {
        if (!initializedRef.current) {
            useHistoryFiltersStore.getState().initializeFilters(
                initialState ?? getDefaultFilterState()
            );
            initializedRef.current = true;
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- intentional: initialize once on mount only

    // Sync state changes to parent (backward compat with onStateChange)
    const state = useHistoryFiltersStore(
        useShallow((s) => ({ temporal: s.temporal, category: s.category, location: s.location }))
    );

    useEffect(() => {
        if (initializedRef.current && onStateChange) {
            onStateChange(state);
        }
    }, [state, onStateChange]);
}
