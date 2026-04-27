/**
 * Celebration Sound Effects
 *
 * Story 14.18: Celebration System
 * Epic 14: Core Implementation
 *
 * Provides optional sound effects for celebrations.
 * Only plays sounds if user has enabled audio in settings.
 *
 * Note: Audio files should be placed in public/sounds/
 * - /sounds/chime.mp3 - Small celebration (subtle chime)
 * - /sounds/triumph.mp3 - Big celebration (triumphant sound)
 */

import { CelebrationType } from '../types/celebration';

/**
 * Sound file paths for each celebration type
 */
const SOUND_FILES: Record<CelebrationType, string> = {
    small: '/sounds/chime.mp3',
    big: '/sounds/triumph.mp3',
};

/**
 * Cached Audio elements for quick playback
 * Only created when first used
 */
const audioCache: Map<CelebrationType, HTMLAudioElement> = new Map();

/**
 * Check if audio playback is available
 * @returns True if Audio API is supported
 */
export function isAudioAvailable(): boolean {
    return typeof window !== 'undefined' && typeof Audio !== 'undefined';
}

/**
 * Preload audio files for instant playback
 * Call this during app initialization if sounds are enabled
 */
export function preloadCelebrationSounds(): void {
    if (!isAudioAvailable()) return;

    for (const type of ['small', 'big'] as CelebrationType[]) {
        if (!audioCache.has(type)) {
            const audio = new Audio(SOUND_FILES[type]);
            audio.preload = 'auto';
            audio.volume = 0.5; // 50% volume for non-intrusive feedback
            audioCache.set(type, audio);
        }
    }
}

/**
 * Play a celebration sound effect
 * @param type - Celebration type ('small' or 'big')
 * @param soundEnabled - Whether sounds are enabled in user settings
 * @returns Promise that resolves to true if sound played, false otherwise
 */
export async function playCelebrationSound(
    type: CelebrationType,
    soundEnabled: boolean
): Promise<boolean> {
    // Don't play if sounds are disabled or not available
    if (!soundEnabled || !isAudioAvailable()) {
        return false;
    }

    try {
        // Get or create cached audio element
        let audio = audioCache.get(type);
        if (!audio) {
            audio = new Audio(SOUND_FILES[type]);
            audio.volume = 0.5;
            audioCache.set(type, audio);
        }

        // Reset to beginning if already playing
        audio.currentTime = 0;

        await audio.play();
        return true;
    } catch {
        // Audio playback may be blocked by browser (autoplay policies)
        // This is expected behavior - fail silently
        return false;
    }
}

/**
 * Stop any currently playing celebration sounds
 */
export function stopCelebrationSounds(): void {
    audioCache.forEach((audio) => {
        try {
            audio.pause();
            audio.currentTime = 0;
        } catch {
            // Ignore errors
        }
    });
}

/**
 * Clear the audio cache to free memory
 */
export function clearAudioCache(): void {
    stopCelebrationSounds();
    audioCache.clear();
}
