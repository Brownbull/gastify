/**
 * Story 14c-refactor.10: useAppLifecycle Hook
 *
 * Manages app lifecycle events including visibility changes,
 * focus events, and beforeunload guards. This hook extracts
 * lifecycle management from App.tsx into a reusable module.
 *
 * Features:
 * - Tracks foreground/background state via visibilitychange
 * - Provides beforeunload guard registration for unsaved data
 * - Handles focus/blur events for app activation state
 * - PWA pagehide event handling
 *
 * NOTE: Scan-related beforeunload guard remains in ScanContext.
 * This hook provides a general-purpose lifecycle API.
 *
 * Architecture Reference: Epic 14c-refactor - App Decomposition
 *
 * @example
 * ```tsx
 * function App() {
 *   const {
 *     isInForeground,
 *     registerBeforeUnloadGuard,
 *     unregisterBeforeUnloadGuard,
 *   } = useAppLifecycle({
 *     onForeground: () => refreshData(),
 *     onBackground: () => saveState(),
 *   });
 *
 *   // Register guard when there's unsaved data
 *   useEffect(() => {
 *     if (hasUnsavedChanges) {
 *       registerBeforeUnloadGuard(() => hasUnsavedChanges);
 *     } else {
 *       unregisterBeforeUnloadGuard();
 *     }
 *   }, [hasUnsavedChanges]);
 *
 *   return <div>{isInForeground ? 'Active' : 'Background'}</div>;
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * Callback type for beforeunload condition check
 * Returns true if navigation should be blocked (unsaved data)
 */
export type BeforeUnloadCondition = () => boolean;

/**
 * Configuration options for useAppLifecycle
 */
export interface UseAppLifecycleOptions {
    /** Callback when app returns to foreground */
    onForeground?: () => void;
    /** Callback when app goes to background */
    onBackground?: () => void;
    /** Callback when page focus changes (includes iframe focus) */
    onFocusChange?: (hasFocus: boolean) => void;
}

/**
 * Result returned by useAppLifecycle hook
 */
export interface UseAppLifecycleResult {
    /** Whether the app is currently in the foreground (visible) */
    isInForeground: boolean;
    /** Whether the app window has focus */
    hasFocus: boolean;
    /** Register a condition for blocking page unload */
    registerBeforeUnloadGuard: (condition: BeforeUnloadCondition) => void;
    /** Remove the beforeunload guard */
    unregisterBeforeUnloadGuard: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to manage app lifecycle events.
 *
 * Provides visibility tracking, focus state, and beforeunload
 * guard registration for protecting unsaved data.
 *
 * @param options - Optional callbacks for lifecycle events
 * @returns Lifecycle state and guard registration functions
 */
export function useAppLifecycle(
    options: UseAppLifecycleOptions = {}
): UseAppLifecycleResult {
    const { onForeground, onBackground, onFocusChange } = options;

    // Track visibility state
    const [isInForeground, setIsInForeground] = useState(() => {
        if (typeof document !== 'undefined') {
            return document.visibilityState === 'visible';
        }
        return true;
    });

    // Track focus state
    const [hasFocus, setHasFocus] = useState(() => {
        if (typeof document !== 'undefined') {
            return document.hasFocus();
        }
        return true;
    });

    // Store beforeunload condition in ref
    const beforeUnloadConditionRef = useRef<BeforeUnloadCondition | null>(null);

    // Use refs for callbacks to avoid effect re-runs
    const onForegroundRef = useRef(onForeground);
    const onBackgroundRef = useRef(onBackground);
    const onFocusChangeRef = useRef(onFocusChange);

    // Keep refs updated
    useEffect(() => {
        onForegroundRef.current = onForeground;
        onBackgroundRef.current = onBackground;
        onFocusChangeRef.current = onFocusChange;
    }, [onForeground, onBackground, onFocusChange]);

    // Register a beforeunload guard condition
    const registerBeforeUnloadGuard = useCallback((condition: BeforeUnloadCondition) => {
        beforeUnloadConditionRef.current = condition;
    }, []);

    // Unregister the beforeunload guard
    const unregisterBeforeUnloadGuard = useCallback(() => {
        beforeUnloadConditionRef.current = null;
    }, []);

    // Handle visibility change
    useEffect(() => {
        if (typeof document === 'undefined') return;

        const handleVisibilityChange = () => {
            const isVisible = document.visibilityState === 'visible';
            setIsInForeground(isVisible);

            if (isVisible) {
                onForegroundRef.current?.();
            } else {
                onBackgroundRef.current?.();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Handle focus/blur events
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleFocus = () => {
            setHasFocus(true);
            onFocusChangeRef.current?.(true);
        };

        const handleBlur = () => {
            setHasFocus(false);
            onFocusChangeRef.current?.(false);
        };

        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);

        return () => {
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    // Handle beforeunload event
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            const condition = beforeUnloadConditionRef.current;
            if (condition && condition()) {
                // Standard way to trigger browser's "Leave site?" dialog
                e.preventDefault();
                // Chrome requires returnValue to be set
                e.returnValue = '';
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    // Handle pagehide for PWA (cleanup state before app is hidden)
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handlePageHide = () => {
            // Called when navigating away or PWA is hidden
            // Note: Can't prevent navigation in pagehide, just for cleanup
            onBackgroundRef.current?.();
        };

        window.addEventListener('pagehide', handlePageHide);

        return () => {
            window.removeEventListener('pagehide', handlePageHide);
        };
    }, []);

    return {
        isInForeground,
        hasFocus,
        registerBeforeUnloadGuard,
        unregisterBeforeUnloadGuard,
    };
}

export default useAppLifecycle;
