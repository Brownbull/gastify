import { getCurrency } from '../../shared/schema/currencies';
import type { SupportedCurrency } from '@/types/preferences';

/**
 * Default currency for the application (Chilean Pesos).
 * Use this instead of hardcoding 'CLP' in fallbacks and prop defaults.
 */
export const DEFAULT_CURRENCY = 'CLP';

/**
 * Currency information for display purposes
 * Matches CURRENCY_INFO from functions/src/prompts/input-hints.ts
 *
 * Story 15b-3b: Moved from userPreferencesService.ts
 */
export const CURRENCY_INFO: Record<SupportedCurrency, { name: string; nameEs: string; symbol: string }> = {
  CLP: { name: 'Chilean Peso', nameEs: 'Peso Chileno', symbol: '$' },
  USD: { name: 'US Dollar', nameEs: 'Dólar Estadounidense', symbol: '$' },
  EUR: { name: 'Euro', nameEs: 'Euro', symbol: '€' },
};

/**
 * List of supported currencies for dropdown options
 *
 * Story 15b-3b: Moved from userPreferencesService.ts
 */
export const SUPPORTED_CURRENCIES: SupportedCurrency[] = ['CLP', 'USD', 'EUR'];

/**
 * Format a currency amount for display.
 *
 * IMPORTANT: Amounts are stored as integers:
 * - For currencies with cents (USD, GBP, EUR): £18.99 → stored as 1899
 * - For currencies without cents (CLP, JPY): $15,990 → stored as 15990
 *
 * This function handles the conversion back to display format.
 *
 * @param amount - The amount in smallest units (cents/pence for usesCents currencies)
 * @param currency - ISO 4217 currency code (e.g., 'GBP', 'CLP')
 * @returns Formatted currency string (e.g., '£18.99', '$15,990')
 */
export const formatCurrency = (amount: number, currency: string): string => {
    const safeAmount = isNaN(amount) ? 0 : amount;
    const currencyDef = getCurrency(currency);

    // For currencies with cents, divide by 100 to get the actual amount
    const displayAmount = currencyDef.usesCents ? safeAmount / 100 : safeAmount;

    // Use appropriate locale based on currency
    // CLP uses Chilean locale, most others use en-US for consistency
    const locale = currency === 'CLP' ? 'es-CL' : 'en-US';

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: currencyDef.decimals,
        maximumFractionDigits: currencyDef.decimals,
    }).format(displayAmount);
};

/**
 * Parse a display amount string to integer storage format.
 *
 * @param displayAmount - The amount as shown to user (e.g., 18.99 for £18.99)
 * @param currency - ISO 4217 currency code
 * @returns Integer amount for storage (e.g., 1899)
 */
export const parseDisplayAmount = (displayAmount: number, currency: string): number => {
    const currencyDef = getCurrency(currency);

    if (currencyDef.usesCents) {
        // Multiply by 100 and round to avoid floating point issues
        return Math.round(displayAmount * 100);
    }

    // For non-cents currencies, just round to integer
    return Math.round(displayAmount);
};

/**
 * Convert stored integer amount to display amount.
 *
 * @param storedAmount - The integer amount from storage (e.g., 1899)
 * @param currency - ISO 4217 currency code
 * @returns Display amount (e.g., 18.99)
 */
export const toDisplayAmount = (storedAmount: number, currency: string): number => {
    const currencyDef = getCurrency(currency);

    if (currencyDef.usesCents) {
        return storedAmount / 100;
    }

    return storedAmount;
};
