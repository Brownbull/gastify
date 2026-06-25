# gastify layout conventions (DM-16)

> Codified from the Gustify emulation study. These are review rules — components
> should follow them so layouts stay cohesive. Tokens live in
> `shared/design-tokens.ts` → generated into `design-lab/src/styles/tokens.css`.

## Spacing scale (the cohesion primitive)

Every gap/padding routes through `gt-N` where **N == pixels**. Off-grid **6** and
**10** are first-class (the dominant row/chip rhythm). Use `gap-gt-10`,
`p-gt-16`, `px-gt-12`, `py-gt-10`, `space-y-gt-8` — not raw `gap-2.5`/`p-4`.

| Context | Spacing |
|---|---|
| card interior | `p-gt-16` |
| list-row padding / column gap | `p-gt-10` / `gap-gt-10` |
| section header | `px-gt-12 py-gt-10` |
| icon + label gap | `gap-gt-8` |
| chip / meta / trailing gap | `gap-gt-6` |
| meta-part gap | `gap-gt-4` |
| between independently-bordered cards | `gap-gt-12` |

## Typeface (DM-16)

**Outfit everywhere** — body and display — at extrabold for structure (Gustify
parity; Baloo 2 dropped). `font-gt-display` is kept as a separate alias (still
Outfit) so the choice lives in one place. **Space Grotesk** (`font-gt-alt`) is
the numeric/tabular face for charts.

- **extrabold + display** = default for titles, labels, chips, counts, values.
- **font-medium muted** (`text-gt-ink-2`) = the ONE weight-drop, for body / meta
  / hint copy so longer text reads.
- micro-label (future stats): `text-gt-xs font-extrabold uppercase text-gt-ink-2`.

## Radius — soft scale (DM-16, Gustify parity)

| Element | Radius rung |
|---|---|
| chips / badges / pills / avatars / count-badges | `rounded-gt-pill` |
| interactive controls (Button/Input/IconButton/toggles) | `rounded-gt-lg`–`gt-xl` (10–12) |
| framed icon tiles (IconTile) | `rounded-gt-lg` (10) |
| containers / cards / list wrappers | `rounded-gt-2xl` (16) |
| hero / empty surfaces | `rounded-gt-3xl` (20) |

## Border + shadow always travel together

- Any bordered/elevated surface = `border-2 border-gt-line-strong` + a
  `shadow-gt-*` rung. **Blur is always 0** (hard offset shadow).
- Elevation ladder: chips/controls `shadow-gt-xs` · cards/inputs `shadow-gt-sm`
  · buttons/menus `shadow-gt-md`. Hover bumps **one** rung.
- `gt-line` (soft slate) = dividers / ghost only; NEVER pairs with an ink shadow.

## Selection = depth

Any pick-one control: **unselected** recedes (soft `gt-line` border, no shadow);
**selected/hover** pops (ink `gt-line-strong` border + `shadow-gt-xs`). Applied to
Chip, SegmentedToggle, option grids, tabs.

## Composition anchors

- **List-row 3-col template**: `grid-cols-[44px_minmax(0,1fr)_auto]` — fixed icon
  tile / flexible truncating text / trailing slot. `minmax(0,1fr)` is what makes
  `truncate` work without pushing the trailing pill off-screen. (ItemRow.)
- **IconTile** atom — the shared framed icon-well (44px rows / 64px heros).
- **Card of rows** — one outer `border-2` + `overflow-hidden` + 1px `gt-line`
  hairline dividers inside (not per-row borders). (ItemGroup, ItemRow lists.)
- **Tone-card** — color-coded group cards take their border + soft bg from the
  category color (`getCategoryToken`).

## Motion

`ease-gt-bounce` is the only UI easing. Standard interactive recipe:
`transition duration-150 ease-gt-bounce hover:-translate-y-0.5 hover:shadow-gt-[next] focus-visible:ring-4 focus-visible:ring-gt-primary/25`.
Disabled cancels the lift.
