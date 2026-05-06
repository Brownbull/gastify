# Security & Compliance Baseline — A.17

Phase A prereq A.17. Consolidates security decisions spanning auth, file uploads, rate limits, secrets, CORS, and erasure. Without this, each track and each RALPH iteration re-decides security-shaped questions.

**Sub-deliverable count canary:** 9 sub-deliverables enumerated. Adding a 10th requires security-wave review. Three-test admission criterion: (a) security policy spanning ≥2 tracks; (b) needs ONE owner runbook; (c) single locked policy decision.

---

## 1. Auth Boundary Contract

**Locked policy:** Token verification at every FastAPI dependency using Firebase Admin SDK.

**JIT provisioning:** On first authenticated request, idempotently insert `users` + `ownership_scope` (scope-of-one) + initial credit balance under a single transaction with a uniqueness constraint on `firebase_uid`.

**JWKS cache:**
- TTL: max 1 hour (Firebase rotates keys ~daily)
- Force-refresh: any token with `kid` not in cache triggers ONE re-fetch (rate-limited to 1/min per process to prevent DoS via forged `kid`)
- Cache miss latency: ~50ms for first request after rotation; subsequent requests hit warm cache

**Streaming token expiry:** SSE + WebSocket connections re-validate Bearer token at most every 5 minutes. On revocation, server closes with structured close frame. Mobile WS reconnects with fresh token. Policy is symmetric across both transports (SCOPE §9.1 lines 347-349).

**Owner runbook:** [AUTH-BOUNDARY.md](../runbooks/AUTH-BOUNDARY.md)

---

## 2. File-Upload Defenses

**Locked policy:** Magic-byte type validation (libmagic) — never trust `Content-Type`.

**Size limits:**
- Receipts: ≤10MB JPEG/PNG/HEIC
- Single-page PDF receipts: ≤5MB
- Statements: ≤25MB PDF

**Rejections:**
- SVG explicitly rejected (XSS surface)
- Filenames never echoed to client — server-issued opaque identifier only

**PDF handling:** Parsing in sandboxed worker with seccomp-bpf or equivalent isolation. CVE-watch on chosen PDF library (poppler / pdfminer / pdfplumber) feeds SCA pipeline.

**Owner runbook:** [UPLOAD-SECURITY.md](../runbooks/UPLOAD-SECURITY.md)

---

## 3. Rate Limiting + Brute-Force Posture

**Locked policy:** Token-bucket rate limiter at FastAPI middleware. Per-user-token + per-IP buckets.

**Defaults (configurable per-endpoint):**
- Authenticated mutations: 60/min
- Scan submissions: 12/min (matches SCOPE §9.2 `GEMINI_SAFETY_LIMIT`)
- Unauthenticated paths: 30/min/IP

**Response format:** RFC 7807 problem+json + `Retry-After` header.

**Auth brute-force:** Firebase Auth handles credential stuffing client-side. Backend applies 5/min/IP cap on token-verify-failure to slow forgery probing.

**Backing store:** Postgres `rate_limit_buckets` table (not in-process state — multi-worker uvicorn would silently bypass). FastAPI middleware atomically `UPDATE ... RETURNING` to debit + refill. Latency: ~2-5ms per request on Railway internal Postgres. Redis backing deferred to Decisions-still-open (swap if scan throughput crosses 1k/min post-MVP).

**Owner runbook:** [RATE-LIMIT.md](../runbooks/RATE-LIMIT.md)

---

## 4. CORS + Origin Policy

**Locked policy:** Allow-list per release channel.

**Allowed origins:**
- `https://app.gastify.cl` (production)
- `https://staging.gastify.cl` (staging)
- `http://localhost:5174` (development)

**Auth posture:** Bearer-only (no cookies → no CSRF concern; revisit if cookie auth ever lands).

**SSE origin handshake:** `/v1/scans/$scanId/events` validates `Origin` header against allow-list at handshake. Mismatch returns `403 errors/auth.forbidden` BEFORE opening the stream. Also validates requesting `ownership_scope_id` matches scope of requested `scanId` (defense-in-depth via RLS on `scan_event_log` reads).

**WebSocket:** Origin check matches the same allow-list.

**Owner runbook:** [CORS-POLICY.md](../runbooks/CORS-POLICY.md)

---

## 5. Secret Management

**Locked policy:** PaaS env vars (Railway secrets) for MVP. Each secret has explicit rotation cadence + owner.

**Secret inventory:**

| Secret | Rotation Cadence | Owner |
|--------|-----------------|-------|
| Firebase Admin SDK service-account JSON | Yearly or on suspected compromise | Backend deploy role |
| Gemini API key | Quarterly | Backend deploy role (never reaches frontend — R14) |
| DB password | PaaS-managed; rotate on staff change | Railway managed Postgres |
| FX provider API key | Yearly | Backend deploy role |
| Transactional email key | Yearly | Backend deploy role |

**CI gates:**
- gitleaks / trufflehog on every PR commit
- Frontend build asserts no `VITE_*` env vars match `_KEY` patterns (no secrets in frontend output)

**Owner runbook:** [SECRETS.md](../runbooks/SECRETS.md)

---

## 6. Erasure × Audit-Events Reconciliation

**Locked policy:** Right-to-erasure (POST `/me/erasure`) purges PII from operational tables, anonymizes `audit_events` rows in-place via per-user salt destruction.

**Erasure guarantees (integration-tested):**
- (a) Operational reads return 404 post-erasure
- (b) `audit_events` rows still exist with tombstoned actor (Art 30 retention)
- (c) Salt cannot decrypt the tombstone

**Salt destruction audit:** Erasure path writes a final `audit_events` row with `event_type='erasure_executed'` carrying `(scope_id_hash, salt_destroyed_at, operator)` BEFORE destroying the salt. Hash is HMAC of scope ID under a separate long-lived key (non-reversible to scope identity).

**Cohort revocation reconciliation (REQ-27/SC-11):** "Revocation = immediate recompute." Nightly cohort aggregation (`pg_cron`) enforces:
- `withdrawn_at IS NULL` (consent honored at compute time)
- `is_sensitive = FALSE` (sensitive-category suppression per SCOPE §10.3)
- `k ≥ 20` floor at SELECT time (privacy floor per SC-11)

Aggregation NEVER reads withdrawn or sensitive rows into intermediate state. Integration test exercises full opt-in → aggregate → revoke → recompute-excludes → aggregate-no-longer-includes end-to-end.

**Owner runbook:** [ERASURE-POLICY.md](../runbooks/ERASURE-POLICY.md)

---

## 7. Image-Prompt-Injection Two-Stage Lock

**Locked policy:** Receipt extraction pipeline MUST be two-stage (REQ-02 / SC-06):
- **Stage 1:** Vision call → structured raw extraction
- **Stage 2:** Text-only call → taxonomy mapping

Single-prompt extractor is architecturally forbidden.

**A.13 ↔ A.17 layering:** A.13 owns the architectural commitment (pipeline must be two-stage). A.17 owns the operational defense (pytest gate + runbook). Removing either is a regression.

**Enforcement:**
- pytest: `backend/tests/security/test_two_stage_distinct.py` asserts stage-1 and stage-2 are two distinct model calls with no shared context
- CVE-watch on the vision LLM provider

**Owner runbook:** [WORKER-PIPELINE.md](../runbooks/WORKER-PIPELINE.md)

---

## 8. SCA / Supply-Chain

**Locked policy:** `pip-audit` + `npm audit` (or `osv-scanner`) gate every PR. CRITICAL/HIGH advisories block merge.

**Lockfile discipline:** Diffs to `uv.lock` and `package-lock.json` require explicit reviewer approval.

**Dependency updates:** Dependabot or Renovate scheduled weekly. Security-only updates auto-PR.

**Owner artifact:** CI pipeline (A.18) + `.pre-commit-config.yaml`

---

## 9. Threat-Model Checklist

Lightweight STRIDE table covering the primary attack surfaces:

| Threat | Category | Defense | Status |
|--------|----------|---------|--------|
| Spoofed Firebase tokens | Spoofing | Firebase Admin SDK verify + JWKS cache (§1) | Locked |
| Replayed mutations | Replay | Idempotency-Key (A.13 §1) | Locked |
| Scan-credit double-debit | Tampering | TX-bound credit deduction + idempotency (A.13 §1) | Locked |
| RLS bypass via `auth.uid()` join misuse | Elevation | `(SELECT auth.uid())` wrap + covering index (A.13 §4) | Locked |
| Image prompt injection | Tampering | Two-stage pipeline lock (§7) | Locked |
| Statement PDF parser RCE | Tampering | Sandboxed worker + CVE-watch (§2) | Locked |
| ETL operator over-privilege | Elevation | `app_etl` role: UPSERT only, audit row mandatory (A.13 §4) | Locked |
| Secret leak via frontend bundle | Disclosure | No `_KEY` patterns in `VITE_*` vars (§5) | Locked |
| Log PII leakage | Disclosure | structlog JSON format; PII fields excluded from log output | Locked |
| Audit-log tampering | Tampering | `audit_events` append-only + `app_admin` DELETE denied (A.13 §5) | Locked |

Each row maps to a defense in this doc or A.13. Gaps escalate to `.kdbp/PENDING.md`.

---

## A.13 ↔ A.17 Operational Defense Table

Four shared concerns where A.13 owns the architecture and A.17 owns the operational defense:

| Concern | A.13 Architectural Commitment | A.17 Operational Defense | CI Gate |
|---------|-------------------------------|--------------------------|---------|
| Image-prompt-injection | Pipeline MUST be two-stage | pytest asserts distinct model calls | `test_two_stage_distinct.py` |
| Idempotency | Every mutation carries `Idempotency-Key` | Credit TX bound to idempotency-key insert | `test_credit_no_double_debit.py` |
| RLS / multi-tenancy | Authorization keys off `ownership_scope_id` | Three-role split; role-privilege matrix | `test_cross_scope_denied.py` |
| Erasure × audit | `audit_events` survives erasure | Salt destruction audited; tombstone irreversible | `test_erasure_tombstone_irreversible.py` |

CI gate at A.18 (`scripts/ci/check-a13-a17-layering.sh`) cross-references both files. Removing either layer in any row is a regression.

---

## Compliance Infrastructure Status

| Jurisdiction | Coverage | Owner |
|-------------|----------|-------|
| Law 21.719 (Chile) | Day-1 | A.10 (storage) + A.9 (endpoints) + A.17 (reconciliation) |
| GDPR | Day-1 | Same + Art 17 erasure + Art 30 audit retention |
| PIPEDA (Canada) | Day-1 | Covered by GDPR-equivalent protections |
| CCPA/CPRA (California) | Day-1 | Covered by GDPR-equivalent protections |

Storage tables (`consent_records`, `processing_register`) owned by A.10. Endpoints (access, rectification, erasure, portability) owned by A.9. Reconciliation policies owned here in A.17.
