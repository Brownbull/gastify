/**
 * BatchCaptureCreditSection
 *
 * Story TD-16-3: Extracted from BatchCaptureView.tsx to reduce file size.
 * Credit usage breakdown section for batch capture mode.
 */

import React from 'react';
import { AlertTriangle, ArrowRight, MinusCircle, Clock } from 'lucide-react';

export interface BatchCaptureCreditSectionProps {
  superCreditsAvailable: number;
  creditsNeeded: number;
  creditsRemaining: number;
  hasImages: boolean;
  t: (key: string) => string;
}

export const BatchCaptureCreditSection: React.FC<BatchCaptureCreditSectionProps> = ({
  superCreditsAvailable,
  creditsNeeded,
  creditsRemaining,
  hasImages,
  t,
}) => {
  return (
    <div className="mb-4">
      {/* Section header with icon */}
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {t('batchCreditUsage')}
        </span>
      </div>

      {/* Credit rows */}
      <div
        className="rounded-xl p-3"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        {/* Credits needed - batch uses 1 credit total regardless of image count */}
        <div
          className="flex items-center justify-between py-2.5"
          style={{ borderBottom: '1px solid var(--border-light)' }}
        >
          <div className="flex items-center gap-2">
            <MinusCircle size={16} style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('batchCreditsNeeded')}
            </span>
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {creditsNeeded}
          </span>
        </div>

        {/* Credits available */}
        <div
          className="flex items-center justify-between py-2.5"
          style={{ borderBottom: '1px solid var(--border-light)' }}
        >
          <div className="flex items-center gap-2">
            <Clock size={16} style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('batchCreditsAvailable')}
            </span>
          </div>
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            {superCreditsAvailable}
          </span>
        </div>

        {/* Credits after */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-2">
            <ArrowRight size={16} style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {t('batchCreditsAfter')}
            </span>
          </div>
          <span
            className="text-sm font-semibold"
            style={{ color: creditsRemaining < 0 ? 'var(--error)' : 'var(--success)' }}
          >
            {hasImages ? creditsRemaining : superCreditsAvailable}
          </span>
        </div>
      </div>
    </div>
  );
};
