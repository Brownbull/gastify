/**
 * Story 14e-9c: ErrorState Component
 *
 * Renders when scan phase is 'error'. Wraps ScanError component.
 * Provides retry action via useScanActions().reset().
 *
 * @see docs/sprint-artifacts/epic14e-feature-architecture/stories/14e-9c-state-components-tests.md
 */
import React from 'react';
import { useScanPhase, useScanError, useScanActions } from '../../store';
import { ScanError } from '../ScanError';
import type { ScanErrorType } from '@features/scan/store';

export interface ErrorStateProps {
  /** Translation function */
  t: (key: string) => string;
  /** Theme for styling */
  theme: 'light' | 'dark';
  /** Optional callback when error is dismissed (e.g., navigate away) */
  onDismiss?: () => void;
  /** Optional custom retry handler (defaults to reset) */
  onRetry?: () => void;
}

/**
 * Parse error message to determine error type for icon selection.
 * Maps common error patterns to ScanErrorType.
 */
function getErrorTypeFromMessage(error: string | null): ScanErrorType {
  if (!error) return 'unknown';

  const lowerError = error.toLowerCase();

  if (
    lowerError.includes('network') ||
    lowerError.includes('internet') ||
    lowerError.includes('connection') ||
    lowerError.includes('offline')
  ) {
    return 'network';
  }

  if (
    lowerError.includes('timeout') ||
    lowerError.includes('timed out') ||
    lowerError.includes('took too long')
  ) {
    return 'timeout';
  }

  if (
    lowerError.includes('invalid') ||
    lowerError.includes('corrupted') ||
    lowerError.includes('unreadable')
  ) {
    return 'invalid';
  }

  if (
    lowerError.includes('api') ||
    lowerError.includes('server') ||
    lowerError.includes('service')
  ) {
    return 'api';
  }

  return 'unknown';
}

/**
 * Error state component - renders when scan encounters an error.
 *
 * Phase guard: Returns null if phase !== 'error'
 * Wraps: ScanError component
 * Actions:
 * - Retry: Calls reset() to return to idle (or custom onRetry)
 * - Cancel: Calls reset() and onDismiss if provided
 */
export const ErrorState: React.FC<ErrorStateProps> = ({
  t,
  theme,
  onDismiss,
  onRetry,
}) => {
  const phase = useScanPhase();
  const error = useScanError();
  const { reset } = useScanActions();

  // Phase guard - only render when error
  if (phase !== 'error') {
    return null;
  }

  const errorType = getErrorTypeFromMessage(error);
  const errorMessage = error || t('scanErrorMessage') || 'Something went wrong';

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      // Default: reset to idle so user can try again
      reset();
    }
  };

  const handleCancel = () => {
    reset();
    onDismiss?.();
  };

  return (
    <ScanError
      errorType={errorType}
      errorMessage={errorMessage}
      onRetry={handleRetry}
      onCancel={handleCancel}
      theme={theme}
      t={t}
    />
  );
};

export default ErrorState;
