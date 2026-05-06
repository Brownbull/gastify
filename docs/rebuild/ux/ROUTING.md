# TanStack Router Migration Plan — A.2

Phase A prereq A.2. Defines the route tree, maps the current `View` enum to URL-based routes, specifies the search params strategy, and plans the deletion of `useNavigationStore.ts`.

## Decision: File-Based Routes

**Choice: file-based route definitions** using `@tanstack/router-plugin/vite`.

Rationale:
- Idiomatic TanStack Router pattern; best documentation and ecosystem support.
- Route tree auto-generated from file structure — eliminates manual route registration.
- Each route file co-locates loader, search params validation, and component.
- RALPH iterations operate on single files — file-based routes give each iteration a clear, isolated target.

Fallback: if RALPH struggles with file-based conventions (Gate Pilot-FE test), switch to code-based `createRoute()` in a single `router.ts`.

---

## Route Tree

```
frontend/src/routes/
├── __root.tsx                    # Root layout (TopHeader + Nav + auth gate)
├── index.tsx                     # / → Dashboard
├── scan.tsx                      # /scan → TransactionEditor (new scan mode)
├── transactions/
│   ├── $transactionId.tsx        # /transactions/:transactionId → TransactionEditor (edit/view)
│   └── index.tsx                 # /transactions → redirect to /history
├── history.tsx                   # /history → HistoryView
├── items.tsx                     # /items → ItemsView
├── trends.tsx                    # /trends → TrendsView (analytics)
├── insights.tsx                  # /insights → InsightsView
├── reports.tsx                   # /reports → ReportsView
├── recent-scans.tsx              # /recent-scans → RecentScansView
├── alerts.tsx                    # /alerts → NotificationsView
├── statement-scan.tsx            # /statement-scan → StatementScanView
├── batch/
│   ├── capture.tsx               # /batch/capture → BatchCaptureView
│   └── review.tsx                # /batch/review → BatchReviewView
└── settings/
    ├── index.tsx                 # /settings → Settings main menu
    ├── profile.tsx               # /settings/profile → SettingsProfile
    ├── preferences.tsx           # /settings/preferences → SettingsPreferences
    ├── scanning.tsx              # /settings/scanning → SettingsScan
    ├── limits.tsx                # /settings/limits → SettingsLimits
    ├── subscription.tsx          # /settings/subscription → SettingsSubscription
    ├── data.tsx                  # /settings/data → SettingsData
    ├── groups.tsx                # /settings/groups → SettingsGroups
    ├── app.tsx                   # /settings/app → SettingsApp
    └── account.tsx               # /settings/account → SettingsAccount
```

---

## View Enum → Route Mapping

| View enum | Route path | Search params | Notes |
|-----------|-----------|---------------|-------|
| `dashboard` | `/` | — | Home route |
| `transaction-editor` (new) | `/scan` | `?currency&receipt_type` | New scan flow |
| `transaction-editor` (edit) | `/transactions/:transactionId` | `?mode=edit\|view` | Edit or read-only view |
| `history` | `/history` | `?category&group&temporal_level&year&month&quarter&source_view` | Analytics drill-down filters |
| `items` | `/items` | `?category&item_group&item_category&merchant&temporal_level&year&month&quarter` | Item-level drill-down |
| `trends` | `/trends` | `?month&year&chart_mode&drill_down_mode&category` | Analytics state preservation |
| `insights` | `/insights` | — | Insight history |
| `reports` | `/reports` | — | Weekly reports |
| `recent-scans` | `/recent-scans` | — | Recent scan history |
| `alerts` | `/alerts` | — | Notifications |
| `statement-scan` | `/statement-scan` | — | Statement scanning |
| `batch-capture` | `/batch/capture` | — | Batch receipt capture |
| `batch-review` | `/batch/review` | — | Batch review/editing |
| `settings` (main) | `/settings` | — | Settings menu |
| `settings` (subviews) | `/settings/:subview` | — | 10 nested settings routes |
| `scan` | **REMOVED** | — | Deprecated; replaced by `/scan` |
| `scan-result` | **REMOVED** | — | Deprecated; merged into `/transactions/:id` |
| `edit` | **REMOVED** | — | Deprecated; merged into `/transactions/:id?mode=edit` |

---

## Search Params Strategy

TanStack Router validates search params at the route level via `validateSearch`. Each route declares its params as a Zod schema — type-safe, serializable to URL, and cached by TanStack Query.

### `/history` search params

```typescript
const historySearchSchema = z.object({
  category: z.string().optional(),
  group: z.string().optional(),          // store group: 'Essentials', 'Entertainment'
  temporal_level: z.enum(['month', 'year', 'quarter']).optional(),
  year: z.string().optional(),
  month: z.string().optional(),
  quarter: z.string().optional(),
  source_view: z.enum(['donut', 'treemap']).optional(),  // for back-navigation context
})
```

Replaces: `pendingHistoryFilters` in navigation store. Analytics drill-down navigates via `router.navigate({ to: '/history', search: { category: 'Supermarkets', temporal_level: 'month', year: '2026', month: '05' } })`.

### `/items` search params

```typescript
const itemsSearchSchema = z.object({
  category: z.string().optional(),
  item_group: z.string().optional(),
  item_category: z.string().optional(),
  merchant: z.string().optional(),
  temporal_level: z.enum(['month', 'year', 'quarter']).optional(),
  year: z.string().optional(),
  month: z.string().optional(),
  quarter: z.string().optional(),
})
```

Replaces: `pendingHistoryFilters` when `targetView === 'items'`.

### `/trends` search params

```typescript
const trendsSearchSchema = z.object({
  month: z.string().optional(),          // YYYY-MM format
  year: z.string().optional(),
  chart_mode: z.string().optional(),     // 'donut' | 'treemap' | 'bar'
  drill_down_mode: z.string().optional(),
  category: z.string().optional(),
})
```

Replaces: `analyticsInitialState` in navigation store. Dashboard "view trends for month" navigates via `router.navigate({ to: '/trends', search: { month: '2026-05' } })`.

### `/transactions/:transactionId` params

```typescript
const transactionParamsSchema = z.object({
  transactionId: z.string().uuid(),
})
const transactionSearchSchema = z.object({
  mode: z.enum(['edit', 'view']).default('view'),
  from: z.string().optional(),           // return-to route after save/cancel
})
```

Replaces: `transactionEditorMode`, `isViewingReadOnly`, `previousView` in navigation store.

### `/scan` search params

```typescript
const scanSearchSchema = z.object({
  currency: z.string().optional(),       // ISO 4217
  receipt_type: z.string().optional(),   // auto|supermarket|restaurant|...
})
```

### `/batch/review` search params

```typescript
const batchReviewSearchSchema = z.object({
  editing_index: z.number().optional(),  // which receipt in the batch is being edited
})
```

Replaces: `batchEditingIndex` in batch workflow store. Navigation from batch-review to transaction-editor and back uses this param.

---

## Root Layout (`__root.tsx`)

```typescript
// Handles:
// 1. Auth gate — if no user, show LoginScreen
// 2. TopHeader with back navigation (reads route context)
// 3. Bottom Nav bar
// 4. Scroll position restoration (TanStack Router built-in)
// 5. Full-screen view detection (no TopHeader for certain routes)

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  const user = useAuthStore(s => s.user)
  if (!user) return <LoginScreen />

  return (
    <>
      <TopHeader />
      <main>
        <Outlet />
      </main>
      <Nav />
    </>
  )
}
```

Full-screen routes (batch-capture, transaction-editor, scan) hide `TopHeader` and `Nav` via route context or a `meta` property on the route definition.

---

## `useNavigationStore.ts` Deletion Plan

The store is 349 lines. Here's what each piece becomes:

### State → Router equivalents

| Store state | Router replacement | Notes |
|-------------|-------------------|-------|
| `view: View` | `router.state.location.pathname` | URL is the source of truth |
| `previousView: View` | `router.history` / `from` search param | Browser back button + `from` param on editor routes |
| `settingsSubview: SettingsSubview` | `/settings/:subview` nested routes | URL segment replaces enum |
| `scrollPositions: Record<View, number>` | TanStack Router scroll restoration | Built-in `scrollRestoration` option |
| `pendingHistoryFilters` | `/history?category=...&temporal_level=...` | Search params on target route |
| `pendingDistributionView` | `/history?source_view=donut` | Search param for back-navigation context |
| `analyticsInitialState` | `/trends?month=...&chart_mode=...` | Search params on trends route |

### Actions → Router calls

| Store action | Router replacement |
|-------------|-------------------|
| `setView(view)` | `router.navigate({ to: routeForView(view) })` |
| `navigateToView(view, options)` | `router.navigate({ to, search })` with params |
| `navigateBack()` | `router.history.back()` or `router.navigate({ to: search.from \|\| '/' })` |
| `setSettingsSubview(sub)` | `router.navigate({ to: '/settings/' + sub })` |
| `saveScrollPosition()` | **Deleted** — TanStack Router handles this |
| `setPendingHistoryFilters()` | **Deleted** — filters are search params on `/history` |
| `setAnalyticsInitialState()` | **Deleted** — state is search params on `/trends` |

### Selectors → Router hooks

| Store selector | Router hook |
|---------------|-------------|
| `useCurrentView()` | `useRouterState({ select: s => s.location.pathname })` |
| `usePreviousView()` | Not needed — browser back + `from` param |
| `useSettingsSubview()` | `useParams({ from: '/settings/$subview' })` |
| `usePendingHistoryFilters()` | `useSearch({ from: '/history' })` |
| `useNavigationActions()` | `useNavigate()` from TanStack Router |

### What remains (~50 lines)

After migration, `useNavigationStore.ts` shrinks to a thin wrapper that:
1. Exports `navigationActions` for non-React code (services that need to trigger navigation).
2. Provides `routeForView(view: View)` mapping for gradual migration (old code calls `setView('history')`, wrapper calls `router.navigate({ to: '/history' })`).

This wrapper is deleted entirely once all callers migrate to direct `useNavigate()` calls.

---

## Migration Sequence

Phased approach — the app works at every step.

### Phase 1: Install + Root Route (no behavior change)

1. `pnpm add @tanstack/react-router @tanstack/router-plugin`
2. Add TanStack Router Vite plugin to `vite.config.ts`
3. Create `__root.tsx` wrapping existing `App.tsx` content
4. Create `index.tsx` rendering DashboardView
5. Wrap app in `<RouterProvider>` in `main.tsx`
6. All other views still render via the old `view === 'xxx'` switch — no breakage

### Phase 2: Route-per-view (gradual)

For each view, in dependency order:
1. Create the route file (e.g., `history.tsx`)
2. Move the view's render logic from `viewRenderers.tsx` into the route component
3. Replace `navigateToView('history', ...)` calls with `router.navigate({ to: '/history', search: ... })`
4. Delete the corresponding case from `viewRenderers.tsx`

Order: settings (nested routes first, proves the pattern) → history/items (search params) → trends → remaining simple views → transaction-editor (most complex) → batch routes → scan

### Phase 3: Delete navigation store

1. Verify all `useNavigationStore` imports are gone (grep confirms zero)
2. Delete `useNavigationStore.ts`
3. Delete `View` type from `app/types.ts`
4. Delete `viewRenderers.tsx`
5. Delete view classification constants (`FULL_SCREEN_VIEWS`, etc.) — replaced by route `meta`

### Phase 4: Storybook compatibility

Stories use `<MemoryRouter>` from TanStack Router for route context:
```typescript
import { createMemoryHistory, createRouter } from '@tanstack/react-router'

const memoryHistory = createMemoryHistory({ initialEntries: ['/history?category=Supermarkets'] })
const testRouter = createRouter({ routeTree, history: memoryHistory })
```

This provides real search params in stories without a browser.

---

## TanStack Query Integration

TanStack Router + TanStack Query work together:

1. **Route loaders** can prefetch queries: `loader: ({ search }) => queryClient.ensureQueryData(transactionsQuery(search))`
2. **Search params as query keys**: `useQuery({ queryKey: ['transactions', search], ... })` — changing URL params automatically refetches.
3. **Invalidation on mutation**: `useMutation({ onSuccess: () => queryClient.invalidateQueries({ queryKey: ['transactions'] }) })` — TanStack Query handles cache; router handles URL.

---

## Decisions Still Open

1. **Scroll restoration strategy**: TanStack Router's `scrollRestoration: 'manual'` vs `'auto'`. Recommend `'auto'` to start; override per-route if needed.
2. **404 handling**: `notFoundComponent` on root route → friendly "page not found" screen.
3. **Auth redirect**: Login success → redirect to the URL they tried to visit (stored in `redirect` search param on login route, or TanStack Router's `beforeLoad` redirect).
4. **Transition animations**: Current app has none. TanStack Router supports `pendingComponent` for loading states during route transitions. Defer to Phase D.
