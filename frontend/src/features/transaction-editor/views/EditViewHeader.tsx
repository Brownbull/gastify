/**
 * Story 15b-2a: Header sub-component extracted from EditView.tsx.
 * Renders the sticky header with back button, title, credit badges, and close/delete button.
 */
import React from 'react';
import { ChevronLeft, Zap, Camera, Info, Trash2, X } from 'lucide-react';
import { formatCreditsDisplay } from '@/utils/creditFormatters';

interface EditViewHeaderProps {
    onBack: () => void;
    t: (key: string) => string;
    batchContext?: { index: number; total: number } | null;
    superCredits?: number;
    scanCredits?: number;
    onCreditInfoClick?: () => void;
    currentTransaction: { id?: string };
    handleCancelClick: () => void;
    onCancel?: () => void;
    setShowDeleteConfirm: (val: boolean) => void;
}

export const EditViewHeader: React.FC<EditViewHeaderProps> = ({
    onBack,
    t,
    batchContext,
    superCredits,
    scanCredits,
    onCreditInfoClick,
    currentTransaction,
    handleCancelClick,
    onCancel,
    setShowDeleteConfirm,
}) => {
    return (
        <div
            className="sticky px-4"
            style={{
                top: 0,
                zIndex: 50,
                backgroundColor: 'var(--bg)',
            }}
        >
            <div
                className="flex items-center justify-between"
                style={{
                    height: '72px',
                    paddingTop: 'max(env(safe-area-inset-top, 0px), 8px)',
                }}
            >
            {/* Left side: Back button + Title */}
            <div className="flex items-center gap-0">
                <button
                    onClick={onBack}
                    className="min-w-10 min-h-10 flex items-center justify-center -ml-1"
                    aria-label={t('back')}
                    style={{ color: 'var(--text-primary)' }}
                >
                    <ChevronLeft size={28} strokeWidth={2.5} />
                </button>
                <h1
                    className="font-semibold"
                    style={{
                        fontFamily: 'var(--font-family)',
                        color: 'var(--text-primary)',
                        fontWeight: 700,
                        fontSize: '20px',
                    }}
                >
                    {t('myPurchase')}
                </h1>
                {/* Batch context */}
                {batchContext && (
                    <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>
                        ({batchContext.index}/{batchContext.total})
                    </span>
                )}
            </div>

            {/* Right side: Credit badges + Close button */}
            <div className="flex items-center gap-2">
                {/* Credit badges - tappable to show info modal */}
                {(superCredits !== undefined || scanCredits !== undefined) && (
                    <button
                        onClick={onCreditInfoClick}
                        className="flex items-center gap-1.5 px-2 py-1 rounded-full transition-all active:scale-95"
                        style={{
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-light)',
                        }}
                        aria-label={t('creditInfo')}
                    >
                        {/* Super credits (gold) */}
                        {superCredits !== undefined && (
                            <div
                                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold"
                                style={{
                                    backgroundColor: '#fef3c7',
                                    color: '#92400e',
                                }}
                            >
                                <Zap size={10} strokeWidth={2.5} />
                                <span>{formatCreditsDisplay(superCredits)}</span>
                            </div>
                        )}
                        {/* Normal credits (theme color) */}
                        {scanCredits !== undefined && (
                            <div
                                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold"
                                style={{
                                    backgroundColor: 'var(--primary-light)',
                                    color: 'var(--primary)',
                                }}
                            >
                                <Camera size={10} strokeWidth={2.5} />
                                <span>{formatCreditsDisplay(scanCredits)}</span>
                            </div>
                        )}
                        {/* Info icon */}
                        <Info size={12} style={{ color: 'var(--text-tertiary)' }} />
                    </button>
                )}
                {/* Delete/Close button - Trash icon for existing transactions, X for new */}
                <button
                    onClick={currentTransaction.id ? () => setShowDeleteConfirm(true) : (onCancel ? handleCancelClick : onBack)}
                    className="min-w-10 min-h-10 flex items-center justify-center"
                    aria-label={currentTransaction.id ? t('delete') : t('cancel')}
                    style={{ color: currentTransaction.id ? 'var(--negative-primary)' : 'var(--text-primary)' }}
                >
                    {currentTransaction.id ? (
                        <Trash2 size={22} strokeWidth={2} />
                    ) : (
                        <X size={24} strokeWidth={2} />
                    )}
                </button>
            </div>
            </div>
        </div>
    );
};
