/**
 * Report Category Grouping Utilities
 *
 * Category breakdown, store/item grouping, and category name formatting.
 * Imports only from reportDateUtils (calculateTotal).
 */

import type { Transaction } from '@/types/transaction';
import type { StoreCategory } from '../../../../shared/schema/categories';
import type {
  CategoryBreakdown,
  TrendDirection,
  TransactionGroup,
  GroupedCategory,
  ItemGroup,
  GroupedItem,
} from '@/types/report';
import {
  formatCurrency,
  calculateTrend,
} from '@/types/report';
import { getCategoryEmoji } from '@/utils/categoryEmoji';
import {
  STORE_CATEGORY_GROUPS,
  STORE_GROUP_INFO,
  ITEM_GROUP_INFO,
  getItemCategoryGroup,
  type StoreCategoryGroup,
  type ItemCategoryGroup,
} from '@/config/categoryColors';
import { translateItemGroup, translateStoreCategory } from '@/utils/categoryTranslations';
import { TRANSLATIONS, type Language } from '@/utils/translations';
import { getSettingsState } from '@shared/stores/useSettingsStore';
import { calculateTotal } from './reportDateUtils';

// ============================================================================
// Constants
// ============================================================================

/** Threshold below which spending change is considered neutral (%) */
export const NEUTRAL_THRESHOLD = 2;

/**
 * Fallback item category key when a scanned item has no category assigned.
 * This is a data key, not a display string — display translation happens
 * downstream via translateItemGroup('Other', lang) which returns 'Otro'/'Other'.
 */
const FALLBACK_ITEM_CATEGORY = 'Other' as const;

/** Item count labels — kept local; translations.ts is a flat data file excluded from size hooks */
const ITEM_COUNT_LABELS: Record<Language, { singular: string; plural: string }> = {
  es: { singular: 'ítem', plural: 'ítems' },
  en: { singular: 'item', plural: 'items' },
};

// ============================================================================
// Category Breakdown Generation
// ============================================================================

/**
 * Group transactions by category and calculate breakdown
 */
export function getCategoryBreakdown(
  transactions: Transaction[],
  previousTransactions?: Transaction[]
): CategoryBreakdown[] {
  const totalSpent = calculateTotal(transactions);

  // Group by category
  const categoryMap = new Map<
    StoreCategory,
    { amount: number; transactionCount: number }
  >();

  for (const t of transactions) {
    const existing = categoryMap.get(t.category) || { amount: 0, transactionCount: 0 };
    categoryMap.set(t.category, {
      amount: existing.amount + t.total,
      transactionCount: existing.transactionCount + 1,
    });
  }

  // Calculate previous period category totals for trend comparison
  const previousCategoryTotals = new Map<StoreCategory, number>();
  if (previousTransactions && previousTransactions.length > 0) {
    for (const t of previousTransactions) {
      const existing = previousCategoryTotals.get(t.category) || 0;
      previousCategoryTotals.set(t.category, existing + t.total);
    }
  }

  // Convert to array with percentages and trends
  const breakdowns: CategoryBreakdown[] = [];

  for (const [category, data] of categoryMap.entries()) {
    const percent = totalSpent > 0 ? Math.round((data.amount / totalSpent) * 100) : 0;
    const previousAmount = previousCategoryTotals.get(category) || 0;

    let trend: TrendDirection | undefined;
    let trendPercent: number | undefined;

    if (previousAmount > 0) {
      const trendResult = calculateTrend(data.amount, previousAmount, NEUTRAL_THRESHOLD);
      trend = trendResult.direction;
      trendPercent = Math.abs(trendResult.percent);
    }

    breakdowns.push({
      category,
      icon: getCategoryEmoji(category),
      amount: data.amount,
      percent,
      transactionCount: data.transactionCount,
      trend,
      trendPercent,
    });
  }

  // Sort by amount descending
  breakdowns.sort((a, b) => b.amount - a.amount);

  return breakdowns;
}

// ============================================================================
// Transaction Group Generation - Story 14.16
// Groups categories by StoreCategoryGroup for hierarchical display
// ============================================================================

/**
 * Group category breakdowns by store category group
 *
 * Story 14.16: Weekly reports show transactionGroups for high-level summary.
 * Groups related categories (e.g., Supermarket + Restaurant = "Alimentación")
 * into semantic groups with display metadata.
 *
 * @param categories - Category breakdown from getCategoryBreakdown()
 * @returns Array of TransactionGroup objects, sorted by total amount descending
 */
export function groupCategoriesByStoreGroup(
  categories: CategoryBreakdown[]
): TransactionGroup[] {
  const lang = getSettingsState().lang;
  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.es;
  // Calculate total spending across all categories for percentage calculation
  const totalPeriodAmount = categories.reduce((sum, cat) => sum + cat.amount, 0);

  // Group categories by their store category group
  const groupMap = new Map<StoreCategoryGroup, GroupedCategory[]>();
  const groupTotals = new Map<StoreCategoryGroup, number>();
  // Track previous period totals for group-level trend calculation
  const groupPrevTotals = new Map<StoreCategoryGroup, number>();

  for (const cat of categories) {
    const groupKey = STORE_CATEGORY_GROUPS[cat.category] || 'otros';
    // Calculate individual category percentage
    const categoryPercent = totalPeriodAmount > 0
      ? Math.round((cat.amount / totalPeriodAmount) * 100)
      : 0;

    const groupedCat: GroupedCategory = {
      key: cat.category,
      name: formatCategoryName(cat.category, lang),
      count: `${cat.transactionCount} ${cat.transactionCount === 1 ? t.reportPurchaseSingular : t.reportPurchasePlural}`,
      amount: formatCurrency(cat.amount),
      rawAmount: cat.amount,
      percent: categoryPercent,
      // Pass through trend data from CategoryBreakdown
      trend: cat.trend,
      trendPercent: cat.trendPercent,
    };

    const existingCats = groupMap.get(groupKey) || [];
    existingCats.push(groupedCat);
    groupMap.set(groupKey, existingCats);

    const existingTotal = groupTotals.get(groupKey) || 0;
    groupTotals.set(groupKey, existingTotal + cat.amount);

    // Calculate implied previous total for group trend
    // Skip when multiplier < 0.01 to prevent numerically unstable reverse-calculations
    if (cat.trend && cat.trendPercent !== undefined && cat.trendPercent > 0) {
      const multiplier = cat.trend === 'up' ? (1 + cat.trendPercent / 100) : (1 - cat.trendPercent / 100);
      if (multiplier >= 0.01) {
        const prevAmount = cat.amount / multiplier;
        const existingPrev = groupPrevTotals.get(groupKey) || 0;
        groupPrevTotals.set(groupKey, existingPrev + prevAmount);
      }
    }
  }

  // Convert map to array of TransactionGroup objects
  const groups: TransactionGroup[] = [];

  for (const [groupKey, groupedCategories] of groupMap.entries()) {
    const groupInfo = STORE_GROUP_INFO[groupKey];
    const rawTotal = groupTotals.get(groupKey) || 0;
    const prevTotal = groupPrevTotals.get(groupKey) || 0;

    // Calculate group-level percentage
    const groupPercent = totalPeriodAmount > 0
      ? Math.round((rawTotal / totalPeriodAmount) * 100)
      : 0;

    // Calculate group-level trend
    let groupTrend: TrendDirection | undefined;
    let groupTrendPercent: number | undefined;
    if (prevTotal > 0) {
      const { direction, percent } = calculateTrend(rawTotal, prevTotal, NEUTRAL_THRESHOLD);
      groupTrend = direction;
      groupTrendPercent = Math.abs(percent);
    }

    // Sort categories within group by amount descending
    groupedCategories.sort((a, b) => b.rawAmount - a.rawAmount);

    groups.push({
      key: groupKey,
      name: groupInfo.name,
      emoji: groupInfo.emoji,
      cssClass: groupInfo.cssClass,
      totalAmount: formatCurrency(rawTotal),
      rawTotalAmount: rawTotal,
      percent: groupPercent,
      categories: groupedCategories,
      trend: groupTrend,
      trendPercent: groupTrendPercent,
    });
  }

  // Sort groups by total amount descending
  groups.sort((a, b) => b.rawTotalAmount - a.rawTotalAmount);

  return groups;
}

/**
 * Sort transaction groups alphabetically by name
 * Used for monthly+ reports
 */
export function sortGroupsAlphabetically<T extends { name: string }>(groups: T[]): T[] {
  return [...groups].sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

// ============================================================================
// Item Group Generation - Story 14.16
// Groups items by ItemCategoryGroup for product-level breakdown
// ============================================================================

/**
 * Item breakdown data for grouping
 */
interface ItemBreakdown {
  category: string;
  amount: number;
  itemCount: number;
  trend?: TrendDirection;
  trendPercent?: number;
}

/**
 * Get item breakdown from transactions
 * Aggregates all items by their category across all transactions
 *
 * @param transactions - Array of transactions with items
 * @param previousTransactions - Optional previous period transactions for trend calculation
 * @returns Array of ItemBreakdown objects
 */
function getItemBreakdown(
  transactions: Transaction[],
  previousTransactions?: Transaction[]
): ItemBreakdown[] {
  const itemMap = new Map<string, { amount: number; count: number }>();

  for (const tx of transactions) {
    if (!tx.items || tx.items.length === 0) continue;

    for (const item of tx.items) {
      const category = item.category || FALLBACK_ITEM_CATEGORY;
      const existing = itemMap.get(category) || { amount: 0, count: 0 };
      // Story 14.24: price is total for line item, qty is informational only
      existing.amount += item.totalPrice;
      existing.count += item.qty || 1;
      itemMap.set(category, existing);
    }
  }

  // Calculate previous period totals for trend comparison
  const prevItemMap = new Map<string, number>();
  if (previousTransactions && previousTransactions.length > 0) {
    for (const tx of previousTransactions) {
      if (!tx.items || tx.items.length === 0) continue;
      for (const item of tx.items) {
        const category = item.category || FALLBACK_ITEM_CATEGORY;
        const existing = prevItemMap.get(category) || 0;
        // Story 14.24: price is total for line item, qty is informational only
        prevItemMap.set(category, existing + item.totalPrice);
      }
    }
  }

  const breakdowns: ItemBreakdown[] = [];
  for (const [category, data] of itemMap.entries()) {
    const prevAmount = prevItemMap.get(category) || 0;
    let trend: TrendDirection | undefined;
    let trendPercent: number | undefined;

    if (prevAmount > 0) {
      const trendResult = calculateTrend(data.amount, prevAmount, NEUTRAL_THRESHOLD);
      trend = trendResult.direction;
      trendPercent = Math.abs(trendResult.percent);
    }

    breakdowns.push({
      category,
      amount: data.amount,
      itemCount: data.count,
      trend,
      trendPercent,
    });
  }

  // Sort by amount descending
  breakdowns.sort((a, b) => b.amount - a.amount);

  return breakdowns;
}

/**
 * Group items by item category group
 *
 * Story 14.16: Reports show itemGroups for product-level summary.
 * Groups related items (e.g., Produce + Meat & Seafood = "Alimentos Frescos")
 * into semantic groups with display metadata.
 *
 * @param transactions - Transactions containing items to group
 * @returns Array of ItemGroup objects, sorted by total amount descending
 */
export function groupItemsByItemCategory(
  transactions: Transaction[],
  previousTransactions?: Transaction[]
): ItemGroup[] {
  const lang = getSettingsState().lang;
  const itemBreakdowns = getItemBreakdown(transactions, previousTransactions);

  // Calculate total item spending for percentage calculation
  const totalItemsAmount = itemBreakdowns.reduce((sum, item) => sum + item.amount, 0);

  // Group items by their item category group
  const groupMap = new Map<ItemCategoryGroup, GroupedItem[]>();
  const groupTotals = new Map<ItemCategoryGroup, number>();
  // Track previous period totals for group-level trend calculation
  const groupPrevTotals = new Map<ItemCategoryGroup, number>();

  const itemLabels = ITEM_COUNT_LABELS[lang];
  for (const item of itemBreakdowns) {
    const groupKey = getItemCategoryGroup(item.category);
    // Calculate individual item category percentage
    const itemPercent = totalItemsAmount > 0
      ? Math.round((item.amount / totalItemsAmount) * 100)
      : 0;

    const groupedItem: GroupedItem = {
      key: item.category,
      name: translateItemGroup(item.category, lang),
      count: `${item.itemCount} ${item.itemCount === 1 ? itemLabels.singular : itemLabels.plural}`,
      amount: formatCurrency(item.amount),
      rawAmount: item.amount,
      percent: itemPercent,
      // Pass through trend data
      trend: item.trend,
      trendPercent: item.trendPercent,
    };

    const existingItems = groupMap.get(groupKey) || [];
    existingItems.push(groupedItem);
    groupMap.set(groupKey, existingItems);

    const existingTotal = groupTotals.get(groupKey) || 0;
    groupTotals.set(groupKey, existingTotal + item.amount);

    // Calculate implied previous total for group trend
    // Skip when multiplier < 0.01 to prevent numerically unstable reverse-calculations
    if (item.trend && item.trendPercent !== undefined && item.trendPercent > 0) {
      const multiplier = item.trend === 'up' ? (1 + item.trendPercent / 100) : (1 - item.trendPercent / 100);
      if (multiplier >= 0.01) {
        const prevAmount = item.amount / multiplier;
        const existingPrev = groupPrevTotals.get(groupKey) || 0;
        groupPrevTotals.set(groupKey, existingPrev + prevAmount);
      }
    }
  }

  // Convert map to array of ItemGroup objects
  const groups: ItemGroup[] = [];

  for (const [groupKey, groupedItems] of groupMap.entries()) {
    const groupInfo = ITEM_GROUP_INFO[groupKey];
    const rawTotal = groupTotals.get(groupKey) || 0;
    const prevTotal = groupPrevTotals.get(groupKey) || 0;

    // Calculate group-level percentage
    const groupPercent = totalItemsAmount > 0
      ? Math.round((rawTotal / totalItemsAmount) * 100)
      : 0;

    // Calculate group-level trend
    let groupTrend: TrendDirection | undefined;
    let groupTrendPercent: number | undefined;
    if (prevTotal > 0) {
      const { direction, percent } = calculateTrend(rawTotal, prevTotal, NEUTRAL_THRESHOLD);
      groupTrend = direction;
      groupTrendPercent = Math.abs(percent);
    }

    // Sort items within group by amount descending
    groupedItems.sort((a, b) => b.rawAmount - a.rawAmount);

    groups.push({
      key: groupKey,
      name: groupInfo.name,
      emoji: groupInfo.emoji,
      cssClass: groupInfo.cssClass,
      totalAmount: formatCurrency(rawTotal),
      rawTotalAmount: rawTotal,
      percent: groupPercent,
      items: groupedItems,
      trend: groupTrend,
      trendPercent: groupTrendPercent,
    });
  }

  // Sort groups by total amount descending
  groups.sort((a, b) => b.rawTotalAmount - a.rawTotalAmount);

  return groups;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format category name in the given locale
 *
 * @param lang - Target language (default 'es' for backward compat)
 */
export function formatCategoryName(category: StoreCategory, lang: Language = 'es'): string {
  return translateStoreCategory(category, lang);
}
