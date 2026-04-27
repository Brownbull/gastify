/**
 * Story 14e-18c: Credit Feature Orchestrator & App.tsx Integration
 * Story 14e-39: Trust Prompt State Migration
 *
 * CreditFeature orchestrator component that:
 * - Uses useCreditState hook for credit data
 * - Manages local state: showCreditWarning, creditCheckResult
 * - Manages trust prompt state: showTrustPrompt, trustPromptData (Story 14e-39)
 * - Provides handlers via context for credit operations
 * - Renders CreditWarningDialog when needed
 * - Renders TrustMerchantPrompt when needed (Story 14e-39)
 * - Headless component (no visible UI except dialogs)
 * - Supports external triggering via `triggerCreditCheck` prop
 *
 * Pattern: Feature orchestrator pattern from Epic 14e-16 (BatchReviewFeature)
 * @see src/features/batch-review/BatchReviewFeature.tsx
 */

import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { User } from 'firebase/auth';
import { useCreditState, type UseCreditStateResult, type CreditFirebaseServices } from './state';
import {
  type CreditHandlerContext,
  createBatchConfirmWithCreditCheck,
  createCreditWarningConfirm,
  createCreditWarningCancel,
} from './handlers';
import type { CreditCheckResult } from '@/services/creditService';
import { checkCreditSufficiency } from '@/services/creditService';
import { CreditWarningDialog } from '@features/batch-review/components/CreditWarningDialog';
// Story 14e-39: Trust prompt imports
import { TrustMerchantPrompt } from '@features/credit/components/TrustMerchantPrompt';
import type { TrustPromptEligibility } from '@/types/trust';

// =============================================================================
// Context Types
// =============================================================================

/**
 * Credit feature context value interface.
 * Extends UseCreditStateResult with dialog state and handlers.
 * Story 14e-39: Extended with trust prompt state and actions.
 */
export interface CreditFeatureContextValue extends UseCreditStateResult {
  /** Whether credit warning dialog is visible */
  showCreditWarning: boolean;
  /** Credit check result for dialog display */
  creditCheckResult: CreditCheckResult | null;
  /** Handler to show credit warning before batch processing */
  handleBatchConfirmWithCreditCheck: () => void;
  /** Handler when user confirms in credit warning dialog */
  handleCreditWarningConfirm: () => void | Promise<void>;
  /** Handler when user cancels credit warning dialog */
  handleCreditWarningCancel: () => void;
  /** Handler to reduce batch size (for insufficient credits) */
  handleReduceBatch: () => void;

  // Story 14e-39: Trust prompt state and actions
  /** Whether trust merchant prompt is visible */
  showTrustPrompt: boolean;
  /** Trust prompt eligibility data */
  trustPromptData: TrustPromptEligibility | null;
  /** Action to show trust prompt with eligibility data */
  showTrustPromptAction: (data: TrustPromptEligibility) => void;
  /** Action to hide trust prompt and clear data */
  hideTrustPrompt: () => void;
  /** Whether credit check should be triggered (for external state sync) */
  shouldTriggerCreditCheck: boolean;
  /** Action to trigger credit check */
  triggerCreditCheckAction: () => void;
  /** Action to clear credit check trigger */
  clearCreditCheckTrigger: () => void;
}

// =============================================================================
// Context
// =============================================================================

const CreditFeatureContext = createContext<CreditFeatureContextValue | null>(null);

/**
 * Hook to consume CreditFeature context.
 * Must be used within CreditFeature provider.
 *
 * @returns CreditFeatureContextValue
 * @throws Error if used outside CreditFeature provider
 *
 * @example
 * ```tsx
 * const { credits, handleBatchConfirmWithCreditCheck } = useCreditFeature();
 * ```
 */
export function useCreditFeature(): CreditFeatureContextValue {
  const ctx = useContext(CreditFeatureContext);
  if (!ctx) {
    throw new Error('useCreditFeature must be used within CreditFeature provider');
  }
  return ctx;
}

// =============================================================================
// Component Props
// =============================================================================

export interface CreditFeatureProps {
  /** Firebase Auth user (null when not authenticated) */
  user: User | null;
  /** Firebase services containing db and appId */
  services: CreditFirebaseServices | null;
  /** Callback when user confirms batch operation */
  onBatchConfirmed?: () => void | Promise<void>;
  /** Callback when batch size should be reduced */
  onReduceBatch?: (maxProcessable: number) => void;
  /**
   * @deprecated Story 14e-39 (code review fix): Use onCreditActionsReady callback instead.
   * Trigger to initiate credit check externally.
   * When this changes from false to true, the credit check flow starts.
   * Use with onCreditCheckComplete to reset the trigger after dialog closes.
   *
   * Note: This prop is deprecated in favor of onCreditActionsReady callback pattern
   * which avoids prop drilling and dual state issues.
   */
  triggerCreditCheck?: boolean;
  /**
   * Callback when credit check dialog closes (confirm or cancel).
   * Called with true if confirmed, false if cancelled.
   * Use this to reset triggerCreditCheck to false.
   */
  onCreditCheckComplete?: (confirmed: boolean) => void;
  /** Number of receipts in batch (for dialog display) */
  batchImageCount?: number;
  /** Current theme for dialog styling */
  theme?: 'light' | 'dark';
  /** Translation function for dialog text */
  t?: (key: string) => string;
  /** Children to render within provider */
  children?: React.ReactNode;

  // Story 14e-39: Trust prompt callbacks
  /**
   * Callback when user accepts trust for a merchant.
   * Should call merchantTrustService.acceptTrust() and show success toast.
   */
  onAcceptTrust?: (merchantName: string) => Promise<void>;
  /**
   * Callback when user declines trust for a merchant.
   * Should call merchantTrustService.declinePrompt().
   */
  onDeclineTrust?: (merchantName: string) => Promise<void>;
  /**
   * Callback when trust prompt actions are ready.
   * Allows parent components to access trust prompt actions for use in handlers
   * that are configured before the CreditFeature context is available.
   */
  onTrustActionsReady?: (actions: TrustPromptActions) => void;
  /**
   * Story 14e-39 (code review fix): Callback when credit actions are ready.
   * Allows parent components to trigger credit check without prop drilling.
   * Removes need for shouldTriggerCreditCheck useState in App.tsx.
   */
  onCreditActionsReady?: (actions: CreditTriggerActions) => void;
}

/**
 * Trust prompt actions interface.
 * Used by onTrustActionsReady callback to expose actions to parent.
 */
export interface TrustPromptActions {
  /** Show trust prompt with eligibility data */
  showTrustPromptAction: (data: TrustPromptEligibility) => void;
  /** Hide trust prompt */
  hideTrustPrompt: () => void;
}

/**
 * Story 14e-39 (code review fix): Credit trigger actions interface.
 * Used by onCreditActionsReady callback to expose credit check trigger to parent.
 * This eliminates the need for shouldTriggerCreditCheck prop drilling.
 */
export interface CreditTriggerActions {
  /** Trigger credit check flow (shows credit warning dialog) */
  triggerCreditCheck: () => void;
}

// =============================================================================
// Component Implementation
// =============================================================================

/**
 * CreditFeature orchestrator component.
 *
 * Provides credit state and handlers via context.
 * Renders CreditWarningDialog when showCreditWarning is true.
 *
 * @example
 * ```tsx
 * <CreditFeature
 *   user={user}
 *   services={services}
 *   onBatchConfirmed={startBatchProcessing}
 *   batchImageCount={batchImages.length}
 *   theme={theme}
 *   t={t}
 * >
 *   <BatchCaptureView />
 * </CreditFeature>
 * ```
 */
export function CreditFeature({
  user,
  services,
  onBatchConfirmed,
  onReduceBatch,
  triggerCreditCheck = false,
  onCreditCheckComplete,
  batchImageCount = 0,
  theme = 'light',
  t = (key: string) => key,
  children,
  // Story 14e-39: Trust prompt callbacks
  onAcceptTrust,
  onDeclineTrust,
  onTrustActionsReady,
  // Story 14e-39 (code review fix): Credit actions callback
  onCreditActionsReady,
}: CreditFeatureProps): React.ReactElement {
  // Credit state from useCreditState hook
  const creditState = useCreditState(user, services);

  // Local dialog state
  const [showCreditWarning, setShowCreditWarning] = useState(false);
  const [creditCheckResult, setCreditCheckResult] = useState<CreditCheckResult | null>(null);

  // Story 14e-39: Trust prompt state
  const [showTrustPrompt, setShowTrustPrompt] = useState(false);
  const [trustPromptData, setTrustPromptData] = useState<TrustPromptEligibility | null>(null);

  // Story 14e-39: Credit check trigger state (for external consumers)
  const [shouldTriggerCreditCheck, setShouldTriggerCreditCheck] = useState(false);

  // Track previous trigger value to detect edge (false -> true)
  // Initialize to false so initial true prop triggers the check
  const prevTriggerRef = useRef(false);

  // Create handler context with wrapped onBatchConfirmed that also notifies completion
  // Story 14e-39 (code review fix #2): Also clears shouldTriggerCreditCheck flag
  const wrappedOnBatchConfirmed = useCallback(async () => {
    await onBatchConfirmed?.();
    onCreditCheckComplete?.(true);
    setShouldTriggerCreditCheck(false);
  }, [onBatchConfirmed, onCreditCheckComplete]);

  const handlerContext: CreditHandlerContext = useMemo(
    () => ({
      credits: creditState.credits,
      setShowCreditWarning,
      setCreditCheckResult,
      onBatchConfirmed: wrappedOnBatchConfirmed,
    }),
    [creditState.credits, wrappedOnBatchConfirmed]
  );

  // Create handlers from factories
  const handleBatchConfirmWithCreditCheck = useMemo(
    () => createBatchConfirmWithCreditCheck(handlerContext),
    [handlerContext]
  );

  const handleCreditWarningConfirm = useMemo(
    () => createCreditWarningConfirm(handlerContext),
    [handlerContext]
  );

  // Wrap cancel handler to also notify completion
  // Story 14e-39 (code review fix #2): Also clears shouldTriggerCreditCheck flag
  const handleCreditWarningCancel = useCallback(() => {
    const cancelHandler = createCreditWarningCancel(handlerContext);
    cancelHandler();
    onCreditCheckComplete?.(false);
    setShouldTriggerCreditCheck(false);
  }, [handlerContext, onCreditCheckComplete]);

  // Handle external trigger - detect edge from false to true
  useEffect(() => {
    if (triggerCreditCheck && !prevTriggerRef.current) {
      // Edge detected: false -> true, trigger the credit check
      handleBatchConfirmWithCreditCheck();
    }
    prevTriggerRef.current = triggerCreditCheck;
  }, [triggerCreditCheck, handleBatchConfirmWithCreditCheck]);

  // Reduce batch handler - rechecks credits after reducing images
  const handleReduceBatch = useCallback(() => {
    if (!creditCheckResult) return;
    const maxProcessable = creditCheckResult.maxProcessable;

    // Notify parent to reduce batch
    onReduceBatch?.(maxProcessable);

    // Close and reopen dialog with new credit check
    setShowCreditWarning(false);
    const newResult = checkCreditSufficiency(creditState.credits, 1, true);
    setCreditCheckResult(newResult);
    setShowCreditWarning(true);
  }, [creditCheckResult, creditState.credits, onReduceBatch]);

  // ==========================================================================
  // Story 14e-39: Trust Prompt Actions
  // ==========================================================================

  /**
   * Show trust prompt with eligibility data.
   * Called by processScan handlers when merchant meets trust criteria.
   */
  const showTrustPromptAction = useCallback((data: TrustPromptEligibility) => {
    setTrustPromptData(data);
    setShowTrustPrompt(true);
  }, []);

  /**
   * Hide trust prompt and clear data.
   * Called after user accepts or declines trust.
   */
  const hideTrustPrompt = useCallback(() => {
    setShowTrustPrompt(false);
    setTrustPromptData(null);
  }, []);

  // Story 14e-39: Notify parent when trust actions are ready
  // This allows App.tsx to get access to actions for use in useScanHandlers
  useEffect(() => {
    onTrustActionsReady?.({
      showTrustPromptAction,
      hideTrustPrompt,
    });
  }, [onTrustActionsReady, showTrustPromptAction, hideTrustPrompt]);

  // Story 14e-39 (code review fix): Notify parent when credit actions are ready
  // This allows useBatchReviewHandlers to trigger credit check without App.tsx state
  useEffect(() => {
    onCreditActionsReady?.({
      triggerCreditCheck: handleBatchConfirmWithCreditCheck,
    });
  }, [onCreditActionsReady, handleBatchConfirmWithCreditCheck]);

  /**
   * Handle user accepting trust for the merchant.
   * Calls onAcceptTrust callback and hides prompt.
   */
  const handleAcceptTrust = useCallback(async () => {
    if (!trustPromptData?.merchant) return;
    const merchantName = trustPromptData.merchant.merchantName;
    try {
      await onAcceptTrust?.(merchantName);
    } catch (err) {
      console.warn('Failed to accept trust:', err);
    } finally {
      hideTrustPrompt();
    }
  }, [trustPromptData, onAcceptTrust, hideTrustPrompt]);

  /**
   * Handle user declining trust for the merchant.
   * Calls onDeclineTrust callback and hides prompt.
   */
  const handleDeclineTrust = useCallback(async () => {
    if (!trustPromptData?.merchant) return;
    const merchantName = trustPromptData.merchant.merchantName;
    try {
      await onDeclineTrust?.(merchantName);
    } catch (err) {
      console.warn('Failed to decline trust:', err);
    } finally {
      hideTrustPrompt();
    }
  }, [trustPromptData, onDeclineTrust, hideTrustPrompt]);

  // ==========================================================================
  // Story 14e-39: Credit Check Trigger Actions
  // ==========================================================================

  /**
   * Trigger credit check.
   * Can be called by consumers to initiate credit check flow.
   * Story 14e-39 (code review fix #2): Now actually triggers the credit check
   * in addition to setting the state flag.
   */
  const triggerCreditCheckAction = useCallback(() => {
    setShouldTriggerCreditCheck(true);
    handleBatchConfirmWithCreditCheck();
  }, [handleBatchConfirmWithCreditCheck]);

  /**
   * Clear credit check trigger.
   * Should be called after credit check dialog closes.
   */
  const clearCreditCheckTrigger = useCallback(() => {
    setShouldTriggerCreditCheck(false);
  }, []);

  // Context value with stable reference
  const value: CreditFeatureContextValue = useMemo(
    () => ({
      ...creditState,
      showCreditWarning,
      creditCheckResult,
      handleBatchConfirmWithCreditCheck,
      handleCreditWarningConfirm,
      handleCreditWarningCancel,
      handleReduceBatch,
      // Story 14e-39: Trust prompt state and actions
      showTrustPrompt,
      trustPromptData,
      showTrustPromptAction,
      hideTrustPrompt,
      shouldTriggerCreditCheck,
      triggerCreditCheckAction,
      clearCreditCheckTrigger,
    }),
    [
      creditState,
      showCreditWarning,
      creditCheckResult,
      handleBatchConfirmWithCreditCheck,
      handleCreditWarningConfirm,
      handleCreditWarningCancel,
      handleReduceBatch,
      // Story 14e-39: Trust prompt dependencies
      showTrustPrompt,
      trustPromptData,
      showTrustPromptAction,
      hideTrustPrompt,
      shouldTriggerCreditCheck,
      triggerCreditCheckAction,
      clearCreditCheckTrigger,
    ]
  );

  return (
    <CreditFeatureContext.Provider value={value}>
      {children}
      {/* CreditWarningDialog - rendered when showCreditWarning is true */}
      {showCreditWarning && creditCheckResult && (
        <CreditWarningDialog
          creditCheck={creditCheckResult}
          receiptCount={batchImageCount}
          theme={theme}
          t={t}
          onConfirm={handleCreditWarningConfirm}
          onCancel={handleCreditWarningCancel}
          onReduceBatch={creditCheckResult.maxProcessable > 0 ? handleReduceBatch : undefined}
        />
      )}

      {/* Story 14e-39: TrustMerchantPrompt - rendered when showTrustPrompt is true */}
      {showTrustPrompt && trustPromptData?.merchant && (
        <TrustMerchantPrompt
          merchantName={trustPromptData.merchant.merchantName}
          scanCount={trustPromptData.merchant.scanCount}
          onAccept={handleAcceptTrust}
          onDecline={handleDeclineTrust}
          theme={theme}
          t={t}
        />
      )}
    </CreditFeatureContext.Provider>
  );
}

export default CreditFeature;
