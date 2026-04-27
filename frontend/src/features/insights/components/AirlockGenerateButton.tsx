/**
 * AirlockGenerateButton - Button to generate new AI insights
 *
 * Story 14.33c.1: Airlock Generation & Persistence
 * @see docs/sprint-artifacts/epic14/stories/story-14.33c.1-airlock-generation-persistence.md
 *
 * AC2: Generate Airlock Button
 * - Primary button: "Generar Insight"
 * - Shows super credit cost indicator
 * - Disabled state when 0 credits
 * - Loading state while generating
 * - Success animation on completion
 *
 * AC3: Credit Integration
 * - Show warning dialog if insufficient credits
 */

import React, { useState, useCallback } from 'react';
import { Sparkles, Loader2, AlertCircle, Zap } from 'lucide-react';
import { AIRLOCK_CREDIT_COST } from '@/types/airlock';

interface AirlockGenerateButtonProps {
  /** Whether user can generate (has enough credits) */
  canGenerate: boolean;
  /** Whether generation is in progress */
  isGenerating: boolean;
  /** User's current credit balance */
  credits: number;
  /** Callback to generate airlock */
  onGenerate: () => Promise<void>;
  /** Translation function */
  t: (key: string) => string;
  /** Current theme - kept for API consistency, styling uses CSS variables */
  theme: string;
}

/**
 * Button component for generating new airlock insights.
 *
 * States:
 * - Default: Shows "Generar Insight" with credit cost
 * - Disabled: Grayed out when no credits
 * - Loading: Shows spinner while generating
 * - Success: Brief checkmark animation (handled by parent)
 */
export const AirlockGenerateButton: React.FC<AirlockGenerateButtonProps> = ({
  canGenerate,
  isGenerating,
  credits,
  onGenerate,
  t,
  theme: _theme,
}) => {
  const [showWarning, setShowWarning] = useState(false);

  // Handle button click
  const handleClick = useCallback(async () => {
    if (isGenerating) return;

    // AC3: Show warning if insufficient credits
    if (!canGenerate) {
      setShowWarning(true);
      return;
    }

    setShowWarning(false);
    await onGenerate();
  }, [canGenerate, isGenerating, onGenerate]);

  // Dismiss warning
  const handleDismissWarning = useCallback(() => {
    setShowWarning(false);
  }, []);

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Main Generate Button */}
      <button
        onClick={handleClick}
        disabled={isGenerating}
        className={`
          w-full max-w-xs py-4 px-6 rounded-2xl
          flex flex-col items-center justify-center gap-2
          font-semibold text-base
          transition-all duration-200
          min-h-[80px]
          ${canGenerate && !isGenerating
            ? 'hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]'
            : ''
          }
        `}
        style={{
          backgroundColor: canGenerate
            ? 'var(--primary)'
            : 'var(--bg-tertiary)',
          color: canGenerate
            ? 'white'
            : 'var(--text-tertiary)',
          opacity: isGenerating ? 0.8 : 1,
          cursor: isGenerating ? 'wait' : canGenerate ? 'pointer' : 'not-allowed',
        }}
        aria-label={isGenerating
          ? t('generatingAirlock')
          : canGenerate
            ? `${t('generateAirlock')} - ${AIRLOCK_CREDIT_COST} ${t('airlockCreditCost')}`
            : t('insufficientCredits')
        }
        aria-disabled={!canGenerate || isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 size={28} className="animate-spin" />
            <span>{t('generatingAirlock')}</span>
          </>
        ) : (
          <>
            <Sparkles size={28} />
            <span>{t('generateAirlock')}</span>
            {/* Credit cost indicator */}
            <span
              className="flex items-center gap-1 text-sm font-normal"
              style={{
                opacity: 0.9,
                color: canGenerate ? 'rgba(255,255,255,0.9)' : 'var(--text-tertiary)',
              }}
            >
              <Zap size={14} />
              {AIRLOCK_CREDIT_COST} {t('airlockCreditCost')}
            </span>
          </>
        )}
      </button>

      {/* Credit Balance Indicator */}
      <div
        className="flex items-center gap-2 text-sm"
        style={{ color: 'var(--text-secondary)' }}
      >
        <Zap size={16} style={{ color: 'var(--warning)' }} />
        <span>
          {credits} {credits === 1 ? t('credit') : t('credits')} {t('available')}
        </span>
      </div>

      {/* AC3: Insufficient Credits Warning Dialog */}
      {showWarning && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={handleDismissWarning}
          role="dialog"
          aria-modal="true"
          aria-labelledby="insufficient-credits-title"
        >
          <div
            className="p-6 rounded-2xl max-w-sm w-full shadow-xl"
            style={{ backgroundColor: 'var(--bg-secondary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center gap-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: 'var(--warning-light)' }}
              >
                <AlertCircle size={32} style={{ color: 'var(--warning)' }} />
              </div>
              <h3
                id="insufficient-credits-title"
                className="text-lg font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {t('insufficientCredits')}
              </h3>
              <p
                className="text-sm"
                style={{ color: 'var(--text-secondary)' }}
              >
                {t('needMoreCreditsMessage')}
              </p>

              {/* Future: Buy credits button */}
              <button
                onClick={handleDismissWarning}
                className="w-full py-3 rounded-xl font-medium mt-2"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                }}
              >
                {t('understood')}
              </button>

              {/* Placeholder for future in-app purchase */}
              <button
                className="text-sm font-medium"
                style={{ color: 'var(--text-tertiary)' }}
                disabled
              >
                {t('buyMoreCredits')} ({t('comingSoon')})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
