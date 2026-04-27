/**
 * useSwipeNavigation Hook
 *
 * Custom hook for detecting horizontal swipe gestures to navigate between time periods.
 * Provides touch event handlers and swipe state for visual feedback.
 *
 * Story 14.9: Swipe Time Navigation
 * Epic 14: Core Implementation
 *
 * @example
 * const { onTouchStart, onTouchMove, onTouchEnd, isSwiping, swipeDirection, swipeProgress } = useSwipeNavigation({
 *   onSwipeLeft: () => goNextPeriod(),   // Forward in time
 *   onSwipeRight: () => goPrevPeriod(),  // Back in time
 *   threshold: 50,
 * });
 *
 * return (
 *   <div
 *     onTouchStart={onTouchStart}
 *     onTouchMove={onTouchMove}
 *     onTouchEnd={onTouchEnd}
 *   >
 *     {content}
 *   </div>
 * );
 */

import { useRef, useState, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration options for swipe navigation
 */
export interface SwipeNavigationOptions {
  /** Callback when user swipes left (forward in time) */
  onSwipeLeft?: () => void;
  /** Callback when user swipes right (back in time) */
  onSwipeRight?: () => void;
  /** Minimum travel distance in pixels to trigger swipe (default: 50) */
  threshold?: number;
  /** Enable/disable swipe detection (default: true) */
  enabled?: boolean;
  /**
   * Enable/disable haptic feedback (default: true).
   * Note: Consumers should check useReducedMotion() and set hapticEnabled: false
   * when reduced motion is preferred, as haptic feedback is a form of motion feedback.
   */
  hapticEnabled?: boolean;
}

/**
 * Return value from useSwipeNavigation hook
 *
 * @note Visual feedback (isSwiping, swipeDirection, swipeProgress, swipeOffset) is provided for consumers
 * to render swipe indicators. Consumers should check useReducedMotion() and skip animations
 * when reduced motion is preferred - this hook provides data but does not enforce motion settings.
 */
export interface SwipeNavigationResult {
  /** Touch start event handler */
  onTouchStart: (e: TouchEvent) => void;
  /** Touch move event handler */
  onTouchMove: (e: TouchEvent) => void;
  /** Touch end event handler */
  onTouchEnd: (e: TouchEvent) => void;
  /** Whether a swipe is currently in progress */
  isSwiping: boolean;
  /** Current swipe direction (null if not swiping) */
  swipeDirection: 'left' | 'right' | null;
  /** Swipe progress as 0-1 value (relative to threshold). Use for opacity/transform when !prefersReducedMotion */
  swipeProgress: number;
  /** Story 14.13 Session 6: Raw pixel offset for live transform feedback (positive = right, negative = left) */
  swipeOffset: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Default swipe threshold in pixels (AC #1 requirement: 50px minimum) */
const DEFAULT_THRESHOLD = 50;

/** Minimum horizontal movement before activating swipe mode */
const ACTIVATION_THRESHOLD = 10;

/** Haptic feedback duration in milliseconds (brief, per AC #5) */
const HAPTIC_DURATION = 10;

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for horizontal swipe gesture detection with time period navigation.
 *
 * Features:
 * - Configurable threshold (AC #1)
 * - Left swipe = forward, Right swipe = back (AC #2)
 * - Visual feedback state (AC #3)
 * - Haptic feedback on success (AC #5)
 * - Scroll conflict prevention (AC #6)
 */
export function useSwipeNavigation(
  options: SwipeNavigationOptions
): SwipeNavigationResult {
  const {
    onSwipeLeft,
    onSwipeRight,
    threshold = DEFAULT_THRESHOLD,
    enabled = true,
    hapticEnabled = true,
  } = options;

  // Track touch start position
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  // Track if direction is locked (AC #6: scroll conflict prevention)
  const directionLocked = useRef<boolean>(false);
  const isHorizontal = useRef<boolean>(false);

  // State for visual feedback
  const [isSwiping, setIsSwiping] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(
    null
  );
  const [swipeProgress, setSwipeProgress] = useState(0);
  // Story 14.13 Session 6: Raw pixel offset for live transform
  const [swipeOffset, setSwipeOffset] = useState(0);

  /**
   * Handle touch start - record initial position
   */
  const onTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;

      startX.current = e.touches[0].clientX;
      startY.current = e.touches[0].clientY;
      directionLocked.current = false;
      isHorizontal.current = false;
    },
    [enabled]
  );

  /**
   * Handle touch move - detect direction and update progress
   */
  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;
      if (startX.current === null || startY.current === null) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;

      const diffX = currentX - startX.current;
      const diffY = currentY - startY.current;

      // If direction not locked yet, determine if horizontal or vertical
      if (!directionLocked.current) {
        // AC #6: If vertical movement is greater, abort swipe (it's a scroll)
        if (Math.abs(diffY) > Math.abs(diffX)) {
          startX.current = null;
          startY.current = null;
          setIsSwiping(false);
          setSwipeDirection(null);
          setSwipeProgress(0);
          return;
        }

        // Horizontal movement detected - lock direction
        if (Math.abs(diffX) > ACTIVATION_THRESHOLD) {
          directionLocked.current = true;
          isHorizontal.current = true;
        }
      }

      // If we've determined this is a horizontal swipe
      if (isHorizontal.current) {
        setIsSwiping(true);
        // Try to prevent scroll, but handle passive event listeners gracefully
        // React's synthetic events are passive by default, so this may not work
        try {
          if (e.cancelable) {
            e.preventDefault();
          }
        } catch {
          // Ignore - passive event listeners can't be prevented
        }

        // Update direction
        setSwipeDirection(diffX < 0 ? 'left' : 'right');

        // Update progress (0-1, capped at 1)
        const progress = Math.min(Math.abs(diffX) / threshold, 1);
        setSwipeProgress(progress);

        // Story 14.13 Session 6: Update raw pixel offset for live transform
        setSwipeOffset(diffX);
      }
    },
    [enabled, threshold]
  );

  /**
   * Handle touch end - trigger callbacks if threshold met
   */
  const onTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;
      if (startX.current === null) {
        // Reset state even if no start
        setIsSwiping(false);
        setSwipeDirection(null);
        setSwipeProgress(0);
        return;
      }

      const endX = e.changedTouches[0].clientX;
      const diffX = endX - startX.current;

      // Check if threshold met
      if (Math.abs(diffX) >= threshold) {
        // Trigger appropriate callback (AC #2: left = forward, right = back)
        if (diffX < 0) {
          onSwipeLeft?.();
        } else {
          onSwipeRight?.();
        }

        // Trigger haptic feedback (AC #5)
        if (hapticEnabled && navigator.vibrate) {
          navigator.vibrate(HAPTIC_DURATION);
        }
      }

      // Reset all state
      startX.current = null;
      startY.current = null;
      directionLocked.current = false;
      isHorizontal.current = false;
      setIsSwiping(false);
      setSwipeDirection(null);
      setSwipeProgress(0);
      setSwipeOffset(0);
    },
    [enabled, threshold, onSwipeLeft, onSwipeRight, hapticEnabled]
  );

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    isSwiping,
    swipeDirection,
    swipeProgress,
    swipeOffset,
  };
}
