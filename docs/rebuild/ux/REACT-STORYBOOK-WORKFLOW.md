# React + Storybook Mockup Workflow (gastify)

**Status:** active.
**Active since:** 2026-04-28 (Ladle pivot, commits `d562685` → `8dc7262`).
**Marker for `/gabe-mockup`:** this file's existence routes `/gabe-mockup` to React + Storybook mode (skill SKILL.md "Backward-compatible dispatch" rule 1).

## Path adaptations from the skill default

The `gabe-mockup` skill's `react-story` recipe assumes a `apps/web/` monorepo layout. Gastify uses a flat `frontend/` layout (port of BoletApp). Map every skill-doc reference as:

| Skill default | Gastify actual |
|---|---|
| `apps/web/package.json` | `frontend/package.json` |
| `apps/web/.storybook/` | `frontend/.storybook/` |
| `apps/web/src/screens/**` | `frontend/src/features/<feature>/views/<View>/` (canonical) or `frontend/src/views/<View>/` (legacy) |
| `apps/web/src/components/**` | `frontend/src/components/**` |
| `shared/design-tokens.ts` | `frontend/src/styles/global.css` (CSS custom properties; Tailwind 4 `@theme` not yet adopted) |
| `npm run typecheck` (from `apps/web`) | `cd frontend && npm run type-check` |
| `npm run build` | `cd frontend && npm run build` |
| `npm run build-storybook` | `cd frontend && npm run storybook:build` |
| `npm run test-storybook` | not yet wired — Phase 7 of the Ladle pivot plan adds Playwright snapshot suite over Storybook stories. Treat this as the equivalent gate. |

## What's already in place (do not re-run)

- Storybook 10.3.5 installed at `frontend/.storybook/{main.ts,preview.tsx,preview-head.html}` (skill recipe step R2 — done).
- Tailwind 4 + theme tokens migrated to `frontend/src/styles/global.css` (Phase 1 of pivot plan).
- Provider stack in `preview.tsx` (Firebase mocks bootstrap + QueryClient + Auth + theme decorator + Google Fonts in iframe head).
- Toolbar globals: `theme` (light/dark via `@storybook/addon-themes`), `colorTheme` (normal/professional/mono — informational, single-theme tokens authored).
- Story conventions documented at `frontend/STORIES.md`, including the "Screens convention — platform × state args" section.
- 4 atom showcase stories (Colors / Typography / Icons under `Atoms/`) in `frontend/src/_design/`.
- 1 screen story (`Screens/Dashboard` with Mobile/Tablet/Desktop · Default + Mobile · Empty variants) at `frontend/src/features/dashboard/views/DashboardView/DashboardView.stories.tsx`.

## Recipe — adapted from skill `react-story` mode

Each new screen batch follows these steps. The skill's R1–R9 maps as:

1. **R1 detect workflow** — already detected by this file's existence + `frontend/package.json`. Skip per-batch.
2. **R2 ensure Storybook harness** — done. Skip.
3. **R3 read reference** — find the existing view component under `frontend/src/features/<feature>/views/<View>/<View>.tsx` (canonical) or `frontend/src/views/<View>/`. Read its props, hooks, and test-override contract.
4. **R4 plan component split** — usually unnecessary; the React app is feature-based and views are self-contained. Author component primitives only when patterns repeat across multiple new screens.
5. **R5 implement React/Tailwind** — usually skipped; the view already exists. Story-only batch. Add new states only when product-driven.
6. **R6 add stories** — author `<View>.stories.tsx` next to the view component, following the platform × state pattern from `frontend/STORIES.md` "Screens convention". Pre-bake 3-6 named stories (`Mobile · Default`, `Mobile · Empty`, `Tablet · Default`, `Desktop · Default`, plus domain-specific states).
7. **R7 wire app preview** — n/a; the real app already mounts the views via `App.tsx`. Stories are the canonical inspection surface.
8. **R8 update docs/bookkeeping** — append a row to `frontend/STORIES-INDEX.md` (when authored — Phase 6.8 of pivot plan) and to `.kdbp/LEDGER.md` per `/gabe-commit`.
9. **R9 verify** — `cd frontend && npm run type-check && npm run build && npm run storybook:build`. Storybook iframe Playwright sweep is the snapshot suite (Phase 7).

## Out-of-scope per this workflow

Per skill SKILL.md "React + Storybook discipline" rules:

1. **No new static HTML mockups** under `docs/mockups/` or `docs/mockups-legacy/`. Both directories are slated for archive in pivot Phase 9.
2. **Real frontend first** — implement under `frontend/src/`, not in a parallel HTML universe.
3. **Stories are the inspection surface** — every new screen/component batch gets `*.stories.tsx` colocated coverage.
4. **Tokens flow through global.css** — no ad-hoc hex colors in React components. Reference `var(--*)` tokens from `frontend/src/styles/global.css`.
5. **No outer bordered grouping containers** unless it's a real product card.
6. **Reference, not DOM contract** — existing HTML mockups are visual references and state inventories; React naming + data flow can be idiomatic.
7. **Verification gate** — see R9 above.

## Pivot plan reference

Active plan: `~/.claude/plans/okay-here-s-something-that-ancient-graham.md` (Ladle → Storybook pivot).

Status (2026-04-28):
- Phases 0–6 ✅ done.
- Phases 5 / 5.5 / 5.7 ✅ skipped per fast-path.
- Phase 6.3 (Scan flow stories) — next.
- Phase 6.5 / 6.8 / 7 / 8 / 9 — pending.

`.kdbp/PLAN.md` Current Phase still shows L2 (mockups-legacy molecules). Pivot Phase 9 reconciles this.
