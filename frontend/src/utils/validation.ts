/**
 * Validation & Parsing Utilities
 *
 * Consolidated from validation.ts + validationUtils.ts (Story 15-1g).
 * Contains data parsing helpers and security validation functions.
 */

import { toDateSafe } from '@/utils/timestamp';

// =============================================================================
// Data Parsing
// =============================================================================

export const parseStrictNumber = (val: unknown): number => {
    const clean = String(val).replace(/[^0-9]/g, '');
    const num = parseInt(clean, 10);
    return isNaN(num) ? 0 : num;
};

export const getSafeDate = (val: unknown): string => {
    const today = new Date().toISOString().split('T')[0];
    // Accept YYYY-MM-DD strings directly
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
    // Accept Firestore Timestamps and Date objects (but not arbitrary string parsing)
    if (val != null && typeof val !== 'string') {
        const date = toDateSafe(val as Parameters<typeof toDateSafe>[0]);
        if (date) return date.toISOString().split('T')[0];
    }
    return today;
};

// =============================================================================
// CSS Color Validation (TD-CONSOLIDATED-7: CSS Color Injection Prevention)
// =============================================================================

const DEFAULT_CSS_COLOR_FALLBACK = '#10b981';
const VALID_HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Validates a CSS color value against a strict hex pattern.
 * Only accepts 3-digit and 6-digit hex colors.
 */
export function validateCSSColor(color: string): boolean {
    if (!color || typeof color !== 'string') {
        return false;
    }
    return VALID_HEX_COLOR_REGEX.test(color);
}

/** Expands 3-digit hex (#abc) to 6-digit (#aabbcc). Caller must ensure input is a validated hex color. */
function expandHex(hex: string): string {
    if (hex.length === 4) {
        const [, r, g, b] = hex;
        return `#${r}${r}${g}${g}${b}${b}`;
    }
    return hex;
}

/**
 * Returns a safe, normalized CSS color, falling back to a default if invalid.
 * Normalizes 3-digit hex (#abc) to 6-digit (#aabbcc) so that downstream
 * alpha suffix concatenation (e.g. + '20') produces valid 8-digit hex.
 * Both `color` and `fallback` are validated and normalized.
 * Use at rendering boundaries to prevent CSS injection.
 */
export function safeCSSColor(color: string | undefined | null, fallback: string = DEFAULT_CSS_COLOR_FALLBACK): string {
    if (color && validateCSSColor(color)) {
        return expandHex(color);
    }
    return validateCSSColor(fallback) ? expandHex(fallback) : DEFAULT_CSS_COLOR_FALLBACK;
}

// =============================================================================
// Locale Validation (TD-15b-22: Shared locale guard)
// =============================================================================

/**
 * Sanitizes a locale string to a supported locale.
 * Returns 'es' (Spanish) as default for unsupported values.
 */
export function sanitizeLocale(locale: string): 'es' | 'en' {
    if (locale === 'es' || locale === 'en') {
        return locale;
    }
    return 'es';
}
