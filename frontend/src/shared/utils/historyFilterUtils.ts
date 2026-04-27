/**
 * History Filter Utilities
 *
 * Filtering logic and helper functions for history transaction filtering.
 * Story 9.19: History Transaction Filters
 *
 * @see docs/sprint-artifacts/epic9/story-9.19-history-transaction-filters.md
 */

import type { Transaction } from '@/types/transaction';
import type { StoreCategory } from '../../../shared/schema/categories';
import type {
  HistoryFilterState,
  TemporalFilterState,
  CategoryFilterState,
  LocationFilterState,
} from '@/types/historyFilters';
// Story 14.15b: Category normalization for legacy data compatibility
import { normalizeItemCategory } from '@/utils/categoryNormalizer';
// Story 14.13a: Category group expansion for multi-dimension filtering
// Story 14.13 Session 15: Added getItemCategoryGroup and getStoreCategoryGroup for proper 'otros' group filtering
import {
  expandStoreCategoryGroup,
  expandItemCategoryGroup,
  getItemCategoryGroup,
  getStoreCategoryGroup,
  type StoreCategoryGroup,
  type ItemCategoryGroup,
} from '@/config/categoryColors';

// ============================================================================
// Filter Data Extraction
// ============================================================================

/**
 * Available filter options extracted from transaction data.
 */
export interface AvailableFilters {
  /** Unique years present in transactions */
  years: string[];
  /** Months by year (e.g., { "2024": ["2024-01", "2024-02"] }) */
  monthsByYear: Record<string, string[]>;
  /** Unique store categories */
  categories: string[];
  /** Item groups by store category */
  groupsByCategory: Record<string, string[]>;
  /** Subcategories by item group */
  subcategoriesByGroup: Record<string, string[]>;
  /** Unique countries */
  countries: string[];
  /** Cities by country */
  citiesByCountry: Record<string, string[]>;
}

/**
 * Extract available filter options from transactions.
 * Used to populate dropdown menus.
 */
export function extractAvailableFilters(transactions: Transaction[]): AvailableFilters {
  const yearsSet = new Set<string>();
  const monthsByYear: Record<string, Set<string>> = {};
  const categoriesSet = new Set<string>();
  const groupsByCategory: Record<string, Set<string>> = {};
  const subcategoriesByGroup: Record<string, Set<string>> = {};
  const countriesSet = new Set<string>();
  const citiesByCountry: Record<string, Set<string>> = {};

  for (const tx of transactions) {
    // Extract year
    const year = tx.date.substring(0, 4);
    yearsSet.add(year);

    // Extract month
    const month = tx.date.substring(0, 7);
    if (!monthsByYear[year]) {
      monthsByYear[year] = new Set();
    }
    monthsByYear[year].add(month);

    // Extract store category
    if (tx.category) {
      categoriesSet.add(tx.category);
    }

    // Extract item groups and subcategories
    // Story 14.15b: Normalize legacy category names
    for (const item of tx.items || []) {
      if (item.category) {
        const normalizedCategory = normalizeItemCategory(item.category);
        if (!groupsByCategory[tx.category]) {
          groupsByCategory[tx.category] = new Set();
        }
        groupsByCategory[tx.category].add(normalizedCategory);

        if (item.subcategory) {
          if (!subcategoriesByGroup[normalizedCategory]) {
            subcategoriesByGroup[normalizedCategory] = new Set();
          }
          subcategoriesByGroup[normalizedCategory].add(item.subcategory);
        }
      }
    }

    // Extract location
    if (tx.country) {
      countriesSet.add(tx.country);

      if (tx.city) {
        if (!citiesByCountry[tx.country]) {
          citiesByCountry[tx.country] = new Set();
        }
        citiesByCountry[tx.country].add(tx.city);
      }
    }
  }

  // Convert sets to sorted arrays
  return {
    years: Array.from(yearsSet).sort((a, b) => b.localeCompare(a)), // Descending
    monthsByYear: Object.fromEntries(
      Object.entries(monthsByYear).map(([year, months]) => [
        year,
        Array.from(months).sort((a, b) => b.localeCompare(a)), // Descending
      ])
    ),
    categories: Array.from(categoriesSet).sort(),
    groupsByCategory: Object.fromEntries(
      Object.entries(groupsByCategory).map(([cat, groups]) => [
        cat,
        Array.from(groups).sort(),
      ])
    ),
    subcategoriesByGroup: Object.fromEntries(
      Object.entries(subcategoriesByGroup).map(([group, subcats]) => [
        group,
        Array.from(subcats).sort(),
      ])
    ),
    countries: Array.from(countriesSet).sort(),
    citiesByCountry: Object.fromEntries(
      Object.entries(citiesByCountry).map(([country, cities]) => [
        country,
        Array.from(cities).sort(),
      ])
    ),
  };
}

// ============================================================================
// Temporal Filter Helpers
// ============================================================================

/**
 * Get the quarter (1-4) from a month string (YYYY-MM).
 * Story 9.20: Quarter support for analytics navigation.
 */
export function getQuarterFromMonth(month: string): number {
  const monthNum = parseInt(month.split('-')[1], 10);
  return Math.ceil(monthNum / 3);
}

/**
 * Get the quarter label (Q1, Q2, Q3, Q4) from a quarter number.
 */
export function getQuarterLabel(quarter: number): string {
  return `Q${quarter}`;
}

/**
 * Get the months (YYYY-MM strings) that belong to a quarter.
 * Story 9.20: Quarter support for analytics navigation.
 * @param year - Year as string (e.g., "2024")
 * @param quarter - Quarter number (1-4)
 * @returns Array of 3 month strings (e.g., ["2024-01", "2024-02", "2024-03"])
 */
export function getMonthsInQuarter(year: string, quarter: number): string[] {
  const startMonth = (quarter - 1) * 3 + 1;
  return [0, 1, 2].map(offset => {
    const month = (startMonth + offset).toString().padStart(2, '0');
    return `${year}-${month}`;
  });
}

/**
 * Get the quarters available in a year.
 * @returns Array of quarter numbers [1, 2, 3, 4]
 */
export function getQuartersInYear(): number[] {
  return [1, 2, 3, 4];
}

/**
 * Get week number within a month for a given date (1-based, 7-day chunks).
 * Week 1 = days 1-7, Week 2 = days 8-14, etc.
 */
export function getWeekOfMonth(date: string): number {
  const day = parseInt(date.split('-')[2], 10);
  return Math.ceil(day / 7);
}

/**
 * Get weeks available in a given month.
 * Returns array like [1, 2, 3, 4, 5] depending on days in month.
 */
export function getWeeksInMonth(yearMonth: string): number[] {
  const [year, month] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const weekCount = Math.ceil(daysInMonth / 7);
  return Array.from({ length: weekCount }, (_, i) => i + 1);
}

/**
 * Get days available in a given week of a month.
 * Returns array of date strings (YYYY-MM-DD).
 */
export function getDaysInWeek(yearMonth: string, week: number): string[] {
  const [year, month] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();

  const startDay = (week - 1) * 7 + 1;
  const endDay = Math.min(week * 7, daysInMonth);

  const days: string[] = [];
  for (let day = startDay; day <= endDay; day++) {
    const dayStr = day.toString().padStart(2, '0');
    const monthStr = month.toString().padStart(2, '0');
    days.push(`${year}-${monthStr}-${dayStr}`);
  }
  return days;
}

/**
 * Check if a transaction date matches a temporal filter.
 * Story 9.20: Added quarter filtering support.
 */
function matchesTemporalFilter(
  txDate: string,
  filter: TemporalFilterState
): boolean {
  if (filter.level === 'all') return true;

  // Story 14.16: Date range filter takes priority (used by Reports navigation for ISO weeks)
  // This ensures exact date range matching regardless of month boundaries
  if (filter.dateRange) {
    return txDate >= filter.dateRange.start && txDate <= filter.dateRange.end;
  }

  const txYear = txDate.substring(0, 4);
  const txMonth = txDate.substring(0, 7);

  // Year filter
  if (filter.year && txYear !== filter.year) return false;

  // Quarter filter (Story 9.20)
  if (filter.quarter && filter.year) {
    const txQuarter = getQuarterFromMonth(txMonth);
    const filterQuarter = parseInt(filter.quarter.replace('Q', ''), 10);
    if (txQuarter !== filterQuarter) return false;
  }

  // Month filter
  if (filter.month && txMonth !== filter.month) return false;

  // Week filter
  if (filter.week !== undefined && filter.month) {
    const txWeek = getWeekOfMonth(txDate);
    if (txWeek !== filter.week) return false;
  }

  // Day filter
  if (filter.day && txDate !== filter.day) return false;

  return true;
}

// ============================================================================
// Category Filter Helpers
// ============================================================================

/**
 * Check if a transaction matches a category filter.
 * Supports multi-select via comma-separated values in category and group fields.
 * Story 14.13a: Extended to support drillDownPath for multi-dimension filtering.
 */
function matchesCategoryFilter(
  tx: Transaction,
  filter: CategoryFilterState
): boolean {
  // Story 14.13a: When drillDownPath is present, use ONLY drillDownPath filtering
  // This takes priority over legacy single-dimension filters (category, group, subcategory)
  // because drillDownPath contains the full multi-dimension context from TrendsView
  if (filter.drillDownPath) {
    const path = filter.drillDownPath;

    // Filter by store group (expand to all categories in the group)
    // Only if storeCategory is not set (storeCategory is more specific)
    // Story 14.13 Session 15: Special handling for 'otros' group to match Dashboard counting
    if (path.storeGroup && !path.storeCategory) {
      const targetGroup = path.storeGroup as StoreCategoryGroup;

      if (targetGroup === 'otros') {
        // For 'otros' group, include transactions whose category doesn't map to any known group
        // This matches how Dashboard counts transactions in the 'otros' group
        const txCategory = tx.category as StoreCategory;
        const storeGroup = getStoreCategoryGroup(txCategory);
        if (storeGroup !== 'otros') {
          return false;
        }
      } else {
        // For other groups, use the standard expansion approach
        const groupCategories = expandStoreCategoryGroup(targetGroup);
        const txCategoryLower = tx.category?.toLowerCase();
        if (!groupCategories.some(cat => cat.toLowerCase() === txCategoryLower)) {
          return false;
        }
      }
    }

    // Filter by store category (supports multi-select via comma-separated values)
    if (path.storeCategory) {
      const txCategoryLower = tx.category?.toLowerCase();
      // Check if it's a multi-select (comma-separated)
      if (path.storeCategory.includes(',')) {
        const selectedCategories = path.storeCategory.split(',').map(c => c.trim().toLowerCase());
        if (!selectedCategories.some(cat => cat === txCategoryLower)) {
          return false;
        }
      } else {
        // Single category: exact match
        if (txCategoryLower !== path.storeCategory.toLowerCase()) {
          return false;
        }
      }
    }

    // Filter by item group (expand to all item categories in the group)
    // Only if itemCategory is not set (itemCategory is more specific)
    // Story 14.13 Session 15: Special handling for 'otros-item' group to match Dashboard counting
    if (path.itemGroup && !path.itemCategory) {
      const targetGroup = path.itemGroup as ItemCategoryGroup;

      if (targetGroup === 'otros-item') {
        // For 'otros-item' group, include transactions with items whose category doesn't map to any known group
        // This matches how Dashboard counts items in the 'otros-item' group
        const hasMatchingItem = tx.items?.some(item => {
          const normalizedCategory = normalizeItemCategory(item.category || 'Other');
          const itemGroup = getItemCategoryGroup(normalizedCategory);
          return itemGroup === 'otros-item';
        });
        if (!hasMatchingItem) return false;
      } else {
        // For other groups, use the standard expansion approach
        const itemCategories = expandItemCategoryGroup(targetGroup);
        const hasMatchingItem = tx.items?.some(item => {
          const normalizedCategory = normalizeItemCategory(item.category || 'Other');
          return itemCategories.some(cat =>
            cat.toLowerCase() === normalizedCategory.toLowerCase()
          );
        });
        if (!hasMatchingItem) return false;
      }
    }

    // Filter by item category (supports multi-select via comma-separated values)
    if (path.itemCategory) {
      // Check if it's a multi-select (comma-separated)
      const isMultiSelect = path.itemCategory.includes(',');
      const selectedCategories = isMultiSelect
        ? path.itemCategory.split(',').map(c => c.trim().toLowerCase())
        : [path.itemCategory.toLowerCase()];

      const hasMatchingItem = tx.items?.some(item => {
        const normalizedCategory = normalizeItemCategory(item.category || 'Other').toLowerCase();
        return selectedCategories.some(cat => cat === normalizedCategory);
      });
      if (!hasMatchingItem) return false;
    }

    // Filter by subcategory
    if (path.subcategory) {
      const hasMatchingSubcategory = tx.items?.some(
        item => item.subcategory?.toLowerCase() === path.subcategory!.toLowerCase()
      );
      if (!hasMatchingSubcategory) return false;
    }

    return true;
  }

  // Legacy single-dimension filtering (when drillDownPath not present)
  // Early return for "all" level with no other filters
  if (filter.level === 'all') return true;

  // Store category filter (supports multi-select via comma-separated values)
  if (filter.category) {
    // Check if it's a multi-select (comma-separated)
    const categories = filter.category.split(',').map(c => c.trim());
    if (categories.length > 1) {
      // Multi-select: transaction must match ANY of the selected categories
      if (!categories.includes(tx.category)) {
        return false;
      }
    } else {
      // Single select: exact match
      if (tx.category !== filter.category) {
        return false;
      }
    }
  }

  // Item group filter - transaction must have at least one item in the group
  // Supports multi-select via comma-separated values
  // Story 14.14b Session 7: Apply 'Other' fallback for items without category to match TrendsView counting
  // Story 14.15b: Normalize legacy category names before comparison
  // Story 14.13: Normalize BOTH sides of comparison - filter values may be in Spanish (e.g., 'Otro')
  //              while item categories normalize to English (e.g., 'Other')
  if (filter.group) {
    const groups = filter.group.split(',').map(g => normalizeItemCategory(g.trim()));
    if (groups.length > 1) {
      // Multi-select: transaction must have at least one item in ANY of the groups
      const hasMatchingGroup = tx.items?.some(
        item => groups.includes(normalizeItemCategory(item.category || 'Other'))
      );
      if (!hasMatchingGroup) return false;
    } else {
      // Single select
      const normalizedFilterGroup = groups[0]; // Already normalized above
      const hasMatchingGroup = tx.items?.some(
        item => normalizeItemCategory(item.category || 'Other') === normalizedFilterGroup
      );
      if (!hasMatchingGroup) return false;
    }
  }

  // Subcategory filter - transaction must have at least one item in the subcategory
  if (filter.subcategory) {
    const hasMatchingSubcategory = tx.items?.some(
      item => item.subcategory === filter.subcategory
    );
    if (!hasMatchingSubcategory) return false;
  }

  return true;
}

// ============================================================================
// Location Filter Helpers
// ============================================================================

/**
 * Check if a transaction matches a location filter.
 * AC #4: Gracefully handles transactions without location data.
 *
 * Story 14.36: Extended to support multi-select cities from multiple countries.
 * When selectedCities is present, it takes priority over legacy city/country fields.
 */
function matchesLocationFilter(
  tx: Transaction,
  filter: LocationFilterState
): boolean {
  // Story 14.36: Multi-select city filter takes priority
  if (filter.selectedCities) {
    // Transaction has no city data - exclude when filtering by city
    if (!tx.city) return false;

    // Parse comma-separated city codes
    const selectedCities = filter.selectedCities.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
    if (selectedCities.length === 0) return true;

    // Transaction's city must be in the selected cities
    return selectedCities.includes(tx.city.toLowerCase());
  }

  // Legacy single-selection filtering
  // No location filter applied
  if (!filter.country) return true;

  // Transaction has no location data - include it when filtering
  // (user can still see transactions without location)
  if (!tx.country) return false;

  // Country filter
  if (tx.country !== filter.country) return false;

  // City filter (if applied)
  if (filter.city && tx.city !== filter.city) return false;

  return true;
}


// ============================================================================
// Main Filtering Function
// ============================================================================

/**
 * Filter transactions based on the current history filter state.
 * This is the core filtering logic for HistoryView.
 *
 * AC #7: Filters applied client-side with memoization for performance.
 */
export function filterTransactionsByHistoryFilters(
  transactions: Transaction[],
  filters: HistoryFilterState
): Transaction[] {
  return transactions.filter(tx => {
    // Temporal filter (AC #2)
    if (!matchesTemporalFilter(tx.date, filters.temporal)) {
      return false;
    }

    // Category filter (AC #3)
    if (!matchesCategoryFilter(tx, filters.category)) {
      return false;
    }

    // Location filter (AC #4)
    if (!matchesLocationFilter(tx, filters.location)) {
      return false;
    }

    return true;
  });
}

// ============================================================================
// Display Formatting
// ============================================================================

/**
 * Format category filter selection for display (breadcrumb style).
 */
export function formatCategoryPath(
  category: CategoryFilterState,
  t: (key: string) => string
): string {
  if (category.level === 'all') {
    return t('allCategories');
  }

  const parts: string[] = [];

  if (category.category) {
    parts.push(category.category);
  }

  if (category.group) {
    parts.push(category.group);
  }

  if (category.subcategory) {
    parts.push(category.subcategory);
  }

  return parts.join(' > ');
}

/**
 * Format location filter selection for display.
 */
export function formatLocationPath(
  location: LocationFilterState,
  t: (key: string) => string
): string {
  if (!location.country) {
    return t('allLocations');
  }

  if (location.city) {
    return `${location.country} > ${location.city}`;
  }

  return location.country;
}

/**
 * Get month name from YYYY-MM format.
 */
export function getMonthName(month: string, locale: string = 'en'): string {
  const [, monthNum] = month.split('-');
  const date = new Date(2024, parseInt(monthNum, 10) - 1, 1);
  return date.toLocaleDateString(
    locale === 'es' ? 'es-ES' : 'en-US',
    { month: 'long' }
  );
}

/**
 * Get short month name from YYYY-MM format.
 */
export function getShortMonthName(month: string, locale: string = 'en'): string {
  const [, monthNum] = month.split('-');
  const date = new Date(2024, parseInt(monthNum, 10) - 1, 1);
  return date.toLocaleDateString(
    locale === 'es' ? 'es-ES' : 'en-US',
    { month: 'short' }
  );
}

/**
 * Get day label in format "Dec 15".
 */
export function getDayLabel(day: string, locale: string = 'en'): string {
  const [year, month, dayNum] = day.split('-').map(Number);
  const date = new Date(year, month - 1, dayNum);
  return date.toLocaleDateString(
    locale === 'es' ? 'es-ES' : 'en-US',
    { month: 'short', day: 'numeric' }
  );
}

/**
 * Get week label in format "Dec 1-7".
 */
export function getWeekLabel(month: string, week: number, locale: string = 'en'): string {
  const shortMonth = getShortMonthName(month, locale);
  const [year, monthNum] = month.split('-').map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  const startDay = (week - 1) * 7 + 1;
  const endDay = Math.min(week * 7, daysInMonth);

  return `${shortMonth} ${startDay}-${endDay}`;
}

// Re-export extracted modules (Story 15b-2k, TD-15b-17)
export * from './temporalFormatters';
export * from './temporalNavigation';
export * from './temporalFilterBuilders';
