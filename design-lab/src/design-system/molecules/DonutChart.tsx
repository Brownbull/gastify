import { useMemo, useState } from "react";
import { DonutRing } from "@design-system/atoms/DonutRing";
import { DonutCenterLabel } from "@design-system/atoms/DonutCenterLabel";
import { CountModeToggle } from "./CountModeToggle";
import { DonutLegend } from "./DonutLegend";
import { getCategoryToken } from "@lib/categoryTokens";
import { tokenTrueSoftColor, type DiagramColorFor } from "@lib/diagramSkin";
import { clpK, drillChildren, type CountMode, type SegmentDatum } from "@lib/analyticsFixtures";

/**
 * DonutChart (DM-21) — the full interactive donut WITH drill-down. Composes the
 * DonutRing + DonutCenterLabel + a transactions/items count toggle + the full
 * DonutLegend, and owns the drill navigation:
 *   - tapping a wedge / legend name SELECTS it (center shows its amount).
 *   - tapping a legend row's drill chevron DRILLS into that section's next
 *     taxonomy level (L1 rubro → L2 giro → L3 familia → L4 categoría → subcat),
 *     re-animating the ring; a breadcrumb + back button climb back out.
 *   - the count toggle flips the legend count pills between transactions/items.
 *
 * Drill data comes from `drillChildren(id)` (DRILL_TREE); a node with no
 * children is a leaf (no chevron). Palette FIXED at Token-True 50%.
 */
export interface DonutChartProps {
  /** root segments (level 0). */
  segments: SegmentDatum[];
  total: number;
  title?: string;
  colorFor?: DiagramColorFor;
  ring?: number;
  selectedRing?: number;
  inkBorder?: boolean;
  size?: number;
  /** compact side-legend layout (ring left / legend right). */
  side?: boolean;
  className?: string;
}

export function DonutChart({
  segments,
  total,
  title = "Gastos por categoría",
  colorFor = tokenTrueSoftColor,
  ring,
  selectedRing,
  inkBorder,
  size,
  side = false,
  className = "",
}: DonutChartProps) {
  // drill state
  const [path, setPath] = useState<{ id: string; label: string }[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [countMode, setCountMode] = useState<CountMode>("transactions");
  const [animKey, setAnimKey] = useState(0);

  // current-level segments: root, or the children of the deepest path node
  const current = useMemo<SegmentDatum[]>(() => {
    const node = path[path.length - 1];
    return (node ? drillChildren(node.id) : segments) ?? segments;
  }, [path, segments]);

  const levelTotal = useMemo(() => current.reduce((s, x) => s + x.value, 0), [current]);
  const canDrill = (id: string) => id !== "otros" && drillChildren(id) != null;

  const drill = (id: string) => {
    if (!canDrill(id)) return;
    setPath((p) => [...p, { id, label: getCategoryToken(id).label }]);
    setSelected(null);
    setAnimKey((k) => k + 1);
  };
  const back = () => {
    setPath((p) => p.slice(0, -1));
    setSelected(null);
    setAnimKey((k) => k + 1);
  };

  const seg = selected ? current.find((s) => s.id === selected) : null;
  const center = (
    <DonutCenterLabel
      primary={seg ? clpK(seg.value) : clpK(path.length ? levelTotal : total)}
      label={seg ? getCategoryToken(seg.id).label : path.length ? path[path.length - 1].label : "Total"}
      hint={seg ? `${seg.pct}%` : undefined}
    />
  );

  const ringEl = (
    <DonutRing segments={current} selected={selected} onSelect={setSelected} colorFor={colorFor} ring={ring} selectedRing={selectedRing} inkBorder={inkBorder} size={size} animKey={animKey}>
      {center}
    </DonutRing>
  );
  const legendEl = (
    <DonutLegend
      segments={current}
      selected={selected}
      onSelect={setSelected}
      countMode={countMode}
      colorFor={colorFor}
      compact={side}
      canDrill={canDrill}
      onDrill={drill}
      className={side ? "flex-1" : "w-full"}
    />
  );

  return (
    <section className={`overflow-hidden rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-md ${className}`}>
      {/* header: back + breadcrumb title + count toggle */}
      <header className="flex items-center gap-gt-8 border-b-2 border-gt-line p-gt-12">
        {path.length ? (
          <button
            type="button"
            onClick={back}
            aria-label="Volver"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface text-gt-ink shadow-gt-xs transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-sm"
          >
            <span aria-hidden="true" className="ml-0.5 block h-2 w-2 rotate-45 border-b-2 border-l-2 border-gt-ink" />
          </button>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <h3 className="truncate font-gt-display text-gt-lg font-extrabold text-gt-ink">
            {path.length ? path[path.length - 1].label : title}
          </h3>
          {path.length ? (
            <span className="truncate text-gt-xs font-medium text-gt-ink-3">
              {["Total", ...path.map((p) => p.label)].join(" › ")}
            </span>
          ) : null}
        </div>
        <CountModeToggle value={countMode} onChange={setCountMode} className="shrink-0" />
      </header>

      <div className={`p-gt-16 ${side ? "flex items-center gap-gt-12" : "flex flex-col items-center gap-gt-12"}`}>
        {ringEl}
        {legendEl}
      </div>
    </section>
  );
}
