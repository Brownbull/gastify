/**
 * ProcessScan Types
 *
 * Type definitions for the processScan handler and its sub-handlers.
 * Placeholder for Story 14e-8b which will add handler-specific types.
 *
 * @module features/scan/handlers/processScan/types
 */

import type { Transaction, TransactionItem } from '@/types/transaction';
import type { StoreCategory } from '../../../../../shared/schema/categories';
import type { FindItemNameMatchFn } from '@/features/categories';
import type { ToastMessage } from '@/shared/hooks';

/**
 * Result from Gemini AI scan (subset of Transaction fields returned by analyzeReceipt).
 * This represents the raw data returned from the Cloud Function before processing.
 */
export interface ScanResult {
  /** Merchant name from receipt */
  merchant?: string;
  /** Transaction date in YYYY-MM-DD format */
  date?: string;
  /** Transaction total */
  total?: number;
  /** Store category */
  category?: StoreCategory | string;
  /** Line items from receipt */
  items?: Array<{
    name: string;
    totalPrice: number;
    unitPrice?: number;
    quantity?: number;
    qty?: number;
    category?: string;
    subcategory?: string;
  }>;
  /** Image URLs stored in Firebase Storage */
  imageUrls?: string[];
  /** Thumbnail URL for preview */
  thumbnailUrl?: string;
  /** Time of purchase in HH:mm format */
  time?: string;
  /** Country from receipt */
  country?: string;
  /** City from receipt */
  city?: string;
  /** Currency code (e.g., "CLP", "USD") */
  currency?: string;
  /** Receipt type (receipt, invoice, ticket) */
  receiptType?: string;
  /** Prompt version used for extraction */
  promptVersion?: string;
  /** Source of merchant name */
  merchantSource?: 'scan' | 'learned' | 'user';
}

/**
 * Location defaults for transaction building.
 */
export interface LocationDefaults {
  /** Default country from user preferences */
  defaultCountry: string;
  /** Default city from user preferences */
  defaultCity: string;
}

/**
 * Configuration for building initial transaction.
 */
export interface BuildTransactionConfig {
  /** Language for UI text ('en' or 'es') */
  language: 'en' | 'es';
}

/**
 * Parsed location result after validation.
 */
export interface ParsedLocation {
  /** Validated country name */
  country: string;
  /** Validated city name */
  city: string;
}

/**
 * City validator function type (for dependency injection).
 * Returns list of valid cities for a given country.
 */
export type CityValidator = (country: string) => string[];

// =============================================================================
// Dependency Interfaces for Sub-Handlers (Story 14e-8b)
// =============================================================================

/**
 * Scan dependencies - scan state values.
 * These represent the current scan context when processScan is invoked.
 */
export interface ScanDependencies {
  /** Base64 images or image URLs to process */
  images: string[];
  /** Pre-selected currency (from scan options) */
  currency: string;
  /** Pre-selected store type ('auto' or specific category) */
  storeType: string;
  /** User's default country */
  defaultCountry: string;
  /** User's default city */
  defaultCity: string;
}

/**
 * User dependencies - user context for processing.
 */
export interface UserDependencies {
  /** Firebase user UID */
  userId: string;
  /** User's remaining credits */
  creditsRemaining: number;
  /** User's default currency preference */
  defaultCurrency: string;
  /** All user transactions (for insight context) */
  transactions: Transaction[];
}

/**
 * Category mapping result from applyCategoryMappings.
 */
export interface CategoryMappingResult {
  /** Transaction with category mappings applied */
  transaction: Transaction;
  /** IDs of mappings that were applied */
  appliedMappingIds: string[];
}

/**
 * Merchant match result from findMerchantMatch.
 */
export interface MerchantMatchResult {
  /** The matched mapping */
  mapping: {
    /** Mapping ID */
    id?: string;
    /** Target/normalized merchant name */
    targetMerchant: string;
    /** Normalized merchant key for lookups */
    normalizedMerchant: string;
    /** Optional store category override */
    storeCategory?: StoreCategory | string;
  };
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Item name mapping result.
 */
export interface ItemNameMappingResult {
  /** Transaction with item name mappings applied */
  transaction: Transaction;
  /** IDs of item name mappings that were applied */
  appliedIds: string[];
}

/**
 * Mapping dependencies - category, merchant, and item name mapping functions.
 * Uses dependency injection for testability.
 *
 * Note: mappings and applyCategoryMappings use `any` to allow flexibility
 * with the actual CategoryMapping type from the codebase which has many fields.
 */
export interface MappingDependencies {
  /** Category mappings from user's learned preferences */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mappings: any[];

  /** Apply category mappings to a transaction */
  applyCategoryMappings: (
    transaction: Transaction,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mappings: any[]
  ) => CategoryMappingResult;

  /** Find a merchant match for the given merchant name */
  findMerchantMatch: (merchant: string) => MerchantMatchResult | null;

  /**
   * Find item name match for a merchant and item (Story 14e-42).
   * Used with applyItemNameMappings utility from @features/categories.
   */
  findItemNameMatch: FindItemNameMatchFn;

  /** Increment usage count for a category mapping */
  incrementMappingUsage: (mappingId: string) => void;

  /** Increment usage count for a merchant mapping */
  incrementMerchantMappingUsage: (mappingId: string) => void;

  /** Increment usage count for an item name mapping */
  incrementItemNameMappingUsage: (mappingId: string) => void;
}

/**
 * Dialog types supported by processScan flow.
 * Note: Uses lowercase to match ScanDialogType from scanStateMachine.
 */
export type ProcessScanDialogType =
  | 'total_mismatch'
  | 'currency_mismatch'
  | 'quicksave';

/**
 * Total mismatch dialog data.
 */
export interface TotalMismatchDialogData {
  validationResult: {
    isValid: boolean;
    extractedTotal: number;
    itemsSum: number;
    discrepancy: number;
    discrepancyPercent: number;
    suggestedTotal: number | null;
    errorType: 'none' | 'missing_digit' | 'extra_digit' | 'unknown';
  };
  pendingTransaction: Transaction;
  parsedItems: TransactionItem[];
}

/**
 * Currency mismatch dialog data.
 */
export interface CurrencyMismatchDialogData {
  detectedCurrency: string;
  pendingTransaction: Transaction;
  hasDiscrepancy: boolean;
}

/**
 * Quick save dialog data.
 */
export interface QuickSaveDialogData {
  transaction: Transaction;
  confidence: number;
}

/**
 * UI dependencies - setters, dispatchers, and dialog triggers.
 *
 * **Story 14e-43: Store Direct Access Refactor**
 *
 * Most UI callbacks are now accessed directly via Zustand stores in processScan.ts:
 * - scanActions.processError() instead of setScanError()
 * - scanActions.processStart/Success() instead of dispatchProcessStart/Success()
 * - scanActions.showDialog() instead of showScanDialog()
 * - scanActions.setImages() instead of setScanImages()
 * - scanActions.setSkipScanCompleteModal() instead of setSkipScanCompleteModal()
 * - transactionEditorActions.setTransaction() instead of setCurrentTransaction()
 * - transactionEditorActions.setAnimateItems() instead of setAnimateEditViewItems()
 * - transactionEditorActions.setCreditUsed() instead of setCreditUsedInSession()
 * - navigationActions.setView() instead of setView()
 *
 * **Still Required (no store equivalent):**
 * - setToastMessage: No toast store exists yet
 *
 * @see scanActions from '@features/scan/store'
 * @see appEvents from '@shared/events' (Story 16-7: replaced transactionEditorActions)
 * @see navigationActions from '@shared/stores'
 */
export interface UIDependencies {
  /**
   * Set scan error message.
   * @deprecated Story 14e-43: Now accessed via scanActions.processError() directly.
   * This callback is ignored - processScan uses store actions internally.
   */
  setScanError?: (error: string | null) => void;

  /**
   * Set current transaction being edited.
   * @deprecated Story 14e-43: Now accessed via transactionEditorActions.setTransaction() directly.
   * This callback is ignored - processScan uses store actions internally.
   */
  setCurrentTransaction?: (transaction: Transaction | null) => void;

  /**
   * Set the current view.
   * @deprecated Story 14e-43: Now accessed via navigationActions.setView() directly.
   * This callback is ignored - processScan uses store actions internally.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setView?: (view: any) => void;

  /**
   * Show a scan dialog (total mismatch, currency mismatch, quick save).
   * @deprecated Story 14e-43: Now accessed via scanActions.showDialog() directly.
   * This callback is ignored - processScan uses store actions internally.
   */
  showScanDialog?: (type: ProcessScanDialogType, data?: unknown) => void;

  /**
   * Dismiss the current scan dialog.
   * @deprecated Story 14e-43: Now accessed via scanActions.dismissDialog() directly.
   * This callback is ignored - processScan uses store actions internally.
   */
  dismissScanDialog?: () => void;

  /**
   * Dispatch scan process start.
   * @deprecated Story 14e-43: Now accessed via scanActions.processStart() directly.
   * This callback is ignored - processScan uses store actions internally.
   */
  dispatchProcessStart?: (creditType: 'normal' | 'super', creditsCount: number) => void;

  /**
   * Dispatch scan process success.
   * @deprecated Story 14e-43: Now accessed via scanActions.processSuccess() directly.
   * This callback is ignored - processScan uses store actions internally.
   */
  dispatchProcessSuccess?: (results: Transaction[]) => void;

  /**
   * Dispatch scan process error.
   * @deprecated Story 14e-43: Now accessed via scanActions.processError() directly.
   * This callback is ignored - processScan uses store actions internally.
   */
  dispatchProcessError?: (error: string) => void;

  /**
   * Set toast message.
   * **Required** - No toast store exists. This is still injected from App.tsx.
   */
  setToastMessage: (message: ToastMessage) => void;

  /**
   * Set whether analyzing is in progress.
   * @deprecated Story 14e-25d: No-op - state is managed by the scan state machine.
   */
  setIsAnalyzing?: (analyzing: boolean) => void;

  /**
   * Set scan images.
   * @deprecated Story 14e-43: Now accessed via scanActions.setImages() directly.
   * This callback is ignored - processScan uses store actions internally.
   */
  setScanImages?: (images: string[]) => void;

  /**
   * Set animate edit view items flag.
   * @deprecated Story 14e-43: Now accessed via transactionEditorActions.setAnimateItems() directly.
   * This callback is ignored - processScan uses store actions internally.
   */
  setAnimateEditViewItems?: (animate: boolean) => void;

  /**
   * Set skip scan complete modal flag.
   * @deprecated Story 14e-43: Now accessed via scanActions.setSkipScanCompleteModal() directly.
   * This callback is ignored - processScan uses store actions internally.
   */
  setSkipScanCompleteModal?: (skip: boolean) => void;

  /**
   * Mark that credit was used in this session.
   * @deprecated Story 14e-43: Now accessed via transactionEditorActions.setCreditUsed() directly.
   * This callback is ignored - processScan uses store actions internally.
   */
  setCreditUsedInSession?: (used: boolean) => void;
}

/**
 * Scan overlay controller interface.
 */
export interface ScanOverlayController {
  /** Start upload animation */
  startUpload: () => void;
  /** Set upload progress (0-100) */
  setProgress: (percent: number) => void;
  /** Start processing animation */
  startProcessing: () => void;
  /** Set ready state */
  setReady: () => void;
  /** Set error state */
  setError: (type: 'timeout' | 'api', message: string) => void;
}

/**
 * Result of validateScanResult sub-handler.
 */
export interface ValidateScanResultOutput {
  /** Whether the total validation passed */
  isValid: boolean;
  /** Whether to continue with the scan flow */
  shouldContinue: boolean;
  /** Reconciled items (with adjustment if needed) */
  reconciledItems?: TransactionItem[];
  /** Whether there was a discrepancy that was auto-reconciled */
  hasDiscrepancy?: boolean;
}

/**
 * Result of handleCurrencyDetection sub-handler.
 */
export interface CurrencyDetectionResult {
  /** Whether to continue with the scan flow */
  shouldContinue: boolean;
  /** The currency to use (detected, default, or user's choice) */
  finalCurrency?: string;
}

/**
 * Result of handleScanSuccess sub-handler.
 */
export interface ScanSuccessResult {
  /** Routing decision */
  route: 'quicksave' | 'trusted-autosave' | 'edit-view';
  /** Confidence score (for quicksave) */
  confidence?: number;
  /** Whether merchant is trusted */
  isTrusted?: boolean;
}

// =============================================================================
// Service Dependencies (Story 14e-8c)
// =============================================================================

import type { Insight, UserInsightProfile, InsightRecord } from '@/types/insight';
import type { ReceiptType } from '@/services/gemini';
import type { BatchSession } from '@/hooks/useBatchSession';

/**
 * Service dependencies for processScan handler.
 * These are external service calls that need to be injected for testability.
 */
export interface ServiceDependencies {
  /**
   * Analyze receipt images using Gemini AI (Cloud Function).
   * @param images - Base64 encoded images or URLs
   * @param currency - Currency hint (can be empty for auto-detect)
   * @param receiptType - Optional store type hint
   * @returns Parsed transaction data from AI
   */
  analyzeReceipt: (
    images: string[],
    currency: string,
    receiptType?: ReceiptType
  ) => Promise<ScanResult>;

  /**
   * Deduct user credits for scan.
   * @param amount - Number of credits to deduct
   * @returns True if deduction successful, false if insufficient credits
   */
  deductUserCredits: (amount: number) => Promise<boolean>;

  /**
   * Refund user credits on error.
   * @param amount - Number of credits to add back
   */
  addUserCredits: (amount: number) => Promise<void>;

  /**
   * Get valid cities for a country (for location validation).
   * @param country - Country name
   * @returns List of valid city names
   */
  getCitiesForCountry: CityValidator;
}

/**
 * Dependencies for trusted merchant auto-save flow.
 * Used when a trusted merchant is detected to auto-save the transaction.
 */
export interface TrustedAutoSaveDependencies {
  /**
   * Check if a merchant is trusted (for auto-save).
   * @param merchantAlias - Merchant alias to check
   * @returns True if merchant is trusted
   */
  checkTrusted: (merchantAlias: string) => Promise<boolean>;

  /**
   * Save transaction to Firestore.
   * @param transaction - Transaction to save
   * @returns Transaction ID
   */
  saveTransaction: (transaction: Transaction) => Promise<string>;

  /**
   * Generate insight for the saved transaction.
   * @param transaction - Transaction with ID
   * @param history - All user transactions for context
   * @param profile - User's insight profile
   * @param cache - Insight cache (LocalInsightCache from codebase)
   * @returns Generated insight or null
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generateInsight: (
    transaction: Transaction,
    history: Transaction[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    profile: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cache: any
  ) => Promise<Insight | null>;

  /**
   * Add transaction and insight to batch session.
   * @param transaction - Transaction to add
   * @param insight - Optional insight to display
   */
  addToBatch: (transaction: Transaction, insight: Insight | null) => void;

  /**
   * Record merchant scan for trust tracking.
   * @param merchantAlias - Merchant alias
   * @param wasEdited - Whether transaction was edited
   * @returns Promise that resolves when complete (may return TrustPromptEligibility)
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recordMerchantScan: (merchantAlias: string, wasEdited: boolean) => Promise<any>;

  /** User's insight profile */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insightProfile: any | null;

  /** Insight cache (LocalInsightCache from codebase) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insightCache: any;

  /** Check if insights are silenced */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  isInsightsSilenced: (cache: any) => boolean;

  /** Current batch session */
  batchSession: BatchSession | null;

  /**
   * Callback when insight should be shown.
   * @deprecated Story 14e-43: Now accessed via insightActions.showInsight() directly.
   * This callback is ignored - processScan uses store actions internally.
   */
  onShowInsight?: (insight: Insight) => void;

  /**
   * Callback when batch summary should be shown.
   * @deprecated Story 14e-43: Now accessed via insightActions.showBatchSummaryOverlay() directly.
   * This callback is ignored - processScan uses store actions internally.
   */
  onShowBatchSummary?: () => void;
}

/**
 * Combined parameters for the main processScan handler.
 * Groups all dependencies by category for clean function signatures.
 */
export interface ProcessScanParams {
  /** Scan state dependencies */
  scan: ScanDependencies;
  /** User context dependencies */
  user: UserDependencies;
  /** Mapping functions and data */
  mapping: MappingDependencies;
  /** UI callbacks and setters */
  ui: UIDependencies;
  /** Scan overlay controller */
  scanOverlay: ScanOverlayController;
  /** Service dependencies (OCR, credits, etc.) */
  services: ServiceDependencies;
  /** Translation function */
  t: (key: string) => string;
  /** Language code */
  lang: 'en' | 'es';
  /** Trusted auto-save dependencies (optional - if not provided, returns route decision) */
  trustedAutoSave?: TrustedAutoSaveDependencies;
  /** Reduced motion preference (for haptic feedback) */
  prefersReducedMotion?: boolean;
  /** Processing timeout in ms (default: 120000) */
  processingTimeoutMs?: number;
  /**
   * Story 18-13b: Pre-resolved scan result from async pipeline.
   * When set, skips Steps 1-4 (image validation, credit check, credit deduction, Gemini call)
   * and enters at Step 5 with this result. Used by usePendingScan hook when the backend
   * has already completed processing and delivered the result via Firestore.
   * Credit was already deducted server-side — no client credit manipulation needed.
   */
  asyncResult?: ScanResult;
}

/**
 * Result of processScan handler.
 */
export interface ProcessScanResult {
  /** Whether the scan was successful */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Final transaction (if successful) */
  transaction?: Transaction;
  /** Routing decision for successful scan */
  route?: 'quicksave' | 'trusted-autosave' | 'edit-view';
  /** Whether there was an item/total discrepancy */
  hasDiscrepancy?: boolean;
  /** Whether merchant is trusted */
  isTrusted?: boolean;
  /** Confidence score */
  confidence?: number;
}

// Re-export for convenience
export type { Transaction, TransactionItem, StoreCategory };
export type { Insight, UserInsightProfile, InsightRecord };
export type { ReceiptType };
export type { BatchSession };
