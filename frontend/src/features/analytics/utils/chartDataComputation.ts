/**
 * Chart Data Computation Utilities
 *
 * Story 10.0: Foundation Sprint - Split computeBarData() into 4 composable functions
 * @see docs/sprint-artifacts/epic10/story-10.0-foundation-sprint.md
 *
 * These functions replace the monolithic computeBarData() with composable building blocks
 * that can be reused across different chart types and analytics views.
 */

import type { Transaction } from '@/types/transaction';
import { getQuarterFromMonth } from './analyticsHelpers';
// Story 14.21: Use unified category colors
import { getCategoryBackgroundAuto } from '@/config/categoryColors';
import { byNumberDesc } from '@/utils/comparators';

// ============================================================================
// Types
// ============================================================================

export interface BarSegment {
  label: string;
  value: number;
  color: string;
}

export interface BarData {
  label: string;
  total: number;
  segments: BarSegment[];
}

export interface CategoryBreakdown {
  category: string;
  total: number;
  count: number;
  percentage: number;
}

export type TemporalLevel = 'year' | 'quarter' | 'month' | 'week' | 'day';
export type CategoryLevel = 'all' | 'category' | 'group' | 'subcategory';

export interface TemporalPosition {
  level: TemporalLevel;
  year: string;
  quarter?: string;
  month?: string;
  week?: number;
  day?: string;
}

export interface CategoryPosition {
  level: CategoryLevel;
  category?: string;
  group?: string;
  subcategory?: string;
}

export interface GroupedTransactions {
  key: string;
  transactions: Transaction[];
  total: number;
  segments: Record<string, number>;
}

export interface TimeSlot {
  key: string;
  label: string;
}

// ============================================================================
// Function 1: Group Transactions By Period
// ============================================================================

/**
 * Groups transactions by temporal period (quarter, month, week, day).
 * This is the first step in computing bar chart data.
 *
 * @param transactions - Filtered transactions to group
 * @param temporal - Current temporal navigation position
 * @param category - Current category navigation position
 * @returns Map of period keys to grouped transaction data
 */
export function groupTransactionsByPeriod(
  transactions: Transaction[],
  temporal: TemporalPosition,
  category: CategoryPosition
): Record<string, GroupedTransactions> {
  const groups: Record<string, GroupedTransactions> = {};

  transactions.forEach(tx => {
    const key = getPeriodKey(tx, temporal);
    if (!key) return;

    if (!groups[key]) {
      groups[key] = {
        key,
        transactions: [],
        total: 0,
        segments: {},
      };
    }

    groups[key].transactions.push(tx);

    // Calculate totals and segments based on category level
    const { total, segmentKey } = calculateTransactionContribution(tx, category);
    groups[key].total += total;

    if (segmentKey) {
      groups[key].segments[segmentKey] = (groups[key].segments[segmentKey] || 0) + total;
    }
  });

  return groups;
}

/**
 * Get the period key for a transaction based on temporal level.
 */
function getPeriodKey(tx: Transaction, temporal: TemporalPosition): string | null {
  if (temporal.level === 'year') {
    // Group by quarter (Q1-Q4)
    const txMonth = tx.date.substring(0, 7);
    return getQuarterFromMonth(txMonth);
  } else if (temporal.level === 'quarter') {
    // Group by month within quarter
    return tx.date.substring(0, 7); // YYYY-MM
  } else if (temporal.level === 'month') {
    // Group by week (W1-W5)
    const day = parseInt(tx.date.split('-')[2], 10);
    const weekNum = Math.ceil(day / 7);
    return `W${weekNum}`;
  } else if (temporal.level === 'week') {
    // Group by day of week (0-6)
    const date = new Date(tx.date + 'T12:00:00');
    return date.getDay().toString();
  }
  return null; // Day level has no grouping for bar chart
}

/**
 * Calculate transaction contribution to totals and segments based on category level.
 */
function calculateTransactionContribution(
  tx: Transaction,
  category: CategoryPosition
): { total: number; segmentKey: string | null } {
  if (category.level === 'all' || !category.category) {
    // At store level: use full transaction total, segment by store category
    return { total: tx.total, segmentKey: tx.category || 'Other' };
  } else if (category.level === 'category' || !category.group) {
    // At store category level: sum item prices, segment by item groups
    let total = 0;
    tx.items.forEach(item => {
      total += item.totalPrice;
    });
    // Segments are handled separately for item-level breakdown
    return { total, segmentKey: null };
  } else if (category.level === 'group' || !category.subcategory) {
    // At item group level: sum filtered item prices
    let total = 0;
    tx.items
      .filter(item => item.category === category.group)
      .forEach(item => {
        total += item.totalPrice;
      });
    return { total, segmentKey: null };
  } else {
    // At subcategory level: sum filtered item prices for that subcategory
    let total = 0;
    tx.items
      .filter(item => item.category === category.group && item.subcategory === category.subcategory)
      .forEach(item => {
        total += item.totalPrice;
      });
    return { total, segmentKey: category.subcategory || 'Other' };
  }
}

// ============================================================================
// Function 2: Calculate Period Totals with Segments
// ============================================================================

/**
 * Calculates detailed totals and segment breakdowns for grouped transactions.
 * Handles item-level aggregation for category/group/subcategory drill-down.
 *
 * @param transactions - Transactions within a period
 * @param category - Current category navigation position
 * @returns Object with total and segment breakdown
 */
export function calculatePeriodTotals(
  transactions: Transaction[],
  category: CategoryPosition
): { total: number; segments: Record<string, number> } {
  const segments: Record<string, number> = {};
  let total = 0;

  transactions.forEach(tx => {
    if (category.level === 'all' || !category.category) {
      // Store level: segment by store category
      total += tx.total;
      const segmentKey = tx.category || 'Other';
      segments[segmentKey] = (segments[segmentKey] || 0) + tx.total;
    } else if (category.level === 'category' || !category.group) {
      // Store category level: segment by item groups
      tx.items.forEach(item => {
        const segmentKey = item.category || 'General';
        segments[segmentKey] = (segments[segmentKey] || 0) + item.totalPrice;
        total += item.totalPrice;
      });
    } else if (category.level === 'group' || !category.subcategory) {
      // Item group level: segment by subcategories
      tx.items
        .filter(item => item.category === category.group)
        .forEach(item => {
          const segmentKey = item.subcategory || 'Other';
          segments[segmentKey] = (segments[segmentKey] || 0) + item.totalPrice;
          total += item.totalPrice;
        });
    } else {
      // Subcategory level: single segment for that subcategory
      tx.items
        .filter(item => item.category === category.group && item.subcategory === category.subcategory)
        .forEach(item => {
          const segmentKey = item.subcategory || 'Other';
          segments[segmentKey] = (segments[segmentKey] || 0) + item.totalPrice;
          total += item.totalPrice;
        });
    }
  });

  return { total, segments };
}

// ============================================================================
// Function 3: Calculate Category Breakdown
// ============================================================================

/**
 * Calculates category breakdown with percentages for transactions.
 * Used for pie charts and category distribution analysis.
 *
 * @param transactions - Transactions to analyze
 * @param category - Current category navigation position
 * @returns Array of category breakdowns sorted by total descending
 */
export function calculateCategoryBreakdown(
  transactions: Transaction[],
  category: CategoryPosition
): CategoryBreakdown[] {
  const breakdown: Record<string, { total: number; count: number }> = {};

  transactions.forEach(tx => {
    if (category.level === 'all' || !category.category) {
      // Store level: breakdown by store category
      const key = tx.category || 'Other';
      if (!breakdown[key]) {
        breakdown[key] = { total: 0, count: 0 };
      }
      breakdown[key].total += tx.total;
      breakdown[key].count += 1;
    } else if (category.level === 'category' || !category.group) {
      // Store category level: breakdown by item groups
      tx.items.forEach(item => {
        const key = item.category || 'General';
        if (!breakdown[key]) {
          breakdown[key] = { total: 0, count: 0 };
        }
        breakdown[key].total += item.totalPrice;
        breakdown[key].count += 1;
      });
    } else if (category.level === 'group' || !category.subcategory) {
      // Item group level: breakdown by subcategories
      tx.items
        .filter(item => item.category === category.group)
        .forEach(item => {
          const key = item.subcategory || 'Other';
          if (!breakdown[key]) {
            breakdown[key] = { total: 0, count: 0 };
          }
          breakdown[key].total += item.totalPrice;
          breakdown[key].count += 1;
        });
    } else {
      // Subcategory level: single category for selected subcategory
      tx.items
        .filter(item => item.category === category.group && item.subcategory === category.subcategory)
        .forEach(item => {
          const key = item.subcategory || 'Other';
          if (!breakdown[key]) {
            breakdown[key] = { total: 0, count: 0 };
          }
          breakdown[key].total += item.totalPrice;
          breakdown[key].count += 1;
        });
    }
  });

  const grandTotal = Object.values(breakdown).reduce((sum, b) => sum + b.total, 0);

  return Object.entries(breakdown)
    .map(([cat, data]) => ({
      category: cat,
      total: data.total,
      count: data.count,
      percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
    }))
    .sort(byNumberDesc('total'));
}

// ============================================================================
// Function 4: Format Chart Data
// ============================================================================

/**
 * Gets all time slots for a given temporal level.
 * Ensures consistent chart layout even with missing data.
 *
 * @param temporal - Current temporal navigation position
 * @param locale - Locale for day name formatting
 * @param hasWeek5Data - Whether there's data in week 5 (days 29-31)
 * @returns Array of time slots with keys and labels
 */
export function getTimeSlots(
  temporal: TemporalPosition,
  locale: string,
  hasWeek5Data: boolean = false
): TimeSlot[] {
  const dayNames = locale === 'es'
    ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (temporal.level === 'year') {
    return [
      { key: 'Q1', label: 'Q1' },
      { key: 'Q2', label: 'Q2' },
      { key: 'Q3', label: 'Q3' },
      { key: 'Q4', label: 'Q4' },
    ];
  } else if (temporal.level === 'quarter') {
    const year = parseInt(temporal.year, 10);
    const quarter = temporal.quarter || 'Q1';
    const quarterMonthStart = { Q1: 1, Q2: 4, Q3: 7, Q4: 10 }[quarter] || 1;

    return [0, 1, 2].map(offset => {
      const monthNum = quarterMonthStart + offset;
      const monthKey = `${year}-${monthNum.toString().padStart(2, '0')}`;
      const date = new Date(year, monthNum - 1, 2);
      const rawLabel = date.toLocaleString(locale === 'es' ? 'es-ES' : 'en-US', { month: 'short' });
      const label = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);
      return { key: monthKey, label };
    });
  } else if (temporal.level === 'month') {
    const slots = [
      { key: 'W1', label: 'W1' },
      { key: 'W2', label: 'W2' },
      { key: 'W3', label: 'W3' },
      { key: 'W4', label: 'W4' },
    ];
    if (hasWeek5Data) {
      slots.push({ key: 'W5', label: 'W5' });
    }
    return slots;
  } else if (temporal.level === 'week') {
    return [
      { key: '1', label: dayNames[1] }, // Mon
      { key: '2', label: dayNames[2] }, // Tue
      { key: '3', label: dayNames[3] }, // Wed
      { key: '4', label: dayNames[4] }, // Thu
      { key: '5', label: dayNames[5] }, // Fri
      { key: '6', label: dayNames[6] }, // Sat
      { key: '0', label: dayNames[0] }, // Sun
    ];
  }

  return [];
}

/**
 * Formats grouped transaction data into bar chart format.
 * Applies colors and handles empty slots.
 *
 * @param groupedData - Map of period keys to grouped data
 * @param slots - Time slots to display
 * @returns Array of bar data ready for chart rendering
 */
export function formatBarChartData(
  groupedData: Record<string, { total: number; segments: Record<string, number> }>,
  slots: TimeSlot[]
): BarData[] {
  return slots.map(slot => {
    const data = groupedData[slot.key];

    if (data) {
      const segments = Object.entries(data.segments).map(([segLabel, value]) => ({
        label: segLabel,
        value,
        color: getCategoryBackgroundAuto(segLabel),
      }));
      return { label: slot.label, total: data.total, segments };
    } else {
      return { label: slot.label, total: 0, segments: [] };
    }
  });
}

// ============================================================================
// Convenience Function: Complete Bar Data Computation
// ============================================================================

/**
 * Complete bar data computation combining all 4 functions.
 * This is a convenience function that provides the same output as the original
 * computeBarData() but using the composable building blocks.
 *
 * @param transactions - Already filtered transactions
 * @param temporal - Current temporal navigation position
 * @param category - Current category navigation position
 * @param locale - Locale for formatting
 * @returns Array of bar data ready for chart rendering
 */
export function computeBarDataFromTransactions(
  transactions: Transaction[],
  temporal: TemporalPosition,
  category: CategoryPosition,
  locale: string
): BarData[] {
  // Day view has no bar comparison
  if (temporal.level === 'day') {
    return [];
  }

  // Step 1: Group transactions by period
  const grouped = groupTransactionsByPeriod(transactions, temporal, category);

  // Step 2: Calculate detailed totals with segments
  const periodData: Record<string, { total: number; segments: Record<string, number> }> = {};
  Object.entries(grouped).forEach(([key, group]) => {
    const { total, segments } = calculatePeriodTotals(group.transactions, category);
    periodData[key] = { total, segments };
  });

  // Step 3: Get time slots
  const hasWeek5Data = periodData['W5'] && periodData['W5'].total > 0;
  const slots = getTimeSlots(temporal, locale, hasWeek5Data);

  // Step 4: Format for chart
  return formatBarChartData(periodData, slots);
}
