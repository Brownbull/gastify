/**
 * UNIFIED SCHEMA - Single Source of Truth
 *
 * This module exports all schema definitions used across the app:
 * - Categories (store + item)
 * - Currencies (with cents flag)
 *
 * Import from here in:
 * - prompt-testing/prompts/* (AI prompts)
 * - src/types/transaction.ts (app types)
 * - src/config/categoryColors.ts (colors)
 * - src/utils/translations.ts (i18n)
 */

// Categories
export {
  STORE_CATEGORIES,
  ITEM_CATEGORIES,
  STORE_CATEGORY_LIST,
  ITEM_CATEGORY_LIST,
  STORE_CATEGORY_COUNT,
  ITEM_CATEGORY_COUNT,
} from './categories';
export type { StoreCategory, ItemCategory } from './categories';

// Currencies
export {
  CURRENCIES,
  CURRENCY_CODES,
  CURRENCIES_WITH_CENTS,
  CURRENCIES_WITHOUT_CENTS,
  getCurrencyPromptContext,
  isSupportedCurrency,
  getCurrency,
} from './currencies';
export type { CurrencyDefinition, CurrencyCode } from './currencies';
