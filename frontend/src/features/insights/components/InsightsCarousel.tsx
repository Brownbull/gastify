/**
 * InsightsCarousel - Swipeable carousel for highlighted insights
 *
 * Story 14.33b: View Switcher & Carousel Mode
 * @see docs/sprint-artifacts/epic14/stories/story-14.33b-view-switcher-carousel.md
 *
 * AC3: Carousel View Implementation
 * - Shows 3 "highlighted" insights (most recent CELEBRATORY or QUIRKY_FIRST)
 * - Horizontal swipe navigation between cards
 * - Dot indicators below carousel (active dot = --primary, 24px wide)
 * - Cards use InsightCard styling from mockup (larger format)
 *
 * AC5: Carousel Navigation
 * - Touch swipe gesture support (left/right)
 * - CSS transition: transform var(--transition-normal)
 * - Dot click navigates to specific slide
 * - "Desliza para ver mas insights" hint text below dots
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { toMillis } from '@/utils/timestamp';
import { MoveRight } from 'lucide-react';
import { InsightRecord, InsightCategory } from '@/types/insight';
import { InsightCardLarge } from './InsightCardLarge';

export interface InsightsCarouselProps {
  insights: InsightRecord[];
  onInsightClose?: (insight: InsightRecord) => void;
  theme: string;
  t: (key: string) => string;
}

/**
 * Select up to 3 insights for carousel based on priority:
 * 1. CELEBRATORY
 * 2. QUIRKY_FIRST
 * 3. ACTIONABLE
 * Within each category, sort by most recent first.
 */
export function selectHighlightedInsights(insights: InsightRecord[]): InsightRecord[] {
  const priority: InsightCategory[] = ['CELEBRATORY', 'QUIRKY_FIRST', 'ACTIONABLE'];

  // Sort by category priority, then by date (most recent first)
  const sorted = [...insights].sort((a, b) => {
    const aPriority = priority.indexOf(a.category || 'ACTIONABLE');
    const bPriority = priority.indexOf(b.category || 'ACTIONABLE');

    // -1 means not found, treat as lowest priority (after ACTIONABLE)
    const aPriorityNormalized = aPriority === -1 ? priority.length : aPriority;
    const bPriorityNormalized = bPriority === -1 ? priority.length : bPriority;

    if (aPriorityNormalized !== bPriorityNormalized) {
      return aPriorityNormalized - bPriorityNormalized;
    }

    // Same priority, sort by date descending (most recent first)
    return toMillis(b.shownAt) - toMillis(a.shownAt);
  });

  return sorted.slice(0, 3);
}

// Minimum swipe distance to trigger slide change (in pixels)
const SWIPE_THRESHOLD = 50;

export const InsightsCarousel: React.FC<InsightsCarouselProps> = ({
  insights,
  onInsightClose,
  theme,
  t,
}) => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  // Get highlighted insights for carousel
  const highlightedInsights = selectHighlightedInsights(insights);
  const slideCount = highlightedInsights.length;

  // Clamp active slide to valid range
  useEffect(() => {
    if (activeSlide >= slideCount && slideCount > 0) {
      setActiveSlide(slideCount - 1);
    }
  }, [slideCount, activeSlide]);

  // Navigate to specific slide
  const goToSlide = useCallback((index: number) => {
    if (index >= 0 && index < slideCount) {
      setActiveSlide(index);
    }
  }, [slideCount]);

  // Navigate to previous/next slide
  const goToPrevious = useCallback(() => {
    goToSlide(activeSlide - 1);
  }, [activeSlide, goToSlide]);

  const goToNext = useCallback(() => {
    goToSlide(activeSlide + 1);
  }, [activeSlide, goToSlide]);

  // Touch handlers for swipe
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setIsDragging(true);
    setTouchDelta(0);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStart === null) return;
    const currentX = e.touches[0].clientX;
    setTouchDelta(currentX - touchStart);
  }, [touchStart]);

  const handleTouchEnd = useCallback(() => {
    if (touchStart === null) return;

    // Determine swipe direction
    if (touchDelta < -SWIPE_THRESHOLD) {
      goToNext();
    } else if (touchDelta > SWIPE_THRESHOLD) {
      goToPrevious();
    }

    setTouchStart(null);
    setTouchDelta(0);
    setIsDragging(false);
  }, [touchStart, touchDelta, goToNext, goToPrevious]);

  // Mouse handlers for desktop drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setTouchStart(e.clientX);
    setIsDragging(true);
    setTouchDelta(0);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (touchStart === null || !isDragging) return;
    const currentX = e.clientX;
    setTouchDelta(currentX - touchStart);
  }, [touchStart, isDragging]);

  const handleMouseUp = useCallback(() => {
    if (touchStart === null) return;

    // Determine swipe direction
    if (touchDelta < -SWIPE_THRESHOLD) {
      goToNext();
    } else if (touchDelta > SWIPE_THRESHOLD) {
      goToPrevious();
    }

    setTouchStart(null);
    setTouchDelta(0);
    setIsDragging(false);
  }, [touchStart, touchDelta, goToNext, goToPrevious]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      handleMouseUp();
    }
  }, [isDragging, handleMouseUp]);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      goToPrevious();
      e.preventDefault();
    } else if (e.key === 'ArrowRight') {
      goToNext();
      e.preventDefault();
    }
  }, [goToPrevious, goToNext]);

  // Calculate transform including drag delta
  const getTransform = () => {
    const baseOffset = activeSlide * -100;
    // Convert touchDelta to percentage of container width
    if (trackRef.current && isDragging && touchDelta !== 0) {
      const containerWidth = trackRef.current.offsetWidth;
      const deltaPercent = (touchDelta / containerWidth) * 100;
      return `translateX(calc(${baseOffset}% + ${deltaPercent}%))`;
    }
    return `translateX(${baseOffset}%)`;
  };

  // Empty state
  if (highlightedInsights.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 text-center"
        style={{ color: 'var(--text-secondary)' }}
      >
        <p className="text-sm">{t('noHighlightedInsights') || 'No highlighted insights yet'}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
          {t('scanMoreForHighlights') || 'Scan more receipts to see highlights'}
        </p>
      </div>
    );
  }

  return (
    <div className="carousel-container">
      {/* Carousel viewport - focusable for keyboard navigation */}
      <div
        className="overflow-hidden rounded-xl outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        role="region"
        aria-label={t('carousel') || 'Carousel'}
        aria-roledescription="carousel"
      >
        <div
          ref={trackRef}
          className="flex"
          style={{
            transform: getTransform(),
            transition: isDragging ? 'none' : 'transform var(--transition-normal, 200ms ease)',
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
        >
          {highlightedInsights.map((insight, idx) => (
            <div
              key={`${insight.insightId}-${idx}`}
              className="flex-shrink-0 w-full px-1"
              style={{ minWidth: '100%' }}
            >
              <InsightCardLarge
                insight={insight}
                onClose={onInsightClose ? () => onInsightClose(insight) : undefined}
                theme={theme}
                t={t}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators - with 44px touch target for accessibility */}
      {slideCount > 1 && (
        <div
          className="flex justify-center gap-1 mt-3"
          role="tablist"
          aria-label={t('carouselSlides') || 'Carousel slides'}
        >
          {highlightedInsights.map((_, idx) => {
            const isActive = idx === activeSlide;
            return (
              <button
                key={idx}
                onClick={() => goToSlide(idx)}
                role="tab"
                aria-selected={isActive}
                aria-label={`${t('slide') || 'Slide'} ${idx + 1} ${t('of') || 'of'} ${slideCount}`}
                className="min-h-11 min-w-11 flex items-center justify-center"
              >
                {/* Visual dot indicator inside touch target */}
                <span
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: isActive ? '24px' : '8px',
                    backgroundColor: isActive ? 'var(--primary)' : 'var(--border-medium, #cbd5e1)',
                  }}
                />
              </button>
            );
          })}
        </div>
      )}

      {/* Swipe hint */}
      {slideCount > 1 && (
        <div
          className="flex items-center justify-center gap-1 mt-4 text-xs"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <MoveRight size={16} />
          <span>{t('swipeForMore') || 'Swipe for more insights'}</span>
        </div>
      )}
    </div>
  );
};
