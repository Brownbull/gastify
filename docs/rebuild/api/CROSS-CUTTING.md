# Cross-Cutting Concerns ADR — A.13

Phase A prereq A.13. Pins cross-cutting concerns that span all three tracks (frontend, backend, data migration). Without one home, each concern leaks into per-screen, per-endpoint, per-script reinvention.

**Concern count canary:** 9 concerns enumerated. Adding a 10th requires architect-wave review. Three-test admission criterion: (a) truly cross-cutting (≥2 tracks); (b) needs ONE owner artifact; (c) has ONE locked decision. Failing any = the concern belongs in the relevant track's prereq.

---

## 1. Idempotency

**Locked decision:** Every mutation accepts an `Idempotency-Key` header. Client generates UUIDv7 per mutation call. Server stores the key in `idempotency_keys` table (A.10) alongside the response.

**Fingerprint algorithm:** `request_fingerprint = sha256(method || ' ' || path || ' ' || canonical_json(body))` where `canonical_json` is RFC 8785 (JSON Canonicalization Scheme — sorted keys, no insignificant whitespace, fixed number formatting). Stored in `idempotency_keys.request_fingerprint`.

**Replay semantics:**
- Same key + same fingerprint → cached `(response_status, response_body)` returned verbatim
- Same key + different fingerprint → `409 Conflict` with `errors/idempotency.conflict` slug
- Same key while original still processing → `409` with `errors/idempotency.in_flight` slug; client retries with backoff (≤3 attempts: 200ms/400ms/800ms)

**Scan-credit atomicity:** Scan-credit deduction is bound to the same DB transaction as scan-job enqueue + idempotency-key insert. A retry never produces a second debit.

**TTL:** Keys expire 24h after creation via partial-index sweep (A.10). Replay against an expired key = fresh request (new debit). Frontend mutation hooks must retry within TTL or generate a new UUIDv7.

**Owner artifact:** OPENAPI-SKETCH §idempotency + A.10 §`idempotency_keys`

---

## 2. Error Taxonomy

**Locked decision:** RFC 7807 `application/problem+json` envelope from all FastAPI error responses. OpenAPI client maps to a single `ApiError` discriminated union. Frontend ErrorBoundary + Toast pattern reads off the union.

**URI namespace:** `https://gastify.app/errors/<slug>`

**Registered slugs (15):**

| Slug | HTTP Status | Description |
|------|-------------|-------------|
| `validation.field` | 422 | Per-field validation errors (includes `errors[]` breakdown) |
| `validation.body` | 422 | Whole-body parse failure |
| `auth.unauthenticated` | 401 | Token missing/invalid/expired |
| `auth.forbidden` | 403 | RLS / scope-membership denial |
| `auth.token_expired` | 401 | Hint that frontend should refresh + retry |
| `rate_limit.exceeded` | 429 | See `Retry-After` header |
| `idempotency.conflict` | 409 | Replayed key with different request fingerprint |
| `idempotency.in_flight` | 409 | Concurrent replay before original completes |
| `domain.scan.credit_insufficient` | 402 | REQ-01 debit guard |
| `domain.scan.requires_review` | 200 | Terminal scan event; carries reason |
| `domain.scan.failed` | 500 | Sub-types: provider_error, timeout, invalid_image, prompt_injection_blocked |
| `domain.user_edit_protected` | 409 | REQ-13/SC-07 overwrite blocked by `user_edited_at` |
| `domain.cohort.k_floor` | 204 | k-anonymity floor not met; surfaced for debugging |
| `infra.upstream_unavailable` | 503 | Gemini / FX / Firebase Auth degradation |
| `infra.maintenance` | 503 | Includes `Retry-After` header |

**Slug count canary:** 15 registered. Adding a 16th requires communication-wave review. Three-test admission: (a) wire-shape error case, not feature-internal; (b) spans ≥2 endpoints or ≥2 client surfaces; (c) ONE locked HTTP status + ONE locked slug name.

**CI gate:** A.18 gate #6 enumerates registered slugs; a new `errors/<slug>` URI not in the registry fails the build. Runtime registry mirror in `error_taxonomy_slugs` reference data table.

**Owner artifact:** OPENAPI-SKETCH §errors + `frontend/src/shared/errors/`

---

## 3. Observability + Tracing

**Locked decision:** Request ID (`X-Request-Id` header) propagated browser → API → worker → DB log lines. Per-scan metrics per REQ-21.

**Bootstrap decisions:**
- **Logging:** `structlog` (backend, JSON to stdout) + browser-native `console` with ErrorBoundary upload path (frontend)
- **Metrics backend:** PaaS-integrated metrics (Railway) + `audit_events`-keyed counters in Postgres for MVP. Defer Prometheus/Grafana/Datadog until paid-user volume justifies it
- **Trace propagation:** OpenTelemetry-compatible `traceparent` header alongside `X-Request-Id`. No collector Day-1 — logs carry the trace ID
- **Frontend error reporting:** Sentry Browser SDK with source-map upload + Sentry server-side for backend (free tier through MVP)
- **Alerting:** Webhook to dedicated Discord/Slack incident channel + email fallback. PagerDuty deferred to paid-user phase

**Day-1 dashboards (A.20 captures baselines):**
- LLM cost burn rate (REQ-21)
- Scan P95 latency per stage (SC-01)
- 5xx rate per route
- Scan-credit balance health
- RLS query plan health (Index Scan vs Seq Scan ratio per A.10)
- DB connection-pool utilization
- ETL drift rate during cutover (Phase E)

**Owner artifact:** `backend/observability/` + `docs/rebuild/api/OBSERVABILITY.md` + frontend interceptor in api-client

---

## 4. Multi-Tenancy / Authorization

**Locked decision:** `ownership_scope_id` on every user-owned row (REQ-15). Row-Level Security (RLS) policies on all tables. One role-privilege matrix in `backend/schema/RLS.md`. ETL maps Firestore user → scope-of-one.

**Roles:**

| Role | RLS Posture | Purpose |
|------|-------------|---------|
| `app_user` | RLS-bound (subquery form) | Default application connection |
| `app_etl` | RLS-bypassing | Phase E migration scripts (audited connection) |
| `app_admin` | RLS-bypassing | Break-glass / forensic (auto-audit every connection) |
| `app_anon` | No DB connection | Unauthenticated requests rejected pre-routing |

**RLS implementation notes:**
- Policies key off `ownership_scope_id`, NOT `auth.uid()` directly
- Scope resolved via: `(SELECT ownership_scope_id FROM ownership_scope_members WHERE user_id = (SELECT auth.uid()))`
- `(SELECT auth.uid())` wrap forces `InitPlan` evaluation (once per query, not per-row) — 10-100x faster on >100K rows
- Every policy has BOTH `USING` (read) and `WITH CHECK` (write)
- `RESTRICTIVE` policies for negative invariants; `PERMISSIVE` for positive grants
- `ownership_scope_members(user_id, ownership_scope_id)` covering index is critical (verified at migration time)
- GUC alternative for hot paths: `SET LOCAL app.current_scope_id = '...'` (reserved for documented hot paths; A.21 staging smoke-tests GUC portability)

**Table coverage — 4 exhaustive row-sets:**
1. **`app_user` full read + scope-bounded write:** `users`, `ownership_scope`, `ownership_scope_members`, `transactions`, `line_items`, `statement_lines`, `card_aliases`, `consent_records`, `processing_register`, `reconciliation_matches`, `feature_flags`
2. **`app_user` write-restricted (worker/API-only INSERT):** `scan_event_log`, `user_insight_profile`, `insight_records`, `insight_silences`, `scan_jobs`, `cohort_contributions`
3. **`app_user` DENY everywhere:** `audit_events`, `idempotency_keys`, `rate_limit_buckets`, `etl_runs`, `firestore_id_map`
4. **Reference data (all SELECT, admin-only mutate):** `currencies`, `categories`, `fx_rates`, `error_taxonomy_slugs`

**CI gate:** A.18 `scripts/ci/check-rls-table-coverage.sh` cross-references `pg_class` against the enumeration; uncovered table fails the build. A.18 `scripts/ci/check-rls-uid-wrap.sh` checks for un-wrapped `auth.uid()` in policy bodies.

**PgBouncer pool sizing:** Session-mode for `app_user` (mandatory for RLS); default pool = 80% of `max_connections`; 10% reserved for `app_admin`; 10% headroom for ETL. Transaction-mode pool for `app_anon` health-check pings.

**Owner artifact:** A.10 schema sketch + `backend/schema/RLS.md` + `backend/runbooks/CONNECTION-POOL.md`

---

## 5. Audit Log

**Locked decision:** Append-only `audit_events` table for sensitive operations: consent change, scope membership change, sign-out, erasure request, admin break-glass session start, ETL session start. Required by Law 21.719 + GDPR Art 30.

**Invariants:**
- `audit_events` is write-once (immutable_row trigger per A.10)
- Partitioned monthly by `created_at` (A.10)
- `app_admin` DELETE denied (append-only)
- Every `app_admin` connection auto-generates a session-start audit row (operator + ticket ID)
- Every `app_etl` connection auto-generates a session-start audit row

**Owner artifact:** A.10 schema sketch §`audit_events`

---

## 6. Feature Flags / Kill-Switches

**Locked decision:** DB-backed `feature_flags` table + `useFeatureFlag(name)` hook on the frontend. No external service (LaunchDarkly is overkill for solo dev).

**Required flags:**
- (a) Gate new screens during cutover dual-write
- (b) Scan kill-switch if Gemini cost spikes (REQ-21 metrics inform)
- (c) Postgres-reads vs Firestore-reads toggle for emergency rollback during Phase E

**Owner artifact:** A.15 (full spec) + A.10 §`feature_flags` + `.kdbp/DECISIONS.md`

---

## 7. Async Streaming Contract

**Locked decision:** `scan_event` 7-state union transmitted via SSE at `/scans/:scan_id/events` (primary) and WebSocket (fallback). Both transports honor a resumable `Last-Event-Id` cursor backed by `scan_event_log` table.

**Event states:** queued → picked_up → llm_start → llm_end → (reconciling →) completed | requires_review | failed

Three terminal states: `completed`, `requires_review`, `failed`.

**Event envelope:** Every event carries `(scanId, eventId, sequence, ts)`. REQ-21 metrics travel on `llm_end` / `completed` / `requires_review` / `failed` payloads.

**Frontend contract:** `scanStateMachine.ts` is a derived view of the wire stream, not source-of-truth. The wire union is authoritative.

**Owner artifact:** OPENAPI-SKETCH §scan-events + A.9 §recovery

---

## 8. Image-Prompt-Injection Two-Stage Discipline

**Locked decision:** Defense against image-embedded prompt injection (REQ-02 / SC-06) lives in the split between:
- **Stage 1:** Vision call returning structured raw extraction (receipt text → structured items)
- **Stage 2:** Text-only call mapping items to taxonomy (structured items → categorized items)

The two stages MUST be distinct model calls. RALPH iterations cannot collapse them into one prompt for "efficiency."

**Enforcement:**
- A.17 owns the policy doc
- pytest gate asserts the two model calls are distinct (import/call-graph check)

**Owner artifact:** OPENAPI-SKETCH §scan-workflow + `backend/runbooks/PROMPT-INJECTION.md` (A.17)

---

## 9. Insight Pipeline Cadence

**Locked decision:** Insight generators stay deterministic (pure functions, NOT Gemini-driven). Gemini is reserved for receipt extraction only.

**Cadence:**
- **Hot path (per-transaction):** On `transactions.write`, async worker picks one insight candidate via phase-based priority (WEEK_1 → WEEKS_2_3 → MATURE), writes `insight_records` row, emits cache invalidation. Fire-and-forget — `transactions.write` NEVER blocked. P95 ≤200ms server-side.
- **Cold path (nightly batch):** `pg_cron` recomputes pattern-detection insights (multi-transaction generators, rolling windows), writes to `insight_records` with future-dated `shown_at` for staggered surfacing. Excludes sensitive-category rows at SELECT time (REQ-11). Excludes silenced scopes via `insight_silences`.

**Read path:** Frontend reads `/v1/insights/profile` + `/v1/insights/feed` (all pre-computed). Dashboard render NEVER gated on insight compute (SC-02 protected). `204 No Content` = cold-start empty state. `useInsightStore` becomes display-only (URL search params for state per URL-as-truth pattern).

**REQ-21 cost invariant:** Insight compute logs `audit_events` row with `event_type='insight_compute'` + duration_ms + records_written. Insights never call Gemini → LLM cost = zero by construction.

**CI gate:** Grep over `backend/insights/` for `gemini|openai|anthropic` imports — fail if found (pinned to `.kdbp/DECISIONS.md`).

**Owner artifact:** `docs/rebuild/api/INSIGHT-PIPELINE.md` + `backend/insights/` + frontend `useInsightStore` (display-only)

---

## Sequencing DAG

| Concern | Depends On | Unblocks |
|---------|-----------|----------|
| 1. Idempotency | A.10 (schema), A.9 (wire) | A.17 (rate-limit atomicity) |
| 2. Error taxonomy | A.9 (slugs) | A.14 (retry policy), A.18 (CI gate) |
| 3. Observability | — | A.20 (baseline dashboards) |
| 4. Multi-tenancy | A.10 (schema) | A.17 (erasure policy), A.18 (RLS CI gates) |
| 5. Audit log | A.10 (schema) | A.17 (erasure reconciliation) |
| 6. Feature flags | A.15 (spec) | Phase E (cutover toggle) |
| 7. Streaming contract | A.9 (wire) | Frontend scan UI |
| 8. Prompt injection | — | A.17 (policy doc) |
| 9. Insight pipeline | A.10 (schema), A.9 (wire) | Frontend insights UI |

---

## Decisions Still Open

1. **Cache-Tags delivery mechanism** — Response header (`Cache-Tags: [...]`) vs response body field. Header is cleaner for CDN compat; body field is simpler to type in OpenAPI. Decide at A.14 authoring time.
2. **Sentry vs self-hosted error tracking** — Free tier through MVP; revisit at paid-user volume.
3. **`pg_cron` vs application-level scheduler for nightly batch** — SCOPE §9.6 line 390 says `pg_cron` primary; confirm Railway supports it, else fall back to application cron.
