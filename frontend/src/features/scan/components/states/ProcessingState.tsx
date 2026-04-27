/**
 * Story 14e-9c: ProcessingState Component
 *
 * Renders when scan phase is 'scanning'. Shows processing progress.
 * Wraps ScanProgress for batch mode with calculated progress.
 * Shows indeterminate progress for single mode.
 *
 * @see docs/sprint-artifacts/epic14e-feature-architecture/stories/14e-9c-state-components-tests.md
 * Review follow-up 14e-10: Added useShallow optimization per Archie review
 */
import React from 'react';
import { Loader2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useScanStore } from '../../store';
import { useWorkflowBatchProgress } from '@shared/stores';
import { ScanProgress } from '../ScanProgress';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface ProcessingStateProps {
  /** Translation function */
  t: (key: string) => string;
  /** Theme for styling */
  theme: 'light' | 'dark';
  /** Cancel callback */
  onCancel: () => void;
}

/**
 * Processing state component - renders during scan processing.
 *
 * Phase guard: Returns null if phase !== 'scanning'
 * Mode-aware:
 * - Batch mode: Shows progress bar with percentage
 * - Single mode: Shows indeterminate spinner
 */
export const ProcessingState: React.FC<ProcessingStateProps> = ({
  t,
  theme,
  onCancel,
}) => {
  // useShallow optimization: Combined selector reduces re-renders (14e-10 review follow-up)
  const { phase, mode } = useScanStore(
    useShallow((s) => ({
      phase: s.phase,
      mode: s.mode,
    }))
  );
  // Story 16-6: batchProgress moved to shared workflow store
  const batchProgress = useWorkflowBatchProgress();

  // Calculate progress from batch state
  const progress =
    mode === 'batch' && batchProgress && batchProgress.total > 0
      ? Math.round(
          ((batchProgress.completed.length + batchProgress.failed.length) / batchProgress.total) *
            100
        )
      : -1;

  const prefersReducedMotion = useReducedMotion();

  // Phase guard - only render when scanning
  if (phase !== 'scanning') {
    return null;
  }

  const isDark = theme === 'dark';

  // Batch mode: Use ScanProgress with calculated progress
  if (mode === 'batch' && progress >= 0) {
    return (
      <ScanProgress
        progress={progress}
        onCancel={onCancel}
        theme={theme}
        t={t}
      />
    );
  }

  // Single mode or statement: Show indeterminate progress
  return (
    <div
      className="flex flex-col items-center justify-center p-6 rounded-xl"
      style={{
        backgroundColor: 'var(--surface)',
        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      }}
      role="status"
      aria-label={t('scanProcessing') || 'Processing...'}
      aria-live="polite"
    >
      {/* Spinner icon */}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
        style={{
          backgroundColor: isDark ? 'rgba(96, 165, 250, 0.2)' : 'rgba(59, 130, 246, 0.1)',
        }}
      >
        <Loader2
          size={24}
          style={{ color: 'var(--accent)' }}
          className={prefersReducedMotion ? '' : 'animate-spin'}
          aria-hidden="true"
        />
      </div>

      {/* Processing text */}
      <div
        className="text-sm font-medium mb-4"
        style={{ color: 'var(--primary)' }}
      >
        {t('scanProcessing') || 'Processing receipt...'}
      </div>

      {/* Indeterminate progress bar */}
      <div className="w-full max-w-xs mb-4">
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{
            backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
          }}
        >
          <div
            className={`h-full w-1/3 rounded-full ${prefersReducedMotion ? '' : 'animate-indeterminate-progress'}`}
            style={{
              backgroundColor: 'var(--accent)',
            }}
          />
        </div>
      </div>

      {/* Cancel button */}
      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{
          color: 'var(--secondary)',
          backgroundColor: isDark ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.1)',
        }}
        aria-label={t('cancel') || 'Cancel'}
      >
        {t('cancel') || 'Cancel'}
      </button>

    </div>
  );
};

export default ProcessingState;
