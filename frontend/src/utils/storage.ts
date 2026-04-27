/**
 * Typed localStorage Wrapper
 *
 * Story 15-2f: Centralized localStorage access with error handling.
 * Provides SSR/test safety (try-catch), JSON serialization, and
 * consistent error handling across the codebase.
 *
 * Usage:
 * - getStorageString / setStorageString — for plain string values
 * - getStorageJSON / setStorageJSON — for objects (auto JSON.parse/stringify)
 * - removeStorageItem — for key removal
 *
 * Files that should NOT use this wrapper:
 * - pendingScanStorage.ts — fully encapsulated service with versioning & migration
 */

/**
 * Get a string value from localStorage.
 * Returns fallback if key doesn't exist, on error, or in SSR/test.
 */
export function getStorageString(key: string, fallback: string): string {
    try {
        return localStorage.getItem(key) ?? fallback;
    } catch {
        return fallback;
    }
}

/**
 * Get a JSON-parsed value from localStorage.
 * Returns fallback if key doesn't exist, on parse error, or in SSR/test.
 */
export function getStorageJSON<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key);
        if (raw === null) return fallback;
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

/**
 * Set a string value in localStorage.
 * Silently fails in SSR/test or on quota errors.
 */
export function setStorageString(key: string, value: string): void {
    try {
        localStorage.setItem(key, value);
    } catch {
        // SSR/test safety, QuotaExceededError
    }
}

/**
 * Set a JSON-serialized value in localStorage.
 * Silently fails in SSR/test or on quota errors.
 */
export function setStorageJSON<T>(key: string, value: T): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // SSR/test safety, QuotaExceededError
    }
}

/**
 * Remove a key from localStorage.
 * Silently fails in SSR/test or on error.
 */
export function removeStorageItem(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch {
        // SSR/test safety
    }
}

/**
 * Check if a key exists in localStorage.
 * Returns false in SSR/test or on error.
 */
export function hasStorageItem(key: string): boolean {
    try {
        return localStorage.getItem(key) !== null;
    } catch {
        return false;
    }
}
