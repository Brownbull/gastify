/**
 * Settings usage helpers — a horizontal progress bar (scan credits, spend
 * budgets) plus the shared CLP formatter. The bar auto-tints: primary while
 * comfortably under, amber when near the cap (>=85%), red when over. Shared by
 * Suscripción (scan credits) and Límites (per-category spend) so both meters
 * read identically. Playful-Geometric: ink-bordered pill track, hard fill.
 */

/** Chilean pesos, dot-grouped, no decimals: 180000 → "$180.000". */
export function clp(n: number): string {
  return `$${Math.round(n).toLocaleString("es-CL")}`;
}

export function SettingsUsageBar({ value, max }: { value: number; max: number }) {
  const ratio = max > 0 ? value / max : 0;
  const over = value > max;
  const near = !over && ratio >= 0.85;
  const fill = over ? "bg-gt-negative" : near ? "bg-gt-accent" : "bg-gt-primary";
  const width = `${Math.min(100, Math.round(ratio * 100))}%`;
  return (
    <div className="h-3 w-full overflow-hidden rounded-gt-pill border-2 border-gt-line-strong bg-gt-bg-3">
      <div className={`h-full rounded-gt-pill ${fill}`} style={{ width }} />
    </div>
  );
}
