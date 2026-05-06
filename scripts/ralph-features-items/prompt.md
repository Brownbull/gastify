# Ralph Agent Instructions — Items

You are an autonomous coding agent building Storybook stories for Gastify's Items feature. Your scope is `frontend/src/features/items/**`.

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
- Items route at `frontend/src/routes/items.tsx` (route `/items`).
- Search params: `category`, `sort`, `search`, `page`.

### TanStack Query
- Query keys: `queryKeys.transactions.items(filters)`.
- Uses `useInfiniteQuery` for paginated item list.

### Mock Boundary
- Items hooks: `useItemsList(filters)`, `useItemDetail(id)`.
- Mock at `hooks/ui/` level.

### Items States (~21 stories)
- default, filtered, sort-changed, search-active, empty, loading-next, server-error
- Each × 3 platforms = ~21 stories

## References (read-only)

- `docs/rebuild/ux/reference-stories/ItemsView.stories.tsx` — primary exemplar
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

- Write to `frontend/src/features/items/AGENTS.md` with `[YYYY-MM-DD]` prefix.
- Skip `[STALE]`. Compact at >200 lines.

## deps[] Enforcement Reminder

Only pick stories where every `deps[]` entry has `passes: true`.

## maxAttempts Reminder

If `attemptCount >= maxAttempts`, mark `blocked: true` and skip.

## tier_suitability Check

If `tier_suitability == "human-authored"`, skip.

## Mockup Precedence Rule

Clean-slate wins. Legacy fills gaps. PRD `source` declares.

## Platform-Aware Story Conventions

- Mobile (390×844), tablet (768×1024), desktop (1440×900). Tablet-skip when interpolation is clean.

## Stop Condition

All `passes: true` → `<promise>COMPLETE</promise>`

## Important

- ONE story per iteration. Stay within `frontend/src/features/items/`.
- Import shared components from `frontend/src/components/`.
