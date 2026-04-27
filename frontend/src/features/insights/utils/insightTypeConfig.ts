/**
 * Insight Type Configuration
 *
 * Story 10a.4: Insights History View
 * Story 14.33a: Insight Card Types & Styling
 *
 * Centralized configuration for insight type icons, colors, and fallback messages.
 * Used by InsightHistoryCard and InsightDetailModal components.
 */

import { ComponentType } from 'react';
import { LucideProps } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { InsightCategory } from '@/types/insight';

// ============================================================================
// Types
// ============================================================================

export type LucideIcon = ComponentType<LucideProps>;

/**
 * Story 14.33a: Visual insight types for card styling
 * Maps to distinct color schemes and icons per mockup
 */
export type InsightVisualType = 'quirky' | 'celebration' | 'actionable' | 'tradeoff' | 'trend';

export interface InsightTypeStyle {
  icon: string;
  color: string;
  bgColor: string;
  darkBgColor: string;
}

/**
 * Story 14.33a: Visual config for each insight type
 * Story 14.33a.1: Updated to use theme-aware CSS variables
 * Per mockup: insights.html
 */
export interface InsightVisualConfig {
  /** CSS variable for background color (theme-aware) */
  bgColor: string;
  /** CSS variable for icon color (theme-aware) */
  iconColor: string;
}

export interface InsightFallbackInfo {
  message: string;
  needsContext: boolean;
}

// ============================================================================
// Icon and Color Configuration
// ============================================================================

/**
 * Type-specific styling for each insight type.
 * Maps insightId to icon, color scheme for light and dark themes.
 */
export const INSIGHT_TYPE_CONFIG: Record<string, InsightTypeStyle> = {
  // Actionable insights - blue tones
  merchant_frequency: { icon: 'Store', color: '#2563eb', bgColor: '#dbeafe', darkBgColor: '#1e3a5f' },
  category_trend: { icon: 'TrendingUp', color: '#059669', bgColor: '#d1fae5', darkBgColor: '#064e3b' },
  spending_pattern: { icon: 'BarChart3', color: '#7c3aed', bgColor: '#ede9fe', darkBgColor: '#4c1d95' },
  // Story 14.16b: budget_alert uses semantic warning colors for theme harmony
  budget_alert: { icon: 'AlertTriangle', color: 'var(--warning-semantic)', bgColor: 'var(--warning-bg)', darkBgColor: 'var(--warning-bg)' },
  spending_velocity: { icon: 'Gauge', color: '#0891b2', bgColor: '#cffafe', darkBgColor: '#164e63' },
  duplicate_detected: { icon: 'Copy', color: '#f59e0b', bgColor: '#fef3c7', darkBgColor: '#78350f' },

  // Celebratory insights - warm tones
  milestone_reached: { icon: 'Trophy', color: '#d97706', bgColor: '#fef3c7', darkBgColor: '#78350f' },
  scan_streak: { icon: 'Flame', color: '#ea580c', bgColor: '#ffedd5', darkBgColor: '#7c2d12' },
  savings_found: { icon: 'Piggybank', color: '#16a34a', bgColor: '#dcfce7', darkBgColor: '#14532d' },
  item_count: { icon: 'Package', color: '#0891b2', bgColor: '#cffafe', darkBgColor: '#164e63' },
  biggest_item: { icon: 'ShoppingBag', color: '#7c3aed', bgColor: '#ede9fe', darkBgColor: '#4c1d95' },

  // Quirky first insights - fun tones
  late_night_snacker: { icon: 'Moon', color: '#6366f1', bgColor: '#e0e7ff', darkBgColor: '#3730a3' },
  weekend_warrior: { icon: 'Calendar', color: '#ec4899', bgColor: '#fce7f3', darkBgColor: '#831843' },
  early_bird: { icon: 'Sunrise', color: '#f59e0b', bgColor: '#fef3c7', darkBgColor: '#78350f' },
  category_variety: { icon: 'Sparkles', color: '#8b5cf6', bgColor: '#f3e8ff', darkBgColor: '#5b21b6' },
  new_merchant: { icon: 'MapPin', color: '#10b981', bgColor: '#d1fae5', darkBgColor: '#064e3b' },
  new_city: { icon: 'Map', color: '#06b6d4', bgColor: '#cffafe', darkBgColor: '#164e63' },
  unusual_hour: { icon: 'Clock', color: '#8b5cf6', bgColor: '#f3e8ff', darkBgColor: '#5b21b6' },
  time_pattern: { icon: 'Clock', color: '#6366f1', bgColor: '#e0e7ff', darkBgColor: '#3730a3' },
  day_pattern: { icon: 'CalendarDays', color: '#ec4899', bgColor: '#fce7f3', darkBgColor: '#831843' },

  // Default fallback
  building_profile: { icon: 'Sparkles', color: '#6366f1', bgColor: '#e0e7ff', darkBgColor: '#3730a3' },
};

/**
 * Category-based fallback styling when insight type is not found.
 */
export const CATEGORY_CONFIG: Record<InsightCategory, InsightTypeStyle> = {
  ACTIONABLE: { icon: 'Lightbulb', color: '#2563eb', bgColor: '#dbeafe', darkBgColor: '#1e3a5f' },
  CELEBRATORY: { icon: 'PartyPopper', color: '#d97706', bgColor: '#fef3c7', darkBgColor: '#78350f' },
  QUIRKY_FIRST: { icon: 'Sparkles', color: '#8b5cf6', bgColor: '#f3e8ff', darkBgColor: '#5b21b6' },
};

// ============================================================================
// Story 14.33a: Visual Type Configuration
// ============================================================================

/**
 * Story 14.33a: 5-type visual config per mockup (insights.html)
 * Story 14.33a.1: Now uses theme-aware CSS variables for all themes
 *
 * | Type        | Use Case                          |
 * |-------------|-----------------------------------|
 * | quirky      | Fun patterns ("Snacker Nocturno") |
 * | celebration | Milestones ("Carrito Lleno")      |
 * | actionable  | Opportunities ("Tu Hora Favorita")|
 * | tradeoff    | Trade-off insights                |
 * | trend       | Trend patterns ("Dia Favorito")   |
 *
 * CSS variables are defined in index.html for each theme (Normal, Professional, Mono)
 * with both light and dark mode variants.
 */
export const INSIGHT_VISUAL_CONFIG: Record<InsightVisualType, InsightVisualConfig> = {
  quirky: {
    bgColor: 'var(--insight-quirky-bg)',
    iconColor: 'var(--insight-quirky-icon)',
  },
  celebration: {
    bgColor: 'var(--insight-celebration-bg)',
    iconColor: 'var(--insight-celebration-icon)',
  },
  actionable: {
    bgColor: 'var(--insight-actionable-bg)',
    iconColor: 'var(--insight-actionable-icon)',
  },
  tradeoff: {
    bgColor: 'var(--insight-tradeoff-bg)',
    iconColor: 'var(--insight-tradeoff-icon)',
  },
  trend: {
    bgColor: 'var(--insight-trend-bg)',
    iconColor: 'var(--insight-trend-icon)',
  },
};

// ============================================================================
// Fallback Messages
// ============================================================================

/**
 * Fallback messages for old insights that don't have stored messages.
 * needsContext indicates if the insight needs transaction details to be meaningful.
 */
export const INSIGHT_FALLBACK_MESSAGES: Record<string, InsightFallbackInfo> = {
  // Contextual insights - need transaction details to be meaningful
  merchant_frequency: { message: 'You visited this merchant multiple times recently!', needsContext: true },
  new_merchant: { message: 'You visited a new merchant!', needsContext: true },
  new_city: { message: 'You made a purchase in a new city!', needsContext: true },
  biggest_item: { message: 'This was one of your biggest single-item purchases!', needsContext: true },
  item_count: { message: 'You scanned quite a few items in this receipt!', needsContext: true },
  category_variety: { message: 'This purchase added to your category diversity!', needsContext: true },
  category_trend: { message: 'Your spending in this category has been trending.', needsContext: true },
  spending_velocity: { message: 'Your spending pace has changed recently.', needsContext: true },
  duplicate_detected: { message: 'This might be a duplicate receipt.', needsContext: true },

  // Non-contextual insights - the message is self-explanatory
  weekend_warrior: { message: 'You tend to do more shopping on weekends!', needsContext: false },
  unusual_hour: { message: 'You shopped at an unusual time!', needsContext: false },
  time_pattern: { message: 'We noticed a pattern in when you shop.', needsContext: false },
  day_pattern: { message: 'We noticed a pattern in which days you shop.', needsContext: false },
  late_night_snacker: { message: 'We noticed you like late-night shopping!', needsContext: false },
  early_bird: { message: 'You\'re an early bird shopper!', needsContext: false },

  // Achievement/status insights
  milestone_reached: { message: 'Congratulations on reaching this milestone!', needsContext: false },
  scan_streak: { message: 'You\'re on a scanning streak - keep it up!', needsContext: false },
  savings_found: { message: 'Great job finding savings!', needsContext: false },
  budget_alert: { message: 'Keep an eye on your budget in this area.', needsContext: false },
  spending_pattern: { message: 'We noticed an interesting pattern in your spending.', needsContext: false },
  building_profile: { message: 'We\'re still learning your shopping patterns.', needsContext: false },
};

/**
 * Simple fallback messages (without needsContext) for InsightHistoryCard.
 */
export const INSIGHT_SIMPLE_FALLBACK_MESSAGES: Record<string, string> = Object.fromEntries(
  Object.entries(INSIGHT_FALLBACK_MESSAGES).map(([key, value]) => [key, value.message])
);

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Gets the styling configuration for an insight based on its ID and category.
 * Falls back to category config, then to default styling.
 */
export function getInsightConfig(
  insightId: string,
  category?: InsightCategory,
  isDark?: boolean
): { icon: string; color: string; bgColor: string } {
  // First try exact match by insight ID
  const idConfig = INSIGHT_TYPE_CONFIG[insightId];
  if (idConfig) {
    return {
      ...idConfig,
      bgColor: isDark ? idConfig.darkBgColor : idConfig.bgColor,
    };
  }

  // Fallback to category-based config
  if (category && CATEGORY_CONFIG[category]) {
    const catConfig = CATEGORY_CONFIG[category];
    return {
      ...catConfig,
      bgColor: isDark ? catConfig.darkBgColor : catConfig.bgColor,
    };
  }

  // Ultimate fallback
  return {
    icon: 'Lightbulb',
    color: '#6366f1',
    bgColor: isDark ? '#3730a3' : '#e0e7ff',
  };
}

/**
 * Gets a Lucide icon component by name with type-safe fallback.
 */
export function getIconByName(name: string): LucideIcon {
  // Create a type-safe lookup
  const icons = LucideIcons as unknown as Record<string, LucideIcon | undefined>;
  const icon = icons[name];
  return icon || LucideIcons.Lightbulb;
}

/**
 * Gets fallback info for an insight type.
 * Returns default values if insight type not found.
 */
export function getInsightFallbackInfo(insightId: string): InsightFallbackInfo {
  return INSIGHT_FALLBACK_MESSAGES[insightId] || {
    message: '',
    needsContext: false,
  };
}

/**
 * Gets a simple fallback message for an insight type.
 */
export function getInsightFallbackMessage(insightId: string): string {
  return INSIGHT_SIMPLE_FALLBACK_MESSAGES[insightId] || '';
}

// ============================================================================
// Story 14.33a: Visual Type Helper Functions
// ============================================================================

/**
 * Story 14.33a: Determines the visual type for an insight based on:
 * 1. Specific insightId patterns (for trend/tradeoff)
 * 2. InsightCategory fallback
 * 3. Default to 'actionable' for backward compatibility
 *
 * @param category - The InsightCategory (QUIRKY_FIRST, CELEBRATORY, ACTIONABLE)
 * @param insightId - The insight identifier (e.g., "merchant_frequency")
 * @returns The InsightVisualType for styling
 */
export function getVisualType(category?: InsightCategory, insightId?: string): InsightVisualType {
  // Check insightId for specific mappings (trend and tradeoff)
  if (insightId) {
    // Trend insights - patterns, favorite days/times
    if (
      insightId.includes('trend') ||
      insightId.includes('favorite_day') ||
      insightId.includes('day_pattern') ||
      insightId.includes('time_pattern') ||
      insightId.includes('spending_pattern')
    ) {
      return 'trend';
    }

    // Tradeoff insights - varied, comparison, trade-off related
    if (
      insightId.includes('tradeoff') ||
      insightId.includes('varied') ||
      insightId.includes('category_variety')
    ) {
      return 'tradeoff';
    }
  }

  // Fall back to category
  switch (category) {
    case 'QUIRKY_FIRST':
      return 'quirky';
    case 'CELEBRATORY':
      return 'celebration';
    case 'ACTIONABLE':
      return 'actionable';
    default:
      return 'actionable'; // AC5: Backward compatibility default
  }
}

/**
 * Story 14.33a: Gets the visual config for an insight based on its visual type.
 * Story 14.33a.1: Simplified - no longer needs isDark parameter since CSS variables
 * automatically adapt to theme and mode via index.html definitions.
 *
 * @param visualType - The InsightVisualType
 * @returns The visual styling configuration (CSS variables)
 */
export function getVisualConfig(visualType: InsightVisualType): InsightVisualConfig {
  return INSIGHT_VISUAL_CONFIG[visualType] || INSIGHT_VISUAL_CONFIG.actionable;
}
