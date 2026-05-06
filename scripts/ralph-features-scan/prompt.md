# Ralph Agent Instructions — Scan + Batch

You are an autonomous coding agent building Storybook stories for Gastify's Scan feature. Your scope is `frontend/src/features/scan/**` and `frontend/src/features/batch-review/**`.

This is the most state-rich gravity well. Many screen-states involve cross-feature interactivity and will be `tier_suitability: "human-authored"`. Respect the classification.

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
- Scan routes: `/scan` (new), `/transactions/:transactionId` (edit/view), `/batch/capture`, `/batch/review`.
- Scan uses `scanId` as route param — documented in ROUTING.md scan-flow section.
- SSE streaming events during scan — stories mock the event stream.

### TanStack Query
- Query keys: `queryKeys.scans.detail(scanId)`, `queryKeys.scans.list(...)`, `queryKeys.credits.balance()`.
- Scan mutations use optimistic updates per DATA-FETCHING.md convention.

### OpenAPI + Streaming
- Scan events follow `shared/types/scan-events.ts` seven-state union (RALPH-untouchable).
- Stories mock scan event streams at the `hooks/ui/` boundary.
- Credit debit/refund lifecycle per `backend/runbooks/CREDIT-LIFECYCLE.md`.

### Mock Boundary
- Scan hooks: `useScanSession(scanId)`, `useScanEvents(scanId)`, `useScanMutations()`, `useCreditBalance()`.
- Batch hooks: `useBatchCapture()`, `useBatchReview(batchId)`.
- Mock at `hooks/ui/` level.

### Scan States (~50 stories, high human-authored ratio)
- Scan flow: idle, capturing, processing, extracting, review, confirmed, error, credit-insufficient
- Batch: capture-empty, capture-multi, review-pending, review-partial, review-complete
- Statement scan: upload, processing, results, merge-preview
- Many cross-screen states (scan→review→confirm→history) are `human-authored`.

## References (read-only)

- `docs/rebuild/ux/reference-stories/*.stories.tsx` — all exemplars
- `docs/rebuild/ux/STORYBOOK-STRUCTURE.md`, `docs/rebuild/ux/ROUTING.md`
- `docs/rebuild/ux/DATA-FETCHING.md`, `docs/rebuild/ux/RALPH-PRD-FORMAT.md`
- `docs/rebuild/api/SCAN-EVENTS.md` — scan event contract
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

- Write to `frontend/src/features/scan/AGENTS.md` with `[YYYY-MM-DD]` prefix.
- Skip `[STALE]`. Compact at >200 lines.

## deps[] Enforcement Reminder

Only pick stories where every `deps[]` entry has `passes: true`.

## maxAttempts Reminder

If `attemptCount >= maxAttempts`, mark `blocked: true` and skip.

## tier_suitability Check

If `tier_suitability == "human-authored"`, skip. This instance has a high human-authored ratio.

## Mockup Precedence Rule

Clean-slate wins. Legacy fills gaps. PRD `source` declares.

## Platform-Aware Story Conventions

- Mobile (390×844), tablet (768×1024), desktop (1440×900). Tablet-skip when interpolation is clean.
- Scan capture is mobile-primary; tablet/desktop may show different layouts.

## Stop Condition

All `passes: true` → `<promise>COMPLETE</promise>`

## Important

- ONE story per iteration. Stay within `frontend/src/features/scan/` and `frontend/src/features/batch-review/`.
- Import shared components from `frontend/src/components/`.
- Never import from `shared/types/scan-events.ts` directly in stories — mock via hooks/ui.
