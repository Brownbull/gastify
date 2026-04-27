/**
 * Report Generation Utilities
 *
 * Core summary generators, report cards, and report list generation.
 * Imports from reportDateUtils and reportCategoryGrouping.
 */

import type { Transaction } from '@/types/transaction';
import type {
  ReportCard,
  WeeklySummary,
  CategoryBreakdown,
  TrendDirection,
  TransactionGroup,
  ItemGroup,
  ReportPeriodType,
} from '@/types/report';
import {
  formatCurrency,
  calculateTrend,
  getTrendDescription,
} from '@/types/report';
import {
  getWeekRange,
  filterTransactionsByWeek,
  calculateTotal,
  getISOWeekNumber,
  getMonthStart,
  getMonthRange,
  filterTransactionsByMonth,
  getQuarterStart,
  getQuarterNumber,
  getQuarterRange,
  filterTransactionsByQuarter,
  getYearRange,
  filterTransactionsByYear,
  MIN_TRANSACTIONS_FOR_REPORT,
} from './reportDateUtils';
import {
  getCategoryBreakdown,
  groupCategoriesByStoreGroup,
  groupItemsByItemCategory,
  formatCategoryName,
  NEUTRAL_THRESHOLD,
} from './reportCategoryGrouping';
import { TRANSLATIONS } from '@/utils/translations';
import { getSettingsState } from '@shared/stores/useSettingsStore';

// ============================================================================
// Constants
// ============================================================================

/** Maximum number of category cards to show in carousel */
const MAX_CATEGORY_CARDS = 5;

// ============================================================================
// Report Row Data Types
// ============================================================================

export interface ReportRowData {
  id: string;
  title: string;
  fullTitle: string;
  amount: number;
  trend?: TrendDirection;
  trendPercent?: number;
  comparisonLabel?: string;
  periodType: ReportPeriodType;
  isUnread: boolean;
  isFirst: boolean;
  firstLabel?: string;
  personaHook?: string;
  categories: CategoryBreakdown[];
  personaInsight?: string;
  highlights?: Array<{ label: string; value: string }>;
  /** Total number of transactions in this period */
  transactionCount: number;
  /** Date range for the period (used for filtering navigation) */
  dateRange: { start: Date; end: Date };
  /**
   * Transaction groups for grouped category display (Story 14.16)
   * Weekly: Top 3 by amount, Monthly+: All sorted alphabetically
   */
  transactionGroups?: TransactionGroup[];
  /**
   * Item groups for product-level breakdown (Story 14.16)
   * Weekly: Top 3 by amount, Monthly+: All sorted alphabetically
   */
  itemGroups?: ItemGroup[];
}

// ============================================================================
// Weekly Summary Generation (AC #3)
// ============================================================================

/**
 * Generate weekly summary from transactions
 *
 * Note: topCategories contain raw category keys — translated downstream by
 * generateReportCards via formatCategoryName(cat.category, lang).
 *
 * @param transactions - All user transactions
 * @param weeksAgo - Number of weeks ago (0 = current week)
 * @returns WeeklySummary object or null if insufficient data
 */
export function generateWeeklySummary(
  transactions: Transaction[],
  weeksAgo: number = 0
): WeeklySummary | null {
  const currentWeek = getWeekRange(weeksAgo);
  const previousWeek = getWeekRange(weeksAgo + 1);

  const currentTransactions = filterTransactionsByWeek(
    transactions,
    currentWeek.start,
    currentWeek.end
  );

  // Check if enough data for report
  if (currentTransactions.length < MIN_TRANSACTIONS_FOR_REPORT) {
    return null;
  }

  const previousTransactions = filterTransactionsByWeek(
    transactions,
    previousWeek.start,
    previousWeek.end
  );

  const totalSpent = calculateTotal(currentTransactions);
  const previousWeekSpent = calculateTotal(previousTransactions);

  // Calculate trend
  const { direction: trendDirection, percent: trendPercent } = calculateTrend(
    totalSpent,
    previousWeekSpent,
    NEUTRAL_THRESHOLD
  );

  // Get category breakdown with trend comparison
  const categoryBreakdown = getCategoryBreakdown(currentTransactions, previousTransactions);

  // Get top 3 categories
  const topCategories = categoryBreakdown.slice(0, 3);

  // Check if this is the user's first week
  const isFirstWeek = previousTransactions.length === 0;

  return {
    totalSpent,
    previousWeekSpent,
    trendPercent,
    trendDirection,
    topCategories,
    dateRange: {
      start: currentWeek.start,
      end: currentWeek.end,
    },
    weekNumber: getISOWeekNumber(currentWeek.start),
    isFirstWeek,
    transactionCount: currentTransactions.length,
  };
}

// ============================================================================
// Report Card Generation (AC #3, #4)
// ============================================================================

/**
 * Generate report cards from weekly summary
 *
 * Creates Instagram-style swipeable cards:
 * 1. Summary card (total spent with trend)
 * 2. Category breakdown cards (one per top category)
 *
 * @param summary - Weekly summary data
 * @returns Array of ReportCard objects for carousel
 */
export function generateReportCards(summary: WeeklySummary): ReportCard[] {
  const lang = getSettingsState().lang;
  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.es;
  const cards: ReportCard[] = [];

  // Summary card (AC #3)
  const summaryCard: ReportCard = {
    id: 'summary',
    type: 'summary',
    title: t.reportThisWeek,
    primaryValue: formatCurrency(summary.totalSpent),
    secondaryValue: summary.isFirstWeek
      ? t.reportFirstWeekly
      : `vs ${formatCurrency(summary.previousWeekSpent)} ${t.reportLastWeek}`,
    trend: summary.isFirstWeek ? undefined : summary.trendDirection,
    trendPercent: summary.isFirstWeek ? undefined : Math.abs(summary.trendPercent),
    description: summary.isFirstWeek
      ? undefined
      : getTrendDescription(summary.trendDirection, summary.trendPercent),
  };
  cards.push(summaryCard);

  // Category breakdown cards (AC #4)
  const categoryCards = summary.topCategories
    .slice(0, MAX_CATEGORY_CARDS)
    .map((cat, index): ReportCard => {
      const id = `category-${index}`;
      return {
        id,
        type: 'category',
        title: formatCategoryName(cat.category, lang),
        primaryValue: formatCurrency(cat.amount),
        secondaryValue: `${cat.percent}% del total · ${cat.transactionCount} ${
          cat.transactionCount === 1 ? t.reportPurchaseSingular : t.reportPurchasePlural
        }`,
        category: cat.category,
        categoryIcon: cat.icon,
        trend: cat.trend,
        trendPercent: cat.trendPercent,
        description:
          cat.trend && cat.trendPercent
            ? getTrendDescription(cat.trend, cat.trendPercent)
            : undefined,
      };
    });

  cards.push(...categoryCards);

  return cards;
}

/**
 * Generate empty state report card for users with no data
 */
export function generateEmptyStateCard(): ReportCard {
  const lang = getSettingsState().lang;
  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.es;
  return {
    id: 'empty',
    type: 'summary',
    title: t.reportThisWeek,
    primaryValue: '$0',
    secondaryValue: t.reportNoTransactionsYet,
    description: t.reportScanToStart,
  };
}

// ============================================================================
// Period Summary Generation
// ============================================================================

/**
 * Generate monthly summary from transactions
 */
export function generateMonthlySummary(
  transactions: Transaction[],
  monthsAgo: number = 0
): ReportRowData | null {
  const currentMonth = getMonthRange(monthsAgo);
  const previousMonth = getMonthRange(monthsAgo + 1);

  const currentTransactions = filterTransactionsByMonth(
    transactions,
    currentMonth.start,
    currentMonth.end
  );

  if (currentTransactions.length < MIN_TRANSACTIONS_FOR_REPORT) {
    return null;
  }

  const previousTransactions = filterTransactionsByMonth(
    transactions,
    previousMonth.start,
    previousMonth.end
  );

  const totalSpent = calculateTotal(currentTransactions);
  const previousSpent = calculateTotal(previousTransactions);
  const { direction: trend, percent: trendPercent } = calculateTrend(
    totalSpent,
    previousSpent,
    NEUTRAL_THRESHOLD
  );

  const isFirst = previousTransactions.length === 0;
  const categories = getCategoryBreakdown(currentTransactions, previousTransactions);

  const monthName = currentMonth.start.toLocaleDateString('es-CL', { month: 'long' });
  const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);
  const year = currentMonth.start.getFullYear();
  const quarter = getQuarterNumber(currentMonth.start);
  const prevMonthName = previousMonth.start.toLocaleDateString('es-CL', { month: 'short' });
  const prevMonthCapitalized = prevMonthName.charAt(0).toUpperCase() + prevMonthName.slice(1);

  // Generate persona insight based on data
  const lang = getSettingsState().lang;
  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.es;
  let personaInsight: string | undefined;
  if (categories.length > 0) {
    const topCategory = categories[0];
    if (topCategory.trend === 'up' && topCategory.trendPercent && topCategory.trendPercent > 15) {
      personaInsight = t.reportMonthCategoryRise.replace('{category}', formatCategoryName(topCategory.category, lang)).replace('{percent}', String(topCategory.trendPercent));
    } else if (isFirst) {
      personaInsight = t.reportFirstMonthGastify;
    }
  }

  return {
    id: `monthly-${monthsAgo}`,
    title: monthNameCapitalized,
    fullTitle: `${monthNameCapitalized} · Q${quarter} ${year}`,
    amount: totalSpent,
    trend: isFirst ? undefined : trend,
    trendPercent: isFirst ? undefined : Math.abs(trendPercent),
    comparisonLabel: `vs ${prevMonthCapitalized}`,
    periodType: 'monthly',
    isUnread: monthsAgo === 0, // Current month is unread
    isFirst,
    firstLabel: t.reportFirstMonthly,
    categories,
    personaInsight,
    transactionCount: currentTransactions.length,
    dateRange: { start: currentMonth.start, end: currentMonth.end },
  };
}

/**
 * Generate quarterly summary from transactions
 */
export function generateQuarterlySummary(
  transactions: Transaction[],
  quartersAgo: number = 0
): ReportRowData | null {
  const currentQuarter = getQuarterRange(quartersAgo);
  const previousQuarter = getQuarterRange(quartersAgo + 1);

  const currentTransactions = filterTransactionsByQuarter(
    transactions,
    currentQuarter.start,
    currentQuarter.end
  );

  if (currentTransactions.length < MIN_TRANSACTIONS_FOR_REPORT) {
    return null;
  }

  const previousTransactions = filterTransactionsByQuarter(
    transactions,
    previousQuarter.start,
    previousQuarter.end
  );

  const totalSpent = calculateTotal(currentTransactions);
  const previousSpent = calculateTotal(previousTransactions);
  const { direction: trend, percent: trendPercent } = calculateTrend(
    totalSpent,
    previousSpent,
    NEUTRAL_THRESHOLD
  );

  const isFirst = previousTransactions.length === 0;
  const categories = getCategoryBreakdown(currentTransactions, previousTransactions);

  const quarterNum = getQuarterNumber(currentQuarter.start);
  const year = currentQuarter.start.getFullYear();
  const prevQuarterNum = getQuarterNumber(previousQuarter.start);

  // Generate highlights for quarterly reports
  const lang = getSettingsState().lang;
  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.es;
  const highlights: Array<{ label: string; value: string }> = [];
  if (categories.length > 0) {
    const topCategory = categories[0];
    highlights.push({
      label: t.reportLabelCategoryLeader,
      value: `${formatCategoryName(topCategory.category, lang)} · ${topCategory.percent}%`,
    });
  }

  // Generate persona hook
  const personaHook = t.reportHookQuarterly;
  let personaInsight: string | undefined;
  if (categories.length > 0) {
    const topCategory = categories[0];
    personaInsight = t.reportQuarterStarCategory.replace('{category}', formatCategoryName(topCategory.category, lang)).replace('{percent}', String(topCategory.percent));
  }

  return {
    id: `quarterly-${quartersAgo}`,
    title: `Q${quarterNum} ${year}`,
    fullTitle: `Q${quarterNum} · ${year}`,
    amount: totalSpent,
    trend: isFirst ? undefined : trend,
    trendPercent: isFirst ? undefined : Math.abs(trendPercent),
    comparisonLabel: `vs Q${prevQuarterNum}`,
    periodType: 'quarterly',
    isUnread: quartersAgo === 0,
    isFirst,
    firstLabel: t.reportFirstQuarterly,
    personaHook,
    categories,
    personaInsight,
    highlights,
    transactionCount: currentTransactions.length,
    dateRange: { start: currentQuarter.start, end: currentQuarter.end },
  };
}

/**
 * Generate yearly summary from transactions
 */
export function generateYearlySummary(
  transactions: Transaction[],
  yearsAgo: number = 0
): ReportRowData | null {
  const currentYear = getYearRange(yearsAgo);
  const previousYear = getYearRange(yearsAgo + 1);

  const currentTransactions = filterTransactionsByYear(
    transactions,
    currentYear.start,
    currentYear.end
  );

  if (currentTransactions.length < MIN_TRANSACTIONS_FOR_REPORT) {
    return null;
  }

  const previousTransactions = filterTransactionsByYear(
    transactions,
    previousYear.start,
    previousYear.end
  );

  const totalSpent = calculateTotal(currentTransactions);
  const previousSpent = calculateTotal(previousTransactions);
  const { direction: trend, percent: trendPercent } = calculateTrend(
    totalSpent,
    previousSpent,
    NEUTRAL_THRESHOLD
  );

  const isFirst = previousTransactions.length === 0;
  const categories = getCategoryBreakdown(currentTransactions, previousTransactions);

  const year = currentYear.start.getFullYear();
  const prevYear = previousYear.start.getFullYear();

  // Generate highlights for yearly reports
  const lang = getSettingsState().lang;
  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.es;
  const highlights: Array<{ label: string; value: string }> = [];
  if (categories.length > 0) {
    highlights.push({
      label: t.reportLabelCategoryTop,
      value: `${formatCategoryName(categories[0].category, lang)} · ${categories[0].percent}%`,
    });
  }

  // Generate persona hook
  const personaHook = t.reportHookYearly;
  const personaInsight = isFirst
    ? t.reportFirstYearInsight
    : t.reportYearInsightSingle.replace('{category}', categories.length > 0 ? formatCategoryName(categories[0].category, lang).toLowerCase() : t.reportCategoryGeneral);

  return {
    id: `yearly-${yearsAgo}`,
    title: `${year}`,
    fullTitle: `${year}`,
    amount: totalSpent,
    trend: isFirst ? undefined : trend,
    trendPercent: isFirst ? undefined : Math.abs(trendPercent),
    comparisonLabel: `vs ${prevYear}`,
    periodType: 'yearly',
    isUnread: yearsAgo === 0,
    isFirst,
    firstLabel: t.reportFirstYearly,
    personaHook,
    categories,
    personaInsight,
    highlights,
    transactionCount: currentTransactions.length,
    dateRange: { start: currentYear.start, end: currentYear.end },
  };
}

/**
 * Generate weekly report row data
 * Story 14.16: Weekly reports include transactionGroups and itemGroups
 * Weekly shows top 3 of each group type sorted by amount
 */
export function generateWeeklyReportRow(
  transactions: Transaction[],
  weeksAgo: number = 0
): ReportRowData | null {
  const summary = generateWeeklySummary(transactions, weeksAgo);
  if (!summary) return null;

  const lang = getSettingsState().lang;
  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.es;
  const prevWeekNum = summary.weekNumber - 1 > 0 ? summary.weekNumber - 1 : 52;

  // Get transactions for this week and previous week to generate item groups with trends
  const currentWeek = getWeekRange(weeksAgo);
  const previousWeek = getWeekRange(weeksAgo + 1);
  const weekTransactions = filterTransactionsByWeek(
    transactions,
    currentWeek.start,
    currentWeek.end
  );
  const prevWeekTransactions = filterTransactionsByWeek(
    transactions,
    previousWeek.start,
    previousWeek.end
  );

  // Story 14.16: Generate groups for weekly report
  // Weekly shows top 3 transaction groups and top 3 item groups (sorted by amount)
  const allTransactionGroups = groupCategoriesByStoreGroup(summary.topCategories);
  const allItemGroups = groupItemsByItemCategory(weekTransactions, prevWeekTransactions);

  // Take top 3 of each (already sorted by amount descending)
  const transactionGroups = allTransactionGroups.slice(0, 3);
  const itemGroups = allItemGroups.slice(0, 3);

  return {
    id: `weekly-${weeksAgo}`,
    title: `${t.reportWeekLabel} ${summary.weekNumber}`,
    fullTitle: `${t.reportWeekLabel} ${summary.weekNumber} · ${summary.dateRange.start.toLocaleDateString('es-CL', { month: 'long' })} · Q${getQuarterNumber(summary.dateRange.start)} ${summary.dateRange.start.getFullYear()}`,
    amount: summary.totalSpent,
    trend: summary.isFirstWeek ? undefined : summary.trendDirection,
    trendPercent: summary.isFirstWeek ? undefined : Math.abs(summary.trendPercent),
    comparisonLabel: `vs S${prevWeekNum}`,
    periodType: 'weekly',
    isUnread: weeksAgo === 0,
    isFirst: summary.isFirstWeek,
    firstLabel: t.reportFirstWeekly,
    categories: summary.topCategories,
    transactionGroups,
    itemGroups,
    transactionCount: summary.transactionCount,
    dateRange: summary.dateRange,
  };
}

// ============================================================================
// Reports List Generation
// ============================================================================

/**
 * Get all available reports for a given period type within a time filter
 * @param transactions - All user transactions
 * @param periodType - Type of period (weekly, monthly, quarterly, yearly)
 * @param maxReports - Maximum number of reports to return
 */
export function getAvailableReports(
  transactions: Transaction[],
  periodType: ReportPeriodType,
  maxReports: number = 10
): ReportRowData[] {
  const safeMax = Math.min(maxReports, 104);
  const reports: ReportRowData[] = [];

  for (let i = 0; i < safeMax; i++) {
    let report: ReportRowData | null = null;

    switch (periodType) {
      case 'weekly':
        report = generateWeeklyReportRow(transactions, i);
        break;
      case 'monthly':
        report = generateMonthlySummary(transactions, i);
        break;
      case 'quarterly':
        report = generateQuarterlySummary(transactions, i);
        break;
      case 'yearly':
        report = generateYearlySummary(transactions, i);
        break;
    }

    if (report) {
      reports.push(report);
    }
  }

  return reports;
}

/**
 * Get time filter label for display
 */
export function getTimeFilterLabel(
  periodType: ReportPeriodType,
  offset: number = 0
): string {
  const now = new Date();

  switch (periodType) {
    case 'weekly': {
      const monthStart = getMonthStart(now);
      monthStart.setMonth(monthStart.getMonth() - offset);
      const monthName = monthStart.toLocaleDateString('es-CL', { month: 'long' });
      return monthName.charAt(0).toUpperCase() + monthName.slice(1);
    }
    case 'monthly': {
      const monthStart = getMonthStart(now);
      monthStart.setMonth(monthStart.getMonth() - offset);
      const monthName = monthStart.toLocaleDateString('es-CL', { month: 'long' });
      return monthName.charAt(0).toUpperCase() + monthName.slice(1);
    }
    case 'quarterly': {
      const quarterStart = getQuarterStart(now);
      quarterStart.setMonth(quarterStart.getMonth() - offset * 3);
      return `Q${getQuarterNumber(quarterStart)} ${quarterStart.getFullYear()}`;
    }
    case 'yearly': {
      return `${now.getFullYear() - offset}`;
    }
  }
}
