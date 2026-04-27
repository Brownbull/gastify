/**
 * AnimatedItem Component
 *
 * Story 11.3: Animated Item Reveal
 * Epic 11: Quick Save & Scan Flow Optimization
 *
 * Wrapper component that applies fade-in + slide-up animation to children.
 * Uses GPU-accelerated CSS transforms for smooth 60fps animations.
 *
 * Animation properties:
 * - Initial: opacity: 0, translateY: 20px
 * - Final: opacity: 1, translateY: 0
 * - Duration: 200ms
 * - Easing: ease-out
 *
 * @example
 * ```tsx
 * <AnimatedItem delay={100} index={0}>
 *   <ItemRow item={item} />
 * </AnimatedItem>
 * ```
 */

import React, { ReactNode } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

export interface AnimatedItemProps {
  /** Content to animate */
  children: ReactNode;
  /** Delay before animation starts in ms (for staggering) */
  delay?: number;
  /** Optional additional CSS classes */
  className?: string;
  /** Index for key generation and accessibility */
  index?: number;
  /** Test ID for testing */
  testId?: string;
}

/**
 * AnimatedItem wraps content with a fade-in slide-up animation.
 *
 * Features:
 * - Configurable delay for staggered reveals
 * - Respects prefers-reduced-motion
 * - Uses GPU-accelerated transforms
 * - Supports custom className
 */
export const AnimatedItem: React.FC<AnimatedItemProps> = ({
  children,
  delay = 0,
  className = '',
  index,
  testId,
}) => {
  const prefersReducedMotion = useReducedMotion();

  // If reduced motion is preferred, render without animation
  if (prefersReducedMotion) {
    return (
      <div
        className={className}
        data-testid={testId}
        data-index={index}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={`animate-item-reveal ${className}`}
      style={{
        animationDelay: `${delay}ms`,
        // Start hidden, animation will reveal
        opacity: 0,
      }}
      data-testid={testId}
      data-index={index}
    >
      {children}
    </div>
  );
};

export default AnimatedItem;
