# Gastify

Chilean smart expense tracker — AI receipt scanning, multi-currency analytics, SPA. Rebuild of [BoletApp](https://github.com/Brownbull/gmni_boletapp) on FastAPI + PostgreSQL + React.

## Status

Active rebuild. Current KDBP work is P5 Statement Reconciliation + Cards.
Phases 0-5 are implemented through the web statement reconciliation flow; Phase
6 is adding the Android-native statement upload, progress, and reconciliation
journey. iOS runtime proof is deferred until after the roadmap by D47/P31.

See [`docs/rebuild/PLAN.md`](docs/rebuild/PLAN.md) for the phased implementation plan, [`docs/rebuild/LESSONS.md`](docs/rebuild/LESSONS.md) for rebuild rules derived from the prototype, and [`docs/runbooks/ENVIRONMENTS.md`](docs/runbooks/ENVIRONMENTS.md) for the environment-gated development model.

## Stack

| Layer | Tech |
|---|---|
| Backend API | FastAPI (Python 3.12+) |
| Database | PostgreSQL 16 (`pg_cron`, `SKIP LOCKED` queue) |
| ORM | SQLAlchemy 2.0 + Alembic |
| Auth | Firebase Auth (Google OAuth) via `firebase-admin` |
| AI | Google Gemini 2.5 Flash via [PydanticAI](https://ai.pydantic.dev/) |
| Real-time | In-memory pub/sub dispatcher → SSE (web) + WebSocket (mobile) |
| Frontend | React 18 + TypeScript + Vite + Zustand + TanStack Query |
| Component showcase | ladle |
| API types | openapi-typescript + openapi-fetch |
| Hosting | Railway (API + Postgres + Volume + static SPA) |
| Python deps | uv |
| Testing | pytest + Vitest + Playwright |

## Configuration

The backend reads settings from environment variables (prefix `GASTIFY_`):

| Variable | Purpose | Default |
|---|---|---|
| `GASTIFY_DATABASE_URL` | Database connection string | `sqlite+aiosqlite:///../.tmp/local/gastify.db` |
| `GASTIFY_FIREBASE_PROJECT_ID` | Firebase project for auth | (required) |
| `GOOGLE_API_KEY` | Google AI API key for receipt extraction when `GASTIFY_SCAN_PROVIDER=gemini` | (required for Gemini) |
| `GASTIFY_GEMINI_MODEL` | Gemini model name | `gemini-2.5-flash-lite` |
| `GASTIFY_GEMINI_MAX_RETRIES` | Max retries on transient AI errors | `3` |
| `GASTIFY_RECEIPT_EXTRACTION_PROMPT_ID` | Active receipt extraction prompt registry id | `receipt-extraction-current` |
| `GASTIFY_STATEMENT_EXTRACTION_PROMPT_ID` | Active statement extraction prompt registry id | `statement-extraction-current` |
| `GASTIFY_ITEM_CATEGORIZATION_PROMPT_ID` | Active item categorization prompt registry id | `item-categorization-current` |
| `GASTIFY_STORE_CATEGORIZATION_PROMPT_ID` | Active store categorization prompt registry id | `store-categorization-current` |
| `GASTIFY_ENVIRONMENT` | Runtime lane (`local`, `staging`, `staging-e2e`, `production`) | `local` |
| `GASTIFY_SCAN_PROVIDER` | Scan provider (`mock`, `fixture`, `gemini`) | `mock` |
| `GASTIFY_STATEMENT_PROVIDER` | Statement provider (`auto`, `gemini`, `codex-pdf-text`, `fixture`) | `auto` |
| `GASTIFY_STATEMENT_RECONCILIATION_DATE_TOLERANCE_DAYS` | Statement-to-receipt date tolerance | `3` |
| `GASTIFY_STATEMENT_RECONCILIATION_AMOUNT_TOLERANCE_RATIO` | Statement-to-receipt amount tolerance ratio | `0.01` |
| `GASTIFY_STATEMENT_RECONCILIATION_MERCHANT_SIMILARITY_THRESHOLD` | Fuzzy merchant matching threshold | `0.72` |
| `GASTIFY_SCAN_TEST_CONTROLS_ENABLED` | Enables guarded direct scan test-case endpoints outside production | `false` |
| `GASTIFY_SCAN_EVENT_BUFFER_SIZE` | Backpressure buffer per SSE/WS subscriber (drop-oldest) | `32` |
| `GASTIFY_SCAN_EVENT_HEARTBEAT_INTERVAL_S` | Heartbeat keepalive interval for streaming connections | `15` |

## Architecture Highlights

- **Async scan pipeline:** Postgres IS the queue (`SELECT ... FOR UPDATE SKIP LOCKED`). No Celery, no Redis.
- **Structured AI output:** PydanticAI `output_type` on Gemini calls — malformed JSON rejected at parse time, not DB write time.
- **Credit atomicity:** `user_credits` update + `pending_scans` insert in one transaction; failure refunds atomically.
- **Feature isolation:** scan module and editor module communicate via events, never direct action imports (LESSONS R2).
- **View-only offline:** TanStack Query `persistQueryClient` + IndexedDB. Writes gated online.
- **90-day edit window:** transactions older than 90 days are immutable; enforced at API middleware.

## Next Step

Provision Railway `staging-e2e` and `staging`, then run the S23 fixture
gate and live Gemini smoke documented in
[`docs/runbooks/STAGING-TESTING.md`](docs/runbooks/STAGING-TESTING.md).

## Local Backend

For fast local UI/API iteration without Docker or Gemini credentials:

```bash
bash scripts/dev/start-local.sh
```

This uses SQLite plus the mock scan provider. The backend refuses `local`
with Gemini or Postgres. It is not valid evidence for Postgres migrations, RLS,
concurrency, or runtime Exec/Review closure.

## Runtime Runbooks

- [`docs/runbooks/LOCAL.md`](docs/runbooks/LOCAL.md)
- [`docs/runbooks/RAILWAY-STAGING-SETUP.md`](docs/runbooks/RAILWAY-STAGING-SETUP.md)
- [`docs/runbooks/STAGING-TESTING.md`](docs/runbooks/STAGING-TESTING.md)
- [`docs/runbooks/PRODUCTION-CHECKLIST.md`](docs/runbooks/PRODUCTION-CHECKLIST.md)

## Prompt Lab

- Receipt prompt-lab workflow: [`prompt-testing/README.md`](prompt-testing/README.md)
- Statement prompt-lab workflow: [`prompt-testing/STATEMENT-PIPELINE.md`](prompt-testing/STATEMENT-PIPELINE.md)

## License

TBD.
