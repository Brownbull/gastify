# Project Structure Standard

<!-- The allowed locations for new files in this project. -->
<!-- Used by gabe-commit CHECK 9, gabe-assess structural drift, and the PostToolUse structure-warning hook. -->
<!-- Format: glob pattern + description + maturity tag (MVP / Enterprise [E] / Scale [S]). -->
<!-- Maintenance: edit as the project evolves. gabe-commit's `update-structure` action can add patterns inline. -->

## Maturity

<!-- Which tier applies to this project right now. Reads from .kdbp/BEHAVIOR.md if unset. -->
**Current:** mvp

## Allowed Patterns

<!-- Globs match against git-staged new files. A file that matches NO pattern is a finding. -->

| Pattern | Description | Tier |
|---------|-------------|------|
| `.kdbp/**` | KDBP state (PLAN, KNOWLEDGE, PENDING, LEDGER, DECISIONS, etc.) | MVP |
| `README.md` | Project readme | MVP |
| `CLAUDE.md` | Claude Code session-start instructions (managed by /gabe-init) | MVP |
| `LICENSE*` | License file | MVP |
| `.gitignore` | Git ignore | MVP |
| `docs/**/*.md` | Project documentation | MVP |
| `tests/**/*.{py,ts,tsx,js,jsx}` | Test files | MVP |
| `scripts/**/*.{sh,py}` | Utility scripts | MVP |

### Backend (FastAPI + SQLAlchemy + Alembic + Firebase Auth)

<!-- Actual layout: backend/ prefix with app/ for source, alembic/ for migrations, tests/ for pytest. -->

| Pattern | Description | Tier |
|---------|-------------|------|
| `backend/pyproject.toml` | Python deps + tool config | MVP |
| `backend/app/main.py` | FastAPI entry | MVP |
| `backend/app/config.py` | Settings (pydantic-settings) | MVP |
| `backend/app/*.py` | Top-level app modules (logging, observability, middleware, i18n) | MVP |
| `backend/app/api/*.py` | HTTP route handlers | MVP |
| `backend/app/auth/*.py` | Firebase auth middleware + dependency injection | MVP |
| `backend/app/models/*.py` | SQLAlchemy ORM models | MVP |
| `backend/app/schemas/*.py` | Pydantic request/response schemas | MVP |
| `backend/app/services/*.py` | Business logic (no FastAPI imports) | MVP |
| `backend/app/agents/*.py` | PydanticAI agent definitions | MVP |
| `backend/app/guardrails/*.py` | Prompt-injection, validation, moderation | MVP |
| `backend/app/integrations/*.py` | External service adapters | E |
| `backend/alembic/*.py` | Alembic env + config | MVP |
| `backend/alembic/versions/*.py` | Database migrations | MVP |
| `backend/tests/*.py` | Pytest test files | MVP |
| `backend/tests/**/*.py` | Nested test modules | MVP |

### Frontend Web (React + Vite + Zustand + TanStack Query)

<!-- Template patterns — activate when web/ directory is created. -->

| Pattern | Description | Tier |
|---------|-------------|------|
| `web/src/pages/*.tsx` | Route-level components | MVP |
| `web/src/components/**/*.tsx` | Shared UI components | MVP |
| `web/src/lib/*.ts` | Client utilities (api, fetcher) | MVP |
| `web/src/hooks/*.ts` | React hooks | MVP |
| `web/src/stores/*.ts` | State management | E |
| `web/public/**` | Static assets | MVP |
| `web/package.json` | Frontend deps | MVP |

### Infrastructure

| Pattern | Description | Tier |
|---------|-------------|------|
| `docker/**` | Dockerfiles + compose | MVP |
| `docker-compose.yml` | Local dev stack | MVP |
| `infra/**` | Deployment configs | E |

### UX Mockups (design-system + HTML prototypes)

<!-- Design-phase artifacts for P1–P13 of the mockups plan. Web + mobile variants land here. -->

| Pattern | Description | Tier |
|---------|-------------|------|
| `docs/mockups/**/*.html` | HTML mockups (web + mobile variants) | MVP |
| `docs/mockups/**/*.json` | design tokens + metadata (tokens.json, HANDOFF.json, etc.) | MVP |
| `docs/mockups/**/*.css` | stylesheets + shared tokens.css | MVP |
| `docs/mockups/**/*.js` | interactive prototype JS + tweaks.js panel driver | MVP |
| `docs/mockups/**/*.svg` | icons + vector assets | MVP |
| `docs/mockups/**/*.{png,jpg,jpeg,webp,gif}` | raster assets | MVP |
| `docs/mockups/**/*.woff2` | self-hosted web fonts | MVP |
| `docs/mockups/**/*.prompt` | Claude-input design specs (style prompts for frontend-design skill / external render pass) | MVP |
| `docs/mockups/**/*.md` | mockup governance docs (INDEX.md, AUDIT.md, HANDOFF.md, SCREEN-SPECS.md, COMPONENT-LIBRARY.md, DESKTOP-TEMPLATE.md, PLATFORM-NOTES.md, STRESS-TEST-SPEC.md, README.md) | MVP |

### Mockup Test Harness (Playwright at repo root)

<!-- Mockup-phase test infra. Repo has no application code yet, so test config sits at root. Reconsider when backend phase activates and a per-app structure emerges. -->

| Pattern | Description | Tier |
|---------|-------------|------|
| `package.json` | Root npm manifest for mockup test deps (Playwright, http-server) | MVP |
| `package-lock.json` | npm lockfile (committed for reproducible installs) | MVP |
| `playwright.config.ts` | Playwright config (web server + project setup for mockup specs) | MVP |
| `tests/legacy-extract/**/*.ts` | Legacy boletapp extraction harness (one-shot DOM scrape) | MVP |

### Frontend (React + Vite + TS — port of BoletApp)

<!-- Operational React app under frontend/. Mocked Firebase backend (src/__firebase-mocks__/). Tailwind 4 + theme tokens via src/styles/global.css (migrated 2026-04-28 from CDN per Ladle pivot Phase 1). Phase 2 of the pivot will add frontend/.ladle/ for the showcase tool. Source-of-truth for the L-block extraction (mockups-legacy/). -->

| Pattern | Description | Tier |
|---------|-------------|------|
| `frontend/index.html` | Vite entry HTML | MVP |
| `frontend/package.json` | Frontend deps | MVP |
| `frontend/package-lock.json` | npm lockfile | MVP |
| `frontend/tsconfig.json` | TypeScript config | MVP |
| `frontend/tsconfig.node.json` | TypeScript Node config (Vite tooling) | MVP |
| `frontend/vite.config.ts` | Vite config | MVP |
| `frontend/*.md` | Package-level docs (STORIES.md, future CONTRIBUTING.md / CHANGELOG.md, etc.) | MVP |
| `frontend/src/main.tsx` | React entry | MVP |
| `frontend/src/App.tsx` | App root | MVP |
| `frontend/src/sw.ts` | Service worker (PWA via VitePWA) | MVP |
| `frontend/src/vite-env.d.ts` | Vite type defs | MVP |
| `frontend/src/**/*.{ts,tsx}` | Source code (components, features, views, hooks, services, repositories, entities, contexts, managers, etc.) | MVP |
| `frontend/src/**/*.css` | Stylesheets (global.css + future per-component CSS) | MVP |
| `frontend/src/__firebase-mocks__/**/*.ts` | Mocked Firebase SDK shims (alias-redirected from `firebase/*` in vite.config.ts) | MVP |
| `frontend/public/**` | Static assets (favicons, PWA manifest icons) | MVP |
| `frontend/.storybook/**` | Storybook 10 showcase config (per pivot DECISIONS D25) | MVP |
| `frontend/src/**/*.stories.tsx` | Storybook stories (CSF3) | MVP |

<!-- ### Web App (any stack)

| Pattern | Description | Tier |
|---------|-------------|------|
| `src/**/*.{ts,tsx,js,jsx}` | Application source | MVP |
| `public/**` | Static assets | MVP |
| `package.json` | Dependencies | MVP |
-->

<!-- ### CLI

| Pattern | Description | Tier |
|---------|-------------|------|
| `src/**/*.{py,go,rs,ts}` | CLI source | MVP |
| `cmd/**/*.{go,py}` | Command entrypoints | MVP |
| `pyproject.toml` | Python deps | MVP |
-->

<!-- ### Library

| Pattern | Description | Tier |
|---------|-------------|------|
| `src/**/*.{py,ts,rs,go}` | Library source | MVP |
| `api.md` / `docs/api.md` | Public API reference | MVP |
-->

## Disallowed Patterns

<!-- Explicitly rejected locations. Overrides allowed patterns. -->

| Pattern | Reason |
|---------|--------|
| `**/.env` | Secrets — use `.env.example` for templates |
| `**/node_modules/**` | Never commit dependencies |
| `**/__pycache__/**` | Build artifacts |
| `**/*.pyc` | Compiled bytecode |

## Exceptions Log

<!-- One-off exceptions granted via gabe-commit's `update-structure` or `accept` action. -->
<!-- Format: | date | file | reason | -->

| Date | File | Reason |
|------|------|--------|

## Notes

- A file that matches no allowed pattern (and no disallowed pattern) triggers a structural finding at commit time
- Tier MVP patterns apply unconditionally. `[E]` and `[S]` patterns apply only if BEHAVIOR.md maturity is at or above that tier
- If a legitimate new location emerges, add it to this table via `gabe-commit` (option `update-structure`) — don't suppress the finding by accepting every time
- The `Exceptions Log` is for genuine one-off files (e.g., a single migration script in a weird place) — if a pattern of exceptions emerges, add it as an allowed pattern instead
