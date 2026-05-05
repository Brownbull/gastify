# AGENTS.md — Dashboard

Learnings from RALPH iterations on the Dashboard feature.

## Phase A Seed

- [2026-05-04] Dashboard route is `/` (file: `frontend/src/routes/index.tsx`). No search params.
- [2026-05-04] Dashboard consumes `useRecentTransactions()` and `useDashboardSummary()` hooks — mock at `hooks/ui/` boundary.
- [2026-05-04] Dashboard category-card → History drill-down handoff is `human-authored` (cross-feature interactivity). RALPH should not attempt this.
- [2026-05-04] Concentration flag display requires `useConcentrationFlags()` hook — boolean flag per category indicating spending anomaly.
- [2026-05-04] Reference exemplar at `docs/rebuild/ux/reference-stories/DashboardView.stories.tsx` — follow its structure.

## Batch 01 Learnings

- [2026-05-05] StoreCategory uses English names (Supermarket, not Supermercado). Mock data must match the `StoreCategory` type from `shared/schema/categories.ts`.
- [2026-05-05] DashboardView has no built-in loading/error UI. Use `Skeleton` atom and `ErrorFallback` molecule as wrapper components in stories.
- [2026-05-05] Play functions: import from `storybook/test` (Storybook 10.x bare specifier), not `@storybook/test`.
- [2026-05-05] Testable selectors: `data-testid="carousel-card"`, `data-testid="carousel-content"`, `data-testid="treemap-grid"`.
- [2026-05-05] Existing design-system screen stories live under `Design System/Screens/Dashboard` — feature stories go under `Screens/Dashboard`.

## Stuck Stories

- DASH-017 (concentration flag): Blocked — DashboardView needs a concentration banner component before this story can be implemented.
