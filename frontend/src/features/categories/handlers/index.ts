/**
 * Categories Feature - Handlers Module
 *
 * Story 14e-17: Categories Feature Extraction
 *
 * The categories feature handlers are provided through the `useCategoriesState` hook.
 * Unlike more complex features (scan, batch-review), category operations are
 * straightforward CRUD operations that don't require separate handler functions.
 *
 * ## Why No Separate Handler Files?
 *
 * The underlying hooks (`useCategoryMappings`, `useSubcategoryMappings`) already:
 * - Handle authentication validation
 * - Handle service availability checks
 * - Handle Firestore operations with proper error handling
 * - Provide React Query cache integration
 *
 * The `useCategoriesState` hook wraps these with a unified interface.
 *
 * ## Available Operations via useCategoriesState
 *
 * Category operations:
 * - `saveCategoryMapping(item, category, source?)` - Create/update category mapping
 * - `deleteCategoryMapping(mappingId)` - Delete category mapping
 * - `updateCategoryMapping(mappingId, newCategory)` - Update mapping target
 * - `findCategoryMatch(itemName, merchant?)` - Find matching category mapping
 *
 * Subcategory operations:
 * - `saveSubcategoryMapping(item, subcategory, source?)` - Create/update subcategory mapping
 * - `deleteSubcategoryMapping(mappingId)` - Delete subcategory mapping
 * - `updateSubcategoryMapping(mappingId, newSubcategory)` - Update mapping target
 * - `findSubcategoryMatch(itemName)` - Find matching subcategory mapping
 *
 * ## Usage
 *
 * ```tsx
 * import { useCategoriesState } from '@features/categories';
 *
 * const {
 *   saveCategoryMapping,
 *   deleteCategoryMapping,
 *   updateCategoryMapping,
 * } = useCategoriesState(user, services);
 *
 * // Save a new mapping
 * await saveCategoryMapping('UBER EATS', 'Food & Drink');
 *
 * // Delete a mapping
 * await deleteCategoryMapping('mapping-id');
 *
 * // Update a mapping's target
 * await updateCategoryMapping('mapping-id', 'Transportation');
 * ```
 *
 * ## Future Extension
 *
 * If more complex handler logic is needed (e.g., bulk operations,
 * confirmation flows), handler functions can be added here following
 * the props-based dependency injection pattern from batch-review handlers.
 */

// Re-export state hook for convenience
export { useCategoriesState } from '../state';
export type { UseCategoriesStateReturn } from '../state';
