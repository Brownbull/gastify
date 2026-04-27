/**
 * AirlockSequence - 3-step progressive reveal UI for insights
 *
 * Story 14.33c: Airlock Sequence UI
 * @see docs/sprint-artifacts/epic14/stories/story-14.33c-airlock-sequence.md
 *
 * A UX pattern designed to deliver potentially sensitive insights
 * (like unexpected spending patterns) in a non-judgmental, curiosity-driven way.
 *
 * Steps:
 * 1. Curiosity Gate (🔮) - Build anticipation
 * 2. Playful Brace (🎢) - Prepare user
 * 3. The Reveal - Show insight with context
 */

import React, { useState, useCallback, useMemo } from 'react';
import { InsightRecord } from '@/types/insight';

export interface AirlockSequenceProps {
  /** The insight to reveal at step 3 */
  insight: InsightRecord;
  /** Called when user completes the airlock (clicks "Entendido" on step 3) */
  onComplete: () => void;
  /** Called when user dismisses the airlock (clicks "Mejor después" on step 2) */
  onDismiss: () => void;
  /** Current theme for styling */
  theme: string;
  /** Translation function */
  t: (key: string) => string;
}

/** Airlock step type (1, 2, or 3) */
type AirlockStep = 1 | 2 | 3;

/**
 * Map insight IDs to emojis for the reveal step
 */
const insightEmojiMap: Record<string, string> = {
  coffee_spending: '☕',
  night_snacker: '🌙',
  weekend_shopper: '🛒',
  merchant_frequency: '🏪',
  category_dominance: '📊',
  late_night_purchase: '🌙',
  weekend_spending: '🛍️',
  first_scan: '🎉',
  milestone_10: '🔟',
  milestone_50: '⭐',
  milestone_100: '💯',
  default: '💡',
};

/**
 * Get emoji for an insight based on its ID
 */
function getInsightEmoji(insightId: string): string {
  // Check for exact match first
  if (insightEmojiMap[insightId]) {
    return insightEmojiMap[insightId];
  }
  // Check for partial matches
  for (const [key, emoji] of Object.entries(insightEmojiMap)) {
    if (insightId.includes(key)) {
      return emoji;
    }
  }
  return insightEmojiMap.default;
}

/**
 * CSS for float animation - defined as a style tag
 * to avoid conflicts and ensure proper keyframes
 */
const floatAnimationStyles = `
@keyframes airlock-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.airlock-emoji-animated {
  animation: airlock-float 2s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .airlock-emoji-animated {
    animation: none;
  }
}
`;

/**
 * Progress dots component showing current step
 */
const ProgressDots: React.FC<{ currentStep: AirlockStep }> = ({ currentStep }) => (
  <div
    className="flex gap-2 mt-2"
    role="progressbar"
    aria-valuemin={1}
    aria-valuemax={3}
    aria-valuenow={currentStep}
    aria-label={`Step ${currentStep} of 3`}
  >
    {[1, 2, 3].map((step) => (
      <div
        key={step}
        className={`h-2 rounded-full transition-all duration-200 ${
          step === currentStep ? 'w-6 bg-[var(--primary)]' : 'w-2 bg-[var(--border-medium)]'
        }`}
        aria-hidden="true"
      />
    ))}
  </div>
);

export const AirlockSequence: React.FC<AirlockSequenceProps> = ({
  insight,
  onComplete,
  onDismiss,
  theme: _theme, // Reserved for future dark/light mode overrides
  t,
}) => {
  const [step, setStep] = useState<AirlockStep>(1);

  // Advance to next step
  const handleNextStep = useCallback(() => {
    if (step < 3) {
      setStep((prev) => (prev + 1) as AirlockStep);
    }
  }, [step]);

  // Handle completion (step 3 button)
  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  // Handle dismiss (step 2 "Maybe later" button)
  const handleDismiss = useCallback(() => {
    onDismiss();
  }, [onDismiss]);

  // Get emoji for the reveal step
  const revealEmoji = useMemo(
    () => getInsightEmoji(insight.insightId),
    [insight.insightId]
  );

  // Determine card styling based on step (step 3 gets special reveal gradient)
  const cardStyles = useMemo(() => {
    const baseStyles = {
      backgroundColor: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-lg, 12px)',
      padding: '24px',
      border: '1px solid var(--border-light)',
      boxShadow: 'var(--shadow-lg)',
    };

    if (step === 3) {
      return {
        ...baseStyles,
        background: 'linear-gradient(135deg, var(--warning-light), #fef9c3)',
        borderColor: 'var(--warning)',
      };
    }

    return baseStyles;
  }, [step]);

  return (
    <>
      {/* Inject float animation styles */}
      <style>{floatAnimationStyles}</style>

      <div
        className="airlock-card"
        style={cardStyles}
        role="dialog"
        aria-labelledby="airlock-title"
        aria-describedby="airlock-subtitle"
      >
        <div className="airlock-container flex flex-col gap-4 items-center text-center p-5">
          {/* Step 1: Curiosity Gate */}
          {step === 1 && (
            <>
              <div className="airlock-emoji-animated text-[64px]" aria-hidden="true">
                🔮
              </div>
              <div
                id="airlock-title"
                className="text-xl font-bold"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}
              >
                {t('airlockCuriosityTitle')}
              </div>
              <div
                id="airlock-subtitle"
                className="text-sm max-w-[280px]"
                style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family)' }}
              >
                {t('airlockCuriositySubtitle')}
              </div>
              <ProgressDots currentStep={1} />
              <button
                onClick={handleNextStep}
                className="mt-4 px-8 py-3 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-md min-h-[44px] min-w-[44px]"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {t('tellMeMore')}
              </button>
            </>
          )}

          {/* Step 2: Playful Brace */}
          {step === 2 && (
            <>
              <div className="airlock-emoji-animated text-[64px]" aria-hidden="true">
                🎢
              </div>
              <div
                id="airlock-title"
                className="text-xl font-bold"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}
              >
                {t('airlockBraceTitle')}
              </div>
              <div
                id="airlock-subtitle"
                className="text-sm max-w-[280px]"
                style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family)' }}
              >
                {t('airlockBraceSubtitle')}
              </div>
              <ProgressDots currentStep={2} />
              <button
                onClick={handleNextStep}
                className="mt-4 px-8 py-3 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-md min-h-[44px] min-w-[44px]"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {t('imReady')}
              </button>
              <button
                onClick={handleDismiss}
                className="mt-2 px-8 py-3 rounded-full text-sm font-semibold transition-all hover:opacity-80 min-h-[44px] min-w-[44px]"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {t('maybeLater')}
              </button>
            </>
          )}

          {/* Step 3: The Reveal */}
          {step === 3 && (
            <>
              <div className="airlock-emoji-animated text-[64px]" aria-hidden="true">
                {revealEmoji}
              </div>
              <div
                id="airlock-title"
                className="text-xl font-bold"
                style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-family)' }}
              >
                {insight.title || t('airlockRevealTitle')}
              </div>
              <div
                id="airlock-subtitle"
                className="text-sm max-w-[280px]"
                style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family)' }}
              >
                {insight.message || t('airlockRevealSubtitle')}
              </div>

              {/* Recommendation box - Placeholder for Epic 15 */}
              <div
                className="w-full rounded-lg p-3 mt-4 text-center"
                style={{ backgroundColor: 'var(--bg-secondary)' }}
              >
                <div
                  className="text-xs mb-1"
                  style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-family)' }}
                >
                  💡 {t('airlockRecommendationLabel')}
                </div>
                <div
                  className="text-sm"
                  style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-family)' }}
                >
                  {t('airlockRecommendationPlaceholder')}
                </div>
              </div>

              <ProgressDots currentStep={3} />
              <button
                onClick={handleComplete}
                className="mt-4 px-8 py-3 rounded-full text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-md min-h-[44px] min-w-[44px]"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  fontFamily: 'var(--font-family)',
                }}
              >
                {t('understood')}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};
