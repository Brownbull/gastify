/**
 * Story 15b-2a: Pure helper functions and type definitions extracted from EditView.tsx.
 * This file contains ONLY pure functions and type definitions.
 * NO React imports. NO side effects.
 */
import type { ItemCategory, CategorySource, MerchantSource } from '../../../../shared/schema/categories';

/**
 * Local TransactionItem interface for EditView.
 * Story 9.2: Updated to use ItemCategory type for proper typing.
 */
export interface TransactionItem {
    name: string;
    totalPrice: number;
    /** Story 9.2: Item category using ItemCategory type */
    category?: ItemCategory | string;
    subcategory?: string;
    categorySource?: CategorySource;
    /** Story 9.15: Source of subcategory assignment */
    subcategorySource?: CategorySource;
    /** Story 18-8: Price per single unit */
    unitPrice?: number;
    /** Story 14.15b: Item quantity (default 1) */
    qty?: number;
}

export interface Transaction {
    id?: string;
    merchant: string;
    alias?: string;
    date: string;
    total: number;
    category: string;
    items: TransactionItem[];
    imageUrls?: string[];
    thumbnailUrl?: string;
    // Story 9.3: New v2.6.0 fields for display
    /** Purchase time in HH:mm format (e.g., "15:01") */
    time?: string;
    /** Country name from receipt */
    country?: string;
    /** City name from receipt */
    city?: string;
    /** ISO 4217 currency code (e.g., "GBP") */
    currency?: string;
    /** Document type: "receipt" | "invoice" | "ticket" */
    receiptType?: string;
    /** Version of prompt used for AI extraction */
    promptVersion?: string;
    /** Source of the merchant name (scan, learned, user) */
    merchantSource?: MerchantSource;
}

export interface OriginalItem {
    name: string;
    category: string;
    subcategory: string;
}

/**
 * Story 6.3: Find ALL items whose group (category) has changed.
 * Returns array of { itemName, newGroup } for all changed items.
 *
 * @param originalItems - Captured original items at mount time
 * @param currentItems - Current transaction items
 */
export function findAllChangedItemGroups(
    originalItems: OriginalItem[],
    currentItems: TransactionItem[]
): Array<{ itemName: string; newGroup: string }> {
    const changedItems: Array<{ itemName: string; newGroup: string }> = [];

    // Check each item to see if its group changed
    for (let i = 0; i < currentItems.length; i++) {
        const currentItem = currentItems[i];
        const originalItem = originalItems[i];

        // Skip if no original item to compare (new item added)
        if (!originalItem) continue;

        // Skip if item has no name
        if (!currentItem.name) continue;

        // Check if group changed (and new group is not empty)
        const currentGroup = (currentItem.category as string) || '';
        const originalGroup = originalItem.category || '';

        if (currentGroup && currentGroup !== originalGroup) {
            changedItems.push({
                itemName: currentItem.name,
                newGroup: currentGroup
            });
        }
    }

    return changedItems;
}

/**
 * Story 9.15: Find ALL items whose subcategory has changed.
 * Returns array of { itemName, newSubcategory } for all changed items.
 *
 * @param originalItems - Captured original items at mount time
 * @param currentItems - Current transaction items
 */
export function findAllChangedSubcategories(
    originalItems: OriginalItem[],
    currentItems: TransactionItem[]
): Array<{ itemName: string; newSubcategory: string }> {
    const changedItems: Array<{ itemName: string; newSubcategory: string }> = [];

    // Check each item to see if its subcategory changed
    for (let i = 0; i < currentItems.length; i++) {
        const currentItem = currentItems[i];
        const originalItem = originalItems[i];

        // Skip if no original item to compare (new item added)
        if (!originalItem) continue;

        // Skip if item has no name
        if (!currentItem.name) continue;

        // Check if subcategory changed (and new subcategory is not empty)
        const currentSubcategory = currentItem.subcategory || '';
        const originalSubcategory = originalItem.subcategory || '';

        if (currentSubcategory && currentSubcategory !== originalSubcategory) {
            changedItems.push({
                itemName: currentItem.name,
                newSubcategory: currentSubcategory
            });
        }
    }

    return changedItems;
}

/**
 * Story 9.6: Check if merchant alias was changed.
 *
 * @param merchant - Current merchant name
 * @param currentAlias - Current alias value
 * @param originalAlias - Original alias value captured at mount
 * @returns true if the alias changed to a non-empty value
 */
export function hasMerchantAliasChanged(
    merchant: string,
    currentAlias: string,
    originalAlias: string
): boolean {
    // We need a merchant name (from scan) and an alias change to trigger learning
    if (!merchant) return false;
    // Only show prompt if alias changed AND is not empty
    return currentAlias !== originalAlias && currentAlias.length > 0;
}
