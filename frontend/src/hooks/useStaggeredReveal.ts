/**
 * useStaggeredReveal Hook
 *
 * Story 11.3: Animated Item Reveal
 * Epic 11: Quick Save & Scan Flow Optimization
 *
 * Progressively reveals items in a list with staggered timing.
 * Creates a dynamic animation effect where items appear one-by-one.
 *
 * Features:
 * - Configurable stagger delay between items (default: 100ms)
 * - Initial delay before animation starts (default: 300ms)
 * - Maximum animation duration cap (default: 2500ms)
 * - Respects prefers-reduced-motion (shows all immediately)
 * - Handles empty arrays and mid-animation item updates
 *
 * @example
 * ```tsx
 * const { visibleItems, isComplete } = useStaggeredReveal(items, {
 *   staggerMs: 100,
 *   initialDelayMs: 300
 * });
 *
 * return (
 *   <>
 *     {visibleItems.map((item, i) => (
 *       <AnimatedItem key={i}>{item.name}</AnimatedItem>
 *     ))}
 *     {isComplete && <Button>Save</Button>}
 *   </>
 * );
 * ```
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useReducedMotion } from './useReducedMotion';

export interface StaggeredRevealOptions {
  /** Delay in ms between each item appearing (default: 100) */
  staggerMs?: number;
  /** Initial delay before first item appears (default: 300) */
  initialDelayMs?: number;
  /** Maximum total animation duration in ms (default: 2500) */
  maxDurationMs?: number;
}

export interface StaggeredRevealResult<T> {
  /** Items that should be visible so far */
  visibleItems: T[];
  /** Number of items currently visible */
  visibleCount: number;
  /** Whether all items have been revealed */
  isComplete: boolean;
  /** Reset the animation (useful for re-triggering) */
  reset: () => void;
}

const DEFAULT_OPTIONS: Required<StaggeredRevealOptions> = {
  staggerMs: 100,
  initialDelayMs: 300,
  maxDurationMs: 2500,
};

/**
 * Hook to progressively reveal items with staggered animation timing.
 *
 * @param items - The array of items to reveal
 * @param options - Configuration for timing
 * @returns Object with visibleItems, isComplete, and reset function
 */
export function useStaggeredReveal<T>(
  items: T[],
  options: StaggeredRevealOptions = {}
): StaggeredRevealResult<T> {
  const prefersReducedMotion = useReducedMotion();
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const { staggerMs, initialDelayMs, maxDurationMs } = mergedOptions;

  // Track visible count
  const [visibleCount, setVisibleCount] = useState(0);

  // Track if animation has started for this set of items
  const animationStartedRef = useRef(false);
  const initialTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Track the items length to detect changes
  const itemsLengthRef = useRef(items.length);

  // Reset function to restart animation
  const reset = useCallback(() => {
    // Clear existing timers
    if (initialTimeoutRef.current) {
      clearTimeout(initialTimeoutRef.current);
      initialTimeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    animationStartedRef.current = false;
    setVisibleCount(0);
  }, []);

  useEffect(() => {
    // If items length changed, reset the animation
    if (itemsLengthRef.current !== items.length) {
      itemsLengthRef.current = items.length;
      // Only reset if we haven't completed yet
      if (visibleCount < items.length) {
        reset();
      }
    }
  }, [items.length, visibleCount, reset]);

  useEffect(() => {
    // Handle empty array
    if (items.length === 0) {
      setVisibleCount(0);
      return;
    }

    // If reduced motion preferred, show all immediately
    if (prefersReducedMotion) {
      setVisibleCount(items.length);
      return;
    }

    // If animation already started for this set, don't restart
    if (animationStartedRef.current) {
      // But ensure we reveal any new items if items were added
      if (visibleCount < items.length) {
        // Continue revealing new items
        const revealRemaining = () => {
          intervalRef.current = setInterval(() => {
            setVisibleCount(prev => {
              if (prev >= items.length) {
                if (intervalRef.current) {
                  clearInterval(intervalRef.current);
                  intervalRef.current = null;
                }
                return prev;
              }
              return prev + 1;
            });
          }, staggerMs);
        };
        revealRemaining();
      }
      return;
    }

    // Mark animation as started
    animationStartedRef.current = true;

    // Calculate adjusted stagger to fit within max duration
    // If items.length * staggerMs > maxDurationMs, reduce stagger
    const totalItemsTime = items.length * staggerMs;
    const availableTime = maxDurationMs - initialDelayMs;
    const adjustedStagger = totalItemsTime > availableTime
      ? Math.floor(availableTime / items.length)
      : staggerMs;

    // Start with initial delay
    initialTimeoutRef.current = setTimeout(() => {
      // Reveal first item
      setVisibleCount(1);

      // If only one item, we're done
      if (items.length === 1) return;

      // Set up interval for remaining items
      intervalRef.current = setInterval(() => {
        setVisibleCount(prev => {
          if (prev >= items.length) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            return prev;
          }
          return prev + 1;
        });
      }, adjustedStagger);
    }, initialDelayMs);

    // Cleanup
    return () => {
      if (initialTimeoutRef.current) {
        clearTimeout(initialTimeoutRef.current);
        initialTimeoutRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [items.length, prefersReducedMotion, staggerMs, initialDelayMs, maxDurationMs, visibleCount]);

  return {
    visibleItems: items.slice(0, visibleCount),
    visibleCount,
    isComplete: visibleCount >= items.length,
    reset,
  };
}

export default useStaggeredReveal;
