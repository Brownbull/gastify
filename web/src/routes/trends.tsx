import { lazy, Suspense, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  periodWindow,
  useInsightsSeries,
  useInsightsTree,
  type SeriesGranularity,
} from "@/hooks/useInsights";
import { useI18n } from "@/hooks/useI18n";
import { flattenTreeAtLevel } from "@/lib/chartData";
import {
  currentPeriodKey,
  monthKeyOf,
  shiftPeriodKey,
  type PeriodGranularity,
} from "@/lib/periodKeys";
import { InsightsSkeleton, ChartFallback } from "@/components/insights/widgets";

const CategoryDonut = lazy(() => import("@/components/charts/CategoryDonut"));
const SpendTimeSeries = lazy(() => import("@/components/charts/SpendTimeSeries"));

/** Months of history to fetch per granularity (≤ backend 24-month cap). */
const WINDOW_MONTHS: Record<SeriesGranularity, number> = {
  // Trends offers month/quarter/year in its toggle; `week` is in the shared
  // SeriesGranularity (Reports uses it, D77) so the map stays exhaustive.
  week: 3,
  month: 6,
  quarter: 12,
  year: 24,
};

export const Route = createFileRoute("/trends")({
  component: TrendsPage,
});

function TrendsPage() {
  const { t } = useI18n();
  // The W/M/Q/Y temporal bar (legacy TimePeriod port): one page-level granularity +
  // a matching period key drive BOTH the distribution and the series.
  const [granularity, setGranularity] = useState<PeriodGranularity>("month");
  const [period, setPeriod] = useState(() => currentPeriodKey("month"));
  // The L1-L4 classification bar (legacy DonutViewMode port) over the 4-level tree.
  const [level, setLevel] = useState(2);
  const atCurrent = period >= currentPeriodKey(granularity);

  const switchGranularity = (g: PeriodGranularity) => {
    setGranularity(g);
    setPeriod(currentPeriodKey(g));
  };

  const tree = useInsightsTree(period, "transaction_category");
  const window = periodWindow(monthKeyOf(period), WINDOW_MONTHS[granularity]);
  const series = useInsightsSeries(window.from, window.to, granularity as SeriesGranularity);

  const slices = tree.data
    ? flattenTreeAtLevel(tree.data.roots ?? [], level, tree.data.total_spend_minor)
    : [];
  const hasDistribution = slices.length > 0;
  const seriesPoints = series.data?.points ?? [];
  const hasSeriesSpend = seriesPoints.some((point) => point.total_spend_minor > 0);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
            {t("trends.title")}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {t("trends.subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TemporalBar value={granularity} onChange={switchGranularity} />
          <div className="flex items-center gap-1" data-testid="period-stepper">
            <button
              type="button"
              aria-label="Previous period"
              data-testid="period-prev"
              onClick={() => setPeriod(shiftPeriodKey(period, -1))}
              className="rounded-md border px-2 py-1.5 text-sm"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              ←
            </button>
            <span
              className="min-w-20 text-center text-sm font-medium"
              data-testid="period-label"
              style={{ color: "var(--text)" }}
            >
              {period}
            </span>
            <button
              type="button"
              aria-label="Next period"
              data-testid="period-next"
              disabled={atCurrent}
              onClick={() => setPeriod(shiftPeriodKey(period, 1))}
              className="rounded-md border px-2 py-1.5 text-sm disabled:opacity-40"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              →
            </button>
          </div>
          <Link
            to="/"
            className="rounded-md border px-3 py-1.5 text-sm font-medium"
            style={{
              borderColor: "var(--border)",
              color: "var(--primary)",
              backgroundColor: "var(--surface)",
            }}
          >
            {t("trends.viewDashboard")}
          </Link>
        </div>
      </header>

      {/* Distribution donut for the focus month */}
      <section
        className="rounded-lg border p-5"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            {t("trends.distribution")}
          </h2>
          <LevelBar value={level} onChange={setLevel} />
        </div>
        {tree.isLoading && <InsightsSkeleton />}
        {!tree.isLoading && !hasDistribution && (
          <p className="py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            {t("dashboard.empty")}
          </p>
        )}
        {!tree.isLoading && hasDistribution && tree.data && (
          <Suspense fallback={<ChartFallback />}>
            <CategoryDonut slices={slices} currency={tree.data.currency} />
          </Suspense>
        )}
      </section>

      {/* Spend over time */}
      <section
        className="rounded-lg border p-5"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            {t("trends.overTime")}
          </h2>
        </div>
        {series.isLoading && <ChartFallback />}
        {!series.isLoading && !hasSeriesSpend && (
          <p
            className="py-8 text-center text-sm"
            style={{ color: "var(--text-muted)" }}
            data-testid="trends-no-series"
          >
            {t("trends.noSeries")}
          </p>
        )}
        {!series.isLoading && hasSeriesSpend && series.data && (
          <Suspense fallback={<ChartFallback />}>
            <SpendTimeSeries points={seriesPoints} currency={series.data.currency} />
          </Suspense>
        )}
      </section>
    </div>
  );
}

function TemporalBar({
  value,
  onChange,
}: {
  value: PeriodGranularity;
  onChange: (value: PeriodGranularity) => void;
}) {
  const { t } = useI18n();
  const options: { value: PeriodGranularity; label: string }[] = [
    { value: "week", label: "W" },
    { value: "month", label: t("trends.granularity.month") },
    { value: "quarter", label: t("trends.granularity.quarter") },
    { value: "year", label: t("trends.granularity.year") },
  ];
  return (
    <div
      className="inline-flex rounded-lg border p-0.5 text-xs"
      style={{ borderColor: "var(--border)" }}
      role="group"
      aria-label="Temporal granularity"
      data-testid="temporal-bar"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            data-testid={`temporal-pill-${option.value}`}
            onClick={() => onChange(option.value)}
            className="rounded-md px-3 py-1 font-medium transition-colors"
            style={{
              backgroundColor: active ? "var(--primary-light)" : "transparent",
              color: active ? "var(--primary)" : "var(--text-secondary)",
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}


/** The L1–L4 classification-level bar (legacy DonutViewMode port): flatten the spend
 * tree at Industry (L1) / Store-type (L2) / Item-family (L3) / Item (L4). */
function LevelBar({ value, onChange }: { value: number; onChange: (level: number) => void }) {
  return (
    <div
      className="inline-flex rounded-lg border p-0.5 text-xs"
      style={{ borderColor: "var(--border)" }}
      role="group"
      aria-label="Classification level"
      data-testid="level-bar"
    >
      {[1, 2, 3, 4].map((level) => {
        const active = level === value;
        return (
          <button
            key={level}
            type="button"
            aria-pressed={active}
            data-testid={`level-pill-${level}`}
            onClick={() => onChange(level)}
            className="rounded-md px-3 py-1 font-medium transition-colors"
            style={{
              backgroundColor: active ? "var(--primary-light)" : "transparent",
              color: active ? "var(--primary)" : "var(--text-secondary)",
            }}
          >
            {`L${level}`}
          </button>
        );
      })}
    </div>
  );
}
