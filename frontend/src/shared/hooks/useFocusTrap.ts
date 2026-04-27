import { useEffect, RefObject } from 'react';

/**
 * Selector for focusable elements that can receive keyboard focus.
 * This follows WCAG 2.1 guidelines for keyboard navigation.
 *
 * Includes:
 * - Buttons (not disabled)
 * - Links with href
 * - Form inputs (not disabled)
 * - Select elements (not disabled)
 * - Textareas (not disabled)
 * - Elements with tabindex (not -1)
 */
const FOCUSABLE_SELECTOR = [
    'button:not(:disabled)',
    '[href]',
    'input:not(:disabled)',
    'select:not(:disabled)',
    'textarea:not(:disabled)',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Hook to trap focus within a container element.
 *
 * This is a WCAG 2.1 AA compliant focus trap for dialogs and modals.
 * When the user tabs through the container, focus wraps from the last
 * focusable element back to the first, and vice versa with Shift+Tab.
 *
 * WCAG 2.1 Requirements addressed:
 * - 2.1.2: No Keyboard Trap (focus can be moved away when dialog closes)
 * - 2.4.3: Focus Order (logical, predictable focus sequence)
 *
 * @param containerRef - Ref to the container element
 * @param isEnabled - Whether the focus trap is active
 *
 * @example
 * ```tsx
 * const MyDialog = ({ isOpen }) => {
 *   const containerRef = useRef<HTMLDivElement>(null);
 *   useFocusTrap(containerRef, isOpen);
 *
 *   return (
 *     <div ref={containerRef}>
 *       <button>First</button>
 *       <button>Last</button>
 *     </div>
 *   );
 * };
 * ```
 */
export const useFocusTrap = (
    containerRef: RefObject<HTMLElement | null>,
    isEnabled: boolean
): void => {
    useEffect(() => {
        if (!isEnabled) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent): void => {
            // Only handle Tab key
            if (event.key !== 'Tab') {
                return;
            }

            const container = containerRef.current;
            if (!container) {
                return;
            }

            // Get all focusable elements within the container
            const focusableElements = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
            if (focusableElements.length === 0) {
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            const activeElement = document.activeElement as HTMLElement;

            // Handle Shift+Tab on first element (wrap to last)
            if (event.shiftKey && activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
                return;
            }

            // Handle Tab on last element (wrap to first)
            if (!event.shiftKey && activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
                return;
            }
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [containerRef, isEnabled]);
};
