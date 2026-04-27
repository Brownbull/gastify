/**
 * TrendsView Period & Formatting Helpers
 *
 * Story 15-TD-5: Split from helpers.ts
 *
 * Constants, period label formatting, currency shorthand,
 * and transaction filtering by time period.
 */

import { formatCurrency } from '@/utils/currency';
import type { Transaction } from '@/types/transaction';
import type { TimePeriod, CurrentPeriod } from './types';

// ============================================================================
// Constants
// ============================================================================

export const MONTH_NAMES_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const MONTH_NAMES_EN = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export const CAROUSEL_TITLES_BASE = ['Distribución', 'Tendencia'] as const;

// ============================================================================
// Period & Formatting Helpers
// ============================================================================

/**
 * Format period label based on time period and locale
 */
export function getPeriodLabel(
    period: TimePeriod,
    current: CurrentPeriod,
    locale: 'en' | 'es'
): string {
    const monthNames = locale === 'es' ? MONTH_NAMES_ES : MONTH_NAMES_EN;
    const monthName = monthNames[current.month - 1];
    const shortMonth = monthName.slice(0, 3);

    switch (period) {
        case 'week':
            return locale === 'es'
                ? `Semana ${current.week}, ${shortMonth} ${current.year}`
                : `Week ${current.week}, ${shortMonth} ${current.year}`;
        case 'month':
            return `${monthName} ${current.year}`;
        case 'quarter':
            return `Q${current.quarter} ${current.year}`;
        case 'year':
            return `${current.year}`;
    }
}

/**
 * Format currency in short form (e.g., $217k)
 */
export function formatShortCurrency(amount: number, currency: string): string {
    if (amount >= 1000000) {
        return `$${(amount / 1000000).toFixed(1)}M`;
    }
    if (amount >= 1000) {
        return `$${Math.round(amount / 1000)}k`;
    }
    return formatCurrency(amount, currency);
}

// ============================================================================
// Transaction Filtering
// ============================================================================

/**
 * Filter transactions by period
 */
export function filterByPeriod(
    transactions: Transaction[],
    period: TimePeriod,
    current: CurrentPeriod
): Transaction[] {
    return transactions.filter(tx => {
        const txDate = new Date(tx.date);
        const txYear = txDate.getFullYear();
        const txMonth = txDate.getMonth() + 1;
        const txQuarter = Math.ceil(txMonth / 3);
        const txWeek = Math.ceil(txDate.getDate() / 7);

        if (txYear !== current.year) return false;

        switch (period) {
            case 'year':
                return true;
            case 'quarter':
                return txQuarter === current.quarter;
            case 'month':
                return txMonth === current.month;
            case 'week':
                return txMonth === current.month && txWeek === current.week;
        }
    });
}
