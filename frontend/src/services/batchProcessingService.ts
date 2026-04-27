/**
 * Re-export shim for backward compatibility.
 * batchProcessingService moved to @features/batch-review/services/batchProcessingService.
 * External consumers (e.g., pendingScanStorage) still import from here.
 */
export * from '@features/batch-review/services/batchProcessingService';
