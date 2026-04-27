/**
 * Confetti celebration effects
 *
 * Story 9.6: Positive feedback for merchant learning
 * Story 14.18: Enhanced with celebration system types and small variant
 */

import confetti from 'canvas-confetti'
import { CelebrationType } from '../types/celebration'

/**
 * Default colors for celebrations (brand colors)
 */
export const CELEBRATION_COLORS = {
    default: ['#3b82f6', '#6366f1', '#8b5cf6', '#22c55e', '#f59e0b'],
    milestone: ['#f59e0b', '#eab308', '#fcd34d', '#fef3c7'], // Gold theme
    streak: ['#22c55e', '#16a34a', '#86efac', '#bbf7d0'], // Green theme
    personal: ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe'], // Purple theme
} as const

/**
 * Fire a small celebration - subtle confetti burst
 * Story 14.18 AC#2: Add celebrateSmall for minor achievements
 *
 * @param colors - Optional custom colors array
 */
export function celebrateSmall(colors?: readonly string[]): void {
    confetti({
        particleCount: 40,
        spread: 45,
        origin: { y: 0.7 },
        colors: (colors ?? CELEBRATION_COLORS.default) as string[],
        disableForReducedMotion: true,
        gravity: 1.2, // Fall faster for subtlety
        scalar: 0.8, // Smaller particles
    })
}

/**
 * Fire a celebratory confetti burst
 * Used when user saves a new merchant mapping
 *
 * @param colors - Optional custom colors array
 */
export function celebrateSuccess(colors?: readonly string[]): void {
    confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: (colors ?? CELEBRATION_COLORS.default) as string[],
        disableForReducedMotion: true,
    })
}

/**
 * Fire confetti from both sides (bigger celebration)
 * Can be used for major achievements
 *
 * @param colors - Optional custom colors array
 */
export function celebrateBig(colors?: readonly string[]): void {
    const count = 150
    const defaults = {
        origin: { y: 0.7 },
        disableForReducedMotion: true,
        colors: (colors ?? CELEBRATION_COLORS.default) as string[],
    }

    function fire(particleRatio: number, opts: confetti.Options) {
        confetti({
            ...defaults,
            ...opts,
            particleCount: Math.floor(count * particleRatio),
        })
    }

    fire(0.25, { spread: 26, startVelocity: 55 })
    fire(0.2, { spread: 60 })
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 })
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 })
    fire(0.1, { spread: 120, startVelocity: 45 })
}

/**
 * Trigger confetti based on celebration type
 * Story 14.18: Unified confetti trigger function
 *
 * @param type - 'small' or 'big' celebration
 * @param colors - Optional custom colors array
 */
export function triggerConfetti(type: CelebrationType, colors?: readonly string[]): void {
    if (type === 'small') {
        celebrateSmall(colors)
    } else {
        celebrateBig(colors)
    }
}
