/**
 * useCountUp Hook
 *
 * Story 14.8: Enhanced Existing Charts
 * Epic 14: Core Implementation
 *
 * Provides animated count-up effect for money values.
 * Animates from 0 (or startValue) to target value with ease-out curve.
 *
 * Features:
 * - Configurable duration (default: 400ms)
 * - Ease-out curve for natural deceleration
 * - Respects prefers-reduced-motion
 * - Can be disabled via enabled option
 * - Optional start value for animating from non-zero
 *
 * @example
 * ```tsx
 * function TotalAmount({ value, currency }: Props) {
 *   const animatedValue = useCountUp(value, { duration: 400 });
 *   return <span>{formatCurrency(animatedValue, currency)}</span>;
 * }
 * ```
 *
 * @see docs/uxui/motion-design-system.md Section 5
 */

import { useState, useEffect, useRef } from 'react';
import { useReducedMotion } from './useReducedMotion';
import { DURATION } from '../components/animation/constants';

/**
 * Options for useCountUp hook
 */
export interface UseCountUpOptions {
  /**
   * Duration of the count-up animation in milliseconds
   * @default 400 (DURATION.SLOWER)
   */
  duration?: number;

  /**
   * Starting value for the animation
   * @default 0
   */
  startValue?: number;

  /**
   * Whether to enable the animation
   * @default true
   */
  enabled?: boolean;

  /**
   * Animation key - when this changes, the animation restarts
   * Useful for re-triggering animation on slide changes
   * @default undefined
   */
  key?: number;
}

/**
 * Ease-out cubic curve: fast start, gentle landing
 * 1 - (1 - t)^3
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Hook for animated count-up effect
 *
 * @param targetValue - The final value to animate to
 * @param options - Configuration options
 * @returns The current animated value (rounded to integer)
 */
export function useCountUp(
  targetValue: number,
  options: UseCountUpOptions = {}
): number {
  const prefersReducedMotion = useReducedMotion();

  const {
    duration = DURATION.SLOWER, // 400ms per motion-design-system.md
    startValue = 0,
    enabled = true,
    key: animationKey,
  } = options;

  // Skip animation if reduced motion preferred or disabled
  const shouldAnimate = enabled && !prefersReducedMotion;

  // If not animating, return target immediately
  const [currentValue, setCurrentValue] = useState(() =>
    shouldAnimate ? startValue : targetValue
  );

  // Track animation frame and start time
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // If animation disabled, set to target immediately
    if (!shouldAnimate) {
      setCurrentValue(targetValue);
      return;
    }

    // Reset start time for new animation
    startTimeRef.current = null;
    setCurrentValue(startValue);

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      // Calculate current value and round to integer
      const newValue = Math.round(
        startValue + (targetValue - startValue) * easedProgress
      );
      setCurrentValue(newValue);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // Ensure we end exactly at target
        setCurrentValue(targetValue);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [targetValue, duration, startValue, shouldAnimate, animationKey]);

  return currentValue;
}

export default useCountUp;
