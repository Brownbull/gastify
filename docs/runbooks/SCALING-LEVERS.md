# Scaling Levers & Path-B Trigger Thresholds

Reference for when to tune config vs when to escalate to architectural changes (D62 Path B).

## D62 Path-B Trigger Signals

Three metrics surface via `GET /api/v1/metrics` (JSON or Prometheus format). All are emitted by the existing `app/observability.py` registry.

| Metric | Type | D62 trigger condition |
|--------|------|----------------------|
| `gastify_concurrent_active_scans` | gauge | Approaching Gemini RPM limit (analytical: ~30 RPM on flash-lite free tier, ~2 calls/scan → ~15 concurrent) |
| `gastify_concurrent_active_scans_peak` | gauge | Sustained peak above pool capacity despite tuning |
| `gastify_db_pool_checkout_wait_ms` | histogram (p95) | p95 climbing above 500ms despite pool tuning |
| `gastify_scan_error_rate_limit` | counter | Non-zero and sustained (Gemini 429s) |
| `gastify_scan_error_quota_exceeded` | counter | Non-zero (Gemini quota exhaustion) |

## Config-Only Scaling Levers (Path A — no architecture change)

All validated as polling-safe by the Phase 2 load test (2026-06-02).

| Lever | Current | How to tune | Effect |
|-------|---------|-------------|--------|
| `pool_size` (db.py) | 5 | Set via `create_async_engine(pool_size=N)` | More steady-state connections |
| `max_overflow` (db.py) | 10 | Set via `create_async_engine(max_overflow=N)` | More burst connections |
| `uvicorn --workers` | 1 | `uvicorn app.main:app --workers N` | Multiplies request throughput (each worker has its own pool) |
| Railway replicas | 1 | Railway dashboard → service → replicas | Linear horizontal scaling (polling reads are replica-safe) |
| Mobile poll interval | 0.5s min | `SCAN_POLL_INTERVAL_S` in mobile `progressFallback.ts` | Reduces read pressure per scan |
| `e2e_scan_event_delay_ms` | 600 (staging-e2e) | Railway env var | Simulated fixture latency (load test only) |

### Tuning order

1. **First**: increase `pool_size` to 10–15, `max_overflow` to 20–30
2. **Second**: add `--workers 2` (doubles throughput, doubles pool capacity)
3. **Third**: add Railway replicas (linear scaling)
4. **After all three**: if metrics still trigger → Path B architecture session

## Path-B Escalation Decision

Path B = Redis-backed pub/sub dispatcher + durable worker queue (D62 amendment: Postgres-native-first).

**Do NOT escalate to Path B until:**
- Config-only levers are exhausted (pool tuned, workers added, replicas running)
- AND one of the trigger metrics is still breaching after tuning
- OR a 2nd API replica is needed (forces the fan-out problem — in-process dispatcher can't cross replicas)

**Architecture session trigger:** any D62 Path-B trigger fires post-tuning, OR a product requirement needs durable multi-consumer event streaming.

## Load Test Baseline (2026-06-02)

Untuned (pool=15, 1 worker, 1 replica, Railway Starter):

| Concurrency | Error rate | Poll p95 | Poll p99 | Verdict |
|-------------|-----------|----------|----------|---------|
| 1 | 0% | 1,677ms | 1,677ms | Comfortable |
| 5 | 0% | 1,616ms | 1,688ms | Healthy |
| 15 | 0.11% | 3,623ms | 29,442ms | Pool saturated |

Full report: `scripts/loadtest/CAPACITY-REPORT.md`
