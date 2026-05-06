# Ralph Agent Instructions — Analytics (Trends)

You are an autonomous coding agent building Storybook stories for Gastify's Analytics/Trends feature. Your scope is `frontend/src/features/analytics/**`.

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
- Trends route at `frontend/src/routes/trends.tsx` (route `/trends`).
- Uses `RouteFiltersSearch` Zod schema for search params: `period`, `category`, `view` (treemap|donut|sankey|bump|radar), `compare`.
- Drill-down: Trends treemap-leaf → History drill-out is `tier_suitability: "human-authored"`.

### TanStack Query
- Query keys: `queryKeys.analytics.trends(filters)`, `queryKeys.analytics.comparison(params)`.
- Chart data uses `staleTime: 5 * 60 * 1000` per DATA-FETCHING.md.

### Mock Boundary
- Trends hooks: `useTrendsData(filters)`, `useAnalyticsComparison(params)`.
- Mock at `hooks/ui/` level.

### Chart Components
- ECharts via `echarts-for-react`. Stories set `animation: false` via global decorator.
- `framer-motion` animations disabled in test mode via `skipAnimations`.
- Chart-ready: use `waitFor` in play() to ensure chart renders before assertions.

### Trends States (~36 stories)
- default, drill-temporal, drill-category, chart-aggregation, chart-comparison, view=treemap, view=donut, view=sankey, view=bump, view=radar, empty-no-data, server-error
- Each × 3 platforms = ~36 stories

## References (read-only)

- `docs/rebuild/ux/reference-stories/TrendsView.stories.tsx` — primary exemplar
- `docs/rebuild/ux/reference-stories/*.stories.tsx`, `docs/rebuild/ux/STORYBOOK-STRUCTURE.md`
- `docs/rebuild/ux/ROUTING.md`, `docs/rebuild/ux/DATA-FETCHING.md`, `docs/rebuild/ux/RALPH-PRD-FORMAT.md`
- `docs/mockups/INDEX.md`, `docs/mockups-legacy/INDEX.md`, `frontend/STORIES.md`, `.kdbp/SCOPE.md`

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

- Write to `frontend/src/features/analytics/AGENTS.md` with `[YYYY-MM-DD]` prefix.
- Skip `[STALE]`. Compact at >200 lines.

## deps[] Enforcement Reminder

Only pick stories where every `deps[]` entry has `passes: true`.

## maxAttempts Reminder

If `attemptCount >= maxAttempts`, mark `blocked: true` and skip.

## tier_suitability Check

If `tier_suitability == "human-authored"`, skip.

## Mockup Precedence Rule

Clean-slate wins design language. Legacy fills gaps. PRD `source` field declares.

## Platform-Aware Story Conventions

- Mobile (390×844), tablet (768×1024), desktop (1440×900). Tablet-skip when interpolation is clean.

## Stop Condition

All `passes: true` → `<promise>COMPLETE</promise>`

## Important

- ONE story per iteration. Stay within `frontend/src/features/analytics/`.
- Import shared components from `frontend/src/components/`.
