/**
 * SpendingDonutChart Component
 *
 * Story 14.16: Weekly Report Story Format
 * Epic 14: Core Implementation
 *
 * SVG-based donut chart for visualizing spending distribution by groups.
 * Layout: Donut chart on left half, styled legend on right half.
 *
 * Design principles:
 * - Pure SVG for PDF compatibility
 * - Theme-aware colors from categoryColors config (uses fg colors for segments)
 * - Thick ring without center icon for clarity
 * - Legend styled like category cards (circle, name, percentage)
 * - Accessible with ARIA labels
 *
 * @example
 * ```tsx
 * <SpendingDonutChart
 *   segments={[
 *     { key: 'supermercados', name: 'Supermercados', value: 35300, percent: 45, emoji: '🛒' },
 *     { key: 'salud-bienestar', name: 'Salud y Bienestar', value: 15000, percent: 20, emoji: '💊' },
 *   ]}
 *   isStoreGroups={true}
 * />
 * ```
 */

import React from 'react';
import type { StoreCategoryGroup, ItemCategoryGroup } from '@/config/categoryColors';
import {
  getStoreGroupColors,
  getItemGroupColors,
  getCurrentTheme,
  getCurrentMode,
} from '@/config/categoryColors';

// ============================================================================
// Types
// ============================================================================

export interface DonutSegment {
  /** Group key (StoreCategoryGroup or ItemCategoryGroup) */
  key: StoreCategoryGroup | ItemCategoryGroup;
  /** Display name in Spanish */
  name: string;
  /** Raw amount value */
  value: number;
  /** Percentage of total (0-100) */
  percent: number;
  /** Group emoji */
  emoji: string;
}

export interface SpendingDonutChartProps {
  /** Segments to display in the donut chart */
  segments: DonutSegment[];
  /** Chart size in pixels (default: 100) */
  size?: number;
  /** Whether this is for store groups (true) or item groups (false) */
  isStoreGroups?: boolean;
  /** Optional additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Donut ring thickness as fraction of radius - thicker for clarity */
const RING_THICKNESS = 0.42;

/** Gap between segments in degrees */
const SEGMENT_GAP = 2;

/** Minimum angle for a segment to be visible (degrees) */
const MIN_SEGMENT_ANGLE = 8;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert polar coordinates to cartesian (SVG coordinate system)
 */
function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

/**
 * Generate SVG arc path for a donut segment
 */
function describeArc(
  x: number,
  y: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number
): string {
  const startOuter = polarToCartesian(x, y, outerRadius, endAngle);
  const endOuter = polarToCartesian(x, y, outerRadius, startAngle);
  const startInner = polarToCartesian(x, y, innerRadius, endAngle);
  const endInner = polarToCartesian(x, y, innerRadius, startAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    'M', startOuter.x, startOuter.y,
    'A', outerRadius, outerRadius, 0, largeArcFlag, 0, endOuter.x, endOuter.y,
    'L', endInner.x, endInner.y,
    'A', innerRadius, innerRadius, 0, largeArcFlag, 1, startInner.x, startInner.y,
    'Z',
  ].join(' ');
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * SpendingDonutChart - Donut chart visualization for spending groups
 *
 * Renders a pure SVG donut chart with:
 * - Colored segments using theme-aware fg colors
 * - Thick ring without center icon
 * - Legend styled like category cards on the right
 */
export const SpendingDonutChart: React.FC<SpendingDonutChartProps> = ({
  segments,
  size = 100,
  isStoreGroups = true,
  className = '',
}) => {
  // Get current theme/mode for colors
  const theme = getCurrentTheme();
  const mode = getCurrentMode();

  // Filter out segments with 0 value and sort by percent descending
  const validSegments = segments
    .filter((s) => s.percent > 0)
    .sort((a, b) => b.percent - a.percent);

  if (validSegments.length === 0) {
    return null;
  }

  // Calculate chart dimensions
  const center = size / 2;
  const outerRadius = (size / 2) - 2; // Leave minimal margin
  const innerRadius = outerRadius * (1 - RING_THICKNESS);

  // Calculate total gap angle needed
  const totalGapAngle = validSegments.length * SEGMENT_GAP;
  const availableAngle = 360 - totalGapAngle;

  // Build segment paths with colors
  let currentAngle = 0;
  const segmentPaths = validSegments.map((segment) => {
    // Calculate segment angle (minimum MIN_SEGMENT_ANGLE for visibility)
    const segmentAngle = Math.max(
      (segment.percent / 100) * availableAngle,
      MIN_SEGMENT_ANGLE
    );

    const startAngle = currentAngle;
    const endAngle = currentAngle + segmentAngle;

    // Get theme-aware color for this group - use fg color for better visibility
    const colors = isStoreGroups
      ? getStoreGroupColors(segment.key as StoreCategoryGroup, theme, mode)
      : getItemGroupColors(segment.key as ItemCategoryGroup, theme, mode);

    const path = describeArc(
      center,
      center,
      outerRadius,
      innerRadius,
      startAngle,
      endAngle
    );

    currentAngle = endAngle + SEGMENT_GAP;

    return {
      ...segment,
      path,
      // Use foreground color for segment fill (more visible)
      fillColor: colors.fg,
    };
  });

  return (
    <div
      className={`flex items-center gap-4 ${className}`}
      role="figure"
      aria-label="Distribución de gastos"
    >
      {/* SVG Donut Chart - Left side */}
      <div className="shrink-0">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
        >
          {/* Background ring (subtle) */}
          <circle
            cx={center}
            cy={center}
            r={(outerRadius + innerRadius) / 2}
            fill="none"
            stroke="var(--border-light)"
            strokeWidth={outerRadius - innerRadius}
            opacity={0.2}
          />

          {/* Segment paths */}
          {segmentPaths.map((seg) => (
            <path
              key={seg.key}
              d={seg.path}
              fill={seg.fillColor}
              stroke="white"
              strokeWidth={1.5}
              opacity={0.9}
              data-testid={`donut-segment-${seg.key}`}
            >
              <title>{`${seg.name}: ${seg.percent}%`}</title>
            </path>
          ))}
        </svg>
      </div>

      {/* Legend - Right side, styled like category cards */}
      <div className="flex flex-col gap-1.5 flex-1 min-w-0">
        {validSegments.map((seg) => {
          const colors = isStoreGroups
            ? getStoreGroupColors(seg.key as StoreCategoryGroup, theme, mode)
            : getItemGroupColors(seg.key as ItemCategoryGroup, theme, mode);

          return (
            <div
              key={seg.key}
              className="flex items-center gap-2 py-1 px-2 rounded-lg"
              style={{ backgroundColor: colors.bg }}
              data-testid={`legend-item-${seg.key}`}
            >
              {/* Circle color indicator */}
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: colors.fg }}
              />
              {/* Category name */}
              <span
                className="text-xs font-medium flex-1 truncate"
                style={{ color: colors.fg }}
              >
                {seg.name}
              </span>
              {/* Percentage */}
              <span
                className="text-xs font-semibold shrink-0"
                style={{ color: colors.fg }}
              >
                {seg.percent}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SpendingDonutChart;
