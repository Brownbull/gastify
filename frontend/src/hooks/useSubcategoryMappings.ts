/**
 * useSubcategoryMappings Hook
 *
 * Story 14.29: React Query Migration
 * Story 15-6c: Migrated to repository pattern
 *
 * Real-time subscription to user's subcategory mappings with React Query caching.
 * Provides CRUD operations for subcategory learning.
 */

import { useState, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import { Services } from './useAuth';
import { useFirestoreSubscription } from './useFirestoreSubscription';
import { QUERY_KEYS } from '../lib/queryKeys';
import { normalizeItemName, MAPPING_CONFIG } from '../services/subcategoryMappingService';
import { createMappingRepository } from '@/repositories';
import { SubcategoryMapping, SubcategoryMatchResult, NewSubcategoryMapping } from '../types/subcategoryMapping';

export interface UseSubcategoryMappingsReturn {
    /** List of all user's subcategory mappings */
    mappings: SubcategoryMapping[];
    /** Loading state */
    loading: boolean;
    /** Error state */
    error: Error | null;
    /** Save a new subcategory mapping (or update existing) */
    saveMapping: (item: string, subcategory: string, source?: 'user' | 'ai') => Promise<string>;
    /** Delete a subcategory mapping */
    deleteMapping: (mappingId: string) => Promise<void>;
    /** Update the target subcategory for an existing mapping */
    updateMappingTarget: (mappingId: string, newSubcategory: string) => Promise<void>;
    /** Find best match for an item name */
    findMatch: (itemName: string) => SubcategoryMatchResult | null;
}

/**
 * React hook for managing subcategory mappings
 * Provides real-time subscription to user's mappings with CRUD operations
 */
export function useSubcategoryMappings(
    user: User | null,
    services: Services | null
): UseSubcategoryMappingsReturn {
    const [error, setError] = useState<Error | null>(null);

    // Story 15-6c: Create repository instance bound to user context
    const repo = useMemo(() => {
        if (!services?.db || !user?.uid) return null;
        return createMappingRepository<SubcategoryMapping>(
            { db: services.db, userId: user.uid, appId: services.appId },
            MAPPING_CONFIG,
        );
    }, [services?.db, services?.appId, user?.uid]);

    const enabled = !!repo;

    // Create the query key
    const queryKey = useMemo(
        () => enabled
            ? QUERY_KEYS.mappings.subcategory(user!.uid, services!.appId)
            : ['mappings', 'subcategory', '', ''],
        [enabled, user?.uid, services?.appId]
    );

    // Subscribe to mappings with React Query caching
    const { data: mappings = [], isLoading } = useFirestoreSubscription<SubcategoryMapping[]>(
        queryKey,
        (callback) => repo!.subscribe(callback),
        { enabled }
    );

    // Save a new mapping or update existing
    const saveMapping = useCallback(
        async (item: string, subcategory: string, source: 'user' | 'ai' = 'user'): Promise<string> => {
            if (!repo) {
                throw new Error('User must be authenticated to save mappings');
            }

            const newMapping: NewSubcategoryMapping = {
                originalItem: item,
                normalizedItem: normalizeItemName(item),
                targetSubcategory: subcategory,
                confidence: source === 'user' ? 1.0 : 0.8,
                source,
                usageCount: 0
            };

            try {
                return await repo.save(newMapping);
            } catch (e) {
                const err = e instanceof Error ? e : new Error('Failed to save mapping');
                setError(err);
                throw err;
            }
        },
        [repo]
    );

    // Delete a mapping
    const deleteMapping = useCallback(
        async (mappingId: string): Promise<void> => {
            if (!repo) {
                throw new Error('User must be authenticated to delete mappings');
            }

            try {
                await repo.delete(mappingId);
            } catch (e) {
                const err = e instanceof Error ? e : new Error('Failed to delete mapping');
                setError(err);
                throw err;
            }
        },
        [repo]
    );

    // Update the target subcategory for an existing mapping
    const updateMappingTarget = useCallback(
        async (mappingId: string, newSubcategory: string): Promise<void> => {
            if (!repo) {
                throw new Error('User must be authenticated to update mappings');
            }

            try {
                await repo.updateTarget(mappingId, newSubcategory);
            } catch (e) {
                const err = e instanceof Error ? e : new Error('Failed to update mapping');
                setError(err);
                throw err;
            }
        },
        [repo]
    );

    // Find best match for an item name
    const findMatch = useCallback(
        (itemName: string): SubcategoryMatchResult | null => {
            if (mappings.length === 0) return null;

            const normalizedName = normalizeItemName(itemName);

            const exactMatch = mappings.find(
                m => m.normalizedItem === normalizedName
            );

            if (exactMatch) {
                return {
                    mapping: exactMatch,
                    score: 0,
                    confidence: exactMatch.confidence
                };
            }

            return null;
        },
        [mappings]
    );

    return useMemo(
        () => ({
            mappings,
            loading: isLoading,
            error,
            saveMapping,
            deleteMapping,
            updateMappingTarget,
            findMatch
        }),
        [mappings, isLoading, error, saveMapping, deleteMapping, updateMappingTarget, findMatch]
    );
}
