/**
 * Story 11.5: Scan Status Clarity - Upload Progress Component
 *
 * Displays upload progress with a progress bar and percentage.
 * Shows cancel button to abort the upload.
 *
 * @see docs/sprint-artifacts/epic11/story-11.5-scan-status-clarity.md - Task 2
 */
import React from 'react';
import { Upload, X } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface ScanProgressProps {
  /** Upload progress percentage (0-100) */
  progress: number;
  /** Cancel callback */
  onCancel: () => void;
  /** Theme for styling ('light' | 'dark') */
  theme: 'light' | 'dark';
  /** Translation function */
  t: (key: string) => string;
}

/**
 * Upload progress indicator with animated progress bar.
 *
 * Visual design:
 * ```
 * ┌─────────────────────────────────────────┐
 * │           📤 Subiendo...                │
 * │                                         │
 * │  ██████████████░░░░░░░░░  75%          │
 * │                                         │
 * │           [Cancelar]                    │
 * └─────────────────────────────────────────┘
 * ```
 */
export const ScanProgress: React.FC<ScanProgressProps> = ({
  progress,
  onCancel,
  theme,
  t,
}) => {
  const isDark = theme === 'dark';
  const prefersReducedMotion = useReducedMotion();

  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div
      className="flex flex-col items-center justify-center p-6 rounded-xl"
      style={{
        backgroundColor: 'var(--surface)',
        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      }}
      role="status"
      aria-label={t('scanUploading')}
      aria-live="polite"
    >
      {/* Upload icon with animation (respects reduced motion preference) */}
      <div
        className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${prefersReducedMotion ? '' : 'animate-pulse'}`}
        style={{
          backgroundColor: isDark ? 'rgba(96, 165, 250, 0.2)' : 'rgba(59, 130, 246, 0.1)',
        }}
      >
        <Upload
          size={24}
          style={{ color: 'var(--accent)' }}
          aria-hidden="true"
        />
      </div>

      {/* Status text */}
      <div
        className="text-sm font-medium mb-4"
        style={{ color: 'var(--primary)' }}
      >
        {t('scanUploading')}
      </div>

      {/* Progress bar container */}
      <div className="w-full max-w-xs mb-2">
        <div
          className="h-2 rounded-full overflow-hidden"
          style={{
            backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
          }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          {/* Progress bar fill with smooth transition */}
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${clampedProgress}%`,
              backgroundColor: 'var(--accent)',
            }}
          />
        </div>
      </div>

      {/* Percentage display */}
      <div
        className="text-xs font-mono mb-4"
        style={{ color: 'var(--secondary)' }}
      >
        {clampedProgress}%
      </div>

      {/* Cancel button */}
      <button
        onClick={onCancel}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{
          color: 'var(--secondary)',
          backgroundColor: isDark ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.1)',
        }}
        aria-label={t('cancel')}
      >
        <X size={16} aria-hidden="true" />
        {t('cancel')}
      </button>
    </div>
  );
};

export default ScanProgress;
