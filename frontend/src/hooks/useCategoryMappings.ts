/**
 * useCategoryMappings Hook
 *
 * Story 14.29: React Query Migration
 * Story 15-6c: Migrated to repository pattern
 *
 * Real-time subscription to user's category mappings with React Query caching.
 * Provides CRUD operations for category learning.
 */

import { useState, useCallback, useMemo } from 'react';
import { User } from 'firebase/auth';
import { Services } from './useAuth';
import { useFirestoreSubscription } from './useFirestoreSubscription';
import { QUERY_KEYS } from '../lib/queryKeys';
import { normalizeItemName, MAPPING_CONFIG } from '../services/categoryMappingService';
import { createMappingRepository } from '@/repositories';
import { CategoryMapping, MatchResult, NewCategoryMapping } from '../types/categoryMapping';
import type { StoreCategory } from '../../shared/schema/categories';

export interface UseCategoryMappingsReturn {
    /** List of all user's category mappings */
    mappings: CategoryMapping[];
    /** Loading state */
    loading: boolean;
    /** Error state */
    error: Error | null;
    /** Save a new category mapping (or update existing) */
    saveMapping: (item: string, category: StoreCategory, source?: 'user' | 'ai') => Promise<string>;
    /** Delete a category mapping */
    deleteMapping: (mappingId: string) => Promise<void>;
    /** Update an existing mapping's target category (Story 9.7 enhancement) */
    updateMapping: (mappingId: string, newCategory: StoreCategory) => Promise<void>;
    /** Find best match for an item name (stub - full implementation in Story 6.2) */
    findMatch: (itemName: string, merchant?: string) => MatchResult | null;
}

/**
 * React hook for managing category mappings
 * Provides real-time subscription to user's mappings with CRUD operations
 */
export function useCategoryMappings(
    user: User | null,
    services: Services | null
): UseCategoryMappingsReturn {
    const [error, setError] = useState<Error | null>(null);

    // Story 15-6c: Create repository instance bound to user context
    const repo = useMemo(() => {
        if (!services?.db || !user?.uid) return null;
        return createMappingRepository<CategoryMapping>(
            { db: services.db, userId: user.uid, appId: services.appId },
            MAPPING_CONFIG,
        );
    }, [services?.db, services?.appId, user?.uid]);

    const enabled = !!repo;

    // Create the query key
    const queryKey = useMemo(
        () => enabled
            ? QUERY_KEYS.mappings.category(user!.uid, services!.appId)
            : ['mappings', 'category', '', ''],
        [enabled, user?.uid, services?.appId]
    );

    // Subscribe to mappings with React Query caching
    const { data: mappings = [], isLoading } = useFirestoreSubscription<CategoryMapping[]>(
        queryKey,
        (callback) => repo!.subscribe(callback),
        { enabled }
    );

    // Save a new mapping or update existing
    const saveMapping = useCallback(
        async (item: string, category: StoreCategory, source: 'user' | 'ai' = 'user'): Promise<string> => {
            if (!repo) {
                throw new Error('User must be authenticated to save mappings');
            }

            const newMapping: NewCategoryMapping = {
                originalItem: item,
                normalizedItem: normalizeItemName(item),
                targetCategory: category,
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

    // Update a mapping's target category (Story 9.7 enhancement)
    const updateMapping = useCallback(
        async (mappingId: string, newCategory: StoreCategory): Promise<void> => {
            if (!repo) {
                throw new Error('User must be authenticated to update mappings');
            }

            try {
                await repo.updateTarget(mappingId, newCategory);
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
        (itemName: string, _merchant?: string): MatchResult | null => {
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
            updateMapping,
            findMatch
        }),
        [mappings, isLoading, error, saveMapping, deleteMapping, updateMapping, findMatch]
    );
}
