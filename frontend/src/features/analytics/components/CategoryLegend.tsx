/**
 * CategoryLegend Component
 *
 * Displays a horizontal inline legend for chart categories.
 * Shows colored squares with category labels and percentages.
 *
 * Story 7.10: UX Cards & Visual Elements Alignment
 * AC #5: Category legend appears below chart with colored squares and percentage values
 * AC #6: Legend items display inline (horizontal wrap) with consistent spacing
 *
 * @see docs/ux-design-directions.html - Category Legend Design
 */

import React, { memo } from 'react';
// Story 14.21: Use unified category colors
import { getCategoryBackgroundAuto } from '@/config/categoryColors';

// ============================================================================
// Types
// ============================================================================

export interface LegendItem {
  /** Category label */
  label: string;
  /** Value for this category (for percentage calculation) */
  value: number;
  /** Color for the legend square (optional, uses getColor if not provided) */
  color?: string;
}

export interface CategoryLegendProps {
  /** Array of legend items */
  items: LegendItem[];
  /** Theme for styling */
  theme?: 'light' | 'dark';
}

// ============================================================================
// Component
// ============================================================================

/**
 * CategoryLegend Component
 *
 * Renders an inline legend with colored squares and percentage values.
 * Uses flex-wrap for horizontal layout with consistent spacing.
 *
 * @example
 * <CategoryLegend
 *   items={[
 *     { label: 'Food', value: 35000 },
 *     { label: 'Transport', value: 15000 },
 *   ]}
 *   theme="light"
 * />
 */
export const CategoryLegend = memo(function CategoryLegend({
  items,
  theme = 'light',
}: CategoryLegendProps): React.ReactElement | null {
  const isDark = theme === 'dark';

  // Calculate total for percentage computation
  const total = items.reduce((sum, item) => sum + item.value, 0);

  // Don't render if no items
  if (items.length === 0) {
    return null;
  }

  return (
    <div className="px-4 mb-4">
      <div className="flex flex-wrap gap-3 justify-center">
        {items.map((item) => {
          // Story 14.21: Use unified category colors
          const color = item.color || getCategoryBackgroundAuto(item.label);
          const percentage = total > 0 ? (item.value / total) * 100 : 0;

          return (
            <div key={item.label} className="flex items-center gap-1">
              {/* Colored square (AC #5) - w-3 h-3 rounded-sm per UX spec */}
              <div
                className="w-3 h-3 rounded-sm flex-shrink-0"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              {/* Label and percentage (AC #5) - increased font size */}
              <span className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {item.label} {percentage.toFixed(0)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default CategoryLegend;
