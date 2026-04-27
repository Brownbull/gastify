/**
 * AnimationContext Provider
 *
 * Story 14.1: Animation Framework
 * Epic 14: Core Implementation
 *
 * Provides global animation state and utilities to all components.
 * Integrates with useReducedMotion to respect accessibility preferences.
 *
 * Features:
 * - Breathing phase (0-1) updated every animation frame
 * - Reduced motion detection from OS/browser preferences
 * - Stagger delay calculation utility
 * - Global animation enable/disable flag
 *
 * @example
 * ```tsx
 * // In App.tsx
 * import { AnimationProvider } from './components/animation';
 *
 * function App() {
 *   return (
 *     <AnimationProvider>
 *       <YourComponents />
 *     </AnimationProvider>
 *   );
 * }
 *
 * // In any component
 * import { useAnimationContext } from './components/animation';
 *
 * function MyComponent() {
 *   const { breathingPhase, isReducedMotion, getStaggerDelay } = useAnimationContext();
 *   // Use animation values...
 * }
 * ```
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { BREATHING, STAGGER } from './constants';

/**
 * Animation context value interface
 */
export interface AnimationContextValue {
  /**
   * Current phase of the breathing animation cycle (0-1)
   * 0 = start of cycle, 0.5 = peak, 1 = end of cycle
   * Updates every animation frame when animations are enabled
   */
  breathingPhase: number;

  /**
   * True if user prefers reduced motion (from OS/browser settings)
   * When true, animations should be skipped or simplified
   */
  isReducedMotion: boolean;

  /**
   * Calculate stagger delay for an item in a list
   * @param index - Item index (0-based)
   * @param options - Optional configuration
   * @returns Delay in milliseconds
   */
  getStaggerDelay: (index: number, options?: StaggerOptions) => number;

  /**
   * Whether animations are globally enabled
   * False if reduced motion is preferred or manually disabled
   */
  animationsEnabled: boolean;

  /**
   * Manually enable/disable animations (overrides reduced motion)
   */
  setAnimationsEnabled: (enabled: boolean) => void;
}

/**
 * Options for stagger delay calculation
 */
export interface StaggerOptions {
  /** Delay between items in ms (default: STAGGER.DEFAULT = 100ms) */
  staggerMs?: number;
  /** Initial delay before first item in ms (default: 0) */
  initialDelayMs?: number;
  /** Maximum total duration in ms (default: STAGGER.MAX_DURATION = 2500ms) */
  maxDurationMs?: number;
  /** Total number of items (for max duration calculation) */
  totalItems?: number;
}

/**
 * Default context value (used when provider is not present)
 */
const defaultContextValue: AnimationContextValue = {
  breathingPhase: 0,
  isReducedMotion: false,
  getStaggerDelay: () => 0,
  animationsEnabled: true,
  setAnimationsEnabled: () => {},
};

/**
 * Animation context
 */
const AnimationContext = createContext<AnimationContextValue>(defaultContextValue);

/**
 * Props for AnimationProvider
 */
export interface AnimationProviderProps {
  children: ReactNode;
  /**
   * Initial animations enabled state
   * @default true (or false if prefers-reduced-motion)
   */
  initialEnabled?: boolean;
}

/**
 * AnimationProvider component
 *
 * Wraps the application to provide animation context to all children.
 * Must be placed near the root of the component tree.
 */
export const AnimationProvider: React.FC<AnimationProviderProps> = ({
  children,
  initialEnabled,
}) => {
  const prefersReducedMotion = useReducedMotion();

  // Animation enabled state - respects reduced motion preference
  const [animationsEnabled, setAnimationsEnabled] = useState(
    initialEnabled ?? !prefersReducedMotion
  );

  // Breathing phase (0-1)
  const [breathingPhase, setBreathingPhase] = useState(0);

  // Animation frame reference for cleanup
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Update animations enabled when reduced motion preference changes
  useEffect(() => {
    if (prefersReducedMotion) {
      setAnimationsEnabled(false);
    }
  }, [prefersReducedMotion]);

  // Breathing animation loop
  useEffect(() => {
    // Don't run animation if disabled
    if (!animationsEnabled || prefersReducedMotion) {
      setBreathingPhase(0);
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
      const phase = (elapsed % BREATHING.CYCLE_DURATION) / BREATHING.CYCLE_DURATION;

      setBreathingPhase(phase);

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
  }, [animationsEnabled, prefersReducedMotion]);

  /**
   * Calculate stagger delay for an item
   * Matches the algorithm from useStaggeredReveal (Epic 11.3)
   */
  const getStaggerDelay = useCallback(
    (index: number, options: StaggerOptions = {}): number => {
      // No delay if animations disabled
      if (!animationsEnabled || prefersReducedMotion) {
        return 0;
      }

      const {
        staggerMs = STAGGER.DEFAULT,
        initialDelayMs = 0,
        maxDurationMs = STAGGER.MAX_DURATION,
        totalItems,
      } = options;

      // Calculate base delay
      let delay = initialDelayMs + index * staggerMs;

      // If we have total items count, compress to fit within max duration
      if (totalItems && totalItems > 1) {
        const totalTime = (totalItems - 1) * staggerMs;
        const availableTime = maxDurationMs - initialDelayMs;

        if (totalTime > availableTime) {
          // Compress stagger to fit
          const adjustedStagger = availableTime / (totalItems - 1);
          delay = initialDelayMs + index * adjustedStagger;
        }
      }

      return Math.max(0, delay);
    },
    [animationsEnabled, prefersReducedMotion]
  );

  const contextValue: AnimationContextValue = {
    breathingPhase,
    isReducedMotion: prefersReducedMotion,
    getStaggerDelay,
    animationsEnabled,
    setAnimationsEnabled,
  };

  return (
    <AnimationContext.Provider value={contextValue}>
      {children}
    </AnimationContext.Provider>
  );
};

/**
 * Hook to access animation context
 *
 * @returns Animation context value
 * @throws If used outside of AnimationProvider
 */
export const useAnimationContext = (): AnimationContextValue => {
  const context = useContext(AnimationContext);

  // Note: We don't throw here to allow gradual adoption
  // Components can work with default values if provider not present
  return context;
};

export default AnimationProvider;
