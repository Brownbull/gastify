/**
 * Settings usage bar — a horizontal progress meter (scan credits, spend budgets).
 * Auto-tints: primary while under, accent (amber) when near the cap (>=85%),
 * negative (red) when over. Playful-Geometric: ink-bordered pill track, hard fill.
 *
 * Vendored into web from design-lab/src/features/settings/components/SettingsUsageBar.tsx
 * (D102): self-contained (pure gt-* utilities), no import changes needed.
 */
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
