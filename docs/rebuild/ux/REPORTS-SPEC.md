# Legacy Reports — Build Spec (DM-32)

> From workflow wushf5000. The 5th / **LAST** analytics piece = the Resumen /
> report-story surface. Legacy: `boletapp/src/features/reports/`
> (`SpendingDonutChart`, `ReportCard`, `ReportCarousel`, `ReportDetailOverlay`,
> `ReportsView`, `reportGeneration`, `types/report`). design-lab has zero Report*
> files — net-new composition over the existing library. Re-skin to gastify +
> the LOCKED Token-True 50% palette (donut) + semantic red/green (trend
> direction). **The report donut is a STATIC snapshot — no hover/click/drill.**

---

## 1. Scope

Reports is a **flat snapshot family**, not a charting view. Build the static
donut + story cards + a light carousel; STUB the screen hub; DEFER PDF export +
timed auto-advance. **Drill: NONE** (§5).

| Layer | Mockup scope |
|---|---|
| Static report donut (`SpendingDonutChart`) | **BUILD** `molecules/SpendingDonut.tsx` |
| Story/report cards (`ReportCard` + `TrendIndicator`, `HeroCard`) | **BUILD** `molecules/ReportCard.tsx`; hero via `MetricCard` |
| Card stack/carousel (`ReportCarousel` + `ProgressDots`) | **BUILD (light)** scroll-snap + dot rail |
| Report screen hub (year accordions) | **STUB** — card stack on a Card board |
| PDF export · auto-advance story | **DEFER** |

---

## 2. Static report donut (`SpendingDonut`) — net-new pure-SVG

Legacy = pure-SVG **filled `describeArc` wedges** (NOT a stroked circle). Consts:
`RING_THICKNESS=0.42`, `SEGMENT_GAP=2°`, `MIN_SEGMENT_ANGLE=8°`. Geometry:
`outerRadius=size/2-2`; `innerRadius=outer*(1-0.42)`; `polarToCartesian` with `-90`
(seg 0 at 12 o'clock); `availableAngle=360-n*GAP`; `segmentAngle=max(pct/100*avail, 8)`;
`currentAngle=end+GAP`. Filter `pct>0`, sort percent-desc. Faint bg ring (opacity 0.2)
+ white 1.5px separation stroke + per-wedge `<title>` tooltip.

**Do NOT reuse `DonutRing`** — it draws stroked circles, REQUIRES `selected`/`onSelect`,
always runs the reveal animation, and renders live hit-areas. Wrong for a static
snapshot. **Build `molecules/SpendingDonut.tsx`** (~50 lines):
- wedge fill = `tokenTrueSoftColor(seg.id, i)` (LOCKED 50%), white separation stroke, `gt-line`@0.2 bg ring.
- `size`~120, named consts, NON-interactive (`aria-hidden`, `<title>` only, no anim/hit-area), `null` if no `pct>0`.
- center: reuse `DonutCenterLabel` (period total `clpK(total)` + label).
- inline side legend (donut LEFT, legend RIGHT): pill rows = color dot + `getCategoryToken(id).label` + bold `{pct}%`. Read-only (NOT `DonutLegend`).

`SpendingDonutProps`: `{ segments; size?; total?; periodLabel?; className? }`.

---

## 3. Story / report cards (`ReportCard`)

Full-screen story card: centered emoji + muted title + big `primaryValue` (display)
+ `TrendChange pill` + optional secondary/description. `min-h-[400px] rounded-gt-2xl p-8`.

**Gradient-by-type** (card chrome, NOT the locked palette — free to brand):
| type | gt bg | ink |
|---|---|---|
| summary | `from-gt-primary to-gt-primary-hover` | white |
| category | `bg-gt-surface` (flat) | ink |
| trend | blue pair (card-local hex — no gt blue token) | white |
| milestone | amber→orange (`from-gt-warning to-orange`) | white |

**`TrendChange` pill = the `TrendIndicator`** — reuse in pill mode. On gradient cards
add an additive `onGradient` prop → `bg-white/20 text-white` (else the bordered pill clashes).

Base: **`HeroCard` → `MetricCard`** (add optional `deltaSlot?: ReactNode` so the hero
shows a `TrendChange` glyph not a plain Badge). **`ReportCard` = net-new** (no full-screen
card exists). `StatusCard` for the insight notice.

`ReportCardProps`: `{ type; title; primaryValue; secondaryValue?; trend?:{direction,percent}; icon?; description?; isActive?; className? }`.

---

## 4. Flow + fixture

**Carousel (light):** horizontal scroll-snap of the 4 cards + `ProgressDots`
(`role=tablist`, dots `bg-gt-line`, active widens to `bg-gt-primary` pill, `transition-all`).
Swipe/keyboard, **no timer**. Card-framed in stories.

**Net-new `lib/reportFixtures.ts`** — most fields reuse analyticsFixtures; net-new only:
`prevTotal`, grand-total MoM `change`, `txnCount`, `itemCount`, `insight`, `cards[]`.
```ts
export type ReportCardType = "summary" | "trend" | "milestone" | "category";
export interface ReportCard { id; type: ReportCardType; title; primaryValue; secondaryValue?; trend?: {direction,percent}; icon?; description?; }
export interface PeriodReport { period; total(=TOTAL_SPEND); prevTotal; change; segments(=SEGMENTS); topCategories(=TRENDS_RICH); txnCount; itemCount; insight?; cards: ReportCard[]; }
```
4 sample cards (one per gradient type): summary (clpK total, ▼-12%), trend (−12% vs mayo),
milestone (42 boletas record), category (top rubro Supermercados).

---

## 5. Drill decision — Reports is FLAT; HOLD the `useDrillDown<T>` extraction

**Reports does NOT drill.** Nav is list → detail overlay → close; donut/cards are
non-interactive read-outs; the only outbound nav is lateral (txn-count → filtered
History). No path/level/breadcrumb state anywhere.

**THE CALL: do NOT extract `useDrillDown<T>` now — keep the donut + trend mirrors.**
The DM-29 deferral assumed Reports = the 3rd `id→children` consumer (rule of three).
**That trigger is FALSE** — Reports is a static snapshot (+ a differently-shaped 2-axis
`DrillDownGrid`, out of scope). The hook still has exactly TWO real consumers. Refactoring
the shipped/green donut+trend for ~0 new coverage = live break points for cosmetic DRY
(the donut's `setSelected`/`levelTotal` + the trend's `externalAnimKey`/`onDrill` seams
don't compose cleanly onto a hook owning its own animKey). **Extract the day a real 3rd
single-axis `{root, childrenOf}` consumer lands**, then migrate all three with parity proof
(re-run DonutChart/TrendList stories + the test suite + DM-21 screenshots). The ready hook
impl + migration diffs live in the DM-29 analysis — correct, just not triggered yet.

---

## 6. Reuse vs net-new

REUSE: `DonutCenterLabel`, `TrendChange` (pill), `IconTile`, `Sparkline`, `Card`,
`StatusCard`, `MetricCard`/`StatValue`/`SummaryStats`, `Badge`; fixtures `SEGMENTS`,
`TOTAL_SPEND`, `TRENDS_RICH`, `clpK`, `PERIODS`, `getCategoryToken`; `tokenTrueSoftColor`.

EXTEND (additive): `TrendChange.onGradient` (white/20 pill); `MetricCard.deltaSlot?`.

BUILD: `SpendingDonut`, `ReportCard`, `ReportCarousel`+`ProgressDots`, `reportFixtures.ts`, `ReportSpike`.

DO NOT BUILD: drill hook/breadcrumb/DrillDownGrid, PDF export, auto-advance, the year hub.

---

## 7. Spike A/B/C/D (palette/skin FIXED — Token-True 50% donut + semantic red/green)

- **A · Donut + legend report card** (baseline/legacy) — static `SpendingDonut` LEFT + inline legend RIGHT on a flat Card. The PDF-snapshot default.
- **B · Full-screen story card** — `ReportCard` Instagram-style; board shows all 4 type gradients to judge the re-skin.
- **C · Card carousel / stack** — scroll-snap of the 4 cards + `ProgressDots`; isActive opacity/scale, no timer.
- **D · Summary-stat dashboard** — `MetricCard` hero + `SummaryStats` row + compact donut + top-3 trend list + `StatusCard` insight. The composite board.
