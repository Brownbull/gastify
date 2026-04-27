/**
 * Number Formatting Utilities
 *
 * Story 15-2g: Centralized number formatting
 *
 * Replaces 22+ files of ad-hoc rounding (`Math.round(x * 100) / 100`),
 * percentage calculation (`Math.round((x / total) * 100)`), and
 * compact notation (`(x / 1000).toFixed(1)`).
 */

// =============================================================================
// Rounding
// =============================================================================

/**
 * Round a number to a specified number of decimal places.
 * Default: 2 decimal places (for currency-like values).
 *
 * Replaces: `Math.round(x * 100) / 100`
 */
export function roundTo(value: number, decimals: number = 2): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}

// =============================================================================
// Percentage
// =============================================================================

/**
 * Calculate percentage of a part relative to a total.
 * Returns 0 when total is 0 (prevents division by zero).
 * Result is rounded to the nearest integer by default.
 *
 * Replaces: `total > 0 ? Math.round((part / total) * 100) : 0`
 */
export function calcPercent(part: number, total: number, decimals: number = 0): number {
    if (total === 0) return 0;
    return roundTo((part / total) * 100, decimals);
}

/**
 * Format a number as a percentage string.
 *
 * @example formatPercent(75) → "75%"
 * @example formatPercent(33.333, 1) → "33.3%"
 */
export function formatPercent(value: number, decimals: number = 0): string {
    return `${roundTo(value, decimals)}%`;
}

// =============================================================================
// Compact notation
// =============================================================================

/**
 * Format a number in compact notation (K, M).
 * Used for chart axis labels and summary displays.
 *
 * Replaces: `${(amount / 1000000).toFixed(1)}M` / `${Math.round(amount / 1000)}k`
 *
 * @example formatCompact(1500) → "1.5K"
 * @example formatCompact(1500000) → "1.5M"
 * @example formatCompact(500) → "500"
 */
export function formatCompact(value: number, prefix: string = ''): string {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (abs >= 1_000_000) {
        const compact = (abs / 1_000_000).toFixed(1).replace(/\.0$/, '');
        return `${sign}${prefix}${compact}M`;
    }
    if (abs >= 1_000) {
        const compact = (abs / 1_000).toFixed(1).replace(/\.0$/, '');
        return `${sign}${prefix}${compact}K`;
    }
    return `${sign}${prefix}${Math.round(abs)}`;
}

// =============================================================================
// Decimal formatting
// =============================================================================

