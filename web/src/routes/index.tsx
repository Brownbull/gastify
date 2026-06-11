import { lazy, Suspense, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  currentPeriod,
  useInsightsTree,
  useMonthlyInsights,
  type InsightDimension,
} from "@/hooks/useInsights";
import { useDonutDrill } from "@/hooks/useDonutDrill";
import { useI18n } from "@/hooks/useI18n";
import { useUiStore } from "@/stores/uiStore";
import { treeNodesToSlices } from "@/lib/chartData";
import {
  SummaryStats,
  DimensionToggle,
  DrillBreadcrumb,
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
  const activeScope = useUiStore((s) => s.activeScope);

  return (
    <div className="space-y-6">
      {activeScope.kind === "group" && (
        <p
          data-testid="dashboard-scope-banner"
          className="rounded-lg px-3 py-2 text-sm font-semibold"
          style={{ backgroundColor: "var(--primary-light)", color: "var(--primary)" }}
        >
          🏠 {t("group.activeBanner")}: {activeScope.name}
        </p>
      )}
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

      {!isLoading && !error && data && <DashboardContent data={data} period={period} />}
    </div>
  );
}

function DashboardContent({ data, period }: { data: MonthlyInsights; period: string }) {
  const { t } = useI18n();
  const [dimension, setDimension] = useState<InsightDimension>("transaction_category");
  const tree = useInsightsTree(period, dimension);
  const drill = useDonutDrill(
    tree.data?.roots ?? [],
    tree.data?.total_spend_minor ?? 0,
    `${period}:${dimension}`,
  );

  // A tombstoned (group, month): totals are zeroed server-side and the cause arrives
  // in void_reason — show the explanation, not the generic "scan something" empty state.
  if (data.voided) {
    const reasonKey =
      data.void_reason === "account_deleted"
        ? "dashboard.voided.account_deleted"
        : data.void_reason === "member_removed_data"
          ? "dashboard.voided.member_removed_data"
          : "dashboard.voided";
    return (
      <div
        className="rounded-lg border p-10 text-center"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
        data-testid="dashboard-voided"
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {t(reasonKey)}
        </p>
      </div>
    );
  }

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

  // The donut renders the current drill level: roots (L1 industries / L3
  // families) by default, a tapped node's children after drilling. Percentages
  // are within-parent so each level sums to 100%.
  const slices = tree.data
    ? treeNodesToSlices(drill.visibleNodes, drill.parentTotalMinor)
    : [];

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
        {drill.path.length > 0 && (
          <div className="mb-3">
            <DrillBreadcrumb
              trail={drill.path.map((node) => ({ key: node.key, label: node.label }))}
              onCrumb={drill.jumpTo}
              onBack={drill.back}
            />
          </div>
        )}
        {tree.isLoading && <ChartFallback />}
        {!tree.isLoading && tree.isError && (
          <p
            className="py-8 text-center text-sm"
            style={{ color: "var(--negative-primary)" }}
            role="alert"
            data-testid="donut-error"
          >
            {t("dashboard.loadError")}
          </p>
        )}
        {!tree.isLoading && !tree.isError && slices.length === 0 && (
          <p
            className="py-8 text-center text-sm"
            style={{ color: "var(--text-muted)" }}
            data-testid="donut-empty"
          >
            {t("dashboard.empty")}
          </p>
        )}
        {!tree.isLoading && !tree.isError && slices.length > 0 && tree.data && (
          <Suspense fallback={<ChartFallback />}>
            <CategoryDonut
              slices={slices}
              currency={tree.data.currency}
              onSliceClick={(slice) => drill.drillInto(slice.categoryKey)}
            />
          </Suspense>
        )}
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

