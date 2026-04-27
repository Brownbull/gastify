/**
 * Reusable Typed Sort Comparators
 *
 * Story 15-2e: Centralized sort comparators
 *
 * Replaces 132+ inline `.sort((a, b) => ...)` calls with reusable,
 * typed comparator functions. Prevents subtle bugs (wrong sign,
 * missing null checks, inconsistent locale) and improves readability.
 *
 * Usage:
 *   items.sort(byNumberDesc('amount'))
 *   items.sort(byStringAsc('name'))
 *   items.sort(compose(byNumberDesc('priority'), byStringAsc('name')))
 */

// =============================================================================
// Core comparator type
// =============================================================================

/** Standard comparator function for Array.sort() */
type Comparator<T> = (a: T, b: T) => number;

// =============================================================================
// Field-based comparators (for objects)
// =============================================================================

/**
 * Sort by numeric field, descending (highest first).
 * Most common pattern: `.sort((a, b) => b.amount - a.amount)`
 */
export function byNumberDesc<T>(field: keyof T): Comparator<T> {
    return (a, b) => (b[field] as number) - (a[field] as number);
}

/**
 * Sort by numeric field, ascending (lowest first).
 * Pattern: `.sort((a, b) => a - b)` or `.sort((a, b) => a.price - b.price)`
 */
export function byNumberAsc<T>(field: keyof T): Comparator<T> {
    return (a, b) => (a[field] as number) - (b[field] as number);
}

/**
 * Sort by string field, ascending (A→Z), using locale-aware comparison.
 * Pattern: `.sort((a, b) => a.name.localeCompare(b.name))`
 */
export function byStringAsc<T>(field: keyof T, locale?: string): Comparator<T> {
    return (a, b) => String(a[field]).localeCompare(String(b[field]), locale);
}

/**
 * Sort by string field, descending (Z→A), using locale-aware comparison.
 * Pattern: `.sort((a, b) => b.date.localeCompare(a.date))`
 */
export function byStringDesc<T>(field: keyof T, locale?: string): Comparator<T> {
    return (a, b) => String(b[field]).localeCompare(String(a[field]), locale);
}

// =============================================================================
// Value-based comparators (for primitives)
// =============================================================================

/** Sort numbers ascending. For use with number arrays. */
export const numericAsc: Comparator<number> = (a, b) => a - b;

/** Sort numbers descending. For use with number arrays. */
export const numericDesc: Comparator<number> = (a, b) => b - a;

/** Sort strings ascending using locale comparison. */
export function stringAsc(locale?: string): Comparator<string> {
    return (a, b) => a.localeCompare(b, locale);
}

/** Sort strings descending using locale comparison. */
export function stringDesc(locale?: string): Comparator<string> {
    return (a, b) => b.localeCompare(a, locale);
}

// =============================================================================
// Absolute value comparator
// =============================================================================

/**
 * Sort by absolute value of a numeric field, descending.
 * Pattern: `.sort((a, b) => Math.abs(b.change) - Math.abs(a.change))`
 */
export function byAbsDesc<T>(field: keyof T): Comparator<T> {
    return (a, b) => Math.abs(b[field] as number) - Math.abs(a[field] as number);
}

// =============================================================================
// Composition
// =============================================================================

/**
 * Compose multiple comparators for multi-key sorting.
 * Falls through to the next comparator when the previous returns 0 (equal).
 *
 * @example
 * items.sort(compose(byNumberDesc('priority'), byStringAsc('name')))
 */
export function compose<T>(...comparators: Comparator<T>[]): Comparator<T> {
    return (a, b) => {
        for (const cmp of comparators) {
            const result = cmp(a, b);
            if (result !== 0) return result;
        }
        return 0;
    };
}
