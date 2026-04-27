/**
 * Celebrations Module
 *
 * Story 14.18: Celebration System
 * Epic 14: Core Implementation
 *
 * Exports components, hooks, and utilities for multi-sensory celebration effects.
 */

// Components
export {
    CelebrationTrigger,
    SuccessIndicator,
    CELEBRATION_PRESETS,
} from './CelebrationTrigger';

export type {
    CelebrationTriggerProps,
    CelebrationTriggerHandle,
    SuccessIndicatorProps,
} from './CelebrationTrigger';

// Hooks
export { useCelebration } from './useCelebration';
export type { UseCelebrationOptions, UseCelebrationReturn } from './useCelebration';

// Story 14.19: Personal Record Banner
export { PersonalRecordBanner, CompactRecordBanner } from './PersonalRecordBanner';
export type { PersonalRecordBannerProps, CompactRecordBannerProps } from './PersonalRecordBanner';

// Re-export types from types/celebration.ts
export type {
    CelebrationType,
    CelebrationConfig,
    CelebrationPreset,
    CelebrationOptions,
    CelebrationResult,
} from '../../types/celebration';

// Re-export utilities
export { triggerConfetti, CELEBRATION_COLORS } from '../../utils/confetti';
export { triggerHaptic, isHapticAvailable } from '../../utils/haptic';
export {
    playCelebrationSound,
    preloadCelebrationSounds,
    isAudioAvailable,
} from '../../utils/celebrationSounds';
