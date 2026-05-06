# Firestore → PostgreSQL Collection Inventory

Phase A prereq A.12. Code-derived from the mocked Firebase shims at `frontend/src/__firebase-mocks__/` and repository/service files. The real BoletApp Firebase project credentials are not in this repo (intentionally stripped during port); this inventory is the structural map the ETL scripts will target.

## Status

- **Real Firebase project:** `boletapp-d609f` (production), `boletapp-staging` (staging)
- **Admin access:** Service account key at `/home/khujta/projects/bmad/boletapp/scripts/keys/serviceAccountKey.json`
- **Full export completed:** 2026-05-04 via `scripts/migrate/firestore-inventory.ts --export`
- **Total users:** 10 (Firebase Auth)
- **Total documents:** 496 across all collections
- **Full data dump:** `docs/rebuild/firestore-data-export.json` (556 KB)

## Collection path pattern

All user data lives under: `artifacts/{appId}/users/{userId}/{collection}`

The `appId` is the Firebase app identifier. Each user's data is fully isolated by `userId`. This maps cleanly to PostgreSQL's `ownership_scope_id` per the plan's A.10 schema sketch.

## Collections

### 1. transactions

**Path:** `artifacts/{appId}/users/{userId}/transactions`
**Actual volume:** 162 documents across 4 users (24 distinct fields detected)

| Field | Firestore type | PostgreSQL target | Non-portable? |
|---|---|---|---|
| id | auto-generated | `UUID PRIMARY KEY` | No |
| date | string (ISO) | `DATE` | No |
| merchant | string | `TEXT` | No |
| alias | string? | `TEXT NULL` | No |
| category | string (StoreCategory enum) | `store_category_id FK` or `TEXT CHECK` | Denormalized → reference table |
| total | number | `BIGINT` (`_minor` suffix per SCOPE §10.3 line 423) | Money as float → integer cents |
| items | array of objects | **Separate `transaction_items` table** | Nested array → junction table |
| items[].name | string | `TEXT` | No |
| items[].qty | number? | `NUMERIC(10,3) NULL` | No |
| items[].unitPrice | number? | `BIGINT NULL` (`_minor`) | Float → integer cents |
| items[].totalPrice | number | `BIGINT` (`_minor`) | Float → integer cents |
| items[].category | string? (ItemCategory) | `item_category_id FK` or `TEXT NULL` | Denormalized |
| items[].subcategory | string? | `TEXT NULL` | No |
| items[].categorySource | string? | `TEXT NULL CHECK` | No |
| imageUrls | string[]? | **Separate `transaction_images` table** or `TEXT[] NULL` | Array → table or Postgres array |
| thumbnailUrl | string? | `TEXT NULL` | No |
| createdAt | Timestamp | `TIMESTAMPTZ NOT NULL DEFAULT now()` | Firestore Timestamp → timestamptz |
| updatedAt | Timestamp? | `TIMESTAMPTZ` | Firestore Timestamp → timestamptz |
| time | string? (HH:mm) | Merge into `DATE` + `TIME` or `TIMESTAMPTZ` | Separate time field → unified timestamp |
| country | string? | `TEXT NULL` | No |
| city | string? | `TEXT NULL` | No |
| currency | string? (ISO 4217) | `CHAR(3) NULL` referencing `currencies` table | No |
| receiptType | string? | `TEXT NULL CHECK` | No |
| promptVersion | string? | `TEXT NULL` | No |
| merchantSource | string? | `TEXT NULL CHECK` | No |
| periods | object? | **Computed/generated columns** | Pre-computed → derive from `date` |

**Non-portable highlights:**
- `items[]` nested array → `transaction_items` table with `transaction_id FK`
- `total` and prices stored as JavaScript `number` (float) → must convert to integer cents (`_minor`)
- `periods` object is denormalized for Firestore query efficiency → unnecessary in PostgreSQL (use `date_trunc()`)
- `createdAt`/`updatedAt` are Firestore `Timestamp` objects → convert to ISO 8601 / timestamptz

### 2. merchant_mappings

**Path:** `artifacts/{appId}/users/{userId}/merchant_mappings`
**Actual volume:** 37 documents across 3 users

| Field | Firestore type | PostgreSQL target | Non-portable? |
|---|---|---|---|
| id | auto-generated | `UUID PRIMARY KEY` | No |
| originalMerchant | string | `TEXT NOT NULL` | No |
| normalizedMerchant | string | `TEXT NOT NULL` (generated lowercase) | Could be generated column |
| targetMerchant | string | `TEXT NOT NULL` | No |
| storeCategory | string? | `store_category_id FK NULL` | Denormalized |
| confidence | number | `NUMERIC(3,2) NOT NULL` | No |
| source | string | `TEXT NOT NULL CHECK ('user')` | No |
| createdAt | Timestamp | `TIMESTAMPTZ NOT NULL` | Firestore Timestamp |
| updatedAt | Timestamp | `TIMESTAMPTZ NOT NULL` | Firestore Timestamp |
| usageCount | number | `INTEGER NOT NULL DEFAULT 0` | No |

### 3. category_mappings

**Path:** `artifacts/{appId}/users/{userId}/category_mappings`
**Actual volume:** 30 documents across 1 user

| Field | Firestore type | PostgreSQL target | Non-portable? |
|---|---|---|---|
| id | auto-generated | `UUID PRIMARY KEY` | No |
| originalItem | string | `TEXT NOT NULL` | No |
| normalizedItem | string | `TEXT NOT NULL` | Could be generated column |
| targetCategory | string (StoreCategory) | `store_category_id FK` | Denormalized |
| merchantPattern | string? | `TEXT NULL` | No |
| confidence | number | `NUMERIC(3,2) NOT NULL` | No |
| source | string | `TEXT NOT NULL CHECK ('user','ai')` | No |
| createdAt | Timestamp | `TIMESTAMPTZ NOT NULL` | Firestore Timestamp |
| updatedAt | Timestamp | `TIMESTAMPTZ NOT NULL` | Firestore Timestamp |
| usageCount | number | `INTEGER NOT NULL DEFAULT 0` | No |

### 4. subcategory_mappings

**Path:** `artifacts/{appId}/users/{userId}/subcategory_mappings`
**Actual volume:** 3 documents across 1 user

Same shape as `category_mappings` with `targetSubcategory: string` instead of `targetCategory`.

### 5. item_name_mappings

**Path:** `artifacts/{appId}/users/{userId}/item_name_mappings`
**Actual volume:** 14 documents across 1 user

| Field | Firestore type | PostgreSQL target | Non-portable? |
|---|---|---|---|
| id | auto-generated | `UUID PRIMARY KEY` | No |
| originalName | string | `TEXT NOT NULL` | No |
| normalizedName | string | `TEXT NOT NULL` | Could be generated column |
| targetName | string | `TEXT NOT NULL` | No |
| merchantPattern | string? | `TEXT NULL` | No |
| confidence | number | `NUMERIC(3,2)` | No |
| source | string | `TEXT NOT NULL CHECK` | No |
| createdAt | Timestamp | `TIMESTAMPTZ` | Firestore Timestamp |
| updatedAt | Timestamp | `TIMESTAMPTZ` | Firestore Timestamp |
| usageCount | number | `INTEGER DEFAULT 0` | No |

### 6. trusted_merchants

**Path:** `artifacts/{appId}/users/{userId}/trusted_merchants`
**Actual volume:** 28 documents across 3 users

| Field | Firestore type | PostgreSQL target | Non-portable? |
|---|---|---|---|
| id | auto-generated | `UUID PRIMARY KEY` | No |
| merchantName | string | `TEXT NOT NULL` | No |
| scanCount | number | `INTEGER NOT NULL` | No |
| autoSaveEnabled | boolean | `BOOLEAN DEFAULT TRUE` | No |
| createdAt | Timestamp | `TIMESTAMPTZ` | Firestore Timestamp |

### 7. airlocks

**Path:** `artifacts/{appId}/users/{userId}/airlocks`
**Actual volume:** 2 documents across 1 user

| Field | Firestore type | PostgreSQL target | Non-portable? |
|---|---|---|---|
| id | string | `UUID PRIMARY KEY` | No |
| userId | string | `ownership_scope_id FK` | Redundant in user-scoped collection → becomes FK |
| createdAt | Timestamp | `TIMESTAMPTZ` | Firestore Timestamp |
| viewedAt | Timestamp? | `TIMESTAMPTZ NULL` | Firestore Timestamp |
| title | string | `TEXT NOT NULL` | No |
| message | string | `TEXT NOT NULL` | No |
| emoji | string | `TEXT NOT NULL` | No |
| recommendation | string? | `TEXT NULL` | No |
| metadata | object? | `JSONB NULL` | Nested object → JSONB is acceptable here |

### 8. personalRecords

**Path:** `artifacts/{appId}/users/{userId}/personalRecords`
**Estimated volume:** Low — achievement tracking.

Stored as `StoredPersonalRecord` with achievement type, value, date, and category reference. Straightforward flat mapping.

### 9. notifications

**Path:** `artifacts/{appId}/users/{userId}/notifications`
**Estimated volume:** Medium — one per group/sharing event.

| Field | Firestore type | PostgreSQL target | Non-portable? |
|---|---|---|---|
| id | auto-generated | `UUID PRIMARY KEY` | No |
| type | string enum | `TEXT NOT NULL CHECK` | No |
| title | string | `TEXT NOT NULL` | No |
| body | string | `TEXT NOT NULL` | No |
| read | boolean | `BOOLEAN DEFAULT FALSE` | No |
| createdAt | Timestamp | `TIMESTAMPTZ` | Firestore Timestamp |
| groupId | string? | `UUID NULL FK` | No |
| transactionId | string? | `UUID NULL FK` | No |
| actorId | string? | `UUID NULL` | No |
| actorName | string? | `TEXT NULL` | No |

### Singleton documents

| Document path | PostgreSQL target | Notes |
|---|---|---|
| `users/{userId}/preferences/settings` | `user_settings` table (one row per user) | `AppSettings` type — theme, locale, currency, scan defaults |
| `users/{userId}/credits/balance` | `credit_balances` table or column on `users` | Normal + super credit counts |
| `users/{userId}/insightProfile/profile` | `user_insight_profiles` table | Schema version, recent insights array → may need `insight_history` junction |

### Ephemeral

| Collection | Notes |
|---|---|
| `pending_scans/{scanId}` | Transient scan processing state. NOT migrated — the new backend handles scan state via `scan_event_log` per the plan's A.9 SCAN-EVENTS design. |

## Non-portable patterns summary

| Pattern | Count | ETL action |
|---|---|---|
| Firestore `Timestamp` → `TIMESTAMPTZ` | ~20 fields across collections | `timestamp.toDate().toISOString()` |
| Nested `items[]` array → separate table | 1 (transactions) | Unnest into `transaction_items` with FK |
| Money as JavaScript `number` → `BIGINT _minor` | ~4 fields (total, unitPrice, totalPrice, plus aggregates) | `Math.round(value * 100)` (CLP has no decimals; USD/EUR multiply by 100) |
| Pre-computed `periods` object | 1 (transactions) | Drop — derive via `date_trunc()` in PostgreSQL |
| String enum categories → reference tables | ~5 fields (StoreCategory, ItemCategory) | Map to FK via seed data in `store_categories` / `item_categories` |
| `userId` redundant in user-scoped docs → `ownership_scope_id` FK | All collections | Extract from document path, map to `ownership_scope_id` |
| `normalizedX` lowercase fields → generated columns | 3 (merchant, category, item_name mappings) | Drop — use `GENERATED ALWAYS AS (lower(original))` |

## ETL acceptance criteria (baseline for Gate Migration-Dryrun)

Once the real BoletApp Firebase export is available:

1. **Row-count parity:** `COUNT(*)` per PostgreSQL table = document count per Firestore collection, per user.
2. **Money integrity:** `SUM(total_minor)` in PostgreSQL = `SUM(round(total * currency_factor))` in Firestore, per user. Zero tolerance.
3. **Item count parity:** `COUNT(*)` in `transaction_items` = `SUM(array_length(items))` across Firestore transactions, per user.
4. **Timestamp fidelity:** `MAX(ABS(pg_timestamp - firestore_timestamp))` < 1 second across all date fields.
5. **Referential integrity:** Every `transaction_items.transaction_id` references a valid `transactions.id`. Every FK is valid.
6. **No data loss:** Zero rows dropped during ETL. Failed conversions → `etl_errors` table for manual review.
7. **`user_edited_at` preservation:** Per plan A.10 primitive #5 — fields that users manually edited must carry their `user_edited_at` timestamp through the migration. ETL must detect and preserve these.

## Next steps

- [x] Obtain BoletApp Firebase credentials → service account at `boletapp/scripts/keys/serviceAccountKey.json`
- [x] Run admin export → 496 documents across 10 users, full data in `firestore-data-export.json`
- [x] Validate inventory against real document shapes → 24 fields on transactions, non-portable patterns confirmed
- [x] Feed collection→table mapping into A.10 (schema sketch) → `docs/rebuild/SCHEMA-SKETCH.md` section 14
- [x] Ensure `firestore-data-export.json` is in `.gitignore` (contains user PII)
