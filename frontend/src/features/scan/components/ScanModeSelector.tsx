/**
 * Story 14d.7: Mode Selector Popup
 *
 * Floating card popup triggered by long-press on FAB that allows users to select
 * between scan modes: single receipt, batch scan, or credit card statement (placeholder).
 *
 * Design: Style 19 - Card Compact + Credits
 * Reference: docs/uxui/mockups/00_components/scan-mode-selector.html
 *
 * Key Features:
 * - Header with credit badges (super + normal)
 * - Three mode options with gradient icons
 * - Credit cost badge for each mode
 * - Accessibility: role="menu", keyboard navigation, focus management
 * - Request precedence: NEVER appears when request is in progress
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { Camera, Layers, CreditCard, Zap, Clock } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// =============================================================================
// Types
// =============================================================================

export type ScanModeId = 'single' | 'batch' | 'statement';

export interface ScanModeSelectorProps {
  /** Whether the popup is visible */
  isOpen: boolean;
  /** Callback when popup should close */
  onClose: () => void;
  /** Callback when a mode is selected */
  onSelectMode: (mode: ScanModeId) => void;
  /** Normal credits remaining */
  normalCredits: number;
  /** Super credits remaining */
  superCredits: number;
  /** Translation function */
  t: (key: string, params?: Record<string, string | number>) => string;
}

// Use LucideIcon type from lucide-react for proper typing
type LucideIcon = typeof Camera;

interface ScanModeConfig {
  id: ScanModeId;
  icon: LucideIcon;
  labelKey: string;
  descriptionKey: string;
  creditType: 'normal' | 'super';
  creditCost: number;
  gradient: string;
  disabled: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const SCAN_MODES: readonly ScanModeConfig[] = [
  {
    id: 'single',
    icon: Camera,
    labelKey: 'scanModeSingle',
    descriptionKey: 'scanModeSingleDesc',
    creditType: 'normal',
    creditCost: 1,
    gradient: 'from-emerald-600 to-emerald-700',
    disabled: false,
  },
  {
    id: 'batch',
    icon: Layers,
    labelKey: 'scanModeBatch',
    descriptionKey: 'scanModeBatchDesc',
    creditType: 'super',
    creditCost: 1,
    gradient: 'from-amber-400 to-amber-500',
    disabled: false,
  },
  {
    id: 'statement',
    icon: CreditCard,
    labelKey: 'scanModeStatement',
    descriptionKey: 'scanModeStatementDesc',
    creditType: 'super',
    creditCost: 1,
    gradient: 'from-violet-400 to-violet-600',
    disabled: false, // Enabled but shows placeholder
  },
] as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format credits for display (e.g., 1000 → "1K")
 */
function formatCredits(n: number): string {
  if (n >= 1000) return `${Math.floor(n / 1000)}K`;
  return n.toString();
}

// =============================================================================
// Component
// =============================================================================

export function ScanModeSelector({
  isOpen,
  onClose,
  onSelectMode,
  normalCredits,
  superCredits,
  t,
}: ScanModeSelectorProps) {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);

  // AC29: Focus management - focus first enabled option on open
  useEffect(() => {
    if (isOpen && containerRef.current) {
      // Small delay to ensure animation doesn't interfere
      const timer = setTimeout(() => {
        // Find and focus the first enabled button
        const firstEnabled = containerRef.current?.querySelector<HTMLButtonElement>(
          'button[role="menuitem"]:not([disabled])'
        );
        firstEnabled?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // AC24, AC30: Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Arrow key navigation
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const buttons = containerRef.current?.querySelectorAll<HTMLButtonElement>(
          'button[role="menuitem"]:not([disabled])'
        );
        if (!buttons || buttons.length === 0) return;

        const currentIndex = Array.from(buttons).findIndex(
          (btn) => btn === document.activeElement
        );
        let nextIndex: number;

        if (e.key === 'ArrowDown') {
          nextIndex = currentIndex < buttons.length - 1 ? currentIndex + 1 : 0;
        } else {
          nextIndex = currentIndex > 0 ? currentIndex - 1 : buttons.length - 1;
        }

        buttons[nextIndex]?.focus();
      }
    },
    [onClose]
  );

  // AC19-21: Handle mode selection
  const handleSelect = useCallback(
    (modeId: ScanModeId) => {
      onSelectMode(modeId);
      onClose();
    },
    [onSelectMode, onClose]
  );

  // Don't render if not open
  if (!isOpen) return null;

  // Check credit availability for each mode
  const getHasCredits = (mode: ScanModeConfig): boolean => {
    if (mode.id === 'statement') return true; // Statement always "available" (shows placeholder)
    return mode.creditType === 'super'
      ? superCredits >= mode.creditCost
      : normalCredits >= mode.creditCost;
  };

  return (
    <>
      {/* AC9: Semi-transparent backdrop */}
      <div
        className="fixed inset-0 z-[90] bg-black/30"
        onClick={onClose}
        aria-hidden="true"
        data-testid="scan-mode-selector-backdrop"
      />

      {/* Floating Card - AC6, AC7, AC8 */}
      <div
        ref={containerRef}
        className={`fixed z-[95] bottom-[72px] left-3 right-3
                   rounded-2xl shadow-2xl border overflow-hidden
                   bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700
                   ${!prefersReducedMotion ? 'animate-in slide-in-from-bottom-2 duration-200' : ''}`}
        role="menu"
        aria-label={t('scanModeSelectorTitle')}
        onKeyDown={handleKeyDown}
        data-testid="scan-mode-selector"
      >
        {/* Header with credits - AC10, AC11, AC12, AC13 */}
        <div
          className="flex items-center justify-between px-4 py-2 border-b
                      bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700"
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            {t('scanModeSelectorTitle')}
          </span>

          {/* Credit badges */}
          <div className="flex items-center gap-2">
            {/* Super credits (lightning bolt) - amber */}
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full
                         bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700"
              data-testid="super-credits-badge"
            >
              <Zap
                className="w-3 h-3 text-amber-600 dark:text-amber-400"
                fill="currentColor"
              />
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                {formatCredits(superCredits)}
              </span>
            </div>

            {/* Normal credits (clock) */}
            <div
              className="flex items-center gap-1 px-2 py-0.5 rounded-full
                         bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600"
              data-testid="normal-credits-badge"
            >
              <Clock className="w-3 h-3 text-gray-500 dark:text-gray-400" />
              <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                {formatCredits(normalCredits)}
              </span>
            </div>
          </div>
        </div>

        {/* Mode options - AC14-AC18 */}
        <div className="p-3 space-y-2">
          {SCAN_MODES.map((mode) => {
            const Icon = mode.icon;
            const hasCredits = getHasCredits(mode);
            const isDisabled = !hasCredits && mode.id !== 'statement';

            return (
              <button
                key={mode.id}
                className={`w-full flex items-center gap-3 p-3 rounded-xl
                           transition-transform
                           bg-gray-50 dark:bg-gray-900
                           ${!prefersReducedMotion ? 'hover:scale-[1.01]' : ''}
                           ${mode.id === 'statement' ? 'opacity-80' : ''}
                           ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => !isDisabled && handleSelect(mode.id)}
                disabled={isDisabled}
                role="menuitem"
                aria-disabled={isDisabled}
                tabIndex={isDisabled ? -1 : 0}
                data-testid={`scan-mode-${mode.id}`}
              >
                {/* Mode icon with gradient background - AC15, AC16 */}
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center
                             shadow-sm bg-gradient-to-br ${mode.gradient}`}
                >
                  <Icon className="w-5 h-5 text-white" strokeWidth={2} />
                </div>

                {/* Label and description */}
                <div className="flex-1 text-left">
                  <div className="font-semibold text-sm text-gray-900 dark:text-white">
                    {t(mode.labelKey)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t(mode.descriptionKey)}
                  </div>
                </div>

                {/* Credit cost badge - AC17, AC18 */}
                {mode.id === 'statement' ? (
                  <span
                    className="text-xs font-bold px-2 py-1 rounded-full
                              bg-emerald-100 dark:bg-emerald-900/30
                              text-emerald-700 dark:text-emerald-400"
                  >
                    {t('comingSoon')}
                  </span>
                ) : mode.creditType === 'super' ? (
                  <div
                    className="flex items-center gap-1 px-2 py-1 rounded-full
                               bg-amber-100 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700"
                  >
                    <Zap
                      className="w-3 h-3 text-amber-600 dark:text-amber-400"
                      fill="currentColor"
                    />
                    <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                      1 super
                    </span>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-1 px-2 py-1 rounded-full
                               bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600"
                  >
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                      {t('scanModeCredit', { count: mode.creditCost })}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default ScanModeSelector;
