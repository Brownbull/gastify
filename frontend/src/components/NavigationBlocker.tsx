/**
 * NavigationBlocker Component
 *
 * Story 14d.3: Hybrid Navigation Blocking (AC #5-7)
 *
 * Handles browser back button blocking when a dialog is active during scan.
 * This component must be rendered inside ScanProvider to access scan state.
 *
 * Behavior:
 * - Pushes a history entry when entering a blocking state
 * - Listens for popstate (browser back) and prevents navigation
 * - Silently blocks without showing browser confirmation dialog (AC #6)
 */

import { useEffect, useRef } from 'react';
// Story 14e-11: Migrated from useScanOptional (ScanContext) to Zustand store
import { useHasDialog } from '@features/scan/store';

interface NavigationBlockerProps {
  /** Current view name from App state */
  currentView: string;
}

/**
 * Determine if the current view is a scan-related view
 */
function isScanView(view: string): boolean {
  return (
    view === 'transaction-editor' ||
    view === 'batch-capture' ||
    view === 'batch-review' ||
    view === 'scan-result'
  );
}

/**
 * NavigationBlocker - Prevents browser back button during active dialogs
 *
 * Uses the history API pattern:
 * 1. When blocking becomes active, push a dummy history entry
 * 2. On popstate (back button), re-push if still blocking
 * 3. When blocking ends, let natural navigation occur
 */
export function NavigationBlocker({ currentView }: NavigationBlockerProps) {
  // Story 14e-11: Use Zustand selector (always available, no provider boundary)
  const hasDialog = useHasDialog();
  const shouldBlock = isScanView(currentView) && hasDialog;

  // Track whether we've pushed a blocking history entry
  const hasBlockingEntry = useRef(false);

  // Story 14d.3 AC #5: Block browser back button when dialog is active in scan view
  useEffect(() => {
    if (!shouldBlock) {
      // Not blocking - reset state
      hasBlockingEntry.current = false;
      return;
    }

    // Push a dummy history entry to capture back button
    if (!hasBlockingEntry.current) {
      // Use a unique state marker to identify our blocking entry
      window.history.pushState({ blockingEntry: true }, '');
      hasBlockingEntry.current = true;
    }

    // Handle popstate (browser back button)
    const handlePopState = () => {
      // Story 14d.3 AC #6: Silently block - don't show browser prompt
      if (shouldBlock) {
        // Re-push the blocking entry to prevent navigation
        window.history.pushState({ blockingEntry: true }, '');
        // Note: popstate is not cancelable, so we just re-push to block
        if (import.meta.env.DEV) {
          console.warn('Browser back blocked: dialog requires response');
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [shouldBlock]);

  // Note: History cleanup when blocking ends is intentionally not implemented.
  // The blocking entry will be naturally overwritten on next navigation.
  // Trying to programmatically go back could trigger unwanted side effects.

  // This component doesn't render anything - it's purely for side effects
  return null;
}
