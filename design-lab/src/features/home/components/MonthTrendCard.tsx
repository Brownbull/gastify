import { clpK } from "@lib/analyticsFixtures";
import { MONTHLY_TREND, type TrendBar } from "../model/trendFixtures";

/**
 * MonthTrendCard — the Home "Tendencia" rep: a bar chart of monthly spend over
 * the last N months, the current month highlighted, with the trailing average.
 * Rendered bare (no card box) to match MonthTreemapCard.
 */
export function MonthTrendCard({ data = MONTHLY_TREND, title = "Tendencia" }: { data?: TrendBar[]; title?: string | null }) {
  const max = Math.max(...data.map((d) => d.value)) || 1;
  const avg = Math.round(data.reduce((s, d) => s + d.value, 0) / data.length);
  return (
    <section className="flex flex-col gap-gt-10">
      {title ? <h3 className="text-gt-lg font-extrabold text-gt-ink">{title}</h3> : null}
      <div className="flex flex-col gap-gt-4">
        <div className="flex items-end gap-gt-6" style={{ height: 150 }}>
          {data.map((d) => (
            <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-gt-2" style={{ height: "100%" }}>
              <span className={`font-gt-display text-gt-xs font-extrabold ${d.current ? "text-gt-primary" : "text-gt-ink-3"}`}>{clpK(d.value)}</span>
              <div className={`w-full rounded-gt-md ${d.current ? "bg-gt-primary" : "bg-gt-primary-soft"}`} style={{ height: `${Math.max(6, (d.value / max) * 100)}%` }} />
            </div>
          ))}
        </div>
        <div className="flex gap-gt-6">
          {data.map((d) => (
            <span key={d.label} className={`flex-1 text-center font-gt-display text-gt-xs font-bold uppercase ${d.current ? "text-gt-primary" : "text-gt-ink-3"}`}>{d.label}</span>
          ))}
        </div>
      </div>
      <p className="text-gt-xs font-medium text-gt-ink-3">
        Promedio mensual <span className="font-extrabold text-gt-ink-2">{clpK(avg)}</span> · últimos {data.length} meses
      </p>
    </section>
  );
}
