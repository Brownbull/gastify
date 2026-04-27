/**
 * Story 14c-refactor.10: useOnlineStatus Hook
 *
 * Monitors network connectivity status and provides callbacks
 * for online/offline transitions. This hook extracts the network
 * monitoring logic from App.tsx into a reusable module.
 *
 * Features:
 * - Tracks navigator.onLine status
 * - Detects transitions between online/offline states
 * - Provides wasOffline flag for "back online" detection
 * - Optional callbacks for state transitions
 *
 * Architecture Reference: Epic 14c-refactor - App Decomposition
 *
 * @example
 * ```tsx
 * function App() {
 *   const { isOnline, wasOffline } = useOnlineStatus({
 *     onOnline: () => toast.info('Back online!'),
 *     onOffline: () => toast.warn('You are offline'),
 *   });
 *
 *   return <div>{isOnline ? 'Online' : 'Offline'}</div>;
 * }
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration options for useOnlineStatus
 */
export interface UseOnlineStatusOptions {
    /** Callback when connection comes back online */
    onOnline?: () => void;
    /** Callback when connection goes offline */
    onOffline?: () => void;
}

/**
 * Result returned by useOnlineStatus hook
 */
export interface UseOnlineStatusResult {
    /** Current online status (true = online, false = offline) */
    isOnline: boolean;
    /** Whether the app was offline in this session (for "back online" detection) */
    wasOffline: boolean;
    /** Manually refresh the online status */
    refreshStatus: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to monitor network connectivity status.
 *
 * Uses the Navigator.onLine API and online/offline events to track
 * network status and detect transitions.
 *
 * @param options - Optional callbacks for online/offline transitions
 * @returns Online status and transition tracking
 */
export function useOnlineStatus(
    options: UseOnlineStatusOptions = {}
): UseOnlineStatusResult {
    const { onOnline, onOffline } = options;

    // Track current online status
    const [isOnline, setIsOnline] = useState(() => {
        // SSR-safe: Check if navigator exists
        if (typeof navigator !== 'undefined') {
            return navigator.onLine;
        }
        return true; // Assume online during SSR
    });

    // Track if we've been offline in this session
    const [wasOffline, setWasOffline] = useState(false);

    // Use refs for callbacks to avoid effect re-runs
    const onOnlineRef = useRef(onOnline);
    const onOfflineRef = useRef(onOffline);

    // Keep refs updated
    useEffect(() => {
        onOnlineRef.current = onOnline;
        onOfflineRef.current = onOffline;
    }, [onOnline, onOffline]);

    // Handle online event
    const handleOnline = useCallback(() => {
        setIsOnline(true);
        onOnlineRef.current?.();
    }, []);

    // Handle offline event
    const handleOffline = useCallback(() => {
        setIsOnline(false);
        setWasOffline(true);
        onOfflineRef.current?.();
    }, []);

    // Manually refresh online status
    const refreshStatus = useCallback(() => {
        if (typeof navigator !== 'undefined') {
            const currentStatus = navigator.onLine;
            setIsOnline(currentStatus);
            if (!currentStatus) {
                setWasOffline(true);
            }
        }
    }, []);

    // Set up event listeners
    useEffect(() => {
        if (typeof window === 'undefined') return;

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Check initial status in case it changed during render
        refreshStatus();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [handleOnline, handleOffline, refreshStatus]);

    return {
        isOnline,
        wasOffline,
        refreshStatus,
    };
}

export default useOnlineStatus;
