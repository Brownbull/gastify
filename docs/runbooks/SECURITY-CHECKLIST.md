# Security Checklist

> Pre-launch + recurring security posture for Gastify. Pairs with PRODUCTION-CHECKLIST.md
> (go/no-go) and INCIDENT-RESPONSE.md.

## Secrets
- [ ] No secrets in the repo (CI runs gitleaks). Firebase creds, `GEMINI_API_KEY`, `METRICS_API_KEY`, `DATABASE_URL` live in Railway env / secret manager only.
- [ ] Secret rotation plan documented; rotate on any suspected exposure (and revoke the old).
- [ ] `METRICS_API_KEY` set in production (the `/metrics` endpoint requires `X-Metrics-Key`).

## Transport + auth
- [ ] TLS enforced end-to-end (Railway-managed certs); no plaintext API.
- [ ] Firebase auth verified server-side (JIT-provisioned scope-of-one); tokens not logged.
- [ ] Sign-out evicts client caches (web `queryClient.clear`, mobile `clearMobileSession`) — proven in E2E.

## Multi-tenant isolation
- [ ] Postgres RLS (FORCE) on scope-bound tables keyed on `app.ownership_scope_id`, set per request in `auth.deps`.
- [ ] App-layer queries also filter by `ownership_scope_id` (defense in depth).
- [ ] Item flags / cohort eligibility are user+scope scoped (no cross-user leak) — covered by tests.

## Input + data integrity
- [ ] All inputs validated (Pydantic schemas); currency codes validated against the reference table.
- [ ] Parameterized queries only (SQLAlchemy) — no string-built SQL.
- [ ] Two-stage scan extraction (vision → text categorize) defends against prompt injection; math-reconciliation gate catches hallucinated totals.
- [ ] Plan tier constrained by DB CHECK; financial credits never go negative (atomic deduction is required before enforcement — PENDING P36).

## Rate limiting + abuse
- [ ] Rate limiting on public/auth/scan endpoints (verify the middleware/edge policy before launch).
- [ ] Scan quota degrades gracefully (`QUEUED`, no 5xx) under throttle.

## Compliance
- [ ] DSR endpoints exercised (access/rectification/erasure/portability) — see DPO-PROCEDURES.md.
- [ ] Consent + audit events recorded with ip/ua; compliance metrics (`audit_event_*`) on `/metrics`.
- [ ] Retention job scheduled (`run_retention.py`).
- [ ] Error responses do not leak stack traces / internal data to clients.

## Dependencies
- [ ] CI SCA (pip-audit) green or with tracked, justified ignores (e.g. PENDING P26 PyJWT).
- [ ] Lockfiles committed (`uv.lock`, `package-lock`); pinned.

## Deferred (operational, launch staging)
- Live rate-limit load test; paid-Gemini tier pre-commit; penetration smoke; secret-rotation rehearsal.
