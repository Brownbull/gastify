import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  currentPeriod,
  useMonthlyInsights,
  type InsightDimension,
} from "@/hooks/useInsights";
import { formatMinorAmount } from "@/lib/format";
import type { components } from "@/lib/api-types";

type MonthlyInsights = components["schemas"]["MonthlyInsightsResponse"];
type CategoryRollup = components["schemas"]["InsightCategoryRollup"];
type GravityCenter = components["schemas"]["InsightGravityCenter"];
type ExcludedItem = components["schemas"]["InsightExcludedItemSummary"];

export const Route = createFileRoute("/insights")({
  component: InsightsPage,
});

function InsightsPage() {
  const [period, setPeriod] = useState(() => currentPeriod());
  const { data, isLoading, error } = useMonthlyInsights(period);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
            Insights
          </h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Where your money went this month.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-xs">
          <span style={{ color: "var(--text-muted)" }}>Month</span>
          <input
            type="month"
            value={period}
            aria-label="Insights month"
            onChange={(e) => {
              if (e.target.value) setPeriod(e.target.value);
            }}
            className="rounded-md border px-2 py-1 text-sm"
            style={{
              borderColor: "var(--border)",
              backgroundColor: "var(--bg-secondary)",
              color: "var(--text)",
            }}
          />
        </label>
      </header>

      {isLoading && <InsightsSkeleton />}

      {error && (
        <div
          className="rounded-lg border p-6 text-center"
          style={{
            borderColor: "var(--error)",
            backgroundColor: "color-mix(in srgb, var(--error) 10%, transparent)",
          }}
          role="alert"
        >
          <p className="text-sm font-medium" style={{ color: "var(--error)" }}>
            {error.message}
          </p>
        </div>
      )}

      {!isLoading && !error && data && <InsightsContent data={data} />}
    </div>
  );
}

function InsightsContent({ data }: { data: MonthlyInsights }) {
  const [dimension, setDimension] = useState<InsightDimension>(
    "transaction_category",
  );

  const rows =
    dimension === "transaction_category"
      ? (data.top_transaction_categories ?? [])
      : (data.top_item_categories ?? []);

  const isEmpty = data.transaction_count === 0;

  if (isEmpty) {
    return (
      <div
        className="rounded-lg border p-10 text-center"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
      >
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          No transactions for this month yet. Scan a receipt to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SummaryStats data={data} />

      <section
        className="rounded-lg border"
        style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Top categories
          </h2>
          <DimensionToggle dimension={dimension} onChange={setDimension} />
        </div>
        <CategoryList rows={rows} />
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

function SummaryStats({ data }: { data: MonthlyInsights }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Stat label="Total spend">
        {formatMinorAmount(data.total_spend_minor, data.currency)}
      </Stat>
      <Stat label="Transactions">{data.transaction_count.toLocaleString()}</Stat>
      <Stat label="Line items">{data.item_count.toLocaleString()}</Stat>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
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

function DimensionToggle({
  dimension,
  onChange,
}: {
  dimension: InsightDimension;
  onChange: (value: InsightDimension) => void;
}) {
  const options: { value: InsightDimension; label: string }[] = [
    { value: "transaction_category", label: "By store" },
    { value: "item_category", label: "By item" },
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

function CategoryList({ rows }: { rows: CategoryRollup[] }) {
  if (rows.length === 0) {
    return (
      <p className="px-5 py-6 text-sm" style={{ color: "var(--text-muted)" }}>
        No categories to show for this dimension.
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
              <span
                className="ml-2 text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                {row.parent_label}
              </span>
            </div>
            <span
              className="shrink-0 tabular-nums"
              style={{ color: "var(--text)" }}
            >
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
                  width: `${clampPercent(row.share_of_total_percent)}%`,
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
          {row.excluded_item_count > 0 && (
            <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
              {row.excluded_item_count} item
              {row.excluded_item_count === 1 ? "" : "s"} excluded by your flags (
              {formatMinorAmount(row.excluded_total_minor, row.currency)})
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function GravityCenters({ centers }: { centers: GravityCenter[] }) {
  return (
    <section
      className="rounded-lg border"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      <h2
        className="px-5 pt-4 pb-2 text-sm font-semibold"
        style={{ color: "var(--text)" }}
      >
        What's shifting
      </h2>
      <ul className="px-5 pb-3">
        {centers.map((center) => {
          const growing = center.direction === "growth";
          return (
            <li
              key={`${center.dimension}:${center.category_key}`}
              className="flex items-start gap-3 border-b py-3 last:border-b-0"
              style={{ borderColor: "var(--border)" }}
            >
              <span
                aria-hidden="true"
                className="mt-0.5 text-lg leading-none"
                style={{
                  color: growing ? "var(--error)" : "var(--success, var(--primary))",
                }}
                title={growing ? "Growing vs baseline" : "Shrinking vs baseline"}
              >
                {growing ? "▲" : "▼"}
              </span>
              <div className="min-w-0">
                <span className="font-medium" style={{ color: "var(--text)" }}>
                  {center.label}
                </span>
                <span
                  className="ml-2 text-xs font-medium uppercase"
                  style={{
                    color: growing
                      ? "var(--error)"
                      : "var(--success, var(--primary))",
                  }}
                >
                  {growing ? "Growth" : "Shrink"}
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

function ExcludedItems({ items }: { items: ExcludedItem[] }) {
  return (
    <section
      className="rounded-lg border p-5"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
        Excluded by your flags
      </h2>
      <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
        These items stay on their transactions but are kept out of the totals
        above.
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

function InsightsSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading insights">
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg border"
            style={{
              backgroundColor: "var(--surface)",
              borderColor: "var(--border)",
            }}
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

function clampPercent(value: string): number {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed));
}
