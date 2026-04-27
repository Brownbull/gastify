/**
 * TransactionEditorScanStatus — Scan-aware overlay component
 *
 * Story 16-5: Extracted from TransactionEditorViewInternal.tsx
 * Centralizes all @features/scan imports for clean downstream migration (Story 16-6).
 *
 * This component is NOT purely presentational — it accesses the scan Zustand store
 * directly, which is the deliberate design choice for isolating scan dependencies.
 */

import { useState, useRef, useEffect } from 'react';
import { ProcessingOverlay, ScanCompleteModal } from '@features/scan/components';
import { useWorkflowIsProcessing as useScanIsProcessing, useWorkflowActiveDialog as useScanActiveDialog } from '@shared/stores';
import { DIALOG_TYPES } from '@shared/types/scanWorkflow';
import type { Transaction } from '@/types/transaction';
import type { ScanButtonState } from './TransactionEditorView/editorViewTypes';
import type { Language } from '@/utils/translations';

export interface TransactionEditorScanStatusProps {
  scanButtonState: ScanButtonState;
  isProcessing: boolean;
  processingEta?: number | null;
  skipScanCompleteModal?: boolean;
  transaction: Transaction | null;
  mode: 'new' | 'existing';
  onSaveWithLearning: () => Promise<void>;
  theme: 'light' | 'dark';
  t: (key: string) => string;
  formatCurrency: (amount: number, currency: string) => string;
  currency: string;
  lang: Language;
  isSaving: boolean;
}

export function TransactionEditorScanStatus({
  scanButtonState,
  isProcessing,
  processingEta,
  skipScanCompleteModal = false,
  transaction,
  mode,
  onSaveWithLearning,
  theme,
  t,
  formatCurrency,
  currency,
  lang,
  // isSaving from parent is intentionally unused — local isSavingFromModal drives the modal (TD-18-5)
  isSaving: _isSaving,
}: TransactionEditorScanStatusProps) {
  // Scan store hooks — this component centralizes all @features/scan store imports
  const scanStoreIsProcessing = useScanIsProcessing();
  const scanActiveDialog = useScanActiveDialog();
  const isQuickSaveDialogActive = scanActiveDialog?.type === DIALOG_TYPES.QUICKSAVE;
  const effectiveIsProcessing = scanStoreIsProcessing || isProcessing;

  // ScanCompleteModal state (for new transactions only)
  const [showScanCompleteModal, setShowScanCompleteModal] = useState(false);
  // Local saving flag: tracks save-in-progress from modal to prevent premature close (TD-18-5)
  const [isSavingFromModal, setIsSavingFromModal] = useState(false);
  const prevScanButtonStateRef = useRef<ScanButtonState>(scanButtonState);

  // Show ScanCompleteModal when scan TRANSITIONS to complete for NEW transactions
  // Only trigger when state changes FROM non-complete TO complete, not on mount
  useEffect(() => {
    const prevState = prevScanButtonStateRef.current;
    prevScanButtonStateRef.current = scanButtonState;

    if (
      mode === 'new' &&
      scanButtonState === 'complete' &&
      prevState !== 'complete' &&
      transaction &&
      !isQuickSaveDialogActive &&
      !skipScanCompleteModal
    ) {
      setShowScanCompleteModal(true);
    }
  }, [mode, scanButtonState, transaction, skipScanCompleteModal, isQuickSaveDialogActive]);

  const handleScanCompleteSave = async () => {
    setIsSavingFromModal(true);
    try {
      await onSaveWithLearning();
    } catch {
      // Error display handled by onSaveWithLearning (toast). Reset modal state for retry.
      setIsSavingFromModal(false);
    }
  };

  const handleScanCompleteEdit = () => {
    setShowScanCompleteModal(false);
  };

  return (
    <>
      <ProcessingOverlay
        visible={effectiveIsProcessing}
        theme={theme}
        t={t}
        eta={processingEta}
      />

      <ScanCompleteModal
        visible={showScanCompleteModal}
        transaction={transaction}
        onSave={handleScanCompleteSave}
        onEdit={handleScanCompleteEdit}
        onDismiss={handleScanCompleteEdit}
        theme={theme}
        t={t}
        formatCurrency={formatCurrency}
        currency={currency}
        lang={lang}
        isSaving={isSavingFromModal}
      />
    </>
  );
}
