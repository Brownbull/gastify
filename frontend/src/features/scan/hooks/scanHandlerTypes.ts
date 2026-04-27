/**
 * Type definitions for useScanHandlers hook
 *
 * Story 15b-2l: Extracted from useScanHandlers.ts for module decomposition.
 * Contains ONLY type definitions, interfaces, and type re-exports.
 * No runtime code, no React imports.
 */

import type { User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { Transaction } from '@/types/transaction';
import type { UserPreferences } from '@/types/preferences';
import type { Insight, UserInsightProfile, LocalInsightCache } from '@/types/insight';
import type { View } from '@app/types';
import type { TrustPromptEligibility } from '@/types/trust';
import type {
    CurrencyMismatchDialogData,
    TotalMismatchDialogData,
    QuickSaveDialogData,
} from '../types/scanStateMachine';
import type { ToastMessage } from '@/shared/hooks';

/**
 * Batch session interface for tracking multi-receipt scans
 * Using permissive type to avoid import issues - actual type is from useBatchSession
 */
export interface BatchSession {
    receipts: Array<{ transaction?: Transaction; insight?: Insight | null } | Transaction>;
}

/**
 * Item name mapping for learned item names
 * Using permissive type - actual type is from types/itemNameMapping
 */
export interface ItemNameMapping {
    id?: string;
    sourceItemName?: string;
    targetItemName: string;
    targetCategory?: string;
    normalizedMerchant?: string;
}

/**
 * Item name match result from findItemNameMatch
 */
export interface ItemNameMatchResult {
    mapping: ItemNameMapping;
    confidence: number;
}

/**
 * Session context for insight display
 */
export interface SessionContextData {
    transactionsSaved: number;
    consecutiveDays: number;
    isFirstOfWeek: boolean;
    isPersonalRecord: boolean;
    totalAmount: number;
    currency: string;
    categoriesTouched: string[];
}

/**
 * Scan overlay state interface
 */
export interface ScanOverlayState {
    reset: () => void;
    retry: () => void;
}

/**
 * Props for useScanHandlers hook
 */
export interface UseScanHandlersProps {
    /** Authenticated user (null if not signed in) */
    user: User | null;
    /** Firebase services (db, appId) */
    services: { db: Firestore; appId: string } | null;
    /** User preferences for defaults */
    userPreferences: UserPreferences;
    /** All transactions for insight generation context */
    transactions: Transaction[];
    /** Current currency code */
    currency: string;
    /** Current language */
    lang: 'en' | 'es';

    // Current scan state
    /** Current transaction being edited */
    currentTransaction: Transaction | null;

    // Insight generation dependencies
    /** User insight profile for contextual insights */
    insightProfile: UserInsightProfile | null;
    /** Insight cache for silence and history */
    insightCache: LocalInsightCache | null;
    /** Record insight shown in history */
    recordInsightShown: (
        insightId: string,
        transactionId: string,
        content: { title: string; message: string; icon: string; category: string }
    ) => Promise<void>;
    /** Track transaction for profile stats */
    trackTransactionForInsight: (date: Date) => Promise<void>;
    /** Increment insight counter for sprinkle distribution */
    incrementInsightCounter: () => void;

    // Batch session for multi-receipt flow
    /** Current batch session state */
    batchSession: BatchSession | null;
    /** Add transaction to batch session */
    addToBatch: (tx: Transaction, insight: Insight | null) => void;

    // Trusted merchants
    /** Check if merchant is trusted for auto-save */
    checkTrusted: (merchantName: string) => Promise<boolean>;
    /** Record merchant scan for trust tracking */
    recordMerchantScan: (merchantName: string, wasEdited: boolean) => Promise<any>;

    // Item name mapping
    /** Find item name match for a merchant and item */
    findItemNameMatch: (normalizedMerchant: string, itemName: string, threshold?: number) => ItemNameMatchResult | null;

    // Category/Merchant mappings (Story 14c-refactor.22a)
    // Required for continueScanWithTransaction to apply mappings for total mismatch flow
    // Using permissive types to avoid complex type alignment issues
    /** Category mappings array */
    categoryMappings: unknown[];
    /** Find merchant match for alias lookup */
    findMerchantMatch: (merchantName: string) => {
        confidence: number;
        mapping: {
            id?: string;
            targetMerchant: string;
            normalizedMerchant: string;
            storeCategory?: string;
        };
    } | null;
    /** Apply category mappings to transaction */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    applyCategoryMappings: (transaction: Transaction, mappings: any) => { transaction: Transaction; appliedMappingIds: string[] };
    /** Increment category mapping usage */
    incrementMappingUsage: (db: Firestore, userId: string, appId: string, mappingId: string) => Promise<void>;
    /** Increment merchant mapping usage */
    incrementMerchantMappingUsage: (db: Firestore, userId: string, appId: string, mappingId: string) => Promise<void>;
    /** Increment item name mapping usage */
    incrementItemNameMappingUsage: (db: Firestore, userId: string, appId: string, mappingId: string) => Promise<void>;

    // Scan Zustand store actions
    /** Show dialog via scan store */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    showScanDialog: (type: any, data?: any) => void;
    /** Dismiss dialog via scan store */
    dismissScanDialog: () => void;
    /** Dispatch process success */
    dispatchProcessSuccess: (results: Transaction[]) => void;
    /** Reset scan store to idle state */
    resetScanContext: () => void;
    /** Set scan images */
    setScanImages: (images: string[]) => void;

    // Scan overlay state
    /** Scan overlay state machine */
    scanOverlay: ScanOverlayState;

    // UI callbacks
    /** Show toast notification */
    setToastMessage: (msg: ToastMessage | null) => void;
    /** Set current transaction for editing */
    setCurrentTransaction: (tx: Transaction | null) => void;
    /** Navigate to view */
    setView: (view: View) => void;
    /** Navigate to specific view (with history) */
    navigateToView: (view: View) => void;
    /** Set insight for display */
    setCurrentInsight: (insight: Insight | null) => void;
    /** Show/hide insight card */
    setShowInsightCard: (show: boolean) => void;
    /** Show/hide batch summary */
    setShowBatchSummary: (show: boolean) => void;
    /** Set session context for completion messaging */
    setSessionContext: (ctx: SessionContextData | null) => void;
    /** Set animate edit view items flag */
    setAnimateEditViewItems: (animate: boolean) => void;
    /** Set skip scan complete modal flag */
    setSkipScanCompleteModal: (skip: boolean) => void;
    /** Set transaction editor mode */
    setTransactionEditorMode: (mode: 'new' | 'existing') => void;
    /** Set quick saving state */
    setIsQuickSaving: (saving: boolean) => void;
    /** Check if quick saving */
    isQuickSaving: boolean;

    // Trust prompt (Story 14c-refactor.22a)
    /** Set trust prompt data */
    setTrustPromptData: (data: TrustPromptEligibility | null) => void;
    /** Show/hide trust prompt */
    setShowTrustPrompt: (show: boolean) => void;

    /** Translation function */
    t: (key: string) => string;

    // TD-18-4: Retry support
    /** Process scan callback for retry (re-triggers full scan pipeline) */
    processScan: (images?: string[]) => Promise<void>;
    /** Current remaining user credits (for retry credit check) */
    userCreditsRemaining: number;
}

/**
 * Result returned by useScanHandlers hook
 */
export interface UseScanHandlersResult {
    // Scan overlay handlers
    /** Handle cancel from scan overlay - return to dashboard */
    handleScanOverlayCancel: () => void;
    /** Handle retry from scan overlay - re-run processScan */
    handleScanOverlayRetry: () => void;
    /** Handle dismiss from scan overlay ready state */
    handleScanOverlayDismiss: () => void;

    // Quick save handlers
    /** Handle quick save completion callback */
    handleQuickSaveComplete: () => void;
    /** Handle quick save button click */
    handleQuickSave: (dialogData?: QuickSaveDialogData) => Promise<void>;
    /** Handle edit from quick save card */
    handleQuickSaveEdit: (dialogData?: QuickSaveDialogData) => void;
    /** Handle cancel from quick save card */
    handleQuickSaveCancel: (dialogData?: QuickSaveDialogData) => void;

    // Currency mismatch handlers
    /** Handle use detected currency */
    handleCurrencyUseDetected: (dialogData?: CurrencyMismatchDialogData) => Promise<void>;
    /** Handle use default currency */
    handleCurrencyUseDefault: (dialogData?: CurrencyMismatchDialogData) => Promise<void>;
    /** Handle cancel currency selection */
    handleCurrencyMismatchCancel: (dialogData?: CurrencyMismatchDialogData) => void;

    // Total mismatch handlers
    /** Handle use items sum as total */
    handleTotalUseItemsSum: (dialogData?: TotalMismatchDialogData) => void;
    /** Handle keep original total */
    handleTotalKeepOriginal: (dialogData?: TotalMismatchDialogData) => void;
    /** Handle cancel total selection */
    handleTotalMismatchCancel: (dialogData?: TotalMismatchDialogData) => void;

    // Utility functions
    /** Apply learned item name mappings to transaction */
    applyItemNameMappings: (
        transaction: Transaction,
        normalizedMerchant: string
    ) => { transaction: Transaction; appliedIds: string[] };

    /** Reconcile items total with receipt total */
    reconcileItemsTotal: (
        items: Array<{ name: string; totalPrice: number; category?: string; qty?: number; subcategory?: string }>,
        receiptTotal: number
    ) => { items: typeof items; hasDiscrepancy: boolean; discrepancyAmount: number };

    /** Continue scan flow with transaction after mismatch resolution */
    continueScanWithTransaction: (transaction: Transaction) => Promise<void>;
}
