/**
 * Insight Engine Service
 *
 * Story 10.1: InsightEngine Service Interface
 * Architecture: architecture-epic10-insight-engine.md
 * Pattern: Functional module (not class-based) matching existing *Service.ts pattern
 *
 * Key ADRs:
 * - ADR-015: Client-Side Engine (no Cloud Functions dependency)
 * - ADR-016: Hybrid Storage (Firestore + localStorage)
 * - ADR-017: Phase-Based Priority System
 */

import type { Transaction } from '@/types/transaction';
import {
  Insight,
  InsightCategory,
  InsightRecord,
  UserInsightProfile,
  LocalInsightCache,
  UserPhase,
  PrecomputedAggregates,
  INSIGHT_CACHE_KEY,
  INSIGHT_COOLDOWN_MS,
  PHASE_THRESHOLDS,
} from '@/types/insight';
import { generateAllCandidates } from '../utils/insightGenerators';
import { getStorageJSON, setStorageJSON } from '@/utils/storage';
// Story 15b-3c: getUserInsightProfile re-export removed — consumers now use useInsightProfileRepository from @/repositories

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Main entry point - generates an insight for a transaction.
 * MUST NOT block transaction save (async side-effect pattern).
 *
 * Architecture requirement: This function is called AFTER transaction save,
 * as a fire-and-forget side effect. Failures should never affect the save flow.
 *
 * @param transaction - The transaction that was just saved
 * @param allTransactions - All user transactions for pattern detection
 * @param profile - User's insight profile from Firestore
 * @param cache - Local insight cache from localStorage
 * @returns The selected insight, or fallback if no candidates available
 */
export async function generateInsightForTransaction(
  transaction: Transaction,
  allTransactions: Transaction[],
  profile: UserInsightProfile,
  cache: LocalInsightCache
): Promise<Insight | null> {
  // Log for debugging (can be enabled with ?insightDebug=true)
  if (isDebugMode()) {
    console.debug('[InsightEngine] generateInsightForTransaction called', {
      transactionId: transaction.id,
      transactionCount: allTransactions.length,
      phase: calculateUserPhase(profile),
    });
  }

  // Story 10.3: Generate all candidates using transaction-intrinsic generators
  // Story 10.4: Pattern detection generators added
  const candidates = generateAllCandidates(transaction, allTransactions);

  if (isDebugMode()) {
    console.debug('[InsightEngine] Candidates generated', {
      count: candidates.length,
      ids: candidates.map((c) => c.id),
    });
  }

  // Story 10.5: Full selection algorithm with phase-based priority and sprinkle distribution
  const selected = selectInsight(candidates, profile, cache);

  return selected || getFallbackInsight();
}

// ============================================================================
// Phase Calculation
// ============================================================================

/**
 * Calculates user phase based on profile data.
 * ADR-017: Phase-Based Priority System
 *
 * - WEEK_1: First 7 days - prioritize quirky/fun insights
 * - WEEKS_2_3: Days 8-21 - transition phase
 * - MATURE: Day 22+ - full insight variety
 *
 * @param profile - User's insight profile
 * @returns The current user phase
 */
export function calculateUserPhase(profile: UserInsightProfile): UserPhase {
  if (!profile.firstTransactionDate) {
    return 'WEEK_1';
  }

  const firstDate = profile.firstTransactionDate.toDate();
  const now = new Date();
  const daysSinceFirst = Math.floor(
    (now.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceFirst <= PHASE_THRESHOLDS.WEEK_1_END) {
    return 'WEEK_1';
  }

  if (daysSinceFirst <= PHASE_THRESHOLDS.WEEKS_2_3_END) {
    return 'WEEKS_2_3';
  }

  return 'MATURE';
}

// ============================================================================
// Selection Algorithm (Story 10.5)
// ============================================================================

/**
 * Returns insight category priority order based on phase and sprinkle logic.
 *
 * ADR-017 Phase-Based Priority System:
 * - WEEK_1: 100% Quirky First
 * - WEEKS_2_3: 66% Celebratory / 33% Actionable (same weekday/weekend)
 * - MATURE Weekday: 66% Actionable / 33% Celebratory
 * - MATURE Weekend: 66% Celebratory / 33% Actionable
 *
 * 33/66 Sprinkle: Every 3rd scan gets the "minority" type.
 *
 * Story 10.5, AC #3-7: Phase-based priority with sprinkle distribution.
 *
 * @param phase - User's current phase
 * @param scanCounter - Current scan counter (weekday or weekend)
 * @param isWeekendDay - Whether today is a weekend
 * @returns Priority order of insight categories
 */
export function getInsightPriority(
  phase: UserPhase,
  scanCounter: number,
  isWeekendDay: boolean
): InsightCategory[] {
  // AC #4: WEEK_1 phase returns only QUIRKY_FIRST insights
  if (phase === 'WEEK_1') {
    return ['QUIRKY_FIRST'];
  }

  // AC #5: WEEKS_2_3 phase returns 66% CELEBRATORY / 33% ACTIONABLE
  // Same pattern weekday and weekend during weeks 2-3
  if (phase === 'WEEKS_2_3') {
    // AC #3: Every 3rd scan (scanCounter % 3 === 0) gets minority type
    return scanCounter % 3 === 0
      ? ['ACTIONABLE', 'CELEBRATORY', 'QUIRKY_FIRST'] // 33% sprinkle
      : ['CELEBRATORY', 'ACTIONABLE', 'QUIRKY_FIRST']; // 66% primary
  }

  // MATURE phase - weekday/weekend differentiation
  if (isWeekendDay) {
    // AC #7: MATURE weekend returns 66% CELEBRATORY / 33% ACTIONABLE
    return scanCounter % 3 === 0
      ? ['ACTIONABLE', 'CELEBRATORY', 'QUIRKY_FIRST'] // 33% sprinkle
      : ['CELEBRATORY', 'ACTIONABLE', 'QUIRKY_FIRST']; // 66% primary
  } else {
    // AC #6: MATURE weekday returns 66% ACTIONABLE / 33% CELEBRATORY
    return scanCounter % 3 === 0
      ? ['CELEBRATORY', 'ACTIONABLE', 'QUIRKY_FIRST'] // 33% sprinkle
      : ['ACTIONABLE', 'CELEBRATORY', 'QUIRKY_FIRST']; // 66% primary
  }
}

/**
 * Checks if a given date is a weekend (Saturday or Sunday).
 *
 * @param date - Date to check (defaults to now)
 * @returns true if the date is Saturday or Sunday
 */
export function isWeekend(date: Date = new Date()): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Selects the best insight from candidates using phase-based priority.
 *
 * Algorithm (Story 10.5):
 * 1. Filter out insights on cooldown (AC #1)
 * 2. Get priority order for current phase (AC #2-7)
 * 3. Group candidates by category
 * 4. Return highest priority candidate, or null for fallback (AC #9)
 *
 * @param candidates - Available insight candidates
 * @param profile - User's insight profile
 * @param cache - Local insight cache
 * @returns Selected insight, or null if no valid candidates
 */
export function selectInsight(
  candidates: Insight[],
  profile: UserInsightProfile,
  cache: LocalInsightCache
): Insight | null {
  if (candidates.length === 0) {
    return null; // AC #9: Caller should use fallback
  }

  // Step 1: Filter by cooldown (AC #1)
  const available = candidates.filter(
    (c) => !checkCooldown(c.id, profile.recentInsights)
  );

  if (available.length === 0) {
    return null; // AC #9: Caller should use fallback
  }

  // Step 2: Get priority order (AC #2)
  const phase = calculateUserPhase(profile);
  const isWeekendDay = isWeekend(); // Cache result - used twice
  const scanCounter = isWeekendDay
    ? cache.weekendScanCount
    : cache.weekdayScanCount;
  const priorityOrder = getInsightPriority(phase, scanCounter, isWeekendDay);

  // Step 3: Group by category
  const byCategory = new Map<InsightCategory, Insight[]>();
  for (const insight of available) {
    const existing = byCategory.get(insight.category) || [];
    existing.push(insight);
    byCategory.set(insight.category, existing);
  }

  // Step 4: Return highest priority candidate
  for (const category of priorityOrder) {
    const categoryInsights = byCategory.get(category);
    if (categoryInsights && categoryInsights.length > 0) {
      // Sort by priority within category (higher = better)
      categoryInsights.sort((a, b) => b.priority - a.priority);
      return categoryInsights[0];
    }
  }

  // Fallback to any available insight (shouldn't reach here normally)
  return available[0];
}

// ============================================================================
// Cooldown Management
// ============================================================================

/**
 * Checks if an insight is on cooldown (shown recently).
 * Default cooldown is 1 week to prevent repetitive insights.
 *
 * @param insightId - The insight identifier to check
 * @param recentInsights - Recent insight records from profile
 * @returns true if insight is on cooldown (should not be shown)
 */
export function checkCooldown(
  insightId: string,
  recentInsights: InsightRecord[]
): boolean {
  const now = Date.now();

  const lastShown = recentInsights.find((record) => record.insightId === insightId);
  if (!lastShown) {
    return false;
  }

  // Defensive: handle corrupted Timestamp from Firestore
  // If toDate() throws or returns invalid data, treat as not on cooldown
  try {
    const shownAt = lastShown.shownAt?.toDate?.()?.getTime?.();
    if (typeof shownAt !== 'number' || isNaN(shownAt)) {
      return false;
    }
    return now - shownAt < INSIGHT_COOLDOWN_MS;
  } catch {
    // Corrupted Timestamp - treat as not on cooldown (allow insight to show)
    return false;
  }
}

// ============================================================================
// Fallback Insight
// ============================================================================

/**
 * Fallback insight when no candidates available.
 * Always returns a valid insight - never show nothing to the user.
 *
 * @returns The "building profile" fallback insight
 */
export function getFallbackInsight(): Insight {
  return {
    id: 'building_profile',
    category: 'QUIRKY_FIRST',
    title: 'Construyendo tu perfil',
    message: 'Con más datos, te mostraremos insights personalizados.',
    icon: 'Sparkles',
    priority: 0,
  };
}

// ============================================================================
// Local Cache Management
// ============================================================================

/**
 * Retrieves the local insight cache from localStorage.
 * Returns default cache if not found or corrupted.
 *
 * @returns The local insight cache
 */
export function getLocalCache(): LocalInsightCache {
  const parsed = getStorageJSON<LocalInsightCache | null>(INSIGHT_CACHE_KEY, null);
  if (
    parsed &&
    typeof parsed.weekdayScanCount === 'number' &&
    typeof parsed.weekendScanCount === 'number' &&
    typeof parsed.lastCounterReset === 'string'
  ) {
    return maybeResetCounters(parsed);
  }
  return getDefaultCache();
}

/**
 * Saves the local insight cache to localStorage.
 */
export function setLocalCache(cache: LocalInsightCache): void {
  setStorageJSON(INSIGHT_CACHE_KEY, cache);
}

/**
 * Returns a fresh default cache with reset counters.
 *
 * @returns Default local insight cache
 */
export function getDefaultCache(): LocalInsightCache {
  return {
    weekdayScanCount: 0,
    weekendScanCount: 0,
    lastCounterReset: getTodayISODate(),
    silencedUntil: null,
  };
}

/**
 * Resets scan counters if the last reset was more than a week ago.
 * Called when retrieving cache to ensure counters stay fresh.
 *
 * Story 10.5, AC #8: Scan counters reset weekly.
 *
 * @param cache - Current cache from localStorage
 * @returns Cache with reset counters if 7+ days since last reset, otherwise unchanged
 */
function maybeResetCounters(cache: LocalInsightCache): LocalInsightCache {
  const lastReset = new Date(cache.lastCounterReset);
  const now = new Date();
  const daysSinceReset = Math.floor(
    (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceReset >= 7) {
    return {
      ...cache,
      weekdayScanCount: 0,
      weekendScanCount: 0,
      lastCounterReset: getTodayISODate(),
    };
  }

  return cache;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Returns today's date as an ISO string (YYYY-MM-DD).
 */
function getTodayISODate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Checks if debug mode is enabled via URL parameter.
 * Add ?insightDebug=true to enable verbose logging.
 */
function isDebugMode(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return new URLSearchParams(window.location.search).get('insightDebug') === 'true';
}

/**
 * Increments the appropriate scan counter and resets if week changed.
 *
 * Story 10.5, AC #8: Scan counters reset weekly (localStorage).
 *
 * @param cache - Current local cache
 * @returns Updated cache with incremented counter (and potentially reset)
 */
export function incrementScanCounter(cache: LocalInsightCache): LocalInsightCache {
  const today = getTodayISODate();
  const lastReset = cache.lastCounterReset;

  // Check if we need to reset (new week = 7+ days since last reset)
  const lastResetDate = new Date(lastReset);
  const todayDate = new Date(today);
  const daysSinceReset = Math.floor(
    (todayDate.getTime() - lastResetDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const newCache = { ...cache };

  // AC #8: Reset counters after 7 days
  if (daysSinceReset >= 7) {
    newCache.weekdayScanCount = 0;
    newCache.weekendScanCount = 0;
    newCache.lastCounterReset = today;
  }

  // Increment appropriate counter based on day type
  if (isWeekend()) {
    newCache.weekendScanCount++;
  } else {
    newCache.weekdayScanCount++;
  }

  return newCache;
}

/**
 * Checks if insights are currently silenced.
 *
 * @param cache - Local cache with silencedUntil timestamp
 * @returns true if insights should not be shown
 */
export function isInsightsSilenced(cache: LocalInsightCache): boolean {
  if (!cache.silencedUntil) {
    return false;
  }

  const silencedUntil = new Date(cache.silencedUntil);
  return new Date() < silencedUntil;
}

/**
 * Silences insights for the specified number of hours.
 *
 * @param cache - Current cache
 * @param hours - Number of hours to silence (e.g., 4)
 * @returns Updated cache with silencedUntil set
 */
export function silenceInsights(cache: LocalInsightCache, hours: number): LocalInsightCache {
  const silencedUntil = new Date();
  silencedUntil.setHours(silencedUntil.getHours() + hours);

  return {
    ...cache,
    silencedUntil: silencedUntil.toISOString(),
  };
}

/**
 * Clears the silence period.
 *
 * @param cache - Current cache
 * @returns Updated cache with silencedUntil cleared
 */
export function clearSilence(cache: LocalInsightCache): LocalInsightCache {
  return {
    ...cache,
    silencedUntil: null,
  };
}

// ============================================================================
// Precomputed Aggregates (Story 10.4)
// ============================================================================

/**
 * Precomputes aggregates for faster pattern detection.
 * Called on app load and after each transaction save.
 * Performance target: <100ms for 500 transactions.
 *
 * Story 10.4, AC #8: Precomputed aggregates optimize performance.
 *
 * @param transactions - All user transactions
 * @returns Precomputed aggregates for pattern detection
 */
export function computeAggregates(
  transactions: Transaction[]
): PrecomputedAggregates {
  const merchantVisits: Record<string, number> = {};
  const categoryTotals: Record<string, number> = {};

  for (const tx of transactions) {
    // Count merchant visits
    if (tx.merchant) {
      merchantVisits[tx.merchant] = (merchantVisits[tx.merchant] || 0) + 1;
    }

    // Sum category totals
    if (tx.category) {
      categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.total;
    }
  }

  return {
    merchantVisits,
    categoryTotals,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Updates cache with fresh aggregates.
 * Called after transaction save to keep aggregates up-to-date.
 *
 * @param cache - Current local cache
 * @param transactions - All user transactions
 * @returns Updated cache with fresh aggregates
 */
export function updateCacheAggregates(
  cache: LocalInsightCache,
  transactions: Transaction[]
): LocalInsightCache {
  return {
    ...cache,
    precomputedAggregates: computeAggregates(transactions),
  };
}

/**
 * Gets merchant visit count from aggregates.
 * Falls back to manual count if aggregates not available.
 *
 * @param merchant - Merchant name to look up
 * @param aggregates - Precomputed aggregates (optional)
 * @param transactions - All transactions (fallback)
 * @returns Number of visits to the merchant
 */
export function getMerchantVisitCount(
  merchant: string,
  aggregates: PrecomputedAggregates | undefined,
  transactions: Transaction[]
): number {
  if (aggregates?.merchantVisits) {
    return aggregates.merchantVisits[merchant] || 0;
  }

  // Fallback to manual count
  return transactions.filter((tx) => tx.merchant === merchant).length;
}

/**
 * Gets category total from aggregates.
 * Falls back to manual sum if aggregates not available.
 *
 * @param category - Category to look up
 * @param aggregates - Precomputed aggregates (optional)
 * @param transactions - All transactions (fallback)
 * @returns Total spending in the category
 */
export function getCategoryTotal(
  category: string,
  aggregates: PrecomputedAggregates | undefined,
  transactions: Transaction[]
): number {
  if (aggregates?.categoryTotals) {
    return aggregates.categoryTotals[category] || 0;
  }

  // Fallback to manual sum
  return transactions
    .filter((tx) => tx.category === category)
    .reduce((sum, tx) => sum + tx.total, 0);
}

// ============================================================================
// Historical Comparison (Story 10.7)
// ============================================================================

/**
 * Calculates total spending from transactions 8-13 days ago.
 * Used for week-over-week comparison in batch summary.
 *
 * Story 10.7, AC #4: Historical comparison vs last week.
 *
 * Window calculation (using ISO date strings to avoid timezone issues):
 * - "Last week" = transactions where date is 8-13 days before today
 * - This gives us a 6-day window for meaningful comparison
 *
 * @param transactions - All user transactions
 * @returns Total spending from the previous week window
 */
export function getLastWeekTotal(transactions: Transaction[]): number {
  const now = new Date();
  // Get today as YYYY-MM-DD string
  const todayStr = now.toISOString().split('T')[0];

  // Calculate boundary dates
  const startDate = new Date(todayStr);
  startDate.setDate(startDate.getDate() - 13); // 13 days ago (inclusive)
  const startStr = startDate.toISOString().split('T')[0];

  const endDate = new Date(todayStr);
  endDate.setDate(endDate.getDate() - 8); // 8 days ago (inclusive)
  const endStr = endDate.toISOString().split('T')[0];

  return transactions
    .filter((tx) => {
      // Use string comparison for dates to avoid timezone issues
      // Include if: startStr <= tx.date <= endStr (8-13 days ago)
      return tx.date >= startStr && tx.date <= endStr;
    })
    .reduce((sum, tx) => sum + tx.total, 0);
}
