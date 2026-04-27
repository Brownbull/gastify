/**
 * Report Year-Based Generation Utilities
 *
 * Year-based report generation functions.
 * Top of the dependency chain — imports from all upstream files.
 */

import type { Transaction } from '@/types/transaction';
import type {
  CategoryBreakdown,
  ReportPeriodType,
} from '@/types/report';
import {
  calculateTrend,
} from '@/types/report';
import {
  parseDate,
  getISOWeekNumber,
  getWeekStart,
  getWeekEnd,
  calculateTotal,
  getQuarterNumber,
  getQuarterStart,
  getQuarterEnd,
  getMonthStart,
  getMonthEnd,
} from './reportDateUtils';
import {
  getCategoryBreakdown,
  groupCategoriesByStoreGroup,
  groupItemsByItemCategory,
  sortGroupsAlphabetically,
  formatCategoryName,
  NEUTRAL_THRESHOLD,
} from './reportCategoryGrouping';
import { getSettingsState } from '@shared/stores/useSettingsStore';
import { TRANSLATIONS } from '@/utils/translations';
import type { ReportRowData } from './reportGeneration';
import {
  LANG_LOCALE,
  generateMonthlyPersonaInsight,
  generateMonthlyHighlights,
  generateQuarterlyHighlights,
  generateQuarterlyPersonaInsight,
  generateYearlyHighlights,
  generateYearlyPersonaInsight,
} from './reportInsights';

// ============================================================================
// Year-Based Report Generation
// ============================================================================

/**
 * Filter transactions to a specific year
 */
function filterTransactionsBySpecificYear(
  transactions: Transaction[],
  year: number
): Transaction[] {
  return transactions.filter((t) => {
    return parseDate(t.date).getFullYear() === year;
  });
}

/**
 * Generate weekly reports for a specific year
 * Only generates reports for completed weeks (excludes current week)
 * Compares across year boundaries (Week 1 vs Week 52 of previous year)
 *
 * IMPORTANT: ISO weeks can span year boundaries. Week 1 of a year is defined as
 * the week containing January 4th. This means Week 1 may include days from December
 * of the previous year. We filter by the week's date range, not by calendar year.
 */
function generateWeeklyReportsForYear(
  transactions: Transaction[],
  year: number
): ReportRowData[] {
  const reports: ReportRowData[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentWeekNum = getISOWeekNumber(now);

  // Group ALL transactions by their ISO week (not filtered by year)
  const weeksWithData = new Map<string, Transaction[]>();

  for (const t of transactions) {
    const txDate = parseDate(t.date);
    const weekNum = getISOWeekNumber(txDate);
    // Use Thursday of the week to determine the year (ISO standard)
    const thursday = getWeekStart(txDate);
    thursday.setDate(thursday.getDate() + 3);
    const isoYear = thursday.getFullYear();

    const key = `${isoYear}-${weekNum}`;
    const existing = weeksWithData.get(key) || [];
    existing.push(t);
    weeksWithData.set(key, existing);
  }

  // Get weeks for this specific year
  const yearWeeks = Array.from(weeksWithData.entries())
    .filter(([key]) => key.startsWith(`${year}-`))
    .map(([key, txs]) => ({
      weekNum: parseInt(key.split('-')[1], 10),
      transactions: txs,
    }))
    .sort((a, b) => b.weekNum - a.weekNum);

  // Get previous year weeks for comparison
  const prevYearWeeksMap = new Map<number, Transaction[]>();
  Array.from(weeksWithData.entries())
    .filter(([key]) => key.startsWith(`${year - 1}-`))
    .forEach(([key, txs]) => {
      const weekNum = parseInt(key.split('-')[1], 10);
      prevYearWeeksMap.set(weekNum, txs);
    });

  // Current year weeks map for intra-year comparison
  const currentYearWeeksMap = new Map<number, Transaction[]>();
  yearWeeks.forEach(({ weekNum, transactions: txs }) => {
    currentYearWeeksMap.set(weekNum, txs);
  });

  const lang = getSettingsState().lang;
  const locale = LANG_LOCALE[lang];
  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.es;

  for (const { weekNum, transactions: weekTransactions } of yearWeeks) {
    const isCurrentWeek = year === currentYear && weekNum === currentWeekNum;
    if (isCurrentWeek) continue;

    const totalSpent = calculateTotal(weekTransactions);

    let prevWeekTxForCategories: Transaction[] = [];
    if (weekNum === 1) {
      prevWeekTxForCategories = prevYearWeeksMap.get(52) || prevYearWeeksMap.get(53) || [];
    } else {
      prevWeekTxForCategories = currentYearWeeksMap.get(weekNum - 1) || [];
    }

    const categories = getCategoryBreakdown(weekTransactions, prevWeekTxForCategories);

    let prevWeekTransactions: Transaction[];
    let comparisonLabel: string;

    if (weekNum === 1) {
      prevWeekTransactions = prevYearWeeksMap.get(52) || prevYearWeeksMap.get(53) || [];
      comparisonLabel = `vs ${t.reportWeekAbbrev}52 ${year - 1}`;
    } else {
      prevWeekTransactions = currentYearWeeksMap.get(weekNum - 1) || [];
      comparisonLabel = `vs ${t.reportWeekAbbrev}${weekNum - 1}`;
    }

    const prevTotalSpent = calculateTotal(prevWeekTransactions);
    const { direction: trend, percent: trendPercent } = calculateTrend(
      totalSpent, prevTotalSpent, NEUTRAL_THRESHOLD
    );

    const isFirst = prevWeekTransactions.length === 0;
    const firstTxDate = parseDate(weekTransactions[0].date);
    const weekStart = getWeekStart(firstTxDate);
    const weekEnd = getWeekEnd(firstTxDate);

    const thursday = new Date(weekStart);
    thursday.setDate(thursday.getDate() + 3);
    const monthName = thursday.toLocaleDateString(locale, { month: 'long' });
    let personaInsight: string | undefined;
    if (categories.length > 0) {
      const topCategory = categories[0];
      const topCategoryName = formatCategoryName(topCategory.category, lang);

      if (isFirst) {
        personaInsight = t.reportWeekFirstInsight.replace('{category}', topCategoryName);
      } else if (trend === 'up' && trendPercent > 20) {
        personaInsight = t.reportWeekHighSpend.replace('{percent}', String(Math.abs(trendPercent)));
      } else if (trend === 'down' && trendPercent < -20) {
        personaInsight = t.reportWeekGoodControl.replace('{percent}', String(Math.abs(trendPercent)));
      } else if (topCategory.percent >= 50) {
        personaInsight = t.reportWeekCategoryDominated.replace('{category}', topCategoryName).replace('{percent}', String(topCategory.percent));
      } else if (categories.length >= 3) {
        personaInsight = t.reportWeekDiverseSpending.replace('{count}', String(categories.length));
      }
    }

    const allTransactionGroups = groupCategoriesByStoreGroup(categories);
    const allItemGroups = groupItemsByItemCategory(weekTransactions, prevWeekTransactions);
    const transactionGroups = allTransactionGroups.slice(0, 3);
    const itemGroups = allItemGroups.slice(0, 3);

    reports.push({
      id: `weekly-${year}-${weekNum}`,
      title: `${t.reportWeekLabel} ${weekNum}`,
      fullTitle: `${t.reportWeekLabel} ${weekNum} · ${monthName} · Q${getQuarterNumber(thursday)} ${year}`,
      amount: totalSpent,
      trend: isFirst ? undefined : trend,
      trendPercent: isFirst ? undefined : Math.abs(trendPercent),
      comparisonLabel,
      periodType: 'weekly',
      isUnread: false,
      isFirst,
      firstLabel: t.reportFirstWeekly,
      categories,
      transactionGroups,
      itemGroups,
      personaInsight,
      transactionCount: weekTransactions.length,
      dateRange: { start: weekStart, end: weekEnd },
    });
  }

  return reports;
}

/**
 * Generate monthly reports for a specific year
 */
function generateMonthlyReportsForYear(
  transactions: Transaction[],
  year: number
): ReportRowData[] {
  const yearTransactions = filterTransactionsBySpecificYear(transactions, year);
  if (yearTransactions.length === 0) return [];

  const reports: ReportRowData[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const monthsWithData = new Map<number, Transaction[]>();
  for (const t of yearTransactions) {
    const txDate = parseDate(t.date);
    const month = txDate.getMonth();
    const existing = monthsWithData.get(month) || [];
    existing.push(t);
    monthsWithData.set(month, existing);
  }

  const prevYearTransactions = filterTransactionsBySpecificYear(transactions, year - 1);
  const prevYearMonthsWithData = new Map<number, Transaction[]>();
  for (const t of prevYearTransactions) {
    const txDate = parseDate(t.date);
    const month = txDate.getMonth();
    const existing = prevYearMonthsWithData.get(month) || [];
    existing.push(t);
    prevYearMonthsWithData.set(month, existing);
  }

  const sortedMonths = Array.from(monthsWithData.keys()).sort((a, b) => b - a);
  const monthCategories = new Map<number, CategoryBreakdown[]>();
  const prevYearDecemberTransactions = prevYearMonthsWithData.get(11) || [];

  for (const month of sortedMonths) {
    const monthTransactions = monthsWithData.get(month) || [];
    const prevMonthTx = month === 0 ? prevYearDecemberTransactions : (monthsWithData.get(month - 1) || []);
    monthCategories.set(month, getCategoryBreakdown(monthTransactions, prevMonthTx));
  }

  const prevYearDecemberCategories =
    prevYearDecemberTransactions.length > 0 ? getCategoryBreakdown(prevYearDecemberTransactions) : undefined;

  const lang = getSettingsState().lang;
  const locale = LANG_LOCALE[lang];
  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.es;

  for (const month of sortedMonths) {
    if (year === currentYear && month === currentMonth) continue;

    const monthTransactions = monthsWithData.get(month) || [];
    const totalSpent = calculateTotal(monthTransactions);
    const categories = monthCategories.get(month) || [];

    let prevMonthTransactions: Transaction[];
    let prevCategories: CategoryBreakdown[] | undefined;
    let comparisonLabel: string;

    if (month === 0) {
      prevMonthTransactions = prevYearDecemberTransactions;
      prevCategories = prevYearDecemberCategories;
      const decDate = new Date(year - 1, 11, 1);
      const decName = decDate.toLocaleDateString(locale, { month: 'short' });
      comparisonLabel = `vs ${decName.charAt(0).toUpperCase() + decName.slice(1)} ${year - 1}`;
    } else {
      prevMonthTransactions = monthsWithData.get(month - 1) || [];
      prevCategories = monthCategories.get(month - 1);
      const prevMonthDate = new Date(year, month - 1, 1);
      const prevMonthName = prevMonthDate.toLocaleDateString(locale, { month: 'short' });
      comparisonLabel = `vs ${prevMonthName.charAt(0).toUpperCase() + prevMonthName.slice(1)}`;
    }

    const prevTotalSpent = calculateTotal(prevMonthTransactions);
    const { direction: trend, percent: trendPercent } = calculateTrend(totalSpent, prevTotalSpent, NEUTRAL_THRESHOLD);
    const isFirst = prevMonthTransactions.length === 0;

    const monthDate = new Date(year, month, 1);
    const monthName = monthDate.toLocaleDateString(locale, { month: 'long' });
    const monthNameCapitalized = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    const personaInsight = generateMonthlyPersonaInsight(categories, trend, Math.abs(trendPercent), isFirst, month, prevCategories);
    const highlights = generateMonthlyHighlights(categories, monthTransactions, year, month);
    const transactionGroups = sortGroupsAlphabetically(groupCategoriesByStoreGroup(categories));
    const itemGroups = sortGroupsAlphabetically(groupItemsByItemCategory(monthTransactions, prevMonthTransactions));
    reports.push({
      id: `monthly-${year}-${month}`,
      title: monthNameCapitalized,
      fullTitle: `${monthNameCapitalized} · Q${getQuarterNumber(monthDate)} ${year}`,
      amount: totalSpent,
      trend: isFirst ? undefined : trend,
      trendPercent: isFirst ? undefined : Math.abs(trendPercent),
      comparisonLabel,
      periodType: 'monthly',
      isUnread: false,
      isFirst,
      firstLabel: t.reportFirstMonthly,
      categories,
      transactionGroups,
      itemGroups,
      personaInsight,
      highlights: highlights.length > 0 ? highlights : undefined,
      transactionCount: monthTransactions.length,
      dateRange: { start: getMonthStart(monthDate), end: getMonthEnd(monthDate) },
    });
  }

  return reports;
}

/**
 * Generate quarterly reports for a specific year
 */
function generateQuarterlyReportsForYear(
  transactions: Transaction[],
  year: number
): ReportRowData[] {
  const yearTransactions = filterTransactionsBySpecificYear(transactions, year);
  if (yearTransactions.length === 0) return [];

  const reports: ReportRowData[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = getQuarterNumber(now);

  const quartersWithData = new Map<number, Transaction[]>();
  for (const t of yearTransactions) {
    const txDate = parseDate(t.date);
    const quarter = getQuarterNumber(txDate);
    const existing = quartersWithData.get(quarter) || [];
    existing.push(t);
    quartersWithData.set(quarter, existing);
  }

  const prevYearTransactions = filterTransactionsBySpecificYear(transactions, year - 1);
  const prevYearQuartersWithData = new Map<number, Transaction[]>();
  for (const t of prevYearTransactions) {
    const txDate = parseDate(t.date);
    const quarter = getQuarterNumber(txDate);
    const existing = prevYearQuartersWithData.get(quarter) || [];
    existing.push(t);
    prevYearQuartersWithData.set(quarter, existing);
  }

  const sortedQuarters = Array.from(quartersWithData.keys()).sort((a, b) => b - a);
  const prevYearQ4Transactions = prevYearQuartersWithData.get(4) || [];

  const quarterCategories = new Map<number, CategoryBreakdown[]>();
  for (const quarter of sortedQuarters) {
    const quarterTransactions = quartersWithData.get(quarter) || [];
    const prevQuarterTx = quarter === 1 ? prevYearQ4Transactions : (quartersWithData.get(quarter - 1) || []);
    quarterCategories.set(quarter, getCategoryBreakdown(quarterTransactions, prevQuarterTx));
  }

  const prevYearQ4Categories =
    prevYearQ4Transactions.length > 0 ? getCategoryBreakdown(prevYearQ4Transactions) : undefined;

  const lang = getSettingsState().lang;
  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.es;

  for (const quarter of sortedQuarters) {
    if (year === currentYear && quarter === currentQuarter) continue;

    const quarterTransactions = quartersWithData.get(quarter) || [];
    const totalSpent = calculateTotal(quarterTransactions);
    const categories = quarterCategories.get(quarter) || [];

    let prevQuarterTransactions: Transaction[];
    let prevCategories: CategoryBreakdown[] | undefined;
    let comparisonLabel: string;

    if (quarter === 1) {
      prevQuarterTransactions = prevYearQ4Transactions;
      prevCategories = prevYearQ4Categories;
      comparisonLabel = `vs Q4 ${year - 1}`;
    } else {
      prevQuarterTransactions = quartersWithData.get(quarter - 1) || [];
      prevCategories = quarterCategories.get(quarter - 1);
      comparisonLabel = `vs Q${quarter - 1}`;
    }

    const prevTotalSpent = calculateTotal(prevQuarterTransactions);
    const { direction: trend, percent: trendPercent } = calculateTrend(totalSpent, prevTotalSpent, NEUTRAL_THRESHOLD);
    const isFirst = prevQuarterTransactions.length === 0;

    const quarterStartMonth = (quarter - 1) * 3;
    const quarterStartDate = new Date(year, quarterStartMonth, 1);

    const highlights = generateQuarterlyHighlights(quarterTransactions, categories, year, quarter, prevCategories);
    const personaInsight = generateQuarterlyPersonaInsight(categories, isFirst, quarter, prevCategories);
    const transactionGroups = sortGroupsAlphabetically(groupCategoriesByStoreGroup(categories));
    const itemGroups = sortGroupsAlphabetically(groupItemsByItemCategory(quarterTransactions, prevQuarterTransactions));

    reports.push({
      id: `quarterly-${year}-${quarter}`,
      title: `Q${quarter} ${year}`,
      fullTitle: `Q${quarter} · ${year}`,
      amount: totalSpent,
      trend: isFirst ? undefined : trend,
      trendPercent: isFirst ? undefined : Math.abs(trendPercent),
      comparisonLabel,
      periodType: 'quarterly',
      isUnread: false,
      isFirst,
      firstLabel: t.reportFirstQuarterly,
      personaHook: t.reportHookQuarterly,
      categories,
      transactionGroups,
      itemGroups,
      highlights: highlights.length > 0 ? highlights : undefined,
      personaInsight,
      transactionCount: quarterTransactions.length,
      dateRange: { start: getQuarterStart(quarterStartDate), end: getQuarterEnd(quarterStartDate) },
    });
  }

  return reports;
}

/**
 * Generate yearly report for a specific year
 */
function generateYearlyReportForYear(
  transactions: Transaction[],
  year: number
): ReportRowData[] {
  const now = new Date();
  if (year === now.getFullYear()) return [];

  const yearTransactions = filterTransactionsBySpecificYear(transactions, year);
  if (yearTransactions.length === 0) return [];

  const prevYearTransactions = filterTransactionsBySpecificYear(transactions, year - 1);
  const totalSpent = calculateTotal(yearTransactions);
  const categories = getCategoryBreakdown(yearTransactions, prevYearTransactions);
  const prevTotalSpent = calculateTotal(prevYearTransactions);

  const { direction: trend, percent: trendPercent } = calculateTrend(totalSpent, prevTotalSpent, NEUTRAL_THRESHOLD);
  const isFirst = prevYearTransactions.length === 0;

  const yearStart = new Date(year, 0, 1);
  yearStart.setHours(0, 0, 0, 0);
  const yearEnd = new Date(year, 11, 31);
  yearEnd.setHours(23, 59, 59, 999);

  const highlights = generateYearlyHighlights(yearTransactions, categories, year);
  const personaInsight = generateYearlyPersonaInsight(categories, isFirst);
  const transactionGroups = sortGroupsAlphabetically(groupCategoriesByStoreGroup(categories));
  const itemGroups = sortGroupsAlphabetically(groupItemsByItemCategory(yearTransactions, prevYearTransactions));

  const lang = getSettingsState().lang;
  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.es;
  return [{
    id: `yearly-${year}`,
    title: `${year}`,
    fullTitle: `${year}`,
    amount: totalSpent,
    trend: isFirst ? undefined : trend,
    trendPercent: isFirst ? undefined : Math.abs(trendPercent),
    comparisonLabel: `vs ${year - 1}`,
    periodType: 'yearly',
    isUnread: false,
    isFirst,
    firstLabel: t.reportFirstYearly,
    personaHook: t.reportHookYearly,
    categories,
    transactionGroups,
    itemGroups,
    highlights: highlights.length > 0 ? highlights : undefined,
    personaInsight,
    transactionCount: yearTransactions.length,
    dateRange: { start: yearStart, end: yearEnd },
  }];
}

// ============================================================================
// Year-Based Report List API
// ============================================================================

/**
 * Get all available reports for a given period type within a specific year
 */
export function getAvailableReportsForYear(
  transactions: Transaction[],
  periodType: ReportPeriodType,
  year: number
): ReportRowData[] {
  switch (periodType) {
    case 'weekly':
      return generateWeeklyReportsForYear(transactions, year);
    case 'monthly':
      return generateMonthlyReportsForYear(transactions, year);
    case 'quarterly':
      return generateQuarterlyReportsForYear(transactions, year);
    case 'yearly':
      return generateYearlyReportForYear(transactions, year);
    default:
      return [];
  }
}

/**
 * Get the maximum possible number of reports for a given period type in a year
 */
export function getMaxReportsForYear(
  periodType: ReportPeriodType,
  _year: number
): number {
  switch (periodType) {
    case 'weekly':
      return 52;
    case 'monthly':
      return 12;
    case 'quarterly':
      return 4;
    case 'yearly':
      return 1;
    default:
      return 0;
  }
}
