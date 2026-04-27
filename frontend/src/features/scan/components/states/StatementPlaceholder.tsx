/**
 * Story 14e-10 Review Follow-up: StatementPlaceholder Component
 * Story 14e-11: Added phase/mode guard for defensive coding
 *
 * Extracted from ScanFeature.tsx per Archie review.
 * Placeholder for statement scan mode - shows "Proximamente" per Epic 14d.
 *
 * @see docs/sprint-artifacts/epic14e-feature-architecture/stories/14e-10-scan-feature-orchestrator.md
 */
import React, { memo } from 'react';
import { useScanPhase, useScanMode } from '../../store';

export interface StatementPlaceholderProps {
  /** Translation function */
  t: (key: string) => string;
  /** Theme */
  theme: 'light' | 'dark';
  /** Go back callback */
  onBack?: () => void;
}

/**
 * Placeholder for statement scan mode
 * Shows "Proximamente" per Epic 14d
 *
 * Phase/Mode guard: Returns null if not (phase='capturing' AND mode='statement')
 */
export const StatementPlaceholder: React.FC<StatementPlaceholderProps> = memo(function StatementPlaceholder({
  t,
  theme,
  onBack,
}) {
  const phase = useScanPhase();
  const mode = useScanMode();

  // Story 14e-11: Phase/mode guard - only render for statement capturing
  if (phase !== 'capturing' || mode !== 'statement') {
    return null;
  }

  const isDark = theme === 'dark';

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] p-8"
      role="status"
      aria-label={t('statementComingSoon') || 'Coming soon'}
    >
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
        style={{
          backgroundColor: isDark ? 'rgba(96, 165, 250, 0.2)' : 'rgba(59, 130, 246, 0.1)',
        }}
      >
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: 'var(--accent)' }}
        >
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="7" y1="8" x2="17" y2="8" />
          <line x1="7" y1="12" x2="13" y2="12" />
          <line x1="7" y1="16" x2="15" y2="16" />
        </svg>
      </div>

      <h2
        className="text-xl font-bold mb-2"
        style={{ color: 'var(--primary)' }}
      >
        {t('statementScanTitle') || 'Statement Scanning'}
      </h2>

      <p
        className="text-center mb-6"
        style={{ color: 'var(--secondary)' }}
      >
        {t('statementComingSoon') || 'Proximamente'}
      </p>

      {onBack && (
        <button
          onClick={onBack}
          className="px-6 py-2 rounded-lg font-medium transition-colors"
          style={{
            backgroundColor: isDark ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.1)',
            color: 'var(--secondary)',
          }}
        >
          {t('back') || 'Back'}
        </button>
      )}
    </div>
  );
});

export default StatementPlaceholder;
