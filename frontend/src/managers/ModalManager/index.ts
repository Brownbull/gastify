/**
 * Modal Manager - Centralized modal state management
 *
 * Story 14e-2: Zustand store for modal state
 * Story 14e-3: ModalManager component
 * Story 14e-4/5: Modal migrations
 *
 * @module ModalManager
 *
 * @example
 * ```tsx
 * // In App.tsx - render ModalManager once at app root
 * import { ModalManager } from '@managers/ModalManager';
 *
 * function App() {
 *   return (
 *     <div>
 *       <AppContent />
 *       <ModalManager />
 *     </div>
 *   );
 * }
 *
 * // In a component - open a modal
 * import { useModalActions } from '@managers/ModalManager';
 *
 * function MyComponent() {
 *   const { openModal, closeModal } = useModalActions();
 *
 *   const handleShowCredits = () => {
 *     openModal('creditInfo', {
 *       normalCredits: 5,
 *       superCredits: 2,
 *       onClose: closeModal,
 *     });
 *   };
 *
 *   return <button onClick={handleShowCredits}>Show Credits</button>;
 * }
 *
 * // In a service - open a modal from non-React code
 * import { openModalDirect, closeModalDirect } from '@managers/ModalManager';
 *
 * export function handleCriticalError() {
 *   openModalDirect('signOut', {
 *     onConfirm: () => signOut(),
 *     onCancel: closeModalDirect,
 *   });
 * }
 * ```
 */

// =============================================================================
// Component
// =============================================================================

export { ModalManager } from './ModalManager';
export type { ModalManagerProps } from './ModalManager';

// =============================================================================
// Registry (exported for testing)
// =============================================================================

export { MODAL_REGISTRY } from './registry';
export type { ModalComponent, LazyModalComponent } from './registry';

// =============================================================================
// Store and Hooks
// =============================================================================

export {
  // Main store hook
  useModalStore,
  // Selector hooks
  useActiveModal,
  useModalProps,
  useIsModalOpen,
  useModalActions,
  // Direct access (non-React)
  getModalState,
  openModalDirect,
  closeModalDirect,
} from './useModalStore';

// =============================================================================
// Types
// =============================================================================

export type {
  // Core types
  ModalType,
  ModalPropsMap,
  // Individual modal props (for component signatures)
  CurrencyMismatchProps,
  TotalMismatchProps,
  QuickSaveProps,
  ScanCompleteProps,
  BatchCompleteProps,
  BatchDiscardProps,
  CreditWarningProps,
  TransactionConflictProps,
  DeleteTransactionsProps,
  // Learning dialog props (Story 14e-5)
  LearnMerchantProps,
  CategoryLearningProps,
  SubcategoryLearningProps,
  ItemNameSuggestionProps,
  // Re-exported types for consumer convenience
  TransactionPreview,
  LearnMerchantSelection,
  ItemNameChange,
  ItemToLearn,
  SubcategoryItemToLearn,
  // General modal props
  CreditInfoProps,
  InsightDetailProps,
  UpgradePromptProps,
  SignOutProps,
  // Shared groups props (stubbed)
  JoinGroupProps,
  LeaveGroupProps,
  DeleteGroupProps,
  TransferOwnershipProps,
  RemoveMemberProps,
  OwnerLeaveWarningProps,
} from './types';
