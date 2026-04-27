/**
 * useMerchantMappings Hook
 *
 * Story 14.29: React Query Migration
 * Story 15-6c: Migrated to repository pattern
 *
 * Real-time subscription to user's merchant mappings with React Query caching.
 * Provides CRUD operations for merchant learning.
 */

import { useState, useCallback, useMemo } from 'react'
import { User } from 'firebase/auth'
import { Services } from './useAuth'
import { useFirestoreSubscription } from './useFirestoreSubscription'
import { QUERY_KEYS } from '../lib/queryKeys'
import { normalizeMerchantName, MAPPING_CONFIG } from '../services/merchantMappingService'
import { createMappingRepository } from '@/repositories'
import { findMerchantMatch } from '../services/merchantMatcherService'
import { MerchantMapping, MerchantMatchResult, NewMerchantMapping } from '../types/merchantMapping'
import type { StoreCategory } from '../../shared/schema/categories'

/**
 * Capitalize each word in a string (Title Case)
 * Story 9.6: Ensures all saved aliases are consistently capitalized
 */
function toTitleCase(str: string): string {
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

export interface UseMerchantMappingsReturn {
    /** List of all user's merchant mappings */
    mappings: MerchantMapping[]
    /** Loading state */
    loading: boolean
    /** Error state */
    error: Error | null
    /** Save a new merchant mapping (or update existing), optionally with store category */
    saveMapping: (originalMerchant: string, targetMerchant: string, storeCategory?: StoreCategory) => Promise<string>
    /** Delete a merchant mapping */
    deleteMapping: (mappingId: string) => Promise<void>
    /** Update an existing mapping's target merchant name (Story 9.7) */
    updateMapping: (mappingId: string, newTarget: string) => Promise<void>
    /** Find best match for a merchant name using fuzzy matching */
    findMatch: (merchantName: string, threshold?: number) => MerchantMatchResult | null
}

/**
 * React hook for managing merchant mappings
 * Provides real-time subscription to user's mappings with CRUD operations
 */
export function useMerchantMappings(
    user: User | null,
    services: Services | null
): UseMerchantMappingsReturn {
    const [error, setError] = useState<Error | null>(null)

    // Story 15-6c: Create repository instance bound to user context
    const repo = useMemo(() => {
        if (!services?.db || !user?.uid) return null;
        return createMappingRepository<MerchantMapping>(
            { db: services.db, userId: user.uid, appId: services.appId },
            MAPPING_CONFIG,
        );
    }, [services?.db, services?.appId, user?.uid])

    const enabled = !!repo

    // Create the query key
    const queryKey = useMemo(
        () => enabled
            ? QUERY_KEYS.mappings.merchant(user!.uid, services!.appId)
            : ['mappings', 'merchant', '', ''],
        [enabled, user?.uid, services?.appId]
    )

    // Subscribe to mappings with React Query caching
    const { data: mappings = [], isLoading } = useFirestoreSubscription<MerchantMapping[]>(
        queryKey,
        (callback) => repo!.subscribe(callback),
        { enabled }
    )

    // Save a new mapping or update existing
    const saveMapping = useCallback(
        async (originalMerchant: string, targetMerchant: string, storeCategory?: StoreCategory): Promise<string> => {
            if (!repo) {
                throw new Error('User must be authenticated to save mappings')
            }

            const capitalizedTarget = toTitleCase(targetMerchant.trim())

            const newMapping: NewMerchantMapping = {
                originalMerchant,
                normalizedMerchant: normalizeMerchantName(originalMerchant),
                targetMerchant: capitalizedTarget,
                ...(storeCategory && { storeCategory }),
                confidence: 1.0,
                source: 'user',
                usageCount: 0
            }

            try {
                return await repo.save(newMapping)
            } catch (e) {
                const err = e instanceof Error ? e : new Error('Failed to save mapping')
                setError(err)
                throw err
            }
        },
        [repo]
    )

    // Delete a mapping
    const deleteMapping = useCallback(
        async (mappingId: string): Promise<void> => {
            if (!repo) {
                throw new Error('User must be authenticated to delete mappings')
            }

            try {
                await repo.delete(mappingId)
            } catch (e) {
                const err = e instanceof Error ? e : new Error('Failed to delete mapping')
                setError(err)
                throw err
            }
        },
        [repo]
    )

    // Update a mapping's target merchant name (Story 9.7)
    const updateMapping = useCallback(
        async (mappingId: string, newTarget: string): Promise<void> => {
            if (!repo) {
                throw new Error('User must be authenticated to update mappings')
            }

            const capitalizedTarget = toTitleCase(newTarget.trim())

            try {
                await repo.updateTarget(mappingId, capitalizedTarget)
            } catch (e) {
                const err = e instanceof Error ? e : new Error('Failed to update mapping')
                setError(err)
                throw err
            }
        },
        [repo]
    )

    // Find best match for a merchant name using fuzzy matching
    const findMatch = useCallback(
        (merchantName: string, threshold?: number): MerchantMatchResult | null => {
            return findMerchantMatch(merchantName, mappings, threshold)
        },
        [mappings]
    )

    return useMemo(
        () => ({
            mappings,
            loading: isLoading,
            error,
            saveMapping,
            deleteMapping,
            updateMapping,
            findMatch
        }),
        [mappings, isLoading, error, saveMapping, deleteMapping, updateMapping, findMatch]
    )
}
