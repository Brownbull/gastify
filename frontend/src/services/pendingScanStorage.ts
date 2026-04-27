/**
 * Pending Scan Storage Service
 *
 * Story 14d.4d: pendingScan Migration
 * Updated to store ScanState (new format) with backwards compatibility for PendingScan (old format).
 *
 * Story 14d.5e: Batch Persistence Migration
 * Extended to handle PendingBatch format migration from separate storage key.
 * Now also loads and migrates data from `boletapp_pending_batch_${userId}`.
 *
 * Storage Format History:
 * - v0 (pre-14d): PendingScan interface { sessionId, images, analyzedTransaction, createdAt, status, error }
 * - v1 (14d.4d+): PersistedScanState interface { version, state: ScanState, persistedAt }
 * - v1.5 (14d.5e): Also migrates PendingBatch format from separate storage key
 *
 * The pending scan is stored per-user to avoid conflicts when switching accounts.
 * Images are stored as base64 strings which can be large, so we use a size limit.
 */

import type { ScanState, PersistedScanState, ScanPhase, BatchReceipt, BatchProgress } from '@shared/types/scanWorkflow';
import { SCAN_STATE_VERSION, generateRequestId } from '@shared/types/scanWorkflow';
import type { PendingScan, PendingScanStatus } from '../types/scan';
import type { Transaction } from '../types/transaction';
// Story 14d.5e: Import ProcessingResult for PendingBatch migration
import type { ProcessingResult } from './batchProcessingService';

const STORAGE_KEY_PREFIX = 'boletapp_pending_scan_';
const BATCH_STORAGE_KEY_PREFIX = 'boletapp_pending_batch_'; // Story 14d.5e: Old batch key
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB max per image

/**
 * Get the storage key for a specific user
 */
function getStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

// =============================================================================
// Migration from Old Format (PendingScan -> ScanState)
// =============================================================================

/**
 * Map old PendingScanStatus to new ScanPhase.
 *
 * Old status values: 'images_added' | 'analyzing' | 'analyzed' | 'error'
 * New phase values: 'idle' | 'capturing' | 'scanning' | 'reviewing' | 'saving' | 'error'
 */
function mapStatusToPhase(status: PendingScanStatus | undefined): ScanPhase {
  switch (status) {
    case 'images_added':
      return 'capturing';
    case 'analyzing':
      // If we were analyzing when the app closed, we can't resume - treat as error
      return 'error';
    case 'analyzed':
      return 'reviewing';
    case 'error':
      return 'error';
    default:
      return 'idle';
  }
}

/**
 * Migrate old PendingScan format to new ScanState format.
 * Used for backwards compatibility when loading old data.
 */
function migrateOldFormat(old: PendingScan): ScanState {
  const phase = mapStatusToPhase(old.status);

  // If status was 'analyzing', the scan was interrupted - set error message
  const error =
    old.status === 'analyzing'
      ? 'Escaneo interrumpido. Intenta de nuevo.'
      : old.error || null;

  return {
    // Core state
    phase,
    mode: 'single', // Old format only supported single mode

    // Request identity
    requestId: old.sessionId || generateRequestId(),
    userId: null, // Not stored in old format, will be set on load
    startedAt: old.createdAt ? new Date(old.createdAt).getTime() : Date.now(),

    // Image data
    images: old.images || [],

    // Results - if we have an analyzed transaction, put it in results
    results: old.analyzedTransaction ? [old.analyzedTransaction] : [],
    activeResultIndex: 0,

    // Credit tracking - old format didn't track credits in storage
    // If we have an analyzed transaction, credit was spent
    creditStatus: old.analyzedTransaction ? 'confirmed' : 'none',
    creditType: old.analyzedTransaction ? 'normal' : null,
    creditsCount: old.analyzedTransaction ? 1 : 0,

    // Dialog state - not stored in old format
    activeDialog: null,

    // Error state
    error,

    // Batch mode - not supported in old format
    batchProgress: null,
    batchReceipts: null, // Story 14d.5c
    batchEditingIndex: null, // Story 14d.5d

    // Pre-scan options - not stored in old format
    storeType: null,
    currency: null,
  };
}

/**
 * Check if stored data is old format (PendingScan).
 * Old format has 'sessionId' at root level, new format has 'version' and 'state'.
 */
function isOldFormat(data: unknown): data is PendingScan {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  // Old format has sessionId at root, new format has version
  return 'sessionId' in obj && !('version' in obj);
}

/**
 * Check if stored data is new format (PersistedScanState).
 */
function isNewFormat(data: unknown): data is PersistedScanState {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return 'version' in obj && 'state' in obj && typeof obj.version === 'number';
}

// =============================================================================
// Story 14d.5e: Migration from PendingBatch Format
// =============================================================================

/**
 * Old PendingBatch status values from pendingBatchStorage.ts
 */
type PendingBatchStatus = 'capturing' | 'processing' | 'reviewing' | 'editing';

/**
 * Old PendingBatch interface from pendingBatchStorage.ts (Story 12.1)
 */
interface LegacyPendingBatch {
  sessionId: string;
  images: string[];
  results: ProcessingResult[];
  status: PendingBatchStatus;
  createdAt: string; // ISO date string
  creditsUsed: number;
  editingIndex?: number;
}

/**
 * Map old PendingBatchStatus to new ScanPhase.
 */
function mapBatchStatusToPhase(status: PendingBatchStatus | undefined): ScanPhase {
  switch (status) {
    case 'capturing':
      return 'capturing';
    case 'processing':
      // If we were processing when the app closed, treat as error (can't resume API calls)
      return 'error';
    case 'reviewing':
    case 'editing':
      return 'reviewing';
    default:
      return 'idle';
  }
}

/**
 * Check if stored data is old PendingBatch format.
 * Has 'sessionId' and 'status' (batch status values) and 'creditsUsed'.
 */
function isLegacyBatchFormat(data: unknown): data is LegacyPendingBatch {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  // Must have sessionId and creditsUsed (unique to batch), and batch-specific status
  return (
    'sessionId' in obj &&
    'creditsUsed' in obj &&
    'status' in obj &&
    ['capturing', 'processing', 'reviewing', 'editing'].includes(obj.status as string)
  );
}

/**
 * Convert ProcessingResult (from batch) to BatchReceipt for state machine.
 * Note: ProcessingResult uses `result` for transaction, not `transaction`.
 */
function processingResultToBatchReceipt(procResult: ProcessingResult, index: number, imageUrl?: string): BatchReceipt {
  // ProcessingResult.result contains the Transaction (if successful)
  const transaction = procResult.result;

  // Provide a placeholder transaction if missing (shouldn't happen for successful results)
  // Must include all required Transaction fields
  const safeTransaction: Transaction = transaction ?? {
    merchant: 'Unknown',
    total: 0,
    date: new Date().toISOString().split('T')[0],
    category: 'Other' as const, // Required field - use generic category
    items: [],
  };

  return {
    id: `batch-receipt-${index}-${Date.now()}`,
    index,
    imageUrl,
    transaction: safeTransaction,
    status: procResult.error ? 'error' : procResult.success ? 'ready' : 'review',
    confidence: 0.8, // Default confidence for migrated results
    error: procResult.error,
  };
}

/**
 * Migrate old PendingBatch format to ScanState.
 */
function migrateOldBatchFormat(old: LegacyPendingBatch, userId: string): ScanState {
  const phase = mapBatchStatusToPhase(old.status);

  // If status was 'processing', the batch was interrupted - set error message
  const error =
    old.status === 'processing'
      ? 'Procesamiento de lote interrumpido. Los créditos ya se usaron.'
      : null;

  // Convert results to BatchReceipts
  const batchReceipts: BatchReceipt[] | null =
    old.results.length > 0
      ? old.results.map((result, index) =>
          processingResultToBatchReceipt(result, index, old.images[index])
        )
      : null;

  // Build batch progress from results
  // Note: ProcessingResult uses 'result' for transaction, not 'transaction'
  const batchProgress: BatchProgress | null =
    old.results.length > 0
      ? {
          current: old.results.length,
          total: old.images.length || old.results.length,
          completed: old.results
            .filter((r) => r.result && !r.error)
            .map((r) => r.result!),
          failed: old.results
            .filter((r) => r.error)
            .map((r, i) => ({ index: i, error: r.error || 'Unknown error' })),
        }
      : null;

  // Extract transactions from successful results
  const results: Transaction[] = old.results
    .filter((r) => r.result && !r.error)
    .map((r) => r.result!);

  return {
    // Core state
    phase,
    mode: 'batch',

    // Request identity
    requestId: old.sessionId || generateRequestId(),
    userId,
    startedAt: old.createdAt ? new Date(old.createdAt).getTime() : Date.now(),

    // Image data
    images: old.images || [],

    // Results
    results,
    activeResultIndex: 0,

    // Credit tracking - batch uses super credits
    creditStatus: old.creditsUsed > 0 ? 'confirmed' : 'none',
    creditType: old.creditsUsed > 0 ? 'super' : null,
    creditsCount: old.creditsUsed || 0,

    // Dialog state
    activeDialog: null,

    // Error state
    error,

    // Batch mode data
    batchProgress,
    batchReceipts,
    batchEditingIndex: old.editingIndex ?? null,

    // Pre-scan options - not stored in old format
    storeType: null,
    currency: null,
  };
}

/**
 * Story 14d.5e: Get the old batch storage key for a specific user.
 */
function getBatchStorageKey(userId: string): string {
  return `${BATCH_STORAGE_KEY_PREFIX}${userId}`;
}

/**
 * Story 14d.5e: Load and migrate old PendingBatch from separate storage key.
 * Returns migrated ScanState or null if no batch found.
 * Also clears the old batch storage key after successful migration.
 */
function loadAndMigrateLegacyBatch(userId: string): ScanState | null {
  const batchKey = getBatchStorageKey(userId);

  try {
    const stored = localStorage.getItem(batchKey);
    if (!stored) {
      return null;
    }

    const parsed = JSON.parse(stored);

    if (isLegacyBatchFormat(parsed)) {
      if (import.meta.env.DEV) {
        console.log('[pendingScanStorage] Migrating legacy PendingBatch to ScanState');
      }

      const migrated = migrateOldBatchFormat(parsed, userId);

      // Clear the old batch storage after successful migration
      localStorage.removeItem(batchKey);

      return migrated;
    }

    return null;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[pendingScanStorage] Failed to load legacy batch:', error);
    }
    return null;
  }
}

/**
 * Story 14d.5e: Clear old batch storage key if it exists.
 */
export function clearLegacyBatchStorage(userId: string): void {
  if (!userId) return;
  const batchKey = getBatchStorageKey(userId);
  localStorage.removeItem(batchKey);
}

/**
 * Story 14d.5e: Check if legacy batch storage exists.
 */
export function hasLegacyBatchStorage(userId: string): boolean {
  if (!userId) return false;
  const batchKey = getBatchStorageKey(userId);
  return localStorage.getItem(batchKey) !== null;
}

// =============================================================================
// New Format Serialization (PersistedScanState)
// =============================================================================

/**
 * Serialize ScanState for storage.
 * Filters out oversized images and creates versioned wrapper.
 */
function serializeScanState(state: ScanState): string {
  // Filter out oversized images with warning
  const filteredImages = state.images.filter((img, index) => {
    const size = img.length;
    if (size > MAX_IMAGE_SIZE_BYTES) {
      if (import.meta.env.DEV) {
        console.warn(`Image ${index} exceeds max size (${size} bytes), skipping storage`);
      }
      return false;
    }
    return true;
  });

  const persisted: PersistedScanState = {
    version: SCAN_STATE_VERSION,
    state: {
      ...state,
      images: filteredImages,
    },
    persistedAt: Date.now(),
  };

  return JSON.stringify(persisted);
}

/**
 * Deserialize ScanState from storage.
 * Handles both old and new formats with automatic migration.
 */
function deserializeScanState(json: string, userId: string): ScanState | null {
  try {
    const parsed = JSON.parse(json);

    // Check for old format and migrate
    if (isOldFormat(parsed)) {
      if (import.meta.env.DEV) {
        console.log('[pendingScanStorage] Migrating old PendingScan format to ScanState');
      }
      const migrated = migrateOldFormat(parsed);
      // Set userId since old format didn't store it
      migrated.userId = userId;
      return migrated;
    }

    // New format
    if (isNewFormat(parsed)) {
      // Version check for future migrations
      if (parsed.version !== SCAN_STATE_VERSION) {
        if (import.meta.env.DEV) {
          console.warn(`[pendingScanStorage] Unknown version ${parsed.version}, attempting to load`);
        }
      }

      const state = parsed.state;

      // Validate essential fields
      if (!state || typeof state !== 'object') {
        console.warn('[pendingScanStorage] Invalid state structure');
        return null;
      }

      // Set userId if not present (shouldn't happen, but be safe)
      if (!state.userId) {
        state.userId = userId;
      }

      return state as ScanState;
    }

    if (import.meta.env.DEV) {
      console.warn('[pendingScanStorage] Unknown storage format');
    }
    return null;
  } catch (error) {
    console.error('[pendingScanStorage] Failed to parse from storage:', error);
    return null;
  }
}

// =============================================================================
// Public API - New Format (Recommended)
// =============================================================================

/**
 * Save ScanState to localStorage for a specific user.
 * Returns true if successful, false otherwise.
 *
 * Story 14d.4d: This is the new recommended API.
 */
export function savePersistedScanState(userId: string, state: ScanState | null): boolean {
  if (!userId) {
    if (import.meta.env.DEV) {
      console.warn('[pendingScanStorage] Cannot save: no userId');
    }
    return false;
  }

  const key = getStorageKey(userId);

  try {
    if (state === null) {
      // Clear the stored state
      localStorage.removeItem(key);
      return true;
    }

    const serialized = serializeScanState(state);
    localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    // Handle quota exceeded or other storage errors
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('[pendingScanStorage] localStorage quota exceeded');
      // Try to save without images as fallback
      try {
        // state is guaranteed non-null here (null case returns early above)
        const stateWithoutImages = { ...state!, images: [] as string[] };
        localStorage.setItem(key, serializeScanState(stateWithoutImages));
        if (import.meta.env.DEV) {
          console.warn('[pendingScanStorage] Saved without images due to quota');
        }
        return true;
      } catch {
        return false;
      }
    }
    console.error('[pendingScanStorage] Failed to save:', error);
    return false;
  }
}

/**
 * Load ScanState from localStorage for a specific user.
 * Handles backwards compatibility with old PendingScan format.
 * Returns null if no state is stored or if parsing fails.
 *
 * Story 14d.4d: This is the new recommended API.
 */
export function loadPersistedScanState(userId: string): ScanState | null {
  if (!userId) {
    return null;
  }

  const key = getStorageKey(userId);

  try {
    const stored = localStorage.getItem(key);
    if (stored) {
      return deserializeScanState(stored, userId);
    }

    // Story 14d.5e: No regular scan state found - check for legacy batch storage
    // This handles migration from the old pendingBatchStorage system
    const legacyBatchState = loadAndMigrateLegacyBatch(userId);
    if (legacyBatchState) {
      if (import.meta.env.DEV) {
        console.log('[pendingScanStorage] Migrated legacy batch storage to ScanState');
      }
      return legacyBatchState;
    }

    return null;
  } catch (error) {
    console.error('[pendingScanStorage] Failed to load:', error);
    return null;
  }
}

/**
 * Clear scan state from localStorage for a specific user.
 *
 * Story 14d.4d: Works with both old and new formats.
 */
export function clearPersistedScanState(userId: string): void {
  if (!userId) {
    return;
  }

  const key = getStorageKey(userId);
  localStorage.removeItem(key);
}

/**
 * Check if a scan state exists in storage for a specific user.
 *
 * Story 14d.4d: Works with both old and new formats.
 */
export function hasPersistedScanState(userId: string): boolean {
  if (!userId) {
    return false;
  }

  const key = getStorageKey(userId);
  return localStorage.getItem(key) !== null;
}

/**
 * Get storage usage info for debugging.
 */
export function getScanStateStorageInfo(userId: string): {
  exists: boolean;
  sizeBytes: number;
  imageCount: number;
  resultCount: number;
  phase: ScanPhase | null;
  isLegacyFormat: boolean;
} {
  if (!userId) {
    return { exists: false, sizeBytes: 0, imageCount: 0, resultCount: 0, phase: null, isLegacyFormat: false };
  }

  const key = getStorageKey(userId);
  const stored = localStorage.getItem(key);

  if (!stored) {
    return { exists: false, sizeBytes: 0, imageCount: 0, resultCount: 0, phase: null, isLegacyFormat: false };
  }

  try {
    const parsed = JSON.parse(stored);
    const isLegacy = isOldFormat(parsed);

    if (isLegacy) {
      const old = parsed as PendingScan;
      return {
        exists: true,
        sizeBytes: stored.length * 2, // UTF-16 encoding
        imageCount: old.images?.length || 0,
        resultCount: old.analyzedTransaction ? 1 : 0,
        phase: mapStatusToPhase(old.status),
        isLegacyFormat: true,
      };
    }

    if (isNewFormat(parsed)) {
      const state = parsed.state as ScanState;
      return {
        exists: true,
        sizeBytes: stored.length * 2,
        imageCount: state.images?.length || 0,
        resultCount: state.results?.length || 0,
        phase: state.phase || null,
        isLegacyFormat: false,
      };
    }

    return { exists: true, sizeBytes: stored.length * 2, imageCount: 0, resultCount: 0, phase: null, isLegacyFormat: false };
  } catch {
    return { exists: true, sizeBytes: stored.length * 2, imageCount: 0, resultCount: 0, phase: null, isLegacyFormat: false };
  }
}

// Story 15-TD-7: Legacy API functions removed (savePendingScan, loadPendingScan,
// clearPendingScan, hasPendingScan, updatePendingScanTransaction,
// updatePendingScanImages, getPendingScanStorageInfo).
// All consumers migrated to new API (savePersistedScanState, etc.) in Story 14d.4e.
