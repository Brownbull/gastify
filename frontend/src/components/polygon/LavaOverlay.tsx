/**
 * LavaOverlay Component
 *
 * Story 14.7: Expanding Lava Visual
 * Epic 14: Core Implementation
 *
 * A dual-polygon SVG visualization showing spending vs budget.
 * The inner "lava" polygon (spending) expands toward the outer
 * "threshold" polygon (budget) with visual tension effects.
 *
 * Features:
 * - Inner polygon = actual spending (warm colors: red/orange)
 * - Outer polygon = budget target (cool colors: green/blue)
 * - Visual tension: color intensifies as spending approaches budget
 * - Proximity indicators: percentage at each vertex
 * - Over-budget state: inner exceeds outer with warning styling
 * - Data change animation: smooth transitions on spending updates
 * - Reduced motion support
 *
 * @example
 * ```tsx
 * <LavaOverlay
 *   vertices={[
 *     { category: 'Supermarket', spending: 150000, budget: 200000 },
 *     { category: 'Restaurant', spending: 80000, budget: 100000 },
 *   ]}
 *   showIndicators={true}
 * />
 * ```
 *
 * @see docs/sprint-artifacts/epic14/stories/story-14.7-expanding-lava-visual.md
 */

import { useMemo } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { DURATION, EASING } from '../animation/constants';

/**
 * Lava color system constants
 * @see story-14.7-expanding-lava-visual.md Dev Notes
 */
export const LAVA_COLORS = {
  /** Spending polygon - red with opacity (warm) */
  SPENDING: 'rgba(239, 68, 68, 0.7)',
  /** Budget polygon - green with opacity (cool) */
  BUDGET: 'rgba(34, 197, 94, 0.3)',
  /** Solid red when over budget */
  DANGER: 'rgba(239, 68, 68, 1)',
  /** Amber for approaching limit (75-90%) */
  WARNING: 'rgba(245, 158, 11, 0.8)',
  /** Safe spending color (green) */
  SAFE: 'rgba(34, 197, 94, 1)',
  /** Dark mode variants */
  SPENDING_DARK: 'rgba(248, 113, 113, 0.7)',
  BUDGET_DARK: 'rgba(74, 222, 128, 0.3)',
  DANGER_DARK: 'rgba(248, 113, 113, 1)',
  WARNING_DARK: 'rgba(251, 191, 36, 0.8)',
  SAFE_DARK: 'rgba(74, 222, 128, 1)',
} as const;

/**
 * Proximity status thresholds
 */
const THRESHOLD = {
  SAFE: 0.75,
  WARNING: 0.9,
  DANGER: 1.0,
} as const;

/**
 * Data for a single vertex in the lava overlay
 */
export interface VertexData {
  /** Category name (e.g., 'Supermarket') */
  category: string;
  /** Current spending amount */
  spending: number;
  /** Budget target amount */
  budget: number;
}

/**
 * Proximity calculation result
 */
export interface ProximityResult {
  /** Category name */
  category: string;
  /** Spending amount */
  spending: number;
  /** Budget amount */
  budget: number;
  /** Spending/budget ratio (0-1+, can exceed 1 if over budget) */
  ratio: number;
  /** Status based on ratio thresholds */
  status: 'safe' | 'warning' | 'danger' | 'over';
}

/**
 * Calculate proximity status based on spending/budget ratio
 */
export function calculateProximity(spending: number, budget: number): ProximityResult {
  const ratio = budget === 0 ? Infinity : spending / budget;

  let status: ProximityResult['status'];
  if (ratio > THRESHOLD.DANGER) {
    status = 'over';
  } else if (ratio > THRESHOLD.WARNING) {
    status = 'danger';
  } else if (ratio > THRESHOLD.SAFE) {
    status = 'warning';
  } else {
    status = 'safe';
  }

  return {
    category: '',
    spending,
    budget,
    ratio,
    status,
  };
}

/**
 * Props for LavaOverlay component
 */
export interface LavaOverlayProps {
  /** Array of vertex data (spending and budget for each category) */
  vertices: VertexData[];
  /** Show percentage indicators at each vertex */
  showIndicators?: boolean;
  /** Show glow effect on high-tension vertices (>80%) */
  showGlow?: boolean;
  /** Additional CSS classes for the container */
  className?: string;
}

// SVG viewBox dimensions
const VIEW_BOX_SIZE = 200;
const CENTER = VIEW_BOX_SIZE / 2;
const MAX_RADIUS = 70;
const MIN_RADIUS_RATIO = 0.3;
const INDICATOR_OFFSET = 15;

/**
 * Calculate polygon points for given amounts
 */
function calculatePolygonPoints(
  vertices: VertexData[],
  valueType: 'spending' | 'budget',
  centerX: number,
  centerY: number,
  maxRadius: number
): string {
  if (vertices.length < 3) return '';

  // Get max value for scaling (use max of spending or budget for consistent comparison)
  const maxValue = Math.max(
    ...vertices.map((v) => Math.max(v.spending, v.budget))
  );

  if (maxValue === 0) return '';

  return vertices
    .map((vertex, i) => {
      const value = valueType === 'spending' ? vertex.spending : vertex.budget;
      const angle = (2 * Math.PI * i) / vertices.length - Math.PI / 2;
      // Scale radius based on value relative to max
      const ratio = value / maxValue;
      const radius = maxRadius * (MIN_RADIUS_RATIO + (1 - MIN_RADIUS_RATIO) * ratio);
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

/**
 * Calculate vertex position for a given index
 */
function getVertexPosition(
  index: number,
  count: number,
  value: number,
  maxValue: number,
  centerX: number,
  centerY: number,
  maxRadius: number
): { x: number; y: number } {
  const angle = (2 * Math.PI * index) / count - Math.PI / 2;
  const ratio = maxValue === 0 ? 0 : value / maxValue;
  const radius = maxRadius * (MIN_RADIUS_RATIO + (1 - MIN_RADIUS_RATIO) * ratio);
  return {
    x: centerX + radius * Math.cos(angle),
    y: centerY + radius * Math.sin(angle),
  };
}

/**
 * Calculate indicator position (between spending and budget vertices)
 */
function getIndicatorPosition(
  index: number,
  count: number,
  vertex: VertexData,
  maxValue: number,
  centerX: number,
  centerY: number,
  maxRadius: number
): { x: number; y: number; anchor: 'start' | 'middle' | 'end' } {
  const angle = (2 * Math.PI * index) / count - Math.PI / 2;

  // Position slightly outside the budget polygon
  const budgetRatio = maxValue === 0 ? 0 : vertex.budget / maxValue;
  const radius = maxRadius * (MIN_RADIUS_RATIO + (1 - MIN_RADIUS_RATIO) * budgetRatio) + INDICATOR_OFFSET;

  const x = centerX + radius * Math.cos(angle);
  const y = centerY + radius * Math.sin(angle);

  // Determine text anchor based on position
  let anchor: 'start' | 'middle' | 'end' = 'middle';
  if (Math.cos(angle) < -0.3) anchor = 'end';
  else if (Math.cos(angle) > 0.3) anchor = 'start';

  return { x, y, anchor };
}

/**
 * Get indicator color based on proximity status
 */
function getIndicatorColor(status: ProximityResult['status']): string {
  switch (status) {
    case 'safe':
      return LAVA_COLORS.SAFE;
    case 'warning':
      return LAVA_COLORS.WARNING;
    case 'danger':
    case 'over':
      return LAVA_COLORS.DANGER;
  }
}

/**
 * LavaOverlay - Dual polygon spending vs budget visualization
 */
export function LavaOverlay({
  vertices,
  showIndicators = false,
  showGlow = false,
  className = '',
}: LavaOverlayProps): JSX.Element {
  const prefersReducedMotion = useReducedMotion();

  // Calculate max value for scaling
  const maxValue = useMemo(() => {
    if (vertices.length === 0) return 0;
    return Math.max(...vertices.map((v) => Math.max(v.spending, v.budget)));
  }, [vertices]);

  // Calculate polygon points
  const budgetPoints = useMemo(() => {
    return calculatePolygonPoints(vertices, 'budget', CENTER, CENTER, MAX_RADIUS);
  }, [vertices]);

  const spendingPoints = useMemo(() => {
    return calculatePolygonPoints(vertices, 'spending', CENTER, CENTER, MAX_RADIUS);
  }, [vertices]);

  // Calculate proximity for each vertex
  const proximities = useMemo(() => {
    return vertices.map((vertex) => {
      const result = calculateProximity(vertex.spending, vertex.budget);
      return { ...result, category: vertex.category };
    });
  }, [vertices]);

  // Check if any vertices have glow effect (>80%)
  const hasGlowVertices = useMemo(() => {
    return showGlow && proximities.some((p) => p.ratio > 0.8);
  }, [proximities, showGlow]);

  // Calculate vertex positions
  const spendingVertexPositions = useMemo(() => {
    return vertices.map((vertex, index) =>
      getVertexPosition(index, vertices.length, vertex.spending, maxValue, CENTER, CENTER, MAX_RADIUS)
    );
  }, [vertices, maxValue]);

  // Calculate indicator positions
  const indicatorPositions = useMemo(() => {
    return vertices.map((vertex, index) =>
      getIndicatorPosition(index, vertices.length, vertex, maxValue, CENTER, CENTER, MAX_RADIUS)
    );
  }, [vertices, maxValue]);

  // Generate unique IDs for SVG defs (gradient and filter)
  // Pattern #51: Unique IDs for Multi-Instance SVG Components
  const gradientId = useMemo(
    () => `lava-gradient-${Math.random().toString(36).slice(2, 11)}`,
    []
  );

  const glowFilterId = useMemo(
    () => `lava-glow-${Math.random().toString(36).slice(2, 11)}`,
    []
  );

  const hasEnoughVertices = vertices.length >= 3;

  // Transition style for animations
  const transitionStyle = prefersReducedMotion
    ? {}
    : {
        transition: `all ${DURATION.SLOW}ms ${EASING.SPRING}`,
      };

  return (
    <div
      data-testid="lava-overlay-container"
      className={`relative ${className}`}
    >
      <svg
        data-testid="lava-overlay-svg"
        viewBox={`0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
        role="img"
        aria-label="Budget vs spending lava overlay visualization"
      >
        {/* Definitions: gradients and filters */}
        <defs>
          {/* Spending gradient (warm colors) */}
          <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={LAVA_COLORS.SPENDING} />
            <stop offset="100%" stopColor={LAVA_COLORS.WARNING} />
          </radialGradient>

          {/* Glow filter for high-tension vertices */}
          {hasGlowVertices && (
            <filter id={glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          )}
        </defs>

        {/* Budget polygon (outer, cool colors) */}
        {hasEnoughVertices && budgetPoints && (
          <polygon
            data-testid="budget-polygon"
            points={budgetPoints}
            fill={LAVA_COLORS.BUDGET}
            stroke="rgba(34, 197, 94, 0.5)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            style={transitionStyle}
          />
        )}

        {/* Spending polygon (inner, warm colors) */}
        {hasEnoughVertices && spendingPoints && (
          <polygon
            data-testid="spending-polygon"
            points={spendingPoints}
            fill={`url(#${gradientId})`}
            stroke="rgba(239, 68, 68, 0.8)"
            strokeWidth="2"
            strokeLinejoin="round"
            style={transitionStyle}
          />
        )}

        {/* Vertex circles for spending polygon */}
        {hasEnoughVertices &&
          spendingVertexPositions.map((pos, index) => {
            const vertex = vertices[index];
            const proximity = proximities[index];
            const isOverBudget = proximity.status === 'over';
            const hasGlow = showGlow && proximity.ratio > 0.8;

            return (
              <circle
                key={vertex.category}
                data-testid={`spending-vertex-${vertex.category}`}
                cx={pos.x}
                cy={pos.y}
                r="6"
                fill={isOverBudget ? LAVA_COLORS.DANGER : LAVA_COLORS.SPENDING}
                stroke="white"
                strokeWidth="1.5"
                className={isOverBudget ? 'animate-pulse' : ''}
                style={{
                  ...(hasGlow ? { filter: `url(#${glowFilterId})` } : {}),
                  ...transitionStyle,
                }}
              />
            );
          })}

        {/* Proximity indicators */}
        {hasEnoughVertices &&
          showIndicators &&
          indicatorPositions.map((pos, index) => {
            const proximity = proximities[index];
            const percentage = Math.round(proximity.ratio * 100);
            const color = getIndicatorColor(proximity.status);

            return (
              <text
                key={`indicator-${proximity.category}`}
                data-testid={`proximity-indicator-${proximity.category}`}
                x={pos.x}
                y={pos.y}
                textAnchor={pos.anchor}
                dominantBaseline="middle"
                fill={color}
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  ...transitionStyle,
                }}
              >
                {percentage}%
              </text>
            );
          })}

        {/* Empty state: no vertices */}
        {vertices.length === 0 && (
          <text
            x={CENTER}
            y={CENTER}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-sm fill-gray-400 dark:fill-gray-500"
            style={{ fontSize: '12px' }}
          >
            No budget data
          </text>
        )}

        {/* Empty state: not enough vertices */}
        {vertices.length > 0 && vertices.length < 3 && (
          <text
            x={CENTER}
            y={CENTER}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-sm fill-gray-400 dark:fill-gray-500"
            style={{ fontSize: '12px' }}
          >
            Need at least 3 categories
          </text>
        )}
      </svg>
    </div>
  );
}

export default LavaOverlay;
