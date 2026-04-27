/**
 * Story 14e-9c: IdleState Component
 *
 * Renders when scan phase is 'idle'. Shows a camera-ready prompt.
 * Mode-aware: different messaging for single vs batch mode.
 *
 * @see docs/sprint-artifacts/epic14e-feature-architecture/stories/14e-9c-state-components-tests.md
 */
import React from 'react';
import { Camera, Layers } from 'lucide-react';
import { useScanPhase, useScanMode } from '../../store';

export interface IdleStateProps {
  /** Translation function */
  t: (key: string) => string;
  /** Theme for styling */
  theme: 'light' | 'dark';
  /** Optional callback when user taps to start scanning */
  onStartScan?: () => void;
}

/**
 * Idle state component - renders when no scan is active.
 *
 * Phase guard: Returns null if phase !== 'idle'
 * Mode-aware: Shows different prompts for single vs batch modes
 */
export const IdleState: React.FC<IdleStateProps> = ({ t, theme, onStartScan }) => {
  const phase = useScanPhase();
  const mode = useScanMode();

  // Phase guard - only render when idle
  if (phase !== 'idle') {
    return null;
  }

  const isDark = theme === 'dark';
  const Icon = mode === 'batch' ? Layers : Camera;

  // Mode-aware messaging
  const message = mode === 'batch'
    ? t('scanBatchPrompt') || 'Tap to add more receipts'
    : t('scanSinglePrompt') || 'Tap to scan a receipt';

  return (
    <div
      className="flex flex-col items-center justify-center p-8 rounded-xl"
      style={{
        backgroundColor: 'var(--surface)',
        border: `1px solid ${isDark ? '#334155' : '#e2e8f0'}`,
      }}
      role="status"
      aria-label={message}
    >
      {/* Icon */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{
          backgroundColor: isDark ? 'rgba(96, 165, 250, 0.2)' : 'rgba(59, 130, 246, 0.1)',
        }}
      >
        <Icon
          size={32}
          style={{ color: 'var(--accent)' }}
          aria-hidden="true"
        />
      </div>

      {/* Prompt message */}
      <p
        className="text-sm font-medium text-center"
        style={{ color: 'var(--secondary)' }}
      >
        {message}
      </p>

      {/* Optional start button */}
      {onStartScan && (
        <button
          onClick={onStartScan}
          className="mt-4 px-6 py-2 rounded-lg font-medium transition-colors"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'white',
          }}
          aria-label={t('scan') || 'Scan'}
        >
          {t('scan') || 'Scan'}
        </button>
      )}
    </div>
  );
};

export default IdleState;
