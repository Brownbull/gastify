/**
 * Story 15b-2a: Scan section sub-component extracted from EditView.tsx.
 * Renders the scan receipt button, image grid, scan options, and process scan button.
 * NOTE: The wrapper condition `{!currentTransaction.id && onAddPhoto && (` stays in EditView.tsx.
 */
import React, { useState, useCallback } from 'react';
import { Camera, Plus, X, Loader2 } from 'lucide-react';
import { StoreTypeSelector } from '@features/transaction-editor/components/StoreTypeSelector';
import { AdvancedScanOptions } from '@features/transaction-editor/components/AdvancedScanOptions';
import { ReceiptType } from '@/services/gemini';
import type { SupportedCurrency } from '@/types/preferences';
import { usePendingScanId } from '@features/scan/store';
import { useOverlayState } from '@features/scan/store/selectors';

interface EditViewScanSectionProps {
    currentTransaction: { id?: string; imageUrls?: string[] };
    onAddPhoto: () => void;
    scanImages?: string[];
    onRemovePhoto?: (index: number) => void;
    scanStoreType?: ReceiptType;
    onSetScanStoreType?: (type: ReceiptType) => void;
    scanCurrency?: SupportedCurrency;
    onSetScanCurrency?: (currency: SupportedCurrency) => void;
    onProcessScan?: () => Promise<void>;
    isAnalyzing?: boolean;
    hasCredits: boolean;
    isDark: boolean;
    t: (key: string) => string;
    theme: string;
}

export const EditViewScanSection: React.FC<EditViewScanSectionProps> = ({
    currentTransaction,
    onAddPhoto,
    scanImages,
    onRemovePhoto,
    scanStoreType,
    onSetScanStoreType,
    scanCurrency,
    onSetScanCurrency,
    onProcessScan,
    isAnalyzing,
    hasCredits,
    isDark,
    t,
    theme,
}) => {
    const hasImages = currentTransaction.imageUrls && currentTransaction.imageUrls.length > 0;
    const pendingScanId = usePendingScanId();
    const overlayState = useOverlayState();
    const [isQueuing, setIsQueuing] = useState(false);
    const isScanBusy = isAnalyzing || isQueuing || !!pendingScanId || overlayState !== 'idle';

    const handleProcessScanClick = useCallback(async () => {
        if (!onProcessScan || isScanBusy) return;
        setIsQueuing(true);
        try {
            await onProcessScan();
        } finally {
            setIsQueuing(false);
        }
    }, [onProcessScan, isScanBusy]);

    return (
        <div className="mb-4">
            {/* Show "Scan Receipt" button only when no photos exist */}
            {!hasImages && (!scanImages || scanImages.length === 0) && (
                <button
                    onClick={onAddPhoto}
                    className="w-full p-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-colors"
                    style={{
                        borderColor: 'var(--primary)',
                        backgroundColor: isDark ? 'rgba(96, 165, 250, 0.05)' : 'var(--primary-light)',
                        color: 'var(--primary)',
                    }}
                    aria-label={t('scanReceipt')}
                >
                    <Camera size={32} strokeWidth={1.5} />
                    <span className="font-bold">{t('scanReceipt')}</span>
                    <span className="text-sm opacity-70" style={{ color: 'var(--secondary)' }}>
                        {t('tapToScan')}
                    </span>
                </button>
            )}

            {/* Show scan images grid when photos have been added */}
            {scanImages && scanImages.length > 0 && (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        {scanImages.filter(img => !img.startsWith('data:') || img.startsWith('data:image/')).map((img, i) => (
                            <div key={i} className="relative">
                                <img
                                    src={img}
                                    alt={`Scan ${i + 1}`}
                                    className="w-full h-24 object-cover rounded-lg"
                                />
                                {onRemovePhoto && (
                                    <button
                                        onClick={() => onRemovePhoto(i)}
                                        className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center bg-red-500 text-white"
                                        aria-label={`Remove photo ${i + 1}`}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Add Photo button */}
                    <button
                        onClick={onAddPhoto}
                        className="w-full py-2 border-2 rounded-lg font-medium flex items-center justify-center gap-2"
                        style={{
                            borderColor: 'var(--primary)',
                            color: 'var(--primary)',
                            backgroundColor: 'transparent',
                        }}
                    >
                        <Plus size={18} />
                        {t('addPhoto')}
                    </button>

                    {/* Story 9.8 AC#1: Store Type Quick-Select Labels */}
                    {onSetScanStoreType && (
                        <StoreTypeSelector
                            selected={scanStoreType || 'auto'}
                            onSelect={onSetScanStoreType}
                            t={t}
                            theme={theme as 'light' | 'dark'}
                        />
                    )}

                    {/* Story 9.8 AC#2: Advanced Options with Currency Dropdown */}
                    {onSetScanCurrency && scanCurrency && (
                        <AdvancedScanOptions
                            currency={scanCurrency}
                            onCurrencyChange={onSetScanCurrency}
                            t={t}
                            theme={theme as 'light' | 'dark'}
                        />
                    )}

                    {/* Process Scan button - Story 9.10 AC#7: Disabled when no credits or scan in progress */}
                    {onProcessScan && (
                        <button
                            onClick={handleProcessScanClick}
                            disabled={!hasCredits || isScanBusy}
                            className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-opacity"
                            style={{
                                backgroundColor: (!hasCredits || isScanBusy) ? 'var(--secondary)' : 'var(--success)',
                                opacity: (!hasCredits || isScanBusy) ? 0.7 : 1,
                                cursor: (!hasCredits || isScanBusy) ? 'not-allowed' : 'pointer',
                            }}
                            title={!hasCredits ? t('noCreditsMessage') : undefined}
                        >
                            {isScanBusy ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" />
                                    {t('scanning') || 'Escaneando...'}
                                </>
                            ) : !hasCredits ? (
                                <>
                                    <Camera size={20} />
                                    {t('noCreditsButton')}
                                </>
                            ) : (
                                <>
                                    <Camera size={20} />
                                    {t('processScan')}
                                </>
                            )}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
