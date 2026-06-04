# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Feature parity with legacy BoletApp — implement missing screens and features before P7 launch gate. Write-first ordering: mutating features land first (settings, batch ops, batch scan), read-only features last (dashboard, charts, items, reports, notifications). Groups/shared expenses deferred.

## Context

- **Maturity:** mvp
- **Domain:** Chilean smart expense tracker (AI receipt scanning, multi-currency analytics, PWA + native mobile)
- **Created:** 2026-06-02
- **Last Updated:** 2026-06-04 (Phase 5 Groups COMPLETE ✅×4 + the full 5e finish shipped — consent-gated member detail (D73, migration 032) + mobile group-detail (P60c) + P61 tests + P60b switcher, reviewed (authz workflow, 0 CRITICAL) + B2-proven both platforms, promoted staging→main P50, prod verified. Current Phase advanced 5→6. Next: /gabe-next on Phase 6 Items View + Reports.)
- **Decision basis:** APP-STATE.html audit (2026-06-02) comparing Gastify vs legacy BoletApp — 9 missing features, 5 API-only gaps. Write-first ordering per user direction.

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Settings + Profile + Themes | Settings screen with sub-views: profile (name, email, currency, locale), preferences (language, date format), theme switcher (3 color themes × light/dark — ported from legacy `categoryColors/`), consent management UI (wire existing /consent API), data export (wire /privacy/portability), account actions (wipe, sign-out from settings). Web + mobile. | mvp | high | ✅ | ✅ | ✅ | ✅ |
| 2 | Batch Ops + Category Management | Multi-select on transaction list (web + mobile) wiring existing batch-update/batch-delete APIs. Category/merchant management: view/edit/delete learned L2 store-category and L4 item-category mappings. Backend category CRUD endpoints if needed. | mvp | med | ✅ | ✅ | ✅ | ✅ |
| 3 | Batch Scanning | Multi-receipt capture with image queue + batch review step before save. Reuses single-scan pipeline per receipt. New capture flow UI (web + mobile). | mvp | high | ✅ | ✅ | ✅ | ✅ |
| 4 | Dashboard + Charts/Trends | **v1 (done+proven both platforms):** rich home dashboard donut (category distribution) + store/item dimension toggle + period nav + "what's shifting" (web Playwright + S23 Maestro on staging-e2e). **v2 (in progress, D69):** server-aggregated `GET /insights/tree` (full L1→L2 / L3→L4 levels, no top-5 truncation) + recursive bidirectional drill-down on web + mobile (the legacy treemap UX), client expands the cached tree in memory. Bar/line time-series via `/insights/series` shipped (runtime proof deferred — staging-e2e deploy coupling). **v2 web DONE + B2-proven on deployed staging-e2e (2026-06-03): full 4-level cross-walk drill Industry→Store-type→Family→Item + breadcrumb roll-up, real data, screenshot-verified.** Mobile drill UI built + S23 Maestro proof GREEN on deployed staging-e2e (2026-06-04, p10-dashboard-drill-active 58s) — fully proven on BOTH platforms (P50 resolved). /gabe-review APPROVE (7 findings, all fixed). Pushed origin/staging + promoted staging→main (2026-06-04). | mvp | high | ✅ | ✅ | ✅ | ✅ |
| 5 | Groups (personal + shared) | **Pulled forward (D69).** Group model + CRUD + `OwnershipScopeMember` membership/roles; the `group_id`→RLS-GUC scope-swap so every analytics endpoint (monthly/series/tree) works per-group with zero new aggregation code; per-group dashboards; shared visibility + partial-visibility correctness + revocation via RLS. Decide D58 shared-flag semantics. Web + mobile. **MVP shipped + B2-proven both platforms (web Playwright + S23 Maestro on deployed staging-e2e, 2026-06-04); reviewed (workflow, 0 blocking) + hardened. 5e (consent-gated member detail + member-filtered txn list per D72) SHIPPED 2026-06-04 (D73 opt-in model, migration 032; web + mobile group-detail; authz-reviewed; B2-proven; P62 resolved). Mobile parity P60(b)+(c) shipped. Promoted staging→main twice (P48 MVP + P50 finish); prod verified.** | ent | high | ✅ | ✅ | ✅ | ✅ |
| 6 | Items View + Reports | Dedicated items/products screen: cross-transaction item search with filters (category, date, merchant). Weekly/monthly report cards with spending summaries and chart visualizations. | mvp | med | ✅ | ✅ | ✅ | ✅ |
| 7 | Notification Center | In-app notification view: list with read/unread status, mark-read, delete. Backend notification creation hooks (scan complete, statement reconciled, etc.). Web + mobile. | mvp | low | ⬜ | ⬜ | ⬜ | ⬜ |

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

### Phase 5 — Groups (personal + shared)

```yaml
phase: 5
types: [user-facing, auth, multi-tenant]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Auth/Session, Multi-tenant, UI/UX]
suppressed_dims_count: 0
```

- **Tier chosen:** ent — shared multi-tenant data with cross-group isolation; the `group_id`→RLS-GUC scope-swap is security-load-bearing (a leak is catastrophic, mirrors D3). Membership validation MUST precede `set_config`; no RLS policy-widening (D3); cross-group isolation ("user A cannot read group B") is a CRITICAL test.
- **Prototype:** no
- **Pulled forward (D69):** the relational model (`OwnershipScope` + `OwnershipScopeMember`) + RLS make per-group analytics nearly free — the `group_id`→GUC swap reuses every aggregation endpoint (monthly/series/tree) with zero new aggregation code.
- **Resolved model (D70, 2026-06-03):** whole-app scope switch (personal↔group); scan personal-only; populate via **Share-to-group** (copy, not auto-copy); **invite-links** (token + 7-day expiry + states; caps 5 groups/user · 50 members · 3 admins); **aggregates by default**, other members' individual detail is **consent-gated** (admin request + accept/decline); D58 personal flags stay personal-scope-only (RLS-invisible in group scope). Membership validated by a `SECURITY DEFINER app_is_scope_member` oracle (owned by migrator, EXECUTE→app only) — the only D3-safe check (no `app.user_id` GUC exists); `404` for non-member AND non-existent (anti-enumeration); group freshness = per-request RLS, no membership-fingerprint.
- **Sub-phases (isolation core first):** **5a** scope-swap core (mig 028: `scope_type='group'` + `name` col + oracle + indexes; validate-then-swap dep; optional `group_id` on insights) + Postgres-gated isolation tests A–D; **5b** group CRUD + roles (owner/admin≤3/member) + invite-links + tests E–I; **5c** share-to-group (copy under validated group GUC); **5d** web global mode-switch + `GroupSwitcher` + `/groups` + `/invite/:token` + scope threaded app-wide + scan disabled in group mode + **Playwright proof**; **5e** consent-gated detail (sequence last, may defer). Mobile DEFERRED → PENDING.
- **Key files:** `backend/app/api/groups.py` (new — group CRUD + membership + invite), `backend/app/schemas/groups.py` (new), `backend/app/auth/deps.py` (membership-validate-then-scope-swap), `backend/app/api/insights.py` (optional `group_id` on monthly/series/tree), `backend/alembic/versions/028_*.py` (scope_type+name+oracle), `backend/tests/test_group_isolation.py` (Postgres-gated A–D) + `backend/tests/test_groups.py` (SQLite E–I), `web/src/stores/uiStore.ts` (activeScope), `web/src/components/GroupSwitcher.tsx` (new), `web/src/routes/groups.tsx` + `web/src/routes/invite.$token.tsx` (new), `web/src/hooks/useGroups.ts` (new); `mobile/src/screens/GroupsScreen.tsx` (DEFERRED).
- **Legacy reference:** `boletapp/docs/mockups/screens/gastify-group-{switcher,create,invite,admin,home}.html` + `flows/flow-05-group-sharing.html`; `.kdbp/ENTITIES.md` (Group entity).
- **Runtime evidence:** group CRUD + per-group dashboard on **web (browser, Playwright)** = primary proof this phase; the CRITICAL cross-group isolation (user A cannot read group B) proven by the **Postgres-gated RLS pytest suite** (non-bypassing role) + web staging-e2e. **S23 device proof DEFERRED** until device reconnect (tracked in PENDING).

### Phase 6 — Items View + Reports

```yaml
phase: 6
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
- **Decomposed 2026-06-04** (design workflow vs legacy reference + current conventions). **Only NEW backend surface = `GET /api/v1/items`**; Reports reuses `/insights/series` + `/insights/monthly` + Phase 4 charts (zero new backend/charts). Foundation-first, each task independently testable; user-facing screens gated on deployed staging-e2e runtime proofs.
  - **API contract** — `GET /api/v1/items` (new `api/items.py` + `schemas/items.py` `ItemListRow`): flat per-line-item list, `PaginatedResponse[ItemListRow]`, opaque `"<txn_date>|<txn_id>"` cursor (copied from `list_transactions`), filters `search/item_category_id/store_category_id/merchant/date_from/date_to/group_id`, scope via `resolve_analytics_scope` (group RLS + 404 anti-enum for free), outerjoin Item/Store category keys denormalized.
  - **T1** — Backend `GET /api/v1/items` + `ItemListRow` schema + register in main.py + `tests/test_items.py` (filters, cursor round-trip, group member sees shared items, non-member 404). _proof: pytest._
  - **T2** — Regen OpenAPI types (web + mobile) so `ItemListRow` is typed. _proof: tsc both._
  - **T3** — Web `useItems` (useInfiniteQuery, scope-aware) + `routes/items.tsx` (filters + chips + infinite list, rows deep-link to `/transactions/$id`) + `items.*` i18n + vitest.
  - **T4** — Web Items Playwright proof on staging-e2e.
  - **T5** — Mobile `lib/items.ts` + `ItemsScreen` (FlatList + onEndReached) + nav reg + jest.
  - **T6** — Mobile Items S23 Maestro proof on staging-e2e.
  - **T7** — Web `routes/reports.tsx` (reuse `useMonthlyInsights`/`useInsightsSeries` + `CategoryDonut` + `PeriodStepper`; weekly/monthly cards + client-side trend%) + `reports.*` i18n + vitest.
  - **T8** — Web Reports Playwright proof on staging-e2e.
  - **T9** — Mobile `ReportsScreen` (reuse `lib/insights.ts` + gifted-charts donut + period stepper) + nav reg + jest.
  - **T10** — Mobile Reports S23 Maestro proof on staging-e2e.
  - **Key decisions / DEFERs:** flat per-line-item list (legacy `AggregatedItem` name-grouping + dup-detection DEFERRED); cursor/infinite-scroll (legacy offset/page-number dropped); **weekly cards derived from the monthly series point** — true ISO-week granularity not in `/insights/series` (DEFERRED, revisit if needed); CSV export + quarterly/yearly accordions DEFERRED. Scope threading (`activeGroupId` in query key + `group_id` param) is a correctness gate, covered by a scope-aware hook test.

### Phase 7 — Notification Center

```yaml
phase: 7
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

Phase 6: Items View + Reports

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
- Groups/shared expenses **pulled forward** to Phase 5 (D69, 2026-06-03): the relational data model + RLS scope-swap make per-group analytics nearly free (the `group_id`→GUC swap reuses all aggregation endpoints), so groups is scheduled rather than deferred. Items+Reports → Phase 6, Notification Center → Phase 7.
- Analytics architecture settled in D69: **server-aggregated drill-down tree** (`/insights/tree`), client expands in memory; the "pull all transactions into a client buffer" alternative was rejected (breaks shared-group RLS/privacy + re-creates the legacy client-authority failure mode).
- APP-STATE.html audit at `docs/APP-STATE.html` documents the full feature matrix.
