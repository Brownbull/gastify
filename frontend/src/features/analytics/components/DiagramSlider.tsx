/**
 * DiagramSlider Component
 * Story 14.13.3: Draggable horizontal pan slider for Sankey diagram
 *
 * Provides a custom scrollbar-like control for panning a horizontally
 * scrollable diagram without interfering with carousel swipe gestures.
 *
 * Features:
 * - Track and thumb styled to match app design
 * - Thumb width represents visible portion ratio
 * - Draggable via touch and mouse (pointer events)
 * - Clicking track jumps to that position
 * - Starts centered
 * - CRITICAL: Prevents carousel swipe when interacting with slider
 */

import { useRef, useState, useCallback, useEffect } from 'react';

export interface DiagramSliderProps {
    /** Ref to the scrollable container element */
    scrollableRef: React.RefObject<HTMLDivElement>;
    /** Total width of the diagram content */
    contentWidth: number;
    /** Visible viewport width */
    viewportWidth: number;
    /** Whether slider is disabled (e.g., when content fits in viewport) */
    disabled?: boolean;
    /** Test ID for testing */
    testId?: string;
    /** Track width as percentage of container (default: 50%) */
    trackWidthPercent?: number;
    /** Track height in pixels (default: 6) */
    trackHeight?: number;
}

/**
 * DiagramSlider - Custom horizontal scrollbar for diagram panning
 */
export function DiagramSlider({
    scrollableRef,
    contentWidth,
    viewportWidth,
    disabled = false,
    testId = 'diagram-slider',
    trackWidthPercent = 50, // Shorter track (50% of container width)
    trackHeight = 6, // Thicker track
}: DiagramSliderProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [thumbPosition, setThumbPosition] = useState(0.5); // 0-1, start centered

    // Calculate thumb width as percentage of track
    const thumbWidthPercent = viewportWidth >= contentWidth
        ? 100
        : Math.max(25, (viewportWidth / contentWidth) * 100); // Min 25% for better usability

    // Calculate max scroll position
    const maxScroll = Math.max(0, contentWidth - viewportWidth);

    // Update scrollable element position when thumb moves
    const updateScrollPosition = useCallback((newPosition: number) => {
        // Clamp position between 0 and 1
        const clampedPosition = Math.max(0, Math.min(1, newPosition));
        setThumbPosition(clampedPosition);

        if (scrollableRef.current && maxScroll > 0) {
            scrollableRef.current.scrollLeft = clampedPosition * maxScroll;
        }
    }, [scrollableRef, maxScroll]);

    // Initialize scroll position to center on mount
    useEffect(() => {
        if (scrollableRef.current && maxScroll > 0) {
            scrollableRef.current.scrollLeft = 0.5 * maxScroll;
        }
    }, [scrollableRef, maxScroll]);

    // Sync thumb position when scrollable is scrolled externally
    useEffect(() => {
        const scrollable = scrollableRef.current;
        if (!scrollable) return;

        const handleScroll = () => {
            if (isDragging) return; // Don't sync while dragging
            if (maxScroll > 0) {
                const newPosition = scrollable.scrollLeft / maxScroll;
                setThumbPosition(newPosition);
            }
        };

        scrollable.addEventListener('scroll', handleScroll, { passive: true });
        return () => scrollable.removeEventListener('scroll', handleScroll);
    }, [scrollableRef, maxScroll, isDragging]);

    // Handle pointer down on thumb - start dragging
    // CRITICAL: stopPropagation prevents carousel swipe from triggering
    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent carousel swipe
        setIsDragging(true);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }, []);

    // Handle touch start on entire slider area - prevent carousel swipe
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        e.stopPropagation(); // Prevent carousel swipe when touching slider area
    }, []);

    // Handle touch move on entire slider area - prevent carousel swipe
    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        e.stopPropagation(); // Prevent carousel swipe when moving on slider area
    }, []);

    // Handle pointer move while dragging
    const handlePointerMove = useCallback((e: React.PointerEvent) => {
        if (!isDragging || !trackRef.current) return;

        const trackRect = trackRef.current.getBoundingClientRect();
        const thumbWidthPx = (thumbWidthPercent / 100) * trackRect.width;
        const availableWidth = trackRect.width - thumbWidthPx;

        if (availableWidth <= 0) return;

        // Calculate new position based on pointer position relative to track
        const pointerX = e.clientX - trackRect.left - (thumbWidthPx / 2);
        const newPosition = pointerX / availableWidth;

        updateScrollPosition(newPosition);
    }, [isDragging, thumbWidthPercent, updateScrollPosition]);

    // Handle pointer up - stop dragging
    const handlePointerUp = useCallback((e: React.PointerEvent) => {
        setIsDragging(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }, []);

    // Handle click on track (not thumb) - jump to position
    const handleTrackClick = useCallback((e: React.MouseEvent) => {
        if (!trackRef.current) return;

        const trackRect = trackRef.current.getBoundingClientRect();
        const thumbWidthPx = (thumbWidthPercent / 100) * trackRect.width;
        const availableWidth = trackRect.width - thumbWidthPx;

        if (availableWidth <= 0) return;

        // Calculate position from click
        const clickX = e.clientX - trackRect.left - (thumbWidthPx / 2);
        const newPosition = clickX / availableWidth;

        updateScrollPosition(newPosition);
    }, [thumbWidthPercent, updateScrollPosition]);

    // Hide slider if content fits in viewport
    if (viewportWidth >= contentWidth || disabled) {
        return null;
    }

    // Calculate thumb left position
    const availableTrackPercent = 100 - thumbWidthPercent;
    const thumbLeft = thumbPosition * availableTrackPercent;

    return (
        <div
            ref={containerRef}
            className="relative flex items-center justify-center py-2"
            style={{ touchAction: 'none' }} // Prevent default touch behavior on entire slider
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            data-testid={testId}
        >
            {/* Track - centered, shorter width */}
            <div
                ref={trackRef}
                className="relative rounded-full cursor-pointer"
                style={{
                    width: `${trackWidthPercent}%`,
                    height: `${trackHeight}px`,
                    backgroundColor: 'var(--bg-tertiary, #e2e8f0)',
                }}
                onClick={handleTrackClick}
                data-testid={`${testId}-track`}
            >
                {/* Thumb */}
                <div
                    className={`absolute top-0 h-full rounded-full transition-shadow ${
                        isDragging ? 'shadow-md' : 'shadow-sm'
                    }`}
                    style={{
                        left: `${thumbLeft}%`,
                        width: `${thumbWidthPercent}%`,
                        backgroundColor: isDragging
                            ? 'var(--primary, #2563eb)'
                            : 'var(--text-tertiary, #94a3b8)',
                        cursor: isDragging ? 'grabbing' : 'grab',
                        touchAction: 'none', // Prevent touch scrolling while dragging
                    }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    data-testid={`${testId}-thumb`}
                />
            </div>
        </div>
    );
}

export default DiagramSlider;
