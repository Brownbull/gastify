/**
 * API functions for category color lookups.
 * Split from categoryColors.ts (Story 14.21)
 */

import type {
  StoreCategory,
  ItemCategory,
  ThemeName,
  ModeName,
  ThemeModeColors,
  CategoryColorSet,
  GroupColorSet,
  StoreCategoryGroup,
  ItemCategoryGroup,
} from './types';
import { STORE_CATEGORY_COLORS } from './storeColors';
import { ITEM_CATEGORY_COLORS } from './itemColors';
import { STORE_GROUP_COLORS, ITEM_GROUP_COLORS } from './groupColors';
import {
  STORE_CATEGORY_GROUPS,
  ITEM_CATEGORY_TO_KEY,
  ITEM_CATEGORY_GROUPS,
} from './groups';
import { getStorageString } from '@/utils/storage';

// ============================================================================
// FALLBACK COLORS
// ============================================================================

const FALLBACK_COLORS: ThemeModeColors = {
  normal: { light: { fg: '#64748b', bg: '#f1f5f9' }, dark: { fg: '#cbd5e1', bg: '#334155' } },
  professional: { light: { fg: '#64748b', bg: '#f1f5f9' }, dark: { fg: '#94a3b8', bg: '#475569' } },
  mono: { light: { fg: '#607080', bg: '#e8ecf0' }, dark: { fg: '#98a8b8', bg: '#303840' } },
};

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get the color set for a store category.
 */
export function getStoreCategoryColors(
  category: StoreCategory,
  theme: ThemeName = 'normal',
  mode: ModeName = 'light'
): CategoryColorSet {
  const colors = STORE_CATEGORY_COLORS[category];
  if (!colors) {
    return FALLBACK_COLORS[theme][mode];
  }
  return colors[theme][mode];
}

/**
 * Get the foreground color for a store category.
 */
export function getStoreCategoryColor(
  category: StoreCategory,
  theme: ThemeName = 'normal',
  mode: ModeName = 'light'
): string {
  return getStoreCategoryColors(category, theme, mode).fg;
}

/**
 * Get the background color for a store category.
 */
export function getStoreCategoryBackground(
  category: StoreCategory,
  theme: ThemeName = 'normal',
  mode: ModeName = 'light'
): string {
  return getStoreCategoryColors(category, theme, mode).bg;
}

/**
 * Get the color set for an item category.
 */
export function getItemCategoryColors(
  category: ItemCategory | string,
  theme: ThemeName = 'normal',
  mode: ModeName = 'light'
): CategoryColorSet {
  const key = ITEM_CATEGORY_TO_KEY[category as ItemCategory];
  if (!key) {
    return FALLBACK_COLORS[theme][mode];
  }
  const colors = ITEM_CATEGORY_COLORS[key];
  if (!colors) {
    return FALLBACK_COLORS[theme][mode];
  }
  return colors[theme][mode];
}

/**
 * Get the foreground color for an item category.
 */
export function getItemCategoryColor(
  category: ItemCategory | string,
  theme: ThemeName = 'normal',
  mode: ModeName = 'light'
): string {
  return getItemCategoryColors(category, theme, mode).fg;
}

/**
 * Get the background color for an item category.
 */
export function getItemCategoryBackground(
  category: ItemCategory | string,
  theme: ThemeName = 'normal',
  mode: ModeName = 'light'
): string {
  return getItemCategoryColors(category, theme, mode).bg;
}

/**
 * Get the color set for a store category group.
 */
export function getStoreGroupColors(
  group: StoreCategoryGroup,
  theme: ThemeName = 'normal',
  mode: ModeName = 'light'
): GroupColorSet {
  return STORE_GROUP_COLORS[group][theme][mode];
}

/**
 * Get the color set for an item category group.
 */
export function getItemGroupColors(
  group: ItemCategoryGroup,
  theme: ThemeName = 'normal',
  mode: ModeName = 'light'
): GroupColorSet {
  return ITEM_GROUP_COLORS[group][theme][mode];
}

/**
 * Get the group for a store category.
 */
export function getStoreCategoryGroup(category: StoreCategory): StoreCategoryGroup {
  return STORE_CATEGORY_GROUPS[category] || 'otros';
}

/**
 * Get the group for an item category.
 */
export function getItemCategoryGroup(category: ItemCategory | string): ItemCategoryGroup {
  const key = ITEM_CATEGORY_TO_KEY[category as ItemCategory];
  if (!key) {
    return 'otros-item';
  }
  return ITEM_CATEGORY_GROUPS[key] || 'otros-item';
}

/**
 * Universal function to get colors for any category (store or item).
 * Story 14.13 Session 9: Also handles Store Groups and Item Groups.
 * Lookup order: Store Groups -> Item Groups -> Store Categories -> Item Categories -> Fallback
 */
export function getCategoryColors(
  category: string,
  theme: ThemeName = 'normal',
  mode: ModeName = 'light'
): CategoryColorSet {
  // Try store group first (e.g., 'supermercados', 'tiendas-generales')
  if (category in STORE_GROUP_COLORS) {
    return getStoreGroupColors(category as StoreCategoryGroup, theme, mode);
  }
  // Try item group (e.g., 'food-fresh', 'food-packaged')
  if (category in ITEM_GROUP_COLORS) {
    return getItemGroupColors(category as ItemCategoryGroup, theme, mode);
  }
  // Try store category (e.g., 'Supermarket', 'Restaurant')
  if (category in STORE_CATEGORY_COLORS) {
    return getStoreCategoryColors(category as StoreCategory, theme, mode);
  }
  // Try item category (e.g., 'Produce', 'Meat & Seafood')
  return getItemCategoryColors(category, theme, mode);
}

/**
 * Universal function to get foreground color for any category.
 */
export function getCategoryColor(
  category: string,
  theme: ThemeName = 'normal',
  mode: ModeName = 'light'
): string {
  return getCategoryColors(category, theme, mode).fg;
}

/**
 * Universal function to get background color for any category.
 */
export function getCategoryBackground(
  category: string,
  theme: ThemeName = 'normal',
  mode: ModeName = 'light'
): string {
  return getCategoryColors(category, theme, mode).bg;
}

// ============================================================================
// DOM-AWARE HELPERS (for components without theme props)
// ============================================================================

/**
 * Detect current theme from DOM (data-theme attribute on html element).
 * Falls back to 'normal' if not set or SSR.
 */
export function getCurrentTheme(): ThemeName {
  if (typeof document === 'undefined') return 'normal';
  const theme = document.documentElement.getAttribute('data-theme');
  if (theme === 'professional' || theme === 'mono') return theme;
  return 'normal';
}

/**
 * Detect current mode from DOM (dark class on html element).
 * Falls back to 'light' if not set or SSR.
 */
export function getCurrentMode(): ModeName {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/**
 * Story 14.21: Get font color mode from localStorage.
 * 'colorful' = use category fg colors
 * 'plain' = use standard black/white text colors
 */
export function getFontColorMode(): 'colorful' | 'plain' {
  const mode = getStorageString('fontColorMode', 'colorful');
  return mode === 'plain' ? 'plain' : 'colorful';
}

/**
 * Story 14.21: Plain text colors based on light/dark mode.
 * Used when fontColorMode is 'plain'.
 */
const PLAIN_TEXT_COLORS = {
  light: '#1f2937', // gray-800 - near black
  dark: '#f9fafb',  // gray-50 - near white
};

/**
 * Get category colors using current theme/mode from DOM.
 * Use this when colorTheme/mode props are not available.
 *
 * Story 14.21: Respects fontColorMode setting.
 * - 'colorful': Returns the category's fg color (default)
 * - 'plain': Returns black (light mode) or white (dark mode)
 *
 * @param category - The category name (store or item)
 * @returns ColorSet with fg and bg colors for current theme/mode
 */
export function getCategoryColorsAuto(category: string): CategoryColorSet {
  const colors = getCategoryColors(category, getCurrentTheme(), getCurrentMode());

  // Story 14.21: When fontColorMode is 'plain', override fg with plain text color
  if (getFontColorMode() === 'plain') {
    const mode = getCurrentMode();
    return {
      fg: PLAIN_TEXT_COLORS[mode],
      bg: colors.bg,
    };
  }

  return colors;
}

/**
 * Get category background color using current theme/mode from DOM.
 * Convenience function for chart colors where only bg is needed.
 *
 * @param category - The category name (store or item)
 * @returns Background color hex string for current theme/mode
 */
export function getCategoryBackgroundAuto(category: string): string {
  return getCategoryColors(category, getCurrentTheme(), getCurrentMode()).bg;
}

/**
 * Story 14.21: Get category colors for pills/badges/legends.
 * ALWAYS returns colorful fg colors regardless of fontColorMode setting.
 * Use this for category pills, badges, and legend items where the text
 * should always be colored to match the category.
 *
 * @param category - The category name (store or item)
 * @returns ColorSet with fg (always colorful) and bg colors for current theme/mode
 */
export function getCategoryPillColors(category: string): CategoryColorSet {
  return getCategoryColors(category, getCurrentTheme(), getCurrentMode());
}

/**
 * Story 14.21: Get category foreground color for pills/badges.
 * ALWAYS returns the colorful fg color regardless of fontColorMode.
 *
 * @param category - The category name (store or item)
 * @returns Foreground color hex string (always colorful)
 */
export function getCategoryPillFgAuto(category: string): string {
  return getCategoryColors(category, getCurrentTheme(), getCurrentMode()).fg;
}

// ============================================================================
// CONTRAST COLOR UTILITY
// ============================================================================

/**
 * Calculate relative luminance of a color (for WCAG contrast calculations).
 * @param hex - Hex color string (with or without #)
 * @returns Luminance value between 0 and 1
 */
function getLuminance(hex: string): number {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Parse RGB values
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  // Apply gamma correction
  const rLinear = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gLinear = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bLinear = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  // Calculate luminance using WCAG formula
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

/**
 * Get a contrasting text color (white or dark) for a given background color.
 * Uses WCAG luminance formula to ensure readability.
 *
 * @param backgroundColor - Hex color of the background
 * @returns '#ffffff' for dark backgrounds, '#1f2937' for light backgrounds
 *
 * @example
 * getContrastTextColor('#3b82f6') // Returns '#ffffff' (white text on blue)
 * getContrastTextColor('#fef3c7') // Returns '#1f2937' (dark text on light yellow)
 */
export function getContrastTextColor(backgroundColor: string): string {
  // Handle CSS variables - default to white for safety
  if (backgroundColor.startsWith('var(')) {
    return '#ffffff';
  }

  try {
    const luminance = getLuminance(backgroundColor);
    // Use 0.5 as threshold - higher luminance = lighter color = needs dark text
    return luminance > 0.5 ? '#1f2937' : '#ffffff';
  } catch {
    // Fallback to white on parse error
    return '#ffffff';
  }
}
