<!-- gabe-review-live:1.1 -->
---
sources:
  - cli: codex
    model: gpt-5
    timestamp: 2026-05-25T16:53:56-04:00
    findings: 3
  - cli: claude
    model: claude-opus-4-6
    timestamp: 2026-05-25T17:15:00-04:00
    findings: 3
consolidated_at: 2026-05-25T17:15:00-04:00
consolidation: union
project_root: /home/khujta/projects/apps/gastify
target: P5 Phase 2 — Statement PDF upload + extraction worker
maturity: ent
status: resolved
---

# Gabe Review — Live Document

**Verdict:** APPROVE
**Confidence:** 95/100
**Coverage:** HIGH — SSE endpoint tested (4 tests); codex-text-path tested; artifact privacy fixed
**Findings:** 3 (CRITICAL: 0, HIGH: 2, MEDIUM: 0, LOW: 1) | **Sources:** codex+claude (full overlap — both agents independently flagged all 3)
**Resolution:** 3 fixed / 0 deferred / 0 dismissed of 3 (pending: 0)

## Findings

| # | Status | Severity | Finding | File | Churn | Fix Cost | Defer Risk | Maturity Gate | Escalation | Sources |
|---|--------|----------|---------|------|-------|----------|------------|---------------|------------|---------|
| 1 | fixed | HIGH | Codex-pdf-text provider returns `pdf_status="readable"` with `lines=[]` and warning `codex_text_only_no_line_normalization` for text-bearing PDFs. Worker persists this as `StatementStatus.EXTRACTED` with zero lines. Default production provider completes with false-success semantics — contradicts Phase 2 contract ("emit typed transaction-line records"). | `backend/app/services/statement_extraction.py:141` / `backend/app/services/statement_worker.py:90` | ✅ STABLE | M (1-3h) | FALSE EXTRACTION SUCCESS — P(high), I(high) | Enterprise | — | codex, claude |
| 2 | fixed | HIGH | SSE endpoint `GET /statements/{id}/events` exists but has no integration test and the staging fixture gate polls REST only. Worker event emission is monkeypatched in `test_statement_worker.py`; no test exercises the live SSE transport/auth/reconnect path. A broken SSE route would pass all current evidence. | `backend/app/api/statement_stream.py:47` / `scripts/staging/run-statement-fixture-gate.py:241` | ✅ STABLE | M (1-3h) | STREAMING PATH SHIPS UNTESTED — P(medium), I(high) | Enterprise | — | codex, claude |
| 3 | fixed | LOW | Staging fixture gate writes `firebase_uid` and `firebase_email` to ignored manifest artifacts. Not a committed secret (gitignored, staging E2E test account), but Phase 0 privacy rules prefer sanitized manifests. | `scripts/staging/run-statement-fixture-gate.py:218` | ✅ STABLE | S (<30m) | TEST IDENTIFIERS SPREAD — P(medium), I(low) | MVP | — | codex, claude |

## Plan Alignment (5a)

DRIFTED — 23 of 27 changed files are on-scope (statement API, worker, extraction, events, tests, staging gate, generated contracts). 4 files are off-scope: `docs/wells/*.md` (7 docs well files) and `.kdbp/` bookkeeping. The docs are thematically related (document the new statement subsystem) but not part of Phase 2's stated scope.

On-scope files changed: 20 / 27
Off-scope files changed: 7 (docs/wells/*.md, .kdbp/ bookkeeping)
Scope files not touched: 0

## Stale Verified Topics (5c)

None.

## Architectural Decisions (5b)

None new. D49 covers the Phase 2 worker/upload lane; D54 continues to govern statement privacy and fixture boundaries.

## Tier Drift (5d)

None. The findings are within the existing enterprise gate; no scale-only patterns were introduced.

## Deferred Backlog Status

No existing PENDING.md item was addressed or escalated by this diff. P18 (BaseHTTPMiddleware streaming) is tangentially related to finding #2 but is not directly exercised by the statement SSE endpoint (statement_stream.py uses sse-starlette, not BaseHTTPMiddleware).

## Evidence Reviewed

- Phase 2 commits: `4f08a7a feat(statements): add PDF upload worker`, `96a6356 chore(kdbp): close P5 phase 2 exec`, `c0168f5 docs(wells): expand gravity well references`, `b803112 chore(kdbp): record push bookkeeping for P29`.
- Local gates: ruff check/format, targeted mypy, statement tests (35 passed), full backend suite (553 passed), web build, mobile typecheck, PCI/RLS scripts, `git diff --check`.
- CI: GitHub Actions runs `26419027709` and `26419180596` both passed.
- Railway deploy: `gastify-api-staging-e2e` deployment `3db66826` reached SUCCESS/RUNNING; readiness probe migration_current=016.
- Runtime artifact: `tests/mobile/results/runs/staging-e2e/20260525T-p5-statement-fixture-gate/p5-statement-fixture-backend/manifest.json` records `result_status=passed`, `git_rev=4f08a7a`, 2 fixture lines from deployed staging-e2e.

## Triage Complete

| Action | Count | Findings |
|--------|-------|----------|
| Fixed | 3 | #1 false-success extraction state, #2 SSE integration tests, #3 artifact privacy |
| Deferred | 0 | — |
| Dismissed | 0 | — |

Review Confidence: 76 → 95 / 100 (+19)

### Fixes Applied

1. **#1 — False extraction success**: Changed `statement_extraction.py` to return `pdf_status="extraction_failed"` (not `"readable"`) when codex-pdf-text has text but cannot normalize lines. Worker now correctly routes to FAILED state. Added test `test_codex_worker_text_bearing_pdf_without_normalization_sets_failed`.
2. **#2 — SSE untested**: Created `tests/test_statement_stream.py` with 4 integration tests exercising the SSE endpoint: full event sequence, token requirement, auth failure, and late-subscriber terminal event delivery.
3. **#3 — Artifact privacy**: Replaced `firebase_uid`/`firebase_email` with `auth_verified: true` in `run-statement-fixture-gate.py` manifest output.

### Final Verdict

**APPROVE** — All 3 findings fixed. No CRITICAL, no unresolved HIGH. Coverage upgraded to HIGH (SSE path and codex-text-no-normalization path both covered by integration tests). 558 backend tests pass, lint clean.

---
_Review resolved. Archived at `.kdbp/reviews-archive/REVIEW_2026-05-25-171500_resolved.md`._
