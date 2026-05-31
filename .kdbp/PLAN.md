# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Path A (Phase 0): fix the Railway WebSocket-403 progress stall with a REST polling fallback (mobile-only, no backend change), validated by a zero-Gemini load test against the D62 capacity estimate; Path B stays deferred behind D62 triggers.

## Context

- **Maturity:** mvp
- **Domain:** Chilean smart expense tracker (AI receipt scanning, multi-currency analytics, PWA + native mobile)
- **Created:** 2026-05-30
- **Last Updated:** 2026-05-30
- **Decision basis:** ADR D62 (two-axis progress-delivery finding; Path A now, Path B Postgres-native-first + triggered)

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Mobile polling fallback | When the progress WebSocket fails/stalls, poll existing `GET /scans/{id}` + `GET /statements/{id}` until terminal; reuse store `status→phase` reducers; jittered + adaptive backoff; reconcile-on-foreground (AppState). Mobile-only, no backend change. | mvp | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 2 | Zero-Gemini load test + capacity validation | `httpx` async harness using `scan_provider=mock/fixture` + `statement_provider=fixture` + `e2e_scan_event_delay_ms` ($0, no LLM). Ramp concurrent active jobs + polling load; measure DB pool-wait, p95 status latency, throughput, error rate; confirm/correct the D62 estimate. Dedicated load env (mock/fixture blocked in prod). | ent | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | Path-B trigger instrumentation | Make the D62 Path-B triggers data-driven: surface metrics for peak concurrent active scans, DB pool-wait, Gemini 429 rate; document polling-safe scaling levers (pool size, uvicorn `--workers`, replicas) + the threshold to start Path B. | mvp | low | ⬜ | ⬜ | ⬜ | ⬜ |

<!-- Exec is written by /gabe-execute: ⬜ not started, 🔄 in progress, ✅ complete -->
<!-- Review/Commit/Push auto-ticked by /gabe-review, /gabe-commit, /gabe-push -->
<!-- A phase is complete when all four status columns are ✅ -->
<!-- /gabe-next routes to the next command based on column state (Exec → Review → Commit → Push → advance phase) -->
<!-- Tier column values: mvp | ent | scale. Read by /gabe-execute (tier-cap) and /gabe-review (TIER_DRIFT finding). -->
<!-- User-facing/runtime phase types require journey evidence artifacts before Exec can be ✅. -->
<!-- Manual override is fine — edit cells by hand any time -->

## Phase Details

### Phase 1 — Mobile polling fallback

```yaml
phase: 1
types: [native-mobile, client-state, realtime, resilience]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, Client-State, Realtime]
suppressed_dims_count: 0
decisions_entry: D63
```

- **Tier chosen:** mvp — focused resilience fallback; happy path + WS-fail trigger + terminal stop is the honest baseline (U2).
- **Prototype:** no
- **Key files:** `mobile/src/hooks/useScanProgressSocket.ts`, `mobile/src/hooks/useStatementProgressSocket.ts`, new `mobile/src/lib/{scan,statement}ProgressPoll.ts`, reuse `mobile/src/stores/{scanStore,statementStore}.ts` `status→phase` reducers, plus hook/store tests.
- **No backend change.** Reads existing Postgres-backed REST endpoints — no new architectural component (per D62 / the Postgres-centric stack).
- **Trade-offs accepted:** See DECISIONS.md D63.

### Phase 2 — Zero-Gemini load test + capacity validation

```yaml
phase: 2
types: [test, performance, backend]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Performance]
suppressed_dims_count: 0
decisions_entry: D64
```

- **Tier chosen:** ent — load/capacity evaluation IS the deliverable (Core.Testing load-eval dimension); it validates the multi-user capacity claim in D62.
- **Prototype:** no
- **Key files:** new `scripts/loadtest/` (async `httpx` harness — no new runtime dep; `httpx` already installed), a short results doc.
- **Zero Gemini cost:** uses `scan_provider=mock/fixture` + `statement_provider=fixture` + `e2e_scan_event_delay_ms` to simulate latency with NO LLM calls. Gemini RPM ceiling stays analytical. Run against a dedicated load env (mock/fixture are config-blocked in production).
- **Trade-offs accepted:** See DECISIONS.md D64.

### Phase 3 — Path-B trigger instrumentation

```yaml
phase: 3
types: [observability, backend, docs]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, Observability]
suppressed_dims_count: 0
decisions_entry: D65
```

- **Tier chosen:** mvp — lightweight; reuses existing `app/observability.py` + middleware metrics, no new infra.
- **Prototype:** no
- **Key files:** backend metrics (existing metrics router / `app/observability.py`), `docs/runbooks/` (scaling levers + Path-B trigger thresholds).
- **Trade-offs accepted:** See DECISIONS.md D65.

## Current Phase

Phase 1: Mobile polling fallback

## Dependencies

- Phase 2 depends on Phase 1 (the load test must exercise the new polling path).
- Phase 3 is independent of 1 and 2 (can run in parallel).

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Polling adds steady DB-read load on the 15-conn pool | medium | jitter + adaptive backoff + poll-only-while-active; **validated in Phase 2** |
| Coarser granularity feels "stuck" between status milestones | low | optimistic local progress / indeterminate spinner between DB milestones |
| Mock load test cannot reproduce Gemini latency tail | low | approximate via `e2e_scan_event_delay_ms`; Gemini RPM stays analytical (documented caveat) |

## Notes

- This plan implements **Path A** from ADR **D62** only. Path B (fan-out bus + durable workers) is deferred behind D62's measurable triggers and is **Postgres-native-first** per the D62 amendment (LISTEN/NOTIFY or polling for fan-out; `procrastinate`/SKIP-LOCKED for durable jobs); Redis/Kafka remain an **open architecture decision** to be made when a trigger fires, informed by measured load.
- Architecturally **additive-zero**: no new runtime component; leans on the existing FastAPI + Postgres stack.
- Relates to PENDING **P35** (S23 device e2e for scan/statement) — this fix unblocks those flows.

## Runtime Evidence Checkpoints

- **Phase 1 (required before Exec ✅):** re-run on the Samsung S23 against deployed staging — `npm run maestro:statement:active` and `npm run maestro:phase5:golden:active` must now reach the **reconciliation-panel / scan-result-panel** (the "queued 0%" stall is gone). Artifacts → `tests/mobile/results/runs/staging-e2e/...`.
- **Phase 2:** capacity report (pool-wait, p95 status latency, throughput, error rate vs concurrency) committed under `scripts/loadtest/` or `docs/`.
