/**
 * Insights presentational widgets, extracted from the former /insights route so
 * the dashboard (home) and /trends share one implementation (D68 — dashboard
 * absorbs /insights). All strings go through i18n; colors via theme CSS vars.
 */
import type { ReactNode } from "react";
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
    <div className="grid gap-4 sm:grid-cols-3">
      <Stat label={t("dashboard.totalSpend")}>
        {formatMinorAmount(data.total_spend_minor, data.currency)}
      </Stat>
      <Stat label={t("dashboard.transactions")}>
        {data.transaction_count.toLocaleString()}
      </Stat>
      <Stat label={t("dashboard.items")}>{data.item_count.toLocaleString()}</Stat>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      className="rounded-lg border p-4"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      <p
        className="mt-1 text-xl font-semibold tabular-nums"
        style={{ color: "var(--text)" }}
      >
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
      className="inline-flex rounded-lg border p-0.5 text-xs"
      style={{ borderColor: "var(--border)" }}
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
    <div className="flex flex-wrap items-center gap-2" data-testid="drill-breadcrumb">
      <button
        type="button"
        onClick={onBack}
        aria-label={t("chart.back")}
        className="rounded-md border px-2 py-1 text-xs font-medium"
        style={{
          borderColor: "var(--border)",
          color: "var(--primary)",
          backgroundColor: "var(--surface)",
        }}
      >
        ‹ {t("chart.back")}
      </button>
      <nav className="flex flex-wrap items-center gap-1 text-xs" aria-label="Drill path">
        <button
          type="button"
          onClick={() => onCrumb(-1)}
          className="font-medium hover:underline"
          style={{ color: "var(--text-secondary)" }}
        >
          {t("chart.allCategories")}
        </button>
        {trail.map((crumb, index) => {
          const isLast = index === trail.length - 1;
          return (
            <span key={crumb.key} className="flex items-center gap-1">
              <span aria-hidden="true" style={{ color: "var(--text-muted)" }}>
                ›
              </span>
              <button
                type="button"
                onClick={() => onCrumb(index)}
                aria-current={isLast ? "page" : undefined}
                className="font-medium hover:underline"
                style={{ color: isLast ? "var(--text)" : "var(--text-secondary)" }}
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
    return (
      <p className="px-5 py-6 text-sm" style={{ color: "var(--text-muted)" }}>
        {t("insights.noCategories")}
      </p>
    );
  }

  return (
    <ul className="px-5 py-3">
      {rows.map((row) => (
        <li
          key={`${row.dimension}:${row.category_key}`}
          className="border-b py-3 last:border-b-0"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <span className="font-medium" style={{ color: "var(--text)" }}>
                {row.label}
              </span>
              <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
                {row.parent_label}
              </span>
            </div>
            <span className="shrink-0 tabular-nums" style={{ color: "var(--text)" }}>
              {formatMinorAmount(row.total_minor, row.currency)}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <div
              className="h-1.5 flex-1 overflow-hidden rounded-full"
              style={{ backgroundColor: "var(--bg-secondary)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${parsePercent(row.share_of_total_percent)}%`,
                  backgroundColor: "var(--primary)",
                }}
              />
            </div>
            <span
              className="w-12 shrink-0 text-right text-xs tabular-nums"
              style={{ color: "var(--text-muted)" }}
            >
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
    <section
      className="rounded-lg border"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      <h2
        className="px-5 pt-4 pb-2 text-sm font-semibold"
        style={{ color: "var(--text)" }}
      >
        {t("dashboard.whatsShifting")}
      </h2>
      <ul className="px-5 pb-3">
        {centers.map((center) => {
          const growing = center.direction === "growth";
          const accent = growing ? "var(--negative-primary)" : "var(--positive-primary)";
          return (
            <li
              key={`${center.dimension}:${center.category_key}`}
              className="flex items-start gap-3 border-b py-3 last:border-b-0"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                aria-hidden="true"
                className="mt-0.5 text-lg leading-none"
                style={{ color: accent }}
              >
                {growing ? "▲" : "▼"}
              </span>
              <div className="min-w-0">
                <span className="font-medium" style={{ color: "var(--text)" }}>
                  {center.label}
                </span>
                <span
                  className="ml-2 text-xs font-medium uppercase"
                  style={{ color: accent }}
                >
                  {growing ? t("insights.growth") : t("insights.shrink")}
                </span>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {center.explanation}
                </p>
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
    <section
      className="rounded-lg border p-5"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
        {t("insights.excludedTitle")}
      </h2>
      <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
        {t("insights.excludedDesc")}
      </p>
      <ul className="mt-3 space-y-1.5">
        {items.map((item) => (
          <li
            key={item.flag_kind}
            className="flex items-center justify-between text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            <span className="capitalize">
              {item.flag_kind.replace("_", " ")} ({item.item_count})
            </span>
            <span className="tabular-nums">
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
  const buttonStyle = {
    borderColor: "var(--border)",
    backgroundColor: "var(--surface)",
    color: "var(--text)",
  };
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={t("dashboard.prevMonth")}
        onClick={() => onChange(shiftPeriod(period, -1))}
        className="rounded-md border px-2 py-1.5 text-sm"
        style={buttonStyle}
      >
        ‹
      </button>
      <input
        type="month"
        value={period}
        aria-label={t("dashboard.month")}
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
        }}
        className="rounded-md border px-2 py-1 text-sm"
        style={{
          borderColor: "var(--border)",
          backgroundColor: "var(--bg-secondary)",
          color: "var(--text)",
        }}
      />
      <button
        type="button"
        aria-label={t("dashboard.nextMonth")}
        disabled={atCurrent}
        onClick={() => onChange(shiftPeriod(period, 1))}
        className="rounded-md border px-2 py-1.5 text-sm disabled:opacity-40"
        style={buttonStyle}
      >
        ›
      </button>
    </div>
  );
}

export function ChartFallback() {
  return (
    <div
      className="h-64 animate-pulse rounded-lg"
      style={{ backgroundColor: "var(--bg-secondary)" }}
      aria-busy="true"
    />
  );
}

export function InsightsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading insights">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg border"
            style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
          />
        ))}
      </div>
      <div
        className="h-64 animate-pulse rounded-lg border"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      />
    </div>
  );
}
