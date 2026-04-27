/**
 * Modal Registry
 *
 * Story 14e-3: Maps ModalType to lazy-loaded modal components.
 * Story 14e-4: CreditInfo and SignOut modals integrated.
 * Story 14e-5: Complex modals integrated (TransactionConflict, DeleteTransactions,
 *              Learning dialogs, ItemNameSuggestion).
 *
 * Uses React.lazy() to avoid circular dependencies and enable code splitting.
 *
 * MIGRATION PATTERN:
 * Components with `isOpen` props are wrapped to always pass `isOpen={true}`,
 * since ModalManager handles the open/close state. The wrapper also maps
 * `onClose` to the component's appropriate close handler.
 *
 * @module ModalManager/registry
 */

import React from 'react';
import type { ModalType } from './types';

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Simplified modal component type for the registry.
 * Uses relaxed typing to allow for stub components.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ModalComponent = React.ComponentType<any>;

/**
 * Lazy-loaded modal component.
 */
export type LazyModalComponent = React.LazyExoticComponent<ModalComponent>;

// =============================================================================
// Stub Component for Unimplemented Modals
// =============================================================================

/**
 * Placeholder component for modals not yet migrated to ModalManager.
 * Shows a message and close button.
 */
const ModalStub: React.FC<{ modalType: string; onClose: () => void }> = ({
  modalType,
  onClose,
}) => (
  <div
    role="dialog"
    aria-modal="true"
    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
  >
    <div
      className="absolute inset-0 bg-black/50"
      onClick={onClose}
      data-testid="modal-stub-backdrop"
    />
    <div className="relative bg-white dark:bg-gray-800 rounded-xl p-6 max-w-sm w-full shadow-xl">
      <h2 className="text-lg font-semibold mb-2">Coming Soon</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Modal &quot;{modalType}&quot; is not yet integrated with ModalManager.
      </p>
      <button
        onClick={onClose}
        className="w-full py-2 px-4 bg-gray-100 dark:bg-gray-700 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        data-testid="modal-stub-close"
      >
        Close
      </button>
    </div>
  </div>
);

/**
 * Factory to create a lazy-loaded stub component for a modal type.
 */
const createLazyStub = (modalType: string): LazyModalComponent =>
  React.lazy(() =>
    Promise.resolve({
      default: (props: { onClose: () => void }) => (
        <ModalStub modalType={modalType} onClose={props.onClose} />
      ),
    })
  );

// =============================================================================
// Modal Registry
// =============================================================================

/**
 * Registry mapping ModalType to lazy-loaded components.
 *
 * All modals are currently stubbed. Integration happens in Stories 14e-4/5.
 *
 * STATUS KEY:
 * - STUBBED: Placeholder until migration
 * - READY: Component exists, needs prop adapter (migrated in 14e-4/5)
 *
 * @example
 * ```typescript
 * const SignOutModal = MODAL_REGISTRY['signOut'];
 * // SignOutModal is a lazy-loaded component
 * ```
 */
export const MODAL_REGISTRY: Record<ModalType, LazyModalComponent> = {
  // ---------------------------------------------------------------------------
  // Scan-related modals (STUBBED - integrated in Part 2: Scan Feature)
  // These modals currently use ScanContext internally.
  // ---------------------------------------------------------------------------
  currencyMismatch: createLazyStub('currencyMismatch'),
  totalMismatch: createLazyStub('totalMismatch'),
  quickSave: createLazyStub('quickSave'),
  scanComplete: createLazyStub('scanComplete'),
  batchComplete: createLazyStub('batchComplete'),
  batchDiscard: React.lazy(() => import('@features/batch-review/components/BatchDiscardDialog')),
  creditWarning: createLazyStub('creditWarning'),

  // ---------------------------------------------------------------------------
  // Transaction management modals (Story 14e-5: Migrated)
  // Components wrapped with isOpen={true} for ModalManager integration
  // ---------------------------------------------------------------------------
  transactionConflict: React.lazy(() =>
    import('@/components/dialogs/TransactionConflictDialog').then((module) => ({
      default: (props: React.ComponentProps<typeof module.TransactionConflictDialog>) => (
        <module.TransactionConflictDialog {...props} isOpen={true} />
      ),
    }))
  ),
  deleteTransactions: React.lazy(() =>
    import('@features/history/components/DeleteTransactionsModal').then((module) => ({
      default: (props: React.ComponentProps<typeof module.DeleteTransactionsModal>) => (
        <module.DeleteTransactionsModal {...props} isOpen={true} />
      ),
    }))
  ),

  // ---------------------------------------------------------------------------
  // Learning dialogs (Story 14e-5: Migrated)
  // ---------------------------------------------------------------------------
  learnMerchant: React.lazy(() =>
    import('@/components/dialogs/LearnMerchantDialog').then((module) => ({
      default: (props: React.ComponentProps<typeof module.LearnMerchantDialog>) => (
        <module.LearnMerchantDialog {...props} isOpen={true} />
      ),
    }))
  ),
  categoryLearning: React.lazy(() =>
    import('@/components/CategoryLearningPrompt').then((module) => ({
      default: (props: React.ComponentProps<typeof module.CategoryLearningPrompt>) => (
        <module.CategoryLearningPrompt {...props} isOpen={true} />
      ),
    }))
  ),
  subcategoryLearning: React.lazy(() =>
    import('@/components/SubcategoryLearningPrompt').then((module) => ({
      default: (props: React.ComponentProps<typeof module.SubcategoryLearningPrompt>) => (
        <module.SubcategoryLearningPrompt {...props} isOpen={true} />
      ),
    }))
  ),
  itemNameSuggestion: React.lazy(() =>
    import('@/components/dialogs/ItemNameSuggestionDialog').then((module) => ({
      default: (props: React.ComponentProps<typeof module.ItemNameSuggestionDialog>) => (
        <module.ItemNameSuggestionDialog {...props} isOpen={true} />
      ),
    }))
  ),

  // ---------------------------------------------------------------------------
  // General modals (Story 14e-4: CreditInfo and SignOut migrated)
  // ---------------------------------------------------------------------------
  creditInfo: React.lazy(() => import('@/components/modals/CreditInfoModal')),
  insightDetail: createLazyStub('insightDetail'), // READY
  upgradePrompt: createLazyStub('upgradePrompt'), // READY
  signOut: React.lazy(() => import('@features/settings/components/SignOutDialog')),

  // ---------------------------------------------------------------------------
  // Group modals (READY)
  // ---------------------------------------------------------------------------
  joinGroup: createLazyStub('joinGroup'), // READY
  leaveGroup: createLazyStub('leaveGroup'), // READY
  deleteGroup: createLazyStub('deleteGroup'), // READY
  transferOwnership: createLazyStub('transferOwnership'), // READY
  removeMember: createLazyStub('removeMember'), // READY
  ownerLeaveWarning: createLazyStub('ownerLeaveWarning'), // READY
};
