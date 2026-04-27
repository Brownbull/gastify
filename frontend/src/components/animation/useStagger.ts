/**
 * useStagger Hook
 *
 * Story 14.1: Animation Framework
 * Epic 14: Core Implementation
 *
 * Utility hook for calculating stagger delays in list animations.
 * Provides a simpler API than useStaggeredReveal for cases where
 * you only need delay calculations, not the full reveal state.
 *
 * Features:
 * - Calculate delays for any number of items
 * - Automatic compression for long lists (caps at max duration)
 * - Respects prefers-reduced-motion
 * - CSS and JS delay values
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { getDelay, getCSSDelay, totalDuration } = useStagger(10);
 *
 * return items.map((item, i) => (
 *   <div style={{ animationDelay: getCSSDelay(i) }} className="animate-reveal">
 *     {item.name}
 *   </div>
 * ));
 *
 * // With custom options
 * const stagger = useStagger(items.length, {
 *   staggerMs: 50,
 *   initialDelayMs: 200,
 *   maxDurationMs: 1500,
 * });
 * ```
 *
 * @see docs/uxui/motion-design-system.md Section 4
 */

import { useMemo, useCallback } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { STAGGER } from './constants';

/**
 * Options for useStagger hook
 */
export interface UseStaggerOptions {
  /**
   * Delay between items in milliseconds
   * @default 100 (STAGGER.DEFAULT)
   */
  staggerMs?: number;

  /**
   * Initial delay before first item in milliseconds
   * @default 0
   */
  initialDelayMs?: number;

  /**
   * Maximum total duration in milliseconds
   * When exceeded, stagger delays are compressed proportionally
   * @default 2500 (STAGGER.MAX_DURATION)
   */
  maxDurationMs?: number;

  /**
   * Whether stagger calculations are enabled
   * @default true (unless reduced motion preferred)
   */
  enabled?: boolean;
}

/**
 * Return value from useStagger hook
 */
export interface UseStaggerResult {
  /**
   * Get delay in milliseconds for an item at given index
   * @param index - Item index (0-based)
   * @returns Delay in milliseconds
   */
  getDelay: (index: number) => number;

  /**
   * Get CSS delay string for an item at given index
   * @param index - Item index (0-based)
   * @returns CSS delay string (e.g., "100ms")
   */
  getCSSDelay: (index: number) => string;

  /**
   * The actual stagger delay being used (may be compressed)
   */
  effectiveStagger: number;

  /**
   * Total duration of the stagger animation for all items
   */
  totalDuration: number;

  /**
   * Whether stagger is active (false if reduced motion preferred)
   */
  isActive: boolean;

  /**
   * Array of delays for all items (convenience for mapping)
   */
  delays: number[];
}

/**
 * Hook for calculating stagger delays
 *
 * @param itemCount - Number of items to stagger
 * @param options - Configuration options
 * @returns Object with delay calculation functions and values
 */
export function useStagger(
  itemCount: number,
  options: UseStaggerOptions = {}
): UseStaggerResult {
  const prefersReducedMotion = useReducedMotion();

  const {
    staggerMs = STAGGER.DEFAULT,
    initialDelayMs = 0,
    maxDurationMs = STAGGER.MAX_DURATION,
    enabled = true,
  } = options;

  // Stagger is active only if enabled and not reduced motion
  const isActive = enabled && !prefersReducedMotion;

  // Calculate effective stagger (compressed if needed)
  const effectiveStagger = useMemo(() => {
    if (!isActive || itemCount <= 1) {
      return 0;
    }

    // Check if total duration exceeds max
    const totalTime = initialDelayMs + (itemCount - 1) * staggerMs;
    const availableTime = maxDurationMs - initialDelayMs;

    if (totalTime > maxDurationMs && itemCount > 1) {
      // Compress stagger to fit within max duration
      return Math.floor(availableTime / (itemCount - 1));
    }

    return staggerMs;
  }, [isActive, itemCount, staggerMs, initialDelayMs, maxDurationMs]);

  // Total duration for all items
  const totalDuration = useMemo(() => {
    if (!isActive || itemCount <= 0) {
      return 0;
    }
    return initialDelayMs + (itemCount - 1) * effectiveStagger;
  }, [isActive, itemCount, initialDelayMs, effectiveStagger]);

  // Get delay for a specific index
  const getDelay = useCallback(
    (index: number): number => {
      if (!isActive || index < 0) {
        return 0;
      }
      return initialDelayMs + index * effectiveStagger;
    },
    [isActive, initialDelayMs, effectiveStagger]
  );

  // Get CSS delay string
  const getCSSDelay = useCallback(
    (index: number): string => {
      return `${getDelay(index)}ms`;
    },
    [getDelay]
  );

  // Pre-calculated array of delays
  const delays = useMemo(() => {
    if (!isActive || itemCount <= 0) {
      return Array(Math.max(0, itemCount)).fill(0);
    }
    return Array.from({ length: itemCount }, (_, i) => getDelay(i));
  }, [isActive, itemCount, getDelay]);

  return {
    getDelay,
    getCSSDelay,
    effectiveStagger,
    totalDuration,
    isActive,
    delays,
  };
}

/**
 * Calculate stagger delay for a single item (utility function)
 * Useful when you don't need the full hook
 *
 * **IMPORTANT:** This utility function does NOT automatically check for
 * prefers-reduced-motion. For accessibility compliance, callers should either:
 * 1. Use the `useStagger` hook instead (automatically handles reduced motion)
 * 2. Pass `enabled: false` when reduced motion is preferred
 * 3. Check `useReducedMotion()` before calling this function
 *
 * @param index - Item index (0-based)
 * @param totalItems - Total number of items
 * @param options - Stagger options (set enabled: false for reduced motion)
 * @returns Delay in milliseconds (0 if enabled is false)
 */
export function calculateStaggerDelay(
  index: number,
  totalItems: number,
  options: UseStaggerOptions = {}
): number {
  const {
    staggerMs = STAGGER.DEFAULT,
    initialDelayMs = 0,
    maxDurationMs = STAGGER.MAX_DURATION,
    enabled = true,
  } = options;

  if (!enabled || index < 0 || totalItems <= 0) {
    return 0;
  }

  // Check if compression needed
  const totalTime = initialDelayMs + (totalItems - 1) * staggerMs;

  if (totalTime > maxDurationMs && totalItems > 1) {
    const availableTime = maxDurationMs - initialDelayMs;
    const compressedStagger = availableTime / (totalItems - 1);
    return initialDelayMs + index * compressedStagger;
  }

  return initialDelayMs + index * staggerMs;
}

export default useStagger;
