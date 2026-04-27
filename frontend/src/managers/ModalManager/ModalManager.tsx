/**
 * Modal Manager Component
 *
 * Story 14e-3: Centralized modal rendering component that reads from Zustand store
 * and renders the appropriate modal from the registry.
 *
 * @module ModalManager/ModalManager
 *
 * @example
 * ```tsx
 * // In App.tsx (rendered once at app root)
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
 * // Anywhere in the app - open a modal
 * const { openModal } = useModalActions();
 * openModal('signOut', { onConfirm: handleSignOut, onCancel: () => {} });
 * ```
 */

import React, { Suspense, useCallback } from 'react';
import { useModalStore, useActiveModal, useModalProps } from './useModalStore';
import { MODAL_REGISTRY } from './registry';

// =============================================================================
// Loading Fallback
// =============================================================================

/**
 * Fallback shown while modal component loads (lazy loading).
 * Displays a centered spinner with backdrop.
 */
const ModalLoadingFallback: React.FC = () => (
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center"
    role="status"
    aria-label="Loading modal"
    data-testid="modal-loading-fallback"
  >
    <div className="absolute inset-0 bg-black/50" />
    <div className="relative p-4">
      <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  </div>
);

// =============================================================================
// Modal Manager Component
// =============================================================================

export interface ModalManagerProps {
  /**
   * Optional custom loading fallback component.
   * Defaults to spinning loader with backdrop.
   */
  loadingFallback?: React.ReactNode;
}

/**
 * ModalManager - Centralized modal rendering
 *
 * Reads active modal from Zustand store and renders the appropriate
 * component from the registry with props from store.
 *
 * Features:
 * - Lazy loading via React.Suspense for code splitting
 * - Type-safe props passing
 * - Composable onClose (calls both store.closeModal and props.onClose)
 * - Automatic isOpen=true prop for components that need it
 *
 * @param props - Component props
 * @returns Modal component or null if no modal is active
 */
export const ModalManager: React.FC<ModalManagerProps> = ({
  loadingFallback = <ModalLoadingFallback />,
}) => {
  const activeModal = useActiveModal();
  const modalProps = useModalProps();
  const closeModal = useModalStore((s) => s.closeModal);

  /**
   * Compose onClose to call both:
   * 1. Store's closeModal() to reset state
   * 2. Props' onClose() if provided (for callback handling)
   *
   * Important: We capture propsOnClose before calling closeModal
   * because closeModal resets modalProps to empty.
   */
  const handleClose = useCallback(() => {
    // Capture onClose from props before closeModal clears them
    const propsOnClose = (modalProps as { onClose?: () => void })?.onClose;

    // Close modal in store (resets activeModal and modalProps)
    closeModal();

    // Call props onClose if provided (for component-specific cleanup)
    propsOnClose?.();
  }, [closeModal, modalProps]);

  // Early return if no modal is active
  if (!activeModal) {
    return null;
  }

  // Get modal component from registry
  const ModalComponent = MODAL_REGISTRY[activeModal];

  if (!ModalComponent) {
    console.error(`[ModalManager] Unknown modal type: ${activeModal}`);
    return null;
  }

  // Prepare props to pass to modal
  // Spread modalProps and override onClose with composed handler
  // Use Record<string, unknown> to avoid complex union type issues
  const componentProps: Record<string, unknown> = {
    ...modalProps,
    onClose: handleClose,
    // Pass isOpen=true for components that check it
    isOpen: true,
  };

  return (
    <Suspense fallback={loadingFallback}>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ModalComponent {...(componentProps as any)} />
    </Suspense>
  );
};

export default ModalManager;
