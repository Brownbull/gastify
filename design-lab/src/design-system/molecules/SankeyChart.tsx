import { useEffect, useMemo, useRef, useState } from "react";
import ReactECharts from "echarts-for-react";
import { PixelIcon } from "@design-system/assets/PixelIcon";
import { LevelRangeBar } from "@design-system/molecules/LevelRangeBar";
import { getCategoryToken } from "@lib/categoryTokens";
import { tokenTrueSoftColor, OTROS_GREY, type DiagramColorFor } from "@lib/diagramSkin";
import {
  clpK,
  SANKEY_NODES,
  SANKEY_LINKS,
  sankeyForLevels,
  pressLevel,
  type LevelRange,
  type SankeyLevel,
  type SankeyNodeDatum,
  type SankeyLinkDatum,
} from "@lib/analyticsFixtures";

/**
 * SankeyChart (DM-22) — the vertical spend-flow Sankey (rubro → giro → familia),
 * ECharts-backed, re-skinned to the Token-True 50% tint. Node fills come from
 * the locked diagram palette; links inherit their source node's color. A node/
 * link tap shows a tinted selection pill (category identity) with amount + %,
 * and highlights the connected sub-tree (emphasis: adjacency).
 *
 * Palette FIXED (DM-11); the density knobs (nodeWidth/nodeGap/curveness/
 * linkOpacity/labelPos/inkBorder) are props.
 *
 * ICON-NODE MODE (DM-23, user directive) — `iconNodes`: instead of text labels,
 * a PixelIcon disc floats over each node (identity = the icon); tapping a disc
 * reveals that node's NAME below the icon. ECharts text labels are hidden; the
 * disc layer is a React overlay positioned from the laid-out node rects read off
 * the ECharts instance (see extractNodeRects). The external selection band stays
 * for amount/% + edge selections.
 */
const INK = "#1E293B"; // ECharts needs a literal, not var()
const MAS_GREY = OTROS_GREY;

/** A laid-out node, in CSS px relative to the chart's own SVG box. */
interface NodeRect {
  id: string; // category id (getCategoryToken → icon + color)
  label: string; // the node's DISPLAY name (fixture label, e.g. a store brand)
  cx: number;
  cy: number;
  w: number; // bar length (horizontal, vertical-orient)
  h: number; // bar thickness (= nodeWidth)
}

/**
 * Read each sankey node's laid-out rectangle straight from the rendered SVG,
 * in coordinates relative to `container` (the plot div the overlay lives in).
 *
 * Why the SVG and not the ECharts model: in the production (minified) bundle the
 * internal GlobalModel accessors (`getSeriesByIndex`/`getGraph`/`getLayout`) are
 * name-mangled and unreachable, and `convertToPixel` has no sankey coord system.
 * The SVG renderer draws each node as a `<path>` rectangle carrying our ink
 * `stroke` (#1E293B) + the node's solid `fill`; link ribbons have a different
 * fill. We pick the node paths by ink stroke, map fill→node via the fixed
 * GT_CHART_HEX hue order (node `i` = `GT_CHART_HEX[i%6]`; "otros" = grey), and
 * read each path's `getBoundingClientRect()` — NOT `getBBox()`. getBBox returns
 * LOCAL (pre-transform) coords, so the series-group's top/left inset translate is
 * dropped and every node shifts up-left by the inset; getBoundingClientRect gives
 * the true on-screen rect, which we make container-relative for the `inset-0`
 * overlay (1:1, DPR-independent).
 */
function extractNodeRects(
  svg: SVGSVGElement | null,
  container: HTMLElement | null,
  nodes: SankeyNodeDatum[],
): NodeRect[] {
  if (!svg || !container) return [];
  const origin = container.getBoundingClientRect();
  // node paths carry the ink stroke (ribbons don't) and ECharts renders them in
  // series-data order, so match by INDEX — color-independent, so it never drops
  // icons when a range spans >6 nodes (the old hue-match collided past 6 hues).
  const nodePaths = Array.from(svg.querySelectorAll("path")).filter((p) => {
    if (p.getAttribute("stroke") !== INK) return false;
    const r = p.getBoundingClientRect();
    return r.width > 0 || r.height > 0;
  });
  const out: NodeRect[] = [];
  nodePaths.forEach((p, i) => {
    const node = nodes[i];
    if (!node) return;
    const r = p.getBoundingClientRect();
    out.push({
      id: node.id,
      label: node.label,
      cx: r.left - origin.left + r.width / 2,
      cy: r.top - origin.top + r.height / 2,
      w: r.width,
      h: r.height,
    });
  });
  return out;
}

export interface SankeySelection {
  kind: "node" | "link";
  id: string;
  label: string;
  amountK: string;
  percent: string;
  sourceId?: string;
  sourceLabel?: string;
  targetId?: string;
  targetLabel?: string;
}

export interface SankeyChartProps {
  nodes?: SankeyNodeDatum[];
  links?: SankeyLinkDatum[];
  colorFor?: DiagramColorFor;
  inkBorder?: boolean;
  nodeWidth?: number;
  nodeGap?: number;
  curveness?: number;
  linkOpacity?: number;
  labelPos?: "inside" | "right" | "bottom";
  showLabels?: boolean;
  showTitle?: boolean;
  /**
   * Icon-node mode (DM-23): hide ECharts text labels and float a PixelIcon disc
   * over each node; tapping a disc reveals that node's name below the icon.
   */
  iconNodes?: boolean;
  /**
   * Icon placement when `iconNodes`. "above" (default, DM-26 pick) = a tinted
   * disc floats in the gap above a thin bar; on tap the disc swaps to the name.
   * "on-bar" = icon embedded flush in a fattened ink-bordered bar.
   */
  iconPlacement?: "above" | "on-bar";
  /**
   * Level-range mode (DM-24): show the L1·L2·L3·L4 selector bar with a sliding
   * peel that covers a contiguous ≥2-level range; the diagram renders exactly
   * that range of the taxonomy (`nodes`/`links` are then derived, not the props).
   */
  levelSelector?: boolean;
  /** initial level range when `levelSelector` (default L2–L3). */
  defaultRange?: LevelRange;
  /**
   * Plot height — a px number (default 340 / 460 in levelSelector mode), or a
   * CSS string ("100%") to fill a flex parent (adaptive to the screen height).
   */
  height?: number | string;
  /** report the current node/link selection (null when cleared) so a host can
   * show the amount/% detail elsewhere — pair with `showTitle={false}`. */
  onSelect?: (sel: SankeySelection | null) => void;
  className?: string;
}

const DEFAULT_RANGE: LevelRange = { lo: 2, hi: 3 };

export function SankeyChart({
  nodes = SANKEY_NODES,
  links = SANKEY_LINKS,
  height: heightProp,
  colorFor = tokenTrueSoftColor,
  inkBorder = false,
  nodeWidth = 14,
  nodeGap = 10,
  curveness = 0.5,
  linkOpacity = 0.45,
  labelPos = "inside",
  showLabels = true,
  showTitle = true,
  iconNodes = false,
  iconPlacement = "above",
  levelSelector = false,
  defaultRange = DEFAULT_RANGE,
  onSelect,
  className = "",
}: SankeyChartProps) {
  // level-selector mode defaults to the taller 460px canvas (DM-26 pick B) so the
  // peel has room at up to 4 levels; an explicit `height` always wins. (Per-
  // platform heights are deferred to the mobile/tablet/desktop pass.)
  const height = heightProp ?? (levelSelector ? 460 : 340);
  const chartRef = useRef<ReactECharts>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [sel, setSel] = useState<SankeySelection | null>(null);
  const [rects, setRects] = useState<NodeRect[]>([]);
  const [range, setRange] = useState<LevelRange>(defaultRange);
  // icon-node mode: a tap is a 3s timed PULSE — name + amount/% + adjacency dim
  // show, then everything reverts. This ref holds the pending revert timer.
  const selTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const REVEAL_MS = 3000;

  // report the current selection out (so a host can show amount/% elsewhere).
  useEffect(() => {
    onSelect?.(sel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel]);

  // in level-range mode the nodes/links come from the taxonomy slice, not props.
  const sliced = useMemo(() => (levelSelector ? sankeyForLevels(range.lo, range.hi) : null), [levelSelector, range]);
  const activeNodes = sliced ? sliced.nodes : nodes;
  const activeLinks = sliced ? sliced.links : links;

  const handlePressLevel = (k: SankeyLevel) => {
    setRange((r) => pressLevel(r, k));
    setSel(null); // changing the visible levels clears any node/link selection
  };

  // icon-node layout. The icon is EMBEDDED IN the bar (DM-25): fatten the bar so
  // it can hold the icon flush, and give it the 2px ink border so the bar itself
  // frames the glyph (no floating disc). Open the gaps a touch so adjacent rows
  // breathe. "above" placement keeps the old thin-bar + floating disc behaviour.
  const embedded = iconNodes && iconPlacement === "on-bar";
  // a tall node band so the icon sits clearly INSIDE it (with margin) rather than
  // perched on a thin cap; the ink border frames the glyph.
  const effNodeWidth = embedded ? Math.max(nodeWidth, 44) : nodeWidth;
  const effNodeGap = iconNodes ? Math.max(nodeGap, iconPlacement === "above" ? 34 : 28) : nodeGap;
  const effInkBorder = embedded ? true : inkBorder;
  const effShowLabels = iconNodes ? false : showLabels;

  const idToLabel = useMemo(() => Object.fromEntries(activeNodes.map((n) => [n.id, n.label])), [activeNodes]);
  const labelToId = useMemo(() => Object.fromEntries(activeNodes.map((n) => [n.label, n.id])), [activeNodes]);
  // percent base = sum of the top-column outflows (links whose source is a root node)
  const total = useMemo(() => {
    const targets = new Set(activeLinks.map((l) => l.target));
    const roots = new Set(activeNodes.map((n) => n.id).filter((id) => !targets.has(id)));
    return activeLinks.filter((l) => roots.has(l.source)).reduce((s, l) => s + l.value, 0) || 1;
  }, [activeNodes, activeLinks]);

  const option = useMemo(() => {
    const data = activeNodes.map((n, i) => ({
      name: n.label,
      itemStyle: {
        color: n.id === "otros" ? MAS_GREY : colorFor(n.id, i),
        borderColor: INK,
        // thin minimal outline (donut parity) for the floating-icon mode; the
        // embedded variant keeps the fatter 2px frame that holds the glyph.
        borderWidth: effInkBorder ? (embedded ? 2 : 1) : 0,
      },
    }));
    const echartsLinks = activeLinks.map((l) => ({ source: idToLabel[l.source], target: idToLabel[l.target], value: l.value }));
    // explicit depth per column so the layout is stable across range widths.
    const depthCount = sliced ? range.hi - range.lo + 1 : 3;
    const levelDepths = Array.from({ length: depthCount }, (_, d) => ({ depth: d }));
    return {
      animation: true,
      animationDuration: 700,
      animationEasing: "cubicOut",
      tooltip: { show: false },
      series: [
        {
          type: "sankey",
          orient: "vertical",
          // icon mode: pad the box so the icons clear it. "above" floats a disc
          // ~26px above the top bar, so the top needs more room; "on-bar" embeds
          // the icon in the bar, so a smaller pad suffices.
          top: iconNodes ? (embedded ? 24 : 42) : "4%",
          bottom: iconNodes ? 30 : "5%",
          left: "4%",
          right: "4%",
          nodeWidth: effNodeWidth,
          nodeGap: effNodeGap,
          layoutIterations: 32,
          emphasis: { focus: "adjacency" },
          data,
          links: echartsLinks,
          label: { show: effShowLabels, position: labelPos, fontFamily: "Outfit", fontSize: 11, fontWeight: 700, color: INK },
          lineStyle: { color: "source", curveness, opacity: linkOpacity },
          levels: levelDepths,
        },
      ],
    };
  }, [activeNodes, activeLinks, idToLabel, colorFor, effInkBorder, effNodeWidth, effNodeGap, curveness, linkOpacity, labelPos, effShowLabels, iconNodes, embedded, sliced, range]);

  const pctOf = (v: number) => `${Math.round((v / total) * 100)}%`;

  // clear any selection + its pending revert timer + the ECharts highlight.
  const clearSel = () => {
    if (selTimer.current) {
      clearTimeout(selTimer.current);
      selTimer.current = null;
    }
    setSel(null);
    chartRef.current?.getEchartsInstance()?.dispatchAction({ type: "downplay", seriesIndex: 0 });
  };

  // the node-select branch, callable from both the ECharts click and a disc tap.
  // In icon-node mode a tap is a 3s timed PULSE: select, then auto-revert. In
  // text mode it stays a sticky toggle (tap again to clear) as before.
  const selectNodeById = (id: string) => {
    if (id === "otros") return; // "Más" not selectable
    const label = idToLabel[id];
    if (!label) return;
    if (sel?.kind === "node" && sel.id === id) {
      clearSel();
      return;
    }
    if (selTimer.current) clearTimeout(selTimer.current);
    const inst = chartRef.current?.getEchartsInstance();
    const out = activeLinks.filter((l) => l.source === id).reduce((s, l) => s + l.value, 0);
    const inc = activeLinks.filter((l) => l.target === id).reduce((s, l) => s + l.value, 0);
    const v = out || inc;
    setSel({ kind: "node", id, label, amountK: clpK(v * 1000), percent: pctOf(v) });
    inst?.dispatchAction({ type: "downplay", seriesIndex: 0 });
    inst?.dispatchAction({ type: "highlight", seriesIndex: 0, name: label });
    if (iconNodes) selTimer.current = setTimeout(clearSel, REVEAL_MS);
  };

  // clear the pending revert timer on unmount.
  useEffect(() => () => {
    if (selTimer.current) clearTimeout(selTimer.current);
  }, []);

  // discs (and adjacency dim) follow the selected node + its directly-linked
  // neighbours; everything else dims to match ECharts' downplay alpha.
  const adjacency = useMemo(() => {
    const s = new Set<string>();
    if (sel?.kind === "node") {
      s.add(sel.id);
      for (const l of activeLinks) {
        if (l.source === sel.id) s.add(l.target);
        if (l.target === sel.id) s.add(l.source);
      }
    }
    return s;
  }, [sel, activeLinks]);

  // read laid-out node positions (from the rendered SVG) for the icon overlay.
  // 'finished' fires after layout AND the entrance animation settle (the SVG
  // paths are at their final coords); a ResizeObserver re-lays-out on container
  // resize, which re-fires 'finished'. Re-subscribe when `option` changes
  // (notMerge → relayout). One immediate read covers the already-settled
  // re-subscribe case (rAF lets the freshly-mounted SVG paint first).
  useEffect(() => {
    if (!iconNodes) {
      setRects([]);
      return;
    }
    const inst = chartRef.current?.getEchartsInstance();
    if (!inst) return;
    let raf = 0;
    // pick the SVG that actually carries the node/link paths (ECharts may keep a
    // transient empty layer during a relayout); retry next frame while empty.
    const read = () => {
      const svgs = Array.from(wrapRef.current?.querySelectorAll("svg") ?? []);
      const svg = (svgs.find((s) => s.querySelector("path")) ?? null) as SVGSVGElement | null;
      const next = extractNodeRects(svg, wrapRef.current, activeNodes);
      if (next.length === 0 && svg == null) {
        raf = requestAnimationFrame(read); // SVG not painted yet — try again
        return;
      }
      setRects(next);
    };
    inst.on("finished", read);
    raf = requestAnimationFrame(read);
    const ro = new ResizeObserver(() => inst.resize());
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => {
      inst.off("finished", read);
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [iconNodes, activeNodes, option]);

  const handleClick = (params: { dataType?: string; name?: string; data?: { source?: string; target?: string; value?: number } }) => {
    const inst = chartRef.current?.getEchartsInstance();
    if (params.dataType === "node" && params.name) {
      selectNodeById(labelToId[params.name]);
    } else if (params.dataType === "edge" && params.data) {
      const sId = labelToId[params.data.source ?? ""];
      const tId = labelToId[params.data.target ?? ""];
      const v = params.data.value ?? 0;
      setSel({
        kind: "link",
        id: sId,
        label: `${params.data.source} › ${params.data.target}`,
        amountK: clpK(v * 1000),
        percent: pctOf(v),
        sourceId: sId,
        sourceLabel: params.data.source,
        targetId: tId,
        targetLabel: params.data.target,
      });
      inst?.dispatchAction({ type: "downplay", seriesIndex: 0 });
      inst?.dispatchAction({ type: "highlight", seriesIndex: 0, name: params.data.source });
    }
  };

  return (
    <div className={className} data-testid="sankey-chart">
      {levelSelector ? (
        <div className="mb-gt-8 flex justify-center">
          <LevelRangeBar range={range} onPressLevel={handlePressLevel} />
        </div>
      ) : null}
      {showTitle ? <SelectionTitle sel={sel} /> : null}
      {/* the chart box is its own positioning context so the icon overlay's
          inset-0 maps 1:1 to the chart, independent of the title band height. */}
      <div ref={wrapRef} className="relative" style={{ height }} data-testid="sankey-plot">
        <ReactECharts
          ref={chartRef}
          option={option}
          style={{ height, width: "100%" }}
          opts={{ renderer: "svg" }}
          onEvents={{ click: handleClick }}
          notMerge
          lazyUpdate
        />
        {iconNodes ? (
          <IconNodeOverlay
            rects={rects}
            sel={sel}
            adjacency={adjacency}
            placement={iconPlacement}
            onSelect={selectNodeById}
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * The PixelIcon node layer (icon-node mode, DM-25). The icon is EMBEDDED in the
 * bar — centred on the (fattened, ink-bordered) bar so it reads as part of it,
 * not a floating disc. On tap the icon DISAPPEARS and the node's NAME takes its
 * place for 3s (the parent's timed pulse), then the icon returns. Non-adjacent
 * nodes dim during the pulse. Taps route through the shared node-select handler.
 *
 * `placement="above"` keeps the legacy floating-disc-with-name-below treatment
 * (the spike's runner-up).
 */
function IconNodeOverlay({
  rects,
  sel,
  adjacency,
  placement,
  onSelect,
}: {
  rects: NodeRect[];
  sel: SankeySelection | null;
  adjacency: Set<string>;
  placement: "above" | "on-bar";
  onSelect: (id: string) => void;
}) {
  const embedded = placement === "on-bar";
  return (
    <div className="pointer-events-none absolute inset-0 overflow-visible" data-testid="sankey-icon-overlay">
      {rects.map((r) => {
        const t = getCategoryToken(r.id);
        const isSel = sel?.kind === "node" && sel.id === r.id;
        const dimmed = sel != null && !adjacency.has(r.id);

        if (embedded) {
          // EMBEDDED: the icon (or, while selected, the name) sits flush ON the
          // bar at its centre. The bar itself (fattened + ink border) is the frame.
          return (
            <button
              key={r.id}
              type="button"
              aria-label={r.label}
              aria-pressed={isSel}
              onClick={() => onSelect(r.id)}
              className="pointer-events-auto absolute flex items-center justify-center transition-opacity duration-150 ease-gt-bounce"
              style={{
                left: r.cx,
                top: r.cy,
                transform: "translate(-50%, -50%)",
                opacity: dimmed ? 0.3 : 1,
                zIndex: isSel ? 3 : 2,
              }}
            >
              {isSel ? (
                <span
                  className="whitespace-nowrap rounded-gt-md border-2 border-gt-line-strong bg-gt-surface px-gt-6 py-gt-2 text-gt-xs font-extrabold shadow-gt-xs"
                  style={{ color: t.color }}
                >
                  {r.label}
                </span>
              ) : (
                <span className="transition-transform duration-150 ease-gt-bounce hover:scale-110 active:scale-95">
                  <PixelIcon name={t.icon} size={22} />
                </span>
              )}
            </button>
          );
        }

        // FLOATING ICON (default): just the bare icon floats in the gap above the
        // bar — NO disc/background. On tap (the 3s pulse) a border highlights it
        // (the name shows in the host's top-right detail, not on the node).
        const discTop = r.cy - r.h / 2 - 18;
        return (
          <button
            key={r.id}
            type="button"
            aria-label={r.label}
            aria-pressed={isSel}
            onClick={() => onSelect(r.id)}
            className="pointer-events-auto absolute flex items-center justify-center transition-opacity duration-150 ease-gt-bounce"
            style={{
              left: r.cx,
              top: discTop,
              transform: "translate(-50%, -50%)",
              opacity: dimmed ? 0.3 : 1,
              zIndex: isSel ? 3 : 2,
            }}
          >
            <span
              className={`grid place-items-center rounded-gt-md p-gt-2 transition duration-150 ease-gt-bounce ${
                isSel ? "border-2 border-gt-line-strong shadow-gt-sm" : "border-2 border-transparent hover:scale-110 active:scale-95"
              }`}
              style={isSel ? { backgroundColor: t.tint } : undefined}
            >
              <PixelIcon name={t.icon} size={26} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SelectionTitle({ sel }: { sel: SankeySelection | null }) {
  return (
    <div className="flex flex-col items-center justify-center gap-gt-2 px-gt-8" style={{ minHeight: 56 }} data-testid="sankey-title">
      {sel == null ? (
        <span className="text-gt-xs font-medium text-gt-ink-3">Toca una categoría para ver detalles</span>
      ) : sel.kind === "node" ? (
        // the node icon no longer swaps to its name, so the band carries the
        // name pill + amount/% (a host can hide this and show it elsewhere).
        <Pill id={sel.id} label={sel.label} sub={`${sel.amountK} (${sel.percent})`} />
      ) : (
        <span className="flex max-w-full items-center gap-gt-4">
          <Pill id={sel.sourceId!} label={sel.sourceLabel!} />
          <span className="shrink-0 font-extrabold text-gt-ink-3">›</span>
          <Pill id={sel.targetId!} label={sel.targetLabel!} sub={`${sel.amountK} (${sel.percent})`} />
        </span>
      )}
    </div>
  );
}

function Pill({ id, label, sub }: { id: string; label: string; sub?: string }) {
  const t = getCategoryToken(id);
  return (
    <span className="flex flex-col items-center gap-gt-2">
      <span
        className="inline-flex max-w-full items-center gap-gt-4 rounded-gt-pill border-2 border-gt-line-strong px-gt-8 py-gt-2 text-gt-sm font-extrabold"
        style={{ backgroundColor: t.tint, color: t.color }}
      >
        <PixelIcon name={t.icon} size={16} />
        <span className="truncate">{label}</span>
      </span>
      {sub ? <span className="text-gt-xs font-extrabold" style={{ color: t.color }}>{sub}</span> : null}
    </span>
  );
}
