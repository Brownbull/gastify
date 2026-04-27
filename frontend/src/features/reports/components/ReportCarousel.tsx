/**
 * ReportCarousel Component
 *
 * Story 14.16: Weekly Report Story Format
 * Epic 14: Core Implementation
 *
 * Instagram-style swipeable carousel for navigating through report cards.
 * Uses useSwipeNavigation hook from Story 14.9 for touch gesture support.
 *
 * AC #2: Swipeable carousel with horizontal navigation between cards
 * AC #7: Progress dots showing current position in card stack
 *
 * @example
 * ```tsx
 * <ReportCarousel
 *   cards={generateReportCards(weeklyData)}
 *   onCardChange={(index) => setCurrentCard(index)}
 * />
 * ```
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { ReportCard } from './ReportCard';
import type { ReportCard as ReportCardType } from '@/types/report';

/**
 * Props for ReportCarousel component
 */
export interface ReportCarouselProps {
  /** Array of card data to display */
  cards: ReportCardType[];
  /** Starting card index */
  initialIndex?: number;
  /** Callback when active card changes */
  onCardChange?: (index: number) => void;
  /** Optional additional CSS classes */
  className?: string;
}

/**
 * Progress dots component
 */
interface ProgressDotsProps {
  totalDots: number;
  activeIndex: number;
  onDotClick: (index: number) => void;
  reducedMotion: boolean;
}

const ProgressDots: React.FC<ProgressDotsProps> = ({
  totalDots,
  activeIndex,
  onDotClick,
  reducedMotion,
}) => {
  return (
    <div
      className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2"
      data-testid="progress-dots-container"
      role="tablist"
      aria-label="Navegación de tarjetas"
    >
      {Array.from({ length: totalDots }, (_, index) => (
        <button
          key={index}
          onClick={() => onDotClick(index)}
          className={`
            w-2.5 h-2.5 rounded-full
            ${index === activeIndex
              ? 'bg-primary w-6'
              : 'bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
            }
            ${reducedMotion ? '' : 'transition-all duration-200'}
            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
          `}
          data-testid="progress-dot"
          role="tab"
          aria-selected={index === activeIndex}
          aria-label={`Ir a tarjeta ${index + 1} de ${totalDots}`}
          tabIndex={index === activeIndex ? 0 : -1}
        />
      ))}
    </div>
  );
};

/**
 * ReportCarousel component
 *
 * Provides a swipeable carousel interface for browsing report cards.
 * Supports touch gestures, keyboard navigation, and progress indicators.
 */
export const ReportCarousel: React.FC<ReportCarouselProps> = ({
  cards,
  initialIndex = 0,
  onCardChange,
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  // Current card index
  const [currentIndex, setCurrentIndex] = useState(
    Math.min(initialIndex, Math.max(0, cards.length - 1))
  );

  // Navigate to next card
  const goNext = useCallback(() => {
    if (currentIndex < cards.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      onCardChange?.(newIndex);
    }
  }, [currentIndex, cards.length, onCardChange]);

  // Navigate to previous card
  const goPrevious = useCallback(() => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      onCardChange?.(newIndex);
    }
  }, [currentIndex, onCardChange]);

  // Navigate to specific card
  const goToCard = useCallback(
    (index: number) => {
      if (index >= 0 && index < cards.length) {
        setCurrentIndex(index);
        onCardChange?.(index);
      }
    },
    [cards.length, onCardChange]
  );

  // Setup swipe navigation (AC #2)
  const { onTouchStart, onTouchMove, onTouchEnd } = useSwipeNavigation({
    onSwipeLeft: goNext, // Swipe left = forward (next card)
    onSwipeRight: goPrevious, // Swipe right = back (previous card)
    threshold: 50,
    enabled: cards.length > 1,
    hapticEnabled: !prefersReducedMotion,
  });

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
          goNext();
          e.preventDefault();
          break;
        case 'ArrowLeft':
          goPrevious();
          e.preventDefault();
          break;
        case 'Home':
          goToCard(0);
          e.preventDefault();
          break;
        case 'End':
          goToCard(cards.length - 1);
          e.preventDefault();
          break;
      }
    },
    [goNext, goPrevious, goToCard, cards.length]
  );

  // Create touch event wrapper that converts React event to native TouchEvent
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      onTouchStart(e.nativeEvent);
    },
    [onTouchStart]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      onTouchMove(e.nativeEvent);
    },
    [onTouchMove]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      onTouchEnd(e.nativeEvent);
    },
    [onTouchEnd]
  );

  // Focus carousel on mount for keyboard navigation
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // Empty state
  if (cards.length === 0) {
    return (
      <div
        className={`flex items-center justify-center min-h-[400px] ${className}`}
        data-testid="report-carousel"
      >
        <p className="text-slate-500 dark:text-slate-400">
          No hay datos para mostrar
        </p>
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  return (
    <div
      ref={containerRef}
      className={`
        relative w-full min-h-[500px]
        flex flex-col
        ${className}
      `}
      data-testid="report-carousel"
      data-swipe-enabled="true"
      role="region"
      aria-roledescription="carousel"
      aria-label="Resumen semanal de gastos"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Card position indicator for accessibility */}
      <div className="sr-only" aria-live="polite">
        Mostrando tarjeta {currentIndex + 1} de {cards.length}
      </div>

      {/* Visual position indicator */}
      <div className="text-center text-sm text-slate-500 dark:text-slate-400 mb-2">
        {currentIndex + 1} de {cards.length}
      </div>

      {/* Card container with slide animation */}
      <div
        className={`
          flex-1 relative overflow-hidden
          ${prefersReducedMotion ? '' : 'transition-transform duration-300 ease-out'}
        `}
      >
        {/* Current card */}
        <div
          className={`
            absolute inset-0
            ${prefersReducedMotion
              ? ''
              : 'transition-opacity duration-300 ease-out'
            }
          `}
          style={{
            opacity: 1,
            transform: 'translateX(0)',
          }}
        >
          <ReportCard
            key={currentCard.id}
            card={currentCard}
            isActive={true}
          />
        </div>
      </div>

      {/* Progress dots (AC #7) */}
      {cards.length > 1 && (
        <ProgressDots
          totalDots={cards.length}
          activeIndex={currentIndex}
          onDotClick={goToCard}
          reducedMotion={prefersReducedMotion}
        />
      )}
    </div>
  );
};

export default ReportCarousel;
