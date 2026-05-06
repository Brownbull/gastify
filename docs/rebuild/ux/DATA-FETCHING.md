# Data-Fetching Discipline — A.14

Phase A prereq A.14. Defines TanStack Query conventions that every screen follows. Without this, each screen re-decides cache semantics and stale data ships.

**Sub-decision count canary: 6 sub-decisions enumerated.** Adding a 7th requires transactions-wave or communication-wave review. Three-test admission criterion: (a) spans ≥2 screens; (b) spans ≥2 resources or ≥2 mutations; (c) ONE locked decision. Per-resource overrides and per-mutation `// no-optimistic: rationale` annotations extend existing sub-decisions in place — they do NOT add a 7th.

Cross-references: A.2 (ROUTING.md — search params), A.9 (OPENAPI-SKETCH.md — endpoint shapes + cursor format), A.13 (CROSS-CUTTING.md — idempotency, error taxonomy, retry).

---

## 1. `useInfiniteQuery` Boundary List

Endpoints that can exceed ~50 rows for a typical user use `useInfiniteQuery`. All others use plain `useQuery`.

| Endpoint | Surface | Cursor format |
|----------|---------|---------------|
| `/v1/transactions` | History view | base64url(`(sort_key, id)`) per A.9 |
| `/v1/items/aggregated` | Items view | base64url(`(sort_key, id)`) per A.9 |
| `/v1/scans/recent` | Recent scans surface | base64url(`(sort_key, id)`) per A.9 |
| `/v1/audit_events` | Settings audit-log surface | base64url(`(sort_key, id)`) per A.9 |

Single-shape endpoints use plain `useQuery`:
- `/v1/analytics/top-categories?n=5`
- `/v1/analytics/concentration`
- `/v1/analytics/distribution`
- `/v1/analytics/comparison`

**Shared pagination hook.** `IntersectionObserver` at list-bottom triggers `fetchNextPage` — one shared hook at `frontend/src/hooks/useListBottomTrigger.ts`. First-page prefetch happens in the route loader (A.2 path α) so initial render lands with data already in cache. Frontend never invents its own cursor envelope — cursor format matches A.9.

---

## 2. Per-Resource `staleTime` / `gcTime` Defaults

Every `useQuery` / `useInfiniteQuery` call must specify `staleTime` and `gcTime` via the query factory (see Query Key Conventions below). Per-query overrides are allowed at usage site with a `// override: rationale` comment.

| Query key prefix | `staleTime` | `gcTime` | Rationale |
|-----------------|-------------|----------|-----------|
| `transactions:list` | 60s | 5min | Frequent writes; stale list = missed receipt |
| `items:aggregated` | 60s | 5min | Dependent on transaction writes |
| `analytics:top-categories` | 60s | 5min | Aggregation changes on each transaction |
| `analytics:distribution` | 60s | 5min | Same dependency as top-categories |
| `analytics:comparison` | 60s | 5min | Same dependency |
| `analytics:concentration` | 5min | 30min | REQ-10 trailing-3m horizon; updates daily, not per-receipt |
| `fx_rates` | 24h | 24h | REQ-18 write-once; rates never change after insert |
| `categories` | `Infinity` | `Infinity` | REQ-03 frozen `shared/categories.json` taxonomy |
| `scan_event` | 0 | 0 | Streaming — never cache aggregation; `scan_event_log` replay is recovery per A.9 |
| `auth:me` / `scope:membership` | 5min | 30min | No `refetchOnWindowFocus`; explicit refresh on sign-out per SC-08 |
| `audit:events` | 30s | 5min | Admin surface; fresher than analytics |
| `cohort:contributions` | `Infinity` | until withdrawal-flip | REQ-27 — recompute is server-driven, not client-poll |

### Query Key Conventions

Query keys follow a `[resource, scope, ...params]` tuple:

```typescript
// Query key factory — frontend/src/api-client/queryKeys.ts
export const queryKeys = {
  transactions: {
    all:    ['transactions'] as const,
    list:   (filters: TransactionFilters) => ['transactions', 'list', filters] as const,
    detail: (id: string) => ['transactions', 'detail', id] as const,
  },
  items: {
    all:    ['items'] as const,
    list:   (filters: ItemFilters) => ['items', 'list', filters] as const,
  },
  analytics: {
    all:          ['analytics'] as const,
    topCategories: (params: TopCategoryParams) => ['analytics', 'top-categories', params] as const,
    distribution:  (params: DistributionParams) => ['analytics', 'distribution', params] as const,
    comparison:    (params: ComparisonParams) => ['analytics', 'comparison', params] as const,
    concentration: () => ['analytics', 'concentration'] as const,
    cohort:        () => ['analytics', 'cohort'] as const,
  },
  scans: {
    all:    ['scans'] as const,
    list:   () => ['scans', 'list'] as const,
    detail: (id: string) => ['scans', 'detail', id] as const,
  },
  auth: {
    me:         () => ['auth', 'me'] as const,
    membership: () => ['scope', 'membership'] as const,
  },
  credits: {
    balance: () => ['credit', 'balance'] as const,
  },
  insights: {
    profile: () => ['insights', 'profile'] as const,
    feed:    () => ['insights', 'feed'] as const,
  },
  audit: {
    events: (filters: AuditFilters) => ['audit', 'events', filters] as const,
  },
  fxRates: {
    rate: (date: string, from: string, to: string) => ['fx_rates', date, from, to] as const,
  },
  categories: {
    all: () => ['categories'] as const,
  },
  cardAliases: {
    list: () => ['card-aliases', 'list'] as const,
  },
  cohort: {
    contributions: () => ['cohort', 'contributions'] as const,
  },
} as const;
```

Params objects are serializable (no functions, no Date objects). TanStack Query structurally compares them — same search-param tuple from the same URL = same cache entry across navigations.

---

## 3. Cache-Invalidation Tag Taxonomy

Mutations carry a `Cache-Tags` response header (or response-body field — TBD by A.9 wire conventions). Frontend mutation hooks call:

```typescript
queryClient.invalidateQueries({
  predicate: (q) => intersect(q.meta?.tags, response.tags),
});
```

**Tagging is mandatory at query-key authorship time** via TanStack Query `meta.tags` field. Untagged queries are NEVER invalidated by mutations.

### Tag Categories

| Category | Tags | Scope |
|----------|------|-------|
| Per-resource list | `transactions:list`, `items:list`, `scans:list`, `audit:events` | Paginated list queries |
| Per-aggregation | `analytics:top-categories`, `analytics:distribution`, `analytics:comparison`, `analytics:concentration`, `analytics:cohort` | Analytics queries |
| Per-detail | `transactions:detail:$id`, `scans:detail:$id` | Single-resource queries |
| Auth | `auth:me`, `scope:membership` | User identity + scope |
| Credit | `credit:balance` | Credit balance per A.9 Credit-deduction ADR |

### Automatic Invalidation Pulse

Receipt of `scan_event` `completed` or `requires_review` events drives an automatic invalidation pulse to `transactions:list` + `analytics:*` — a fresh scan visibly updates Dashboard / History / Trends without page reload.

---

## 4. Drill-Down Handoff via Search-Param Navigation

Cross-screen state handoff (Dashboard → History, Trends → History, Items → TransactionDetail) goes through `Route.search` ONLY.

**Prohibited patterns** — RALPH iterations must NOT:
- Lift cross-screen state into a Zustand `pending*` slot
- Use React-state lift between sibling routes
- Introduce an event-bus for cross-screen communication

**How it works:**

1. Source route calls `router.navigate({ to: '/history', search: { category, temporal_level, year, month } })`.
2. Receiving route's `validateSearch` parses the Zod schema (A.2 `historySearchSchema` / `itemsSearchSchema` / `trendsSearchSchema`).
3. Route loader reads `Route.useSearch()` and prefetches data into TanStack Query cache.
4. TanStack Query keys naturally key on search params — same query key from same search-param tuple = same cache entry across back/forward navigation (no double-fetch).

### Handoff Matrix

| From | To | Search params carried |
|------|----|----------------------|
| Dashboard donut/treemap | `/history` | `category`, `temporal_level`, `year`, `month`, `source_view` |
| Dashboard month summary | `/trends` | `month`, `year` |
| Trends category drill-down | `/history` | `category`, `temporal_level`, `year`, `month` |
| Items category drill-down | `/history` | `category`, `item_category`, `temporal_level`, `year`, `month` |
| History row tap | `/transactions/:id` | `mode=view`, `from=history` |
| Any screen → transaction edit | `/transactions/:id` | `mode=edit`, `from=<source_route>` |

The `from` param enables the back-button to navigate to the originating route. `Route.useSearch()` returns the Zod-parsed subset per A.2.

---

## 5. Retry Policy

Single retry function at `frontend/src/api-client/retry.ts`, consumed by every `useQuery` + `useMutation`. TanStack Query's default `retry: 3` is wrong for this app.

### GET (Idempotent Queries)

| Status | Policy | Detail |
|--------|--------|--------|
| `429` | Honor `Retry-After` | Server-instructed wait; never exponential override |
| `5xx` | Exponential backoff + jitter | `min(2^attempt × 200ms, 30s)` ± 20% jitter, max 3 attempts |
| `4xx` (400/401/403/404/409/422) | NEVER retry | Surface immediately to ErrorBoundary |
| Network error | Backoff, max 3 | Same exponential as 5xx |

GETs are safe to replay — no `Idempotency-Key` needed.

### POST/PUT/PATCH/DELETE (Mutations)

**NEVER auto-retry.** User-initiated retries flow through the mutation hook with the SAME `Idempotency-Key` (per A.13) so the server returns the cached response.

**Single exception:** `errors/idempotency.in_flight` (409) retries with bounded backoff — ≤3 attempts at 200ms / 400ms / 800ms — inside the mutation hook. This is NOT user-initiated.

### Streaming (SSE/WS Reconnect)

Bounded backoff with jitter, ≤5 attempts in 60s. After exhaustion: surface "connection lost — re-open this scan from /recent-scans" UI per A.9 scanId-as-route-param + replay-on-reconnect.

Token-expired close (per A.9 streaming-token revalidation handshake) triggers a fresh-token reconnect, NOT a backoff retry.

### Error-Slug-Aware Short-Circuits

| Slug | Action |
|------|--------|
| `errors/auth.token_expired` | `getIdToken(forceRefresh=true)` + single retry |
| `errors/auth.unauthenticated` | Skip retry → redirect to sign-in |
| `errors/domain.scan.credit_insufficient` | Skip retry → surface credit-purchase modal |

### Implementation Shape

```typescript
// frontend/src/api-client/retry.ts
import type { Query } from '@tanstack/react-query';

export function shouldRetryQuery(failureCount: number, error: ApiError): boolean {
  if (failureCount >= 3) return false;
  if (error.status === 429) return true; // delay handled by retryDelay
  if (error.status >= 500) return true;
  if (error.isNetworkError) return true;
  return false; // 4xx: never retry
}

export function queryRetryDelay(failureCount: number, error: ApiError): number {
  if (error.status === 429 && error.retryAfter) {
    return error.retryAfter * 1000;
  }
  const base = Math.min(Math.pow(2, failureCount) * 200, 30_000);
  const jitter = base * (0.8 + Math.random() * 0.4); // ±20%
  return jitter;
}
```

---

## 6. Optimistic-Update Convention Table

Every mutation hook in `frontend/src/hooks/data/` follows this table. Per-screen `hooks/ui/` adapters are unaware of optimistic logic.

Untabled mutations use the **conservative default**: no optimistic update, invalidate the obvious targets after success. Adding a row requires an OPENAPI-SKETCH update + DATA-FETCHING.md edit.

| Mutation | `setQueryData` (sync, before request) | `cancelQueries` + `invalidate` (after success) | Rollback on error | Notes |
|----------|----------------------------------------|------------------------------------------------|-------------------|-------|
| `PATCH /v1/transactions/$id` (REQ-13 user edit) | `transactions:detail:$id` (apply patch, bump `user_edited_at`); `transactions:list` (find + replace row) | `analytics:*` (aggregations depend on edited fields) | Restore prior detail + revert list-row | UI updates immediately; revert with toast on `errors/domain.user_edit_protected` (409) |
| `POST /v1/transactions` (manual entry) | none | `transactions:list`, `analytics:*`, `credit:balance` | n/a | Server-authoritative; async latency acceptable |
| `DELETE /v1/transactions/$id` (archive) | `transactions:detail:$id` (set `archived_at = NOW()`); `transactions:list` (filter out) | `analytics:*` | Restore `archived_at = null` on both | Soft-delete per A.10 conventions |
| `POST /v1/scans` (receipt submit) | `credit:balance` (decrement by 1) | `scans:list`, `transactions:list` (on terminal event), `analytics:*` (on terminal) | Restore `credit:balance` on `errors/domain.scan.credit_insufficient` | Submit-time optimistic is just credit-balance |
| `PATCH /v1/scans/$id/cancel` | `scans:detail:$id` (set `status='cancelling'`) | `scans:list`, `credit:balance` (refund if cancel-before-picked_up per A.9) | Restore prior status | Refund is server-authoritative |
| `POST /v1/insights/silence` | `insights:profile` (set `silenced_until`) | `insights:feed` | Revert `silenced_until` | REQ-20 revocation parity via DELETE pair |
| `DELETE /v1/insights/silence` | `insights:profile` (set `silenced_until=null`) | `insights:feed` | Restore prior `silenced_until` | Triggers cohort recompute server-side |
| `POST /v1/insights/dismiss/$id` | `insights:profile.dismissedInsights` (append); `insights:feed` (filter) | `insights:feed` | Remove from dismissedInsights | Cooldown idempotent per A.10 |
| `PUT /v1/me/consent` | `auth:me.consent` (apply diff) | `auth:me`, `cohort:contributions` (if cohort flipped) | Restore prior consent map | REQ-20 audit_events row on success |
| `POST /v1/card-aliases` (REQ-09) | none | `card-aliases:list`, `transactions:list` (card filter chip refresh) | n/a | Server validates NG-06; let it fail |

### Optimistic Update Implementation Pattern

```typescript
// Pattern for mutation hooks in frontend/src/hooks/data/
export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: UpdateTransactionArgs) =>
      apiClient.patch(`/v1/transactions/${args.id}`, args.body, {
        headers: { 'Idempotency-Key': args.idempotencyKey },
      }),

    onMutate: async (args) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions.detail(args.id) });

      const previousDetail = queryClient.getQueryData(queryKeys.transactions.detail(args.id));
      const previousList = queryClient.getQueriesData({ queryKey: queryKeys.transactions.all });

      queryClient.setQueryData(
        queryKeys.transactions.detail(args.id),
        (old) => old ? { ...old, ...args.body, user_edited_at: new Date().toISOString() } : old,
      );

      return { previousDetail, previousList };
    },

    onError: (_err, args, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(queryKeys.transactions.detail(args.id), context.previousDetail);
      }
    },

    onSettled: (_data, _err, _args, _context) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.analytics.all });
    },
  });
}
```

---

## Open Questions (settle before Phase D)

1. **Cache-Tags transport**: response header vs response-body field — awaiting A.9 wire conventions finalization.
2. **`refetchOnWindowFocus` global default**: currently `false` for auth queries; TBD whether to enable globally and opt-out per query, or disable globally and opt-in.
3. **Prefetch depth in loaders**: first page only, or speculative second page for infinite queries.
