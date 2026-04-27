/**
 * TransitionChild Component
 *
 * Story 14.2: Screen Transition System
 * Epic 14: Core Implementation
 *
 * Wrapper component for individual items within a PageTransition.
 * Applies staggered fade-in + slide-up animation based on index.
 *
 * Features:
 * - Staggered animation delays based on item index
 * - Automatic compression for long lists (max 2500ms total)
 * - Respects prefers-reduced-motion
 * - Uses GPU-accelerated transforms
 *
 * @example
 * ```tsx
 * // Wrap list items for staggered reveal
 * <PageTransition viewKey="dashboard">
 *   {items.map((item, index) => (
 *     <TransitionChild key={item.id} index={index} totalItems={items.length}>
 *       <ItemCard item={item} />
 *     </TransitionChild>
 *   ))}
 * </PageTransition>
 * ```
 *
 * @see docs/uxui/motion-design-system.md Section 4
 */

import React, { ReactNode, useMemo } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { DURATION, EASING, STAGGER } from './constants';

/**
 * Props for TransitionChild component
 */
export interface TransitionChildProps {
  /**
   * Content to render with staggered animation
   */
  children: ReactNode;

  /**
   * Index of this item in the list (0-based)
   */
  index: number;

  /**
   * Total number of items (for max duration calculation)
   */
  totalItems?: number;

  /**
   * Whether to enable animation
   * @default true (unless reduced motion preferred)
   */
  enabled?: boolean;

  /**
   * Delay between items in milliseconds
   * @default STAGGER.DEFAULT (100ms)
   */
  staggerMs?: number;

  /**
   * Initial delay before first item in milliseconds
   * @default STAGGER.INITIAL_DELAY (300ms)
   */
  initialDelayMs?: number;

  /**
   * Maximum total duration in milliseconds
   * @default STAGGER.MAX_DURATION (2500ms)
   */
  maxDurationMs?: number;

  /**
   * Duration of individual item animation
   * @default DURATION.NORMAL (200ms)
   */
  animationDuration?: number;

  /**
   * Custom class name
   */
  className?: string;

  /**
   * Custom inline styles
   */
  style?: React.CSSProperties;
}

/**
 * Calculate stagger delay with compression for long lists
 */
function calculateDelay(
  index: number,
  totalItems: number,
  staggerMs: number,
  initialDelayMs: number,
  maxDurationMs: number
): number {
  // Calculate base delay
  const baseDelay = initialDelayMs + index * staggerMs;

  // If no total items provided, use base delay
  if (!totalItems || totalItems <= 1) {
    return baseDelay;
  }

  // Check if total duration exceeds max
  const totalTime = initialDelayMs + (totalItems - 1) * staggerMs;

  if (totalTime > maxDurationMs) {
    // Compress stagger to fit within max duration
    const availableTime = maxDurationMs - initialDelayMs;
    const compressedStagger = availableTime / (totalItems - 1);
    return initialDelayMs + index * compressedStagger;
  }

  return baseDelay;
}

/**
 * TransitionChild Component
 *
 * Applies staggered fade-in and slide-up animation to a child element.
 * Use within PageTransition for coordinated staggered reveals.
 */
export const TransitionChild: React.FC<TransitionChildProps> = ({
  children,
  index,
  totalItems,
  enabled = true,
  staggerMs = STAGGER.DEFAULT,
  initialDelayMs = STAGGER.INITIAL_DELAY,
  maxDurationMs = STAGGER.MAX_DURATION,
  animationDuration = DURATION.NORMAL,
  className = '',
  style,
}) => {
  const prefersReducedMotion = useReducedMotion();

  // Skip animation if disabled or reduced motion preferred
  const shouldAnimate = enabled && !prefersReducedMotion;

  // Calculate delay for this item
  const delay = useMemo(() => {
    if (!shouldAnimate) return 0;
    return calculateDelay(
      index,
      totalItems ?? index + 1,
      staggerMs,
      initialDelayMs,
      maxDurationMs
    );
  }, [shouldAnimate, index, totalItems, staggerMs, initialDelayMs, maxDurationMs]);

  // Build animation styles
  const animationStyle = useMemo((): React.CSSProperties => {
    if (!shouldAnimate) {
      return {
        opacity: 1,
        transform: 'translateY(0)',
        ...style,
      };
    }

    return {
      opacity: 0,
      animation: `transitionChildReveal ${animationDuration}ms ${EASING.OUT} forwards`,
      animationDelay: `${delay}ms`,
      willChange: 'transform, opacity',
      ...style,
    };
  }, [shouldAnimate, animationDuration, delay, style]);

  return (
    <div
      className={`transition-child ${className}`.trim()}
      style={animationStyle}
      data-index={index}
      data-delay={shouldAnimate ? delay : undefined}
    >
      {children}
    </div>
  );
};

/**
 * CSS keyframes for transition child reveal
 * These should be added to the global CSS file
 *
 * @keyframes transitionChildReveal {
 *   from {
 *     opacity: 0;
 *     transform: translateY(20px);
 *   }
 *   to {
 *     opacity: 1;
 *     transform: translateY(0);
 *   }
 * }
 */

export default TransitionChild;
