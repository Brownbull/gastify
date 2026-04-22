# Ultraplan Prompt: Gastify (BoletApp) Full-Stack Rebuild

> Copy everything below the line into `/ultraplan` after updating Claude Code to 2.1.91+.
>
> **Foundation decisions:** This prompt incorporates 18 architecture decisions resolved in [`ADR-2026-04-20-REBUILD-STACK.md`](ADR-2026-04-20-REBUILD-STACK.md) (same folder). The ADR is the "why"; this prompt is the "what to build."
>
> **Execution strategy — two parallel workstreams (ADR D18):**
> - **Workstream A — UX:** 7-phase pipeline per [`UX-PLAN.md`](UX-PLAN.md) (journeys → IA → wireframes → components → hi-fi → interactions → a11y → handoff bundle). Output: `docs/rebuild/ux/handoff/`.
> - **Workstream B — Backend/Infrastructure:** FastAPI scaffold, DB migrations, auth, scan pipeline, CRUD, analytics, cross-app API, data migration, observability, rate limiting. Validated via simulated frontend payloads (pytest + OpenAPI contract tests + sandbox-mode Gemini) without waiting for the real frontend.
> - **Integration phase:** consumes the UX handoff + working backend API to build the real frontend and connect it. Produces the deployable PWA.
>
> A and B run in parallel after initial scaffolding; they converge at Integration.
>
> **Platform:** PWA only — single codebase serves mobile browsers, desktop browsers, and installable home-screen app. No native iOS / Android / desktop builds.
>
> **Scope boundaries (ADR D17):** No UF currency (CLP / USD / EUR only). Email-only PII on users (no RUT, phone, address). IVA tracked via `TaxFees` L4 item category, not as a dedicated schema field.

---

## Objective

Rebuild Gastify (currently named BoletApp) — a Chilean smart expense tracker with AI receipt scanning — from its current Firebase/React prototype into a production-grade full-stack application using **FastAPI + PostgreSQL + React + TypeScript**.

## What Gastify Does

Gastify is a PWA that lets users scan receipts and credit card statements with AI (Google Gemini), automatically extracting merchant, date, items, categories, and totals. It tracks spending with analytics, learned category mappings, and multi-currency support. Built for the Chilean market (Spanish-first, CLP default).

**Core Loop:** Scan receipt → AI extracts data → Review/edit → Save transaction → Analytics & insights

**Key Differentiators:**
- **AI receipt scanning** with async pipeline (sub-2s response, server processes in background)
- **Category learning** — remembers merchant→category and item→category mappings per user
- **Unified 4-level taxonomy** — 44 store categories + 42 item categories (Spanish PascalCase)
- **Credit card statement scanning** — PDF upload extracts multiple transactions at once
- **Credit system** — 1 credit per scan, refunded on failure

## Current State (What Exists)

The prototype at this repo has:
- React 18 + TypeScript 5.3 + Vite 5.4 frontend (PWA)
- Firebase Auth (Google OAuth), Firestore (NoSQL), Storage, Cloud Functions
- Zustand (client state) + TanStack Query (server state)
- Gemini 2.5-flash AI for receipt/statement OCR (via 11 Cloud Functions)
- 13 feature modules, ~21K lines TypeScript
- 86 categories (44 store + 42 item) in unified V4 taxonomy
- Async scan pipeline: queue → process → deliver via Firestore listeners
- ~200 unit tests (Vitest) + 13 E2E flows (Playwright)
- Production live, staging environment available

## Target Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Backend API** | FastAPI (Python 3.12+) | Async, OpenAPI auto-docs |
| **Database** | PostgreSQL 16 | Relational, ACID transactions |
| **ORM** | SQLAlchemy 2.0 + Alembic | Async engine, migration management |
| **Task Queue** | Postgres `SKIP LOCKED` + dedicated worker process | No Celery, no Redis broker. Postgres IS the queue. See "Async Scan Pipeline" section. |
| **Auth** | Firebase Auth (keep) + JWT verification via `firebase-admin` in FastAPI | Google OAuth unchanged. Schema decouples provider via `auth_provider + auth_provider_id`. |
| **File Storage** | Railway Volume (initial) with Cloudflare R2 (S3-compatible) as fallback | Receipt images + thumbnails |
| **Frontend** | React 18 + TypeScript + Vite | Rebuild with same design patterns |
| **State** | Zustand + TanStack Query | Same pattern, new REST endpoints. TanStack `persistQueryClient` for view-only offline cache. |
| **AI** | Google Gemini 2.5 Flash | Direct API call from worker process |
| **Rate limiting** | Postgres per-user counts + `pybreaker` circuit breaker + Postgres minute-window counter for global Gemini quota | No Redis needed. See "Rate Limiting + Circuit Breaker" section. |
| **Real-time** | Postgres `LISTEN/NOTIFY` piped through SSE (FastAPI `EventSourceResponse`) | One-way server→client. Multi-replica broadcast native. |
| **Observability** | Structured JSON logs (`structlog`) with `scan_id` threading + `scan_events` audit table + `/scans/{id}/trace` endpoint | See "Observability" section. |
| **Hosting** | Railway (API + worker + Postgres + Volume) + Vercel (frontend) | Single-vendor backend for unified billing. Fly.io as fallback if Railway limits hit. |
| **Testing** | pytest (backend) + Vitest (frontend) + Playwright (E2E) | 80% coverage target |

## Database Schema

Translate the current Firestore collections into PostgreSQL tables:

### Core Tables

```sql
-- Currency reference (seeded)
currencies (
  code TEXT PRIMARY KEY,     -- 'CLP', 'USD', 'EUR'
  exponent INTEGER NOT NULL, -- 0 for CLP, 2 for USD/EUR
  name TEXT NOT NULL
)
-- Seed: ('CLP', 0, 'Chilean Peso'), ('USD', 2, 'US Dollar'), ('EUR', 2, 'Euro')

-- Users & Auth (provider-decoupled)
users (
  id UUID PK DEFAULT gen_random_uuid(),
  auth_provider TEXT NOT NULL,     -- 'firebase' today; 'supabase'/'auth0' later
  auth_provider_id TEXT NOT NULL,  -- opaque UID from the provider
  email TEXT NOT NULL,
  email_normalized TEXT GENERATED ALWAYS AS (lower(email)) STORED,
  display_name TEXT,
  photo_url TEXT,
  locale TEXT DEFAULT 'es',
  currency TEXT DEFAULT 'CLP' REFERENCES currencies(code),
  theme TEXT DEFAULT 'light',
  color_theme TEXT DEFAULT 'normal',
  font_family TEXT DEFAULT 'system',
  font_size TEXT DEFAULT 'medium',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (auth_provider, auth_provider_id)
)
CREATE UNIQUE INDEX idx_users_email_normalized ON users(email_normalized);

-- Credits
user_credits (
  user_id UUID PK REFERENCES users(id),
  balance INTEGER DEFAULT 10,
  total_earned INTEGER DEFAULT 10,
  total_spent INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
)

credit_transactions (
  id UUID PK,
  user_id UUID REFERENCES users(id),
  amount INTEGER NOT NULL,  -- positive = earn, negative = spend
  type TEXT NOT NULL,  -- 'initial', 'scan_deduct', 'scan_refund', 'purchase', 'bonus'
  scan_id UUID,  -- reference to pending_scan if applicable
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Transactions (core entity)
transactions (
  id UUID PK DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL,
  time TIME,
  merchant TEXT NOT NULL CHECK (char_length(merchant) BETWEEN 1 AND 200),
  alias TEXT,
  store_category TEXT NOT NULL,       -- English PascalCase from L2 taxonomy (e.g., 'Supermarket')
  amount_minor BIGINT NOT NULL CHECK (amount_minor BETWEEN 0 AND 999999999999),  -- minor units of `currency`
  currency TEXT NOT NULL DEFAULT 'CLP' REFERENCES currencies(code),
  amount_usd_minor BIGINT,             -- USD shadow for cross-currency analytics (cents)
  fx_rate_to_usd NUMERIC(14, 8),       -- frozen at transaction creation time
  fx_captured_at TIMESTAMPTZ,
  country TEXT,
  city TEXT,
  receipt_type TEXT,                   -- 'receipt', 'invoice', 'ticket'
  merchant_source TEXT,                -- 'scan', 'learned', 'user'
  prompt_version TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Pre-computed period keys (ALL generated — app never writes these)
  period_day     DATE GENERATED ALWAYS AS (date) STORED,
  period_week    TEXT GENERATED ALWAYS AS (to_char(date, 'IYYY-"W"IW')) STORED,   -- ISO week, e.g., '2026-W16'
  period_month   TEXT GENERATED ALWAYS AS (to_char(date, 'YYYY-MM')) STORED,
  period_quarter TEXT GENERATED ALWAYS AS (to_char(date, 'YYYY-"Q"Q')) STORED,    -- e.g., '2026-Q2'
  period_year    TEXT GENERATED ALWAYS AS (to_char(date, 'YYYY')) STORED
)

-- Transaction line items
transaction_items (
  id UUID PK DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_normalized TEXT GENERATED ALWAYS AS (lower(name)) STORED,  -- for cross-app mapping lookups
  qty NUMERIC DEFAULT 1,
  unit_price_minor BIGINT,                      -- minor units of transaction's currency
  total_price_minor BIGINT NOT NULL,
  item_category TEXT,                           -- English PascalCase from L4 taxonomy (e.g., 'Produce')
  subcategory TEXT,
  category_source TEXT,                         -- 'scan', 'learned', 'user'
  subcategory_source TEXT,
  is_food_candidate BOOLEAN NOT NULL DEFAULT false,  -- true if item_category is food/ingredient-like (for Gustify cross-app lookup)
  sort_order INTEGER DEFAULT 0
)

-- Receipt images
transaction_images (
  id UUID PK DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  url TEXT NOT NULL,
  is_thumbnail BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Async scan pipeline — Postgres IS the queue (claimed via SELECT ... FOR UPDATE SKIP LOCKED)
pending_scans (
  id UUID PK DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  scan_type TEXT NOT NULL DEFAULT 'receipt',  -- 'receipt' | 'statement'
  status TEXT NOT NULL DEFAULT 'queued',      -- 'queued' | 'processing' | 'completed' | 'failed'
  image_urls TEXT[] NOT NULL,
  result JSONB,                                -- extracted transaction data on completion
  error TEXT,
  credit_deducted BOOLEAN DEFAULT false,
  worker_id TEXT,                              -- identifies the worker that claimed the row
  started_at TIMESTAMPTZ,                      -- when worker transitioned to 'processing'
  completed_at TIMESTAMPTZ,
  deadline TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Per-scan audit trail (observability — every hop writes a row)
scan_events (
  id UUID PK DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES pending_scans(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,  -- 'queued', 'picked_up', 'gemini_start', 'gemini_end',
                             -- 'thumbnail_done', 'completed', 'failed', 'refunded'
  payload JSONB,             -- event-specific: tokens_in/out, latency_ms, cost_usd, error_msg
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
)
-- pg_cron job daily: DELETE FROM scan_events WHERE occurred_at < now() - interval '90 days';

-- Global Gemini rate limit (minute-window counter)
gemini_call_windows (
  minute_bucket TIMESTAMPTZ PRIMARY KEY,  -- truncated to minute
  call_count INTEGER NOT NULL DEFAULT 0
)
-- pg_cron job hourly: DELETE FROM gemini_call_windows WHERE minute_bucket < now() - interval '1 hour';

-- Category learning (per-user)
merchant_category_mappings (
  id UUID PK,
  user_id UUID NOT NULL REFERENCES users(id),
  merchant_name TEXT NOT NULL,
  store_category TEXT NOT NULL,
  confidence NUMERIC DEFAULT 1.0,
  use_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, merchant_name)
)

item_category_mappings (
  id UUID PK,
  user_id UUID NOT NULL REFERENCES users(id),
  item_name TEXT NOT NULL,
  item_category TEXT NOT NULL,
  subcategory TEXT,
  confidence NUMERIC DEFAULT 1.0,
  use_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, item_name)
)

item_name_mappings (
  id UUID PK,
  user_id UUID NOT NULL REFERENCES users(id),
  original_name TEXT NOT NULL,  -- raw OCR name
  corrected_name TEXT NOT NULL,  -- user-corrected name
  use_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, original_name)
)

-- Merchant trust scoring
merchant_trust_profiles (
  id UUID PK,
  user_id UUID NOT NULL REFERENCES users(id),
  merchant_name TEXT NOT NULL,
  trust_score NUMERIC DEFAULT 0.5,
  scan_count INTEGER DEFAULT 0,
  last_scanned_at TIMESTAMPTZ,
  UNIQUE (user_id, merchant_name)
)

-- User preferences (cloud-persisted settings)
user_preferences (
  user_id UUID PK REFERENCES users(id),
  preferences JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Notifications
notifications (
  id UUID PK,
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Push subscriptions
push_subscriptions (
  id UUID PK,
  user_id UUID NOT NULL REFERENCES users(id),
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL,  -- p256dh + auth
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Cross-app mapping (Gustify catalog integration)
-- Lives in Gastify's DB; Gustify reads via API. Gastify treats gustify_catalog_id as opaque.
gustify_catalog_mappings (
  id UUID PK DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,                        -- stable key across apps
  merchant_name_normalized TEXT NOT NULL,          -- lower('Jumbo') = 'jumbo'
  gastify_item_name_normalized TEXT NOT NULL,      -- lower('Leche Colun 1L') = 'leche colun 1l'
  gustify_catalog_id UUID NOT NULL,                -- Gustify owns; Gastify stores opaquely
  gustify_catalog_type TEXT NOT NULL CHECK (gustify_catalog_type IN ('ingredient', 'prepared_food')),
  confidence NUMERIC DEFAULT 1.0,
  confirmed_at TIMESTAMPTZ NOT NULL,
  use_count INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_email, merchant_name_normalized, gastify_item_name_normalized)
)
```

### Indexes

```sql
-- Transaction query patterns
CREATE INDEX idx_transactions_user_date     ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_user_month    ON transactions(user_id, period_month);
CREATE INDEX idx_transactions_user_week     ON transactions(user_id, period_week);
CREATE INDEX idx_transactions_user_category ON transactions(user_id, store_category);
CREATE INDEX idx_transaction_items_transaction ON transaction_items(transaction_id);
CREATE INDEX idx_transaction_items_food_candidate ON transaction_items(is_food_candidate) WHERE is_food_candidate = true;

-- Scan queue (hot path for SKIP LOCKED worker polling)
CREATE INDEX idx_pending_scans_queue ON pending_scans(status, created_at) WHERE status = 'queued';
CREATE INDEX idx_pending_scans_user_status ON pending_scans(user_id, status);
CREATE INDEX idx_pending_scans_stale ON pending_scans(status, started_at) WHERE status = 'processing';

-- Scan audit timeline
CREATE INDEX idx_scan_events_scan ON scan_events(scan_id, occurred_at);

-- Category learning
CREATE INDEX idx_merchant_mappings_user ON merchant_category_mappings(user_id, merchant_name);
CREATE INDEX idx_item_mappings_user     ON item_category_mappings(user_id, item_name);

-- Cross-app mapping (Gustify lookup)
CREATE INDEX idx_gustify_mappings_email_merchant ON gustify_catalog_mappings(user_email, merchant_name_normalized);
```

## Unified Category Taxonomy (V4 — 4-Level English-Canonical — MUST PRESERVE EXACTLY)

### Canonical Language Rule

**All taxonomy keys are English PascalCase.** This is the canonical representation stored in DB, API, and prompts. Localized display strings (Spanish, English, future locales) live in a `display` map on each entry — mirroring the "USD canonical + locale display" pattern used for money. Initial locales: `en`, `es`.

### Structure

Single source of truth: `shared/categories.json`. Pydantic loads at import time; TypeScript const + union type generated via `scripts/gen_categories.py` in pre-commit + CI.

**Totals (preserve exactly):** L1 = 12 store groups, L2 = 44 store categories, L3 = 9 item groups, L4 = 42 item categories.

```json
{
  "store_category_groups": [
    { "key": "Supermercados",             "display": { "en": "Supermarkets",          "es": "Supermercados" },
      "children": ["Supermarket", "Wholesale"] },
    { "key": "Restaurantes",              "display": { "en": "Restaurants",           "es": "Restaurantes" },
      "children": ["Restaurant"] },
    { "key": "ComercioDeBarrio",          "display": { "en": "Neighborhood Stores",   "es": "Comercio de Barrio" },
      "children": ["Almacen", "Minimarket", "OpenMarket", "Kiosk", "LiquorStore", "Bakery", "Butcher"] },
    { "key": "Vivienda",                  "display": { "en": "Housing",               "es": "Vivienda" },
      "children": ["UtilityCompany", "PropertyAdmin"] },
    { "key": "SaludBienestar",            "display": { "en": "Health & Wellness",     "es": "Salud y Bienestar" },
      "children": ["Pharmacy", "Medical", "Veterinary", "HealthBeauty"] },
    { "key": "TiendasGenerales",          "display": { "en": "General Stores",        "es": "Tiendas Generales" },
      "children": ["Bazaar", "ClothingStore", "ElectronicsStore", "HomeGoods", "FurnitureStore", "Hardware", "GardenCenter"] },
    { "key": "TiendasEspecializadas",     "display": { "en": "Specialty Stores",      "es": "Tiendas Especializadas" },
      "children": ["PetShop", "BookStore", "OfficeSupplies", "SportsStore", "ToyStore", "AccessoriesOptical", "OnlineStore"] },
    { "key": "TransporteVehiculo",        "display": { "en": "Transport & Vehicle",   "es": "Transporte y Vehículo" },
      "children": ["AutoShop", "GasStation", "Transport"] },
    { "key": "Educacion",                 "display": { "en": "Education",             "es": "Educación" },
      "children": ["Education"] },
    { "key": "ServiciosFinanzas",         "display": { "en": "Services & Finance",    "es": "Servicios y Finanzas" },
      "children": ["GeneralServices", "BankingFinance", "TravelAgency", "SubscriptionService", "Government"] },
    { "key": "EntretenimientoHospedaje",  "display": { "en": "Entertainment & Lodging", "es": "Entretenimiento y Hospedaje" },
      "children": ["Lodging", "Entertainment", "Casino"] },
    { "key": "Otros",                     "display": { "en": "Other",                 "es": "Otros" },
      "children": ["CharityDonation", "Other"] }
  ],
  "item_category_groups": [
    { "key": "AlimentosFrescos",          "display": { "en": "Fresh Foods",           "es": "Alimentos Frescos" },
      "children": ["Produce", "MeatSeafood", "BreadPastry", "DairyEggs"] },
    { "key": "AlimentosEnvasados",        "display": { "en": "Packaged Foods",        "es": "Alimentos Envasados" },
      "children": ["Pantry", "FrozenFoods", "Snacks", "Beverages"] },
    { "key": "ComidaPreparada",           "display": { "en": "Prepared Food",         "es": "Comida Preparada" },
      "children": ["PreparedFood"] },
    { "key": "SaludCuidadoPersonal",      "display": { "en": "Health & Personal Care","es": "Salud y Cuidado Personal" },
      "children": ["BeautyCosmetics", "PersonalCare", "Medications", "Supplements", "BabyProducts"] },
    { "key": "Hogar",                     "display": { "en": "Home",                  "es": "Hogar" },
      "children": ["CleaningSupplies", "HomeEssentials", "PetSupplies", "PetFood", "Furnishings"] },
    { "key": "ProductosGenerales",        "display": { "en": "General Products",      "es": "Productos Generales" },
      "children": ["Apparel", "Technology", "Tools", "Garden", "CarAccessories", "SportsOutdoors", "ToysGames", "BooksMedia", "OfficeStationery", "Crafts"] },
    { "key": "ServiciosCargos",           "display": { "en": "Services & Charges",    "es": "Servicios y Cargos" },
      "children": ["ServiceCharge", "TaxFees", "Subscription", "Insurance", "LoanPayment", "TicketsEvents", "HouseholdBills", "CondoFees", "EducationFees"] },
    { "key": "Vicios",                    "display": { "en": "Vices",                 "es": "Vicios" },
      "children": ["Alcohol", "Tobacco", "GamesOfChance"] },
    { "key": "Otros",                     "display": { "en": "Other",                 "es": "Otros" },
      "children": ["OtherItem"] }
  ]
}
```

**Entries marked food-candidate (for Gustify cross-app filter):** all children of `AlimentosFrescos`, `AlimentosEnvasados`, `ComidaPreparada`. `transaction_items.is_food_candidate` is set at insert time based on whether `item_category` belongs to one of these three L3 groups.

### Codegen Pipeline

- **Source:** `shared/categories.json`
- **Backend:** `scripts/gen_categories.py` generates `shared/categories.py` containing `StoreCategoryGroup`, `StoreCategory`, `ItemCategoryGroup`, `ItemCategory` as `enum.StrEnum` + parent-lookup dicts. Used by Pydantic models with `output_type=...` for AI agent responses (U4 — enforce output structure mechanically).
- **Frontend:** same script generates `shared/categories.ts` with `as const` arrays + union types + parent-lookup maps.
- **CI:** regenerate and diff against committed files — any drift fails the build.
- **Pre-commit:** regenerate automatically on staged JSON edits.

## Async Scan Pipeline (CRITICAL — Most Complex Feature)

The current system uses Firestore triggers. The rebuild replicates the behavior with Postgres-as-queue: no Celery, no Redis broker. The `pending_scans` table IS the queue; workers claim rows via `SELECT ... FOR UPDATE SKIP LOCKED`; `LISTEN/NOTIFY` wakes workers instantly without tight polling.

### Target Architecture (Postgres SKIP LOCKED + SSE)

```
POST /api/v1/scans/queue {imageUrls} → FastAPI
  ├─ Verify Firebase ID token (firebase-admin)
  ├─ Check per-user limits: concurrent <= 3, daily <= 50 (SELECT counts from pending_scans)
  ├─ BEGIN TRANSACTION:
  │    UPDATE user_credits SET balance = balance - 1 WHERE user_id=$1 AND balance > 0
  │    (if no row updated → 402 Insufficient Credits)
  │    INSERT INTO pending_scans (user_id, status='queued', image_urls, deadline=now()+5min, ...)
  │    INSERT INTO scan_events (scan_id, event_type='queued', payload, ...)
  │    SELECT pg_notify('scan_queued', scan_id::text)
  │  COMMIT
  └─ Return {scan_id, deadline} in <1s

Worker process (separate Railway service: `python -m app.worker`)
  ├─ LISTEN scan_queued  (instant wake on new jobs)
  ├─ Poll loop every 5s as fallback:
  │    BEGIN TRANSACTION:
  │      SELECT id, user_id, image_urls FROM pending_scans
  │      WHERE status='queued'
  │      ORDER BY created_at
  │      LIMIT 1
  │      FOR UPDATE SKIP LOCKED    ← atomic claim, other workers skip this row
  │      UPDATE pending_scans SET status='processing', worker_id=$me, started_at=now() WHERE id=$id
  │      INSERT INTO scan_events (event_type='picked_up')
  │    COMMIT (row remains locked logically by status, not by DB lock — workers use status filter)
  ├─ Global Gemini quota guard:
  │    INSERT INTO gemini_call_windows (minute_bucket, call_count) VALUES (current_minute, 1)
  │    ON CONFLICT DO UPDATE SET call_count = call_count + 1
  │    RETURNING call_count
  │    (if call_count > SAFETY_LIMIT → sleep until next minute, retry)
  ├─ Circuit breaker check (pybreaker): if Gemini open → fail scan + refund immediately
  ├─ Fetch images from Railway Volume (or R2) → Pillow resize 1200x1600 JPEG 80%
  ├─ INSERT scan_events (event_type='gemini_start', payload={prompt_version, image_count})
  ├─ Gemini 2.5-flash call with Pydantic output_type for structured response (U4)
  │    On 429: honor Retry-After, retry up to 3x; exhaust → fail + refund
  │    On other error: pybreaker records failure
  ├─ INSERT scan_events (event_type='gemini_end', payload={tokens_in, tokens_out, cost_usd, latency_ms})
  ├─ Pydantic validates hierarchy (L2/L4 keys belong to declared parents)
  ├─ Generate thumbnail (120x160) → upload
  ├─ BEGIN TRANSACTION:
  │    UPDATE pending_scans SET status='completed', result=$json, completed_at=now() WHERE id=$id
  │    INSERT scan_events (event_type='completed')
  │    SELECT pg_notify('scan_done_' || user_id, scan_id::text)
  │  COMMIT
  └─ On ANY failure: BEGIN → status='failed', error=$msg → UPDATE user_credits (refund +1)
                    → INSERT scan_events ('failed', 'refunded') → COMMIT

Client subscribes via SSE:
  EventSource('/api/v1/scans/stream')
  FastAPI endpoint runs: LISTEN scan_done_<user_id> on its Postgres connection
  pg_notify from worker → every API replica's listener fires simultaneously
  Whichever replica holds this user's SSE connection forwards the event

Scheduled tasks (pg_cron):
  ├─ Every 5 min: stale-scan reaper
  │    UPDATE pending_scans SET status='failed', error='worker_timeout'
  │    WHERE status='processing' AND started_at < now() - interval '10 minutes'
  │    Refund credits for each affected scan
  ├─ Hourly:  DELETE FROM gemini_call_windows WHERE minute_bucket < now() - interval '1 hour'
  ├─ Daily:   DELETE FROM scan_events WHERE occurred_at < now() - interval '90 days'
  └─ Daily:   DELETE FROM pending_scans WHERE status IN ('completed','failed') AND updated_at < now() - interval '30 days'
```

### Why Postgres-Only (no Celery/Redis)

- **Atomic "deduct credit + enqueue":** both happen in the same DB transaction. No broker means no second system to coordinate with — the M4 outbox problem doesn't exist.
- **No dropped tasks:** if a worker crashes mid-scan, its row stays `processing`. The pg_cron reaper reclaims it and refunds within 10 minutes.
- **Multi-replica native:** `LISTEN/NOTIFY` broadcasts to all listening API replicas. No Redis pub/sub needed.
- **Observability for free:** the queue is a SQL table — debugging is `SELECT`.

### Failure Recovery (MUST preserve all paths)

| Failure | Current Behavior | Rebuild Equivalent |
|---------|-----------------|-------------------|
| Gemini API error | processReceiptScan refunds atomically | Worker catches exception → BEGIN → UPDATE status='failed' + refund credit → INSERT scan_events → COMMIT |
| Gemini 429 quota | Retry with backoff | Honor `Retry-After`; up to 3 retries; exhaust → fail + refund |
| Gemini sustained outage | N/A (manual intervention) | `pybreaker` opens after 50% failures in 5 min; new scans fail immediately + refund for 2 min |
| User cancels | onPendingScanDeleted trigger refunds | `DELETE /api/v1/scans/{id}` → if status in (queued, processing): refund + mark cancelled |
| Worker crash mid-scan | cleanupPendingScans (hourly) refunds | `pg_cron` stale-scan reaper every 5 min |
| Bad JSON from Gemini | Retry 2-3 times with coercion | Pydantic `output_type` enforces structure upfront (U4); deterministic fallback on parse failure |

## Credit Card Statement Scanning

Similar to receipt scanning but for PDF statements:

```
Client → POST /api/v1/statements/queue {pdfUrl}
  ├─ Deduct 1 "super credit"
  ├─ Create pending_scan (type=statement)
  └─ Return {scanId, deadline}

Worker:
  ├─ Fetch PDF from storage
  ├─ Call Gemini with statement-specific prompt
  ├─ Extract MULTIPLE transactions from single PDF
  ├─ Return array of transaction objects
  └─ Refund on failure
```

## API Design

```
# Auth
POST   /api/v1/auth/google              — Google OAuth token exchange → JWT
POST   /api/v1/auth/refresh             — Refresh JWT token
GET    /api/v1/auth/me                   — Current user profile

# Transactions
GET    /api/v1/transactions              — List (paginated, filterable by date/category/merchant)
POST   /api/v1/transactions              — Create transaction
GET    /api/v1/transactions/{id}         — Get with items + images
PATCH  /api/v1/transactions/{id}         — Update transaction
DELETE /api/v1/transactions/{id}         — Delete (cascade items + images)

# Transaction Items (nested or separate)
GET    /api/v1/transactions/{id}/items   — List items
POST   /api/v1/transactions/{id}/items   — Add item
PATCH  /api/v1/items/{id}               — Update item
DELETE /api/v1/items/{id}               — Delete item

# Items View (flattened across transactions)
GET    /api/v1/items                     — Flattened items view (filterable)
GET    /api/v1/items/aggregated          — Aggregated spending by product

# Scan Pipeline
POST   /api/v1/scans/queue              — Queue receipt scan (deducts credit)
GET    /api/v1/scans/{id}               — Poll scan status
DELETE /api/v1/scans/{id}               — Cancel scan (refunds credit)
WS     /api/v1/scans/ws                 — WebSocket for real-time scan updates

# Statement Scanning
POST   /api/v1/statements/queue         — Queue statement scan
GET    /api/v1/statements/{id}          — Poll statement status

# Credits
GET    /api/v1/credits                   — Current balance + history
POST   /api/v1/credits/purchase          — Buy credits (future: payment integration)

# Category Mappings (learning)
GET    /api/v1/mappings/merchants        — User's merchant→category mappings
POST   /api/v1/mappings/merchants        — Save mapping
GET    /api/v1/mappings/items            — User's item→category mappings
POST   /api/v1/mappings/items            — Save mapping
GET    /api/v1/mappings/item-names       — User's item name corrections
POST   /api/v1/mappings/item-names       — Save correction

# Analytics
GET    /api/v1/analytics/dashboard       — Dashboard summary (period, totals, category breakdown)
GET    /api/v1/analytics/trends          — Spending trends over time
GET    /api/v1/analytics/categories      — Category breakdown with comparisons
GET    /api/v1/analytics/merchants       — Top merchants

# Settings / Preferences
GET    /api/v1/preferences               — User preferences
PATCH  /api/v1/preferences               — Update preferences

# Notifications
GET    /api/v1/notifications             — List notifications
PATCH  /api/v1/notifications/{id}/read   — Mark as read
POST   /api/v1/push/subscribe            — Register push subscription

# Image Upload
POST   /api/v1/uploads/receipt-images    — Upload receipt images (returns URLs)

# Export
GET    /api/v1/export/csv                — Export transactions as CSV
```

## Gemini AI Integration Details

### Receipt Prompt (preserve logic)

The Gemini prompt must:
1. Accept 1-5 receipt images (resized to 1200x1600 JPEG 80%)
2. Extract: merchant, date (YYYY-MM-DD), time (HH:mm), total, currency, country, city, receiptType
3. Extract items: name, qty, unitPrice, totalPrice, category (from V4 taxonomy), subcategory
4. Auto-detect currency from receipt content
5. Use V4 PascalCase categories in the prompt (exact match required)
6. Return structured JSON (not markdown, not free text)
7. Handle: Chilean boletas, facturas, international receipts, handwritten receipts

### Statement Prompt

1. Accept PDF (credit card statement)
2. Extract multiple transactions with: date, merchant, amount, category
3. Handle Chilean bank statement formats (BCI, Santander, BancoEstado, etc.)

### Coercion & Validation

After Gemini returns JSON:
- Coerce string numbers to integers (e.g., "1.500" → 1500 for CLP)
- Validate category values against V4 taxonomy enum
- Fallback: "Other" for store, "OtherItem" for items
- Validate total matches sum of items (±tolerance)
- Handle missing fields gracefully

## Category Learning System

Per-user mappings that improve over time:

1. **Merchant → Store Category:** When user confirms "Lider" = "Supermarket", save mapping. Next scan from "Lider" auto-applies "Supermarket".
2. **Item → Item Category:** When user confirms "Leche Colun" = "DairyEggs", save mapping. Next scan with "Leche Colun" auto-applies.
3. **Item Name Corrections:** When user corrects "LCH COLUN 1LT" → "Leche Colun 1L", save mapping. Next scan normalizes OCR output.
4. **Confidence scoring:** Track use_count. Higher count = higher confidence = auto-apply without asking.

## Cross-app Catalog Mapping (Gustify Integration)

Gastify shares identified food items with its sister app Gustify (cooking/pantry app) via a merchant-scoped, per-user mapping table. Both apps use email as the stable cross-app identity. Databases are separate.

### Flow

1. User scans a receipt in Gastify → transaction items created, `is_food_candidate=true` for items in food L3 groups
2. Gustify periodically pulls candidates: `GET /api/v1/cross-app/food-candidates?user_email=X&since=<ts>` → returns unmatched food items
3. Gustify classifies candidates against its own catalog (ingredients or prepared-food entries Gustify manages internally)
4. Gustify confirms mappings: `POST /api/v1/cross-app/mappings` with `{user_email, merchant_name, gastify_item_name, gustify_catalog_id, gustify_catalog_type}`
5. Gastify stores the mapping in `gustify_catalog_mappings`
6. Next scan at the SAME merchant by the SAME user with the SAME item name → Gastify pre-resolves the `gustify_catalog_id` and includes it in the response

### Contract Boundaries

- Gastify treats `gustify_catalog_id` as **opaque** — never interprets it, never validates its existence
- Gustify owns its catalog and handles lookup-misses (dead references) gracefully on its side
- No shared DB role — all exchange is via HTTP API with service-to-service JWT (shared secret rotation quarterly)
- Mapping is **merchant-scoped** — "Leche Colun" at Jumbo and "Leche Colun" at Lider can map to the same or different Gustify catalog IDs at user's discretion

### Cross-app API Endpoints (exposed by Gastify)

```
GET  /api/v1/cross-app/food-candidates?user_email=X&since=<iso_ts>  — Gustify polls unmatched food items
GET  /api/v1/cross-app/mappings?user_email=X                         — Gustify hydrates known mappings
POST /api/v1/cross-app/mappings                                       — Gustify confirms a new mapping
DELETE /api/v1/cross-app/mappings/{id}                                — Gustify removes stale mapping
```

All endpoints require a Gustify-issued service token validated against a shared secret stored in Railway env.

## Cutover Plan (Firebase → Rebuild)

Given only 1 active user during migration, a one-time cutover is justified. Multi-user dual-write is explicitly out of scope.

### Phase 1 — Preparation (pre-cutover day)
1. Deploy rebuild stack to Railway (API + worker + Postgres) with empty DB
2. Deploy frontend to Vercel behind a staging URL
3. Run full smoke test: sign in, create transaction manually, scan receipt end-to-end
4. Prepare backfill script: `scripts/migrate_from_firestore.py` — reads Firestore export, INSERTs into Postgres preserving IDs

### Phase 2 — Backup
1. `gcloud firestore export gs://boletapp-backups/pre-migration-YYYY-MM-DD/` — retain for 1 year
2. Download export locally as secondary backup

### Phase 3 — Cutover window (~2 hours)
1. Enable maintenance mode on current Firebase app (banner: "Migrating — back in 2 hours")
2. Run final Firestore export
3. Run backfill script — validate:
   - User row exists and has all settings
   - Credit balance matches pre-migration
   - Transaction count matches
   - Spot-check 5 random transactions with items + images intact
4. Point frontend DNS / env at new Railway API
5. Deactivate maintenance mode

### Phase 4 — Cooldown (30 days)
1. Keep Firestore in read-only mode for 30 days
2. Monitor for any "missing data" reports from the user
3. After 30 days without issues, archive Firestore → delete Cloud Functions → decommission Firebase project (except Auth, which stays)

### Rollback Criteria

If within the first 24 hours any of the following occur, revert to Firebase:
- Credit balance mismatch
- Transactions missing or with NULL critical fields
- Scan pipeline non-functional for >1 hour

## Observability

From day one, the scan pipeline has two observability primitives. A full OpenTelemetry stack is Month-6+ work; these cheap primitives cover 90% of debugging needs.

### Structured JSON logs
- Library: `structlog` (Python)
- Every log line in a scan context includes `scan_id` and `user_id`
- Log destination: stdout → Railway log viewer (searchable, free-tier friendly)
- Minimum log events: scan_queued, scan_picked_up, gemini_call_start, gemini_call_end, gemini_retry, scan_completed, scan_failed, credit_deducted, credit_refunded

### scan_events audit table
- Every hop inserts a row — status transitions, Gemini cost, latency, errors
- Queryable via SQL for ad-hoc investigation
- Pruned daily by pg_cron (90-day retention)

### Trace endpoint (developer-facing)

```
GET /api/v1/scans/{id}/trace
```

Returns the full event timeline for a scan. Authed user must own the scan. Response:

```json
{
  "scan_id": "...",
  "status": "completed",
  "events": [
    { "type": "queued",       "occurred_at": "...", "payload": {...} },
    { "type": "picked_up",    "occurred_at": "...", "payload": { "worker_id": "..." } },
    { "type": "gemini_start", "occurred_at": "...", "payload": { "prompt_version": "v4.1", "image_count": 1 } },
    { "type": "gemini_end",   "occurred_at": "...", "payload": { "tokens_in": 1523, "tokens_out": 412, "cost_usd": 0.00034, "latency_ms": 18421 } },
    { "type": "completed",    "occurred_at": "...", "payload": {...} }
  ]
}
```

### Metrics captured per scan (U8 — Measure the Machine)

- `gemini_tokens_in` / `gemini_tokens_out` (for cost attribution)
- `gemini_cost_usd` (tokens × Gemini 2.5-flash pricing)
- `scan_duration_ms` end-to-end
- `gemini_latency_ms` isolated
- `queue_wait_ms` (queued → picked_up delta)
- `thumbnail_gen_ms`

These feed a minimal internal dashboard: daily cost, p50/p95 latency, failure rate by cause.

## Rate Limiting + Circuit Breaker

Three defensive layers ship from day one. All layer-1 + layer-3 implementations use Postgres (no Redis required).

### Layer 1 — Per-user rate limits (abuse protection)

Enforced at `POST /api/v1/scans/queue`:

```sql
-- Concurrent scans per user (max 3)
SELECT count(*) FROM pending_scans
WHERE user_id = $1 AND status IN ('queued','processing');

-- Daily scans per user (max 50)
SELECT count(*) FROM pending_scans
WHERE user_id = $1 AND created_at > now() - interval '1 day';
```

Exceeded → 429 response, no credit deducted.

### Layer 2 — Circuit breaker on Gemini (degradation protection)

Library: `pybreaker`

- **Failure threshold:** 50% failure rate in rolling 5-minute window
- **Open for:** 2 minutes (reset timeout)
- **Half-open probe:** after 2 min, allow one test call; if succeeds, close; if fails, re-open
- **When open:** new scans fail immediately with `ai_unavailable` error + **automatic credit refund**
- Logged as `scan_events.event_type='breaker_rejected'` with current failure rate

### Layer 3 — Global Gemini quota guard (provider-limit protection)

Belt-and-suspenders: reactive handling AND proactive limiting.

**Reactive (Layer 3a):**
- Catch 429 `RESOURCE_EXHAUSTED` responses from Gemini
- Honor `Retry-After` header
- Retry up to 3 times with exponential backoff
- On exhaust: fail scan + refund credit

**Proactive (Layer 3b):** Postgres minute-window counter prevents crossing the threshold in the first place.

```python
SAFETY_LIMIT = 12  # 80% of Gemini 2.5-flash free-tier (~15/min); tune as quota changes

async def claim_gemini_slot(conn) -> bool:
    bucket = datetime.now(tz=UTC).replace(second=0, microsecond=0)
    row = await conn.fetchrow(
        """
        INSERT INTO gemini_call_windows (minute_bucket, call_count)
        VALUES ($1, 1)
        ON CONFLICT (minute_bucket)
        DO UPDATE SET call_count = gemini_call_windows.call_count + 1
        RETURNING call_count
        """,
        bucket,
    )
    return row["call_count"] <= SAFETY_LIMIT  # False → sleep until next minute
```

Worker blocks before calling Gemini if `claim_gemini_slot` returns `False`.

## Known Trade-offs (Regressions from Current Stack)

Document these explicitly in the rebuild so they aren't rediscovered as bugs:

### View-only Offline (was: full read+write offline)

- **Current (Firestore):** writes while offline queue locally, sync on reconnect — free via Firestore offline persistence
- **Rebuild (v1):** read-only offline. TanStack Query `persistQueryClient` caches last 90 days of transactions in IndexedDB via service worker. Write buttons disabled offline with banner "Offline — view only."
- **Why:** Building offline write queue + conflict resolution = 1-2 weeks of work. Core scan flow is online-gated regardless (Gemini call). Ship view-only, measure demand.
- **Revisit trigger:** >10% of sessions attempt offline writes, or explicit user request. Then evaluate PowerSync or custom IndexedDB queue.

### No Firestore-style real-time cross-device sync on writes

- **Current:** edit transaction on phone → desktop tab reflects within ~1s via onSnapshot
- **Rebuild:** TanStack Query invalidation on edit returns via API. Cross-device sync requires manual refresh or tab focus → refetch.
- **Why:** Scope cutoff. SSE is used for scan status only.
- **Revisit trigger:** user uses multiple devices simultaneously and friction emerges.

## Key Features to Preserve

### 1. Transaction Management
- CRUD with items, images, categories
- Pre-computed period keys (day, week, month, quarter, year) for efficient queries
- Auto-updated timestamps (updatedAt on every save)
- Merchant aliases (user-defined nicknames)

### 2. Analytics Dashboard
- Spending by period (day/week/month/quarter/year)
- Category breakdown (pie/bar charts)
- Top merchants
- Spending trends over time
- Period-over-period comparison

### 3. Items View
- Flatten all transaction items across all transactions
- Aggregate by normalized name + merchant
- Show: total spent, purchase count, avg price, last purchase date
- Filter by category, merchant, date range

### 4. Settings & Preferences
- Theme: light/dark
- Color theme: mono/normal/professional (44+ Tailwind variants)
- Font family + size selection
- Language: Spanish (default) / English
- Currency: CLP (default), USD, EUR
- Cloud-persisted preferences (sync across devices)

### 5. Credit System
- Initial balance: 10 credits
- 1 credit per receipt scan, 1 "super credit" per statement scan
- Atomic deduction on queue, atomic refund on failure
- Full transaction log (earn/spend/refund)

### 6. Notifications
- In-app notification feed
- Web Push (VAPID) for browser notifications
- FCM for mobile (if PWA on Android)

### 7. PWA Capabilities
- Installable on home screen
- Offline support (cache-first for static assets)
- Service worker

### 8. Spanish-First i18n
- All UI text in Spanish (Chilean Spanish)
- English as secondary language
- Category names translated (ES ↔ EN)
- Code and API in English

## Key Source Files to Reference

Read these for full context:
- `docs/architecture/architecture.md` — System overview with Mermaid diagrams
- `docs/architecture/scan-pipeline-architecture.md` — Async scan pipeline
- `docs/architecture/data-models.md` — Firestore collections & Transaction schema
- `docs/architecture/cloud-functions.md` — All 11 functions documented
- `docs/architecture/api-contracts.md` — Cloud Function API specs
- `shared/schema/categories.ts` — Unified V4 category taxonomy (SSoT)
- `src/types/transaction.ts` — Transaction, TransactionItem, TransactionPeriods types
- `src/types/item.ts` — FlattenedItem, AggregatedItem types
- `src/features/scan/` — Scan state machine, handlers, hooks
- `functions/src/processReceiptScan.ts` — Heavy lifting of scan pipeline
- `functions/src/analyzeReceipt.ts` — Gemini integration + prompt
- `functions/src/analyzeStatement.ts` — Statement scanning
- `firestore.rules` — Security rules (data validation patterns)
- `src/utils/categoryTranslations.ts` — ES/EN category translations

## What I Want From This Plan

**Output a phased implementation plan structured as two parallel workstreams (A: UX, B: Backend) plus Integration and Cutover** — not a single linear sequence. A-phases and B-phases should be explicit about which can run in parallel vs which depend on each other.

**Deliverables expected per workstream:**

### Workstream B — Backend/Infrastructure (runs parallel to A after initial scaffolding)
1. **Monorepo structure** — Directory layout for FastAPI backend + shared types + (later) React frontend
2. **Database setup** — PostgreSQL schema per ADR (all tables, indexes, generated columns, pg_cron jobs, seed data)
3. **Auth middleware** — Firebase ID token verification via `firebase-admin`
4. **Async scan pipeline** — Postgres SKIP LOCKED worker + LISTEN/NOTIFY + SSE endpoint (no Celery/Redis)
5. **API design** — Pydantic v2 models, OpenAPI auto-docs, request/response contracts as the handshake with UX
6. **Category system** — `shared/categories.json` + codegen to Pydantic + TypeScript (U4-aligned runtime validation)
7. **AI integration** — Gemini from worker process, prompt management, retry logic, circuit breaker, sandbox-mode cache
8. **Cross-app API** — Gustify catalog mapping endpoints
9. **Observability** — structured logs, scan_events audit table, `/scans/{id}/trace` endpoint
10. **Rate limiting** — per-user caps + pybreaker + Postgres minute-window counter
11. **File storage** — Railway Volume (Cloudflare R2 fallback) for receipt images + thumbnails
12. **Data migration script** — Firestore export → PostgreSQL seed
13. **Sandbox testing** — simulated frontend payloads via pytest fixtures + cached Gemini responses; contract tests verify OpenAPI spec
14. **Deployment** — Railway (API + worker + Postgres + Volume), CI/CD, env management

### Workstream A — UX (runs parallel to B, per UX-PLAN)
15. Execute U0-U7 per [`UX-PLAN.md`](UX-PLAN.md) to produce the handoff bundle in `docs/rebuild/ux/handoff/`

### Integration (after A + B converge)
16. **Frontend scaffold** — React + TypeScript + Vite + Zustand + TanStack Query per UX handoff
17. **Component implementation** — build the component library from U3 with real styling from U4
18. **API wiring** — replace pytest fixtures with real UI calls; SSE + EventSource integration
19. **E2E tests** — Playwright covering critical flows (scan, save, edit within 90-day window, offline view, settings)

### Cutover (final phase)
20. **Production migration** — per the Cutover Plan section; 2-hour maintenance window; 30-day Firestore read-only rollback window

**Phase breakdown requirement:** emit the plan as a graph, not a list. Mark which B-phases can proceed independently of A, which A-phases block Integration, and which phases MUST be sequential (e.g., B2 DB schema before B4 scan pipeline).

## Constraints

- Solo developer — no team ceremony overhead; tolerate parallel workstreams with one human executing
- Chilean market first — Spanish-first UI, CLP currency default
- Must preserve EXACT 4-level category taxonomy (12 L1 + 44 L2 + 9 L3 + 42 L4, English PascalCase canonical)
- Must preserve async scan pipeline behavior (queue → process → deliver via SSE)
- Must preserve all credit system atomic guarantees (deduct/refund in one DB transaction)
- Must preserve all failure recovery paths per the Async Scan Pipeline section
- Budget-conscious: Railway (paid tier small) + Vercel free frontend + Cloudflare R2 fallback
- Cross-app integration with Gustify — merchant-scoped mapping table in Gastify, Gustify reads via API
- **Scope limits (ADR D17):** no UF currency, no RUT / personal-identifier PII beyond email, no dedicated IVA field
- **90-day edit window (ADR D15):** transactions older than 90 days are read-only; no statistics recomputation on historical periods
