# Data Protection Officer (DPO) Procedures

> Four-jurisdiction compliance: Law 21.719 (CL), GDPR (EU), PIPEDA (CA), CCPA/CPRA (US-CA).
> Operational procedures for servicing data-subject rights and consent governance.

## Data-subject rights (DSR) — how to service each

All four rights are self-service via authenticated endpoints under `/api/v1/privacy`
and `/api/v1/consent`; every action writes an `audit_events` row and increments an
`audit_event_*` metric (queryable on `/metrics`).

| Right | Endpoint | Backed by |
|-------|----------|-----------|
| Access (GDPR 15 / 21.719 / PIPEDA / CCPA) | `GET /privacy/data-access` | profile + consents + txn count |
| Rectification (GDPR 16 / CPRA) | `POST /privacy/rectification` | profile field updates (currency validated) |
| Erasure (GDPR 17 / CCPA) | `POST /privacy/erasure` | anonymize profile/txns/items/images + revoke consents (soft-delete per D4) |
| Portability (GDPR 20 / CCPA) | `GET /privacy/portability` | machine-readable JSON export (≤10k txns, truncation flagged) |
| Consent withdrawal (GDPR 7(3)) | `POST /consent/{purpose}/revoke` | sets `withdrawn_at` (distinct from system revocation) |
| Processing register | `GET /consent/processing-register` | the declared purposes + legal basis + retention |
| Audit trail | `GET /consent/audit` | the caller's own audit events |

**Erasure is soft-delete (anonymize-in-place), not hard-delete** — per DECISIONS D4,
the audit trail must survive for the legal window. Erasure also propagates: it revokes
all consents and excludes the user from cohort/AI surfaces (`consent_propagation`).

## Consent governance
- Consent is per-purpose (`receipt_scanning`, `analytics`, `marketing`, `data_sharing`, `ai_training`), each with a legal basis + jurisdictions in `processing_register`.
- Cohort benchmarking (P9) gates on live `data_sharing` consent; revocation is honored on the next recompute (no cached-cohort leak).
- `withdrawn_at` distinguishes a user-initiated GDPR Art 7(3) withdrawal from a system revocation during erasure — use it when reporting withdrawal counts to a regulator.

## Retention
- Declared per-purpose in `processing_register.retention_period`.
- Enforcement: `scripts/ops/run_retention.py` (scheduled) purges transient scan jobs (>90d, terminal only) + audit events past the 6-year window. The 7-year `receipt_scanning` retention governs the **financial Transaction**, which is anonymized (never purged).

## Regulator / DSR request intake (manual path)
1. Verify the requester's identity against the authenticated account.
2. Most requests are self-service (above). For a manual request, an operator with scope access runs the same endpoints on the user's behalf.
3. Record the request + outcome; the endpoints already log `audit_events`.
4. SLA: GDPR/Law 21.719 = 30 days; CCPA = 45 days. Acknowledge within 72h.

## Known limitations (MVP)
- No legal-hold mechanism in the schema (retention is time-based only) — D4, revisit at Enterprise scale.
- DSR endpoints are scope-of-one today; household/shared-scope DSR is a future concern.
