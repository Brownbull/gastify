/**
 * Insight Generators
 *
 * Story 10.3: Transaction-Intrinsic Insights
 * Architecture: architecture-epic10-insight-engine.md
 * Pattern: Generator registry with canGenerate/generate interface
 *
 * This file contains all insight generators for the Insight Engine.
 * Transaction-intrinsic generators work with any single transaction (cold start).
 * Pattern detection generators (Story 10.4) will be added later.
 */

import type { Transaction } from '@/types/transaction';
import { Insight, InsightGenerator, InsightCategory } from '@/types/insight';
import { DEFAULT_TIME } from '@/utils/transactionNormalizer';
import { checkForDuplicates } from '@/services/duplicateDetectionService';

// ============================================================================
// TRANSACTION-INTRINSIC GENERATORS
// These work with ANY single transaction (cold start)
// Story 10.3: 7 generators for immediate user value
// ============================================================================

/**
 * biggest_item: Highlights the most expensive item in the transaction.
 * Always available when items exist - guaranteed cold-start insight.
 */
const biggestItemGenerator: InsightGenerator = {
  id: 'biggest_item',
  category: 'QUIRKY_FIRST',
  canGenerate: (tx) => tx.items.length > 0,
  generate: (tx) => {
    const biggest = tx.items.reduce(
      (max, item) => (item.totalPrice > max.totalPrice ? item : max),
      tx.items[0]
    );

    return {
      id: 'biggest_item',
      category: 'QUIRKY_FIRST',
      title: 'Compra destacada',
      message: `${biggest.name} fue lo más caro: $${biggest.totalPrice.toLocaleString('es-CL')}`,
      icon: 'Star',
      priority: 3,
      transactionId: tx.id,
    };
  },
};

/**
 * item_count: Comments on large baskets (>5 items).
 */
const itemCountGenerator: InsightGenerator = {
  id: 'item_count',
  category: 'QUIRKY_FIRST',
  canGenerate: (tx) => tx.items.length > 5,
  generate: (tx) => ({
    id: 'item_count',
    category: 'QUIRKY_FIRST',
    title: 'Carrito lleno',
    message: `${tx.items.length} productos en esta compra`,
    icon: 'ShoppingCart',
    priority: 2,
    transactionId: tx.id,
  }),
};

/**
 * Safely parses hour from time string (HH:mm format).
 * Returns null if time is missing, malformed, or is a default/sentinel value.
 *
 * DEFAULT_TIME ("04:04") is used as a sentinel to indicate "time not available"
 * for legacy transactions or when Gemini couldn't extract the time from receipt.
 * We skip time-based insights for default times since we can't confirm the
 * actual purchase time.
 */
function parseHour(time: string | undefined): number | null {
  if (!time) return null;
  // Skip default sentinel value - can't trust it for time-based insights
  if (time === DEFAULT_TIME) return null;
  const match = time.match(/^(\d{1,2}):/);
  if (!match) return null;
  const hour = parseInt(match[1], 10);
  if (isNaN(hour) || hour < 0 || hour > 23) return null;
  return hour;
}

/**
 * unusual_hour: Notes early morning (<6am) or late night (>=10pm) shopping.
 */
const unusualHourGenerator: InsightGenerator = {
  id: 'unusual_hour',
  category: 'QUIRKY_FIRST',
  canGenerate: (tx) => {
    const hour = parseHour(tx.time);
    if (hour === null) return false;
    return hour < 6 || hour >= 22;
  },
  generate: (tx) => {
    const hour = parseHour(tx.time)!;
    const isLateNight = hour >= 22;

    return {
      id: 'unusual_hour',
      category: 'QUIRKY_FIRST',
      title: isLateNight ? 'Compra nocturna' : 'Madrugador',
      message: isLateNight
        ? `Comprando a las ${tx.time} - ¡noctámbulo!`
        : `Comprando a las ${tx.time} - ¡tempranero!`,
      icon: 'Moon',
      priority: 5,
      transactionId: tx.id,
    };
  },
};

/**
 * weekend_warrior: Recognizes weekend shopping (Saturday/Sunday).
 * Note: Uses date parts to avoid timezone issues with Date parsing.
 */
const weekendWarriorGenerator: InsightGenerator = {
  id: 'weekend_warrior',
  category: 'QUIRKY_FIRST',
  canGenerate: (tx) => {
    // Parse date as local time to avoid UTC conversion issues
    // tx.date format: YYYY-MM-DD
    const [year, month, dayOfMonth] = tx.date.split('-').map(Number);
    const date = new Date(year, month - 1, dayOfMonth); // month is 0-indexed
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Sunday = 0, Saturday = 6
  },
  generate: (tx) => ({
    id: 'weekend_warrior',
    category: 'QUIRKY_FIRST',
    title: 'Compra de fin de semana',
    message: 'Aprovechando el finde para las compras',
    icon: 'Calendar',
    priority: 2,
    transactionId: tx.id,
  }),
};

/**
 * new_merchant: Celebrates first visit to a merchant.
 * Always triggers on first transaction (empty history).
 */
const newMerchantGenerator: InsightGenerator = {
  id: 'new_merchant',
  category: 'CELEBRATORY',
  canGenerate: (tx, history) => {
    return !history.some((h) => h.merchant === tx.merchant);
  },
  generate: (tx) => ({
    id: 'new_merchant',
    category: 'CELEBRATORY',
    title: 'Nuevo lugar',
    message: `Primera vez en ${tx.merchant}`,
    icon: 'MapPin',
    priority: 6,
    transactionId: tx.id,
  }),
};

/**
 * new_city: Recognizes first purchase in a new city.
 */
const newCityGenerator: InsightGenerator = {
  id: 'new_city',
  category: 'CELEBRATORY',
  canGenerate: (tx, history) => {
    if (!tx.city) return false;
    return !history.some((h) => h.city === tx.city);
  },
  generate: (tx) => ({
    id: 'new_city',
    category: 'CELEBRATORY',
    title: 'Nueva ciudad',
    message: `Primera compra en ${tx.city}`,
    icon: 'Globe',
    priority: 7,
    transactionId: tx.id,
  }),
};

/**
 * category_variety: Recognizes diverse shopping (3+ categories in one receipt).
 */
const categoryVarietyGenerator: InsightGenerator = {
  id: 'category_variety',
  category: 'QUIRKY_FIRST',
  canGenerate: (tx) => {
    const uniqueCategories = new Set(
      tx.items
        .filter((item) => item.category && String(item.category).trim())
        .map((item) => item.category)
    );
    return uniqueCategories.size >= 3;
  },
  generate: (tx) => {
    const uniqueCategories = new Set(
      tx.items
        .filter((item) => item.category && String(item.category).trim())
        .map((item) => item.category)
    );

    return {
      id: 'category_variety',
      category: 'QUIRKY_FIRST',
      title: 'Compra variada',
      message: `${uniqueCategories.size} categorías diferentes en una boleta`,
      icon: 'Layers',
      priority: 3,
      transactionId: tx.id,
    };
  },
};

// ============================================================================
// PATTERN DETECTION GENERATORS
// Story 10.4: These require transaction history to detect patterns
// ============================================================================

/**
 * Parses date string to local date components to avoid timezone issues.
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Object with year, month, day, and Date object
 */
function parseLocalDate(dateStr: string): {
  year: number;
  month: number;
  day: number;
  date: Date;
} {
  const [year, month, day] = dateStr.split('-').map(Number);
  return {
    year,
    month: month - 1, // 0-indexed for Date constructor
    day,
    date: new Date(year, month - 1, day),
  };
}

/**
 * Returns Spanish ordinal for a number.
 * @param n - The number to convert
 * @returns Spanish ordinal (e.g., "3ra")
 */
function getOrdinalSpanish(n: number): string {
  const ordinals: Record<number, string> = {
    1: '1ra',
    2: '2da',
    3: '3ra',
    4: '4ta',
    5: '5ta',
    6: '6ta',
    7: '7ma',
    8: '8va',
    9: '9na',
    10: '10ma',
  };
  return ordinals[n] || `${n}ª`;
}

/**
 * Returns Spanish day name for a weekday number.
 * @param day - Day of week (0 = Sunday, 6 = Saturday)
 * @returns Spanish day name
 */
function getDayNameSpanish(day: number): string {
  const days = [
    'domingo',
    'lunes',
    'martes',
    'miércoles',
    'jueves',
    'viernes',
    'sábado',
  ];
  return days[day];
}

/**
 * Returns Spanish time of day description.
 * @param hour - Hour of day (0-23)
 * @returns Spanish time of day
 */
function getTimeOfDaySpanish(hour: number): string {
  if (hour < 6) return 'madrugada';
  if (hour < 12) return 'mañana';
  if (hour < 14) return 'mediodía';
  if (hour < 19) return 'tarde';
  return 'noche';
}

/**
 * Checks if a date is in the current month.
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns true if date is in current month
 */
function isThisMonth(dateStr: string): boolean {
  const { year, month } = parseLocalDate(dateStr);
  const now = new Date();
  return month === now.getMonth() && year === now.getFullYear();
}

/**
 * Checks if a date is in the previous month.
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns true if date is in last month
 */
function isLastMonth(dateStr: string): boolean {
  const { year, month } = parseLocalDate(dateStr);
  const now = new Date();
  const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  return month === lastMonth && year === lastMonthYear;
}

/**
 * merchant_frequency: Tracks repeat visits to the same merchant.
 * Triggers when 2+ previous visits to the same merchant.
 * AC #3: Minimum 2+ visits required.
 *
 * v9.1.0: Added time context (this month, this year, all-time) for meaningful messages.
 */
const merchantFrequencyGenerator: InsightGenerator = {
  id: 'merchant_frequency',
  category: 'ACTIONABLE',
  canGenerate: (tx, history) => {
    const visits = history.filter((h) => h.merchant === tx.merchant).length;
    return visits >= 2;
  },
  generate: (tx, history) => {
    const merchantHistory = history.filter((h) => h.merchant === tx.merchant);
    const totalVisits = merchantHistory.length + 1;

    // Count visits this month
    const thisMonthVisits = merchantHistory.filter((h) => isThisMonth(h.date)).length + 1;

    // Count visits this year
    const currentYear = new Date().getFullYear();
    const thisYearVisits =
      merchantHistory.filter((h) => {
        const { year } = parseLocalDate(h.date);
        return year === currentYear;
      }).length + 1;

    // Determine the most meaningful time frame
    // Priority: this month > this year > all-time
    let timeFrame: string;
    let displayVisits: number;

    if (thisMonthVisits >= 2) {
      // If 2+ visits this month, show monthly context
      timeFrame = 'este mes';
      displayVisits = thisMonthVisits;
    } else if (thisYearVisits >= 2 && thisYearVisits < totalVisits) {
      // If 2+ visits this year (but not all from this month), show yearly
      timeFrame = 'este año';
      displayVisits = thisYearVisits;
    } else {
      // Fall back to all-time count (no suffix for all-time)
      timeFrame = '';
      displayVisits = totalVisits;
    }

    const ordinal = getOrdinalSpanish(displayVisits);
    const message = timeFrame
      ? `${ordinal} vez en ${tx.merchant} ${timeFrame}`
      : `${ordinal} vez en ${tx.merchant}`;

    return {
      id: 'merchant_frequency',
      category: 'ACTIONABLE',
      title: 'Visita frecuente',
      message,
      icon: 'Repeat',
      priority: Math.min(totalVisits, 8), // More visits = higher priority, capped at 8
      transactionId: tx.id,
    };
  },
};

/**
 * category_trend: Tracks spending changes vs previous month.
 * Triggers when 5+ transactions in the same category.
 * AC #4: Tracks spending changes vs previous period.
 */
const categoryTrendGenerator: InsightGenerator = {
  id: 'category_trend',
  category: 'ACTIONABLE',
  canGenerate: (tx, history) => {
    // Need at least 5 transactions in same category from history
    const sameCategory = history.filter((h) => h.category === tx.category);
    return sameCategory.length >= 5;
  },
  generate: (tx, history) => {
    const thisMonthTxs = history.filter(
      (h) => h.category === tx.category && isThisMonth(h.date)
    );
    const lastMonthTxs = history.filter(
      (h) => h.category === tx.category && isLastMonth(h.date)
    );

    const thisTotal =
      thisMonthTxs.reduce((sum, t) => sum + t.total, 0) + tx.total;
    const lastTotal = lastMonthTxs.reduce((sum, t) => sum + t.total, 0);

    // No last month data - show "new category this month" message
    if (lastTotal === 0) {
      return {
        id: 'category_trend',
        category: 'ACTIONABLE',
        title: 'Nueva categoría',
        message: `Primer mes con gastos en ${tx.category}`,
        icon: 'TrendingUp',
        priority: 4,
        transactionId: tx.id,
      };
    }

    const change = ((thisTotal - lastTotal) / lastTotal) * 100;
    const direction = change > 0 ? 'subió' : 'bajó';
    const absChange = Math.abs(Math.round(change));

    return {
      id: 'category_trend',
      category: change < 0 ? 'CELEBRATORY' : 'ACTIONABLE',
      title: change < 0 ? '¡Ahorrando!' : 'Tendencia',
      message: `${tx.category} ${direction} ${absChange}% vs mes pasado`,
      icon: change < 0 ? 'TrendingDown' : 'TrendingUp',
      priority: Math.min(Math.round(absChange / 10), 8), // Cap priority at 8
      transactionId: tx.id,
    };
  },
};

/**
 * day_pattern: Detects consistent shopping day.
 * Triggers when 3+ transactions on the same weekday.
 * AC #5: Detects consistent shopping day (3+ same weekday).
 */
const dayPatternGenerator: InsightGenerator = {
  id: 'day_pattern',
  category: 'QUIRKY_FIRST',
  canGenerate: (tx, history) => {
    const { date } = parseLocalDate(tx.date);
    const txDay = date.getDay();
    const sameDayCount = history.filter((h) => {
      const { date: hDate } = parseLocalDate(h.date);
      return hDate.getDay() === txDay;
    }).length;
    return sameDayCount >= 3;
  },
  generate: (tx, history) => {
    const { date } = parseLocalDate(tx.date);
    const txDay = date.getDay();
    const dayName = getDayNameSpanish(txDay);
    const sameDayCount =
      history.filter((h) => {
        const { date: hDate } = parseLocalDate(h.date);
        return hDate.getDay() === txDay;
      }).length + 1;

    return {
      id: 'day_pattern',
      category: 'QUIRKY_FIRST',
      title: 'Día favorito',
      message: `${sameDayCount} compras en ${dayName} - ¡tu día de compras!`,
      icon: 'Calendar',
      priority: 3,
      transactionId: tx.id,
    };
  },
};

/**
 * spending_velocity: Tracks weekly spending rate.
 * Triggers when at least 1 week of data exists.
 * AC #6: Tracks weekly spending rate.
 */
const spendingVelocityGenerator: InsightGenerator = {
  id: 'spending_velocity',
  category: 'ACTIONABLE',
  canGenerate: (_tx, history) => {
    // Need at least 1 week of data (some transaction older than 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    return history.some((h) => {
      const { date } = parseLocalDate(h.date);
      return date < oneWeekAgo;
    });
  },
  generate: (tx, history) => {
    const now = new Date();

    // Calculate start of current week (Sunday)
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - now.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);

    // Calculate start of last week
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    // Sum this week's spending (including current transaction)
    const thisWeekTxs = history.filter((h) => {
      const { date } = parseLocalDate(h.date);
      return date >= thisWeekStart;
    });
    const thisTotal = thisWeekTxs.reduce((sum, t) => sum + t.total, 0) + tx.total;

    // Sum last week's spending
    const lastWeekTxs = history.filter((h) => {
      const { date } = parseLocalDate(h.date);
      return date >= lastWeekStart && date < thisWeekStart;
    });
    const lastTotal = lastWeekTxs.reduce((sum, t) => sum + t.total, 0);

    // No last week data - just show current total
    if (lastTotal === 0) {
      return {
        id: 'spending_velocity',
        category: 'ACTIONABLE',
        title: 'Esta semana',
        message: `Llevas $${thisTotal.toLocaleString('es-CL')} esta semana`,
        icon: 'Gauge',
        priority: 4,
        transactionId: tx.id,
      };
    }

    const change = ((thisTotal - lastTotal) / lastTotal) * 100;

    // Spending down by more than 10% - celebrate!
    if (change < -10) {
      return {
        id: 'spending_velocity',
        category: 'CELEBRATORY',
        title: '¡Buen ritmo!',
        message: `${Math.abs(Math.round(change))}% menos que la semana pasada`,
        icon: 'ThumbsUp',
        priority: 6,
        transactionId: tx.id,
      };
    }

    // Normal or increased spending - show weekly total
    return {
      id: 'spending_velocity',
      category: 'ACTIONABLE',
      title: 'Ritmo semanal',
      message: `$${thisTotal.toLocaleString('es-CL')} esta semana`,
      icon: 'Gauge',
      priority: 3,
      transactionId: tx.id,
    };
  },
};

/**
 * time_pattern: Detects consistent shopping time.
 * Triggers when 3+ transactions within same hour range.
 * AC #7: Detects consistent shopping time.
 */
const timePatternGenerator: InsightGenerator = {
  id: 'time_pattern',
  category: 'QUIRKY_FIRST',
  canGenerate: (tx, history) => {
    const txHour = parseHour(tx.time);
    if (txHour === null) return false;

    const sameHourRange = history.filter((h) => {
      const hHour = parseHour(h.time);
      if (hHour === null) return false;
      return Math.abs(hHour - txHour) <= 1; // Within 1 hour
    });

    return sameHourRange.length >= 3;
  },
  generate: (tx, _history) => {
    const txHour = parseHour(tx.time)!;
    const timeOfDay = getTimeOfDaySpanish(txHour);

    return {
      id: 'time_pattern',
      category: 'QUIRKY_FIRST',
      title: 'Tu hora favorita',
      message: `Sueles comprar en la ${timeOfDay}`,
      icon: 'Clock',
      priority: 3,
      transactionId: tx.id,
    };
  },
};

// ============================================================================
// DUPLICATE DETECTION GENERATOR
// Story 9.11: High-priority warning for potential duplicate transactions
// ============================================================================

/**
 * duplicate_detected: Warns about potential duplicate transaction.
 * HIGH PRIORITY (10) - should override other insights when triggered.
 * Criteria: Same date, merchant, amount, and country (if both have country).
 */
const duplicateDetectedGenerator: InsightGenerator = {
  id: 'duplicate_detected',
  category: 'ACTIONABLE',
  canGenerate: (tx, history) => {
    // Include current transaction in the check (simulate it being saved)
    const allTransactions = [...history, tx];
    const result = checkForDuplicates(tx, allTransactions);
    return result.isDuplicate;
  },
  generate: (tx, history) => {
    // Get duplicate count for message
    const allTransactions = [...history, tx];
    const result = checkForDuplicates(tx, allTransactions);
    const duplicateCount = result.duplicateIds.length;

    return {
      id: 'duplicate_detected',
      category: 'ACTIONABLE',
      title: 'Posible duplicado',
      message:
        duplicateCount === 1
          ? 'Esta boleta parece ser un duplicado'
          : `Esta boleta tiene ${duplicateCount} duplicados`,
      icon: 'AlertTriangle',
      priority: 10, // Highest priority - overrides other insights
      transactionId: tx.id,
    };
  },
};

// ============================================================================
// GENERATOR REGISTRY
// ============================================================================

/**
 * Registry of all insight generators.
 * Transaction-intrinsic generators (Story 10.3) + Pattern detection (Story 10.4)
 * + Duplicate detection (Story 9.11)
 */
export const INSIGHT_GENERATORS: Record<string, InsightGenerator> = {
  // HIGH PRIORITY - Duplicate Detection (Story 9.11)
  // Listed first to emphasize importance, but priority value determines actual order
  duplicate_detected: duplicateDetectedGenerator,

  // Transaction-Intrinsic (Story 10.3)
  biggest_item: biggestItemGenerator,
  item_count: itemCountGenerator,
  unusual_hour: unusualHourGenerator,
  weekend_warrior: weekendWarriorGenerator,
  new_merchant: newMerchantGenerator,
  new_city: newCityGenerator,
  category_variety: categoryVarietyGenerator,

  // Pattern Detection (Story 10.4)
  merchant_frequency: merchantFrequencyGenerator,
  category_trend: categoryTrendGenerator,
  day_pattern: dayPatternGenerator,
  spending_velocity: spendingVelocityGenerator,
  time_pattern: timePatternGenerator,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generates all candidate insights for a transaction.
 * Runs all registered generators and returns those that can produce insights.
 *
 * @param transaction - Current transaction being saved
 * @param history - All previous transactions for context
 * @returns Array of candidate insights
 */
export function generateAllCandidates(
  transaction: Transaction,
  history: Transaction[]
): Insight[] {
  const candidates: Insight[] = [];

  for (const generator of Object.values(INSIGHT_GENERATORS)) {
    if (generator.canGenerate(transaction, history)) {
      candidates.push(generator.generate(transaction, history));
    }
  }

  return candidates;
}

/**
 * Gets a specific generator by ID.
 * Useful for testing individual generators.
 *
 * @param id - Generator ID (e.g., "biggest_item")
 * @returns The generator or undefined if not found
 */
export function getGenerator(id: string): InsightGenerator | undefined {
  return INSIGHT_GENERATORS[id];
}

/**
 * Gets all generators for a specific category.
 * Useful for phase-based filtering.
 *
 * @param category - The insight category
 * @returns Array of generators matching the category
 */
export function getGeneratorsByCategory(
  category: InsightCategory
): InsightGenerator[] {
  return Object.values(INSIGHT_GENERATORS).filter(
    (gen) => gen.category === category
  );
}
