/**
 * Batch Review Feature Components
 *
 * Story 14e-15: BatchReviewCard, BatchProgressIndicator, state components
 * Story 15b-1f: Consolidated BatchCaptureUI, BatchDiscardDialog, CreditWarningDialog,
 *               BatchProcessingView, BatchThumbnailStrip
 */

// Main components
export { BatchReviewCard } from './BatchReviewCard';
export type { BatchReviewCardProps } from './BatchReviewCard';

export { BatchProgressIndicator } from './BatchProgressIndicator';
export type { BatchProgressIndicatorProps, ImageProcessingState } from './BatchProgressIndicator';

// State components
export { ProcessingState } from './states/ProcessingState';
export type { ProcessingStateProps } from './states/ProcessingState';

export { ReviewingState } from './states/ReviewingState';
export type { ReviewingStateProps } from './states/ReviewingState';

export { EmptyState } from './states/EmptyState';
export type { EmptyStateProps } from './states/EmptyState';

// Story 15b-1f: Consolidated from src/components/batch/
export { BatchCaptureUI } from './BatchCaptureUI';
export type { BatchCaptureUIProps } from './BatchCaptureUI';

export { BatchDiscardDialog } from './BatchDiscardDialog';

export { CreditWarningDialog } from './CreditWarningDialog';
export type { CreditWarningDialogProps } from './CreditWarningDialog';

export { BatchProcessingView } from './BatchProcessingView';
export type { BatchProcessingViewProps } from './BatchProcessingView';

export { BatchThumbnailStrip } from './BatchThumbnailStrip';
export type { BatchThumbnailStripProps } from './BatchThumbnailStrip';
