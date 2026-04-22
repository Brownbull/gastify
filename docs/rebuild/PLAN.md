# Gastify Rebuild — Implementation Plan (Graph)

**Date:** 2026-04-21
**Status:** Approved — graph-structured, two parallel workstreams + Integration + Cutover
**Source prompt:** [`ultraplan-rebuild-prompt.md`](ultraplan-rebuild-prompt.md)
**Architecture basis:** [`ADR-2026-04-20-REBUILD-STACK.md`](ADR-2026-04-20-REBUILD-STACK.md)
**UX workstream:** [`UX-PLAN.md`](UX-PLAN.md)
**Retrospective (MANDATORY READ):** [`LESSONS.md`](LESSONS.md) — 13 rules R1-R13 derived from observed failures; each binds to a phase below. PR review checklist in §6.
**Source snapshot:** [`REFERENCE-SNAPSHOT.md`](REFERENCE-SNAPSHOT.md) — pinned commit + file refs back to the current app

---

## Legend

- `B0..Bn` = Backend/Infra phases (Workstream B)
- `A0..A7` = UX phases (Workstream A, per UX-PLAN.md)
- `I1..I4` = Integration phases
- `C1..C4` = Cutover phases
- `→` = hard dependency (must finish first)
- `‖` = can run in parallel

---

## Dependency Graph

```
                 ┌────────────────────────────────────────┐
                 │  B0 Monorepo scaffold + tooling + CI   │
                 └────────────┬───────────────────────────┘
                              │
            ┌─────────────────┼──────────────────┐
            ▼                 ▼                  ▼
       [Workstream A]   [Workstream B]     [B11 sandbox harness]
            │           (see B-track DAG)        │
            ▼                                    │
       A0→A1→A2→A3→A4→(A5‖A6)→A7                 │
            │           ▲                        │
            │           └────────────────────────┘
            ▼           (B11 unblocks B-tracks independently of A)

      Workstream B internal DAG:
        B0 → B1  (DB schema + migrations + seed)
        B0 → B2  (auth middleware, firebase-admin)
        B0 → B3  (category codegen pipeline)
        B0 → B9  (file storage — Railway Volume + R2 fallback)
        B0 → B11 (sandbox testing harness, cached Gemini)

        B1 → B5  (core CRUD API: transactions, items, images, credits, prefs)
        B2 → B5
        B3 → B5

        B1 + B3 + B9 + B11 → B4  (async scan pipeline — SKIP LOCKED + LISTEN/NOTIFY + SSE)
        B4 → B7  (observability: structlog, scan_events, /trace endpoint)
        B4 → B8  (rate limiting: per-user + pybreaker + minute-window)
                 [B7 + B8 can start as stubs alongside B4, harden after B4 green]

        B5 → B6  (analytics endpoints)
        B5 → B10 (cross-app Gustify mapping endpoints)
        B5 → B12 (Railway deploy once API surface stable)
        B4 → B12

        B1 + B5 + B6 stable → B13 (Firestore → Postgres migration script)
        B13 → C1

      Integration:
        A7 (UX handoff) ‖ B12 (backend deployed) → I1 (frontend scaffold)
        I1 → I2 (component impl) → I3 (API wiring + SSE) → I4 (E2E)

      Cutover:
        I4 + B13 → C1 (prep) → C2 (backup) → C3 (window) → C4 (30-day cooldown)
```

---

## Phase 0 — Shared Foundation

### B0: Monorepo Scaffold + Tooling + CI `(blocks everything)`

**Layout:**
```
gastify/
├── apps/
│   ├── api/              # FastAPI backend
│   ├── worker/           # Scan worker (shares /app code with api)
│   └── web/              # React frontend (built in I1)
├── shared/
│   ├── categories.json   # SSoT (ADR D5)
│   ├── categories.py     # generated (import-time)
│   └── categories.ts     # generated (pre-commit)
├── scripts/
│   ├── gen_categories.py
│   └── migrate_from_firestore.py
├── alembic/              # migrations
├── tests/
│   ├── contract/         # OpenAPI contract
│   ├── integration/      # Postgres + fake Gemini
│   └── e2e/              # Playwright (later)
├── infra/
│   └── railway.toml
├── pyproject.toml
├── package.json          # workspace root for apps/web + shared/ts
└── .github/workflows/
```

**Tooling:**
- Python 3.12 + `uv` (faster than poetry; ADR not opinionated)
- Ruff + Pyright (strict)
- Pre-commit: ruff, pyright, `gen_categories.py` diff-check, gitleaks
- CI: lint → typecheck → regenerate categories → pytest (unit + contract) → build Docker image

**Deliverable:** empty skeleton green on CI. Health check `/healthz` returns 200.

**Est:** 1-2 days.

---

## Workstream A — UX (parallel to B after B0)

Executes **per UX-PLAN.md §2**. Already specified. Summary of dependency chain:

| Phase | Name | Days | Deps |
|-------|------|------|------|
| **A0 = U0** | User Journey Inventory | 1 | B0 |
| **A1 = U1** | Information Architecture | 0.5 | A0 |
| **A2 = U2** | Low-fi Wireframes (Claude Design) | 2-3 | A1 |
| **A3 = U3** | Component Library | 1-2 | A2 |
| **A4 = U4** | Hi-fi Mockups | 3-5 | A3 |
| **A5 = U5** | Interaction & Motion Specs | 1 | A4 |
| **A6 = U6** | Accessibility Review (WCAG 2.1 AA) | 1 | A4 |
| **A7 = U7** | Dev Handoff Bundle | 0.5 | A5 + A6 |

**Parallelism within A:** A5 and A6 can run concurrently (both consume A4, both feed A7).

**Output:** `docs/rebuild/ux/handoff/` — full bundle with mockups, component spec, design tokens, interaction specs, a11y checklist.

**Est:** ~2 weeks serial (per UX-PLAN timeline).

---

## Workstream B — Backend/Infra (parallel to A, internal DAG)

### B1: Database Foundation `deps: B0`

**Scope:**
- Alembic init + first migration: all 18 tables from ADR
- Generated columns: `email_normalized`, `period_*`, `name_normalized`
- Indexes: all listed in prompt §Indexes
- `pg_cron` extension + 4 scheduled jobs (stale-scan reaper 5min, gemini_call_windows cleanup hourly, scan_events 90-day prune, pending_scans 30-day prune)
- Seed data: `currencies` (CLP, USD, EUR)
- Local dev: docker-compose `postgres:16` + `pg_cron` build
- Integration test: spin up disposable Postgres, run all migrations, assert schema matches

**Non-goals:** No ORM model code yet — raw migration only. ORM models land in B5.

**Deliverable:** `alembic upgrade head` produces full schema from empty DB. `pytest tests/integration/test_schema.py` green.

**Est:** 2 days.

---

### B2: Auth Middleware `deps: B0`

**Scope:**
- `firebase-admin` integration, service account via Railway env
- FastAPI dependency `get_current_user(token: str)` — validates Firebase ID token, resolves to local `users.id`
- JIT-provisioning on first sign-in: insert `users` row with `auth_provider='firebase'`, `auth_provider_id=<firebase_uid>`, plus `user_credits` row (balance=10)
- `POST /api/v1/auth/google` — exchange Firebase ID token for session (stateless, returns user profile; ID token remains the bearer)
- `GET /api/v1/auth/me`
- Token caching: validated Firebase tokens cached 5min in-process (cut admin SDK calls)

**Non-goals:** No refresh flow; rely on Firebase client SDK's silent refresh. No JWT issuance — pass-through validation only.

**Deliverable:** contract test: valid Firebase token → 200 with user payload; expired → 401; missing → 401.

**Est:** 1-2 days.

---

### B3: Category Codegen Pipeline `deps: B0`

**Scope:**
- `shared/categories.json` authored per prompt §Taxonomy (12 L1 + 44 L2 + 9 L3 + 42 L4 — exact match)
- `scripts/gen_categories.py`:
  - Python output: `shared/categories.py` with `StoreCategoryGroup`, `StoreCategory`, `ItemCategoryGroup`, `ItemCategory` as `enum.StrEnum` + parent-lookup dicts + `is_food_candidate(item_cat)` helper
  - TypeScript output: `shared/categories.ts` with `as const` arrays + union types + parent-lookup maps + `display[locale]` map
- Pre-commit hook: regenerate + diff-check staged JSON
- CI job: regenerate from scratch, fail on drift

**Deliverable:** drift test in CI fails if someone edits `.ts` or `.py` directly. Pydantic import succeeds.

**Est:** 1 day.

---

### B9: File Storage `deps: B0`

**Scope:**
- `StorageService` interface: `upload(bytes, key) → url`, `get(key) → bytes`, `delete(key)`
- Primary impl: Railway Volume (mounted filesystem)
- Fallback impl: Cloudflare R2 (`aioboto3` S3-compat)
- Strategy pattern chosen via env `STORAGE_BACKEND=railway_volume|r2`
- Image processing: Pillow resize to 1200×1600, JPEG 80% quality + 120×160 thumbnail
- Content-hash key pattern: `{user_id}/{sha256[0:16]}.jpg` (enables scan re-import fast path cited in memory/epic18)

**Deliverable:** round-trip test: upload image → GET url returns bytes. Test runs against both backends.

**Est:** 2 days.

---

### B11: Sandbox Testing Harness `deps: B0; consumed by B4, B5, B6`

**Scope:**
- `pytest` fixtures for disposable Postgres (testcontainers or docker-compose)
- Cached Gemini response library under `tests/fixtures/gemini/` — keyed by SHA-256 of input images. Live mode (`PYTEST_GEMINI=live`) calls real API and updates cache. Default mode replays cache → deterministic tests.
- `simulated_frontend_client` fixture: async httpx client pre-authed as test user with seeded credits
- OpenAPI contract tests: `schemathesis` runs against live FastAPI instance, asserts spec compliance

**Why upfront:** Workstream A runs in parallel; B needs to validate against simulated frontend payloads, not the real one. This harness IS the stand-in for the real UI.

**Deliverable:** `pytest tests/sandbox/test_user_journey_scan.py` runs a full synthetic scan flow using cached Gemini, Postgres container, simulated client.

**Est:** 2-3 days.

---

### B5: Core CRUD API `deps: B1, B2, B3`

**Scope:** REST endpoints from prompt §API Design, non-scan/non-analytics half:
- `GET/POST/PATCH/DELETE /api/v1/transactions` (+ items, images)
- `GET /api/v1/items` flattened view + `/items/aggregated`
- `GET /api/v1/mappings/{merchants,items,item-names}` (learning)
- `GET/PATCH /api/v1/preferences`
- `GET/PATCH /api/v1/notifications`
- `POST /api/v1/uploads/receipt-images` → uses B9 storage
- `GET /api/v1/export/csv`
- `GET /api/v1/credits`

**Constraints:**
- Pydantic v2 models with `model_config = ConfigDict(from_attributes=True)`
- SQLAlchemy 2.0 async; every request = one session; repository pattern per entity
- 90-day edit-window guard (ADR D15): middleware blocks PATCH/DELETE on transactions older than `now() - interval '90 days'`
- Soft-delete via `deleted_at` on transactions (UX-11 constrained to ≤90 days)
- Pagination: cursor-based on `(date DESC, id DESC)`; page size 50

**Deliverable:** contract test covers every endpoint; coverage ≥80% on `apps/api/routes/`.

**Est:** 5-6 days (biggest B-phase).

---

### B4: Async Scan Pipeline `deps: B1, B3, B9, B11`

**Scope:** per prompt §Async Scan Pipeline (Critical). Full implementation:
- `POST /api/v1/scans/queue` — atomic deduct + insert + notify in one transaction
- Worker process `python -m apps.worker`:
  - `LISTEN scan_queued` + 5s poll fallback
  - Claim row via `SELECT ... FOR UPDATE SKIP LOCKED`
  - Gemini slot claim via `gemini_call_windows` counter (B8 stub acceptable first pass)
  - `pybreaker` wrap on Gemini call (B8 hardens later)
  - Pydantic `output_type` (U4 — mechanical enforcement, not prompt-based)
  - Thumbnail generation via B9
  - Completion transaction: `status='completed'` + `pg_notify('scan_done_'||user_id)`
  - Failure transaction: `status='failed'` + credit refund + `scan_events` row
- `DELETE /api/v1/scans/{id}` cancellation with refund
- `GET /api/v1/scans/stream` — SSE endpoint using `EventSourceResponse`, one Postgres connection per client holding `LISTEN scan_done_<user_id>`
- Statement variant: `POST /api/v1/statements/queue` + statement prompt variant in worker, emits transaction-array result
- **Re-import fast path:** content-hash lookup before Gemini call (skip if seen, return cached result)

**Streaming contract (U5 — Stream the Thinking):** SSE emits `scan_event` messages matching `scan_events` rows: `queued → picked_up → gemini_start → gemini_end → completed|failed`. Frontend maps to narrative states per UX-1.

**Deliverable:** sandbox test: queue 3 scans concurrently → all 3 complete; inject Gemini failure on scan #2 → credit refunded; kill worker mid-scan #3 → reaper picks up within 10min; SSE stream delivers events in order.

**Est:** 6-8 days (single hardest phase).

---

### B7: Observability `deps: B4 (skeleton fine earlier)`

**Scope:**
- `structlog` configured: JSON to stdout, every line in scan context auto-includes `scan_id` + `user_id` via contextvars
- `scan_events` audit table writes on every hop (already schema in B1; writes added here)
- `GET /api/v1/scans/{id}/trace` endpoint: returns event timeline, authed-user-owns-scan check
- Per-scan metrics captured (U8): `tokens_in/out`, `cost_usd`, `scan_duration_ms`, `gemini_latency_ms`, `queue_wait_ms`, `thumbnail_gen_ms`

**Deliverable:** trace endpoint test: queue scan → wait for completion → trace returns ≥5 events ordered chronologically with non-null payloads.

**Est:** 2 days.

---

### B8: Rate Limiting + Circuit Breaker `deps: B4`

**Scope:**
- **Layer 1** — per-user: concurrent ≤3, daily ≤50 (Postgres SELECT counts at queue time)
- **Layer 2** — `pybreaker`: 50% failure rolling 5min window, open 2min, half-open probe
- **Layer 3a** — 429 handling: honor `Retry-After`, 3 retries with exponential backoff
- **Layer 3b** — `claim_gemini_slot()` against `gemini_call_windows`, SAFETY_LIMIT=12/min

**Deliverable:** sandbox test — simulate 5 concurrent queues from same user → 3 accepted, 2 x 429; simulate 10 Gemini failures → breaker opens, next scan fails with `ai_unavailable` + refund.

**Est:** 2 days.

---

### B6: Analytics Endpoints `deps: B5`

**Scope:**
- `/api/v1/analytics/dashboard` — period picker (day/week/month/quarter/year), totals, category breakdown, top merchants
- `/api/v1/analytics/trends` — time series
- `/api/v1/analytics/categories` — breakdown with period-over-period comparison
- `/api/v1/analytics/merchants` — top N

**Impl:** SQL uses `period_*` generated columns from B1 → no date arithmetic at query time. Cache via `@lru_cache` on (user, period_key) for 60s.

**Mixed currency (UX-10):** dashboard returns `{amount: 25750, currency: 'CLP', amount_usd: 2780}` — frontend picks native-primary display.

**Deliverable:** contract tests + snapshot test on response shape.

**Est:** 3 days.

---

### B10: Cross-app API (Gustify) `deps: B5`

**Scope:** prompt §Cross-app API endpoints:
- `GET /cross-app/food-candidates?user_email&since` — paginated
- `GET /cross-app/mappings?user_email`
- `POST /cross-app/mappings`
- `DELETE /cross-app/mappings/{id}`

**Auth:** service-to-service JWT validated against shared secret in Railway env. Separate dependency from user auth.

**Pre-resolve hook:** scan worker checks `gustify_catalog_mappings` after categorization → enriches result with `gustify_catalog_id` for matching items (merchant-scoped).

**Deliverable:** contract test using service token; user endpoints reject service tokens and vice versa.

**Est:** 2 days.

---

### B12: Deployment `deps: B5 + B4 stable`

**Scope:**
- Railway services: `api`, `worker`, `postgres`, `volume`
- `railway.toml`: env bindings, start commands, healthchecks
- GitHub Actions: build + push Docker image → `railway up` on main branch
- Env management: `.env.example` template; secrets in Railway UI
- Domain: staging subdomain + production subdomain, Cloudflare in front
- Alerts: Railway webhooks → Discord/email for failed deploys

**Deliverable:** staging deploy smoke test: health check green, one scan end-to-end via staging URL.

**Est:** 2-3 days.

---

### B13: Data Migration Script `deps: B1 + B5 + B6 stable`

**Scope:**
- `scripts/migrate_from_firestore.py` — reads `firebase-admin` export, INSERTs into Postgres
- Preserves IDs (convert Firestore string IDs to UUIDs via deterministic hash — document the mapping)
- Category migration: applies `categoryMigrationMap.ts` equivalent (V3→V4 if any pre-V4 data exists)
- Credit balance preservation: read `users.credits` → write `user_credits.balance`
- Image URL rewrite: Storage bucket URLs → `transaction_images.url` with Railway Volume path
- Validation pass: count transactions in source vs dest, checksum 5 random rows
- Dry-run mode: reports what would be inserted without touching DB

**Deliverable:** dry-run against real Firestore export succeeds; actual run against staging Firestore produces matching row counts.

**Est:** 3-4 days.

---

## Integration Phase (after A7 + B12)

### I1: Frontend Scaffold `deps: A7, B12`

**Scope:**
- Vite + React 18 + TypeScript under `apps/web/`
- Zustand + TanStack Query wired; `persistQueryClient` with IndexedDB (view-only offline — ADR/prompt §Trade-offs)
- Router: React Router v6 with URL structure from A1 IA
- Import `shared/categories.ts` + `shared/types.ts` (generated from Pydantic via `openapi-typescript`)
- Design tokens from A7 handoff → Tailwind config
- Service worker for PWA install + static asset cache

**Deliverable:** app boots, hits `/healthz` on staging API, renders empty home screen per A4 mockup.

**Est:** 2 days.

---

### I2: Component Implementation `deps: I1`

**Scope:** build every component from A3 library with styling from A4:
- Atoms: Button variants, Amount display, Category chip, form fields
- Molecules: Transaction card, Empty state block, Loading skeleton, Error banner, Offline banner
- Organisms: Credit counter (header), Progress narrative (SSE scan progress), Bottom nav (5-slot), Theme preview card
- Charts: bar, pie, line primitives (recharts or lightweight equivalent)

**Constraints:**
- Every component WCAG 2.1 AA per A6 checklist
- `aria-live="polite"` on scan progress narrative (UX-7)
- `prefers-reduced-motion` honored per A5 interaction specs
- Every theme × mode × font combination spot-tested

**Deliverable:** Storybook (or equivalent) showcases every component in every state from A4.

**Est:** 5-6 days.

---

### I3: API Wiring `deps: I2`

**Scope:**
- Replace pytest fixtures with real Firebase-authed TanStack Query calls
- SSE integration for scan progress: `EventSource('/api/v1/scans/stream')` → Zustand store updates → narrative component reacts
- Credit counter subscribes to user profile query
- Learning mappings flow: scan result → ask-confirm modal (UX-4) → POST mapping
- Soft-delete + undo toast (UX-11 within 90-day window)
- Push subscription registration (VAPID) on opt-in

**Deliverable:** every journey J1-J17 manually walkable in staging; SSE reconnects after transient drop.

**Est:** 4-5 days.

---

### I4: E2E Tests `deps: I3`

**Scope:** Playwright against staging:
- J3 Scan single → QuickSave
- J5 Batch scan → Batch Review
- J8 Edit transaction in-window
- J9 Delete + undo
- J11 Cross-app fork/knife icon appears after Gustify mapping
- J13 Scan fails → error + refund toast
- J16 Offline view-only mode
- Theme switch smoke test

**Conventions:** serial execution, data-testid selectors, teardown in `afterEach` (from existing E2E conventions).

**Deliverable:** CI runs full E2E on every staging deploy. Green before Cutover.

**Est:** 3-4 days.

---

## Cutover Phase

### C1: Preparation `deps: I4 + B13`

- Production Railway stack deployed, empty DB
- Production Vercel deploy behind feature flag
- Smoke test: manually create transaction, scan, analytics render
- B13 migration script tested against a full Firestore staging export

**Est:** 1 day.

---

### C2: Backup `deps: C1`

- `gcloud firestore export gs://boletapp-backups/pre-migration-2026-MM-DD/`
- Secondary local copy
- Retention: 1 year

**Est:** <1 day.

---

### C3: Cutover Window (~2 hrs) `deps: C2`

1. Maintenance banner on current Firebase app
2. Final Firestore export
3. Run B13 against export → Postgres
4. Validation: user row, credit balance, tx count, 5-row spot check
5. Point DNS/env → Railway API
6. Disable maintenance mode
7. Live smoke test (user flow end-to-end)

**Rollback:** if credit mismatch / missing txns / scan pipeline dead >1hr → revert DNS.

**Est:** 2-hour window on execution day.

---

### C4: Cooldown (30 days) `deps: C3`

- Firestore read-only for 30 days
- Monitor user reports
- After 30 days: archive Firestore, delete Cloud Functions, decommission Firebase project (keep Auth)

---

## Parallelism Summary (Solo-Dev Schedule)

Given one human, "parallel" means context-switching per day, not concurrent. Recommended serialization:

**Week 1:** B0 → B1 ‖ B3 (one morning, one afternoon) → B2 + B9 + B11
**Week 2-3:** A0-A3 (UX sprint) ‖ B5 core CRUD (alternating days)
**Week 3-4:** A4-A7 (UX finish) ‖ B4 scan pipeline (the meat)
**Week 5:** B6 + B7 + B8 + B10 (all depend on B4/B5, cleanup week)
**Week 6:** B12 deploy + B13 migration script
**Week 7:** I1-I2 (frontend build)
**Week 8:** I3-I4 (wiring + E2E)
**Week 9:** C1-C3 cutover
**Weeks 10-13:** C4 cooldown

**Total: ~8-10 weeks solo to cutover + 4 weeks cooldown.**

Realistic with slip: 12-14 weeks. Ruthless scope-cutting if B4 slips (it will — it's the hardest phase).

---

## Risks + Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Claude Design output insufficient for A4 hi-fi | Med | Med | Fallback to HTML mockups (UX-PLAN §U2 Fallback). +3-4 days. |
| B4 SKIP LOCKED race condition missed | Med | High | B11 sandbox must test concurrent-worker scenario explicitly; inject chaos (kill worker mid-scan) in CI |
| Gemini structured output (U4) fails on edge cases | Med | Med | Deterministic fallback chain: Pydantic output_type → regex extraction → `Other`/`OtherItem` defaults. Never fail to save — always produce a row |
| Railway Volume data loss | Low | Critical | Nightly rsync to R2; B9 content-hash enables re-upload on loss |
| Firebase Auth provider change later | Low | Med | `auth_provider + auth_provider_id` schema decouples (ADR) — flip a flag, no data migration |
| Cutover rollback scenario materializes | Low | High | Firestore read-only for 30 days; DNS flip is the revert |
| `pg_cron` unavailable on Railway Postgres tier | Med | Med | Verify during B0; fallback = separate scheduler service (`apscheduler`) in worker process |
| Cross-app Gustify integration slips independently | High | Low | B10 is isolated; ship Gastify without it, enable after Gustify catches up |
| SSE connection churn on mobile (browser backgrounding) | High | Med | Worker writes to `scan_events` regardless; UI poll-fallback `GET /scans/{id}` on SSE reconnect gap |

---

## Resolved Decisions (locked 2026-04-21)

| # | Question | Decision | Rationale | Action Phase |
|---|---|---|---|---|
| Q1 | Hosting primary | **Railway** | Single-vendor billing, cognitive load > $10/mo savings | — |
| Q2 | Python dep manager | **uv** | 10-100x faster installs; drop-in pip compat = trivial fallback | B0 |
| Q3 | Frontend types | **openapi-typescript + openapi-fetch** | Full control over cache keys, optimistic updates, SSE wiring; 30 endpoints doesn't justify orval's template constraints | I1 |
| Q4 | Component showcase | **ladle** | <3s boot vs Storybook's 30-60s; ~15-20 components in A3 scope; stories portable to Storybook if Chromatic ever needed | I2 |
| Q5 | `GEMINI_SAFETY_LIMIT` | **Env var at 12** | Tier-based quota model for users (free / pro / max) absorbs cost scaling; verify actual Gemini 2.5-flash RPM at B0 | B0 + PRD |
| Q6 | `pg_cron` availability | **Try pg_cron first; fallback APScheduler + `pg_advisory_lock`** | Native scheduling transactional; advisory-lock leader election prevents replica thundering herd | B0 probe |
| Q7 | VAPID keys | **Fresh keys** | Browser origin change invalidates subscriptions regardless; migration buys nothing | B5 |
| Q8 | 90-day edit-window enforcement | **API middleware + FE disabled button + shared constant `EDIT_WINDOW_DAYS=90`** | Defense in depth; agent-native parity (LLM hits API = same gate); shared constant prevents drift between TS/Python | B5 + I3 |

### Follow-up Research Notes

- **Q5 tiering:** Gemini 2.5-flash paid tier quotas scale with project spend; verify RPM ceiling at B4 implementation time. Document tier→quota mapping in `docs/architecture/cost-tiers.md` after B4 ships.
- **Q8 constant location:** `shared/constants.json` — extend existing `shared/categories.json` codegen pipeline to handle numeric constants. Add `EDIT_WINDOW_DAYS` as first entry.
- **Q3 codegen script:** `"generate:api-types": "openapi-typescript http://localhost:8000/openapi.json -o shared/api-types.ts"` in root `package.json`; wire into pre-commit.
- **Q4 setup snippet:** `pnpm add -D @ladle/react` → stories colocate as `src/components/*/X.stories.tsx` → `"dev:components": "ladle serve"`.

---

## First Week Concrete Actions

Day 1-2: B0 scaffold + CI green
Day 3: Start A0 journey inventory (small, gets UX rolling)
Day 4-5: B1 migrations + B3 category codegen in parallel
Day 6: Confirm `pg_cron` on Railway; decide fallback if not
