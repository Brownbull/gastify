# PostgreSQL Schema Sketch — A.10

Phase A prereq A.10. Defines the Day-1 PostgreSQL schema that receives Firestore-migrated data and supports the full-pivot FastAPI backend. This document is the single source of truth for schema conventions, table definitions, indexing strategy, partitioning strategy, and architectural primitives.

**Ninth consolidation anchor** per architect wave 3. Canary value: **13 architectural primitives**.

## Table of Contents

1. [Schema Conventions](#1-schema-conventions)
2. [Reference Tables](#2-reference-tables)
3. [User & Auth Tables](#3-user--auth-tables)
4. [Transaction Tables](#4-transaction-tables)
5. [Mapping Tables](#5-mapping-tables)
6. [Scan Tables](#6-scan-tables)
7. [Reconciliation Tables](#7-reconciliation-tables)
8. [Insights & Analytics Tables](#8-insights--analytics-tables)
9. [Compliance & Audit Tables](#9-compliance--audit-tables)
10. [Infrastructure Tables](#10-infrastructure-tables)
11. [Architectural Primitives](#11-architectural-primitives)
12. [Indexing Strategy](#12-indexing-strategy)
13. [Partitioning Strategy](#13-partitioning-strategy)
14. [Firestore → PostgreSQL Migration Map](#14-firestore--postgresql-migration-map)

---

## 1. Schema Conventions

Nine universal rules. Every Day-1 table must comply.

### C1. Money as integer minor units (REQ-17 / SC-09)

All monetary columns suffixed `_minor`. Type `BIGINT NOT NULL`. Currency reference table `currencies` seeded with ISO-4217 exponents (CLP=0, USD=2, EUR=2, GBP=2, CAD=2, MXN=2, BRL=2, ARS=2, PEN=2, COP=2). Application-level validators + DB `CHECK` constraints reject non-integer money writes. No `NUMERIC(14,2)` for money anywhere.

```sql
-- Example: transaction total
total_minor      BIGINT NOT NULL,  -- 15990 CLP = 15990 (exponent 0)
amount_usd_minor BIGINT NULL,      -- USD shadow: $21.50 = 2150 (exponent 2)
```

### C2. `user_edited_at` per editable field (REQ-13 / SC-07)

Every user-editable field on mutable tables carries a companion `{field}_user_edited_at TIMESTAMPTZ NULL`. Automation (re-categorization, reconciliation, cohort aggregation) must check `user_edited_at IS NOT NULL` and skip those fields. Enforcement: service layer + regression tests.

```sql
-- Example: transaction merchant
merchant         TEXT NOT NULL,
merchant_user_edited_at TIMESTAMPTZ NULL,
```

### C3. `ownership_scope_id` on every user-owned row (SC-07 / SC-08)

Every user-owned table has `ownership_scope_id UUID NOT NULL REFERENCES ownership_scopes(id)`. RLS policies key off `ownership_scope_id`, never `user_id` directly. This enables household-sharing and future multi-user scopes without schema changes.

### C4. Timestamps on mutable tables

```sql
created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
```

Immutable tables (audit_events, scan_event_log, fx_rates) have `created_at` only — no `updated_at`.

### C5. Canonical keys in English PascalCase

Category enum values stored as English PascalCase (e.g., `'Supermarkets'`, not `'Supermercados'`). Display labels for locales (es, en, pt) stored in `display_labels JSONB` on taxonomy tables.

### C6. `display_labels` JSONB on taxonomy tables

```sql
display_labels JSONB NOT NULL DEFAULT '{}'::jsonb,
-- Example: {"es": "Supermercados", "en": "Supermarkets", "pt": "Supermercados"}
```

Day-1 locales: es, en, pt.

### C7. No PCI-regulated data (NG-06 / SC-10)

Schema must never contain columns for card numbers, CVVs, expiry dates, PAN fragments, or BIN ranges. Card aliases store `name TEXT` only. Validated at API layer + enforced at DB layer (no columns exist to store PCI data).

### C8. Sensitive-category awareness (REQ-11 / REQ-20)

Hardcoded suppression list: `pharmacy`, `donations`, `political`, `healthcare`, `adult_goods`. Baked into category taxonomy config. Enforced at SELECT time by insight pipeline (A.13) + cohort revocation policy (A.17) + wire-layer 204 empty-state (A.9).

### C9. Connection-role separation

Three PostgreSQL roles for PgBouncer connection pooling:

| Role | Privileges | Use case |
|------|-----------|----------|
| `app_user` | SELECT, INSERT, UPDATE, DELETE on user-owned tables; RLS-bound | API requests |
| `app_etl` | INSERT, UPDATE on migration tables; UPSERT-shaped with preservation invariant | Phase E data migration |
| `app_admin` | Full DDL + reference-data INSERT | Alembic migrations, seed data |

---

## 2. Reference Tables

### `currencies`

Seed data for Day-1 supported currencies (REQ-17 / REQ-19).

```sql
CREATE TABLE currencies (
    code         CHAR(3) PRIMARY KEY,              -- ISO 4217
    exponent     SMALLINT NOT NULL,                 -- CLP=0, USD=2, EUR=2, ...
    display_labels JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed: CLP(0), USD(2), EUR(2), GBP(2), CAD(2), MXN(2), BRL(2), ARS(2), PEN(2), COP(2)
```

### `store_categories`

```sql
CREATE TABLE store_categories (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key            TEXT NOT NULL UNIQUE,             -- English PascalCase: 'Supermarkets'
    display_labels JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_sensitive   BOOLEAN NOT NULL DEFAULT FALSE,   -- C8 suppression flag
    sort_order     SMALLINT NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `item_categories`

```sql
CREATE TABLE item_categories (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key            TEXT NOT NULL UNIQUE,
    display_labels JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_sensitive   BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order     SMALLINT NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `fx_rates` — Primitive #4

Write-once FX snapshot table (REQ-18 / SC-09 / D2).

```sql
CREATE TABLE fx_rates (
    date          DATE NOT NULL,
    from_currency CHAR(3) NOT NULL REFERENCES currencies(code),
    to_currency   CHAR(3) NOT NULL REFERENCES currencies(code),
    rate          NUMERIC(18,8) NOT NULL,
    source        TEXT NOT NULL,                     -- 'ecb', 'openexchangerates', etc.
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (date, from_currency, to_currency)
);

-- Shared write-once trigger function (used by fx_rates + audit_events)
CREATE OR REPLACE FUNCTION immutable_row() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION '% rows are immutable after insert', TG_TABLE_NAME;
    RETURN NULL;  -- unreachable, required for PL/pgSQL type-checking
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fx_rates_immutable
    BEFORE UPDATE OR DELETE ON fx_rates
    FOR EACH ROW EXECUTE FUNCTION immutable_row();
```

Lazy read-through cache pattern per D2: `INSERT ... ON CONFLICT (date, from_currency, to_currency) DO NOTHING`.

---

## 3. User & Auth Tables

### `ownership_scopes` — Primitive #1

Day-1 multi-tenancy primitive (SC-07 / SC-08 / D3).

```sql
CREATE TABLE ownership_scopes (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_type  TEXT NOT NULL CHECK (scope_type IN ('individual', 'household')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `ownership_scope_members`

```sql
CREATE TABLE ownership_scope_members (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id  UUID NOT NULL REFERENCES ownership_scopes(id),
    user_id             UUID NOT NULL REFERENCES users(id),
    role                TEXT NOT NULL CHECK (role IN ('owner', 'member')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (ownership_scope_id, user_id)
);
```

### `users`

Firebase Auth remains the identity provider. This table stores the PostgreSQL-side user record.

Creation order: `ownership_scopes` → `users` → `ownership_scope_members` (acyclic). The `ownership_scope_id` column on `users` is a denormalized convenience for RLS policy performance — avoids joining `ownership_scope_members` on every RLS-bound query. The canonical source of membership is `ownership_scope_members`.

```sql
CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid        TEXT NOT NULL UNIQUE,         -- Firebase Auth UID
    email               TEXT NULL,
    display_name        TEXT NULL,
    default_currency    CHAR(3) NOT NULL DEFAULT 'CLP' REFERENCES currencies(code),
    locale              TEXT NOT NULL DEFAULT 'es' CHECK (locale IN ('es', 'en', 'pt')),
    ownership_scope_id  UUID NOT NULL REFERENCES ownership_scopes(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `user_settings`

Firestore singleton: `preferences/settings` → flat table.

```sql
CREATE TABLE user_settings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id  UUID NOT NULL UNIQUE REFERENCES ownership_scopes(id),
    theme               TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    default_currency    CHAR(3) NOT NULL DEFAULT 'CLP' REFERENCES currencies(code),
    locale              TEXT NOT NULL DEFAULT 'es' CHECK (locale IN ('es', 'en', 'pt')),
    scan_auto_save      BOOLEAN NOT NULL DEFAULT FALSE,
    notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    settings_json       JSONB NOT NULL DEFAULT '{}'::jsonb,  -- overflow for future settings
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `credit_balances`

Firestore singleton: `credits/balance` → flat table.

```sql
CREATE TABLE credit_balances (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id  UUID NOT NULL UNIQUE REFERENCES ownership_scopes(id),
    normal_credits      BIGINT NOT NULL DEFAULT 0,
    super_credits       BIGINT NOT NULL DEFAULT 0,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `card_aliases` (REQ-09 / SC-10 / NG-06)

```sql
CREATE TABLE card_aliases (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id  UUID NOT NULL REFERENCES ownership_scopes(id),
    name                TEXT NOT NULL,                -- "Santander Visa" — NO PCI fields (C7)
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at         TIMESTAMPTZ NULL
);
```

---

## 4. Transaction Tables

### `transactions`

Firestore collection: `transactions` (162 docs across 4 users).

```sql
CREATE TABLE transactions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id    UUID NOT NULL REFERENCES ownership_scopes(id),
    transaction_date      DATE NOT NULL,
    transaction_time      TIME NULL,
    merchant              TEXT NOT NULL,
    merchant_user_edited_at TIMESTAMPTZ NULL,         -- C2
    alias                 TEXT NULL,
    store_category_id     UUID NULL REFERENCES store_categories(id),
    store_category_user_edited_at TIMESTAMPTZ NULL,   -- C2
    total_minor           BIGINT NOT NULL,             -- C1
    currency              CHAR(3) NOT NULL REFERENCES currencies(code),
    amount_usd_minor      BIGINT NULL,                 -- USD shadow (REQ-18)
    fx_rate_to_usd        NUMERIC(18,8) NULL,
    fx_captured_at        TIMESTAMPTZ NULL,
    card_alias_id         UUID NULL REFERENCES card_aliases(id),
    receipt_type          TEXT NULL CHECK (receipt_type IN ('scan', 'manual', 'statement', 'import')),
    thumbnail_url         TEXT NULL,
    country               TEXT NULL,
    city                  TEXT NULL,
    prompt_version        TEXT NULL,
    merchant_source       TEXT NULL CHECK (merchant_source IN ('ocr', 'user', 'ai', 'mapping')),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Dropped from Firestore:** `periods` object (derive via `date_trunc()` in queries).

### `transaction_items`

Firestore nested array: `transactions.items[]` → junction table.

```sql
CREATE TABLE transaction_items (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id        UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    name                  TEXT NOT NULL,
    name_user_edited_at   TIMESTAMPTZ NULL,           -- C2
    qty                   NUMERIC(10,3) NULL,
    unit_price_minor      BIGINT NULL,                 -- C1
    total_price_minor     BIGINT NOT NULL,             -- C1
    item_category_id      UUID NULL REFERENCES item_categories(id),
    item_category_user_edited_at TIMESTAMPTZ NULL,    -- C2
    subcategory           TEXT NULL,
    category_source       TEXT NULL CHECK (category_source IN ('ocr', 'user', 'ai', 'mapping')),
    is_flagged            BOOLEAN NOT NULL DEFAULT FALSE,  -- REQ-11 urgency/special-case
    sort_order            SMALLINT NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `transaction_images`

Firestore array: `transactions.imageUrls[]` → separate table.

```sql
CREATE TABLE transaction_images (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id        UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    image_url             TEXT NOT NULL,
    is_thumbnail          BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order            SMALLINT NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 5. Mapping Tables

### `merchant_mappings`

Firestore collection: `merchant_mappings` (37 docs across 3 users).

```sql
CREATE TABLE merchant_mappings (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id    UUID NOT NULL REFERENCES ownership_scopes(id),
    original_merchant     TEXT NOT NULL,
    target_merchant       TEXT NOT NULL,
    store_category_id     UUID NULL REFERENCES store_categories(id),
    confidence            NUMERIC(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    source                TEXT NOT NULL CHECK (source IN ('user', 'ai')),
    usage_count           INTEGER NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Dropped:** `normalizedMerchant` → use `GENERATED ALWAYS AS (lower(original_merchant)) STORED` if needed, or derive at query time.

### `category_mappings`

Firestore collection: `category_mappings` (30 docs across 1 user).

```sql
CREATE TABLE category_mappings (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id    UUID NOT NULL REFERENCES ownership_scopes(id),
    original_item         TEXT NOT NULL,
    target_category_id    UUID NOT NULL REFERENCES store_categories(id),
    merchant_pattern      TEXT NULL,
    confidence            NUMERIC(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    source                TEXT NOT NULL CHECK (source IN ('user', 'ai')),
    usage_count           INTEGER NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `subcategory_mappings`

Firestore collection: `subcategory_mappings` (3 docs across 1 user). Same shape as `category_mappings`.

```sql
CREATE TABLE subcategory_mappings (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id    UUID NOT NULL REFERENCES ownership_scopes(id),
    original_item         TEXT NOT NULL,
    target_subcategory    TEXT NOT NULL,
    merchant_pattern      TEXT NULL,
    confidence            NUMERIC(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    source                TEXT NOT NULL CHECK (source IN ('user', 'ai')),
    usage_count           INTEGER NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `item_name_mappings`

Firestore collection: `item_name_mappings` (14 docs across 1 user).

```sql
CREATE TABLE item_name_mappings (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id    UUID NOT NULL REFERENCES ownership_scopes(id),
    original_name         TEXT NOT NULL,
    target_name           TEXT NOT NULL,
    merchant_pattern      TEXT NULL,
    confidence            NUMERIC(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    source                TEXT NOT NULL CHECK (source IN ('user', 'ai')),
    usage_count           INTEGER NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `trusted_merchants`

Firestore collection: `trusted_merchants` (28 docs across 3 users).

```sql
CREATE TABLE trusted_merchants (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id    UUID NOT NULL REFERENCES ownership_scopes(id),
    merchant_name         TEXT NOT NULL,
    scan_count            INTEGER NOT NULL DEFAULT 0,
    auto_save_enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 6. Scan Tables

### `scan_event_log` — Primitive #11

Audit trail for scan state progression (REQ-04 / A.9 SCAN-EVENTS).

```sql
CREATE TABLE scan_event_log (
    id                    UUID NOT NULL DEFAULT gen_random_uuid(),
    scan_id               UUID NOT NULL,
    ownership_scope_id    UUID NOT NULL,              -- FK enforced at application layer (partitioned tables)
    event_type            TEXT NOT NULL CHECK (event_type IN (
                              'queued', 'picked_up', 'llm_start', 'llm_end',
                              'reconciling', 'completed', 'failed'
                          )),
    payload               JSONB NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, created_at)                      -- partition key must be in PK
) PARTITION BY RANGE (created_at);

-- Daily partitions created by pg_cron or Alembic migration
```

Seven-state union lock: `event_type CHECK IN` mirrors the A.9 SCAN-EVENTS contract exactly. SSE (web) and WebSocket (mobile) both read from this same event_type set per REQ-04 dual-transport binding.

---

## 7. Reconciliation Tables

### `statement_lines`

Imported from bank/card statements for reconciliation (REQ-08).

```sql
CREATE TABLE statement_lines (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id    UUID NOT NULL REFERENCES ownership_scopes(id),
    card_alias_id         UUID NULL REFERENCES card_aliases(id),
    statement_date        DATE NOT NULL,
    description           TEXT NOT NULL,
    amount_minor          BIGINT NOT NULL,
    currency              CHAR(3) NOT NULL REFERENCES currencies(code),
    raw_data              JSONB NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `reconciliation_matches` — Primitive #10

M:N junction linking statement lines to receipt-sourced transactions (REQ-08 / SC-06).

```sql
CREATE TABLE reconciliation_matches (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    statement_line_id     UUID NOT NULL REFERENCES statement_lines(id),
    transaction_id        UUID NOT NULL REFERENCES transactions(id),
    match_type            TEXT NOT NULL CHECK (match_type IN ('exact', 'fuzzy', 'manual')),
    confidence            NUMERIC(3,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
    matched_by            TEXT NOT NULL CHECK (matched_by IN ('engine', 'user')),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (statement_line_id, transaction_id)
);
```

---

## 8. Insights & Analytics Tables

### `user_insight_profiles` — Primitive #12

Firestore singleton: `insightProfile/profile` → table.

```sql
CREATE TABLE user_insight_profiles (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id    UUID NOT NULL UNIQUE REFERENCES ownership_scopes(id),
    schema_version        TEXT NOT NULL DEFAULT '1.0',
    profile_data          JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_computed_at      TIMESTAMPTZ NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `insight_records`

Per-transaction async + nightly batch computation. Deterministic generators only (NOT Gemini). SC-02 wall: dashboard render never gates on insight compute.

```sql
CREATE TABLE insight_records (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id    UUID NOT NULL REFERENCES ownership_scopes(id),
    insight_type          TEXT NOT NULL,
    title                 TEXT NOT NULL,
    body                  TEXT NOT NULL,
    metadata              JSONB NOT NULL DEFAULT '{}'::jsonb,
    period_start          DATE NULL,
    period_end            DATE NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `insight_silences`

User dismissals — revocation = immediate cache flush per REQ-20 revocation parity.

```sql
CREATE TABLE insight_silences (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id    UUID NOT NULL REFERENCES ownership_scopes(id),
    insight_type          TEXT NOT NULL,
    silenced_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `cohort_contributions` — Primitive #13

Day-1 schema commitment for REQ-27 / SC-11. Nightly `pg_cron` aggregation writes.

```sql
CREATE TABLE cohort_contributions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id    UUID NOT NULL REFERENCES ownership_scopes(id),
    cohort_key            TEXT NOT NULL,               -- e.g., 'age:25-34:santiago'
    store_category_id     UUID NOT NULL REFERENCES store_categories(id),
    period                DATE NOT NULL,               -- month bucket
    amount_minor          BIGINT NOT NULL,
    currency              CHAR(3) NOT NULL REFERENCES currencies(code),
    is_sensitive          BOOLEAN NOT NULL DEFAULT FALSE,  -- C8: suppression column
    withdrawn_at          TIMESTAMPTZ NULL,             -- revocation tracking
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (ownership_scope_id, cohort_key, store_category_id, period)
);
```

Endpoint enforces: k >= 20 floor + `withdrawn_at IS NULL` + `is_sensitive = FALSE` at SELECT time (A.17 cohort revocation reconciliation policy).

---

## 9. Compliance & Audit Tables

### `consent_records` — Primitive #2

First-class consent table for four-jurisdiction compliance: Law 21.719 + GDPR + PIPEDA + CCPA/CPRA (REQ-20 / D4).

```sql
CREATE TABLE consent_records (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id    UUID NOT NULL REFERENCES ownership_scopes(id),
    purpose               TEXT NOT NULL CHECK (purpose IN (
                              'scan', 'reconciliation', 'notifications',
                              'cohort_opt_in', 'analytics', 'data_export'
                          )),
    granted               BOOLEAN NOT NULL,
    granted_at            TIMESTAMPTZ NULL,
    revoked_at            TIMESTAMPTZ NULL,
    ip_address            INET NULL,
    user_agent            TEXT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Surfaces data-subject-rights endpoints: access, rectification, erasure, portability.

### `processing_register`

Companion to `consent_records` — logs actual data processing activities per REQ-20.

```sql
CREATE TABLE processing_register (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id    UUID NOT NULL REFERENCES ownership_scopes(id),
    activity              TEXT NOT NULL,
    purpose               TEXT NOT NULL,
    legal_basis           TEXT NOT NULL,
    data_categories       TEXT[] NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `audit_events` — Primitive #7

Immutable append-only audit log. Monthly-partitioned. Retention spans Law 21.719 + GDPR Art 30 + PIPEDA + CCPA (REQ-20 / D4).

```sql
CREATE TABLE audit_events (
    id                    UUID NOT NULL DEFAULT gen_random_uuid(),
    ownership_scope_id    UUID NULL,                  -- FK enforced at application layer (partitioned tables); NULL for system events
    actor_id              UUID NULL,
    actor_type            TEXT NOT NULL CHECK (actor_type IN ('user', 'system', 'etl', 'admin')),
    action                TEXT NOT NULL,
    resource_type         TEXT NOT NULL,
    resource_id           UUID NULL,
    old_value             JSONB NULL,
    new_value             JSONB NULL,
    ip_address            INET NULL,
    user_agent            TEXT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (id, created_at)                      -- partition key must be in PK
) PARTITION BY RANGE (created_at);

-- Monthly partitions created by pg_cron or Alembic migration
-- Immutable: reuses shared immutable_row() trigger from fx_rates
CREATE TRIGGER trg_audit_events_immutable
    BEFORE UPDATE OR DELETE ON audit_events
    FOR EACH ROW EXECUTE FUNCTION immutable_row();
```

### `notifications`

Firestore collection: `notifications` (2 docs across 1 user).

```sql
CREATE TABLE notifications (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id    UUID NOT NULL REFERENCES ownership_scopes(id),
    notification_type     TEXT NOT NULL,
    title                 TEXT NOT NULL,
    body                  TEXT NOT NULL,
    read                  BOOLEAN NOT NULL DEFAULT FALSE,
    group_id              UUID NULL,
    transaction_id        UUID NULL REFERENCES transactions(id),
    actor_id              UUID NULL,
    actor_name            TEXT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `airlocks`

Firestore collection: `airlocks` (2 docs across 1 user).

```sql
CREATE TABLE airlocks (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id    UUID NOT NULL REFERENCES ownership_scopes(id),
    title                 TEXT NOT NULL,
    message               TEXT NOT NULL,
    emoji                 TEXT NOT NULL,
    recommendation        TEXT NULL,
    metadata              JSONB NULL,
    viewed_at             TIMESTAMPTZ NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `personal_records`

Firestore collection: `personalRecords` (198 docs estimated). Achievement tracking.

```sql
CREATE TABLE personal_records (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id    UUID NOT NULL REFERENCES ownership_scopes(id),
    record_type           TEXT NOT NULL,
    value                 NUMERIC(18,4) NOT NULL,
    record_date           DATE NOT NULL,
    store_category_id     UUID NULL REFERENCES store_categories(id),
    metadata              JSONB NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 10. Infrastructure Tables

### `idempotency_keys` — Primitive #6

UUID-based request deduplication. Cross-cutting via A.13.

```sql
CREATE TABLE idempotency_keys (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fingerprint           TEXT NOT NULL UNIQUE,        -- sha256(RFC 8785 canonical JSON of method+path+body)
    status                TEXT NOT NULL CHECK (status IN ('in_flight', 'completed', 'failed')),
    response_status       SMALLINT NULL,
    response_body         JSONB NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at            TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours')
);
```

409 on conflict. In-flight + 24h TTL. Stale rows purged by pg_cron job.

### `rate_limit_buckets`

Per-user rate limiting backing store.

```sql
CREATE TABLE rate_limit_buckets (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ownership_scope_id    UUID NOT NULL REFERENCES ownership_scopes(id),
    bucket_key            TEXT NOT NULL,
    token_count           INTEGER NOT NULL,
    last_refill_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (ownership_scope_id, bucket_key)
);
-- FILLFACTOR = 70 for UPDATE-heavy workload
ALTER TABLE rate_limit_buckets SET (fillfactor = 70);
```

### `etl_runs` (Phase E migration support)

Watermark table for ETL tracking.

```sql
CREATE TABLE etl_runs (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_type              TEXT NOT NULL,
    started_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at          TIMESTAMPTZ NULL,
    status                TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    rows_processed        INTEGER NOT NULL DEFAULT 0,
    errors                JSONB NULL
);
```

### `firestore_id_map` (Phase E migration support)

Maps Firestore document IDs to PostgreSQL UUIDs for referential integrity during migration.

```sql
CREATE TABLE firestore_id_map (
    firestore_collection  TEXT NOT NULL,
    firestore_doc_id      TEXT NOT NULL,
    firestore_user_id     TEXT NOT NULL,
    pg_table              TEXT NOT NULL,
    pg_id                 UUID NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (firestore_collection, firestore_doc_id, firestore_user_id)
);
```

### `etl_errors` (Phase E migration support)

Failed conversions logged here instead of dropped.

```sql
CREATE TABLE etl_errors (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    etl_run_id            UUID NOT NULL REFERENCES etl_runs(id),
    firestore_collection  TEXT NOT NULL,
    firestore_doc_id      TEXT NOT NULL,
    error_message         TEXT NOT NULL,
    raw_document          JSONB NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 11. Architectural Primitives

**Canary value: 13 primitives.** Each must pass the three-test admission criterion:

1. **Spans ≥2 tracks** (storage + operational enforcement + wire-layer or test)
2. **ONE owner artifact + ONE locked invariant**
3. **Load-bearing for ≥1 SCOPE REQ or SC**

| # | Primitive | Owner artifact | Locked invariant | SCOPE anchors | Tracks |
|---|-----------|---------------|-----------------|---------------|--------|
| 1 | `ownership_scope_id` | `ownership_scopes` + `ownership_scope_members` tables | RLS policies key off scope, never `user_id` | SC-07, SC-08 / D3 | A.10 storage + A.13 RLS + A.17 privacy |
| 2 | `consent_records` | `consent_records` table | Four-jurisdiction consent audit | REQ-20 / D4 | A.10 storage + A.17 compliance + A.9 endpoints |
| 3 | Sensitive-category suppression | `is_sensitive` column on `store_categories` + `cohort_contributions` | Excluded at SELECT time on every aggregation surface | REQ-11, REQ-20 | A.10 storage + A.13 compute-time + A.17 cohort policy + A.9 wire 204 |
| 4 | `fx_rates` write-once | `fx_rates` table + `trg_fx_rates_immutable` trigger | `BEFORE UPDATE OR DELETE` raises exception; `INSERT ON CONFLICT DO NOTHING` | REQ-18 / SC-09 / D2 | A.10 storage + A.13 role-privilege matrix + migration lifecycle |
| 5 | `user_edited_at` per editable field | Convention C2 on every mutable table | Automation must check `user_edited_at IS NOT NULL` and skip | REQ-13 / SC-07 | A.10 convention + A.13 service-layer + Phase E ETL preservation |
| 6 | `idempotency_keys` | `idempotency_keys` table | sha256 fingerprint + 409 on conflict + 24h TTL | A.13 cross-cutting / RFC 8785 | A.10 storage + A.13 middleware + A.9 wire |
| 7 | `audit_events` | `audit_events` partitioned table | Immutable append-only; `BEFORE UPDATE OR DELETE` trigger | REQ-20 / D4 / Law 21.719 + GDPR Art 30 | A.10 storage + A.17 compliance + A.13 retention |
| 8 | Money as `_minor` BIGINT | Convention C1 + `currencies` table | `CHECK` constraints reject non-integer; ISO-4217 exponent lookup | REQ-17 / SC-09 | A.10 convention + A.9 wire shapes + Phase E ETL conversion |
| 9 | NG-06 PCI exclusion | Convention C7 (no PCI columns exist) | Schema-level enforcement: no columns to store card data | NG-06 / SC-10 / REQ-09 | A.10 schema + A.9 API validation + A.17 compliance |
| 10 | `reconciliation_matches` M:N | `reconciliation_matches` junction table | Links statement lines to transactions with confidence + match_type | REQ-08 / SC-06 | A.10 storage + A.9 reconciliation endpoints |
| 11 | `scan_event_log` | `scan_event_log` daily-partitioned table | `event_type CHECK IN` mirrors A.9 seven-state union exactly | REQ-04 / A.9 SCAN-EVENTS | A.10 storage + A.9 wire format + A.13 RLS + A.17 SSE origin |
| 12 | `user_insight_profile` + `insight_records` + `insight_silences` | Three insight tables | Revocation = immediate cache flush per REQ-20 parity | REQ-20 / SC-02 wall | A.10 storage + A.13 cadence ADR + A.17 revocation |
| 13 | `cohort_contributions` | `cohort_contributions` table | k≥20 floor + `is_sensitive=FALSE` + `withdrawn_at IS NULL` at SELECT | REQ-27 / SC-11 / Law 21.719 | A.10 storage + A.13 compute + A.17 cohort revocation + A.9 wire 204 |

---

## 12. Indexing Strategy

Seven rules. All user-owned tables apply rules 1–3. Full DDL for every index follows.

### I1. FK columns indexed

Every foreign key column gets a B-tree index. Required for join performance and referential integrity checks on DELETE/UPDATE cascades.

```sql
-- User & Auth
CREATE INDEX idx_ownership_scope_members_scope ON ownership_scope_members (ownership_scope_id);
CREATE INDEX idx_users_scope ON users (ownership_scope_id);

-- Transactions
CREATE INDEX idx_transactions_scope ON transactions (ownership_scope_id);
CREATE INDEX idx_transactions_store_category ON transactions (store_category_id);
CREATE INDEX idx_transactions_card_alias ON transactions (card_alias_id);
CREATE INDEX idx_transaction_items_txn ON transaction_items (transaction_id);
CREATE INDEX idx_transaction_items_category ON transaction_items (item_category_id);
CREATE INDEX idx_transaction_images_txn ON transaction_images (transaction_id);

-- Mappings
CREATE INDEX idx_merchant_mappings_scope ON merchant_mappings (ownership_scope_id);
CREATE INDEX idx_merchant_mappings_category ON merchant_mappings (store_category_id);
CREATE INDEX idx_category_mappings_scope ON category_mappings (ownership_scope_id);
CREATE INDEX idx_category_mappings_target ON category_mappings (target_category_id);
CREATE INDEX idx_subcategory_mappings_scope ON subcategory_mappings (ownership_scope_id);
CREATE INDEX idx_item_name_mappings_scope ON item_name_mappings (ownership_scope_id);
CREATE INDEX idx_trusted_merchants_scope ON trusted_merchants (ownership_scope_id);

-- Reconciliation
CREATE INDEX idx_statement_lines_scope ON statement_lines (ownership_scope_id);
CREATE INDEX idx_statement_lines_card_alias ON statement_lines (card_alias_id);
CREATE INDEX idx_reconciliation_matches_txn ON reconciliation_matches (transaction_id);

-- Insights & Analytics
CREATE INDEX idx_cohort_contributions_scope ON cohort_contributions (ownership_scope_id);
CREATE INDEX idx_cohort_contributions_category ON cohort_contributions (store_category_id);
CREATE INDEX idx_insight_records_scope ON insight_records (ownership_scope_id);
CREATE INDEX idx_insight_silences_scope ON insight_silences (ownership_scope_id);

-- Compliance
CREATE INDEX idx_consent_records_scope ON consent_records (ownership_scope_id);
CREATE INDEX idx_notifications_scope ON notifications (ownership_scope_id);
CREATE INDEX idx_notifications_txn ON notifications (transaction_id);
CREATE INDEX idx_airlocks_scope ON airlocks (ownership_scope_id);
CREATE INDEX idx_personal_records_scope ON personal_records (ownership_scope_id);
CREATE INDEX idx_personal_records_category ON personal_records (store_category_id);

-- Infrastructure
CREATE INDEX idx_rate_limit_buckets_scope ON rate_limit_buckets (ownership_scope_id);
CREATE INDEX idx_etl_errors_run ON etl_errors (etl_run_id);
```

### I2. `ownership_scope_id` FIRST in composite indexes

RLS policies scope-bound every query. Composite indexes must lead with `ownership_scope_id` to satisfy the RLS predicate without a separate index scan.

### I3. Hot-path composites

```sql
-- Paginated transaction list reads
CREATE INDEX idx_transactions_scope_date
    ON transactions (ownership_scope_id, transaction_date DESC, id);

-- Item list within a transaction
CREATE INDEX idx_transaction_items_txn_order
    ON transaction_items (transaction_id, sort_order);

-- Merchant mapping lookup during scan (functional index for case-insensitive match)
CREATE INDEX idx_merchant_mappings_lookup
    ON merchant_mappings (ownership_scope_id, lower(original_merchant));

-- Scan progress stream + replay (RLS-aware)
CREATE INDEX idx_scan_event_log_progress
    ON scan_event_log (ownership_scope_id, scan_id, created_at);

-- Consent lookup per purpose
CREATE INDEX idx_consent_records_purpose
    ON consent_records (ownership_scope_id, purpose);
```

Note: `reconciliation_matches (statement_line_id, transaction_id)` is already covered by the UNIQUE constraint.

### I4. Partial indexes for soft-deletes

```sql
-- Card aliases: only active (non-archived) aliases in most queries
CREATE INDEX idx_card_aliases_active
    ON card_aliases (ownership_scope_id, name)
    WHERE archived_at IS NULL;
```

### I5. BRIN for time-series

```sql
-- audit_events and scan_event_log are append-only, time-ordered
CREATE INDEX idx_audit_events_brin ON audit_events USING BRIN (created_at);
CREATE INDEX idx_scan_event_log_brin ON scan_event_log USING BRIN (created_at);
```

### I6. GIN for JSONB

```sql
-- Category taxonomy display labels
CREATE INDEX idx_store_categories_labels ON store_categories USING GIN (display_labels);
CREATE INDEX idx_item_categories_labels ON item_categories USING GIN (display_labels);
```

### I7. Covering index on `ownership_scope_members`

```sql
-- Ownership checks are frequent; cover all needed columns
CREATE INDEX idx_scope_members_covering
    ON ownership_scope_members (user_id, ownership_scope_id, role);
```

### I8. TTL purge index

```sql
-- idempotency_keys: pg_cron purge job needs fast range scan on expires_at
CREATE INDEX idx_idempotency_keys_expires
    ON idempotency_keys (expires_at);
```

---

## 13. Partitioning Strategy

Six entries. Partitioning is reserved for append-heavy time-series tables and write-once reference data.

### P1. `audit_events` — Monthly

```sql
CREATE TABLE audit_events_2026_01 PARTITION OF audit_events
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
-- Repeat per month; automate via pg_cron or Alembic
```

Retention: ~7 years per Law 21.719 + GDPR Art 30.

### P2. `scan_event_log` — Daily

```sql
CREATE TABLE scan_event_log_2026_05_04 PARTITION OF scan_event_log
    FOR VALUES FROM ('2026-05-04') TO ('2026-05-05');
-- Automate via pg_cron
```

Retention: per REQ-21 metrics budget (TBD, likely 90 days for hot + archive for cold).

### P3. `fx_rates` — NOT partitioned

Small table. Write-once trigger per primitive #4 handles immutability. `INSERT ON CONFLICT DO NOTHING` is the access pattern.

### P4. Hot user-owned tables — NOT partitioned at MVP

`transactions`, `transaction_items`, `statement_lines`, `reconciliation_matches` — NOT partitioned. Post-MVP sharding threshold: >10M rows OR >100ms P95 on RLS-bound reads (Decisions-still-open #9 in plan).

### P5. `rate_limit_buckets` — NOT partitioned

FILLFACTOR = 70 for UPDATE-heavy workload. Row count stays bounded by active users × bucket types.

### P6. Write-once enforcement pattern

Applied to `fx_rates` (primitive #4) and `audit_events` (primitive #7). Both use the shared `immutable_row()` trigger function defined in section 2 (`fx_rates`). Triggers: `trg_fx_rates_immutable` on `fx_rates`, `trg_audit_events_immutable` on `audit_events` (defined in section 9).

---

## 14. Firestore → PostgreSQL Migration Map

Summary of collection-to-table mapping for Phase E ETL scripts.

| Firestore collection | PostgreSQL table(s) | Key transforms |
|---------------------|---------------------|----------------|
| `transactions` | `transactions` + `transaction_items` + `transaction_images` | Unnest `items[]` → `transaction_items`; float → `_minor` BIGINT; drop `periods`; Timestamp → `TIMESTAMPTZ` |
| `merchant_mappings` | `merchant_mappings` | Drop `normalizedMerchant`; Timestamp → `TIMESTAMPTZ` |
| `category_mappings` | `category_mappings` | Drop `normalizedItem`; string category → `store_category_id` FK |
| `subcategory_mappings` | `subcategory_mappings` | Drop `normalizedItem`; Timestamp → `TIMESTAMPTZ` |
| `item_name_mappings` | `item_name_mappings` | Drop `normalizedName`; Timestamp → `TIMESTAMPTZ` |
| `trusted_merchants` | `trusted_merchants` | Timestamp → `TIMESTAMPTZ` |
| `airlocks` | `airlocks` | Timestamp → `TIMESTAMPTZ`; drop redundant `userId` |
| `personalRecords` | `personal_records` | Timestamp → `TIMESTAMPTZ` |
| `notifications` | `notifications` | Timestamp → `TIMESTAMPTZ` |
| `preferences/settings` | `user_settings` | Flatten singleton doc → row |
| `credits/balance` | `credit_balances` | Flatten singleton doc → row |
| `insightProfile/profile` | `user_insight_profiles` | Flatten singleton doc → row |

**New tables (no Firestore source):**

`ownership_scopes`, `ownership_scope_members`, `users`, `card_aliases`, `fx_rates`, `currencies`, `store_categories`, `item_categories`, `scan_event_log`, `statement_lines`, `reconciliation_matches`, `consent_records`, `processing_register`, `audit_events`, `insight_records`, `insight_silences`, `cohort_contributions`, `idempotency_keys`, `rate_limit_buckets`, `etl_runs`, `firestore_id_map`, `etl_errors`

---

## ETL Acceptance Criteria (from FIRESTORE-INVENTORY.md)

1. **Row-count parity:** `COUNT(*)` per PostgreSQL table = document count per Firestore collection, per user.
2. **Money integrity:** `SUM(total_minor)` in PostgreSQL = `SUM(round(total * currency_factor))` in Firestore, per user. Zero tolerance.
3. **Item count parity:** `COUNT(*)` in `transaction_items` = `SUM(array_length(items))` across Firestore transactions, per user.
4. **Timestamp fidelity:** `MAX(ABS(pg_timestamp - firestore_timestamp))` < 1 second across all date fields.
5. **Referential integrity:** Every FK is valid. Every `transaction_items.transaction_id` references a valid `transactions.id`.
6. **No data loss:** Zero rows dropped during ETL. Failed conversions → `etl_errors` table for manual review.
7. **`user_edited_at` preservation:** Fields that users manually edited must carry their `user_edited_at` timestamp through migration.

---

## Table Count Summary

| Category | Tables | Count |
|----------|--------|-------|
| Reference | `currencies`, `store_categories`, `item_categories`, `fx_rates` | 4 |
| User & Auth | `ownership_scopes`, `ownership_scope_members`, `users`, `user_settings`, `credit_balances`, `card_aliases` | 6 |
| Transactions | `transactions`, `transaction_items`, `transaction_images` | 3 |
| Mappings | `merchant_mappings`, `category_mappings`, `subcategory_mappings`, `item_name_mappings`, `trusted_merchants` | 5 |
| Scan | `scan_event_log` | 1 |
| Reconciliation | `statement_lines`, `reconciliation_matches` | 2 |
| Insights & Analytics | `user_insight_profiles`, `insight_records`, `insight_silences`, `cohort_contributions` | 4 |
| Compliance & Audit | `consent_records`, `processing_register`, `audit_events`, `notifications`, `airlocks`, `personal_records` | 6 |
| Infrastructure | `idempotency_keys`, `rate_limit_buckets`, `etl_runs`, `firestore_id_map`, `etl_errors` | 5 |
| **Total** | | **36** |
