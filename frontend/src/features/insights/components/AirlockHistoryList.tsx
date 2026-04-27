/**
 * AirlockHistoryList - List of saved airlocks
 *
 * Story 14.33c.1: Airlock Generation & Persistence
 * @see docs/sprint-artifacts/epic14/stories/story-14.33c.1-airlock-generation-persistence.md
 *
 * AC5: Airlock History List
 * - Display saved airlocks below generate button
 * - Sort by most recent first
 * - Empty state: "No tienes airlocks generados aún"
 *
 * Code Review Fix (Story 14.33d):
 * - Added selection mode with long-press activation
 * - Added batch delete support
 * - Added select all functionality
 */

import React, { useState, useCallback } from 'react';
import { Clock, Trash2, X, CheckSquare } from 'lucide-react';
import { AirlockHistoryCard } from './AirlockHistoryCard';
import { AirlockRecord } from '@/types/airlock';

interface AirlockHistoryListProps {
  /** List of airlocks to display */
  airlocks: AirlockRecord[];
  /** Whether the list is loading */
  isLoading: boolean;
  /** Called when an airlock card is tapped */
  onAirlockClick: (airlock: AirlockRecord) => void;
  /** Called when airlocks are deleted */
  onDeleteAirlocks?: (airlockIds: string[]) => Promise<void>;
  /** Whether deletion is in progress */
  isDeleting?: boolean;
  /** Translation function */
  t: (key: string) => string;
  /** Current theme */
  theme: string;
  /** Whether to show the header (default: true) - set to false when filter is shown externally */
  showHeader?: boolean;
}

/**
 * List component for displaying user's saved airlocks.
 * Shows empty state when no airlocks exist.
 * Supports selection mode with long-press for batch deletion.
 */
export const AirlockHistoryList: React.FC<AirlockHistoryListProps> = ({
  airlocks,
  isLoading,
  onAirlockClick,
  onDeleteAirlocks,
  isDeleting = false,
  t,
  theme,
  showHeader = true,
}) => {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Enter selection mode with first item selected
  const enterSelectionMode = useCallback((airlockId: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([airlockId]));
  }, []);

  // Exit selection mode
  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  // Toggle selection of an item
  const toggleSelection = useCallback((airlockId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(airlockId)) {
        next.delete(airlockId);
      } else {
        next.add(airlockId);
      }
      // If no items selected, exit selection mode
      if (next.size === 0) {
        setSelectionMode(false);
      }
      return next;
    });
  }, []);

  // Select all airlocks
  const selectAll = useCallback(() => {
    setSelectedIds(new Set(airlocks.map((a) => a.id)));
  }, [airlocks]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (onDeleteAirlocks && selectedIds.size > 0) {
      await onDeleteAirlocks(Array.from(selectedIds));
      exitSelectionMode();
    }
  }, [onDeleteAirlocks, selectedIds, exitSelectionMode]);

  // Handle card click in selection mode vs normal mode
  const handleCardClick = useCallback(
    (airlock: AirlockRecord) => {
      if (selectionMode) {
        toggleSelection(airlock.id);
      } else {
        onAirlockClick(airlock);
      }
    },
    [selectionMode, toggleSelection, onAirlockClick]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        <p
          className="text-sm mt-3"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t('loading')}...
        </p>
      </div>
    );
  }

  // AC5: Empty state
  if (airlocks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
        >
          <Clock size={32} style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <p
          className="text-base font-medium mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          {t('noAirlocksYet')}
        </p>
        <p
          className="text-sm max-w-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          {t('generateFirstAirlock')}
        </p>
      </div>
    );
  }

  // AC5: Sort by most recent first (already sorted by query, but ensure)
  const sortedAirlocks = [...airlocks].sort((a, b) => {
    try {
      const aTime = a.createdAt?.toDate?.()?.getTime?.() ?? 0;
      const bTime = b.createdAt?.toDate?.()?.getTime?.() ?? 0;
      return bTime - aTime;
    } catch {
      return 0;
    }
  });

  return (
    <div className="space-y-3">
      {/* Selection mode header */}
      {selectionMode ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={exitSelectionMode}
              className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label={t('cancel')}
            >
              <X size={20} style={{ color: 'var(--text-secondary)' }} />
            </button>
            <span
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {selectedIds.size} {t('selected')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Select All button */}
            <button
              onClick={selectAll}
              className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              aria-label={t('selectAll')}
              disabled={selectedIds.size === airlocks.length}
            >
              <CheckSquare
                size={20}
                style={{
                  color: selectedIds.size === airlocks.length
                    ? 'var(--text-tertiary)'
                    : 'var(--text-secondary)',
                }}
              />
            </button>
            {/* Delete button */}
            <button
              onClick={handleDelete}
              disabled={selectedIds.size === 0 || isDeleting}
              className="p-1.5 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
              aria-label={t('delete')}
            >
              {isDeleting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-500" />
              ) : (
                <Trash2 size={20} style={{ color: 'var(--error)' }} />
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Section header - conditionally shown */
        showHeader && (
          <div className="flex items-center justify-between">
            <h3
              className="text-sm font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('yourAirlocks')}
            </h3>
            <span
              className="text-xs"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {airlocks.length} {airlocks.length === 1 ? 'insight' : 'insights'}
            </span>
          </div>
        )
      )}

      {/* Airlock cards */}
      <div className="space-y-2">
        {sortedAirlocks.map((airlock) => (
          <AirlockHistoryCard
            key={airlock.id}
            airlock={airlock}
            onClick={() => handleCardClick(airlock)}
            onLongPress={onDeleteAirlocks ? () => enterSelectionMode(airlock.id) : undefined}
            t={t}
            theme={theme}
            selectionMode={selectionMode}
            isSelected={selectedIds.has(airlock.id)}
          />
        ))}
      </div>
    </div>
  );
};
