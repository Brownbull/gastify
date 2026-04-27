/**
 * Haptic Feedback Utilities
 *
 * Story 14.18: Celebration System
 * Epic 14: Core Implementation
 *
 * Provides haptic feedback via the navigator.vibrate API.
 * Gracefully handles environments where vibration is not supported.
 */

import { CelebrationType, HAPTIC_PATTERNS } from '../types/celebration';

/**
 * Check if haptic feedback (vibration) is available
 * @returns True if navigator.vibrate is supported
 */
export function isHapticAvailable(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/**
 * Trigger haptic feedback with a preset pattern
 * @param type - Celebration type ('small' or 'big')
 * @returns True if vibration was triggered, false if not available
 */
export function triggerHaptic(type: CelebrationType): boolean {
    if (!isHapticAvailable()) {
        return false;
    }

    const pattern = HAPTIC_PATTERNS[type];
    try {
        navigator.vibrate(pattern);
        return true;
    } catch {
        // Vibration may fail silently in some environments
        return false;
    }
}

/**
 * Trigger haptic feedback with a custom pattern
 * @param pattern - Array of milliseconds [vibrate, pause, vibrate, ...]
 * @returns True if vibration was triggered, false if not available
 */
export function triggerHapticPattern(pattern: number[]): boolean {
    if (!isHapticAvailable() || pattern.length === 0) {
        return false;
    }

    try {
        navigator.vibrate(pattern);
        return true;
    } catch {
        return false;
    }
}

/**
 * Cancel any ongoing vibration
 */
export function cancelHaptic(): void {
    if (isHapticAvailable()) {
        try {
            navigator.vibrate(0);
        } catch {
            // Ignore errors
        }
    }
}
