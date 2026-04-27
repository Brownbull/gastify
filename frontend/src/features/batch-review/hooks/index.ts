/**
 * Batch Review Hooks Module
 *
 * Story 14e-29a: useBatchReviewHandlers
 * Story 14e-34b: useAtomicBatchActions
 * Story 15b-1f: Consolidated useBatchCapture, useBatchReview, useBatchProcessing, useBatchSession
 */

export { useBatchReviewHandlers } from './useBatchReviewHandlers';
export type {
  BatchReviewHandlersProps,
  BatchReviewHandlers,
} from './useBatchReviewHandlers';

// Story 14e-34b: Atomic batch operations
export { useAtomicBatchActions, atomicBatchActions } from './useAtomicBatchActions';
export type { AtomicBatchActions, AtomicBatchActionsType } from './useAtomicBatchActions';

// Story 15b-1f: Consolidated from src/hooks/
export { useBatchCapture, MAX_BATCH_CAPTURE_IMAGES } from './useBatchCapture';
export type { CapturedImage, UseBatchCaptureReturn } from './useBatchCapture';

export { useBatchReview, createBatchReceiptsFromResults } from './useBatchReview';
export type { BatchReceipt, BatchReceiptStatus, UseBatchReviewReturn, UseBatchReviewOptions } from './useBatchReview';

export { useBatchProcessing } from './useBatchProcessing';
export type { BatchProcessingCallbacks, UseBatchProcessingReturn } from './useBatchProcessing';

export { useBatchSession } from './useBatchSession';
export type { BatchSession, UseBatchSessionReturn } from './useBatchSession';
