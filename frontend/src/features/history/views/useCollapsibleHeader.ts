/**
 * useCollapsibleHeader - Scroll-based header collapse/expand behavior
 *
 * Extracted from HistoryView.tsx (Story 15b-2c) for decomposition.
 * Detects scroll direction and position to collapse/expand the header section.
 */

import { useState, useEffect, useRef } from 'react';

const SCROLL_THRESHOLD = 80; // Pixels to scroll before collapsing
const SCROLL_DELTA_THRESHOLD = 15; // Minimum scroll delta to trigger state change
const DEBOUNCE_MS = 150; // Minimum ms between state changes

export interface UseCollapsibleHeaderReturn {
    isHeaderCollapsed: boolean;
    containerRef: React.RefObject<HTMLDivElement>;
    scrollContainerRef: React.MutableRefObject<HTMLElement | null>;
}

export function useCollapsibleHeader(): UseCollapsibleHeaderReturn {
    const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLElement | null>(null);
    const lastScrollY = useRef(0);
    const lastCollapseTime = useRef(0);

    useEffect(() => {
        // Find the scrolling parent element (main element with overflow-y-auto)
        const findScrollParent = (element: HTMLElement | null): HTMLElement | null => {
            if (!element) return null;
            let parent = element.parentElement;
            while (parent) {
                const style = getComputedStyle(parent);
                if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
                    return parent;
                }
                parent = parent.parentElement;
            }
            return null;
        };

        if (containerRef.current) {
            scrollContainerRef.current = findScrollParent(containerRef.current);
        }

        const handleScroll = () => {
            const scrollContainer = scrollContainerRef.current;
            const currentScrollY = scrollContainer ? scrollContainer.scrollTop : window.scrollY;
            const now = Date.now();

            // At top of page - always expand (no debounce)
            if (currentScrollY <= 10) {
                setIsHeaderCollapsed(false);
                lastScrollY.current = currentScrollY;
                lastCollapseTime.current = now;
                return;
            }

            const scrollDelta = currentScrollY - lastScrollY.current;
            const timeSinceLastChange = now - lastCollapseTime.current;

            // Debounce: wait at least 150ms between state changes to prevent flickering
            if (timeSinceLastChange < DEBOUNCE_MS) {
                lastScrollY.current = currentScrollY;
                return;
            }

            // Scrolling down past threshold - collapse (require larger delta)
            if (scrollDelta > SCROLL_DELTA_THRESHOLD && currentScrollY > SCROLL_THRESHOLD) {
                setIsHeaderCollapsed(true);
                lastCollapseTime.current = now;
            }
            // Scrolling up significantly - expand
            else if (scrollDelta < -SCROLL_DELTA_THRESHOLD) {
                setIsHeaderCollapsed(false);
                lastCollapseTime.current = now;
            }

            lastScrollY.current = currentScrollY;
        };

        // Attach to scroll parent if found, otherwise use window
        const scrollTarget = scrollContainerRef.current || window;
        scrollTarget.addEventListener('scroll', handleScroll, { passive: true });
        return () => scrollTarget.removeEventListener('scroll', handleScroll);
    }, []);

    return { isHeaderCollapsed, containerRef, scrollContainerRef };
}
