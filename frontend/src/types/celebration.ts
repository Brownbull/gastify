/**
 * Celebration System Types
 *
 * Story 14.18: Celebration System
 * Epic 14: Core Implementation
 *
 * Type definitions for multi-sensory celebration effects including
 * confetti, haptic feedback, and optional sound effects.
 */

/**
 * Size/intensity of celebration
 * - small: Quick feedback (e.g., quick save, streak continuation)
 * - big: Major achievement (e.g., milestone, personal record, first scan)
 */
export type CelebrationType = 'small' | 'big';

/**
 * Configuration for a celebration effect
 */
export interface CelebrationConfig {
    /** Size/intensity of the celebration */
    type: CelebrationType;
    /** Whether to show confetti animation */
    confetti?: boolean;
    /** Whether to trigger haptic feedback */
    haptic?: boolean;
    /** Whether to play sound effect (respects user preference) */
    sound?: boolean;
}

/**
 * Preset celebration configurations for different achievements
 */
export type CelebrationPreset =
    | 'milestone'      // Savings goal reached
    | 'personalRecord' // Lowest category spending week
    | 'quickSave'      // Quick save completion
    | 'firstScan'      // First receipt scanned (welcome)
    | 'streak';        // Consecutive tracking days

/**
 * Options for triggering a celebration
 */
export interface CelebrationOptions {
    /** Use a preset configuration */
    preset?: CelebrationPreset;
    /** Or provide custom configuration */
    config?: CelebrationConfig;
    /** Override individual settings */
    overrides?: Partial<CelebrationConfig>;
}

/**
 * Result of a celebration trigger
 */
export interface CelebrationResult {
    /** Whether confetti was triggered */
    confettiTriggered: boolean;
    /** Whether haptic feedback was triggered */
    hapticTriggered: boolean;
    /** Whether sound was played */
    soundPlayed: boolean;
    /** Whether any effect was skipped due to reduced motion */
    reducedMotionApplied: boolean;
}

/**
 * Haptic vibration patterns in milliseconds
 * - small: Single short pulse
 * - big: Two pulses with gap
 */
export const HAPTIC_PATTERNS: Record<CelebrationType, number[]> = {
    small: [50],
    big: [100, 50, 100],
} as const;
