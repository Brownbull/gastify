/**
 * DrillDownGrid Component
 *
 * Container component that consumes useAnalyticsNavigation and renders drill-down cards
 * for both temporal (time-based) and category navigation.
 *
 * @see docs/architecture-epic7.md - Pattern 4: Drill-Down Card Pattern
 * @see docs/sprint-artifacts/epic7/story-7.5-drill-down-cards-grid.md
 */

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { DrillDownCard } from './DrillDownCard';
import { useAnalyticsNavigation } from '../hooks/useAnalyticsNavigation';
import { getQuarterFromMonth } from '../utils/analyticsHelpers';
import type { Transaction } from '@/types/transaction';
import type { TemporalPosition, CategoryPosition } from '@/types/analytics';
import { TRANSLATIONS, TranslationKey, Language } from '@/utils/translations';
import { translateCategory } from '@/utils/categoryTranslations';
import {
  createTemporalNavigationPayload,
  createCategoryNavigationPayload,
  type HistoryNavigationPayload,
} from '../utils/analyticsToHistoryFilters';
import { DEFAULT_CURRENCY } from '@/utils/currency';

// ============================================================================
// Types
// ============================================================================

export interface DrillDownGridProps {
  /** Transactions to calculate totals from */
  transactions: Transaction[];
  /** Theme for styling */
  theme?: 'light' | 'dark';
  /** Locale for formatting and translations */
  locale?: string;
  /** Currency code for formatting */
  currency?: string;
  /**
   * Story 9.20: Callback for navigating to History view with pre-applied filters.
   * Called when user clicks the transaction count badge on a drill-down card.
   * If not provided, badges will not be shown (AC #6).
   */
  onNavigateToHistory?: (payload: HistoryNavigationPayload) => void;
}

interface TemporalChildData {
  label: string;
  position: TemporalPosition;
  total: number;
  percentage: number;
  transactionCount: number;
  isEmpty: boolean;
  colorKey: string;
}

interface CategoryChildData {
  label: string;
  position: CategoryPosition;
  total: number;
  percentage: number;
  transactionCount: number;
  isEmpty: boolean;
  colorKey: string;
}

// ============================================================================
// Translation Helper
// ============================================================================

function t(key: TranslationKey, locale: string): string {
  const lang = (locale === 'es' ? 'es' : 'en') as Language;
  return TRANSLATIONS[lang][key] || TRANSLATIONS.en[key] || key;
}

// ============================================================================
// Text Helper Functions
// ============================================================================

/**
 * Capitalizes the first letter of a string.
 * "octubre" → "Octubre", "oct 1-7" → "Oct 1-7"
 */
function capitalizeFirst(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================================================
// Date Helper Functions
// ============================================================================

/**
 * Gets short month name from YYYY-MM format.
 * Returns capitalized name.
 */
function getShortMonthName(month: string, locale: string = 'en'): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year, 10), parseInt(monthNum, 10) - 1, 1);
  const name = date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { month: 'short' });
  return capitalizeFirst(name);
}

/**
 * Gets full month name from YYYY-MM format.
 * Returns capitalized name.
 */
function getFullMonthName(month: string, locale: string = 'en'): string {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year, 10), parseInt(monthNum, 10) - 1, 1);
  const name = date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { month: 'long' });
  return capitalizeFirst(name);
}

/**
 * Gets week label in format "Oct 1-7".
 * Weeks are month-aligned per ADR-012.
 */
function getWeekLabel(month: string, week: number, locale: string = 'en'): string {
  const shortMonth = getShortMonthName(month, locale);
  const [year, monthNum] = month.split('-');
  const daysInMonth = new Date(parseInt(year, 10), parseInt(monthNum, 10), 0).getDate();

  const startDay = (week - 1) * 7 + 1;
  const endDay = Math.min(week * 7, daysInMonth);

  return `${shortMonth} ${startDay}-${endDay}`;
}

/**
 * Gets day name (e.g., "Mon", "Tue").
 */
function getDayName(dayIndex: number, locale: string = 'en'): string {
  const days = locale === 'es'
    ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days[dayIndex];
}

/**
 * Gets the months in a quarter.
 */
function getMonthsInQuarter(year: string, quarter: string): string[] {
  const quarterNum = parseInt(quarter.replace('Q', ''), 10);
  const startMonth = (quarterNum - 1) * 3 + 1;
  return [
    `${year}-${startMonth.toString().padStart(2, '0')}`,
    `${year}-${(startMonth + 1).toString().padStart(2, '0')}`,
    `${year}-${(startMonth + 2).toString().padStart(2, '0')}`,
  ];
}

// ============================================================================
// Temporal Drill-Down Logic
// ============================================================================

/**
 * Computes temporal children based on current temporal position.
 * Returns an array of child periods with their totals.
 *
 * Year → Q1, Q2, Q3, Q4
 * Quarter → 3 months in quarter
 * Month → weeks (month-aligned)
 * Week → 7 days (Mon-Sun)
 * Day → no children (leaf level)
 */
function getTemporalChildren(
  temporal: TemporalPosition,
  transactions: Transaction[],
  locale: string = 'en'
): TemporalChildData[] {
  const { level, year, quarter, month, week } = temporal;

  // Calculate total for percentage computation
  const viewTotal = transactions.reduce((sum, tx) => sum + tx.total, 0);

  switch (level) {
    case 'year': {
      // Return 4 quarters
      const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
      return quarters.map((q, index) => {
        const qTransactions = transactions.filter(tx => {
          const txQuarter = getQuarterFromMonth(tx.date.substring(0, 7));
          return txQuarter === q;
        });
        const total = qTransactions.reduce((sum, tx) => sum + tx.total, 0);
        const percentage = viewTotal > 0 ? (total / viewTotal) * 100 : 0;

        return {
          label: t(q.toLowerCase() as TranslationKey, locale),
          position: { level: 'quarter', year, quarter: q } as TemporalPosition,
          total,
          percentage,
          transactionCount: qTransactions.length,
          isEmpty: qTransactions.length === 0,
          colorKey: `temporal-${index}`,
        };
      });
    }

    case 'quarter': {
      // Return 3 months in this quarter
      const months = getMonthsInQuarter(year, quarter!);
      return months.map((m, index) => {
        const mTransactions = transactions.filter(tx => tx.date.startsWith(m));
        const total = mTransactions.reduce((sum, tx) => sum + tx.total, 0);
        const percentage = viewTotal > 0 ? (total / viewTotal) * 100 : 0;

        return {
          label: getFullMonthName(m, locale),
          position: { level: 'month', year, quarter: quarter!, month: m } as TemporalPosition,
          total,
          percentage,
          transactionCount: mTransactions.length,
          isEmpty: mTransactions.length === 0,
          colorKey: `temporal-${index}`,
        };
      });
    }

    case 'month': {
      // Return weeks (month-aligned chunks)
      // Default to 4 weeks per UX mockup, only show week 5 if there's data
      const [yearNum, monthNum] = month!.split('-').map(Number);
      const daysInMonth = new Date(yearNum, monthNum, 0).getDate();

      // First calculate week 5 data to see if we need it
      const week5StartDay = 29;
      const week5Transactions = transactions.filter(tx => {
        const txDay = parseInt(tx.date.split('-')[2], 10);
        return txDay >= week5StartDay && txDay <= daysInMonth;
      });
      const hasWeek5Data = week5Transactions.length > 0;

      // Default to 4 weeks, add 5th only if there's data
      const weekCount = hasWeek5Data ? 5 : 4;

      return Array.from({ length: weekCount }, (_, weekIndex) => {
        const weekNum = weekIndex + 1;
        const startDay = (weekNum - 1) * 7 + 1;
        const endDay = Math.min(weekNum * 7, daysInMonth);

        const wTransactions = transactions.filter(tx => {
          const txDay = parseInt(tx.date.split('-')[2], 10);
          return txDay >= startDay && txDay <= endDay;
        });
        const total = wTransactions.reduce((sum, tx) => sum + tx.total, 0);
        const percentage = viewTotal > 0 ? (total / viewTotal) * 100 : 0;

        return {
          label: getWeekLabel(month!, weekNum, locale),
          position: {
            level: 'week',
            year,
            quarter: quarter!,
            month: month!,
            week: weekNum,
          } as TemporalPosition,
          total,
          percentage,
          transactionCount: wTransactions.length,
          isEmpty: wTransactions.length === 0,
          colorKey: `temporal-${weekIndex}`,
        };
      });
    }

    case 'week': {
      // Return 7 days (Mon-Sun)
      // Calculate actual days in this week
      const [yearNum, monthNum] = month!.split('-').map(Number);
      const daysInMonth = new Date(yearNum, monthNum, 0).getDate();
      const startDay = (week! - 1) * 7 + 1;
      const endDay = Math.min(week! * 7, daysInMonth);
      const daysInWeek = endDay - startDay + 1;

      return Array.from({ length: daysInWeek }, (_, dayIndex) => {
        const dayNum = startDay + dayIndex;
        const dayStr = `${month}-${dayNum.toString().padStart(2, '0')}`;

        // Get the actual day of week for the label
        const date = new Date(yearNum, monthNum - 1, dayNum);
        const dayOfWeek = date.getDay();
        // Convert from Sunday=0 to Monday=0
        const dayOfWeekMon = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

        const dTransactions = transactions.filter(tx => tx.date === dayStr);
        const total = dTransactions.reduce((sum, tx) => sum + tx.total, 0);
        const percentage = viewTotal > 0 ? (total / viewTotal) * 100 : 0;

        return {
          label: getDayName(dayOfWeekMon, locale),
          position: {
            level: 'day',
            year,
            quarter: quarter!,
            month: month!,
            week: week!,
            day: dayStr,
          } as TemporalPosition,
          total,
          percentage,
          transactionCount: dTransactions.length,
          isEmpty: dTransactions.length === 0,
          colorKey: `temporal-${dayIndex}`,
        };
      });
    }

    case 'day':
      // Day is leaf level - no temporal children
      return [];

    default:
      return [];
  }
}

// ============================================================================
// Category Drill-Down Logic
// ============================================================================

/**
 * Computes category children based on current category position.
 * Returns an array of child categories with their totals.
 *
 * All → unique transaction categories
 * Category → unique groups within filtered transactions
 * Group → unique subcategories within filtered transactions
 * Subcategory → no children (leaf level)
 */
function getCategoryChildren(
  category: CategoryPosition,
  transactions: Transaction[],
  _locale: string = 'en'
): CategoryChildData[] {
  const { level, category: currentCategory, group: currentGroup } = category;

  // Calculate total for percentage computation
  const viewTotal = transactions.reduce((sum, tx) => sum + tx.total, 0);

  switch (level) {
    case 'all': {
      // Return unique store categories from transactions
      const categoryTotals = new Map<string, { total: number; count: number }>();

      transactions.forEach(tx => {
        const cat = tx.category || 'Other';
        const existing = categoryTotals.get(cat) || { total: 0, count: 0 };
        categoryTotals.set(cat, {
          total: existing.total + tx.total,
          count: existing.count + 1,
        });
      });

      return Array.from(categoryTotals.entries())
        .sort((a, b) => b[1].total - a[1].total) // Sort by total descending
        .map(([cat, data]) => {
          const percentage = viewTotal > 0 ? (data.total / viewTotal) * 100 : 0;
          return {
            label: cat,
            position: { level: 'category', category: cat } as CategoryPosition,
            total: data.total,
            percentage,
            transactionCount: data.count,
            isEmpty: data.count === 0,
            colorKey: cat,
          };
        });
    }

    case 'category': {
      // Return unique item categories (groups) within filtered transactions
      const groupTotals = new Map<string, { total: number; count: number }>();

      // Filter to current store category
      const filteredTx = transactions.filter(tx => tx.category === currentCategory);

      filteredTx.forEach(tx => {
        tx.items.forEach(item => {
          const group = item.category || 'Other';
          const existing = groupTotals.get(group) || { total: 0, count: 0 };
          groupTotals.set(group, {
            total: existing.total + item.totalPrice,
            count: existing.count + 1,
          });
        });
      });

      const filteredTotal = filteredTx.reduce((sum, tx) => sum + tx.total, 0);

      return Array.from(groupTotals.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .map(([group, data]) => {
          const percentage = filteredTotal > 0 ? (data.total / filteredTotal) * 100 : 0;
          return {
            label: group,
            position: {
              level: 'group',
              category: currentCategory,
              group,
            } as CategoryPosition,
            total: data.total,
            percentage,
            transactionCount: data.count,
            isEmpty: data.count === 0,
            colorKey: group,
          };
        });
    }

    case 'group': {
      // Return unique subcategories within filtered transactions
      const subcategoryTotals = new Map<string, { total: number; count: number }>();

      // Filter to current store category and group
      const filteredTx = transactions.filter(tx => tx.category === currentCategory);

      filteredTx.forEach(tx => {
        tx.items
          .filter(item => item.category === currentGroup)
          .forEach(item => {
            const subcategory = item.subcategory || 'Other';
            const existing = subcategoryTotals.get(subcategory) || { total: 0, count: 0 };
            subcategoryTotals.set(subcategory, {
              total: existing.total + item.totalPrice,
              count: existing.count + 1,
            });
          });
      });

      // Calculate filtered total for this group
      let filteredTotal = 0;
      filteredTx.forEach(tx => {
        tx.items
          .filter(item => item.category === currentGroup)
          .forEach(item => {
            filteredTotal += item.totalPrice;
          });
      });

      return Array.from(subcategoryTotals.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .map(([subcategory, data]) => {
          const percentage = filteredTotal > 0 ? (data.total / filteredTotal) * 100 : 0;
          return {
            label: subcategory,
            position: {
              level: 'subcategory',
              category: currentCategory,
              group: currentGroup,
              subcategory,
            } as CategoryPosition,
            total: data.total,
            percentage,
            transactionCount: data.count,
            isEmpty: data.count === 0,
            colorKey: subcategory,
          };
        });
    }

    case 'subcategory':
      // Subcategory is leaf level - no category children
      return [];

    default:
      return [];
  }
}

// ============================================================================
// Component
// ============================================================================

/**
 * DrillDownGrid Component
 *
 * Container component that displays drill-down options for both temporal
 * (time-based) and category navigation.
 *
 * Features:
 * - Consumes analytics state via useAnalyticsNavigation hook
 * - Computes temporal children (quarters, months, weeks, days)
 * - Computes category children when category filter is active
 * - Responsive grid layout (full-width mobile, 2-column larger)
 * - Section labels with i18n support
 *
 * @example
 * <DrillDownGrid
 *   transactions={filteredTransactions}
 *   theme="light"
 *   locale="en"
 * />
 */
export function DrillDownGrid({
  transactions,
  theme = 'light',
  locale = 'en',
  currency = DEFAULT_CURRENCY,
  onNavigateToHistory,
}: DrillDownGridProps): React.ReactElement {
  // Story 7.16: Get drillDownMode to control which section to show
  const { temporal, category, drillDownMode, dispatch } = useAnalyticsNavigation();
  const isDark = theme === 'dark';

  // State for collapsible empty sections
  const [showEmptyTemporal, setShowEmptyTemporal] = useState(false);
  const [showEmptyCategory, setShowEmptyCategory] = useState(false);

  // Compute temporal children (memoized)
  const temporalChildren = useMemo(
    () => getTemporalChildren(temporal, transactions, locale),
    [temporal, transactions, locale]
  );

  // Compute category children (memoized)
  const categoryChildren = useMemo(
    () => getCategoryChildren(category, transactions, locale),
    [category, transactions, locale]
  );

  // Split temporal children into with-data and empty
  const { withData: temporalWithData, empty: temporalEmpty } = useMemo(() => {
    const withData = temporalChildren.filter(child => !child.isEmpty);
    const empty = temporalChildren.filter(child => child.isEmpty);
    return { withData, empty };
  }, [temporalChildren]);

  // Split category children into with-data and empty
  const { withData: categoryWithData, empty: categoryEmpty } = useMemo(() => {
    const withData = categoryChildren.filter(child => !child.isEmpty);
    const empty = categoryChildren.filter(child => child.isEmpty);
    return { withData, empty };
  }, [categoryChildren]);

  // Check if we have children to display (at least some with data OR some empty)
  const hasTemporalChildren = temporalWithData.length > 0 || temporalEmpty.length > 0;
  const hasCategoryChildren = categoryWithData.length > 0 || categoryEmpty.length > 0;

  // Story 7.16: Only show the section matching the current drillDownMode (AC #4, #5)
  const showTemporal = drillDownMode === 'temporal' && hasTemporalChildren;
  const showCategory = drillDownMode === 'category' && hasCategoryChildren;

  // Empty state - at day level with no category filter or at leaf levels
  if (!showTemporal && !showCategory) {
    return (
      <div className={`p-4 text-center ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        <p className="text-sm italic">
          {transactions.length === 0
            ? t('noData' as TranslationKey, locale)
            : ''
          }
        </p>
      </div>
    );
  }

  // Handle temporal card click - dispatch SET_TEMPORAL_LEVEL
  const handleTemporalClick = (position: TemporalPosition) => {
    dispatch({ type: 'SET_TEMPORAL_LEVEL', payload: position });
  };

  // Handle category card click - dispatch SET_CATEGORY_FILTER
  // Story 9.13: Only allow clicks if not at the last navigable level
  const handleCategoryClick = (position: CategoryPosition) => {
    dispatch({ type: 'SET_CATEGORY_FILTER', payload: position });
  };

  // Story 9.20: Handle temporal card badge click - navigate to History with temporal filter (AC #3, #4)
  const handleTemporalBadgeClick = onNavigateToHistory
    ? (position: TemporalPosition) => {
        const payload = createTemporalNavigationPayload(position);
        onNavigateToHistory(payload);
      }
    : undefined;

  // Story 9.20: Handle category card badge click - navigate to History with both filters (AC #3, #4)
  const handleCategoryBadgeClick = onNavigateToHistory
    ? (position: CategoryPosition) => {
        const payload = createCategoryNavigationPayload(position, temporal);
        onNavigateToHistory(payload);
      }
    : undefined;

  // Story 9.13: Determine if category cards are clickable
  // At 'group' level, the cards represent subcategories which are the lowest level
  // Per AC #1: When viewing at group level, cards should NOT be clickable
  const isCategoryCardClickable = category.level !== 'group';

  // Get empty message based on locale
  const getEmptyMessage = (label: string) => {
    // Use simple format since we don't have noTransactionsIn key yet
    return locale === 'es'
      ? `Sin transacciones en ${label}`
      : `No transactions in ${label}`;
  };

  // Section label classes - increased font size
  const sectionLabelClasses = `text-base font-medium mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`;

  // Grid classes - full width on mobile, 2 columns on larger screens
  const gridClasses = 'grid grid-cols-1 sm:grid-cols-2 gap-3';

  return (
    <div className="space-y-6">
      {/* Temporal drill-down section - Story 7.16: Only when drillDownMode === 'temporal' (AC #4) */}
      {showTemporal && (
        <section aria-label={t('drillDownByTime' as TranslationKey, locale)}>
          <h3 className={sectionLabelClasses}>
            {t('drillDownByTime' as TranslationKey, locale)}
          </h3>

          {/* Items with data - Story 9.20: Add transactionCount and onBadgeClick (AC #1, #3) */}
          {temporalWithData.length > 0 && (
            <div className={gridClasses}>
              {temporalWithData.map((child) => (
                <DrillDownCard
                  key={`temporal-${child.label}`}
                  label={child.label}
                  value={child.total}
                  percentage={child.percentage}
                  onClick={() => handleTemporalClick(child.position)}
                  colorKey={child.colorKey}
                  isEmpty={child.isEmpty}
                  emptyMessage={getEmptyMessage(child.label)}
                  theme={theme}
                  locale={locale}
                  currency={currency}
                  transactionCount={child.transactionCount}
                  onBadgeClick={handleTemporalBadgeClick ? () => handleTemporalBadgeClick(child.position) : undefined}
                />
              ))}
            </div>
          )}

          {/* Collapsible empty items section */}
          {temporalEmpty.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowEmptyTemporal(!showEmptyTemporal)}
                className={`flex items-center gap-2 w-full py-2 px-3 rounded-lg transition-colors ${
                  isDark
                    ? 'text-slate-400 hover:bg-slate-800'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
                aria-expanded={showEmptyTemporal}
              >
                {showEmptyTemporal ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                <span className="text-sm">
                  {locale === 'es'
                    ? `${showEmptyTemporal ? 'Ocultar' : 'Mostrar'} ${temporalEmpty.length} ${temporalEmpty.length === 1 ? 'período vacío' : 'períodos vacíos'}`
                    : `${showEmptyTemporal ? 'Hide' : 'Show'} ${temporalEmpty.length} empty ${temporalEmpty.length === 1 ? 'period' : 'periods'}`
                  }
                </span>
              </button>

              {showEmptyTemporal && (
                <div className={`${gridClasses} mt-2`}>
                  {temporalEmpty.map((child) => (
                    <DrillDownCard
                      key={`temporal-${child.label}`}
                      label={child.label}
                      value={child.total}
                      percentage={child.percentage}
                      onClick={() => handleTemporalClick(child.position)}
                      colorKey={child.colorKey}
                      isEmpty={child.isEmpty}
                      emptyMessage={getEmptyMessage(child.label)}
                      theme={theme}
                      locale={locale}
                      currency={currency}
                      transactionCount={child.transactionCount}
                      onBadgeClick={handleTemporalBadgeClick ? () => handleTemporalBadgeClick(child.position) : undefined}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Category drill-down section - Story 7.16: Only when drillDownMode === 'category' (AC #5) */}
      {showCategory && (
        <section aria-label={t('drillDownByCategory' as TranslationKey, locale)}>
          <h3 className={sectionLabelClasses}>
            {t('drillDownByCategory' as TranslationKey, locale)}
          </h3>

          {/* Items with data - Story 9.12: Translate category labels (AC #4) */}
          {/* Story 9.13: Cards at group level (showing subcategories) are not clickable (AC #1, #4) */}
          {/* Story 9.20: Add transactionCount and onBadgeClick (AC #1, #3) */}
          {categoryWithData.length > 0 && (
            <>
              <div className={gridClasses}>
                {categoryWithData.map((child) => {
                  const lang = (locale === 'es' ? 'es' : 'en') as Language;
                  const translatedLabel = translateCategory(child.label, lang);
                  return (
                    <DrillDownCard
                      key={`category-${child.label}`}
                      label={translatedLabel}
                      value={child.total}
                      percentage={child.percentage}
                      onClick={isCategoryCardClickable ? () => handleCategoryClick(child.position) : undefined}
                      colorKey={child.colorKey}
                      isEmpty={child.isEmpty}
                      emptyMessage={getEmptyMessage(translatedLabel)}
                      theme={theme}
                      locale={locale}
                      currency={currency}
                      isClickable={isCategoryCardClickable}
                      transactionCount={child.transactionCount}
                      onBadgeClick={handleCategoryBadgeClick ? () => handleCategoryBadgeClick(child.position) : undefined}
                    />
                  );
                })}
              </div>
              {/* Story 9.13: Show "No further breakdown" message at lowest level (AC #4) */}
              {!isCategoryCardClickable && (
                <p className={`text-sm italic mt-2 text-center ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                  {locale === 'es' ? 'No hay más desglose disponible' : 'No further breakdown available'}
                </p>
              )}
            </>
          )}

          {/* Collapsible empty items section */}
          {categoryEmpty.length > 0 && (
            <div className="mt-3">
              <button
                onClick={() => setShowEmptyCategory(!showEmptyCategory)}
                className={`flex items-center gap-2 w-full py-2 px-3 rounded-lg transition-colors ${
                  isDark
                    ? 'text-slate-400 hover:bg-slate-800'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
                aria-expanded={showEmptyCategory}
              >
                {showEmptyCategory ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
                <span className="text-sm">
                  {locale === 'es'
                    ? `${showEmptyCategory ? 'Ocultar' : 'Mostrar'} ${categoryEmpty.length} ${categoryEmpty.length === 1 ? 'categoría vacía' : 'categorías vacías'}`
                    : `${showEmptyCategory ? 'Hide' : 'Show'} ${categoryEmpty.length} empty ${categoryEmpty.length === 1 ? 'category' : 'categories'}`
                  }
                </span>
              </button>

              {showEmptyCategory && (
                <div className={`${gridClasses} mt-2`}>
                  {categoryEmpty.map((child) => {
                    const lang = (locale === 'es' ? 'es' : 'en') as Language;
                    const translatedLabel = translateCategory(child.label, lang);
                    return (
                      <DrillDownCard
                        key={`category-${child.label}`}
                        label={translatedLabel}
                        value={child.total}
                        percentage={child.percentage}
                        onClick={isCategoryCardClickable ? () => handleCategoryClick(child.position) : undefined}
                        colorKey={child.colorKey}
                        isEmpty={child.isEmpty}
                        emptyMessage={getEmptyMessage(translatedLabel)}
                        theme={theme}
                        locale={locale}
                        currency={currency}
                        isClickable={isCategoryCardClickable}
                        transactionCount={child.transactionCount}
                        onBadgeClick={handleCategoryBadgeClick ? () => handleCategoryBadgeClick(child.position) : undefined}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* CTA for completely empty view */}
      {transactions.length === 0 && (
        <div className={`p-4 text-center rounded-lg ${isDark ? 'bg-slate-800' : 'bg-slate-50'}`}>
          <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {t('scanToAddData' as TranslationKey, locale)}
          </p>
        </div>
      )}
    </div>
  );
}

// Export helper functions for testing
export { getTemporalChildren, getCategoryChildren };

// Story 9.20: Re-export HistoryNavigationPayload for consumers
export type { HistoryNavigationPayload } from '../utils/analyticsToHistoryFilters';

export default DrillDownGrid;
