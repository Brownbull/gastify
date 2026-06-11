# P7 Compliance + Launch Hardening — Exit Gate Evidence Packet

> **SUPERSEDED (2026-06-11)** by [P16-LAUNCH-GO-NO-GO.md](P16-LAUNCH-GO-NO-GO.md) — every item deferred here as "operational" was closed by P16 Phases 1–4 with deployed proofs.

> Roadmap phase **P7** (consolidates + audits REQ-20 consent/processing-register +
> REQ-21 observability; adds monetization plumbing + launch hardening).
> Compiled 2026-05-29 during the code-complete + defer-runtime roadmap drive.

## Status

| Track | State |
|-------|-------|
| DSR completeness + `withdrawn_at` audit distinction (Ph1) | ✅ code-complete, tested |
| Consent-revocation propagation + cohort/AI eligibility seam (Ph2) | ✅ code-complete, tested |
| Scan quota graceful degradation + requeue (Ph3) | ✅ code-complete, tested |
| Retention / TTL enforcement (Ph4) | ✅ code-complete, tested |
| Monetization plumbing — schema only (Ph5) | ✅ code-complete, tested |
| Launch-hardening runbooks + observability counters (Ph6) | ✅ this packet |
| Load test to real quota throttle | ⏸ deferred (operational) |
| Retention scheduled-job run | ⏸ deferred (operational) |
| Paid-Gemini tier pre-commit | ⏸ deferred (operational) |
| Cutover / DR drill | ⏸ deferred (operational) |

## Exit-signal element → evidence

The roadmap P7 exit signal (ROADMAP §Phase 7):

| Element | Local evidence | Runtime closure |
|---------|----------------|-----------------|
| (a) DSR request serviceable end-to-end (access/rectification/erasure/portability) | `app/api/privacy.py` + `app/api/consent.py`; tests in `test_privacy.py` (13) + `test_consent.py` (incl. `withdrawn_at`); DPO-PROCEDURES.md | deployed journey (deferred) |
| (b) Consent revocation triggers downstream cohort-unflag | `app/services/consent_propagation.py` (`is_cohort_eligible` live-derived) + propagation logging; `test_consent_propagation.py` (5) | — (logic proven at API layer) |
| (c) LLM quota throttle → all scans `queued`, no 5xx | `ScanStatus.QUEUED` + `_settle_pipeline_error` + requeue sweep (`scan_worker.py`); `test_scan_worker.py` quota tests + reprocess/sweep tests | **load test** on staging (deferred) |
| (d) Retention deletes data older than declared TTL | `app/services/retention.py` + `scripts/ops/run_retention.py`; `test_retention.py` (4) | **scheduled job run** on staging (deferred) |
| (e) Go/no-go readiness checklist signed | PRODUCTION-CHECKLIST.md + new DPO / DISASTER-RECOVERY / INCIDENT-RESPONSE / SECURITY-CHECKLIST runbooks | sign-off at launch (deferred) |
| Monetization plumbing (paid-from-launch, schema) | `app/services/billing.py` + `credit_balances.plan_tier` (migration 025); `test_billing.py` (6) | pricing mechanism = separate ADR (SCOPE §9.2) |
| Observability (REQ-21) | `audit_event_*` + `scan_error_*` + `scans_queued` counters on `/metrics` | — |

## Local gate sweep (2026-05-29)
- Backend `uv run pytest`: **692 passed, 2 skipped**. mypy clean. ruff clean. alembic head 025.
- Per-phase adversarial reviews (Ph2 96/100, Ph3 94/100, Ph4 95/100, Ph5 94/100; Ph1 self-review) all APPROVE; archived in `.kdbp/reviews-archive/`.

## Deferred (operational — launch staging session)
- Push to `origin/staging` + Railway deploy of migrations 023–025.
- Load test driving Gemini to quota throttle → assert all scans `queued`, no 5xx (closes exit (c)).
- Run `scripts/ops/run_retention.py --apply` against staging with seeded expired data (closes exit (d)).
- Pre-commit the paid Gemini tier; schedule the retention + requeue sweeps.
- Cutover/DR drill (DISASTER-RECOVERY.md) + go/no-go sign-off.
- Concurrency-harden billing primitives before pricing enforcement (PENDING P36).
