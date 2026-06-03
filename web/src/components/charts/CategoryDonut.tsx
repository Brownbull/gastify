/**
 * Category-distribution donut (Recharts, D68). Lazy-loaded so Recharts stays
 * off non-chart routes. Renders an SVG donut whose slice colors read the theme
 * `--chart-N` tokens directly (SVG `fill` resolves CSS vars), plus a custom HTML
 * legend with the category label + amount + share — the legend is the
 * assertable rendered-data surface for the runtime proof.
 */
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { ChartSlice } from "@/lib/chartData";
import { useI18n } from "@/hooks/useI18n";
import { formatMinorAmount } from "@/lib/format";

interface CategoryDonutProps {
  slices: ChartSlice[];
  currency: string;
  /** Fires for real (non-"Other") slices — used to drill into the filtered list. */
  onSliceClick?: (slice: ChartSlice) => void;
}

export default function CategoryDonut({ slices, currency, onSliceClick }: CategoryDonutProps) {
  const { t } = useI18n();
  const total = slices.reduce((sum, slice) => sum + slice.valueMinor, 0);
  const data = slices.map((slice) => ({
    ...slice,
    name: slice.isOther ? t("chart.other") : slice.label,
  }));

  return (
    <div data-testid="category-donut">
      <div className="relative mx-auto" style={{ height: 240, maxWidth: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="valueMinor"
              nameKey="name"
              innerRadius="60%"
              outerRadius="86%"
              paddingAngle={1}
              stroke="var(--surface)"
              strokeWidth={2}
              isAnimationActive={false}
              onClick={(entry: unknown) => {
                const slice = entry as ChartSlice;
                if (onSliceClick && slice && !slice.isOther) onSliceClick(slice);
              }}
            >
              {data.map((slice) => (
                <Cell
                  key={slice.categoryKey}
                  fill={slice.colorVar}
                  cursor={!slice.isOther && onSliceClick ? "pointer" : "default"}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {t("dashboard.totalSpend")}
          </span>
          <span
            className="text-lg font-semibold tabular-nums"
            style={{ color: "var(--text)" }}
            data-testid="donut-total"
          >
            {formatMinorAmount(total, currency)}
          </span>
        </div>
      </div>

      <ul className="mt-4 space-y-1.5" data-testid="donut-legend">
        {data.map((slice) => {
          const interactive = !slice.isOther && Boolean(onSliceClick);
          return (
            <li key={slice.categoryKey} data-testid="donut-legend-item">
              <button
                type="button"
                disabled={!interactive}
                onClick={() => interactive && onSliceClick?.(slice)}
                className="flex w-full items-center gap-2 rounded px-1 py-0.5 text-left text-sm enabled:hover:opacity-80"
                style={{ cursor: interactive ? "pointer" : "default" }}
              >
                <span
                  aria-hidden="true"
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: slice.colorVar }}
                />
                <span className="min-w-0 flex-1 truncate" style={{ color: "var(--text)" }}>
                  {slice.name}
                </span>
                <span className="shrink-0 tabular-nums" style={{ color: "var(--text)" }}>
                  {formatMinorAmount(slice.valueMinor, currency)}
                </span>
                <span
                  className="w-12 shrink-0 text-right text-xs tabular-nums"
                  style={{ color: "var(--text-muted)" }}
                >
                  {slice.percent.toFixed(1)}%
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
