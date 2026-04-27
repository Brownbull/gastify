/**
 * React Query Client Configuration
 *
 * Story 14.29: React Query Migration
 * Story 14c-refactor.12: Transaction Service Simplification (verified 2026-01-21)
 * Epic 14: Core Implementation
 *
 * This is the SINGLE source of truth for transaction caching.
 * No IndexedDB or localStorage caching for transactions exists.
 *
 * Configures the QueryClient with optimal defaults for Firestore:
 *
 * ## Configuration Rationale
 *
 * - **staleTime: 5 minutes** - Data considered fresh for 5 minutes.
 *   During this time, cache is used without background refetch.
 *   Balances freshness vs Firestore read costs.
 *
 * - **gcTime: 30 minutes** - Cache kept for 30 minutes after last use.
 *   Allows instant navigation back to previously visited data.
 *   Longer than staleTime to benefit from cache on navigation.
 *
 * - **retry: 1** - Single retry on failure.
 *   Firestore has good internal retry logic, so one additional retry is sufficient.
 *
 * - **refetchOnWindowFocus: true** - Catch updates while user was away.
 *   Important for multi-device usage and background changes.
 *
 * - **refetchOnMount: false** - Don't refetch on component mount if data is fresh.
 *   Key for reducing Firestore reads on navigation between views.
 *
 * - **refetchOnReconnect: false** - Firestore handles reconnection internally.
 *   Avoiding duplicate refetches.
 *
 * @see src/lib/queryKeys.ts for query key definitions
 * @see src/hooks/useFirestoreSubscription.ts for real-time subscription pattern
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Data considered fresh for 5 minutes
            // During this time, cache is used without background refetch
            staleTime: 5 * 60 * 1000,

            // Cache kept for 30 minutes after last use
            // Allows instant navigation back to previously visited data
            gcTime: 30 * 60 * 1000,

            // Retry once on failure (Firestore has good retry logic internally)
            retry: 1,

            // Refetch when window regains focus (catch updates while away)
            refetchOnWindowFocus: true,

            // Don't refetch on component mount if data is fresh
            // This is key for reducing Firestore reads
            refetchOnMount: false,

            // Don't refetch on reconnect (Firestore handles this)
            refetchOnReconnect: false,
        },
        mutations: {
            // Retry mutations once
            retry: 1,
        },
    },
});
