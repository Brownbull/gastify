# Web Portal — "Shopfront window — desktop or phone browser, same storefront."

> **Well G6** of 7. See [Gravity Wells Index](README.md) for the full map.

> React 19 + Vite 8 + Zustand + TanStack Router/Query + openapi-fetch. Responsive SPA.

**Paths:** `web/**`

---

## Purpose

Think of the Web Portal as the storefront window: whether a customer opens it on a desktop browser or phones their analytics via a mobile web view, they see the same dashboard, ledger, and sharing surfaces. The Web Portal is the primary React SPA connecting to the G1 API Core backend (FastAPI + Postgres RLS). It handles user authentication (Firebase Google OAuth), receipt scanning with real-time progress streaming, transaction ledger management with inline editing, analytics dashboards and trends, statement reconciliation, and expense sharing via group scopes. A core architectural invariant is **scope-awareness**: users switch between personal and group contexts via a Zustand store, and every API request validates the scope, re-points data access via Postgres RLS, and the frontend re-invalidates its cache accordingly.

## Key Components

### Entry Point & Routing
- **main.tsx**: React 19 + TanStack RouterProvider (file-based), QueryClientProvider (TanStack Query), AuthProvider (Firebase context).
- **routeTree.gen.ts**: Auto-generated route tree from file-based routing convention.
- **routes/__root.tsx**: Root layout. Wraps public routes (sign-in) directly; wraps protected routes in ProtectedRoute → AppLayout.

### Pages (routes/)
- **index.tsx** (Dashboard, P6 D59): Monthly insights, top categories, gravity centers, excluded-item count, period stepper, link to trends.
- **scan.tsx** (Receipt upload, P3 D34): File upload (drag-drop + picker), SSE streaming with auto-reconnect, scan result preview.
- **scan-batch.tsx** (Batch scanning, P7 D62): N sequential scans, GET-poll per scan, post-persist review panel with per-item edit/discard.
- **transactions.tsx + transactions.index.tsx** (Ledger, P3 D35): Paginated list, inline filters (category, date, merchant), category breakdown cards.
- **transactions.$transactionId.tsx** (Ledger detail, P3 D35): Line items, images, receipt metadata, inline amount/category edits (optimistic + rollback), processing metadata in `<details>`.
- **statements.tsx** (Reconciliation, P5 D51): Card alias CRUD, PDF upload, password handling, extraction progress (WebSocket), reconciliation buckets (matched/unmatched/pending), per-item match confirm/reject/manual.
- **items.tsx** (Item list, P8): Filterable, paginated items (store, category, date range), link to source transaction.
- **trends.tsx** (Time-series analytics, P9): Spending curve over months/quarters/years, dimension toggle (transaction vs item category), period stepper.
- **reports.tsx** (Period cards, P9 D77): Week/month/quarter/year cards with spending + count, trend arrow + delta %, sorted newest first.
- **groups.tsx** (Group management, P10 D70): List groups, create group, expand group detail (members, roles, invite), consent toggles, avatar editor.
- **invite.$token.tsx** (Group invite, P10 D70): Preview group, accept/decline invite.
- **settings.tsx** (User prefs): Theme selection (3 colors × light/dark), locale (es/en).
- **sign-in.tsx** (Auth, P3 D33): Firebase Google OAuth button.

### Hooks (state management + API calls)
- **useAuth.tsx** (D33, D36): Firebase onAuthStateChanged, signInWithGoogle, signOut, multi-tab logout broadcast via `storage` event, token refresh every 1hr.
- **useScanUpload.ts** (D34): POST /scans multipart, returns scan ID.
- **useScanStream.ts** (D34): SSE /scans/{id}/events, auto-reconnect exp backoff on disconnect, updates scanStore.
- **useBatchScan.ts** (D62): Orchestrates N sequential scans, GET-poll per scan to terminal (no concurrent SSE/WS).
- **useTransactions.ts** (D35): GET /transactions (paginated), PATCH /transactions/{id} (optimistic + rollback), cache key factory for selective invalidation.
- **useInsights.ts** (D56–D57): GET /insights/monthly, GET /insights/tree (drill-down), GET /insights/series (time-series), server-aggregated.
- **useItems.ts** (P8): GET /items (infinite scroll, filters).
- **useStatements.ts** (D51): Card alias CRUD, PDF upload, extraction processing, reconciliation fetch + mutations.
- **useStatementStream.ts** (D51): WebSocket /statements/{id}/events for extraction progress.
- **useGroups.ts** (D70–D75): Group CRUD, membership, invite, consent toggles, member role updates.
- **useCategories.ts**: Reference data (store + item category enums).
- **useI18n.ts**: Locale detection, translation lookup (es/en).
- **useDonutDrill.ts**: Drill-down tree state for dashboard category expansion.

### State Stores (Zustand)
- **uiStore.ts** (D70, D7): sidebarOpen, locale, colorTheme (normal/professional/mono), themeMode (light/dark), **activeScope** (personal or {kind:"group", id, name}). Persists theme + scope to localStorage. Scope change invalidates all TanStack Query tags.
- **scanStore.ts**: Current scan session (phase, progress events, results). Reset on route change.
- **batchScanStore.ts**: Batch queue (in-progress scans, summary). Persist to sessionStorage (survives page refresh during batch).
- **statementStore.ts**: Statement upload state (phase, progress %, selected statement, reconciliation data, error).

### API Client & Types
- **api.ts**: openapi-fetch client with Bearer token injection middleware (setAuthToken called by useAuth).
- **api-types.d.ts**: Auto-generated TypeScript from OpenAPI spec via `generate:api` npm script. Includes statement reconciliation, group schemas, insights tree.
- **queryClient.ts**: TanStack Query config (default stale time 60s, retry 3x on 5xx).
- **firebase.ts**: Firebase SDK init (project ID, API key, auth domain).
- **sessionIsolation.ts**: clearClientSession (cache clear, localStorage reset, activeScope → personal), broadcastSignOut / isSignOutBroadcast (multi-tab logout, D36).
- **i18n.ts**: es/en translation tables (keys like "dashboard.title", "group.role.owner"), locale detection.
- **format.ts**: formatDate (locale-aware), formatMinorAmount (currency display).
- **chartData.ts**: Transform tree nodes → pie slices, rollup top categories → donut data, series points → time-series.
- **batchScan.ts**: Batch queue logic (GET-poll tracking, summary aggregation).

### Components (UI)
- **AppLayout.tsx**: Main wrapper. Nav bar (logo, scope switcher, settings), sidebar (responsive), content grid.
- **ProtectedRoute.tsx**: Auth guard. Redirect unauthenticated to /sign-in.
- **FileUpload.tsx**: Drag-drop + file picker, file validation (JPEG/PNG).
- **ScanProgress.tsx**: SSE status indicator (Extracting → Processing → Complete). Spinner + step list.
- **ScanResult.tsx**: Extracted receipt preview (merchant, items, totals, confidence badge).
- **ScanError.tsx**: Error message + retry affordance (network failure, invalid file, extraction failure).
- **BatchScanQueue.tsx**: Queue monitor (in-progress count, success/needs-review/failed summary).
- **BatchScanReview.tsx**: Post-batch review table. Per-item: toggle needs-review, open detail editor, discard. Delete-all button.
- **StatementReconciliationPanel.tsx**: Bucket tabs (matched/unmatched/pending), reconciliation actions per item.
- **GroupSwitcher.tsx**: Dropdown selector (Personal + my groups). onChange updates uiStore.activeScope.
- **GroupAvatar.tsx** (D75): Emoji picker + accent color palette. Rendered as `<div>` with emoji content + background color.
- **PersonalOnlyNotice.tsx** (D70): Banner "🏠 Viewing group: {name}" when activeScope.kind === "group".
- **ShareToGroupButton.tsx** (D70): Share transaction to group (select group from member list, confirm copy + lock).
- **insights/widgets/**: DimensionToggle, DrillBreadcrumb, GravityCenters, ExcludedItems, InsightsSkeleton, PeriodStepper, ChartFallback.
- **charts/CategoryDonut.tsx**: Recharts Pie (lazy-loaded).
- **charts/SpendTimeSeries.tsx**: Recharts LineChart (spend over time, lazy-loaded).

### Testing
- **routes/-scan.test.tsx**, **-index.test.tsx**, **-items.test.tsx**, **-statements.test.tsx**, **-reports.test.tsx**: Vitest + React Testing Library route-level integration tests.
- **hooks/useAuth.test.tsx**, **useScanStream.test.tsx**, **useScanUpload.test.tsx**, **useTransactions.test.tsx**, **useInsights.test.tsx**, **useInsights.scope.test.tsx**: Hook unit tests (Firebase mocks, API mocks).
- **lib/i18n.test.ts**, **sessionIsolation.test.ts**, **chartData.test.ts**, **batchScan.test.ts**: Utility tests.
- **stores/batchScanStore.test.ts**: Zustand store snapshot tests.
- **test/webJourney.test.tsx**: Playwright full-journey E2E (D37): sign-in → scan → view transaction → edit → batch scan → multi-tab sign-out.

## Key Decisions

### Architecture: Scope-Swap via Zustand + RLS (D70, D69)
The Web Portal implements a whole-app scope-switch pattern: uiStore.activeScope holds the current context (personal or {kind:"group", id, name}). Every API request includes this scope; the backend validates group membership and swaps the Postgres RLS GUC to gate row access. TanStack Query tags allow selective cache invalidation when scope changes. This design keeps the frontend stateless with respect to RLS — the backend enforces isolation, the frontend just reads the scope from Zustand.

### Auth: Firebase + Multi-Tab Isolation (D33, D36)
Firebase Auth SDK handles token management natively (auto-refresh every 1hr). Sign-out broadcasts via `storage` event to all tabs; each tab calls clearClientSession (cache clear, activeScope → personal). The app is bearer-token-only (no cookies), so CSRF is not a concern (D3 precedent).

### Real-Time Streaming: SSE + Auto-Reconnect (D34)
Scan progress is streamed via SSE /scans/{id}/events. On disconnect, the client auto-reconnects with exponential backoff (no manual reload required). This is a red-line requirement for the exit signal UX — a dead stream on disconnect fails the core loop.

### Optimistic Edits + Rollback (D35)
Transaction edits apply mutations to the TanStack Query cache immediately (onMutate), roll back on error (onError), and invalidate both detail and list queries on success (onSettled). Edit state is local React state, not persisted to Zustand. This keeps the UI responsive while maintaining data safety.

### Analytics: Server-Aggregated, Scope-Aware (D56–D57, D69)
Monthly insights (top categories, gravity centers) and time-series data are computed on the server (deterministic, ownership-scoped, cache-safe under user edits). The frontend receives aggregates + tree structure; no global buffer is built client-side. Server /insights/tree is uncached for MVP (one range query + sub-ms aggregation); client TanStack Query caches the result for 60s.

### Batch Scanning: Sequential + Post-Persist Review (D62)
Batch scanning is N sequential scans, each with GET-poll to terminal (no concurrent SSE/WS streams; that would be Ent-overkill per D34). The backend auto-persists each scan into a transaction immediately; "review before save" is impossible. Review is post-persist: summary of saved/needs-review/failed with per-item open/edit or discard actions via the batch-delete API (P2 D29 precedent).

### Groups & Sharing: Snapshot + Lock + Consent (D70–D74)
Share-to-group creates a copy (snapshot) of the source transaction. The source becomes content-locked (amount + items immutable), but delete is still allowed (orphans the group copy). Shared transactions outlive the sharer's membership (kept in group statistics, hidden from group list when sharer departs, D72). Consent-gated detail (D73) is an app-layer list filter (row shown iff viewer is sharer OR (member_visibility_enabled AND sharer.shares_detail)), not an RLS change.

### Design System: Runtime Multi-Theme (D7)
The Portal implements runtime multi-theme selection (normal/professional/mono × light/dark = 6 variants alive in-app). Theme state is stored in localStorage and applied via CSS variables + DOM attributes (data-theme + dark class). This design supports future platform/cohort customization (REQ-27) without refactoring.

### E2E Coverage: Close PENDING Edge Cases (D37)
Playwright E2E tests (webJourney.test.tsx) cover scan failure UX, unknown merchant affordance, low confidence badge, network failure + reconnect, multi-tab eviction, token refresh mid-scan, double-submit idempotency, invalid file rejection. These tests close PENDING items from P6/P8/P9 before mobile phases begin (Page Object Model pays forward into P4).

## Invariants

1. **Scope-Aware State & RLS Swap (D70)**: Every API request reads activeScope from uiStore and sends it in the context. Backend validates membership + sets RLS GUC. No cached data survives a scope change — TanStack Query tags target selective invalidation per scope.

2. **No Cross-Scope Leakage (D3, D70, D73)**: RLS row-isolation is the enforcement mechanism. Consent-gated detail (D73) is a list-view app-layer filter, never a policy change. Item flags do not persist into shared/cohort contexts; flag exclusion applies only to personal view + item list, not aggregates.

3. **Multi-Tab Logout Broadcast (D36)**: `storage` event broadcasts sign-out to all tabs. Each tab receives it, signs out via Firebase, calls clearClientSession (cache clear, localStorage reset, activeScope → personal). Departure from one tab does not leave stale session in another.

4. **Transaction Lock-on-Share (D74)**: Shared source becomes content-locked (amount, items immutable). Delete allowed (orphans group copy). Re-share of same source is deduped by `uq_transactions_scope_shared_from`.

5. **Optimistic Updates with Rollback (D35)**: Mutations apply to cache immediately (onMutate), roll back on error (onError), invalidate both queries on success (onSettled). Edit state is local, not Zustand.

6. **SSE Reconnect Red-Line (D34)**: Scan progress auto-reconnects on disconnect. Manual reload on dead stream fails exit signal.

7. **Analytics Server-Aggregated (D69, D57)**: Top categories + gravity centers computed server-side. Client receives aggregates + tree; no global buffer. Uncached for MVP; client caches 60s.

8. **Item Flag + Aggregate Exclusion (D58)**: Flags are personal privacy markers. Exclusion applies only in personal scope + list views, never to group aggregates.

9. **Group Freshness (D70)**: Per-request RLS, no membership-fingerprint bust. Membership change touches no row inside a scope; access gated at auth boundary.

10. **Bearer Token Only (D3, D33)**: API-only with Authorization: Bearer header. No cookies, no CSRF.

11. **Theme Persistence + Runtime Multi-Theme (D7)**: colorTheme + themeMode stored in localStorage, applied to DOM. All 6 variants live in app.

## Shipped State (Phase 6)

- ✅ Auth: Firebase Google OAuth, multi-tab logout broadcast (SC-08).
- ✅ Receipt scanning: SSE with auto-reconnect, batch scanning (GET-poll), post-persist review.
- ✅ Ledger: Paginated list, detail with inline edits, processing metadata.
- ✅ Dashboard: Monthly insights, top 5 categories, gravity centers, excluded items, period stepper.
- ✅ Trends: Time-series chart (months/quarters/years), dimension toggle.
- ✅ Reports: Period cards (week/month/quarter/year) with trends + delta %.
- ✅ Statement reconciliation: Card alias CRUD, PDF upload, reconciliation buckets, per-item actions.
- ✅ Items: Filterable paginated list, link to source.
- ✅ Groups: Create, list, detail (members, roles, invites), scope switcher, consent toggles, avatar (emoji+color).
- ✅ Scope-aware dashboards: Personal and group views respond to activeScope changes.
- ✅ Settings: Theme + locale preferences.
- ✅ E2E tests: Full journey (sign-in → scan → ledger → batch → group share → multi-tab eviction).
- ✅ API type safety: openapi-typescript auto-generation, all hooks typed.

**Deferred**: iOS runtime proof (D47), Scale ARIA/keyboard, offline editing, app-store packaging, household multi-device management.
