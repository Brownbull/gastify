# Feature Flag / Kill-Switch Mechanism — A.15

Phase A prereq A.15. DB-backed feature flags with a frontend hook. No external service.

Cross-references: A.13 §6 (locked decision), A.10 schema, A.17 (scan kill-switch ties to rate-limit), A.9 (endpoint).

---

## Table Schema

```sql
CREATE TABLE feature_flags (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name         TEXT NOT NULL UNIQUE,
    enabled      BOOLEAN NOT NULL DEFAULT FALSE,
    description  TEXT,
    metadata     JSONB NOT NULL DEFAULT '{}',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: app_user can SELECT own-scope flags; app_admin can INSERT/UPDATE/DELETE.
-- Flags are global (not per-scope) for MVP — scope-level overrides are a post-MVP addition.
```

`metadata` JSONB holds flag-specific config (e.g., `{ "rollout_percent": 50 }` for gradual rollouts post-MVP). MVP treats it as opaque — frontend only reads `enabled`.

---

## Initial Flag Set

| Flag name | Purpose | Default | Ref |
|-----------|---------|---------|-----|
| `screen.dashboard` | Gate new Dashboard during cutover | `true` | A.15 (a) |
| `screen.history` | Gate new History during cutover | `true` | A.15 (a) |
| `screen.trends` | Gate new Trends during cutover | `true` | A.15 (a) |
| `screen.items` | Gate new Items during cutover | `true` | A.15 (a) |
| `screen.insights` | Gate new Insights during cutover | `true` | A.15 (a) |
| `screen.reports` | Gate new Reports during cutover | `true` | A.15 (a) |
| `screen.settings` | Gate new Settings during cutover | `true` | A.15 (a) |
| `scan.enabled` | Kill-switch for scan pipeline | `true` | A.15 (b) / REQ-21 |
| `scan.batch_enabled` | Kill-switch for batch scanning | `true` | A.15 (b) |
| `datasource.postgres` | Read from Postgres (true) vs Firestore (false) | `true` | A.15 (c) / Phase E |
| `datasource.dual_write` | Write to both Postgres + Firestore | `false` | A.15 (c) / Phase E |
| `cohort.enabled` | Cohort analytics availability | `false` | REQ-27 (late-phase) |

Flags default to the post-cutover state (`enabled=true` for screens, `true` for Postgres). During dual-write, `datasource.dual_write` flips to `true`. Emergency rollback flips `datasource.postgres` to `false`.

---

## Backend Endpoint

```
GET /v1/flags
```

Returns all flags the authenticated user can see. Cached aggressively — flags change rarely.

```json
{
  "data": {
    "scan.enabled": true,
    "scan.batch_enabled": true,
    "datasource.postgres": true,
    "datasource.dual_write": false,
    "cohort.enabled": false,
    "screen.dashboard": true,
    "screen.history": true
  }
}
```

Response is a flat `Record<string, boolean>` — no nesting, no metadata. Admin endpoints for CRUD are internal-only (direct DB or admin panel).

---

## Frontend Hook

```typescript
// frontend/src/hooks/useFeatureFlag.ts
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/api-client/queryKeys';

// Add to queryKeys:
// flags: { all: () => ['flags'] as const }

export function useFeatureFlag(name: string): boolean {
  const { data } = useQuery({
    queryKey: queryKeys.flags.all(),
    queryFn: () => apiClient.get<Record<string, boolean>>('/v1/flags'),
    staleTime: 5 * 60 * 1000,   // 5min — flags change rarely
    gcTime: 30 * 60 * 1000,     // 30min
  });

  return data?.[name] ?? false; // default false = gated
}

export function useFeatureFlags(): Record<string, boolean> {
  const { data } = useQuery({
    queryKey: queryKeys.flags.all(),
    queryFn: () => apiClient.get<Record<string, boolean>>('/v1/flags'),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  return data ?? {};
}
```

### Usage in Routes

```typescript
// In a route component
function DashboardRoute() {
  const enabled = useFeatureFlag('screen.dashboard');
  if (!enabled) return <FeatureGatedFallback />;
  return <DashboardView />;
}
```

### Usage for Scan Kill-Switch

```typescript
// In scan submission hook
function useScanSubmit() {
  const scanEnabled = useFeatureFlag('scan.enabled');

  return useMutation({
    mutationFn: async (args) => {
      if (!scanEnabled) {
        throw new Error('Scanning is temporarily disabled');
      }
      return apiClient.post('/v1/scans', args);
    },
  });
}
```

---

## Backend Kill-Switch Check

The scan endpoint also checks the flag server-side (defense-in-depth):

```python
# backend/app/deps/feature_flags.py
async def require_flag(flag_name: str, db: AsyncSession) -> None:
    result = await db.execute(
        select(FeatureFlag.enabled).where(FeatureFlag.name == flag_name)
    )
    flag = result.scalar_one_or_none()
    if not flag:
        raise HTTPException(503, detail="Feature temporarily unavailable")
```

---

## Decision: Pin to `.kdbp/DECISIONS.md`

RALPH iterations must NOT invent per-screen feature gating. All feature gates go through `useFeatureFlag(name)` reading from the `feature_flags` table. No environment variables, no build-time flags, no hardcoded booleans.
