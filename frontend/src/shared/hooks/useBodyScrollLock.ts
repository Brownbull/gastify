import { useEffect } from 'react';

/**
 * Hook to prevent body scroll when a modal/dialog is open.
 *
 * This is commonly used in dialogs to prevent the background content
 * from scrolling while the modal is displayed.
 *
 * @param isLocked - Whether the body scroll should be locked
 *
 * @example
 * ```tsx
 * const MyDialog = ({ isOpen }) => {
 *   useBodyScrollLock(isOpen);
 *   return isOpen ? <div>Dialog Content</div> : null;
 * };
 * ```
 */
export const useBodyScrollLock = (isLocked: boolean): void => {
    useEffect(() => {
        if (!isLocked) {
            return;
        }

        // Lock the body scroll
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        // Cleanup: restore original overflow on unmount or when unlocked
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isLocked]);
};
