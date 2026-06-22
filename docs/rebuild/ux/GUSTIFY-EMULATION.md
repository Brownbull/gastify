# Gustify → gastify: What to Emulate (layout & component study)

> Source: thorough analysis of Gustify web design-system + Despensa/pantry (workflow wafj70awf, 2026-06-14).
> gastify already ported Gustify Playful Geometric TOKENS; this is about LAYOUT/COMPONENT polish habits.

---

## Adopt list (ranked)

RANKED — what else to take from Gustify (highest leverage first). Each maps to a real gastify file under /home/khujta/projects/apps/gastify/design-lab/src/.

1. Token-bound SPACING scale (THE missing primitive). Gustify routes every gap/pad through `pg-N` where N==pixels; gastify's shared/design-tokens.ts and styles/tokens.css have radius + shadow vars but NO spacing export, so components improvise raw Tailwind (gap-2.5, p-4, px-3, py-2). Add a `spacing` map to design-tokens.ts, emit `gt-N` utilities in tokens.css, convert components. Without this, nothing else here lands consistently. Why: one spacing vocabulary is the single biggest reason Gustify feels cohesive and gastify doesn't.

2. The "card-of-rows" container model = CompactRow/CompactRowList + PantryLocationGroup. ONE outer 2px border + overflow-hidden + 1px borderSoft inner dividers (not per-row borders). gastify ItemGroup already half-does this (Card padded=false + divide-y-2), but uses 2px dividers and per-row left-accent tiles. Adopt: thinner 1px dividers, framed icon tile per row. Maps to molecules/ItemGroup.tsx + molecules/ItemRow.tsx + the existing molecules/CompactRowList.tsx.

3. The 3-column truncation grid `grid-cols-[44px_minmax(0,1fr)_auto]` (PantryItemRow / CompactRow). gastify ItemRow uses `flex ... min-w-0 flex-1` which mostly works, but the explicit fixed-icon / minmax(0,1fr) / auto grid is what guarantees left-edge alignment across rows AND keeps the trailing pill from being pushed off. Steal verbatim into ItemRow.

4. Framed icon TILE (44px, h-11 w-11, rounded-gt-lg, border-2 border-gt-line-strong, shadow-gt-xs, bg muted) wrapping the PixelIcon. gastify ItemRow currently renders a BARE `PixelIcon size={26}` with no frame — this is the most visible polish gap vs Despensa. Add as a small IconTile atom (reused by ItemRow, EmptyState hero, StatusCard).

5. Polymorphic trailing ACCESSORY slot (PantryItemRowAccessory: qtyPill | badgeList | stepper, mutually exclusive). gastify ItemRow has no trailing slot at all — the total is plain `font-extrabold` text. Make the trailing slot a quantity/amount PILL (rounded-gt-pill border-2 px-2 py-1 shadow-gt-xs) by default, swappable to badges or an inline stepper. This is the "one row, many screens" win.

6. The self-contained-button segmented grammar (SettingsSegmentedChoice / StateTabs) as the SLIVER-PROOF house pattern. gastify's SegmentedToggle already conforms; CountModeToggle + LevelToggle do NOT (they use overflow-hidden-track + edge-to-edge fill). Conform them. See toggle_fix.

7. SectionToggleHeader / CollapseToggleButton pattern: whole-left-region is the toggle button + a SEPARATE round circular chevron button (redundant affordance), plus a fixed 32px circular count badge with leading-none + place-items-center. gastify ItemGroup makes the entire header one button and uses a bare stroke ChevronDownIcon + a pill Badge for count. Adopt the round count badge and the round chevron button; keep the title-region-as-toggle.

8. The CSS-corner chevron (`h-2 w-2 rotate-45 border-b-2 border-r-2`, rotate -90 collapsed → 0 open, ease-bounce) instead of shipping ChevronDownIcon. Weightless, theme-colored, animates for free. Replace ItemGroup's stroke chevron.

9. StatusCard / Notice molecule (two-layer tone: low-alpha tinted surface + solid bordered icon disc + font-medium body). gastify has Badge but no inline-notice card. New molecule; reuse for over-budget / scan-warning banners.

10. EmptyState framed-icon-tile + responsive `flex-col gap-10 sm:flex-row` action row. gastify has EmptyState already; harvest the 64px framed icon tile (own border + shadow-sm, matching radius) and the stacked→row action flip, plus the 22px-title / 14px-medium-body pairing.

11. The "depth-as-selection" rule (unselected = borderSoft + no shadow; selected/hover = border-fg + shadow-xs appears) shared by StateTabs / SelectionOptionStrip / SegmentedChoice. Codify across every selectable control (chips, option grids, tabs).

12. font-medium body weight-drop. Gustify is extrabold everywhere EXCEPT body/hint copy, which drops to font-medium muted for legibility. gastify is bold/extrabold uniformly (ItemRow line-2 is `font-bold`). Adopt font-medium for the meta/sub line so long copy reads.

Lower priority / SKIP for MVP: DecisionSection tri-state control (only when a wizard/checkout flow exists), QuantityStepper long-press, SummaryStats/MetricCard (no analytics surface yet — but adopt the uppercase-10px micro-label convention when built), the 15-tone location preset map (gastify already has per-category color/tint in lib/categoryTokens.ts — reuse THAT, don't duplicate).

---

## ItemRow redesign

CONCRETE REDESIGN of molecules/ItemRow.tsx — move from "category-accent-bar row" to Despensa "framed-tile + name/meta + trailing pill" row.

CURRENT: `<li>` → `flex items-center gap-2.5 rounded-gt-lg border-l-[5px] bg-gt-bg-3 py-2 pl-2.5 pr-2.5` with a BARE PixelIcon size={26}, a 2-line text stack (name `font-bold`, line-2 `token.label · $unitPrice ×units` in category color), and the total as plain trailing `font-extrabold` text. No icon frame, no trailing pill.

NEW STRUCTURE (3 slots, grid not flex):
Root `<li>` containing a button/div with:
`grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-gt-10 p-gt-10` (after the spacing scale lands; until then gap-2.5 + p-2.5 are the literal equivalents — 10px).

SLOT 1 — framed icon tile (NEW, replaces bare PixelIcon):
`grid h-11 w-11 shrink-0 place-items-center rounded-gt-lg border-2 border-gt-line-strong bg-gt-bg-3 shadow-gt-xs` wrapping `<PixelIcon name={token.icon} size={28} />`. 44px tile, 8px radius (gt-lg), 1px hard shadow. For the numbered "Original" view, the existing 24px index chip stays but bump to the same 44px framed tile with the number centered (keep one column width so rows align). This framed tile is the single most visible upgrade.

SLOT 2 — name + meta stack (`<span class="min-w-0 flex flex-col">`, the minmax(0,1fr) track makes truncate work):
- name: `truncate font-display text-gt-md font-extrabold leading-tight text-gt-ink` (bump from font-bold → font-extrabold to match the system).
- meta line: a flex row `flex items-center gap-gt-4 truncate text-gt-sm font-medium leading-tight text-gt-ink-2` joining parts with a literal `·`: `{token.label} · {clp(unitPrice)} ×{units}`. KEY CHANGE: drop to font-medium muted (was font-bold in the category color) — this is Gustify's deliberate body weight-drop; reserve the saturated category color for the icon tile / accent, not the whole meta line. Keep the dot-separators.

SLOT 3 — trailing accessory PILL (NEW, replaces plain total text):
default = a quantity/amount pill `inline-flex shrink-0 items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface px-gt-8 py-gt-4 text-gt-sm font-extrabold leading-none text-gt-ink shadow-gt-xs` showing `{clp(total)}`. Make it a polymorphic `accessory?: "pill" | "badges" | ReactNode` prop so the same row serves the receipt-detail (amount pill), a tagged view (badge list), or an editable view (inline stepper using two h-7 w-7 rounded-gt-md StepperButton-style mini buttons flanking a value). Trailing internal gap = gap-gt-6.

LEFT ACCENT — keep a thinned category cue: either (a) retain a `border-l-[3px]` in token.color on the row (thinner than current 5px), OR (b) drop the bar entirely and let the framed icon tile + (optionally) a tinted tile bg carry the category color. Recommend (b) to match Despensa exactly — the framed tile is the color anchor; reserve border-color changes for STATE (see below).

STATE ENCODING (new, from PantryItemRow): add a `tone?: "default" | "urgent" | "muted"` prop. urgent → row gets `border-2 border-gt-error bg-gt-error/10` and the trailing pill flips to `bg-gt-error text-white`. muted/settled → `border-gt-line bg-gt-bg-3/70` and the pill value dims to text-gt-ink-3. This maps Gustify's expiry-urgency 3-tone helper onto gastify's amount-sign / over-budget semantics.

INTERACTION: when onClick is set, role=button, tabIndex 0, Enter/Space handler, `hover:-translate-y-0.5 hover:shadow-gt-sm transition duration-150 ease-gt-bounce focus-visible:ring-4 focus-visible:ring-gt-primary/25` (gastify already has the lift idiom — keep it).

EXACT SPACING: tile 44px / icon 28px; row p-10 gap-10; trailing gap-6; meta gap-4; name text-gt-md(14) extrabold; meta text-gt-sm(12) medium muted; pill px-8 py-4 text-gt-sm extrabold shadow-gt-xs. Radius: tile + pill follow per-element table (tile=gt-lg 8px, pill=gt-pill).

DIFFERENCE FROM CURRENT (summary): bare icon → framed 44px tile; flex → fixed 3-col grid; font-bold colored meta → font-medium muted meta; plain-text total → bordered trailing pill; 5px static accent bar → category color via tile + border-color reserved for state.

---

## ItemGroup redesign

CONCRETE REDESIGN of molecules/ItemGroup.tsx — from "tinted-header + flush divider rows" toward Despensa PantryLocationGroup, while keeping gastify's category-tint identity.

CURRENT: `Card padded=false overflow-hidden` → header `<button>` (whole header is one toggle) with inline `backgroundColor: token.tint`, PixelIcon size={24}, label `text-gt-md font-extrabold`, a pill `<Badge tone=neutral>{count}</Badge>`, total `text-gt-md font-extrabold text-gt-primary`, a stroke `ChevronDownIcon` rotating 180. Body = `ul divide-y-2 divide-gt-line border-t-2 border-gt-line-strong`.

NEW STRUCTURE:
Container: keep the tinted card but make the TINT the group identity (Despensa tone-card idea), reusing gastify's existing per-familia tint from lib/categoryTokens.ts (no new 15-tone map needed):
`<section class="overflow-hidden rounded-gt-2xl border-2 shadow-gt-sm">` with inline `borderColor: token.color` (or a 60%-alpha of it) and `backgroundColor: token.tint`. This makes each familia a color-coded zone like cold/dry/frozen in Despensa, but driven by gastify's category color data.

Header row — SEPARATE the toggle target from the side controls (currently the whole header is one button, which means side actions can't exist):
`<div class="flex items-center gap-gt-8 px-gt-12 py-gt-10">`:
- LEFT = the toggle button only: `<button class="flex min-w-0 flex-1 items-center gap-gt-8" aria-expanded aria-controls={panelId}>` containing the framed-or-bare icon (PixelIcon size 24-28) + name `truncate font-display text-gt-md font-extrabold text-gt-ink` + an OPTIONAL round count badge (see below). Whole left region toggles — generous tap target.
- RIGHT control cluster (the "little trailing icon-buttons" the user wants), in order: (1) the subtotal `text-gt-md font-extrabold text-gt-primary` (keep), (2) OPTIONAL round 32px action button(s) — `grid h-8 w-8 place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface shadow-gt-xs` for per-group actions (e.g. filter, edit, reconcile) — copy this recipe exactly from PantryLocationGroup's reset button, (3) a round 28px CollapseToggleButton (`grid h-7 w-7 place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface`) holding the chevron — see toggle/chevron below. These side buttons each `stopPropagation` so tapping them never collapses the group.

COUNT BADGE — swap the pill `Badge` for the Despensa fixed circular badge: `grid h-7 w-7 place-items-center rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface text-gt-sm font-extrabold leading-none`. leading-none + place-items-center keeps single/double-digit counts optically centered and same footprint. Place it next to the name (inside the toggle button) OR in the right cluster — recommend next-to-name like SectionToggleHeader.

CHEVRON — replace the imported stroke ChevronDownIcon with the CSS-corner chevron inside the round toggle button: `<span class="h-2 w-2 rotate-45 border-b-2 border-r-2 border-gt-ink transition-transform duration-150 ease-gt-bounce" style rotate -90deg collapsed / 0 open>`. No icon asset, theme-colored, animates for free.

BODY — keep gastify's "rows span full width" intent but tighten and thin the dividers:
`<ul id={panelId} class="flex flex-col">` with rows separated by 1px hairlines via `divide-y divide-gt-line` (CHANGE from current `divide-y-2 divide-gt-line` — 1px not 2px, matching Despensa's borderSoft hairline; 2px reads too heavy inside one card). Header→body separation = `border-t border-gt-line-strong` (or drop entirely if the tinted header already separates). Tighten the top of the body to the header (Despensa pt-2 trick): give the ul `pt-gt-2` if you add side padding; if rows stay flush full-width, no padding (your current model) is fine.

A11Y: wire `aria-controls={panelId}` (useId) on the toggle, `aria-expanded`, and `role="region"` on the panel. Keep collapse state local useState(defaultOpen).

EXACT SPACING: header px-12 py-10, gap-8; count badge 28px (h-7) leading-none; side action buttons 32px (h-8) round border-2 shadow-xs; chevron button 28px; body dividers 1px gt-line; container radius gt-2xl(12) border-2 (tinted) shadow-gt-sm.

DIFFERENCE FROM CURRENT: whole-header-button → split toggle-button + independent side controls (enables the trailing icon-buttons); pill Badge → round 28px count badge; stroke chevron → round-button CSS-corner chevron; 2px inner dividers → 1px hairlines; flat tinted header → tone-tinted whole-card (border + bg from category color).

---

## Toggle white-sliver fix

ROOT CAUSE of the white sliver: molecules/CountModeToggle.tsx and molecules/LevelToggle.tsx both build a track as `inline-flex items-center overflow-hidden rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface shadow-gt-sm` and then place SQUARE-cornered `grid h-8 w-8` segments that fill edge-to-edge with `bg-gt-primary`. The track has a 999px pill radius and a 2px border; the active fill has NO radius and butts against the inside of that rounded border. overflow-hidden clips the fill's OUTER rectangle to the pill, but the pill's curved corner still leaves the track's white (bg-gt-surface) showing as a thin crescent between the straight fill edge and the curved 2px border at the rounded ends. The code comment even claims "overflow-hidden ... so no white sliver" — that claim is wrong for a pill radius; it only holds if the fill itself shares the corner radius.

THE FIX — conform to Gustify's house pattern (SettingsSegmentedChoice / StateTabs / and gastify's OWN already-correct SegmentedToggle): stop using an inset edge-to-edge fill inside a shared rounded track. Make each segment a self-contained bordered + radiused button floating on container padding with a real gap, so the active fill and active border are the SAME element sharing the SAME radius — corners coincide exactly, no track shows behind the fill.

CONCRETE MARKUP (replace both CountModeToggle and LevelToggle internals; ideally delete them and call SegmentedToggle, which already does this):

Container (frame): `inline-flex items-center gap-gt-6 rounded-gt-pill border-2 border-gt-line-strong bg-gt-surface p-gt-4 shadow-gt-sm` — note the p-gt-4 (4px) inset and gap-gt-6 (6px) between segments. The white container is MEANT to show as frame padding around the buttons, not be covered.

Each segment (self-contained button): `grid h-8 w-8 place-items-center rounded-gt-pill border-2 transition duration-150 ease-gt-bounce focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gt-primary/25` then per state:
- ACTIVE: `border-gt-line-strong bg-gt-primary text-white shadow-gt-xs` (fill + border are this one element, same rounded-gt-pill → no sliver).
- INACTIVE: `border-transparent text-gt-ink-2 hover:bg-gt-bg-3 hover:border-gt-line-strong` (depth-as-selection: inactive has no shadow/soft border, active gains border-ink + shadow-xs).

REMOVE from both files: `overflow-hidden` on the track, the `focus-visible:ring-inset` (no longer needed — segments aren't flush to the border), and the "butt directly against the track" comments.

For LevelToggle specifically: keep the label-reveal overlay, but since the overlay is `absolute inset-0 rounded-gt-pill bg-gt-primary` it already shares the container radius and sits OVER everything — it's sliver-safe as-is; just ensure the container keeps its rounded-gt-pill so the overlay's corners match.

NOTE on the alternative (edge-to-edge segmented BAR with zero gap): the ONLY sliver-proof way is overflow-hidden on the track + each segment fills 100% with SQUARE corners (no inner radius) and the TRACK alone owns the outer radius — but Gustify does this NOWHERE; every selector uses the gap+padding+self-contained-button approach. Recommend matching the house style (and gastify's existing SegmentedToggle) rather than the edge-to-edge bar. Simplest path: make CountModeToggle/LevelToggle thin wrappers over SegmentedToggle (tone="primary", shape="pill", size icon-only) — that atom is already sliver-proof.

---

## Layout conventions to codify

CONVENTIONS TO CODIFY in gastify (so layouts feel as cohesive as Gustify). Encode in shared/design-tokens.ts + styles/tokens.css + a short CONVENTIONS doc; enforce in review.

1. SPACING SCALE (currently MISSING — confirmed: tokens.css has radius + shadow vars, no spacing). Add `spacing` to design-tokens.ts = {0,2,4,6,8,10,12,14,16,20,24,28,32,40,48,64} where key==px, emit `gt-N` utilities (gap-gt-8, p-gt-16, px-gt-12, py-gt-10, space-y-gt-8). KEEP off-grid 6 and 10 as first-class. Then convert components off raw Tailwind (gap-2.5→gap-gt-10, p-4→p-gt-16, px-3→px-gt-12). Canonical pairings to lock:
- card interior: p-gt-16 (mobile) / p-gt-24 (desktop sections); tight status cards p-gt-14.
- list-row padding: p-gt-10; list-row column gap: gap-gt-10.
- icon+label gap: gap-gt-8. chip/meta/trailing gap: gap-gt-6. meta-part gap: gap-gt-4.
- vertical text stack: space-y-gt-4 (title+body), space-y-gt-8 (heading group), space-y-gt-10 (nav/sections).
- section header: px-gt-12 py-gt-10.

2. PER-ELEMENT RADIUS TABLE (gastify already has the SHAPE of this habit but a TIGHTER scale: gt-2xl=12, gt-lg=8 vs Gustify lg=16/xl=20). DECISION REQUIRED: either keep the tighter scale deliberately OR re-map to Gustify's 16/20/24 for softer parity. Then codify the element→radius pairing regardless:
- interactive controls (Button/Input/IconButton/nav): the "lg" rung.
- containers/cards/list wrappers (Card/ItemGroup/CompactRowList): the "xl/2xl" rung.
- hero/empty surfaces (EmptyState): the largest non-frame rung.
- chips/badges/avatars/count-badges/qty-pills/segmented pills: rounded-gt-pill.
- framed icon tiles / square icon buttons: a mid "md/lg" rung.
Currently Card=rounded-gt-2xl(12). Pick the scale, then make the table a rule not a per-component choice.

3. INK BORDER + HARD SHADOW ALWAYS TRAVEL TOGETHER (gastify already nails the values — shadow-gt-* are byte-identical to Gustify; Card = border-2 border-gt-line-strong shadow-gt-md). Codify the three rules: (a) any bordered/elevated surface = border-2 border-gt-line-strong + a shadow-gt rung, blur ALWAYS 0; (b) elevation ladder: resting chips/controls=shadow-gt-xs, cards/inputs=shadow-gt-sm, buttons/menus=shadow-gt-md, hover bumps ONE rung (xs→sm, md→lg); (c) gt-line (soft slate) is dividers/ghost-only and NEVER pairs with an ink shadow.

4. TYPOGRAPHY: extrabold + display = DEFAULT for structure (titles, labels, chips, counts, values); font-medium muted (text-gt-ink-2) is the ONLY weight-drop, reserved for body/meta/hint copy. gastify currently uses font-bold for ItemRow line-2 — switch meta lines to font-medium muted. RESOLVE THE TYPEFACE: design-tokens.ts flags it openly — display font is Baloo 2, Gustify is Outfit-extrabold everywhere. Decide: Outfit-extrabold for true parity, or keep Baloo 2 as a deliberate gastify differentiator. Lock it. Micro-label convention for any future stat: text-gt-xs(11) font-extrabold uppercase text-gt-ink-2.

5. COMPOSITION ANCHORS: (a) the list-row 3-col template `grid-cols-[Npx_minmax(0,1fr)_auto]` is the standard list row app-wide (icon / flexible truncating text / trailing) — adopt in ItemRow, reuse in CompactRowList; (b) a shared IconTile atom (fixed h/w + place-items-center + rounded + border-2 border-gt-line-strong + shadow-gt-xs) is the recurring icon-well motif — use in ItemRow, EmptyState hero, StatusCard; (c) dividers-inside-one-overflow-hidden-frame (1px gt-line, last:border-b-0) for dense uniform lists; gap-gt-8 between independently-bordered cards when each row carries its own emphasis (status color/shadow); (d) a named IconImage size scale (Gustify sm16/md28/md+32/lg-36/lg40/xl56) instead of gastify's raw `size={26}` / `size={24}` — pick a named scale and apply.

6. SELECTION = DEPTH grammar: unselected = soft/transparent border + no shadow (recedes); selected & hover = border-gt-line-strong + shadow-gt-xs appears. Apply to every selectable control (Chip, SegmentedToggle, option grids, tabs). This single rule makes selection legible and is what the toggle fix relies on.

7. MOTION: ease-gt-bounce (cubic-bezier(0.34,1.56,0.64,1)) is the ONLY UI easing (gastify already has it). Standard interactive recipe = `transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-[next] focus-visible:ring-4 focus-visible:ring-gt-primary/25`, disabled cancels the lift (disabled:hover:translate-y-0). VERIFY a prefers-reduced-motion gate exists in the web index.css before shipping (Gustify's is the reference) — port it if absent.

---

## Priority order

Quick wins first, dependency-ordered:

1. Add the SPACING scale (`spacing` map in shared/design-tokens.ts → `gt-N` utilities in styles/tokens.css). Pure-additive, unblocks every layout change below. ~1 file + the token generator script. Highest leverage, zero visual risk.

2. Fix the toggle white-sliver: rewrite CountModeToggle.tsx + LevelToggle.tsx to the gap+padding self-contained-button pattern (or make them thin wrappers over the already-correct SegmentedToggle). Small, isolated, removes a visible defect, validates the spacing scale on a real component.

3. Redesign ItemRow.tsx: add the framed 44px IconTile, switch to the 3-col grid, drop meta to font-medium muted, add the trailing quantity/amount PILL. This is the single most-requested polish (Despensa look) and is self-contained to one molecule + its story.

4. Extract a shared IconTile atom + named IconImage size scale (factored out of the ItemRow work in step 3), then reuse it. Lets EmptyState + the new StatusCard share one icon-well recipe.

5. Redesign ItemGroup.tsx: tone-tinted whole-card (category color border+bg), split header into toggle-button + independent round side controls (the trailing icon-buttons), round count badge, CSS-corner chevron, 1px hairline dividers. Depends on the spacing scale (1) and pairs naturally with the new ItemRow (3).

6. Codify the CONVENTIONS (per-element radius table, border+shadow-always-together, extrabold-default/medium-body, depth-as-selection, motion recipe) into a short doc + reconcile the radius-scale and typeface decisions. Lock as review rules so the above don't drift.

7. Add StatusCard / Notice molecule (two-layer tone + bordered icon disc + font-medium body) reusing the IconTile from (4). New surface for over-budget / scan warnings.

8. Polish EmptyState: 64px framed icon tile + responsive flex-col→sm:flex-row action row + 22px-title/14px-medium-body. Low urgency, uses (4).

Defer until a matching surface exists: DecisionSection tri-state (wizard/checkout flow), QuantityStepper long-press, SummaryStats/MetricCard (analytics) — but adopt their micro-label + leading-none-value conventions when those screens are built.
