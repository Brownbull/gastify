/**
 * useCategoriesState Hook
 *
 * Story 14e-17: Categories Feature Extraction
 *
 * Unified state hook that wraps existing useCategoryMappings and
 * useSubcategoryMappings hooks into a single interface for the
 * categories feature.
 *
 * This hook follows the Hook Wrapper Pattern from Epic 14c-refactor:
 * - Wraps existing hooks rather than replacing them
 * - Uses useMemo for stable object references
 * - Maintains exact same interface for backward compatibility
 *
 * @see src/hooks/useCategoryMappings.ts - Source hook for category mappings
 * @see src/hooks/useSubcategoryMappings.ts - Source hook for subcategory mappings
 */

import { useMemo } from 'react';
import { User } from 'firebase/auth';
import { Services } from '@/hooks/useAuth';
import { useCategoryMappings, UseCategoryMappingsReturn } from '@/hooks/useCategoryMappings';
import { useSubcategoryMappings, UseSubcategoryMappingsReturn } from '@/hooks/useSubcategoryMappings';
import { CategoryMapping, MatchResult } from '@/types/categoryMapping';
import { SubcategoryMapping, SubcategoryMatchResult } from '@/types/subcategoryMapping';
import type { StoreCategory } from '../../../../shared/schema/categories';

/**
 * Return type for the useCategoriesState hook.
 *
 * Provides unified access to both category and subcategory mappings
 * with all CRUD operations.
 */
export interface UseCategoriesStateReturn {
    // ============================================================
    // DATA
    // ============================================================

    /** All category mappings for the user */
    categoryMappings: CategoryMapping[];

    /** All subcategory mappings for the user */
    subcategoryMappings: SubcategoryMapping[];

    // ============================================================
    // STATE
    // ============================================================

    /** Combined loading state (true if either hook is loading) */
    isLoading: boolean;

    /** Loading state for category mappings specifically */
    categoryLoading: boolean;

    /** Loading state for subcategory mappings specifically */
    subcategoryLoading: boolean;

    /** Error from category mappings hook */
    categoryError: Error | null;

    /** Error from subcategory mappings hook */
    subcategoryError: Error | null;

    // ============================================================
    // CATEGORY OPERATIONS
    // ============================================================

    /**
     * Save a new category mapping or update existing.
     * @param item - Item name to map
     * @param category - Target category
     * @param source - Source of mapping ('user' or 'ai'), defaults to 'user'
     * @returns Promise resolving to the mapping ID
     */
    saveCategoryMapping: (
        item: string,
        category: StoreCategory,
        source?: 'user' | 'ai'
    ) => Promise<string>;

    /**
     * Delete a category mapping by ID.
     * @param mappingId - ID of the mapping to delete
     */
    deleteCategoryMapping: (mappingId: string) => Promise<void>;

    /**
     * Update an existing category mapping's target category.
     * @param mappingId - ID of the mapping to update
     * @param newCategory - New target category
     */
    updateCategoryMapping: (
        mappingId: string,
        newCategory: StoreCategory
    ) => Promise<void>;

    /**
     * Find best match for an item name in category mappings.
     * @param itemName - Item name to search for
     * @param merchant - Optional merchant for context
     * @returns Match result or null if no match found
     */
    findCategoryMatch: (
        itemName: string,
        merchant?: string
    ) => MatchResult | null;

    // ============================================================
    // SUBCATEGORY OPERATIONS
    // ============================================================

    /**
     * Save a new subcategory mapping or update existing.
     * @param item - Item name to map
     * @param subcategory - Target subcategory
     * @param source - Source of mapping ('user' or 'ai'), defaults to 'user'
     * @returns Promise resolving to the mapping ID
     */
    saveSubcategoryMapping: (
        item: string,
        subcategory: string,
        source?: 'user' | 'ai'
    ) => Promise<string>;

    /**
     * Delete a subcategory mapping by ID.
     * @param mappingId - ID of the mapping to delete
     */
    deleteSubcategoryMapping: (mappingId: string) => Promise<void>;

    /**
     * Update an existing subcategory mapping's target subcategory.
     * @param mappingId - ID of the mapping to update
     * @param newSubcategory - New target subcategory
     */
    updateSubcategoryMapping: (
        mappingId: string,
        newSubcategory: string
    ) => Promise<void>;

    /**
     * Find best match for an item name in subcategory mappings.
     * @param itemName - Item name to search for
     * @returns Match result or null if no match found
     */
    findSubcategoryMatch: (itemName: string) => SubcategoryMatchResult | null;

    // ============================================================
    // RAW HOOK ACCESS (for backward compatibility)
    // ============================================================

    /** Direct access to useCategoryMappings return value */
    categoryHook: UseCategoryMappingsReturn;

    /** Direct access to useSubcategoryMappings return value */
    subcategoryHook: UseSubcategoryMappingsReturn;
}

/**
 * Unified hook for category and subcategory mapping state management.
 *
 * Wraps both useCategoryMappings and useSubcategoryMappings into a single
 * interface with all data and operations needed for the categories feature.
 *
 * @param user - Current authenticated user (or null if not authenticated)
 * @param services - Firebase services object (or null if not initialized)
 * @returns Unified categories state and operations
 *
 * @example
 * ```tsx
 * const {
 *   categoryMappings,
 *   subcategoryMappings,
 *   isLoading,
 *   saveCategoryMapping,
 *   deleteSubcategoryMapping,
 * } = useCategoriesState(user, services);
 *
 * // Save a category mapping
 * await saveCategoryMapping('UBER EATS', 'Food & Drink');
 *
 * // Delete a subcategory mapping
 * await deleteSubcategoryMapping(mappingId);
 * ```
 */
export function useCategoriesState(
    user: User | null,
    services: Services | null
): UseCategoriesStateReturn {
    // Call underlying hooks
    const categoryHook = useCategoryMappings(user, services);
    const subcategoryHook = useSubcategoryMappings(user, services);

    // Return memoized unified interface
    return useMemo<UseCategoriesStateReturn>(
        () => ({
            // Data
            categoryMappings: categoryHook.mappings,
            subcategoryMappings: subcategoryHook.mappings,

            // State
            isLoading: categoryHook.loading || subcategoryHook.loading,
            categoryLoading: categoryHook.loading,
            subcategoryLoading: subcategoryHook.loading,
            categoryError: categoryHook.error,
            subcategoryError: subcategoryHook.error,

            // Category operations (with renamed methods for clarity)
            saveCategoryMapping: categoryHook.saveMapping,
            deleteCategoryMapping: categoryHook.deleteMapping,
            updateCategoryMapping: categoryHook.updateMapping,
            findCategoryMatch: categoryHook.findMatch,

            // Subcategory operations (with renamed methods for clarity)
            saveSubcategoryMapping: subcategoryHook.saveMapping,
            deleteSubcategoryMapping: subcategoryHook.deleteMapping,
            updateSubcategoryMapping: subcategoryHook.updateMappingTarget,
            findSubcategoryMatch: subcategoryHook.findMatch,

            // Raw hook access for backward compatibility
            categoryHook,
            subcategoryHook,
        }),
        [categoryHook, subcategoryHook]
    );
}
