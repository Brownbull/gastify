/**
 * Type definitions for category color system.
 * Split from categoryColors.ts (Story 14.21)
 * Updated for V4 taxonomy (Story 17-2)
 */

import type { StoreCategory, ItemCategory } from '../../../shared/schema/categories';

// Re-export schema types for convenience
export type { StoreCategory, ItemCategory };

// ============================================================================
// TYPES
// ============================================================================

export type ThemeName = 'normal' | 'professional' | 'mono';
export type ModeName = 'light' | 'dark';

export interface CategoryColorSet {
  /** Foreground color for text/icons */
  fg: string;
  /** Background color for badges/chips */
  bg: string;
}

export interface GroupColorSet extends CategoryColorSet {
  /** Border/accent color for group headers */
  border: string;
}

export type ThemeModeColors = {
  [theme in ThemeName]: {
    [mode in ModeName]: CategoryColorSet;
  };
};

export type GroupThemeModeColors = {
  [theme in ThemeName]: {
    [mode in ModeName]: GroupColorSet;
  };
};

// ============================================================================
// GROUP TYPES — V4 (4-Level Spanish Taxonomy)
// ============================================================================

/** L1 Rubros — 12 store category groups */
export type StoreCategoryGroup =
  | 'supermercados'
  | 'restaurantes'
  | 'comercio-barrio'
  | 'vivienda'
  | 'salud-bienestar'
  | 'tiendas-generales'
  | 'tiendas-especializadas'
  | 'transporte-vehiculo'
  | 'educacion'
  | 'servicios-finanzas'
  | 'entretenimiento-hospedaje'
  | 'otros';

/** L3 Familias — 9 item category groups */
export type ItemCategoryGroup =
  | 'food-fresh'
  | 'food-packaged'
  | 'food-prepared'
  | 'salud-cuidado'
  | 'hogar'
  | 'productos-generales'
  | 'servicios-cargos'
  | 'vicios'
  | 'otros-item';

/**
 * ItemCategoryKey — V4 identity mapping.
 * In V4, item category keys ARE the ItemCategory values (all PascalCase, no spaces).
 * Kept for backward compatibility with color/group lookups.
 */
export type ItemCategoryKey = ItemCategory;

// ============================================================================
// GROUP DISPLAY INFO - Story 14.16
// ============================================================================

/**
 * Display information for store/item category groups.
 * Used in weekly reports for grouped category breakdown.
 */
export interface GroupDisplayInfo {
  /** Group key */
  key: StoreCategoryGroup | ItemCategoryGroup;
  /** Display name in Spanish */
  name: string;
  /** Representative emoji for the group */
  emoji: string;
  /** CSS class for styling (matches mockup) */
  cssClass: string;
}
