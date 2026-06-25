import { PixelIcon } from "@design-system/assets/PixelIcon";
import { getCategoryToken } from "@lib/categoryTokens";
import { clp } from "@lib/transactionFixtures";
import { SAMPLE_GRAVITY, gravityRatio, type GravityCenter } from "../model/gravityFixtures";

/**
 * GravityCentersCard (REQ-10) — the concentration insight: L2 categories whose
 * spend this period is far above (▲, attention) or below (▼, good) your trailing
 * 3-month average. Deterministic + explainable — every row shows its multiplier.
 */
function GravityRow({ c }: { c: GravityCenter }) {
  const ratio = gravityRatio(c);
  const grew = ratio >= 1;
  const token = getCategoryToken(c.id);
  return (
    <div className="flex items-center gap-gt-10 py-gt-6">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-gt-lg border-2 border-gt-line-strong" style={{ backgroundColor: token.tint }}>
        <PixelIcon name={token.icon} size={24} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
        <span className="truncate font-gt-display text-gt-sm font-extrabold text-gt-ink">{token.label}</span>
        <span className={`inline-flex w-fit items-center gap-gt-2 rounded-gt-pill border-2 px-gt-6 py-gt-0 font-gt-display text-gt-xs font-extrabold ${grew ? "border-gt-negative bg-gt-negative-bg text-gt-negative" : "border-gt-positive bg-gt-positive-bg text-gt-positive"}`}>
          <span aria-hidden="true">{grew ? "▲" : "▼"}</span> {ratio.toFixed(1)}× vs tu promedio
        </span>
      </span>
      <span className="shrink-0 font-gt-display text-gt-md font-extrabold text-gt-ink">{clp(c.value)}</span>
    </div>
  );
}

export function GravityCentersCard({ centers = SAMPLE_GRAVITY }: { centers?: GravityCenter[] }) {
  if (centers.length === 0) return null;
  return (
    <section className="rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface p-gt-16 shadow-gt-sm">
      <div className="mb-gt-8 flex items-start gap-gt-10">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-bg-3">
          <PixelIcon name="status-info" size={24} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-gt-2">
          <h3 className="font-gt-display text-gt-lg font-extrabold text-gt-ink">Centros de gravedad</h3>
          <p className="text-gt-xs font-medium text-gt-ink-3">Categorías muy por encima o por debajo de tu promedio de los últimos 3 meses.</p>
        </span>
      </div>
      <div className="flex flex-col divide-y-2 divide-gt-line">
        {centers.map((c) => (
          <GravityRow key={c.id} c={c} />
        ))}
      </div>
    </section>
  );
}
