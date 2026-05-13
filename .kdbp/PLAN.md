# Active Plan — P3 Web Portal MVP

<!-- status: active -->
<!-- project_type: code -->

## Goal

Deliver a responsive web SPA — auth, receipt scan flow with streaming progress, transaction ledger with manual edits (user_edited_at precedence), sign-out isolation across tabs — proving the first end-to-end user journey on web.

## Context

- **Maturity:** mvp
- **Domain:** Smart personal expense tracker — AI receipt scanning with 86-category V4 taxonomy, multi-currency analytics with USD-shadow
- **ROADMAP phase:** P3 Web Portal MVP (depends on P1 Foundation + P2 Receipt Scan Pipeline)
- **Covers REQs:** REQ-05 (ledger API, web slice), REQ-13 (user-edit precedence), REQ-14 (web sign-out eviction), REQ-23 (responsive web portal)
- **Authored:** 2026-05-13
- **Last Updated:** 2026-05-13

## Phases

| # | Phase | Types | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Web scaffold + OpenAPI client + auth | `auth, spa` | Vite + React 18 + TS strict in web/, TanStack Router, openapi-typescript/openapi-fetch gen from backend spec, Firebase Auth SDK (real), auth context + protected routes, sign-in page (Google OAuth), responsive layout shell | ent | high | ✅ | ✅ | ✅ | ✅ |
| 2 | Scan flow + streaming progress UI | `upload, realtime, streaming` | File upload component (multipart image), scan submission via API, SSE EventSource client for progress events, progress UI (staged: uploading → processing → extracting → categorizing → verified → complete), auto-reconnect with exp backoff, error-code-specific UX (PENDING P6/P8/P9) | ent | high | ✅ | ⬜ | ✅ | ⬜ |
| 3 | Transaction ledger + detail + edit | `client-state, user-facing` | Transaction list page (paginated, filtered by period/category/card), transaction detail view (line items, V4 categories, amounts, USD shadow), inline field editing with user_edited_at precedence (REQ-13), TanStack Query cache + optimistic updates | ent | medium | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | Sign-out isolation + responsive polish | `auth, session, client-state` | Sign-out eviction (Firebase tokens, TanStack Query cache, Zustand stores, localStorage, sessionStorage), multi-tab logout broadcast via storage event, REQ-14 web verification, responsive layout (desktop-first + mobile-web), i18n baseline (es/en/pt) | ent | medium | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | E2E journey + edge case tests | `core-only` | Playwright golden journey (sign in → scan → stream → view → edit → sign out → verify eviction) + 8 edge cases: scan failure UX (P6), unknown merchant (P8), low confidence (P9), edit network fail, multi-tab signout, token refresh, double submit, invalid file. Closes PENDING P6/P8/P9 | ent | medium | ⬜ | ⬜ | ⬜ | ⬜ |

<!-- Exec is written by /gabe-execute: ⬜ not started, 🔄 in progress, ✅ complete -->
<!-- Review/Commit/Push auto-ticked by /gabe-review, /gabe-commit, /gabe-push -->
<!-- A phase is complete when all four status columns are ✅ -->
<!-- /gabe-next routes to the next command based on column state -->
<!-- Tier values: mvp | ent | scale. Read by /gabe-execute (tier-cap) and /gabe-review (TIER_DRIFT finding). -->

## Phase Details

### Phase 1 — Web scaffold + OpenAPI client + auth

```yaml
phase: 1
types: [auth, spa]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Auth/Session, Client State]
suppressed_dims_count: 5
decisions_entry: D33
```

- **Types:** `auth, spa`
- **Tier:** ent
- **Prototype:** no
- **Sections considered:** Core, Auth/Session, Client State
- **Suppressed dimensions:** 5 (Auth/Session: Multi-tab sync; Client State: Optimistic updates, Mutation propagation, Cross-tab sync, Offline support)
- **Key deliverables:**
  - Vite + React 18 + TypeScript strict project in `web/`
  - TanStack Router for file-based routing
  - openapi-typescript client gen from backend `/openapi.json`
  - openapi-fetch typed API client with auth header injection
  - Firebase Auth SDK (real, not mocked) — Google OAuth sign-in
  - Auth context: token management, auto-refresh, protected route guard
  - TanStack Query v5 provider with refetch-on-focus + TTL config
  - Zustand store architecture (scoped slices)
  - Responsive layout shell (desktop-first, sidebar + content)
  - Sign-in page
- **Design reference:** `frontend/` BoletApp port components + design tokens
- **CSRF posture:** `none` — bearer-token-only API, no cookies (D3 precedent)
- **Trade-offs accepted:** See D33

### Phase 2 — Scan flow + streaming progress UI

```yaml
phase: 2
types: [upload, realtime, streaming]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Real-time, File/Media]
suppressed_dims_count: 7
decisions_entry: D34
```

- **Types:** `upload, realtime, streaming`
- **Tier:** ent
- **Prototype:** no
- **Sections considered:** Core, Real-time, File/Media
- **Suppressed dimensions:** 7 (Real-time: Backpressure, Presence, Fallback transport; File/Media: Virus scan, CDN, Image pipeline, Retention)
- **Key deliverables:**
  - File upload component: drag-drop + file picker, multipart POST to `/api/v1/scans`
  - Client-side validation: file type (JPEG/PNG/HEIC/PDF), file size
  - SSE EventSource client: `GET /api/v1/scans/{scan_id}/events` with auth token
  - Auto-reconnect: exponential backoff on disconnect (Enterprise Reconnection red-line)
  - Scan progress UI: staged display (submitted → processing → extracting → categorizing → verified → complete | failed)
  - Error-code-specific UX: distinct messages per error type (PENDING P6)
  - Unknown merchant state: first-scan affordance (PENDING P8)
  - Low confidence display: confidence badge + review prompt (PENDING P9)
- **SSE auth:** Token in query param (EventSource API doesn't support headers) — backend already supports this
- **Trade-offs accepted:** See D34

### Phase 3 — Transaction ledger + detail + edit

```yaml
phase: 3
types: [client-state, user-facing]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Client State, UI/UX]
suppressed_dims_count: 4
decisions_entry: D35
```

- **Types:** `client-state, user-facing`
- **Tier:** ent
- **Prototype:** no
- **Sections considered:** Core, Client State, UI/UX
- **Suppressed dimensions:** 4 (Client State: Cross-tab sync, Offline support, Store coupling; UI/UX: Streaming)
- **Key deliverables:**
  - Transaction list page: paginated via `GET /api/v1/transactions`, filtered by period + category + card alias
  - Transaction detail view: line items with V4 categories (L1→L4), amounts in original currency + USD shadow, merchant, date
  - Inline field editing: click-to-edit merchant name, date, category assignments
  - user_edited_at precedence (REQ-13): PATCH with user_edited_at timestamp, UI marks edited fields
  - TanStack Query: tag/key cache invalidation on mutation, optimistic updates with rollback
  - Loading states: skeleton for list, spinner for detail
  - Error states: inline error with retry for failed edits
  - Semantic HTML: proper table, button, label, heading hierarchy (a11y Enterprise floor)
- **Trade-offs accepted:** See D35

### Phase 4 — Sign-out isolation + responsive polish

```yaml
phase: 4
types: [auth, session, client-state]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Auth/Session, Client State]
suppressed_dims_count: 6
decisions_entry: D36
```

- **Types:** `auth, session, client-state`
- **Tier:** ent
- **Prototype:** no
- **Sections considered:** Core, Auth/Session, Client State
- **Suppressed dimensions:** 6 (Auth/Session: Token refresh, Refresh token; Client State: Optimistic updates, Stale data, Mutation propagation, Store coupling)
- **Key deliverables:**
  - Sign-out flow: Firebase `signOut()` → clear TanStack Query cache (`queryClient.clear()`) → reset Zustand stores → clear localStorage + sessionStorage
  - Multi-tab logout broadcast: `storage` event listener detects sign-out in other tabs → triggers local cleanup + redirect to sign-in
  - REQ-14 web sign-out eviction: verify no authenticated API responses cached, no auth tokens in storage, no user data in query cache post-sign-out
  - Responsive layout polish: desktop-first grid, mobile-web single-column, test at 375px / 768px / 1280px breakpoints
  - i18n baseline: es/en/pt string registry, locale-negotiation from accept-language + user preference
- **SC-08 enforcement:** Sign-out leaves no authenticated data reachable on the device
- **Trade-offs accepted:** See D36

### Phase 5 — E2E journey + edge case tests

```yaml
phase: 5
types: [core-only]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core]
suppressed_dims_count: 0
decisions_entry: D37
```

- **Types:** core-only
- **Tier:** ent
- **Prototype:** no
- **Sections considered:** Core
- **Suppressed dimensions:** 0
- **Key deliverables:**
  - **Golden journey test:** sign in → scan receipt → watch streaming events → see transaction → edit merchant name → assert user_edited_at set → sign out → re-open tab → no cached account data fetchable
  - **Edge case tests (8):**
    1. Scan failure → error-code-specific UX (closes PENDING P6)
    2. Unknown merchant → first-scan affordance (closes PENDING P8)
    3. Low confidence → confidence badge + review prompt (closes PENDING P9)
    4. Edit with network failure → optimistic rollback + retry
    5. Multi-tab sign-out → storage event broadcast → all tabs cleared (SC-08 edge)
    6. Token refresh mid-scan → SSE reconnects with new token
    7. Double-submit scan → only 1 scan created
    8. Invalid file type → client-side rejection message
  - Page Object Model for test architecture (reusable for P4 Mobile)
  - Structured HTML test reports + screenshots on failure
- **Exit signal per ROADMAP:** Web E2E journey green: sign in → scan receipt → watch streaming events → see transaction → edit merchant name → assert user_edited_at set → sign out → re-open tab → no cached account data fetchable
- **Trade-offs accepted:** See D37

## Current Phase

Phase 2: Scan flow + streaming progress UI

## Dependencies

- Phase 1 depends on P1 Foundation + P2 Receipt Scan Pipeline (both complete)
- Phase 2 depends on Phase 1 (app scaffold + auth + API client)
- Phase 3 depends on Phase 1 (API client + auth context)
- Phase 4 depends on Phases 1-3 (full app to evict)
- Phase 5 depends on Phases 1-4 (end-to-end journey)

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| OpenAPI spec completeness — backend spec may miss edge-case response types | medium | Generate client early in Phase 1, audit mismatches against backend schemas |
| Firebase Auth SDK web + CORS with FastAPI | medium | P1 backend already validates Firebase tokens; test cross-origin in Phase 1 |
| SSE EventSource — no auth header support in browser API | medium | Token in query param; backend already supports this pattern |
| BaseHTTPMiddleware streaming limitation (PENDING P18) | medium | Test SSE under current middleware in Phase 2; extract to pure ASGI if needed |
| frontend/ design token drift from web/ implementation | low | Reference frontend/ tokens but don't import — web/ uses its own Tailwind config |

## Notes

- `frontend/` directory (BoletApp port with Firebase mocks + Storybook) serves as design reference for component patterns, design tokens, and visual language. `web/` is the production web app connecting to the real FastAPI backend.
- Per SCOPE §10.2, monorepo topology places the web app at `web/` (not `frontend/`). `frontend/` stays as the design showcase.
- STRUCTURE.md already has `web/src/` patterns defined (pages, components, lib, hooks, stores, public).
- Tier distribution: ent × 5. No MVP phases — Edge case tests (Phase 5) escalated to ent to close PENDING P6/P8/P9 and prove multi-tab SC-08.
- PENDING items addressed: P6 (distinct error UX), P8 (unknown merchant state), P9 (low-confidence scan UX) — all verified in Phase 5 E2E tests.
- P3 is parallel with P4 (Mobile App MVP) per ROADMAP. Phase 5's Page Object Model investment enables test reuse for P4.
