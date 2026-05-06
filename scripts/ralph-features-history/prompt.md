# Ralph Agent Instructions — History

You are an autonomous coding agent building Storybook stories for Gastify's History feature. Your scope is `frontend/src/features/history/**`.

## Your Task

1. Read the PRD at `prd.json` (in the same directory as this file)
2. Read the progress log at `progress.txt` (check Codebase Patterns section first)
3. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from `rebuild/main`.
4. Pick the **highest priority** user story where `passes: false` AND `blocked: false` AND `tier_suitability != "human-authored"`
5. Verify all `deps[]` entries have `passes: true` — if not, skip to next eligible story
6. Implement that single user story
7. Run quality checks (typecheck, lint, storybook render test, axe, play functions)
8. Update AGENTS.md if you discover reusable patterns
9. If checks pass, commit ALL changes with message: `feat: [Story ID] - [Story Title]`
10. Update the PRD to set `passes: true` for the completed story
11. Append your progress to `progress.txt` with `cost_usd: $X.XX`

## Patterns

### TanStack Router
- History route at `frontend/src/routes/history.tsx` (route `/history`).
- Uses `RouteFiltersSearch` Zod schema for search params — documented in `docs/rebuild/ux/ROUTING.md`.
- Search params: `category`, `dateFrom`, `dateTo`, `amountMin`, `amountMax`, `merchant`, `search`, `sort`, `page`, `pageSize`.
- Drill-down handoff: Dashboard category-card → History with pre-filled filters via search params.

### TanStack Query
- Query key factory: `queryKeys.transactions.list(filters)`, `queryKeys.transactions.detail(id)`.
- Uses `useInfiniteQuery` for paginated transaction list (boundary documented in DATA-FETCHING.md).
- Optimistic updates on PATCH/DELETE per DATA-FETCHING.md convention.

### Mock Boundary
- History hooks: `useTransactionList(filters)`, `useTransactionDetail(id)`, `useTransactionMutations()`.
- Mock at `hooks/ui/` level.

### History States (~36 stories)
- default, filtered, search-active, selection-mode-active, empty-no-data, empty-after-filter, loading-first-page, loading-next-page, server-error, group-mode, sort-changed, page-size-60
- Each × 3 platforms = ~36 stories
- Cross-feature drill-down (Dashboard → History) is `tier_suitability: "human-authored"`.

## References (read-only)

- `docs/rebuild/ux/reference-stories/HistoryView.stories.tsx` — primary exemplar with play()
- `docs/rebuild/ux/reference-stories/*.stories.tsx` — all exemplars
- `docs/rebuild/ux/STORYBOOK-STRUCTURE.md`, `docs/rebuild/ux/ROUTING.md`, `docs/rebuild/ux/DATA-FETCHING.md`
- `docs/rebuild/ux/RALPH-PRD-FORMAT.md`, `docs/mockups/INDEX.md`, `docs/mockups-legacy/INDEX.md`
- `frontend/STORIES.md`, `.kdbp/SCOPE.md`

## Untouchables

- `backend/**`
- `frontend/src/api-client/**`
- `.kdbp/**`
- `docs/rebuild/ux/reference-stories/**`
- `frontend/src/features/reports/utils/printUtils.ts`
- `tests/contract/generated/**`
- `shared/types/scan-events.ts`
- `scripts/migrate/**`

## Gates

| Gate | Checks | Timeout |
|------|--------|---------|
| `atom` | typecheck + render + axe + i18n regex | ~5s |
| `molecule` | atom + `play()` ≥1 assertion | ~15s |
| `screen` | molecule + `play()` ≥2 states + screenshot + visual diff | ~60s |

## Cost Cap Reminder

Stop at `$MAX_USD_PER_BATCH` (default $5) with summary in `progress.txt`.

## AGENTS.md Compaction Discipline

- Write to `frontend/src/features/history/AGENTS.md` with `[YYYY-MM-DD]` prefix.
- Skip `[STALE]`. Compact at >200 lines to `AGENTS-archive.md`.

## deps[] Enforcement Reminder

Only pick stories where every `deps[]` entry has `passes: true`.

## maxAttempts Reminder

If `attemptCount >= maxAttempts`, mark `blocked: true` and skip.

## tier_suitability Check

If `tier_suitability == "human-authored"`, skip.

## Mockup Precedence Rule

Clean-slate wins design language. Legacy fills gaps. PRD `source` field declares.

## Platform-Aware Story Conventions

- Mobile (390×844), tablet (768×1024), desktop (1440×900).
- Tablet-skip when responsive primitives interpolate cleanly.

## Progress Report Format

APPEND to progress.txt with `cost_usd: $X.XX` per iteration.

## Stop Condition

All `passes: true` → `<promise>COMPLETE</promise>`

## Important

- ONE story per iteration. Stay within `frontend/src/features/history/`.
- Import shared atoms/molecules from `frontend/src/components/`.
