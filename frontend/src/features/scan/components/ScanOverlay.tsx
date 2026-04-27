/**
 * ScanOverlay Component
 *
 * Story 14.3: Scan Overlay Flow
 * Epic 14: Core Implementation
 *
 * Non-blocking overlay displayed during receipt processing.
 * Shows progress feedback and allows user to navigate away.
 *
 * Features:
 * - Semi-transparent backdrop with blur effect
 * - State machine: idle → uploading → processing → ready → error
 * - ETA calculation based on average processing time
 * - Non-blocking navigation support
 * - Transitions to ready state (progressive item reveal handled by EditView via animateItems prop)
 *
 * @see docs/sprint-artifacts/epic14/stories/story-14.3-scan-overlay-flow.md
 * @see docs/uxui/mockups/01_views/scan-overlay.html
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Check, AlertCircle, X, RefreshCw, Info } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { READY_DISPLAY_MS, useScanStore } from '@features/scan/store';
import type { ScanErrorType, ScanOverlayState } from '@features/scan/store';
import { DURATION } from '@/components/animation/constants';
import { ScanSkeleton } from './ScanSkeleton';

// Re-export type for consumers
export type { ScanOverlayState };

/**
 * Props for ScanOverlay component
 */
export interface ScanOverlayProps {
  /** Current state of the scan overlay */
  state: ScanOverlayState;
  /** @deprecated TD-18-19: Upload progress no longer rendered (ScanSkeleton replaces it). Kept for interface stability. */
  progress?: number;
  /** Estimated time remaining in seconds, shown in 'processing' state */
  eta: number | null;
  /** Error details for 'error' state */
  error: { type: ScanErrorType; message: string } | null;
  /** Callback when user cancels the scan */
  onCancel: () => void;
  /** Callback when user clicks retry after error */
  onRetry: () => void;
  /** Callback when ready animation completes (for auto-dismiss) */
  onDismiss?: () => void;
  /** TD-18-19: Callback when user clicks "Guardar ahora" in ready state */
  onSave?: () => void;
  /** TD-18-19: Callback when user clicks "Editar primero" in ready state */
  onEdit?: () => void;
  /** Theme for styling ('light' | 'dark') */
  theme: 'light' | 'dark';
  /** Translation function */
  t: (key: string) => string;
  /** Whether the overlay is visible */
  visible: boolean;
  /** Optional captured image URL to show behind the overlay (AC #1: User can see image during processing) */
  capturedImageUrl?: string;
}

/**
 * ScanOverlay - Non-blocking overlay during receipt processing
 *
 * Visual design from scan-overlay.html mockup:
 * - Semi-transparent backdrop with blur
 * - Centered progress card
 * - Circular progress indicator
 * - Status text with ETA
 * - Navigation tip
 */
export const ScanOverlay: React.FC<ScanOverlayProps> = ({
  state,
  // TD-18-19: progress prop no longer rendered — ScanSkeleton replaced circular progress
  eta,
  error,
  onCancel,
  onRetry,
  onDismiss,
  onSave,
  onEdit,
  theme,
  t,
  visible,
  capturedImageUrl,
}) => {
  const isDark = theme === 'dark';
  const prefersReducedMotion = useReducedMotion();
  // TD-18-3: Read activeDialog to guard auto-dismiss when a dialog is open
  const activeDialog = useScanStore((s) => s.activeDialog);
  // TD-18-19: Read scan results for ready state data display
  const results = useScanStore((s) => s.results);
  const activeResultIndex = useScanStore((s) => s.activeResultIndex);
  const activeResult = results?.[activeResultIndex ?? 0];

  // Track animation state for transitions
  const [isVisible, setIsVisible] = useState(false);

  // TD-18-19 AC-12: Track when skeleton first appeared to detect fast scans
  const skeletonShownAt = useRef<number | null>(null);
  useEffect(() => {
    if ((state === 'uploading' || state === 'processing') && visible && skeletonShownAt.current === null) {
      skeletonShownAt.current = Date.now();
    } else if (state === 'idle') {
      skeletonShownAt.current = null;
    }
  }, [state, visible]);
  // Fast scan: skeleton was shown for <1s — skip fade animations to avoid flicker
  const isFastScan = state === 'ready' && skeletonShownAt.current !== null &&
    (Date.now() - skeletonShownAt.current) < 1000;

  // TD-18-19: SVG circle progress removed — uploading/processing now show ScanSkeleton

  // Handle visibility transitions
  useEffect(() => {
    if (visible && state !== 'idle') {
      setIsVisible(true);
    } else if (!visible || state === 'idle') {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [visible, state]);

  // Auto-dismiss on ready state — only when no save/edit buttons AND overlay is visible AND no dialog active
  // TD-18-19: When onSave/onEdit are provided, user must click a button — no auto-dismiss
  // Story 16-3 regression fix: onDismiss now navigates to dashboard (for error recovery),
  // so firing it when invisible (phase='reviewing') would kill the transaction editor.
  // TD-18-3: Also skip auto-dismiss when activeDialog is set — dialog IS the user's next action.
  const hasActionButtons = !!(onSave || onEdit);
  useEffect(() => {
    if (state === 'ready' && visible && onDismiss && !activeDialog && !hasActionButtons) {
      const timer = setTimeout(() => {
        onDismiss();
      }, READY_DISPLAY_MS);
      return () => clearTimeout(timer);
    }
  }, [state, visible, onDismiss, activeDialog, hasActionButtons]);

  // Get aria-label based on current state
  const getAriaLabel = useCallback(() => {
    switch (state) {
      case 'uploading':
        return t('scanUploading');
      case 'processing':
        return t('scanProcessing');
      case 'ready':
        return t('scanReady');
      case 'error':
        return t('scanError');
      default:
        return '';
    }
  }, [state, t]);

  // Don't render if not visible or idle
  if (!visible || state === 'idle') {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={getAriaLabel()}
      className={`fixed inset-x-0 top-0 z-40 flex items-center justify-center transition-opacity ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        transitionDuration: `${DURATION.NORMAL}ms`,
        // Leave space for nav bar (approx 80px + safe area) so user can still navigate
        bottom: 'calc(80px + var(--safe-bottom, env(safe-area-inset-bottom, 0px)))',
      }}
    >
      {/* AC #1: Captured image background - user can see the image during processing */}
      {capturedImageUrl && (
        <div className="absolute inset-0">
          <img
            src={capturedImageUrl}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Backdrop - more transparent when image is shown */}
      <div
        data-testid="scan-overlay-backdrop"
        className={`absolute inset-0 ${capturedImageUrl ? 'bg-black/50' : 'bg-black/40'} backdrop-blur-sm ${
          !prefersReducedMotion ? 'transition-opacity' : ''
        }`}
        style={!prefersReducedMotion ? { transitionDuration: `${DURATION.NORMAL}ms` } : undefined}
        onClick={state === 'error' ? onCancel : undefined}
      />

      {/* Content container */}
      <div
        role="status"
        aria-live="polite"
        className={`relative z-10 flex flex-col items-center gap-5 ${
          !prefersReducedMotion ? 'transition-transform' : ''
        } ${isVisible ? 'scale-100' : 'scale-95'}`}
        style={!prefersReducedMotion ? { transitionDuration: `${DURATION.NORMAL}ms` } : undefined}
      >
        {/* TD-18-19: Skeleton card for uploading/processing — replaces circular progress */}
        {(state === 'uploading' || state === 'processing') && (
          <ScanSkeleton
            theme={theme}
            t={t}
            estimatedTime={state === 'processing' ? eta : undefined}
          />
        )}

        {/* Card for ready/error states */}
        {(state === 'ready' || state === 'error') && (
        <div
          className={`flex flex-col items-center gap-4 p-8 rounded-2xl shadow-xl ${
            isDark ? 'bg-slate-800' : 'bg-white'
          }`}
          style={{
            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
          }}
        >
          {/* TD-18-19: Ready state — show result summary with save/edit buttons */}
          {state === 'ready' && (
            <>
              {/* Header: checkmark + "Escaneo completo!" — AC-12: skip animation on fast scan */}
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    !prefersReducedMotion && !isFastScan ? 'animate-[checkmark-bounce_0.4s_ease-out_forwards]' : ''
                  }`}
                  style={{
                    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.1)',
                  }}
                >
                  <Check size={20} className="text-green-500" strokeWidth={3} />
                </div>
                <span className="text-lg font-bold text-green-500">
                  {t('scanReady')}
                </span>
              </div>

              {/* Result summary — AC-12: skip fade on fast scan */}
              {activeResult && (
                <div
                  className={`w-full text-center space-y-1 ${
                    !prefersReducedMotion && !isFastScan ? 'animate-[fade-slide-up_0.3s_ease-out_forwards]' : ''
                  }`}
                  data-testid="scan-result-summary"
                >
                  <div
                    className="text-base font-semibold"
                    style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}
                  >
                    {activeResult.merchant}
                  </div>
                  <div
                    className="text-2xl font-bold"
                    style={{ color: 'var(--primary)' }}
                  >
                    ${activeResult.total?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) ?? '—'}
                  </div>
                  {activeResult.items?.length > 0 && (
                    <div
                      className="text-sm"
                      style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                    >
                      {activeResult.items.length} {activeResult.items.length === 1 ? 'item' : 'items'}
                    </div>
                  )}
                </div>
              )}

              {/* Save / Edit buttons (AC-7) — AC-12: skip fade on fast scan */}
              {hasActionButtons && (
                <div
                  className={`flex gap-3 w-full ${
                    !prefersReducedMotion && !isFastScan ? 'animate-[fade-slide-up_0.3s_ease-out_0.15s_forwards] opacity-0' : ''
                  }`}
                >
                  {onEdit && (
                    <button
                      onClick={onEdit}
                      className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold transition-colors ${
                        isDark
                          ? 'border-2 border-slate-600 text-slate-300 hover:bg-slate-700'
                          : 'border-2 border-slate-300 text-slate-700 hover:bg-slate-50'
                      }`}
                      data-testid="scan-overlay-edit-btn"
                    >
                      {t('editFirst')}
                    </button>
                  )}
                  {onSave && (
                    <button
                      onClick={onSave}
                      className="flex-[2] py-3 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                      data-testid="scan-overlay-save-btn"
                    >
                      {t('saveNow')}
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {/* Error state */}
          {state === 'error' && error && (
            <>
              {/* Error icon */}
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{
                  backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                }}
              >
                <AlertCircle
                  size={32}
                  className="text-red-500"
                />
              </div>

              {/* Error text */}
              <div className="text-center max-w-xs">
                <div
                  className="text-lg font-bold mb-2"
                  style={{ color: isDark ? '#f1f5f9' : '#0f172a' }}
                >
                  {t('scanError')}
                </div>
                <div
                  className="text-sm"
                  style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                >
                  {error.message}
                </div>
                {/* TD-18-19 AC-10: Credit refund message inline */}
                <div
                  className="text-xs mt-2"
                  style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                  data-testid="scan-error-credit-refund"
                >
                  {t('scanFailedCreditRefunded')}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-2 w-full">
                <button
                  onClick={onRetry}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors w-full"
                  aria-label={t('retry')}
                >
                  <RefreshCw size={16} />
                  {t('retry')}
                </button>
                <button
                  onClick={onCancel}
                  className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full ${
                    isDark
                      ? 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  aria-label={t('cancel')}
                >
                  <X size={16} />
                  {t('cancel')}
                </button>
              </div>
            </>
          )}
        </div>
        )}

        {/* TD-18-19: Navigation tip - shown during uploading AND processing */}
        {(state === 'uploading' || state === 'processing') && (
          <div
            className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-md ${
              isDark ? 'bg-slate-800' : 'bg-white/95'
            }`}
          >
            <Info size={16} style={{ color: isDark ? '#64748b' : '#94a3b8' }} />
            <span
              className="text-xs text-center"
              style={{ color: isDark ? '#94a3b8' : '#64748b' }}
            >
              {t('tipCanNavigateWhileProcessing')}
            </span>
          </div>
        )}
      </div>

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
    </div>
  );
};

export default ScanOverlay;
