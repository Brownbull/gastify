# AGENTS.md — History

Learnings from RALPH iterations on the History feature.

## Phase A Seed

- [2026-05-04] History route at `/history` uses `RouteFiltersSearch` Zod schema for 10+ search params (category, dateFrom, dateTo, amountMin, amountMax, merchant, search, sort, page, pageSize).
- [2026-05-04] Transaction list uses `useInfiniteQuery` — boundary documented in `docs/rebuild/ux/DATA-FETCHING.md`.
- [2026-05-04] Optimistic updates on PATCH/DELETE transactions per DATA-FETCHING.md 10-mutation table.
- [2026-05-04] History has the highest screen-state count (~36 stories). Watch for state variants that need cross-feature context (drill-down from Dashboard) — those are `human-authored`.
- [2026-05-04] Reference exemplar at `docs/rebuild/ux/reference-stories/HistoryView.stories.tsx` — has play() function patterns.
- [2026-05-04] Money amounts stored as `_minor` (BIGINT) per SCOPE §monetary-conventions. Display with CLP formatting (no decimals for CLP, 2 decimals for USD/EUR).

## Stuck Stories
(none yet)
