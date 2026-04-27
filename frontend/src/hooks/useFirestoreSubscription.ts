/**
 * useFirestoreSubscription Hook
 *
 * Story 14.29: React Query Migration
 * Epic 14: Core Implementation
 *
 * Combines React Query caching with Firestore real-time subscriptions.
 * This is the primary hook for collections that need live updates.
 *
 * How it works:
 * 1. On mount, checks React Query cache for instant data display
 * 2. Sets up Firestore onSnapshot listener for real-time updates
 * 3. Updates React Query cache when Firestore notifies
 * 4. On unmount, cleans up listener but preserves cache
 *
 * Benefits over raw onSnapshot:
 * - Instant data on navigation (from cache)
 * - No loading spinner on cached routes
 * - Shared cache across components
 *
 * @example
 * ```tsx
 * const { data: transactions, isLoading } = useFirestoreSubscription(
 *     QUERY_KEYS.transactions(userId, appId),
 *     (callback) => subscribeToTransactions(db, userId, appId, callback),
 *     { enabled: !!userId && !!db }
 * );
 * ```
 */

import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import type { Unsubscribe } from 'firebase/firestore';

export interface UseFirestoreSubscriptionOptions {
    /** Whether to enable the subscription (default: true) */
    enabled?: boolean;
}

export interface UseFirestoreSubscriptionResult<TData> {
    /** The current data (from cache or subscription) */
    data: TData | undefined;
    /** True while waiting for first data from subscription */
    isLoading: boolean;
    /** Error from subscription setup (if any) */
    error: Error | null;
}

/**
 * React Query + Firestore real-time subscription hook.
 *
 * This hook uses React Query's cache for data persistence across navigation,
 * but manages the subscription lifecycle separately to avoid the "undefined queryFn"
 * issue that occurs when combining useQuery with external subscriptions.
 *
 * @param queryKey - Unique cache key (use QUERY_KEYS constants)
 * @param subscribeFn - Function that sets up Firestore listener, returns unsubscribe
 * @param options - Configuration options
 * @returns Object with data, isLoading, and error
 */
export function useFirestoreSubscription<TData>(
    queryKey: readonly unknown[],
    subscribeFn: (callback: (data: TData) => void) => Unsubscribe,
    options?: UseFirestoreSubscriptionOptions
): UseFirestoreSubscriptionResult<TData> {
    const queryClient = useQueryClient();
    const enabled = options?.enabled ?? true;

    // Stringify the query key for stable comparison
    const keyString = JSON.stringify(queryKey);

    // Get initial data from cache (if any)
    const initialCachedData = useRef<TData | undefined>(undefined);
    if (initialCachedData.current === undefined) {
        initialCachedData.current = queryClient.getQueryData<TData>(queryKey);
    }

    // Local state for subscription data
    const [data, setData] = useState<TData | undefined>(initialCachedData.current);
    const [isLoading, setIsLoading] = useState(!initialCachedData.current && enabled);
    const [error, setError] = useState<Error | null>(null);

    // Refs to avoid stale closures and unnecessary re-subscriptions
    const unsubscribeRef = useRef<Unsubscribe | null>(null);
    const subscribeFnRef = useRef(subscribeFn);
    const queryKeyRef = useRef(queryKey);
    // Track if we've already initialized from cache to avoid repeated setData calls
    const initializedRef = useRef(false);
    // Track the last keyString to reset initialization when key changes
    const lastKeyStringRef = useRef(keyString);
    // Track current data to avoid redundant setData calls from subscription
    const dataRef = useRef<TData | undefined>(data);

    // Update refs on each render (but don't trigger re-subscription)
    subscribeFnRef.current = subscribeFn;
    queryKeyRef.current = queryKey;
    dataRef.current = data;

    // Reset initialization tracking when the key changes
    if (lastKeyStringRef.current !== keyString) {
        lastKeyStringRef.current = keyString;
        initializedRef.current = false;
    }

    // Set up the Firestore subscription
    useEffect(() => {
        if (!enabled) {
            // Clean up any existing subscription when disabled
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
            setIsLoading(false);
            initializedRef.current = false;
            return;
        }

        // Clean up previous subscription before setting up new one
        if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
        }

        // Check cache first - but only set state if we haven't initialized yet
        // This prevents the infinite re-render loop that occurs when setData
        // is called on every effect run
        if (!initializedRef.current) {
            const cached = queryClient.getQueryData<TData>(queryKeyRef.current);
            if (cached !== undefined) {
                setData(cached);
                setIsLoading(false);
            } else {
                setIsLoading(true);
            }
            initializedRef.current = true;
        }

        // Track if we've received first data from subscription
        let receivedFirstData = false;

        // Create a stable callback that uses refs
        const handleData = (newData: TData) => {
            // Skip if data hasn't actually changed (prevents redundant re-renders)
            // For arrays, compare by JSON string since reference always changes
            const currentData = dataRef.current;
            const hasChanged = currentData === undefined ||
                JSON.stringify(currentData) !== JSON.stringify(newData);

            if (hasChanged) {
                // Update local state
                setData(newData);
                setError(null);
                // Also update React Query cache for persistence
                queryClient.setQueryData(queryKeyRef.current, newData);
            }

            // Only update loading state on first data received
            if (!receivedFirstData) {
                receivedFirstData = true;
                setIsLoading(false);
            }
        };

        // Set up the subscription using the ref
        try {
            unsubscribeRef.current = subscribeFnRef.current(handleData);
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Subscription failed'));
            setIsLoading(false);
        }

        // Cleanup on unmount or when key/enabled changes
        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }
        };
        // Only re-subscribe when enabled changes or the key changes
        // subscribeFn is accessed via ref, so it doesn't need to be a dependency
    }, [enabled, keyString, queryClient]);

    return {
        data,
        isLoading,
        error,
    };
}
