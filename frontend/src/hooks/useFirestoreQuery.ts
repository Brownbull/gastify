/**
 * useFirestoreQuery Hook
 *
 * Story 14.29: React Query Migration
 * Epic 14: Core Implementation
 *
 * React Query wrapper for one-time Firestore fetches.
 * Use for data that doesn't need real-time updates.
 *
 * Features:
 * - Automatic caching (5 min stale time by default)
 * - Automatic retry on failure
 * - Loading and error states
 *
 * @example
 * ```tsx
 * const { data, isLoading, error } = useFirestoreQuery(
 *     ['user-profile', userId],
 *     () => fetchUserProfile(userId),
 *     { enabled: !!userId }
 * );
 * ```
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';

/**
 * React Query wrapper for one-time Firestore fetches.
 *
 * @param queryKey - Unique key for caching (use QUERY_KEYS constants)
 * @param queryFn - Async function that fetches data
 * @param options - Additional React Query options
 * @returns Standard React Query result with data, isLoading, error, etc.
 */
export function useFirestoreQuery<TData, TError = Error>(
    queryKey: readonly unknown[],
    queryFn: () => Promise<TData>,
    options?: Omit<UseQueryOptions<TData, TError, TData, readonly unknown[]>, 'queryKey' | 'queryFn'>
) {
    return useQuery<TData, TError, TData, readonly unknown[]>({
        queryKey,
        queryFn,
        ...options,
    });
}
