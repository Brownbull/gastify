/**
 * FeatureOrchestrator - Centralized feature composition component
 *
 * Story 14e-21: Create FeatureOrchestrator
 * Story 14e-23a: ScanFeature now renders all scan overlays
 *
 * Composes all feature modules into a single render tree. This component
 * is the central composition layer that delegates all logic to features.
 *
 * Architecture Notes:
 * - Each feature is self-contained with its own Zustand store
 * - Features handle their own visibility (render null when inactive)
 * - ModalManager renders all modals from any feature
 * - This component does NOT manage feature state - only composition
 * - Story 14e-23a: ScanFeature handles all scan-related overlays
 *
 * Render Order Rationale:
 * 1. CategoriesFeature - Headless, provides category context (optional)
 * 2. CreditFeature - Renders credit warning dialog only (optional)
 * 3. ScanFeature - Overlay UI during scan flow + scan dialogs (14e-23a)
 * 4. BatchReviewFeature - Overlay UI during batch review (optional)
 * 5. ModalManager - All modal rendering (must be last for z-index)
 *
 * @see docs/sprint-artifacts/epic14e-feature-architecture/stories/14e-21-create-feature-orchestrator.md
 * @see docs/sprint-artifacts/epic14e-feature-architecture/stories/14e-23a-scan-overlay-migration.md
 * @see docs/sprint-artifacts/epic14e-feature-architecture/architecture-decision.md
 */

import React from 'react';

// Feature imports
import { ScanFeature, type ScanFeatureProps } from '@features/scan';
import { BatchReviewFeature, type BatchReviewFeatureProps } from '@features/batch-review';
import { CategoriesFeature, type CategoriesFeatureProps } from '@features/categories';
import { CreditFeature, type CreditFeatureProps } from '@features/credit';
import { ModalManager } from '@managers/ModalManager';

// =============================================================================
// Types
// =============================================================================

/**
 * Props for FeatureOrchestrator component.
 *
 * Features are optional - render only features that are relevant to the
 * current application context. Features handle their own visibility internally.
 */
export interface FeatureOrchestratorProps {
  /**
   * Props for ScanFeature.
   * Required - ScanFeature provides scan flow UI.
   */
  scanFeatureProps: ScanFeatureProps;

  /**
   * Props for BatchReviewFeature.
   * Optional - Only needed when batch review is active.
   * Feature returns null when phase is 'idle'.
   */
  batchReviewFeatureProps?: BatchReviewFeatureProps;

  /**
   * Props for CreditFeature.
   * Optional - Renders credit warning dialog when triggered.
   */
  creditFeatureProps?: CreditFeatureProps;

  /**
   * Props for CategoriesFeature.
   * Optional - Provides category context to the component tree.
   * Note: Views that need category context should still be wrapped by
   * CategoriesFeature in App.tsx until provider architecture is finalized
   * in Story 14e-22 (AppProviders refactor).
   */
  categoriesFeatureProps?: Omit<CategoriesFeatureProps, 'children'>;

  /**
   * Whether to render ModalManager.
   * @default true
   */
  renderModalManager?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * FeatureOrchestrator composes all feature modules into a single render tree.
 *
 * Each feature handles its own visibility via internal Zustand store state:
 * - ScanFeature returns null when phase is 'idle' (unless showIdleState=true)
 * - BatchReviewFeature returns null when phase is 'idle'
 * - CreditFeature renders dialog only when showCreditWarning is true
 * - CategoriesFeature is always rendered (headless)
 * - ModalManager handles modal rendering via useModalStore
 *
 * @example
 * ```tsx
 * <FeatureOrchestrator
 *   scanFeatureProps={{
 *     t,
 *     theme,
 *     onCancelProcessing: handleCancel,
 *   }}
 *   batchReviewFeatureProps={{
 *     t,
 *     theme,
 *     currency,
 *     formatCurrency,
 *     // ... other props
 *   }}
 *   creditFeatureProps={{
 *     user,
 *     services,
 *     onBatchConfirmed: handleBatchStart,
 *   }}
 *   categoriesFeatureProps={{
 *     user,
 *     services,
 *   }}
 * />
 * ```
 */
export function FeatureOrchestrator({
  scanFeatureProps,
  batchReviewFeatureProps,
  creditFeatureProps,
  categoriesFeatureProps,
  renderModalManager = true,
}: FeatureOrchestratorProps): React.ReactElement {
  return (
    <>
      {/*
        Headless features (provide context, no visible UI)
        CategoriesFeature sets up category subscriptions and provides context.
        Note: Views still need to be wrapped by CategoriesFeature in App.tsx
        to access useCategoriesContext(). This will be refactored in Story 14e-22.
      */}
      {categoriesFeatureProps && (
        <CategoriesFeature
          user={categoriesFeatureProps.user}
          services={categoriesFeatureProps.services}
        />
      )}

      {/*
        Features with conditional UI (render dialog only when triggered)
        CreditFeature renders CreditWarningDialog when credit check is needed.
      */}
      {creditFeatureProps && (
        <CreditFeature
          user={creditFeatureProps.user}
          services={creditFeatureProps.services}
          triggerCreditCheck={creditFeatureProps.triggerCreditCheck}
          onCreditCheckComplete={creditFeatureProps.onCreditCheckComplete}
          onBatchConfirmed={creditFeatureProps.onBatchConfirmed}
          onReduceBatch={creditFeatureProps.onReduceBatch}
          batchImageCount={creditFeatureProps.batchImageCount}
          theme={creditFeatureProps.theme}
          t={creditFeatureProps.t}
        />
      )}

      {/*
        Overlay features (render based on phase)
        ScanFeature renders scan UI based on phase from Zustand store.
        Returns null when phase is 'idle'.
        Story 14e-23a: ScanFeature now renders all scan-related overlays:
        - ScanOverlay (processing/error states)
        - QuickSaveCard, CurrencyMismatchDialog, TotalMismatchDialog
        - BatchCompleteModal
      */}
      <ScanFeature {...scanFeatureProps} />

      {/*
        BatchReviewFeature renders batch review UI based on phase.
        Returns null when phase is 'idle'.
        Only rendered if props are provided (batch review not always active).
        Story 14e-29c: Updated to use handlersConfig - feature owns handlers internally.
      */}
      {batchReviewFeatureProps && (
        <BatchReviewFeature
          t={batchReviewFeatureProps.t}
          theme={batchReviewFeatureProps.theme}
          currency={batchReviewFeatureProps.currency}
          formatCurrency={batchReviewFeatureProps.formatCurrency}
          credits={batchReviewFeatureProps.credits}
          onCreditInfoClick={batchReviewFeatureProps.onCreditInfoClick}
          processingStates={batchReviewFeatureProps.processingStates}
          processingProgress={batchReviewFeatureProps.processingProgress}
          onCancelProcessing={batchReviewFeatureProps.onCancelProcessing}
          handlersConfig={batchReviewFeatureProps.handlersConfig}
          batchSession={batchReviewFeatureProps.batchSession}
          onRetryReceipt={batchReviewFeatureProps.onRetryReceipt}
        />
      )}

      {/*
        Modal rendering (must be last for z-index)
        ModalManager handles all modal rendering via useModalStore.
        Always renders - handles its own null state internally.
      */}
      {renderModalManager && <ModalManager />}
    </>
  );
}

export default FeatureOrchestrator;
