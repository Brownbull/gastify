/**
 * Modal Manager Zustand Store
 *
 * Story 14e-2: Centralized state management for all application modals.
 * Enables opening modals from anywhere without prop drilling.
 *
 * @module ModalManager/useModalStore
 *
 * @example
 * ```tsx
 * // In a component
 * const { openModal, closeModal } = useModalActions();
 * openModal('creditInfo', { normalCredits: 5, superCredits: 2, onClose: closeModal });
 *
 * // In non-React code (services, utilities)
 * import { openModalDirect, closeModalDirect } from '@managers/ModalManager';
 * openModalDirect('signOut', { onConfirm: handleSignOut, onCancel: () => closeModalDirect() });
 * ```
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { ModalType, ModalPropsMap } from './types';

// =============================================================================
// Store State & Actions Types
// =============================================================================

/** Modal store state */
interface ModalState {
  /** Currently active modal, or null if none open */
  activeModal: ModalType | null;
  /** Props for the active modal (type depends on activeModal) */
  modalProps: Partial<ModalPropsMap[ModalType]>;
}

/** Modal store actions */
interface ModalActions {
  /**
   * Open a modal with type-safe props.
   * If a modal is already open, it will be replaced.
   *
   * @param type - The modal type to open
   * @param props - Props required by that modal type
   */
  openModal: <T extends ModalType>(type: T, props: ModalPropsMap[T]) => void;

  /**
   * Close the currently active modal.
   * Safe to call even if no modal is open.
   */
  closeModal: () => void;
}

/** Combined store type */
type ModalStore = ModalState & ModalActions;

// =============================================================================
// Initial State
// =============================================================================

const initialState: ModalState = {
  activeModal: null,
  modalProps: {},
};

// =============================================================================
// Store Definition
// =============================================================================

/**
 * Zustand store for modal state management.
 *
 * Uses devtools middleware for Redux DevTools debugging.
 * Action names follow the pattern `modal/open/${type}` and `modal/close`.
 */
export const useModalStore = create<ModalStore>()(
  devtools(
    (set) => ({
      ...initialState,

      openModal: <T extends ModalType>(type: T, props: ModalPropsMap[T]) => {
        set(
          { activeModal: type, modalProps: props as Partial<ModalPropsMap[ModalType]> },
          false,
          `modal/open/${type}`
        );
      },

      closeModal: () => {
        set(initialState, false, 'modal/close');
      },
    }),
    { name: 'modal-store' }
  )
);

// =============================================================================
// Selector Hooks
// =============================================================================

/**
 * Get the currently active modal type.
 *
 * @returns The active modal type, or null if no modal is open
 */
export const useActiveModal = (): ModalType | null =>
  useModalStore((state) => state.activeModal);

/**
 * Get props for the active modal with proper typing.
 *
 * @returns Modal props cast to the expected type
 *
 * @example
 * ```tsx
 * const props = useModalProps<'creditInfo'>();
 * // props is typed as CreditInfoProps
 * ```
 */
export const useModalProps = <T extends ModalType>(): ModalPropsMap[T] =>
  useModalStore((state) => state.modalProps as ModalPropsMap[T]);

/**
 * Check if a specific modal is currently open.
 *
 * @param type - The modal type to check
 * @returns true if that modal is currently open
 *
 * @example
 * ```tsx
 * const isSignOutOpen = useIsModalOpen('signOut');
 * ```
 */
export const useIsModalOpen = (type: ModalType): boolean =>
  useModalStore((state) => state.activeModal === type);

/**
 * Get modal actions (openModal, closeModal).
 * Returns stable references suitable for useCallback dependencies.
 *
 * @returns Object with openModal and closeModal functions
 *
 * @example
 * ```tsx
 * const { openModal, closeModal } = useModalActions();
 *
 * const handleOpenCreditInfo = useCallback(() => {
 *   openModal('creditInfo', {
 *     normalCredits: 5,
 *     superCredits: 2,
 *     onClose: closeModal,
 *   });
 * }, [openModal, closeModal]);
 * ```
 */
export const useModalActions = () => {
  const openModal = useModalStore((state) => state.openModal);
  const closeModal = useModalStore((state) => state.closeModal);
  return { openModal, closeModal };
};

// =============================================================================
// Direct Access (for non-React code)
// =============================================================================

/**
 * Get current modal state outside React.
 * Useful in services, utilities, or event handlers.
 *
 * @returns Current modal store state and actions
 */
export const getModalState = (): ModalStore => useModalStore.getState();

/**
 * Open a modal from outside React components.
 * Use when you need to trigger a modal from a service or utility function.
 *
 * @example
 * ```typescript
 * // In a service file
 * import { openModalDirect, closeModalDirect } from '@managers/ModalManager';
 *
 * export function handleAuthError() {
 *   openModalDirect('signOut', {
 *     onConfirm: () => { ... },
 *     onCancel: closeModalDirect,
 *   });
 * }
 * ```
 */
export const openModalDirect = <T extends ModalType>(
  type: T,
  props: ModalPropsMap[T]
): void => {
  useModalStore.getState().openModal(type, props);
};

/**
 * Close the active modal from outside React components.
 */
export const closeModalDirect = (): void => {
  useModalStore.getState().closeModal();
};
