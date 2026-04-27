/**
 * CelebrationTrigger Component
 *
 * Story 14.18: Celebration System
 * Epic 14: Core Implementation
 *
 * AC#1: CelebrationTrigger component orchestrates celebration effects
 *
 * Orchestrates multi-sensory celebration effects including confetti,
 * haptic feedback, and optional sound effects. Can be used declaratively
 * (via props) or imperatively (via ref).
 */

import React, { useEffect, useRef, useImperativeHandle, forwardRef, useMemo } from 'react';
import { useCelebration, CELEBRATION_PRESETS } from './useCelebration';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import type { CelebrationPreset, CelebrationOptions, CelebrationResult } from '../../types/celebration';

/**
 * Props for CelebrationTrigger component
 */
export interface CelebrationTriggerProps {
    /**
     * Preset celebration type to trigger
     */
    preset?: CelebrationPreset;

    /**
     * Whether to trigger the celebration
     * Set to true to trigger, resets after triggering
     */
    trigger?: boolean;

    /**
     * Callback when celebration is triggered
     */
    onCelebrate?: (result: CelebrationResult) => void;

    /**
     * Whether sounds are enabled in user settings
     * @default false
     */
    soundEnabled?: boolean;

    /**
     * Disable confetti animation
     * @default false
     */
    disableConfetti?: boolean;

    /**
     * Disable haptic feedback
     * @default false
     */
    disableHaptic?: boolean;

    /**
     * Disable sound effects
     * @default false
     */
    disableSound?: boolean;
}

/**
 * Imperative handle for CelebrationTrigger
 */
export interface CelebrationTriggerHandle {
    /**
     * Trigger a celebration imperatively
     */
    celebrate: (options?: CelebrationOptions) => Promise<CelebrationResult>;

    /**
     * Trigger a specific preset
     */
    celebratePreset: (preset: CelebrationPreset) => Promise<CelebrationResult>;

    /**
     * Whether user prefers reduced motion
     */
    isReducedMotion: boolean;
}

/**
 * CelebrationTrigger component for orchestrating celebration effects
 *
 * Can be used declaratively via props or imperatively via ref.
 *
 * @example
 * ```tsx
 * // Declarative usage with trigger prop
 * const [showCelebration, setShowCelebration] = useState(false);
 *
 * <CelebrationTrigger
 *   preset="quickSave"
 *   trigger={showCelebration}
 *   onCelebrate={() => setShowCelebration(false)}
 * />
 *
 * // Imperative usage with ref
 * const celebrationRef = useRef<CelebrationTriggerHandle>(null);
 *
 * const handleSave = () => {
 *   saveData();
 *   celebrationRef.current?.celebratePreset('milestone');
 * };
 *
 * <CelebrationTrigger ref={celebrationRef} />
 * ```
 */
export const CelebrationTrigger = forwardRef<CelebrationTriggerHandle, CelebrationTriggerProps>(
    function CelebrationTrigger(
        {
            preset = 'quickSave',
            trigger = false,
            onCelebrate,
            soundEnabled = false,
            disableConfetti = false,
            disableHaptic = false,
            disableSound = false,
        },
        ref
    ) {
        const {
            celebrate,
            isReducedMotion,
        } = useCelebration({ soundEnabled });

        const lastTriggerRef = useRef(false);

        // Memoize overrides to prevent unnecessary effect re-runs (MEDIUM-2 fix)
        const overrides = useMemo(
            () => ({
                ...(disableConfetti && { confetti: false as const }),
                ...(disableHaptic && { haptic: false as const }),
                ...(disableSound && { sound: false as const }),
            }),
            [disableConfetti, disableHaptic, disableSound]
        );

        // Handle declarative trigger
        useEffect(() => {
            // Only trigger on rising edge (false -> true)
            if (trigger && !lastTriggerRef.current) {
                celebrate({ preset, overrides }).then((result) => {
                    onCelebrate?.(result);
                });
            }
            lastTriggerRef.current = trigger;
        }, [trigger, preset, celebrate, onCelebrate, overrides]);

        // Expose imperative handle (MEDIUM-1 fix: removed unused celebratePresetFn)
        useImperativeHandle(
            ref,
            () => ({
                celebrate: (options?: CelebrationOptions) => {
                    const mergedOverrides = {
                        ...overrides,
                        ...options?.overrides,
                    };
                    return celebrate({ ...options, overrides: mergedOverrides });
                },
                celebratePreset: (presetName: CelebrationPreset) => {
                    return celebrate({ preset: presetName, overrides });
                },
                isReducedMotion,
            }),
            [celebrate, isReducedMotion, overrides]
        );

        // This component doesn't render anything visible
        // The confetti, haptic, and sound are side effects
        return null;
    }
);

/**
 * Static indicator component for reduced motion users
 * Story 14.18 AC#6: Show static "success" indicator instead of animation
 *
 * Can be used to provide visual feedback when confetti is disabled
 */
export interface SuccessIndicatorProps {
    /**
     * Whether to show the indicator
     */
    show: boolean;

    /**
     * Duration to show in milliseconds
     * @default 2000
     */
    duration?: number;

    /**
     * Callback when indicator hides
     */
    onHide?: () => void;

    /**
     * Custom message
     */
    message?: string;
}

/**
 * Success indicator for reduced motion users
 */
export const SuccessIndicator: React.FC<SuccessIndicatorProps> = ({
    show,
    duration = 2000,
    onHide,
    message = '✓',
}) => {
    const prefersReducedMotion = useReducedMotion();

    useEffect(() => {
        if (show && duration > 0) {
            const timer = setTimeout(() => {
                onHide?.();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [show, duration, onHide]);

    // Only show for reduced motion users, or when explicitly shown
    if (!show) return null;

    return (
        <div
            className={`
                fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                text-6xl font-bold text-green-500
                pointer-events-none z-50
                ${prefersReducedMotion ? '' : 'animate-pulse'}
            `}
            role="status"
            aria-live="polite"
        >
            {message}
        </div>
    );
};

// Re-export types and presets for convenience
export { CELEBRATION_PRESETS };
export type { CelebrationPreset, CelebrationOptions, CelebrationResult };
