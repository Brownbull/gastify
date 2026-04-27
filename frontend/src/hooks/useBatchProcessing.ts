/**
 * Re-export shim for backward compatibility.
 * Story 15b-1f: useBatchProcessing moved to @features/batch-review/hooks/
 */
export { useBatchProcessing, useBatchProcessing as default } from '@features/batch-review/hooks/useBatchProcessing';
export type { BatchProcessingCallbacks, UseBatchProcessingReturn } from '@features/batch-review/hooks/useBatchProcessing';
