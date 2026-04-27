/**
 * Scan Feature Components
 *
 * Re-exports all scan-related UI components from the feature directory.
 * These components were migrated from src/components/scan/ for FSD compliance.
 *
 * @module @features/scan/components
 */

// Presentational components
export { ScanOverlay } from './ScanOverlay';
export { ScanStatusIndicator } from './ScanStatusIndicator';
export { ScanModeSelector } from './ScanModeSelector';
export { ScanProgress } from './ScanProgress';
export { ScanError } from './ScanError';
export { ScanReady } from './ScanReady';
export { ScanSkeleton } from './ScanSkeleton';
export { ScanCompleteModal } from './ScanCompleteModal';

// State components (Story 14e-9c)
// Phase-gated components for the scan feature orchestrator
export {
  IdleState,
  ProcessingState,
  ReviewingState,
  ErrorState,
} from './states';

export type {
  IdleStateProps,
  ProcessingStateProps,
  ReviewingStateProps,
  ErrorStateProps,
} from './states';

// Story 14e-23: Batch discard dialog (reads from scan store)
export { BatchDiscardDialog } from './BatchDiscardDialog';

// Story 16-8: Moved from src/components/scan/ to complete FSD consolidation
export { QuickSaveCard } from './QuickSaveCard';
export type { QuickSaveCardProps } from './QuickSaveCard';

export { BatchCompleteModal } from './BatchCompleteModal';
export type { BatchCompleteModalProps } from './BatchCompleteModal';

export { CurrencyMismatchDialog } from './CurrencyMismatchDialog';
export type { CurrencyMismatchDialogProps } from './CurrencyMismatchDialog';

export { TotalMismatchDialog } from './TotalMismatchDialog';
export type { TotalMismatchDialogProps } from './TotalMismatchDialog';

export { ProcessingOverlay } from './ProcessingOverlay';
export type { ProcessingOverlayProps } from './ProcessingOverlay';

export { BatchUploadPreview, MAX_BATCH_IMAGES } from './BatchUploadPreview';
export type { BatchUploadPreviewProps } from './BatchUploadPreview';

export { BatchProcessingProgress } from './BatchProcessingProgress';
export type {
  BatchProcessingProgressProps,
  BatchItemResult,
  BatchItemStatus,
} from './BatchProcessingProgress';

export { BatchProcessingOverlay } from './BatchProcessingOverlay';
export type { BatchProcessingOverlayProps } from './BatchProcessingOverlay';
