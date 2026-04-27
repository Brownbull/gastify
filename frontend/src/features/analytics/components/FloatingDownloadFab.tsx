/**
 * FloatingDownloadFab - Floating Action Button for Analytics Export
 *
 * A fixed-position FAB in the bottom-right corner that triggers CSV export.
 * Respects subscription tier and shows upgrade prompt for non-subscribers.
 *
 * Story 7.11: Floating Download FAB
 * @see docs/sprint-artifacts/epic7/story-7.11-floating-download-fab.md
 */

import React from 'react';
import { Loader2, BarChart2, FileText } from 'lucide-react';

export interface FloatingDownloadFabProps {
    /** Handler to trigger export */
    onExport: () => Promise<void>;
    /** Whether export is in progress */
    exporting: boolean;
    /** Whether this is a statistics export (year/quarter view) vs transaction export */
    isStatisticsExport: boolean;
    /** Theme for styling */
    theme: 'light' | 'dark';
    /** Translation function */
    t: (key: string) => string;
}

/**
 * FloatingDownloadFab Component
 *
 * Positioned in bottom-right corner, above the navigation bar.
 * - Fixed position with z-40 to float above content but below modals
 * - 48px size (w-12 h-12) with 44px minimum touch target
 * - Accent color background with white icon
 * - Shows appropriate icon based on export type:
 *   - BarChart2 for statistics (year/quarter views)
 *   - FileText for transactions (month/week/day views)
 *   - Loader2 spinner when exporting
 */
export const FloatingDownloadFab: React.FC<FloatingDownloadFabProps> = ({
    onExport,
    exporting,
    isStatisticsExport,
    theme,
    t,
}) => {
    const handleClick = async () => {
        if (exporting) return;
        await onExport();
    };

    return (
        <button
            onClick={handleClick}
            disabled={exporting}
            aria-label={t('downloadAnalytics')}
            aria-busy={exporting}
            className={`
                fixed bottom-24 right-4 z-40
                w-12 h-12 rounded-full
                bg-blue-600 hover:bg-blue-700
                text-white shadow-lg
                flex items-center justify-center
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${theme === 'dark' ? 'focus:ring-offset-slate-900' : 'focus:ring-offset-white'}
            `}
        >
            {exporting ? (
                <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            ) : isStatisticsExport ? (
                <BarChart2 className="w-5 h-5" aria-hidden="true" />
            ) : (
                <FileText className="w-5 h-5" aria-hidden="true" />
            )}
        </button>
    );
};

export default FloatingDownloadFab;
