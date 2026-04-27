/**
 * Cascading Temporal Filter Builders
 *
 * Functions for building complete temporal filter states with cascading defaults.
 * When a higher-level dimension changes, lower-level dimensions cascade to their
 * first valid values.
 *
 * Story 14.14: Synchronized temporal navigation between breadcrumbs and IconFilterBar
 * Extracted from historyFilterUtils.ts in Story 15b-2k
 */

import type { TemporalFilterState } from '@/types/historyFilters';

// ============================================================================
// Module-Level Helpers (TD-15b-17: hoisted from buildCascadingTemporalFilter)
// ============================================================================

function getFirstMonthOfQuarter(y: string, q: string): string {
  const qNum = parseInt(q.replace('Q', ''), 10);
  const monthNum = (qNum - 1) * 3 + 1;
  return `${y}-${String(monthNum).padStart(2, '0')}`;
}

function getQuarterFromMonthStr(m: string): string {
  const monthNum = parseInt(m.split('-')[1], 10);
  return `Q${Math.ceil(monthNum / 3)}`;
}

const FIRST_WEEK = 1;

function getFirstDayOfWeek(m: string, w: number): string {
  const [y, mon] = m.split('-');
  const dayNum = (w - 1) * 7 + 1;
  return `${y}-${mon}-${String(dayNum).padStart(2, '0')}`;
}

// ============================================================================
// Cascading Filter Builders
// ============================================================================

/**
 * Build a complete temporal filter state with cascading defaults.
 * When a higher-level dimension changes, lower-level dimensions cascade to their first valid values.
 *
 * Story 14.14: Synchronized temporal navigation between breadcrumbs and IconFilterBar
 *
 * @param level - The target filter level
 * @param year - Selected year
 * @param quarter - Selected quarter (Q1-Q4) - optional, will be derived from month if not provided
 * @param month - Selected month (YYYY-MM format) - optional, will cascade from quarter
 * @param week - Selected week (1-5) - optional, will cascade from month
 * @param day - Selected day (YYYY-MM-DD format) - optional, will cascade from week
 * @returns Complete TemporalFilterState with all appropriate fields populated
 */
export function buildCascadingTemporalFilter(
  level: 'year' | 'quarter' | 'month' | 'week' | 'day',
  year: string,
  quarter?: string,
  month?: string,
  week?: number,
  day?: string
): TemporalFilterState {
  // Build the filter based on level
  if (level === 'year') {
    return { level: 'year', year };
  }

  if (level === 'quarter') {
    const q = quarter || 'Q1';
    return { level: 'quarter', year, quarter: q };
  }

  if (level === 'month') {
    // Derive month from quarter if not provided
    const q = quarter || (month ? getQuarterFromMonthStr(month) : 'Q1');
    const m = month || getFirstMonthOfQuarter(year, q);
    // Ensure month is within the quarter
    const monthQuarter = getQuarterFromMonthStr(m);
    const finalMonth = monthQuarter === q ? m : getFirstMonthOfQuarter(year, q);
    return { level: 'month', year, quarter: q, month: finalMonth };
  }

  if (level === 'week') {
    const q = quarter || (month ? getQuarterFromMonthStr(month) : 'Q1');
    const m = month || getFirstMonthOfQuarter(year, q);
    // Ensure month is within the quarter
    const monthQuarter = getQuarterFromMonthStr(m);
    const finalMonth = monthQuarter === q ? m : getFirstMonthOfQuarter(year, q);
    const w = week !== undefined ? week : FIRST_WEEK;
    return { level: 'week', year, quarter: q, month: finalMonth, week: w };
  }

  if (level === 'day') {
    const q = quarter || (month ? getQuarterFromMonthStr(month) : 'Q1');
    const m = month || getFirstMonthOfQuarter(year, q);
    // Ensure month is within the quarter
    const monthQuarter = getQuarterFromMonthStr(m);
    const finalMonth = monthQuarter === q ? m : getFirstMonthOfQuarter(year, q);
    const w = week !== undefined ? week : FIRST_WEEK;
    const d = day || getFirstDayOfWeek(finalMonth, w);
    return { level: 'day', year, quarter: q, month: finalMonth, week: w, day: d };
  }

  // Default fallback
  return { level: 'all' };
}

/**
 * Build temporal filter when changing year.
 * Cascades to Q1 → January → Week 1 → Day 1
 */
export function buildYearFilter(year: string): TemporalFilterState {
  return buildCascadingTemporalFilter('year', year);
}

/**
 * Build temporal filter when changing quarter.
 * Cascades to first month of quarter → Week 1 → Day 1
 */
export function buildQuarterFilter(year: string, quarter: string): TemporalFilterState {
  return buildCascadingTemporalFilter('quarter', year, quarter);
}

/**
 * Build temporal filter when changing month.
 * Updates quarter if needed, cascades to Week 1 → Day 1
 */
export function buildMonthFilter(year: string, month: string): TemporalFilterState {
  const quarter = getQuarterFromMonthStr(month);
  return buildCascadingTemporalFilter('month', year, quarter, month);
}

/**
 * Build temporal filter when changing week.
 * Cascades to first day of week
 */
export function buildWeekFilter(year: string, month: string, week: number): TemporalFilterState {
  const quarter = getQuarterFromMonthStr(month);
  return buildCascadingTemporalFilter('week', year, quarter, month, week);
}

/**
 * Build temporal filter when changing day.
 * Full specification - no cascading needed
 */
export function buildDayFilter(year: string, month: string, week: number, day: string): TemporalFilterState {
  const quarter = getQuarterFromMonthStr(month);
  return buildCascadingTemporalFilter('day', year, quarter, month, week, day);
}
