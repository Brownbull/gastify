# API Core — "Building's front lobby — routes in, plumbing for everyone, lights always on."

> **Well G1** of 7. See [Gravity Wells Index](README.md) for the full map.

> FastAPI entry + config + DB session + routes + observability. The stage.

**Paths:** `backend/app/main.py`, `backend/app/config.py`, `backend/app/db.py`, `backend/app/middleware.py`, `backend/app/observability.py`, `backend/app/logging.py`, `backend/app/i18n.py`, `backend/app/env_files.py`, `backend/app/api/**`

---

## Purpose

HTTP surface and request lifecycle wiring for the gastify backend. Every inbound request enters through FastAPI routers registered here, authenticated via [G3 Identity + Ownership](3-identity-ownership.md) dependencies, and served data owned by [G2 Data Model](2-data-model.md). G1 owns the wiring (CORS, middleware, config, DB session factory, observability, RLS scope GUC plumbing) but delegates domain logic to the wells that own it.

## Key Components

### Infrastructure (app root)

| File | Role |
|------|------|
| `backend/app/main.py` | FastAPI app factory — registers all routers, CORS middleware, lifespan events. Startup: RLS least-privilege guard (P43). |
| `backend/app/config.py` | `Settings` (Pydantic BaseSettings) — all `GASTIFY_*` env vars: DB URL, Firebase, Gemini, scan provider, debug flags. D76 environment policy enforced at validation time. |
| `backend/app/db.py` | Async SQLAlchemy engine + `async_session` factory + `get_db()` dependency. RLS scope GUC event listener on `after_begin` (D3, P43). Least-privilege role validation. |
| `backend/app/middleware.py` | `RequestIdMiddleware` (X-Request-Id propagation) + `AccessLogMiddleware` (structured access logs + metrics increment). |
| `backend/app/observability.py` | In-memory Prometheus-compatible metrics registry: counters, gauges, histograms with Reservoir sampling. JSON + text exposition formats (D5). |
| `backend/app/logging.py` | Structlog setup — JSON to stdout in production, console renderer in dev (REQ-21). |
| `backend/app/i18n.py` | Server-side string registry for `es`/`en`/`pt` translations on API responses. |
| `backend/app/env_files.py` | Local dotenv loader — loads `.env` + `.env.local`, skips production files. |

### Auth (app/auth/)

| File | Role |
|------|------|
| `backend/app/auth/firebase.py` | Firebase ID-token verification (Bearer header extraction). Token decoded via firebase-admin SDK. Emits `FirebaseUser` (uid, email, name). |
| `backend/app/auth/deps.py` | `AuthContext` resolution: validates user exists, creates personal scope on first login (D3). Executes RLS scope-swap via `app_is_scope_member` SECURITY DEFINER oracle for group access (D70). Sets `app.ownership_scope_id` GUC per request. |

### API Routers (`backend/app/api/`, 11 total)

| File | Endpoints | Role |
|------|-----------|------|
| `scans.py` | `POST /scans` | Receipt image upload, triggers [G4 Scan Pipeline](4-scan-pipeline.md) `scan_worker.process_scan()` as a background task. |
| `scan_stream.py` | `GET /scans/{id}/events` (SSE) + `WS /ws/scans/{id}` | Real-time scan progress with Firebase JWT auth (D31 SSE, D39 WebSocket). |
| `scan_test_cases.py` | GET/POST test cases | Non-production endpoints for curated scan test cases. Guarded by environment check. |
| `statements.py` | Statement CRUD + `POST /statements/{id}/reconcile` | PDF upload/list/detail/lines/process plus reconciliation. Upload consent (D69) gates Gemini fallback. |
| `statement_stream.py` | `GET /statements/{id}/events` | Statement extraction/reconciliation SSE progress with Firebase JWT auth. |
| `card_aliases.py` | Card alias CRUD | Alias-only endpoint, rejects PCI-shaped fields, scopes by ownership scope. |
| `transactions.py` | Full CRUD + batch + flags | List (paginated), get, create, update, delete, batch update/delete. User-private item flags (D58). FX conversion on write (D2 lazy cache). Content-lock enforcement (D74). |
| `items.py` | Item detail + category endpoints | Item detail, category taxonomy, store taxonomy (read-only). |
| `insights.py` | `GET /insights/monthly` + tree drill | Server-side rollups, gravity-center rows, item-flag exclusion, scope-aware (D58/D69/D70). |
| `reference.py` | Read-only taxonomies | Stores and item category taxonomies. |
| `consent.py` | Consent grant/revoke + audit list | Consent processing for [G3 Identity](3-identity-ownership.md) (D4: Law 21.719, GDPR, PIPEDA, CCPA). |
| `privacy.py` | DSR endpoints | Data access, rectification, erasure, portability (all 4 jurisdictions). |
| `push_tokens.py` | Push token registration | Mobile push-token lifecycle (Expo, FCM, APNS). |
| `groups.py` | Group CRUD + invites | Group creation/update/delete, invite links (D70 scope-switch, D73 consent-gated detail). |
| `health.py` | Health + readiness | Liveness + readiness (Alembic migration status validation). |
| `metrics.py` | Metrics export | JSON (default) or Prometheus text format. Header-authenticated. |

## Key Decisions

### D1 (2026-04-23) — Phase 1 tier = ent

Structured logger + metrics exporter baked at scaffold time so REQ-21 + U8 instrumentation is ambient for all later phases, not bolted on. Typed error handling foundational; migrate-first gated prevents runtime errors during deploy.

### D3 (2026-04-23) — Auth tier = ent with RLS + rotating refresh

RLS row-isolation load-bearing for SC-07 (privacy by default) + SC-08 (sign-out isolation); ownership leak post-launch catastrophic. Bearer-token-only API design eliminates CSRF surface. Postgres RLS keyed off `ownership_scope_id` with deny-by-default policy is defense-in-depth mandatory; app-level `WHERE` clauses are opt-in — one missed query = ownership leak.

### D67 (2026-06-01, P43) — Split least-privilege DB roles + boot guard

Runtime app role (`gastify_app`: NON-superuser, NOBYPASSRLS, non-owner, table CRUD only) so RLS is actually enforced. Migration role (`gastify_migrator`: can run DDL/ALTER POLICY). Boot guard refuses to start if runtime role can bypass RLS. Mirrors Gustify D32; replaces earlier single-role approach where RLS was silently inert.

### D31 (2026-05-07) — Scan streaming = ent; reconnection red-line + dual transport SSE+WS

Real-time.Reconnection user-facing stream dead-UI on disconnect is unacceptable. SSE for web (simpler, auto-reconnect via EventSource), WebSocket for mobile (React Native lacks native EventSource; bidirectional control for cancel).

### D34 (2026-05-13) — Web P3 scan flow + streaming = ent

Reconnection red-line enforced.

### D69 (2026-06-03) — Analytics architecture: server-aggregated drill-down tree via scope-swap, NOT global client buffer

Groups accessed via RLS scope-swap validation (`resolve_analytics_scope` validate-then-swap gate). User chose full 4-level cross-walk drill UX over MVP one-level-deep cut. Tree uncached server-side for MVP (one range query + sub-ms aggregation; client TanStack Query caches 60s).

### D70 (2026-06-03) — Phase 5 Groups: whole-app scope-switch, share-to-group, aggregates-by-default + consent-gated detail

Full legacy-style group model shipped. Per-request RLS via scope-swap, no membership-fingerprint bust needed (revoked member fails validation before cache). Shared group aggregates sum everyone's rows; individual line-item detail filtered at app-layer per D73.

### D71 (2026-06-03) — Cross-scope membership reads via SECURITY DEFINER oracle

`app_is_scope_member` function allows enumeration of groups the caller belongs to (solves chicken-and-egg: can't enumerate unknown scopes under single-GUC RLS). Runtime role stays fully RLS-isolated.

### D73 (2026-06-04) — Consent-gated member detail: opt-in per member, app-level list filter

Group transactions-list shows a shared row iff `shared_by_user_id == viewer` OR (`member_visibility_enabled` AND sharer is current member AND `sharer.shares_detail`). Presentation filter, not isolation — keeps D3 intact.

### D74 (2026-06-04) — Sharing locks the source transaction's content (snapshot integrity)

Once shared into any group, the SOURCE becomes content-locked (merchant, amount, date frozen). Delete still allowed (orphans the group copy). Card alias and recurrence fields stay editable (personal scope).

### D76 (2026-06-04) — Gemini runs as deterministic MOCK in staging-e2e; REAL in staging + production

Environment-policy-enforced at config validation time. E2E tests + screenshots reproduce exactly, cost $0. Staging and production run real Gemini (mock/fixture refused).

### D77 (2026-06-04) — Reports gains period granularity toggle: month/quarter/year now, week later

User direction; deferred week support.

## Invariants

- **RLS is always enforced:** Every Postgres-backed request has `app.ownership_scope_id` set on the session GUC before any query runs (D3, D67, P43). RLS policies deny by default; `gastify_app` role cannot bypass via superuser or BYPASSRLS (boot guard validates on startup).

- **Scope-swap is validate-then-swap:** Group access calls `resolve_analytics_scope` which validates membership via `app_is_scope_member` BEFORE calling `_set_postgres_ownership_scope`. A non-member never causes the GUC to point at the group. Non-member and non-existent group both return 404 (anti-enumeration).

- **Bearer-token-only, no CSRF:** API accepts `Authorization: Bearer <Firebase-ID-token>` headers only. No cookies, no ambient credentials, no CSRF surface.

- **RLS scope survives mid-request commits:** The `after_begin` event re-applies `app.ownership_scope_id` GUC at the start of every transaction, so the transaction-local `set_config(is_local=true)` survives across mid-request commit and subsequent flush/query (D3, P43).

- **Content-lock is per-source, not per-copy:** D74 prevents editing merchant/amount/date on a source transaction once it's shared; personal operations (delete, pair card, mark recurrent) remain allowed.

- **Analytics aggregates never leak personal flags:** D58 + D70: personal item-flags live in the caller's PERSONAL scope (RLS-invisible under the group GUC). Group monthly/tree/series aggregates sum every group row, never filtered by flags.

- **Statement extraction consent gates the Gemini fallback:** D69: upload carries explicit AI-processing consent (audit signal on statement row). Worker uses it to authorize transparent Gemini fallback when deterministic PDF parser fails.

- **Metrics are not cached, logged events are:** Access logs are structured JSON to stdout (REQ-21). Metrics are in-memory Reservoir-sampled and exported on demand (JSON or Prometheus text). Histograms use max 1024 samples to avoid unbounded memory.

- **Environment policy enforces LLM provider parity:** D76: `staging-e2e` always deterministic (fixture/mock forced); `staging` and `production` run REAL Gemini (mock/fixture refused). Local dev must be `scan_provider=mock`. Enforced at startup.

## Topics (auto-appended)

<!-- /gabe-teach topics appends verified topic summaries here on first run. -->
<!-- Do not edit the structure below this line; edit individual entries freely. -->
