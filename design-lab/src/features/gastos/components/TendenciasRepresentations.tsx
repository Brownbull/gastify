import { useState } from "react";
import { SegmentedToggle } from "@design-system/atoms/SegmentedToggle";
import { DonutRing } from "@design-system/atoms/DonutRing";
import { DonutCenterLabel } from "@design-system/atoms/DonutCenterLabel";
import { DonutLegend } from "@design-system/molecules/DonutLegend";
import { LevelToggle } from "@design-system/molecules/LevelToggle";
import { LevelRangeBar } from "@design-system/molecules/LevelRangeBar";
import { CountModeToggle } from "@design-system/molecules/CountModeToggle";
import { SankeyChart, type SankeySelection } from "@design-system/molecules/SankeyChart";
import { Treemap } from "@design-system/organisms/Treemap";
import { getCategoryToken } from "@lib/categoryTokens";
import { OTROS_GREY, type DiagramColorFor } from "@lib/diagramSkin";
import { groupByThreshold, type GroupAggregate } from "@lib/categoryGrouping";
import { useCountUp } from "@lib/useCountUp";
import { clpK, SEGMENTS, TOTAL_SPEND, drillChildren, sankeyForLevels, pressLevel, type TaxLevel, type CountMode, type SankeyLevel, type LevelRange, type SegmentDatum, type TreemapFullDatum } from "@lib/analyticsFixtures";

/**
 * TendenciasRepresentations (Gastos) — the Tendencias spend shown three ways
 * behind a representation switcher, with a SHARED control row beneath it (level
 * navigator left, transactions/items count toggle right). Promoted from the
 * design-lab spike into the production Gastos → Tendencias subsection.
 *
 *   Dona  → bare ring + per-category detail legend, colored by each category's
 *           token. Rows DRILL into the real taxonomy (rubro → giro → familia →
 *           categoría) via the › button; a back button climbs up.
 *   Mapa  → Treemap of the chosen level (cells drill on click).
 *   Flujo → SankeyChart flow window derived from the level RANGE.
 *
 * Dona + Mapa use progressive disclosure (legacy applyTreemapGrouping): show the
 * >10% categories + the top one below + a "Más" fold for the tail, with Mostrar
 * más / menos to reveal/fold one at a time.
 *
 * Layout: fills its parent (flex-1, min-h-0) so Mapa/Flujo adapt to the device
 * frame. GastosScreen owns the outer column, max-width, and period chrome.
 */
export type SpendRepresentation = "dona" | "mapa" | "flujo";

const REP_SEGMENTS: { id: SpendRepresentation; label: string }[] = [
  { id: "dona", label: "Dona" },
  { id: "mapa", label: "Mapa" },
  { id: "flujo", label: "Flujo" },
];

/** donut/legend wedge fills = the category's tile color (the icon background). */
const categoryColor: DiagramColorFor = (id) => (id === "otros" ? OTROS_GREY : getCategoryToken(id).tint);
const masSegment = (a: GroupAggregate): SegmentDatum => ({ id: "otros", value: a.value, pct: a.pct, count: a.count, itemCount: a.itemCount });
const masTreemap = (a: GroupAggregate): TreemapFullDatum => ({ id: "otros", value: a.value, pct: a.pct, count: a.count, itemCount: a.itemCount, categoryCount: a.categoryCount });

/** Mostrar menos / más reveal controls (legacy ExpandCollapseButtons parity). */
function ShowMore({ canExpand, canCollapse, otroCount, onExpand, onCollapse }: { canExpand: boolean; canCollapse: boolean; otroCount: number; onExpand: () => void; onCollapse: () => void }) {
  if (!canExpand && !canCollapse) return null;
  const btn = "inline-flex items-center gap-gt-4 rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface px-gt-12 py-gt-6 font-gt-display text-gt-xs font-extrabold text-gt-ink shadow-gt-xs transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-sm";
  return (
    <div className="flex items-center justify-center gap-gt-8 pt-gt-2">
      {canCollapse ? (
        <button type="button" onClick={onCollapse} aria-label="Mostrar menos categorías" className={`${btn} text-gt-ink-2`}>
          <span aria-hidden="true">−</span> Menos
        </button>
      ) : null}
      {canExpand ? (
        <button type="button" onClick={onExpand} aria-label={`Mostrar más (${otroCount} en Otros)`} className={btn}>
          <span aria-hidden="true">+</span> Mostrar más
          <span className="rounded-gt-pill bg-gt-primary-soft px-gt-6 text-gt-primary">{otroCount}</span>
        </button>
      ) : null}
    </div>
  );
}

export function TendenciasRepresentations() {
  const [rep, setRepState] = useState<SpendRepresentation>("dona");
  // ONE drill path shared by the donut + treemap (two views of the same data).
  const [donutPath, setDonutPath] = useState<{ id: string; label: string }[]>([]);
  const [countMode, setCountMode] = useState<CountMode>("transactions");
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(0); // show-more counter — reset on any nav
  const [animKey, setAnimKey] = useState(0); // bumped on every nav to replay the staggered entrance
  const [range, setRange] = useState<LevelRange>({ lo: 1, hi: 2 }); // sankey level range (≥2 levels)
  const [sankeySel, setSankeySel] = useState<SankeySelection | null>(null); // sankey node/link detail
  const bump = () => setAnimKey((k) => k + 1);

  const canDrill = (id: string) => id !== "otros" && drillChildren(id) != null;

  // nav handlers — reset the show-more counter + replay the entrance (legacy bumps
  // animationKey on view/level/drill change).
  const setRep = (r: SpendRepresentation) => { setRepState(r); setExpanded(0); setSelected(null); setSankeySel(null); bump(); };
  const drill = (id: string) => {
    if (!canDrill(id)) return;
    setDonutPath((p) => [...p, { id, label: getCategoryToken(id).label }]);
    setSelected(null);
    setExpanded(0);
    bump();
  };
  const back = () => { setDonutPath((p) => p.slice(0, -1)); setSelected(null); setExpanded(0); bump(); };
  const donutGoLevel = (l: TaxLevel) => {
    const k = Number(l.slice(1));
    setDonutPath((p) => p.slice(0, Math.max(0, Math.min(k - 1, p.length))));
    setSelected(null);
    setExpanded(0);
    bump();
  };

  // donut: real taxonomy drill + progressive disclosure.
  const donutAll: SegmentDatum[] = donutPath.length ? drillChildren(donutPath[donutPath.length - 1].id) ?? SEGMENTS : SEGMENTS;
  const donutTotal = donutPath.length ? donutAll.reduce((sum, x) => sum + x.value, 0) : TOTAL_SPEND;
  const donutGroup = groupByThreshold(donutAll, expanded, masSegment);
  const donutSegs = donutGroup.display;
  const donutSel = selected ? donutSegs.find((s) => s.id === selected) : null;
  const donutDepth = `L${donutPath.length + 1}` as TaxLevel;

  // treemap: SAME drill as the donut (cells drill on click), coerced to the
  // treemap datum shape, + progressive disclosure.
  const treemapData: TreemapFullDatum[] = donutAll.map((s) => ({ id: s.id, value: s.value, pct: s.pct, count: s.count ?? 0, itemCount: s.itemCount ?? 0 }));
  const treemapGroup = groupByThreshold(treemapData, expanded, masTreemap);

  // sankey: a contiguous level RANGE (≥2 levels, expandable to 3–4) via the peel.
  const sankey = sankeyForLevels(range.lo, range.hi);
  const onPressLevel = (k: SankeyLevel) => { setRange((r) => pressLevel(r, k)); bump(); };

  const isDona = rep === "dona";
  const onExpand = () => { setExpanded((e) => e + 1); bump(); };
  const onCollapse = () => { setExpanded((e) => Math.max(0, e - 1)); bump(); };

  // center total counts up on every re-stagger (drill / show-more); a selected
  // wedge shows its amount instantly.
  const animTotal = useCountUp(donutTotal, { animKey });

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-gt-12">
      <SegmentedToggle segments={REP_SEGMENTS} value={rep} onChange={setRep} fill flush />

      {/* shared controls. Flujo: a level-RANGE bar (≥2 levels, expand to 3–4) +
          the spend details readout. Dona/Mapa: single-level bar + count toggle. */}
      <div className="flex items-center justify-between gap-gt-8">
        {rep === "flujo" ? (
          <LevelRangeBar range={range} onPressLevel={onPressLevel} />
        ) : (
          <LevelToggle value={donutDepth} onChange={donutGoLevel} />
        )}
        {rep === "flujo" ? (
          // the tapped node's NAME + amount/% (green) live here; "Total" + the
          // grand total when nothing is selected.
          <div className="flex flex-col items-end gap-gt-1 leading-none" style={sankeySel ? { color: "var(--positive-primary)" } : undefined}>
            <span className={`truncate font-gt-display text-gt-xs font-extrabold ${sankeySel ? "" : "text-gt-ink-3"}`} style={{ maxWidth: 150 }}>
              {sankeySel ? (sankeySel.kind === "node" ? sankeySel.label : `${sankeySel.sourceLabel ?? ""} › ${sankeySel.targetLabel ?? ""}`) : "Total"}
            </span>
            <span className={`font-gt-display text-gt-md font-extrabold ${sankeySel ? "" : "text-gt-ink"}`}>{sankeySel ? sankeySel.percent : "100%"}</span>
            <span className={`font-gt-display text-gt-sm font-extrabold ${sankeySel ? "" : "text-gt-ink-2"}`}>{sankeySel ? sankeySel.amountK : clpK(TOTAL_SPEND)}</span>
          </div>
        ) : (
          <CountModeToggle value={countMode} onChange={setCountMode} />
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto pt-gt-2">
        {isDona ? (
          <div className="flex flex-col items-center gap-gt-12">
            <div className="relative flex w-full justify-center">
              <DonutRing segments={donutSegs} selected={selected} onSelect={setSelected} colorFor={categoryColor} inkBorder animKey={animKey}>
                <DonutCenterLabel
                  primary={clpK(donutSel ? donutSel.value : animTotal)}
                  label={donutSel ? getCategoryToken(donutSel.id).label : donutPath.length ? donutPath[donutPath.length - 1].label : "Total"}
                  hint={donutSel ? `${donutSel.pct}%` : undefined}
                />
              </DonutRing>
              {/* back button — only while drilled in; bottom-right of the donut */}
              {donutPath.length > 0 ? (
                <button
                  type="button"
                  onClick={back}
                  aria-label="Subir un nivel"
                  className="absolute bottom-1 right-1 inline-flex items-center gap-gt-4 rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface px-gt-10 py-gt-6 font-gt-display text-gt-xs font-extrabold text-gt-ink shadow-gt-sm transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-md"
                >
                  <span aria-hidden="true" className="block h-2 w-2 rotate-45 border-b-2 border-l-2 border-gt-ink" />
                  Volver
                </button>
              ) : null}
            </div>
            <DonutLegend
              segments={donutSegs}
              selected={selected}
              onSelect={setSelected}
              countMode={countMode}
              colorFor={categoryColor}
              canDrill={canDrill}
              onDrill={drill}
              animKey={animKey}
              className="w-full"
            />
            <ShowMore canExpand={donutGroup.canExpand} canCollapse={donutGroup.canCollapse} otroCount={donutGroup.otroCount} onExpand={onExpand} onCollapse={onCollapse} />
          </div>
        ) : rep === "mapa" ? (
          // treemap fills the available height (adaptive to the device frame);
          // clicking a cell drills into it (the count pill stays a separate action).
          <div className="relative flex min-h-0 flex-1 flex-col gap-gt-10">
            {/* key re-mounts the treemap on drill/show-more change → replays the fade */}
            <div key={animKey} className="gt-anim-fade min-h-0 flex-1">
              <Treemap data={treemapGroup.display} countMode={countMode} tint={0.5} height="100%" inkBorder onCellClick={drill} onCountClick={() => {}} />
            </div>
            {donutPath.length > 0 ? (
              <button
                type="button"
                onClick={back}
                aria-label="Subir un nivel"
                className="absolute right-2 top-2 inline-flex items-center gap-gt-4 rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface px-gt-10 py-gt-6 font-gt-display text-gt-xs font-extrabold text-gt-ink shadow-gt-sm transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-md"
              >
                <span aria-hidden="true" className="block h-2 w-2 rotate-45 border-b-2 border-l-2 border-gt-ink" />
                Volver
              </button>
            ) : null}
            <ShowMore canExpand={treemapGroup.canExpand} canCollapse={treemapGroup.canCollapse} otroCount={treemapGroup.otroCount} onExpand={onExpand} onCollapse={onCollapse} />
          </div>
        ) : (
          // fills the available height (like the treemap); its amount/% detail is
          // lifted to the top-right (showTitle={false}); no show-more (capped per level).
          // key re-mounts on level change → the flow disappears + re-appears
          // (gt-anim-fade), matching the donut/treemap re-stagger.
          <div key={animKey} className="gt-anim-fade min-h-0 flex-1">
            <SankeyChart nodes={sankey.nodes} links={sankey.links} iconNodes inkBorder showTitle={false} onSelect={setSankeySel} height="100%" className="h-full" />
          </div>
        )}
      </div>
    </div>
  );
}
