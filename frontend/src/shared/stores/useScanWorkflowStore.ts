/**
 * Story 16-6: Shared Scan Workflow Store
 *
 * Holds scan workflow DATA that batch-review and transaction-editor features
 * need. The scan feature WRITES to this store (via phase-guarded actions).
 * Consumers READ from this store. No phase guards here — scan mediates access.
 *
 * Coupling: scan (writer), batch-review (reader), transaction-editor (reader)
 *
 * State owned (lives only in shared store):
 * - images, batchReceipts, batchProgress, batchEditingIndex
 *
 * State mirrored (scan store is source of truth, shared store is transport):
 * - phase, mode, activeDialog
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { ScanPhase, ScanMode, BatchProgress, DialogState } from '@shared/types/scanWorkflow';
import type { BatchReceipt } from '@/types/batchReceipt';
import type { Transaction } from '@/types/transaction';

// =============================================================================
// State Interface
// =============================================================================

export interface ScanWorkflowState {
  // Owned data — shared across features
  images: string[];
  batchReceipts: BatchReceipt[] | null;
  batchProgress: BatchProgress | null;
  batchEditingIndex: number | null;
  mode: ScanMode;

  // Mirrored state — scan writes, consumers read
  phase: ScanPhase;
  activeDialog: DialogState | null;

  // Handoff slot — scan writes active result, transaction-editor reads (TD-16-5)
  pendingTransaction: Transaction | null;
}

export interface ScanWorkflowActions {
  // Image actions
  setImages: (images: string[]) => void;
  addImage: (image: string) => void;
  removeImage: (index: number) => void;

  // Batch receipt actions
  setBatchReceipts: (receipts: BatchReceipt[]) => void;
  updateBatchReceipt: (id: string, updates: Partial<BatchReceipt>) => void;
  discardBatchReceipt: (id: string) => void;
  clearBatchReceipts: () => void;

  // Batch progress actions
  setBatchProgress: (progress: BatchProgress | null) => void;

  // Batch editing index actions
  setBatchEditingIndex: (index: number | null) => void;

  // Mode actions
  setMode: (mode: ScanMode) => void;

  // Mirrored state actions
  setPhase: (phase: ScanPhase) => void;
  setActiveDialog: (dialog: DialogState | null) => void;

  // Handoff slot actions (TD-16-5)
  setPendingTransaction: (tx: Transaction | null) => void;

  // Control
  reset: () => void;
}

type ScanWorkflowStore = ScanWorkflowState & ScanWorkflowActions;

// =============================================================================
// Initial State
// =============================================================================

const initialWorkflowState: ScanWorkflowState = {
  images: [],
  batchReceipts: null,
  batchProgress: null,
  batchEditingIndex: null,
  mode: 'single',
  phase: 'idle',
  activeDialog: null,
  pendingTransaction: null,
};

// =============================================================================
// Store
// =============================================================================

export const useScanWorkflowStore = create<ScanWorkflowStore>()(
  devtools(
    (set, get) => ({
      ...initialWorkflowState,

      // Image actions
      setImages: (images) => set({ images }, undefined, 'workflow/setImages'),
      addImage: (image) =>
        set(
          (state) => ({ images: [...state.images, image] }),
          undefined,
          'workflow/addImage',
        ),
      removeImage: (index) =>
        set(
          (state) => ({ images: state.images.filter((_, i) => i !== index) }),
          undefined,
          'workflow/removeImage',
        ),

      // Batch receipt actions
      setBatchReceipts: (receipts) =>
        set({ batchReceipts: receipts }, undefined, 'workflow/setBatchReceipts'),
      updateBatchReceipt: (id, updates) => {
        const { batchReceipts } = get();
        if (!batchReceipts) return;
        const idx = batchReceipts.findIndex((r) => r.id === id);
        if (idx === -1) return;
        const updated = [...batchReceipts];
        updated[idx] = { ...updated[idx], ...updates };
        set({ batchReceipts: updated }, undefined, 'workflow/updateBatchReceipt');
      },
      discardBatchReceipt: (id) =>
        set(
          (state) => ({
            batchReceipts: state.batchReceipts?.filter((r) => r.id !== id) ?? null,
          }),
          undefined,
          'workflow/discardBatchReceipt',
        ),
      clearBatchReceipts: () =>
        set({ batchReceipts: null }, undefined, 'workflow/clearBatchReceipts'),

      // Batch progress actions
      setBatchProgress: (progress) =>
        set({ batchProgress: progress }, undefined, 'workflow/setBatchProgress'),

      // Batch editing index actions
      setBatchEditingIndex: (index) =>
        set({ batchEditingIndex: index }, undefined, 'workflow/setBatchEditingIndex'),

      // Mode actions
      setMode: (mode) => set({ mode }, undefined, 'workflow/setMode'),

      // Mirrored state actions
      setPhase: (phase) => set({ phase }, undefined, 'workflow/setPhase'),
      setActiveDialog: (dialog) =>
        set({ activeDialog: dialog }, undefined, 'workflow/setActiveDialog'),

      // Handoff slot actions (TD-16-5)
      setPendingTransaction: (tx) =>
        set({ pendingTransaction: tx }, undefined, 'workflow/setPendingTransaction'),

      // Control
      reset: () => set({ ...initialWorkflowState }, undefined, 'workflow/reset'),
    }),
    { enabled: import.meta.env.DEV, name: 'ScanWorkflowStore' },
  ),
);

// =============================================================================
// Selectors
// =============================================================================

export const useWorkflowImages = () => useScanWorkflowStore((s) => s.images);
export const useWorkflowBatchReceipts = () => useScanWorkflowStore((s) => s.batchReceipts);
export const useWorkflowBatchProgress = () => useScanWorkflowStore((s) => s.batchProgress);
export const useWorkflowBatchEditingIndex = () => useScanWorkflowStore((s) => s.batchEditingIndex);
export const useWorkflowMode = () => useScanWorkflowStore((s) => s.mode);
export const useWorkflowPhase = () => useScanWorkflowStore((s) => s.phase);
export const useWorkflowIsProcessing = () =>
  useScanWorkflowStore((s) => s.phase === 'scanning' || s.phase === 'saving');
export const useWorkflowActiveDialog = () => useScanWorkflowStore((s) => s.activeDialog);
export const useWorkflowImageCount = () => useScanWorkflowStore((s) => s.images.length);
export const useWorkflowPendingTransaction = () => useScanWorkflowStore((s) => s.pendingTransaction);

/**
 * Combined selector for multiple workflow values (uses useShallow).
 * pendingTransaction intentionally excluded — use useWorkflowPendingTransaction()
 * to avoid unnecessary re-renders in consumers that don't need the handoff slot.
 */
export const useWorkflowState = () =>
  useScanWorkflowStore(
    useShallow((s) => ({
      images: s.images,
      batchReceipts: s.batchReceipts,
      batchProgress: s.batchProgress,
      batchEditingIndex: s.batchEditingIndex,
      mode: s.mode,
      phase: s.phase,
      activeDialog: s.activeDialog,
    })),
  );

// =============================================================================
// Direct Access (non-React code)
// =============================================================================

export const getWorkflowState = () => useScanWorkflowStore.getState();

