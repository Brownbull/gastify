# Data Model — "Warehouse shelves and labels — everything kept, named, findable."

> **Well G2** of 7. See [Gravity Wells Index](README.md) for the full map.

> SQLAlchemy ORM + Pydantic schemas + Alembic migrations. Money/FX/ownership schema invariants.

**Paths:** `backend/app/models/**`, `backend/app/schemas/**`, `backend/alembic/**`, `backend/app/reference/**`

---

## Purpose

Owns the persistent shape of every domain object: ORM tables (SQLAlchemy), API request/response contracts (Pydantic schemas), migration history (Alembic), and the canonical V4 category taxonomy (reference data). The data model enforces money/FX/ownership invariants via schema constraints and Postgres Row-Level Security (RLS), ensuring every tenant table is scoped to an `ownership_scope_id` and isolated at the database layer, not just in application code. Other wells depend on G2 for schema definitions but never bypass it to write raw SQL.

## Key Components

### ORM Models (`backend/app/models/`)

SQLAlchemy declarative table definitions with type-annotated Mapped columns:

- **`user.py`**: `OwnershipScope` (scope_type: individual/household/group, name for groups, invite token + expiry, member_visibility_enabled, icon/color avatar), `User` (firebase_uid, email, default_currency FK to currencies.code, ownership_scope_id FK), `OwnershipScopeMember` (ownership_scope_id, user_id, role, shares_detail opt-in flag for D73), `MobilePushToken` (user registration for push delivery, provider/platform/device_id, permission_status)

- **`transaction.py`**: `Transaction` (scope-bound, transaction_date, merchant, alias, total/discount/gross/reconstructed amounts in minor units, currency FK, card_alias_id, receipt_type, recurrence_kind/interval/term_current/term_total/label/source/confidence, scan_review_level + scan_review_signals JSON array, D74 is_shared + shared_by_user_id/shared_from_transaction_id provenance, D5 metric columns: llm_tokens_in/out, llm_cost_usd, scan/llm/queue/thumbnail durations), `TransactionItem` (sort_order, name, qty, unit/total price in minor units, discount, item_category_id FK, category_source, is_flagged boolean), `TransactionItemFlag` (scope-bound, item_id, user_id, flag_kind in (urgency, special_case) — D58 user-scoped association rows for personal exclusion), `TransactionImage` (image_url, is_thumbnail, sort_order)

- **`scan.py`**: `Scan` (scope-bound, status enum: submitted/processing/extracted/categorized/completed/failed/needs_review/queued, image_path, thumbnail_path, original_filename, content_type, file_size_bytes, submitted_at, processed_at, error_code/message, transaction_id durable link for D62 mobile poll fallback)

- **`statement.py`**: `CardAlias` (scope-bound, name, archived_at), `Statement` (scope-bound, card_alias_id FK, status enum: uploaded/password_required/password_invalid/queued/extracting/extracted/reconciling/completed/failed, file_path/sha256 dedup, file_size_bytes, ai_processing_consent audit, issuer/period_start/end/closing_date/due_date, currency, total_debit/credit/payment_due in minor units, pdf_status, is_encrypted, page_count, extraction metadata: provider/prompt_id/model_name/input_mode/llm_tokens/cost, fallback_reason, cache_status, routing_reasons JSON, confidence, warnings JSON), `StatementLine` (statement_id, source_order unique per statement, row_type, line_date, description, amount/currency, line_type enum, installment, original_currency/amount, card_alias_candidate, category_key, amount_selection_reason, amount_candidates JSON, ledger_ready boolean, confidence, warnings, source row/page evidence, field_provenance), `StatementReconciliationRun` (scope-bound, statement_id, status enum: pending/running/completed/failed, line/matched/statement_only/receipt_only/ambiguous/failed counts, coverage_ratio, error_code/message), `StatementReconciliationVerdict` (run_id, statement_line_id OR receipt_transaction_id, verdict enum: matched/statement_only/receipt_only/ambiguous/failed, score, reasons JSON)

- **`credit.py`**: `CreditBalance` (scope-bound, unique on ownership_scope_id, scan_credits BigInteger default 50, plan_tier: free/basic/pro schema-level monetization)

- **`fx.py`**: `FxRate` (PK: rate_date, from_currency, to_currency; rate Numeric(18,8), source text, created_at; write-once via ON CONFLICT DO NOTHING per D2)

- **`mapping.py`**: `MerchantMapping` (scope-bound, original_merchant, target_merchant, store_category_id FK, confidence, source, usage_count), `CategoryMapping` (scope-bound, original_item, target_item, target_category_id FK, merchant_pattern, confidence, source, usage_count)

- **`consent.py`**: `ConsentRecord` (scope-bound, user_id, purpose unique per user, status: granted/revoked, legal_basis, jurisdiction, granted_at, revoked_at, withdrawn_at for user-initiated GDPR Art 7(3), ip_address, user_agent), `ProcessingRegister` (purpose unique, description, legal_basis, data_categories, recipients, retention_period, jurisdictions, is_active), `AuditEvent` (scope-bound, user_id, event_type, resource_type/id, details, ip_address)

- **`reference.py`**: `Currency` (code PK, exponent SmallInteger for minor unit scaling, display_labels JSON), `StoreCategory` (id, key unique, level L1–L2, parent_id self-FK, display_labels JSON, is_sensitive, sort_order), `ItemCategory` (id, key unique, level L1–L4, parent_id self-FK, display_labels JSON, is_sensitive, sort_order)

### Pydantic Schemas (`backend/app/schemas/`)

Type-annotated request/response contracts with validation:

- **`common.py`**: `CamelModel` (camelCase config + from_attributes), `PaginatedResponse[T]` (data list, cursor, has_more), `ErrorDetail` (code, message, details dict)

- **`transaction.py`**: `TransactionCreate` (transaction_date, merchant, store_category_id/source/confidence, total/discount/gross/reconstructed in minor units, currency, receipt_type, recurrence_kind/interval, term fields, card_alias_id), `TransactionUpdate` (patch-style fields), `TransactionDetail` (full read + linked items/images), `TransactionItemResponse` (with flags list from D58), `BatchUpdateRequest`, `BatchDeleteRequest` for bulk ops

- **`scan.py`**: `ScanSubmission` (id, status, original_filename, content_type, file_size_bytes, image_path, thumbnail_path, submitted_at), `ScanResult` (status, processed_at, error_code/message, transaction_id durable link), `ScanEvent` (event_type, scan_id, step, progress_pct 0–100, data/error dicts), `ScanReviewSignal` (code enum: math_reconciliation_delta/item_structure_changed/discount_evidence_unresolved/visible_total_conflict/synthesized_service_item, severity: warning/needs_review, source_stage: extraction/postprocess/math_gate, message, details dict), `ScanCompleteLineItem` (item details from extraction)

- **`statement.py`**: `StatementUploadResponse` (status, extraction_provider, usage/cost metadata), `StatementLineResponse` (line_date, description, amount, verdict: matched/statement_only/receipt_only/ambiguous, confidence, warnings), `StatementReconciliationRunResponse` (status, counts, coverage_ratio), `ReconciliationBucketResponse` (matched/unmatched/statement_only/receipt_only lists)

- **`insights.py`**: `InsightCategoryRollup` (dimension: transaction_category/item_category, category_key/level, parent_key/level, label, parent_label, total_minor, currency, share_of_total_percent 0–100, transaction/item counts, excluded_total_minor for D58 personal exclusions), `MonthlyInsightsResponse` (month, currency, total_minor, top_categories capped at 5 per D56, gravity_center rows, rollup rows with taxonomy parent validation), `InsightsSeriesResponse` (granularity: week/month/quarter/year, months data array), `InsightsTreeResponse` (category_key, category_level, total_minor, children tree)

- **`recurrence.py`**: Type literals `RecurrenceKind` (none/fixed_term/recurring/unknown), `RecurrenceInterval` (monthly/weekly/biweekly/annual/custom/unknown), `RecurrenceSource` (statement/receipt/user/inferred/none), `RecurrenceHint` (kind, interval, term_current, term_total, label)

- **`consent.py`**: `ConsentGrant` (purpose, legal_basis, jurisdiction), `ConsentResponse` (status, granted_at, revoked_at), `DataAccessResponse` (export all user data), `ErasureResponse` (DSR deletion proof), `PortabilityResponse` (data portability), `RectificationRequest` (correct data)

- **`push_tokens.py`**: `PushTokenRegistration` (token, provider: expo/fcm, platform: ios/android/web, device_id, app_environment, app_version), `PushTokenUnregister` (token), `PushTokenResponse` (enabled, last_seen_at, permission_status)

- **`statement_profile.py`**: Fixed row contract for unknown statement fallback layouts (internal structures for layout profiling)

### Reference Data (`backend/app/reference/`)

- **`categories.py`**: Canonical V4 four-level taxonomy defined as Python dicts/lists, both `V4_STORE_CATEGORY_TAXONOMY` (L1 Industry → L2 Business Type) and `V4_ITEM_CATEGORY_TAXONOMY` (L1 Industry → L2 Business Type → L3 Family → L4 Category). `render_v4_taxonomy_prompt()` generates taxonomy text for G4 Gemini prompts. `SPANISH_TO_ENGLISH_CATEGORY_KEYS` map for category key normalization. `CategoryDefinition` dataclass: key, level, parent_key, label, display_labels dict.

### Alembic Migrations (`backend/alembic/versions/`)

22+ ordered schema versions tracked in revision chain:

| Migration | Adds |
|-----------|------|
| 001 | currencies, store_categories, item_categories, ownership_scopes, users, transactions, transaction_items, transaction_images, merchant_mappings, category_mappings |
| 002 | fx_rates (PK: rate_date, from_currency, to_currency) |
| 003 | credit_balances + RLS policies on transactions, merchant_mappings, category_mappings, credit_balances, ownership_scope_members (deny-by-default via ownership_scope_id GUC) |
| 004 | consent_records, processing_register, audit_events + RLS policies |
| 005 | scan metric columns: llm_tokens_in/out, llm_cost_usd, scan_duration_ms, llm_latency_ms, queue_wait_ms, thumbnail_gen_ms |
| 006 | scans table + ScanStatus enum lifecycle |
| 007–010 | V4 taxonomy seed (store categories L1–L2, item categories L1–L4) + hierarchy FK parent_id |
| 011 | merchant_mappings, category_mappings with scope/usage provenance |
| 012 | transaction reconciliation totals (gross_total_minor, reconstructed_total_minor, discount_total_minor) |
| 013 | scan_review_level (none/warning/needs_review) + scan_review_signals JSON array on transactions |
| 014 | mobile_push_tokens table (scope-bound, provider/platform/device metadata) |
| 015 | card_aliases, statements, statement_lines, statement_reconciliation_runs/verdicts + RLS |
| 016 | same-scope FK constraints on statement/card-alias |
| 017 | recurrence fields: kind, interval, term_current/total, label, source, confidence |
| 018 | statement ai_processing_consent audit field |
| 019 | statement_line fallback evidence: ledger_ready, source_row_index, source_page, amount_candidates JSON, field_provenance JSON |
| 020 | statement extraction usage metadata: provider, prompt_id, model_name, input_mode, llm token/cost, fallback_reason, cache_status, routing_reasons JSON |
| 021 | statement_unidentified item category source enum value |
| 022 | transaction_item_flags table (scope-bound, item_id + user_id + flag_kind unique constraint, RLS) |
| 023 | consent_withdrawn_at field for GDPR Art 7(3) withdrawal tracking |
| 024 | scan status QUEUED for quota-throttled scans (graceful degradation, not FAILED) |
| 025–027 | RLS policy hardening: current_setting('app.ownership_scope_id', true) with missing_ok flag for fail-safe NULL handling |
| 028 | scope_type widened to include 'group', ownership_scopes.name, app_is_scope_member(uuid, uuid) SECURITY DEFINER oracle function |

### Row-Level Security (RLS)

Postgres policies enforced at query execution time, not application level:

- **Scope-isolation policy** (003): `ownership_scope_id = current_setting('app.ownership_scope_id')::uuid` (cast-safe via missing_ok, NULLIF to '' on unset)
- **Nested cascade** (transaction_items, transaction_images): `transaction_id IN (SELECT id FROM transactions WHERE ownership_scope_id = current_setting('app.ownership_scope_id')::uuid)`
- **Statement cascade** (statement_lines, reconciliation_runs/verdicts): `statement_id IN (SELECT id FROM statements WHERE ownership_scope_id = current_setting('app.ownership_scope_id')::uuid)`
- **Membership oracle** (028): `app_is_scope_member(p_user_id uuid, p_scope_id uuid) RETURNS boolean` — SECURITY DEFINER, swaps GUC momentarily to read membership, restores on return; validates group membership before scope-swap (D70)
- All tables use `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + `FORCE ROW LEVEL SECURITY` so even the table owner (gastify_app role) is subject to policies; gastify_migrator owns the oracle with pinned search_path for DEFINER context

## Key Decisions

### D2 (2026-04-23): Money + FX — Ent tier

**Reason**: Financial-data backup is a red-line; lazy FX cache per (date, from, to) triggered on first transaction of day, no scheduler. Retry + explicit 3s timeout mandatory on transaction-create path.

**Implementation**:
- All amounts stored as `BigInteger` minor units (e.g., 1234 cents = $12.34); ZERO_EXPONENT_CURRENCIES set handles zero-decimal currencies (CLP).
- FxRate table: composite PK on (rate_date, from_currency, to_currency); `INSERT ... ON CONFLICT DO NOTHING` + re-read yields winning row; cold-start race results in ≤1 duplicate external call, no data corruption (structural idempotency, D2 Ent at zero code cost).
- Integration.Retry: exp backoff 3x on FX API flakes.
- Integration.Timeout: explicit 3s + fail on transaction-create path; no blocking on stalled external.

**Review trigger**: FX backfill/UPDATE path added (structural idempotency breaks), external bill exceeds budget, second FX provider added.

### D3 (2026-04-23): Identity + RLS — Ent tier

**Reason**: RLS correctness load-bearing for SC-07 (privacy by default) + SC-08 (sign-out isolation); ownership leak post-launch catastrophic.

**Implementation**:
- Every tenant table has `ownership_scope_id FK` to `OwnershipScope`.
- Postgres RLS policies keyed off `current_setting('app.ownership_scope_id')` set per-request by auth/deps.py via `SET LOCAL`.
- Bearer-token-only API (no cookies) = no CSRF surface.
- Defense-in-depth: even a buggy query cannot leak cross-tenant data because RLS is enforced at query execution, not app layer.
- Multi-tenant.Row-isolation: MVP `WHERE tenant_id` → **Ent** RLS policy (non-negotiable).

**Review trigger**: Cookie-based session added (escalate CSRF to Ent), household multi-user activates (re-test RLS), second tenant-class added.

### D4 (2026-04-23): Consent + DSR — Ent tier

**Reason**: Four-jurisdiction compliance (Law 21.719 + GDPR + PIPEDA + CCPA/CPRA) hard legal constraint.

**Implementation**:
- ConsentRecord table: per-user per-purpose with status (granted/revoked), legal_basis, jurisdiction, granted_at, revoked_at, withdrawn_at for GDPR Art 7(3) user-initiated withdrawal.
- ProcessingRegister table: purpose unique, description, data_categories, recipients, retention_period, jurisdictions, is_active.
- AuditEvent table: scope-bound, event_type, resource_type/id, details, ip_address; load-bearing for DSR proof-of-processing.
- All tables RLS-gated and auditable forever (no deletes, only logical status flags).

**Review trigger**: New jurisdiction added, regulatory enforcement, audit log volume exceeds queryable threshold.

### D5 (2026-04-23): Observability — Scale tier (Obs override)

**Reason**: REQ-21 per-scan metric columns mandatory at P1 exit; Core tier ladder: MVP `print/log` → Ent `structured` → Scale `+metrics+traces`.

**Implementation**:
- Transaction table: llm_tokens_in/out, llm_cost_usd, scan_duration_ms, llm_latency_ms, queue_wait_ms, thumbnail_gen_ms (migration 005).
- Scan table: submitted_at, processed_at, error_code/message (migration 006).
- Structured logs + metrics exporter wired at scaffold time (no retroactive migration).

**Review trigger**: REQ-21 metric schema changes, OTel/Prometheus replaced, per-scan metric cardinality exceeds budget.

### D48 (2026-05-24): Card alias + statement schema — Ent tier

**Reason**: Statement tables touch financial data, ownership scope, RLS, migration ordering, PCI boundary; schema stability required before runtime behavior.

**Implementation**:
- CardAlias (scope-bound, simple named alias for statement source cards).
- Statement (scope-bound, file_path dedup via sha256, ai_processing_consent audit, currency, period_start/end, extraction metadata: provider/prompt_id/model_name/input_mode/tokens/cost).
- StatementLine (source_order unique, line_date, description, amount, line_type enum, amount_candidates JSON, field_provenance JSON).
- StatementReconciliationRun/Verdict (tracks matching verdicts: matched/statement_only/receipt_only/ambiguous/failed).

**Review trigger**: PCI-shaped fields appear, ownership scope/card alias model changes.

### D56 (2026-05-28): P6 analytics contract — Ent tier

**Reason**: Analytics is a user-facing trust surface; fixture-backed deterministic contracts prevent taxonomy/currency/edit drift before UI work.

**Implementation**:
- MonthlyInsightsResponse (monthly totals by currency, top categories L2 store capped at 5, top items L4 capped at 5, gravity-center rows).
- CategoryRollup validation: strict taxonomy parent-path checks, prevent silent axis swaps.
- Insights seeded with 3-month fixture corpus; all expected outputs deterministic and verifiable.

**Review trigger**: Analytics schema changes, taxonomy parent model changes.

### D58 (2026-05-28): P6 item flags — Ent tier

**Reason**: Item flags are personal privacy/context markers; aggregate exclusion must not mutate transaction detail or leak into future shared/cohort contexts.

**Implementation**:
- TransactionItemFlag association table (migration 022): scope-bound, item_id, user_id, flag_kind (urgency/special_case), unique (item, user, kind).
- Legacy transaction_items.is_flagged boolean remains for input compat.
- API response: excluded_total_minor on InsightCategoryRollup; detail view always shows original items (never hidden).
- Aggregate exclusion is personal-scope only; group analytics exclude personal flags, never the transaction data itself.

**Review trigger**: Household sharing consumes item flags, cohort benchmarking needs item annotations.

### D69 (2026-06-03): Analytics scope-swap via RLS

**Reason**: Groups require whole-app view switch from personal to group scope; server-aggregated drill-down prevents leaking group data to client buffer.

**Implementation**:
- Deliberate scope-swap: auth/deps.py calls app_is_scope_member(user_id, group_scope_id) oracle (SECURITY DEFINER).
- On true, `SET LOCAL app.ownership_scope_id = group_scope_id` for analytics query window only.
- Server returns group-scoped aggregates; client never holds cross-scope data.
- RLS policies enforce isolation automatically; app code cannot accidentally query wrong scope.

**Review trigger**: Analytics depend on UI concerns, scope-swap model changes.

### D70 (2026-06-03): Groups product model — Ent tier

**Reason**: Whole-app scope-switch (personal/group), scan-personal-only, share-to-group provenance, invite-links, aggregates-by-default + consent-gated detail (D73).

**Implementation**:
- OwnershipScope.scope_type: 'individual' / 'household' / 'group' (migration 028).
- OwnershipScope.name: human-readable group name (NULL for personal).
- OwnershipScope.invite_token + invite_token_expires_at for invite-link sharing.
- Transaction: shared_by_user_id, shared_from_transaction_id for share provenance; is_shared=true on source locks content (D74).
- OwnershipScopeMember: role, shares_detail opt-in (D73).
- Scans always personal-scope; shares are post-scan snapshots.

**Review trigger**: Share model changes, group ownership changes.

### D73 (2026-06-04): Member visibility consent-gated — Ent

**Reason**: Groups show aggregates by default for privacy; individual transaction detail opt-in per member.

**Implementation**:
- OwnershipScope.member_visibility_enabled: group-level setting (admin toggle).
- OwnershipScopeMember.shares_detail: per-member opt-in to expose individual transactions.
- Group list view: always shows aggregates (no RLS change); drilldown to member detail only if both flags enabled.
- No new RLS; filtering in API response layer.

### D74 (2026-06-03): Transaction lock-on-share

**Reason**: Once shared, group snapshot must be immutable so math gate results don't drift; source source becomes permanent archive.

**Implementation**:
- Transaction.is_shared=true set once on PERSONAL source when first shared_from_transaction_id appears in any group.
- Immutable: merchant, store_category, items (including names/categories), amounts (total/discount/reconstructed), currency, transaction_date.
- Mutable: card_alias pairing, recurrence edits, item flags, delete.
- Permanent; never cleared.

### D75 (2026-06-03): Group avatar

**Reason**: Groups need visual identity in UI; emoji icon + color simple and product-natural.

**Implementation**:
- OwnershipScope.icon: emoji string (NULL = client default 🏠).
- OwnershipScope.color: hex color string (NULL = client default accent).
- Set by group owner/admin alongside rename.
- Only meaningful for group scopes; personal scopes leave NULL.

## Invariants

1. **Ownership scope isolation (D3)**: Every tenant table has `ownership_scope_id FK` and RLS policy. One missed WHERE = leak. RLS is non-negotiable (FORCE ROW LEVEL SECURITY for table owner too).

2. **Minor-unit monetary amounts (D2)**: All stored as `BigInteger` (e.g., 1234 = $12.34 USD or $1,234 CLP). ZERO_EXPONENT_CURRENCIES handles currencies with no decimal places.

3. **FX idempotency (D2)**: FxRate PK is `(rate_date, from_currency, to_currency)`. `INSERT ... ON CONFLICT DO NOTHING` + re-read guarantees ≤1 external call per day per pair, even under concurrent transactions.

4. **Transaction lock-on-share (D74)**: Once `is_shared=true`, content is immutable: merchant, category, items, amounts, currency, date locked forever. Tangential ops (card pairing, recurrence, item flags, delete) allowed.

5. **Item flag user-scope (D58)**: TransactionItemFlag rows store (item_id, user_id, ownership_scope_id, flag_kind) with unique constraint. Aggregate exclusion is personal-scope only; transaction detail never hides items.

6. **Group membership oracle (D70, D28)**: `app_is_scope_member(p_user_id uuid, p_scope_id uuid)` is SECURITY DEFINER, momentarily swaps GUC to read membership, restores prior GUC on return. Validates membership before scope-swap (validate-then-swap, never swap-then-check).

7. **Recurrence validity (migration 017)**: `recurrence_kind='fixed_term'` mandates `term_total NOT NULL`; `term_current <= term_total` always; both ≥1. Prevents invalid payment-plan states.

8. **Scan review immutability**: `scan_review_signals` JSON array persisted once during math gate; never mutated post-persist. `scan_review_level` in ('none', 'warning', 'needs_review').

9. **Statement line ordering (migration 015)**: `StatementLine.source_order` (SmallInteger) unique per statement. Prevents accidental reordering that breaks reconciliation verdicts.

10. **Consent granularity (D4, migration 004)**: One ConsentRecord per user per purpose. Status in ('granted', 'revoked'). `withdrawn_at` tracks user-initiated GDPR Art 7(3) withdrawal; `revoked_at` tracks system actions (DSR erasure). Never deleted; auditable forever.

11. **Analytics rollup cap (D56, migration 021)**: Top categories capped at 5 per dimension (L2 store / L4 item); prevents silent axis swaps in future UI work.

12. **Category taxonomy hierarchy (migrations 007–010, reference/categories.py)**: V4 taxonomy is immutable canonical source; both store (L1–L2) and item (L1–L4) categories seed from it. Prompt text for G4 agents generated from same source, ensuring consistency.
