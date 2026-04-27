/**
 * Transaction Normalizer Utility
 * Story 9.11: Normalizes transactions with default values for display consistency
 *
 * Fills in missing fields with defaults:
 * - time: "04:04" when not set (legacy transactions)
 * - city/country: User's default location from Settings when not set
 */

import type { Transaction } from '../types/transaction';

/**
 * User default settings for transaction normalization
 */
export interface UserDefaults {
  /** Default city from Settings */
  city: string;
  /** Default country from Settings */
  country: string;
}

/**
 * Default time shown for legacy transactions that don't have time set
 * "04:04" is a sentinel value that indicates "time not available"
 */
export const DEFAULT_TIME = '04:04';

/**
 * Normalize a transaction for consistent display.
 * Fills in missing optional fields with default values.
 *
 * @param tx - The transaction to normalize
 * @param userDefaults - User's default city/country from Settings
 * @returns A new transaction object with defaults applied
 */
export function normalizeTransaction(
  tx: Transaction,
  userDefaults: UserDefaults
): Transaction {
  return {
    ...tx,
    // AC #1: Default time "04:04" when not set (legacy transactions)
    time: tx.time || DEFAULT_TIME,
    // AC #2: Default city/country from user settings when not set
    city: tx.city || userDefaults.city || '',
    country: tx.country || userDefaults.country || '',
  };
}

/**
 * Normalize multiple transactions at once.
 * Useful for normalizing a list of transactions for History view.
 *
 * @param transactions - Array of transactions to normalize
 * @param userDefaults - User's default city/country from Settings
 * @returns Array of normalized transactions
 */
export function normalizeTransactions(
  transactions: Transaction[],
  userDefaults: UserDefaults
): Transaction[] {
  return transactions.map(tx => normalizeTransaction(tx, userDefaults));
}
