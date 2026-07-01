import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  currentPeriod,
  periodWindow,
  useInsightsSeries,
  useMonthlyInsights,
} from "@/hooks/useInsights";
import { useTransactions } from "@/hooks/useTransactions";
import { useProfile } from "@/hooks/useProfile";
import { useI18n } from "@/hooks/useI18n";
import { useUiStore } from "@/stores/uiStore";
import { PeriodStepper } from "@/components/insights/widgets";
import { InicioHero, type HeroDelta } from "@/components/home/InicioHero";
import { MonthTrendCard, type TrendBar } from "@/components/home/MonthTrendCard";
import { GravityCentersCard } from "@/components/home/GravityCentersCard";
import { RecentTransactionsCard } from "@/components/home/RecentTransactionsCard";
import { StatusCard } from "@/components/ui/StatusCard";
import { Badge } from "@/components/ui/Badge";
import { formatMinorAmount } from "@/lib/format";
import type { components } from "@/lib/api-types";

type MonthlyInsights = components["schemas"]["MonthlyInsightsResponse"];
type SeriesPoint = components["schemas"]["InsightsSeriesPoint"];

export const Route = createFileRoute("/")({
  component: DashboardPage,
});

/** `2026-06` → "junio 2026" in the active locale. */
function monthLabel(period: string, locale: string): string {
  const [year, month] = period.split("-").map(Number);
  try {
    return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(year, month - 1, 1));
  } catch {
    return period;
  }
}

/** `2026-06` → "jun" (short month) in the active locale. */
function monthShort(period: string, locale: string): string {
  const [year, month] = period.split("-").map(Number);
  try {
    return new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(year, month - 1, 1)).replace(".", "");
  } catch {
    return period.slice(5);
  }
}

/** Month-over-month spend delta for the hero badge (inverted: spending less = positive). */
function deriveDelta(points: SeriesPoint[], period: string): HeroDelta | null {
  const idx = points.findIndex((p) => p.period === period);
  if (idx <= 0) return null;
  const current = points[idx].total_spend_minor;
  const prior = points[idx - 1].total_spend_minor;
  if (prior <= 0) return null;
  const pct = ((current - prior) / prior) * 100;
  if (!Number.isFinite(pct) || Math.abs(pct) < 0.5) return null;
  const up = pct > 0; // spent more this month
  return { tone: up ? "negative" : "positive", label: `${up ? "▲" : "▼"}${Math.abs(pct).toFixed(0)}%` };
}

function DashboardPage() {
  const { t } = useI18n();
  const [period, setPeriod] = useState(() => currentPeriod());
  const { data, isLoading, error } = useMonthlyInsights(period);
  const atCurrent = period >= currentPeriod();
  const activeScope = useUiStore((s) => s.activeScope);
  const profile = useProfile();
  const firstName = (profile.data?.display_name ?? "").trim().split(/\s+/)[0] || "";

  return (
    <div className="mx-auto flex w-full max-w-176 flex-col gap-gt-16 lg:max-w-6xl">
      {activeScope.kind === "group" && (
        <p
          data-testid="dashboard-scope-banner"
          className="rounded-gt-xl border-2 border-gt-line-strong bg-gt-primary-soft px-gt-12 py-gt-8 text-gt-sm font-extrabold text-gt-primary"
        >
          🏠 {t("group.activeBanner")}: {activeScope.name}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-gt-8">
        <h1 className="font-gt-display text-gt-2xl font-extrabold text-gt-ink">
          {firstName ? `${t("home.greeting")}, ${firstName}` : t("dashboard.title")}
        </h1>
        <PeriodStepper period={period} atCurrent={atCurrent} onChange={setPeriod} />
      </div>

      {isLoading && <DashboardSkeleton />}

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
  const { t, locale } = useI18n();
  const window6 = periodWindow(period, 6);
  const series = useInsightsSeries(window6.from, window6.to, "month");
  const recent = useTransactions({});

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

  const points = series.data?.points ?? [];
  const bars: TrendBar[] = points.map((p) => ({
    label: monthShort(p.period, locale),
    valueMinor: p.total_spend_minor,
    current: p.period === period,
  }));
  const delta = deriveDelta(points, period);
  const recentTxns = (recent.data?.pages?.[0]?.data ?? []).slice(0, 4);

  return (
    <>
      <div className="grid items-start gap-gt-16 lg:grid-cols-[1.4fr_1fr]">
        <InicioHero
          total={formatMinorAmount(data.total_spend_minor, data.currency)}
          delta={delta}
          monthLabel={monthLabel(period, locale)}
        />
        <StatusCard
          tone="info"
          className="items-start"
          title={
            <span className="flex items-center gap-gt-8">
              {t("home.insightTitle")}
              <Badge tone="neutral" className="py-0! text-gt-xs">
                {t("settings.comingSoon")}
              </Badge>
            </span>
          }
        >
          {t("home.insightComingSoon")}
        </StatusCard>
      </div>

      {bars.length > 0 && (
        <MonthTrendCard bars={bars} currency={series.data?.currency ?? data.currency} title={t("home.trend")} />
      )}

      {(data.gravity_centers ?? []).length > 0 && (
        <GravityCentersCard centers={data.gravity_centers ?? []} currency={data.currency} />
      )}

      <RecentTransactionsCard transactions={recentTxns} />
    </>
  );
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-gt-16" aria-busy="true" aria-label="Cargando inicio">
      <div className="grid gap-gt-16 lg:grid-cols-[1.4fr_1fr]">
        <div className="h-28 animate-pulse rounded-gt-2xl border-2 border-gt-line bg-gt-bg-3" />
        <div className="h-28 animate-pulse rounded-gt-2xl border-2 border-gt-line bg-gt-bg-3" />
      </div>
      <div className="h-48 animate-pulse rounded-gt-2xl border-2 border-gt-line bg-gt-bg-3" />
      <div className="h-40 animate-pulse rounded-gt-2xl border-2 border-gt-line bg-gt-bg-3" />
    </div>
  );
}
