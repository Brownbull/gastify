/**
 * Story 11.5: Scan Status Clarity - Main Status Indicator Component
 *
 * Orchestrates the display of scan status components based on current state.
 * Handles smooth transitions between states with fade animations.
 *
 * States: idle → uploading → processing → ready → error
 *
 * @see docs/sprint-artifacts/epic11/story-11.5-scan-status-clarity.md
 */
import React, { useState, useEffect } from 'react';
import type { ScanErrorType, ScanOverlayState } from '@features/scan/store';
import { ScanProgress } from './ScanProgress';
import { ScanSkeleton } from './ScanSkeleton';
import { ScanReady } from './ScanReady';
import { ScanError } from './ScanError';

export interface ScanStatusIndicatorProps {
  /** Current scan state */
  status: ScanOverlayState;
  /** Upload progress percentage (0-100), used in uploading state */
  progress?: number;
  /** Error details, used in error state */
  error?: { type: ScanErrorType; message: string } | null;
  /** Estimated processing time in seconds */
  estimatedTime?: number | null;
  /** Callback when user cancels the scan */
  onCancel: () => void;
  /** Callback when user clicks retry after error */
  onRetry: () => void;
  /** Callback when ready animation completes */
  onReadyComplete?: () => void;
  /** Theme for styling ('light' | 'dark') */
  theme: 'light' | 'dark';
  /** Translation function */
  t: (key: string) => string;
}

/**
 * Main scan status indicator component.
 *
 * Displays appropriate component based on current scan state with
 * smooth fade transitions between states.
 *
 * @example
 * ```tsx
 * <ScanStatusIndicator
 *   status={scanState.state}
 *   progress={scanState.progress}
 *   error={scanState.error}
 *   estimatedTime={scanState.estimatedTime}
 *   onCancel={handleCancel}
 *   onRetry={handleRetry}
 *   theme="dark"
 *   t={t}
 * />
 * ```
 */
export const ScanStatusIndicator: React.FC<ScanStatusIndicatorProps> = ({
  status,
  progress = 0,
  error = null,
  estimatedTime = null,
  onCancel,
  onRetry,
  onReadyComplete,
  theme,
  t,
}) => {
  // Track previous state for transitions
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayedStatus, setDisplayedStatus] = useState<ScanOverlayState>(status);

  // Handle state transitions with animation
  useEffect(() => {
    if (status !== displayedStatus) {
      // Start fade out
      setIsTransitioning(true);

      // After fade out, update state and fade in
      const timer = setTimeout(() => {
        setDisplayedStatus(status);
        setIsTransitioning(false);
      }, 150); // Half of transition duration

      return () => clearTimeout(timer);
    }
  }, [status, displayedStatus]);

  // Don't render anything in idle state
  if (displayedStatus === 'idle' && !isTransitioning) {
    return null;
  }

  const containerStyle: React.CSSProperties = {
    opacity: isTransitioning ? 0 : 1,
    transform: isTransitioning ? 'translateY(4px)' : 'translateY(0)',
    transition: 'opacity 0.15s ease-out, transform 0.15s ease-out',
  };

  return (
    <div style={containerStyle} className="w-full">
      {displayedStatus === 'uploading' && (
        <ScanProgress
          progress={progress}
          onCancel={onCancel}
          theme={theme}
          t={t}
        />
      )}

      {displayedStatus === 'processing' && (
        <ScanSkeleton
          theme={theme}
          t={t}
          estimatedTime={estimatedTime}
          onCancel={onCancel}
        />
      )}

      {displayedStatus === 'ready' && (
        <ScanReady
          theme={theme}
          t={t}
          onComplete={onReadyComplete}
        />
      )}

      {displayedStatus === 'error' && error && (
        <ScanError
          errorType={error.type}
          errorMessage={error.message}
          onRetry={onRetry}
          onCancel={onCancel}
          theme={theme}
          t={t}
        />
      )}
    </div>
  );
};

// Export all scan components for individual use if needed
export { ScanProgress } from './ScanProgress';
export { ScanSkeleton } from './ScanSkeleton';
export { ScanReady } from './ScanReady';
export { ScanError } from './ScanError';

export default ScanStatusIndicator;
