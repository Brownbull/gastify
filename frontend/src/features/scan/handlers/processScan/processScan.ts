/**
 * ProcessScan Main Handler
 *
 * Main orchestration function for receipt scanning workflow.
 * Coordinates: validation -> mappings -> currency -> success routing.
 *
 * Story 14e-8c: Main handler integration
 * Story 14e-43: Refactored to use Zustand stores directly for UI state.
 *   Callbacks like showScanDialog, setCurrentTransaction, setView are now
 *   accessed via store actions instead of dependency injection from App.tsx.
 *
 * @module features/scan/handlers/processScan/processScan
 */

import type {
  ProcessScanParams,
  ProcessScanResult,
  ScanResult,
  Transaction,
  TransactionItem,
  StoreCategory,
} from './types';

import {
  getSafeDate,
  parseStrictNumber,
  parseLocationResult,
  buildInitialTransaction,
} from './utils';
import { deriveItemsPrices } from '@entities/transaction/utils';

import {
  validateScanResult,
  applyAllMappings,
  handleCurrencyDetection,
  handleScanSuccess,
} from './subhandlers';

// Story 14e-41: Import reconcileItemsTotal from entity (single source of truth)
import { reconcileItemsTotal } from '@entities/transaction';

import { calculateConfidence } from '@/utils/confidenceCheck';
import { classifyError, extractErrorMessage } from '@/utils/errorHandler';

// =============================================================================
// Story 14e-43: Store Direct Access for Non-React Code
// =============================================================================
// These store actions can be called directly from handler code without React context.
// See docs/sprint-artifacts/epic14e-feature-architecture/architecture-decision.md (ADR-018)
// for the Zustand direct access pattern.
//
// Pattern:
//   scanActions.processError('error')      // Instead of: ui.setScanError('error')
//   appEvents.emit('scan:completed', ...)  // Instead of: transactionEditorActions.setTransaction(tx)
//   navigationActions.setView('dashboard')  // Instead of: ui.setView('dashboard')

import { scanActions } from '@features/scan/store';
// Story 16-7: transactionEditorActions replaced by event bus (AC-ARCH-NO-1)
import { appEvents } from '@shared/events';
import { navigationActions, insightActions } from '@shared/stores';

// =============================================================================
// Constants
// =============================================================================

// =============================================================================
// Main Handler
// =============================================================================

/**
 * Process scanned receipt image(s) through OCR and validation pipeline.
 *
 * This is the main orchestration function that:
 * 1. Validates input (images, credits)
 * 2. Calls Gemini OCR via Cloud Function
 * 3. Builds initial transaction from scan result
 * 4. Validates total (shows dialog if large discrepancy)
 * 5. Applies learned mappings (category, merchant, item names)
 * 6. Handles currency detection (shows dialog if mismatch)
 * 7. Routes to success handler (quicksave, trusted auto-save, or edit view)
 *
 * @param params - All dependencies grouped by category
 * @returns ProcessScanResult with success status and routing decision
 *
 * @example
 * ```typescript
 * const result = await processScan({
 *   scan: { images, currency, storeType, defaultCountry, defaultCity },
 *   user: { userId, creditsRemaining, defaultCurrency, transactions },
 *   mapping: { mappings, applyCategoryMappings, ... },
 *   ui: { setScanError, setCurrentTransaction, ... },
 *   services: { analyzeReceipt, deductUserCredits, ... },
 *   scanOverlay,
 *   t,
 *   lang: 'es',
 * });
 *
 * if (result.success && result.route === 'edit-view') {
 *   // Navigate to edit view
 * }
 * ```
 */
export async function processScan(params: ProcessScanParams): Promise<ProcessScanResult> {
  const {
    scan,
    user,
    mapping,
    ui,
    scanOverlay,
    services,
    t,
    lang,
    trustedAutoSave,
    prefersReducedMotion = false,
  } = params;

  // ==========================================================================
  // All scans go through async pipeline (queueReceiptScan → processReceiptScan).
  // processScan only processes pre-resolved results from the Firestore listener.
  // Sync path (analyzeReceipt) removed — was causing double scan calls.
  // ==========================================================================
  if (!params.asyncResult) {
    console.warn('processScan called without asyncResult — sync path removed');
    return { success: false, error: 'Async pipeline required' };
  }

  try {
    const result: ScanResult = params.asyncResult;

    // ========================================================================
    // Step 5: Parse and Validate Basic Fields
    // ========================================================================

    // Parse date with year validation
    let date = getSafeDate(result.date);
    if (new Date(date).getFullYear() > new Date().getFullYear()) {
      date = new Date().toISOString().split('T')[0];
    }

    const merchant = result.merchant || 'Unknown';
    const finalTotal = parseStrictNumber(result.total);

    // Parse location with validation
    const location = parseLocationResult(
      { country: result.country, city: result.city },
      { defaultCountry: scan.defaultCountry, defaultCity: scan.defaultCity },
      services.getCitiesForCountry
    );

    // Normalize items (map 'quantity' to 'qty', parse prices) then derive unitPrice
    const rawItems: TransactionItem[] = (result.items || []).map((item) => ({
      ...item,
      totalPrice: parseStrictNumber(item.totalPrice),
      unitPrice: item.unitPrice != null ? parseStrictNumber(item.unitPrice) : undefined,
      qty: item.quantity ?? item.qty ?? 1,
    }));
    const parsedItems = deriveItemsPrices(rawItems);

    // ========================================================================
    // Step 6: Validate Total (May Show Dialog)
    // ========================================================================

    // Build temporary transaction for validation
    const tempTransaction: Transaction = {
      merchant,
      date,
      total: finalTotal,
      category: (result.category || 'Other') as StoreCategory,
      alias: merchant,
      items: parsedItems,
      imageUrls: result.imageUrls,
      thumbnailUrl: result.thumbnailUrl,
      time: result.time,
      country: location.country,
      city: location.city,
      currency: result.currency,
      receiptType: result.receiptType,
      promptVersion: result.promptVersion,
      merchantSource: result.merchantSource,
    };

    // Story 14e-43: Pass store action directly instead of ui callback
    const validationResult = validateScanResult(tempTransaction, parsedItems, {
      showScanDialog: (type, data) => scanActions.showDialog({ type, data }),
      reconcileItemsTotal,
      lang,
    });

    if (!validationResult.shouldContinue) {
      // Dialog shown, wait for user action
      return { success: false, error: 'Total validation dialog shown' };
    }

    // ========================================================================
    // Step 7: Build Initial Transaction
    // ========================================================================

    const reconciledItems = validationResult.reconciledItems || parsedItems;
    const hasDiscrepancy = validationResult.hasDiscrepancy || false;

    const initialTransaction = buildInitialTransaction(
      result,
      reconciledItems,
      location,
      finalTotal,
      date,
      { language: lang }
    );

    // ========================================================================
    // Step 8: Apply All Mappings
    // ========================================================================

    const mappingResult = applyAllMappings(initialTransaction, {
      mapping,
      userId: user.userId,
    });

    let finalTransaction = mappingResult.transaction;

    // ========================================================================
    // Step 9: Handle Currency Detection (May Show Dialog)
    // ========================================================================

    // Story 14e-43: Pass store action directly instead of ui callback
    const currencyResult = handleCurrencyDetection(
      finalTransaction.currency,
      user.defaultCurrency,
      finalTransaction,
      hasDiscrepancy,
      {
        showScanDialog: (type, data) => scanActions.showDialog({ type, data }),
      }
    );

    if (!currencyResult.shouldContinue) {
      // Dialog shown, wait for user choice
      return { success: false, error: 'Currency mismatch dialog shown' };
    }

    // Apply final currency if determined
    if (currencyResult.finalCurrency && currencyResult.finalCurrency !== finalTransaction.currency) {
      finalTransaction = {
        ...finalTransaction,
        currency: currencyResult.finalCurrency,
      };
    }

    // ========================================================================
    // Step 10: Determine Success Route
    // ========================================================================
    // Story 16-7: setTransaction moved to scan:completed subscriber (AC-1)

    // If trustedAutoSave dependencies provided, check trusted status
    let routeResult: { route: 'quicksave' | 'trusted-autosave' | 'edit-view'; confidence?: number; isTrusted?: boolean };

    if (trustedAutoSave) {
      // Story 14e-43: Use store actions directly
      // Story 16-7: setAnimateEditViewItems no-op — subscriber handles animation
      routeResult = await handleScanSuccess(finalTransaction, {
        checkTrusted: trustedAutoSave.checkTrusted,
        showScanDialog: (type, data) => scanActions.showDialog({ type, data }),
        setSkipScanCompleteModal: scanActions.setSkipScanCompleteModal,
        setAnimateEditViewItems: () => {},
      });
    } else {
      // No trusted check - default to edit view
      const confidence = calculateConfidence(finalTransaction);
      // Story 16-7: setAnimateItems moved to scan:completed subscriber
      routeResult = { route: 'edit-view', confidence, isTrusted: false };
    }

    // ========================================================================
    // Step 12: Dispatch Success
    // ========================================================================

    // Story 14e-43: Use store action directly
    scanActions.processSuccess([finalTransaction]);
    scanOverlay.setReady();

    // Story 16-7: Emit event for cross-feature subscribers (AC-1, AC-5)
    // TD-16-5: resultIndex 0 = active result; subscriber reads from shared workflow store
    appEvents.emit('scan:completed', { resultIndex: 0 });

    // Haptic feedback on scan success (only when motion enabled)
    if (!prefersReducedMotion && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Discrepancy toast suppressed — reconciliation already adds visible adjustment item.
    // Toast was confusing without actionable next step. User sees adjustment in editor.

    // ========================================================================
    // Step 13: Handle Trusted Merchant Auto-Save (if applicable)
    // ========================================================================

    if (routeResult.route === 'trusted-autosave' && trustedAutoSave) {
      const merchantAlias = finalTransaction.alias || finalTransaction.merchant;

      try {
        // Save transaction
        const transactionId = await trustedAutoSave.saveTransaction(finalTransaction);
        const txWithId = { ...finalTransaction, id: transactionId };

        // Generate insight
        const insight = await trustedAutoSave.generateInsight(
          txWithId,
          user.transactions,
          trustedAutoSave.insightProfile || {
            schemaVersion: 1,
            firstTransactionDate: null as unknown as Date,
            totalTransactions: 0,
            recentInsights: [],
          },
          trustedAutoSave.insightCache
        );

        // Add to batch
        trustedAutoSave.addToBatch(txWithId, insight);

        // Record merchant scan (not edited since it was auto-saved)
        await trustedAutoSave.recordMerchantScan(merchantAlias, false).catch((err) =>
          console.warn('Failed to record merchant scan:', err)
        );

        // Story 14e-43: Clean up scan state using store actions directly
        // Story 16-7: setTransaction(null) removed — scan:completed subscriber handles editor state
        scanActions.setImages([]);
        ui.setToastMessage({ text: t('autoSaved'), type: 'success' });
        navigationActions.setView('dashboard');

        // Story 14e-43: Show insight or batch summary using store actions directly
        const silenced = trustedAutoSave.isInsightsSilenced(trustedAutoSave.insightCache);
        if (!silenced && insight) {
          const willBeBatchMode = (trustedAutoSave.batchSession?.receipts.length ?? 0) + 1 >= 3;
          if (willBeBatchMode) {
            insightActions.showBatchSummaryOverlay();
          } else {
            insightActions.showInsight(insight);
          }
        }

        return {
          success: true,
          transaction: txWithId,
          route: 'trusted-autosave',
          hasDiscrepancy,
          isTrusted: true,
          confidence: routeResult.confidence,
        };
      } catch (autoSaveErr) {
        console.error('Auto-save failed:', autoSaveErr);
        // Fall back to Quick Save Card on error
        // Story 14e-43: Use store action directly
        const confidence = calculateConfidence(finalTransaction);
        scanActions.showDialog({
          type: 'quicksave',
          data: { transaction: finalTransaction, confidence },
        });

        return {
          success: true,
          transaction: finalTransaction,
          route: 'quicksave',
          hasDiscrepancy,
          isTrusted: true, // Was trusted, but auto-save failed
          confidence,
        };
      }
    }

    // ========================================================================
    // Return Result
    // ========================================================================

    return {
      success: true,
      transaction: finalTransaction,
      route: routeResult.route,
      hasDiscrepancy,
      isTrusted: routeResult.isTrusted,
      confidence: routeResult.confidence,
    };
  } catch (e: unknown) {
    // ========================================================================
    // Error Handling + Credit Refund
    // ========================================================================

    const errorCode = classifyError(e);
    const errorMessage = extractErrorMessage(e);

    // Story 14e-43: Use store action directly
    scanActions.processError(errorMessage);

    scanOverlay.setError(errorCode === 'TIMEOUT_ERROR' ? 'timeout' : 'api', errorMessage);

    // Credit refund handled server-side (async pipeline only)

    return {
      success: false,
      error: errorMessage,
    };
  }
}
