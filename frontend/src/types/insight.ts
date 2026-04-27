/**
 * Insight Engine Type Definitions
 *
 * Story 10.1: InsightEngine Service Interface
 * Architecture: architecture-epic10-insight-engine.md
 * Key ADRs: ADR-015 (Client-Side Engine), ADR-016 (Hybrid Storage), ADR-017 (Phase-Based Priority)
 */

import { Timestamp } from 'firebase/firestore';
import type { Transaction } from './transaction';

// ============================================================================
// Core Types
// ============================================================================

/**
 * User maturity phases for insight selection algorithm.
 * ADR-017: Phase-Based Priority System
 *
 * - WEEK_1: First 7 days - prioritize QUIRKY_FIRST for delight
 * - WEEKS_2_3: Days 8-21 - transition to CELEBRATORY/ACTIONABLE
 * - MATURE: Day 22+ - full insight variety with actionable focus
 */
export type UserPhase = 'WEEK_1' | 'WEEKS_2_3' | 'MATURE';

/**
 * Insight categories for selection algorithm.
 * ADR-017: Phase-Based Priority System
 *
 * - QUIRKY_FIRST: Fun, surprising insights (e.g., "Late night snacker!")
 * - CELEBRATORY: Milestone and achievement insights (e.g., "10th scan!")
 * - ACTIONABLE: Data-driven insights (e.g., "3rd visit to Jumbo this month")
 */
export type InsightCategory = 'QUIRKY_FIRST' | 'CELEBRATORY' | 'ACTIONABLE';

// ============================================================================
// Insight Interface
// ============================================================================

/**
 * Core insight interface - the output of insight generation.
 */
export interface Insight {
  /** Unique identifier, snake_case (e.g., "merchant_frequency") */
  id: string;
  /** Category for phase-based selection */
  category: InsightCategory;
  /** Short title (e.g., "Visita frecuente") */
  title: string;
  /** Detailed message (e.g., "3ra vez en Jumbo este mes") */
  message: string;
  /** Optional Lucide icon name */
  icon?: string;
  /** Priority for tie-breaking (higher = better) */
  priority: number;
  /** Which transaction triggered this insight */
  transactionId?: string;
}

// ============================================================================
// Generator Interface
// ============================================================================

/**
 * Interface for all insight generators.
 * Each generator implements canGenerate() to check applicability
 * and generate() to produce the insight.
 */
export interface InsightGenerator {
  /** Unique identifier matching insight id (e.g., "merchant_frequency") */
  id: string;
  /** Category this generator produces */
  category: InsightCategory;
  /**
   * Check if this generator can produce an insight for the transaction.
   * @param tx - Current transaction being saved
   * @param history - All previous transactions for context
   * @returns true if insight can be generated
   */
  canGenerate: (tx: Transaction, history: Transaction[]) => boolean;
  /**
   * Generate the insight for the transaction.
   * Only called if canGenerate() returns true.
   * @param tx - Current transaction being saved
   * @param history - All previous transactions for context
   * @returns The generated insight
   */
  generate: (tx: Transaction, history: Transaction[]) => Insight;
}

// ============================================================================
// Firestore Document Interfaces
// ============================================================================

/**
 * Firestore document: users/{userId}/insightProfile
 * ADR-016: Hybrid Storage - Firestore for durable profile data
 */
export interface UserInsightProfile {
  /** Schema version for future migrations */
  schemaVersion: 1;
  /** Date of user's first transaction (for phase calculation) */
  firstTransactionDate: Timestamp;
  /** Total transaction count (quick access, no need to count) */
  totalTransactions: number;
  /** Last 30 insights shown (for cooldown checking) */
  recentInsights: InsightRecord[];
}

/**
 * Record of a shown insight for cooldown tracking.
 * Story 10a.4/10a.5: Extended with full insight content for history display.
 */
export interface InsightRecord {
  /** Insight identifier (e.g., "merchant_frequency") */
  insightId: string;
  /** When the insight was shown */
  shownAt: Timestamp;
  /** Transaction that triggered this insight */
  transactionId?: string;
  // Story 10a.5: Full insight content for history (optional for backward compatibility)
  /** Short title (e.g., "Visita frecuente") */
  title?: string;
  /** Detailed message (e.g., "3ra vez en Jumbo este mes") */
  message?: string;
  /** Category for display styling */
  category?: InsightCategory;
  /** Lucide icon name for display */
  icon?: string;
  /** Story 14.17: User's intentional/unintentional response (null if dismissed) */
  intentionalResponse?: 'intentional' | 'unintentional' | null;
  /** Story 14.17: When the intentional response was recorded */
  intentionalResponseAt?: Timestamp;
}

// ============================================================================
// Local Storage Interfaces
// ============================================================================

/**
 * localStorage cache: boletapp_insight_cache
 * ADR-016: Hybrid Storage - localStorage for ephemeral cache
 */
export interface LocalInsightCache {
  /** Weekday scan counter for sprinkle distribution */
  weekdayScanCount: number;
  /** Weekend scan counter for sprinkle distribution */
  weekendScanCount: number;
  /** ISO date when counters were last reset (weekly reset) */
  lastCounterReset: string;
  /** ISO date string when insights are silenced until, or null if not silenced */
  silencedUntil: string | null;
  /** Pre-computed aggregates for performance optimization */
  precomputedAggregates?: PrecomputedAggregates;
}

/**
 * Pre-computed aggregates for pattern detection performance.
 * Computed on app load to stay within 100ms performance budget.
 */
export interface PrecomputedAggregates {
  /** Merchant visit counts: { "Jumbo": 3, "Lider": 2 } */
  merchantVisits: Record<string, number>;
  /** Category totals: { "Supermarket": 45000, "Restaurant": 12000 } */
  categoryTotals: Record<string, number>;
  /** ISO timestamp when aggregates were computed */
  computedAt: string;
}

// ============================================================================
// Insight Content Types (shared by repository and hooks)
// Story 15-TD-6: Consolidated from insightProfileRepository + useInsightProfile
// ============================================================================

/** Content payload for recording/displaying insights */
export interface InsightContent {
  title?: string;
  message?: string;
  icon?: string;
  category?: string;
}

/** Full insight content — alias for semantic clarity in hook APIs */
export type FullInsightContent = InsightContent;

// ============================================================================
// Constants
// ============================================================================

/** localStorage key for insight cache */
export const INSIGHT_CACHE_KEY = 'boletapp_insight_cache';

/** Cooldown period for insights (1 week in milliseconds) */
export const INSIGHT_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/** Maximum number of recent insights to store in profile (Story 10a.5: increased for history) */
export const MAX_RECENT_INSIGHTS = 50;

/** Phase thresholds in days */
export const PHASE_THRESHOLDS = {
  WEEK_1_END: 7,
  WEEKS_2_3_END: 21,
} as const;
