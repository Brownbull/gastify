# Active Plan

<!-- status: complete -->
<!-- project_type: code -->

## Goal

Post-launch-gate hardening + hygiene: close the accepted-residual security items (P59 rate-limiting, P78 audit trigger), pay down the web lint debt (P81), and clean the test/repo hygiene gaps (P82, P70) — the small, high-confidence work chosen while the frontend overhaul runs in a parallel lane.

## Context

- **Maturity:** mvp — but the security phase is tiered ent (auth-surface + audit-integrity changes).
- **Created:** 2026-06-11
- **Last Updated:** 2026-06-11 (plan authored. P16 complete + archived; P17 dropped per D93. Launch cutover + P18 deliberately NOT in scope (user). The frontend overhaul (desktop + Android re-skin from design-lab/) runs in a PARALLEL session — so this plan deliberately avoids `web/src` feature work and deep web-test investment that the overhaul would obsolete; P68 (group-leave keep-vs-delete FE prompt) is DEFERRED to the overhaul for the same reason. `frontend/` retirement stays deferred per the user's earlier call.)

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Security hardening | P59: slowapi rate-limiting on invite + auth-sensitive endpoints (429 + headers). P78: migration 038 — audit_events governed-mutations trigger (append-only except the PII scrub UPDATE + the TTL purge DELETE). | ent | med | ✅ | ✅ | ✅ | ✅ |
| 2 | Web lint debt (P81) | Fix the 6 eslint ERRORS (2 conditional-useEffect are potential real bugs, refs-during-render, setState-in-effect, 2 unused vars) → drop `continue-on-error` on the Web Lint CI job. LIGHT: no component-test buildout (the overhaul would obsolete it). | mvp | low-med | ✅ | ✅ | ✅ | ✅ |
| 3 | Test + repo hygiene | P82: group-creating web-e2e specs clean up after themselves (afterEach API delete). P70: live-PG erasure regression test in CI (locks the Phase-1 bug class). Dead-config sweep. | mvp | low | ✅ | ✅ | ✅ | ✅ |

<!-- Exec is written by /gabe-execute: ⬜ not started, 🔄 in progress, ✅ complete -->

## Phase Details

### Phase 1 — Security hardening

```yaml
phase: 1
types: [auth, security, DB]
phase_tier: ent
prototype: false
decisions_entry: D93
```

- **Tier:** ent — touches the auth surface (rate limiting can lock real users out if misconfigured) and audit-trail integrity (a wrong trigger breaks the DSR scrub or the retention purge).
- **P59 (slowapi):** per-user/IP limits on `GET /invites/{token}`, `POST /invites/{token}/join`, and auth-sensitive endpoints. Generous limits (defense-in-depth, not traffic shaping); 429 with Retry-After; exempt health/metrics. Config-tunable.
- **P78 (migration 038):** a `BEFORE UPDATE OR DELETE` trigger on `audit_events` permitting ONLY the two governed mutations — the PII-scrub UPDATE (ip_address → NULL, nothing else changes) and DELETE via the retention definer (`app_purge_expired_audit_events` runs as the migrator/owner) — and rejecting everything else. Mirrors the 036 tombstone append-only pattern. MUST NOT break: erasure's scrub, the purge, normal INSERTs.
- **Runtime evidence (D90):** rate-limit test asserting the 429 + that the limit resets; live-PG trigger test (rogue UPDATE/DELETE rejected, the two governed mutations succeed); the full retention + erasure suites stay green.

### Phase 2 — Web lint debt (P81)

```yaml
phase: 2
types: [web, code-quality]
phase_tier: mvp
prototype: false
```

- Fix the 6 errors properly (the 2 `react-hooks/rules-of-hooks` conditional-useEffect ones need understanding the component, not mechanical suppression). Verify behavior unchanged via the existing web-e2e criticals (the 12-spec set). Then make Web Lint blocking in CI.
- **Explicitly out:** new component tests, styling, refactors — the parallel overhaul owns the web's future.

### Phase 3 — Test + repo hygiene

```yaml
phase: 3
types: [testing, tooling]
phase_tier: mvp
prototype: false
```

- P82: `afterEach` group deletion in groups*.spec.ts (the MAX_GROUPS cap stops filling); one pre-run sweep helper.
- P70: a CI live-PG erasure regression test (seed full personal surface → erase → assert per-table zero, under the real role split) — closes the accepted residual cheaply.
- Sweep: stale configs, the `/tmp` scratch patterns, anything ruff/knip-flaggable in scripts.

## Current Phase

(plan complete)

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Rate limiting locks out legitimate users (shared-IP NAT, e2e suites) | med | generous defaults + per-user (not just IP) keys + e2e suite verified against staging before promote |
| The audit trigger breaks erasure-scrub or the retention purge | high | live-PG tests for BOTH governed mutations before promote; the trigger rejects unknowns rather than silently allowing |
| Web lint "fixes" change behavior (the conditional-useEffect components) | med | web-e2e criticals re-run after the fixes |
| Parallel-lane collision (design-lab session) | low | this plan never touches design-lab/, shared/, PLAN-MOCKUPS.md; web/src changes are lint-scoped only |
