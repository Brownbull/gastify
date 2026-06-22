import { MetricCard } from "@design-system/molecules/SummaryStats";
import { SpendingDonut } from "@design-system/molecules/SpendingDonut";
import { ReportGroupCard } from "@design-system/molecules/ReportGroupCard";
import { StatusCard } from "@design-system/molecules/StatusCard";
import { TrendChange } from "@design-system/atoms/TrendChange";
import { clpK } from "@lib/analyticsFixtures";
import { sectionSegments, type TimeframeReport, type ReportGroup } from "@lib/reportTimeframeFixtures";

/**
 * ReportDetail (DM-34) — the full timeframe-aware report, ported from legacy
 * `ReportDetailOverlay`. Density escalates with the period (same layout, more
 * fields): hero + 💡 insight + 🏆 highlights (monthly/quarterly/annual only) +
 * 🏪 establishments section (donut + group cards) + 🛒 items section. Weekly
 * shows top-3 groups + no highlights; monthly+ show all groups + highlights;
 * annual is the richest.
 */
function Section({ icon, title, groups, hideRowIcons, periodLabel }: { icon: string; title: string; groups: ReportGroup[]; hideRowIcons?: boolean; periodLabel: string }) {
  if (groups.length === 0) return null;
  const total = groups.reduce((s, g) => s + g.amount, 0);
  return (
    <div className="flex flex-col gap-gt-8">
      <h4 className="flex items-center gap-gt-6 font-gt-display text-gt-md font-extrabold text-gt-ink">
        <span aria-hidden="true">{icon}</span>
        {title}
      </h4>
      {groups.length > 1 ? (
        <SpendingDonut segments={sectionSegments(groups)} total={total} periodLabel={periodLabel} size={104} />
      ) : null}
      <div className="flex flex-col gap-gt-6">
        {groups.map((g) => (
          <ReportGroupCard key={g.id} group={g} hideRowIcons={hideRowIcons} />
        ))}
      </div>
    </div>
  );
}

export interface ReportDetailProps {
  report: TimeframeReport;
  className?: string;
}

export function ReportDetail({ report, className = "" }: ReportDetailProps) {
  return (
    <div className={`flex flex-col gap-gt-16 ${className}`} data-testid={`report-detail-${report.period}`}>
      {/* hero */}
      <MetricCard
        label={report.periodLabel}
        value={clpK(report.total)}
        deltaSlot={
          <span className="flex flex-col items-end gap-gt-2">
            <TrendChange direction={report.change.dir} percent={report.change.pct} pill size="md" />
            <span className="text-gt-xs font-medium text-gt-ink-3">{report.change.label}</span>
          </span>
        }
      />

      {/* 💡 insight (+ persona hook for quarterly/annual) */}
      <StatusCard tone="info" title="Insight personalizado">
        {report.insight}
        {report.hook ? <span className="mt-gt-4 block italic text-gt-ink-3">“{report.hook}”</span> : null}
      </StatusCard>

      {/* 🏆 highlights — monthly/quarterly/annual only */}
      {report.highlights && report.highlights.length > 0 ? (
        <StatusCard tone="warning" title={`🏆 Highlights`}>
          <ul className="flex flex-col gap-gt-4">
            {report.highlights.map((h) => (
              <li key={h.label} className="flex items-center justify-between gap-gt-8">
                <span className="text-gt-sm font-medium text-gt-ink-2">{h.label}</span>
                <span className="text-gt-sm font-extrabold text-gt-ink">{h.value}</span>
              </li>
            ))}
          </ul>
        </StatusCard>
      ) : null}

      {/* 🏪 establishments */}
      <Section icon="🏪" title="Desglose por tipo de tienda" groups={report.establishments} periodLabel={report.title} />

      {/* 🛒 items (no per-row icons) */}
      <Section icon="🛒" title="Desglose por tipo de producto" groups={report.itemFamilias} hideRowIcons periodLabel={report.title} />
    </div>
  );
}
