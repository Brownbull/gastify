/**
 * Z-Index Constants
 *
 * Tech Debt TD-7d-3: Centralized z-index values for maintainability.
 * All dialog overlays should use these constants.
 *
 * Hierarchy (lowest to highest):
 * - BASE: Default content layer
 * - DROPDOWN: Menus, tooltips
 * - MODAL: Primary modal dialogs
 * - MODAL_NESTED: Confirmation dialogs within modals
 * - TOAST: Toast notifications (always on top)
 *
 * @example
 * ```tsx
 * import { Z_INDEX } from '@/constants';
 *
 * <div style={{ zIndex: Z_INDEX.MODAL }}>Modal content</div>
 * ```
 */

export const Z_INDEX = {
  /** Default content layer */
  BASE: 0,
  /** Dropdowns, tooltips, popovers */
  DROPDOWN: 50,
  /** Primary modal dialogs */
  MODAL: 9999,
  /** Nested modals (confirmation dialogs within modals) */
  MODAL_NESTED: 10000,
  /** Toast notifications (always visible) */
  TOAST: 10001,
} as const;

/** Type for z-index values */
export type ZIndexLevel = (typeof Z_INDEX)[keyof typeof Z_INDEX];
