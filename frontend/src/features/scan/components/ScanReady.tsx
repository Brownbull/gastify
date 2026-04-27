/**
 * Story 11.5: Scan Status Clarity - Ready State Indicator
 *
 * Brief "Ready" indicator shown before transitioning to results.
 * Shows checkmark with animation for 500ms.
 *
 * @see docs/sprint-artifacts/epic11/story-11.5-scan-status-clarity.md - Task 4
 */
import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { READY_DISPLAY_MS } from '@features/scan/store';

export interface ScanReadyProps {
  /** Theme for styling ('light' | 'dark') */
  theme: 'light' | 'dark';
  /** Translation function */
  t: (key: string) => string;
  /** Callback when ready animation completes */
  onComplete?: () => void;
}

/**
 * Ready state indicator with checkmark animation.
 *
 * Visual design:
 * - Checkmark icon with scale bounce animation
 * - "Listo" text with fade in
 * - Auto-transitions after 500ms
 */
export const ScanReady: React.FC<ScanReadyProps> = ({
  theme,
  t,
  onComplete,
}) => {
  const isDark = theme === 'dark';
  const [isAnimating, setIsAnimating] = useState(true);

  // Auto-complete after display duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(false);
      onComplete?.();
    }, READY_DISPLAY_MS);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div
      className="flex flex-col items-center justify-center p-8 rounded-xl"
      style={{
        backgroundColor: 'var(--surface)',
        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      }}
      role="status"
      aria-label={t('scanReady')}
      aria-live="assertive"
    >
      {/* Inline keyframes for animations */}
      <style>
        {`
          @keyframes checkmark-bounce {
            0% { transform: scale(0); }
            50% { transform: scale(1.2); }
            70% { transform: scale(0.9); }
            100% { transform: scale(1); }
          }

          @keyframes fade-slide-up {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>

      {/* Checkmark with bounce animation */}
      {/* Story 14.16b: Using semantic positive colors for success state */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{
          backgroundColor: 'var(--positive-bg)',
          animation: isAnimating ? 'checkmark-bounce 0.4s ease-out forwards' : 'none',
        }}
      >
        <Check
          size={32}
          style={{ color: 'var(--positive-primary)' }}
          strokeWidth={3}
          aria-hidden="true"
        />
      </div>

      {/* Ready text */}
      <div
        className="text-lg font-bold"
        style={{
          color: 'var(--positive-primary)',
          animation: isAnimating ? 'fade-slide-up 0.3s ease-out 0.2s forwards' : 'none',
          opacity: isAnimating ? 0 : 1,
        }}
      >
        {t('scanReady')}
      </div>
    </div>
  );
};

export default ScanReady;
