# Storybook Structure — design-lab taxonomy contract

**Status:** active.
**Applies to:** `design-lab/**`, `shared/design-tokens.ts`.
**Since:** 2026-06-10 — supersedes the frontend/-era version (git history preserves it). The mockup surface moved to `design-lab/` per `.kdbp/PLAN-MOCKUPS.md`; `frontend/` is frozen (reference-only) and `docs/mockups/**` is a frozen visual archive (D27).
**Shape:** mirrors Gustify's `docs/rebuild/ux/STORYBOOK-STRUCTURE.md` — the structure this project follows for mockups.

This file is the **local taxonomy contract** consumed by the `gabe-mockup` skill ("Backward-compatible dispatch" + react-story mode). It rebinds the skill's `apps/web/` default to `design-lab/`. Correspondence script invocation: `node ~/.claude/skills/gabe-mockup/scripts/check-storybook-correspondence.mjs --web-dir design-lab`.

## Physical structure

```text
shared/
  design-tokens.ts          # single TS token source (themes × modes, fonts, radii, shadows, motion)

design-lab/src/
  design-system/
    assets/                 # icons.tsx + future Storybook-only catalogs
    atoms/                  # leaf primitives (Button, Chip, Badge, Input, …)
    molecules/              # composed reusable patterns (Card, StateTabs, …)
    organisms/              # shell-level: AppSurface (device frames), AppShell (header/navs/drawer/profile)
    _design/                # token inspection surfaces (TokenShowcase)
  features/
    <area>/                 # English code path (home, scan, purchases, expenses, profile, groups, …)
      components/           # feature-owned cards, rows, headers (+ colocated stories)
      model/                # mock state catalogs + screen types (no data layer)
      screens/              # composed screen assemblies (+ colocated stories)
      spikes/               # OPEN decision surfaces only
      spikes/archive/       # settled spikes → *.archive.tsx (typechecked, hidden from Storybook)
  flows/                    # multi-screen journey stories — only when a real journey exists
```

## Storybook hierarchy

```text
Design System/
  Tokens/                   # Colors · Theme Matrix · Typography · Radii & Elevation
  Atoms/<Atom>
  Molecules/<Molecule>
  Organisms/App Surface · App Shell

Features/
  <Área>/                   # product vocabulary, Spanish (Inicio, Compras, Escanear, Gastos, Perfil, …)
    Components/<Component>
    Screens/<Screen>
    Spikes/<Decision>       # only while the decision is open

Flows/
  <Área>/<Journey>          # only for real multi-screen journeys
```

## Rules

1. **Sidebar mirrors the physical folders.** A story's title is derived from its path: `design-system/atoms/Button` → `Design System/Atoms/Button`; `features/home/screens` → `Features/Inicio/Screens`.
2. **Code paths English, Storybook labels product-Spanish.** `features/home` ↔ `Features/Inicio`; `features/purchases` ↔ `Features/Compras`.
3. **One responsive screen implementation.** Platform (mobile/tablet/desktop), state (default/empty/loading/error), and any open option (e.g. `ia`) are story args with curated exports (`MobileRedesigned`, `DesktopCurrent`, `MobileRedesignedEmpty`, …) — never separate per-platform screen components.
4. **Component stories expose the parts; screen stories assemble them.** Every reusable piece (shell organism, feature card) gets its own story; the screen story shows the composition.
5. **Promotion by reuse, not tidiness.** Feature-local components stay in `features/<area>/components` until a second feature needs them or the pattern is an intentional shared primitive — then they move to `design-system/` with a component story in the same change.
6. **Spikes are decision surfaces, not destinations.** A spike exists only while a choice is open; story names state the choice (`IA Comparison`). On decision: record it (DECISIONS entry), wire the winner, move the spike source to `spikes/archive/*.archive.tsx` (excluded from the stories glob), and note it in the consolidation map (Phase 10 artifact).
7. **Tokens only.** Tailwind `gt-*` utilities backed by `shared/design-tokens.ts` via the generated `tokens.css`; no raw hex/RGB in components; new tokens are added to the TS source first, then `npm run generate:tokens`. Documented exceptions: device-frame constants (390/844/820/1280) in `AppSurface`, white-on-chart-block text.
8. **Aliases, no barrels.** `@shared/*`, `@design-system/*`, `@features/*`, `@lib/*`.
9. **Showcase defaults stay byte-identical.** Live-app behavior (chromeless, navigation handlers) arrives via opt-in props that default to showcase mode.
10. **`Flows/` only for real journeys.** No empty groups, no placeholder flows.
11. **Every batch ends with the verification gate** (from `design-lab/`): `npm run typecheck` → `npm run build` → `npm run build-storybook` → `npm run test-storybook`, plus a browser/screenshot check for visual work. Storybook dev port: **6008**.

## Current mapping

| File glob | Storybook title |
|---|---|
| `design-lab/src/design-system/_design/Tokens.stories.tsx` | `Design System/Tokens` |
| `design-lab/src/design-system/atoms/*.stories.tsx` | `Design System/Atoms/<Atom>` |
| `design-lab/src/design-system/molecules/*.stories.tsx` | `Design System/Molecules/<Molecule>` |
| `design-lab/src/design-system/organisms/AppSurface.stories.tsx` | `Design System/Organisms/App Surface` |
| `design-lab/src/design-system/organisms/AppShell.stories.tsx` | `Design System/Organisms/App Shell` |
| `design-lab/src/features/home/components/*.stories.tsx` | `Features/Inicio/Components/<Component>` |
| `design-lab/src/features/home/screens/HomeScreen.stories.tsx` | `Features/Inicio/Screens/Home` |
| `design-lab/src/features/home/spikes/IAComparisonSpike.stories.tsx` | `Features/Inicio/Spikes/IA Comparison` (open — Phase 3) |

## Open decisions encoded in the tree

- **IA candidate (Phase 3):** both nav catalogs live in `design-system/organisms/AppShell.tsx` (`currentNavCatalog` / `redesignedNavCatalog`); `HomeScreen` takes `ia` as an arg. On decision the loser is deleted, the winner becomes the single catalog, and the spike is archived.
- **Typeface (Phase 4):** lab renders the locked design language (Outfit/Baloo 2); production web/ ships Inter. Settle in the design grammar (DESIGN.md).
