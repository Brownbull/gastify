import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  currentPeriod,
  periodWindow,
  useInsightsSeries,
  useMonthlyInsights,
  type InsightDimension,
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

/** Months of trend history shown as report cards (≤ backend 24-month cap). */
const HISTORY_MONTHS = 6;

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
  const atCurrent = period >= currentPeriod();

  const window = periodWindow(period, HISTORY_MONTHS);
  const series = useInsightsSeries(window.from, window.to, "month");
  const monthly = useMonthlyInsights(period);

  const cards = useMemo(() => toReportCards(series.data?.points ?? []), [series.data]);
  const hasSpend = cards.some((c) => c.total > 0);

  // On first load, focus the most-recent month that actually has spend (better than
  // an empty current month) — also makes the breakdown deterministic for the proof.
  useEffect(() => {
    if (autoFocused || !series.data) return;
    const latestWithSpend = cards.find((c) => c.total > 0);
    if (latestWithSpend && latestWithSpend.period !== period) {
      setPeriod(latestWithSpend.period);
    }
    setAutoFocused(true);
  }, [series.data, cards, autoFocused, period]);

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
        <PeriodStepper period={period} atCurrent={atCurrent} onChange={setPeriod} />
      </header>

      {/* Breakdown for the focused period */}
      <section
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

      {/* Monthly report cards (the trend history) */}
      <section className="space-y-2" data-testid="reports-monthly-section">
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          {t("reports.monthly")}
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
                focused={card.period === period}
                currency={monthly.data?.currency ?? "CLP"}
                onSelect={() => setPeriod(card.period)}
              />
            ))}
          </ul>
        )}
      </section>
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
  onSelect: () => void;
}) {
  const { t } = useI18n();
  return (
    <li>
      <button
        type="button"
        data-testid="reports-card"
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
