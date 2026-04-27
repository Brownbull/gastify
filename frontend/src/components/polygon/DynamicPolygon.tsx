/**
 * DynamicPolygon Component
 *
 * Story 14.5: Dynamic Polygon Component
 * Epic 14: Core Implementation
 *
 * An SVG-based polygon visualization that shows top spending categories.
 * The polygon has 3-6 vertices, each representing a category with its
 * radius scaled by spending ratio.
 *
 * Features:
 * - Dynamic vertex count (3-6) based on category count
 * - Breathing animation via useBreathing hook
 * - Category labels at each vertex
 * - Touch/click interactivity for drill-down
 * - Responsive sizing via viewBox
 * - Reduced motion support
 *
 * @example
 * ```tsx
 * <DynamicPolygon
 *   categories={[
 *     { name: 'Supermarket', amount: 216800, color: '#22c55e' },
 *     { name: 'Restaurant', amount: 162600, color: '#f59e0b' },
 *     { name: 'Transport', amount: 108400, color: '#3b82f6' },
 *   ]}
 *   onVertexClick={(category) => console.log('Navigate to', category)}
 * />
 * ```
 *
 * @see docs/uxui/motion-design-system.md Section 3.1 - Breathing animations
 * @see docs/sprint-artifacts/epic14/stories/story-14.5-dynamic-polygon-component.md
 */

import { useMemo, useCallback } from 'react';
import { useBreathing } from '../animation/useBreathing';
import { DURATION } from '../animation/constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { formatCurrency, DEFAULT_CURRENCY } from '../../utils/currency';

/**
 * Spending data for a single category
 */
export interface CategorySpending {
  /** Category name (e.g., 'Supermarket', 'Restaurant') */
  name: string;
  /** Spending amount in currency units */
  amount: number;
  /** Hex color for this category */
  color: string;
}

/**
 * Props for DynamicPolygon component
 */
export interface DynamicPolygonProps {
  /** Array of categories to display (top 3-6 will be used) */
  categories: CategorySpending[];
  /** Maximum number of vertices (3-6), defaults to 6 */
  maxVertices?: 3 | 4 | 5 | 6;
  /** Enable breathing animation, defaults to true */
  breathing?: boolean;
  /** Callback when a vertex is clicked, receives category name */
  onVertexClick?: (category: string) => void;
  /** Additional CSS classes for the container */
  className?: string;
  /** Currency code for formatting (default: CLP) */
  currency?: string;
}

// SVG viewBox dimensions
const VIEW_BOX_SIZE = 200;
const CENTER = VIEW_BOX_SIZE / 2;
const MAX_RADIUS = 70; // Maximum radius from center to vertex
const MIN_RADIUS_RATIO = 0.3; // Minimum 30% of max radius
const LABEL_OFFSET = 25; // Distance from vertex to label

/**
 * Calculate polygon points on a unit circle, starting from the top (12 o'clock)
 * and going clockwise. Each vertex radius is scaled by the spending ratio.
 */
export function calculatePolygonPoints(
  categories: CategorySpending[],
  centerX: number,
  centerY: number,
  maxRadius: number
): string {
  if (categories.length < 3) return '';

  const count = categories.length;
  const maxAmount = Math.max(...categories.map((c) => c.amount));

  if (maxAmount === 0) return '';

  return categories
    .map((cat, i) => {
      // Start from top (-PI/2) and go clockwise
      const angle = (2 * Math.PI * i) / count - Math.PI / 2;
      // Scale radius: min 30%, max 100% based on spending ratio
      const ratio = cat.amount / maxAmount;
      const radius = maxRadius * (MIN_RADIUS_RATIO + (1 - MIN_RADIUS_RATIO) * ratio);
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

/**
 * Calculate label position for a vertex
 */
function calculateLabelPosition(
  index: number,
  count: number,
  centerX: number,
  centerY: number,
  radius: number
): { x: number; y: number; anchor: 'start' | 'middle' | 'end' } {
  const angle = (2 * Math.PI * index) / count - Math.PI / 2;
  const x = centerX + radius * Math.cos(angle);
  const y = centerY + radius * Math.sin(angle);

  // Determine text anchor based on position
  let anchor: 'start' | 'middle' | 'end' = 'middle';
  if (Math.cos(angle) < -0.3) anchor = 'end';
  else if (Math.cos(angle) > 0.3) anchor = 'start';

  return { x, y, anchor };
}

/**
 * DynamicPolygon - SVG visualization of spending categories
 */
export function DynamicPolygon({
  categories,
  maxVertices = 6,
  breathing = true,
  onVertexClick,
  className = '',
  currency = DEFAULT_CURRENCY,
}: DynamicPolygonProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  // Use breathing animation hook
  const { style: breathingStyle, isAnimating } = useBreathing({
    enabled: breathing && !prefersReducedMotion,
  });

  // Limit categories to maxVertices and filter to significant ones
  const displayCategories = useMemo(() => {
    return categories
      .filter((cat) => cat.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, maxVertices);
  }, [categories, maxVertices]);

  // Calculate polygon points
  const polygonPoints = useMemo(() => {
    return calculatePolygonPoints(displayCategories, CENTER, CENTER, MAX_RADIUS);
  }, [displayCategories]);

  // Calculate label positions
  const labelPositions = useMemo(() => {
    return displayCategories.map((_, index) =>
      calculateLabelPosition(
        index,
        displayCategories.length,
        CENTER,
        CENTER,
        MAX_RADIUS + LABEL_OFFSET
      )
    );
  }, [displayCategories]);

  // Handle vertex click
  const handleVertexClick = useCallback(
    (categoryName: string) => {
      if (onVertexClick) {
        onVertexClick(categoryName);
      }
    },
    [onVertexClick]
  );

  // Calculate vertex positions (extracted to avoid duplicate calculations)
  const vertexPositions = useMemo(() => {
    if (displayCategories.length < 3) return [];
    const maxAmount = Math.max(...displayCategories.map((c) => c.amount));
    if (maxAmount === 0) return [];

    return displayCategories.map((cat, index) => {
      const angle = (2 * Math.PI * index) / displayCategories.length - Math.PI / 2;
      const ratio = cat.amount / maxAmount;
      const radius = MAX_RADIUS * (MIN_RADIUS_RATIO + (1 - MIN_RADIUS_RATIO) * ratio);
      const x = CENTER + radius * Math.cos(angle);
      const y = CENTER + radius * Math.sin(angle);
      return { x, y, category: cat };
    });
  }, [displayCategories]);

  // Generate gradient for polygon fill - use unique ID for multi-instance support
  const gradientId = useMemo(
    () => `polygon-gradient-${Math.random().toString(36).slice(2, 11)}`,
    []
  );
  const gradientStops = useMemo(() => {
    if (displayCategories.length === 0) return [];
    return displayCategories.map((cat, i) => ({
      offset: `${(i / Math.max(displayCategories.length - 1, 1)) * 100}%`,
      color: cat.color,
    }));
  }, [displayCategories]);

  const hasEnoughCategories = displayCategories.length >= 3;

  return (
    <div
      data-testid="dynamic-polygon-container"
      className={`relative ${className}`}
    >
      <div
        data-testid="polygon-breathing-wrapper"
        style={isAnimating ? breathingStyle : undefined}
        className="w-full h-full flex items-center justify-center"
      >
        <svg
          data-testid="dynamic-polygon-svg"
          viewBox={`0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full"
          role="img"
          aria-label="Spending categories polygon visualization"
        >
          {/* Gradient definition */}
          {hasEnoughCategories && gradientStops.length > 0 && (
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                {gradientStops.map((stop, i) => (
                  <stop key={i} offset={stop.offset} stopColor={stop.color} stopOpacity="0.6" />
                ))}
              </linearGradient>
            </defs>
          )}

          {/* Polygon shape */}
          {hasEnoughCategories && polygonPoints && (
            <polygon
              points={polygonPoints}
              fill={`url(#${gradientId})`}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              className="text-gray-200 dark:text-gray-700"
            />
          )}

          {/* Vertex points and labels */}
          {hasEnoughCategories &&
            vertexPositions.map((vertex, index) => {
              const labelPos = labelPositions[index];
              const { x: vertexX, y: vertexY, category: cat } = vertex;

              return (
                <g key={cat.name}>
                  {/* Vertex circle (clickable) */}
                  <circle
                    data-testid={`polygon-vertex-${cat.name}`}
                    cx={vertexX}
                    cy={vertexY}
                    r="8"
                    fill={cat.color}
                    stroke="white"
                    strokeWidth="2"
                    style={onVertexClick ? {
                      cursor: 'pointer',
                      transition: `transform ${DURATION.FAST}ms ease-out`,
                      transformOrigin: `${vertexX}px ${vertexY}px`,
                    } : undefined}
                    className={onVertexClick ? 'hover:scale-125' : ''}
                    onClick={() => handleVertexClick(cat.name)}
                    role={onVertexClick ? 'button' : undefined}
                    aria-label={`${cat.name}: ${formatCurrency(cat.amount, currency)}`}
                    tabIndex={onVertexClick ? 0 : undefined}
                    onKeyDown={(e) => {
                      if (onVertexClick && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        handleVertexClick(cat.name);
                      }
                    }}
                  />

                  {/* Category label */}
                  <g data-testid={`polygon-label-${cat.name}`}>
                    <text
                      x={labelPos.x}
                      y={labelPos.y - 6}
                      textAnchor={labelPos.anchor}
                      className="text-xs font-medium fill-gray-900 dark:fill-gray-100"
                      style={{ fontSize: '10px' }}
                    >
                      {cat.name}
                    </text>
                    <text
                      x={labelPos.x}
                      y={labelPos.y + 6}
                      textAnchor={labelPos.anchor}
                      className="text-xs fill-gray-600 dark:fill-gray-400"
                      style={{ fontSize: '8px' }}
                    >
                      {formatCurrency(cat.amount, currency)}
                    </text>
                  </g>
                </g>
              );
            })}

          {/* Empty state when not enough categories */}
          {!hasEnoughCategories && (
            <text
              x={CENTER}
              y={CENTER}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-sm fill-gray-400 dark:fill-gray-500"
              style={{ fontSize: '12px' }}
            >
              {categories.length === 0
                ? 'No spending data'
                : 'Need at least 3 categories'}
            </text>
          )}
        </svg>
      </div>
    </div>
  );
}

export default DynamicPolygon;
