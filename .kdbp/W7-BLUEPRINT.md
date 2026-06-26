# W7 · Analytics — chart-engine swap blueprint

Captured 2026-06-26 from the design-lab analytics investigation. W7 scope (user-confirmed):
**FULL chart-engine swap** — Recharts → hand-built donut/treemap + ECharts Sankey + drill/count-up.
Data-layer (hooks/api) stays; this is a presentation-engine swap. Build in paced sub-batches,
each verified (tsc/token/build/vitest/lint) + proven (Playwright vs user B's seeded analytics data).

## Current web surface (to replace/restyle)
- `web/src/routes/trends.tsx` (251) — the analytics route (composes the charts).
- `web/src/components/charts/CategoryDonut.tsx` (115) — Recharts donut → replace with hand-built.
- `web/src/components/charts/SpendTimeSeries.tsx` (115) — Recharts time-series.
- `web/src/components/charts/Sparkline.tsx` (77) + Sparkline.test.tsx (32).
- Dep: `recharts ^2.15.4` (pinned, P48). ECharts NOT installed.
- Data wiring: read trends.tsx + the existing useInsights/useInsightsTree hooks BEFORE porting — preserve them.

## Design-lab targets (reference, read-only)
- Screens: `design-lab/src/features/spending/screens/{SpendingScreen,CategoryDetailScreen}.tsx`,
  `features/spending/components/TrendsRepresentations.tsx` (Dona/Mapa/Flujo switcher).
- Donut: `design-system/molecules/{DonutChart,SpendingDonut,DonutLegend}.tsx`, `atoms/DonutRing.tsx`.
- Treemap: `design-system/organisms/Treemap.tsx`, `molecules/TreemapCell.tsx`.
- Sankey: `design-system/molecules/SankeyChart.tsx` (ECharts + icon overlay).
- Libs to PORT: `lib/treemapLayout.ts` (squarify, zero-dep), `lib/useCountUp.ts` (easeOutCubic RAF),
  `lib/categoryTokens.ts` (L1–L4 color/icon), `lib/diagramSkin.ts` (Token-True palette, DIAGRAM_TINT=0.5).

## Sub-batch build plan
1. **Deps + utils + donut** — `npm i echarts echarts-for-react`; port treemapLayout/useCountUp/diagramSkin
   helpers into web (or adapt existing lib/chartData categoryColorVar); rebuild CategoryDonut as hand-built
   SVG (polar(r,deg)+segPath arc-flag math, 132×132 viewBox, r_out 58 / r_in 40, center label slot) with
   count-up + drill path stack. Keep the donut's data props + testids.
2. **Treemap** — squarified layout (calculateTreemapLayout → %-rects) + TreemapCell (tiny/compact/standard
   density modes, count pill, CircularProgress %), drill on cell click.
3. **Sankey** — ECharts-for-react wrapper: `<ReactECharts opts={{renderer:'svg'}} notMerge lazyUpdate
   onEvents={{click}} />`; option = {series:[{type:'sankey', orient, nodeWidth:14, nodeGap:10,
   layoutIterations:32, emphasis:{focus:'adjacency'}, data:[{name,itemStyle:{color,borderColor:'#1E293B'}}],
   links:[{source,target,value}], lineStyle:{color:'source',curveness:0.5,opacity:0.45}, label}]}.
   (Defer the icon-node SVG-position overlay — DM-25 — as a polish follow-up; ship plain ECharts labels first.)
4. **trends route** — the Dona/Mapa/Flujo representation switcher + period control, geometric Cards,
   wiring the 3 charts to the existing insights data. Drill breadcrumb + count-up.

## Color system
- `GT_CHART_HEX = ["#8B5CF6","#FBBF24","#F472B6","#34D399","#3B82F6","#64748B"]` wrapped mod 6, hexA at
  DIAGRAM_TINT=0.5. "otros" → fixed grey #9CA3AF. Node/cell ink border #1E293B. (web's lib/chartData
  categoryColorVar already maps category→chart-series var — reconcile with this.)

## Risk / proof notes
- ECharts adds a heavy dep — verify Vite build + bundle size; SVG renderer (not canvas) for a11y/overlays.
- Prove against user B's seeded analytics (the prior seeded-data-verify showed the dashboard/trends render
  real category breakdowns + "What's shifting" insights). Screenshot Dona/Mapa/Flujo + drill.
- Defer (track as P-items): the Sankey icon-node overlay (DM-25), full L1–L4 level-range peel (DM-24) if heavy.
