# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Feature parity with legacy BoletApp — implement missing screens and features before P7 launch gate. Write-first ordering: mutating features land first (settings, batch ops, batch scan), read-only features last (dashboard, charts, items, reports, notifications). Groups/shared expenses deferred.

## Context

- **Maturity:** mvp
- **Domain:** Chilean smart expense tracker (AI receipt scanning, multi-currency analytics, PWA + native mobile)
- **Created:** 2026-06-02
- **Last Updated:** 2026-06-02
- **Decision basis:** APP-STATE.html audit (2026-06-02) comparing Gastify vs legacy BoletApp — 9 missing features, 5 API-only gaps. Write-first ordering per user direction.

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Settings + Profile + Themes | Settings screen with sub-views: profile (name, email, currency, locale), preferences (language, date format), theme switcher (3 color themes × light/dark — ported from legacy `categoryColors/`), consent management UI (wire existing /consent API), data export (wire /privacy/portability), account actions (wipe, sign-out from settings). Web + mobile. | mvp | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 2 | Batch Ops + Category Management | Multi-select on transaction list (web + mobile) wiring existing batch-update/batch-delete APIs. Category/merchant management: view/edit/delete learned L2 store-category and L4 item-category mappings. Backend category CRUD endpoints if needed. | mvp | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | Batch Scanning | Multi-receipt capture with image queue + batch review step before save. Reuses single-scan pipeline per receipt. New capture flow UI (web + mobile). | mvp | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 4 | Dashboard + Charts/Trends | Rich home dashboard replacing simple hub (treemap or category breakdown). Trends view with chart library: donut (category distribution), bar/line (time-series), drill-down by L1→L2 and L3→L4. Period navigation (month/quarter/year). | mvp | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | Items View + Reports | Dedicated items/products screen: cross-transaction item search with filters (category, date, merchant). Weekly/monthly report cards with spending summaries and chart visualizations. | mvp | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 6 | Notification Center | In-app notification view: list with read/unread status, mark-read, delete. Backend notification creation hooks (scan complete, statement reconciled, etc.). Web + mobile. | mvp | low | ⬜ | ⬜ | ⬜ | ⬜ |

<!-- Exec is written by /gabe-execute: ⬜ not started, 🔄 in progress, ✅ complete -->
<!-- Review/Commit/Push auto-ticked by /gabe-review, /gabe-commit, /gabe-push -->
<!-- A phase is complete when all four status columns are ✅ -->
<!-- /gabe-next routes to the next command based on column state (Exec → Review → Commit → Push → advance phase) -->
<!-- Tier column values: mvp | ent | scale. Read by /gabe-execute (tier-cap) and /gabe-review (TIER_DRIFT finding). -->
<!-- Manual override is fine — edit cells by hand any time -->

## Phase Details

### Phase 1 — Settings + Profile + Themes

```yaml
phase: 1
types: [user-facing, auth, settings]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, Auth/Session, Client-State, UI/UX]
suppressed_dims_count: 0
```

- **Tier chosen:** mvp — wire existing backend APIs to new UI screens; theme tokens ported from legacy CSS variables, not designed from scratch.
- **Prototype:** no
- **Key files:** `web/src/routes/settings.tsx` (new), `mobile/src/screens/SettingsScreen.tsx` (new), `web/src/styles/themes/` (new — 3 theme CSS files from legacy `categoryColors/`), `mobile/src/lib/theme.ts` (new), consent/privacy hooks wiring existing API endpoints.
- **Legacy reference:** `boletapp/src/features/settings/views/SettingsView/` (9 sub-views), `boletapp/src/config/categoryColors/` (3 themes).
- **Runtime evidence:** Settings screen renders on web (browser) and mobile (S23) with theme switching, profile edit round-trip, and consent grant/revoke.

### Phase 2 — Batch Ops + Category Management

```yaml
phase: 2
types: [user-facing, client-state, data]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, Client-State, Data]
suppressed_dims_count: 0
```

- **Tier chosen:** mvp — multi-select UI + wire existing batch APIs; category CRUD is additive.
- **Prototype:** no
- **Key files:** `web/src/routes/transactions.tsx` (add multi-select), `mobile/src/screens/TransactionsScreen.tsx` (add multi-select), `backend/app/api/categories.py` (new — if category CRUD endpoints needed), `web/src/routes/settings/learned-data.tsx` (new sub-view).
- **Legacy reference:** `boletapp/src/features/history/views/HistoryView.tsx` (selection mode), `boletapp/src/features/settings/components/CategoryMappingsList.tsx`.

### Phase 3 — Batch Scanning

```yaml
phase: 3
types: [user-facing, upload, realtime]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, Upload/File-media, Real-time]
suppressed_dims_count: 0
```

- **Tier chosen:** mvp — reuses single-scan pipeline; new UI flow for multi-image queue + review.
- **Prototype:** no
- **Key files:** `web/src/routes/scan-batch.tsx` (new), `mobile/src/screens/BatchCaptureScreen.tsx` (new), `mobile/src/screens/BatchReviewScreen.tsx` (new).
- **Legacy reference:** `boletapp/src/features/batch-review/views/BatchCaptureView.tsx`, `BatchReviewView.tsx`.
- **Runtime evidence:** Capture 3 receipts in batch mode, review each, submit all. All 3 produce transactions.

### Phase 4 — Dashboard + Charts/Trends

```yaml
phase: 4
types: [user-facing, analytics]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, UI/UX]
suppressed_dims_count: 0
```

- **Tier chosen:** mvp — chart library integration (ECharts or Recharts); backend already serves monthly insights data.
- **Prototype:** no
- **Key files:** `web/src/routes/index.tsx` (dashboard upgrade), `web/src/routes/trends.tsx` (new), `mobile/src/screens/DashboardScreen.tsx` (new or upgrade HomeScreen), `mobile/src/screens/TrendsScreen.tsx` (new), shared chart components.
- **Legacy reference:** `boletapp/src/features/dashboard/views/DashboardView/` (treemap), `boletapp/src/features/analytics/views/TrendsView/` (5 chart types). Start with donut + bar/line; add treemap/sankey if time permits.
- **Runtime evidence:** Dashboard renders category breakdown on web + mobile. Trends view shows at least 2 chart types with period navigation.

### Phase 5 — Items View + Reports

```yaml
phase: 5
types: [user-facing, data-view, analytics]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, UI/UX]
suppressed_dims_count: 0
```

- **Tier chosen:** mvp — new read-only screens; may need a backend items-list endpoint.
- **Prototype:** no
- **Key files:** `web/src/routes/items.tsx` (new), `mobile/src/screens/ItemsScreen.tsx` (new), `backend/app/api/items.py` (new — cross-transaction item query), `web/src/routes/reports.tsx` (new), `mobile/src/screens/ReportsScreen.tsx` (new).
- **Legacy reference:** `boletapp/src/features/items/views/ItemsView/`, `boletapp/src/features/reports/views/ReportsView.tsx`.

### Phase 6 — Notification Center

```yaml
phase: 6
types: [user-facing, notifications]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, Notifications]
suppressed_dims_count: 0
```

- **Tier chosen:** mvp — in-app notification list; backend notification model + creation hooks.
- **Prototype:** no
- **Key files:** `backend/app/models/notification.py` (new), `backend/app/api/notifications.py` (new), `web/src/routes/notifications.tsx` (new), `mobile/src/screens/NotificationsScreen.tsx` (new).
- **Legacy reference:** `boletapp/src/views/NotificationsView.tsx`.

## Current Phase

Phase 1: Settings + Profile + Themes

## Dependencies

- Phase 1 is independent — can start immediately
- Phase 2 depends on Phase 1 (settings nav pattern, learned-data sub-view lives in settings)
- Phase 3 is independent of 1-2
- Phase 4 depends on Phase 1 (theme tokens needed for chart colors)
- Phase 5 depends on Phase 4 (chart library reuse)
- Phase 6 is independent

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Theme porting is more work than expected (legacy CSS variables → new system) | medium | Start with 1 theme + light/dark, add remaining 2 incrementally |
| Chart library bundle size on mobile | medium | Use lightweight charting (Recharts or Victory Native) or server-rendered chart images |
| Batch scan UX complexity (multi-image queue + per-receipt review) | medium | MVP: sequential processing with simple queue; defer parallel processing |
| Items endpoint needs new backend query (cross-transaction item aggregation) | low | Simple JOIN on transaction_items; no new infrastructure |

## Notes

- This plan covers ROADMAP phases P10-P15 (inserted before P7 launch gate).
- Legacy reference: `boletapp/` at `/home/khujta/projects/bmad/boletapp/` — screen components, theme configs, chart implementations.
- Groups/shared expenses remain deferred (both legacy and Gastify had "coming soon").
- APP-STATE.html audit at `docs/APP-STATE.html` documents the full feature matrix.
