/**
 * Credit state wrapper hook for the credit feature module.
 * Story 14e-18a: Provides unified interface for feature consumers.
 *
 * Delegates to useUserCredits - wrapper pattern from Epic 14c-refactor.27.
 * DO NOT modify useUserCredits.ts - this is a passthrough wrapper only.
 */

import { useMemo } from 'react';
import { User } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { useUserCredits } from '@/hooks/useUserCredits';

/**
 * Firebase services interface for credit operations.
 * Matches the interface expected by useUserCredits.
 */
export interface CreditFirebaseServices {
  db: Firestore;
  appId: string;
}

/**
 * Credit state wrapper hook for the credit feature module.
 * Delegates to useUserCredits - provides consistent interface for feature consumers.
 *
 * @param user - Firebase Auth user (null when not authenticated)
 * @param services - Firebase services containing db and appId
 * @returns Credit state and operations
 *
 * @example
 * ```tsx
 * const { credits, loading, deductCredits, reserveCredits } = useCreditState(user, services);
 * ```
 */
export function useCreditState(
  user: User | null,
  _services?: CreditFirebaseServices | null
) {
  const creditsResult = useUserCredits(user);

  // Stable reference for consumers - includes all properties and functions
  // Functions are stable via useCallback in useUserCredits
  return useMemo(
    () => creditsResult,
    [
      creditsResult.credits,
      creditsResult.loading,
      creditsResult.error,
      creditsResult.hasReservedCredits,
      creditsResult.deductCredits,
      creditsResult.deductSuperCredits,
      creditsResult.addCredits,
      creditsResult.addSuperCredits,
      creditsResult.refreshCredits,
      creditsResult.reserveCredits,
      creditsResult.confirmReservedCredits,
      creditsResult.refundReservedCredits,
    ]
  );
}

/**
 * Return type of useCreditState hook.
 * Matches UseUserCreditsResult from useUserCredits.
 */
export type UseCreditStateResult = ReturnType<typeof useCreditState>;
