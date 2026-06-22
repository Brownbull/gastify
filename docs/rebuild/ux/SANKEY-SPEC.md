# Legacy Sankey — Build Spec (DM-22)

> From workflow w4j0vkime. Themed ECharts (Token-True 50%) + selection title.

---

## ECharts option

EXACT themed ECharts option to build inside the molecule (echarts-for-react `ReactECharts`, renderer "svg"). Vertical 3-level sankey (rubro→giro→familia), Token-True 50% fixed.

```ts
// imports: tokenTrueTint, GT_CHART_HEX, hexA, DIAGRAM_TINT (lib/diagramSkin)
//          getCategoryToken (lib/categoryTokens); clpK (lib/analyticsFixtures)
const INK = "#1E293B";           // = --text-primary / --gt-line-strong (ECharts needs a literal, not var())
const tint = tokenTrueTint(0.5); // (id,i)=>rgba(GT_CHART_HEX[i%6],0.5) — the LOCKED node palette

// nodes: index-stable palette so a node's fill is deterministic; carry per-node itemStyle.color
const nodes = SANKEY_NODES.map((n, i) => ({
  name: n.label,                              // ECharts keys links by name → label must be unique (it is)
  itemStyle: { color: tint(n.id, i), borderColor: INK, borderWidth: spike.inkBorder ? 2 : 0 },
  label: { fontFamily: "Outfit", fontSize: 11, fontWeight: 700, color: INK },
}));
const idToLabel = Object.fromEntries(SANKEY_NODES.map((n) => [n.id, n.label]));
const links = SANKEY_LINKS.map((l) => ({ source: idToLabel[l.source], target: idToLabel[l.target], value: l.value }));

const option = {
  animation: !prefersReducedMotion,
  animationDuration: prefersReducedMotion ? 0 : 700,
  animationEasing: "cubicOut",
  tooltip: { show: false },                   // legacy DM: floating tooltip OFF — all info → external title pill
  series: [{
    type: "sankey",
    orient: "vertical",                       // top→bottom flow (legacy + prior spike)
    top: "4%", bottom: "5%", left: "4%", right: "4%",
    nodeWidth: spike.nodeWidth,               // 14 default; spike varies 8/14/24/40
    nodeGap: spike.nodeGap,                   // 10 default; spike varies 8/12/16
    layoutIterations: 32,
    emphasis: { focus: "adjacency" },         // hover/click highlights connected sub-tree
    data: nodes,
    links,
    label: { show: spike.showLabels, position: spike.labelPos, fontFamily: "Outfit", fontSize: 11, fontWeight: 700, color: INK },
    lineStyle: { color: "source", curveness: spike.curveness, opacity: spike.linkOpacity }, // link inherits SOURCE node tint
    levels: [{ depth: 0 }, { depth: 1 }, { depth: 2 }], // 3-level rubro→giro→familia
  }],
};
```

Key themed deltas vs the archived ChartSkinSpike `SankeyMini`: (1) node fill is `tokenTrueTint(0.5)` NOT raw `--chart-N` (locked 50% softness — same as Treemap/Donut, so the whole surface reads as one system); (2) `fontSize: 11` to match `--text-gt-xs` (11px); (3) `tooltip:{show:false}` + an external selection pill (legacy contract); (4) `levels` array makes the 3 depths explicit. NOTE per the legacy note: a pixel-icon-INSIDE-node is hard in ECharts (labels are plain text, no React/PixelIcon mount). So node labels stay TEXT (the giro/familia label). The icon-in-node overlay is OPTIONAL/DORMANT — do not build it for the mockup; if ever wanted it's an absolute-positioned `<PixelIcon>` layer reading node x/y from `instance.getModel().getSeriesByIndex(0).getGraph()`, gated behind a `useIconNodes` flag defaulting false. Per DM-11 colors are FIXED Token-True 50%; the spike varies ONLY `spike.*` density/layout knobs above.

---

## Container

A new molecule `src/design-system/molecules/SankeyChart.tsx` (+ `SankeyChart.stories.tsx`). It is a thin React wrapper, all geometry in the ECharts option.

Wiring (mirror archived spike + DonutChart molecule conventions):
- `import ReactECharts from "echarts-for-react"` (already the import style used in the archive — the simple non-tree-shaken entry; deps `echarts ^6.1.0` + `echarts-for-react ^3.0.6` already installed per DM-13).
- Render: `<ReactECharts option={option} style={{ height, width: "100%" }} opts={{ renderer: "svg" }} onEvents={{ click: handleClick }} notMerge lazyUpdate />`.
  - RECOMMEND `renderer: "svg"` (matches the archived spike and the rest of the design-lab) — crisp 2px ink borders, deterministic Storybook screenshot tests (Playwright/vitest-browser) vs canvas rasterization noise.
  - `height` prop default 340 (matches the legacy clip box exactly so the chart fills it with no vertical scroll).
- Props: `interface SankeyChartProps { nodes?: SankeyNodeDatum[]; links?: SankeyLinkDatum[]; height?: number; colorFor?: DiagramColorFor; prefersReducedMotion?: boolean; inkBorder?: boolean; nodeWidth?: number; nodeGap?: number; curveness?: number; linkOpacity?: number; labelPos?: "inside"|"right"|"bottom"; showLabels?: boolean; selected?: string|null; onSelectionChange?: (sel: SankeySelection|null) => void; showTitle?: boolean; className?: string; }`. Defaults: nodes=SANKEY_NODES, links=SANKEY_LINKS, colorFor=tokenTrueTint(0.5), nodeWidth=14, nodeGap=10, curveness=0.5, linkOpacity=0.45, labelPos="inside", showLabels=true, height=340.
- `option` in a `useMemo` keyed on [nodes, links, the spike knobs, prefersReducedMotion]. `chartRef = useRef<ReactECharts>(null)`; instance via `chartRef.current?.getEchartsInstance()` for `dispatchAction` highlight/downplay.

Card framing (the Storybook board / screen embed): wrap in the `Card` molecule OR the archived spike's inline frame `rounded-gt-xl border-2 border-gt-line-strong bg-gt-surface p-1`. For the molecule story use `Card` (rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-md) with `title="Flujo de gasto"`. The component itself imposes NO border (layout-only) — framing is the caller's, exactly like DonutChart/Treemap.

Carousel-slide framing (OPTIONAL, defer for the mockup): the legacy SankeySlide was a flex-col = 60px title band + 340px overflow-hidden clip box + keyed fade/scale (opacity 0→1, scale .95→1, 400ms ease-out, `key={animKey}` remount, `prefersReducedMotion` → transition:none) + minWidth horizontal-scroll region. For the design-lab mockup, model the slide as a STATIC Card (no carousel swipe, no programmatic scroll). If a slide demo is wanted, add a `SankeyChart.stories.tsx` "Slide" story that stacks the selection-title band over the chart in a fixed 400px Card — the entrance fade/scale is a story-only `<div>` wrapper, NOT part of the molecule API.

---

## Selection title

Build the selection title, re-skinned to gastify. It is INTERNAL to the SankeyChart molecule (gated by `showTitle`, default true for the standalone story), unlike legacy where it was inlined in SankeySlide — there is no carousel parent here to own it, so keeping it in the molecule is simpler for the mockup. Defer the externalized/controlled-by-parent variant.

Selection payload (port `SankeySelectionData`, simplified, no locale/XSS guard needed in mockup):
```ts
export interface SankeySelection {
  kind: "node" | "link";
  id: string;            // category id → getCategoryToken for icon+color
  label: string;
  amountK: string;       // clpK(value)
  percent: string;       // `${Math.round(value/total*100)}%`
  // link-only:
  sourceId?: string; sourceLabel?: string; targetId?: string; targetLabel?: string;
}
```
Click handling: `onEvents.click` branches on `params.dataType` — `"node"` → find the node by name, build node selection; `"edge"` → build link selection (id/color from SOURCE node). TOGGLE: clicking the selected node again clears (`onSelectionChange(null)` + `dispatchAction({type:"downplay",seriesIndex:0})`). On select: `dispatchAction({type:"downplay",seriesIndex:0})` then `{type:"highlight",seriesIndex:0,name}` → drives `emphasis.focus:"adjacency"`.

The title band (fixed-height to prevent layout shift, legacy used 60px; here use a gt-spaced `min-h` band ABOVE the chart):
- Container: `<div className="flex flex-col items-center justify-center gap-gt-2 px-gt-8" style={{ minHeight: 56 }} data-testid="sankey-title">`.
- Line 1 — gastify tinted pill (re-skin legacy `+'20'` alpha to the Token-True 50% tint via `getCategoryToken`): `<span className="inline-flex max-w-full items-center gap-gt-4 rounded-gt-pill border-2 border-gt-line-strong px-gt-8 py-gt-2 text-gt-sm font-extrabold" style={{ backgroundColor: getCategoryToken(sel.id).tint, color: getCategoryToken(sel.id).color }}>` with a `<PixelIcon name={getCategoryToken(sel.id).icon} size={16}/>` + `<span className="truncate">{label}</span>`. For LINK kind: source pill `>` target (icon+truncated label each, `flex-shrink-0` icons, `mx-gt-2` chevron).
  - NOTE the gastify re-skin decision: legacy concatenated `color + '20'` (8-digit hex alpha, ~12.5%). gastify uses the category's pre-baked `.tint` (a soft cream-safe bg from categoryTokens) + full `.color` text — cleaner than alpha math and consistent with `CategoryChip`. The diagram NODES stay Token-True 50% (tokenTrueTint), but the title PILL uses category `.tint`/`.color` for identity legibility (same split the legacy made: nodes = palette, pill = category).
- Line 2 — amount + percent: `<span className="text-gt-sm font-extrabold" style={{ color: getCategoryToken(sel.id).color }}>{sel.amountK} ({sel.percent})</span>`.
- Empty state: `<span className="text-gt-xs text-gt-ink-3 opacity-60">Toca una categoría para ver detalles</span>`.
- `transition-opacity duration-200` on the inner wrapper for the swap crossfade.

`total` for percent = sum of level-1 (rubro/source-only) node values; with the current fixture, sum of the two L1 outflows = 182+52 = 234 (or sum all source values). Use a `total` prop (default: sum of links whose source is a level-0 node) to keep percent honest.

---

## Fixture

The existing fixture in `src/lib/analyticsFixtures.ts` is SUFFICIENT to build a faithful 3-level vertical sankey AS-IS, and the molecule should default to it. It already encodes a clean rubro→giro→familia flow:
- `SANKEY_NODES` (6): supermercados, restaurantes (L1 rubros) → store-supermarket "Líder", store-restaurant "Nido" (L2 giros) → food-fresh "Frescos", food-packaged "Envasados" (L3 familias). All ids resolve in `getCategoryToken` (rubro/giro/familia) for color+icon+label.
- `SANKEY_LINKS` (5): supermercados→store-supermarket(182), restaurantes→store-restaurant(52), store-supermarket→food-fresh(110), store-supermarket→food-packaged(72), store-restaurant→food-packaged(52). Values balance per node (182=110+72; 52→52) → ECharts renders clean conservation-of-flow ribbons.
- `clpK` already gives the `$182k` chart labels.

RECOMMENDED OPTIONAL EXTENSION (only if a denser spike option C/D needs it — do it as ADDITIVE constants, never mutate the existing arrays per the immutability rule): add `SANKEY_NODES_RICH` / `SANKEY_LINKS_RICH` with (a) a 3rd L1 rubro (e.g. restaurantes already there; add `restaurantes` second giro, or add a `comercio-barrio`→giro branch) and (b) a grey "Más" aggregation node per the legacy 10%-threshold model: `{ id: "otros", label: "Más" }` with `itemStyle.color:"#9ca3af"` (Tailwind gray-400, the ONE hardcoded non-palette color, applied in the molecule when `node.id==="otros"`/label==="Más", NOT in the fixture color). Keep "Más" non-selectable (early-return in click handler). This is NOT required for the baseline build — the 6-node fixture is the faithful default; the "Más" node + 3rd branch are only for the "3-level / denser" spike variants. Do NOT add x/y/depth coords or per-link styling to the fixture (layout + link gradient are 100% ECharts' job, per the legacy data-only contract).

---

## Reuse/net-new

REUSE (no new deps, no new tokens — all confirmed present in design-lab):
- `echarts ^6.1.0` + `echarts-for-react ^3.0.6` — ALREADY installed (DM-13); import `ReactECharts from "echarts-for-react"` exactly as the archived ChartSkinSpike does.
- `lib/diagramSkin.ts` — `tokenTrueTint(0.5)` for node fills (THE locked palette), `GT_CHART_HEX`, `hexA`, `DIAGRAM_TINT`, `tokenTrueColor`, `type DiagramColorFor`. Already used by Treemap + DonutChart, so sankey re-tints in lockstep.
- `lib/categoryTokens.ts` — `getCategoryToken(id)` → `.color/.tint/.icon/.label` for the selection pill identity (icon + tinted bg).
- `lib/analyticsFixtures.ts` — `SANKEY_NODES`, `SANKEY_LINKS`, `SankeyNodeDatum`, `SankeyLinkDatum`, `clpK`.
- `design-system/molecules/Card.tsx` — frame in stories (`rounded-gt-2xl border-2 border-gt-line-strong bg-gt-surface shadow-gt-md`).
- `design-system/assets/PixelIcon.tsx` — pill icon (size 16).
- Geometric grammar tokens: `font-gt-display`/Outfit (`--font-family`), ink `#1E293B`, `text-gt-xs`=11px, `rounded-gt-pill`/`rounded-gt-2xl`, `border-2 border-gt-line-strong`, `gt-N` spacing — all in tokens.css.
- The archived `_spikes/archive/ChartSkinSpike.archive.tsx` `SankeyMini` is the literal starting template (option shape, svg renderer, idToLabel mapping, lineStyle:'source').
- Spike scaffolding atoms: `_spikes/AtomSpike.tsx` (`Spike`, `optionArgType`, `PLATFORM_ARGTYPE`, `SpikeArgs`, `SpikeOption`) for the A/B/C/D explorer story.

NET-NEW (build these):
1. `src/design-system/molecules/SankeyChart.tsx` — the molecule: themed ECharts `option` (useMemo) + `ReactECharts` container + click→selection handler + internal selection-title band. Props interface + `SankeySelection` type exported.
2. `src/design-system/molecules/SankeyChart.stories.tsx` — `Default` (Card-framed) + `Slide` (title-band + chart in a 400px frame) + the `Spike` (A/B/C/D density explorer).
3. The `SankeySelection` payload type + percent/total math (sum-of-level-1 helper).
4. OPTIONAL/ADDITIVE: `SANKEY_NODES_RICH`/`SANKEY_LINKS_RICH` + "Más" grey-node handling (only for denser spike variants). DORMANT (do not build): the icon-in-node ECharts overlay + carousel swipe/programmatic-scroll — both deferred, flagged off.

---

## Spike A/B/C/D

PALETTE FIXED at Token-True 50% (tokenTrueTint(0.5)) across ALL four — per DM-11 the sankey pass varies ONLY density/layout, never color. Four concrete treatments (wire as `SpikeOption` A/B/C/D via AtomSpike, each setting the `spike.*` knobs the option reads):

A · "Airy ribbons" (baseline, legacy-faithful) — `nodeWidth:14, nodeGap:10, curveness:0.5, linkOpacity:0.45, showLabels:true, labelPos:"inside", inkBorder:false`, 2-level depth shown ([{depth:0},{depth:1}]) on the 6-node fixture trimmed to rubro→giro, OR full 3-level. Thin-ish bars, gentle 45% ribbons, label text inside the bar. Closest to the archived ChartSkinSpike SankeyMini. The safe default.

B · "Bold bars + ink" (Playful-Geometric forward) — `nodeWidth:24, nodeGap:14, curveness:0.5, linkOpacity:0.40, showLabels:true, labelPos:"right", inkBorder:true` → adds `itemStyle.borderColor:INK, borderWidth:2` on every node (the geometric 2px-ink signature). Fat bars carry a hard ink edge; labels move to the RIGHT of each bar so wide giro names don't clip inside a bar. Most on-brand with the gt geometric grammar. 3-level depth.

C · "Dense flow" (max information) — `nodeWidth:8, nodeGap:8, curveness:0.6, linkOpacity:0.55, showLabels:true, labelPos:"bottom", inkBorder:false`, FULL 3-level + the "Más" grey aggregation node (uses SANKEY_NODES_RICH). Thin 8px bars (legacy icon-mode width) maximize ribbon area; higher opacity + curveness reads as a fuller "river"; labels below each node. Tests the busiest layout.

D · "Faint river" (calm / data-ink minimal) — `nodeWidth:18, nodeGap:16, curveness:0.45, linkOpacity:0.30, showLabels:true, labelPos:"inside", inkBorder:false`, 2-level. Wide gaps + low 30% link opacity → airy, low-clutter, ribbons recede so node bars dominate. Tests whether less ribbon ink reads cleaner at slide size (340px).

(All four keep `tooltip:{show:false}` + the external selection pill, `renderer:"svg"`, Outfit-700 11px labels, INK label color, animation gated by prefersReducedMotion.) The compare board shows the same fixture under each so the user picks density, not color.

---

## Build steps

1. (OPTIONAL, only if doing spike C/D denser variants) Extend `src/lib/analyticsFixtures.ts` ADDITIVELY: add `SANKEY_NODES_RICH` + `SANKEY_LINKS_RICH` (3rd L1 branch + a `{ id:"otros", label:"Más" }` aggregation node). Do NOT touch the existing `SANKEY_NODES`/`SANKEY_LINKS` (immutability; they remain the faithful baseline default). Skip this step for the baseline build — the 6-node fixture is enough.

2. Create `src/design-system/molecules/SankeyChart.tsx` — the molecule:
   a. Export `SankeyChartProps` + `SankeySelection`.
   b. Build the themed ECharts `option` in a `useMemo` (vertical sankey, nodes mapped through `tokenTrueTint(0.5)` + `getCategoryToken` for the "Más" grey override, `idToLabel` links, `lineStyle:{color:"source",curveness,opacity}`, `levels:[{depth:0},{depth:1},{depth:2}]`, Outfit-700-11 INK labels, `tooltip:{show:false}`, `emphasis.focus:"adjacency"`, animation gated by `prefersReducedMotion`).
   c. Render `<ReactECharts opts={{renderer:"svg"}} onEvents={{click}} notMerge lazyUpdate style={{height,width:"100%"}}/>` in a `relative` div; `chartRef` for imperative highlight/downplay.
   d. Implement `handleClick` → branch `params.dataType` node/edge → build `SankeySelection` (toggle + skip "Más") → `onSelectionChange` + dispatch highlight/downplay.

3. Add the selection-title band (Step 2 same file, gated by `showTitle`): fixed `minHeight:56` flex-col; Line 1 = tinted pill (`getCategoryToken(sel.id).tint` bg + `.color` text + `PixelIcon`), Line 2 = `amountK (percent)`; link kind = source `>` target; empty = "Toca una categoría…"; `transition-opacity duration-200`.

4. Create `src/design-system/molecules/SankeyChart.stories.tsx`:
   a. `Default` — `<Card title="Flujo de gasto"><SankeyChart/></Card>` on `bg-gt-bg` (mirror DonutChart.stories).
   b. `Slide` — title-band + chart stacked in a fixed ~400px Card (the static, non-carousel slide mock); optional story-only fade/scale wrapper.
   c. `Spike` — wire A/B/C/D via `AtomSpike` (`Spike`, `optionArgType`, `PLATFORM_ARGTYPE`); each option sets the density knobs (Step "spike_options"); board reuses the same fixture so only density/layout vary.

5. Verify: `npm run build` (tsc) + open Storybook (`npm run storybook`), exercise click→pill toggle + adjacency highlight, capture Playwright/vitest-browser SVG screenshots for the 4 spike variants. Per DM-11 confirm NO color drift (all nodes Token-True 50%). Leave the icon-in-node overlay + carousel swipe DORMANT (flagged off, not built).

---
