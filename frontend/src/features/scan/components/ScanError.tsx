/**
 * Story 11.5: Scan Status Clarity - Error State Component
 *
 * Displays error state with clear message and retry/cancel options.
 * Different messages based on error type.
 *
 * @see docs/sprint-artifacts/epic11/story-11.5-scan-status-clarity.md - Task 5
 */
import React from 'react';
import { AlertTriangle, RefreshCw, X, WifiOff, Clock, AlertCircle } from 'lucide-react';
import type { ScanErrorType } from '@features/scan/store';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface ScanErrorProps {
  /** Error type for icon selection */
  errorType: ScanErrorType;
  /** Error message to display */
  errorMessage: string;
  /** Retry callback */
  onRetry: () => void;
  /** Cancel callback */
  onCancel: () => void;
  /** Theme for styling ('light' | 'dark') */
  theme: 'light' | 'dark';
  /** Translation function */
  t: (key: string) => string;
}

/**
 * Get icon component based on error type
 */
const getErrorIcon = (errorType: ScanErrorType): typeof AlertTriangle => {
  switch (errorType) {
    case 'network':
      return WifiOff;
    case 'timeout':
      return Clock;
    case 'api':
    case 'invalid':
      return AlertCircle;
    default:
      return AlertTriangle;
  }
};

/**
 * Error state display with retry and cancel options.
 *
 * Visual design:
 * ```
 * ┌─────────────────────────────────────────┐
 * │           ⚠️ Algo salió mal             │
 * │                                         │
 * │  No pudimos procesar la imagen.         │
 * │  Intenta con otra foto.                 │
 * │                                         │
 * │  ┌─────────────┐  ┌─────────────┐      │
 * │  │   Reintentar │  │   Cancelar  │      │
 * │  └─────────────┘  └─────────────┘      │
 * └─────────────────────────────────────────┘
 * ```
 */
export const ScanError: React.FC<ScanErrorProps> = ({
  errorType,
  errorMessage,
  onRetry,
  onCancel,
  theme,
  t,
}) => {
  const isDark = theme === 'dark';
  const prefersReducedMotion = useReducedMotion();
  const ErrorIcon = getErrorIcon(errorType);

  // Button transition styles (respects reduced motion preference)
  const buttonTransition = prefersReducedMotion
    ? ''
    : 'transition-transform hover:scale-[1.02] active:scale-[0.98]';

  return (
    <div
      className="flex flex-col items-center p-6 rounded-xl"
      style={{
        backgroundColor: 'var(--surface)',
        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      }}
      role="alert"
      aria-live="assertive"
    >
      {/* Error icon with amber background */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
        style={{
          backgroundColor: isDark ? 'rgba(251, 191, 36, 0.2)' : 'rgba(251, 191, 36, 0.1)',
        }}
      >
        <ErrorIcon
          size={28}
          style={{ color: '#f59e0b' }}
          aria-hidden="true"
        />
      </div>

      {/* Error title */}
      <h3
        className="text-lg font-bold mb-2"
        style={{ color: 'var(--primary)' }}
      >
        {t('scanErrorTitle')}
      </h3>

      {/* Error message */}
      <p
        className="text-sm text-center mb-6 max-w-xs"
        style={{ color: 'var(--secondary)' }}
      >
        {errorMessage || t('scanErrorMessage')}
      </p>

      {/* Action buttons */}
      <div className="flex gap-3 w-full max-w-xs">
        {/* Retry button (primary) */}
        <button
          onClick={onRetry}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-white ${buttonTransition}`}
          style={{ backgroundColor: 'var(--accent)' }}
          aria-label={t('scanRetry')}
        >
          <RefreshCw size={18} aria-hidden="true" />
          {t('scanRetry')}
        </button>

        {/* Cancel button (secondary) */}
        <button
          onClick={onCancel}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold ${buttonTransition}`}
          style={{
            backgroundColor: isDark ? 'rgba(100, 116, 139, 0.2)' : 'rgba(100, 116, 139, 0.1)',
            color: 'var(--secondary)',
          }}
          aria-label={t('cancel')}
        >
          <X size={18} aria-hidden="true" />
          {t('cancel')}
        </button>
      </div>
    </div>
  );
};

export default ScanError;
