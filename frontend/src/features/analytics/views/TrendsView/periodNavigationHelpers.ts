/**
 * Period Navigation Helpers
 *
 * Story 15-TD-5b: Extracted from TrendsView.tsx
 *
 * Pure functions for period arithmetic used by goPrevPeriod,
 * goNextPeriod, and handleTimePeriodClick event handlers.
 * These are state updater functions passed to setCurrentPeriod().
 */

import type { TimePeriod, CurrentPeriod } from './types';

/**
 * Compute the previous period from the current one.
 * Used as a state updater for setCurrentPeriod.
 */
export function getPreviousPeriodState(prev: CurrentPeriod, timePeriod: TimePeriod): CurrentPeriod {
    switch (timePeriod) {
        case 'year':
            return { ...prev, year: prev.year - 1 };
        case 'quarter':
            if (prev.quarter === 1) {
                return { ...prev, year: prev.year - 1, quarter: 4 };
            }
            return { ...prev, quarter: prev.quarter - 1 };
        case 'month':
            if (prev.month === 1) {
                return { ...prev, year: prev.year - 1, month: 12, quarter: 4 };
            }
            return {
                ...prev,
                month: prev.month - 1,
                quarter: Math.ceil((prev.month - 1) / 3),
            };
        case 'week':
            if (prev.week === 1) {
                // Go to previous month, last week
                const newMonth = prev.month === 1 ? 12 : prev.month - 1;
                const newYear = prev.month === 1 ? prev.year - 1 : prev.year;
                return {
                    ...prev,
                    year: newYear,
                    month: newMonth,
                    quarter: Math.ceil(newMonth / 3),
                    week: 4, // Approximate
                };
            }
            return { ...prev, week: prev.week - 1 };
    }
}

/**
 * Compute the next period from the current one.
 * Clamps to current date (won't navigate into the future).
 * Used as a state updater for setCurrentPeriod.
 */
export function getNextPeriodState(prev: CurrentPeriod, timePeriod: TimePeriod, now: Date): CurrentPeriod {
    switch (timePeriod) {
        case 'year':
            if (prev.year >= now.getFullYear()) return prev;
            return { ...prev, year: prev.year + 1 };
        case 'quarter':
            if (prev.year >= now.getFullYear() && prev.quarter >= Math.ceil((now.getMonth() + 1) / 3)) {
                return prev;
            }
            if (prev.quarter === 4) {
                return { ...prev, year: prev.year + 1, quarter: 1 };
            }
            return { ...prev, quarter: prev.quarter + 1 };
        case 'month':
            if (prev.year >= now.getFullYear() && prev.month >= now.getMonth() + 1) {
                return prev;
            }
            if (prev.month === 12) {
                return { ...prev, year: prev.year + 1, month: 1, quarter: 1 };
            }
            return {
                ...prev,
                month: prev.month + 1,
                quarter: Math.ceil((prev.month + 1) / 3),
            };
        case 'week':
            if (prev.week >= 4) {
                // Go to next month, first week
                if (prev.year >= now.getFullYear() && prev.month >= now.getMonth() + 1) {
                    return prev;
                }
                const newMonth = prev.month === 12 ? 1 : prev.month + 1;
                const newYear = prev.month === 12 ? prev.year + 1 : prev.year;
                return {
                    ...prev,
                    year: newYear,
                    month: newMonth,
                    quarter: Math.ceil(newMonth / 3),
                    week: 1,
                };
            }
            return { ...prev, week: prev.week + 1 };
    }
}

/**
 * Get the current "today" period values.
 * Used by handleTimePeriodClick to reset to current period.
 */
export function getCurrentDatePeriod(): CurrentPeriod {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentQuarter = Math.ceil(currentMonth / 3);
    const currentWeek = Math.ceil(now.getDate() / 7);

    return {
        year: currentYear,
        month: currentMonth,
        quarter: currentQuarter,
        week: currentWeek,
    };
}

/**
 * Check if the given period represents the current (today's) period.
 * Used for the visual indicator on time period pills.
 */
export function isCurrentPeriod(timePeriod: TimePeriod, currentPeriod: CurrentPeriod): boolean {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentQuarter = Math.ceil(currentMonth / 3);
    const currentWeek = Math.ceil(now.getDate() / 7);

    switch (timePeriod) {
        case 'year':
            return currentPeriod.year === currentYear;
        case 'quarter':
            return currentPeriod.year === currentYear && currentPeriod.quarter === currentQuarter;
        case 'month':
            return currentPeriod.year === currentYear && currentPeriod.month === currentMonth;
        case 'week':
            return currentPeriod.year === currentYear &&
                   currentPeriod.month === currentMonth &&
                   currentPeriod.week === currentWeek;
        default:
            return true;
    }
}
