/**
 * BatchDiscardDialog - Confirmation dialog for discarding batch receipts
 *
 * Story 14e-23: Extracted from App.tsx to ScanFeature
 *
 * This component reads visibility from the Zustand scan store (activeDialog)
 * and renders the discard confirmation dialog when BATCH_DISCARD dialog is active.
 */
import React from 'react';
import { Trash2, ArrowLeft } from 'lucide-react';
import { useScanStore } from '../store/useScanStore';
import { DIALOG_TYPES } from '../types/scanStateMachine';

interface BatchDiscardDialogProps {
    /** Translation function */
    t: (key: string) => string;
    /** Handler for confirming discard */
    onConfirm: () => void;
    /** Handler for canceling discard */
    onCancel: () => void;
}

/**
 * Batch discard confirmation dialog.
 * Shows when user tries to leave batch review with unsaved results.
 * Reads visibility from scan store's activeDialog state.
 */
export function BatchDiscardDialog({
    t,
    onConfirm,
    onCancel,
}: BatchDiscardDialogProps): React.ReactElement | null {
    const activeDialog = useScanStore((state) => state.activeDialog);

    // Only render when BATCH_DISCARD dialog is active
    if (activeDialog?.type !== DIALOG_TYPES.BATCH_DISCARD) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={onCancel}
        >
            <div
                className="rounded-2xl p-6 max-w-sm w-full shadow-xl"
                style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-light)',
                }}
                onClick={(e) => e.stopPropagation()}
                role="alertdialog"
                aria-labelledby="discard-dialog-title"
                aria-describedby="discard-dialog-desc"
            >
                <h3
                    id="discard-dialog-title"
                    className="text-lg font-bold mb-3"
                    style={{ color: 'var(--text-primary)' }}
                >
                    {t('batchDiscardConfirmTitle')}
                </h3>
                <p
                    id="discard-dialog-desc"
                    className="text-sm mb-6"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    {t('batchDiscardConfirmMessage')}
                </p>
                <div className="flex gap-3">
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-3 rounded-xl font-semibold text-white transition-colors flex items-center justify-center gap-2"
                        style={{ backgroundColor: '#ef4444' }}
                    >
                        <Trash2 size={18} />
                        {t('batchDiscardConfirmYes')}
                    </button>
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
                        style={{
                            backgroundColor: 'var(--bg-tertiary)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-light)',
                        }}
                    >
                        <ArrowLeft size={18} />
                        {t('batchDiscardConfirmNo')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BatchDiscardDialog;
