/**
 * Temporal Period Navigation
 *
 * Functions for navigating forward/backward through temporal periods
 * (year, quarter, month, week, day) in the history filter system.
 *
 * Story 14.9: Swipe Time Navigation
 * Extracted from historyFilterUtils.ts in Story 15b-2k
 */

import type { TemporalFilterState } from '@/types/historyFilters';
import { formatTemporalRange } from './temporalFormatters';

/**
 * Calculate the next temporal period based on current temporal state.
 * Navigates forward in time at the current granularity level.
 *
 * Story 14.9: Swipe Time Navigation
 * @param current - Current temporal filter state
 * @returns Next temporal filter state (or null if can't go further)
 */
export function getNextTemporalPeriod(
  current: TemporalFilterState
): TemporalFilterState | null {
  if (current.level === 'all') return null;

  // Day navigation
  if (current.level === 'day' && current.day && current.month && current.year) {
    const [year, month, day] = current.day.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    // If next day is still in same week
    const nextDay = day + 1;
    if (nextDay <= daysInMonth) {
      const nextDayStr = `${year}-${month.toString().padStart(2, '0')}-${nextDay.toString().padStart(2, '0')}`;
      const nextWeek = Math.ceil(nextDay / 7);
      return {
        level: 'day',
        year: current.year,
        month: current.month,
        week: nextWeek,
        day: nextDayStr,
      };
    }

    // Move to first day of next month
    const nextMonthDate = new Date(year, month, 1);
    const nextYear = nextMonthDate.getFullYear().toString();
    const nextMonth = `${nextYear}-${(nextMonthDate.getMonth() + 1).toString().padStart(2, '0')}`;
    return {
      level: 'day',
      year: nextYear,
      month: nextMonth,
      week: 1,
      day: `${nextMonth}-01`,
    };
  }

  // Week navigation
  if (current.level === 'week' && current.month && current.week !== undefined && current.year) {
    const [year, monthNum] = current.month.split('-').map(Number);
    const daysInMonth = new Date(year, monthNum, 0).getDate();
    const totalWeeks = Math.ceil(daysInMonth / 7);

    const nextWeek = current.week + 1;
    if (nextWeek <= totalWeeks) {
      return {
        level: 'week',
        year: current.year,
        month: current.month,
        week: nextWeek,
      };
    }

    // Move to first week of next month
    const nextMonthDate = new Date(year, monthNum, 1);
    const nextYear = nextMonthDate.getFullYear().toString();
    const nextMonth = `${nextYear}-${(nextMonthDate.getMonth() + 1).toString().padStart(2, '0')}`;
    return {
      level: 'week',
      year: nextYear,
      month: nextMonth,
      week: 1,
    };
  }

  // Month navigation
  if (current.level === 'month' && current.month && current.year) {
    const [year, monthNum] = current.month.split('-').map(Number);
    const nextMonthDate = new Date(year, monthNum, 1);
    const nextYear = nextMonthDate.getFullYear().toString();
    const nextMonth = `${nextYear}-${(nextMonthDate.getMonth() + 1).toString().padStart(2, '0')}`;
    return {
      level: 'month',
      year: nextYear,
      month: nextMonth,
    };
  }

  // Quarter navigation
  if (current.level === 'quarter' && current.quarter && current.year) {
    const currentQ = parseInt(current.quarter.replace('Q', ''), 10);
    if (currentQ < 4) {
      return {
        level: 'quarter',
        year: current.year,
        quarter: `Q${currentQ + 1}`,
      };
    }
    // Move to Q1 of next year
    const nextYear = (parseInt(current.year, 10) + 1).toString();
    return {
      level: 'quarter',
      year: nextYear,
      quarter: 'Q1',
    };
  }

  // Year navigation
  if (current.level === 'year' && current.year) {
    const nextYear = (parseInt(current.year, 10) + 1).toString();
    return {
      level: 'year',
      year: nextYear,
    };
  }

  return null;
}

/**
 * Calculate the previous temporal period based on current temporal state.
 * Navigates backward in time at the current granularity level.
 *
 * Story 14.9: Swipe Time Navigation
 * @param current - Current temporal filter state
 * @returns Previous temporal filter state (or null if can't go further)
 */
export function getPrevTemporalPeriod(
  current: TemporalFilterState
): TemporalFilterState | null {
  if (current.level === 'all') return null;

  // Day navigation
  if (current.level === 'day' && current.day && current.month && current.year) {
    const [year, month, day] = current.day.split('-').map(Number);

    // If prev day is still in same month
    const prevDay = day - 1;
    if (prevDay >= 1) {
      const prevDayStr = `${year}-${month.toString().padStart(2, '0')}-${prevDay.toString().padStart(2, '0')}`;
      const prevWeek = Math.ceil(prevDay / 7);
      return {
        level: 'day',
        year: current.year,
        month: current.month,
        week: prevWeek,
        day: prevDayStr,
      };
    }

    // Move to last day of previous month
    const prevMonthDate = new Date(year, month - 1, 0);
    const prevYear = prevMonthDate.getFullYear().toString();
    const prevMonthNum = prevMonthDate.getMonth() + 1;
    const prevMonth = `${prevYear}-${prevMonthNum.toString().padStart(2, '0')}`;
    const lastDay = prevMonthDate.getDate();
    const lastWeek = Math.ceil(lastDay / 7);
    return {
      level: 'day',
      year: prevYear,
      month: prevMonth,
      week: lastWeek,
      day: `${prevMonth}-${lastDay.toString().padStart(2, '0')}`,
    };
  }

  // Week navigation
  if (current.level === 'week' && current.month && current.week !== undefined && current.year) {
    const prevWeek = current.week - 1;
    if (prevWeek >= 1) {
      return {
        level: 'week',
        year: current.year,
        month: current.month,
        week: prevWeek,
      };
    }

    // Move to last week of previous month
    const [year, monthNum] = current.month.split('-').map(Number);
    const prevMonthDate = new Date(year, monthNum - 1, 0);
    const prevYear = prevMonthDate.getFullYear().toString();
    const prevMonthNum = prevMonthDate.getMonth() + 1;
    const prevMonth = `${prevYear}-${prevMonthNum.toString().padStart(2, '0')}`;
    const daysInPrevMonth = prevMonthDate.getDate();
    const lastWeek = Math.ceil(daysInPrevMonth / 7);
    return {
      level: 'week',
      year: prevYear,
      month: prevMonth,
      week: lastWeek,
    };
  }

  // Month navigation
  if (current.level === 'month' && current.month && current.year) {
    const [year, monthNum] = current.month.split('-').map(Number);
    const prevMonthDate = new Date(year, monthNum - 2, 1);
    const prevYear = prevMonthDate.getFullYear().toString();
    const prevMonth = `${prevYear}-${(prevMonthDate.getMonth() + 1).toString().padStart(2, '0')}`;
    return {
      level: 'month',
      year: prevYear,
      month: prevMonth,
    };
  }

  // Quarter navigation
  if (current.level === 'quarter' && current.quarter && current.year) {
    const currentQ = parseInt(current.quarter.replace('Q', ''), 10);
    if (currentQ > 1) {
      return {
        level: 'quarter',
        year: current.year,
        quarter: `Q${currentQ - 1}`,
      };
    }
    // Move to Q4 of previous year
    const prevYear = (parseInt(current.year, 10) - 1).toString();
    return {
      level: 'quarter',
      year: prevYear,
      quarter: 'Q4',
    };
  }

  // Year navigation
  if (current.level === 'year' && current.year) {
    const prevYear = (parseInt(current.year, 10) - 1).toString();
    return {
      level: 'year',
      year: prevYear,
    };
  }

  return null;
}

/**
 * Get display label for the next period (for preview during swipe).
 * Story 14.9: Swipe Time Navigation
 */
export function getNextPeriodLabel(
  current: TemporalFilterState,
  locale: string = 'en'
): string | null {
  const next = getNextTemporalPeriod(current);
  if (!next) return null;
  return formatTemporalRange(next, locale);
}

/**
 * Get display label for the previous period (for preview during swipe).
 * Story 14.9: Swipe Time Navigation
 */
export function getPrevPeriodLabel(
  current: TemporalFilterState,
  locale: string = 'en'
): string | null {
  const prev = getPrevTemporalPeriod(current);
  if (!prev) return null;
  return formatTemporalRange(prev, locale);
}
