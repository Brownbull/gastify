/**
 * Report Insight and Highlight Helpers
 *
 * Persona insights, highlights, and seasonal context for report generation.
 * Split from reportYearGeneration.ts to stay under 800-line limit.
 */

import type { Transaction } from '@/types/transaction';
import type {
  CategoryBreakdown,
  TrendDirection,
} from '@/types/report';
import {
  formatCurrency,
} from '@/types/report';
import {
  parseDate,
  getISOWeekNumber,
  getWeekStart,
  getWeekEnd,
} from './reportDateUtils';
import {
  formatCategoryName,
} from './reportCategoryGrouping';
import { TRANSLATIONS } from '@/utils/translations';
import type { Language } from '@/utils/translations';
import { getSettingsState } from '@shared/stores/useSettingsStore';

// ============================================================================
// Insight Generation Helpers
// ============================================================================

/**
 * Holiday/seasonal months in Chile (for contextual insights)
 * Bilingual: keyed by month index, values per language.
 */
/** Maps Language to BCP 47 locale string for toLocaleDateString calls */
export const LANG_LOCALE: Record<Language, string> = {
  es: 'es-CL',
  en: 'en-US',
};

const HOLIDAY_MONTHS: Record<number, Record<Language, string>> = {
  0: { es: 'verano', en: 'summer' },
  1: { es: 'verano', en: 'summer' },
  2: { es: 'vuelta a clases', en: 'back to school' },
  8: { es: 'fiestas patrias', en: 'national holidays' },
  11: { es: 'fiestas de fin de año', en: 'year-end holidays' },
};

/**
 * Generate a persona insight for monthly reports based on data patterns
 */
export function generateMonthlyPersonaInsight(
  categories: CategoryBreakdown[],
  trend: TrendDirection | undefined,
  trendPercent: number | undefined,
  isFirst: boolean,
  monthIndex: number,
  prevMonthCategories?: CategoryBreakdown[]
): string | undefined {
  const lang = getSettingsState().lang;
  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.es;

  if (isFirst) {
    return t.reportFirstMonthGastify;
  }

  // Check for holiday context
  const holidayEntry = HOLIDAY_MONTHS[monthIndex];
  const holidayContext = holidayEntry?.[lang];

  // Find the category with biggest increase
  if (categories.length > 0 && prevMonthCategories && prevMonthCategories.length > 0) {
    const categoryChanges: { category: string; change: number; name: string }[] = [];

    for (const cat of categories) {
      const prevCat = prevMonthCategories.find((pc) => pc.category === cat.category);
      if (prevCat && prevCat.amount > 0) {
        const change = ((cat.amount - prevCat.amount) / prevCat.amount) * 100;
        if (Math.abs(change) > 10) {
          categoryChanges.push({
            category: cat.category,
            change,
            name: formatCategoryName(cat.category, lang),
          });
        }
      }
    }

    // Sort by absolute change descending
    categoryChanges.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

    if (categoryChanges.length > 0) {
      const biggest = categoryChanges[0];

      // Holiday-aware insights
      if (holidayContext && biggest.change > 20) {
        if (monthIndex === 11) {
          return t.reportMonthHolidayNoticed.replace('{holiday}', holidayContext).replace('{category}', biggest.name).replace('{percent}', String(Math.round(biggest.change)));
        } else if (monthIndex === 8) {
          return t.reportMonthHolidayImpulse.replace('{holiday}', holidayContext).replace('{category}', biggest.name).replace('{percent}', String(Math.round(biggest.change)));
        } else if (monthIndex <= 2) {
          return t.reportMonthHolidayMore.replace('{holiday}', holidayContext).replace('{category}', biggest.name);
        }
      }

      // Generic category change insights
      if (biggest.change > 25) {
        return t.reportMonthCategoryBigRise.replace('{category}', biggest.name).replace('{percent}', String(Math.round(biggest.change)));
      } else if (biggest.change < -25) {
        return t.reportMonthCategoryBigDrop.replace('{category}', biggest.name).replace('{percent}', String(Math.round(Math.abs(biggest.change))));
      } else if (biggest.change > 15) {
        return t.reportMonthCategoryRise.replace('{category}', biggest.name).replace('{percent}', String(Math.round(biggest.change)));
      } else if (biggest.change < -15) {
        return t.reportMonthCategoryDrop.replace('{category}', biggest.name).replace('{percent}', String(Math.round(Math.abs(biggest.change))));
      }
    }
  }

  // Trend-based insights
  if (trend && trendPercent !== undefined) {
    if (trend === 'down' && trendPercent > 10) {
      return t.reportMonthTrendDown.replace('{percent}', String(Math.round(trendPercent)));
    } else if (trend === 'up' && trendPercent > 15) {
      return t.reportMonthTrendUp.replace('{percent}', String(Math.round(trendPercent)));
    }
  }

  // Dominant category insight
  if (categories.length > 0 && categories[0].percent >= 45) {
    return t.reportMonthDominated.replace('{category}', formatCategoryName(categories[0].category, lang)).replace('{percent}', String(categories[0].percent));
  }

  // Diversity insight
  if (categories.length >= 4) {
    return t.reportMonthDiverse.replace('{count}', String(categories.length));
  }

  return undefined;
}

/**
 * Format a week date range in compact Spanish format
 * Example: "1-7 Ene" or "28 Dic - 3 Ene" (cross-month)
 */
export function formatWeekDateRange(weekStart: Date, weekEnd: Date): string {
  const lang = getSettingsState().lang;
  const locale = LANG_LOCALE[lang];
  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();
  const startMonth = weekStart.toLocaleDateString(locale, { month: 'short' });
  const endMonth = weekEnd.toLocaleDateString(locale, { month: 'short' });

  // Capitalize first letter of month
  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace('.', '');

  if (weekStart.getMonth() === weekEnd.getMonth()) {
    // Same month: "1-7 Ene"
    return `${startDay}-${endDay} ${capitalize(startMonth)}`;
  } else {
    // Cross month: "28 Dic - 3 Ene"
    return `${startDay} ${capitalize(startMonth)} - ${endDay} ${capitalize(endMonth)}`;
  }
}

/**
 * Generate highlights for monthly reports
 */
export function generateMonthlyHighlights(
  categories: CategoryBreakdown[],
  transactions: Transaction[],
  _year: number,
  _monthIndex: number
): Array<{ label: string; value: string }> {
  const lang = getSettingsState().lang;
  const tr = TRANSLATIONS[lang] ?? TRANSLATIONS.es;
  const highlights: Array<{ label: string; value: string }> = [];

  // Group transactions by week to find highest/lowest week
  // Track both total and date range for each week
  const weeklyData = new Map<number, { total: number; start: Date; end: Date }>();
  for (const tx of transactions) {
    const txDate = parseDate(tx.date);
    const weekNum = getISOWeekNumber(txDate);
    const existing = weeklyData.get(weekNum);
    if (existing) {
      existing.total += tx.total;
    } else {
      weeklyData.set(weekNum, {
        total: tx.total,
        start: getWeekStart(txDate),
        end: getWeekEnd(txDate),
      });
    }
  }

  if (weeklyData.size >= 2) {
    const weeks = Array.from(weeklyData.entries());
    weeks.sort((a, b) => b[1].total - a[1].total);

    const highestWeek = weeks[0];
    const lowestWeek = weeks[weeks.length - 1];

    const highDateRange = formatWeekDateRange(highestWeek[1].start, highestWeek[1].end);
    highlights.push({
      label: tr.reportLabelHighWeek,
      value: `S${highestWeek[0]} (${highDateRange}) · ${formatCurrency(highestWeek[1].total)}`,
    });

    if (highestWeek[0] !== lowestWeek[0]) {
      const lowDateRange = formatWeekDateRange(lowestWeek[1].start, lowestWeek[1].end);
      highlights.push({
        label: tr.reportLabelLowWeek,
        value: `S${lowestWeek[0]} (${lowDateRange}) · ${formatCurrency(lowestWeek[1].total)}`,
      });
    }
  }

  // Top category
  if (categories.length > 0) {
    highlights.push({
      label: tr.reportLabelCategoryLeader,
      value: `${formatCategoryName(categories[0].category, lang)} · ${categories[0].percent}%`,
    });
  }

  // Most transactions category (if different from top spend)
  if (categories.length > 1) {
    const mostTransactions = [...categories].sort(
      (a, b) => b.transactionCount - a.transactionCount
    )[0];
    if (mostTransactions.category !== categories[0].category) {
      highlights.push({
        label: tr.reportLabelMostVisits,
        value: `${formatCategoryName(mostTransactions.category, lang)} · ${mostTransactions.transactionCount} ${tr.reportPurchasePlural}`,
      });
    }
  }

  return highlights.slice(0, 4); // Max 4 highlights
}

/**
 * Generate highlights for quarterly reports
 */
export function generateQuarterlyHighlights(
  transactions: Transaction[],
  categories: CategoryBreakdown[],
  year: number,
  _quarter: number,
  prevQuarterCategories?: CategoryBreakdown[]
): Array<{ label: string; value: string }> {
  const lang = getSettingsState().lang;
  const locale = LANG_LOCALE[lang];
  const tr = TRANSLATIONS[lang] ?? TRANSLATIONS.es;
  const highlights: Array<{ label: string; value: string }> = [];

  // Group by month to find highest/lowest
  const monthlyTotals = new Map<number, { total: number; name: string }>();

  for (const tx of transactions) {
    const txDate = parseDate(tx.date);
    const month = txDate.getMonth();
    const existing = monthlyTotals.get(month) || { total: 0, name: '' };
    if (!existing.name) {
      const monthDate = new Date(year, month, 1);
      const monthLong = monthDate.toLocaleDateString(locale, { month: 'long' });
      existing.name = monthLong.charAt(0).toUpperCase() + monthLong.slice(1);
    }
    monthlyTotals.set(month, { total: existing.total + tx.total, name: existing.name });
  }

  if (monthlyTotals.size >= 2) {
    const months = Array.from(monthlyTotals.entries());
    months.sort((a, b) => b[1].total - a[1].total);

    const highestMonth = months[0];
    const lowestMonth = months[months.length - 1];

    highlights.push({
      label: tr.reportLabelHighMonth,
      value: `${highestMonth[1].name} · ${formatCurrency(highestMonth[1].total)}`,
    });

    if (highestMonth[0] !== lowestMonth[0]) {
      highlights.push({
        label: tr.reportLabelLowMonth,
        value: `${lowestMonth[1].name} · ${formatCurrency(lowestMonth[1].total)}`,
      });
    }
  }

  // Leading category
  if (categories.length > 0) {
    highlights.push({
      label: tr.reportLabelCategoryLeader,
      value: `${formatCategoryName(categories[0].category, lang)} · ${categories[0].percent}%`,
    });
  }

  // Find biggest category change vs previous quarter
  if (prevQuarterCategories && prevQuarterCategories.length > 0) {
    let biggestIncrease: { name: string; change: number } | null = null;

    for (const cat of categories) {
      const prevCat = prevQuarterCategories.find((pc) => pc.category === cat.category);
      if (prevCat && prevCat.amount > 0) {
        const change = ((cat.amount - prevCat.amount) / prevCat.amount) * 100;
        // Lower threshold to 10% to show more category changes
        if (change > 10 && (!biggestIncrease || change > biggestIncrease.change)) {
          biggestIncrease = {
            name: formatCategoryName(cat.category, lang),
            change: Math.round(change),
          };
        }
      }
    }

    if (biggestIncrease) {
      highlights.push({
        label: tr.reportLabelBiggestIncrease,
        value: `${biggestIncrease.name} · +${biggestIncrease.change}%`,
      });
    }
  }

  return highlights.slice(0, 4);
}

/**
 * Generate persona insight for quarterly reports
 */
export function generateQuarterlyPersonaInsight(
  categories: CategoryBreakdown[],
  isFirst: boolean,
  quarter: number,
  prevQuarterCategories?: CategoryBreakdown[]
): string | undefined {
  const lang = getSettingsState().lang;
  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.es;

  if (isFirst) {
    return t.reportFirstQuarterInsight;
  }

  if (categories.length === 0) return undefined;

  const topCategory = categories[0];
  const topCategoryName = formatCategoryName(topCategory.category, lang);

  // Check for category changes
  if (prevQuarterCategories && prevQuarterCategories.length > 0) {
    const prevTop = prevQuarterCategories.find((pc) => pc.category === topCategory.category);

    if (prevTop && prevTop.amount > 0) {
      const change = ((topCategory.amount - prevTop.amount) / prevTop.amount) * 100;

      if (change > 20) {
        // Seasonal insights
        if (quarter === 4) {
          return t.reportQuarterStarQ4.replace('{category}', topCategoryName).replace('{percent}', String(topCategory.percent));
        } else if (quarter === 3) {
          return t.reportQuarterStarQ3.replace('{category}', topCategoryName);
        } else if (quarter === 1) {
          return t.reportQuarterStarQ1.replace('{category}', topCategoryName).replace('{percent}', String(topCategory.percent));
        }
        return t.reportQuarterCategoryGrew.replace('{category}', topCategoryName).replace('{percent}', String(Math.round(change))).replace('{totalPercent}', String(topCategory.percent));
      } else if (change < -15) {
        return t.reportQuarterGoodControl.replace('{category}', topCategoryName).replace('{percent}', String(Math.round(Math.abs(change))));
      }
    }
  }

  return t.reportQuarterStarCategory.replace('{category}', topCategoryName).replace('{percent}', String(topCategory.percent));
}

/**
 * Generate highlights for yearly reports
 */
export function generateYearlyHighlights(
  transactions: Transaction[],
  categories: CategoryBreakdown[],
  year: number
): Array<{ label: string; value: string }> {
  const lang = getSettingsState().lang;
  const locale = LANG_LOCALE[lang];
  const tr = TRANSLATIONS[lang] ?? TRANSLATIONS.es;
  const highlights: Array<{ label: string; value: string }> = [];

  // Group by month to find highest/lowest
  const monthlyTotals = new Map<number, { total: number; name: string }>();

  for (const tx of transactions) {
    const txDate = parseDate(tx.date);
    const month = txDate.getMonth();
    const existing = monthlyTotals.get(month) || { total: 0, name: '' };
    if (!existing.name) {
      const monthDate = new Date(year, month, 1);
      const monthLong = monthDate.toLocaleDateString(locale, { month: 'long' });
      existing.name = monthLong.charAt(0).toUpperCase() + monthLong.slice(1);
    }
    monthlyTotals.set(month, { total: existing.total + tx.total, name: existing.name });
  }

  if (monthlyTotals.size >= 2) {
    const months = Array.from(monthlyTotals.entries());
    months.sort((a, b) => b[1].total - a[1].total);

    const highestMonth = months[0];
    const lowestMonth = months[months.length - 1];

    highlights.push({
      label: tr.reportLabelHighMonth,
      value: `${highestMonth[1].name} · ${formatCurrency(highestMonth[1].total)}`,
    });

    if (highestMonth[0] !== lowestMonth[0]) {
      highlights.push({
        label: tr.reportLabelLowMonth,
        value: `${lowestMonth[1].name} · ${formatCurrency(lowestMonth[1].total)}`,
      });
    }
  }

  // Top category
  if (categories.length > 0) {
    highlights.push({
      label: tr.reportLabelCategoryTop,
      value: `${formatCategoryName(categories[0].category, lang)} · ${categories[0].percent}%`,
    });
  }

  return highlights.slice(0, 4);
}

/**
 * Generate persona insight for yearly reports
 */
export function generateYearlyPersonaInsight(
  categories: CategoryBreakdown[],
  isFirst: boolean
): string | undefined {
  const lang = getSettingsState().lang;
  const t = TRANSLATIONS[lang] ?? TRANSLATIONS.es;

  if (isFirst) {
    return t.reportFirstYearInsight;
  }

  if (categories.length === 0) return undefined;

  // Get top 2 categories for a richer insight
  const topCategory = categories[0];
  const topCategoryName = formatCategoryName(topCategory.category, lang).toLowerCase();

  // If we have a second category that's also significant (>20%), mention both
  if (categories.length >= 2 && categories[1].percent >= 20) {
    const secondCategoryName = formatCategoryName(categories[1].category, lang).toLowerCase();
    return t.reportYearInsightTwo.replace('{category1}', topCategoryName).replace('{category2}', secondCategoryName);
  }

  return t.reportYearInsightSingle.replace('{category}', topCategoryName);
}
