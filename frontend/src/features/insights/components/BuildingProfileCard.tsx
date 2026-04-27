/**
 * BuildingProfileCard Component
 *
 * Story 10.6: Scan Complete Insight Card
 * Architecture: architecture-epic10-insight-engine.md
 *
 * Fallback card shown when no personalized insight is available.
 * This appears for new users during WEEK_1 phase when pattern
 * detection doesn't have enough data yet.
 *
 * AC #3: BuildingProfileCard fallback shown when no insight available
 */

import { useEffect, useState, useCallback } from 'react';
import { Sparkles, X } from 'lucide-react';

interface BuildingProfileCardProps {
  onDismiss: () => void;
  autoDismissMs?: number;
  theme: 'light' | 'dark';
}

export function BuildingProfileCard({
  onDismiss,
  autoDismissMs = 5000,
  theme,
}: BuildingProfileCardProps) {
  const [isExiting, setIsExiting] = useState(false);

  // Memoize dismiss handler
  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(onDismiss, 200);
  }, [onDismiss]);

  // Auto-dismiss timer
  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, autoDismissMs);

    return () => clearTimeout(timer);
  }, [autoDismissMs, handleDismiss]);

  // Check reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const animationClasses = prefersReducedMotion
    ? isExiting ? 'opacity-0' : ''
    : isExiting ? 'animate-fade-out' : 'animate-slide-up';

  const isDark = theme === 'dark';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`
        fixed bottom-20 left-4 right-4 mx-auto max-w-sm
        p-4 rounded-xl shadow-lg z-50
        ${isDark
          ? 'bg-gray-800 text-white border border-gray-700'
          : 'bg-white text-gray-800 border border-gray-200'
        }
        ${animationClasses}
      `}
    >
      <div className="flex items-start gap-3">
        <div className={`
          p-2 rounded-lg flex-shrink-0
          ${isDark ? 'bg-purple-900/50' : 'bg-purple-50'}
        `}>
          <Sparkles className={`
            w-5 h-5
            ${isDark ? 'text-purple-400' : 'text-purple-600'}
          `} />
        </div>

        <div className="flex-1 min-w-0">
          <p className={`
            text-sm font-medium
            ${isDark ? 'text-gray-300' : 'text-gray-600'}
          `}>
            Construyendo tu perfil
          </p>
          <p className={`
            text-sm mt-0.5
            ${isDark ? 'text-gray-400' : 'text-gray-500'}
          `}>
            Con mas datos, te mostraremos insights personalizados
          </p>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className={`
            p-1 rounded-full transition-colors flex-shrink-0
            ${isDark
              ? 'hover:bg-gray-700 text-gray-400'
              : 'hover:bg-gray-100 text-gray-500'
            }
          `}
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
