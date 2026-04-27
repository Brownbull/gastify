/**
 * Story 14e-14b: Batch Save Handlers
 *
 * Extracted from App.tsx handleBatchSaveTransaction and handleBatchSaveComplete.
 * Handles saving transactions and completion state during batch review.
 *
 * Source:
 * - handleBatchSaveTransaction: src/App.tsx:1945-2008
 * - handleBatchSaveComplete: src/App.tsx:1929-1942
 */

import { createTransactionRepository } from '@/repositories/transactionRepository';
import { incrementMappingUsage } from '@/services/categoryMappingService';
import { incrementMerchantMappingUsage } from '@/services/merchantMappingService';
import { incrementItemNameMappingUsage } from '@/services/itemNameMappingService';
import { DIALOG_TYPES, type BatchCompleteDialogData } from '@shared/types/scanWorkflow';
import type { Transaction } from '@/types/transaction';
import type { SaveContext, SaveCompleteContext } from './types';
// Story 14e-42: Import pure utility from @features/categories
import { applyItemNameMappings } from '@/features/categories';
import { MERCHANT_CONFIDENCE_THRESHOLD } from '../hooks/batchReviewHandlerTypes';

/**
 * Save a single transaction during batch review.
 * Applies category, merchant, and item name mappings before saving to Firestore.
 *
 * @param transaction - The transaction to save
 * @param context - Dependencies for saving (services, user, mappings)
 * @returns The saved transaction ID
 * @throws Error if not authenticated (services or user is null)
 *
 * @example
 * ```tsx
 * // In BatchReviewView save handler
 * const handleSave = async (transaction: Transaction) => {
 *   const transactionId = await saveBatchTransaction(transaction, {
 *     services,
 *     user,
 *     mappings,
 *     applyCategoryMappings,
 *     findMerchantMatch,
 *     findItemNameMatch, // Story 14e-42: Pure utility uses DI
 *   });
 *   return transactionId;
 * };
 * ```
 */
export async function saveBatchTransaction(
  transaction: Transaction,
  context: SaveContext
): Promise<string> {
  const {
    services,
    user,
    mappings,
    applyCategoryMappings,
    findMerchantMatch,
    findItemNameMatch, // Story 14e-42: Pure utility uses DI
  } = context;

  // Auth check
  if (!services || !user) {
    throw new Error('Not authenticated');
  }

  const { db, appId } = services;

  // Apply category mappings
  const { transaction: categorizedTx, appliedMappingIds } = applyCategoryMappings(
    transaction,
    mappings
  );

  // Increment mapping usage (fire-and-forget)
  if (appliedMappingIds.length > 0) {
    appliedMappingIds.forEach((mappingId) => {
      incrementMappingUsage(db, user.uid, appId, mappingId).catch((err) =>
        console.error('Failed to increment mapping usage:', err)
      );
    });
  }

  // Apply merchant mappings
  // v9.6.1: Also apply learned store category if present
  let finalTx = categorizedTx;
  const merchantMatch = findMerchantMatch(categorizedTx.merchant);

  if (merchantMatch && merchantMatch.confidence > MERCHANT_CONFIDENCE_THRESHOLD) {
    finalTx = {
      ...finalTx,
      alias: merchantMatch.mapping.targetMerchant,
      // v9.6.1: Apply learned store category
      ...(merchantMatch.mapping.storeCategory && {
        category: merchantMatch.mapping.storeCategory,
      }),
      merchantSource: 'learned' as const,
    };

    // Increment merchant mapping usage (fire-and-forget)
    if (merchantMatch.mapping.id) {
      incrementMerchantMappingUsage(db, user.uid, appId, merchantMatch.mapping.id).catch((err) =>
        console.error('Failed to increment merchant mapping usage:', err)
      );
    }

    // v9.7.0: Apply learned item name mappings (scoped to this merchant)
    // Story 14e-42: Uses pure utility from @features/categories with findItemNameMatch DI
    const { transaction: txWithItemNames, appliedIds: itemNameMappingIds } = applyItemNameMappings(
      finalTx,
      merchantMatch.mapping.normalizedMerchant,
      findItemNameMatch
    );
    finalTx = txWithItemNames;

    // Increment item name mapping usage counts (fire-and-forget)
    if (itemNameMappingIds.length > 0) {
      itemNameMappingIds.forEach((id) => {
        incrementItemNameMappingUsage(db, user.uid, appId, id).catch((err) =>
          console.error('Failed to increment item name mapping usage:', err)
        );
      });
    }
  }

  // Save transaction to Firestore
  const repo = createTransactionRepository({ db, userId: user.uid, appId });
  const transactionId = await repo.add(finalTx);

  return transactionId;
}

/**
 * Handle completion of batch save.
 * Resets state and shows the batch complete modal if transactions were saved.
 *
 * @param savedTransactions - Array of successfully saved transactions
 * @param context - Dependencies for completion (setters, reset functions)
 *
 * @example
 * ```tsx
 * // In BatchReviewView after saving all
 * const onAllSaved = (txIds: string[], transactions: Transaction[]) => {
 *   handleSaveComplete(transactions, {
 *     setBatchImages,
 *     batchProcessing,
 *     resetScanContext,
 *     showScanDialog,
 *     setView,
 *   });
 * };
 * ```
 */
export function handleSaveComplete(
  savedTransactions: Transaction[],
  context: SaveCompleteContext
): void {
  const { setBatchImages, batchProcessing, resetScanContext, showScanDialog, setView } = context;

  // Reset batch state
  setBatchImages([]);
  batchProcessing.reset();
  resetScanContext();

  // Show results modal if transactions were saved
  if (savedTransactions.length > 0) {
    const dialogData: BatchCompleteDialogData = {
      transactions: savedTransactions,
      creditsUsed: 1, // Batch uses 1 super credit regardless of transaction count
    };
    showScanDialog(DIALOG_TYPES.BATCH_COMPLETE, dialogData);
  }

  // Navigate to dashboard
  setView('dashboard');
}
