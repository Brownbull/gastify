/**
 * ProcessScan Sub-Handlers
 *
 * Modular sub-handlers extracted from the processScan function.
 * Each handler is focused on a specific responsibility:
 * - validateScanResult: Total validation + dialog trigger
 * - applyAllMappings: Category + merchant + item name mappings
 * - handleCurrencyDetection: Currency check + dialog trigger
 * - handleScanSuccess: QuickSave/Trusted/EditView routing
 *
 * Story 14e-8b: Sub-handlers extraction
 *
 * @module features/scan/handlers/processScan/subhandlers
 */

import type {
  Transaction,
  TransactionItem,
  MappingDependencies,
  TotalMismatchDialogData,
  CurrencyMismatchDialogData,
  QuickSaveDialogData,
  ValidateScanResultOutput,
  CurrencyDetectionResult,
  ScanSuccessResult,
} from './types';
// Story 14e-43: UIDependencies import removed - subhandler deps now use direct function types

import { validateTotal, type TotalValidationResult } from '@features/scan/utils/totalValidation';
import { shouldShowQuickSave, calculateConfidence } from '@/utils/confidenceCheck';
// Story 14e-42: applyItemNameMappings extracted to @features/categories
import { applyItemNameMappings } from '@/features/categories';

// =============================================================================
// Constants
// =============================================================================

/**
 * Minimum confidence score required for a merchant match to be applied.
 * Matches below this threshold are ignored to avoid false positives.
 */
const MERCHANT_MATCH_CONFIDENCE_THRESHOLD = 0.7;

// =============================================================================
// validateScanResult
// =============================================================================

/**
 * Dependencies for validateScanResult sub-handler.
 *
 * Story 14e-43: Uses direct function types instead of picking from UIDependencies
 * since those callbacks are now deprecated/optional in the main interface.
 * The actual functions passed come from store actions in processScan.ts.
 */
export interface ValidateScanResultDeps {
  /**
   * Show scan dialog (for total mismatch).
   * Story 14e-43: Receives scanActions.showDialog wrapper from processScan.
   */
  showScanDialog: (type: 'total_mismatch' | 'currency_mismatch' | 'quicksave', data?: unknown) => void;
  /**
   * Set analyzing state
   * @deprecated Story 14e-25d: No-op - state managed by state machine
   */
  setIsAnalyzing?: (analyzing: boolean) => void;
  /** Reconcile items total function */
  reconcileItemsTotal: (
    items: TransactionItem[],
    total: number,
    lang: 'en' | 'es'
  ) => { items: TransactionItem[]; hasDiscrepancy: boolean; discrepancyAmount: number };
  /** Language code */
  lang: 'en' | 'es';
}

/**
 * Validate scan result total against items sum.
 *
 * If discrepancy > 40%, shows TotalMismatchDialog and returns shouldContinue: false.
 * Otherwise, reconciles items (adds adjustment item if needed) and continues.
 *
 * @param transaction - Temporary transaction built from scan result
 * @param parsedItems - Parsed items from scan result
 * @param deps - Dependencies for validation
 * @returns Validation result with continue/abort signal
 *
 * @example
 * ```typescript
 * const result = validateScanResult(tempTransaction, parsedItems, {
 *   showScanDialog,
 *   scanOverlay,
 *   reconcileItemsTotal,
 *   lang: 'es',
 * });
 *
 * if (!result.shouldContinue) {
 *   return; // Dialog shown, wait for user action
 * }
 *
 * // Continue with result.reconciledItems
 * ```
 */
export function validateScanResult(
  transaction: Transaction,
  parsedItems: TransactionItem[],
  deps: ValidateScanResultDeps
): ValidateScanResultOutput {
  const { showScanDialog, reconcileItemsTotal, lang } = deps;

  // Validate total using centralized utility
  const totalValidation: TotalValidationResult = validateTotal(transaction);

  if (!totalValidation.isValid) {
    // Build dialog data for TotalMismatchDialog
    const dialogData: TotalMismatchDialogData = {
      validationResult: totalValidation,
      pendingTransaction: transaction,
      parsedItems,
    };

    showScanDialog('total_mismatch', dialogData);
    // TD-18-3: removed scanOverlay.setReady() — dialog IS the user's next action,
    // setReady() triggered auto-dismiss which killed the dialog after 500ms

    return {
      isValid: false,
      shouldContinue: false,
    };
  }

  // Reconcile items total with receipt total (add adjustment item if needed)
  const { items: reconciledItems, hasDiscrepancy } = reconcileItemsTotal(
    parsedItems,
    transaction.total,
    lang
  );

  return {
    isValid: true,
    shouldContinue: true,
    reconciledItems,
    hasDiscrepancy,
  };
}

// =============================================================================
// applyAllMappings
// =============================================================================

/**
 * Dependencies for applyAllMappings sub-handler.
 */
export interface ApplyAllMappingsDeps {
  /** Mapping dependencies */
  mapping: MappingDependencies;
  /** Firebase user ID (for fire-and-forget updates) */
  userId?: string;
}

/**
 * Result of applying all mappings.
 */
export interface ApplyAllMappingsResult {
  /** Transaction with all mappings applied */
  transaction: Transaction;
  /** IDs of category mappings applied */
  appliedCategoryMappingIds: string[];
  /** ID of merchant mapping applied (if any) */
  appliedMerchantMappingId?: string;
  /** IDs of item name mappings applied */
  appliedItemNameMappingIds: string[];
  /** The normalized merchant name (if merchant was matched) */
  normalizedMerchant?: string;
}

/**
 * Apply all learned mappings to a transaction.
 *
 * Applies mappings in order:
 * 1. Category mappings (item categories based on learned preferences)
 * 2. Merchant mapping (alias, store category)
 * 3. Item name mappings (scoped to matched merchant)
 *
 * Also increments usage counters for applied mappings (fire-and-forget).
 *
 * @param transaction - Initial transaction to apply mappings to
 * @param deps - Mapping dependencies
 * @returns Transaction with all mappings applied and lists of applied mapping IDs
 *
 * @example
 * ```typescript
 * const result = applyAllMappings(initialTransaction, {
 *   mapping: mappingDeps,
 *   userId: user.uid,
 * });
 *
 * // result.transaction has all mappings applied
 * // result.appliedCategoryMappingIds, appliedMerchantMappingId, appliedItemNameMappingIds
 * ```
 */
export function applyAllMappings(
  transaction: Transaction,
  deps: ApplyAllMappingsDeps
): ApplyAllMappingsResult {
  const { mapping, userId } = deps;
  const {
    mappings,
    applyCategoryMappings,
    findMerchantMatch,
    findItemNameMatch, // Story 14e-42: Now uses pure utility via dependency injection
    incrementMappingUsage,
    incrementMerchantMappingUsage,
    incrementItemNameMappingUsage,
  } = mapping;

  const appliedCategoryMappingIds: string[] = [];
  const appliedItemNameMappingIds: string[] = [];
  let appliedMerchantMappingId: string | undefined;
  let normalizedMerchant: string | undefined;

  // Step 1: Apply category mappings
  const { transaction: categorizedTransaction, appliedMappingIds } = applyCategoryMappings(
    transaction,
    mappings
  );

  appliedCategoryMappingIds.push(...appliedMappingIds);

  // Increment usage for category mappings (fire-and-forget)
  if (appliedMappingIds.length > 0 && userId) {
    appliedMappingIds.forEach((mappingId) => {
      incrementMappingUsage(mappingId);
    });
  }

  // Step 2: Apply merchant mapping
  let finalTransaction = categorizedTransaction;
  const merchantMatch = findMerchantMatch(categorizedTransaction.merchant);

  if (merchantMatch && merchantMatch.confidence > MERCHANT_MATCH_CONFIDENCE_THRESHOLD) {
    finalTransaction = {
      ...finalTransaction,
      alias: merchantMatch.mapping.targetMerchant,
      ...(merchantMatch.mapping.storeCategory && {
        category: merchantMatch.mapping.storeCategory as Transaction['category'],
      }),
      merchantSource: 'learned' as const,
    };

    appliedMerchantMappingId = merchantMatch.mapping.id;
    normalizedMerchant = merchantMatch.mapping.normalizedMerchant;

    // Increment usage for merchant mapping (fire-and-forget)
    if (merchantMatch.mapping.id && userId) {
      incrementMerchantMappingUsage(merchantMatch.mapping.id);
    }

    // Step 3: Apply item name mappings (scoped to matched merchant)
    // Story 14e-42: Uses pure utility from @features/categories with findItemNameMatch DI
    const { transaction: txWithItemNames, appliedIds: itemNameMappingIds } = applyItemNameMappings(
      finalTransaction,
      merchantMatch.mapping.normalizedMerchant,
      findItemNameMatch
    );

    finalTransaction = txWithItemNames;
    appliedItemNameMappingIds.push(...itemNameMappingIds);

    // Increment usage for item name mappings (fire-and-forget)
    if (itemNameMappingIds.length > 0 && userId) {
      itemNameMappingIds.forEach((id) => {
        incrementItemNameMappingUsage(id);
      });
    }
  }

  return {
    transaction: finalTransaction,
    appliedCategoryMappingIds,
    appliedMerchantMappingId,
    appliedItemNameMappingIds,
    normalizedMerchant,
  };
}

// =============================================================================
// handleCurrencyDetection
// =============================================================================

/**
 * Dependencies for handleCurrencyDetection sub-handler.
 *
 * Story 14e-43: Uses direct function types instead of picking from UIDependencies
 * since those callbacks are now deprecated/optional in the main interface.
 * The actual functions passed come from store actions in processScan.ts.
 */
export interface HandleCurrencyDetectionDeps {
  /**
   * Show scan dialog (for currency mismatch).
   * Story 14e-43: Receives scanActions.showDialog wrapper from processScan.
   */
  showScanDialog: (type: 'total_mismatch' | 'currency_mismatch' | 'quicksave', data?: unknown) => void;
  /**
   * Set analyzing state
   * @deprecated Story 14e-25d: No-op - state managed by state machine
   */
  setIsAnalyzing?: (analyzing: boolean) => void;
}

/**
 * Handle currency detection logic.
 *
 * Compares detected currency against user's default currency.
 * If different, shows CurrencyMismatchDialog and returns shouldContinue: false.
 * If no currency detected, uses user's default.
 *
 * @param detectedCurrency - Currency detected from scan (may be undefined)
 * @param userDefaultCurrency - User's configured default currency
 * @param transaction - Transaction to check/update
 * @param hasDiscrepancy - Whether there was an item total discrepancy
 * @param deps - Dependencies
 * @returns Currency detection result with continue signal
 *
 * @example
 * ```typescript
 * const result = handleCurrencyDetection(
 *   transaction.currency,
 *   userPreferences.defaultCurrency,
 *   transaction,
 *   hasDiscrepancy,
 *   { showScanDialog, scanOverlay }
 * );
 *
 * if (!result.shouldContinue) {
 *   return; // Dialog shown, wait for user choice
 * }
 *
 * // Use result.finalCurrency
 * ```
 */
export function handleCurrencyDetection(
  detectedCurrency: string | undefined,
  userDefaultCurrency: string | undefined,
  transaction: Transaction,
  hasDiscrepancy: boolean,
  deps: HandleCurrencyDetectionDeps
): CurrencyDetectionResult {
  const { showScanDialog } = deps;

  // Check for currency mismatch
  if (detectedCurrency && userDefaultCurrency && detectedCurrency !== userDefaultCurrency) {
    const dialogData: CurrencyMismatchDialogData = {
      detectedCurrency,
      pendingTransaction: transaction,
      hasDiscrepancy,
    };

    showScanDialog('currency_mismatch', dialogData);
    // TD-18-3: removed scanOverlay.setReady() — same fix as total_mismatch path

    return {
      shouldContinue: false,
    };
  }

  // If no currency detected, use user's default
  const finalCurrency = detectedCurrency || userDefaultCurrency || undefined;

  return {
    shouldContinue: true,
    finalCurrency,
  };
}

// =============================================================================
// handleScanSuccess
// =============================================================================

/**
 * Dependencies for handleScanSuccess sub-handler.
 *
 * Story 14e-43: Uses direct function types instead of picking from UIDependencies
 * since those callbacks are now deprecated/optional in the main interface.
 * The actual functions passed come from store actions in processScan.ts.
 */
export interface HandleScanSuccessDeps {
  /** Check if merchant is trusted (async) */
  checkTrusted: (merchantAlias: string) => Promise<boolean>;
  /**
   * Show scan dialog (for quick save).
   * Story 14e-43: Receives scanActions.showDialog wrapper from processScan.
   */
  showScanDialog: (type: 'total_mismatch' | 'currency_mismatch' | 'quicksave', data?: unknown) => void;
  /**
   * Set skip scan complete modal flag.
   * Story 14e-43: Receives scanActions.setSkipScanCompleteModal from processScan.
   */
  setSkipScanCompleteModal: (skip: boolean) => void;
  /**
   * Set animate edit view items flag.
   * Story 14e-43: Receives transactionEditorActions.setAnimateItems from processScan.
   */
  setAnimateEditViewItems: (animate: boolean) => void;
}

/**
 * Handle scan success routing logic.
 *
 * Determines the appropriate route after successful scan:
 * 1. Trusted merchant → Auto-save path
 * 2. High confidence (≥85%) → QuickSave card
 * 3. Low confidence → EditView for manual review
 *
 * @param transaction - Final transaction after all processing
 * @param deps - Dependencies for routing decision
 * @returns Routing decision (quicksave, trusted-autosave, or edit-view)
 * @throws If `checkTrusted` rejects (e.g., network error during Firestore lookup)
 *
 * @example
 * ```typescript
 * const result = await handleScanSuccess(finalTransaction, {
 *   checkTrusted,
 *   showScanDialog,
 *   setSkipScanCompleteModal,
 *   setAnimateEditViewItems,
 * });
 *
 * switch (result.route) {
 *   case 'trusted-autosave':
 *     // Auto-save the transaction
 *     break;
 *   case 'quicksave':
 *     // QuickSave dialog already shown
 *     break;
 *   case 'edit-view':
 *     // Navigate to edit view
 *     break;
 * }
 * ```
 */
export async function handleScanSuccess(
  transaction: Transaction,
  deps: HandleScanSuccessDeps
): Promise<ScanSuccessResult> {
  const { checkTrusted, showScanDialog, setSkipScanCompleteModal, setAnimateEditViewItems } = deps;

  const merchantAlias = transaction.alias || transaction.merchant;
  const confidence = calculateConfidence(transaction);

  // Check trusted merchant status
  const isTrusted = merchantAlias ? await checkTrusted(merchantAlias) : false;
  const willShowQuickSave = !isTrusted && shouldShowQuickSave(transaction);

  // Set modal skip flag if we're showing QuickSave or doing auto-save
  if (willShowQuickSave || isTrusted) {
    setSkipScanCompleteModal(true);
  }

  if (isTrusted) {
    // Trusted merchant - auto-save path
    return {
      route: 'trusted-autosave',
      confidence,
      isTrusted: true,
    };
  }

  if (willShowQuickSave) {
    // High confidence - show QuickSave card
    const dialogData: QuickSaveDialogData = {
      transaction,
      confidence,
    };
    showScanDialog('quicksave', dialogData);

    return {
      route: 'quicksave',
      confidence,
      isTrusted: false,
    };
  }

  // Low confidence - stay on editor for manual review
  setAnimateEditViewItems(true);

  return {
    route: 'edit-view',
    confidence,
    isTrusted: false,
  };
}

// NOTE: reconcileItemsTotal moved to @entities/transaction (Story 14e-41)
