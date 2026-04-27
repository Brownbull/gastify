/**
 * Period Comparison Utilities
 *
 * Story 14.13.2: Period-over-period comparison calculations for Tendencia slide
 *
 * Provides utilities for:
 * - Calculating previous periods (week, month, quarter, year)
 * - Computing percentage changes between periods
 * - Handling edge cases (new categories, year boundaries)
 */

import { toDateSafe } from '@/utils/timestamp';
import { byNumberDesc } from '@/utils/comparators';

// ============================================================================
// Types
// ============================================================================

/** Time period granularity */
export type TimePeriod = 'week' | 'month' | 'quarter' | 'year';

/** Period identifier */
export interface PeriodIdentifier {
    year: number;
    month?: number;
    quarter?: number;
    /** Week of month (1-5), NOT ISO week number */
    week?: number;
}

/** Change direction indicator */
export type ChangeDirection = 'up' | 'down' | 'same' | 'new';

/** Change calculation result */
export interface ChangeResult {
    percent: number;
    direction: ChangeDirection;
}

/** Category with trend data */
export interface CategoryTrendData {
    name: string;
    currentValue: number;
    previousValue: number;
    changePercent: number | null; // null = new category
    changeDirection: ChangeDirection;
    count: number;
    color: string;
    emoji?: string;
    categoryCount?: number; // For aggregated "Más" group
}

// ============================================================================
// Period Calculation Functions
// ============================================================================

/**
 * Get the ISO week number for a given date
 * ISO weeks start on Monday, week 1 is the week containing January 4th
 */
export function getISOWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Get the number of ISO weeks in a year
 * Most years have 52 weeks, but some have 53
 */
export function getWeeksInYear(year: number): number {
    // December 31st of the year
    const dec31 = new Date(year, 11, 31);
    const week = getISOWeekNumber(dec31);
    // If Dec 31 is in week 1, the year has 52 weeks; otherwise it's the week number
    return week === 1 ? 52 : week;
}

/**
 * Get the number of weeks in a specific month (week of month = ceil(day/7))
 * Most months have 4-5 weeks
 */
export function getWeeksInMonth(year: number, month: number): number {
    const lastDay = new Date(year, month, 0).getDate(); // Last day of month
    return Math.ceil(lastDay / 7);
}

/**
 * Calculate the previous period based on current period and time granularity
 *
 * Week comparison uses week-of-month (1-5), NOT ISO weeks.
 *
 * @param currentPeriod - Current period identifier
 * @param timePeriod - Time granularity (week, month, quarter, year)
 * @returns Previous period identifier
 *
 * @example
 * // Week 2 of Jan 2026 -> Week 1 of Jan 2026
 * getPreviousPeriod({ year: 2026, month: 1, week: 2 }, 'week')
 *
 * @example
 * // Week 1 of Jan 2026 -> Week 4/5 of Dec 2025 (last week of previous month)
 * getPreviousPeriod({ year: 2026, month: 1, week: 1 }, 'week')
 *
 * @example
 * // January 2026 -> December 2025
 * getPreviousPeriod({ year: 2026, month: 1 }, 'month')
 */
export function getPreviousPeriod(
    currentPeriod: PeriodIdentifier,
    timePeriod: TimePeriod
): PeriodIdentifier {
    switch (timePeriod) {
        case 'week': {
            if (!currentPeriod.week || !currentPeriod.month) {
                throw new Error('Week and month numbers required for week period comparison');
            }
            // Previous week within month
            if (currentPeriod.week > 1) {
                return {
                    year: currentPeriod.year,
                    month: currentPeriod.month,
                    week: currentPeriod.week - 1,
                };
            }
            // Week 1 -> go to last week of previous month
            const prevMonth = currentPeriod.month === 1 ? 12 : currentPeriod.month - 1;
            const prevYear = currentPeriod.month === 1 ? currentPeriod.year - 1 : currentPeriod.year;
            const weeksInPrevMonth = getWeeksInMonth(prevYear, prevMonth);
            return {
                year: prevYear,
                month: prevMonth,
                week: weeksInPrevMonth,
            };
        }
        case 'month': {
            if (!currentPeriod.month) {
                throw new Error('Month number required for month period comparison');
            }
            // Previous month (handle year boundary)
            if (currentPeriod.month === 1) {
                return { year: currentPeriod.year - 1, month: 12 };
            }
            return { year: currentPeriod.year, month: currentPeriod.month - 1 };
        }
        case 'quarter': {
            if (!currentPeriod.quarter) {
                throw new Error('Quarter number required for quarter period comparison');
            }
            // Previous quarter (handle year boundary)
            if (currentPeriod.quarter === 1) {
                return { year: currentPeriod.year - 1, quarter: 4 };
            }
            return { year: currentPeriod.year, quarter: currentPeriod.quarter - 1 };
        }
        case 'year': {
            return { year: currentPeriod.year - 1 };
        }
        default:
            throw new Error(`Unknown time period: ${timePeriod}`);
    }
}

// ============================================================================
// Change Calculation Functions
// ============================================================================

/**
 * Calculate percentage change between two values
 *
 * @param current - Current period value
 * @param previous - Previous period value
 * @returns Change result with percent and direction
 *
 * Rules:
 * - If previous is 0 and current > 0: direction is 'new' (new category)
 * - If both are 0: direction is 'same' with 0%
 * - If change is < 0.5%: direction is 'same' with 0%
 * - Otherwise: 'up' for increase, 'down' for decrease
 */
export function calculateChange(current: number, previous: number): ChangeResult {
    // New category (no previous data)
    if (previous === 0 && current > 0) {
        return { percent: 0, direction: 'new' };
    }

    // Both zero - no change
    if (previous === 0 && current === 0) {
        return { percent: 0, direction: 'same' };
    }

    // Calculate percentage change
    const percent = ((current - previous) / previous) * 100;

    // Small changes treated as "same"
    if (Math.abs(percent) < 0.5) {
        return { percent: 0, direction: 'same' };
    }

    return {
        percent: Math.round(percent),
        direction: percent > 0 ? 'up' : 'down',
    };
}

// ============================================================================
// Transaction Filtering Functions
// ============================================================================

/**
 * Get the week of month for a date (1-5)
 * Week 1 = days 1-7, Week 2 = days 8-14, etc.
 */
export function getWeekOfMonth(date: Date): number {
    return Math.ceil(date.getDate() / 7);
}

/**
 * Check if a date falls within a specific period
 *
 * Week comparison uses week-of-month (1-5), NOT ISO weeks.
 *
 * @param date - Date to check
 * @param period - Period identifier
 * @param timePeriod - Time granularity
 * @returns True if date is within the period
 */
export function isDateInPeriod(
    date: Date,
    period: PeriodIdentifier,
    timePeriod: TimePeriod
): boolean {
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 1-indexed

    switch (timePeriod) {
        case 'year':
            return year === period.year;

        case 'quarter': {
            if (year !== period.year || !period.quarter) return false;
            const quarter = Math.ceil(month / 3);
            return quarter === period.quarter;
        }

        case 'month':
            return year === period.year && month === period.month;

        case 'week': {
            // Week-of-month comparison (not ISO weeks)
            // Must match year, month, AND week-of-month
            if (year !== period.year || month !== period.month || !period.week) {
                return false;
            }
            const weekOfMonth = getWeekOfMonth(date);
            return weekOfMonth === period.week;
        }

        default:
            return false;
    }
}

/**
 * Filter transactions by period
 *
 * @param transactions - Array of transactions with date property
 * @param period - Period to filter by
 * @param timePeriod - Time granularity
 * @returns Filtered transactions
 */
export function filterTransactionsByPeriod<T extends { date: Date | { toDate: () => Date } }>(
    transactions: T[],
    period: PeriodIdentifier,
    timePeriod: TimePeriod
): T[] {
    return transactions.filter(tx => {
        const date = toDateSafe(tx.date);
        return date ? isDateInPeriod(date, period, timePeriod) : false;
    });
}

// ============================================================================
// Aggregation Functions
// ============================================================================

/**
 * Aggregate transaction values by category
 *
 * @param transactions - Transactions to aggregate
 * @param getCategoryFn - Function to extract category from transaction
 * @returns Map of category name to total value
 */
export function aggregateByCategory<T extends { total: number }>(
    transactions: T[],
    getCategoryFn: (tx: T) => string
): Map<string, number> {
    const totals = new Map<string, number>();

    for (const tx of transactions) {
        const category = getCategoryFn(tx);
        totals.set(category, (totals.get(category) || 0) + tx.total);
    }

    return totals;
}

/**
 * Count transactions by category
 *
 * @param transactions - Transactions to count
 * @param getCategoryFn - Function to extract category from transaction
 * @returns Map of category name to count
 */
export function countByCategory<T>(
    transactions: T[],
    getCategoryFn: (tx: T) => string
): Map<string, number> {
    const counts = new Map<string, number>();

    for (const tx of transactions) {
        const category = getCategoryFn(tx);
        counts.set(category, (counts.get(category) || 0) + 1);
    }

    return counts;
}

// ============================================================================
// Period Comparison Main Function
// ============================================================================

export interface PeriodComparisonInput<T> {
    /** All transactions */
    transactions: T[];
    /** Current period */
    currentPeriod: PeriodIdentifier;
    /** Time granularity */
    timePeriod: TimePeriod;
    /** Function to extract date from transaction */
    getDateFn: (tx: T) => Date;
    /** Function to extract category from transaction */
    getCategoryFn: (tx: T) => string;
    /** Function to extract value (total) from transaction */
    getValueFn: (tx: T) => number;
    /** Function to get color for category */
    getColorFn: (category: string) => string;
}

export interface PeriodComparisonResult {
    /** Trend data sorted by current value descending */
    trendData: CategoryTrendData[];
    /** Previous period identifier */
    previousPeriod: PeriodIdentifier;
    /** Total current period value */
    currentTotal: number;
    /** Total previous period value */
    previousTotal: number;
}

/**
 * Calculate period-over-period comparison for all categories
 *
 * @param input - Comparison input parameters
 * @returns Comparison results with trend data
 */
export function calculatePeriodComparison<T>(
    input: PeriodComparisonInput<T>
): PeriodComparisonResult {
    const {
        transactions,
        currentPeriod,
        timePeriod,
        getDateFn,
        getCategoryFn,
        getValueFn,
        getColorFn,
    } = input;

    // Get previous period
    const previousPeriod = getPreviousPeriod(currentPeriod, timePeriod);

    // Filter transactions by period
    const currentTransactions = transactions.filter(tx =>
        isDateInPeriod(getDateFn(tx), currentPeriod, timePeriod)
    );
    const previousTransactions = transactions.filter(tx =>
        isDateInPeriod(getDateFn(tx), previousPeriod, timePeriod)
    );

    // Aggregate by category
    const currentTotals = new Map<string, { value: number; count: number }>();
    const previousTotals = new Map<string, number>();

    for (const tx of currentTransactions) {
        const category = getCategoryFn(tx);
        const existing = currentTotals.get(category) || { value: 0, count: 0 };
        currentTotals.set(category, {
            value: existing.value + getValueFn(tx),
            count: existing.count + 1,
        });
    }

    for (const tx of previousTransactions) {
        const category = getCategoryFn(tx);
        previousTotals.set(category, (previousTotals.get(category) || 0) + getValueFn(tx));
    }

    // Calculate totals
    let currentTotal = 0;
    let previousTotal = 0;

    currentTotals.forEach(({ value }) => {
        currentTotal += value;
    });
    previousTotals.forEach(value => {
        previousTotal += value;
    });

    // Build trend data for current period categories only
    const trendData: CategoryTrendData[] = [];

    currentTotals.forEach(({ value, count }, category) => {
        const previousValue = previousTotals.get(category) || 0;
        const change = calculateChange(value, previousValue);

        trendData.push({
            name: category,
            currentValue: value,
            previousValue,
            changePercent: change.direction === 'new' ? null : change.percent,
            changeDirection: change.direction,
            count,
            color: getColorFn(category),
        });
    });

    // Sort by current value descending
    trendData.sort(byNumberDesc('currentValue'));

    return {
        trendData,
        previousPeriod,
        currentTotal,
        previousTotal,
    };
}
