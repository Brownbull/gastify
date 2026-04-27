/**
 * UNIFIED CURRENCY SCHEMA
 *
 * Single source of truth for currency definitions.
 * Used by: AI prompts, app settings, price formatting
 *
 * KEY CONCEPT: "usesCents" flag
 * - true: Currency has decimal places (USD, EUR, GBP)
 *   → Prices like $15.99 → stored as 1599 (multiply by 100)
 *   → Format: digits with final separator + 2 decimal digits
 *
 * - false: Currency is whole numbers only (CLP, COP, JPY)
 *   → Prices like $15.990 → stored as 15990 (as-is)
 *   → Format: digits with thousand separators only
 */

// ============================================================================
// CURRENCY DEFINITIONS
// ============================================================================

export interface CurrencyDefinition {
  /** ISO 4217 currency code */
  code: string;
  /** Display name */
  name: string;
  /** Symbol for display */
  symbol: string;
  /** Whether prices have decimal places (cents, pence, etc.) */
  usesCents: boolean;
  /** Decimal places (0 for whole numbers, 2 for cents) */
  decimals: 0 | 2;
}

/**
 * All supported currencies.
 *
 * To add a new currency:
 * 1. Add entry here with correct usesCents flag
 * 2. Add translation in src/utils/translations.ts
 * 3. Test with sample receipts
 */
export const CURRENCIES: Record<string, CurrencyDefinition> = {
  // ── Americas ──
  CLP: { code: 'CLP', name: 'Chilean Peso', symbol: '$', usesCents: false, decimals: 0 },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', usesCents: true, decimals: 2 },
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: '$', usesCents: true, decimals: 2 },
  MXN: { code: 'MXN', name: 'Mexican Peso', symbol: '$', usesCents: true, decimals: 2 },
  BRL: { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', usesCents: true, decimals: 2 },
  ARS: { code: 'ARS', name: 'Argentine Peso', symbol: '$', usesCents: true, decimals: 2 },
  COP: { code: 'COP', name: 'Colombian Peso', symbol: '$', usesCents: false, decimals: 0 },
  PEN: { code: 'PEN', name: 'Peruvian Sol', symbol: 'S/', usesCents: true, decimals: 2 },

  // ── Europe ──
  EUR: { code: 'EUR', name: 'Euro', symbol: '€', usesCents: true, decimals: 2 },
  GBP: { code: 'GBP', name: 'British Pound', symbol: '£', usesCents: true, decimals: 2 },
  CHF: { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', usesCents: true, decimals: 2 },

  // ── Asia-Pacific ──
  JPY: { code: 'JPY', name: 'Japanese Yen', symbol: '¥', usesCents: false, decimals: 0 },
  CNY: { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', usesCents: true, decimals: 2 },
  KRW: { code: 'KRW', name: 'South Korean Won', symbol: '₩', usesCents: false, decimals: 0 },
  AUD: { code: 'AUD', name: 'Australian Dollar', symbol: '$', usesCents: true, decimals: 2 },
  NZD: { code: 'NZD', name: 'New Zealand Dollar', symbol: '$', usesCents: true, decimals: 2 },
  INR: { code: 'INR', name: 'Indian Rupee', symbol: '₹', usesCents: true, decimals: 2 },

  // ── Middle East & Africa ──
  AED: { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', usesCents: true, decimals: 2 },
  ZAR: { code: 'ZAR', name: 'South African Rand', symbol: 'R', usesCents: true, decimals: 2 },
  ILS: { code: 'ILS', name: 'Israeli Shekel', symbol: '₪', usesCents: true, decimals: 2 },
};

// ============================================================================
// HELPER ARRAYS
// ============================================================================

/** All currency codes */
export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

/** Type for valid currency codes */
export type CurrencyCode = keyof typeof CURRENCIES;

/** Currencies that use cents (decimal places) */
export const CURRENCIES_WITH_CENTS = CURRENCY_CODES.filter(
  code => CURRENCIES[code].usesCents
);

/** Currencies that don't use cents (whole numbers only) */
export const CURRENCIES_WITHOUT_CENTS = CURRENCY_CODES.filter(
  code => !CURRENCIES[code].usesCents
);

// ============================================================================
// PROMPT HELPERS
// ============================================================================

/**
 * Get currency context for AI prompt.
 *
 * Returns a simple, clear instruction based on the usesCents flag.
 */
export function getCurrencyPromptContext(code: string): string {
  const currency = CURRENCIES[code.toUpperCase()];

  if (!currency) {
    // Unknown currency - provide generic guidance
    return `${code.toUpperCase()} - convert to smallest integer units`;
  }

  if (currency.usesCents) {
    return `${currency.name} (${currency.code}) uses cents. Prices have 2 decimal places (e.g., ${currency.symbol}15.99). Multiply by 100 to get integer (15.99 → 1599).`;
  } else {
    return `${currency.name} (${currency.code}) uses whole numbers only. Prices have no decimals (e.g., ${currency.symbol}15,990). Use as-is (15990 → 15990).`;
  }
}

/**
 * Check if a currency code is supported.
 */
export function isSupportedCurrency(code: string): code is CurrencyCode {
  return code.toUpperCase() in CURRENCIES;
}

/**
 * Get currency definition, with fallback for unknown currencies.
 */
export function getCurrency(code: string): CurrencyDefinition {
  const upper = code.toUpperCase();
  return CURRENCIES[upper] || {
    code: upper,
    name: upper,
    symbol: upper,
    usesCents: true,  // Default to cents for unknown currencies
    decimals: 2,
  };
}
