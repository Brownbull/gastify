/**
 * IntentionalPrompt Component
 *
 * Story 14.17: "Intentional or Accidental?" Pattern
 *
 * A non-judgmental prompt that asks users if unusual spending was intentional.
 * Follows voice-tone-guidelines.md - Principle #1: Observes without judging.
 *
 * Features:
 * - Slide-up entry animation (300ms)
 * - Two-button response (intentional / unintentional)
 * - Dismissible via X button or backdrop click
 * - Respects prefers-reduced-motion
 * - Dark mode support
 * - WCAG 2.1 Level AA compliant
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { X, HelpCircle } from 'lucide-react';
import type { InsightRecord } from '@/types/insight';

/**
 * Props for the IntentionalPrompt component
 */
export interface IntentionalPromptProps {
  /** The insight that triggered this prompt */
  insight: InsightRecord;
  /** Context message (e.g., "Restaurantes subió 45% esta semana") */
  context: string;
  /** Callback when user responds */
  onResponse: (intentional: boolean) => void;
  /** Callback when user dismisses without responding */
  onDismiss: () => void;
  /** Translation function */
  t: (key: string) => string;
  /** Current theme for styling */
  theme?: 'light' | 'dark';
}

/**
 * Response types for the intentional prompt
 */
export type IntentionalResponseType = 'intentional' | 'unintentional' | null;

/**
 * Data structure for storing intentional responses
 */
export interface IntentionalResponse {
  /** The insight that triggered this prompt */
  insightId: string;
  /** Optional transaction that triggered the insight */
  transactionId?: string;
  /** User's response */
  response: IntentionalResponseType;
  /** When the response was recorded */
  timestamp: Date;
}

/**
 * Determine if an insight should trigger the intentional prompt.
 * Shows for significant spending pattern changes (>30% increase).
 *
 * Note: We check `insightId` (not `type`) because InsightRecord uses `insightId`
 * as the insight identifier field. The Dev Notes example code shows `insight.type`
 * but that's conceptual - the actual field is `insightId`.
 */
export function shouldShowIntentionalPrompt(insight: InsightRecord): boolean {
  const triggerTypes = ['category_trend', 'spending_velocity'];
  if (!triggerTypes.includes(insight.insightId)) return false;

  // Only for increases, not decreases
  const metadata = (insight as InsightRecord & { metadata?: { direction?: string; percentChange?: number } }).metadata;
  if (metadata?.direction !== 'up') return false;

  // Only for significant changes (>30%)
  if ((metadata?.percentChange || 0) < 30) return false;

  return true;
}

/**
 * IntentionalPrompt - Non-judgmental spending prompt dialog.
 *
 * From voice-tone-guidelines.md:
 * - "¿Fue intencional?" instead of "You overspent"
 * - "No me había dado cuenta" instead of "Bad spending habit"
 */
export const IntentionalPrompt: React.FC<IntentionalPromptProps> = ({
  insight: _insight, // Reserved for future use
  context,
  onResponse,
  onDismiss,
  t,
  theme = 'light',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElement = useRef<Element | null>(null);
  const [isExiting, setIsExiting] = useState(false);

  // Check reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Store the previously focused element when modal opens
  useEffect(() => {
    previousActiveElement.current = document.activeElement;
    // Focus the close button after a short delay
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);
  }, []);

  // Restore focus when modal closes
  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
      (previousActiveElement.current as HTMLElement)?.focus?.();
    }, prefersReducedMotion ? 0 : 200);
  }, [onDismiss, prefersReducedMotion]);

  // Handle response with exit animation
  const handleResponse = useCallback((intentional: boolean) => {
    setIsExiting(true);
    setTimeout(() => {
      onResponse(intentional);
      (previousActiveElement.current as HTMLElement)?.focus?.();
    }, prefersReducedMotion ? 0 : 200);
  }, [onResponse, prefersReducedMotion]);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleClose]);

  // Focus trap within modal
  useEffect(() => {
    if (!modalRef.current) return;

    const modalElement = modalRef.current;
    const focusableElements = modalElement.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstFocusable) {
          e.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        if (document.activeElement === lastFocusable) {
          e.preventDefault();
          firstFocusable?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const isDark = theme === 'dark';

  // Animation classes
  const animationClasses = prefersReducedMotion
    ? isExiting ? 'opacity-0' : ''
    : isExiting ? 'animate-fade-out' : 'animate-slide-up';

  // Modal styling using CSS variables
  const modalStyle: React.CSSProperties = {
    backgroundColor: 'var(--surface)',
    color: 'var(--primary)',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      onClick={handleClose}
      role="presentation"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity ${
          isExiting ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ transitionDuration: prefersReducedMotion ? '0ms' : '200ms' }}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="intentional-prompt-title"
        aria-describedby="intentional-prompt-description"
        className={`relative w-full max-w-sm rounded-2xl shadow-xl ${animationClasses}`}
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button (AC #5) */}
        <button
          ref={closeButtonRef}
          onClick={handleClose}
          className="absolute right-4 top-4 p-2 rounded-full transition-colors"
          style={{
            color: 'var(--secondary)',
            backgroundColor: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(100, 116, 139, 0.1)',
          }}
          aria-label={t('close') || 'Close'}
        >
          <X size={20} aria-hidden="true" />
        </button>

        {/* Content */}
        <div className="p-6 text-center">
          {/* Icon */}
          <div
            className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #6366f1)' }}
          >
            <HelpCircle size={32} className="text-white" aria-hidden="true" />
          </div>

          {/* Title - Non-judgmental (AC #2) */}
          <h2
            id="intentional-prompt-title"
            className="text-xl font-bold mb-2"
            style={{ color: 'var(--primary)' }}
          >
            {t('intentionalPromptTitle')}
          </h2>

          {/* Context message */}
          <p
            id="intentional-prompt-description"
            className="mb-6"
            style={{ color: 'var(--secondary)' }}
          >
            {context}
          </p>

          {/* Response buttons (AC #1, #2) */}
          <div className="flex flex-col gap-3">
            {/* Intentional button */}
            <button
              onClick={() => handleResponse(true)}
              className="w-full py-3 px-4 rounded-xl font-semibold shadow-md transition-transform hover:scale-[1.01] active:scale-[0.99]"
              style={{
                background: 'linear-gradient(135deg, var(--accent), #6366f1)',
                color: 'white',
              }}
            >
              {t('intentionalYes')}
            </button>

            {/* Unintentional button */}
            <button
              onClick={() => handleResponse(false)}
              className="w-full py-3 px-4 rounded-xl border font-medium transition-colors hover:scale-[1.01] active:scale-[0.99]"
              style={{
                borderColor: isDark ? '#475569' : '#e2e8f0',
                color: 'var(--primary)',
                backgroundColor: 'transparent',
              }}
            >
              {t('intentionalNo')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
