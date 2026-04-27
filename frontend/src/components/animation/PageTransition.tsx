/**
 * PageTransition Component
 *
 * Story 14.2: Screen Transition System
 * Epic 14: Core Implementation
 *
 * Provides smooth screen transitions with staggered content entry.
 * Wraps route/view components to apply animations on navigation.
 *
 * Features:
 * - Slide animations based on navigation direction
 * - Staggered child entry using TransitionChild components
 * - Settings screen exception (instant load, no animation)
 * - Respects prefers-reduced-motion accessibility preference
 * - CSS-based animations for GPU acceleration
 *
 * @example
 * ```tsx
 * // Wrap view content
 * <PageTransition viewKey="dashboard" direction="forward">
 *   <DashboardContent />
 * </PageTransition>
 *
 * // Settings exception - instant load
 * <PageTransition viewKey="settings">
 *   <SettingsContent />
 * </PageTransition>
 * ```
 *
 * @see docs/uxui/motion-design-system.md Section 2
 */

import React, { ReactNode, useEffect, useState, useRef } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { DURATION, EASING } from './constants';
import type { NavigationDirection } from './useNavigationDirection';

// Re-export NavigationDirection from canonical location
export type { NavigationDirection } from './useNavigationDirection';

/**
 * Props for PageTransition component
 */
export interface PageTransitionProps {
  /**
   * Content to render with transition
   */
  children: ReactNode;

  /**
   * Unique key identifying the current view (used to detect changes)
   */
  viewKey: string;

  /**
   * Navigation direction for slide animation
   * - 'forward': Slide in from right (new content)
   * - 'back': Slide in from left (returning to previous)
   * - 'none': No slide, just fade (tab switches)
   * @default 'forward'
   */
  direction?: NavigationDirection;

  /**
   * Skip animation entirely (for Settings screen exception)
   * @default false (auto-detected for 'settings' viewKey)
   */
  skipAnimation?: boolean;

  /**
   * Duration of the transition in milliseconds
   * @default DURATION.SLOW (300ms)
   */
  duration?: number;

  /**
   * CSS easing function
   * @default EASING.OUT
   */
  easing?: string;

  /**
   * Callback when transition animation starts
   */
  onTransitionStart?: () => void;

  /**
   * Callback when transition animation ends
   */
  onTransitionEnd?: () => void;

  /**
   * Custom class name for the container
   */
  className?: string;
}

/**
 * Views that should load instantly without animation
 * Per motion-design-system.md Section 7: Settings Exception
 */
const INSTANT_LOAD_VIEWS = ['settings'];

/**
 * Check if a view should skip animation
 */
function shouldSkipAnimation(viewKey: string): boolean {
  return INSTANT_LOAD_VIEWS.some(
    (view) => viewKey.toLowerCase().includes(view)
  );
}

/**
 * PageTransition Component
 *
 * Applies slide and fade animations to screen transitions.
 * Automatically skips animation for Settings screen.
 */
export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  viewKey,
  direction = 'forward',
  skipAnimation,
  duration = DURATION.SLOW,
  easing = EASING.OUT,
  onTransitionStart,
  onTransitionEnd,
  className = '',
}) => {
  const prefersReducedMotion = useReducedMotion();

  // Track animation state
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevViewKeyRef = useRef<string>(viewKey);

  // Determine if animation should be skipped
  const shouldSkip =
    skipAnimation ??
    (shouldSkipAnimation(viewKey) || prefersReducedMotion);

  // Detect view changes and trigger animation
  useEffect(() => {
    // Skip if same view or animation disabled
    if (prevViewKeyRef.current === viewKey) {
      return;
    }

    prevViewKeyRef.current = viewKey;

    // Skip animation for instant-load views or reduced motion
    if (shouldSkip) {
      setIsAnimating(false);
      return;
    }

    // Trigger animation
    setIsAnimating(true);
    onTransitionStart?.();

    // End animation after duration
    const timer = setTimeout(() => {
      setIsAnimating(false);
      onTransitionEnd?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [viewKey, shouldSkip, duration, onTransitionStart, onTransitionEnd]);

  // Build animation styles
  const getAnimationStyle = (): React.CSSProperties => {
    // No animation if skipped or not animating
    if (shouldSkip || !isAnimating) {
      return {
        opacity: 1,
        transform: 'translateX(0)',
      };
    }

    // Handle 'none' direction - fade only, no slide (for tab switches)
    // Per motion-design-system.md Section 2.1: "Tab | Tab | Fade crossfade | 150ms"
    if (direction === 'none') {
      return {
        animation: `pageTransitionFade ${duration}ms ${easing} forwards`,
      };
    }

    // Determine slide direction
    // Forward = entering from right (positive X start)
    // Back = entering from left (negative X start)
    const translateStart = direction === 'forward' ? '30px' : '-30px';

    return {
      animation: `pageTransition ${duration}ms ${easing} forwards`,
      '--translate-start': translateStart,
    } as React.CSSProperties;
  };

  return (
    <div
      ref={containerRef}
      className={`page-transition ${className}`.trim()}
      style={{
        ...getAnimationStyle(),
        willChange: isAnimating ? 'transform, opacity' : 'auto',
      }}
      data-view={viewKey}
      data-animating={isAnimating}
    >
      {children}
    </div>
  );
};

/**
 * CSS keyframes for page transition
 * These should be added to the global CSS file
 *
 * @keyframes pageTransition {
 *   from {
 *     opacity: 0;
 *     transform: translateX(var(--translate-start, 30px));
 *   }
 *   to {
 *     opacity: 1;
 *     transform: translateX(0);
 *   }
 * }
 */

export default PageTransition;
