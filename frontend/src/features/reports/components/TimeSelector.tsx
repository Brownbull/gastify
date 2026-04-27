/**
 * TimeSelector Component
 *
 * Story 14.16: Weekly Report Story Format
 * Epic 14: Core Implementation
 *
 * Arrow-based time navigation for report sections.
 * Displays current period with left/right navigation arrows.
 *
 * @example
 * ```tsx
 * <TimeSelector
 *   value="Diciembre"
 *   onPrev={() => goToPreviousMonth()}
 *   onNext={() => goToNextMonth()}
 *   canGoPrev={hasPreviousMonth}
 *   canGoNext={hasNextMonth}
 * />
 * ```
 */

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export interface TimeSelectorProps {
  /** Current time period label (e.g., "Diciembre", "Q4 2025", "2025") */
  value: string;
  /** Callback when previous arrow is clicked */
  onPrev: () => void;
  /** Callback when next arrow is clicked */
  onNext: () => void;
  /** Whether previous navigation is available */
  canGoPrev?: boolean;
  /** Whether next navigation is available */
  canGoNext?: boolean;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * TimeSelector - Arrow-based period navigation
 */
export const TimeSelector: React.FC<TimeSelectorProps> = ({
  value,
  onPrev,
  onNext,
  canGoPrev = true,
  canGoNext = true,
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion();

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canGoPrev) {
      onPrev();
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canGoNext) {
      onNext();
    }
  };

  const buttonBaseClass = `
    w-6 h-6 rounded
    flex items-center justify-center
    ${prefersReducedMotion ? '' : 'transition-all duration-150'}
  `;

  const enabledClass = `
    cursor-pointer
    hover:bg-[var(--border-light)]
    active:scale-95
  `;

  const disabledClass = `
    cursor-not-allowed
    opacity-40
  `;

  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      data-testid="time-selector"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Previous arrow */}
      <button
        type="button"
        onClick={handlePrev}
        disabled={!canGoPrev}
        className={`
          ${buttonBaseClass}
          ${canGoPrev ? enabledClass : disabledClass}
          bg-[var(--bg-tertiary)]
        `}
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
        aria-label="Período anterior"
        data-testid="time-selector-prev"
      >
        <ChevronLeft
          size={14}
          style={{ color: 'var(--text-secondary)' }}
        />
      </button>

      {/* Current value */}
      <span
        className="text-xs font-medium min-w-[70px] text-center"
        style={{ color: 'var(--text-secondary)' }}
        data-testid="time-selector-value"
      >
        {value}
      </span>

      {/* Next arrow */}
      <button
        type="button"
        onClick={handleNext}
        disabled={!canGoNext}
        className={`
          ${buttonBaseClass}
          ${canGoNext ? enabledClass : disabledClass}
          bg-[var(--bg-tertiary)]
        `}
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
        aria-label="Período siguiente"
        data-testid="time-selector-next"
      >
        <ChevronRight
          size={14}
          style={{ color: 'var(--text-secondary)' }}
        />
      </button>
    </div>
  );
};

export default TimeSelector;
