/**
 * Story 12.4: Credit Warning System - Credit Warning Dialog
 *
 * Modal dialog that shows before batch processing begins.
 * Displays credit cost, available credits, and post-batch remaining.
 * Blocks processing if insufficient credits.
 *
 * Updated to use CSS variables for theme consistency.
 *
 * @see docs/sprint-artifacts/epic12/story-12.4-credit-warning-system.md
 */
import React from 'react';
import { AlertTriangle, XCircle, ArrowRight, Zap, X, Check } from 'lucide-react';
import type { CreditCheckResult } from '@/services/creditService';
import { isLowCreditsWarning } from '@/services/creditService';

export interface CreditWarningDialogProps {
  /** Credit check result from creditService */
  creditCheck: CreditCheckResult;
  /** Number of receipts in the batch */
  receiptCount: number;
  /** Theme for styling */
  theme: 'light' | 'dark';
  /** Translation function */
  t: (key: string) => string;
  /** Called when user confirms to proceed */
  onConfirm: () => void;
  /** Called when user cancels */
  onCancel: () => void;
  /** Optional: Called when user wants to reduce batch size (insufficient credits mode) */
  onReduceBatch?: () => void;
  /** Optional: Called when user wants to get more credits */
  onGetMoreCredits?: () => void;
}

/**
 * CreditWarningDialog Component
 *
 * Two modes:
 * 1. Sufficient credits: Shows warning with credit usage and Continuar/Cancelar buttons
 * 2. Insufficient credits: Shows error with options to reduce batch or get more credits
 *
 * Uses CSS variables for theme consistency with the rest of the app.
 */
export const CreditWarningDialog: React.FC<CreditWarningDialogProps> = ({
  creditCheck,
  receiptCount,
  theme: _theme,
  t,
  onConfirm,
  onCancel,
  onReduceBatch,
  onGetMoreCredits,
}) => {
  const { sufficient, available, required, remaining, maxProcessable, creditType } = creditCheck;

  // Silence unused variable
  void _theme;

  // Story 14.15 Session 10: Determine if using super credits (batch mode)
  const isSuperCredits = creditType === 'super';

  // Determine if this is a low credits warning (but still processable)
  const showLowCreditsWarning = sufficient && isLowCreditsWarning(available, required);

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-warning-title"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl shadow-xl"
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-light)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 pb-4">
          <div className="flex items-center gap-3 mb-4">
            {sufficient ? (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--warning-light, #fef3c7)' }}
              >
                <AlertTriangle size={22} style={{ color: 'var(--warning, #f59e0b)' }} />
              </div>
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--negative-light, #fee2e2)' }}
              >
                <XCircle size={22} style={{ color: 'var(--negative-primary, #ef4444)' }} />
              </div>
            )}
            <h2
              id="credit-warning-title"
              className="text-lg font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {sufficient ? t('batchCreditUsage') : t('insufficientCreditsTitle')}
            </h2>
          </div>

          {/* Content based on mode */}
          {sufficient ? (
            /* Sufficient credits mode */
            <div className="space-y-4">
              {/* Batch description */}
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {t('batchWillUse')
                  .replace('{count}', String(receiptCount))
                  .replace('{credits}', String(required))}
              </p>

              {/* Credit breakdown card */}
              <div
                className="rounded-xl p-3"
                style={{ backgroundColor: 'var(--bg-tertiary)' }}
              >
                {/* Credits required */}
                <div
                  className="flex items-center justify-between py-2.5"
                  style={{ borderBottom: '1px solid var(--border-light)' }}
                >
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M8 12h8"/>
                    </svg>
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {t('batchCreditsNeeded')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isSuperCredits && <Zap size={14} style={{ color: '#f59e0b' }} />}
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {required}
                    </span>
                  </div>
                </div>

                {/* Available credits */}
                <div
                  className="flex items-center justify-between py-2.5"
                  style={{ borderBottom: '1px solid var(--border-light)' }}
                >
                  <div className="flex items-center gap-2">
                    {isSuperCredits ? (
                      <Zap size={16} style={{ color: '#f59e0b' }} />
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M12 6v6l4 2"/>
                      </svg>
                    )}
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {isSuperCredits ? t('superCreditsAvailable') || t('batchCreditsAvailable') : t('batchCreditsAvailable')}
                    </span>
                  </div>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: isSuperCredits ? '#d97706' : 'var(--text-primary)' }}
                  >
                    {available}
                  </span>
                </div>

                {/* Remaining after batch */}
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-2">
                    <ArrowRight size={16} style={{ color: 'var(--text-tertiary)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {t('batchCreditsAfter')}
                    </span>
                  </div>
                  <span
                    className="text-sm font-semibold"
                    style={{
                      color: showLowCreditsWarning ? 'var(--warning, #f59e0b)' : 'var(--success, #10b981)'
                    }}
                  >
                    {remaining}
                  </span>
                </div>
              </div>

              {/* Low credits warning banner */}
              {showLowCreditsWarning && (
                <div
                  className="flex items-center gap-2 p-3 rounded-xl"
                  style={{
                    backgroundColor: 'var(--warning-light, #fef3c7)',
                    border: '1px solid var(--warning, #f59e0b)',
                  }}
                  role="alert"
                >
                  <AlertTriangle size={18} style={{ color: 'var(--warning, #f59e0b)' }} />
                  <span className="text-sm" style={{ color: '#92400e' }}>
                    {t('lowCreditsWarning')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Insufficient credits mode */
            <div className="space-y-4">
              {/* Error message */}
              <div
                className="p-4 rounded-xl"
                style={{
                  backgroundColor: 'var(--negative-light, #fee2e2)',
                  border: '1px solid var(--negative-primary, #ef4444)',
                }}
              >
                <p className="text-sm" style={{ color: 'var(--negative-primary, #dc2626)' }}>
                  {t('insufficientCreditsMessage')
                    .replace('{required}', String(required))
                    .replace('{available}', String(available))}
                </p>
              </div>

              {/* Suggestion */}
              {maxProcessable > 0 && (
                <div
                  className="p-4 rounded-xl"
                  style={{
                    backgroundColor: 'var(--success-light, #d1fae5)',
                    border: '1px solid var(--success, #10b981)',
                  }}
                >
                  <p className="text-sm" style={{ color: 'var(--success, #059669)' }}>
                    {t('canProcessPartial').replace('{count}', String(maxProcessable))}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="p-4 pt-0">
          {sufficient ? (
            /* Sufficient credits buttons */
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-light)',
                }}
              >
                <X size={16} />
                {t('cancel')}
              </button>
              <button
                onClick={onConfirm}
                className="flex-[1.2] py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-white transition-colors"
                style={{
                  background: 'linear-gradient(135deg, var(--success, #10b981), #059669)',
                }}
              >
                <Check size={16} />
                {t('continue')}
              </button>
            </div>
          ) : (
            /* Insufficient credits buttons */
            <div className="space-y-3">
              <div className="flex gap-3">
                {maxProcessable > 0 && onReduceBatch && (
                  <button
                    onClick={onReduceBatch}
                    className="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 text-white transition-colors"
                    style={{
                      background: 'linear-gradient(135deg, var(--primary), var(--primary-hover, #6366f1))',
                    }}
                  >
                    {t('reduceBatch')}
                  </button>
                )}
                <button
                  onClick={onCancel}
                  className="flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-light)',
                  }}
                >
                  <X size={16} />
                  {t('cancel')}
                </button>
              </div>
              {onGetMoreCredits && (
                <button
                  onClick={onGetMoreCredits}
                  className="w-full py-2.5 text-sm font-medium transition-colors"
                  style={{ color: 'var(--primary)' }}
                >
                  {t('getMoreCredits')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreditWarningDialog;
