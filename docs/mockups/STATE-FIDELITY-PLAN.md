# Design Fidelity — State/Visual Reconciliation Plan

> The plan for migrating the live web app's SCREENS to the design-lab "Playful Geometric" Storybook reference WITHOUT losing the app's hard-won state/URL/SSE functionality. Produced 2026-06-26 by a 6-area functional audit + reconciliation (workflow `state-fidelity-reconcile`). Supersedes the per-screen restyle of W1–Wf, which delivered the token/grammar layer only.

## Governing principle

The functional layer of the live web app is the source of truth for BEHAVIOR; the Storybook/design-lab is the source of truth for VISUAL GRAMMAR only. The design-lab is a presentational demo rendered in fixed device-frames — it does not and cannot encode the app's real state needs (SSE stream lifetimes, scanId/statementId tokens, deep-link params, URL filters, RLS scope, optimistic PATCH/PUT edits). So the migration applies the Storybook's visual framing (overlay-full-surface / inline-tab / hybrid) ON TOP of the existing, already-correct state machinery, and the route-vs-state-overlay decision is made PER FEATURE by that feature's actual needs — never as a blanket. Where a URL, an SSE token, a multi-step backend flow, or a deep-link/share path exists today (scan family, transaction detail, settings subviews, invite, items/notifications pagination, transactions filters), the state approach stays route-driven and the visual change is purely cosmetic. Where state is genuinely a non-resumable lightbox today (report detail, group detail panel, profile menu), it stays state-driven. Nothing functional is removed to satisfy a visual; the visual is re-skinned to the functional contract. The one true new capability being added is the AppScaffold overlay SLOT (desktop = absolute inset-0 over the content pane with SideNav retained; mobile = fixed inset-0 over the whole frame) on web's existing lg: breakpoint, adopting the grammar without reproducing the fixed device-frame.

## User decisions (2026-06-26)

- **Filter promotions:** INCLUDE in this epic — promote transactions-list extra filters, items filter+cursor, and notifications cursor to validated URL search params.
- **Draft guard:** ADD an unsaved-changes guard for `/transactions/new` and `/statements` upload (overlay framing makes accidental dismissal easier).
- **Notifications:** open as a FULL-SURFACE OVERLAY from the avatar (route `/notifications` kept, presented as overlay).

## Overlay mechanism verdict

ROUTE-DRIVEN overlays are the DEFAULT and the recommended mechanism, confirming the pre-audit recommendation — because the features the design-lab wants to present full-surface (scan, batch, statements, transaction detail, new transaction, invite, settings subviews, notifications) are precisely the ones that already depend on a URL, an SSE token bound to a mounted component, a deep-link/share param, or a multi-step backend flow. Making those overlays route-backed preserves deep-linking, back-button, reload-resume, EventSource lifetime, and share paths at zero behavioral cost; the overlay is purely the visual presentation of a route rendered through the new AppScaffold slot. The legitimate, explicit EXCEPTIONS that stay STATE-DRIVEN (no-URL) are: ReportDetailOverlay (already a non-resumable local lightbox — the reports grid must stay scrolled behind it; a /reports/$period route would break that), GroupDetailPanel (inline collapsible on the same page — a route would destroy the expand-in-place pattern), and ProfileMenu (a local dropdown mutating AppLayout state). Dashboard and Trends keep their drill/period state local (not overlays at all — inline content). The decisive rule: an overlay's visual framing comes from Storybook, but whether it is route-driven or state-driven is decided by that feature's real state needs — route-driven wins wherever URL/SSE/multi-step/deep-link exists today, which is the majority.

## Per-feature reconciliation

| Feature | Visual framing | State approach | URL kept | Effort | What must NOT be lost |
|---|---|---|---|---|---|
| App shell / AppScaffold overlay slot (foundation) | hybrid | keep-as-is | yes | M | The live shell already ~85% matches the static design-lab shell (SideNav rail, BottomNav, AppHeader, ScanFab all conform). AppLayout must… |
| Single Scan (/scan) | overlay-full-surface | route-driven | yes | M | useScanStore lifecycle (idle→…→complete/failed), scanId as the server token, useScanStream EventSource at /scans/{scanId}/events with 5-r… |
| Batch Scan (/scan-batch) | overlay-full-surface | route-driven | yes | M | useBatchScanStore (phase derived from item terminal status), local useState<QueuedFile[]> queue, urlsRef Blob preview URLs, the 1.5s/60-a… |
| Statement Scan + Reconciliation (/statements) | hybrid | route-driven | yes | L | useStatementStore + useStatementStream (EventSource at /statements/{id}/events, password_required/invalid events), queryClient cache inva… |
| Transaction detail (/transactions/$transactionId) | overlay-full-surface | route-driven | yes | M | Deep-linkable path param transactionId (ShareToGroupButton depends on the URL being shareable), inline-edit via EditableText/EditableDate… |
| New transaction (/transactions/new) | overlay-full-surface | route-driven | yes | S | Ephemeral local form state (merchant/date/time/country/city/items/total/category/currency/dateFormat), POST /transactions then navigate t… |
| Transactions list + filters (/transactions/) | inline-tab-content | route-driven | yes | S | dateFrom/dateTo validated search params (deep-linkable, back-button resumable), useTransactions infinite query with cursor pagination, ba… |
| Dashboard / Insights (/) | inline-tab-content | keep-as-is | yes | S | period + dimension local state, useDonutDrill in-memory path (O(1) traversal of one pre-fetched useInsightsTree), PeriodStepper, useInsig… |
| Trends (/trends) | inline-tab-content | keep-as-is | yes | S | granularity/period/level/representation local state, useInsightsSeries windowing (WINDOW_MONTHS cap per granularity), donut/treemap/sanke… |
| Reports + ReportDetailOverlay (/reports) | overlay-full-surface | state-driven | no | S | ReportDetailOverlay is ALREADY a fixed inset-0 z-50 lightbox driven by local useState(detailCard) — intentionally non-resumable. The 'Vie… |
| Groups list + GroupDetailPanel (/groups) | inline-tab-content | state-driven | no | S | GroupDetailPanel inline expansion via local useState(selectedId) (no /groups/$groupId route — by design), GroupSwitcher scope reconciliat… |
| Invite accept (/invite/$token) | overlay-full-surface | route-driven | yes | S | The $token path param IS the deep-link — it must stay URL-addressable for external share/click/resume. useInvitePreview(token) → useJoinI… |
| Settings hub + subviews (/settings, /settings/*) | hybrid | route-driven | yes | M | Each subview (profile/scanning/preferences/memory/data/help) is a distinct createFileRoute — deep-linkable, back-to-hub, reload-preserves… |
| Notifications (/notifications) | hybrid | route-driven | yes | M | User-global feed (independent of activeScope), useInfiniteQuery cursor pagination, optimistic mark-read/delete/mark-all-read with onSettl… |
| Items browse (/items) | inline-tab-content | route-driven | yes | S | Scope-aware useItems infinite query threading activeScope group_id, each item links to /transactions/$id. Filters (search/merchant/storeC… |
| ProfileMenu (avatar dropdown, in AppLayout) | keep-current | state-driven | no | S | Local useState(menuOpen) in AppLayout; it mutates AppLayout state directly and routes to /notifications, /settings, sign-out. clearClient… |

### Per-feature migration notes

**App shell / AppScaffold overlay slot (foundation)** — _hybrid / keep-as-is_
- Must not lose: The live shell already ~85% matches the static design-lab shell (SideNav rail, BottomNav, AppHeader, ScanFab all conform). AppLayout must keep rendering every route inside <main> framed by the nav; the auth gate (ProtectedRoute wrapping AppLayout, /sign-in as the only public route) and the responsive lg: breakpoint must be preserved.
- How: Add the ONE missing foundational capability: an overlay slot in AppLayout that lets a route or a portal go full-surface. Desktop = absolute inset-0 over the CONTENT PANE only (SideNav rail stays visible); mobile = fixed inset-0 over the whole frame (hides BottomNav + AppHeader). Adopt the SideNav-rail grammar on web's existing lg: breakpoint — do NOT reproduce the design-lab fixed device-frame. Document a z-scale once here: overlay < ProfileMenu/AppHeader fixed chrome ordering, with FAB and BottomNav below the mobile full-surface overlay. ReportDetailOverlay (already fixed inset-0 z-50) becomes the reference z-band for content-pane overlays.

**Single Scan (/scan)** — _overlay-full-surface / route-driven_
- Must not lose: useScanStore lifecycle (idle→…→complete/failed), scanId as the server token, useScanStream EventSource at /scans/{scanId}/events with 5-retry exponential backoff, quota display (3/10), and the cleanup-on-unmount that closes the stream. Intermediate progress is intentionally NOT URL-addressable; the resumable source of truth is the persisted transaction (/transactions/$id).
- How: Keep /scan as a real route; render its content through the new overlay slot so it visually presents full-surface per Storybook (ScanProgress/ScanResult/ScanError grammar). Because it stays a mounted route (not a display:none modal), the EventSource lifetime and Zustand store survive exactly as today. Do NOT convert to a no-URL modal — that would risk dropping the SSE stream on close/reopen and lose the retry chain.

**Batch Scan (/scan-batch)** — _overlay-full-surface / route-driven_
- Must not lose: useBatchScanStore (phase derived from item terminal status), local useState<QueuedFile[]> queue, urlsRef Blob preview URLs, the 1.5s/60-attempt polling loop, and the unmount cleanup that revokes preview URLs and resets the store. BatchScanReview links each item to its transactionId / batch-delete / retry path.
- How: Stay a real route rendered through the overlay slot (BatchScanQueue → BatchScanReview grammar). Critical: the overlay must UNMOUNT on leave (route change), not hide via display:none — the queue/preview-URL cleanup depends on unmount firing. A hide-instead-of-unmount modal would leak Blob URLs and strand the queue.

**Statement Scan + Reconciliation (/statements)** — _hybrid / route-driven_
- Must not lose: useStatementStore + useStatementStream (EventSource at /statements/{id}/events, password_required/invalid events), queryClient cache invalidation of statements.lists/reconciliation/lines on terminal events, the recent-statements sidebar (useStatements), card-alias dropdown, password/consent form-local state, and the reconciliation query gated on phase==='completed'.
- How: Keep one /statements route. Apply the upload-panel + reconciliation grammar inline within the route (hybrid: form region + reconciliation region in the same mounted component) so the password/consent local state and the SSE stream survive the upload→reconcile transition. Do NOT split into a no-URL upload modal + separate reconciliation page — that forces lifting password/consent state and risks dropping the stream mid-flow. Selected statement stays store-held (intentionally not URL-addressable).

**Transaction detail (/transactions/$transactionId)** — _overlay-full-surface / route-driven_
- Must not lose: Deep-linkable path param transactionId (ShareToGroupButton depends on the URL being shareable), inline-edit via EditableText/EditableDate/EditableCategory → PATCH /transactions/{id} with optimistic onMutate, item flag toggling → PUT .../items/{item_id}/flags, matched/locked read-only states, BackLink to the filtered list, and reload-resumes-from-server behavior.
- How: Render the design-lab full-surface TransactionDetail grammar (detail back-header, MerchantHeader, family-grouped ItemGroups, save CTA, Matched/Shared read-only variants) through the overlay slot, but keep it a real route with the path param. The overlay is route-backed so refresh, back-button, bookmark, and share all keep working. Never demote to a no-URL modal — that breaks sharing and back-to-filtered-list resume.

**New transaction (/transactions/new)** — _overlay-full-surface / route-driven_
- Must not lose: Ephemeral local form state (merchant/date/time/country/city/items/total/category/currency/dateFormat), POST /transactions then navigate to the new /transactions/$id, and category/reference/profile-default fetches.
- How: Keep as a real route rendered through the overlay slot using the NewTransactionScreen grammar (header fields, add-items, footer live-total + Crear CTA). Draft is intentionally non-resumable (no URL/localStorage) — do not regress that, but consider an unsaved-changes guard since overlay framing makes accidental dismissal easier (flagged as functionalityAtRisk in the scan-family audit).

**Transactions list + filters (/transactions/)** — _inline-tab-content / route-driven_
- Must not lose: dateFrom/dateTo validated search params (deep-linkable, back-button resumable), useTransactions infinite query with cursor pagination, batch selection Set<string> → batch-update/batch-delete, useDeferredValue debounce. NOTE: merchant/currency/category/source/matched filters are currently LOCAL-only (not in URL) — a known gap, not a regression to introduce.
- How: List stays inline content framed by the nav (not an overlay). Opportunistically promote the remaining FilterBar fields (merchant/currency/category/source/matched) into validated search params so back-from-detail restores full filter context — this is an enhancement the overlay-detail pattern makes more valuable, but keep it scoped/optional.

**Dashboard / Insights (/)** — _inline-tab-content / keep-as-is_
- Must not lose: period + dimension local state, useDonutDrill in-memory path (O(1) traversal of one pre-fetched useInsightsTree), PeriodStepper, useInsightsMonthly/Tree React Query (60s staleTime), and activeScope group_id threading.
- How: Keep dashboard as inline route content. Drill/period/dimension stay local useState — they are deliberately non-deep-linkable today and the design-lab does not require otherwise. Apply SummaryStats/DrillBreadcrumb/CategoryDonut visual grammar only. URL search params for drill path are a possible future enhancement (noted in audit) but NOT part of this fidelity pass.

**Trends (/trends)** — _inline-tab-content / keep-as-is_
- Must not lose: granularity/period/level/representation local state, useInsightsSeries windowing (WINDOW_MONTHS cap per granularity), donut/treemap/sankey representations at L1–L4, activeScope group_id threading.
- How: Inline route content; re-skin the temporal/level/representation bars to design-lab grammar. State stays local — exploratory view, intentionally non-resumable, design-lab agrees. No state change.

**Reports + ReportDetailOverlay (/reports)** — _overlay-full-surface / state-driven_
- Must not lose: ReportDetailOverlay is ALREADY a fixed inset-0 z-50 lightbox driven by local useState(detailCard) — intentionally non-resumable. The 'View Transactions' drill MUST keep using navigate to /transactions with {dateFrom,dateTo} search params (that drill IS resumable). Granularity/period local state and activeScope group_id scoping stay.
- How: This is the canonical case where state-driven (no-URL) overlay is CORRECT — do not route-ify it. Re-point ReportDetailOverlay onto the shared overlay slot / z-scale so it composes with the new shell, keeping local open/close + Escape. The reports card grid stays scrolled behind it (a benefit that a /reports/$period route would break). Keep the drill-to-transactions search-param hop intact.

**Groups list + GroupDetailPanel (/groups)** — _inline-tab-content / state-driven_
- Must not lose: GroupDetailPanel inline expansion via local useState(selectedId) (no /groups/$groupId route — by design), GroupSwitcher scope reconciliation (auto-reset to personal if membership disappears), and all member/invite/visibility/consent mutation hooks. activeScope persisted to localStorage drives RLS group_id on every query.
- How: Groups stays inline content; the detail panel stays an inline collapsible (state-driven), NOT an overlay and NOT a route — promoting it to a route would destroy the collapsible-on-same-page pattern. Apply GroupDetailPanel / GroupSwitcher visual grammar only. Scope remains global app state (zustand+localStorage), never route state.

**Invite accept (/invite/$token)** — _overlay-full-surface / route-driven_
- Must not lose: The $token path param IS the deep-link — it must stay URL-addressable for external share/click/resume. useInvitePreview(token) → useJoinInvite(token) → setActiveScope(group) → navigate to /. Crash-mid-flow recovery depends on the token living in the URL.
- How: Keep as a real public-ish route. Can present full-surface (preview → Join → success) via the overlay slot grammar, but the URL must remain the anchor. NEVER convert to a no-URL modal — that breaks the entire external-invite flow (flagged CRITICAL in the groups audit).

**Settings hub + subviews (/settings, /settings/*)** — _hybrid / route-driven_
- Must not lose: Each subview (profile/scanning/preferences/memory/data/help) is a distinct createFileRoute — deep-linkable, back-to-hub, reload-preserves-subview. The data export+delete multi-step flow (portability blob → DELETE confirm → erasure → signOut) lives in one component with local step state. Locale change integrates with uiStore.setLocale.
- How: Mirror the design-lab SettingsFlow grammar (hub menu + SettingsSubviewShell back-button). Keep the nested-route structure exactly — the design-lab deliberately models each subview as deep-linkable via initialSub, confirming routes are correct. Hybrid: hub is inline; subviews use the back-header shell. Do NOT collapse subviews into a single no-URL modal with initialSub props — that breaks deep-link/reload/share.

**Notifications (/notifications)** — _hybrid / route-driven_
- Must not lose: User-global feed (independent of activeScope), useInfiniteQuery cursor pagination, optimistic mark-read/delete/mark-all-read with onSettled invalidate, unread-count badge, and deep-link to /transactions/$id when notification.data.transaction_id is present.
- How: Stays a real route. Design-lab frames a FromAvatar overlay variant reachable from the ProfileMenu AND a standalone screen — adopt the overlay-reachable-from-avatar grammar via the overlay slot while keeping /notifications as the URL-addressable route (the design-lab overlay variant is still a separate screen component, not a URL-less one). Promote the pagination cursor to a URL param if cheap (audit notes it currently derives from cache and is lost on nav-away) — optional enhancement.

**Items browse (/items)** — _inline-tab-content / route-driven_
- Must not lose: Scope-aware useItems infinite query threading activeScope group_id, each item links to /transactions/$id. Filters (search/merchant/storeCategoryId/dateFrom/dateTo) + cursor are currently LOCAL-only — a known gap, not a regression to add.
- How: Inline route content (tab key 'history'). No design-lab story exists for Items yet — keep current behavior and apply shared molecule grammar (TransactionCard etc.). Opportunistically promote filters+cursor into validated search params so 'all items from Starbucks' is shareable/resumable (audit-recommended), but scope it as optional since there is no Storybook reference to match.

**ProfileMenu (avatar dropdown, in AppLayout)** — _keep-current / state-driven_
- Must not lose: Local useState(menuOpen) in AppLayout; it mutates AppLayout state directly and routes to /notifications, /settings, sign-out. clearClientSession + broadcastSignOut cross-tab coordination must remain intact.
- How: Stays a local-component dropdown (state-driven, no URL) — correct as-is. Just slot it into the documented z-scale ABOVE content-pane overlays so it is never covered by a full-surface route overlay on desktop. No route-ification.

## Blanket rules

- Functional layer = behavior truth (preserve); Storybook = visual-grammar truth (apply on top). Never delete a state/URL/SSE solution to satisfy a visual.
- Any feature that today has a URL param, search param, SSE/EventSource token, multi-step backend flow, or deep-link/share path stays ROUTE-DRIVEN; overlay framing is layered on the existing route, never replaces it.
- Full-surface route overlays render through the AppScaffold overlay slot, which UNMOUNTS on route change (never display:none) — scan-batch's preview-URL/queue cleanup and all SSE stream cleanups depend on unmount firing.
- Desktop overlay = absolute inset-0 over the CONTENT PANE only; SideNav rail ALWAYS stays visible on desktop. Mobile overlay = fixed inset-0 over the whole frame (hides BottomNav + AppHeader).
- Adopt the SideNav-rail grammar on web's existing lg: breakpoint; do NOT reproduce the design-lab fixed device-frame.
- One documented z-scale governs everything: mobile full-surface overlay > BottomNav/FAB; ProfileMenu/AppHeader fixed chrome sits above content-pane overlays so the avatar menu is never covered on desktop; ReportDetailOverlay (z-50) defines the content-pane overlay band.
- activeScope stays GLOBAL app state (zustand + localStorage driving RLS group_id) — never route state, never buried in an overlay.
- SSE-driven features (scan, statement) must remain mounted routes so the EventSource and its exponential-backoff retry survive; closing/reopening must not silently drop the stream.
- Genuinely non-resumable lightboxes (ReportDetailOverlay, GroupDetailPanel, ProfileMenu) stay STATE-DRIVEN — do not route-ify them.
- Known local-only filter gaps (transactions list extra filters, items filters+cursor, notifications cursor) may be promoted to URL params as scoped enhancements, but are not regressions to be introduced by the fidelity pass.

## Implementation sequence

1. SHELL FOUNDATION FIRST: add the AppScaffold overlay slot to AppLayout (desktop content-pane absolute inset-0 with SideNav retained; mobile full-frame fixed inset-0), document the z-scale, and re-point the existing ReportDetailOverlay onto it as the proof-of-pattern. No feature behavior changes yet.
2. Lowest-risk inline re-skins (no state change, no overlay): Dashboard (/), Trends (/trends), Groups list + GroupDetailPanel, Items (/items). Pure visual grammar; validates the shell against real data.
3. Route-backed full-surface overlays with NO SSE risk: Transaction detail (/transactions/$id), New transaction (/transactions/new), Invite (/invite/$token). Confirms deep-link + back-button + share survive the overlay slot.
4. Settings hub + subviews and Notifications (hybrid, route-driven): apply SettingsFlow back-header grammar and the FromAvatar notifications-overlay grammar while keeping nested routes; verify reload/deep-link per subview.
5. HIGHEST-RISK LAST — SSE families: Single Scan (/scan), then Batch Scan (/scan-batch), then Statements (/statements). Route through the overlay slot one at a time, each time proving EventSource lifetime, retry/backoff, queue/preview-URL cleanup on unmount, and cache invalidation are intact before moving on.
6. Optional scoped enhancements after fidelity is locked: promote transactions-list extra filters, items filters+cursor, and notifications cursor into validated search params for resumability.

