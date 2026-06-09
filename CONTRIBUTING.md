# Contributing to Gastify

Welcome! This guide walks you through the project from scratch — what it is,
how to get a local environment running, how to run the tests, and how to
contribute a change safely.

---

## What is Gastify?

Gastify is a Chilean smart expense tracker. The core loop:

1. **Scan a receipt** — take a photo or upload a file; Gemini (Google's vision
   AI) extracts every line item.
2. **Categorize** — items are mapped to an 86-category taxonomy; the backend
   runs a math-reconciliation gate before persisting.
3. **Reconcile statements** — upload a PDF bank/credit-card statement; the
   backend matches statement lines against your stored receipts.
4. **Analyze** — dashboards and reports show your spending by store, category,
   time period, and currency (CLP + USD shadow totals).

It is a **rebuild** of [BoletApp](https://github.com/Brownbull/gmni_boletapp)
on a production-grade stack: FastAPI + PostgreSQL + React web + React Native
mobile (Android proven; iOS deferred).

---

## Repository layout

```
gastify/
├── backend/         FastAPI API — owns all data, auth, AI pipelines
├── web/             React 19 + Vite SPA (primary web portal)
├── mobile/          Expo + React Native app (Android)
├── docs/            Architecture docs, runbooks, gravity-well deep-dives
├── tests/           Shared test harness (Playwright E2E, Maestro mobile flows)
├── scripts/         Dev helpers (start-local, smoke test, migrations)
├── prompt-testing/  AI prompt lab (receipt + statement pipeline)
├── .kdbp/           KDBP project memory (plan, decisions, structure, etc.)
└── infra/           Deployment notes (Railway)
```

The backend and both clients each have their own `package.json` / `pyproject.toml`.
There is no top-level build that spans them — run commands inside the relevant
sub-directory.

---

## Architecture in one paragraph

Three surfaces share one backend contract. The **backend** (FastAPI on Postgres)
owns every piece of data under row-level security — it decides what each user
can read and write. The **web portal** and **mobile app** are thin clients that
call the backend over HTTP/WebSocket and render what they receive. Neither client
holds business logic the backend doesn't also enforce. A single OpenAPI spec
(generated from the running backend) provides compile-time types for both
clients via `openapi-typescript`.

Full map: [`docs/architecture.md`](docs/architecture.md)  
Per-subsystem deep dives: [`docs/wells/`](docs/wells/)

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | ≥ 3.12 | Backend runtime |
| [uv](https://docs.astral.sh/uv/) | latest | Python dep management |
| Node.js | ≥ 20 LTS | Web + mobile dev tools |
| npm | bundled with Node.js | Web + mobile deps |
| Git | any recent | Version control |

**External services** (required for full functionality, not for the mock local loop):

| Service | Why needed |
|---------|-----------|
| Firebase project | Authentication (Google OAuth) |
| Google AI API key | Gemini receipt/statement extraction |

For the fastest local loop you need **only Python + uv + Node.js** — the backend
starts in `mock` + SQLite mode and the web dev server proxies to it.

---

## Local development setup

### 1. Clone and enter the repo

```bash
git clone https://github.com/Brownbull/gastify.git
cd gastify
```

### 2. Start the backend (mock + SQLite, no credentials needed)

```bash
bash scripts/dev/start-local.sh
```

This script:
- Sets `GASTIFY_ENVIRONMENT=local`, `GASTIFY_SCAN_PROVIDER=mock`, and
  `GASTIFY_DATABASE_URL=sqlite+aiosqlite:///.tmp/local/gastify.db`.
- Runs `uv` to install Python deps the first time (reads `backend/pyproject.toml`).
- Applies Alembic migrations to the local SQLite database.
- Starts the backend at **http://localhost:8000**.

Interactive API docs are available at `http://localhost:8000/api/docs` in local
mode. The backend **refuses** to start if `local` is combined with a real Postgres
URL or Gemini — this enforces the environment policy.

To reset the local database:

```bash
rm -rf .tmp/local
bash scripts/dev/start-local.sh
```

### 3. Start the web portal

In a second terminal:

```bash
cd web
npm install
cp .env.local.example .env.local
# Fill in VITE_FIREBASE_* vars if you want real auth;
# leave them empty to use the backend's local auth bypass.
npm run dev
```

The web dev server starts at **http://localhost:5173** and proxies `/api` to the
backend. You can browse the app without Firebase credentials — the backend's local
mode accepts a test identity injected by the smoke script.

### 4. (Optional) Start the mobile app

```bash
cd mobile
npm install
cp .env.local.example .env.local
# Fill in EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:8000  (Android emulator)
# or point to a Railway staging URL for a physical device.
npm run generate:api   # generate typed API client from the running backend
npm start              # starts Expo Metro bundler
```

See [`mobile/README.md`](mobile/README.md) and
[`mobile/ANDROID_E2E_SETUP.md`](mobile/ANDROID_E2E_SETUP.md) for the physical
Samsung S23 Maestro lane.

---

## Running the tests

### Backend (pytest)

```bash
cd backend
uv run pytest
```

The test suite runs against SQLite by default. Coverage is at
`backend/tests/` — organized by domain (`test_scans.py`, `test_insights.py`,
`test_group_isolation.py`, etc.).

Type-check:

```bash
cd backend
uv run mypy app
```

### Web (Vitest)

```bash
cd web
npm run build          # type-check + build (catches type errors)
npm test               # or: npx vitest
```

Test files live alongside the routes they cover: `web/src/routes/-scan.test.tsx`,
`-reports.test.tsx`, etc.

### Mobile (Jest / React Native Testing Library)

```bash
cd mobile
npm run typecheck
npm test
```

### End-to-end (Playwright — web)

```bash
npm install            # root — installs Playwright
npx playwright test    # runs web E2E against a locally served app
```

Playwright config is at `playwright.config.ts` at the root. The web E2E specs
live in `tests/web-e2e/`.

---

## Project structure walkthrough

Gastify's architecture is organized into **gravity wells** — numbered subsystems
(G1–G7) that each own a distinct slice. The wells are the unit of ownership and
are referenced in documentation, commit messages, and code comments.

| Well | Name | Files | Doc |
|------|------|-------|-----|
| G1 | API Core | `backend/app/main.py`, `backend/app/api/**` | [wells/1-api-core.md](docs/wells/1-api-core.md) |
| G2 | Data Model | `backend/app/models/**`, `backend/app/schemas/**`, `backend/alembic/**` | [wells/2-data-model.md](docs/wells/2-data-model.md) |
| G3 | Identity + Ownership | `backend/app/auth/**` | [wells/3-identity-ownership.md](docs/wells/3-identity-ownership.md) |
| G4 | Scan Pipeline | `backend/app/agents/**`, `backend/app/services/scan*`, `backend/app/prompts/**` | [wells/4-scan-pipeline.md](docs/wells/4-scan-pipeline.md) |
| G5 | Integrations | `backend/app/services/fx.py`, `backend/app/services/provider_retry.py` | [wells/5-integrations.md](docs/wells/5-integrations.md) |
| G6 | Web Portal | `web/**` | [wells/6-web-portal.md](docs/wells/6-web-portal.md) |
| G7 | Mobile App | `mobile/**` | [wells/7-mobile-app.md](docs/wells/7-mobile-app.md) |

**Key backend files to read first:**

- `backend/app/config.py` — all `GASTIFY_*` environment variables in one place.
- `backend/app/main.py` — FastAPI app factory; 11 routers registered here.
- `backend/app/models/` — SQLAlchemy ORM; `OwnershipScope` is the root tenant row.
- `backend/app/auth/middleware.py` — Firebase token verification + RLS GUC injection.

**Key web files to read first:**

- `web/src/main.tsx` — React entry and TanStack Router setup.
- `web/src/lib/api-client.ts` — generated OpenAPI-fetch client.
- `web/src/stores/uiStore.ts` — Zustand store; `activeScope` toggles personal/group context.
- `web/src/routes/` — one file per route (TanStack Router file-based routing).

---

## Environment variables

The backend reads all settings from `GASTIFY_*` environment variables. A full
reference is in [README.md](README.md#configuration). The most important ones
for local development:

| Variable | Local default | Notes |
|----------|--------------|-------|
| `GASTIFY_ENVIRONMENT` | `local` | Enforces SQLite + mock scan |
| `GASTIFY_SCAN_PROVIDER` | `mock` | `mock` skips Gemini; `fixture` returns deterministic JSON; `gemini` is real AI |
| `GASTIFY_DATABASE_URL` | SQLite in `.tmp/` | Auto-set by `start-local.sh` |
| `GASTIFY_FIREBASE_PROJECT_ID` | (unset in local) | Required in staging/production |

Copy the relevant `.env.*.example` file to set custom values:

```bash
cp backend/.env.local.example backend/.env.local
```

---

## Contribution workflow

### Branches

Create a feature branch from `main`:

```bash
git checkout -b your-username/short-description
```

### Commit quality gate

This project uses the `/gabe-commit` KDBP command as a pre-commit gate that
runs 9 checks (secrets scan, type errors, test failures, structural drift, doc
drift, etc.). **Do not use `git commit` directly** — it bypasses the gate.

When working outside the Claude Code / KDBP workflow, run these checks manually
before committing:

```bash
# Backend
cd backend && uv run ruff check . && uv run mypy app && uv run pytest

# Web
cd web && npm run build && npm test

# Mobile
cd mobile && npm run typecheck && npm test
```

Never commit:
- `.env` files (use `.env.*.example` templates instead)
- `node_modules/`, `__pycache__/`, `*.pyc`, `.tmp/` (see `.gitignore`)
- Secrets, credentials, or API keys

New file locations must match a pattern in [`.kdbp/STRUCTURE.md`](.kdbp/STRUCTURE.md).

### Pull requests

- Target `main`.
- Keep PRs focused — one gravity-well change at a time when possible.
- Runtime-gated changes (auth, DB, upload, streaming, native mobile) require
  staging proof before merging. See [`.kdbp/BEHAVIOR.md`](.kdbp/BEHAVIOR.md) (B2).

### Database migrations

```bash
cd backend
# Create a new migration after editing models/
uv run alembic revision --autogenerate -m "describe the change"

# Apply migrations
uv run alembic upgrade head
```

Migrations live in `backend/alembic/versions/`. Never edit a migration that has
already been applied in a deployed environment — always add a new one.

---

## Where to go deeper

| Resource | What it covers |
|----------|---------------|
| [`docs/architecture.md`](docs/architecture.md) | System overview, request flow, cross-cutting invariants, data model, deploy flow |
| [`docs/wells/`](docs/wells/) | Per-subsystem deep dives (G1–G7) |
| [`docs/runbooks/LOCAL.md`](docs/runbooks/LOCAL.md) | Local runtime details, mock receipts, smoke test |
| [`docs/runbooks/ENVIRONMENTS.md`](docs/runbooks/ENVIRONMENTS.md) | Environment-gated development model (local → staging-e2e → staging → production) |
| [`docs/rebuild/LESSONS.md`](docs/rebuild/LESSONS.md) | 13 rules derived from the BoletApp prototype — what not to repeat |
| [`.kdbp/DECISIONS.md`](.kdbp/DECISIONS.md) | Architecture decision records (D1–D81+) with rationale |
| [`.kdbp/PLAN.md`](.kdbp/PLAN.md) | Active implementation plan with phase/task status |
| [`prompt-testing/README.md`](prompt-testing/README.md) | AI prompt lab — how to test and improve receipt/statement extraction |
| [`web/README.md`](web/README.md) | Web portal setup and API client regeneration |
| [`mobile/README.md`](mobile/README.md) | Mobile app setup, native auth storage, statement scanning |
