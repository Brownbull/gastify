/**
 * useTrendsViewSync - Bidirectional filter sync hook
 *
 * Story 15b-2m: Extracted from TrendsView.tsx
 *
 * Encapsulates the complex bidirectional synchronization between
 * TrendsView's local period state and the useHistoryFiltersStore (Zustand).
 * Owns timePeriod, currentPeriod, and carouselSlide state plus
 * their persistence-aware wrapped setters.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { HistoryFilterState } from '@/types/historyFilters';
import type { HistoryFilterAction } from '@/types/historyFilters';
import {
    buildYearFilter,
    buildQuarterFilter,
    buildMonthFilter,
    buildWeekFilter,
} from '@shared/utils/historyFilterUtils';
import { getStorageString, setStorageString, getStorageJSON, setStorageJSON } from '@/utils/storage';
import type { TimePeriod, CurrentPeriod, CarouselSlide } from './types';

export interface UseTrendsViewSyncProps {
    filterState: HistoryFilterState;
    filterDispatch: React.Dispatch<HistoryFilterAction>;
}

export interface UseTrendsViewSyncReturn {
    timePeriod: TimePeriod;
    setTimePeriod: (newPeriod: TimePeriod) => void;
    currentPeriod: CurrentPeriod;
    setCurrentPeriod: (updater: CurrentPeriod | ((prev: CurrentPeriod) => CurrentPeriod)) => void;
    carouselSlide: CarouselSlide;
    setCarouselSlide: (value: CarouselSlide | ((prev: CarouselSlide) => CarouselSlide)) => void;
}

export function useTrendsViewSync({
    filterState,
    filterDispatch,
}: UseTrendsViewSyncProps): UseTrendsViewSyncReturn {
    // Time period selection (AC #2)
    // Persist time period to localStorage so it's retained on back navigation
    const [timePeriod, setTimePeriodLocal] = useState<TimePeriod>(() => {
        const saved = getStorageString('boletapp-analytics-timeperiod', 'month');
        if (['year', 'quarter', 'month', 'week'].includes(saved)) {
            return saved as TimePeriod;
        }
        return 'month';
    });

    // Current period navigation (AC #3)
    // Persist current period to localStorage so it's retained on back navigation
    const now = new Date();
    const [currentPeriod, setCurrentPeriodLocal] = useState<CurrentPeriod>(() => {
        const defaultPeriod: CurrentPeriod = {
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            quarter: Math.ceil((now.getMonth() + 1) / 3),
            week: Math.ceil(now.getDate() / 7),
        };
        const parsed = getStorageJSON<CurrentPeriod | null>('boletapp-analytics-currentperiod', null);
        // Validate the parsed object has required fields and sensible ranges
        if (parsed && typeof parsed.year === 'number' && typeof parsed.month === 'number' &&
            typeof parsed.quarter === 'number' && typeof parsed.week === 'number' &&
            parsed.year >= 2000 && parsed.year <= 2100 &&
            parsed.month >= 1 && parsed.month <= 12 &&
            parsed.quarter >= 1 && parsed.quarter <= 4 &&
            parsed.week >= 1 && parsed.week <= 5) {
            return parsed;
        }
        return defaultPeriod;
    });

    // Track if we're updating from context to prevent loops
    const isUpdatingFromContext = useRef(false);

    // =========================================================================
    // Bidirectional Sync: TrendsView ↔ IconFilterBar (useHistoryFiltersStore)
    // =========================================================================

    // Sync FROM context TO local state (when IconFilterBar changes temporal filter)
    useEffect(() => {
        const temporal = filterState.temporal;
        if (temporal.level === 'all') return; // No filter active, don't sync

        isUpdatingFromContext.current = true;

        // Map context level to TimePeriod
        const levelToTimePeriod: Record<string, TimePeriod> = {
            year: 'year',
            quarter: 'quarter',
            month: 'month',
            week: 'week',
            day: 'week', // Day filter maps to week view
        };

        const newTimePeriod = levelToTimePeriod[temporal.level];
        if (newTimePeriod && newTimePeriod !== timePeriod) {
            setTimePeriodLocal(newTimePeriod);
        }

        // Update currentPeriod from context values
        const newPeriod: CurrentPeriod = { ...currentPeriod };
        let hasChanges = false;

        if (temporal.year && parseInt(temporal.year, 10) !== currentPeriod.year) {
            newPeriod.year = parseInt(temporal.year, 10);
            hasChanges = true;
        }

        if (temporal.quarter) {
            const quarterNum = parseInt(temporal.quarter.replace('Q', ''), 10);
            if (quarterNum !== currentPeriod.quarter) {
                newPeriod.quarter = quarterNum;
                hasChanges = true;
            }
        }

        if (temporal.month) {
            const monthNum = parseInt(temporal.month.split('-')[1], 10);
            if (monthNum !== currentPeriod.month) {
                newPeriod.month = monthNum;
                newPeriod.quarter = Math.ceil(monthNum / 3);
                hasChanges = true;
            }
        }

        if (temporal.week !== undefined && temporal.week !== currentPeriod.week) {
            newPeriod.week = temporal.week;
            hasChanges = true;
        }

        if (hasChanges) {
            setCurrentPeriodLocal(newPeriod);
        }

        // Reset flag after state updates (microtask runs after current synchronous batch)
        queueMicrotask(() => {
            isUpdatingFromContext.current = false;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- timePeriod and currentPeriod intentionally omitted to prevent sync loops (this effect updates them)
    }, [filterState.temporal]);

    // Wrapped setters that also dispatch to context (sync TO context)
    // Also persist to localStorage for back navigation
    // Cascade time period changes properly (e.g., Q3 → Month = July)
    const setTimePeriod = useCallback((newPeriod: TimePeriod) => {
        // Calculate cascaded values based on current time period and new selection
        // When drilling down (e.g., Quarter → Month), use first unit of current period
        // When drilling up (e.g., Month → Year), keep current values
        let adjustedMonth = currentPeriod.month;
        let adjustedQuarter = currentPeriod.quarter;
        let adjustedWeek = currentPeriod.week;

        // Smart cascade logic - when drilling down from Year view,
        // use current date's values if viewing current year, otherwise use last period with likely data
        const today = new Date();
        const currentYear = today.getFullYear();
        const isCurrentYear = currentPeriod.year === currentYear;

        // Cascade logic: When switching to a finer granularity, set to appropriate period
        if (timePeriod === 'year') {
            // From Year: use current date values for current year, or last period for historical years
            if (newPeriod === 'quarter') {
                if (isCurrentYear) {
                    // Current year: use today's quarter
                    adjustedQuarter = Math.ceil((today.getMonth() + 1) / 3);
                    adjustedMonth = today.getMonth() + 1;
                } else {
                    // Historical year: default to Q4 (most likely to have data at year end)
                    adjustedQuarter = 4;
                    adjustedMonth = 12;
                }
                adjustedWeek = 1;
            } else if (newPeriod === 'month') {
                if (isCurrentYear) {
                    // Current year: use today's month
                    adjustedMonth = today.getMonth() + 1;
                    adjustedQuarter = Math.ceil(adjustedMonth / 3);
                } else {
                    // Historical year: default to December (most likely to have data)
                    adjustedMonth = 12;
                    adjustedQuarter = 4;
                }
                adjustedWeek = 1;
            } else if (newPeriod === 'week') {
                if (isCurrentYear) {
                    // Current year: use today's values
                    adjustedMonth = today.getMonth() + 1;
                    adjustedQuarter = Math.ceil(adjustedMonth / 3);
                    adjustedWeek = Math.ceil(today.getDate() / 7);
                } else {
                    // Historical year: default to last week of December
                    adjustedMonth = 12;
                    adjustedQuarter = 4;
                    adjustedWeek = 4; // ~4th week of December
                }
            }
        } else if (timePeriod === 'quarter') {
            // From Quarter: set month to first month of current quarter, week to 1
            if (newPeriod === 'month') {
                // Q1=Jan(1), Q2=Apr(4), Q3=Jul(7), Q4=Oct(10)
                adjustedMonth = (currentPeriod.quarter - 1) * 3 + 1;
                adjustedWeek = 1;
            } else if (newPeriod === 'week') {
                adjustedMonth = (currentPeriod.quarter - 1) * 3 + 1;
                adjustedWeek = 1;
            }
        } else if (timePeriod === 'month') {
            // From Month: set week to 1
            if (newPeriod === 'week') {
                adjustedWeek = 1;
            }
            // Update quarter based on current month when going up
            if (newPeriod === 'quarter' || newPeriod === 'year') {
                adjustedQuarter = Math.ceil(currentPeriod.month / 3);
            }
        } else if (timePeriod === 'week') {
            // From Week: update quarter based on current month when going up
            if (newPeriod === 'quarter' || newPeriod === 'year') {
                adjustedQuarter = Math.ceil(currentPeriod.month / 3);
            }
        }

        // Update currentPeriod with adjusted values
        setCurrentPeriodLocal(prev => {
            const updated = {
                ...prev,
                month: adjustedMonth,
                quarter: adjustedQuarter,
                week: adjustedWeek,
            };
            setStorageJSON('boletapp-analytics-currentperiod', updated);
            return updated;
        });

        setTimePeriodLocal(newPeriod);
        setStorageString('boletapp-analytics-timeperiod', newPeriod);

        // Don't dispatch if we're updating from context
        if (isUpdatingFromContext.current) return;

        // Dispatch to context based on new period type with adjusted values
        const yearStr = String(currentPeriod.year);
        const monthStr = `${currentPeriod.year}-${String(adjustedMonth).padStart(2, '0')}`;
        const quarterStr = `Q${adjustedQuarter}`;

        switch (newPeriod) {
            case 'year':
                filterDispatch({ type: 'SET_TEMPORAL_FILTER', payload: buildYearFilter(yearStr) });
                break;
            case 'quarter':
                filterDispatch({ type: 'SET_TEMPORAL_FILTER', payload: buildQuarterFilter(yearStr, quarterStr) });
                break;
            case 'month':
                filterDispatch({ type: 'SET_TEMPORAL_FILTER', payload: buildMonthFilter(yearStr, monthStr) });
                break;
            case 'week':
                filterDispatch({ type: 'SET_TEMPORAL_FILTER', payload: buildWeekFilter(yearStr, monthStr, adjustedWeek) });
                break;
        }
    }, [timePeriod, currentPeriod, filterDispatch]);

    // Persist currentPeriod to localStorage for back navigation
    const setCurrentPeriod = useCallback((updater: CurrentPeriod | ((prev: CurrentPeriod) => CurrentPeriod)) => {
        setCurrentPeriodLocal(prev => {
            const newPeriod = typeof updater === 'function' ? updater(prev) : updater;

            setStorageJSON('boletapp-analytics-currentperiod', newPeriod);

            // Don't dispatch if we're updating from context
            if (!isUpdatingFromContext.current) {
                // Dispatch to context based on current timePeriod level
                const yearStr = String(newPeriod.year);
                const monthStr = `${newPeriod.year}-${String(newPeriod.month).padStart(2, '0')}`;
                const quarterStr = `Q${newPeriod.quarter}`;

                // setTimeout(0) intentional: dispatch after React state batch commit (macro-task)
                setTimeout(() => {
                    switch (timePeriod) {
                        case 'year':
                            filterDispatch({ type: 'SET_TEMPORAL_FILTER', payload: buildYearFilter(yearStr) });
                            break;
                        case 'quarter':
                            filterDispatch({ type: 'SET_TEMPORAL_FILTER', payload: buildQuarterFilter(yearStr, quarterStr) });
                            break;
                        case 'month':
                            filterDispatch({ type: 'SET_TEMPORAL_FILTER', payload: buildMonthFilter(yearStr, monthStr) });
                            break;
                        case 'week':
                            filterDispatch({ type: 'SET_TEMPORAL_FILTER', payload: buildWeekFilter(yearStr, monthStr, newPeriod.week) });
                            break;
                    }
                }, 0);
            }

            return newPeriod;
        });
    }, [timePeriod, filterDispatch]);

    // Carousel state (AC #4)
    // Persist carousel position so navigating back returns to same slide
    const [carouselSlide, setCarouselSlideLocal] = useState<CarouselSlide>(() => {
        const saved = getStorageString('boletapp-analytics-carousel', '0');
        if (saved === '0' || saved === '1') {
            return parseInt(saved) as CarouselSlide;
        }
        return 0;
    });

    // Wrapped setter that persists carousel position
    const setCarouselSlide = useCallback((value: CarouselSlide | ((prev: CarouselSlide) => CarouselSlide)) => {
        setCarouselSlideLocal(prev => {
            const newValue = typeof value === 'function' ? value(prev) : value;
            setStorageString('boletapp-analytics-carousel', String(newValue));
            return newValue;
        });
    }, []);

    return {
        timePeriod,
        setTimePeriod,
        currentPeriod,
        setCurrentPeriod,
        carouselSlide,
        setCarouselSlide,
    };
}
