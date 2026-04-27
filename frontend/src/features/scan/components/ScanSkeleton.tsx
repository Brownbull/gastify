/**
 * Story 11.5: Scan Status Clarity - Processing Skeleton Loader
 *
 * Displays a skeleton loader with shimmer effect during AI processing.
 * Shows placeholder rectangles for merchant, total, and items.
 *
 * @see docs/sprint-artifacts/epic11/story-11.5-scan-status-clarity.md - Task 3
 */
import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ScanSkeletonProps {
  /** Theme for styling ('light' | 'dark') */
  theme: 'light' | 'dark';
  /** Translation function */
  t: (key: string) => string;
  /** Estimated processing time in seconds (optional) */
  estimatedTime?: number | null;
  /** Cancel callback */
  onCancel?: () => void;
}

/**
 * Shimmer skeleton placeholder component.
 */
const SkeletonLine: React.FC<{
  width: string;
  height?: string;
  theme: 'light' | 'dark';
  className?: string;
}> = ({ width, height = '16px', theme, className = '' }) => {
  const isDark = theme === 'dark';

  return (
    <div
      className={`rounded ${className}`}
      style={{
        width,
        height,
        background: isDark
          ? 'linear-gradient(90deg, #334155 25%, #475569 50%, #334155 75%)'
          : 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    />
  );
};

/**
 * Skeleton loader during AI processing phase.
 *
 * Visual design:
 * ```
 * ┌─────────────────────────────────────────┐
 * │  ░░░░░░░░░░░░░░  (Merchant placeholder) │
 * │                                         │
 * │  ░░░░░░░░░░░░░░░░░░░░░░░ (Total)        │
 * │                                         │
 * │  ░░░░░░░░░░░░░░░░░░  (Item 1)          │
 * │  ░░░░░░░░░░░░░░░░░░  (Item 2)          │
 * │  ░░░░░░░░░░░░░░░░░░  (Item 3)          │
 * │                                         │
 * │     🔄 Procesando recibo...             │
 * │     ~3-5 segundos                       │
 * └─────────────────────────────────────────┘
 * ```
 */
export const ScanSkeleton: React.FC<ScanSkeletonProps> = ({
  theme,
  t,
  estimatedTime,
  onCancel,
}) => {
  const isDark = theme === 'dark';

  return (
    <div
      className="flex flex-col p-6 rounded-xl"
      style={{
        backgroundColor: 'var(--surface)',
        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      }}
      aria-label={t('scanProcessing')}
    >
      {/* Inline keyframes for shimmer animation */}
      <style>
        {`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}
      </style>

      {/* Merchant name placeholder */}
      <div className="mb-4">
        <SkeletonLine width="60%" height="24px" theme={theme} className="mb-2" />
        <SkeletonLine width="40%" height="14px" theme={theme} />
      </div>

      {/* Total amount placeholder */}
      <div className="mb-6 flex justify-center">
        <div
          className="p-4 rounded-xl w-full max-w-xs"
          style={{
            backgroundColor: isDark ? 'rgba(96, 165, 250, 0.1)' : 'rgba(59, 130, 246, 0.05)',
          }}
        >
          <div className="flex flex-col items-center">
            <SkeletonLine width="80px" height="12px" theme={theme} className="mb-2 opacity-50" />
            <SkeletonLine width="140px" height="32px" theme={theme} />
          </div>
        </div>
      </div>

      {/* Items placeholder */}
      <div className="space-y-3 mb-6">
        <SkeletonLine width="45%" height="14px" theme={theme} className="opacity-60" />
        <div className="space-y-2">
          <SkeletonLine width="100%" height="44px" theme={theme} />
          <SkeletonLine width="100%" height="44px" theme={theme} />
          <SkeletonLine width="75%" height="44px" theme={theme} />
        </div>
      </div>

      {/* Processing indicator */}
      <div className="flex flex-col items-center pt-4 border-t" style={{ borderColor: isDark ? '#334155' : '#e2e8f0' }}>
        <div className="flex items-center gap-2 mb-2">
          <Loader2
            size={20}
            className="animate-spin"
            style={{ color: 'var(--accent)' }}
            aria-hidden="true"
          />
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--primary)' }}
          >
            {t('scanProcessing')}
          </span>
        </div>

        {/* Estimated time */}
        {estimatedTime !== null && estimatedTime !== undefined && (
          <span
            className="text-xs"
            style={{ color: 'var(--secondary)' }}
          >
            ~{estimatedTime} {t('seconds')}
          </span>
        )}

        {/* Cancel button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              color: 'var(--secondary)',
              backgroundColor: isDark ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.1)',
            }}
          >
            {t('cancel')}
          </button>
        )}
      </div>
    </div>
  );
};

export default ScanSkeleton;
