/**
 * Transaction Utility Functions
 *
 * Story 14d-v2-1-2b: Default Value Handling
 * Provides normalization for transactions loaded from Firestore,
 * ensuring backward compatibility with data that lacks Epic 14d-v2 fields.
 */

import type { Transaction, TransactionPeriods } from '../types/transaction';
import { computePeriods } from './date';

/**
 * Ensure a transaction has all Epic 14d-v2 fields with sensible defaults.
 *
 * This ensures backward compatibility with existing transactions that were created
 * before the Epic 14d-v2 fields (updatedAt, periods) were introduced.
 *
 * Note: This function handles DATA INTEGRITY defaults (Epic 14d-v2 fields).
 * For DISPLAY defaults (time, city, country), see transactionNormalizer.ts.
 *
 * @param tx - Partial transaction data (may be missing new fields)
 * @returns Transaction with all Epic 14d-v2 fields populated with defaults
 *
 * @example
 * ```typescript
 * // Legacy transaction from Firestore (no Epic 14d-v2 fields)
 * const legacy = { id: '123', merchant: 'Store', date: '2026-01-22', ... };
 *
 * // With Epic 14d-v2 defaults applied
 * const normalized = ensureTransactionDefaults(legacy);
 * // { ...legacy, periods: {...} }
 * ```
 */
export function ensureTransactionDefaults(tx: Partial<Transaction>): Transaction {
    // Compute periods from date if not already present
    const periods: TransactionPeriods | undefined =
        tx.periods ?? (tx.date ? computePeriods(tx.date) : undefined);

    // Get updatedAt with fallback chain: updatedAt → createdAt → undefined
    const updatedAt = tx.updatedAt ?? tx.createdAt;

    return {
        // Spread all existing fields first
        ...(tx as Transaction),

        // updatedAt falls back to createdAt (or undefined for truly old data)
        ...(updatedAt !== undefined && { updatedAt }),

        // periods computed on-the-fly if missing
        ...(periods && { periods }),
    };
}

/**
 * Ensure an array of transactions have all Epic 14d-v2 fields with sensible defaults.
 * Convenience wrapper for ensureTransactionDefaults that handles arrays.
 *
 * @param transactions - Array of partial transactions
 * @returns Array of transactions with Epic 14d-v2 defaults applied
 */
export function ensureTransactionsDefaults(transactions: Partial<Transaction>[]): Transaction[] {
    return transactions.map(ensureTransactionDefaults);
}
