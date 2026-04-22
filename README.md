# Gastify

Chilean smart expense tracker — AI receipt scanning, multi-currency analytics, PWA. Rebuild of [BoletApp](https://github.com/Brownbull/gmni_boletapp) on FastAPI + PostgreSQL + React.

## Status

**Pre-scaffold.** Planning complete, scaffolding pending.

See [`docs/rebuild/PLAN.md`](docs/rebuild/PLAN.md) for the phased implementation plan and [`docs/rebuild/LESSONS.md`](docs/rebuild/LESSONS.md) for rebuild rules derived from the prototype.

## Stack

| Layer | Tech |
|---|---|
| Backend API | FastAPI (Python 3.12+) |
| Database | PostgreSQL 16 (`pg_cron`, `SKIP LOCKED` queue) |
| ORM | SQLAlchemy 2.0 + Alembic |
| Auth | Firebase Auth (Google OAuth) via `firebase-admin` |
| AI | Google Gemini 2.5 Flash |
| Real-time | Postgres `LISTEN/NOTIFY` piped through SSE |
| Frontend | React 18 + TypeScript + Vite + Zustand + TanStack Query |
| Component showcase | ladle |
| API types | openapi-typescript + openapi-fetch |
| Hosting | Railway (API + worker + Postgres + Volume) + Vercel (frontend) |
| Python deps | uv |
| Testing | pytest + Vitest + Playwright |

## Architecture Highlights

- **Async scan pipeline:** Postgres IS the queue (`SELECT ... FOR UPDATE SKIP LOCKED`). No Celery, no Redis.
- **Structured AI output:** Pydantic `output_type` on Gemini calls — malformed JSON rejected at parse time, not DB write time.
- **Credit atomicity:** `user_credits` update + `pending_scans` insert in one transaction; failure refunds atomically.
- **Feature isolation:** scan module and editor module communicate via events, never direct action imports (LESSONS R2).
- **View-only offline:** TanStack Query `persistQueryClient` + IndexedDB. Writes gated online.
- **90-day edit window:** transactions older than 90 days are immutable; enforced at API middleware.

## Next Step

Execute PLAN.md **B0** (monorepo scaffold + tooling + CI). See [`docs/rebuild/PLAN.md`](docs/rebuild/PLAN.md#b0-monorepo-scaffold--tooling--ci-blocks-everything).

## License

TBD.
