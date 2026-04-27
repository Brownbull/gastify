/**
 * SessionComplete Component
 *
 * Story 14.20: Session Completion Messaging
 * Story 14e-37: Migrated to use Zustand store (optional)
 * Epic 14: Core Implementation
 *
 * Displays an encouraging wrap-up message after saving transactions.
 * Features:
 * - Auto-dismiss after 5 seconds (configurable)
 * - Pause timer on hover/touch
 * - Manual dismiss via close button or swipe down
 * - Respects prefers-reduced-motion
 * - Non-intrusive positioning (doesn't block navigation)
 *
 * Story 14e-37: Can now use store directly for context and dismiss action.
 * Props are optional - if not provided, uses useInsightStore.
 *
 * @see docs/sprint-artifacts/epic14/stories/story-14.20-session-completion-messaging.md
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { X, TrendingUp, Camera, History, Sparkles } from 'lucide-react';
import { DURATION, EASING } from '../animation/constants';
import { TranslationKey } from '../../utils/translations';
import { useSessionContext, useInsightActions } from '@/shared/stores';
import { formatCurrency } from '@/utils/currency';

// Story 15b-0c: Session types extracted to @/types/session to break cycle 4
// Re-exported here for backward compatibility (test files import directly from this file)
import type { SessionContext, SessionAction, Suggestion } from '@/types/session';
export type { SessionContext, SessionAction, Suggestion };

export interface SessionCompleteProps {
  /** Session context data. Optional - uses store if not provided (Story 14e-37) */
  context?: SessionContext;
  /** Dismiss callback. Optional - uses store action if not provided (Story 14e-37) */
  onDismiss?: () => void;
  /** Action callback for navigation (analytics, scan, history) */
  onAction: (action: SessionAction) => void;
  /** Translation function */
  t: (key: TranslationKey) => string;
  /** Theme for styling */
  theme: 'light' | 'dark';
  /** Auto-dismiss delay in ms. Default: 5000 */
  autoDismissMs?: number;
}

/**
 * Selects the appropriate message based on session context
 * Priority order matches Dev Notes specification
 */
export function selectMessage(context: SessionContext): string {
  // Priority 1: Personal record
  if (context.isPersonalRecord) {
    return 'sessionMsgPersonalRecord'; // "¡Récord personal alcanzado!"
  }

  // Priority 2: First of week
  if (context.isFirstOfWeek) {
    return 'sessionMsgFirstOfWeek'; // "¡Primera boleta de la semana!"
  }

  // Priority 3: 7+ day streak
  if (context.consecutiveDays >= 7) {
    return 'sessionMsgStreak7'; // "¡Increíble! Llevas {days} días registrando"
  }

  // Priority 4: 3+ day streak
  if (context.consecutiveDays >= 3) {
    return 'sessionMsgStreak3'; // "¡Llevas {days} días seguidos!"
  }

  // Priority 5: Multiple transactions
  if (context.transactionsSaved > 1) {
    return 'sessionMsgMultiple'; // "¡{count} boletas guardadas hoy!"
  }

  // Default message
  return 'sessionMsgDefault'; // "¡Gran revisión hoy!"
}

/**
 * Gets contextual suggestions for next actions
 */
export function getSuggestions(
  context: SessionContext,
  t: (key: TranslationKey) => string
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // Always suggest viewing analytics
  suggestions.push({
    label: t('sessionSuggestAnalytics' as TranslationKey),
    action: 'analytics',
    icon: <TrendingUp className="w-4 h-4" />,
  });

  // Suggest scanning another if quick session (less than 3 transactions)
  if (context.transactionsSaved < 3) {
    suggestions.push({
      label: t('sessionSuggestScan' as TranslationKey),
      action: 'scan',
      icon: <Camera className="w-4 h-4" />,
    });
  } else {
    // Suggest reviewing history for longer sessions
    suggestions.push({
      label: t('sessionSuggestHistory' as TranslationKey),
      action: 'history',
      icon: <History className="w-4 h-4" />,
    });
  }

  return suggestions.slice(0, 2); // Max 2 suggestions
}


/**
 * SessionComplete Component
 *
 * Displays after save + insight flow completes.
 * Non-intrusive toast-like notification with auto-dismiss.
 *
 * Story 14e-37: Can now use store for context and dismiss.
 */
export function SessionComplete({
  context: contextProp,
  onDismiss: onDismissProp,
  onAction,
  t,
  theme,
  autoDismissMs = 5000,
}: SessionCompleteProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartY = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Story 14e-37: Use store if props not provided
  const storeContext = useSessionContext();
  const { hideSessionCompleteOverlay } = useInsightActions();

  // Use prop if provided, otherwise fall back to store
  const context = contextProp ?? storeContext;
  const onDismiss = onDismissProp ?? hideSessionCompleteOverlay;

  // Check reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Memoize dismiss handler to avoid useEffect dependency issues
  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    // Wait for exit animation before calling onDismiss
    const exitDelay = prefersReducedMotion ? 0 : DURATION.NORMAL;
    setTimeout(onDismiss, exitDelay);
  }, [onDismiss, prefersReducedMotion]);

  // Auto-dismiss timer (AC #5)
  useEffect(() => {
    if (isPaused) return;

    const timer = setTimeout(() => {
      handleDismiss();
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [autoDismissMs, handleDismiss, isPaused]);

  // Swipe down to dismiss (AC #5)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;

    // If swiped down more than 50px, dismiss
    if (deltaY > 50) {
      handleDismiss();
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
    // Resume timer after touch ends (with a small delay for accidental touches)
    setTimeout(() => setIsPaused(false), 500);
  };

  // Story 14e-37: If no context (prop or store), don't render
  // Note: When using store, parent should check showSessionComplete before rendering
  if (!context) {
    return null;
  }

  // Get message and suggestions
  const messageKey = selectMessage(context);
  const suggestions = getSuggestions(context, t);

  // Format the message with context variables
  const formatMessage = (key: string): string => {
    const baseMessage = t(key as TranslationKey);

    // Replace placeholders
    return baseMessage
      .replace('{days}', String(context.consecutiveDays))
      .replace('{count}', String(context.transactionsSaved));
  };

  const isDark = theme === 'dark';

  // Animation classes
  const animationClasses = prefersReducedMotion
    ? isExiting
      ? 'opacity-0'
      : ''
    : isExiting
      ? 'animate-fade-out'
      : 'animate-slide-up';

  return (
    <div
      ref={containerRef}
      role="status"
      aria-live="polite"
      className={`
        fixed bottom-20 left-4 right-4 mx-auto max-w-sm
        p-4 rounded-xl shadow-lg z-50
        ${isDark ? 'bg-gray-800 text-white border border-gray-700' : 'bg-white text-gray-800 border border-gray-200'}
        ${animationClasses}
      `}
      style={{
        transitionDuration: `${DURATION.NORMAL}ms`,
        transitionTimingFunction: EASING.OUT,
      }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header with icon and close button */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={`
            p-2 rounded-lg
            ${isDark ? 'bg-emerald-900/50' : 'bg-emerald-50'}
          `}
          >
            <Sparkles className={`w-5 h-5 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
          </div>
          <span
            className={`
            text-sm font-medium
            ${isDark ? 'text-gray-300' : 'text-gray-600'}
          `}
          >
            {t('sessionCompleteTitle' as TranslationKey)}
          </span>
        </div>

        {/* Close button (AC #5) */}
        <button
          onClick={handleDismiss}
          className={`
            p-1 rounded-full transition-colors
            ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}
          `}
          aria-label={t('close')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main message (AC #2) */}
      <p className={`text-base font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>
        {formatMessage(messageKey)}
      </p>

      {/* Session summary (AC #3) */}
      <div
        className={`
        text-sm mb-3 space-y-1
        ${isDark ? 'text-gray-400' : 'text-gray-500'}
      `}
      >
        {context.totalAmount > 0 && (
          <p>
            {t('sessionSummaryTotal' as TranslationKey)}: {formatCurrency(context.totalAmount, context.currency)}
          </p>
        )}
        {context.categoriesTouched.length > 0 && (
          <p>
            {context.categoriesTouched.length === 1
              ? context.categoriesTouched[0]
              : `${context.categoriesTouched.length} ${t('sessionSummaryCategories' as TranslationKey)}`}
          </p>
        )}
      </div>

      {/* Next-step suggestions (AC #4) */}
      <div className="flex gap-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.action}
            onClick={() => {
              handleDismiss();
              onAction(suggestion.action);
            }}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              transition-colors
              ${
                isDark
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }
            `}
          >
            {suggestion.icon}
            {suggestion.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default SessionComplete;
