/**
 * Re-export shim for backward compatibility.
 * Story 15b-1f: useBatchReview moved to @features/batch-review/hooks/
 */
export { useBatchReview, useBatchReview as default, createBatchReceiptsFromResults } from '@features/batch-review/hooks/useBatchReview';
export type { BatchReceipt, BatchReceiptStatus, UseBatchReviewReturn, UseBatchReviewOptions } from '@features/batch-review/hooks/useBatchReview';
