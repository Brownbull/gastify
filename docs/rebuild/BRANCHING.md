# Branch Strategy & Hotfix Path — A.19

Phase A prereq A.19. Defines the branch model, merge flows, branch protection rules, and production hotfix path for the multi-month parallel-track pivot.

Cross-references: A.18 (CI/CD required-status-checks), A.15 (feature flags for partial capability gating), A.17 (signed commits, SCA).

---

## Branch Model

```
main ─────────────────────────────────────────────────────> (production)
  │                        ↑ weekly rebase              ↑ cutover promotion
  │                        │                            │
  └── rebuild/main ────────┴────────────────────────────┘ (integration)
        │   │   │
        │   │   └── rebuild/migrate-NN    (migration scripts)
        │   └── rebuild/be-<phase>-NN     (backend work)
        └── rebuild/fe-batch-NN           (frontend RALPH batches)
```

### `main` — Production

Current Firestore-direct stack. Kept live throughout Phases A–E for users. P0/P1 hotfixes land here directly.

### `rebuild/main` — Integration

Long-lived branch where all three rebuild tracks converge. Rebases from `main` weekly to absorb hotfixes; otherwise diverges intentionally. All CI gates (A.18) run on every push.

### Work Branches

| Pattern | Owner | Lifecycle |
|---------|-------|-----------|
| `rebuild/fe-batch-NN` | Frontend RALPH | Per Phase D batch. Merges to `rebuild/main` after tiered Storybook gate passes. |
| `rebuild/be-<phase>-NN` | Backend (human) | Per backend phase. Merges to `rebuild/main` after pytest + OpenAPI schema diff + contract tests pass. |
| `rebuild/migrate-NN` | Migration (human) | Per migration script set. Merges to `rebuild/main` after ETL parity check passes. |
| `hotfix/<slug>` | Human | Branch off `main` for production hotfixes. See Hotfix Path below. |

---

## Branch Protection Rules

Enforced on both `main` and `rebuild/main`:

| Rule | Setting |
|------|---------|
| Required status checks | All CI jobs from A.18 (frontend-typecheck, frontend-lint, frontend-test, frontend-build, backend-test, security-gitleaks, security-sca, custom-gates) |
| Required PR review | ≥1 reviewer (integration shepherd OR track owner) |
| Direct pushes | Blocked |
| Force pushes | Blocked |
| Signed commits | Required (supply-chain integrity per A.17 SCA) |
| Merge strategy on `main` | Squash-or-rebase only (linear history so cutover diff is reviewable) |
| Merge strategy on `rebuild/main` | Squash-or-rebase preferred; merge commits acceptable for weekly `main` rebase |

---

## Merge Flow

### Frontend Batch

```
1. RALPH completes batch on rebuild/fe-batch-NN
2. Run tiered Storybook gate (typecheck + render + axe + play functions)
3. Run per-batch integration smoke (MSW server, 3 critical flows)
4. PR → rebuild/main (requires ≥1 review)
5. CI passes → squash merge
6. Delete rebuild/fe-batch-NN
```

### Backend Phase

```
1. Complete backend phase on rebuild/be-<phase>-NN
2. pytest --cov ≥80%, ruff, alembic check, OpenAPI schema diff
3. Contract tests (frontend MSW handlers vs OpenAPI schema)
4. PR → rebuild/main (requires ≥1 review)
5. CI passes → squash merge
6. Integration shepherd regenerates OpenAPI client if schema changed
7. Delete rebuild/be-<phase>-NN
```

### Weekly Rebase

```
1. On rebuild/main: git rebase main
2. Resolve conflicts (integration shepherd responsibility)
3. Force-push rebuild/main (acceptable — work branches already merged)
4. Notify track owners of any conflict resolutions
```

---

## Hotfix Path

Production hotfix during multi-month pivot. The current Firestore stack ships hotfixes during the entire pivot.

### Flow

```
1. Bug filed against main
2. Branch off main: hotfix/<slug>
3. Fix + tests
4. PR labeled [hotfix-prod] → main
5. CI: gitleaks + SCA + typecheck + unit tests + pre-commit hooks
   (Storybook checks SKIPPED — legacy stack uses no Storybook)
6. ≥1 review → squash merge to main
7. Integration shepherd cherry-picks to rebuild/main within 24h
   OR files [skip-hotfix-rebuild] divergence note in frontend/src/AGENTS.md
   (if rebuild stack already obsoletes the bug)
```

### SLA

| Priority | Ship to `main` | Cherry-pick to `rebuild/main` |
|----------|-----------------|-------------------------------|
| P0 (data loss, auth bypass, scan broken) | ≤4 hours | ≤24 hours (or divergence note) |
| P1 (UX regression, calculation error) | ≤24 hours | ≤48 hours (or divergence note) |
| P2+ | Next scheduled session | Best effort |

### What `[hotfix-prod]` PRs bypass

- Tiered Storybook checks (legacy stack has no Storybook)
- Contract tests (legacy stack has no OpenAPI contract)
- Custom CI gates #1–#9 (may reference rebuild-only files)

### What `[hotfix-prod]` PRs do NOT bypass

- gitleaks / SCA (security gates always run)
- TypeScript typecheck
- Unit tests (Vitest)
- Pre-commit hooks
- PR review requirement

---

## Cutover (Phase E)

1. All three tracks green on `rebuild/main`.
2. Final rebase from `main` to absorb any last hotfixes.
3. Promote `rebuild/main` → `main` via PR (the "cutover PR").
4. Tag the pre-cutover state: `legacy/firestore-final` (forensic reference).
5. After Gate Cutover-Done (30-day soak), `main` represents the new stack.

### Cutover Backout

If Gate Cutover-Done fails post-flip:

1. Flip `datasource.postgres=false` feature flag (A.15) — reads revert to Firestore immediately.
2. If full branch promotion must be reverted: `legacy/firestore-final` tag is the rollback target.
3. `datasource.dual_write` stays `true` during investigation so no writes are lost.

---

## Coexistence with Feature Flags

`rebuild/main` uses feature flags (A.15) to gate partially-built capabilities. A `rebuild/main` snapshot stays bootable mid-track even if individual features are still landing — ungated screens return a fallback, not a crash.

---

## Integration Shepherd Responsibilities

One human role, load-bearing throughout the pivot:

1. Weekly rebase of `rebuild/main` from `main`.
2. Cherry-pick production hotfixes to `rebuild/main` (or file divergence notes).
3. Regenerate OpenAPI client after backend schema changes.
4. Resolve cross-track conflicts (frontend expecting an endpoint shape that backend changed).
5. Review all PRs to `rebuild/main` for cross-track coherence.
