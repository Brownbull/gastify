/**
 * BatchSummary Component
 *
 * Story 10.7: Batch Mode Summary
 * Story 14e-37: Migrated to use Zustand store (optional)
 * Displays a unified summary after scanning multiple receipts in one session.
 *
 * Features:
 * - Total amount scanned (AC #2)
 * - Receipt count (AC #3)
 * - Historical comparison vs last week (AC #4)
 * - Top insight highlighted (AC #5)
 * - Silence insights option (AC #6, #7, #8)
 * - Dark mode support (AC #9)
 *
 * Story 14e-37: Can now use store for dismiss action.
 * onDismiss is optional - if not provided, uses useInsightStore.
 */

// Story 10.7: BatchSummary component
import { Receipt, TrendingUp, TrendingDown, Bell, BellOff } from 'lucide-react';
import type { Transaction } from '@/types/transaction';
import { Insight } from '@/types/insight';
import { useInsightActions } from '@/shared/stores';

interface BatchSummaryProps {
  /** Receipts saved in this batch session */
  receipts: Transaction[];
  /** Insights generated during this session */
  insights: Insight[];
  /** Total amount across all receipts */
  totalAmount: number;
  /** Total from same period last week (for comparison) */
  lastWeekTotal?: number;
  /** Handler for silence toggle */
  onSilence: () => void;
  /** Handler for dismissing the summary. Optional - uses store action if not provided (Story 14e-37) */
  onDismiss?: () => void;
  /** Whether insights are currently silenced */
  isSilenced: boolean;
  /** Current theme */
  theme: 'light' | 'dark';
}

/**
 * BatchSummary displays aggregated information about a multi-receipt scanning session.
 * Shows after 3+ receipts are scanned within a 30-minute window (AC #1).
 *
 * Story 14e-37: Can use store for dismiss action.
 */
export function BatchSummary({
  receipts,
  insights,
  totalAmount,
  lastWeekTotal,
  onSilence,
  onDismiss: onDismissProp,
  isSilenced,
  theme,
}: BatchSummaryProps) {
  // Story 14e-37: Use store action if onDismiss not provided
  const { hideBatchSummaryOverlay } = useInsightActions();
  const onDismiss = onDismissProp ?? hideBatchSummaryOverlay;
  // Find top insight by priority (AC #5)
  const topInsight = insights.length > 0
    ? insights.reduce((best, current) =>
        current.priority > best.priority ? current : best
      )
    : null;

  // Calculate comparison percentage (AC #4)
  const comparison = lastWeekTotal && lastWeekTotal > 0
    ? ((totalAmount - lastWeekTotal) / lastWeekTotal) * 100
    : null;

  const isDark = theme === 'dark';

  return (
    <div
      role="dialog"
      aria-label="Resumen de escaneo"
      className={`
        fixed inset-x-4 bottom-20 mx-auto max-w-md
        p-5 rounded-2xl shadow-xl z-50
        ${isDark
          ? 'bg-gray-800 text-white border border-gray-700'
          : 'bg-white text-gray-800 border border-gray-200'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className={`
          text-lg font-semibold
          ${isDark ? 'text-white' : 'text-gray-900'}
        `}>
          Resumen de escaneo
        </h2>
        <button
          onClick={onDismiss}
          className={`
            text-sm px-3 py-1 rounded-full
            ${isDark
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }
          `}
        >
          Cerrar
        </button>
      </div>

      {/* Stats Grid (AC #2, #3) */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Total Amount (AC #2) */}
        <div className={`
          p-3 rounded-xl
          ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}
        `}>
          <p className={`
            text-sm
            ${isDark ? 'text-gray-400' : 'text-gray-500'}
          `}>
            Total escaneado
          </p>
          <p className={`
            text-xl font-bold
            ${isDark ? 'text-white' : 'text-gray-900'}
          `}>
            ${totalAmount.toLocaleString('es-CL')}
          </p>
        </div>

        {/* Receipt Count (AC #3) */}
        <div className={`
          p-3 rounded-xl
          ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'}
        `}>
          <p className={`
            text-sm
            ${isDark ? 'text-gray-400' : 'text-gray-500'}
          `}>
            Boletas
          </p>
          <div className="flex items-center gap-2">
            <Receipt className={`w-5 h-5 ${isDark ? 'text-teal-400' : 'text-teal-600'}`} />
            <p className={`
              text-xl font-bold
              ${isDark ? 'text-white' : 'text-gray-900'}
            `}>
              {receipts.length}
            </p>
          </div>
        </div>
      </div>

      {/* Historical Comparison (AC #4) */}
      {comparison !== null && (
        <div className={`
          flex items-center gap-2 p-3 rounded-xl mb-4
          ${comparison < 0
            ? (isDark ? 'bg-green-900/30' : 'bg-green-50')
            : (isDark ? 'bg-orange-900/30' : 'bg-orange-50')
          }
        `}>
          {comparison < 0 ? (
            <TrendingDown className="w-5 h-5 text-green-500" />
          ) : (
            <TrendingUp className="w-5 h-5 text-orange-500" />
          )}
          <p className={`
            text-sm
            ${isDark ? 'text-gray-200' : 'text-gray-700'}
          `}>
            {comparison < 0
              ? `${Math.abs(Math.round(comparison))}% menos que la semana pasada`
              : `${Math.round(comparison)}% más que la semana pasada`
            }
          </p>
        </div>
      )}

      {/* Top Insight (AC #5) */}
      {topInsight && (
        <div className={`
          p-3 rounded-xl mb-4
          ${isDark ? 'bg-teal-900/30' : 'bg-teal-50'}
        `}>
          <p className={`
            text-sm font-medium mb-1
            ${isDark ? 'text-teal-400' : 'text-teal-700'}
          `}>
            {topInsight.title}
          </p>
          <p className={`
            text-sm
            ${isDark ? 'text-gray-300' : 'text-gray-600'}
          `}>
            {topInsight.message}
          </p>
        </div>
      )}

      {/* Silence Toggle (AC #6, #7, #8) */}
      <button
        onClick={onSilence}
        className={`
          w-full flex items-center justify-center gap-2
          py-3 rounded-xl transition-colors
          ${isSilenced
            ? (isDark
                ? 'bg-purple-900/50 text-purple-300'
                : 'bg-purple-100 text-purple-700')
            : (isDark
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
          }
        `}
      >
        {isSilenced ? (
          <>
            <BellOff className="w-4 h-4" />
            <span>Insights silenciados (4h)</span>
          </>
        ) : (
          <>
            <Bell className="w-4 h-4" />
            <span>Silenciar insights (4h)</span>
          </>
        )}
      </button>
    </div>
  );
}
