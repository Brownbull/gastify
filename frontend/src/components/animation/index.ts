/**
 * Animation Module Barrel Export
 *
 * Story 14.1: Animation Framework
 * Story 14.2: Screen Transition System
 * Epic 14: Core Implementation
 *
 * Centralized exports for animation utilities and components.
 *
 * @example
 * ```tsx
 * import {
 *   AnimationProvider,
 *   useAnimationContext,
 *   useBreathing,
 *   useStagger,
 *   PageTransition,
 *   TransitionChild,
 *   useNavigationDirection,
 *   ANIMATION,
 *   DURATION,
 *   EASING,
 * } from './components/animation';
 * ```
 */

// Context and Provider
export {
  AnimationProvider,
  useAnimationContext,
  type AnimationContextValue,
  type AnimationProviderProps,
  type StaggerOptions,
} from './AnimationContext';

// Hooks
export {
  useBreathing,
  type UseBreathingOptions,
  type UseBreathingResult,
} from './useBreathing';

export {
  useStagger,
  calculateStaggerDelay,
  type UseStaggerOptions,
  type UseStaggerResult,
} from './useStagger';

// Story 14.2: Screen Transition Components
export {
  PageTransition,
  type PageTransitionProps,
  type NavigationDirection,
} from './PageTransition';

export {
  TransitionChild,
  type TransitionChildProps,
} from './TransitionChild';

export {
  useNavigationDirection,
  type UseNavigationDirectionResult,
} from './useNavigationDirection';

// Constants
export {
  ANIMATION,
  DURATION,
  EASING,
  STAGGER,
  BREATHING,
  CELEBRATION,
} from './constants';
