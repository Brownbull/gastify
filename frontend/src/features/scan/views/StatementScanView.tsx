/**
 * StatementScanView
 *
 * Story 14d.9: Statement Scan Placeholder View
 * Placeholder view shown when users select "Estado de cuenta" from the mode selector.
 * Contains a "coming soon" message with a back button.
 *
 * UX Decision: Include statement scanning in the mode selector from day one to:
 * 1. Establish the UI pattern before the feature is built
 * 2. Gauge user interest (analytics on how often it's tapped)
 * 3. Prepare the architecture for easy feature addition later
 *
 * @see docs/sprint-artifacts/epic14d/stories/story-14d.9-statement-placeholder-view.md
 */

import { CreditCard, ArrowLeft } from 'lucide-react';
// Story 14e-11: Migrated from useScan (ScanContext) to useScanActions (Zustand store)
import { useScanActions } from '@features/scan/store';

export interface StatementScanViewProps {
  /** Theme for styling */
  theme: 'light' | 'dark';
  /** Translation function */
  t: (key: string) => string;
  /** Callback to navigate back to dashboard */
  onBack: () => void;
}

// Shared hover/focus style handler for buttons
const getButtonHoverStyle = (isDark: boolean, isBackButton: boolean) => ({
  onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = isBackButton
      ? (isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9')
      : '#7c3aed';
  },
  onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = isBackButton ? 'transparent' : '#8b5cf6';
  },
  // M2 Fix: Add focus handlers for keyboard accessibility
  onFocus: (e: React.FocusEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = isBackButton
      ? (isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9')
      : '#7c3aed';
  },
  onBlur: (e: React.FocusEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = isBackButton ? 'transparent' : '#8b5cf6';
  },
});

/**
 * Placeholder view for credit card statement scanning feature.
 * AC1-AC16: Implements all acceptance criteria from story 14d.9
 */
export function StatementScanView({ theme, t, onBack }: StatementScanViewProps) {
  // Story 14e-11: Use Zustand store actions instead of ScanContext
  const { reset } = useScanActions();

  // AC7, AC8: Both buttons call reset() to return to idle state
  const handleBack = () => {
    reset(); // AC9: Clears scan state, FAB returns to idle
    onBack(); // AC10: Navigate back to dashboard
  };

  const isDark = theme === 'dark';

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        backgroundColor: isDark ? 'var(--bg)' : '#f8fafc',
        color: isDark ? 'var(--primary)' : '#1e293b',
        // L1 Fix: Account for safe area insets on iOS
        paddingTop: 'env(safe-area-inset-top, 0px)',
      }}
      data-testid="statement-scan-view"
    >
      {/* AC1, AC2: Header with title and back button */}
      <header
        className="border-b px-4 py-3 flex items-center gap-3"
        style={{
          backgroundColor: isDark ? 'var(--card-bg)' : '#ffffff',
          borderColor: isDark ? 'var(--border)' : '#e2e8f0',
        }}
      >
        <button
          onClick={handleBack}
          className="p-2 -ml-2 rounded-full transition-colors"
          style={{
            backgroundColor: 'transparent',
          }}
          {...getButtonHoverStyle(isDark, true)}
          aria-label={t('back') || 'Volver'}
          data-testid="back-button"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold">
          {t('statementScanTitle') || 'Estado de Cuenta'}
        </h1>
      </header>

      {/* AC3-AC6: Content with icon, heading, and description */}
      <main
        className="flex-1 flex flex-col items-center justify-center p-6 text-center"
        style={{
          // L1 Fix: Account for safe area at bottom on iOS
          paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {/* AC3: Large credit card icon with violet theme (AC11) */}
        <div
          className="rounded-full p-6 mb-6"
          style={{
            backgroundColor: isDark ? 'rgba(139, 92, 246, 0.2)' : '#ede9fe',
          }}
          data-testid="icon-container"
        >
          <CreditCard
            className="w-16 h-16"
            style={{ color: '#8b5cf6' }}
            data-testid="credit-card-icon"
          />
        </div>

        {/* AC4: "Próximamente" heading */}
        <h2
          className="text-2xl font-bold mb-2"
          style={{
            color: isDark ? 'var(--primary)' : '#1e293b',
          }}
        >
          {t('comingSoon') || 'Próximamente'}
        </h2>

        {/* AC5: Explanatory text in Spanish */}
        <p
          className="max-w-sm mb-8"
          style={{
            color: isDark ? 'var(--secondary)' : '#64748b',
          }}
        >
          {t('statementScanDescription') ||
            'Pronto podrás escanear estados de cuenta de tarjetas de crédito y añadir transacciones automáticamente.'}
        </p>

        {/* AC6: "Volver al inicio" button with violet theme (AC11) */}
        <button
          onClick={handleBack}
          className="px-6 py-3 rounded-xl font-medium transition-colors"
          style={{
            backgroundColor: '#8b5cf6',
            color: '#ffffff',
          }}
          {...getButtonHoverStyle(isDark, false)}
          data-testid="return-button"
        >
          {t('returnToHome') || 'Volver al inicio'}
        </button>
      </main>
    </div>
  );
}
