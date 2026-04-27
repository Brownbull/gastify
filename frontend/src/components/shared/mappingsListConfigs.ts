/**
 * MappingsList configuration objects for each mapping type.
 *
 * Story 15-3b: Config-driven approach replaces 4 near-identical components.
 * Each config defines field accessors, styling, and behavior for MappingsList<T>.
 *
 * @module components/shared/mappingsListConfigs
 */

import { BookMarked, Store, Tag, Package } from 'lucide-react';
import type { CategoryMapping } from '../../types/categoryMapping';
import type { MerchantMapping } from '../../types/merchantMapping';
import type { SubcategoryMapping } from '../../types/subcategoryMapping';
import type { ItemNameMapping } from '../../types/itemNameMapping';
import { STORE_CATEGORIES } from '../../config/constants';
import type { MappingsListConfig } from './MappingsList';

/** Capitalize first letter of each word */
const titleCase = (name: string): string =>
  name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

// =============================================================================
// Category Mappings — select dropdown edit, blue tag
// =============================================================================

export const categoryMappingsConfig: MappingsListConfig<CategoryMapping> = {
  getId: (m) => m.id,
  getDisplayName: (m) => m.originalItem,
  getEditValue: (m) => m.targetCategory,
  getTagLabel: (m) => m.targetCategory,
  getUsageCount: (m) => m.usageCount,
  getDeleteMessage: (m) => `"${m.originalItem}"`,

  emptyIcon: BookMarked,
  emptyMessageKey: 'learnedCategoriesEmpty',
  emptyHintKey: 'learnedCategoriesHint',
  deleteConfirmTitleKey: 'deleteMappingConfirm',
  editTitleKey: 'editCategoryTarget',
  listAriaLabelKey: 'learnedCategories',
  editAriaLabelKey: 'editCategoryMapping',
  deleteAriaLabelKey: 'deleteMapping',
  tagStyle: { bg: '#dbeafe', text: '#2563eb' },
  editGradient: 'from-blue-400 to-blue-600',

  editButtonColor: '#22c55e',

  editMode: 'select',
  selectOptions: STORE_CATEGORIES,
};

// =============================================================================
// Merchant Mappings — text input edit, amber tag, green gradient
// =============================================================================

export const merchantMappingsConfig: MappingsListConfig<MerchantMapping> = {
  getId: (m) => m.id,
  getDisplayName: (m) => m.targetMerchant,
  getEditValue: (m) => m.targetMerchant,
  getTagLabel: (m) => m.originalMerchant,
  getUsageCount: (m) => m.usageCount,
  getDeleteMessage: (m) => `"${m.originalMerchant} → ${m.targetMerchant}"`,

  emptyIcon: Store,
  emptyMessageKey: 'learnedMerchantsEmpty',
  deleteConfirmTitleKey: 'deleteMerchantMappingConfirm',
  editTitleKey: 'editMerchantTarget',
  listAriaLabelKey: 'learnedMerchants',
  editAriaLabelKey: 'editMerchantMapping',
  deleteAriaLabelKey: 'deleteMapping',
  tagStyle: { bg: '#fef3c7', darkBg: 'rgba(254, 243, 199, 0.2)', text: '#d97706' },
  editGradient: 'from-green-400 to-green-600',

  editButtonColor: '#22c55e',

  editMode: 'text',
  editPlaceholderKey: 'displayName',
  getEditContext: (m) => m.originalMerchant,
};

// =============================================================================
// Subcategory Mappings — text input edit, pink tag, green gradient
// =============================================================================

export const subcategoryMappingsConfig: MappingsListConfig<SubcategoryMapping> = {
  getId: (m) => m.id,
  getDisplayName: (m) => m.originalItem,
  getEditValue: (m) => m.targetSubcategory,
  getTagLabel: (m) => m.targetSubcategory,
  getUsageCount: (m) => m.usageCount,
  getDeleteMessage: (m) => `"${m.originalItem}"`,

  emptyIcon: Tag,
  emptyMessageKey: 'learnedSubcategoriesEmpty',
  emptyHintKey: 'learnedSubcategoriesHint',
  deleteConfirmTitleKey: 'deleteSubcategoryMappingConfirm',
  editTitleKey: 'editSubcategoryMapping',
  listAriaLabelKey: 'learnedSubcategories',
  editAriaLabelKey: 'editMapping',
  deleteAriaLabelKey: 'deleteMapping',
  tagStyle: { bg: '#fce7f3', text: '#db2777' },
  editGradient: 'from-green-500 to-green-600',

  editButtonColor: '#22c55e',

  editMode: 'text',
  editPlaceholderKey: 'enterSubcategory',
};

// =============================================================================
// Item Name Mappings — text input edit, blue tag, grouped by merchant
// =============================================================================

export const itemNameMappingsConfig: MappingsListConfig<ItemNameMapping> = {
  getId: (m) => m.id,
  getDisplayName: (m) => m.targetItemName,
  getEditValue: (m) => m.targetItemName,
  getTagLabel: (m) => m.originalItemName,
  getUsageCount: (m) => m.usageCount,
  getDeleteMessage: (m) => `${titleCase(m.normalizedMerchant)}: "${m.originalItemName} → ${m.targetItemName}"`,

  emptyIcon: Package,
  emptyMessageKey: 'learnedItemNamesEmpty',
  deleteConfirmTitleKey: 'deleteItemNameMappingConfirm',
  editTitleKey: 'editItemNameTarget',
  listAriaLabelKey: 'learnedItemNames',
  editAriaLabelKey: 'editItemNameMapping',
  deleteAriaLabelKey: 'deleteMapping',
  tagStyle: { bg: '#dbeafe', darkBg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6' },
  editGradient: 'from-blue-400 to-blue-600',

  editButtonColor: '#3b82f6',

  editMode: 'text',
  editPlaceholderKey: 'itemName',
  getEditContext: (m) => `${titleCase(m.normalizedMerchant)}:`,

  groupBy: (m) => m.normalizedMerchant,
  groupIcon: Store,
  formatGroupLabel: titleCase,
};
