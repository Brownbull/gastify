<!-- gabe-review-live:1.1 -->
---
sources:
  - cli: codex
    model: gpt-5
    timestamp: 2026-05-25T14:21:21-04:00
    findings: 3
  - cli: claude
    model: claude-opus-4-6
    timestamp: 2026-05-25T14:45:00-04:00
    findings: 3
consolidated_at: 2026-05-25T14:45:00-04:00
consolidation: union
project_root: /home/khujta/projects/apps/gastify
target: P5 Phase 1 — Card alias + statement schema foundation
maturity: mvp
status: resolved
---

# Gabe Review — Live Document

**Verdict:** APPROVE (final)
**Confidence:** 88/100
**Coverage:** MEDIUM
**Findings:** 6 (CRITICAL: 0, HIGH: 2, MEDIUM: 3, LOW: 1) | **Sources:** codex+claude
**Resolution:** 4 fixed / 2 deferred of 6

## Findings
| # | Status | Severity | Finding | File | Churn | Fix Cost | Defer Risk | Maturity Gate | Escalation | Sources |
|---|--------|----------|---------|------|-------|----------|------------|---------------|------------|---------|
| 1 | fixed | HIGH | Cross-scope FK references possible — added composite FK via migration 016 with ON DELETE RESTRICT. | `backend/app/models/statement.py:127` | ✅ STABLE | M | CROSS-TENANT DATA LINKS — P(medium), I(high) | Enterprise | - | codex |
| 2 | fixed | HIGH | Web OpenAPI contract not regenerated — ran `cd web && npm run generate:api`, spec now has card-aliases. | `web/src/lib/openapi-spec.json` | ✅ STABLE | S | STALE WEB TYPES DELAY PHASE 4 — P(high), I(medium) | Enterprise | - | codex |
| 3 | deferred | MEDIUM | RLS tested statically only — migration content test checks strings; no test executes PostgreSQL RLS policy SQL for new statement tables. | `backend/tests/test_statement_models.py:134` | ✅ STABLE | M | BROKEN RLS EXPRESSION SURVIVES TO PRODUCTION — P(medium), I(medium) | Enterprise | - | codex |
| 4 | fixed | MEDIUM | ORM JSON vs JSONB — changed to `JSON().with_variant(PG_JSONB(), "postgresql")` for dialect-aware type. | `backend/app/models/statement.py:162` | ✅ STABLE | S | AUTOGENERATE MASKS REAL DIFFS — P(medium), I(low) | MVP | - | claude |
| 5 | fixed | MEDIUM | ORM index=True drift — removed `index=True` from three `ownership_scope_id` columns; composite indexes cover queries. | `backend/app/models/statement.py:80` | ✅ STABLE | S | AUTOGENERATE FALSE POSITIVES — P(high), I(negligible) | Enterprise | - | claude |
| 6 | deferred | LOW | Subquery-based RLS on `statement_lines` and `verdicts` — correct at ent, degrades at scale. | `backend/alembic/versions/015_statement_reconciliation_foundation.py:349` | ✅ STABLE | L | SLOW ROW ACCESS AT SCALE — P(low), I(moderate) | Scale | - | claude |

## Plan Alignment (5a)
ALIGNED — all changed files on-scope for Phase 1 (card alias CRUD, statement schema, migration, tests).

## Stale Verified Topics (5c)
None.

## Architectural Decisions (5b)
None — D48 already covers the schema foundation.

## Tier Drift (5d)
None.

## Deferred Backlog Status
P21 (JSON/JSONB) pattern addressed for statement tables by fix #4. Reference table columns remain tracked under P21.

## Triage Summary
| Action | Count | Findings |
|--------|-------|----------|
| Fixed | 4 | #1 composite FK scope enforcement, #2 web contract regen, #4 JSON/JSONB with_variant, #5 remove index=True drift |
| Deferred | 2 | #3 RLS execution tests → PENDING.md, #6 subquery RLS perf → PENDING.md |

## Verification
- `uv run pytest tests/ -x -q`: 540 passed, 2 skipped
- `uv run ruff check .`: all passed
- `uv run mypy app/models/statement.py`: no issues
- `npx tsc --noEmit` (web): clean
- `check-ng06-pci-exclusion.sh`: PASS
- `check-rls-table-coverage.sh`: PASS
- `grep -c card-aliases web/src/lib/openapi-spec.json`: 2 matches
