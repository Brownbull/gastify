# ADR-2026-04-20: Gastify (BoletApp) Full-Stack Rebuild — Architecture Decisions

**Date:** 2026-04-20
**Status:** accepted
**Deciders:** brownbull

## Context

The current BoletApp prototype (React + Firebase + Cloud Functions + Firestore) is being rebuilt as "Gastify" on a FastAPI + PostgreSQL + React stack. The draft rebuild prompt at `docs/ultraplan-rebuild-prompt.md` was stress-tested via `/gabe-roast architect`, surfacing 13 gaps across MVP/Enterprise/Scale maturity levels. This ADR captures the resolution of all 13 so the decisions survive beyond the conversation that produced them.

**Source roast:** architect perspective, 2026-04-20 session.
**Format:** Single umbrella ADR with 13 sub-decisions. Each sub-decision follows the per-decision template shape (Analogy + Constraint Box + Chosen Option + Reasoning). This deviates from the one-ADR-per-decision convention because the 13 are interdependent foundation choices for a single rebuild — splitting them would obscure the web of trade-offs.

## Decision Summary

| ID | Area | Decision |
|---|---|---|
| **D1** | Cross-app integration (Gustify) | Merchant-scoped mapping table in Gastify; Gustify reads via API |
| **D2** | Auth + DB hosting | Firebase Auth (keep) + Railway Postgres + Railway Volume |
| **D3** | Production cutover | One-time migration (1 user); pre-migration Firestore export retained 1 year |
| **D4** | Async job runner | Postgres `SKIP LOCKED` + dedicated worker process; LISTEN/NOTIFY for wake-ups. No Redis/Celery |
| **D5** | Shared category source | `shared/categories.json` (English keys, locale display map) → Pydantic + TS codegen; 4-level taxonomy as first-class enums |
| **D6** | Multi-currency representation | `amount_minor INTEGER` + `currency` + `amount_usd_minor` + `fx_rate_to_usd` shadow |
| **D7** | Offline capability | View-only offline for v1 (90-day IndexedDB cache); writes require online |
| **D8** | Real-time scan status | Postgres `LISTEN/NOTIFY` piped through SSE |
| **D9** | Observability | Structured JSON logs with `scan_id` threading + `scan_events` audit table + `/scans/{id}/trace` endpoint |
| **D10** | Multi-replica event delivery | Resolved by D8 — `LISTEN/NOTIFY` is broadcast by design |
| **D11** | Rate limiting + circuit breaker | Postgres per-user caps + `pybreaker` on Gemini + 429 handler + Postgres minute-window global counter |
| **D12** | Period columns | All five (`day/week/month/quarter/year`) as `GENERATED ALWAYS AS STORED` |
| **D13** | Auth provider portability | `auth_provider + auth_provider_id` composite instead of `firebase_uid`; `email_normalized` generated column |
| **D14** | UX pipeline before backend code | 7-phase UX execution (journeys → IA → wireframes → components → hi-fi → interactions → a11y → handoff) using Claude Design as primary tool, HTML mockups as fallback. Full plan in [`UX-PLAN.md`](UX-PLAN.md). 17 UX decisions already resolved. |
| **D15** | 90-day edit window for transactions | Add / edit / delete actions available only on transactions dated within the last 90 days. Older rows are read-only. Avoids statistics recomputation on historical periods. Soft-delete via `deleted_at`; 30-day trash retention. |
| **D16** | Category language enforcement | Merchant + item names stored as-scanned (any language). Categories (L1–L4) always stored as English PascalCase keys, enforced via Pydantic `output_type` on Gemini calls. Frontend renders via `display[locale]` map from `shared/categories.json`. |
| **D17** | Domain scope limits | No UF (Unidad de Fomento) currency support — amounts are always in CLP / USD / EUR. No RUT or other personal-identifier fields on users or transactions — PII limited to email (and optionally name later). IVA tracked via the existing `TaxFees` item category; no dedicated IVA field or rate column. |
| **D18** | Two parallel workstreams | Execution splits into Workstream A (UX — per UX-PLAN) and Workstream B (Backend/Infrastructure). They run in parallel after the ultraplan phase breakdown, converging at a UI-integration phase. Backend uses simulated frontend payloads (pytest + OpenAPI) to validate before the real frontend arrives. |

---

## D1: Cross-app Integration with Gustify

### What's Changing
Gastify owns a merchant-scoped mapping table that records which Gastify items correspond to which Gustify catalog IDs (ingredients or prepared-food entries). Gustify reads this table via a public Gastify API; Gustify never writes to Gastify's DB.

### The Analogy
Two shopkeepers in neighboring buildings with a shared address book pinned to the wall between them. Shopkeeper A (Gastify) maintains the book — writes new entries as customers come and go. Shopkeeper B (Gustify) consults the book through a small window to answer "have I seen this product before?" Neither shop needs to know the other's inventory system.

### Constraint Box
```
IS:     Per-user, per-merchant, per-item-name mapping from Gastify's raw item name
        to a Gustify catalog ID that Gastify treats as opaque.
IS NOT: Shared pantry state. Gastify knows nothing about Gustify's pantry contents.
RISK:   Gustify deletes a catalog ID → Gastify holds a dead reference. Gustify must
        handle lookup-miss gracefully (treat unknown ID as "unmapped").
```

### Options Considered
- **A. Event webhook** (Gastify POSTs to Gustify on save) — good for loose coupling; requires retry queue
- **B. Gastify-side read API** (Gustify pulls) — ✅ chosen
- **C. Shared `cross_app` table both apps read/write** — requires shared DB role or shared service
- **D. Outbox + pub/sub bus (NATS/Redis streams)** — overkill for two apps

### Decision
**Option B.** Gastify exposes `GET /api/v1/cross-app/mappings?user_email=X` and `POST /api/v1/cross-app/mappings`. Mapping rows live in Gastify's `gustify_catalog_mappings` table (merchant + item-name + user scoped).

### Reasoning
Separate databases per app. Gastify is the originator of raw items, so the mapping table belongs with the originator. An API keeps the apps independently deployable without a shared DB role. A webhook is not needed because the mapping update is user-triggered (classification confirmation), so pull timing matches user intent.

### Consequences
- **Schema:** `gustify_catalog_mappings (user_email, merchant_name_normalized, gastify_item_name_normalized, gustify_catalog_id, gustify_catalog_type, confidence, use_count, confirmed_at)` with unique constraint on the three-part key.
- **Watch:** Rate of "unmapped" responses from Gustify lookups; if high, flow between apps has drifted.
- **Revisit when:** A third app joins the ecosystem, or mapping volume exceeds single-table performance.

---

## D2: Auth + Database Hosting

### What's Changing
Keep Firebase Auth (verify ID tokens in FastAPI via `firebase-admin`). Host Postgres on Railway. Store receipt images + thumbnails on Railway Volumes (or Cloudflare R2 if volumes prove limiting).

### The Analogy
Keep the front door lock you already own (Firebase Auth) but rebuild the house on a different plot (Railway). The lock works independently of where the house sits; no need to rekey every door just because the foundation changed.

### Constraint Box
```
IS:     Firebase Auth for identity, Railway Postgres for data, Railway Volume for files.
IS NOT: A Supabase adoption (we evaluated and declined — FastAPI-first design mostly
        bypasses Supabase's value).
RISK:   Railway Volume has size/quota limits; if hit, migrate to Cloudflare R2 (S3-compatible).
```

### Options Considered
- **A. Keep Firebase Auth + verify in FastAPI** — ✅ chosen
- **B. Supabase Auth** — new vendor, UID remap required, bundled features mostly unused
- **C. Auth0 / Clerk** — paid tier looms, overkill
- **D. Custom (FastAPI-Users + Google OAuth)** — own the abuse/recovery surface — time sink

**DB hosting:**
- **Railway Postgres** — ✅ chosen (single vendor with API + workers + volume; ~$5/mo post-free-tier)
- **Supabase DB** — rejected because value stack (Auth + Realtime + PostgREST) overlaps FastAPI

### Decision
Firebase Auth (unchanged from current prototype) + Railway-hosted Postgres + Railway Volume for initial file storage.

### Reasoning
Zero user-visible auth migration required. Railway consolidates API, worker, DB, and storage onto one dashboard with unified billing. Budget-conscious: solo developer + 1 user means free tiers dominate initial cost. D13 (below) decouples schema from vendor so a future auth migration is a config swap, not a schema rewrite.

### Consequences
- **Dependencies:** `firebase-admin` for token verification in FastAPI middleware.
- **Env:** `FIREBASE_PROJECT_ID` + service-account JSON (mounted as secret).
- **Watch:** Railway Volume throughput / size caps if scan volume grows.
- **Revisit when:** Image storage approaches volume limits, or multi-region deployment becomes a requirement.

---

## D3: Production Cutover Strategy

### What's Changing
One-time migration: freeze Firebase writes → export Firestore → backfill Postgres → point frontend at new API → keep Firestore read-only for 30 days as rollback.

### The Analogy
Moving house with one resident. Pack everything in one weekend, keep the old address forwarding mail for a month in case a letter arrives at the wrong door.

### Constraint Box
```
IS:     Big-bang cutover justified by having only 1 user (the developer) during migration.
IS NOT: A zero-downtime production migration. Expect 1-2 hours of maintenance mode.
RISK:   Cutover window lands in the middle of an active scan. Fix: freeze writes at the
        start of the window; in-flight scans either complete on Firebase or are refunded.
```

### Decision
1. Enable maintenance mode on Firebase app (flag `MAINTENANCE_MODE=true` in frontend)
2. `gcloud firestore export gs://boletapp-backups/pre-migration-2026-XX-XX/` — retain 1 year
3. Python backfill script reads export, INSERTs into Postgres preserving IDs where possible
4. Spot-check: 5 random transactions + user profile + credit balance end-to-end
5. Point frontend DNS / env at new API
6. Keep Firestore read-only for 30 days; monitor for any data Gastify cannot explain

### Reasoning
Dual-write + feature-flag cutover is standard for multi-user production but is overkill for N=1. The complexity cost exceeds the risk cost at this user scale. Explicit rollback window (30 days Firestore read-only) provides the safety net.

### Consequences
- **Artifact:** Firestore export archived for 1 year in `gs://boletapp-backups/`
- **Watch:** Any Firebase writes attempted during the window → client errors → investigate
- **Revisit when:** User count > 10 and a similar migration is needed; upgrade to dual-write.

---

## D4 + D5: Async Job Runner (Postgres-Only)

### What's Changing
Replace Firestore triggers with a Postgres-backed queue: `pending_scans` table doubles as the job queue; a dedicated worker process polls via `SELECT ... FOR UPDATE SKIP LOCKED`; `LISTEN/NOTIFY` wakes workers instantly instead of tight polling. No Celery, no Redis.

### The Analogy
A diner kitchen with a rotating order wheel. Cooks (workers) approach the wheel and clip tickets with a clothespin (row lock). Other cooks see the clothespin and skip to the next clean ticket. If a cook drops dead mid-ticket, her clothespin releases automatically (transaction aborts) and the next cook grabs the work. A hanging bell (LISTEN/NOTIFY) rings when a new order is placed — cooks don't have to stare at the wheel continuously.

### Constraint Box
```
IS:     Postgres IS the queue. Every scan row has status in ('queued','processing',
        'completed','failed'). Workers claim rows atomically via SKIP LOCKED.
IS NOT: An in-process task runner (FastAPI BackgroundTasks) — those die with the
        API process and lose in-flight work.
RISK:   Worker crashes mid-scan → row stays 'processing' past deadline → `pg_cron`
        reaper resets it to 'failed' + refunds credit.
```

### Options Considered
- **A. FastAPI `BackgroundTasks`** — dies on API restart; unacceptable for paid scans
- **B. Postgres SKIP LOCKED + worker process** — ✅ chosen
- **C. `arq` (Redis-based async)** — adds Redis
- **D. `dramatiq`** — adds Redis/RabbitMQ
- **E. Celery + Redis** — heavy for solo dev, two extra infra pieces
- **F. Transactional outbox + poller** — same idea as B but with extra indirection table; unneeded

### Decision
**Option B.** Postgres SKIP LOCKED pattern. Worker is a second Railway service (`python -m app.worker`) pointing at the same DB. Atomic "deduct credit + create pending_scan" in a single DB transaction eliminates the M4 outbox concern entirely because there's no second system to coordinate with.

### Reasoning
Eliminates two infra pieces (Redis broker + separate task runner) and collapses the atomic dispatch problem to a single DB transaction. Scales horizontally by adding worker replicas — `SKIP LOCKED` handles concurrency for free. `pg_cron` runs the hourly stale-scan reaper (D9-adjacent). Aligns with **U2 — Plan Light, Build Real**.

### Consequences
- **Schema:** `pending_scans (id, user_id, status, image_urls, result JSONB, error, credit_deducted, deadline, worker_id, started_at, created_at, updated_at)`
- **Index:** `CREATE INDEX idx_pending_scans_queue ON pending_scans(status, created_at) WHERE status='queued';`
- **Reaper:** `pg_cron` job hourly, resets `status='processing' AND started_at < now() - interval '10 minutes'` to `'failed'` + credit refund
- **Watch:** Queue depth (`SELECT count(*) FROM pending_scans WHERE status='queued'`); alert if > 20
- **Revisit when:** Postgres-backed queue becomes the bottleneck (>100 scans/min sustained) — then evaluate Redis-backed `arq`

---

## D5: Shared Category Taxonomy (4-level English Canonical)

### What's Changing
Move from the current split representation (L2/L4 as PascalCase arrays + L1/L3 as embedded Spanish strings inside prompt blobs) to a single `shared/categories.json` with English PascalCase keys at all four levels, locale display maps, and parent-child relationships. Pydantic on backend + codegen to TypeScript on frontend, both from the same JSON.

### The Analogy
Currency with one canonical unit. All amounts are stored in USD cents internally; local currencies (CLP, EUR) are display-layer conversions. Same pattern for categories: English PascalCase is the canonical key stored in DB and API; Spanish/English/future-locale labels are a display concern.

### Constraint Box
```
IS:     Single source of truth in JSON. Backend loads via Pydantic (runtime validated);
        frontend has a 10-line build script generating TS const + union type.
IS NOT: Hand-maintained pairs of files with a "remember to update both" comment.
RISK:   JSON edits without regenerating TS → frontend drifts. CI must run codegen
        + compare-or-fail.
```

### Structure

```json
{
  "store_category_groups": [
    { "key": "Supermercados", "display": { "en": "Supermarkets", "es": "Supermercados" },
      "children": ["Supermarket", "Wholesale"] },
    ...
  ],
  "item_category_groups": [ ... ]
}
```

**Totals (preserve exactly):**
- L1 store groups: 12
- L2 store categories: 44
- L3 item groups: 9
- L4 item categories: 42

**Canonical language:** English PascalCase keys. Display strings localized via the `display` map keyed by locale code.

### Decision
JSON as source of truth. Python Pydantic enums auto-generated at import time. TypeScript const + union type generated via CI script. Pre-commit hook runs the codegen; CI fails if files drift.

### Reasoning
Matches the existing "USD canonical + locale display" pattern used for money — same mental model across two domains reduces cognitive overhead. Pydantic runtime validation aligns with **U4 — Enforce Output Structure Mechanically** (AI agents get hierarchy validation for free via `output_type=PydanticModel`).

### Consequences
- **Files:** `shared/categories.json`, `shared/categories.py` (generated), `shared/categories.ts` (generated)
- **Script:** `scripts/gen_categories.py` runs in pre-commit + CI
- **Migration task:** Extract L1/L3 groups from current embedded strings in `shared/schema/categories.ts` lines 220-247 into the new JSON structure
- **Watch:** CI drift-check failures (indicates someone edited JSON without regen)
- **Revisit when:** Additional locales beyond ES/EN are added (pattern already supports this with zero schema change)

---

## D6: Multi-Currency Representation

### What's Changing
Store monetary values as `amount_minor INTEGER` (always in minor units: CLP has no minor, USD/EUR use cents) plus `currency TEXT` plus shadow fields `amount_usd_minor INTEGER` + `fx_rate_to_usd NUMERIC(10,6)` + `fx_captured_at TIMESTAMPTZ` for cross-currency analytics.

### The Analogy
Every container ship carries cargo in its local unit (pounds, kilos, liters) AND has a stamped weight-in-tonnes plate bolted to the hull at loading. You read the local unit when dealing with the local port; you read the tonnes plate when comparing ships across ports.

### Constraint Box
```
IS:     Local-currency minor units are authoritative; USD shadow is for analytics
        only, captured at transaction time (not recomputed daily).
IS NOT: Real-time FX conversion. FX rate frozen at transaction time preserves
        historical truth.
RISK:   Currency with unusual exponent (e.g., JPY, BHD) — resolved by `currencies`
        reference table that stores exponent per currency code.
```

### Decision
- Rename current `total INTEGER` → `amount_minor INTEGER` (clarifies unit)
- Add `currency TEXT` (already present) backed by a `currencies` reference table with `(code, exponent, name)`
- Add `amount_usd_minor INTEGER` + `fx_rate_to_usd NUMERIC(10,6)` + `fx_captured_at TIMESTAMPTZ`
- Apply the same pattern to `transaction_items.total_price` → `total_price_minor`

### Reasoning
The existing prototype already has a cents-aware flag pattern; this ADR formalizes it in schema names so ambiguity can't creep back in. Shadow USD field enables mixed-currency analytics (e.g., "total USD-equivalent spend this quarter across CLP + USD transactions") without recomputing FX on every query.

### Consequences
- **Schema:** All money columns suffixed `_minor`; new `currencies` reference table seeded with CLP(0), USD(2), EUR(2)
- **FX capture:** At transaction creation, worker fetches FX rate (cached 1 hour) and stores the shadow amount
- **Watch:** NULL `amount_usd_minor` rows (indicates FX fetch failure at create time) — backfill job
- **Revisit when:** Historical FX reconstruction is needed (then add `fx_rates` table with daily snapshots)

---

## D7: Offline Capability (View-Only for v1)

### What's Changing
Accept a feature regression from the current stack. Firestore offline persistence gave the current app free write-while-offline + eventual consistency. The rebuild's REST + SSE architecture does not have this. v1 ships with **view-only offline** (90-day transaction cache in IndexedDB via TanStack Query `persistQueryClient`) + a banner indicating offline status; scans and saves require online.

### The Analogy
A library card catalog. Offline, you can browse the cards (read). To borrow a book or return one (write), you need the librarian on duty (network).

### Constraint Box
```
IS:     Read-only offline UX. User sees last-synced state, can filter/navigate/view
        details, but any mutation button is disabled with "Requires connection" tooltip.
IS NOT: A regression from feature parity with the current app without acknowledgment.
        This is documented explicitly.
RISK:   User expectation set by the current app is "works offline." Product needs to
        communicate the change; in-app banner + release notes.
```

### Options Considered
- **A. PowerSync (managed Postgres ↔ client SQLite)** — real solution, adds vendor
- **B. ElectricSQL (self-host sync)** — immature; self-host is work
- **C. PGlite + custom sync** — experimental; build sync yourself
- **D. Custom IndexedDB write queue** — 1-2 weeks of work, proven pattern
- **E. View-only offline** — ✅ chosen

### Decision
**Option E for v1.** TanStack Query `persistQueryClient` persists last 90 days of transactions to IndexedDB via the service worker. Write buttons disabled when `navigator.onLine === false`. Explicit banner: "Offline — view only."

### Reasoning
Scans require Gemini (online-only regardless). Writes while offline are an edge case; the core loop "scan → save" is already online-gated by the AI dependency. Building custom IndexedDB write queue is 1-2 weeks; ship view-only and measure demand.

### Consequences
- **Regression acknowledged:** Add to rebuild prompt under "Known Trade-offs"
- **Watch:** User complaints about offline writes; analytics event `offline_write_attempt_blocked`
- **Revisit when:** More than 10% of sessions attempt offline writes, or user feedback explicitly requests it → adopt PowerSync or custom queue

---

## D8: Real-Time Scan Status (LISTEN/NOTIFY + SSE)

### What's Changing
Replace Firestore `onSnapshot` real-time listener with Postgres `LISTEN/NOTIFY` piped through Server-Sent Events. When a worker completes a scan, it calls `pg_notify('scan_done_<user_id>', <scan_id>)`. Every API replica runs `LISTEN` on its side; whichever one holds the user's open SSE connection forwards the event.

### The Analogy
Hotel guest pager. You carry the disc (SSE connection) — a live radio link to the hostess stand. In the kitchen, the chef (worker) presses your table's button on a panel (NOTIFY). The signal travels through the always-open wire (LISTEN) and only YOUR pager buzzes. You don't ask "is it ready?" every 10 seconds.

### Constraint Box
```
IS:     Postgres is the pub/sub bus. No Redis, no extra broker, no sticky sessions.
IS NOT: A bidirectional channel. Server pushes to client; client doesn't push back
        via the same connection (it POSTs via standard HTTP).
RISK:   Long-lived SSE connections behind Railway's proxy — needs `X-Accel-Buffering: no`
        and periodic keepalive comments to prevent proxy timeout.
```

### Options Considered
- **A. SSE** ✅ chosen
- **B. WebSocket** — bidirectional (unneeded), sticky sessions required for multi-replica
- **C. Polling** — simple fallback; acceptable MVP if SSE proves complex
- **D. Supabase Realtime** — bundled with Supabase only (rejected in D2)

### Decision
**Option A.** SSE endpoint `GET /api/v1/scans/stream` with per-user channel via JWT identity. Worker does `pg_notify`. Each API replica independently `LISTEN`s; broadcast is native.

### Reasoning
Scan status is one-way (server → client), short-lived, low-volume. SSE matches the traffic shape exactly. Zero extra infra beyond Postgres. Aligns with **U5 — Stream the Thinking** (10-30s scans get real-time progress, not dead air).

### Consequences
- **Endpoint:** `GET /api/v1/scans/stream` (SSE, authed)
- **Worker:** `await conn.execute("SELECT pg_notify($1, $2)", f"scan_done_{user_id}", json.dumps(payload))`
- **Keepalive:** Send `: ping\n\n` every 20s to survive proxy timeouts
- **Client:** `EventSource` with auto-reconnect (browser built-in)
- **Fallback:** Keep `GET /api/v1/scans/{id}` polling endpoint; client uses it if EventSource fails
- **Watch:** Connection churn rate; SSE reconnect storms → proxy config issue
- **Revisit when:** Bidirectional streaming is needed (e.g., user cancels scan mid-flight); then consider WebSocket upgrade for that feature only

---

## D9: Observability for the Scan Pipeline

### What's Changing
Introduce two observability primitives from day one: (1) structured JSON logs with `scan_id` threaded through every log line from API → worker → Gemini call → SSE emit; (2) a `scan_events` audit table that records every hop as a row. Expose `GET /api/v1/scans/{id}/trace` returning the event timeline.

### The Analogy
Package tracking for a parcel. Every hop — "arrived at sort facility," "out for delivery," "delivered to front door" — stamps the tracking number into a shared log. When a package is stuck, support doesn't play detective; they paste the tracking number and see the entire journey.

### Constraint Box
```
IS:     Two cheap primitives (structured logs + audit table) that cover 90% of
        debugging needs without adding vendors.
IS NOT: A full distributed tracing stack (OpenTelemetry + Honeycomb/Jaeger). That
        is a Month-6 upgrade when the cheap primitives become insufficient.
RISK:   scan_events table grows unbounded without cleanup. `pg_cron` prunes
        events older than 90 days.
```

### Decision
- **Logs:** `structlog` or stdlib logging + JSON formatter. Every log call includes `scan_id` when in a scan context. Railway log viewer is the UI.
- **Audit table:** `scan_events (id, scan_id, event_type, payload JSONB, occurred_at)` with index on `(scan_id, occurred_at)`
- **Event types:** `queued, picked_up, gemini_start, gemini_end, thumbnail_done, completed, failed, refunded`
- **Trace endpoint:** `GET /api/v1/scans/{id}/trace` returns event list for the authed user's scan
- **U8-aligned metrics per event:** `gemini_tokens_in`, `gemini_tokens_out`, `gemini_cost_usd`, `scan_duration_ms`, `gemini_latency_ms`

### Reasoning
Your current Cloud Function pipeline is already painful to debug (per project memory: "result delivery chain broken" bug). A distributed rebuild without observability guarantees a worse bug. Starts cheap (no new vendor) and aligns with **U8 — Measure the Machine** (cost, latency, token usage captured per run).

### Consequences
- **Schema:** `scan_events` table + 90-day `pg_cron` pruner
- **Deps:** `structlog` (Python)
- **Watch:** scan_events row count by type per day; anomaly = pipeline regression
- **Revisit when:** Cross-request tracing needed (e.g., one user's scan triggered an effect on another's data) — adopt OpenTelemetry + Honeycomb free tier at that point

---

## D10: Multi-Replica Event Delivery (Resolved by D8)

### What's Changing
Nothing additional. D8's `LISTEN/NOTIFY` is broadcast within Postgres by design: every API replica that runs `LISTEN scan_done_<user_id>` receives the event simultaneously. The replica holding the user's SSE connection forwards it; others no-op.

### The Analogy
A municipal siren system. Every neighborhood (API replica) has its own siren wired to the central alarm (Postgres). When the alarm triggers, all sirens sound. In each neighborhood, only the residents whose street the emergency concerns (the user with an active SSE connection on that replica) actually take action.

### Constraint Box
```
IS:     Native Postgres broadcast. Horizontal scaling of API replicas requires no
        additional pub/sub infrastructure.
IS NOT: At-most-once delivery. If two replicas both hold a stale SSE connection to
        the same user (race during reconnect), both may forward; client
        deduplicates by scan_id.
RISK:   Someone "simplifies" later by switching to in-memory pub/sub — breaks
        multi-replica. This ADR serves as the guardrail.
```

### Decision
Document the dependency: **D8's multi-replica correctness depends on using `LISTEN/NOTIFY`, not an in-process pub/sub.** Any future "optimization" that replaces it must preserve the broadcast property.

### Consequences
- **Guardrail:** This ADR must be referenced in any PR touching the SSE implementation
- **Watch:** Scan completions that reach worker logs but never reach client — indicator of listener gap
- **Revisit when:** Scaling beyond Postgres's NOTIFY payload limit (8KB per notification) — switch to notification = scan_id only + client fetches details

---

## D11: Rate Limiting + Circuit Breaker

### What's Changing
Three defensive layers: (1) per-user rate limits via Postgres counts, (2) circuit breaker on Gemini via `pybreaker`, (3) global Gemini quota protection via both a 429-response handler AND a Postgres minute-window counter (belt-and-suspenders from day one, anticipating more users than the solo dev).

### The Analogy
Three independent safety systems on a highway: on-ramp metering lights (per-user limit — you can't flood the highway), a bridge-out detour sign (circuit breaker — when Gemini is visibly broken, stop routing cars toward it), and a toll plaza with a daily cap (global counter — ensures the highway total stays under the agreement with the road authority).

### Constraint Box
```
IS:     Three layers, each targeting a different failure mode:
        - Per-user: abuse + runaway client scripts
        - Circuit breaker: sustained Gemini outages
        - Global quota: hard provider ceiling
IS NOT: A single rate-limit layer. Each protects against a different attacker/failure.
RISK:   Limits too tight → legitimate users get 429s. Start generous, tighten based
        on actual usage patterns.
```

### Layer 1: Per-User Limits (Postgres-based)
```sql
-- Before queueing a scan:
SELECT count(*) FROM pending_scans
WHERE user_id = $1 AND status IN ('queued','processing');  -- cap: 3 concurrent

SELECT count(*) FROM pending_scans
WHERE user_id = $1 AND created_at > now() - interval '1 day';  -- cap: 50/day
```

### Layer 2: Circuit Breaker on Gemini
`pybreaker` with 5-minute rolling window. Failure threshold: 50%. Reset timeout: 2 minutes. When open: new scans immediately fail with `ai_unavailable` + **credit refunded**.

### Layer 3: Global Gemini Quota (E + A from day one)
- **E (reactive):** Catch 429 responses from Gemini, honor `Retry-After`, retry 3x, refund on exhaust
- **A (proactive):** Postgres minute-window counter ensures we never *start* more than `SAFETY_LIMIT=12` calls in any minute (80% of current Gemini 2.5-flash free-tier quota of ~15/min)

```sql
CREATE TABLE gemini_call_windows (
  minute_bucket TIMESTAMPTZ PRIMARY KEY,
  call_count INTEGER NOT NULL DEFAULT 0
);
-- pg_cron daily: DELETE FROM gemini_call_windows WHERE minute_bucket < now() - interval '1 hour';
```

```python
async def claim_gemini_slot(conn, safety_limit: int = 12) -> bool:
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
    return row["call_count"] <= safety_limit
```

### Decision
All three layers ship in initial build. No deferral.

### Reasoning
User anticipates more than 1 user from rollout. Layering is cheap (<30 lines total for Layer 3), catches different failure modes, and prevents a single misbehaving client from draining Gemini quota for everyone.

### Consequences
- **Deps:** `pybreaker`
- **Schema:** `gemini_call_windows` table + daily prune
- **Watch:** Per-user 429 rate; circuit-breaker open events (log + alert); `gemini_call_windows.call_count` hitting `SAFETY_LIMIT` frequently → raise quota or tune limit
- **Revisit when:** Second worker replica appears — confirm Postgres counter is the authoritative source, not in-process counters

---

## D12: Generated Period Columns

### What's Changing
All five period columns on `transactions` become `GENERATED ALWAYS AS ... STORED` — Postgres computes them on every insert/update, app code can never forget to set them.

```sql
period_day     DATE GENERATED ALWAYS AS (date) STORED,
period_week    TEXT GENERATED ALWAYS AS (to_char(date, 'IYYY-"W"IW')) STORED,
period_month   TEXT GENERATED ALWAYS AS (to_char(date, 'YYYY-MM')) STORED,
period_quarter TEXT GENERATED ALWAYS AS (to_char(date, 'YYYY-"Q"Q')) STORED,
period_year    TEXT GENERATED ALWAYS AS (to_char(date, 'YYYY')) STORED
```

### The Analogy
Five weather stations all reading from the same thermometer. Pulling them onto the same automated sensor guarantees you never get "today's temperature is blank at the coastal station because the operator forgot to write it down."

### Constraint Box
```
IS:     All five period columns derived by Postgres. App never writes to them.
IS NOT: App-layer responsibility. Every write path is protected against omission
        because omission is impossible.
RISK:   None substantive. Generated columns cost trivial write-time computation.
```

### Decision
Unconditional. Replace the "two generated, three app-managed" split in the rebuild prompt with "all five generated."

### Reasoning
The original prompt had `period_day/month/year` as generated columns but left `period_week` and `period_quarter` as plain TEXT — inconsistent and a hidden data-integrity hazard. Postgres supports ISO week (`'IYYY-"W"IW'` → `2026-W16`) and quarter (`'YYYY-"Q"Q'` → `2026-Q2`) natively.

### Consequences
- **Schema:** Updated column definitions in rebuild prompt
- **App code:** Never writes to any `period_*` column; SELECT-only
- **Watch:** N/A — unconditional improvement

---

## D13: Auth Provider Portability

### What's Changing
Replace `users.firebase_uid TEXT UNIQUE NOT NULL` with `(auth_provider TEXT, auth_provider_id TEXT)` composite identity. Add `email_normalized TEXT GENERATED ALWAYS AS (lower(email)) STORED` with a unique index for Gustify cross-app lookups.

```sql
users (
  id UUID PK DEFAULT gen_random_uuid(),
  auth_provider TEXT NOT NULL,        -- 'firebase' today
  auth_provider_id TEXT NOT NULL,     -- the provider's opaque UID
  email TEXT NOT NULL,
  email_normalized TEXT GENERATED ALWAYS AS (lower(email)) STORED,
  ...
  UNIQUE (auth_provider, auth_provider_id)
)
CREATE UNIQUE INDEX idx_users_email_normalized ON users(email_normalized);
```

### The Analogy
A house foundation that doesn't have the current landlord's name stamped in the concrete. If the building sells, you repaint the sign at the entrance — you don't jackhammer the foundation.

### Constraint Box
```
IS:     Schema decoupled from identity provider. Switching providers later is a
        config change + data backfill of the `auth_provider` column — not a column
        rename cascading through queries.
IS NOT: A multi-provider-at-once setup. One provider is active at a time; the
        composite just keeps the door open.
RISK:   `email_normalized` doesn't handle email-plus-addressing (user+tag@gmail.com
        is treated as distinct from user@gmail.com). Acceptable — provider already
        applies its own normalization at the ID layer.
```

### Decision
Apply at initial migration. Retrofitting later is the painful version.

### Reasoning
One extra column, one extra unique constraint. Grants forever-portability between auth providers (D2 keeps Firebase today; if Supabase Auth is chosen later, we flip `auth_provider='firebase'` rows to `auth_provider='supabase'` post-migration without touching any query). `email_normalized` specifically serves D1's Gustify cross-app lookups, which key on email.

### Consequences
- **Schema:** Updated `users` table definition in rebuild prompt
- **Middleware:** FastAPI auth dependency returns `(auth_provider='firebase', auth_provider_id=firebase_uid)` from verified ID token
- **Watch:** N/A — unconditional improvement
- **Revisit when:** Multi-provider-at-once becomes a requirement (then add provider-specific metadata tables)

---

## D14: UX Pipeline Before Backend Code

### What's Changing
No backend implementation begins until 7-phase UX pipeline produces a Claude Code handoff bundle. 17 UX decisions already resolved from the UX-perspective roast.

### The Analogy
Dressmaker takes measurements and sews a paper pattern before cutting the fabric. Cutting fabric first — and sewing blind — wastes expensive material on ill-fitting garments that must be scrapped.

### Constraint Box
```
IS:     UX pipeline produces a design contract the backend serves. Phases are
        sequential: journeys → IA → wireframes → components → hi-fi → interactions
        → a11y → handoff. ~2 weeks solo.
IS NOT: A waterfall gate that blocks the rebuild. Backend foundation work
        (DB schema, auth, empty API scaffolding) can run in parallel.
RISK:   Claude Design research preview quota exhausts or produces insufficient
        fidelity → fall back to HTML mockups in docs/rebuild/ux/wireframes/.
```

### Decision
Execute per [`UX-PLAN.md`](UX-PLAN.md). Claude Design primary; HTML mockup fallback.

### Consequences
- **Artifact folder:** `docs/rebuild/ux/` created in Phase U0
- **Ultraplan input:** final handoff bundle in `docs/rebuild/ux/handoff/` referenced as Phase-0 context by `/ultraplan`
- **PWA-only:** single codebase serves mobile + desktop + installable — no native iOS/Android/desktop builds
- **Watch:** Phase-U4 hi-fi quality; if Claude Design outputs require >30% rework, switch to HTML fallback for remaining screens
- **Revisit when:** a future rebuild or major feature launches — refine the pipeline with lessons from this execution

## D15: 90-Day Edit Window for Transactions

### What's Changing
Transactions dated within the last 90 days: full CRUD (create, edit, soft-delete with 30-day trash retention). Transactions older: read-only. Analytics for periods > 90 days treated as immutable snapshots.

### The Analogy
Paper checkbook vs bank statement. You can edit today's entry; last year's statement is archived and read-only. Trying to "edit" last year's line would invalidate every downstream balance — so the bank freezes the history and only posts corrections forward.

### Constraint Box
```
IS:     Rolling 90-day editable window; older rows frozen. Soft-delete via
        `deleted_at`; trash view retains 30 days before hard-delete.
IS NOT: A data retention limit. Historical transactions remain queryable for
        analytics — they just can't be mutated.
RISK:   User wants to correct a 6-month-old typo — can't. Documented limitation;
        revisit when recomputation becomes cheap.
```

### Decision
Enforce in both UI (disable buttons, tooltip) and API (reject mutations on rows where `date < now() - interval '90 days'`).

### Consequences
- **Schema:** `transactions` gains `deleted_at TIMESTAMPTZ`; index `WHERE deleted_at IS NULL` for the active set
- **API:** `PATCH /transactions/{id}` and `DELETE /transactions/{id}` return 409 Conflict on frozen rows with `{"error": "transaction_frozen", "message": "Transactions older than 90 days are read-only"}`
- **UI:** transaction row in Transactions view shows a lock icon + disabled actions when `date < now() - interval '90 days'`
- **Revisit when:** materialized-view incremental refresh makes historical edits cheap enough that the freeze is gratuitous

## D16: Category Language Enforcement

### What's Changing
Merchant names and item names: stored **as-scanned** (never translated). Categories (L1/L2/L3/L4): always stored as **English PascalCase keys**. Display localization is purely a frontend concern via `display[locale]` map.

### The Analogy
Library catalog. Book titles on spines stay in whatever language the author wrote them in (as-scanned). The catalog's subject codes ("820.9 Literature") are canonical in one language, and the signs telling you where "Literature" is get translated per visiting country.

### Constraint Box
```
IS:     Hybrid — preserve source-language names (merchants, items); enforce
        single-language keys (categories); localize display.
IS NOT: Auto-translating anything. A Chilean receipt stays Chilean in merchant +
        item fields even for an English-UI user.
RISK:   Gemini occasionally returns Spanish category keys ("Supermercado"
        instead of "Supermarket"). Pydantic `output_type` rejects; worker retries
        with a clarifying prompt; final fallback is `Other`/`OtherItem`.
```

### Decision
- Pydantic models on Gemini output force English category keys via `Literal[...]` types derived from `categories.json`
- Frontend's category display components always look up `display[user.locale]` — DB writes never involve localization
- Locale toggle in UI re-renders category labels instantly without data refetch

### Consequences
- **Gemini prompt:** adds "Use ONLY these English PascalCase values for store_category and item_category: [...]. If uncertain, use 'Other' or 'OtherItem'."
- **Pydantic validator:** on parse failure, worker logs `category_validation_failed` to `scan_events`; retry with clarifying prompt; second failure → fallback to `Other`
- **Watch:** rate of category validation failures in `scan_events`; if > 5%, tune prompt
- **Revisit when:** adding a third locale — confirms the `display[locale]` pattern scales

---

## D17: Domain Scope Limits (Chilean Market)

### What's Changing
Explicit scope boundaries on three Chilean-market domain concerns:
- **No UF currency.** Unidad de Fomento (inflation-indexed unit used for rent, loans, insurance in Chile) is NOT supported. All transactions are denominated in CLP, USD, or EUR.
- **Email-only PII.** The users table stores `email` (and possibly `display_name` in the future). No RUT (Chilean national tax ID), no address, no phone number, no date of birth.
- **IVA tracked via categories, not fields.** Chilean VAT (IVA, 19%) is not stored as a dedicated column or rate. Tax line items on receipts map to the existing `TaxFees` L4 item category. No `iva_amount` / `iva_rate` schema additions.

### The Analogy
Drawing a property boundary at the road instead of at the horizon. The owner doesn't need to maintain a forest they don't use — they maintain the plot they actually live on. Staying within the boundary is cheaper than expanding to cover every theoretical use.

### Constraint Box
```
IS:     Sharp scope limits — only what Gastify's current + near-future usage actually
        needs. Keeps schema minimal, auth surface minimal, legal compliance simple.
IS NOT: A claim that UF / RUT / IVA-tracking will never matter. They may in a future
        business-tier or Chile-tax-integration product. Those would be additive.
RISK:   Users with rent tracked in UF, or small-business owners who want IVA
        breakouts, are an unsupported segment. Documented as a known limit.
```

### Decision
Pin the scope as stated. Reject schema additions or feature requests that cross these lines until a product decision explicitly expands scope.

### Consequences
- **Schema:** `currencies` reference table seeded with CLP / USD / EUR only. `users` table has no tax-id column. `transactions` has no `iva_*` column.
- **Gemini prompt:** don't ask Gemini to extract IVA as a separate field; it naturally appears as a line item categorized as `TaxFees`.
- **Watch:** repeated user requests for UF support or RUT tagging → signal to revisit
- **Revisit when:** launching a business tier, or if Chilean SII tax integration becomes a product goal. Adding UF requires a migration; adding RUT requires a privacy policy update and consent flow.

## D18: Two Parallel Workstreams

### What's Changing
Rather than strict sequential execution (UX finishes → backend starts), the rebuild runs as two parallel workstreams that converge at an integration phase:
- **Workstream A — UX:** executes UX-PLAN phases U0–U7 (journeys → IA → wireframes → components → hi-fi → interactions → a11y → handoff bundle)
- **Workstream B — Backend/Infrastructure:** scaffolds the FastAPI app, DB migrations, auth, scan pipeline, CRUD, analytics, cross-app API, data migration script, observability, rate limiting — all validated via **simulated frontend payloads** (pytest fixtures + OpenAPI contract tests) without waiting for the real frontend
- **Integration:** a later phase consumes the UX handoff bundle + the working backend API to build and connect the real frontend

### The Analogy
Building a house. One crew pours the foundation and plumbs the walls (backend). Another crew draws the interior layout and picks the finishes (UX). They work concurrently on the same site but don't block each other — the pipes don't care what color the walls will be, the wallpaper pattern doesn't care about the pipe routing. The two crews meet at move-in day (integration) where the fixtures actually get installed.

### Constraint Box
```
IS:     Two tracks with a deliberate convergence point. Backend treats frontend
        as a contract (OpenAPI spec) not a dependency.
IS NOT: Free-for-all parallel work. Some dependencies remain sequential: the data
        model (defined in ADR D6/D15/D17) must be stable before backend migrations
        can finalize; the UX handoff must be complete before frontend integration.
RISK:   Backend ships API shapes that the UX handoff later wants changed → wasted
        endpoint work. Mitigation: UX handoff must finalize the payload contracts
        BEFORE the integration phase, and backend contract tests are cheap to
        update when contracts shift.
```

### Workstream B — Simulated Frontend Testing
Backend validates without the real frontend by:
1. **OpenAPI contract as source of truth** — FastAPI auto-generates OpenAPI spec; frontend-payload fixtures are derived from it
2. **pytest fixtures** represent realistic request bodies the frontend would send (scan queue, transaction create, analytics query)
3. **Stored-response snapshots** verify API output shape and key values — when the real frontend arrives, any drift is caught by contract tests, not by manual debugging
4. **Sandbox mode** for Gemini calls — cached real responses replayed during tests so the backend can be exercised end-to-end without paying Gemini or burning credits

### Decision
Structure the ultraplan implementation plan into two workstreams (A: UX, B: Backend) plus an Integration phase, per this decision. `/ultraplan` should emit a phase graph where A and B run in parallel, converging at Integration.

### Consequences
- **Implementation plan shape:** phases structured as `B0 → {A1, A2, ..., B1, B2, ...} → Integration → Cutover` where A-phases and B-phases do not block each other after the initial scaffolding
- **Testing discipline:** backend cannot skip OpenAPI contract tests — they are the handshake with UX
- **Sandbox mode:** cached Gemini responses stored in `tests/fixtures/gemini_responses/` keyed by SHA-256 of the image bytes
- **Watch:** integration phase slippage; if UX handoff is late, backend is blocked on frontend build, not on API readiness
- **Revisit when:** growing beyond solo dev — two parallel workstreams with one human is intensive; a team makes parallelism easier

---

## Cross-Cutting Consequences

**Updates required in `docs/ultraplan-rebuild-prompt.md`:**
1. Auth line in stack table → pin Firebase Auth + JWT verification (D2)
2. Task queue line → replace Celery + Redis with "Postgres SKIP LOCKED + dedicated worker process" (D4)
3. Real-time line → pin SSE, remove WebSocket alternative (D8)
4. Storage line → Railway Volume with R2 fallback note (D2)
5. Database schema — apply all column/type changes (D6, D12, D13)
6. Category taxonomy section — replace flat L2/L4 lists with 4-level JSON structure (D5)
7. New section: "Cross-app Catalog Mapping" (D1)
8. New section: "Cutover Plan" (D3)
9. New section: "Observability" (D9)
10. New section: "Rate Limiting + Circuit Breaker" (D11)
11. New section: "Known Trade-offs" — document view-only offline regression (D7)

**User values honored:**
- **U2 (Plan Light, Build Real):** Chose simpler Postgres-only patterns over Celery/Redis; view-only offline over PowerSync
- **U4 (Enforce Output Structure Mechanically):** Pydantic-backed category enums; AI agents get runtime-validated hierarchy
- **U5 (Stream the Thinking):** SSE for scan status; users see real-time progress during 10-30s scans
- **U8 (Measure the Machine):** scan_events audit table captures cost, latency, token usage per scan from day one

## Revisit When

- Any sub-decision's "Revisit when" condition triggers
- Second user rollout — confirm D11 limits hold in production
- Railway free-tier exhaustion — evaluate Fly.io or Cloudflare R2 migration
- Gustify rewrite kickoff — confirm D1 API contract still fits

## References

- `docs/ultraplan-rebuild-prompt.md` — The rebuild prompt this ADR validates
- `shared/schema/categories.ts` lines 220-247 — Source of L1/L3 groups for D5 migration
- `docs/decisions/TEMPLATE.md` — ADR format template (this ADR is an intentional multi-decision deviation)
- Session transcript 2026-04-20 — Full gap analysis and options discussion behind each decision
