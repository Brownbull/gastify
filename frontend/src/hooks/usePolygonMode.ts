/**
 * usePolygonMode Hook
 *
 * Story 14.6: Polygon Dual Mode
 * Epic 14: Core Implementation
 *
 * Manages polygon view mode state with localStorage persistence.
 * Provides aggregation functions for both merchant categories
 * and item groups modes.
 *
 * @example
 * ```tsx
 * const { mode, setMode, toggleMode } = usePolygonMode();
 * const categories = mode === 'categories'
 *   ? aggregateByMerchantCategory(transactions)
 *   : aggregateByItemGroup(transactions);
 * ```
 *
 * @see docs/sprint-artifacts/epic14/stories/story-14.6-polygon-dual-mode.md
 */

import { useState, useCallback } from 'react';
import type { Transaction } from '../types/transaction';
import type { CategorySpending } from '../components/polygon/DynamicPolygon';
// Story 14.21: Use unified category colors
import { getCategoryBackgroundAuto } from '../config/categoryColors';
import { getStorageString, setStorageString } from '@/utils/storage';

/**
 * Available polygon view modes
 */
export type PolygonMode = 'categories' | 'groups';

const STORAGE_KEY = 'boletapp:polygon-mode';
const VALID_MODES: PolygonMode[] = ['categories', 'groups'];

function loadModeFromStorage(): PolygonMode {
  const stored = getStorageString(STORAGE_KEY, 'categories');
  if (VALID_MODES.includes(stored as PolygonMode)) {
    return stored as PolygonMode;
  }
  return 'categories';
}

function saveModeToStorage(mode: PolygonMode): void {
  setStorageString(STORAGE_KEY, mode);
}

/**
 * Hook return type
 */
export interface UsePolygonModeReturn {
  /** Current polygon view mode */
  mode: PolygonMode;
  /** Set the polygon view mode */
  setMode: (mode: PolygonMode) => void;
  /** Toggle between modes */
  toggleMode: () => void;
}

/**
 * Hook to manage polygon view mode with persistence
 */
export function usePolygonMode(): UsePolygonModeReturn {
  const [mode, setModeState] = useState<PolygonMode>(() => loadModeFromStorage());

  // Persist mode changes to localStorage
  const setMode = useCallback((newMode: PolygonMode) => {
    setModeState(newMode);
    saveModeToStorage(newMode);
  }, []);

  // Toggle between modes
  const toggleMode = useCallback(() => {
    setModeState((current) => {
      const newMode = current === 'categories' ? 'groups' : 'categories';
      saveModeToStorage(newMode);
      return newMode;
    });
  }, []);

  return { mode, setMode, toggleMode };
}

/**
 * Aggregate transactions by merchant category (store category)
 *
 * Groups transactions by their store category (Supermarket, Restaurant, etc.)
 * and returns spending totals for the polygon visualization.
 *
 * @param transactions - Array of transactions to aggregate
 * @returns Array of CategorySpending sorted by amount descending
 */
export function aggregateByMerchantCategory(
  transactions: Transaction[]
): CategorySpending[] {
  const totals: Record<string, number> = {};

  transactions.forEach((tx) => {
    const category = tx.category || 'Other';
    totals[category] = (totals[category] || 0) + tx.total;
  });

  return Object.entries(totals)
    .map(([name, amount]) => ({
      name,
      amount,
      color: getCategoryBackgroundAuto(name),
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Aggregate transactions by item group (item category)
 *
 * Groups transaction items by their category (Produce, Pantry, etc.)
 * and returns spending totals for the polygon visualization.
 *
 * @param transactions - Array of transactions to aggregate
 * @returns Array of CategorySpending sorted by amount descending
 */
export function aggregateByItemGroup(
  transactions: Transaction[]
): CategorySpending[] {
  const totals: Record<string, number> = {};

  transactions.forEach((tx) => {
    tx.items.forEach((item) => {
      const category = item.category || 'Other';
      totals[category] = (totals[category] || 0) + item.totalPrice;
    });
  });

  return Object.entries(totals)
    .map(([name, amount]) => ({
      name,
      amount,
      color: getCategoryBackgroundAuto(name),
    }))
    .sort((a, b) => b.amount - a.amount);
}

export default usePolygonMode;
