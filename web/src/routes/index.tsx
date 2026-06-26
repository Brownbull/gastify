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
    <div className="space-y-gt-16">
      {activeScope.kind === "group" && (
        <p
          data-testid="dashboard-scope-banner"
          className="rounded-gt-xl border-2 border-gt-line-strong bg-gt-primary-soft px-gt-12 py-gt-8 text-gt-sm font-extrabold text-gt-primary"
        >
          🏠 {t("group.activeBanner")}: {activeScope.name}
        </p>
      )}
      <header className="flex flex-wrap items-end justify-between gap-gt-10">
        <div>
          <h1 className="font-gt-display text-gt-4xl font-extrabold text-gt-ink">{t("dashboard.title")}</h1>
          <p className="mt-gt-2 text-gt-sm font-medium text-gt-ink-2">{t("dashboard.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-gt-8">
          <PeriodStepper period={period} atCurrent={atCurrent} onChange={setPeriod} />
          <Link
            to="/trends"
            className="rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface px-gt-12 py-gt-6 text-gt-sm font-extrabold text-gt-primary shadow-gt-xs transition hover:bg-gt-bg-3"
          >
            {t("dashboard.viewTrends")}
          </Link>
        </div>
      </header>

      {isLoading && <InsightsSkeleton />}

      {error && (
        <div className="rounded-gt-2xl border-2 border-gt-error bg-gt-error/5 p-gt-16 text-center" role="alert">
          <p className="text-gt-sm font-bold text-gt-error">{t("dashboard.loadError")}</p>
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
        className="rounded-gt-2xl border-2 border-dashed border-gt-line-strong bg-gt-surface p-gt-24 text-center"
        data-testid="dashboard-voided"
      >
        <p className="text-gt-sm font-medium text-gt-ink-3">{t(reasonKey)}</p>
      </div>
    );
  }

  if (data.transaction_count === 0) {
    return (
      <div
        className="rounded-gt-2xl border-2 border-dashed border-gt-line-strong bg-gt-surface p-gt-24 text-center"
        data-testid="dashboard-empty"
      >
        <p className="text-gt-sm font-medium text-gt-ink-3">{t("dashboard.empty")}</p>
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
    <div className="space-y-gt-16">
      <SummaryStats data={data} />

      <section className="rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-16 shadow-gt-md">
        <div className="mb-gt-12 flex flex-wrap items-center justify-between gap-gt-10">
          <h2 className="font-gt-display text-gt-md font-extrabold text-gt-ink">{t("dashboard.topCategories")}</h2>
          <DimensionToggle dimension={dimension} onChange={setDimension} />
        </div>
        {drill.path.length > 0 && (
          <div className="mb-gt-10">
            <DrillBreadcrumb
              trail={drill.path.map((node) => ({ key: node.key, label: node.label }))}
              onCrumb={drill.jumpTo}
              onBack={drill.back}
            />
          </div>
        )}
        {tree.isLoading && <ChartFallback />}
        {!tree.isLoading && tree.isError && (
          <p className="py-gt-24 text-center text-gt-sm font-bold text-gt-error" role="alert" data-testid="donut-error">
            {t("dashboard.loadError")}
          </p>
        )}
        {!tree.isLoading && !tree.isError && slices.length === 0 && (
          <p className="py-gt-24 text-center text-gt-sm font-medium text-gt-ink-3" data-testid="donut-empty">
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

