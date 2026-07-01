/**
 * Insights presentational widgets, extracted from the former /insights route so
 * the dashboard (home), /trends and /reports share one implementation (D68).
 * Geometric (W10): gt-* tokens + Playful Geometric framing. All strings go
 * through i18n; locked surface (testids, aria) preserved per the W10 contract.
 */
import type { ReactNode } from "react";
import { ChevronLeftIcon } from "@/components/shell/icons";
import { useI18n } from "@/hooks/useI18n";
import { formatMinorAmount } from "@/lib/format";
import { parsePercent } from "@/lib/chartData";
import { shiftPeriod, type InsightDimension } from "@/hooks/useInsights";
import type { components } from "@/lib/api-types";

type MonthlyInsights = components["schemas"]["MonthlyInsightsResponse"];
type CategoryRollup = components["schemas"]["InsightCategoryRollup"];
type GravityCenter = components["schemas"]["InsightGravityCenter"];
type ExcludedItem = components["schemas"]["InsightExcludedItemSummary"];

export function SummaryStats({ data }: { data: MonthlyInsights }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-gt-10 sm:grid-cols-3">
      <Stat label={t("dashboard.totalSpend")} testId="total-spend">
        {formatMinorAmount(data.total_spend_minor, data.currency)}
      </Stat>
      <Stat label={t("dashboard.transactions")}>{data.transaction_count.toLocaleString()}</Stat>
      <Stat label={t("dashboard.items")}>{data.item_count.toLocaleString()}</Stat>
    </div>
  );
}

function Stat({
  label,
  children,
  testId,
}: {
  label: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <div className="rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface p-gt-12 shadow-gt-xs">
      <p className="text-gt-xs font-extrabold uppercase tracking-wide text-gt-ink-3">{label}</p>
      <p data-testid={testId} className="mt-gt-2 font-gt-display text-gt-xl font-extrabold tabular-nums text-gt-ink">
        {children}
      </p>
    </div>
  );
}

export function DimensionToggle({
  dimension,
  onChange,
}: {
  dimension: InsightDimension;
  onChange: (value: InsightDimension) => void;
}) {
  const { t } = useI18n();
  const options: { value: InsightDimension; label: string }[] = [
    { value: "transaction_category", label: t("dashboard.byStore") },
    { value: "item_category", label: t("dashboard.byItem") },
  ];

  return (
    <div
      className="inline-flex gap-0.5 rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface p-0.5"
      role="group"
      aria-label="Rollup dimension"
    >
      {options.map((option) => {
        const active = option.value === dimension;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`rounded-gt-pill px-gt-10 py-gt-4 text-gt-xs font-extrabold transition ${
              active ? "bg-gt-primary text-white" : "text-gt-ink-2 hover:text-gt-ink"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function DrillBreadcrumb({
  trail,
  onCrumb,
  onBack,
}: {
  /** Ancestor crumbs from root to current level. */
  trail: { key: string; label: string }[];
  /** Jump to a depth: -1 = root ("All"), 0..n = a trail index. */
  onCrumb: (depth: number) => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-gt-6" data-testid="drill-breadcrumb">
      <button
        type="button"
        onClick={onBack}
        aria-label={t("chart.back")}
        className="rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface px-gt-8 py-gt-4 text-gt-xs font-extrabold text-gt-primary shadow-gt-xs transition hover:bg-gt-bg-3"
      >
        ‹ {t("chart.back")}
      </button>
      <nav className="flex flex-wrap items-center gap-gt-4 text-gt-xs" aria-label="Drill path">
        <button type="button" onClick={() => onCrumb(-1)} className="font-extrabold text-gt-ink-2 hover:underline">
          {t("chart.allCategories")}
        </button>
        {trail.map((crumb, index) => {
          const isLast = index === trail.length - 1;
          return (
            <span key={crumb.key} className="flex items-center gap-gt-4">
              <span aria-hidden="true" className="text-gt-ink-3">
                ›
              </span>
              <button
                type="button"
                onClick={() => onCrumb(index)}
                aria-current={isLast ? "page" : undefined}
                className={`font-extrabold hover:underline ${isLast ? "text-gt-ink" : "text-gt-ink-2"}`}
              >
                {crumb.label}
              </button>
            </span>
          );
        })}
      </nav>
    </div>
  );
}

export function CategoryList({ rows }: { rows: CategoryRollup[] }) {
  const { t } = useI18n();
  if (rows.length === 0) {
    return <p className="px-gt-16 py-gt-16 text-gt-sm font-medium text-gt-ink-3">{t("insights.noCategories")}</p>;
  }

  return (
    <ul className="divide-y-2 divide-gt-line px-gt-16 py-gt-6">
      {rows.map((row) => (
        <li key={`${row.dimension}:${row.category_key}`} className="py-gt-10">
          <div className="flex items-baseline justify-between gap-gt-10">
            <div className="min-w-0">
              <span className="font-bold text-gt-ink">{row.label}</span>
              <span className="ml-gt-4 text-gt-xs font-medium text-gt-ink-3">{row.parent_label}</span>
            </div>
            <span className="shrink-0 font-extrabold tabular-nums text-gt-ink">
              {formatMinorAmount(row.total_minor, row.currency)}
            </span>
          </div>
          <div className="mt-gt-4 flex items-center gap-gt-8">
            <div className="h-2 flex-1 overflow-hidden rounded-gt-pill border-2 border-gt-line-strong bg-gt-bg-3">
              <div
                className="h-full rounded-gt-pill bg-gt-primary"
                style={{ width: `${parsePercent(row.share_of_total_percent)}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-gt-xs font-bold tabular-nums text-gt-ink-3">
              {row.share_of_total_percent}%
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function GravityCenters({ centers }: { centers: GravityCenter[] }) {
  const { t } = useI18n();
  return (
    <section className="rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm">
      <h2 className="px-gt-16 pt-gt-12 pb-gt-6 font-gt-display text-gt-md font-extrabold text-gt-ink">
        {t("dashboard.whatsShifting")}
      </h2>
      <ul className="divide-y-2 divide-gt-line px-gt-16 pb-gt-8">
        {centers.map((center) => {
          // Spending semantics (inverted): growth = spent more = negative tone.
          const growing = center.direction === "growth";
          const toneClass = growing ? "border-gt-negative text-gt-negative" : "border-gt-positive text-gt-positive";
          return (
            <li key={`${center.dimension}:${center.category_key}`} className="flex items-start gap-gt-8 py-gt-10">
              <span aria-hidden="true" className={`mt-0.5 text-gt-lg leading-none ${growing ? "text-gt-negative" : "text-gt-positive"}`}>
                {growing ? "▲" : "▼"}
              </span>
              <div className="min-w-0">
                <span className="font-gt-display font-extrabold text-gt-ink">{center.label}</span>
                <span
                  className={`ml-gt-6 inline-flex items-center rounded-gt-pill border-2 bg-gt-surface px-gt-6 py-gt-2 text-gt-xs font-extrabold uppercase ${toneClass}`}
                >
                  {growing ? t("insights.growth") : t("insights.shrink")}
                </span>
                <p className="text-gt-xs font-medium text-gt-ink-3">{center.explanation}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ExcludedItems({ items }: { items: ExcludedItem[] }) {
  const { t } = useI18n();
  return (
    <section className="rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-16 shadow-gt-sm">
      <h2 className="font-gt-display text-gt-md font-extrabold text-gt-ink">{t("insights.excludedTitle")}</h2>
      <p className="mt-gt-2 text-gt-xs font-medium text-gt-ink-3">{t("insights.excludedDesc")}</p>
      <ul className="mt-gt-8 space-y-gt-4">
        {items.map((item) => (
          <li key={item.flag_kind} className="flex items-center justify-between text-gt-sm font-bold text-gt-ink-2">
            <span className="capitalize">
              {item.flag_kind.replace("_", " ")} ({item.item_count})
            </span>
            <span className="font-extrabold tabular-nums text-gt-ink">
              {formatMinorAmount(item.total_minor, item.currency)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function PeriodStepper({
  period,
  atCurrent,
  onChange,
}: {
  period: string;
  atCurrent: boolean;
  onChange: (period: string) => void;
}) {
  const { t } = useI18n();
  const stepBtn =
    "grid h-9 w-9 shrink-0 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-surface text-gt-ink shadow-gt-xs transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:bg-gt-bg-3 disabled:pointer-events-none disabled:opacity-40";
  return (
    <div className="flex items-center gap-gt-4">
      <button
        type="button"
        aria-label={t("dashboard.prevMonth")}
        onClick={() => onChange(shiftPeriod(period, -1))}
        className={stepBtn}
      >
        <ChevronLeftIcon className="h-6 w-6" />
      </button>
      <input
        type="month"
        value={period}
        aria-label={t("dashboard.month")}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
        }}
        className="w-36 rounded-gt-lg border-2 border-gt-line bg-gt-surface px-gt-6 py-gt-6 text-gt-xs font-bold text-gt-ink focus-visible:outline-none focus-visible:border-gt-line-strong"
      />
      <button
        type="button"
        aria-label={t("dashboard.nextMonth")}
        disabled={atCurrent}
        onClick={() => onChange(shiftPeriod(period, 1))}
        className={stepBtn}
      >
        <ChevronLeftIcon className="h-6 w-6 rotate-180" />
      </button>
    </div>
  );
}

export function ChartFallback() {
  return <div className="h-64 animate-pulse rounded-gt-2xl border-2 border-gt-line bg-gt-bg-3" aria-busy="true" />;
}

export function InsightsSkeleton() {
  return (
    <div className="space-y-gt-16" aria-busy="true" aria-label="Loading insights">
      <div className="grid gap-gt-10 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-gt-xl border-2 border-gt-line bg-gt-bg-3" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-gt-2xl border-2 border-gt-line bg-gt-bg-3" />
    </div>
  );
}
