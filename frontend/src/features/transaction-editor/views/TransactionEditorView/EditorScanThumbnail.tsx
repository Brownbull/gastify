/**
 * EditorScanThumbnail — Scan button state machine thumbnail area
 *
 * Story 15-5d: Extracted from TransactionEditorViewInternal.tsx
 *
 * Renders the receipt thumbnail area with visual states:
 * - idle: Empty, dashed border with camera icon
 * - pending: Photo selected, pulsing "Scan" button
 * - scanning: Processing with shine animation
 * - complete: Success with checkmark badge
 * - error: Error with retry button
 * - existing: Thumbnail with category emoji overlay
 *
 * Also includes the edit/re-scan button below the thumbnail.
 */

import { useState, useCallback } from 'react';
import {
  Check,
  X,
  Camera,
  RefreshCw,
  Pencil,
  Loader2,
} from 'lucide-react';
import { getCategoryPillColors } from '@/config/categoryColors';
import { getCategoryEmoji } from '@/utils/categoryEmoji';
import type { ScanButtonState } from '@/shared/utils/scanHelpers';
import { usePendingScanId } from '@features/scan/store';
import { useOverlayState } from '@features/scan/store/selectors';

// ============================================================================
// Types
// ============================================================================

export interface EditorScanThumbnailProps {
  // Scan state
  scanButtonState: ScanButtonState;
  effectiveIsProcessing: boolean;
  hasCredits: boolean;
  prefersReducedMotion: boolean;

  // Images
  displayImageUrl: string | undefined;
  pendingImageUrl: string | undefined;

  // Transaction context
  mode: 'new' | 'existing';
  transactionThumbnailUrl: string | undefined;
  transactionId: string | undefined;
  displayCategory: string;
  hasImages: boolean;

  // UI state
  readOnly: boolean;
  isOtherUserTransaction: boolean;
  isRescanning: boolean;

  // Callbacks
  onShowImageViewer: () => void;
  onRetry: () => void;
  onProcessScan: () => void;
  onOpenFilePicker: () => void;
  onRescanClick: () => void;
  onRequestEdit?: () => void;
  onRescan?: () => Promise<void>;

  // i18n
  t: (key: string) => string;
}

// ============================================================================
// Component
// ============================================================================

export function EditorScanThumbnail({
  scanButtonState,
  effectiveIsProcessing,
  hasCredits,
  prefersReducedMotion,
  displayImageUrl,
  pendingImageUrl,
  mode,
  transactionThumbnailUrl,
  transactionId,
  displayCategory,
  hasImages,
  readOnly,
  isOtherUserTransaction,
  isRescanning,
  onShowImageViewer,
  onRetry,
  onProcessScan,
  onOpenFilePicker,
  onRescanClick,
  onRequestEdit,
  onRescan,
  t,
}: EditorScanThumbnailProps) {
  const pendingScanId = usePendingScanId();
  const overlayState = useOverlayState();
  const [isClicked, setIsClicked] = useState(false);
  const isScanBusy = effectiveIsProcessing || !!pendingScanId || overlayState !== 'idle' || isClicked;

  const handleScanClick = useCallback(() => {
    if (isScanBusy || !hasCredits) return;
    setIsClicked(true);
    onProcessScan();
    // Reset after 10s in case something fails silently
    setTimeout(() => setIsClicked(false), 10000);
  }, [isScanBusy, hasCredits, onProcessScan]);

  return (
    <div
      className="flex flex-col items-center flex-shrink-0 gap-1.5"
      style={{ width: '88px' }}
    >
      {/* Thumbnail container */}
      <div
        className="relative w-full"
        style={{ height: '90px' }}
      >
        {scanButtonState === 'complete' && displayImageUrl ? (
          /* SUCCESS STATE - Show thumbnail with checkmark */
          <button
            onClick={onShowImageViewer}
            className="w-full h-full rounded-xl overflow-hidden relative"
            style={{
              border: '2px solid var(--success)',
              boxShadow: '0 2px 8px rgba(34, 197, 94, 0.2)',
            }}
          >
            <img
              src={displayImageUrl}
              alt={t('receiptThumbnail')}
              className="w-full h-full object-cover"
            />
            <div
              className="absolute bottom-1 right-1 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--success)' }}
            >
              <Check size={14} className="text-white" strokeWidth={3} />
            </div>
          </button>
        ) : scanButtonState === 'error' && pendingImageUrl ? (
          /* ERROR STATE - Show retry button */
          <button
            onClick={onRetry}
            className="w-full h-full rounded-xl overflow-hidden relative"
            style={{ border: '2px solid var(--error)' }}
            aria-label={t('retry')}
          >
            <img
              src={pendingImageUrl}
              alt={t('receiptThumbnail')}
              className="w-full h-full object-cover opacity-50"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/50">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--error)' }}
              >
                <X size={18} className="text-white" strokeWidth={2.5} />
              </div>
              <span className="text-xs font-bold uppercase text-white">
                {t('retry')}
              </span>
            </div>
          </button>
        ) : scanButtonState === 'scanning' && pendingImageUrl ? (
          /* SCANNING STATE - Show processing animation */
          <div
            className="w-full h-full rounded-xl overflow-hidden relative"
            style={{ border: '2px solid var(--success)' }}
          >
            <img
              src={pendingImageUrl}
              alt={t('receiptThumbnail')}
              className="w-full h-full object-cover opacity-40"
            />
            {/* Shining sweep animation */}
            {!prefersReducedMotion && (
              <div className="absolute top-0 w-full h-full pointer-events-none overflow-hidden">
                <div
                  className="absolute top-0 w-1/2 h-full"
                  style={{
                    background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
                    animation: 'scan-shine-sweep 2s ease-in-out infinite',
                  }}
                />
              </div>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30">
              <div
                className="w-8 h-8 rounded-full border-2 border-white border-t-transparent"
                style={{
                  animation: !prefersReducedMotion ? 'processing-spin 1s linear infinite' : 'none',
                }}
              />
              <span className="text-xs font-semibold uppercase text-white">
                {t('processing')}
              </span>
            </div>
          </div>
        ) : scanButtonState === 'pending' && pendingImageUrl ? (
          /* PENDING STATE - Photo selected, ready to scan */
          <button
            onClick={handleScanClick}
            disabled={!hasCredits || isScanBusy}
            className="w-full h-full rounded-xl overflow-hidden relative cursor-pointer"
            style={{
              border: '2px solid var(--success)',
              animation: !prefersReducedMotion ? 'process-pulse 1.5s ease-in-out infinite' : 'none',
            }}
            aria-label={t('scan')}
          >
            <img
              src={pendingImageUrl}
              alt={t('receiptThumbnail')}
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg overflow-hidden relative"
                style={{
                  backgroundColor: hasCredits ? 'var(--success)' : 'var(--text-tertiary)',
                  animation: !prefersReducedMotion && hasCredits ? 'scan-icon-pulse 1.5s ease-in-out infinite' : 'none',
                }}
              >
                <Camera size={24} className="text-white relative z-10" strokeWidth={2} />
                {!prefersReducedMotion && hasCredits && (
                  <div
                    className="absolute top-0 w-full h-full pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                      animation: 'scan-shine-sweep 2s ease-in-out infinite',
                    }}
                  />
                )}
              </div>
              <div
                className="px-3 py-1 rounded-full shadow-md overflow-hidden relative"
                style={{
                  backgroundColor: hasCredits ? 'var(--success)' : 'var(--text-tertiary)',
                  marginTop: '-2px',
                }}
              >
                {isScanBusy ? (
                  <Loader2 size={12} className="text-white relative z-10 animate-spin" />
                ) : (
                  <span className="text-xs font-semibold text-white relative z-10">
                    {hasCredits ? t('scan') : t('noCredits')}
                  </span>
                )}
              </div>
            </div>
          </button>
        ) : mode === 'existing' && transactionThumbnailUrl ? (
          /* EXISTING TRANSACTION - Show thumbnail with category emoji */
          <button
            onClick={onShowImageViewer}
            className="w-full h-full rounded-xl overflow-hidden relative"
            style={{
              border: '2px solid var(--success)',
            }}
          >
            <img
              src={transactionThumbnailUrl}
              alt={t('receiptThumbnail')}
              className="w-full h-full object-cover"
            />
            <div
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-base shadow-sm"
              style={{
                backgroundColor: getCategoryPillColors(displayCategory || 'Other').bg,
              }}
            >
              {getCategoryEmoji(displayCategory || 'Other')}
            </div>
          </button>
        ) : (
          /* IDLE STATE - Empty, show add photo button */
          <button
            onClick={onOpenFilePicker}
            disabled={effectiveIsProcessing}
            className="w-full h-full rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              border: '2px dashed var(--primary)',
              animation: !prefersReducedMotion && !effectiveIsProcessing ? 'scan-pulse-border 2s ease-in-out infinite' : 'none',
            }}
            aria-label={t('attach')}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: 'var(--primary-light)',
                animation: !prefersReducedMotion && !effectiveIsProcessing ? 'scan-breathe 2s ease-in-out infinite' : 'none',
              }}
            >
              <Camera size={20} style={{ color: 'var(--primary)' }} strokeWidth={2} />
            </div>
            <span
              className="text-xs font-semibold tracking-wide"
              style={{ color: 'var(--primary)' }}
            >
              {t('attach')}
            </span>
          </button>
        )}
      </div>

      {/* Story 14.41: Edit button (view mode only) */}
      {mode === 'existing' && readOnly && onRequestEdit && !isOtherUserTransaction && (
        <button
          onClick={onRequestEdit}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'white',
          }}
          aria-label={t('edit')}
          title={t('edit')}
        >
          <Pencil size={16} strokeWidth={2} />
        </button>
      )}

      {/* Re-scan button (existing transactions in edit mode only, icon only) */}
      {mode === 'existing' && transactionId && onRescan && hasImages && !readOnly && (
        <button
          onClick={onRescanClick}
          disabled={isRescanning || !hasCredits}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{
            backgroundColor: isRescanning || !hasCredits ? 'var(--bg-tertiary)' : 'var(--primary-light)',
            color: isRescanning || !hasCredits ? 'var(--text-tertiary)' : 'var(--primary)',
            opacity: isRescanning ? 0.7 : 1,
            cursor: isRescanning || !hasCredits ? 'not-allowed' : 'pointer',
          }}
          aria-label={isRescanning ? t('rescanning') : t('rescan')}
          title={isRescanning ? t('rescanning') : t('rescan')}
        >
          <RefreshCw size={16} strokeWidth={2} className={isRescanning ? 'animate-spin' : ''} />
        </button>
      )}
    </div>
  );
}
