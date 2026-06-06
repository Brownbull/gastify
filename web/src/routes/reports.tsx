import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
import { formatMinorAmount } from "@/lib/format";
import {
  DimensionToggle,
  InsightsSkeleton,
  PeriodStepper,
  ChartFallback,
} from "@/components/insights/widgets";

const CategoryDonut = lazy(() => import("@/components/charts/CategoryDonut"));
const ReportDetailOverlay = lazy(() =>
  import("@/components/reports/ReportDetailOverlay").then((m) => ({
    default: m.ReportDetailOverlay,
  })),
);

/** A month period (YYYY-MM) → its first/last calendar day, for the txn drill. */
function monthRange(period: string): { from: string; to: string } {
  const [y, m] = period.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { from: `${period}-01`, to: `${period}-${String(lastDay).padStart(2, "0")}` };
}

/** Months of report-card history per granularity (≤ backend 24-month cap). */
const WINDOW_MONTHS: Record<SeriesGranularity, number> = {
  week: 3,
  month: 6,
  quarter: 12,
  year: 24,
};

/** Section heading per granularity. */
const SECTION_KEY = {
  week: "reports.weekly",
  month: "reports.monthly",
  quarter: "reports.quarterly",
  year: "reports.yearly",
} as const satisfies Record<SeriesGranularity, string>;

export const Route = createFileRoute("/reports")({
  component: ReportsPage,
});

type Trend = "up" | "down" | "flat";

export interface ReportCard {
  period: string;
  total: number;
  count: number;
  trend: Trend | null;
  deltaPct: number | null;
}

interface SeriesPoint {
  period: string;
  total_spend_minor: number;
  transaction_count: number;
}

/**
 * Fold chronological series points into display cards (newest first). Each card's
 * trend is computed CLIENT-SIDE against the chronologically-previous month — no
 * server delta needed (REUSE of /insights/series, zero new backend).
 */
export function toReportCards(points: readonly SeriesPoint[]): ReportCard[] {
  return points
    .map((p, i) => {
      const prev = i > 0 ? points[i - 1] : null;
      let trend: Trend | null = null;
      let deltaPct: number | null = null;
      if (prev) {
        trend =
          p.total_spend_minor > prev.total_spend_minor
            ? "up"
            : p.total_spend_minor < prev.total_spend_minor
              ? "down"
              : "flat";
        deltaPct =
          prev.total_spend_minor > 0
            ? ((p.total_spend_minor - prev.total_spend_minor) / prev.total_spend_minor) * 100
            : null;
      }
      return {
        period: p.period,
        total: p.total_spend_minor,
        count: p.transaction_count,
        trend,
        deltaPct,
      };
    })
    .reverse();
}

function periodLabel(period: string): string {
  // Canonical series keys: YYYY (year), YYYY-Q{n} (quarter), YYYY-Www (week), YYYY-MM.
  if (/^\d{4}$/.test(period)) return period;
  const quarter = /^(\d{4})-Q([1-4])$/.exec(period);
  if (quarter) return `Q${quarter[2]} ${quarter[1]}`;
  const week = /^(\d{4})-W(\d{2})$/.exec(period);
  if (week) return `W${Number(week[2])} ${week[1]}`;
  const [year, month] = period.split("-");
  if (!month) return period;
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function ReportsPage() {
  const { t } = useI18n();
  const [period, setPeriod] = useState(() => currentPeriod());
  const [autoFocused, setAutoFocused] = useState(false);
  const [dimension, setDimension] = useState<InsightDimension>("transaction_category");
  const [granularity, setGranularity] = useState<SeriesGranularity>("month");
  const [detailCard, setDetailCard] = useState<ReportCard | null>(null);
  const navigate = useNavigate();
  const atCurrent = period >= currentPeriod();
  // The category-breakdown donut is month-only (the backend has no quarterly/annual
  // category rollup, D77), so it shows only when the cards are monthly buckets.
  const isMonthly = granularity === "month";

  const window = periodWindow(period, WINDOW_MONTHS[granularity]);
  const series = useInsightsSeries(window.from, window.to, granularity);
  const monthly = useMonthlyInsights(period);

  const cards = useMemo(() => toReportCards(series.data?.points ?? []), [series.data]);
  const hasSpend = cards.some((c) => c.total > 0);

  // On first load (monthly only), focus the most-recent month that actually has
  // spend so the breakdown is meaningful. Quarter/year card periods aren't months,
  // so the donut never targets them.
  useEffect(() => {
    if (autoFocused || !series.data || !isMonthly) return;
    const latestWithSpend = cards.find((c) => c.total > 0);
    if (latestWithSpend && latestWithSpend.period !== period) {
      setPeriod(latestWithSpend.period);
    }
    setAutoFocused(true);
  }, [series.data, cards, autoFocused, period, isMonthly]);

  const rows =
    dimension === "transaction_category"
      ? (monthly.data?.top_transaction_categories ?? [])
      : (monthly.data?.top_item_categories ?? []);
  const slices = monthly.data ? rollupToSlices(rows, monthly.data.total_spend_minor) : [];
  const hasDistribution = slices.length > 0;

  return (
    <div className="space-y-6" data-testid="reports-screen">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
            {t("reports.title")}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {t("reports.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GranularityToggle value={granularity} onChange={setGranularity} />
          <PeriodStepper period={period} atCurrent={atCurrent} onChange={setPeriod} />
        </div>
      </header>

      {/* Category breakdown for the focused MONTH (month granularity only) */}
      {isMonthly && (
        <section
          data-testid="reports-breakdown"
          className="rounded-lg border p-5"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {periodLabel(period)}
            </h2>
            <DimensionToggle dimension={dimension} onChange={setDimension} />
          </div>
          {monthly.isLoading && <InsightsSkeleton />}
          {!monthly.isLoading && !hasDistribution && (
            <p className="py-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              {t("reports.empty")}
            </p>
          )}
          {!monthly.isLoading && hasDistribution && monthly.data && (
            <Suspense fallback={<ChartFallback />}>
              <CategoryDonut slices={slices} currency={monthly.data.currency} />
            </Suspense>
          )}
        </section>
      )}

      {/* Report cards at the selected granularity (the trend history) */}
      <section className="space-y-2" data-testid="reports-monthly-section">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          {t(SECTION_KEY[granularity])}
        </h2>
        {series.isLoading ? (
          <InsightsSkeleton />
        ) : !hasSpend ? (
          <div
            className="rounded-lg border p-8 text-center"
            data-testid="reports-empty"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          >
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {t("reports.empty")}
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {cards.map((card) => (
              <ReportCardView
                key={card.period}
                card={card}
                focused={isMonthly && card.period === period}
                currency={series.data?.currency ?? "CLP"}
                onSelect={isMonthly ? () => setDetailCard(card) : undefined}
              />
            ))}
          </ul>
        )}
      </section>

      {detailCard && (
        <Suspense fallback={null}>
          <ReportDetailOverlay
            card={{
              ...detailCard,
              periodLabel: periodLabel(detailCard.period),
              currency: series.data?.currency ?? "CLP",
            }}
            onClose={() => setDetailCard(null)}
            onViewTransactions={(p) => {
              const { from, to } = monthRange(p);
              setDetailCard(null);
              void navigate({ to: "/transactions", search: { dateFrom: from, dateTo: to } });
            }}
          />
        </Suspense>
      )}
    </div>
  );
}

function ReportCardView({
  card,
  focused,
  currency,
  onSelect,
}: {
  card: ReportCard;
  focused: boolean;
  currency: string;
  // Undefined for quarter/year cards — they have no month-only breakdown to focus.
  onSelect?: () => void;
}) {
  const { t } = useI18n();
  return (
    <li>
      <button
        type="button"
        data-testid="reports-card"
        disabled={!onSelect}
        onClick={onSelect}
        aria-pressed={focused}
        className="flex w-full items-center justify-between gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-(--primary-light)"
        style={{
          backgroundColor: focused ? "var(--primary-light)" : "var(--surface)",
          borderColor: focused ? "var(--primary)" : "var(--border)",
        }}
      >
        <div className="min-w-0">
          <p className="font-medium" style={{ color: "var(--text)" }}>
            {periodLabel(card.period)}
          </p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {card.count} {t("reports.transactions")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {card.trend && (
            <TrendChip trend={card.trend} deltaPct={card.deltaPct} />
          )}
          <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--text)" }}>
            {formatMinorAmount(card.total, currency)}
          </span>
        </div>
      </button>
    </li>
  );
}

function TrendChip({ trend, deltaPct }: { trend: Trend; deltaPct: number | null }) {
  const arrow = trend === "up" ? "▲" : trend === "down" ? "▼" : "■";
  const color =
    trend === "up" ? "var(--error)" : trend === "down" ? "var(--success, #16a34a)" : "var(--text-muted)";
  const pct = deltaPct != null ? `${Math.abs(Math.round(deltaPct))}%` : "";
  return (
    <span
      data-testid={`reports-trend-${trend}`}
      className="inline-flex items-center gap-1 text-xs font-medium"
      style={{ color }}
    >
      <span aria-hidden>{arrow}</span>
      {pct}
    </span>
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
    { value: "week", label: t("trends.granularity.week") },
    { value: "month", label: t("trends.granularity.month") },
    { value: "quarter", label: t("trends.granularity.quarter") },
    { value: "year", label: t("trends.granularity.year") },
  ];
  return (
    <div
      className="inline-flex rounded-lg border p-0.5 text-xs"
      style={{ borderColor: "var(--border)" }}
      role="group"
      aria-label="Report granularity"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            data-testid={`reports-granularity-${option.value}`}
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
