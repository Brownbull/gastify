/**
 * useEditorLearningPrompts — Learning Prompt Chain Hook
 *
 * Story 15-5d: Extracted from TransactionEditorViewInternal.tsx
 *
 * Manages the category → subcategory → merchant learning prompt chain
 * that fires during save. Detects what changed (item categories, subcategories,
 * merchant alias/category, item names) and shows appropriate learning modals
 * via Modal Manager.
 *
 * Chain order: Category Learning → Subcategory Learning → Merchant Learning → Final Save
 */

import { useState, useRef, useEffect } from 'react';
import { normalizeMerchantName } from '@/services/merchantMappingService';
import { celebrateSuccess } from '@/utils/confetti';
import type { LearnMerchantSelection, ItemNameChange } from '@/components/dialogs/LearnMerchantDialog';
import type { Transaction } from '@/types/transaction';
import type { StoreCategory, ItemCategory } from '../../../../../shared/schema/categories';
import type { Language } from '@/utils/translations';
import { translateStoreCategory } from '@/utils/categoryTranslations';
import type { ToastType } from '@/shared/hooks/useToast';
import type { ModalType, ModalPropsMap } from '@managers/ModalManager/types';

// ============================================================================
// Types
// ============================================================================

interface OriginalItemGroupsRef {
  items: Array<{ name: string; category: string; subcategory: string }>;
  capturedForTransactionKey: string | null;
}

export interface UseEditorLearningPromptsParams {
  transaction: Transaction | null;
  originalItemGroupsRef: React.RefObject<OriginalItemGroupsRef>;
  originalAliasRef: React.RefObject<string | null>;
  originalStoreCategoryRef: React.RefObject<StoreCategory | null>;
  /** Must be called AFTER displayTransaction is computed */
  getDisplayTransaction: () => {
    merchant: string;
    alias?: string;
    category?: string;
  };
  lang: Language;
  t: (key: string) => string;
  theme: 'light' | 'dark';
  onSaveMapping?: (item: string, category: StoreCategory, source?: 'user' | 'ai') => Promise<string>;
  onSaveMerchantMapping?: (originalMerchant: string, targetMerchant: string, storeCategory?: StoreCategory) => Promise<string>;
  onSaveSubcategoryMapping?: (item: string, subcategory: string, source?: 'user' | 'ai') => Promise<string>;
  onSaveItemNameMapping?: (
    normalizedMerchant: string,
    originalItemName: string,
    targetItemName: string,
    targetCategory?: ItemCategory
  ) => Promise<string>;
  onFinalSave: () => Promise<void>;
  showToast: (text: string, type?: ToastType) => void;
  openModal: <T extends ModalType>(type: T, props: ModalPropsMap[T]) => void;
  closeModal: () => void;
}

export interface UseEditorLearningPromptsReturn {
  handleSaveWithLearning: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useEditorLearningPrompts({
  transaction,
  originalItemGroupsRef,
  originalAliasRef,
  originalStoreCategoryRef,
  getDisplayTransaction,
  lang,
  t,
  theme,
  onSaveMapping,
  onSaveMerchantMapping,
  onSaveSubcategoryMapping,
  onSaveItemNameMapping,
  onFinalSave,
  showToast,
  openModal,
  closeModal,
}: UseEditorLearningPromptsParams): UseEditorLearningPromptsReturn {
  // Learning prompt states
  const [showLearningPrompt, setShowLearningPrompt] = useState(false);
  const [itemsToLearn, setItemsToLearn] = useState<Array<{ itemName: string; newGroup: string }>>([]);
  const [showSubcategoryLearningPrompt, setShowSubcategoryLearningPrompt] = useState(false);
  const [subcategoriesToLearn, setSubcategoriesToLearn] = useState<Array<{ itemName: string; newSubcategory: string }>>([]);
  const [showMerchantLearningPrompt, setShowMerchantLearningPrompt] = useState(false);
  const [_savingMappings, setSavingMappings] = useState(false);

  // Refs for previous state (modal open detection)
  const prevShowLearningPromptRef = useRef(false);
  const prevShowSubcategoryPromptRef = useRef(false);
  const prevShowMerchantPromptRef = useRef(false);

  // Handler refs — always use latest handlers in useEffect callbacks
  const handleLearnConfirmRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const handleLearnDismissRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const handleSubcategoryConfirmRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const handleSubcategoryDismissRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const handleMerchantConfirmRef = useRef<(selection: LearnMerchantSelection) => Promise<void>>(() => Promise.resolve());
  const handleMerchantDismissRef = useRef<() => Promise<void>>(() => Promise.resolve());

  // -----------------------------------------------------------------------
  // Change detection helpers
  // -----------------------------------------------------------------------

  const findAllChangedItemGroups = (): Array<{ itemName: string; newGroup: string }> => {
    if (!transaction || !originalItemGroupsRef.current) return [];
    const originalItems = originalItemGroupsRef.current.items;
    const changedItems: Array<{ itemName: string; newGroup: string }> = [];

    for (let i = 0; i < transaction.items.length; i++) {
      const currentItem = transaction.items[i];
      const originalItem = originalItems[i];
      if (!originalItem || !currentItem.name) continue;

      const currentGroup = currentItem.category || '';
      const originalGroup = originalItem.category || '';

      if (currentGroup && currentGroup !== originalGroup) {
        changedItems.push({ itemName: currentItem.name, newGroup: currentGroup });
      }
    }
    return changedItems;
  };

  const findAllChangedSubcategories = (): Array<{ itemName: string; newSubcategory: string }> => {
    if (!transaction || !originalItemGroupsRef.current) return [];
    const originalItems = originalItemGroupsRef.current.items;
    const changedItems: Array<{ itemName: string; newSubcategory: string }> = [];

    for (let i = 0; i < transaction.items.length; i++) {
      const currentItem = transaction.items[i];
      const originalItem = originalItems[i];
      if (!originalItem || !currentItem.name) continue;

      const currentSubcategory = currentItem.subcategory || '';
      const originalSubcategory = originalItem.subcategory || '';

      if (currentSubcategory && currentSubcategory !== originalSubcategory) {
        changedItems.push({ itemName: currentItem.name, newSubcategory: currentSubcategory });
      }
    }
    return changedItems;
  };

  const hasMerchantAliasChanged = (): boolean => {
    if (!transaction?.merchant) return false;
    const currentAlias = transaction.alias || '';
    const originalAlias = originalAliasRef.current || '';
    return currentAlias !== originalAlias && currentAlias.length > 0;
  };

  const hasStoreCategoryChanged = (): boolean => {
    if (!transaction?.merchant) return false;
    const currentCategory = transaction.category as StoreCategory;
    const originalCategory = originalStoreCategoryRef.current;
    return currentCategory !== originalCategory && !!currentCategory;
  };

  const findAllChangedItemNames = (): ItemNameChange[] => {
    if (!transaction || !originalItemGroupsRef.current) return [];
    const originalItems = originalItemGroupsRef.current.items;
    const changedItems: ItemNameChange[] = [];

    for (let i = 0; i < transaction.items.length; i++) {
      const currentItem = transaction.items[i];
      const originalItem = originalItems[i];
      if (!originalItem || !currentItem.name) continue;

      const currentName = currentItem.name.trim();
      const originalName = originalItem.name.trim();

      if (currentName && originalName && currentName !== originalName) {
        changedItems.push({
          originalName,
          newName: currentName,
          category: currentItem.category as ItemCategory | undefined,
        });
      }
    }
    return changedItems;
  };

  const hasItemNameChanges = (): boolean => {
    return findAllChangedItemNames().length > 0;
  };

  const hasMerchantLearningChanges = (): boolean => {
    return hasMerchantAliasChanged() || hasStoreCategoryChanged() || hasItemNameChanges();
  };

  // -----------------------------------------------------------------------
  // Learning prompt chain
  // -----------------------------------------------------------------------

  const proceedToMerchantLearningOrSave = async () => {
    if (hasMerchantLearningChanges() && onSaveMerchantMapping) {
      setShowMerchantLearningPrompt(true);
    } else {
      await onFinalSave();
    }
  };

  const proceedToSubcategoryLearningOrNext = async () => {
    const changedSubcategories = findAllChangedSubcategories();
    if (changedSubcategories.length > 0 && onSaveSubcategoryMapping) {
      setSubcategoriesToLearn(changedSubcategories);
      setShowSubcategoryLearningPrompt(true);
    } else {
      await proceedToMerchantLearningOrSave();
    }
  };

  const handleSaveWithLearning = async () => {
    const changedItems = findAllChangedItemGroups();

    if (changedItems.length > 0 && onSaveMapping) {
      setItemsToLearn(changedItems);
      setShowLearningPrompt(true);
    } else {
      await proceedToSubcategoryLearningOrNext();
    }
  };

  // -----------------------------------------------------------------------
  // Learning prompt handlers
  // -----------------------------------------------------------------------

  const handleLearnConfirm = async () => {
    closeModal();
    if (onSaveMapping && itemsToLearn.length > 0) {
      setSavingMappings(true);
      try {
        for (const item of itemsToLearn) {
          await onSaveMapping(item.itemName, item.newGroup as StoreCategory, 'user');
        }
        showToast(t('learnCategorySuccess'), 'success');
      } catch (error) {
        console.error('Failed to save category mappings:', error);
      } finally {
        setSavingMappings(false);
      }
    }
    setShowLearningPrompt(false);
    setItemsToLearn([]);
    await proceedToSubcategoryLearningOrNext();
  };

  const handleLearnDismiss = async () => {
    closeModal();
    setShowLearningPrompt(false);
    setItemsToLearn([]);
    await proceedToSubcategoryLearningOrNext();
  };

  const handleSubcategoryLearnConfirm = async () => {
    closeModal();
    if (onSaveSubcategoryMapping && subcategoriesToLearn.length > 0) {
      setSavingMappings(true);
      try {
        for (const item of subcategoriesToLearn) {
          await onSaveSubcategoryMapping(item.itemName, item.newSubcategory, 'user');
        }
        showToast(t('learnSubcategorySuccess'), 'success');
      } catch (error) {
        console.error('Failed to save subcategory mappings:', error);
      } finally {
        setSavingMappings(false);
      }
    }
    setShowSubcategoryLearningPrompt(false);
    setSubcategoriesToLearn([]);
    await proceedToMerchantLearningOrSave();
  };

  const handleSubcategoryLearnDismiss = async () => {
    closeModal();
    setShowSubcategoryLearningPrompt(false);
    setSubcategoriesToLearn([]);
    await proceedToMerchantLearningOrSave();
  };

  const handleLearnMerchantConfirm = async (selection: LearnMerchantSelection) => {
    closeModal();
    if (transaction?.merchant) {
      const shouldLearnAlias = selection.learnAlias && hasMerchantAliasChanged();
      const shouldLearnCategory = selection.learnCategory && hasStoreCategoryChanged();
      const hasItemsToLearn = selection.itemNamesToLearn && selection.itemNamesToLearn.length > 0;

      // Save merchant mapping (alias and/or category)
      if (onSaveMerchantMapping && (shouldLearnAlias || shouldLearnCategory)) {
        try {
          const aliasToSave = shouldLearnAlias ? (transaction.alias || '') : '';
          const categoryToSave = shouldLearnCategory
            ? (transaction.category as StoreCategory)
            : undefined;

          await onSaveMerchantMapping(transaction.merchant, aliasToSave, categoryToSave);
        } catch (error) {
          console.error('Failed to save merchant mapping:', error);
        }
      }

      // Save item name mappings
      if (onSaveItemNameMapping && hasItemsToLearn) {
        const normalizedMerchant = normalizeMerchantName(transaction.merchant);
        try {
          for (const itemChange of selection.itemNamesToLearn) {
            await onSaveItemNameMapping(
              normalizedMerchant,
              itemChange.originalName,
              itemChange.newName,
              itemChange.category
            );
          }
        } catch (error) {
          console.error('Failed to save item name mappings:', error);
        }
      }

      // Success feedback
      if (shouldLearnAlias || shouldLearnCategory || hasItemsToLearn) {
        celebrateSuccess();
        showToast(t('learnMerchantSuccess'), 'success');
      }
    }
    setShowMerchantLearningPrompt(false);
    await onFinalSave();
  };

  const handleLearnMerchantDismiss = async () => {
    closeModal();
    setShowMerchantLearningPrompt(false);
    await onFinalSave();
  };

  // -----------------------------------------------------------------------
  // Update handler refs (latest handlers for useEffect callbacks)
  // -----------------------------------------------------------------------

  handleLearnConfirmRef.current = handleLearnConfirm;
  handleLearnDismissRef.current = handleLearnDismiss;
  handleSubcategoryConfirmRef.current = handleSubcategoryLearnConfirm;
  handleSubcategoryDismissRef.current = handleSubcategoryLearnDismiss;
  handleMerchantConfirmRef.current = handleLearnMerchantConfirm;
  handleMerchantDismissRef.current = handleLearnMerchantDismiss;

  // -----------------------------------------------------------------------
  // Modal effects — open modals when learning states transition to true
  // -----------------------------------------------------------------------

  // CategoryLearning modal
  useEffect(() => {
    const wasOpen = prevShowLearningPromptRef.current;
    prevShowLearningPromptRef.current = showLearningPrompt;

    if (!wasOpen && showLearningPrompt && itemsToLearn.length > 0) {
      openModal('categoryLearning', {
        items: itemsToLearn,
        onConfirm: () => handleLearnConfirmRef.current(),
        onClose: () => handleLearnDismissRef.current(),
        t,
        theme,
      });
    }
  }, [showLearningPrompt, itemsToLearn, openModal, t, theme]);

  // SubcategoryLearning modal
  useEffect(() => {
    const wasOpen = prevShowSubcategoryPromptRef.current;
    prevShowSubcategoryPromptRef.current = showSubcategoryLearningPrompt;

    if (!wasOpen && showSubcategoryLearningPrompt && subcategoriesToLearn.length > 0) {
      openModal('subcategoryLearning', {
        items: subcategoriesToLearn,
        onConfirm: () => handleSubcategoryConfirmRef.current(),
        onClose: () => handleSubcategoryDismissRef.current(),
        t,
        theme,
      });
    }
  }, [showSubcategoryLearningPrompt, subcategoriesToLearn, openModal, t, theme]);

  // LearnMerchant modal (must read displayTransaction for current values)
  useEffect(() => {
    const wasOpen = prevShowMerchantPromptRef.current;
    prevShowMerchantPromptRef.current = showMerchantLearningPrompt;

    if (!wasOpen && showMerchantLearningPrompt) {
      const dt = getDisplayTransaction();
      openModal('learnMerchant', {
        originalMerchant: dt.merchant,
        correctedMerchant: dt.alias || '',
        aliasChanged: hasMerchantAliasChanged(),
        categoryChanged: hasStoreCategoryChanged(),
        originalCategory: originalStoreCategoryRef.current
          ? translateStoreCategory(originalStoreCategoryRef.current, lang)
          : undefined,
        newCategory: dt.category
          ? translateStoreCategory(dt.category as StoreCategory, lang)
          : undefined,
        itemNameChanges: findAllChangedItemNames(),
        onConfirm: (selection: LearnMerchantSelection) => handleMerchantConfirmRef.current(selection),
        onClose: () => handleMerchantDismissRef.current(),
        t,
        theme,
      });
    }
  }, [
    showMerchantLearningPrompt,
    openModal,
    getDisplayTransaction,
    originalStoreCategoryRef,
    lang,
    t,
    theme,
  ]);

  return {
    handleSaveWithLearning,
  };
}
