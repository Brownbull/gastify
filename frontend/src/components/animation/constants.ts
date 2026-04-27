/**
 * Animation Constants
 *
 * Story 14.1: Animation Framework
 * Epic 14: Core Implementation
 *
 * Centralized animation tokens for consistent motion throughout the app.
 * Values are derived from motion-design-system.md specification.
 *
 * @see docs/uxui/motion-design-system.md
 */

/**
 * Animation duration tokens in milliseconds
 * @see docs/uxui/motion-design-system.md Section 1.2
 */
export const DURATION = {
  /** Instant - no perceptible delay (0ms) */
  INSTANT: 0,
  /** Fast - micro-interactions, focus states (100ms per motion-design-system.md) */
  FAST: 100,
  /** Normal - standard transitions (200ms) */
  NORMAL: 200,
  /** Slow - modal entrances, complex reveals (300ms) */
  SLOW: 300,
  /** Slower - full-screen transitions, count-ups (400ms) */
  SLOWER: 400,
  /** Breathing - idle breathing animations (3000ms) */
  BREATHING: 3000,
  /** Celebration - achievements, confetti (500ms) */
  CELEBRATION: 500,
} as const;

/**
 * Easing curves for CSS transitions/animations
 */
export const EASING = {
  /** Default easing for general use */
  DEFAULT: 'ease',
  /** Fast start, gentle landing - entrances, reveals */
  OUT: 'cubic-bezier(0, 0, 0.2, 1)',
  /** Smooth, organic - breathing, looping */
  IN_OUT: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** Accelerating away - exits, dismissals */
  IN: 'cubic-bezier(0.4, 0, 1, 1)',
  /** Playful overshoot - celebrations, bounces */
  SPRING: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  /** Mechanical, predictable - progress bars only */
  LINEAR: 'linear',
} as const;

/**
 * Stagger delay tokens for list animations
 */
export const STAGGER = {
  /** Default stagger between items (100ms) - matches Epic 11.3 useStaggeredReveal */
  DEFAULT: 100,
  /** Fast stagger for quick reveals (50ms) */
  FAST: 50,
  /** Initial delay before first item (300ms) - matches Epic 11.3 */
  INITIAL_DELAY: 300,
  /** Maximum total animation duration (2500ms) - matches Epic 11.3 */
  MAX_DURATION: 2500,
} as const;

/**
 * Breathing animation parameters
 * @see motion-design-system.md Section 3.1
 */
export const BREATHING = {
  /** Duration of one breathing cycle in ms */
  CYCLE_DURATION: 3000,
  /** Minimum scale during breathing (1 = no change) */
  SCALE_MIN: 1,
  /** Maximum scale during breathing (2% growth) */
  SCALE_MAX: 1.02,
  /** Minimum opacity during breathing */
  OPACITY_MIN: 0.9,
  /** Maximum opacity during breathing */
  OPACITY_MAX: 1.0,
} as const;

/**
 * Celebration animation parameters
 */
export const CELEBRATION = {
  /** Spring tension for bounce effects */
  SPRING_TENSION: 180,
  /** Spring friction for bounce effects */
  SPRING_FRICTION: 12,
  /** Haptic vibration pattern for small celebration [50ms] */
  HAPTIC_SMALL: [50],
  /** Haptic vibration pattern for big celebration [100ms, 50ms pause, 100ms] */
  HAPTIC_BIG: [100, 50, 100],
} as const;

/**
 * Combined animation constants object for backward compatibility
 * and convenient destructuring
 */
export const ANIMATION = {
  DURATION,
  EASING,
  STAGGER,
  BREATHING,
  CELEBRATION,
} as const;

export default ANIMATION;
