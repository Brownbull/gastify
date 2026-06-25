# Legacy Donut — Build Spec (DM-20)

> From workflow wkjj5osje. Verbatim legacy geometry + gastify re-skin (Token-True 50% tint).

---

## Interactive donut ring

INTERACTIVE DONUT RING (atom: DonutRing) — re-skinned legacy DonutChart ring (legacy lines 560-730 + useDonutDrillBown).

GEOMETRY (verbatim from legacy, the load-bearing math):
- Wrapper: `relative` div, fixed 180x180px (inline style width/height). Inside: one <svg viewBox="0 0 120 120" className="h-full w-full"> with inline `style={{ transform: "rotate(-90deg)" }}` so segment 0 starts at 12 o'clock. ALL ring geometry authored in the 120-unit space (center 60,60), NOT the 180px CSS box; 120→180 = 1.5x render scale.
- One <circle> per segment (NO <path>): cx=60 cy=60 r=52 fill="none". circumference = 2*Math.PI*52 ≈ 326.726 (recompute each render).
- strokeWidth = isSelected ? 16 : 14 (resting 14 ≈ 21px rendered, selected 16 ≈ 24px). r=52 leaves an 8-unit (~12px) pad each side inside the viewBox.

DASHARRAY MATH (per segment, in displayData order, in an IIFE inside <svg> with closure vars `currentOffset=0`, `segmentIndex=0`):
- skip cat.pct<=0 → return null BEFORE incrementing segmentIndex (only painted segments get indices 0,1,2…).
- gapPercent = 0.5. segmentPercent = Math.max(0, cat.pct - gapPercent). dashLength = (segmentPercent/100)*circumference.
- animatedDashLength = isVisible ? dashLength : 0.
- strokeDasharray = `${animatedDashLength} ${circumference - animatedDashLength}` (visible arc, then the rest soaked up as gap).
- strokeDashoffset = -currentOffset (NEGATIVE — required by rotate(-90) + clockwise winding).
- AFTER emitting: currentOffset += (cat.pct/100)*circumference — advances by the FULL slice (uses cat.pct, NOT segmentPercent), so the 0.5% gap lands as empty track at the END of each slice and positions stay on true % boundaries.

REVEAL ANIMATION (clockwise grow-in, ported from useDonutDrillBown stagger):
- isVisible = visibleSegments.has(currentSegmentIndex). visibleSegments is a Set<number>. A useEffect keyed on `animKey` loops i=0..(segCount-1) firing setTimeout at i*80ms → `setVisibleSegments(s => new Set([...s, i]))`; cleanup clears all timers. PASS REAL segCount (legacy hardcoded 10 — fix that).
- transition: `stroke-dasharray 400ms ease-out, stroke-width 200ms ease-out, opacity 200ms ease-out` (inline style). animatedDashLength sweeps 0→dashLength over 400ms = the clockwise draw.
- circle key = `${cat.id}-${animKey}` forces remount-at-0 on every key bump.

SELECTION (thicken + dim, ported toggle):
- isSelected = selected === cat.id. onClick → handleSegmentClick(cat.id) which toggles `setSelected(prev => prev===id ? null : id)` (tap select / tap-again deselect; single string, one at a time).
- Selected: strokeWidth 16 (+2). Dim-others: `opacity = selected && !isSelected ? 0.4 : 1`. When selected===null all arcs are opacity 1, width 14. Preserve the 0.4 dim and +2 thicken against the tinted palette.
- className="cursor-pointer"; data-testid=`donut-segment-${cat.id}`.

CENTER LABEL (DonutCenterLabel, see legend/center spec) is an absolutely-positioned overlay OUTSIDE the rotated SVG so text is upright.

RE-SKIN TO TOKEN-TRUE 50% TINT (DM-13d) + GEOMETRIC GRAMMAR:
- stroke color: REPLACE legacy `cat.fgColor` with the diagram palette. Default fill = `tokenTrueTint(DIAGRAM_TINT)(cat.id, index)` = hexA(GT_CHART_HEX[i%6], 0.5) imported from organisms/Treemap.tsx. Pass a `colorFor?: (id,i)=>string` prop (default tokenTrueSoftColor) exactly like Treemap, so the spike can swap to `tokenTrueColor` (vivid) for compare. Palette is FIXED per DM-11/DM-13d — the spike must NOT vary it.
- INK BORDER on segments (note both): a stroked <circle> ring canNOT carry a separate border. Two ways to get the 2px-ink grammar on a soft 50%-tint arc:
  (a) FLAT (default, recommended): no ink border on the arc — the soft tint reads as the geometric fill; the 2px ink belongs to the CARD wrapper + legend rows, not the ring stroke. This matches CircularProgress (which has no ink stroke).
  (b) INK-OUTLINED arcs: render TWO circles per segment — an under-circle at strokeWidth+4 stroke=gt-line-strong (#1E293B) drawn first, then the tinted arc at strokeWidth on top, both sharing the same dasharray/offset. Gives each wedge a 2px ink outline (the wedge edges show ink top+bottom). Costs 2x <circle> nodes and the ink shows on the leading/trailing caps. Expose as `inkBorder?: boolean` (default false) — this is the spike's "geometric" knob, mirroring Treemap's inkBorder.
- Numeral/center text uses font-gt-display extrabold (Outfit-extrabold) and gt-ink / gt-ink-3 (see center label).
- Flanking Menos/Más stepper buttons from legacy are OUT OF SCOPE for the donut atom (they belong to the drill-down chrome) — reuse the existing StepperButton atom if/when drill-down is wired; the ring atom itself is just ring + center.

PROPS (DonutRing): { segments: SegmentDatum[]; total: number; selected: string|null; onSelect(id|null); size?=180; ring?=14; selectedRing?=16; gapPercent?=0.5; colorFor?=tokenTrueSoftColor; inkBorder?=false; animKey?; centerPrimary?: ReactNode; centerLabel?: ReactNode }. Data = SEGMENTS from analyticsFixtures (already {id,value,pct}); total = TOTAL_SPEND; clpK() for the center amount.

---

## Interactive legend

INTERACTIVE LEGEND (molecule: DonutLegend) — ported legacy DonutLegend row anatomy, re-skinned + selection-synced with the ring.

ROOT (scroll container): div `flex flex-col gap-gt-4 px-gt-2 overflow-y-auto min-h-0` (legacy gap-1/px-1 → gt-4/gt-2; min-h-0 is the critical flex-shrink fix that lets it scroll instead of pushing the ring). No max-height; height from the flex parent (the Card body). Single map over SEGMENTS (already sorted desc by pct); key=cat.id. No header, no separators.

ROW WRAPPER: div `flex items-center gap-gt-8 p-gt-8 rounded-gt-xl transition-all` (legacy gap-2/p-2/rounded-xl). data-testid=`legend-item-${cat.id}`. Row has NO onClick — all actions on inner buttons (dead space inert). Selection bg state machine, re-skinned:
- SELECTED (selected===cat.id): `bg-gt-primary-soft` (the #EDE9FE primary-light) — replaces legacy bg-slate-600/200.
- NOT selected: transparent at rest, `hover:bg-gt-bg-3` on hover.
isSelected is OWNED BY THE PARENT and SHARED with the ring: clicking the name button calls onSelect(cat.id) (same handler as the ring), so ring-tap highlights the row and row-tap highlights the wedge — bidirectional. No auto-scroll-into-view on select (matches legacy).

ROW ANATOMY L→R (5 slots, reusing existing atoms/molecules):
1) ICON CHIP (left): REUSE IconTile size="sm" (h-9 w-9, 36px, rounded-gt-md, 2px ink border + shadow-gt-xs) with `tint={getCategoryToken(cat.id).tint}` and `icon={getCategoryToken(cat.id).icon}` (the pixel icon, NOT a white emoji). This is the geometric re-skin of legacy's 32px colored emoji chip. Wrap in a <button> if a per-category stats popup is wanted (onIconClick), else render IconTile directly. flex-shrink-0.
2) INFO STACK: div `flex-1 flex flex-col items-start min-w-0` (flex-1 + min-w-0 enables truncate).
   - NAME button: `text-gt-md font-extrabold truncate flex items-center gap-gt-4 w-full text-left`, color gt-ink. Text = getCategoryToken(cat.id).label. onClick → onSelect(cat.id) (the primary select-sync action). For the "Más" aggregate row only, append an OUTLINE count badge (categoryCount): a small pill `border-2 border-gt-line-strong text-gt-xs font-extrabold` min-w 18px h 18px — number of folded categories (NOT a txn count). MetaPill sm can stand in.
   - AMOUNT + MINI-BAR: REUSE Sparkline-sibling pattern but it's a single horizontal magnitude bar, so build a tiny inline bar (legacy AnimatedAmountBar): outer span `text-gt-xs flex items-center gap-gt-8`; money text = clpK(cat.value) at `text-gt-ink-2`; track span inline-block rounded-gt-pill overflow-hidden, width 70px height 3px, bg gt-line; fill span `block h-full rounded-gt-pill transition-all duration-300`, width=`${(cat.pct/maxPct)*100}%`, bg = colorFor(cat.id,i) (the SAME tinted token as the wedge — color-coordinated). maxPct = max(SEGMENTS.pct) (relative magnitude bar, biggest fills full 70px). aria-label `${cat.pct}% del gasto`.
3) COUNT PILL: REUSE the existing pill grammar — a neutral `bg-gt-bg-3 hover:bg-gt-bg-3 text-gt-ink-2 rounded-gt-pill px-gt-8 py-gt-2 text-gt-xs font-extrabold` button with a leading PixelIcon (fin-receipt for txns / item-pantry for items, size 12-14, driven by CountMode — reuse the COUNT_MODES icon mapping). data-testid=`count-pill-${cat.id}`. onClick → onCountClick(cat.id). Neutral by design (NOT category color) to separate it from the colored name/percent. (No count in SEGMENTS fixture — use TRENDS/TREEMAP_FULL count/itemCount or extend the fixture.)
4) PERCENT label: plain span `text-gt-md font-extrabold`, color gt-ink, text=`${cat.pct}%`. Boldest metric in the row (the headline). Not interactive.
5) DRILL CHEVRON (conditional): REUSE IconButton (or a `w-6 h-6 rounded-gt-pill bg-gt-bg-3 hover:bg-gt-bg-3` button) with a chevron-right glyph, size 16. Rendered ONLY when canDrillDown (=!isMás && level<maxLevel, and for leaf item-categories gated by hasSubcategories). data-testid=`drill-${cat.id}`. onClick → onDrillDown(cat.id). "Más" never drills.

SELECTION SYNC WITH RING (the contract): one `selected: string|null` + `onSelect(id|null)` pair is lifted to the parent screen and passed to BOTH DonutRing and DonutLegend. handleSegmentClick toggles it. That single source drives: ring thicken+dim, ring center-label swap, and legend row bg. CountMode is a separate global toggle (reuse CountModeToggle molecule) that flips both the count-pill number and its icon.

ANIMATION: count-up on the amount/percent/count numbers is optional polish (legacy useCountUp easeOutCubic, 600-800ms, key=animKey). No count-up hook exists in design-lab yet — either add a small useCountUp atom-hook or render static numbers for the mockup (acceptable; the bar's CSS width transition-all 300ms already gives motion).

---

## Static report donut

STATIC REPORT DONUT (molecule: SpendingDonut) — ported legacy SpendingDonutChart (describeArc wedges), for reports + weekly-story. PDF-safe: zero interaction, zero animation.

RETURNS null when validSegments.length===0.

ROOT (figure): `div.flex.items-center.gap-gt-16` role="figure" aria-label="Distribución de gastos". Two children: LEFT `<div className="shrink-0">` wrapping the <svg>; RIGHT `<div className="flex flex-col gap-gt-6 flex-1 min-w-0">` wrapping legend rows. SVG is aria-hidden="true" (semantics live in the legend). className prop appended to root.

SVG CANVAS + CONSTANTS (verbatim math): width=height=size (default 100; weekly-story passes 90). viewBox=`0 0 ${size} ${size}`. center = size/2 (=50). outerRadius = size/2 - 2 (=48; 2px absolute margin). RING_THICKNESS = 0.42 → innerRadius = outerRadius*(1-0.42) = outerRadius*0.58 (=27.84). Band width = outerRadius*0.42 (=20.16). Radii scale linearly with size.
Children in order: (1) background ring, (2) segment paths.

BACKGROUND RING: one <circle cx=center cy=center r={(outerRadius+innerRadius)/2} fill="none" stroke="var(--border-light)" strokeWidth={outerRadius-innerRadius} opacity={0.2} />. Stroke spans the full inner→outer band; gives a continuous ring outline behind gaps. Keep bound to --border-light (the 50% tint affects only config/token fills, not this track).

SEGMENT WEDGES (describeArc annular wedges): validSegments.map → <path key d data-testid=`donut-segment-${seg.key}`> with a nested <title>{`${seg.name}: ${seg.pct}%`}</title> for the native hover tooltip. NO click/drill/animation.
Angle math (clockwise from 12 o'clock): SEGMENT_GAP=2°, MIN_SEGMENT_ANGLE=8°. totalGapAngle = n*2°; availableAngle = 360 - totalGapAngle. Per seg: segmentAngle = max((pct/100)*availableAngle, 8°); start=currentAngle; end=currentAngle+segmentAngle; then currentAngle = end + 2°. EDGE: MIN 8° floor means many tiny segments can sum >360° (no clamp) — wedges may overrun past 12 o'clock; acceptable for static report; pre-bucket the tail to "otros" upstream to avoid it.

HELPERS (two module-level pure fns, reusable verbatim):
- polarToCartesian(cx,cy,r,angleDeg): rad = (angleDeg-90)*PI/180  [-90 = top]; return { x: cx+r*cos, y: cy+r*sin }.
- describeArc(x,y,outerR,innerR,startAngle,endAngle): startOuter=polar(outerR,endAngle); endOuter=polar(outerR,startAngle); startInner=polar(innerR,endAngle); endInner=polar(innerR,startAngle); largeArcFlag = (endAngle-startAngle <= 180 ? 0 : 1); d = ['M',startOuter.x,startOuter.y,'A',outerR,outerR,0,largeArcFlag,0,endOuter.x,endOuter.y,'L',endInner.x,endInner.y,'A',innerR,innerR,0,largeArcFlag,1,startInner.x,startInner.y,'Z'].join(' '). OUTER arc sweep-flag 0, INNER arc sweep-flag 1 (opposite sweeps carve the annular band); same largeArcFlag both.

WEDGE STYLE (re-skinned): fill = colorFor(seg.key, index) = tokenTrueTint(DIAGRAM_TINT) (the locked 50% tint, same palette as interactive). stroke="white" strokeWidth={1.5} (the white separation outline between adjacent wedges — KEEP pure white per legacy). opacity={0.9}. (Optional geometric variant for print: stroke=gt-line-strong instead of white for an ink-separated look — offer as the static spike knob.)

SIDE LEGEND (right, card-styled rows): column `flex flex-col gap-gt-6 flex-1 min-w-0`. Per row (validSegments.map, same order): `flex items-center gap-gt-8 py-gt-4 px-gt-8 rounded-gt-lg`, data-testid=`legend-item-${seg.key}`, background inline = getCategoryToken(seg.key).tint (the soft category bg pill — mirrors app card language). Three children: (1) color dot `div w-3 h-3 rounded-gt-pill` inline bg = colorFor(seg.key,i); (2) name `span text-gt-sm font-extrabold flex-1 truncate` color gt-ink; (3) percent `span text-gt-sm font-extrabold shrink-0` color gt-ink, text `${seg.pct}%`. No hover/click. Reuse CategoryChip soft variant as the row IF a fuller look is wanted (chip already = tint fill + ink border + pixel icon + label).

DATA: validSegments = SEGMENTS.filter(s=>s.pct>0).sort((a,b)=>b.pct-a.pct) — drives BOTH the wedge map and the legend map (identical order). DonutSegment shape needs {key,name,pct}; value/emoji optional (unused here). Pre-bucket the tail to "otros" upstream (no Más logic in this static component).

---

## Reuse / net-new

REUSE (existing gastify design-lab pieces):
- FIXTURES (no build needed): `lib/analyticsFixtures.ts` → SEGMENTS [{id,value,pct}] (6 store-level rows, already sorted desc), TOTAL_SPEND=384520, clpK() for `$182k`-style center/legend labels. TRENDS / TREEMAP_FULL carry count/itemCount if the legend count-pill needs real numbers.
- PALETTE (the locked skin, import from organisms/Treemap.tsx — do NOT re-derive): `tokenTrueTint(alpha)` → (id,i)=>hexA(GT_CHART_HEX[i%6],alpha); `tokenTrueSoftColor` = tokenTrueTint(0.5) = the DEFAULT diagram fill; `DIAGRAM_TINT`=0.5 (single source of truth, change there to re-tune); `tokenTrueColor` = vivid (for the spike's compare-only knob); `GT_CHART_HEX` = the 6 hues; `hexA` for any custom alpha. The donut adopts Treemap's exact `colorFor?: (id,index)=>string` + `inkBorder?` + `tint?` prop contract so both diagrams share one skin and one knob vocabulary.
- CATEGORY DATA: `lib/categoryTokens.ts` getCategoryToken(id) → {label, icon (pixel-icon name), color, tint}. Drives the legend icon chip (icon+tint), name label, and static legend row bg.
- ATOMS/MOLECULES:
  - IconTile (size="sm", tint=token.tint, icon=token.icon) → the legend's left icon chip, re-skinned from legacy's flat colored emoji square to the framed ink-bordered well (geometric grammar). 
  - CategoryChip (soft) → optional richer legend label / static-donut legend row (tint fill + ink border + pixel icon + label).
  - CountModeToggle + COUNT_MODES icon mapping → the txns/items toggle feeding the legend count-pill icon+number.
  - StepperButton → the (optional) drill-down Menos/Más chrome if drill-down is wired (legacy flanking buttons).
  - IconButton → the legend drill chevron.
  - Card → the donut card wrapper (2px ink border + shadow-gt-md, title extrabold) housing ring + legend.
  - TrendChange / MetaPill / Sparkline → adjacent trend-row rendering, not the ring itself, but available.
  - Spike + SpikeOption/SpikeArgs/optionArgType/PLATFORM_ARGTYPE harness (AtomSpike.tsx) + the Option/SpikeGrid layout → the A/B/C/D compare harness, identical to TreemapSpike.archive.tsx.
- TOKENS: gt-N spacing (gt-4/8/12/16…), rounded-gt-* (md/lg/xl/2xl/pill), shadow-gt-xs/md (hard zero-blur), border-gt-line-strong (2px ink #1E293B), font-gt-display + font-extrabold (Outfit-extrabold), gt-ink/ink-2/ink-3, gt-primary-soft (selection bg). text-gt-xs(11)/sm(12)/md(14)/lg(15)/xl(16).
- CircularProgress: reference ONLY (it's a single-arc % ring with center numeral — NOT a multi-segment donut). Reuse its -rotate-90 + dasharray=c + offset pattern as the math template, and its center-numeral overlay (font-gt-display extrabold, color/fontSize) for DonutCenterLabel, but the donut needs N segment circles, not one.

NET-NEW (must build):
- DonutRing atom: the multi-segment dasharray ring (N <circle>s, per-segment dashLength + negative dashoffset accumulator, 0.5% gap, rotate(-90), 14/16 stroke, selection thicken+dim, clockwise stagger reveal). CircularProgress does single-arc only.
- DonutCenterLabel atom: the absolute-overlay two-line center (amount + label), reactive to selection (total↔selected value, "Total"↔category label). Borrows CircularProgress's overlay numeral styling.
- DonutLegend molecule: the interactive legend rows (icon chip + name + magnitude bar + count pill + percent + chevron) with selection sync. Composed from existing atoms but the row + the 70px relative magnitude bar are new.
- SpendingDonut molecule (static): the describeArc/polarToCartesian helpers + annular wedge <path>s + white 1.5px separators + faint bg ring + side legend. Entirely net-new geometry (Treemap is rectangles; CircularProgress is one arc).
- The DonutSpike (A/B/C/D), mirroring TreemapSpike.archive.tsx exactly.

---

## Spike A/B/C/D

A/B/C/D DONUT SPIKE — per DM-11/DM-13b the PALETTE IS FIXED at Token-True 50% tint (tokenTrueSoftColor); A/B/C/D vary ONLY density/layout: ring thickness, center-label content, legend placement/density, and ink-border-on-segments. Built with the Spike harness (option picker + platform picker), data = SEGMENTS / TOTAL_SPEND, mirroring TreemapSpike.archive.tsx. All four render <DonutRing> + <DonutLegend> inside a Card; platform radio judges at mobile/tablet width.

A · Airy (legacy look) — ring 14/16, FLAT arcs (no ink border on segments), gap 0.5%. Center label = count-up total (clpK(TOTAL_SPEND)) over "Total". Legend BELOW the ring (legacy vertical stack, scroll), full row density (icon chip + name + 70px magnitude bar + count pill + percent + chevron). 8px gt gaps. Closest to the extracted legacy donut. Note: "all 6 categories, thin soft ring, legend underneath."

B · Geometric (full grammar) — ring 16/18 (chunkier), inkBorder=TRUE on segments (the two-circle ink-outline treatment: under-circle gt-line-strong at stroke+4, tinted arc on top) → every wedge gets the 2px ink edge. Hard shadow-gt-md on the Card. Center label bold font-gt-display 2xl amount + uppercase tracking-wider "Total" sublabel. Legend below, full density, each row with its own 2px ink-bordered IconTile chip. The boldest, most "Playful Geometric" donut. Note: "ink-outlined wedges + thick ring + bordered legend chips."

C · Focused (side legend, roomy) — ring 14/16 flat, BUT legend moves to the RIGHT of the ring (horizontal figure layout like the static donut), and is COMPACT: drop the magnitude bar + count pill, keep icon dot + name + percent only (3 slots). Center label = total. Fewer visible categories option (top 5, tail→"otros" via clpK), bigger arcs, less crowding. Note: "ring left / compact legend right, 5 categories, breathing room."

D · Dense dashboard — ring 12/14 (THINNER, more donut-hole for a prominent center), flat arcs, center label shows the SELECTED segment's value+label by default (or total when none) with a secondary % line — center carries more info. Legend below but DENSE: tighter rows (p-gt-4, gt-4 gaps, text-gt-xs), all 6 categories, magnitude bar kept but count pill collapsed into the percent. Maximizes info per vertical px. Note: "thin ring + info-rich center + tight 6-row legend — the analytics-screen density."

Knob matrix (what each varies, palette held constant):
- ring thickness: A=14/16, B=16/18, C=14/16, D=12/14
- inkBorder on segments: A=no, B=YES, C=no, D=no
- center-label content: A/B/C = total; D = selected-or-total + % line; B adds uppercase sublabel styling
- legend placement: A/B/D = below (vertical scroll); C = right side (horizontal)
- legend density: A/B = full (5 slots), C = compact (3 slots), D = dense (tight, count folded)
- category count: A/B/D = 6 (all); C = 5 (tail→otros)
Decision output: pick one treatment → fold into production DonutRing/DonutLegend defaults → archive the spike (DonutSpike.archive.tsx), exactly like the Treemap spike flow.

---

## Build steps

Fixtures already exist (analyticsFixtures.ts: SEGMENTS, TOTAL_SPEND, clpK) — no fixture work. Palette already exists (Treemap.tsx exports tokenTrueTint/tokenTrueSoftColor/DIAGRAM_TINT/GT_CHART_HEX/hexA/tokenTrueColor) — import, don't re-derive. Ordered build:

1. (Optional, only if count-up wanted) Add `useCountUp` hook atom (src/design-system/atoms/useCountUp.ts): rAF easeOutCubic 1-(1-t)^3, integer-round/frame, respects prefers-reduced-motion (jump to target), key param to restart. Legend/center numbers. SKIP for first pass — render static + rely on the bar's CSS transition.

2. Build DonutCenterLabel atom (atoms/DonutCenterLabel.tsx): absolute inset-0 flex-col center pointer-events-none overlay; two spans — primary (amount, text-gt-xl font-gt-display font-extrabold gt-ink) + label (text-gt-sm gt-ink-3). Props {primary, label}. Borrow CircularProgress's center-numeral styling. Unit story: total vs selected-value states.

3. Build DonutRing atom (atoms/DonutRing.tsx): the multi-segment dasharray ring per the interactive spec — 180px box, viewBox 120, rotate(-90), N <circle> r=52, gap 0.5%, negative-offset accumulator, 14/16 stroke, selection thicken+dim (opacity 0.4), clockwise stagger reveal (visibleSegments Set + i*80ms effect keyed on animKey, REAL segCount). Props per spec incl colorFor=tokenTrueSoftColor + inkBorder. Embed DonutCenterLabel via centerPrimary/centerLabel slots. data-testid per segment. Stories: resting, selected, animating, inkBorder on/off.

4. Build DonutLegend molecule (molecules/DonutLegend.tsx): scroll container (min-h-0) + rows reusing IconTile(sm, token.tint, token.icon) + name button(onSelect) + 70px relative magnitude bar (maxPct-normalized, fill=colorFor) + neutral count pill (CountMode icon) + percent + conditional drill chevron(IconButton). Selection bg=gt-primary-soft synced via the lifted {selected,onSelect}. Stories: default, one selected, Más row with categoryCount badge.

5. Build SpendingDonut molecule (molecules/SpendingDonut.tsx): module-level polarToCartesian + describeArc helpers (verbatim), figure layout (ring left shrink-0 / side legend right flex-1 min-w-0), faint bg ring (--border-light @0.2), annular wedge <path>s (fill=tokenTrueSoftColor, white 1.5px stroke, opacity 0.9, <title> tooltip), SEGMENT_GAP=2/MIN 8/RING_THICKNESS 0.42, validSegments filter+sort, side legend rows (dot + name + percent, row bg=token.tint). aria-hidden svg + role=figure root. Returns null when empty. Stories: size 100 (report) + size 90 (weekly-story).

6. Wire the parent contract: lift `selected:string|null` + `onSelect` + `countMode` to the screen/Card that hosts DonutRing + DonutLegend so ring-tap and row-tap stay in sync (one source). Wrap in Card (title "Gastos por categoría", action=CountModeToggle).

7. Build the DonutSpike (_spikes/DonutSpike.tsx + .stories): A/B/C/D density/layout options per the spike spec, using Spike + optionArgType + PLATFORM_ARGTYPE, palette FIXED (default tokenTrueSoftColor), mirroring TreemapSpike.archive.tsx. Compare grid + per-platform render.

8. Decide A/B/C/D → fold the winning thickness/center/legend/inkBorder defaults into production DonutRing/DonutLegend → archive the spike (DonutSpike.archive.tsx), per the established Treemap-spike flow.

File placement follows STRUCTURE: atoms in design-system/atoms, molecules in design-system/molecules, spike in design-system/_spikes (archive after decision). Each component ships a co-located .stories.tsx (Ladle/Storybook discipline).

---
