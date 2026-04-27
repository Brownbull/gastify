/**
 * ProcessingState Component
 *
 * Story 14e-15: State component for batch processing phase.
 * Renders the BatchProgressIndicator with processing states list.
 *
 * @see docs/sprint-artifacts/epic14e-feature-architecture/stories/14e-15-batch-review-feature-components.md
 */

import React from 'react';
import { BatchProgressIndicator, ImageProcessingState } from '../BatchProgressIndicator';

export interface ProcessingStateProps {
  /** Translation function */
  t: (key: string) => string;
  /** Current theme */
  theme: 'light' | 'dark';
  /** Processing states for each image */
  states: ImageProcessingState[];
  /** Format currency function */
  formatCurrency: (amount: number, currency: string) => string;
  /** Currency for display */
  currency: string;
  /** Called when user cancels processing */
  onCancel?: () => void;
  /** Override progress values (for when not using store) */
  progress?: { current: number; total: number };
}

/**
 * ProcessingState Component
 *
 * Displays the batch processing progress using BatchProgressIndicator.
 * Used when batch phase is 'processing'.
 */
export const ProcessingState: React.FC<ProcessingStateProps> = ({
  t,
  theme,
  states,
  formatCurrency,
  currency,
  onCancel,
  progress,
}) => {
  return (
    <BatchProgressIndicator
      t={t}
      theme={theme}
      states={states}
      formatCurrency={formatCurrency}
      currency={currency}
      onCancel={onCancel}
      progress={progress}
    />
  );
};

export default ProcessingState;
