/**
 * useCrossStoreSuggestions — Cross-Store Item Name Suggestion Hook
 *
 * Story 15-5d: Extracted from TransactionEditorViewInternal.tsx
 * Phase 4: Cross-Store Suggestions feature
 *
 * Detects when an item at the current merchant has a learned name at another merchant,
 * and offers to apply that name. Only suggests when:
 * 1. The item doesn't already have a learned name at the current merchant
 * 2. Another merchant has a mapping with the same normalized item name
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { normalizeMerchantName } from '@/services/merchantMappingService';
import { normalizeItemName } from '@/services/itemNameMappingService';
import type { ItemNameMapping } from '@/types/itemNameMapping';
import type { Transaction, TransactionItem } from '@/types/transaction';
import type { ItemCategory } from '../../../../../shared/schema/categories';
import type { ToastType } from '@/shared/hooks/useToast';
import type { ModalType, ModalPropsMap } from '@managers/ModalManager/types';

// ============================================================================
// Types
// ============================================================================

export interface SuggestionData {
  suggestedName: string;
  fromMerchant: string;
  fromNormalizedMerchant: string;
}

export interface ActiveSuggestion {
  itemIndex: number;
  originalName: string;
  suggestedName: string;
  fromMerchant: string;
  fromNormalizedMerchant: string;
}

interface UseCrossStoreSuggestionsParams {
  transaction: Transaction | null;
  itemNameMappings: ItemNameMapping[];
  onUpdateTransaction: (t: Transaction) => void;
  onSaveItemNameMapping?: (
    normalizedMerchant: string,
    originalItemName: string,
    targetItemName: string,
    targetCategory?: ItemCategory
  ) => Promise<string>;
  showToast: (text: string, type?: ToastType) => void;
  openModal: <T extends ModalType>(type: T, props: ModalPropsMap[T]) => void;
  closeModal: () => void;
  t: (key: string) => string;
  theme: 'light' | 'dark';
}

export interface UseCrossStoreSuggestionsReturn {
  itemSuggestions: Map<number, SuggestionData>;
  activeSuggestion: ActiveSuggestion | null;
  handleShowSuggestion: (itemIndex: number, item: TransactionItem) => void;
  handleApplySuggestionRef: React.MutableRefObject<() => void>;
  handleDismissSuggestionRef: React.MutableRefObject<() => void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useCrossStoreSuggestions({
  transaction,
  itemNameMappings,
  onUpdateTransaction,
  onSaveItemNameMapping,
  showToast,
  openModal,
  closeModal,
  t,
  theme,
}: UseCrossStoreSuggestionsParams): UseCrossStoreSuggestionsReturn {
  // Suggestion state
  const [itemSuggestions, setItemSuggestions] = useState<Map<number, SuggestionData>>(new Map());
  const [activeSuggestion, setActiveSuggestion] = useState<ActiveSuggestion | null>(null);

  // Refs for Modal Manager callbacks
  const handleApplySuggestionRef = useRef<() => void>(() => {});
  const handleDismissSuggestionRef = useRef<() => void>(() => {});
  const prevActiveSuggestionRef = useRef<ActiveSuggestion | null>(null);

  /**
   * Find a cross-store suggestion for a given item name at the current merchant.
   * Returns null if no suggestion available or current merchant already has a mapping.
   */
  const findCrossStoreSuggestion = useCallback((
    itemName: string,
    currentNormalizedMerchant: string
  ): SuggestionData | null => {
    if (!itemName || !currentNormalizedMerchant || itemNameMappings.length === 0) {
      return null;
    }

    const normalizedItem = normalizeItemName(itemName);

    // Skip very short item names to avoid false matches
    if (normalizedItem.length < 3) {
      return null;
    }

    // Check if current merchant already has a mapping for this item
    const hasCurrentMerchantMapping = itemNameMappings.some(
      m => m.normalizedMerchant === currentNormalizedMerchant &&
           m.normalizedItemName === normalizedItem
    );

    if (hasCurrentMerchantMapping) {
      return null;
    }

    // Find mappings from OTHER merchants that match this item name
    // Prioritize by usage count (most used mapping first)
    const crossStoreMappings = itemNameMappings
      .filter(m =>
        m.normalizedMerchant !== currentNormalizedMerchant &&
        m.normalizedItemName === normalizedItem
      )
      .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));

    if (crossStoreMappings.length === 0) {
      return null;
    }

    const bestMatch = crossStoreMappings[0];
    return {
      suggestedName: bestMatch.targetItemName,
      fromMerchant: bestMatch.normalizedMerchant,
      fromNormalizedMerchant: bestMatch.normalizedMerchant,
    };
  }, [itemNameMappings]);

  // Compute suggestions for all items when transaction or mappings change
  useEffect(() => {
    if (!transaction?.merchant || !transaction?.items || itemNameMappings.length === 0) {
      if (itemSuggestions.size > 0) {
        setItemSuggestions(new Map());
      }
      return;
    }

    const currentNormalizedMerchant = normalizeMerchantName(transaction.merchant);
    const newSuggestions = new Map<number, SuggestionData>();

    transaction.items.forEach((item, index) => {
      if (!item.name) return;

      const suggestion = findCrossStoreSuggestion(item.name, currentNormalizedMerchant);
      if (suggestion) {
        newSuggestions.set(index, suggestion);
      }
    });

    // Only update state if suggestions actually changed
    const currentKeys = Array.from(itemSuggestions.keys()).sort().join(',');
    const newKeys = Array.from(newSuggestions.keys()).sort().join(',');
    if (currentKeys !== newKeys) {
      setItemSuggestions(newSuggestions);
    }
  }, [transaction?.merchant, transaction?.items, itemNameMappings, findCrossStoreSuggestion, itemSuggestions]);

  // Apply a cross-store suggestion
  const handleApplySuggestion = useCallback(() => {
    closeModal();
    if (!activeSuggestion || !transaction) return;

    const { itemIndex, suggestedName } = activeSuggestion;

    // Update the item name in the transaction
    const newItems = [...transaction.items];
    if (newItems[itemIndex]) {
      newItems[itemIndex] = {
        ...newItems[itemIndex],
        name: suggestedName,
      };
      onUpdateTransaction({ ...transaction, items: newItems });
    }

    // Remove suggestion for this item (since name is now updated)
    setItemSuggestions(prev => {
      const next = new Map(prev);
      next.delete(itemIndex);
      return next;
    });

    // Save a mapping for the current merchant (makes suggestion permanent)
    if (onSaveItemNameMapping && transaction.merchant) {
      const currentNormalizedMerchant = normalizeMerchantName(transaction.merchant);
      const originalItemName = activeSuggestion.originalName;
      const targetCategory = newItems[itemIndex]?.category as ItemCategory | undefined;

      onSaveItemNameMapping(
        currentNormalizedMerchant,
        originalItemName,
        suggestedName,
        targetCategory
      ).catch(err => console.error('Failed to save cross-store suggestion mapping:', err));
    }

    setActiveSuggestion(null);
    showToast(t('suggestionApplied') || 'Name updated from suggestion', 'success');
  }, [closeModal, activeSuggestion, transaction, onUpdateTransaction, onSaveItemNameMapping, showToast, t]);

  // Show suggestion dialog for a specific item
  const handleShowSuggestion = useCallback((itemIndex: number, item: TransactionItem) => {
    const suggestion = itemSuggestions.get(itemIndex);
    if (!suggestion) return;

    setActiveSuggestion({
      itemIndex,
      originalName: item.name,
      suggestedName: suggestion.suggestedName,
      fromMerchant: suggestion.fromMerchant,
      fromNormalizedMerchant: suggestion.fromNormalizedMerchant,
    });
  }, [itemSuggestions]);

  // Dismiss suggestion
  const handleDismissSuggestion = useCallback(() => {
    closeModal();
    setActiveSuggestion(null);
  }, [closeModal]);

  // Update refs for Modal Manager callbacks
  handleApplySuggestionRef.current = handleApplySuggestion;
  handleDismissSuggestionRef.current = handleDismissSuggestion;

  // Open ItemNameSuggestion modal when activeSuggestion becomes non-null
  useEffect(() => {
    const wasOpen = prevActiveSuggestionRef.current !== null;
    prevActiveSuggestionRef.current = activeSuggestion;

    if (!wasOpen && activeSuggestion !== null) {
      openModal('itemNameSuggestion', {
        originalItemName: activeSuggestion.originalName,
        suggestedItemName: activeSuggestion.suggestedName,
        fromMerchant: activeSuggestion.fromMerchant,
        onApply: () => handleApplySuggestionRef.current(),
        onDismiss: () => handleDismissSuggestionRef.current(),
        t,
        theme,
      });
    }
  }, [activeSuggestion, openModal, t, theme]);

  return {
    itemSuggestions,
    activeSuggestion,
    handleShowSuggestion,
    handleApplySuggestionRef,
    handleDismissSuggestionRef,
  };
}
