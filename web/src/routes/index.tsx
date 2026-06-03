import { lazy, Suspense, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  currentPeriod,
  useMonthlyInsights,
  type InsightDimension,
} from "@/hooks/useInsights";
import { useI18n } from "@/hooks/useI18n";
import { rollupToSlices } from "@/lib/chartData";
import {
  SummaryStats,
  DimensionToggle,
  GravityCenters,
  ExcludedItems,
  InsightsSkeleton,
  PeriodStepper,
  ChartFallback,
} from "@/components/insights/widgets";
import type { components } from "@/lib/api-types";

const CategoryDonut = lazy(() => import("@/components/charts/CategoryDonut"));

type MonthlyInsights = components["schemas"]["MonthlyInsightsResponse"];

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

function DashboardPage() {
  const { t } = useI18n();
  const [period, setPeriod] = useState(() => currentPeriod());
  const { data, isLoading, error } = useMonthlyInsights(period);
  const atCurrent = period >= currentPeriod();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
            {t("dashboard.title")}
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {t("dashboard.subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PeriodStepper period={period} atCurrent={atCurrent} onChange={setPeriod} />
          <Link
            to="/trends"
            className="rounded-md border px-3 py-1.5 text-sm font-medium"
            style={{
              borderColor: "var(--border)",
              color: "var(--primary)",
              backgroundColor: "var(--surface)",
            }}
          >
            {t("dashboard.viewTrends")}
          </Link>
        </div>
      </header>

      {isLoading && <InsightsSkeleton />}

      {error && (
        <div
          className="rounded-lg border p-6 text-center"
          style={{
            borderColor: "var(--negative-primary)",
            backgroundColor: "var(--negative-bg)",
          }}
          role="alert"
        >
          <p
            className="text-sm font-medium"
            style={{ color: "var(--negative-primary)" }}
          >
            {t("dashboard.loadError")}
          </p>
        </div>
      )}

      {!isLoading && !error && data && <DashboardContent data={data} />}
    </div>
  );
}

function DashboardContent({ data }: { data: MonthlyInsights }) {
  const { t } = useI18n();
  const [dimension, setDimension] = useState<InsightDimension>("transaction_category");

  if (data.transaction_count === 0) {
    return (
      <div
        className="rounded-lg border p-10 text-center"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
        data-testid="dashboard-empty"
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {t("dashboard.empty")}
        </p>
      </div>
    );
  }

  const rows =
    dimension === "transaction_category"
      ? (data.top_transaction_categories ?? [])
      : (data.top_item_categories ?? []);
  const slices = rollupToSlices(rows, data.total_spend_minor);

  return (
    <div className="space-y-6">
      <SummaryStats data={data} />

      <section
        className="rounded-lg border p-5"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            {t("dashboard.topCategories")}
          </h2>
          <DimensionToggle dimension={dimension} onChange={setDimension} />
        </div>
        <Suspense fallback={<ChartFallback />}>
          <CategoryDonut slices={slices} currency={data.currency} />
        </Suspense>
      </section>

      {(data.gravity_centers ?? []).length > 0 && (
        <GravityCenters centers={data.gravity_centers ?? []} />
      )}

      {(data.excluded_items ?? []).length > 0 && (
        <ExcludedItems items={data.excluded_items ?? []} />
      )}
    </div>
  );
}

