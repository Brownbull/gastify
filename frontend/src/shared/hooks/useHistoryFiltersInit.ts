/**
 * Story 15b-3g: History Filters Initialization Hook
 *
 * Initializes the Zustand history-filters store from URL search params
 * (TanStack Router) on mount. Falls back to default filters when no
 * search params are present.
 */

import { useLayoutEffect, useRef } from 'react';
import { useRouterState } from '@tanstack/react-router';
import {
    useHistoryFiltersStore,
    getDefaultFilterState,
} from '@/shared/stores/useHistoryFiltersStore';
import { searchParamsToHistoryFilter } from '@/lib/searchParamSerializers';
import type { HistoryFilterState } from '@/types/historyFilters';

interface UseHistoryFiltersInitOptions {
    initialState?: HistoryFilterState;
    onStateChange?: (state: HistoryFilterState) => void;
}

export function useHistoryFiltersInit(options?: UseHistoryFiltersInitOptions): void {
    const initializedRef = useRef(false);
    const searchParams = useRouterState({ select: (s) => s.location.search });

    // Derive initial state: URL search params > prop > defaults
    const filtersFromUrl = searchParamsToHistoryFilter(searchParams as Record<string, string>);
    const initialState = filtersFromUrl ?? options?.initialState;

    useLayoutEffect(() => {
        if (!initializedRef.current) {
            useHistoryFiltersStore.getState().initializeFilters(
                initialState ?? getDefaultFilterState()
            );
            initializedRef.current = true;
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
