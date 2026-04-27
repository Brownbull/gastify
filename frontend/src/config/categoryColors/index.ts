/**
 * Unified Category Color Configuration
 * Story 14.21: Category Color Consolidation
 *
 * Single source of truth for all category colors across:
 * - 44 Store Categories (L2 giros)
 * - 42 Item Categories (L4 categorias)
 * - 12 Store Groups (L1 rubros) + 9 Item Groups (L3 familias)
 * - 3 Themes: Normal (Ni No Kuni), Professional, Mono
 * - 2 Modes: Light, Dark
 *
 * Updated for V4 taxonomy (Story 17-2)
 *
 * @see docs/uxui/mockups/00_components/category-colors.html - Visual reference
 * @see docs/sprint-artifacts/epic14/category-color-consolidation.md - Design doc
 */

// Types
export type {
  ThemeName,
  ModeName,
  CategoryColorSet,
  GroupColorSet,
  ThemeModeColors,
  GroupThemeModeColors,
  StoreCategoryGroup,
  ItemCategoryGroup,
  ItemCategoryKey,
  GroupDisplayInfo,
} from './types';

// Groups: mappings, constants, and helpers
export {
  STORE_CATEGORY_GROUPS,
  ITEM_CATEGORY_TO_KEY,
  ITEM_CATEGORY_GROUPS,
  ALL_STORE_CATEGORY_GROUPS,
  ALL_ITEM_CATEGORY_GROUPS,
  expandStoreCategoryGroup,
  detectStoreCategoryGroup,
  getStoreCategoryGroupPrimaryCategory,
  expandItemCategoryGroup,
  detectItemCategoryGroup,
  STORE_GROUP_INFO,
  ITEM_GROUP_INFO,
} from './groups';

// Color data
export { STORE_CATEGORY_COLORS } from './storeColors';
export { ITEM_CATEGORY_COLORS } from './itemColors';
export { STORE_GROUP_COLORS, ITEM_GROUP_COLORS } from './groupColors';

// API functions
export {
  getStoreCategoryColors,
  getStoreCategoryColor,
  getStoreCategoryBackground,
  getItemCategoryColors,
  getItemCategoryColor,
  getItemCategoryBackground,
  getStoreGroupColors,
  getItemGroupColors,
  getStoreCategoryGroup,
  getItemCategoryGroup,
  getCategoryColors,
  getCategoryColor,
  getCategoryBackground,
  getCurrentTheme,
  getCurrentMode,
  getFontColorMode,
  getCategoryColorsAuto,
  getCategoryBackgroundAuto,
  getCategoryPillColors,
  getCategoryPillFgAuto,
  getContrastTextColor,
} from './api';
