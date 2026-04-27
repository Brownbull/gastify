/**
 * ProcessingOverlay Component
 *
 * Story 14.23: Unified Transaction Editor
 * Epic 14: Core Implementation
 *
 * Full content blocking overlay displayed during receipt scanning.
 * Covers the transaction editor content area but leaves nav bar accessible.
 *
 * Features:
 * - Semi-transparent backdrop with blur effect
 * - Centered processing message with spinner
 * - Navigation tip to inform user they can navigate away
 * - Respects reduced motion preferences
 *
 * @see /home/khujta/.claude/plans/fancy-doodling-island.md
 */

import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { DURATION } from '@/components/animation/constants';

/**
 * Props for ProcessingOverlay component
 */
export interface ProcessingOverlayProps {
  /** Whether the overlay is visible */
  visible: boolean;
  /** Theme for styling */
  theme: 'light' | 'dark';
  /** Translation function */
  t: (key: string) => string;
  /** Optional ETA in seconds */
  eta?: number | null;
}

/**
 * ProcessingOverlay - Content blocking overlay during receipt processing
 *
 * Visual design:
 * - Semi-transparent backdrop with blur
 * - Centered card with spinner and message
 * - Navigation tip at bottom
 * - Leaves nav bar visible for navigation
 */
export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  visible,
  theme,
  t,
  eta,
}) => {
  const isDark = theme === 'dark';
  const prefersReducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(false);

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

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={t('processingReceipt') || 'Processing receipt'}
      aria-live="polite"
      className={`absolute inset-0 z-30 flex flex-col items-center justify-center transition-opacity ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        transitionDuration: prefersReducedMotion ? '0ms' : `${DURATION.NORMAL}ms`,
        // Leave space for nav bar so user can still navigate
        marginBottom: 'calc(80px + var(--safe-bottom, env(safe-area-inset-bottom, 0px)))',
      }}
    >
      {/* Backdrop with blur */}
      <div
        className={`absolute inset-0 ${isDark ? 'bg-black/40' : 'bg-white/60'} backdrop-blur-sm`}
        style={{
          transitionDuration: prefersReducedMotion ? '0ms' : `${DURATION.NORMAL}ms`,
        }}
      />

      {/* Content container */}
      <div
        className={`relative z-10 flex flex-col items-center gap-6 p-8 rounded-2xl shadow-xl mx-4 ${
          isDark ? 'bg-slate-800' : 'bg-white'
        } ${!prefersReducedMotion ? 'transition-transform' : ''} ${
          visible ? 'scale-100' : 'scale-95'
        }`}
        style={{
          transitionDuration: prefersReducedMotion ? '0ms' : `${DURATION.NORMAL}ms`,
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        }}
      >
        {/* Spinner */}
        <div
          className={`w-16 h-16 rounded-full flex items-center justify-center ${
            isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'
          }`}
        >
          <Loader2
            size={32}
            className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'} ${
              !prefersReducedMotion ? 'animate-spin' : ''
            }`}
          />
        </div>

        {/* Processing message */}
        <div className="text-center">
          <h3
            className={`text-lg font-semibold mb-2 ${
              isDark ? 'text-white' : 'text-slate-900'
            }`}
          >
            {t('processingReceipt') || 'Procesando boleta...'}
          </h3>
          <p
            className={`text-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}
          >
            {t('processingPleaseWait') || 'Por favor espera'}
          </p>
          {eta && eta > 0 && (
            <p
              className={`text-xs mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}
            >
              ~{eta} {t('seconds') || 'segundos'}
            </p>
          )}
        </div>
      </div>

      {/* Navigation tip at bottom */}
      <div
        className={`relative z-10 mt-6 px-4 py-2 rounded-full ${
          isDark ? 'bg-slate-700/80' : 'bg-slate-100/80'
        } backdrop-blur-sm`}
      >
        <p
          className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}
        >
          {t('canNavigateWhileProcessing') || 'Puedes navegar mientras procesamos'}
        </p>
      </div>
    </div>
  );
};

export default ProcessingOverlay;
