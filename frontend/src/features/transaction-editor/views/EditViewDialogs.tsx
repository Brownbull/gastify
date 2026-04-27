/**
 * Story 15b-2a: Confirmation dialogs sub-component extracted from EditView.tsx.
 * Renders the 3 confirmation dialogs: Cancel, Re-scan, Delete.
 * NOTE: Learning prompt modals (CategoryLearningPrompt, SubcategoryLearningPrompt, LearnMerchantDialog)
 * remain in EditView.tsx.
 */
import React from 'react';
import { RefreshCw, Trash2, ChevronLeft } from 'lucide-react';
import { PendingScan } from '@/types/scan';

interface EditViewDialogsProps {
    showCancelConfirm: boolean;
    setShowCancelConfirm: (val: boolean) => void;
    handleConfirmCancel: () => void;
    pendingScan?: PendingScan | null;
    isDark: boolean;
    t: (key: string) => string;
    showRescanConfirm: boolean;
    setShowRescanConfirm: (val: boolean) => void;
    handleConfirmRescan: () => Promise<void>;
    showDeleteConfirm: boolean;
    setShowDeleteConfirm: (val: boolean) => void;
    currentTransaction: { id?: string; merchant?: string };
    onDelete: (id: string) => void;
}

export const EditViewDialogs: React.FC<EditViewDialogsProps> = ({
    showCancelConfirm,
    setShowCancelConfirm,
    handleConfirmCancel,
    pendingScan,
    isDark,
    t,
    showRescanConfirm,
    setShowRescanConfirm,
    handleConfirmRescan,
    showDeleteConfirm,
    setShowDeleteConfirm,
    currentTransaction,
    onDelete,
}) => {
    return (
        <>
            {/* Story 9.9: Cancel Confirmation Dialog */}
            {/* Story 9.10: Enhanced with credit warning when scan was processed */}
            {showCancelConfirm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    onClick={() => setShowCancelConfirm(false)}
                >
                    <div
                        className="mx-4 p-6 rounded-xl shadow-xl max-w-sm w-full"
                        style={{ backgroundColor: 'var(--surface)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h2
                            className="text-lg font-bold mb-2"
                            style={{ color: 'var(--primary)' }}
                        >
                            {t('discardChanges')}
                        </h2>
                        {/* Story 9.10: Credit warning when scan was processed */}
                        {(pendingScan?.status === 'analyzed' || pendingScan?.status === 'error') && (
                            <div
                                className="p-3 rounded-lg mb-4 flex items-start gap-2"
                                style={{
                                    backgroundColor: isDark ? 'rgba(251, 191, 36, 0.15)' : 'rgba(251, 191, 36, 0.1)',
                                    border: '1px solid',
                                    borderColor: isDark ? 'rgba(251, 191, 36, 0.4)' : 'rgba(251, 191, 36, 0.5)',
                                }}
                            >
                                <span className="text-amber-500 text-lg">⚠️</span>
                                <span
                                    className="text-sm font-medium"
                                    style={{ color: isDark ? '#fbbf24' : '#d97706' }}
                                >
                                    {t('creditAlreadyUsed')}
                                </span>
                            </div>
                        )}
                        <p
                            className="text-sm mb-6"
                            style={{ color: 'var(--secondary)' }}
                        >
                            {t('discardChangesMessage')}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowCancelConfirm(false)}
                                className="flex-1 py-2 px-4 rounded-lg border font-medium"
                                style={{
                                    borderColor: isDark ? '#475569' : '#e2e8f0',
                                    color: 'var(--primary)',
                                    backgroundColor: 'transparent',
                                }}
                            >
                                {t('back')}
                            </button>
                            <button
                                onClick={handleConfirmCancel}
                                className="flex-1 py-2 px-4 rounded-lg font-medium text-white"
                                style={{ backgroundColor: 'var(--error)' }}
                            >
                                {t('confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Story 14.15b: Re-scan Confirmation Dialog */}
            {showRescanConfirm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    onClick={() => setShowRescanConfirm(false)}
                >
                    <div
                        className="mx-4 p-6 rounded-xl shadow-xl max-w-sm w-full"
                        style={{ backgroundColor: 'var(--surface)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center"
                                style={{
                                    backgroundColor: isDark ? 'rgba(96, 165, 250, 0.15)' : 'rgba(59, 130, 246, 0.1)',
                                }}
                            >
                                <RefreshCw size={20} style={{ color: 'var(--accent)' }} />
                            </div>
                            <h2
                                className="text-lg font-bold"
                                style={{ color: 'var(--primary)' }}
                            >
                                {t('rescanConfirmTitle')}
                            </h2>
                        </div>
                        <p
                            className="text-sm mb-6"
                            style={{ color: 'var(--secondary)' }}
                        >
                            {t('rescanConfirmMessage')}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowRescanConfirm(false)}
                                className="flex-1 py-2 px-4 rounded-lg border font-medium"
                                style={{
                                    borderColor: isDark ? '#475569' : '#e2e8f0',
                                    color: 'var(--primary)',
                                    backgroundColor: 'transparent',
                                }}
                            >
                                {t('cancel')}
                            </button>
                            <button
                                onClick={handleConfirmRescan}
                                className="flex-1 py-2 px-4 rounded-lg font-medium text-white flex items-center justify-center gap-2"
                                style={{ backgroundColor: 'var(--accent)' }}
                            >
                                <RefreshCw size={16} strokeWidth={2} />
                                {t('confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Story 14.22: Delete Confirmation Dialog */}
            {showDeleteConfirm && currentTransaction.id && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                    onClick={() => setShowDeleteConfirm(false)}
                >
                    <div
                        className="mx-4 p-6 rounded-xl shadow-xl max-w-sm w-full"
                        style={{ backgroundColor: 'var(--surface)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center"
                                style={{
                                    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.1)',
                                }}
                            >
                                <Trash2 size={20} style={{ color: 'var(--error)' }} />
                            </div>
                            <h2
                                className="text-lg font-bold"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                {t('deleteConfirmTitle')}
                            </h2>
                        </div>
                        <p
                            className="text-sm mb-6"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            {t('deleteConfirmMessage')}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-2 px-4 rounded-lg border font-medium flex items-center justify-center gap-2"
                                style={{
                                    borderColor: isDark ? '#475569' : '#e2e8f0',
                                    color: 'var(--text-primary)',
                                    backgroundColor: 'transparent',
                                }}
                            >
                                <ChevronLeft size={16} strokeWidth={2} />
                                {t('cancel')}
                            </button>
                            <button
                                onClick={() => {
                                    setShowDeleteConfirm(false);
                                    onDelete(currentTransaction.id!);
                                }}
                                className="flex-1 py-2 px-4 rounded-lg font-medium text-white flex items-center justify-center gap-2"
                                style={{ backgroundColor: 'var(--error)' }}
                            >
                                <Trash2 size={16} strokeWidth={2} />
                                {t('delete')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
