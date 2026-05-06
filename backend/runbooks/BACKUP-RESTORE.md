# Backup & Restore Runbook — A.16

Phase A prereq A.16. Defines PostgreSQL backup cadence, PITR window, restore drill requirements, retention, and encryption. SCOPE §9.6 line 388 mandates "managed relational DB with backups" but doesn't define cadence.

Cross-references: A.10 (schema), A.17 (security baseline), Phase E (cutover requires tested restore).

---

## Backup Strategy

### PaaS-Managed Automated Backups (Railway / Supabase / Neon)

| Phase | Cadence | PITR Window | Rationale |
|-------|---------|-------------|-----------|
| Pre-cutover (dev/staging) | Daily | 7 days | Standard dev cadence |
| Cutover window (Phase E) | Hourly | 7 days | Dual-write window has highest data-loss risk |
| Post-soak (production) | Daily | 14 days | Steady-state; hourly is cost-excessive for solo |

PITR (Point-in-Time Recovery) uses WAL archiving — restore to any second within the window.

### Backup Contents

- Full PostgreSQL cluster (all tables, indexes, sequences, RLS policies, functions, triggers)
- Alembic migration history (`alembic_version` table)
- NOT included: object storage (receipt images) — backed up separately via PaaS blob store versioning
- NOT included: Firebase Auth user records — Firebase manages its own redundancy

---

## Retention Schedule

| Backup type | Retention |
|-------------|-----------|
| Hourly (cutover only) | 7 days rolling |
| Daily | 30 days rolling |
| Weekly snapshot | 90 days |
| Pre-cutover snapshot | Indefinite (manual, tagged `pre-cutover-YYYY-MM-DD`) |
| Post-cutover snapshot | Indefinite (manual, tagged `post-cutover-YYYY-MM-DD`) |

---

## Encryption

- **At rest:** PaaS-managed AES-256 encryption (Railway / Supabase / Neon all provide this by default).
- **In transit:** TLS 1.2+ for all database connections (enforced by PaaS; `sslmode=require` in connection string).
- **Backup encryption:** PaaS-managed; backups inherit the at-rest encryption of the underlying storage.

---

## Restore Drill

**Gate Cutover-Ready precondition:** at least ONE successful restore drill must complete before Phase E cutover begins.

### Drill Procedure

1. **Create a fresh PaaS database instance** (ephemeral, tagged `restore-drill-YYYY-MM-DD`).
2. **Restore from the latest daily backup** into the ephemeral instance.
3. **Run validation checks:**
   - `alembic check` — migration history intact, no pending migrations.
   - `SELECT count(*) FROM users` — row count matches source ±0 (exact for daily, ±hourly-writes for PITR).
   - `SELECT count(*) FROM transactions` — same.
   - `SELECT count(*) FROM audit_events` — same (append-only table must be complete).
   - Run `backend/tests/integration/` suite against the restored instance — all pass.
4. **Record drill result** in `audit_events` on the production instance:
   ```json
   { "event_type": "restore_drill", "payload": { "source_backup": "...", "target_instance": "...", "row_counts": {...}, "tests_passed": true, "drill_date": "..." } }
   ```
5. **Tear down** the ephemeral instance.

### Drill Cadence

- Pre-cutover: at least 1 drill (Gate Cutover-Ready blocker).
- Post-cutover: quarterly (calendar reminder; not automated).

---

## Disaster Recovery Scenarios

| Scenario | Recovery path | RTO target | RPO target |
|----------|--------------|------------|------------|
| Accidental table drop | PITR to pre-drop timestamp | <1h | seconds (PITR) |
| Corrupted migration | PITR to pre-migration + re-apply fixed migration | <2h | seconds |
| Full instance loss | Restore latest daily backup to new instance | <4h | ≤24h (daily) / ≤1h (cutover hourly) |
| Data breach / compromise | PITR to pre-breach + rotate all secrets (A.17) | <4h | seconds |
| Cutover rollback | Flip `datasource.postgres=false` (A.15) + Firestore still has data | <5min | 0 (Firestore is still writable) |

---

## Object Storage Backups

Receipt images and statement PDFs live in PaaS object storage (Railway volume or S3-compatible).

- **Versioning:** enabled on the storage bucket. Deleted/overwritten objects recoverable for 30 days.
- **Cross-region replication:** not required for MVP (single-region deployment per SCOPE §9.6).
- **Backup cadence:** PaaS-managed; no additional scripts needed.

---

## Monitoring

- PaaS backup job health: alert if daily backup fails (PaaS webhook → alerting channel).
- WAL lag: alert if WAL archiving falls behind >10min (indicates PITR gap).
- Storage usage: alert at 80% of PaaS storage quota.
