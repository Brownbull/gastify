# Erasure Policy Runbook

Referenced by A.17 §6. Right-to-erasure implementation and audit chain.

## Erasure Flow

`POST /v1/me/erasure` triggers:

1. Write `audit_events` row: `event_type='erasure_executed'`, `scope_id_hash=HMAC(scope_id, erasure_key)`, `salt_destroyed_at=NOW()`, `operator=user_uid`
2. Purge PII from operational tables (transactions, line_items, scan_jobs, etc.)
3. Anonymize `audit_events` rows: replace actor fields with tombstone using per-user salt
4. Destroy per-user salt (makes tombstone irreversible)
5. Delete `ownership_scope_members` row (scope membership)

**Order matters:** audit row BEFORE salt destruction. Otherwise erasure can be claimed-but-not-performed.

## Audit Preservation (Art 30)

`audit_events` rows are NEVER deleted. Post-erasure:
- Actor fields contain tombstoned values (salt-encrypted, but salt is destroyed)
- `event_type` and `created_at` remain readable
- The `erasure_executed` row proves the erasure happened
- HMAC hash is non-reversible to scope identity (separate long-lived key)

## Integration Tests

| Test | Asserts |
|------|---------|
| `test_erasure_operational_404` | Operational reads return 404 post-erasure |
| `test_erasure_audit_preserved` | `audit_events` rows still exist with tombstoned actor |
| `test_erasure_tombstone_irreversible` | Salt cannot decrypt the tombstone after destruction |
| `test_erasure_audit_chain` | `erasure_executed` row exists with correct hash |

## Cohort Revocation Reconciliation

When consent is revoked via `PUT /v1/me/consent`:

1. `cohort_contributions.withdrawn_at` set to NOW()
2. Next nightly `pg_cron` recompute:
   - Excludes rows where `withdrawn_at IS NOT NULL`
   - Excludes rows where `is_sensitive = TRUE`
   - Enforces `k ≥ 20` floor at SELECT time
3. Aggregation NEVER reads withdrawn rows into intermediate state

**Integration test:** Exercises opt-in → aggregate → revoke → recompute-excludes → verify-not-included.

## Implementation Status

- [ ] Erasure endpoint
- [ ] Per-user salt generation and storage
- [ ] Salt destruction procedure
- [ ] Audit-events anonymization
- [ ] Cohort revocation recompute logic
- [ ] Integration tests (4 tests above)
