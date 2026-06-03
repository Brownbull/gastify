import { lazy, Suspense, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  currentPeriod,
  periodWindow,
  useInsightsSeries,
  useMonthlyInsights,
  type InsightDimension,
  type SeriesGranularity,
} from "@/hooks/useInsights";
import { useI18n } from "@/hooks/useI18n";
import { rollupToSlices } from "@/lib/chartData";
import {
  DimensionToggle,
  InsightsSkeleton,
  PeriodStepper,
  ChartFallback,
} from "@/components/insights/widgets";

const CategoryDonut = lazy(() => import("@/components/charts/CategoryDonut"));
const SpendTimeSeries = lazy(() => import("@/components/charts/SpendTimeSeries"));

/** Months of history to fetch per granularity (≤ backend 24-month cap). */
const WINDOW_MONTHS: Record<SeriesGranularity, number> = {
  month: 6,
  quarter: 12,
  year: 24,
};

export const Route = createFileRoute("/trends")({
  component: TrendsPage,
});

function TrendsPage() {
  const { t } = useI18n();
  const [period, setPeriod] = useState(() => currentPeriod());
  const [dimension, setDimension] = useState<InsightDimension>("transaction_category");
  const [granularity, setGranularity] = useState<SeriesGranularity>("month");
  const atCurrent = period >= currentPeriod();

  const monthly = useMonthlyInsights(period);
  const window = periodWindow(period, WINDOW_MONTHS[granularity]);
  const series = useInsightsSeries(window.from, window.to, granularity);

  const rows =
    dimension === "transaction_category"
      ? (monthly.data?.top_transaction_categories ?? [])
      : (monthly.data?.top_item_categories ?? []);
  const slices = monthly.data
    ? rollupToSlices(rows, monthly.data.total_spend_minor)
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
        <div className="flex items-center gap-2">
          <PeriodStepper period={period} atCurrent={atCurrent} onChange={setPeriod} />
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
          <DimensionToggle dimension={dimension} onChange={setDimension} />
        </div>
        {monthly.isLoading && <InsightsSkeleton />}
        {!monthly.isLoading && !hasDistribution && (
          <p className="py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            {t("dashboard.empty")}
          </p>
        )}
        {!monthly.isLoading && hasDistribution && monthly.data && (
          <Suspense fallback={<ChartFallback />}>
            <CategoryDonut slices={slices} currency={monthly.data.currency} />
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
          <GranularityToggle value={granularity} onChange={setGranularity} />
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

function GranularityToggle({
  value,
  onChange,
}: {
  value: SeriesGranularity;
  onChange: (value: SeriesGranularity) => void;
}) {
  const { t } = useI18n();
  const options: { value: SeriesGranularity; label: string }[] = [
    { value: "month", label: t("trends.granularity.month") },
    { value: "quarter", label: t("trends.granularity.quarter") },
    { value: "year", label: t("trends.granularity.year") },
  ];
  return (
    <div
      className="inline-flex rounded-lg border p-0.5 text-xs"
      style={{ borderColor: "var(--border)" }}
      role="group"
      aria-label="Series granularity"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
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
