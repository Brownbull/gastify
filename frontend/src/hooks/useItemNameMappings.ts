/**
 * useItemNameMappings Hook
 *
 * v9.7.0: Per-Store Item Name Learning
 * Story 15-6c: Migrated to repository pattern
 *
 * Real-time subscription to user's item name mappings with React Query caching.
 * Provides CRUD operations for item name learning per merchant.
 *
 * Key difference from merchant mappings:
 * - Item name mappings are scoped by normalizedMerchant (per-store)
 * - Matching requires both merchant name and item name
 */

import { useState, useCallback, useMemo } from 'react'
import Fuse, { IFuseOptions } from 'fuse.js'
import { User } from 'firebase/auth'
import { Services } from './useAuth'
import { useFirestoreSubscription } from './useFirestoreSubscription'
import { QUERY_KEYS } from '../lib/queryKeys'
import { normalizeItemName, MAPPING_CONFIG } from '../services/itemNameMappingService'
import { createMappingRepository } from '@/repositories'
import { normalizeMerchantName } from '../services/merchantMappingService'
import { ItemNameMapping, ItemNameMatchResult, NewItemNameMapping } from '../types/itemNameMapping'
import type { ItemCategory } from '../../shared/schema/categories'

/**
 * Capitalize each word in a string (Title Case)
 * Ensures all saved item names are consistently capitalized
 */
function toTitleCase(str: string): string {
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

/**
 * Default threshold for item name fuzzy matching.
 * Same as merchant matching (0.3) for consistency.
 * - 0 = exact match required
 * - 1 = matches anything
 */
const DEFAULT_THRESHOLD = 0.3

/**
 * Minimum normalized name length to prevent short string false matches.
 */
const MIN_NORMALIZED_LENGTH = 3

/**
 * Fuse.js configuration for item name matching.
 * Only searches the normalizedItemName field.
 */
const fuseOptions: IFuseOptions<ItemNameMapping> = {
    includeScore: true,
    threshold: DEFAULT_THRESHOLD,
    ignoreLocation: true,
    keys: ['normalizedItemName']
}

export interface UseItemNameMappingsReturn {
    /** List of all user's item name mappings */
    mappings: ItemNameMapping[]
    /** Loading state */
    loading: boolean
    /** Error state */
    error: Error | null
    /** Save a new item name mapping (or update existing) */
    saveMapping: (
        normalizedMerchant: string,
        originalItemName: string,
        targetItemName: string,
        targetCategory?: ItemCategory
    ) => Promise<string>
    /** Delete an item name mapping */
    deleteMapping: (mappingId: string) => Promise<void>
    /** Update an existing mapping's target item name */
    updateMapping: (mappingId: string, newTarget: string) => Promise<void>
    /** Find all mappings for a specific merchant (for scan processing) */
    findMatchesForMerchant: (merchantName: string) => ItemNameMapping[]
    /** Find specific item mapping for a merchant + item name combination */
    findMatch: (merchantName: string, itemName: string, threshold?: number) => ItemNameMatchResult | null
}

/**
 * React hook for managing item name mappings
 * Provides real-time subscription to user's mappings with CRUD operations
 */
export function useItemNameMappings(
    user: User | null,
    services: Services | null
): UseItemNameMappingsReturn {
    const [error, setError] = useState<Error | null>(null)

    // Story 15-6c: Create repository instance bound to user context
    const repo = useMemo(() => {
        if (!services?.db || !user?.uid) return null;
        return createMappingRepository<ItemNameMapping>(
            { db: services.db, userId: user.uid, appId: services.appId },
            MAPPING_CONFIG,
        );
    }, [services?.db, services?.appId, user?.uid])

    const enabled = !!repo

    // Create the query key
    const queryKey = useMemo(
        () => enabled
            ? QUERY_KEYS.mappings.itemName(user!.uid, services!.appId)
            : ['mappings', 'itemName', '', ''],
        [enabled, user?.uid, services?.appId]
    )

    // Subscribe to mappings with React Query caching
    const { data: mappings = [], isLoading } = useFirestoreSubscription<ItemNameMapping[]>(
        queryKey,
        (callback) => repo!.subscribe(callback),
        { enabled }
    )

    // Save a new mapping or update existing
    const saveMapping = useCallback(
        async (
            normalizedMerchant: string,
            originalItemName: string,
            targetItemName: string,
            targetCategory?: ItemCategory
        ): Promise<string> => {
            if (!repo) {
                throw new Error('User must be authenticated to save mappings')
            }

            // Always capitalize the target item name for consistency
            const capitalizedTarget = toTitleCase(targetItemName.trim())

            const newMapping: NewItemNameMapping = {
                normalizedMerchant,
                originalItemName,
                normalizedItemName: normalizeItemName(originalItemName),
                targetItemName: capitalizedTarget,
                // Include targetCategory if provided
                ...(targetCategory && { targetCategory }),
                confidence: 1.0, // Always 1.0 for user-set mappings
                source: 'user', // Always 'user' for MVP
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

    // Update a mapping's target item name
    const updateMapping = useCallback(
        async (mappingId: string, newTarget: string): Promise<void> => {
            if (!repo) {
                throw new Error('User must be authenticated to update mappings')
            }

            // Apply title case to the new target
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

    // Find all mappings for a specific merchant (for scan processing)
    // Returns mappings filtered by normalized merchant name
    const findMatchesForMerchant = useCallback(
        (merchantName: string): ItemNameMapping[] => {
            if (!merchantName) {
                return []
            }

            const normalizedMerchant = normalizeMerchantName(merchantName)

            // Filter mappings by normalized merchant
            return mappings.filter(m => m.normalizedMerchant === normalizedMerchant)
        },
        [mappings]
    )

    // Find specific item mapping for a merchant + item name combination
    // Uses fuzzy matching on item name within merchant-scoped mappings
    const findMatch = useCallback(
        (merchantName: string, itemName: string, threshold: number = DEFAULT_THRESHOLD): ItemNameMatchResult | null => {
            // Guard: empty input
            if (!merchantName || !itemName) {
                return null
            }

            // First, get mappings for this merchant
            const merchantMappings = findMatchesForMerchant(merchantName)

            // Guard: no mappings for this merchant
            if (merchantMappings.length === 0) {
                return null
            }

            const normalizedItem = normalizeItemName(itemName)

            // Guard: minimum length to prevent short string false matches
            if (normalizedItem.length < MIN_NORMALIZED_LENGTH) {
                return null
            }

            // Create Fuse instance for fuzzy matching on item names
            const fuse = new Fuse(merchantMappings, { ...fuseOptions, threshold })
            const results = fuse.search(normalizedItem)

            // No results found
            if (results.length === 0) {
                return null
            }

            const best = results[0]

            // Fuse.js score: 0 = perfect match, 1 = no match
            // Reject matches that are too fuzzy
            const score = best.score ?? 1
            if (score > threshold) {
                return null
            }

            // Calculate combined confidence
            const confidence = best.item.confidence * (1 - score)

            return {
                mapping: best.item,
                score,
                confidence
            }
        },
        [findMatchesForMerchant]
    )

    return useMemo(
        () => ({
            mappings,
            loading: isLoading,
            error,
            saveMapping,
            deleteMapping,
            updateMapping,
            findMatchesForMerchant,
            findMatch
        }),
        [mappings, isLoading, error, saveMapping, deleteMapping, updateMapping, findMatchesForMerchant, findMatch]
    )
}
