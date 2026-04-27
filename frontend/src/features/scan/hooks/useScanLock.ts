/**
 * Story 18-13b: Scan lock hook
 *
 * Subscribes to the pending_scans collection for the current user.
 * Returns lock state for the scan FAB — disabled while any pending scan exists.
 *
 * AC-ARCH-PATTERN-2: All hook calls before early returns.
 * AC-ARCH-PATTERN-3: Uses useShallow for multiple return values.
 * AC-ARCH-PATTERN-4: onSnapshot unsubscribed in useEffect cleanup.
 */

import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { FirestorePendingScan } from '@/types/pendingScan';

export interface ScanLockState {
  /** Whether the scan FAB should be disabled */
  isLocked: boolean;
  /** The pending scan document (if any) */
  pendingScan: FirestorePendingScan | null;
}

/**
 * Hook that monitors pending scans to lock the scan FAB.
 *
 * @param userId - Firebase Auth user ID (null = no subscription)
 * @returns Lock state with pending scan details
 */
export function useScanLock(userId: string | null): ScanLockState {
  // All hooks before early returns (AC-ARCH-PATTERN-2)
  const [isLocked, setIsLocked] = useState(false);
  const [pendingScan, setPendingScan] = useState<FirestorePendingScan | null>(null);

  useEffect(() => {
    if (!userId) {
      setIsLocked(false);
      setPendingScan(null);
      return;
    }

    // Only lock on active scans (processing). Completed/failed docs don't block new scans.
    const q = query(
      collection(db, 'pending_scans'),
      where('userId', '==', userId),
      where('status', '==', 'processing')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        setIsLocked(false);
        setPendingScan(null);
        return;
      }

      // Take the first pending scan (only one should exist at a time)
      if (snapshot.docs.length > 1) {
        console.warn(`Multiple processing scans found for user — expected at most 1, got ${snapshot.docs.length}`);
      }

      const firstDoc = snapshot.docs[0];
      const data = { ...firstDoc.data(), scanId: firstDoc.id } as FirestorePendingScan;

      setIsLocked(true);
      setPendingScan(data);
    }, (error) => {
      const msg = error instanceof Error ? error.message : 'scan lock listener error';
      console.error('Scan lock listener error:', msg);
      setIsLocked(false);
      setPendingScan(null);
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  return { isLocked, pendingScan };
}
