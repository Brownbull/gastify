/**
 * Spend time-series (Recharts ComposedChart, D68). Lazy-loaded. Bars = spend per
 * period (left axis), line = transaction count (right axis) — the bar+line combo
 * over the /insights/series buckets. Colors read theme `--chart-N` tokens.
 */
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useI18n } from "@/hooks/useI18n";
import { formatMinorAmount } from "@/lib/format";
import type { components } from "@/lib/api-types";

type SeriesPoint = components["schemas"]["InsightsSeriesPoint"];

interface SpendTimeSeriesProps {
  points: SeriesPoint[];
  currency: string;
}

interface SpendTooltipProps {
  active?: boolean;
  payload?: { payload: SeriesPoint }[];
  currency: string;
  countLabel: string;
}

/**
 * Module-level so it isn't redefined each render. Recharts clones the element
 * passed to `Tooltip.content` and injects `active` + `payload`.
 */
function SpendTooltip({ active, payload, currency, countLabel }: SpendTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0].payload;
  return (
    <div
      className="rounded-md border px-3 py-2 text-xs shadow-sm"
      style={{
        backgroundColor: "var(--surface)",
        borderColor: "var(--border)",
        color: "var(--text)",
      }}
    >
      <div className="font-medium">{point.period}</div>
      <div className="tabular-nums">
        {formatMinorAmount(point.total_spend_minor, currency)}
      </div>
      <div style={{ color: "var(--text-muted)" }}>
        {point.transaction_count} {countLabel}
      </div>
    </div>
  );
}

export default function SpendTimeSeries({ points, currency }: SpendTimeSeriesProps) {
  const { t } = useI18n();
  const data = points.map((point) => ({ ...point, spend: point.total_spend_minor }));
  const countLabel = t("dashboard.transactions").toLowerCase();

  return (
    <div data-testid="spend-timeseries" style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 8, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="period"
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            stroke="var(--border)"
          />
          <YAxis
            yAxisId="spend"
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            stroke="var(--border)"
            width={44}
            tickFormatter={(value: number) => formatMinorAmount(value, currency)}
          />
          <YAxis
            yAxisId="count"
            orientation="right"
            tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            stroke="var(--border)"
            width={28}
            allowDecimals={false}
          />
          <Tooltip
            content={<SpendTooltip currency={currency} countLabel={countLabel} />}
            cursor={{ fill: "var(--bg-secondary)" }}
          />
          <Bar
            yAxisId="spend"
            dataKey="spend"
            fill="var(--chart-1)"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="transaction_count"
            stroke="var(--chart-3)"
            strokeWidth={2}
            dot={{ r: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
