/**
 * Feature: Categories
 *
 * Story 14e-17: Categories Feature Extraction
 *
 * This module contains the categories state hook, handlers, and
 * the CategoriesFeature orchestrator component.
 *
 * The categories feature wraps existing useCategoryMappings and
 * useSubcategoryMappings hooks into a unified interface for
 * category learning and management.
 *
 * ## Usage
 *
 * ```tsx
 * // In App.tsx - wrap with CategoriesFeature provider
 * import { CategoriesFeature } from '@features/categories';
 *
 * <CategoriesFeature user={user} services={services}>
 *   <AppContent />
 * </CategoriesFeature>
 *
 * // In views/hooks - access via context
 * import { useCategoriesContext } from '@features/categories';
 *
 * const {
 *   categoryMappings,
 *   subcategoryMappings,
 *   isLoading,
 *   saveCategoryMapping,
 *   deleteCategoryMapping,
 * } = useCategoriesContext();
 *
 * // Or use the state hook directly (outside of provider)
 * import { useCategoriesState } from '@features/categories';
 *
 * const state = useCategoriesState(user, services);
 * ```
 */

// Re-export CategoriesFeature orchestrator component
export { CategoriesFeature, useCategoriesContext, useCategoriesContextOptional } from './CategoriesFeature';
export type { CategoriesFeatureProps } from './CategoriesFeature';

// Re-export state module
export * from './state';

// Re-export handlers module
export * from './handlers';

// Re-export utils module (Story 14e-42)
export * from './utils';
