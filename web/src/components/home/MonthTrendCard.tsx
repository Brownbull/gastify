import { useI18n } from "@/hooks/useI18n";
import { formatCompactAmount } from "@/lib/format";

export interface TrendBar {
  /** short axis label, e.g. "jun" */
  label: string;
  /** spend in minor units for this bucket */
  valueMinor: number;
  /** the currently-selected period */
  current: boolean;
}

/**
 * MonthTrendCard — the home "Tendencia" rep: a bar chart of monthly spend over
 * the last N months, the current month highlighted, with the trailing average.
 * Ports design-lab MonthTrendCard, wired to /insights/series.
 */
export function MonthTrendCard({
  bars,
  currency,
  title,
}: {
  bars: TrendBar[];
  currency: string;
  title?: string | null;
}) {
  const { t } = useI18n();
  const max = Math.max(...bars.map((b) => b.valueMinor), 1);
  const avg = bars.length ? Math.round(bars.reduce((s, b) => s + b.valueMinor, 0) / bars.length) : 0;
  return (
    <section className="flex flex-col gap-gt-10" data-testid="home-trend">
      {title ? <h3 className="font-gt-display text-gt-lg font-extrabold text-gt-ink">{title}</h3> : null}
      <div className="flex flex-col gap-gt-4">
        <div className="flex items-end gap-gt-6" style={{ height: 150 }}>
          {bars.map((b) => (
            <div
              key={b.label}
              className="flex min-w-0 flex-1 flex-col items-center justify-end gap-gt-2"
              style={{ height: "100%" }}
            >
              <span
                className={`font-gt-display text-gt-xs font-extrabold ${b.current ? "text-gt-primary" : "text-gt-ink-3"}`}
              >
                {formatCompactAmount(b.valueMinor, currency)}
              </span>
              <div
                className={`w-full rounded-gt-md ${b.current ? "bg-gt-primary" : "bg-gt-primary-soft"}`}
                style={{ height: `${Math.max(6, (b.valueMinor / max) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-gt-6">
          {bars.map((b) => (
            <span
              key={b.label}
              className={`flex-1 text-center font-gt-display text-gt-xs font-bold uppercase ${b.current ? "text-gt-primary" : "text-gt-ink-3"}`}
            >
              {b.label}
            </span>
          ))}
        </div>
      </div>
      <p className="text-gt-xs font-medium text-gt-ink-3">
        {t("home.monthlyAverage")} <span className="font-extrabold text-gt-ink-2">{formatCompactAmount(avg, currency)}</span>{" "}
        · {bars.length} {t("home.months")}
      </p>
    </section>
  );
}
