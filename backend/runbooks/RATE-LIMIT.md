# Rate Limit Runbook

Referenced by A.17 §3. Token-bucket rate limiter at FastAPI middleware.

## Default Limits

| Bucket | Limit | Scope |
|--------|-------|-------|
| Authenticated mutations | 60/min | Per user token |
| Scan submissions | 12/min | Per user token (matches SCOPE §9.2 GEMINI_SAFETY_LIMIT) |
| Unauthenticated paths | 30/min | Per IP |
| Token-verify failures | 5/min | Per IP (brute-force protection) |

## Backing Store

Postgres `rate_limit_buckets` table (NOT in-process state):

```sql
CREATE TABLE rate_limit_buckets (
    key          TEXT PRIMARY KEY,
    tokens       INTEGER NOT NULL,
    last_refill  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rate_limit_stale
  ON rate_limit_buckets (last_refill)
  WHERE last_refill < NOW() - INTERVAL '1 hour';
```

FastAPI middleware: atomic `UPDATE ... RETURNING` to debit + refill in one statement.

**Why Postgres, not in-memory:** Multi-worker uvicorn means in-memory state is per-worker. Effective limit = `defined_limit × N_workers` — silently bypassed.

**Latency:** ~2-5ms per request on Railway internal Postgres.

**Future:** Redis backing deferred to Decisions-still-open. Swap if scan throughput crosses 1k/min. `RateLimiter` interface abstracts the backing store (one-file change).

## Response Format

```json
{
  "type": "https://gastify.app/errors/rate_limit.exceeded",
  "title": "Rate limit exceeded",
  "status": 429,
  "detail": "Too many requests. Retry after 32 seconds."
}
```

`Retry-After: 32` header included.

## Nightly Sweep

Idle buckets (`last_refill < NOW() - INTERVAL '1 hour'`) purged by nightly pg_cron job.

## Implementation Status

- [ ] `rate_limit_buckets` table in Alembic migration
- [ ] FastAPI middleware with atomic UPDATE ... RETURNING
- [ ] Per-endpoint limit configuration
- [ ] RFC 7807 rate-limit response
- [ ] Nightly sweep job
- [ ] Integration test: limit enforced across concurrent requests
