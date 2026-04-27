/**
 * Duplicate Detection Service
 * Story 9.11: Detects potential duplicate transactions
 *
 * Core matching criteria (required - all must match):
 * - Same date
 * - Same total amount
 * - Merchant match: exact equality OR containment (shorter name >= 4 chars contained in longer)
 *
 * Optional refinement:
 * - Country: If BOTH transactions have a non-null/non-default country, they must match.
 *            If either is missing/default, skip this check.
 *
 * NOT used for duplicate detection:
 * - Time (not reliable from OCR)
 * - City (can vary due to OCR errors or chain store locations)
 * - Items (only transaction-level data is compared)
 * - Alias (user can update it over time)
 */

import type { Transaction } from '../types/transaction';
import { filterAndGroupDuplicates } from '@/utils/duplicateGrouping';

/**
 * Maximum time difference in minutes for transactions to be considered duplicates.
 * Transactions within this time window on the same date are potential duplicates.
 */
export const TIME_PROXIMITY_MINUTES = 60;

/**
 * Result of duplicate detection for a single transaction
 */
export interface DuplicateResult {
  /** The transaction being checked */
  transactionId: string;
  /** IDs of transactions that are duplicates of this one */
  duplicateIds: string[];
  /** Whether this transaction has duplicates */
  isDuplicate: boolean;
}

/**
 * Parse time string (HH:mm) to minutes since midnight.
 * Returns null if time is invalid or not set.
 *
 * @param time - Time string in HH:mm format
 * @returns Minutes since midnight, or null if invalid
 */
export function parseTimeToMinutes(time?: string): number | null {
  if (!time || time.trim() === '') return null;

  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

/**
 * Check if two times are within the proximity threshold.
 * If either time is null (not set), returns true to allow matching
 * (we don't want to exclude potential duplicates just because time is missing).
 *
 * @param time1 - First time in minutes
 * @param time2 - Second time in minutes
 * @returns true if times are within proximity or either is null
 */
export function areTimesWithinProximity(
  time1: number | null,
  time2: number | null
): boolean {
  // If either time is missing, consider them as potentially matching
  // (legacy transactions without time shouldn't be excluded)
  if (time1 === null || time2 === null) return true;

  const diff = Math.abs(time1 - time2);
  return diff <= TIME_PROXIMITY_MINUTES;
}

/**
 * Check if two transactions match on country.
 *
 * Only compares country if BOTH transactions have a non-null/non-empty country.
 * If either transaction is missing country data, we skip this check (return true).
 *
 * City is NOT checked - it can vary due to OCR errors or chain store locations.
 *
 * @param tx1 - First transaction
 * @param tx2 - Second transaction
 * @returns true if countries match or either is missing country data
 */
export function areLocationsMatching(tx1: Transaction, tx2: Transaction): boolean {
  const country1 = (tx1.country || '').toLowerCase().trim();
  const country2 = (tx2.country || '').toLowerCase().trim();

  // Only compare if BOTH have a non-empty country value
  if (country1 !== '' && country2 !== '') {
    return country1 === country2;
  }

  // Either or both missing country - allow matching
  return true;
}

/**
 * Minimum length of the shorter merchant name for containment matching.
 * Names shorter than this require exact match to prevent false positives
 * (e.g., "La" matching "La Vega", "La Barra", etc.)
 */
export const MIN_MERCHANT_LENGTH_FOR_CONTAINMENT = 4;

/**
 * Check if two merchant names match via exact equality or containment.
 *
 * Rules:
 * 1. Both normalized to lowercase + trimmed
 * 2. If exact match → true
 * 3. If shorter name >= MIN_MERCHANT_LENGTH_FOR_CONTAINMENT chars
 *    AND longer.includes(shorter) → true
 * 4. Otherwise → false
 *
 * @param name1 - First merchant name
 * @param name2 - Second merchant name
 * @returns true if merchants are considered matching
 */
export function areMerchantsMatching(name1: string, name2: string): boolean {
  const n1 = (name1 || '').toLowerCase().trim();
  const n2 = (name2 || '').toLowerCase().trim();

  // Exact match (includes both-empty case — two unknown merchants = same merchant)
  if (n1 === n2) return true;

  // Containment: shorter must be >= MIN_MERCHANT_LENGTH_FOR_CONTAINMENT
  // When lengths are equal but strings differ, assignment is arbitrary (includes checks both ways via symmetry)
  const shorter = n1.length <= n2.length ? n1 : n2;
  const longer = n1.length <= n2.length ? n2 : n1;

  if (shorter.length < MIN_MERCHANT_LENGTH_FOR_CONTAINMENT) return false;

  return longer.includes(shorter);
}

/**
 * Generate a base key for grouping transactions as duplicate candidates.
 * Groups by date + amount only. Merchant matching is done in the pairwise phase.
 * Time and location are checked separately as optional refinements.
 *
 * @param tx - Transaction to generate key for
 * @returns Base key string for grouping
 */
export function getBaseGroupKey(tx: Transaction): string {
  const date = (tx.date || '').trim();
  const total = tx.total?.toString() || '0';

  // Group by date + amount only — merchant matching happens in pairwise phase
  return `${date}|${total}`;
}

/**
 * @deprecated Use getBaseGroupKey instead. Returns date|total key (merchant no longer in key).
 */
export function getDuplicateKey(tx: Transaction): string {
  return getBaseGroupKey(tx);
}

/**
 * Find all duplicate groups in a list of transactions.
 * Returns a Map where keys are transaction IDs and values are arrays
 * of duplicate transaction IDs.
 *
 * Matching criteria:
 * - Same date (required, via grouping key)
 * - Same total amount (required, via grouping key)
 * - Merchant match (required, via pairwise containment: exact OR shorter >= 4 chars contained in longer)
 * - Same country (only if both have non-null/non-empty country)
 *
 * NOT checked: time, city, items, alias
 *
 * AC #6: Works in real-time as user browses history
 * AC #7: Applies to both new and existing transactions
 *
 * @param transactions - Array of transactions to check
 * @returns Map of transaction ID to array of duplicate IDs
 */
export function findDuplicates(
  transactions: Transaction[]
): Map<string, string[]> {
  // First pass: Group transactions by base key (date, amount)
  const keyToTransactions = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    // Skip transactions without ID (shouldn't happen but be defensive)
    if (!tx.id) continue;

    const key = getBaseGroupKey(tx);
    const existing = keyToTransactions.get(key) || [];
    existing.push(tx);
    keyToTransactions.set(key, existing);
  }

  // Second pass: Within each group, check merchant + country refinement
  const duplicateMap = new Map<string, string[]>();

  for (const [, txGroup] of keyToTransactions) {
    // Skip groups with only one transaction
    if (txGroup.length <= 1) continue;

    // For each pair in the group, check merchant + country
    for (let i = 0; i < txGroup.length; i++) {
      const tx1 = txGroup[i];
      const duplicatesForTx1: string[] = [];

      for (let j = 0; j < txGroup.length; j++) {
        if (i === j) continue; // Don't compare with self

        const tx2 = txGroup[j];

        // Check merchant match (exact or containment with min 4-char threshold)
        const merchantsMatch = areMerchantsMatching(
          tx1.merchant || '',
          tx2.merchant || ''
        );

        // Check country match (only if both have country, otherwise allow)
        const countriesMatch = areLocationsMatching(tx1, tx2);

        if (merchantsMatch && countriesMatch) {
          duplicatesForTx1.push(tx2.id!);
        }
      }

      // Only add to map if there are duplicates
      if (duplicatesForTx1.length > 0) {
        duplicateMap.set(tx1.id!, duplicatesForTx1);
      }
    }
  }

  return duplicateMap;
}

/**
 * Check if a specific transaction has duplicates in a list.
 * Convenience function for checking a single transaction.
 *
 * @param transaction - The transaction to check
 * @param allTransactions - All transactions to compare against
 * @returns DuplicateResult with duplicate status and IDs
 */
export function checkForDuplicates(
  transaction: Transaction,
  allTransactions: Transaction[]
): DuplicateResult {
  const duplicateMap = findDuplicates(allTransactions);
  const duplicateIds = duplicateMap.get(transaction.id || '') || [];

  return {
    transactionId: transaction.id || '',
    duplicateIds,
    isDuplicate: duplicateIds.length > 0,
  };
}

/**
 * Create a Set of transaction IDs that have duplicates.
 * Useful for quick lookup when rendering transaction cards.
 *
 * @param transactions - Array of transactions to check
 * @returns Set of transaction IDs that are duplicates
 */
export function getDuplicateIds(transactions: Transaction[]): Set<string> {
  const duplicateMap = findDuplicates(transactions);
  return new Set(duplicateMap.keys());
}

/**
 * Story 14.13: Get the count of transactions that have potential duplicates.
 *
 * @param transactions - Array of transactions to check
 * @returns Count of transactions with potential duplicates
 */
export function getDuplicateCount(transactions: Transaction[]): number {
  return getDuplicateIds(transactions).size;
}

/**
 * Story 14.13: Filter transactions to show only those with potential duplicates.
 *
 * @param transactions - Array of transactions
 * @returns Array of transactions that have potential duplicates
 */
export function filterToDuplicateTransactions(transactions: Transaction[]): Transaction[] {
  const duplicateIds = getDuplicateIds(transactions);
  return transactions.filter(tx => tx.id && duplicateIds.has(tx.id));
}

/**
 * Story 14.13: Filter and GROUP transactions by their duplicate relationships.
 * Returns transactions sorted so that duplicates appear next to each other.
 *
 * This makes it easy to compare duplicate transactions side-by-side.
 *
 * @param transactions - Array of transactions
 * @returns Array of transactions with duplicates grouped together
 */
export function filterToDuplicatesGrouped(transactions: Transaction[]): Transaction[] {
  return filterAndGroupDuplicates(
    transactions,
    findDuplicates(transactions),
    tx => tx.id!,
    // Sort groups by date (newest first) then merchant name
    (a, b) => {
      const aDate = a?.date || '';
      const bDate = b?.date || '';
      if (aDate !== bDate) return bDate.localeCompare(aDate);
      const aMerchant = (a?.merchant || '').toLowerCase().trim();
      const bMerchant = (b?.merchant || '').toLowerCase().trim();
      return aMerchant.localeCompare(bMerchant);
    },
    // Sort within group by time
    (a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'),
  );
}

/**
 * Story 14.13: Check if there are any potential duplicates in the transaction list.
 *
 * @param transactions - Array of transactions to check
 * @returns true if there are any potential duplicates
 */
export function hasPotentialDuplicates(transactions: Transaction[]): boolean {
  return getDuplicateCount(transactions) > 0;
}
