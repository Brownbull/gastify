/**
 * Story 14d.5c: Batch Receipt Types
 *
 * Type definitions for batch receipts used in the batch review flow.
 * These types are extracted from useBatchReview to avoid circular dependencies
 * between hooks and context.
 */

import type { Transaction } from './transaction';

/**
 * Status of a receipt in the batch review queue.
 * - ready: High confidence, no action needed
 * - review: Low confidence, user should review
 * - edited: User made changes
 * - error: Processing failed
 */
export type BatchReceiptStatus = 'ready' | 'review' | 'edited' | 'error';

/**
 * A receipt in the batch review queue.
 */
export interface BatchReceipt {
  /** Unique identifier for this receipt */
  id: string;
  /** Original index in the batch */
  index: number;
  /** Image data URL (for display) */
  imageUrl?: string;
  /** Extracted transaction data */
  transaction: Transaction;
  /** Current status */
  status: BatchReceiptStatus;
  /** Confidence score (0-1) */
  confidence: number;
  /** Error message (if status is 'error') */
  error?: string;
}
