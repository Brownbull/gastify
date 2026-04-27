/**
 * ItemGroupCard Component
 *
 * Story 14.16: Weekly Report Story Format
 * Epic 14: Core Implementation
 *
 * Renders an item group with its items (product categories).
 * Used in ReportDetailOverlay to display grouped item breakdown.
 *
 * @example
 * ```tsx
 * <ItemGroupCard
 *   group={{
 *     key: 'food-fresh',
 *     name: 'Alimentos Frescos',
 *     emoji: '🥬',
 *     cssClass: 'food-fresh',
 *     totalAmount: '$25.300',
 *     rawTotalAmount: 25300,
 *     items: [...]
 *   }}
 * />
 * ```
 */

import React from 'react';
import type { ItemGroup, TrendDirection } from '@/types/report';
import {
  getItemGroupColors,
  getCurrentTheme,
  getCurrentMode,
} from '@/config/categoryColors';

// ============================================================================
// Trend Components (matching analytics-polygon.html mockup)
// ============================================================================

interface TrendSparklineProps {
  trend?: TrendDirection;
  /** Size variant: 'sm' for items, 'md' for group headers */
  size?: 'sm' | 'md';
}

/**
 * TrendSparkline - Mini sparkline SVG showing trend direction
 */
const TrendSparkline: React.FC<TrendSparklineProps> = ({ trend, size = 'sm' }) => {
  if (!trend || trend === 'neutral') {
    return null;
  }

  // Semantic colors: up = negative (red = more spending = bad)
  // down = positive (green = less spending = good)
  const color = trend === 'up'
    ? 'var(--negative-primary)'
    : 'var(--positive-primary)';

  // SVG dimensions based on size (reduced for better visual balance)
  const width = size === 'md' ? 40 : 40;
  const height = size === 'md' ? 20 : 20;

  // Generate sparkline path with multiple points for visual interest
  const generateSparklinePath = () => {
    if (trend === 'up') {
      // Ascending trend with variation - spending increased
      return `M0 ${height - 4} L${width * 0.17} ${height - 6} L${width * 0.33} ${height - 4} L${width * 0.5} ${height * 0.5} L${width * 0.67} ${height * 0.4} L${width * 0.83} ${height * 0.3} L${width} ${height * 0.2}`;
    } else {
      // Descending trend with variation - spending decreased
      return `M0 ${height * 0.2} L${width * 0.17} ${height * 0.3} L${width * 0.33} ${height * 0.25} L${width * 0.5} ${height * 0.5} L${width * 0.67} ${height * 0.6} L${width * 0.83} ${height * 0.7} L${width} ${height - 4}`;
    }
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ flexShrink: 0 }}
    >
      <path
        d={generateSparklinePath()}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

interface TrendChangeProps {
  trend?: TrendDirection;
  trendPercent?: number;
  /** Size variant: 'sm' for items, 'md' for group headers */
  size?: 'sm' | 'md';
}

/**
 * TrendChange - Arrow icon with colored percentage
 * Matches mockup pattern: arrow icon + percentage text
 */
const TrendChange: React.FC<TrendChangeProps> = ({ trend, trendPercent, size = 'sm' }) => {
  if (!trend || trendPercent === undefined) {
    return null;
  }

  // Semantic colors: up = negative (red = more spending = bad)
  // down = positive (green = less spending = good)
  // neutral = tertiary
  const color = trend === 'neutral'
    ? 'var(--text-tertiary)'
    : trend === 'up'
      ? 'var(--negative-primary)'
      : 'var(--positive-primary)';

  const fontSize = size === 'md' ? 'text-xs' : 'text-xs';
  const iconSize = size === 'md' ? 12 : 10;

  return (
    <div
      className={`inline-flex items-center gap-0.5 ${fontSize} font-semibold`}
      style={{ color }}
    >
      {trend === 'neutral' ? (
        <span>=</span>
      ) : (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {trend === 'up' ? (
            // Up arrow - spending increased
            <path d="M12 19V5M5 12l7-7 7 7" />
          ) : (
            // Down arrow - spending decreased
            <path d="M12 5v14M5 12l7 7 7-7" />
          )}
        </svg>
      )}
      {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}{trendPercent}%
    </div>
  );
};

// ============================================================================
// Types
// ============================================================================

export interface ItemGroupCardProps {
  /** Item group data */
  group: ItemGroup;
  /** Optional additional CSS classes */
  className?: string;
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ItemGroupCard - Displays an item group with items
 *
 * Renders a colored card with:
 * - Group header (emoji, name, total amount)
 * - List of items within the group
 *
 * Colors are theme-aware and pulled from ITEM_GROUP_COLORS.
 */
export const ItemGroupCard: React.FC<ItemGroupCardProps> = ({
  group,
  className = '',
}) => {
  // Get theme-aware colors
  const theme = getCurrentTheme();
  const mode = getCurrentMode();
  const colors = getItemGroupColors(group.key, theme, mode);

  return (
    <div
      className={`rounded-xl overflow-hidden mb-2 ${className}`}
      style={{ backgroundColor: colors.bg }}
      data-testid={`item-group-${group.key}`}
    >
      {/* Group Header - Layout: [icon + name + percent] ... [sparkline + (amount / change)] */}
      <div
        className="flex items-center justify-between px-3 py-2.5"
        style={{ backgroundColor: colors.bg }}
      >
        {/* Left: Icon + Name + Percent */}
        <div className="flex items-center gap-2">
          <span className="text-base">{group.emoji}</span>
          <span
            className="text-sm font-semibold"
            style={{ color: colors.fg }}
          >
            {group.name}
          </span>
          <span
            className="text-xs font-medium px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.6)',
              color: colors.fg,
            }}
          >
            {group.percent}%
          </span>
        </div>

        {/* Right: Sparkline + Stats (amount on top, change below) */}
        <div className="flex items-center gap-2.5">
          <TrendSparkline trend={group.trend} size="md" />
          <div className="text-right">
            <div
              className="text-sm font-bold"
              style={{ color: colors.fg }}
            >
              {group.totalAmount}
            </div>
            <TrendChange trend={group.trend} trendPercent={group.trendPercent} size="md" />
          </div>
        </div>
      </div>

      {/* Item Items - Layout: [(name / count)] ... [percent + sparkline + (amount / change)] */}
      <div className="px-3 pb-3 flex flex-col gap-1.5">
        {group.items.map((item) => (
          <div
            key={item.key}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.5)' }}
            data-testid={`item-${item.key}`}
          >
            {/* Left: Item info (name + count) */}
            <div className="flex-1 min-w-0">
              <div
                className="text-xs font-semibold truncate"
                style={{ color: 'var(--text-primary)' }}
              >
                {item.name}
              </div>
              <div
                className="text-xs"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {item.count}
              </div>
            </div>

            {/* Right: Percent + Sparkline + Stats (amount on top, change below) */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Percentage badge */}
              <span
                className="text-xs font-medium px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: 'rgba(0, 0, 0, 0.05)',
                  color: 'var(--text-secondary)',
                }}
              >
                {item.percent}%
              </span>
              <TrendSparkline trend={item.trend} size="sm" />
              <div className="text-right">
                <div
                  className="text-xs font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {item.amount}
                </div>
                <TrendChange trend={item.trend} trendPercent={item.trendPercent} size="sm" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ItemGroupCard;
