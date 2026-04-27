/**
 * useNavigationDirection Hook
 *
 * Story 14.2: Screen Transition System
 * Epic 14: Core Implementation
 *
 * Tracks navigation history to determine slide direction for transitions.
 * Uses a simple stack-based approach to detect forward vs back navigation.
 *
 * Features:
 * - Maintains navigation history stack
 * - Detects back navigation (returning to previous view)
 * - Provides direction for slide animations
 * - Reset capability for edge cases
 *
 * @example
 * ```tsx
 * function App() {
 *   const [view, setView] = useState('dashboard');
 *   const { direction, navigate, goBack, canGoBack } = useNavigationDirection(view);
 *
 *   return (
 *     <PageTransition viewKey={view} direction={direction}>
 *       {view === 'dashboard' && <Dashboard onNavigate={navigate} />}
 *       {view === 'settings' && <Settings onBack={goBack} />}
 *     </PageTransition>
 *   );
 * }
 * ```
 *
 * @see docs/uxui/motion-design-system.md Section 2.1
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Navigation direction for animations
 */
export type NavigationDirection = 'forward' | 'back' | 'none';

/**
 * Result from useNavigationDirection hook
 */
export interface UseNavigationDirectionResult {
  /**
   * Current navigation direction based on last view change
   * - 'forward': New view added to history
   * - 'back': Returned to previous view in history
   * - 'none': First render or reset
   */
  direction: NavigationDirection;

  /**
   * Navigate to a new view (forward navigation)
   * @param viewKey - The view to navigate to
   */
  navigate: (viewKey: string) => void;

  /**
   * Go back to previous view (back navigation)
   * @returns The previous view key, or null if can't go back
   */
  goBack: () => string | null;

  /**
   * Whether there's a previous view to go back to
   */
  canGoBack: boolean;

  /**
   * Current navigation history stack
   */
  history: string[];

  /**
   * Reset navigation history
   * @param initialView - Optional initial view to set
   */
  reset: (initialView?: string) => void;
}

/**
 * Maximum history stack size to prevent memory issues
 */
const MAX_HISTORY_SIZE = 50;

/**
 * Hook to track navigation direction for screen transitions
 *
 * @param currentView - The current active view
 * @returns Navigation direction utilities
 */
export function useNavigationDirection(
  currentView: string
): UseNavigationDirectionResult {
  // Navigation history stack
  const [history, setHistory] = useState<string[]>([currentView]);

  // Current direction
  const [direction, setDirection] = useState<NavigationDirection>('none');

  // Track if this is the first render
  const isFirstRender = useRef(true);

  // Previous view for detecting changes
  const prevViewRef = useRef<string>(currentView);

  // Detect view changes from external source (e.g., setView in parent)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Skip if same view
    if (prevViewRef.current === currentView) {
      return;
    }

    const prevView = prevViewRef.current;
    prevViewRef.current = currentView;

    // Check if this is a back navigation
    // Back = returning to the view that was before the current one in history
    setHistory((prev) => {
      const currentIndex = prev.indexOf(currentView);
      const prevIndex = prev.indexOf(prevView);

      // Check if going back (currentView exists earlier in history than prevView)
      if (
        currentIndex !== -1 &&
        prevIndex !== -1 &&
        currentIndex < prevIndex
      ) {
        // Back navigation - trim history to current position
        setDirection('back');
        return prev.slice(0, currentIndex + 1);
      }

      // Forward navigation - add to history
      setDirection('forward');

      // Prevent duplicate consecutive entries
      if (prev[prev.length - 1] === currentView) {
        return prev;
      }

      // Add to history, trim if exceeds max
      const newHistory = [...prev, currentView];
      if (newHistory.length > MAX_HISTORY_SIZE) {
        return newHistory.slice(-MAX_HISTORY_SIZE);
      }
      return newHistory;
    });
  }, [currentView]);

  /**
   * Navigate to a new view (forward)
   */
  const navigate = useCallback((viewKey: string) => {
    setDirection('forward');
    setHistory((prev) => {
      // Prevent duplicate consecutive entries
      if (prev[prev.length - 1] === viewKey) {
        return prev;
      }
      const newHistory = [...prev, viewKey];
      if (newHistory.length > MAX_HISTORY_SIZE) {
        return newHistory.slice(-MAX_HISTORY_SIZE);
      }
      return newHistory;
    });
    prevViewRef.current = viewKey;
  }, []);

  /**
   * Go back to previous view
   */
  const goBack = useCallback((): string | null => {
    if (history.length <= 1) {
      return null;
    }

    setDirection('back');
    const previousView = history[history.length - 2];
    setHistory((prev) => prev.slice(0, -1));
    prevViewRef.current = previousView;

    return previousView;
  }, [history]);

  /**
   * Reset navigation history
   */
  const reset = useCallback((initialView?: string) => {
    const view = initialView || currentView;
    setHistory([view]);
    setDirection('none');
    prevViewRef.current = view;
    isFirstRender.current = true;
  }, [currentView]);

  return {
    direction,
    navigate,
    goBack,
    canGoBack: history.length > 1,
    history,
    reset,
  };
}

export default useNavigationDirection;
