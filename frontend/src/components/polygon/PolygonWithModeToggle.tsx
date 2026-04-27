/**
 * PolygonWithModeToggle Component
 *
 * Story 14.6: Polygon Dual Mode
 * Epic 14: Core Implementation
 *
 * An integrated component that combines DynamicPolygon with
 * mode toggle and smooth transitions between merchant categories
 * and item groups views.
 *
 * @example
 * ```tsx
 * <PolygonWithModeToggle
 *   transactions={filteredTransactions}
 *   onVertexClick={(name, mode) => handleDrillDown(name, mode)}
 * />
 * ```
 *
 * @see docs/sprint-artifacts/epic14/stories/story-14.6-polygon-dual-mode.md
 */

import { useMemo, useCallback } from 'react';
import { DynamicPolygon } from './DynamicPolygon';
import { PolygonModeToggle } from './PolygonModeToggle';
import { DURATION } from '../animation/constants';
import {
  usePolygonMode,
  aggregateByMerchantCategory,
  aggregateByItemGroup,
  type PolygonMode,
} from '../../hooks/usePolygonMode';
import type { Transaction } from '../../types/transaction';
import { DEFAULT_CURRENCY } from '../../utils/currency';

/**
 * Props for PolygonWithModeToggle component
 */
export interface PolygonWithModeToggleProps {
  /** Array of transactions to visualize */
  transactions: Transaction[];
  /** Maximum number of vertices (3-6), defaults to 6 */
  maxVertices?: 3 | 4 | 5 | 6;
  /** Enable breathing animation, defaults to true */
  breathing?: boolean;
  /** Callback when a vertex is clicked, receives category/group name and current mode */
  onVertexClick?: (name: string, mode: PolygonMode) => void;
  /** Currency code for formatting (default: CLP) */
  currency?: string;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * PolygonWithModeToggle - Integrated polygon with mode switching
 */
export function PolygonWithModeToggle({
  transactions,
  maxVertices = 6,
  breathing = true,
  onVertexClick,
  currency = DEFAULT_CURRENCY,
  className = '',
}: PolygonWithModeToggleProps): JSX.Element {
  const { mode, setMode } = usePolygonMode();

  // Compute categories based on current mode
  const categories = useMemo(() => {
    if (mode === 'categories') {
      return aggregateByMerchantCategory(transactions);
    } else {
      return aggregateByItemGroup(transactions);
    }
  }, [transactions, mode]);

  // Handle vertex click with mode context
  const handleVertexClick = useCallback(
    (name: string) => {
      if (onVertexClick) {
        onVertexClick(name, mode);
      }
    },
    [onVertexClick, mode]
  );

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Mode Toggle */}
      <div className="flex justify-center mb-4">
        <PolygonModeToggle mode={mode} onModeChange={setMode} />
      </div>

      {/* Polygon with transition */}
      <div
        data-testid="polygon-transition-wrapper"
        className="transition-all ease-out"
        style={{ transitionDuration: `${DURATION.SLOW}ms` }}
      >
        <DynamicPolygon
          categories={categories}
          maxVertices={maxVertices}
          breathing={breathing}
          onVertexClick={onVertexClick ? handleVertexClick : undefined}
          currency={currency}
        />
      </div>
    </div>
  );
}

export default PolygonWithModeToggle;
