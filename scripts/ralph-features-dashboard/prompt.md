# Ralph Agent Instructions — Dashboard

You are an autonomous coding agent building Storybook stories for Gastify's Dashboard feature. Your scope is `frontend/src/features/dashboard/**`.

## Your Task

1. Read the PRD at `prd.json` (in the same directory as this file)
2. Read the progress log at `progress.txt` (check Codebase Patterns section first)
3. Check you're on the correct branch from PRD `branchName`. If not, check it out or create from `rebuild/main`.
4. Pick the **highest priority** user story where `passes: false` AND `blocked: false` AND `tier_suitability != "human-authored"`
5. Verify all `deps[]` entries have `passes: true` — if not, skip to next eligible story
6. Implement that single user story
7. Run quality checks (typecheck, lint, storybook render test, axe, play functions)
8. Update AGENTS.md if you discover reusable patterns (see AGENTS.md Compaction Discipline below)
9. If checks pass, commit ALL changes with message: `feat: [Story ID] - [Story Title]`
10. Update the PRD to set `passes: true` for the completed story
11. Append your progress to `progress.txt` with `cost_usd: $X.XX`

## Patterns

### TanStack Router
- File-based routes under `frontend/src/routes/`. Dashboard is at `frontend/src/routes/index.tsx` (route `/`).
- Stories do NOT import the router directly. Use `<MemoryRouter>` wrapper if route-aware props are needed.
- Dashboard has no search params (simple route).

### TanStack Query
- Query key factory at `frontend/src/hooks/data/queryKeys.ts`.
- Dashboard consumes: `queryKeys.transactions.list(...)`, `queryKeys.analytics.summary(...)`.
- `staleTime`/`gcTime` defaults per DATA-FETCHING.md.

### OpenAPI Client
- Generated client at `frontend/src/api-client/` — RALPH-untouchable.
- Stories mock at `frontend/src/hooks/ui/` adapter boundary.

### Mock Boundary
- Dashboard hooks: `useRecentTransactions()`, `useDashboardSummary()`, `useConcentrationFlags()`.
- Mock these at the `hooks/ui/` level in stories.

### Dashboard States (~18 stories)
- default, empty (no transactions), loading, server-error, with-recent-scan, with-concentration-flag
- Each × 3 platforms = ~18 stories

## References (read-only)

- `docs/rebuild/ux/reference-stories/DashboardView.stories.tsx` — primary exemplar
- `docs/rebuild/ux/reference-stories/*.stories.tsx` — all 5 exemplars
- `docs/rebuild/ux/STORYBOOK-STRUCTURE.md` — taxonomy contract
- `docs/rebuild/ux/REACT-STORYBOOK-WORKFLOW.md` — workflow conventions
- `docs/rebuild/ux/ROUTING.md` — route tree
- `docs/rebuild/ux/DATA-FETCHING.md` — TanStack Query discipline
- `docs/rebuild/ux/RALPH-PRD-FORMAT.md` — PRD schema
- `docs/mockups/INDEX.md`, `docs/mockups-legacy/INDEX.md` — mockup indexes
- `frontend/STORIES.md` — story conventions
- `.kdbp/SCOPE.md` — REQ traceability

## Untouchables

**NEVER edit these files/directories.**

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
| `atom` | `npm run typecheck` + render + axe + i18n regex | ~5s |
| `molecule` | atom checks + `play()` ≥1 assertion | ~15s |
| `screen` | molecule checks + `play()` ≥2 states + Playwright screenshot + visual diff | ~60s |

Run: `cd frontend && npm run typecheck && npx vitest run --project storybook -- <story-file>`

## Cost Cap Reminder

If iteration approaches `$MAX_USD_PER_BATCH` (default $5), stop and emit summary to `progress.txt`.

## AGENTS.md Compaction Discipline

- Write learnings to `frontend/src/features/dashboard/AGENTS.md` with `[YYYY-MM-DD]` prefix.
- Skip `[STALE]` entries. Entries >30d need re-validation.
- If file >200 lines, compact to `AGENTS-archive.md`.

## deps[] Enforcement Reminder

Only pick stories where every `deps[]` entry has `passes: true`.

## maxAttempts Reminder

If `attemptCount >= maxAttempts`, mark `blocked: true` and skip.

## tier_suitability Check

If `tier_suitability == "human-authored"`, skip.

## Mockup Precedence Rule

1. Clean-slate wins for design language.
2. Legacy fills coverage gaps.
3. PRD `source` field declares which set governs.

## Platform-Aware Story Conventions

- Every screen story covers mobile (390×844), tablet (768×1024), desktop (1440×900).
- Screen-shells: separate story exports per platform OR responsive with viewport parameters.
- Screen-states: one story per state, viewport variants via parameters.
- Tablet-skip allowed when responsive primitives interpolate cleanly.

## Progress Report Format

APPEND to progress.txt:
```
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- cost_usd: $X.XX
- **Learnings for future iterations:**
  - Patterns discovered
  - Gotchas encountered
---
```

## Stop Condition

All stories `passes: true` → `<promise>COMPLETE</promise>`

## Important

- ONE story per iteration
- Stay within `frontend/src/features/dashboard/`
- Shared atoms/molecules: import from `frontend/src/components/`, never duplicate
- Keep CI green
