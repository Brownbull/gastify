/**
 * Story 14e-10 Review Follow-up: SavingState Component
 * Story 14e-11: Added phase guard for defensive coding
 *
 * Extracted from ScanFeature.tsx per Archie review.
 * Renders during phase='saving' to show saving indicator.
 *
 * @see docs/sprint-artifacts/epic14e-feature-architecture/stories/14e-10-scan-feature-orchestrator.md
 */
import React, { memo } from 'react';
import { useScanPhase } from '../../store';

export interface SavingStateProps {
  /** Translation function */
  t: (key: string) => string;
  /** Theme */
  theme: 'light' | 'dark';
  /** Message to display */
  message?: string;
}

/**
 * Simple saving indicator component
 * Shows during phase='saving'
 *
 * Phase guard: Returns null if phase !== 'saving'
 */
export const SavingState: React.FC<SavingStateProps> = memo(function SavingState({
  t,
  theme,
  message,
}) {
  const phase = useScanPhase();

  // Story 14e-11: Phase guard - only render when saving
  if (phase !== 'saving') {
    return null;
  }

  const isDark = theme === 'dark';

  return (
    <div
      className="flex flex-col items-center justify-center p-6 rounded-xl"
      style={{
        backgroundColor: 'var(--surface)',
        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      }}
      role="status"
      aria-label={message || t('saving') || 'Saving...'}
      aria-live="polite"
    >
      {/* Spinner */}
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
        style={{
          backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
        }}
      >
        <div
          className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: '#22c55e', borderTopColor: 'transparent' }}
          aria-hidden="true"
        />
      </div>

      {/* Message */}
      <div
        className="text-sm font-medium"
        style={{ color: 'var(--primary)' }}
      >
        {message || t('saving') || 'Saving...'}
      </div>
    </div>
  );
});

export default SavingState;
