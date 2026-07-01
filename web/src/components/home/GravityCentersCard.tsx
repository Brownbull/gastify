import { PixelIcon } from "@/components/shell/PixelIcon";
import { useI18n } from "@/hooks/useI18n";
import { formatMinorAmount } from "@/lib/format";
import { categoryTint } from "@/lib/chartData";
import { itemCategoryIcon, storeCategoryIcon } from "@/lib/categoryIcon";
import type { components } from "@/lib/api-types";

type GravityCenter = components["schemas"]["InsightGravityCenter"];

function iconFor(c: GravityCenter): string {
  return c.dimension === "item_category" ? itemCategoryIcon(c.category_key) : storeCategoryIcon(c.category_key);
}

function GravityRow({ c, currency }: { c: GravityCenter; currency: string }) {
  const { t } = useI18n();
  const ratio = Number(c.ratio);
  // Spending semantics (inverted): growth = spent more = attention (negative tone).
  const grew = c.direction === "growth";
  return (
    <div className="flex items-center gap-gt-10 py-gt-6">
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-gt-lg border-2 border-gt-line-strong"
        style={{ backgroundColor: categoryTint(c.category_key) }}
      >
        <PixelIcon name={iconFor(c)} size={24} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
        <span className="truncate font-gt-display text-gt-sm font-extrabold text-gt-ink">{c.label}</span>
        <span
          className={`inline-flex w-fit items-center gap-gt-2 rounded-gt-pill border-2 px-gt-6 py-0.5 font-gt-display text-gt-xs font-extrabold ${
            grew
              ? "border-gt-negative bg-gt-negative-bg text-gt-negative"
              : "border-gt-positive bg-gt-positive-bg text-gt-positive"
          }`}
        >
          <span aria-hidden="true">{grew ? "▲" : "▼"}</span>{" "}
          {Number.isFinite(ratio) ? ratio.toFixed(1) : "—"}× {t("home.vsAverage")}
        </span>
      </span>
      <span className="shrink-0 font-gt-display text-gt-md font-extrabold tabular-nums text-gt-ink">
        {formatMinorAmount(c.current_total_minor, currency)}
      </span>
    </div>
  );
}

/**
 * GravityCentersCard (REQ-10) — the concentration insight: L2 categories whose
 * spend this period is far above (▲, attention) or below (▼, good) the trailing
 * 3-month average. Every row shows its multiplier. Ports design-lab
 * GravityCentersCard, wired to MonthlyInsights.gravity_centers.
 */
export function GravityCentersCard({ centers, currency }: { centers: GravityCenter[]; currency: string }) {
  const { t } = useI18n();
  if (centers.length === 0) return null;
  return (
    <section
      data-testid="home-gravity"
      className="rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-16 shadow-gt-sm"
    >
      <div className="mb-gt-8 flex items-start gap-gt-10">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-bg-3">
          <PixelIcon name="status-info" size={24} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
          <h3 className="font-gt-display text-gt-lg font-extrabold text-gt-ink">{t("home.gravityTitle")}</h3>
          <p className="text-gt-xs font-medium text-gt-ink-3">{t("home.gravitySubtitle")}</p>
        </span>
      </div>
      <div className="flex flex-col divide-y-2 divide-gt-line">
        {centers.map((c) => (
          <GravityRow key={`${c.dimension}:${c.category_key}`} c={c} currency={currency} />
        ))}
      </div>
    </section>
  );
}
