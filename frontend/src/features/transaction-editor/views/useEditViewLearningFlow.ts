/**
 * Story 15b-2a: Learning flow hook extracted from EditView.tsx.
 * Encapsulates the 3-stage learning prompt chain:
 * category -> subcategory -> merchant -> save
 */
import { useState } from 'react';
import type { StoreCategory } from '../../../../shared/schema/categories';
import { celebrateSuccess } from '@/utils/confetti';
import {
    Transaction,
    findAllChangedItemGroups, findAllChangedSubcategories, hasMerchantAliasChanged
} from './editViewHelpers';

interface OriginalItemGroupsRef {
    current: {
        items: Array<{ name: string; category: string; subcategory: string }>;
        capturedForTransactionKey: string | null;
    };
}

interface OriginalAliasRef {
    current: string | null;
}

interface UseEditViewLearningFlowProps {
    onSave: () => Promise<void>;
    onSaveMapping?: (item: string, category: StoreCategory, source?: 'user' | 'ai') => Promise<string>;
    onSaveMerchantMapping?: (originalMerchant: string, targetMerchant: string) => Promise<string>;
    onSaveSubcategoryMapping?: (item: string, subcategory: string, source?: 'user' | 'ai') => Promise<string>;
    onShowToast?: (text: string) => void;
    t: (key: string) => string;
    currentTransaction: Transaction;
    originalItemGroupsRef: OriginalItemGroupsRef;
    originalAliasRef: OriginalAliasRef;
}

export function useEditViewLearningFlow({
    onSave,
    onSaveMapping,
    onSaveMerchantMapping,
    onSaveSubcategoryMapping,
    onShowToast,
    t,
    currentTransaction,
    originalItemGroupsRef,
    originalAliasRef,
}: UseEditViewLearningFlowProps) {
    // Story 6.3: Category learning prompt state
    const [showLearningPrompt, setShowLearningPrompt] = useState(false);
    const [itemsToLearn, setItemsToLearn] = useState<Array<{ itemName: string; newGroup: string }>>([]);

    // Story 9.15: Subcategory learning prompt state
    const [showSubcategoryLearningPrompt, setShowSubcategoryLearningPrompt] = useState(false);
    const [subcategoriesToLearn, setSubcategoriesToLearn] = useState<Array<{ itemName: string; newSubcategory: string }>>([]);

    // Story 9.16: Loading state for learning prompts to prevent duplicate saves (AC #1, #2)
    const [savingMappings, setSavingMappings] = useState(false);

    // Story 9.6: Merchant learning prompt state
    const [showMerchantLearningPrompt, setShowMerchantLearningPrompt] = useState(false);

    // Story 9.6: Proceed to merchant learning check or save directly
    const proceedToMerchantLearningOrSave = async () => {
        if (hasMerchantAliasChanged(
            currentTransaction.merchant,
            currentTransaction.alias || '',
            originalAliasRef.current || ''
        ) && onSaveMerchantMapping) {
            setShowMerchantLearningPrompt(true);
        } else {
            await onSave();
        }
    };

    // Story 9.15: Proceed to subcategory learning check, then merchant learning, then save
    const proceedToSubcategoryLearningOrNext = async () => {
        const changedSubcategories = findAllChangedSubcategories(
            originalItemGroupsRef.current.items,
            currentTransaction.items
        );
        if (changedSubcategories.length > 0 && onSaveSubcategoryMapping) {
            setSubcategoriesToLearn(changedSubcategories);
            setShowSubcategoryLearningPrompt(true);
        } else {
            await proceedToMerchantLearningOrSave();
        }
    };

    // Story 6.3 & 9.15: Handle save with category and subcategory learning prompts
    // Shows prompts BEFORE saving if changes detected, because onSave navigates away
    const handleSaveWithLearning = async () => {
        const changedItems = findAllChangedItemGroups(
            originalItemGroupsRef.current.items,
            currentTransaction.items
        );

        if (changedItems.length > 0 && onSaveMapping) {
            setItemsToLearn(changedItems);
            setShowLearningPrompt(true);
        } else {
            await proceedToSubcategoryLearningOrNext();
        }
    };

    // Story 6.3: Handle learning prompt confirmation
    // Story 9.16: Added loading state to prevent duplicate saves (AC #1, #2)
    const handleLearnConfirm = async () => {
        if (onSaveMapping && itemsToLearn.length > 0) {
            setSavingMappings(true);
            try {
                for (const item of itemsToLearn) {
                    await onSaveMapping(item.itemName, item.newGroup as StoreCategory, 'user');
                }
                if (onShowToast) {
                    onShowToast(t('learnCategorySuccess'));
                }
            } catch (error) {
                console.error('Failed to save category mappings:', error instanceof Error ? error.message : String(error));
            } finally {
                setSavingMappings(false);
            }
        }
        setShowLearningPrompt(false);
        setItemsToLearn([]);
        await proceedToSubcategoryLearningOrNext();
    };

    // Story 6.3: Handle learning prompt dismiss
    const handleLearnDismiss = async () => {
        setShowLearningPrompt(false);
        setItemsToLearn([]);
        await proceedToSubcategoryLearningOrNext();
    };

    // Story 9.15: Handle subcategory learning prompt confirmation
    // Story 9.16: Added loading state to prevent duplicate saves (AC #1, #2)
    const handleSubcategoryLearnConfirm = async () => {
        if (onSaveSubcategoryMapping && subcategoriesToLearn.length > 0) {
            setSavingMappings(true);
            try {
                for (const item of subcategoriesToLearn) {
                    await onSaveSubcategoryMapping(item.itemName, item.newSubcategory, 'user');
                }
                if (onShowToast) {
                    onShowToast(t('learnSubcategorySuccess'));
                }
            } catch (error) {
                console.error('Failed to save subcategory mappings:', error instanceof Error ? error.message : String(error));
            } finally {
                setSavingMappings(false);
            }
        }
        setShowSubcategoryLearningPrompt(false);
        setSubcategoriesToLearn([]);
        await proceedToMerchantLearningOrSave();
    };

    // Story 9.15: Handle subcategory learning prompt dismiss
    const handleSubcategoryLearnDismiss = async () => {
        setShowSubcategoryLearningPrompt(false);
        setSubcategoriesToLearn([]);
        await proceedToMerchantLearningOrSave();
    };

    // Story 9.6: Handle merchant learning prompt confirmation (AC#3)
    const handleLearnMerchantConfirm = async () => {
        if (onSaveMerchantMapping && currentTransaction.merchant) {
            try {
                await onSaveMerchantMapping(
                    currentTransaction.merchant,
                    currentTransaction.alias || ''
                );
                celebrateSuccess();
                if (onShowToast) {
                    onShowToast(t('learnMerchantSuccess'));
                }
            } catch (error) {
                console.error('Failed to save merchant mapping:', error instanceof Error ? error.message : String(error));
            }
        }
        setShowMerchantLearningPrompt(false);
        await onSave();
    };

    // Story 9.6: Handle merchant learning prompt dismiss (AC#4)
    const handleLearnMerchantDismiss = async () => {
        setShowMerchantLearningPrompt(false);
        await onSave();
    };

    return {
        showLearningPrompt,
        itemsToLearn,
        handleLearnConfirm,
        handleLearnDismiss,
        showSubcategoryLearningPrompt,
        subcategoriesToLearn,
        handleSubcategoryLearnConfirm,
        handleSubcategoryLearnDismiss,
        showMerchantLearningPrompt,
        handleLearnMerchantConfirm,
        handleLearnMerchantDismiss,
        savingMappings,
        handleSaveWithLearning,
    };
}
