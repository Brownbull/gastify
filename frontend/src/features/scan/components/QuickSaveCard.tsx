/**
 * QuickSaveCard Component
 *
 * Story 11.2: Quick Save Card Component
 * Story 11.3: Animated Item Reveal
 * Story 14.4: Quick Save Path (Animations)
 * Story 14.15: Redesigned to match mockup design system
 * Story 14d.4b: Migrated to use ScanContext for scan-specific state
 * Epic 11: Quick Save & Scan Flow Optimization
 * Epic 14: Core Implementation
 *
 * Displays a summary card after successful scan with Accept/Edit options.
 * Reduces scan-to-save time to <15 seconds for high-confidence scans.
 *
 * Features:
 * - Shows merchant name, category badge, location, date/time
 * - Total amount highlight box with icon
 * - Items list with styled rows
 * - Primary "Guardar" button (flex-2) with save icon
 * - Secondary "Editar" button (flex-1) with pencil icon
 * - Cancel with credit warning confirmation
 * - Dark mode support via CSS variables
 * - Accessibility features (ARIA labels, keyboard navigation)
 * - Story 11.3: Animated item reveal with staggered timing
 * - Story 14.4: Spring animation on save, success checkmark, reduced motion support
 *
 * Story 14d.4b Migration:
 * - Uses useScanOptional() to read dialog state from context
 * - Falls back to props if context not available (backward compatibility)
 * - Context provides: transaction, confidence via activeDialog.data
 *
 * @see docs/sprint-artifacts/epic11/story-11.2-quick-save-card.md
 * @see docs/sprint-artifacts/epic11/story-11.3-animated-item-reveal.md
 * @see docs/sprint-artifacts/epic14/stories/story-14.4-quick-save-path.md
 * @see docs/uxui/mockups/00_components/design-system-final.html (Scan section)
 */

import React, { useCallback, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, AlertTriangle, ArrowLeft, Trash2, Pencil, Save, MapPin, Calendar, Clock, DollarSign } from 'lucide-react';
import type { Transaction } from '@/types/transaction';
import type { StoreCategory } from '../../../../shared/schema/categories';
import { getCategoryEmoji } from '@/utils/categoryEmoji';
import { translateCategory } from '@/utils/categoryTranslations';
import { getCategoryPillColors } from '@/config/categoryColors';
import { useStaggeredReveal } from '@/hooks/useStaggeredReveal';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { AnimatedItem } from '@/components/AnimatedItem';
import { DURATION, EASING } from '@/components/animation/constants';
import type { Language } from '@/utils/translations';
// Story 14e-11: Migrated from useScanOptional (ScanContext) to Zustand store
import { useScanActiveDialog, useScanActions } from '@features/scan/store';
import { DIALOG_TYPES } from '@shared/types/scanWorkflow';
import { formatQty, shouldShowQty } from '@entities/transaction/utils/qtyUtils';
import { DEFAULT_TIME } from '@entities/transaction/utils';
import { useIsForeignLocation } from '@/hooks/useIsForeignLocation';
import { useLocationDisplay } from '@/hooks/useLocations';
// Story 14d.6: Import centralized type from scanStateMachine
import type { QuickSaveDialogData } from '@features/scan/types/scanStateMachine';
// Re-export for backward compatibility
export type { QuickSaveDialogData };

export interface QuickSaveCardProps {
  /** Theme for styling ('light' | 'dark') - required, from app settings */
  theme: 'light' | 'dark';
  /** Translation function - required, from app settings */
  t: (key: string) => string;
  /** Currency format function - required, from app settings */
  formatCurrency: (amount: number, currency: string) => string;
  /** Currency code - required, from app settings */
  currency: string;
  /** Story 14.15: Language for category translation - required, from app settings */
  lang?: Language;

  // === Story 14d.4b: Props below are now optional - can be read from ScanContext ===

  /** Transaction data from scan result - optional if using ScanContext */
  transaction?: Transaction;
  /** AI extraction confidence score (0-1) - optional if using ScanContext */
  confidence?: number;
  /**
   * Callback when user clicks "Guardar".
   * Story 14d.6: Now receives dialog data as parameter for context-based dialog handling.
   */
  onSave?: (data?: QuickSaveDialogData) => Promise<void>;
  /**
   * Callback when user clicks "Editar".
   * Story 14d.6: Now receives dialog data as parameter for context-based dialog handling.
   */
  onEdit?: (data?: QuickSaveDialogData) => void;
  /**
   * Callback when user clicks "Cancelar".
   * Story 14d.6: Now receives dialog data as parameter for context-based dialog handling.
   */
  onCancel?: (data?: QuickSaveDialogData) => void;
  /** Whether save is in progress - optional if using ScanContext */
  isSaving?: boolean;
  /** Story 11.3: Whether to show item list with animation */
  showItems?: boolean;
  /** Story 11.3: Maximum items to show before "and X more" */
  maxVisibleItems?: number;
  /** Story 14.4: Callback when save animation completes (for chaining Trust Merchant prompt) */
  onSaveComplete?: () => void;
  /** Story 14.4: Whether card is entering (for slide-up animation) */
  isEntering?: boolean;
  /** Story 14.35b: User's default country for foreign location detection */
  userDefaultCountry?: string;
}

/**
 * QuickSaveCard displays a summary of scanned receipt data with quick action buttons.
 * Redesigned to match the design-system-final.html mockup.
 *
 * Story 14d.4b: Uses ScanContext for scan-specific state with prop fallback.
 */
export const QuickSaveCard: React.FC<QuickSaveCardProps> = ({
  transaction: transactionProp,
  confidence: confidenceProp,
  onSave: onSaveProp,
  onEdit: onEditProp,
  onCancel: onCancelProp,
  theme,
  t,
  formatCurrency,
  currency,
  isSaving: isSavingProp = false,
  showItems = true,
  maxVisibleItems = 3,
  onSaveComplete,
  isEntering = true,
  lang = 'es',
  userDefaultCountry,
}) => {
  const isDark = theme === 'dark';
  const prefersReducedMotion = useReducedMotion();

  // Story 14e-11: Use Zustand store selectors and actions
  const activeDialog = useScanActiveDialog();
  const { resolveDialog, dismissDialog } = useScanActions();

  // Story 14d.4b: Derive values from context or fall back to props
  const contextDialogData = activeDialog?.type === DIALOG_TYPES.QUICKSAVE
    ? (activeDialog.data as QuickSaveDialogData)
    : null;

  // Get transaction and confidence from context or props
  const transaction = contextDialogData?.transaction ?? transactionProp;
  const confidence = contextDialogData?.confidence ?? confidenceProp ?? 0;

  // isSaving could come from context's phase === 'saving' in future
  const isSaving = isSavingProp;

  // Story 14.4: Animation states (AC #2)
  const [saveAnimating, setSaveAnimating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isVisible, setIsVisible] = useState(!isEntering || prefersReducedMotion);
  // Story 14.15: Cancel confirmation state (credit already used warning)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Story 14.4: Card entry animation (AC #4) - slide up on mount
  useEffect(() => {
    if (isEntering && !prefersReducedMotion) {
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, [isEntering, prefersReducedMotion]);

  // Story 14d.6: Create handlers that pass dialog data to callbacks
  // Story 14e-11: Use Zustand actions directly (always available)
  const handleEdit = useCallback(() => {
    // Capture data before resolveDialog clears it
    const data = contextDialogData ?? undefined;

    // Story 14e-11: Zustand actions are always available
    resolveDialog(DIALOG_TYPES.QUICKSAVE, { choice: 'edit' });
    // Pass data to callback for context-based dialog handling
    onEditProp?.(data);
  }, [resolveDialog, onEditProp, contextDialogData]);

  const handleCancel = useCallback(() => {
    // Capture data before dismissDialog clears it
    const data = contextDialogData ?? undefined;

    // Story 14e-11: Zustand actions are always available
    dismissDialog();
    // Pass data to callback for context-based dialog handling
    onCancelProp?.(data);
  }, [dismissDialog, onCancelProp, contextDialogData]);

  // Handle save with animation (Story 14.4 AC #2)
  // Story 14e-11: Use Zustand actions directly (always available)
  const handleSave = useCallback(async () => {
    if (isSaving || saveAnimating) return;

    // Capture data before resolveDialog clears it
    const data = contextDialogData ?? undefined;

    if (!prefersReducedMotion) {
      setSaveAnimating(true);
    }

    try {
      // Story 14e-11: Zustand actions are always available
      resolveDialog(DIALOG_TYPES.QUICKSAVE, { choice: 'save' });
      // Pass data to callback for context-based dialog handling
      if (onSaveProp) {
        await onSaveProp(data);
      }
      setShowSuccess(true);

      const successDuration = prefersReducedMotion ? 0 : DURATION.SLOWER;
      setTimeout(() => {
        if (onSaveComplete) {
          onSaveComplete();
        }
      }, successDuration);
    } finally {
      setSaveAnimating(false);
    }
  }, [onSaveProp, isSaving, saveAnimating, prefersReducedMotion, onSaveComplete, resolveDialog, contextDialogData]);

  // Get display values (safe even if transaction is undefined)
  const merchantName = transaction?.alias || transaction?.merchant || t('unknown');
  const total = transaction?.total || 0;
  const items = transaction?.items || [];
  const itemCount = items.length;
  const category = transaction?.category || 'Other';
  // Story 14.34: Use transaction's detected currency if available, otherwise fall back to user's default
  // This ensures foreign currencies (USD, EUR, GBP) are formatted correctly with cents/decimals
  const displayCurrency = transaction?.currency || currency;
  const emoji = getCategoryEmoji(category as StoreCategory);
  const categoryColors = getCategoryPillColors(category);

  // Location and date info - support both old location object and new city/country fields
  const txn = transaction as { location?: { city?: string; country?: string } } | undefined;
  const location = txn?.location;
  // Get country from transaction.country or fallback to location.country
  const transactionCountry = transaction?.country || location?.country;
  // Story 14.35b: Detect foreign location for flag display
  const { isForeign, flagEmoji } = useIsForeignLocation(transactionCountry, userDefaultCountry);
  // Story 14.35b: Get localized city/country names
  const { getLocationString, getCityName, getCountryName } = useLocationDisplay(lang);
  // Build location text with localized names
  const cityName = transaction?.city || location?.city || '';
  const countryName = transactionCountry || '';
  const locationText = cityName && countryName
    ? getLocationString(cityName, countryName)
    : cityName
      ? getCityName(cityName)
      : countryName
        ? getCountryName(countryName)
        : '';
  const transactionDate = transaction?.date ? new Date(transaction.date) : new Date();
  const dateStr = transactionDate.toLocaleDateString(lang === 'es' ? 'es-CL' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const timeStr = transactionDate.toLocaleTimeString(lang === 'es' ? 'es-CL' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  // Story 11.3: Staggered reveal for items
  // IMPORTANT: This hook must be called unconditionally BEFORE any early returns
  // to comply with React's Rules of Hooks
  const displayItems = items.slice(0, maxVisibleItems);
  const remainingCount = items.length - maxVisibleItems;
  const { visibleItems, isComplete } = useStaggeredReveal(displayItems, {
    staggerMs: 100,
    initialDelayMs: 300,
    maxDurationMs: 2500,
  });

  // Story 14d.4b: Early return if no transaction available
  // This can happen during initial render before context/props are set
  // Note: ALL hooks must be called before this point to comply with React's rules of hooks
  if (!transaction) {
    return null;
  }

  // Items detected text
  const itemsDetectedText = `${itemCount} ${itemCount === 1 ? 'Item' : 'Items'} ${t('itemsDetected') || 'detectados'}`;

  // TD-18-21: Portal to document.body to prevent containing block issues
  // (ancestor transform/will-change/filter breaks fixed positioning on mobile)
  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        padding: '1rem',
        paddingTop: 'calc(1rem + env(safe-area-inset-top, 0px))',
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        transitionDuration: prefersReducedMotion ? '0ms' : `${DURATION.NORMAL}ms`,
        overflow: 'hidden',
        touchAction: 'none',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-save-title"
    >
      <div
        className="w-full max-w-sm rounded-3xl p-5 shadow-xl flex flex-col"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: `1px solid var(--border-light)`,
          maxHeight: 'calc(100vh - 120px)',
          transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
          opacity: isVisible ? 1 : 0,
          transition: prefersReducedMotion
            ? 'none'
            : `transform ${DURATION.SLOW}ms ${EASING.OUT}, opacity ${DURATION.SLOW}ms ${EASING.OUT}`,
        }}
      >
        {/* Header: Metadata Left, Thumbnail Right */}
        <div className="flex justify-between items-start gap-3 mb-4">
          {/* Left: Metadata */}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            {/* Merchant Name */}
            <h2
              id="quick-save-title"
              className="text-lg font-bold truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {merchantName}
            </h2>

            {/* Category Badge */}
            <div className="flex gap-1.5 flex-wrap">
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold uppercase"
                style={{
                  backgroundColor: categoryColors.bg,
                  color: categoryColors.fg,
                }}
              >
                {translateCategory(category, lang)}
              </span>
            </div>

            {/* Location - Story 14.35b: Show flag for foreign locations */}
            {locationText && (
              <div
                className="flex items-center gap-1 text-xs"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <MapPin size={12} />
                {isForeign && <span>{flagEmoji}</span>}
                <span>{locationText}</span>
              </div>
            )}

            {/* Date, Time, Currency */}
            <div className="flex flex-wrap gap-2 items-center">
              <span
                className="inline-flex items-center gap-1 text-xs"
                style={{ color: 'var(--text-tertiary)' }}
              >
                <Calendar size={12} />
                {dateStr}
              </span>
              {/* TD-18-7: Hide clock row when time is absent or DEFAULT_TIME sentinel */}
              {transaction.time && transaction.time !== DEFAULT_TIME && (
                <span
                  className="inline-flex items-center gap-1 text-xs"
                  style={{ color: 'var(--text-tertiary)' }}
                  data-testid="time-display"
                >
                  <Clock size={12} />
                  {timeStr}
                </span>
              )}
              <span
                className="text-xs font-semibold"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {displayCurrency === 'CLP' ? '$' : displayCurrency}
              </span>
            </div>
          </div>

          {/* Right: Emoji + Confidence */}
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div
              className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
              style={{
                backgroundColor: categoryColors.bg,
                border: `2px solid var(--success)`,
              }}
              role="img"
              aria-label={category}
            >
              {emoji}
            </div>
            {confidence > 0 && (
              <span
                className="text-xs font-medium"
                style={{ color: 'var(--success)' }}
              >
                {Math.round(confidence * 100)}% {t('confidence') || 'confianza'}
              </span>
            )}
          </div>
        </div>

        {/* Total Highlight Box */}
        <div
          className="flex justify-between items-center px-4 py-3 rounded-xl mb-4"
          style={{ backgroundColor: 'var(--primary-light)' }}
        >
          <div className="flex items-center gap-2">
            <DollarSign size={20} style={{ color: 'var(--primary)' }} />
            <span
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              {t('total') || 'Total'}
            </span>
          </div>
          <span
            className="text-2xl font-bold"
            style={{ color: 'var(--primary)' }}
          >
            {formatCurrency(total, displayCurrency)}
          </span>
        </div>

        {/* Items Section */}
        {showItems && items.length > 0 && (
          <div className="flex-1 min-h-0 mb-4">
            <div
              className="text-xs uppercase tracking-wide mb-2"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {itemsDetectedText}
            </div>

            <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
              {visibleItems.map((item, index) => (
                <AnimatedItem
                  key={`${item.name}-${index}`}
                  delay={index * 100}
                  index={index}
                  testId={`quick-save-item-${index}`}
                >
                  <div
                    className="flex justify-between items-center px-3 py-2.5 rounded-lg"
                    style={{ backgroundColor: 'var(--bg-tertiary)' }}
                  >
                    <span
                      className="text-sm truncate flex-1"
                      style={{ color: 'var(--text-primary)' }}
                      title={item.name}
                    >
                      {item.name}
                    </span>
                    {/* TD-18-14: Show unitPrice x qty when qty != 1 (including decimals) */}
                    <div className="flex items-center gap-1 ml-2">
                      {shouldShowQty(item.qty) && (
                        <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                          {item.unitPrice
                            ? `${formatCurrency(item.unitPrice, displayCurrency)} x${formatQty(item.qty)}`
                            : `x${formatQty(item.qty)}`}
                        </span>
                      )}
                      <span
                        className="text-sm font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {formatCurrency(item.totalPrice, displayCurrency)}
                      </span>
                    </div>
                  </div>
                </AnimatedItem>
              ))}

              {/* Show "+X items mas..." */}
              {isComplete && remainingCount > 0 && (
                <AnimatedItem
                  delay={displayItems.length * 100}
                  testId="quick-save-more-items"
                >
                  <div
                    className="text-sm font-medium px-3 py-2 cursor-pointer"
                    style={{ color: 'var(--primary)' }}
                  >
                    +{remainingCount} items mas...
                  </div>
                </AnimatedItem>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons or Success State */}
        {showSuccess ? (
          <div
            className="flex flex-col items-center justify-center py-6"
            data-testid="quick-save-success"
          >
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 ${
                prefersReducedMotion ? '' : 'animate-quick-save-success'
              }`}
              style={{ backgroundColor: 'var(--success-light, #dcfce7)' }}
            >
              <Check
                className="w-8 h-8"
                style={{ color: 'var(--success)' }}
                strokeWidth={3}
              />
            </div>
            <span
              className={`text-lg font-semibold ${
                prefersReducedMotion ? '' : 'animate-fade-in'
              }`}
              style={{ color: 'var(--success)' }}
            >
              {t('saved') || '¡Guardado!'}
            </span>
          </div>
        ) : (
          <>
            {/* Action Buttons - Editar (flex-1) | Guardar (flex-2) */}
            <div className="flex gap-3">
              {/* Edit Button (Secondary) - flex-1 */}
              {/* Story 14.34: Use theme-aware CSS variables for consistent colors */}
              <button
                onClick={handleEdit}
                disabled={isSaving || saveAnimating}
                data-testid="quick-save-edit-button"
                className="flex-1 h-12 rounded-xl font-semibold flex items-center justify-center gap-1.5"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  opacity: isSaving || saveAnimating ? 0.5 : 1,
                  cursor: isSaving || saveAnimating ? 'not-allowed' : 'pointer',
                  transition: prefersReducedMotion
                    ? 'none'
                    : `all ${DURATION.FAST}ms ${EASING.OUT}`,
                }}
                aria-label={t('editTrans') || 'Editar'}
              >
                <Pencil size={16} />
                {t('editTrans') || 'Editar'}
              </button>

              {/* Save Button (Primary) - flex-2 */}
              {/* Story 14.34: Use theme-aware CSS variables for consistent colors */}
              <button
                onClick={handleSave}
                disabled={isSaving || saveAnimating}
                data-testid="quick-save-button"
                className="flex-[2] h-12 rounded-xl font-semibold flex items-center justify-center gap-1.5"
                style={{
                  backgroundColor: 'var(--primary-light)',
                  color: 'var(--primary)',
                  opacity: isSaving || saveAnimating ? 0.7 : 1,
                  cursor: isSaving || saveAnimating ? 'not-allowed' : 'pointer',
                  transform: saveAnimating && !prefersReducedMotion ? 'scale(0.98)' : 'scale(1)',
                  transition: prefersReducedMotion
                    ? 'none'
                    : `all ${DURATION.FAST}ms ${EASING.OUT}`,
                }}
                aria-label={t('quickSave') || 'Guardar'}
              >
                <Save size={16} />
                {isSaving || saveAnimating ? t('saving') || 'Guardando...' : t('quickSave') || 'Guardar'}
              </button>
            </div>

            {/* Cancel link - Hidden when showing cancel confirm */}
            {!showCancelConfirm && (
              <button
                onClick={() => setShowCancelConfirm(true)}
                disabled={isSaving || saveAnimating}
                data-testid="quick-save-cancel-button"
                className="w-full mt-3 py-2 text-sm font-medium flex items-center justify-center gap-1 transition-colors"
                style={{
                  color: 'var(--text-tertiary)',
                  opacity: isSaving || saveAnimating ? 0.5 : 1,
                  cursor: isSaving || saveAnimating ? 'not-allowed' : 'pointer',
                }}
                aria-label={t('cancel') || 'Cancelar'}
              >
                <X size={16} />
                {t('cancel') || 'Cancelar'}
              </button>
            )}

            {/* Cancel Confirmation with Credit Warning */}
            {showCancelConfirm && (
              <div
                className="mt-3 p-3 rounded-xl"
                style={{
                  backgroundColor: isDark ? 'rgba(251, 191, 36, 0.1)' : 'rgba(251, 191, 36, 0.15)',
                  border: `1px solid ${isDark ? 'rgba(251, 191, 36, 0.3)' : 'rgba(251, 191, 36, 0.4)'}`,
                }}
              >
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle
                    size={18}
                    className="flex-shrink-0 mt-0.5"
                    style={{ color: '#f59e0b' }}
                  />
                  <div>
                    <div
                      className="text-sm font-medium mb-1"
                      style={{ color: isDark ? '#fbbf24' : '#d97706' }}
                    >
                      {t('cancelScanTitle') || '¿Cancelar escaneo?'}
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: isDark ? '#94a3b8' : '#64748b' }}
                    >
                      {t('creditAlreadyUsed') || '1 credit was already used for this scan'}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
                    style={{
                      backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <ArrowLeft size={14} />
                    {t('goBack') || 'Volver'}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
                    style={{
                      backgroundColor: isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.1)',
                      color: '#ef4444',
                    }}
                  >
                    <Trash2 size={14} />
                    {t('cancelAnyway') || 'Cancelar de todos modos'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default QuickSaveCard;
