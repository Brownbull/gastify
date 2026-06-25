import { useState } from "react";
import { ShareIcon } from "@design-system/assets/icons";
import { ReportDetail } from "@design-system/molecules/ReportDetail";
import { SegmentedToggle } from "@design-system/atoms/SegmentedToggle";
import { TIMEFRAME_REPORTS, REPORT_PERIOD_META, REPORT_PERIOD_VALUES, type ReportPeriod } from "@lib/reportTimeframeFixtures";

/**
 * ReportViewer (DM-34, settled = spike Option E) — the production Reports
 * surface:
 *   - a header row: "Resumen" title + a bare share icon (top-right, no container)
 *   - a full-width timeframe bar (Semanal/Mensual/Trimestral/Anual)
 *   - a value step-selector (‹ value ›) to page through the periods of that
 *     timeframe — same center-value + side-controls pattern as the transactions
 *     filter's Period navigator
 *   - the timeframe-aware ReportDetail body
 *
 * PDF export is presentational (mockup) — `onShare` fires with the active period
 * + value so a real exporter can wire in later. Changing the timeframe resets the
 * value cursor to the current (last) period of that timeframe.
 */
export interface ReportViewerProps {
  title?: string;
  defaultPeriod?: ReportPeriod;
  /** fired when share is tapped, with the active timeframe + centered value. */
  onShare?: (period: ReportPeriod, value: string) => void;
  className?: string;
}

export function ReportViewer({ title = "Resumen", defaultPeriod = "monthly", onShare, className = "" }: ReportViewerProps) {
  const [period, setPeriod] = useState<ReportPeriod>(defaultPeriod);
  // value cursor within the timeframe — default to the current (last) period.
  const values = REPORT_PERIOD_VALUES[period];
  const [valueIdx, setValueIdx] = useState<number>(values.length - 1);
  const report = TIMEFRAME_REPORTS[period];
  const currentValue = values[Math.min(valueIdx, values.length - 1)];

  function changePeriod(next: ReportPeriod) {
    setPeriod(next);
    setValueIdx(REPORT_PERIOD_VALUES[next].length - 1); // reset to current
  }

  return (
    <div className={`flex flex-col gap-gt-12 ${className}`} data-testid="report-viewer">
      {/* header — title + bare share icon (top-right, no container) */}
      <div className="flex items-center gap-gt-8">
        <h3 className="min-w-0 flex-1 truncate font-gt-display text-gt-lg font-extrabold text-gt-ink">{title}</h3>
        <button
          type="button"
          aria-label="Compartir o descargar PDF"
          title="Compartir / descargar PDF"
          onClick={() => onShare?.(period, currentValue)}
          className="grid h-8 w-8 shrink-0 place-items-center text-gt-ink-2 transition duration-150 hover:text-gt-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25"
        >
          <ShareIcon className="h-6 w-6" />
        </button>
      </div>

      {/* full-width timeframe bar */}
      <SegmentedToggle
        segments={REPORT_PERIOD_META.map((p) => ({ id: p.id, label: p.label }))}
        value={period}
        onChange={(id) => changePeriod(id as ReportPeriod)}
        tone="primary"
        size="sm"
        fill
      />

      {/* value step-selector — ‹ value › (transactions-filter Period pattern) */}
      <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-gt-8">
        <button
          type="button"
          aria-label="Período anterior"
          disabled={valueIdx === 0}
          onClick={() => setValueIdx((i) => Math.max(0, i - 1))}
          className="grid h-11 w-11 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface text-gt-ink shadow-gt-xs transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-sm disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 disabled:hover:shadow-gt-xs"
        >
          <span aria-hidden="true" className="ml-0.5 h-2.5 w-2.5 rotate-45 border-b-2 border-l-2 border-current" />
        </button>
        <span className="grid h-11 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-bg-3 px-gt-8 text-center font-gt-display text-gt-md font-extrabold leading-none text-gt-ink shadow-gt-xs">
          <span className="truncate">{currentValue}</span>
        </span>
        <button
          type="button"
          aria-label="Período siguiente"
          disabled={valueIdx >= values.length - 1}
          onClick={() => setValueIdx((i) => Math.min(values.length - 1, i + 1))}
          className="grid h-11 w-11 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface text-gt-ink shadow-gt-xs transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-sm disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0 disabled:hover:shadow-gt-xs"
        >
          <span aria-hidden="true" className="mr-0.5 h-2.5 w-2.5 rotate-45 border-r-2 border-t-2 border-current" />
        </button>
      </div>

      {/* the timeframe-aware report */}
      <ReportDetail report={report} />
    </div>
  );
}
