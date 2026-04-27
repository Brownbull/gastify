/**
 * Re-export shim for backward compatibility.
 * Story 15b-1f: useBatchCapture moved to @features/batch-review/hooks/
 */
export { useBatchCapture, useBatchCapture as default, MAX_BATCH_CAPTURE_IMAGES } from '@features/batch-review/hooks/useBatchCapture';
export type { CapturedImage, UseBatchCaptureReturn } from '@features/batch-review/hooks/useBatchCapture';
