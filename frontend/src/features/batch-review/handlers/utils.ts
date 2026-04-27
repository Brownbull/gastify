/**
 * Story 14e-14d: Batch Review Handler Utilities
 *
 * Shared utility functions used by batch review handlers.
 * Extracted to eliminate duplication across navigation.ts and editReceipt.ts.
 *
 * Code Review: [Archie-Review][LOW] - Consolidated duplicated helpers
 */

import type { BatchReceipt } from '@/types/batchReceipt';
import type { Transaction } from '@/types/transaction';

/**
 * Build a transaction with thumbnailUrl if the receipt has an imageUrl.
 * Used during navigation and editing to ensure the editor displays the receipt image.
 *
 * @param receipt - The batch receipt to extract transaction from
 * @returns Transaction with optional thumbnailUrl
 */
export function buildTransactionWithThumbnail(receipt: BatchReceipt): Transaction {
  return receipt.imageUrl
    ? { ...receipt.transaction, thumbnailUrl: receipt.imageUrl }
    : receipt.transaction;
}
