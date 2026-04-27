/**
 * useCelebration Hook
 *
 * Story 14.18: Celebration System
 * Epic 14: Core Implementation
 *
 * Provides a hook for triggering multi-sensory celebration effects
 * with support for reduced motion, haptic feedback, and optional sounds.
 */

import { useCallback } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { triggerConfetti, CELEBRATION_COLORS } from '../../utils/confetti';
import { triggerHaptic } from '../../utils/haptic';
import { playCelebrationSound } from '../../utils/celebrationSounds';
import type {
    CelebrationConfig,
    CelebrationPreset,
    CelebrationOptions,
    CelebrationResult,
} from '../../types/celebration';

/**
 * Preset configurations for different celebration types
 * Story 14.18 AC#5: Define celebration triggers
 */
export const CELEBRATION_PRESETS: Record<CelebrationPreset, CelebrationConfig> = {
    milestone: { type: 'big', confetti: true, haptic: true, sound: true },
    personalRecord: { type: 'big', confetti: true, haptic: true, sound: true },
    quickSave: { type: 'small', confetti: true, haptic: true, sound: false },
    firstScan: { type: 'big', confetti: true, haptic: true, sound: true },
    streak: { type: 'small', confetti: true, haptic: true, sound: false },
};

/**
 * Color themes for different presets
 */
const PRESET_COLORS: Partial<Record<CelebrationPreset, readonly string[]>> = {
    milestone: CELEBRATION_COLORS.milestone,
    personalRecord: CELEBRATION_COLORS.personal,
    streak: CELEBRATION_COLORS.streak,
};

/**
 * Hook options
 */
export interface UseCelebrationOptions {
    /**
     * Whether sounds are enabled in user settings
     * @default false
     */
    soundEnabled?: boolean;
}

/**
 * Hook return type
 */
export interface UseCelebrationReturn {
    /**
     * Trigger a celebration with optional preset or custom config
     */
    celebrate: (options?: CelebrationOptions) => Promise<CelebrationResult>;

    /**
     * Trigger a specific preset celebration
     */
    celebratePreset: (preset: CelebrationPreset) => Promise<CelebrationResult>;

    /**
     * Trigger a custom celebration configuration
     */
    celebrateCustom: (config: CelebrationConfig) => Promise<CelebrationResult>;

    /**
     * Whether user prefers reduced motion
     */
    isReducedMotion: boolean;
}

/**
 * Hook for triggering celebration effects
 *
 * @param options - Hook options including sound preference
 * @returns Celebration trigger functions and reduced motion status
 *
 * @example
 * ```tsx
 * const { celebrate, isReducedMotion } = useCelebration({ soundEnabled: false });
 *
 * // Trigger a preset celebration
 * const handleSave = async () => {
 *   await saveTransaction();
 *   celebrate({ preset: 'quickSave' });
 * };
 *
 * // Trigger with custom config
 * celebrate({ config: { type: 'big', confetti: true, haptic: true, sound: false } });
 * ```
 */
export function useCelebration(options: UseCelebrationOptions = {}): UseCelebrationReturn {
    const { soundEnabled = false } = options;
    const prefersReducedMotion = useReducedMotion();

    /**
     * Core celebration trigger function
     */
    const triggerCelebration = useCallback(
        async (config: CelebrationConfig, colors?: readonly string[]): Promise<CelebrationResult> => {
            const result: CelebrationResult = {
                confettiTriggered: false,
                hapticTriggered: false,
                soundPlayed: false,
                reducedMotionApplied: prefersReducedMotion,
            };

            // Confetti: Skip if reduced motion (canvas-confetti handles this via disableForReducedMotion)
            // but we still track it
            if (config.confetti !== false) {
                if (!prefersReducedMotion) {
                    triggerConfetti(config.type, colors);
                    result.confettiTriggered = true;
                }
            }

            // Haptic: Always trigger if enabled (even with reduced motion - it's not visual)
            // Story 14.18 AC#6: Still provide haptic feedback for reduced motion
            if (config.haptic !== false) {
                const hapticSuccess = triggerHaptic(config.type);
                result.hapticTriggered = hapticSuccess;
            }

            // Sound: Play if enabled in config AND user settings
            // Story 14.18 AC#6: Still play sound if enabled (even with reduced motion)
            if (config.sound !== false && soundEnabled) {
                const soundSuccess = await playCelebrationSound(config.type, soundEnabled);
                result.soundPlayed = soundSuccess;
            }

            return result;
        },
        [prefersReducedMotion, soundEnabled]
    );

    /**
     * Celebrate with options (preset or custom config)
     */
    const celebrate = useCallback(
        async (celebrationOptions: CelebrationOptions = {}): Promise<CelebrationResult> => {
            const { preset, config, overrides } = celebrationOptions;

            // Determine base config
            let baseConfig: CelebrationConfig;
            let colors: readonly string[] | undefined;

            if (preset) {
                baseConfig = { ...CELEBRATION_PRESETS[preset] };
                colors = PRESET_COLORS[preset];
            } else if (config) {
                baseConfig = { ...config };
            } else {
                // Default to quick save
                baseConfig = { ...CELEBRATION_PRESETS.quickSave };
            }

            // Apply overrides
            if (overrides) {
                baseConfig = { ...baseConfig, ...overrides };
            }

            return triggerCelebration(baseConfig, colors);
        },
        [triggerCelebration]
    );

    /**
     * Celebrate a specific preset
     */
    const celebratePreset = useCallback(
        async (preset: CelebrationPreset): Promise<CelebrationResult> => {
            return celebrate({ preset });
        },
        [celebrate]
    );

    /**
     * Celebrate with custom config
     */
    const celebrateCustom = useCallback(
        async (config: CelebrationConfig): Promise<CelebrationResult> => {
            return celebrate({ config });
        },
        [celebrate]
    );

    return {
        celebrate,
        celebratePreset,
        celebrateCustom,
        isReducedMotion: prefersReducedMotion,
    };
}

export default useCelebration;
