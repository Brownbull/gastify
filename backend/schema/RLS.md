# Row-Level Security — Role-Privilege Matrix

Referenced by A.13 (multi-tenancy) and A.17 (security baseline). This is the single source of truth for Postgres role grants. Privilege grants are NEVER inline in migrations — they live here and are applied by `migrations/000_roles_and_grants.sql` (regenerated from this matrix on every change, applied as a deploy-hook AFTER `alembic upgrade head`).

---

## Roles

| Role | RLS Posture | Connection Mode | Purpose |
|------|-------------|-----------------|---------|
| `app_user` | RLS-bound (subquery form) | PgBouncer session-mode | Default application connection |
| `app_etl` | RLS-bypassing | Direct (audited) | Phase E migration scripts |
| `app_admin` | RLS-bypassing | Direct (audited) | Break-glass / forensic |
| `app_anon` | No DB connection | N/A | Unauthenticated — rejected pre-routing |

---

## RLS Policy Template

```sql
-- Scope resolution subquery (planner-friendly form)
CREATE POLICY scope_read ON <table>
  FOR SELECT TO app_user
  USING (
    ownership_scope_id IN (
      SELECT ownership_scope_id
      FROM ownership_scope_members
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY scope_write ON <table>
  FOR INSERT TO app_user
  WITH CHECK (
    ownership_scope_id IN (
      SELECT ownership_scope_id
      FROM ownership_scope_members
      WHERE user_id = (SELECT auth.uid())
    )
  );
```

**Invariants:**
- Every policy has BOTH `USING` (read) and `WITH CHECK` (write)
- `RESTRICTIVE` for negative invariants; `PERMISSIVE` for positive grants (default)
- `auth.uid()` ALWAYS wrapped as `(SELECT auth.uid())` for `InitPlan` evaluation
- `current_setting()` references ALWAYS wrapped as `(SELECT current_setting(...))`
- `ownership_scope_members(user_id, ownership_scope_id)` covering index is critical

---

## Role-Privilege Matrix

### Row-Set 1: `app_user` Full Read + Scope-Bounded Write

| Table | SELECT | INSERT | UPDATE | DELETE | Notes |
|-------|--------|--------|--------|--------|-------|
| `users` | Own row only | Via JIT provision | Profile fields | DENY | |
| `ownership_scope` | Own scope | Via JIT provision | DENY | DENY | |
| `ownership_scope_members` | Own membership (covering index) | Via invitation accept | DENY | Via leave endpoint | |
| `transactions` | Scoped | Scoped WITH CHECK | Mutable fields; `user_edited_at` gated | Soft-delete (`archived_at`) only | REQ-13/SC-07 |
| `line_items` | Scoped (via transaction) | Scoped | Mutable fields | DENY | Cascade from transaction |
| `statement_lines` | Scoped | Scoped | Mutable fields | DENY | |
| `card_aliases` | Scoped | Scoped | Scoped | Scoped | REQ-09 |
| `notifications` | Own (`user_id`, personal scope) | Via scan/statement worker + service | `read_at` only (mark-read / mark-all) | Own | Phase 7 user-global feed (D78); personal-scope-bound, never group; direct `notifications_scope_isolation` policy w/ 027 fail-safe GUC form (migration 034) |
| `group_stat_tombstones` | Group scope (read under the analytics scope-swap GUC) | Via erasure / group-leave-delete (under the group GUC) | DENY | DENY (append-only void marks) | P16 Phase 1 group-stat void (D82); group-scope-bound; direct `group_stat_tombstones_scope_isolation` policy w/ 027 fail-safe GUC form (migration 035) |
| `consent_records` | Own scope | Via API path | DENY | DENY | Write-only via consent endpoint |
| `processing_register` | Own scope (read-only) | DENY | DENY | DENY | Written by backend on consent change |
| `reconciliation_matches` | Scoped | Scoped | DENY | DENY | |
| `feature_flags` | Own scope/role (read-only) | DENY | DENY | DENY | Written by `app_admin` only |

### Row-Set 2: `app_user` Write-Restricted (Worker/API-Only INSERT)

| Table | SELECT | INSERT | UPDATE | DELETE | Notes |
|-------|--------|--------|--------|--------|-------|
| `scan_event_log` | Scoped | DENY | DENY | DENY | Backend worker writes via service-role |
| `user_insight_profile` | Scoped | DENY | DENY | DENY | Worker writes |
| `insight_records` | Scoped | DENY | `dismissed_at` only via dismiss endpoint | DENY | |
| `insight_silences` | Scoped | Via silence endpoint | `revoked_at` via un-silence | DENY | |
| `scan_jobs` | Own scope | Via `/v1/scans` API | DENY | DENY | |
| `cohort_contributions` | DENY (individual rows) | DENY | DENY | DENY | Privacy-by-construction; aggregates via `/v1/analytics/cohort` with k≥20 floor |

### Row-Set 3: `app_user` DENY Everywhere

| Table | Purpose |
|-------|---------|
| `audit_events` | Write-only via API/worker |
| `idempotency_keys` | Server middleware path only |
| `rate_limit_buckets` | FastAPI middleware path only |
| `etl_runs` | Cutover-only via `app_etl` |
| `firestore_id_map` | Cutover-only via `app_etl` |

### Row-Set 4: Reference Data

All roles SELECT; only `app_admin` mutates (with auto-audit-row trigger).

| Table | Mutation Notes |
|-------|---------------|
| `currencies` | Admin-only INSERT |
| `categories` | Admin-only INSERT (frozen taxonomy per REQ-03) |
| `fx_rates` | Write-once invariant (immutable_row trigger) |
| `error_taxonomy_slugs` | Registry of A.13 error-URI slugs |

---

## `app_etl` Privileges (Phase E Only)

- SELECT all tables (cutover reads)
- INSERT all tables WITH operator audit-events row prepended
- UPSERT-shaped only; preserves `user_edited_at` on fields with non-null timestamps
- Never overwrites field where Firestore-recorded user-edit landed (REQ-13/SC-07)
- DELETE DENY everywhere (additive-only invariant)
- Session-start `audit_events` row mandatory (operator + ticket ID)

## `app_admin` Privileges

- SELECT all tables
- INSERT all tables WITH automatic audit-events BEFORE INSERT trigger
- UPDATE all tables WITH automatic audit row
- DELETE DENY on `audit_events` (append-only invariant)
- Allowed only via documented erasure path (A.17 ERASURE-POLICY)
- Every connection writes session-start audit row (operator + ticket)
- CI + observability alert on `app_admin` connection volume per day

---

## CI Gates

- `scripts/ci/check-rls-table-coverage.sh` — every table in `pg_class` mapped to a row-set above; uncovered = build failure
- `scripts/ci/check-rls-uid-wrap.sh` — un-wrapped `auth.uid()` or `current_setting('app.*')` in policy bodies = build failure
- Integration test: `test_cross_scope_denied.py` — RLS denies cross-scope reads under `app_user`
- Integration test: `test_rls_explain_index_scan.py` — EXPLAIN ANALYZE confirms Index Scan (not Seq Scan) for RLS subquery

---

## PgBouncer Pool Sizing

- Session-mode for `app_user` (mandatory for RLS + GUC)
- Default pool: 80% of Postgres `max_connections` (e.g., 100 → 80)
- Reserve 10% for `app_admin` break-glass
- Reserve 10% headroom for ETL/maintenance
- Transaction-mode pool for health-check pings and read-only reference-data lookups
- Connection-saturation scenario in A.20 performance baseline validates pool sizing

**Documented in:** [CONNECTION-POOL.md](../runbooks/CONNECTION-POOL.md)
