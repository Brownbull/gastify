/**
 * Sticky header bar for TransactionEditorViewInternal.
 *
 * Story 15b-2o: Extracted from TransactionEditorViewInternal.tsx
 * Presentation-only component — all data and callbacks via props.
 */

import React from 'react';
import {
  Trash2,
  X,
  Camera,
  ChevronLeft,
  Zap,
  Info,
} from 'lucide-react';
import { formatCreditsDisplay } from '@/utils/creditFormatters';
import type { UserCredits } from '@/types/scan';

export interface EditorHeaderBarProps {
  mode: 'new' | 'existing';
  transactionId?: string;
  credits: UserCredits;
  onCancelClick: () => void;
  onDeleteClick: () => void;
  onCreditInfoClick: () => void;
  t: (key: string) => string;
}

export const EditorHeaderBar: React.FC<EditorHeaderBarProps> = ({
  mode,
  transactionId,
  credits,
  onCancelClick,
  onDeleteClick,
  onCreditInfoClick,
  t,
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
            onClick={onCancelClick}
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
            {mode === 'new' ? (t('scanViewTitle') || 'Escanea') : t('myPurchase')}
          </h1>
        </div>

        {/* Right side: Credit badges + Close/Delete button */}
        <div className="flex items-center gap-2">
          {/* Credit badges */}
          {credits && (
            <button
              onClick={onCreditInfoClick}
              className="flex items-center gap-1.5 px-2 py-1 rounded-full transition-all active:scale-95"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-light)',
              }}
              aria-label={t('creditInfo')}
            >
              <div
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
              >
                <Zap size={10} strokeWidth={2.5} />
                <span>{formatCreditsDisplay(credits.superRemaining)}</span>
              </div>
              <div
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}
              >
                <Camera size={10} strokeWidth={2.5} />
                <span>{formatCreditsDisplay(credits.remaining)}</span>
              </div>
              <Info size={12} style={{ color: 'var(--text-tertiary)' }} />
            </button>
          )}
          {/* Close/Delete button */}
          <button
            onClick={
              mode === 'existing' && transactionId
                ? onDeleteClick
                : onCancelClick
            }
            className="min-w-10 min-h-10 flex items-center justify-center"
            aria-label={mode === 'existing' && transactionId ? t('delete') : t('cancel')}
            style={{
              color: mode === 'existing' && transactionId ? 'var(--negative-primary)' : 'var(--text-primary)',
            }}
          >
            {mode === 'existing' && transactionId ? (
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
