/**
 * Story 16-1: Core scan slice
 * Story 16-6: images moved to useScanWorkflowStore. Phase/mode/activeDialog mirrored.
 *
 * Phase machine, image management, process lifecycle, save/result actions, control actions.
 * Cross-slice writes: sets credit state (processStart/Success/Error), batch state (image actions).
 * Cross-store writes: images/batchProgress to shared workflow store, phase/mode mirrored.
 *
 * INVARIANT: Dual-State Mirroring Contract (TD-16-4)
 * ──────────────────────────────────────────────────
 * This slice is the SINGLE WRITER to useScanWorkflowStore for mirrored fields.
 * No other code should call wf().setPhase(), wf().setMode(), or wf().setActiveDialog() directly.
 *
 * Mirrored fields (scan store is source of truth, shared store is transport):
 *   - phase:        Written on every phase transition (start*, process*, save*, cancel, reset, restoreState)
 *   - mode:         Written on start actions (startSingle, startBatch, startStatement, restoreState)
 *   - activeDialog: Written by dialogSlice (separate file, same single-writer contract)
 *
 * Owned by shared store (scan writes, consumers read):
 *   - images, batchReceipts, batchProgress, batchEditingIndex
 *
 * If a mirror call is missed, batch-review/transaction-editor will read stale phase from shared store.
 * Integration test: tests/integration/scan-workflow-store.test.ts verifies the full flow.
 */

import type { StateCreator } from 'zustand';
import type { ScanPhase, CreditType, CreditStatus } from '../../types/scanStateMachine';
import { generateRequestId } from '../../types/scanStateMachine';
import type { Transaction } from '@/types/transaction';
import type { BatchReceipt } from '@/types/batchReceipt';
import type { ScanState } from '../../types/scanStateMachine';
import type { ScanFullStoreInternal, ScanCoreSliceInternal } from './types';
import { initialScanState } from './initialState';
import { logGuardViolation } from './guardLog';
import { useScanWorkflowStore } from '@shared/stores/useScanWorkflowStore';

// Shorthand for shared workflow store access (single-writer: only this slice calls wf() mutators)
const wf = () => useScanWorkflowStore.getState();

// TD-18-3: Credit safety net — module-level refund callback registration
// The store can't access the async credit service directly (Zustand stores are sync).
// App layer registers the callback once via registerCreditRefundCallback().
let _creditRefundCallback: ((amount: number) => Promise<void>) | null = null;

export function registerCreditRefundCallback(cb: ((amount: number) => Promise<void>) | null): void {
  _creditRefundCallback = cb;
}

/** Fire-and-forget refund if creditStatus is reserved or confirmed. Logs guard violation. */
function _refundIfOutstanding(get: () => ScanFullStoreInternal, actionName: string): void {
  const state = get();
  if (state.creditStatus === 'reserved' || state.creditStatus === 'confirmed') {
    logGuardViolation({
      action: actionName,
      currentPhase: state.phase,
      expectedPhase: 'any',
      detail: `credit safety net: refunding unredeemed credit (status was '${state.creditStatus}')`,
    });
    if (_creditRefundCallback) {
      _creditRefundCallback(1).catch((err) => {
        logGuardViolation({
          action: actionName,
          currentPhase: state.phase,
          expectedPhase: 'any',
          detail: `credit safety net: refund call failed (${err instanceof Error ? err.message : 'unknown'})`,
        });
      });
    }
  }
}

// Runtime validation sets for restoreState (AC-1)
const VALID_PHASES: ReadonlySet<string> = new Set<ScanPhase>(['idle', 'capturing', 'scanning', 'reviewing', 'saving', 'error']);
const VALID_CREDIT_STATUSES: ReadonlySet<string> = new Set<CreditStatus>(['none', 'reserved', 'confirmed', 'refunded']);

// Workflow fields that restoreState should forward to shared store
const WORKFLOW_KEYS = new Set(['images', 'batchProgress', 'batchReceipts', 'batchEditingIndex']);

export const createScanCoreSlice: StateCreator<
  ScanFullStoreInternal,
  [['zustand/devtools', never]],
  [],
  ScanCoreSliceInternal
> = (set, get) => ({
  // State (images removed — now in useScanWorkflowStore)
  phase: initialScanState.phase,
  mode: initialScanState.mode,
  requestId: initialScanState.requestId,
  userId: initialScanState.userId,
  startedAt: initialScanState.startedAt,
  results: initialScanState.results,
  activeResultIndex: initialScanState.activeResultIndex,
  error: initialScanState.error,
  storeType: initialScanState.storeType,
  currency: initialScanState.currency,

  _guardPhase: (expected: ScanPhase | ScanPhase[], actionName: string): boolean => {
    const state = get();
    const allowed = Array.isArray(expected) ? expected : [expected];
    if (!allowed.includes(state.phase)) {
      logGuardViolation({
        action: actionName,
        currentPhase: state.phase,
        expectedPhase: allowed.join('|'),
      });
      return false;
    }
    return true;
  },

  // START Actions

  startSingle: (userId: string) => {
    if (!get()._guardPhase('idle', 'startSingle')) return;
    set(
      { ...initialScanState, phase: 'capturing', mode: 'single', requestId: generateRequestId(), userId, startedAt: Date.now() },
      undefined, 'scan/startSingle'
    );
    // MIRROR: phase + mode → shared store (scan is source of truth)
    wf().reset();
    wf().setPhase('capturing');
    wf().setMode('single');
  },

  startBatch: (userId: string) => {
    if (!get()._guardPhase('idle', 'startBatch')) return;
    set(
      { ...initialScanState, phase: 'capturing', mode: 'batch', requestId: generateRequestId(), userId, startedAt: Date.now() },
      undefined, 'scan/startBatch'
    );
    // MIRROR: phase + mode + batchProgress → shared store (scan is source of truth)
    wf().reset();
    wf().setPhase('capturing');
    wf().setMode('batch');
    wf().setBatchProgress({ current: 0, total: 0, completed: [], failed: [] });
  },

  startStatement: (userId: string) => {
    if (!get()._guardPhase('idle', 'startStatement')) return;
    set(
      { ...initialScanState, phase: 'capturing', mode: 'statement', requestId: generateRequestId(), userId, startedAt: Date.now() },
      undefined, 'scan/startStatement'
    );
    // MIRROR: phase + mode → shared store (scan is source of truth)
    wf().reset();
    wf().setPhase('capturing');
    wf().setMode('statement');
  },

  // IMAGE Actions (write to shared workflow store)

  addImage: (image: string) => {
    if (!get()._guardPhase('capturing', 'addImage')) return;
    const workflow = wf();
    const newImages = [...workflow.images, image];
    workflow.setImages(newImages);
    // Update batch progress total on shared store
    if (get().mode === 'batch') {
      const bp = workflow.batchProgress;
      if (bp) workflow.setBatchProgress({ ...bp, total: newImages.length });
    }
  },

  removeImage: (index: number) => {
    if (!get()._guardPhase('capturing', 'removeImage')) return;
    const workflow = wf();
    const filteredImages = workflow.images.filter((_, i) => i !== index);
    workflow.setImages(filteredImages);
    if (get().mode === 'batch') {
      const bp = workflow.batchProgress;
      if (bp) workflow.setBatchProgress({ ...bp, total: filteredImages.length });
    }
  },

  setImages: (images: string[]) => {
    if (!get()._guardPhase('capturing', 'setImages')) return;
    const workflow = wf();
    workflow.setImages(images);
    if (get().mode === 'batch') {
      const bp = workflow.batchProgress;
      if (bp) workflow.setBatchProgress({ ...bp, total: images.length });
    }
  },

  // PROCESS Actions

  processStart: (creditType: CreditType, creditsCount: number) => {
    if (!get()._guardPhase('capturing', 'processStart')) return;
    // Read images from shared workflow store
    if (wf().images.length === 0) {
      logGuardViolation({
        action: 'processStart',
        currentPhase: get().phase,
        expectedPhase: 'capturing',
        detail: 'no images in state',
      });
      return;
    }
    set(
      // Cross-slice write: sets creditSlice state (creditStatus, creditType, creditsCount)
      { phase: 'scanning', creditStatus: 'reserved', creditType, creditsCount, error: null },
      undefined, 'scan/processStart'
    );
    wf().setPhase('scanning'); // MIRROR: phase → shared store
  },

  processSuccess: (results: Transaction[]) => {
    if (!get()._guardPhase('scanning', 'processSuccess')) return;
    set(
      // Cross-slice write: sets creditSlice state (creditStatus)
      { phase: 'reviewing', creditStatus: 'confirmed', results, activeResultIndex: 0, error: null },
      undefined, 'scan/processSuccess'
    );
    wf().setPhase('reviewing'); // MIRROR: phase → shared store
    wf().setPendingTransaction(results[0] ?? null); // MIRROR: active result → shared store (TD-16-5)
  },

  processError: (error: string) => {
    if (!get()._guardPhase('scanning', 'processError')) return;
    // Cross-slice write: sets creditSlice state (creditStatus)
    set({ phase: 'error', creditStatus: 'refunded', error }, undefined, 'scan/processError');
    wf().setPhase('error'); // MIRROR: phase → shared store
  },

  // RESULT Actions

  updateResult: (index: number, updates: Partial<Transaction>) => {
    if (!get()._guardPhase('reviewing', 'updateResult')) return;
    const state = get();
    if (index < 0 || index >= state.results.length) {
      logGuardViolation({
        action: 'updateResult',
        currentPhase: state.phase,
        expectedPhase: 'reviewing',
        detail: `invalid result index: ${index}`,
      });
      return;
    }
    const newResults = [...state.results];
    newResults[index] = { ...newResults[index], ...updates };
    set({ results: newResults }, undefined, 'scan/updateResult');
  },

  setActiveResult: (index: number) => {
    const state = get();
    if (state.phase !== 'reviewing') return;
    if (index < 0 || index >= state.results.length) return;
    set({ activeResultIndex: index }, undefined, 'scan/setActiveResult');
  },

  // SAVE Actions

  saveStart: () => {
    if (!get()._guardPhase('reviewing', 'saveStart')) return;
    set({ phase: 'saving' }, undefined, 'scan/saveStart');
    wf().setPhase('saving'); // MIRROR: phase → shared store
  },

  saveSuccess: () => {
    if (!get()._guardPhase('saving', 'saveSuccess')) return;
    // TD-18-3: No _refundIfOutstanding here — credit was legitimately spent (transaction saved).
    set({ ...initialScanState }, undefined, 'scan/saveSuccess');
    wf().reset(); // MIRROR: full reset → shared store (clears phase, mode, images, etc.)
  },

  saveError: (error: string) => {
    if (!get()._guardPhase('saving', 'saveError')) return;
    set({ phase: 'reviewing', error }, undefined, 'scan/saveError');
    wf().setPhase('reviewing'); // MIRROR: phase → shared store
  },

  // CONTROL Actions

  cancel: () => {
    if (get().phase === 'saving') {
      logGuardViolation({
        action: 'cancel',
        currentPhase: 'saving',
        expectedPhase: 'idle|capturing|scanning|reviewing|error',
        detail: 'cannot cancel during save',
      });
      return;
    }
    // TD-18-3: Credit safety net — refund if credit is still outstanding
    _refundIfOutstanding(get, 'cancel');
    set({ ...initialScanState }, undefined, 'scan/cancel');
    wf().reset(); // MIRROR: full reset → shared store
  },

  reset: () => {
    // TD-18-3: Credit safety net — refund if credit is still outstanding
    _refundIfOutstanding(get, 'reset');
    set({ ...initialScanState }, undefined, 'scan/reset');
    wf().reset(); // MIRROR: full reset → shared store
  },

  restoreState: (restoredState: Partial<ScanState>) => {
    // Runtime shape validation
    if (!restoredState || typeof restoredState !== 'object') {
      logGuardViolation({
        action: 'restoreState',
        currentPhase: get().phase,
        expectedPhase: 'any',
        detail: 'invalid restoreState input: not an object',
      });
      return;
    }

    // Include both scan-local and workflow keys for validation
    const scanKeys = new Set(Object.keys(initialScanState));
    const allKnownKeys = new Set([...scanKeys, ...WORKFLOW_KEYS]);
    const unknownKeys = Object.keys(restoredState).filter((k) => !allKnownKeys.has(k));
    if (unknownKeys.length > 0) {
      logGuardViolation({
        action: 'restoreState',
        currentPhase: get().phase,
        expectedPhase: 'any',
        detail: `unknown keys: ${unknownKeys.join(', ')}`,
      });
    }

    // Separate scan-local fields from workflow fields
    const scanFiltered: Record<string, unknown> = {};
    const workflowFiltered: Record<string, unknown> = {};
    for (const key of Object.keys(restoredState)) {
      if (WORKFLOW_KEYS.has(key)) {
        workflowFiltered[key] = (restoredState as Record<string, unknown>)[key];
      } else if (scanKeys.has(key)) {
        scanFiltered[key] = (restoredState as Record<string, unknown>)[key];
      }
    }

    // AC-1: Runtime value-type validation for critical fields
    if ('phase' in scanFiltered && (typeof scanFiltered.phase !== 'string' || !VALID_PHASES.has(scanFiltered.phase))) {
      logGuardViolation({
        action: 'restoreState',
        currentPhase: get().phase,
        expectedPhase: 'any',
        detail: `invalid phase: ${String(scanFiltered.phase)}`,
      });
      scanFiltered.phase = initialScanState.phase;
    }

    if ('images' in workflowFiltered && !Array.isArray(workflowFiltered.images)) {
      logGuardViolation({
        action: 'restoreState',
        currentPhase: get().phase,
        expectedPhase: 'any',
        detail: `invalid images: expected array, got ${typeof workflowFiltered.images}`,
      });
      workflowFiltered.images = [];
    }

    // Size bound: reject unreasonably large images arrays (corruption guard)
    if (Array.isArray(workflowFiltered.images) && (workflowFiltered.images as string[]).length > 100) {
      logGuardViolation({
        action: 'restoreState',
        currentPhase: get().phase,
        expectedPhase: 'any',
        detail: `images array too large: ${(workflowFiltered.images as string[]).length} (max 100)`,
      });
      workflowFiltered.images = [];
    }

    if ('creditStatus' in scanFiltered && (typeof scanFiltered.creditStatus !== 'string' || !VALID_CREDIT_STATUSES.has(scanFiltered.creditStatus))) {
      logGuardViolation({
        action: 'restoreState',
        currentPhase: get().phase,
        expectedPhase: 'any',
        detail: `invalid creditStatus: ${String(scanFiltered.creditStatus)}`,
      });
      scanFiltered.creditStatus = initialScanState.creditStatus;
    }

    // MIRROR: forward workflow fields to shared store (images, batchProgress, batchReceipts, batchEditingIndex)
    const workflow = wf();
    if ('images' in workflowFiltered) workflow.setImages(workflowFiltered.images as string[]);
    if ('batchProgress' in workflowFiltered) workflow.setBatchProgress(workflowFiltered.batchProgress as Parameters<typeof workflow.setBatchProgress>[0]);
    if ('batchReceipts' in workflowFiltered && workflowFiltered.batchReceipts != null) workflow.setBatchReceipts(workflowFiltered.batchReceipts as BatchReceipt[]);
    if ('batchEditingIndex' in workflowFiltered) workflow.setBatchEditingIndex(workflowFiltered.batchEditingIndex as number | null);

    if ((scanFiltered as Partial<ScanState>).phase === 'scanning') {
      set(
        { ...initialScanState, ...scanFiltered, phase: 'error', creditStatus: 'refunded',
          error: 'Escaneo interrumpido. Intenta de nuevo.' },
        undefined, 'scan/restoreState'
      );
      wf().setPhase('error');
      return;
    }
    set({ ...initialScanState, ...scanFiltered }, undefined, 'scan/restoreState');
    // MIRROR: phase + mode → shared store (restoring persisted state)
    const restoredPhase = (scanFiltered.phase as ScanPhase) ?? initialScanState.phase;
    const restoredMode = (scanFiltered.mode as typeof initialScanState.mode) ?? initialScanState.mode;
    wf().setPhase(restoredPhase);
    wf().setMode(restoredMode);
  },
});
