# CI/CD Pipeline Foundation — A.18

Phase A prereq A.18. Automated pipeline owning the gates referenced throughout the plan. CI/CD is the mechanism, not the hope.

---

## Pipeline Jobs

### Frontend

| Job | Command | Gate |
|-----|---------|------|
| Typecheck | `npm run typecheck` | Required |
| Lint | `npm run lint` | Required |
| Unit tests | `npm run test` (Vitest) | Required |
| Build | `npm run build` | Required |
| Build Storybook | `npm run build-storybook` | Required |
| Storybook play tests | `npm run test-storybook` | Required (Phase D) |
| Visual diff | `npm run test-storybook-visual` | Required (Phase D) |

### Backend

| Job | Command | Gate |
|-----|---------|------|
| Dependency install | `uv sync --frozen` | Required |
| Tests + coverage | `pytest --cov` (≥80%) | Required |
| Lint + format | `ruff check && ruff format --check` | Required |
| Migration check | `alembic check` | Required |
| OpenAPI schema diff | Regenerated `backend/openapi.yaml` matches live emission | Required |
| Type check | `mypy app/` | Required |

### Migration / Contract

| Job | Command | When |
|-----|---------|------|
| Contract tests | `tests/contract/` — MSW handlers vs OpenAPI schema | Every PR |
| ETL parity | `scripts/migrate/validate.py --sample` | Nightly (Phase E dual-write) |

### Cross-Cutting Security

| Job | Command | Gate |
|-----|---------|------|
| Secret scan | gitleaks on every PR | Block on finding |
| SCA (backend) | `pip-audit` | Block on CRITICAL/HIGH |
| SCA (frontend) | `npm audit` | Block on CRITICAL/HIGH |
| Lockfile review | Diff to `uv.lock` / `package-lock.json` | Require reviewer approval |

---

## Custom CI Gates (9 — count canary)

Adding a 10th requires wave review. Three-test admission: (a) spans ≥2 tracks; (b) enforces load-bearing prohibition; (c) single owner script under `scripts/ci/`.

| # | Gate Script | Asserts |
|---|------------|---------|
| 1 | `check-no-pending-state.sh` | No `pendingHistoryFilters` / `analyticsInitialState` / `scrollPositions` reads in `frontend/src/**` |
| 2 | `check-rls-uid-wrap.sh` | Every `auth.uid()` / `current_setting('app.*')` in policy bodies wrapped as `(SELECT ...)` |
| 3 | `check-rls-table-coverage.sh` | Every table in `pg_class` mapped to a row-set in RLS.md |
| 4 | `check-a13-a17-layering.sh` | Four shared concerns cross-reference between A.13 and A.17 |
| 5 | `check-ralph-untouchables-parity.sh` | Per-feature `scripts/ralph-*/prompt.md` Untouchables match Critical Files list |
| 6 | `check-error-uri-registry.sh` | New `errors/<slug>` URIs in the registered set (15 slugs) |
| 7 | `check-openapi-codegen-drift.sh` | `backend/openapi.yaml` matches FastAPI live emission; MSW operationId coverage = 100% |
| 8 | `check-ng06-pci-exclusion.sh` | No PAN/CVV columns; fx_rates write-once trigger present; `*_user_edited_at` companions |
| 9 | `check-a9-cadence-coverage.sh` | Every operationId mapped to a row in A.9 cadence classification table |

---

## Pre-Commit Hooks

`.pre-commit-config.yaml` configuration:
- **gitleaks** — secret scan
- **ruff** — Python lint + format (backend)
- **prettier** — JS/TS format (frontend)
- **alembic migration name check** — enforces additive-only during cutover

---

## Required Status Checks

Every job above is a required check on `rebuild/main` and `main` (per A.19 branch protection rules). This list is the contract — additions/removals must be auditable here.

**Required checks for merge to `rebuild/main`:**
1. `ci/frontend-typecheck`
2. `ci/frontend-lint`
3. `ci/frontend-test`
4. `ci/frontend-build`
5. `ci/backend-test`
6. `ci/backend-lint`
7. `ci/backend-migration-check`
8. `ci/security-gitleaks`
9. `ci/security-sca`
10. `ci/custom-gates` (runs all 9 scripts above)

**Additional checks for merge to `main`:**
11. `ci/frontend-storybook-build`
12. `ci/frontend-storybook-test`
13. `ci/contract-tests`
14. `ci/openapi-schema-diff`

---

## Build Cache Hygiene

- Caches keyed per lockfile hash (`uv.lock` for backend, `package-lock.json` for frontend)
- Full rebuild on lockfile change so SCA gate sees the diff
- Storybook cache separate from build cache

---

## Environment Secret Segregation

Separate GitHub Actions secret sets for dev / staging / prod (A.21). Rotation cadences pinned in `backend/runbooks/SECRETS.md` (A.17).
