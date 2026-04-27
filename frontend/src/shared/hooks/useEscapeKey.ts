import { useEffect, useRef } from 'react';

/**
 * Hook to handle Escape key press events.
 *
 * This is commonly used in dialogs to close them when the user presses Escape.
 * Supports enabling/disabling and blocking (e.g., during pending operations).
 *
 * @param callback - Function to call when Escape is pressed
 * @param isEnabled - Whether the hook is enabled (default: true)
 * @param isBlocked - Whether the callback should be blocked, e.g., during pending operations (default: false)
 *
 * @example
 * ```tsx
 * const MyDialog = ({ onClose, isPending }) => {
 *   useEscapeKey(onClose, true, isPending);
 *   return <div>Dialog Content</div>;
 * };
 * ```
 */
export const useEscapeKey = (
    callback: () => void,
    isEnabled: boolean = true,
    isBlocked: boolean = false
): void => {
    // Use ref to always have the latest callback without re-registering listener
    const callbackRef = useRef(callback);
    callbackRef.current = callback;

    useEffect(() => {
        // Don't add listener if disabled
        if (!isEnabled) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent): void => {
            // Check if blocked
            if (isBlocked) {
                return;
            }

            // Only handle Escape key
            if (event.key !== 'Escape') {
                return;
            }

            // Call the callback (using ref to get latest)
            callbackRef.current?.();
        };

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isEnabled, isBlocked]);
};
