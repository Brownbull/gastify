/**
 * Polygon Module Barrel Export
 *
 * Story 14.5: Dynamic Polygon Component
 * Story 14.6: Polygon Dual Mode
 * Story 14.7: Expanding Lava Visual
 * Epic 14: Core Implementation
 *
 * @example
 * ```tsx
 * import { DynamicPolygon, PolygonModeToggle, LavaOverlay, type CategorySpending } from './components/polygon';
 * ```
 */

export {
  DynamicPolygon,
  calculatePolygonPoints,
  type CategorySpending,
  type DynamicPolygonProps,
} from './DynamicPolygon';

export {
  PolygonModeToggle,
  type PolygonMode,
  type PolygonModeToggleProps,
} from './PolygonModeToggle';

export {
  PolygonWithModeToggle,
  type PolygonWithModeToggleProps,
} from './PolygonWithModeToggle';

export {
  LavaOverlay,
  calculateProximity,
  LAVA_COLORS,
  type VertexData,
  type ProximityResult,
  type LavaOverlayProps,
} from './LavaOverlay';
