/**
 * PolygonModeToggle Component
 *
 * Story 14.6: Polygon Dual Mode
 * Epic 14: Core Implementation
 *
 * A segmented control that toggles between merchant categories
 * and item groups views for the polygon visualization.
 *
 * @example
 * ```tsx
 * <PolygonModeToggle
 *   mode="categories"
 *   onModeChange={(newMode) => setMode(newMode)}
 * />
 * ```
 *
 * @see docs/sprint-artifacts/epic14/stories/story-14.6-polygon-dual-mode.md
 */

import { useCallback } from 'react';
import { DURATION } from '../animation/constants';
import type { PolygonMode } from '../../hooks/usePolygonMode';

// Re-export PolygonMode for consumers (Pattern #40: single canonical location)
export type { PolygonMode } from '../../hooks/usePolygonMode';

/**
 * Props for PolygonModeToggle component
 */
export interface PolygonModeToggleProps {
  /** Current active mode */
  mode: PolygonMode;
  /** Callback when mode changes */
  onModeChange: (mode: PolygonMode) => void;
  /** Additional CSS classes */
  className?: string;
}

interface ToggleOption {
  mode: PolygonMode;
  label: string;
}

const OPTIONS: ToggleOption[] = [
  { mode: 'categories', label: 'Categorías' },
  { mode: 'groups', label: 'Grupos' },
];

/**
 * PolygonModeToggle - Segmented control for polygon view mode
 */
export function PolygonModeToggle({
  mode,
  onModeChange,
  className = '',
}: PolygonModeToggleProps): JSX.Element {
  const handleClick = useCallback(
    (newMode: PolygonMode) => {
      if (newMode !== mode) {
        onModeChange(newMode);
      }
    },
    [mode, onModeChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, newMode: PolygonMode) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (newMode !== mode) {
          onModeChange(newMode);
        }
      }
    },
    [mode, onModeChange]
  );

  return (
    <div
      role="group"
      aria-label="Polygon view mode"
      className={`inline-flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1 ${className}`}
    >
      {OPTIONS.map((option) => {
        const isActive = mode === option.mode;
        return (
          <button
            key={option.mode}
            type="button"
            aria-pressed={isActive}
            onClick={() => handleClick(option.mode)}
            onKeyDown={(e) => handleKeyDown(e, option.mode)}
            className={`
              px-4 py-2 text-sm font-medium rounded-md
              transition-all ease-out
              min-w-[88px] min-h-[44px]
              focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
              ${
                isActive
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }
            `}
            style={{ transitionDuration: `${DURATION.FAST}ms` }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export default PolygonModeToggle;
