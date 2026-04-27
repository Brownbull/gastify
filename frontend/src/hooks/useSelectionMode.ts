/**
 * useSelectionMode Hook
 *
 * Story 14.15: Transaction Selection Mode & Groups
 * Epic 14: Core Implementation
 *
 * Manages selection state for batch operations on transactions.
 * Supports long-press to enter selection mode, toggle selection,
 * select all, and clear selection.
 *
 * @example
 * ```tsx
 * const {
 *   isSelectionMode,
 *   selectedIds,
 *   selectedCount,
 *   enterSelectionMode,
 *   exitSelectionMode,
 *   toggleSelection,
 *   selectAll,
 *   clearSelection,
 *   isSelected,
 * } = useSelectionMode();
 *
 * // In TransactionCard:
 * <div
 *   onTouchStart={handleLongPressStart}
 *   onTouchEnd={handleLongPressEnd}
 *   onClick={() => isSelectionMode ? toggleSelection(tx.id) : onEdit(tx)}
 * >
 *   {isSelectionMode && (
 *     <Checkbox checked={isSelected(tx.id)} />
 *   )}
 * </div>
 * ```
 */

import { useState, useCallback, useRef, useMemo } from 'react';

/** Long-press duration in milliseconds to enter selection mode */
const LONG_PRESS_DURATION = 500;

export interface UseSelectionModeReturn {
    /** Whether selection mode is currently active */
    isSelectionMode: boolean;

    /** Set of selected transaction IDs */
    selectedIds: Set<string>;

    /** Number of selected transactions */
    selectedCount: number;

    /** Enter selection mode, optionally with an initial selection */
    enterSelectionMode: (initialId?: string) => void;

    /** Exit selection mode and clear all selections */
    exitSelectionMode: () => void;

    /** Toggle selection state for a specific transaction */
    toggleSelection: (id: string) => void;

    /** Select all transactions from a provided list */
    selectAll: (ids: string[]) => void;

    /** Clear all selections without exiting selection mode */
    clearSelection: () => void;

    /** Check if a specific transaction is selected */
    isSelected: (id: string) => boolean;

    /** Get array of selected IDs (for batch operations) */
    getSelectedArray: () => string[];

    // Long-press handlers for touch devices
    /** Call on touchstart/mousedown to start long-press timer */
    handleLongPressStart: (id: string) => void;

    /** Call on touchend/mouseup/touchcancel to cancel long-press timer */
    handleLongPressEnd: () => void;

    /** Call on touchmove to cancel long-press if user is scrolling */
    handleLongPressMove: () => void;
}

/**
 * Hook for managing transaction selection mode.
 *
 * @returns Selection mode state and handlers
 */
export function useSelectionMode(): UseSelectionModeReturn {
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Long-press timer ref
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const longPressCandidateRef = useRef<string | null>(null);

    // Derived state
    const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

    /**
     * Enter selection mode, optionally selecting an initial transaction.
     */
    const enterSelectionMode = useCallback((initialId?: string) => {
        setIsSelectionMode(true);
        if (initialId) {
            setSelectedIds(new Set([initialId]));
        }
    }, []);

    /**
     * Exit selection mode and clear all selections.
     */
    const exitSelectionMode = useCallback(() => {
        setIsSelectionMode(false);
        setSelectedIds(new Set());
    }, []);

    /**
     * Toggle selection for a specific transaction.
     */
    const toggleSelection = useCallback((id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    /**
     * Select all transactions from a provided list.
     */
    const selectAll = useCallback((ids: string[]) => {
        setSelectedIds(new Set(ids));
    }, []);

    /**
     * Clear all selections without exiting selection mode.
     */
    const clearSelection = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    /**
     * Check if a specific transaction is selected.
     */
    const isSelected = useCallback(
        (id: string) => selectedIds.has(id),
        [selectedIds]
    );

    /**
     * Get array of selected IDs for batch operations.
     */
    const getSelectedArray = useCallback(
        () => Array.from(selectedIds),
        [selectedIds]
    );

    /**
     * Start long-press timer for entering selection mode.
     * Call on touchstart/mousedown.
     */
    const handleLongPressStart = useCallback(
        (id: string) => {
            // Don't start new long-press if already in selection mode
            if (isSelectionMode) return;

            longPressCandidateRef.current = id;
            longPressTimerRef.current = setTimeout(() => {
                // Enter selection mode with this transaction selected
                enterSelectionMode(id);
                longPressCandidateRef.current = null;
            }, LONG_PRESS_DURATION);
        },
        [isSelectionMode, enterSelectionMode]
    );

    /**
     * Cancel long-press timer.
     * Call on touchend/mouseup/touchcancel.
     */
    const handleLongPressEnd = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        longPressCandidateRef.current = null;
    }, []);

    /**
     * Cancel long-press if user is scrolling.
     * Call on touchmove.
     */
    const handleLongPressMove = useCallback(() => {
        // Cancel long-press when user starts scrolling
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        longPressCandidateRef.current = null;
    }, []);

    return {
        isSelectionMode,
        selectedIds,
        selectedCount,
        enterSelectionMode,
        exitSelectionMode,
        toggleSelection,
        selectAll,
        clearSelection,
        isSelected,
        getSelectedArray,
        handleLongPressStart,
        handleLongPressEnd,
        handleLongPressMove,
    };
}

export default useSelectionMode;
