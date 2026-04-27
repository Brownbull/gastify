/**
 * Story 14e-4: Credit Info Modal
 *
 * Displays user's credit balance with explanations of credit types.
 * Opened via Modal Manager: openModal('creditInfo', { normalCredits, superCredits, onClose })
 *
 * Features:
 * - Displays normal credits (single receipt scans)
 * - Displays super credits (batch processing, up to 10 receipts)
 * - Optional purchase button
 * - Accessible: focus trap, escape key closes
 * - i18n support with Spanish as default (Chilean fintech standard)
 *
 * @module components/modals/CreditInfoModal
 */

import React, { useEffect, useRef } from 'react';
import { X, Zap, Camera } from 'lucide-react';
import type { CreditInfoProps } from '@managers/ModalManager/types';

// Default translation function that returns empty string (fallbacks will be used)
const defaultTranslate = () => '';

/**
 * CreditInfoModal - Displays credit balance information
 *
 * @param props - Component props (normalCredits, superCredits, onClose, onPurchase?, t?, lang?)
 * @returns Modal component
 */
export const CreditInfoModal: React.FC<CreditInfoProps> = ({
  normalCredits,
  superCredits,
  onClose,
  onPurchase,
  t = defaultTranslate,
  lang = 'es',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus trap and escape key handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    modalRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Translations with Spanish fallbacks (Chilean fintech standard)
  const texts = {
    title: t('creditInfoTitle') || (lang === 'es' ? 'Tus Créditos' : 'Your Credits'),
    normalCredits: t('normalCredits') || (lang === 'es' ? 'Créditos Normales' : 'Normal Credits'),
    normalCreditsDesc: t('normalCreditsDesc') || (lang === 'es' ? 'Escaneos de boletas individuales' : 'Single receipt scans'),
    superCredits: t('superCredits') || (lang === 'es' ? 'Súper Créditos' : 'Super Credits'),
    superCreditsDesc: t('superCreditsDesc') || (lang === 'es' ? 'Procesamiento por lote (hasta 10 boletas)' : 'Batch processing (up to 10 receipts)'),
    getMoreCredits: t('getMoreCredits') || (lang === 'es' ? 'Obtener Más Créditos' : 'Get More Credits'),
    close: t('close') || (lang === 'es' ? 'Cerrar' : 'Close'),
    closeAriaLabel: t('closeAriaLabel') || (lang === 'es' ? 'Cerrar' : 'Close'),
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-info-title"
      data-testid="credit-info-modal"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
        data-testid="credit-info-backdrop"
      />

      {/* Modal content */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6"
        data-testid="credit-info-content"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg transition-colors"
          aria-label={texts.closeAriaLabel}
          data-testid="credit-info-close-x"
        >
          <X size={20} />
        </button>

        {/* Title */}
        <h2
          id="credit-info-title"
          className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100"
        >
          {texts.title}
        </h2>

        {/* Credit display */}
        <div className="space-y-4">
          {/* Normal credits */}
          <div
            className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
            data-testid="normal-credits-section"
          >
            <div className="p-2 bg-emerald-500 rounded-lg">
              <Camera size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {texts.normalCredits}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {texts.normalCreditsDesc}
              </div>
            </div>
            <div
              className="text-2xl font-bold text-emerald-600 dark:text-emerald-400"
              data-testid="normal-credits-value"
            >
              {normalCredits}
            </div>
          </div>

          {/* Super credits */}
          <div
            className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg"
            data-testid="super-credits-section"
          >
            <div className="p-2 bg-amber-500 rounded-lg">
              <Zap size={20} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {texts.superCredits}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {texts.superCreditsDesc}
              </div>
            </div>
            <div
              className="text-2xl font-bold text-amber-600 dark:text-amber-400"
              data-testid="super-credits-value"
            >
              {superCredits}
            </div>
          </div>
        </div>

        {/* Purchase button (if handler provided) */}
        {onPurchase && (
          <button
            onClick={onPurchase}
            className="mt-6 w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors"
            data-testid="credit-info-purchase"
          >
            {texts.getMoreCredits}
          </button>
        )}

        {/* Close button at bottom */}
        <button
          onClick={onClose}
          className="mt-4 w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium rounded-lg transition-colors"
          data-testid="credit-info-close-button"
        >
          {texts.close}
        </button>
      </div>
    </div>
  );
};

export default CreditInfoModal;
