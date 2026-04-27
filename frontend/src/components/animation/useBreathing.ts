/**
 * useBreathing Hook
 *
 * Story 14.1: Animation Framework
 * Epic 14: Core Implementation
 *
 * Provides breathing animation values (scale and opacity) for creating
 * subtle "alive" effects on UI elements. The animation follows a smooth
 * sine wave pattern.
 *
 * Features:
 * - Configurable cycle duration (default: 3s)
 * - Scale range: 1.00 → 1.02 → 1.00 (2% growth)
 * - Opacity range: 0.9 → 1.0 → 0.9
 * - Respects prefers-reduced-motion
 * - Can use context or standalone animation frame
 *
 * @example
 * ```tsx
 * function PolygonBreathing() {
 *   const { scale, opacity, style } = useBreathing();
 *
 *   return (
 *     <svg style={style}>
 *       <polygon ... />
 *     </svg>
 *   );
 * }
 *
 * // With custom duration
 * const { scale, opacity } = useBreathing({ cycleDuration: 4000 });
 * ```
 *
 * @see docs/uxui/motion-design-system.md Section 3.1
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { BREATHING } from './constants';

/**
 * Options for useBreathing hook
 */
export interface UseBreathingOptions {
  /**
   * Duration of one breathing cycle in milliseconds
   * @default 3000
   */
  cycleDuration?: number;

  /**
   * Minimum scale value
   * @default 1
   */
  scaleMin?: number;

  /**
   * Maximum scale value
   * @default 1.02
   */
  scaleMax?: number;

  /**
   * Minimum opacity value
   * @default 0.9
   */
  opacityMin?: number;

  /**
   * Maximum opacity value
   * @default 1.0
   */
  opacityMax?: number;

  /**
   * Whether to enable the animation
   * @default true (unless reduced motion preferred)
   */
  enabled?: boolean;
}

/**
 * Return value from useBreathing hook
 */
export interface UseBreathingResult {
  /**
   * Current scale value (between scaleMin and scaleMax)
   */
  scale: number;

  /**
   * Current opacity value (between opacityMin and opacityMax)
   */
  opacity: number;

  /**
   * Current phase of the cycle (0-1)
   */
  phase: number;

  /**
   * Whether the animation is active
   */
  isAnimating: boolean;

  /**
   * CSS style object with transform and opacity
   * Can be spread onto a style prop
   */
  style: React.CSSProperties;

  /**
   * CSS transform string (e.g., "scale(1.01)")
   */
  transform: string;
}

/**
 * Hook for breathing animation values
 *
 * @param options - Configuration options
 * @returns Object with scale, opacity, phase, and style values
 */
export function useBreathing(options: UseBreathingOptions = {}): UseBreathingResult {
  const prefersReducedMotion = useReducedMotion();

  const {
    cycleDuration = BREATHING.CYCLE_DURATION,
    scaleMin = BREATHING.SCALE_MIN,
    scaleMax = BREATHING.SCALE_MAX,
    opacityMin = BREATHING.OPACITY_MIN,
    opacityMax = BREATHING.OPACITY_MAX,
    enabled = true,
  } = options;

  // Animation is active only if enabled and not reduced motion
  const shouldAnimate = enabled && !prefersReducedMotion;

  // Current phase (0-1)
  const [phase, setPhase] = useState(0);

  // Animation frame tracking
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  useEffect(() => {
    // Don't animate if disabled
    if (!shouldAnimate) {
      setPhase(0);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const currentPhase = (elapsed % cycleDuration) / cycleDuration;

      setPhase(currentPhase);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      startTimeRef.current = null;
    };
  }, [shouldAnimate, cycleDuration]);

  // Calculate current scale and opacity using sine wave
  // Sine wave gives smooth breathing effect (0 → 1 → 0)
  const sinePhase = useMemo(() => {
    // Convert phase (0-1) to sine wave (-1 to 1), then normalize to (0 to 1)
    // At phase 0: sin(0) = 0 → normalized to 0
    // At phase 0.5: sin(π) = 0 → normalized to 0
    // At phase 0.25: sin(π/2) = 1 → normalized to 1
    // We want: 0%, 100% → min, 50% → max
    // Use: (1 - cos(2π * phase)) / 2 for smooth 0→1→0 curve
    return (1 - Math.cos(2 * Math.PI * phase)) / 2;
  }, [phase]);

  const scale = useMemo(() => {
    if (!shouldAnimate) return scaleMin;
    return scaleMin + sinePhase * (scaleMax - scaleMin);
  }, [shouldAnimate, sinePhase, scaleMin, scaleMax]);

  const opacity = useMemo(() => {
    if (!shouldAnimate) return opacityMax;
    return opacityMin + sinePhase * (opacityMax - opacityMin);
  }, [shouldAnimate, sinePhase, opacityMin, opacityMax]);

  const transform = `scale(${scale.toFixed(4)})`;

  const style: React.CSSProperties = useMemo(() => {
    if (!shouldAnimate) {
      return {
        transform: 'scale(1)',
        opacity: 1,
      };
    }

    // Note: No CSS transition - requestAnimationFrame already provides smooth
    // 60fps interpolation. Adding CSS transition causes double-interpolation
    // and potential jank on low-end devices.
    return {
      transform,
      opacity,
      transformOrigin: 'center center',
      willChange: 'transform, opacity',
    };
  }, [shouldAnimate, transform, opacity]);

  return {
    scale,
    opacity,
    phase,
    isAnimating: shouldAnimate,
    style,
    transform,
  };
}

export default useBreathing;
