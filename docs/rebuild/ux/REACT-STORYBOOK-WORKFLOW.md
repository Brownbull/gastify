# React + Storybook Mockup Workflow (gastify)

> **STATUS UPDATE 2026-06-10:** the active mockup surface is now **`design-lab/`** per `.kdbp/PLAN-MOCKUPS.md` (parallel mockup lane). The taxonomy contract is [STORYBOOK-STRUCTURE.md](STORYBOOK-STRUCTURE.md) (rewritten for design-lab); tokens come from `shared/design-tokens.ts`; Storybook dev port **6008**; verification gate: `typecheck` → `build` → `build-storybook` → `test-storybook` from `design-lab/`. Everything below this note describes the earlier frontend/-era workflow — `frontend/` is frozen and its content is kept for reference until the full Phase 4 rewrite of this file.

**Status:** active (design-lab); frontend/ sections historical.
**Active since:** 2026-04-28 (Ladle pivot, commits `d562685` → `8dc7262`).
**Re-added:** 2026-04-29 — original landed in `1c75ef4`, reverted with the IdleState batch in `5a39a10`. Content was sound; restored with current screen-story list and post-revert scope updates.
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
| `npm run test-storybook` | not yet wired — Phase 7 of the pivot plan adds Playwright snapshot suite over Storybook stories. The current per-batch verification gate (Playwright iframe screenshot + translation-key leak regex + visual spot-check) is the operational equivalent. |

## What's already in place (do not re-run)

- Storybook 10.3.5 installed at `frontend/.storybook/{main.ts,preview.tsx,preview-head.html}` (skill recipe step R2 — done).
- Tailwind 4 + theme tokens migrated to `frontend/src/styles/global.css` (Phase 1 of pivot plan).
- Provider stack in `preview.tsx` (Firebase mocks bootstrap + QueryClient + Auth + theme decorator + Google Fonts in iframe head).
- Toolbar globals: `theme` (light/dark via `@storybook/addon-themes`), `colorTheme` (normal/professional/mono — informational, single-theme tokens authored).
- Story conventions documented at `frontend/STORIES.md`, including the "Scope boundary" + "Screens convention — platform × state args" sections.
- 4 atom showcase stories (Colors / Typography / Icons / Welcome) under `frontend/src/_design/` and `frontend/src/Welcome.stories.tsx`.
- 5 self-contained screen stories matching the platform × state args pattern:
  - `Screens/Dashboard` — `frontend/src/features/dashboard/views/DashboardView/DashboardView.stories.tsx`
  - `Screens/Trends` — `frontend/src/features/analytics/views/TrendsView/TrendsView.stories.tsx`
  - `Screens/History` — `frontend/src/features/history/views/HistoryView.stories.tsx`
  - `Screens/Items` — `frontend/src/features/items/views/ItemsView/ItemsView.stories.tsx`
  - `Screens/Reports` — `frontend/src/features/reports/views/ReportsView.stories.tsx`

## Recipe — adapted from skill `react-story` mode

Each new screen batch follows these steps. The skill's R1–R9 maps as:

1. **R1 detect workflow** — already detected by this file's existence + `frontend/package.json`. Skip per-batch.
2. **R2 ensure Storybook harness** — done. Skip.
3. **R3 read reference** — find the existing view component under `frontend/src/features/<feature>/views/<View>/<View>.tsx` (canonical) or `frontend/src/views/<View>/`. Read its props, hooks, and test-override contract.
4. **R4 plan component split** — usually unnecessary; the React app is feature-based and views are self-contained. Author component primitives only when patterns repeat across multiple new screens.
5. **R5 implement React/Tailwind** — usually skipped; the view already exists. Story-only batch. Add new states only when product-driven.
6. **R6 add stories** — author `<View>.stories.tsx` next to the view component, following the platform × state pattern from `frontend/STORIES.md` "Screens convention". Pre-bake 3–6 named stories (`Mobile · Default`, `Mobile · Empty`, `Tablet · Default`, `Desktop · Default`, plus domain-specific states).
7. **R7 wire app preview** — n/a; the real app already mounts the views via `App.tsx`. Stories are the canonical inspection surface.
8. **R8 update docs/bookkeeping** — append a row to `frontend/STORIES-INDEX.md` (when authored — Phase 6.8 of pivot plan) and to `.kdbp/LEDGER.md` per `/gabe-commit`.
9. **R9 verify** — the per-batch verification gate is mandatory. See "Verification gate" below.

## Verification gate

Lifted from the IdleState revert lesson (commit `5a39a10`). Every screen-story batch must pass these three checks before commit:

1. **Playwright iframe screenshot** for each named variant — zero console errors, zero page errors.
2. **Translation-key leak regex** — scan rendered text for `/\b[a-z]+[A-Z][a-zA-Z]+\b/`, filter out approved English words (iPhone, iPad, iOS, JavaScript, TypeScript, YouTube, ChromeOS, eBay). Any other match = FAIL. The earlier IdleState attempt manufactured the exact i18n key leak that PENDING.md P10 tracks; the gate exists to prevent that recurrence.
3. **Visual spot-check** — does the screenshot match what a designer would expect for the view? Empty page titles, missing empty-state text, or a hollow frame fail this gate even if the regex passes. The Insights story attempt on 2026-04-29 failed here (bare `t('insights')` rendered as empty string with the empty-stub strategy).

Canonical script pattern lives in the Items story commit `b6b6ea5` body — copy from there.

## Scope boundary (locked 2026-04-28)

Per [STORIES.md](../../../frontend/STORIES.md) "Scope boundary" + DECISIONS.md D26:

- **In scope:** atoms, molecules, self-contained screens that mount with no required props (or only optional `_testOverrides`).
- **Out of scope:** orchestrator-driven flows (Scan), device-API views, deep multi-context views. Document in `docs/reference/<flow>.md` instead — see [docs/reference/scan-flow.md](../../reference/scan-flow.md) for the canonical example.

## Out-of-scope per this workflow

Per skill SKILL.md "React + Storybook discipline" rules:

1. **No new static HTML mockups** under `docs/mockups/` or `docs/mockups-legacy/`. Both directories are kept as a frozen baseline + test-harness target per DECISIONS.md D27.
2. **Real frontend first** — implement under `frontend/src/`, not in a parallel HTML universe.
3. **Stories are the inspection surface** — every new self-contained-screen batch gets `*.stories.tsx` colocated coverage. Orchestrator flows go to reference docs instead.
4. **Tokens flow through global.css** — no ad-hoc hex colors in React components. Reference `var(--*)` tokens from `frontend/src/styles/global.css`.
5. **No outer bordered grouping containers** unless it's a real product card.
6. **Reference, not DOM contract** — existing HTML mockups are visual references and state inventories; React naming + data flow can be idiomatic.
7. **Verification gate** — see "Verification gate" above. Non-negotiable.

## Pivot plan reference

Active plan: `~/.claude/plans/okay-here-s-something-that-ancient-graham.md` (Ladle → Storybook pivot, post-pivot scaling).

Status (2026-04-29):
- Phases 0–6 ✅ done (Tailwind built, Storybook installed, story conventions, atom showcase, Dashboard screen).
- Phase 6.3 (Scan flow stories) **closed out per D26** — orchestrator-driven flows are out of scope for Storybook; the scan flow lives in `docs/reference/scan-flow.md` instead. The IdleState attempt (`1c75ef4`) was reverted in `5a39a10`.
- Post-pivot scaling: 4 additional self-contained screen stories shipped (Trends, History, Items, Reports).
- Phase 7 (Playwright snapshot suite) — deferred until visual regressions become a real problem or Chromatic adoption is on the table. Per-batch gate is catching issues today.
- Phase 8 (production safety verification) — `scripts/check-prod-bundle.sh` shipped (6/6 checks). Run before each deploy.

`.kdbp/PLAN.md` "Current Phase" reflects post-pivot scaling status. The L-block (mockups-legacy) is OBSOLETED per D27; PENDING.md P12 closed.
