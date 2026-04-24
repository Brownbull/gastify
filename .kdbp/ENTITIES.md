# Entities

<!-- Project-level principal entities — the nouns gastify traffics in. -->
<!-- Consumed by /gabe-mockup M4 to populate INDEX.md §4 CRUD×entity matrix. -->
<!-- Consumed by queued backend plan (FastAPI models, SQLAlchemy ORM, Alembic migrations). -->

**Project:** gastify
**Last updated:** 2026-04-24
**Source:** derived from SCOPE.md REQ-01..REQ-27

---

## Entities

| Entity | Description | Related REQs | Screens (C/R/U/D) populated in INDEX.md §4 |
|--------|-------------|--------------|---------------------------------------------|
| Receipt | Raw scanned document (image + OCR'd text) before item-level extraction. Becomes Transaction + Items after REQ-02 worker completes | REQ-01, REQ-02, REQ-04 | filled by /gabe-mockup M4 |
| Transaction | Core ledger entry — merchant, amount, date, category, user edits. One receipt → one transaction (plus N line items) | REQ-05, REQ-06, REQ-08, REQ-12, REQ-13, REQ-17, REQ-18 | filled by /gabe-mockup M4 |
| Item | Line item within a transaction (goods / services / tax). Flagged for urgency per REQ-11 | REQ-02, REQ-03, REQ-10, REQ-11 | filled by /gabe-mockup M4 |
| Statement | Uploaded bank / card statement document. Async-extracted into N transactions + reconciled against existing receipts | REQ-07, REQ-08, REQ-20 (encrypted-pw consent) | filled by /gabe-mockup M4 |
| CardAlias | Learned user→card-brand→category mapping. CRUDable — users review+delete mappings per REQ-09 | REQ-09 | filled by /gabe-mockup M4 |
| Group | Shared-expense workspace. Multi-tenant scope (REQ-15): owner + members, roles, invites, admin actions | REQ-15 | filled by /gabe-mockup M4 |
| User | Account identity — JIT-provisioned via managed-auth (REQ-16). Sign-out isolated across 3 clients (REQ-14) | REQ-14, REQ-15, REQ-16 | filled by /gabe-mockup M4 |
| Alert | Push notification / in-app alert. Unread badge + categorized types (scan-complete, anomaly-flagged, credit-low, sync-conflict) | REQ-25 | filled by /gabe-mockup M4 |
| Consent | Jurisdiction agreement record — 4-variant (CL / LATAM / EU / US+CA). Immutable after accept; re-prompted on jurisdiction switch | REQ-20 | filled by /gabe-mockup M4 |

---

## Field hints (rough data-shape — feeds HANDOFF.json components)

### Receipt
- `id` — UUID
- `user_id` — FK User
- `image_path` — S3 / storage ref
- `captured_at` — ISO 8601
- `capture_mode` — `single | batch | statement | qr-caf | manual`
- `extraction_status` — `pending | processing | complete | error`
- `raw_ocr` — nullable text
- `credit_cost` — integer (counts toward user credit limit)

### Transaction
- `id` — UUID
- `user_id` — FK User
- `group_id` — FK Group (nullable — personal when null)
- `receipt_id` — FK Receipt (nullable — manual entries have no receipt)
- `merchant` — string
- `amount_minor` — integer (per REQ-17 minor units)
- `currency_code` — ISO 4217
- `tx_date` — date
- `created_at` — ISO 8601
- `updated_at` — ISO 8601
- `category_l1..l4` — 4-level V4 taxonomy
- `is_anomaly` — boolean (REQ-10 concentration check)
- `is_user_edited` — boolean (REQ-13 edit-precedence flag)
- `fx_snapshot_usd` — nullable string (REQ-18 USD shadow)

### Item
- `id` — UUID
- `transaction_id` — FK Transaction
- `name` — string
- `amount_minor` — integer
- `quantity` — integer
- `item_category` — string
- `urgency_flag` — boolean (REQ-11)

### Statement
- `id` — UUID
- `user_id` — FK User
- `file_path` — encrypted blob ref
- `uploaded_at` — ISO 8601
- `processing_status` — `pending | extracting | reviewing | reconciled | error`
- `extracted_count` — integer
- `reconciled_count` — integer
- `conflict_count` — integer
- `encryption_key_hash` — string (pw-protected PDFs per REQ-07)

### CardAlias
- `id` — UUID
- `user_id` — FK User
- `last_4` — string
- `brand` — string (visa / mastercard / amex / ...)
- `learned_category` — string (V4 taxonomy anchor)
- `confidence` — float 0-1
- `confirmed_at` — nullable ISO 8601

### Group
- `id` — UUID
- `name` — string
- `owner_id` — FK User
- `created_at` — ISO 8601
- `member_count` — integer
- `invite_link_token` — string (rotatable)
- `policy` — enum (strict / open / admin-approve)

### User
- `id` — UUID
- `auth_provider_id` — string (firebase-auth sub)
- `email` — string
- `jurisdiction` — enum (CL / LATAM / EU / US-CA)
- `locale` — IETF language tag
- `currency_default` — ISO 4217
- `credit_balance` — integer
- `created_at` — ISO 8601
- `last_signin_at` — ISO 8601

### Alert
- `id` — UUID
- `user_id` — FK User
- `type` — enum (scan-complete / anomaly / credit-low / sync-conflict / ... )
- `title` — string
- `body` — string
- `created_at` — ISO 8601
- `read_at` — nullable ISO 8601
- `action_url` — nullable string (deep-link)

### Consent
- `id` — UUID
- `user_id` — FK User
- `jurisdiction` — enum (CL / LATAM / EU / US-CA)
- `version` — string (consent-copy version)
- `accepted_at` — ISO 8601
- `ip_address_hash` — string
- `user_agent_hash` — string

---

## Lifecycle invariants

- **Receipt** — cannot be deleted once a Transaction references it (FK constraint). Screen `transaction-editor` disables the "delete receipt" action when a derived transaction exists.
- **Transaction** — immutable per REQ-13 once `is_user_edited=true` AND a downstream analytics snapshot exists. Editor surfaces hard-lock mode on confirmation.
- **Statement** — extraction is one-shot; if marked `reconciled`, revert-to-pending is disabled. Edge case: `conflict_count > 0` requires reconciliation review screen.
- **Group** — owner cannot leave until another admin is promoted OR group deleted. Confirm-delete cascades to tx-group unlink (transactions revert to personal).
- **User** — sign-out isolates auth tokens on that device only (REQ-14). Other devices continue to function.
- **Consent** — immutable after accept. Re-prompt on jurisdiction switch OR consent-copy version bump.

---

## Relationships

- User has many Receipts, Transactions, Statements, CardAliases, Alerts, Consents
- User belongs to many Groups (many-to-many via GroupMembership)
- Group has many Transactions (via Transaction.group_id FK)
- Receipt has many Items (through derived Transaction)
- Transaction has many Items
- Transaction belongs to Group (optional — personal if null)
- Statement has many Transactions (extracted)
- Consent ← one per (User, jurisdiction) pair (PK composite)

---

## Out of scope (not principal entities)

- **FxSnapshot** — side-table for REQ-18 USD shadow. Lives as Transaction field, not standalone entity from the mockup's perspective.
- **Category** — static taxonomy (86 V4 categories). Reference data, not CRUDable by user; lives in backend seed data + display-locale map (REQ-03).
- **CohortBenchmark** — DP-engineered aggregate (REQ-27). Not user-CRUDable; surfaces only as insight in Trends screen.
