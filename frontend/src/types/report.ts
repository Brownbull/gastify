/**
 * Report types for weekly/monthly/quarterly/yearly spending summaries.
 *
 * Story 14.16: Weekly Report Story Format
 * Epic 14: Core Implementation
 *
 * Provides type definitions for Instagram-style swipeable report cards
 * that display spending summaries in a Rosa-friendly format.
 */

import type { StoreCategory, ItemCategory } from '../../shared/schema/categories';
import type { StoreCategoryGroup, ItemCategoryGroup } from '../config/categoryColors';
import { formatCurrency as formatCurrencyFull, DEFAULT_CURRENCY } from '@/utils/currency';

/**
 * Type of report card for styling and content
 */
export type ReportCardType = 'summary' | 'category' | 'trend' | 'milestone';

/**
 * Time period type for reports
 */
export type ReportPeriodType = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

/**
 * Trend direction for comparison indicators
 */
export type TrendDirection = 'up' | 'down' | 'neutral';

/**
 * Configuration for a single report card
 */
export interface ReportCard {
  /** Unique identifier for the card */
  id: string;
  /** Type of card (summary, category, etc.) */
  type: ReportCardType;
  /** Card title (e.g., "Esta Semana") */
  title: string;
  /** Primary value to display (e.g., "$45.200") */
  primaryValue: string;
  /** Secondary value (optional, e.g., "vs $42.000 la semana pasada") */
  secondaryValue?: string;
  /** Trend direction for comparison arrow */
  trend?: TrendDirection;
  /** Trend percentage (e.g., 8 for +8%) */
  trendPercent?: number;
  /** Background color or gradient */
  color?: string;
  /** Category for category breakdown cards */
  category?: StoreCategory;
  /** Category emoji icon */
  categoryIcon?: string;
  /** Rosa-friendly description */
  description?: string;
}

/**
 * Category breakdown for a spending period
 */
export interface CategoryBreakdown {
  /** Store category */
  category: StoreCategory;
  /** Category emoji icon */
  icon: string;
  /** Total amount spent */
  amount: number;
  /** Percentage of total spending */
  percent: number;
  /** Number of transactions */
  transactionCount: number;
  /** Trend vs previous period */
  trend?: TrendDirection;
  /** Trend percentage */
  trendPercent?: number;
}

/**
 * Weekly spending summary data
 */
export interface WeeklySummary {
  /** Total spent this week */
  totalSpent: number;
  /** Total spent previous week */
  previousWeekSpent: number;
  /** Trend percentage change */
  trendPercent: number;
  /** Trend direction */
  trendDirection: TrendDirection;
  /** Top spending categories */
  topCategories: CategoryBreakdown[];
  /** Date range for the week */
  dateRange: {
    start: Date;
    end: Date;
  };
  /** Week number in the year */
  weekNumber: number;
  /** Whether this is the user's first week */
  isFirstWeek: boolean;
  /** Total number of transactions in this week */
  transactionCount: number;
}

/**
 * Trend arrow color configuration using CSS variables.
 * Story 14.16b: Migrated to semantic colors for theme harmony.
 *
 * Up (spending increased) = Negative semantic color (red tones)
 * Down (spending decreased) = Positive semantic color (green tones)
 * Neutral = Neutral semantic color (gray tones)
 *
 * Colors adapt per theme:
 * - Normal: Terracotta red / Sage green / Warm gray
 * - Professional: Clear red / Clear green / Cool gray
 * - Mono: Clay red / Teal green / True gray
 */
export const TREND_COLORS = {
  up: 'var(--negative-primary)', // Spending increased (bad) - theme-aware red
  down: 'var(--positive-primary)', // Spending decreased (good) - theme-aware green
  neutral: 'var(--neutral-primary)', // No change - theme-aware gray
} as const;

/**
 * Rosa-friendly trend descriptions (Chilean Spanish)
 */
export const TREND_DESCRIPTIONS = {
  up: {
    high: 'Subió harto', // > 20%
    medium: 'Subió un poco', // 10-20%
    low: 'Subió apenas', // < 10%
  },
  down: {
    high: 'Bajó harto', // > 20%
    medium: 'Bajó un poco', // 10-20%
    low: 'Bajó apenas', // < 10%
  },
  neutral: 'Igual que antes',
} as const;

/**
 * Get Rosa-friendly trend description based on direction and percentage
 * @param direction Trend direction
 * @param percent Absolute percentage change
 * @returns Rosa-friendly description string
 */
export function getTrendDescription(
  direction: TrendDirection,
  percent: number
): string {
  if (direction === 'neutral') {
    return TREND_DESCRIPTIONS.neutral;
  }

  const absPercent = Math.abs(percent);
  const magnitude = absPercent > 20 ? 'high' : absPercent >= 10 ? 'medium' : 'low';

  return TREND_DESCRIPTIONS[direction][magnitude];
}

/**
 * Calculate trend direction from percentage change
 * @param currentValue Current period value
 * @param previousValue Previous period value
 * @param neutralThreshold Threshold below which change is considered neutral (default: 2%)
 * @returns Trend direction and percentage
 */
export function calculateTrend(
  currentValue: number,
  previousValue: number,
  neutralThreshold: number = 2
): { direction: TrendDirection; percent: number } {
  if (previousValue === 0) {
    return { direction: 'neutral', percent: 0 };
  }

  const percentChange = ((currentValue - previousValue) / previousValue) * 100;
  const absChange = Math.abs(percentChange);

  if (absChange < neutralThreshold) {
    return { direction: 'neutral', percent: Math.round(percentChange) };
  }

  return {
    direction: percentChange > 0 ? 'up' : 'down',
    percent: Math.round(percentChange),
  };
}

/**
 * Format currency for display using the app's default currency (CLP).
 * Convenience wrapper for report-specific usage where currency is always the default.
 *
 * @param amount Amount in smallest units
 * @returns Formatted string (e.g., "$45.200")
 */
export function formatCurrency(amount: number): string {
  return formatCurrencyFull(amount, DEFAULT_CURRENCY);
}

/**
 * Format date range for display
 * @param start Start date
 * @param end End date
 * @returns Formatted date range string
 */
export function formatDateRange(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
  };
  const startStr = start.toLocaleDateString('es-CL', options);
  const endStr = end.toLocaleDateString('es-CL', options);
  return `${startStr} - ${endStr}`;
}

// ============================================================================
// Transaction Groups - Story 14.16
// Semantic grouping of store categories for progressive report breakdown
// ============================================================================

/**
 * Category within a transaction group
 * Represents a single store category's spending within a group
 */
export interface GroupedCategory {
  /** Store category key (e.g., 'Supermarket', 'Restaurant') */
  key: StoreCategory;
  /** Display name in Spanish (e.g., 'Supermercado') */
  name: string;
  /** Number of transactions (e.g., '5 compras') */
  count: string;
  /** Formatted amount (e.g., '$22.500') */
  amount: string;
  /** Raw amount for sorting */
  rawAmount: number;
  /** Percentage of total period spending (Story 14.16) */
  percent: number;
  /** Trend direction vs previous period (up = more spending = bad, down = less = good) */
  trend?: TrendDirection;
  /** Trend percentage change (absolute value) */
  trendPercent?: number;
}

/**
 * Transaction group aggregating related store categories
 * Story 14.16: Used for weekly report breakdown by store type
 *
 * @example
 * ```ts
 * const group: TransactionGroup = {
 *   key: 'supermercados',
 *   name: 'Supermercados',
 *   emoji: '🛒',
 *   cssClass: 'supermercados',
 *   totalAmount: '$35.300',
 *   rawTotalAmount: 35300,
 *   categories: [
 *     { key: 'Supermarket', name: 'Supermercado', count: '5 compras', amount: '$22.500', rawAmount: 22500 },
 *     { key: 'Restaurant', name: 'Restaurantes', count: '3 compras', amount: '$12.800', rawAmount: 12800 }
 *   ]
 * };
 * ```
 */
export interface TransactionGroup {
  /** Group key matching StoreCategoryGroup (e.g., 'supermercados') */
  key: StoreCategoryGroup;
  /** Display name in Spanish (e.g., 'Alimentación') */
  name: string;
  /** Group emoji for visual identification */
  emoji: string;
  /** CSS class for styling (matches mockup category-group classes) */
  cssClass: string;
  /** Formatted total amount for the group */
  totalAmount: string;
  /** Raw total amount for sorting */
  rawTotalAmount: number;
  /** Percentage of total period spending (Story 14.16) */
  percent: number;
  /** Categories within this group, sorted by amount descending */
  categories: GroupedCategory[];
  /** Trend direction vs previous period (up = more spending = bad, down = less = good) */
  trend?: TrendDirection;
  /** Trend percentage change (absolute value) */
  trendPercent?: number;
}

// ============================================================================
// Item Groups - Story 14.16
// Semantic grouping of item categories for product-level breakdown
// ============================================================================

/**
 * Item within an item group
 * Represents a single item category's spending within a group
 */
export interface GroupedItem {
  /** Item category key (e.g., 'Produce', 'Meat & Seafood') */
  key: ItemCategory | string;
  /** Display name in Spanish (e.g., 'Frutas y Verduras') */
  name: string;
  /** Number of items (e.g., '12 items') */
  count: string;
  /** Formatted amount (e.g., '$15.500') */
  amount: string;
  /** Raw amount for sorting */
  rawAmount: number;
  /** Percentage of total period item spending (Story 14.16) */
  percent: number;
  /** Trend direction vs previous period (up = more spending = bad, down = less = good) */
  trend?: TrendDirection;
  /** Trend percentage change (absolute value) */
  trendPercent?: number;
}

/**
 * Item group aggregating related item categories
 * Story 14.16: Used for report breakdown by product type
 *
 * @example
 * ```ts
 * const group: ItemGroup = {
 *   key: 'food-fresh',
 *   name: 'Alimentos Frescos',
 *   emoji: '🥬',
 *   cssClass: 'food-fresh',
 *   totalAmount: '$25.300',
 *   rawTotalAmount: 25300,
 *   items: [
 *     { key: 'Produce', name: 'Frutas y Verduras', count: '8 items', amount: '$12.500', rawAmount: 12500 },
 *     { key: 'Meat & Seafood', name: 'Carnes y Mariscos', count: '4 items', amount: '$12.800', rawAmount: 12800 }
 *   ]
 * };
 * ```
 */
export interface ItemGroup {
  /** Group key matching ItemCategoryGroup (e.g., 'food-fresh') */
  key: ItemCategoryGroup;
  /** Display name in Spanish (e.g., 'Alimentos Frescos') */
  name: string;
  /** Group emoji for visual identification */
  emoji: string;
  /** CSS class for styling (matches mockup item-group classes) */
  cssClass: string;
  /** Formatted total amount for the group */
  totalAmount: string;
  /** Raw total amount for sorting */
  rawTotalAmount: number;
  /** Percentage of total period item spending (Story 14.16) */
  percent: number;
  /** Items within this group, sorted by amount descending */
  items: GroupedItem[];
  /** Trend direction vs previous period (up = more spending = bad, down = less = good) */
  trend?: TrendDirection;
  /** Trend percentage change (absolute value) */
  trendPercent?: number;
}
