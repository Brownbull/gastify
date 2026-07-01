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
import { Card } from "@/components/ui/Card";

const CategoryDonut = lazy(() => import("@/components/charts/CategoryDonut"));
const Treemap = lazy(() => import("@/components/charts/Treemap"));
const SankeyChart = lazy(() => import("@/components/charts/SankeyChart"));
const SpendTimeSeries = lazy(() => import("@/components/charts/SpendTimeSeries"));

type Representation = "donut" | "treemap" | "flow";

/** Months of history to fetch per granularity (≤ backend 24-month cap). */
const WINDOW_MONTHS: Record<SeriesGranularity, number> = {
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
  const [granularity, setGranularity] = useState<PeriodGranularity>("month");
  const [period, setPeriod] = useState(() => currentPeriodKey("month"));
  const [level, setLevel] = useState(2);
  const [representation, setRepresentation] = useState<Representation>("donut");
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
    <div className="space-y-gt-16">
      <header className="flex flex-wrap items-end justify-between gap-gt-10">
        <div className="hidden lg:block">
          <h1 className="font-gt-display text-gt-4xl font-extrabold text-gt-ink">{t("trends.title")}</h1>
          <p className="mt-gt-2 text-gt-sm font-medium text-gt-ink-2">{t("trends.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-gt-8">
          <TemporalBar value={granularity} onChange={switchGranularity} />
          <div className="flex items-center gap-gt-4" data-testid="period-stepper">
            <button
              type="button"
              aria-label="Previous period"
              data-testid="period-prev"
              onClick={() => setPeriod(shiftPeriodKey(period, -1))}
              className="grid h-9 w-9 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface text-gt-sm font-extrabold text-gt-ink shadow-gt-xs transition hover:bg-gt-bg-3"
            >
              ←
            </button>
            <span
              className="min-w-20 text-center font-gt-display text-gt-sm font-extrabold text-gt-ink"
              data-testid="period-label"
            >
              {period}
            </span>
            <button
              type="button"
              aria-label="Next period"
              data-testid="period-next"
              disabled={atCurrent}
              onClick={() => setPeriod(shiftPeriodKey(period, 1))}
              className="grid h-9 w-9 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface text-gt-sm font-extrabold text-gt-ink shadow-gt-xs transition hover:bg-gt-bg-3 disabled:opacity-40"
            >
              →
            </button>
          </div>
          <Link
            to="/"
            className="rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface px-gt-12 py-gt-6 text-gt-sm font-extrabold text-gt-primary shadow-gt-xs transition hover:bg-gt-bg-3"
          >
            {t("trends.viewDashboard")}
          </Link>
        </div>
      </header>

      {/* Distribution — Dona · Mapa · Flujo representations of the focus period */}
      <Card>
        <div className="mb-gt-12 flex flex-wrap items-center justify-between gap-gt-10">
          <h2 className="font-gt-display text-gt-md font-extrabold text-gt-ink">
            {t("trends.distribution")}
          </h2>
          <div className="flex flex-wrap items-center gap-gt-8">
            <RepresentationBar value={representation} onChange={setRepresentation} />
            {representation !== "flow" && <LevelBar value={level} onChange={setLevel} />}
          </div>
        </div>
        {tree.isLoading && <InsightsSkeleton />}
        {!tree.isLoading && !hasDistribution && (
          <p className="py-gt-24 text-center text-gt-sm font-medium text-gt-ink-3">{t("dashboard.empty")}</p>
        )}
        {!tree.isLoading && hasDistribution && tree.data && (
          <Suspense fallback={<ChartFallback />}>
            {representation === "flow" ? (
              <SankeyChart roots={tree.data.roots ?? []} currency={tree.data.currency} />
            ) : representation === "treemap" ? (
              <Treemap slices={slices} currency={tree.data.currency} />
            ) : (
              <CategoryDonut slices={slices} currency={tree.data.currency} />
            )}
          </Suspense>
        )}
      </Card>

      {/* Spend over time */}
      <Card>
        <div className="mb-gt-12 flex flex-wrap items-center justify-between gap-gt-10">
          <h2 className="font-gt-display text-gt-md font-extrabold text-gt-ink">{t("trends.overTime")}</h2>
        </div>
        {series.isLoading && <ChartFallback />}
        {!series.isLoading && !hasSeriesSpend && (
          <p className="py-gt-24 text-center text-gt-sm font-medium text-gt-ink-3" data-testid="trends-no-series">
            {t("trends.noSeries")}
          </p>
        )}
        {!series.isLoading && hasSeriesSpend && series.data && (
          <Suspense fallback={<ChartFallback />}>
            <SpendTimeSeries points={seriesPoints} currency={series.data.currency} />
          </Suspense>
        )}
      </Card>
    </div>
  );
}

/** Shared geometric segmented bar. */
function SegBar({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div
      className="inline-flex gap-0.5 rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface p-0.5"
      role="group"
      aria-label={label}
      data-testid={ariaToTestId(label)}
    >
      {children}
    </div>
  );
}

function ariaToTestId(label: string): string {
  if (label === "Temporal granularity") return "temporal-bar";
  if (label === "Classification level") return "level-bar";
  return "representation-bar";
}

function SegPill({
  active,
  testId,
  onClick,
  children,
}: {
  active: boolean;
  testId: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      data-testid={testId}
      onClick={onClick}
      className={`rounded-gt-pill px-gt-10 py-gt-4 text-gt-xs font-extrabold transition ${
        active ? "bg-gt-primary text-white" : "text-gt-ink-2 hover:text-gt-ink"
      }`}
    >
      {children}
    </button>
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
    <SegBar label="Temporal granularity">
      {options.map((option) => (
        <SegPill
          key={option.value}
          active={option.value === value}
          testId={`temporal-pill-${option.value}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </SegPill>
      ))}
    </SegBar>
  );
}

/** The L1–L4 classification-level bar: flatten the spend tree at Industry (L1) /
 * Store-type (L2) / Item-family (L3) / Item (L4). */
function LevelBar({ value, onChange }: { value: number; onChange: (level: number) => void }) {
  return (
    <SegBar label="Classification level">
      {[1, 2, 3, 4].map((level) => (
        <SegPill
          key={level}
          active={level === value}
          testId={`level-pill-${level}`}
          onClick={() => onChange(level)}
        >
          {`L${level}`}
        </SegPill>
      ))}
    </SegBar>
  );
}

/** Dona · Mapa · Flujo — the three representations of the category distribution. */
function RepresentationBar({
  value,
  onChange,
}: {
  value: Representation;
  onChange: (value: Representation) => void;
}) {
  const { t } = useI18n();
  const options: { value: Representation; label: string }[] = [
    { value: "donut", label: t("trends.repr.donut") },
    { value: "treemap", label: t("trends.repr.treemap") },
    { value: "flow", label: t("trends.repr.flow") },
  ];
  return (
    <SegBar label="Distribution representation">
      {options.map((option) => (
        <SegPill
          key={option.value}
          active={option.value === value}
          testId={`repr-pill-${option.value}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </SegPill>
      ))}
    </SegBar>
  );
}
