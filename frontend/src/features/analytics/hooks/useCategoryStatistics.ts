/**
 * useCategoryStatistics - Hook to calculate category statistics
 *
 * Story 14.40: Category Statistics Popup
 *
 * Calculates aggregated statistics for a specific category within
 * the currently filtered transactions:
 * - Transaction statistics (count, total, min, max, avg, median)
 * - Item statistics (count, min, max, avg, median prices)
 * - Insights (top merchant, percentage of total, period comparison)
 *
 * @see docs/sprint-artifacts/epic14/stories/story-14.40-category-statistics-popup.md
 */

import { useMemo } from 'react';
import type { Transaction, TransactionItem } from '@/types/transaction';
import { calculateBasicStats, findMostFrequent } from '@features/analytics/utils/statisticsUtils';
import {
  STORE_CATEGORY_GROUPS,
  ITEM_CATEGORY_TO_KEY,
  ITEM_CATEGORY_GROUPS,
} from '@/config/categoryColors';
import { normalizeItemCategory } from '@/utils/categoryNormalizer';

/**
 * Statistics for a category in the current time period
 */
export interface CategoryStatistics {
  // Transaction stats
  transactionCount: number;
  totalSpent: number;
  minTransaction: number;
  maxTransaction: number;
  avgTransaction: number;
  medianTransaction: number;

  // Item stats (optional - only if items exist)
  itemCount?: number;
  minItemPrice?: number;
  maxItemPrice?: number;
  avgItemPrice?: number;
  medianItemPrice?: number;

  // Insights
  topMerchant?: string;
  topMerchantCount?: number;
  percentageOfTotal: number;
  periodComparison?: 'up' | 'down' | 'same' | null;
}

/**
 * Category type determines how we filter transactions/items
 */
export type CategoryFilterType =
  | 'store-category'        // e.g., "Supermercado"
  | 'store-group'           // e.g., "supermercados"
  | 'item-category'         // e.g., "Carnes y Mariscos"
  | 'item-group';           // e.g., "food-fresh"

interface UseCategoryStatisticsParams {
  /** All transactions in the current time period (already filtered) */
  transactions: Transaction[];
  /** Category name to calculate statistics for */
  categoryName: string;
  /** Type of category filter */
  categoryType: CategoryFilterType;
  /** Total spent across all categories (for percentage calculation) */
  totalSpentAllCategories: number;
}

/**
 * Check if a transaction matches the category filter
 */
const transactionMatchesCategory = (
  tx: Transaction,
  categoryName: string,
  categoryType: CategoryFilterType
): boolean => {
  switch (categoryType) {
    case 'store-category':
      return tx.category === categoryName;

    case 'store-group': {
      // categoryName is the group key like 'supermercados'
      // Check if transaction's category belongs to this group
      const txGroup = STORE_CATEGORY_GROUPS[tx.category as keyof typeof STORE_CATEGORY_GROUPS];
      return txGroup === categoryName;
    }

    case 'item-category':
    case 'item-group':
      // For item-level filtering, we need to check items
      // Return true if any item matches - actual filtering happens at item level
      return true;

    default:
      return false;
  }
};

/**
 * Check if an item matches the category filter
 *
 * Story 14.44: Item categories may be stored in Spanish (e.g., "Comida Preparada")
 * but categoryName is passed in English (e.g., "Prepared Food"). We must normalize
 * item.category to English before comparison.
 */
/**
 * Check if an item matches the category filter
 *
 * Story 14.44: Item categories may be stored in Spanish (e.g., "Comida Preparada")
 * but categoryName is passed in English (e.g., "Prepared Food"). We must normalize
 * item.category to English before comparison.
 */
/**
 * Check if an item matches the category filter
 *
 * Story 14.44: Item categories may be stored in Spanish (e.g., "Comida Preparada")
 * but categoryName is passed in English (e.g., "Prepared Food"). We must normalize
 * item.category to English before comparison.
 */
const itemMatchesCategory = (
  item: TransactionItem,
  categoryName: string,
  categoryType: CategoryFilterType
): boolean => {
  switch (categoryType) {
    case 'item-category': {
      // Story 14.44: Normalize item category to English before comparison
      // Item categories may be stored in Spanish/translated form
      const normalizedItemCategory = normalizeItemCategory(item.category || '');
      return normalizedItemCategory === categoryName;
    }

    case 'item-group': {
      // categoryName is the group key like 'food-fresh'
      // Story 14.44: Normalize item category first, then look up its group
      if (!item.category) return false;
      const normalizedItemCategory = normalizeItemCategory(item.category);
      // Look up group from the normalized (English) category name
      const itemKey = ITEM_CATEGORY_TO_KEY[normalizedItemCategory as keyof typeof ITEM_CATEGORY_TO_KEY];
      const itemGroup = itemKey ? ITEM_CATEGORY_GROUPS[itemKey as keyof typeof ITEM_CATEGORY_GROUPS] : 'otros-item';
      return itemGroup === categoryName;
    }

    case 'store-category':
    case 'store-group':
      // Store-level categories match all items in matching transactions
      return true;

    default:
      return false;
  }
};

/**
 * Calculate statistics for a specific category
 */
export const useCategoryStatistics = ({
  transactions,
  categoryName,
  categoryType,
  totalSpentAllCategories,
}: UseCategoryStatisticsParams): CategoryStatistics | null => {
  return useMemo(() => {
    if (!categoryName) return null;

    // Filter transactions based on category type
    let matchingTransactions: Transaction[];

    if (categoryType === 'store-category' || categoryType === 'store-group') {
      matchingTransactions = transactions.filter((tx) =>
        transactionMatchesCategory(tx, categoryName, categoryType)
      );
    } else {
      // For item-level categories, include transactions that have matching items
      matchingTransactions = transactions.filter((tx) =>
        tx.items?.some((item) => itemMatchesCategory(item, categoryName, categoryType))
      );
    }

    if (matchingTransactions.length === 0) {
      return null;
    }

    // Calculate transaction-level statistics
    const transactionTotals = matchingTransactions.map((tx) => tx.total);
    const txStats = calculateBasicStats(transactionTotals);

    // Get merchant data for top merchant calculation
    // Prefer alias (user-friendly name) over raw merchant name when available
    const merchants = matchingTransactions
      .map((tx) => tx.alias || tx.merchant)
      .filter((m): m is string => !!m && m !== 'Unknown');

    const topMerchantResult = findMostFrequent(merchants);

    // Calculate item-level statistics if applicable
    let itemStats: {
      itemCount: number;
      minItemPrice: number;
      maxItemPrice: number;
      avgItemPrice: number;
      medianItemPrice: number;
    } | null = null;

    // Collect item prices
    const itemPrices: number[] = [];

    for (const tx of matchingTransactions) {
      if (!tx.items) continue;

      for (const item of tx.items) {
        // For store-level categories, include all items from matching transactions
        // For item-level categories, only include matching items
        const shouldInclude =
          categoryType === 'store-category' || categoryType === 'store-group'
            ? true
            : itemMatchesCategory(item, categoryName, categoryType);

        if (shouldInclude && item.totalPrice && item.totalPrice > 0) {
          itemPrices.push(item.totalPrice);
        }
      }
    }

    if (itemPrices.length > 0) {
      const itemBasicStats = calculateBasicStats(itemPrices);
      itemStats = {
        itemCount: itemBasicStats.count,
        minItemPrice: itemBasicStats.min,
        maxItemPrice: itemBasicStats.max,
        avgItemPrice: itemBasicStats.avg,
        medianItemPrice: itemBasicStats.median,
      };
    }

    // Calculate percentage of total
    const percentageOfTotal =
      totalSpentAllCategories > 0
        ? (txStats.sum / totalSpentAllCategories) * 100
        : 0;

    return {
      // Transaction stats
      transactionCount: txStats.count,
      totalSpent: txStats.sum,
      minTransaction: txStats.min,
      maxTransaction: txStats.max,
      avgTransaction: txStats.avg,
      medianTransaction: txStats.median,

      // Item stats
      ...(itemStats && {
        itemCount: itemStats.itemCount,
        minItemPrice: itemStats.minItemPrice,
        maxItemPrice: itemStats.maxItemPrice,
        avgItemPrice: itemStats.avgItemPrice,
        medianItemPrice: itemStats.medianItemPrice,
      }),

      // Insights
      topMerchant: topMerchantResult?.[0],
      topMerchantCount: topMerchantResult?.[1],
      percentageOfTotal,
      periodComparison: null, // TODO: Implement period comparison in future story
    };
  }, [transactions, categoryName, categoryType, totalSpentAllCategories]);
};
