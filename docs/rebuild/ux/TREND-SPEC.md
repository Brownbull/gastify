# Legacy Trend — Build Spec (DM-28)

> From workflow w1vg0kss6. The 4th analytics diagram = the **Tendencia list view**.
> Authoritative source: legacy React `TrendsView`
> (`boletapp/src/features/analytics/views/TrendsView/`). gustify has no trend impl.
> Verbatim legacy row anatomy + gastify re-skin (Token-True 50% skin for the
> distribution charts; **semantic red/green for direction** on the sparkline +
> TrendChange). NO count-up — only the entrance stagger.

---

## 1. Row anatomy (molecule: TrendRow)

Ported legacy `TrendListItem`, re-skinned to Playful-Geometric. A structural
cousin of `DonutLegend`'s `<li>` row — reuse the wrapper + leading cluster, swap
the right side: magnitude bar → `Sparkline`, percent → `clpK(amount)` + `TrendChange`.

Row wrapper: `flex items-center gap-gt-8 rounded-gt-xl p-gt-8 transition-colors`
(hover `bg-gt-bg-3`). `data-testid="trend-row-{id}"`. Selection optional (drop for v1).

L→R:
1. **IconTile** (left) — `<IconTile icon={token.icon} tint={token.tint} size="sm" />`
   (h-9, 2px ink border). `token = getCategoryToken(t.id)`. `shrink-0`. "Más" → `id:"otros"` = grey natively.
2. **Info stack** (`flex min-w-0 flex-1 flex-col items-start gap-gt-2`):
   - **Name**: `truncate font-gt-display text-gt-md font-extrabold text-gt-ink`.
     "Más" row only: append a `categoryCount` OUTLINE badge (MetaPill sm).
   - **Amount**: `font-medium text-gt-ink-2 text-gt-xs` = `clpK(t.amount)` ($182k).
3. **Count pill** (optional, only if count-mode wired) — DonutLegend's pill
   (`fin-receipt`/`item-pantry`). Neutral. Fixture has no count → drop for v1.
4. **Sparkline** — `<Sparkline points={t.sparkline} color={strokeColor} strokeWidth={1.5} />`
   (64×24). `strokeColor` = semantic by direction (§2). `shrink-0`.
5. **Stats column** (right, `min-w-[52px] text-right`) — `<TrendChange direction={t.dir} percent={t.change} size="sm" />`
   (up=red, down=green, neutral `=`). `pill={false}` bare for density.
6. **Drill chevron** (conditional) — only when `canDrill?.(id)`. "Más" never drills.
   v1: flat list → no chevron.

ENTRANCE STAGGER (only motion, no count-up): each row slides in from left —
`opacity 0→1`, `translateX(-20px)→0`, 300ms ease-out, fired at `i*60ms`. Owned by
the LIST (`visibleRows` Set + `animKey`, mirrors DonutRing's stagger). Respect
`prefers-reduced-motion` → all visible at once.

`TrendRowProps`: `{ datum; colorFor?; colorMode?: "direction"|"category"; countMode?; isVisible?; canDrill?; onDrill?; onCountClick?; className? }`.

---

## 2. Sparkline (REUSE AS-IS) + the direction-color decision

`atoms/Sparkline.tsx` exists + is faithful: `<svg viewBox="0 0 64 24">` single
`<path>`, auto min/max scale, `<2` points → dashed flat fallback, `strokeWidth`+`color`+`className`.
Build nothing new. Pass `strokeWidth={1.5}` to match legacy weight.

**OPEN DECISION — sparkline stroke color (the one spike axis beyond density):**
- **RECOMMENDED (legacy):** **semantic direction** — up→`text-gt-negative`, down→`text-gt-positive`,
  neutral→`text-gt-ink-3`. Color-coordinates with the `TrendChange` badge (one
  direction = one color across the row). This is the intentional, documented
  exception to the locked distribution palette (a *semantic* axis = good/bad, like
  the "Más" grey) — does NOT violate "spikes vary density not color".
- **ALT (palette-consistent):** category color via `colorFor(id,i)` (Token-True 50%).
  Ties the row to the donut/treemap hue; loses the at-a-glance good/bad signal.
- → Default `colorMode="direction"`; expose `"category"` as a board compare knob.

Optional dashed prev-period reference line: Sparkline `refValue?` extension +
`TrendDatum.prevAmount` — DORMANT (2-part, defer).

---

## 3. "Más" aggregation (neutral grey row)

`>10%` threshold (treemap/sankey model): below-threshold tail folds into a grey
**"Más"** row — `id:"otros"` (resolves to grey `tint:#f5f5f4`/`color:#57534e`/`icon:rubro-otros`
natively, no special-casing), `amount = Σ`, **merged sparkline = element-wise sum**,
`categoryCount` → the §1 outline badge. "Más" sparkline forced grey (`text-gt-ink-3`);
`canDrill` always false. Expand/collapse stepper = OPTIONAL chrome (defer v1; static "Más").
Fixture gap → add `otros` row additively (§5).

---

## 4. The list + header (molecule: TrendList)

Net-new. Maps `TRENDS → TrendRow`, owns the stagger + (optional) drill/selection.
Root: `<ul className="flex min-h-0 flex-col gap-gt-4">` (`min-h-0` = the scroll fix).
**Sort FIXED value-desc** (no sort control). Stagger: `visibleRows: Set<number>` +
`animKey`; `useEffect` fires `i*60ms` setTimeouts (clear on cleanup; reduced-motion
→ all at once); bump `animKey` on period/count/drill change.

Card framing in stories: `Card title="Tendencia"` + action slot. Card header
(model only the card-level): count-mode toggle (defer v1), List⇄Sankey view toggle
(separate stories or a 2-state control), period stepper (screen-level, defer).

DRILL (DM-29 — built, mirrors the donut): `TrendList` owns a `path` stack +
breadcrumb "Total › Supermercados › …" + back button; tapping a row chevron/name
drills into that category's next taxonomy level via `trendDrillChildren` (the
`TREND_DRILL_TREE` analogue of the donut's `DRILL_TREE`, same branches, trend
payload), bumping `animKey` to replay the stagger. `canDrill = trendDrillChildren(id)
!= null` (chevron shown when not deepest); "Más"/otros never drills; leaves (L4
categorías) show no chevron. Per-level re-percentage baked into the fixture
(children sum to ~100% of parent). Uncontrolled by default; `onDrill` takes
control. A parallel state machine to the donut's, NOT a shared hook — see the
deferred `useDrillDown<T>` decision (extract at Reports = the 3rd consumer).

`TrendListProps`: `{ data?; colorMode?; colorFor?; countMode?; animKey?; canDrill?; onDrill?; onCountClick?; className? }`.

---

## 5. Reuse vs net-new

REUSE AS-IS: `Sparkline`, `TrendChange`, `IconTile`, `getCategoryToken`,
`tokenTrueSoftColor`/`DiagramColorFor` (only for `colorMode:"category"`),
`TRENDS`/`TrendDatum`/`TrendDir`/`clpK`/`CountMode`/`COUNT_MODES`/`PERIODS`,
`DonutLegend` (PATTERN reference — copy markup, don't reuse), `Card`,
`CountModeToggle`/`PixelIcon`/`ChevronDownIcon` (if pill/chevron built), `AtomSpike`.

EXTEND (additive only): `TRENDS_RICH` (6-7 rows + `otros` + `categoryCount` [+`count`/`itemCount`])
to exercise §3 + the dense spike; `Sparkline.refValue?` (dormant).

BUILD: `molecules/TrendRow.tsx`, `molecules/TrendList.tsx` (+ stories), `_spikes/TrendSpike.tsx`.

---

## 6. Spike A/B/C/D (palette/semantic FIXED, vary row density/layout only)

- **A · Sparkline-right compact** (baseline, legacy) — IconTile · [name/amount] ·
  Sparkline (64×24, direction color) · TrendChange bare. The safe default.
- **B · Sparkline-as-row-background** — sparkline a faint full-width backdrop
  (~0.25 opacity) behind the row text. Data-viz forward.
- **C · Two-line stat-prominent** — taller; amount a bold display headline top-right,
  TrendChange as a tinted pill; sparkline 80×28 under the name.
- **D · Dense legend-like** — tight (`p-gt-4`, `text-gt-xs`); full slot order incl.
  count pill + mini 48×20 spark + chevron; all categories + grey "Más" row.

Board compare knob: `colorMode` direction (default) vs category — same fixture,
judge the §2 decision visually. Decision → fold winner into TrendRow/TrendList
defaults → archive `TrendSpike.archive.tsx`.
