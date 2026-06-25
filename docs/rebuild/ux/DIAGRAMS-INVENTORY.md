# Legacy Diagrams & Visualizations — Piece Inventory (DM-11 pass)

> Source: thorough analysis of BoletApp analytics + reports (workflow witjwezww, 2026-06-14).
> Per DM-11: keep ~legacy LAYOUTS, vary COLORS + FONT FAMILIES consistently across all charts.

---

## Inventory

FULL DEDUPLICATED VISUALIZATION INVENTORY — grouped by family. (Dedup: AnimatedAmountBar / AnimatedCountPill / AnimatedPercent appear in BOTH Treemap and Donut extractions → ONE shared set each. SpendingDonutChart appears in both Donut and Story-report families → ONE piece. TreemapCell ≈ AnimatedTreemapCell ≈ AnimatedTreemapCard → ONE TreemapCell molecule with a 3-density prop + a Dashboard variant flag. The five legacy DonutLegend/DrillDownGrid "AnimatedX" atoms collapse to the shared animated-primitive set.) Tier = gastify gabe tier (atom/molecule/organism).

=== F0. SHARED ANIMATED PRIMITIVES (cross-family atoms, build once) ===
- A0.1 useCountUp hook [atom/logic] — count-up driver (value 800–1200ms, percent 600ms, count 600–800ms), keyed by an animationKey to replay. Powers every number across all families.
- A0.2 CircularProgress [atom] — SVG % ring (bg track + dash-offset arc, centered N% numeral); used inside every treemap cell + donut center fallback.
- A0.3 AnimatedAmountBar [atom] — count-up currency + thin relative % bar (fill = pct/maxPct). Legend/list contexts.
- A0.4 AnimatedCountPill [atom] — tappable Receipt↔Package count chip with count-up; navigates to history/items. (Maps to existing CountMode concept.)
- A0.5 AnimatedPercent [atom] — standalone count-up "N%" label.
- A0.6 Sparkline [atom] — inline SVG path of cumulative daily spend; flat-line fallback (<2 pts), optional dashed prev-period reference line; stroke is semantic by direction (up=neg, down=pos, same/new=neutral). One renderer serves TrendListItem + TrendSparkline (the 7-point decorative variant is just fixed-data input to the same atom).
- A0.7 TrendChange / TrendIndicator [atom] — arrow glyph + signed % delta; up=negative, down=positive, neutral="="; "nuevo" badge variant. One atom, two skins (inline list vs story-card pill).

=== F1. SQUARIFIED TREEMAP (distribution, drill-down, "Más" aggregation) ===
- A1.1 squarify / calculateTreemapLayout [atom/pure-logic] — Bruls/Huizing/van Wijk squarified layout → TreemapRect[] in 0–100% units. No visuals. Reused unchanged. (+ categoryDataToTreemapItems adapter.)
- A1.2 computeTreemapCategories / computeTrendCategories [atom/data] — >10% threshold grouping → display cells + synthetic "Más"/Otro aggregate (summed value/count/itemCount, merged ids, aggregated sparkline, categoryCount); emits canExpand/canCollapse. No visuals.
- M1.3 TreemapCell [molecule] — one proportional tile: pixel icon + name + count-up amount + AnimatedCountPill + CircularProgress ring; 3 adaptive densities (tiny/compact/standard) + isMainCell; special "Más" folder + categoryCount badge. UNIFIES legacy AnimatedTreemapCell (Trends) and AnimatedTreemapCard (Dashboard) via a `variant: trends|dashboard` flag (dashboard = no entrance-stagger, non-interactive pill/icon, single layout). Extends existing TreemapCell baseline.
- M1.4 CircularProgress — see A0.2 (lives here visually).
- M1.5 ExpandCollapseButtons [molecule] — floating +/- FABs (bottom-center) with hidden-count / shown-count badges; gated by canExpand/canCollapse.
- O1.6 TreemapSlide [organism] — full distribution slide: breadcrumb/view-mode title + round back button (depth>0) + absolutely-positioned squarified cells (step-function dynamicHeight by category count) + ExpandCollapseButtons footer; staggered entrance keyed by animationKey.
(AnimatedAmountBar/CountPill/Percent here = shared A0.3–A0.5.)

=== F2. DONUT / RING (interactive + static report) ===
- M2.1 DonutRingSVG [molecule] — interactive stroke-dasharray ring: one stroked circle per segment (r=52, viewBox 120, rot-90, 0.5% gap), clockwise staggered reveal (80ms/segment), selected segment thickens 14→16 & dims others to 0.4. data-driven palette.
- A2.2 DonutCenterLabel [atom] — center overlay: count-up total + "Total", or selected segment value + name.
- M2.3 DonutExpandCollapse (Más/Menos side buttons) [molecule] — circular +/- flanking the ring with count badges. (Visual sibling of M1.5 ExpandCollapseButtons — share one base.)
- O2.4 DonutLegend [organism] — scrollable interactive row list: icon chip + name + AnimatedAmountBar + AnimatedCountPill + AnimatedPercent + optional drill chevron; selection syncs with ring.
- M2.5 useDonutDrillDown [molecule/logic] — headless drill-down state machine (selectedCategory, animationKey, visibleSegments, level 0–4, path, expandedCount); maps viewMode→maxLevel; builds semantic DrillDownPath. No visuals.
- O2.6 DonutChart [organism] — interactive container: header (view-mode title + back) + [Menos][180px ring][Más] + DonutLegend; owns viewMode/drill data pipeline. (Legacy ~730 lines — SPLIT into the parts above to stay under the 800 cap.)
- O2.7 SpendingDonutChart [organism] — STATIC pure-SVG report/PDF donut: describeArc wedges (RING_THICKNESS 0.42, 2° gap, 8° min-angle floor), faint bg ring, white-stroke separation, card-styled side legend; per-segment <title> tooltip only. Shared by reports + weekly-story + ReportDetailOverlay (size 90/100). ONE piece used in F2 + F6.

=== F3. SANKEY (vertical flow, ECharts canvas + overlay) ===
- O3.1 SankeyChart [organism] — root wrapper: optional title + ReactEChartsCore vertical Sankey (h≈340) + optional icon overlay + empty state. Theme text colors + category palette.
- O3.2 ECharts Sankey series config [organism/config] — series[0] sankey orient:vertical, nodeWidth 40 (8 icon-mode), nodeGap 12, 32 iterations, levels 2/3/4 by mode; node fill = category color (Más=gray), link lineStyle color:source curveness 0.5 opacity 0.5/0.6; emphasis adjacency; tooltip off.
- A3.3 NodeBarEmojiLabel [atom] — in-bar emoji label (position inside, fontSize 18, weight 500 / 400 for Más). In gastify this becomes a pixel-icon-in-bar.
- M3.4 MásAggregationNode [molecule] — special gray node (#9ca3af, 📦) collapsing sub-threshold cats; categoryCount = folded count; click ignored. (Shares the "Otro/Más" neutral semantic with F1/F2.)
- M3.5 SankeySelectionTitle [molecule] — fixed 60px title/pill area above diagram: node = icon+name+amount(K)+% ; link = src>tgt+amount+% ; placeholder prompt. Tinted pill (color+12.5% alpha).
- M3.6 SankeyIconNode [molecule] — circular category icon with conic-gradient progress-ring border (fill ∝ % of total); selection ring + optional label. (Dormant in shipped slide but fully built — OPTIONAL build.)
- O3.7 IconNodeOverlayLayer [organism] — absolute pointer-events-none layer placing SankeyIconNodes at ECharts node coords (extract positions + fallback weight distribution; retry timers + resize). (OPTIONAL, pairs with M3.6.)
- O3.8 SankeySlide [organism] — carousel slide: 60px title area + overflow-hidden 340px scroll box + fade+scale entrance keyed by animationKey; hidden native scrollbar.

=== F4. TREND LIST + DRILL-DOWN CARDS (analytics list/distribution) ===
- O4.1 TrendListItem [organism] — row card: icon tile + name + AnimatedCountPill + Sparkline (A0.6) + count-up amount + TrendChange (A0.7) + drill chevron emerging from behind; "Más" neutral + folder + categoryCount badge; staggered slide-in.
- O4.2 TrendsCardHeader [organism] — top control bar: left view-type toggle (PieChart↔Grid / GitBranch↔List), center segmented emoji-pill selector (4 pills donut/list OR 2 pills Sankey) with animated sliding indicator, right CountMode toggle OR Sankey nav arrows (pulse). MAPS heavily onto existing SegmentedToggle + CountModeToggle.
- A4.3 TotalDisplay [atom] — centered big total (text-3xl/display) + period label.
- M4.4 DrillDownCard [molecule] — tappable card: label + half-width progress bar (fill=%, category color) + amount/% right + optional circular count badge ("99+"); empty/leaf states; hover accent border, active scale.
- O4.5 DrillDownGrid [organism] — computes temporal (year→Q→month→week→day) + category (all→cat→group→subcat) children, sorts desc, splits with-data vs empty (collapsible "Show N empty"), section headers + zero-state CTA; renders DrillDownCard grids.
- A4.6 CategoryLegend [atom] — inline wrapping legend: colored swatch + "Label NN%" per item; static. (Below donut/treemap.)

=== F5. ANALYTICS CHART CHROME (toggles, breadcrumbs, slider, popup, FAB) ===
- M5.1 ChartModeToggle [molecule] — Aggregation(pie)/Comparison(bar) segmented control; hides at Day level; roving tablist + arrow keys. → SegmentedToggle instance.
- M5.2 DrillDownModeToggle [molecule] — Temporal(clock)/Category(tag) segmented control; always visible. → SegmentedToggle instance (deliberate clone of M5.1).
- O5.3 TemporalBreadcrumb [organism] — collapsible Calendar icon-button → dropdown listbox of Year>Q>Month>Week>Day; full keyboard listbox; locale labels; dispatches SET_TEMPORAL_LEVEL.
- O5.4 CategoryBreadcrumb [organism] — twin of 5.3: Tag icon → All>Category>Group>Subcategory listbox; CLEAR/SET_CATEGORY_FILTER. (5.3 + 5.4 reskin as ONE paired "Breadcrumb Dropdown" pattern.)
- M5.5 DiagramSlider [molecule] — custom horizontal pan scrollbar (track + thumb; thumb width=viewport/content ratio); pointer-capture drag with stopPropagation/touchAction:none so it doesn't hijack carousel swipe; auto-hides when content fits.
- O5.6 CategoryStatisticsPopup [organism] — full-screen modal: colored category header (emoji avatar, name, period, %) + scrollable stat sections (Transactions/Items/Insights via StatRow + SectionHeader) + View History/Items CTA; fadeIn/slideUp. → built on existing Modal atom.
- A5.7 FloatingDownloadFab [atom] — fixed bottom-right export FAB; icon swaps BarChart2(stats)/FileText(txn)/Loader2(spinner); aria-busy. (Legacy hardcodes blue-600 — reskin to accent token to match chrome.)

=== F6. STORY-FORMAT REPORT CAROUSEL + DRILL-DOWN DETAIL OVERLAY ===
- O6.1 SpendingDonutChart — SAME as O2.7 (dedup; size 90 here).
- A6.2 TrendSparkline — SAME atom as A0.6 (fixed 7-point decorative input).
- A6.3 TrendChange — SAME atom as A0.7.
- O6.4 CategoryGroupCard [organism] — colored store-group card: header(icon/name/%chip/sparkline/amount/trend) over translucent category line-item rows (emoji tile + name/count + %chip + sparkline + amount/delta).
- O6.5 ItemGroupCard [organism] — same as 6.4 for item groups; rows OMIT the left emoji tile. (6.4 + 6.5 = one card with a `showItemIcon` flag.)
- O6.6 ReportCard [organism] — full-screen Instagram-story card: 5xl emoji + title + big primaryValue (display) + TrendIndicator pill; gradient bg by type (summary/trend/milestone/category); isActive opacity/scale.
- A6.7 TrendIndicator — SAME as A0.7 (story-card pill skin).
- O6.8 ReportCarousel [organism] — swipeable story carousel: "N de M" + aria-live + active card opacity/translateX stage + ProgressDots; swipe/keyboard nav.
- A6.9 ProgressDots [atom] — tablist of dots (active widens to pill).
- O6.10 HeroCard [organism] — overlay gradient hero: period label + big total + trend pill (12px arrow + signed % + comparison) or first-report note.
- M6.11 HighlightsCard [molecule] — 🏆 label→value superlative rows (quarterly/yearly).
- O6.12 CategoryBreakdownCard [organism] — flat fallback list: emoji tile + name + count + amount (when no grouped data).
- M6.13 GroupsSectionWrapper [molecule] — pairs SpendingDonutChart(90) with a stack of CategoryGroupCard/ItemGroupCard (🏪/🛒 section titles). (Merges legacy TransactionGroupsCard + ItemGroupsCard.)
- O6.14 ReportDetailOverlay [organism] — story-style modal shell hosting hero/insight/highlights/donut+groups/fallback + print-to-PDF; back/title/count-pill/download header; focus mgmt, Escape, backdrop close. → built on Modal.
- M6.15 ReportSection (accordion) + ReportCount badge [molecule] — collapsible period bucket (Semanal/Mensual/Trimestral/Anual) with N-of-max FileText count chip + optional time selector; maxHeight/opacity animation.

---

## Shared concerns (settle once)

Settle these ONCE before any family is built (most are resolved by Spike Set 1):

1. CHART COLOR PALETTE (the central DM-11 decision). Candidates: (a) gt-chart-1..6 rotation, (b) per-taxonomy CategoryChip config color via getCategoryToken (107 tokens — keeps category identity across every chart, matches legacy's data-driven fg/bg), (c) a new viz palette. RECOMMEND (b) for segments + (a)gt-chart-6/slate as the single "Más/Otro" neutral — it reuses the 107-token config already built in Phase 6 and is the closest analog to legacy. Lock the Más/Otro neutral token here (shared by F1 Más cell, F2 Más segment, F3 #9ca3af→token, F4 Más row, F6 fallbacks).

2. FONT FAMILY for chart numerals/labels (the OTHER DM-11 axis). Three available: Baloo 2 (font-gt-display), Outfit (font-gt-body), Space Grotesk (font-gt-alt). Decide per role and apply everywhere: (i) HERO numerals (donut center, TotalDisplay, HeroCard, ReportCard) — likely Baloo display; (ii) IN-CHART labels/%/counts — Outfit body or Space Grotesk; (iii) tabular figures in dense rows/legends. One table of {role→font} reused by all families.

3. GEOMETRIC GRAMMAR ON CHART SHAPES. Decide once whether segments/cells/wedges carry the 2px ink border + hard zero-blur offset shadow (var(--shadow), shadow-gt-xs..2xl) like every other gastify component, or stay flat. Legacy used soft text-shadows + translucent-white pills + frosted glass — ALL of which must be replaced: text-shadow→none/crisp, translucent-white pills→solid gt chips, backdrop-blur FABs→solid bordered FABs, white wedge strokes→ink gaps. Pick the gutter/gap size (legacy 2–4px → chunkier geometric gap).

4. SEMANTIC DIRECTION PALETTE (up=more-spend=negative, down=less=positive, same=neutral, new=info). One token pair (recommend gt danger/positive or a chart-specific pair) applied to: sparkline stroke, TrendChange arrow, TrendIndicator pill, ReportCard. Resolve in Spike 2a.

5. ANIMATION GRAMMAR. Unify on: ease-gt-bounce for press/entrance (already the system ease), count-up via ONE useCountUp (800–1200ms amounts / 600ms %/count), staggered entrance index*50–80ms keyed by an animationKey, all gated by prefers-reduced-motion (mirror the existing gt-label-reveal/reduced-motion handling). Donut clockwise reveal 80ms/segment; treemap cell stagger 50ms. One motion table.

6. LEGEND STYLE. One legend treatment for CategoryLegend (F4) + DonutLegend rows (F2) + SpendingDonutChart side legend (F2/F6) + group-card %chips: swatch shape (legacy rounded-sm square → geometric swatch?), chip vs bare, colored-icon-tile size. Pick once.

7. DRILL-DOWN / BREADCRUMB PATTERN. Unify the back-button + breadcrumb + level/path concept shared by TreemapSlide back button, useDonutDrillDown, TemporalBreadcrumb/CategoryBreadcrumb, DrillDownGrid, and LevelToggle. Decide one breadcrumb visual (the paired Temporal/Category dropdown) and one back-pill style; reuse the existing LevelToggle's reveal idiom where levels are switched.

8. ECHARTS THEMING. Sankey is the only ECharts piece — decide whether to inject a gastify ECharts theme object (node/link colors from the locked palette, fonts) so canvas matches the SVG/HTML charts. Replace the two hardcoded text colors (#e5e7eb/#374151) + #9ca3af Más with tokens. (Verify ECharts is even an accepted dep in design-lab; if not, this family may be SVG-mocked for the mockup pass.)

---

## Spike plan

PER DM-11 the layouts stay ~legacy; the spike is primarily a COLOR + FONT-FAMILY treatment study applied CONSISTENTLY across ALL charts at once (the user explicitly wants "representative examples" varied together, not per-chart bespoke). Run the DM-6 `Spike` harness (option A/B/C/D + Compare, platform mobile/tablet/desktop). Two spike kinds:

== SPIKE SET 1 — GLOBAL CHART-SKIN SPIKE (the headline, blocking, do FIRST) ==
ONE interactive spike `Design System/Spikes/Chart Skin` rendering a REPRESENTATIVE BOARD (one treemap cell row + a donut + a sankey snippet + a trend row + a drill-down card + a legend) so every family re-tints together. Options vary the two axes the user named — COLOR PALETTE and FONT FAMILY — held constant across the whole board:
- A · "Token-true" — chart segments = gt-chart-1..6 (violet/amber/pink/emerald/blue/slate) in fixed rotation; numerals/amounts in Baloo 2 display, labels in Outfit. Most on-brand, fewest colors.
- B · "Category-true" — segments = per-taxonomy CategoryChip config color (107 tokens via getCategoryToken) so a category keeps its identity across treemap/donut/sankey/list; "Más"/Otro = gt-chart-6 slate neutral; numerals Baloo, labels Outfit. (Closest to legacy data-driven palette.)
- C · "Mono-display" — same Category-true colors but ALL chart text (numerals + labels + %) in Space Grotesk (font-gt-alt) for a tabular/condensed analytics voice; tests "is a numeric/alt font better for dense charts than Baloo".
- D · "High-contrast playful" — gt-chart palette pushed to fuller saturation for fills + ink (gt-ink) outlines on every segment/wedge (2px ink borders, hard zero-blur shadow on cells per the geometric grammar), Baloo for the hero numbers only, Outfit elsewhere. Boldest geometric read.
USER PICKS ONE → that {palette source, segment-color rule for Más, chart numeral font, chart label font, %-figure font} becomes the locked chart skin folded into every family. This single pick settles ~80% of the pass.

== SPIKE SET 2 — TARGETED FONT/COLOR TREATMENT SPIKES (small, after Set 1 locks the system) ==
- 2a `Trend Direction Skin` — the semantic up=negative/down=positive/neutral pair (sparkline stroke + TrendChange arrow + ReportCard TrendIndicator) as ONE spike: which red/green? legacy #ef4444/#22c55e vs gt token pair vs gt-chart-3 pink/gt-chart-4 emerald; arrow glyph: unicode ↑↓ vs geometric caret; flat vs pill background. (Settles all 4 direction-bearing pieces at once.)
- 2b `Center/Hero Numeral` — the big totals (DonutCenterLabel, TotalDisplay, HeroCard, ReportCard primaryValue): Baloo display vs Outfit-extrabold vs Space Grotesk tabular for large currency. One spike, applied to all hero numerals.
- 2c `Más / Otro Neutral` — the aggregate-bucket color (treemap Más folder, donut Más, sankey #9ca3af node, trend Más, legend) → which neutral in the playful palette: gt-chart-6 slate vs a muted tint. One token decision across families.

== LAYOUT SPIKES (kept MINIMAL per DM-11 — only where legacy layout fights the geometric grammar) ==
- L1 `TreemapCell density` — RESOLVE the already-active TreemapCellSpike (A Stacked-center / B Big-% hero / C Labelled+bar / D —). This is the one genuine layout pick still open (DM-11 deferred it). Pick one as the standard-density default; tiny/compact are derived.
- L2 `Sankey node treatment` — bar-emoji label vs SankeyIconNode conic-ring overlay (M3.6/O3.7): a real layout fork (canvas-only vs HTML overlay). Decide whether to build the overlay path at all. Lean: bar+pixel-icon (overlay = optional/later).
NO other layout spikes — breadcrumbs, toggles, drill cards, story cards, popup, FAB all keep legacy layout and only take the Set-1 skin.

---

## Reuse of existing gastify pieces

Existing gastify design-lab pieces (verified in design-lab/src) and how each is reused:

- TreemapCell + MiniTreemap (molecules, design-lab/src/design-system/molecules/TreemapCell.tsx) — the WORKING BASELINE for M1.3. Already composes PixelIcon + getCategoryToken + countValue + CountMode + ease-gt-bounce + rounded-gt-lg. EXTEND it: add the 3-density branches (tiny/compact/standard), CircularProgress ring, count-up amount, AnimatedCountPill, isMainCell, and the "Más" folder/categoryCount badge. MiniTreemap is the grid sampler; the real squarified placement (A1.1) is the screen/TreemapSlide concern. The active TreemapCellSpike (_spikes/TreemapCellSpike.stories.tsx) is the open L1 layout spike to resolve.

- SegmentedToggle (atom, atoms/SegmentedToggle.tsx) — THE base for ChartModeToggle (M5.1), DrillDownModeToggle (M5.2), TrendsCardHeader center pill selector (O4.2), and any 2..n chart switch. Already has tone (amber/primary/ink), size, shape (pill/square), fill, roving tablist semantics. ChartModeToggle/DrillDownModeToggle = SegmentedToggle instances with icon+label segments; no new control logic.

- CountModeToggle (molecule, molecules/CountModeToggle.tsx) — reused directly as the Receipt↔Package switch in TrendsCardHeader (O4.2) and as the driver for AnimatedCountPill (A0.4) icon/value. Already the refined "switch" (h-10, 26px pixel icons, p-0.5 track).

- LevelToggle (molecule, molecules/LevelToggle.tsx) — reuse its label-reveal idiom (gt-label-reveal, REVEAL_MS) for chart level switching; informs the drill-down/breadcrumb pattern (shared concern 7). The L1–L4 LEVELS fixture it reads also feeds treemap/donut/sankey viewMode mapping.

- PeriodNav (molecule) — reuse as the period stepper feeding TotalDisplay (A4.3) period label and the report period buckets; DM-10 pick A "plain steppers".

- Card (molecule, molecules/Card.tsx) — wrapper for the analytics card chrome (TrendsCardHeader sits in a Card; MonthTreemapCard already uses it). Reuse for HighlightsCard/CategoryBreakdownCard/GroupsSectionWrapper framing (2px ink border + hard shadow already baked).

- Badge (atom) — reuse for ExpandCollapseButtons count badges (M1.5/M2.3), "Más" categoryCount badge, ReportCount chip (M6.15), "nuevo" trend badge, drill-down "99+" count badge.

- Modal (atom, atoms/Modal.tsx) — the shell for CategoryStatisticsPopup (O5.6) and ReportDetailOverlay (O6.14). Already has focus mgmt/backdrop/escape patterns from DM-8 PaymentPicker usage — reuse rather than re-implement the fixed-inset overlay.

- CategoryChip (molecule) + categoryTokens.ts getCategoryToken (107 L1–L4 tokens, each {label,icon,color,tint}) — THE chart color + icon source if Spike-1 option B/"Category-true" wins. Every segment/cell/legend/node pulls {color,tint,icon,label} from here — no new palette config needed. The "Otro/Más" neutral maps to gt-chart-6.

- PixelIcon + icon set (assets/PixelIcon.tsx) — replaces ALL legacy emoji in cells/legends/sankey nodes/story cards (fin-receipt, item-pantry, rubro-*, store-*, familia-*, item-* already present). Pixel-icon-in-bar replaces NodeBarEmojiLabel (A3.3).

- MetaPill (atom) — reuse for SankeySelectionTitle pill (M3.5), legend %chips, DrillDownCard percentage figure.

- StepperButton (atom) — the +/- in ExpandCollapseButtons (M1.5) and DonutExpandCollapse (M2.3); also PeriodNav steppers.

- analyticsFixtures.ts (lib) — already has LEVELS, COUNT_MODES, PERIODS, TREEMAP (store/item), countValue, treemapFor. EXTEND with donut segments, sankey nodes/links, trend rows + sparkline arrays, drill-down children, and report-story fixtures (single source per DM-6 fixture discipline; mirror transactionFixtures.ts).

- Tokens: gt-chart-1..6 (--chart-1..6), font-gt-display(Baloo 2)/font-gt-body(Outfit)/font-gt-alt(Space Grotesk), shadow-gt-xs..2xl (hard zero-blur), ease-gt-bounce, radius-gt-* , gt-label-reveal keyframe — all already in tokens.css; charts consume these, no new tokens except possibly a viz-palette if Spike-1 option C/"new palette" wins (avoid).

- AtomSpike/Spike harness + spikeLayout (Option/SpikeGrid) + AppSurface (mobile/tablet/desktop frames) — the DM-6 vehicle for both spike sets above. Reuse verbatim.

NET-NEW (no existing analog): useCountUp, CircularProgress, Sparkline, the SVG donut renderers (DonutRingSVG + describeArc SpendingDonutChart), DiagramSlider, the Sankey/ECharts integration, and the story-report carousel (ReportCard/ReportCarousel/ProgressDots/HeroCard/overlay).

---

## Build order

1. SHARED ATOMS + FIXTURES FIRST (everything depends on these): extend analyticsFixtures.ts with donut/sankey/trend/drilldown/report data + sparkline arrays; build useCountUp hook, CircularProgress (A0.2), Sparkline (A0.6), TrendChange/TrendIndicator (A0.7), AnimatedAmountBar (A0.3), AnimatedCountPill (A0.4 — wraps CountMode), AnimatedPercent (A0.5). Stories for each.

2. RESOLVE THE GLOBAL CHART-SKIN SPIKE (Spike Set 1) on a representative board — LOCK {palette source, Más/Otro neutral, numeral font, label font, %-font, ink-border-on-segments yes/no}. Then run the small targeted spikes 2a (direction palette), 2b (hero numeral), 2c (Más neutral). This is the gate — nothing else gets skinned until these picks land. Record as DM-13 (diagrams skin) in PLAN-MOCKUPS Decisions.

3. RESOLVE LAYOUT SPIKES that are actually open: L1 TreemapCell density (close the active TreemapCellSpike), L2 Sankey node treatment (bar vs overlay — recommend bar, defer overlay).

4. F1 TREEMAP family: A1.1 squarify (port pure logic) + A1.2 threshold grouping → extend M1.3 TreemapCell (3 densities + ring + Más) → M1.5 ExpandCollapseButtons → O1.6 TreemapSlide. (Treemap first — it reuses the most existing code and validates the locked skin.)

5. F2 DONUT family: M2.1 DonutRingSVG → A2.2 center label → M2.3 side buttons → O2.4 DonutLegend (reuses A0.3–A0.5) → M2.5 useDonutDrillDown → O2.6 DonutChart container; then O2.7 SpendingDonutChart (static) which is also F6's donut.

6. F4 TREND LIST family: O4.1 TrendListItem (reuses Sparkline + TrendChange + AnimatedCountPill) → O4.2 TrendsCardHeader (reuses SegmentedToggle + CountModeToggle) → A4.3 TotalDisplay → M4.4 DrillDownCard → O4.5 DrillDownGrid → A4.6 CategoryLegend.

7. F5 CHART CHROME: M5.1 ChartModeToggle + M5.2 DrillDownModeToggle (SegmentedToggle instances) → O5.3/O5.4 Temporal+Category breadcrumbs (paired pattern) → M5.5 DiagramSlider → O5.6 CategoryStatisticsPopup (on Modal) → A5.7 FloatingDownloadFab.

8. F3 SANKEY (after deciding ECharts is in-scope; else SVG-mock): O3.1 SankeyChart + O3.2 series config + A3.3 pixel-icon bar label + M3.4 Más node + M3.5 SankeySelectionTitle + O3.8 SankeySlide; M3.6 SankeyIconNode + O3.7 overlay ONLY if L2 chose overlay (optional/last).

9. F6 STORY REPORT family (most net-new, build last): O6.4/O6.5 group cards (one with showItemIcon flag) → M6.13 GroupsSectionWrapper (reuses SpendingDonutChart) → O6.6 ReportCard + A6.9 ProgressDots → O6.8 ReportCarousel → O6.10 HeroCard + M6.11 HighlightsCard + O6.12 CategoryBreakdownCard + M6.15 ReportSection/ReportCount → O6.14 ReportDetailOverlay (on Modal, assembles the rest).

10. REPORT VIEWS / SCREEN ASSEMBLY: wire TreemapSlide + DonutChart + SankeySlide + TrendList into the Gastos analytics screen carousel with TrendsCardHeader driving view/mode; wire the report list → ReportDetailOverlay. Platform×state stories (mobile/tablet/desktop × default/empty/loading) per the Phase-9 screen-batch discipline. Smoke: check:token-classes + required-story baseline + Playwright nav screenshots.

Gate after each family: typecheck / build / build-storybook / test-storybook green (the 4 standing gates), then /gabe-commit.
