/**
 * BatchProcessingOverlay Component
 *
 * Story 12.1 v9.7.0: Batch Capture UI
 * Full content blocking overlay displayed during batch receipt scanning.
 * Shows progress like "Escaneando 1 de 3" matching single scan UX.
 *
 * Features:
 * - Semi-transparent backdrop with blur effect
 * - Centered processing message with spinner
 * - Progress indicator showing current/total
 * - Navigation tip to inform user they can navigate away
 * - Respects reduced motion preferences
 */

import React, { useEffect, useState } from 'react';
import { Loader2, Layers } from 'lucide-react';
import { DURATION } from '@/components/animation/constants';

/**
 * Props for BatchProcessingOverlay component
 */
export interface BatchProcessingOverlayProps {
  /** Whether the overlay is visible */
  visible: boolean;
  /** Theme for styling */
  theme: 'light' | 'dark';
  /** Translation function */
  t: (key: string) => string;
  /** Current progress (current and total count) */
  progress: { current: number; total: number };
}

/**
 * BatchProcessingOverlay - Content blocking overlay during batch receipt processing
 *
 * Visual design matches single scan ProcessingOverlay:
 * - Semi-transparent backdrop with blur
 * - Centered card with spinner and message
 * - Shows "Escaneando X de Y" progress
 * - Navigation tip at bottom
 * - Leaves nav bar visible for navigation
 */
export const BatchProcessingOverlay: React.FC<BatchProcessingOverlayProps> = ({
  visible,
  theme,
  t,
  progress,
}) => {
  const isDark = theme === 'dark';
  const [isVisible, setIsVisible] = useState(false);

  // Check for reduced motion preference
  const prefersReducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Handle visibility transitions
  useEffect(() => {
    if (visible) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), DURATION.NORMAL);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  // Don't render if not visible
  if (!visible && !isVisible) {
    return null;
  }

  const progressText = progress.total > 0
    ? `${t('scanning') || 'Escaneando'} ${progress.current} ${t('of') || 'de'} ${progress.total}`
    : t('processingBatch') || 'Procesando lote...';

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={progressText}
      aria-live="polite"
      className={`fixed z-40 flex flex-col items-center justify-center transition-opacity ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        transitionDuration: prefersReducedMotion ? '0ms' : `${DURATION.NORMAL}ms`,
        // Cover content area only, leaving nav bar accessible
        top: 0,
        left: 0,
        right: 0,
        // Bottom stops above nav bar (80px nav + safe area)
        bottom: 'calc(80px + var(--safe-bottom, env(safe-area-inset-bottom, 0px)))',
      }}
    >
      {/* Backdrop with blur */}
      <div
        className={`absolute inset-0 ${isDark ? 'bg-black/60' : 'bg-white/70'} backdrop-blur-sm`}
        style={{
          transitionDuration: prefersReducedMotion ? '0ms' : `${DURATION.NORMAL}ms`,
        }}
      />

      {/* Content container */}
      <div
        className="relative z-10 flex flex-col items-center gap-6 p-8 rounded-2xl shadow-xl mx-4"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-light)',
          transitionDuration: prefersReducedMotion ? '0ms' : `${DURATION.NORMAL}ms`,
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          transform: visible ? 'scale(1)' : 'scale(0.95)',
        }}
      >
        {/* Spinner with batch icon */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center relative"
          style={{ backgroundColor: 'var(--success-light, #d1fae5)' }}
        >
          <Loader2
            size={40}
            style={{ color: 'var(--success, #10b981)' }}
            className={!prefersReducedMotion ? 'animate-spin' : ''}
          />
          {/* Batch indicator badge */}
          <div
            className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
              border: '2px solid var(--bg-secondary)',
            }}
          >
            <Layers size={14} color="white" strokeWidth={2.5} />
          </div>
        </div>

        {/* Processing message */}
        <div className="text-center">
          <h3
            className="text-xl font-bold mb-2"
            style={{ color: 'var(--text-primary)' }}
          >
            {progressText}
          </h3>
          <p
            className="text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            {t('processingPleaseWait') || 'Por favor espera'}
          </p>
        </div>

        {/* Progress bar */}
        {progress.total > 0 && (
          <div className="w-full max-w-xs">
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--bg-tertiary)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                  background: 'linear-gradient(90deg, var(--success, #10b981), #059669)',
                }}
              />
            </div>
            <p
              className="text-xs text-center mt-2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {progress.current} / {progress.total} {t('receiptsProcessed') || 'boletas procesadas'}
            </p>
          </div>
        )}
      </div>

      {/* Navigation tip at bottom */}
      <div
        className="relative z-10 mt-6 px-4 py-2 rounded-full"
        style={{
          backgroundColor: isDark ? 'rgba(51, 65, 85, 0.8)' : 'rgba(241, 245, 249, 0.8)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <p
          className="text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t('canNavigateWhileProcessing') || 'Puedes navegar mientras procesamos'}
        </p>
      </div>
    </div>
  );
};

export default BatchProcessingOverlay;
