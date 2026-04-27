/**
 * Insight Profile Service
 *
 * Story 10.2: Phase Detection & User Profile
 * Architecture: architecture-epic10-insight-engine.md
 * Pattern: Functional module matching existing firestore.ts pattern
 *
 * Key ADRs:
 * - ADR-015: Client-Side Engine
 * - ADR-016: Hybrid Storage (Firestore for durable profile data)
 * - ADR-017: Phase-Based Priority System
 *
 * Firestore Document Path:
 * artifacts/{appId}/users/{userId}/insightProfile/profile
 */

import {
  doc,
  getDoc,
  runTransaction,
  Firestore,
  Transaction,
  DocumentReference,
  Timestamp,
  increment,
  FieldValue,
} from 'firebase/firestore';
import { UserInsightProfile, InsightRecord, InsightContent, MAX_RECENT_INSIGHTS } from '@/types/insight';
import { insightProfileDocSegments } from '@/lib/firestorePaths';

function getProfileDocRef(db: Firestore, appId: string, userId: string) {
  return doc(db, ...insightProfileDocSegments(appId, userId));
}

/** Default profile for new users. */
function createDefaultProfile(): UserInsightProfile {
  return {
    schemaVersion: 1,
    firstTransactionDate: null as unknown as Timestamp,
    totalTransactions: 0,
    recentInsights: [],
  };
}

/** Gets existing profile or creates default within a transaction. */
async function getOrCreateProfileInTransaction(
  transaction: Transaction,
  profileRef: DocumentReference
): Promise<UserInsightProfile> {
  const snap = await transaction.get(profileRef);
  if (snap.exists()) {
    return snap.data() as UserInsightProfile;
  }
  const newProfile = createDefaultProfile();
  transaction.set(profileRef, newProfile);
  return newProfile;
}

// ============================================================================
// Profile CRUD Operations
// ============================================================================

/**
 * Gets the user's insight profile, creating one if it doesn't exist.
 * Story 15-TD-20: Wrapped in runTransaction for TOCTOU safety.
 *
 * @param db - Firestore instance
 * @param userId - User's auth UID
 * @param appId - Application ID
 * @returns The user's insight profile
 */
export async function getOrCreateInsightProfile(
  db: Firestore,
  userId: string,
  appId: string
): Promise<UserInsightProfile> {
  const profileRef = getProfileDocRef(db, appId, userId);

  return runTransaction(db, async (transaction) => {
    return getOrCreateProfileInTransaction(transaction, profileRef);
  });
}

/**
 * Gets the user's insight profile if it exists.
 * Returns null if profile doesn't exist (unlike getOrCreate which creates one).
 *
 * @param db - Firestore instance
 * @param userId - User's auth UID
 * @param appId - Application ID
 * @returns The user's insight profile or null
 */
export async function getInsightProfile(
  db: Firestore,
  userId: string,
  appId: string
): Promise<UserInsightProfile | null> {
  const profileRef = getProfileDocRef(db, appId, userId);

  const snapshot = await getDoc(profileRef);

  if (snapshot.exists()) {
    return snapshot.data() as UserInsightProfile;
  }

  return null;
}

// ============================================================================
// Transaction Tracking
// ============================================================================

/**
 * Updates the first transaction date if this is the user's first transaction.
 * Also increments the total transaction count.
 * Story 15-TD-24: Wrapped in runTransaction for TOCTOU safety.
 *
 * This function should be called after a transaction is saved.
 *
 * @param db - Firestore instance
 * @param userId - User's auth UID
 * @param appId - Application ID
 * @param transactionDate - Date of the transaction being saved
 */
export async function trackTransactionForProfile(
  db: Firestore,
  userId: string,
  appId: string,
  transactionDate: Date
): Promise<void> {
  const profileRef = getProfileDocRef(db, appId, userId);

  await runTransaction(db, async (transaction) => {
    const profile = await getOrCreateProfileInTransaction(transaction, profileRef);

    // Build update object
    const updateData: Record<string, FieldValue | Timestamp> = {
      totalTransactions: increment(1),
    };

    // Set firstTransactionDate only if it's not already set
    if (!profile.firstTransactionDate) {
      updateData.firstTransactionDate = Timestamp.fromDate(transactionDate);
    }

    transaction.update(profileRef, updateData);
  });
}

/**
 * Sets the first transaction date explicitly.
 * Used when loading existing transactions to establish profile baseline.
 * Story 15-TD-24: Wrapped in runTransaction for TOCTOU safety.
 *
 * @param db - Firestore instance
 * @param userId - User's auth UID
 * @param appId - Application ID
 * @param firstDate - The date of the user's first transaction
 */
export async function setFirstTransactionDate(
  db: Firestore,
  userId: string,
  appId: string,
  firstDate: Date
): Promise<void> {
  const profileRef = getProfileDocRef(db, appId, userId);

  await runTransaction(db, async (transaction) => {
    await getOrCreateProfileInTransaction(transaction, profileRef);

    transaction.update(profileRef, {
      firstTransactionDate: Timestamp.fromDate(firstDate),
    });
  });
}

// ============================================================================
// Insight Recording
// ============================================================================

/**
 * Records that an insight was shown to the user.
 * Maintains a maximum of MAX_RECENT_INSIGHTS (50) entries for cooldown checking and history display.
 *
 * Story 10a.5: Stores full insight content for history display.
 * Story 15-TD-20: Wrapped in runTransaction for TOCTOU safety.
 *
 * @param db - Firestore instance
 * @param userId - User's auth UID
 * @param appId - Application ID
 * @param insightId - The insight identifier that was shown
 * @param transactionId - Optional: The transaction that triggered this insight
 * @param fullInsight - Optional: Full insight content for history display
 *   - title: Short insight title (e.g., "Visita frecuente")
 *   - message: Detailed message (e.g., "3ra vez en Jumbo este mes")
 *   - icon: Lucide icon name (e.g., "Repeat")
 *   - category: InsightCategory for styling (QUIRKY_FIRST | CELEBRATORY | ACTIONABLE)
 */
export async function recordInsightShown(
  db: Firestore,
  userId: string,
  appId: string,
  insightId: string,
  transactionId?: string,
  fullInsight?: InsightContent
): Promise<void> {
  const profileRef = getProfileDocRef(db, appId, userId);

  await runTransaction(db, async (transaction) => {
    const profile = await getOrCreateProfileInTransaction(transaction, profileRef);

    // Create new insight record with full content (Story 10a.5)
    const newRecord: InsightRecord = {
      insightId,
      shownAt: Timestamp.now(),
      ...(transactionId && { transactionId }),
      ...(fullInsight?.title && { title: fullInsight.title }),
      ...(fullInsight?.message && { message: fullInsight.message }),
      ...(fullInsight?.icon && { icon: fullInsight.icon }),
      ...(fullInsight?.category && { category: fullInsight.category as InsightRecord['category'] }),
    };

    // Add new record and trim to MAX_RECENT_INSIGHTS
    const updatedInsights = [...profile.recentInsights, newRecord].slice(-MAX_RECENT_INSIGHTS);

    transaction.update(profileRef, {
      recentInsights: updatedInsights,
    });
  });
}

/**
 * Deletes a specific insight from the user's recent insights.
 * Story 15-TD-20: Wrapped in runTransaction for TOCTOU safety.
 *
 * @param db - Firestore instance
 * @param userId - User's auth UID
 * @param appId - Application ID
 * @param insightId - The insight identifier to delete
 * @param shownAtSeconds - The shownAt timestamp seconds to uniquely identify the insight
 */
export async function deleteInsight(
  db: Firestore,
  userId: string,
  appId: string,
  insightId: string,
  shownAtSeconds: number
): Promise<void> {
  const profileRef = getProfileDocRef(db, appId, userId);

  await runTransaction(db, async (transaction) => {
    const profile = await getOrCreateProfileInTransaction(transaction, profileRef);

    // Filter out the insight matching both insightId and shownAt timestamp
    const updatedInsights = profile.recentInsights.filter(
      (insight) =>
        !(insight.insightId === insightId && insight.shownAt.seconds === shownAtSeconds)
    );

    transaction.update(profileRef, {
      recentInsights: updatedInsights,
    });
  });
}

/**
 * Deletes multiple insights from the user's recent insights.
 * Story 15-TD-20: Wrapped in runTransaction for TOCTOU safety.
 *
 * @param db - Firestore instance
 * @param userId - User's auth UID
 * @param appId - Application ID
 * @param insightsToDelete - Array of {insightId, shownAtSeconds} to delete
 */
export async function deleteInsights(
  db: Firestore,
  userId: string,
  appId: string,
  insightsToDelete: Array<{ insightId: string; shownAtSeconds: number }>
): Promise<void> {
  const profileRef = getProfileDocRef(db, appId, userId);

  await runTransaction(db, async (transaction) => {
    const profile = await getOrCreateProfileInTransaction(transaction, profileRef);

    // Create a Set for fast lookup
    const deleteSet = new Set(
      insightsToDelete.map((i) => `${i.insightId}:${i.shownAtSeconds}`)
    );

    // Filter out all matching insights
    const updatedInsights = profile.recentInsights.filter(
      (insight) => !deleteSet.has(`${insight.insightId}:${insight.shownAt.seconds}`)
    );

    transaction.update(profileRef, {
      recentInsights: updatedInsights,
    });
  });
}

/**
 * Clears all recent insights from the profile.
 * Useful for testing or resetting user experience.
 *
 * @param db - Firestore instance
 * @param userId - User's auth UID
 * @param appId - Application ID
 */
export async function clearRecentInsights(
  db: Firestore,
  userId: string,
  appId: string
): Promise<void> {
  const profileRef = getProfileDocRef(db, appId, userId);

  await runTransaction(db, async (transaction) => {
    await getOrCreateProfileInTransaction(transaction, profileRef);

    transaction.update(profileRef, {
      recentInsights: [],
    });
  });
}

// ============================================================================
// Profile Reset
// ============================================================================

/**
 * Resets the insight profile to initial state.
 * Preserves firstTransactionDate but clears insights and resets count.
 *
 * @param db - Firestore instance
 * @param userId - User's auth UID
 * @param appId - Application ID
 */
export async function resetInsightProfile(
  db: Firestore,
  userId: string,
  appId: string
): Promise<void> {
  const profileRef = getProfileDocRef(db, appId, userId);

  await runTransaction(db, async (transaction) => {
    const profile = await getOrCreateProfileInTransaction(transaction, profileRef);

    transaction.update(profileRef, {
      totalTransactions: 0,
      recentInsights: [],
      // Keep firstTransactionDate unchanged
      firstTransactionDate: profile.firstTransactionDate,
    });
  });
}

// ============================================================================
// Story 14.17: Intentional Response Recording
// ============================================================================

/**
 * Records the user's response to an intentional prompt.
 * Updates the insight record in recentInsights with the response.
 * Story 15-TD-20: Wrapped in runTransaction for TOCTOU safety.
 *
 * @param db - Firestore instance
 * @param userId - User's auth UID
 * @param appId - Application ID
 * @param insightId - The insight that triggered the prompt
 * @param shownAtSeconds - The timestamp of the insight (for unique identification)
 * @param response - User's response: 'intentional', 'unintentional', or null if dismissed
 */
export async function recordIntentionalResponse(
  db: Firestore,
  userId: string,
  appId: string,
  insightId: string,
  shownAtSeconds: number,
  response: 'intentional' | 'unintentional' | null
): Promise<void> {
  const profileRef = getProfileDocRef(db, appId, userId);

  await runTransaction(db, async (transaction) => {
    const profile = await getOrCreateProfileInTransaction(transaction, profileRef);

    // Find and update the matching insight record
    const updatedInsights = profile.recentInsights.map((insight) => {
      if (insight.insightId === insightId && insight.shownAt.seconds === shownAtSeconds) {
        return {
          ...insight,
          intentionalResponse: response,
          intentionalResponseAt: Timestamp.now(),
        };
      }
      return insight;
    });

    transaction.update(profileRef, {
      recentInsights: updatedInsights,
    });
  });
}
