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
| `MOBILE.md` | Root mobile runbook | MVP |
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
| `backend/uv.lock` | uv lockfile (committed for reproducible installs) | MVP |
| `backend/railway.toml` | Railway backend deploy config | MVP |
| `backend/.env.example` | Backend env var template (no secrets) | MVP |
| `backend/.env.*.example` | Backend environment-specific env templates (no secrets) | MVP |
| `backend/app/main.py` | FastAPI entry | MVP |
| `backend/app/config.py` | Settings (pydantic-settings) | MVP |
| `backend/app/*.py` | Top-level app modules (logging, observability, middleware, i18n) | MVP |
| `backend/app/api/*.py` | HTTP route handlers | MVP |
| `backend/app/auth/*.py` | Firebase auth middleware + dependency injection | MVP |
| `backend/app/models/*.py` | SQLAlchemy ORM models | MVP |
| `backend/app/reference/*.py` | Shared canonical reference-data definitions | MVP |
| `backend/app/reference/*.json` | Shared reference-data policy/config payloads | MVP |
| `backend/app/schemas/*.py` | Pydantic request/response schemas | MVP |
| `backend/app/services/*.py` | Business logic (no FastAPI imports) | MVP |
| `backend/app/agents/*.py` | PydanticAI agent definitions | MVP |
| `backend/app/prompts/*.py` | Versioned production prompt registry | MVP |
| `backend/app/prompt_lab/*.py` | Backend-native receipt prompt lab CLI, adapters, cache, scoring, and runner | MVP |
| `backend/app/fixtures/**` | Backend-owned deterministic fixtures served by test-only APIs | MVP |
| `backend/app/guardrails/*.py` | Prompt-injection, validation, moderation | MVP |
| `backend/app/stagings/*.py` | External service adapters | E |
| `backend/alembic/*.py` | Alembic env + config | MVP |
| `backend/alembic/versions/*.py` | Database migrations | MVP |
| `backend/tests/*.py` | Pytest test files | MVP |
| `backend/tests/**/*.py` | Nested test modules | MVP |

### Frontend Web (React + Vite + Zustand + TanStack Router + TanStack Query)

<!-- Actual layout after Phase 1 scaffold (P3). TanStack Router uses routes/ not pages/. -->

| Pattern | Description | Tier |
|---------|-------------|------|
| `web/package.json` | Frontend deps | MVP |
| `web/package-lock.json` | npm lockfile (committed for reproducible installs) | MVP |
| `web/index.html` | Vite entry HTML | MVP |
| `web/vite.config.ts` | Vite config | MVP |
| `web/tsconfig*.json` | TypeScript configs | MVP |
| `web/eslint.config.js` | ESLint config | MVP |
| `web/.gitignore` | Web-specific git ignore | MVP |
| `web/.env.example` | Env var template (no secrets) | MVP |
| `web/.env.*.example` | Environment-specific env templates (no secrets) | MVP |
| `web/README.md` | Web app readme | MVP |
| `web/Caddyfile` | Railway static SPA server config | MVP |
| `web/nixpacks.toml` | Railway/Nixpacks static SPA build config | MVP |
| `web/.tanstack/**` | TanStack Router generated config | MVP |
| `web/src/main.tsx` | React entry | MVP |
| `web/src/routeTree.gen.ts` | TanStack Router generated route tree | MVP |
| `web/src/routes/**/*.tsx` | File-based route components (TanStack Router) | MVP |
| `web/src/components/**/*.tsx` | Shared UI components | MVP |
| `web/src/lib/*.{ts,d.ts}` | Client utilities (api client, firebase, query config) | MVP |
| `web/src/lib/*.json` | Generated specs (openapi-spec.json) | MVP |
| `web/src/hooks/*.{ts,tsx}` | React hooks (tsx for hooks with JSX context) | MVP |
| `web/src/test/**` | Vitest setup + test utilities | MVP |
| `web/src/stores/*.ts` | Zustand state stores (scoped slices) | MVP |
| `web/src/styles/*.css` | Global styles + design tokens | MVP |
| `web/src/assets/**` | Static assets (images, icons) | MVP |
| `web/public/**` | Public static assets | MVP |

### Mobile App (Expo + React Native + Firebase Auth)

<!-- Actual layout after Phase 1 scaffold (P4). Native mobile is its own app surface and shares backend contracts, not web UI components. -->

| Pattern | Description | Tier |
|---------|-------------|------|
| `mobile/package.json` | Mobile deps + scripts | MVP |
| `mobile/package-lock.json` | npm lockfile (committed for reproducible installs) | MVP |
| `mobile/app.config.ts` | Expo managed app config | MVP |
| `mobile/eas.json` | EAS build profiles for development/E2E artifacts | MVP |
| `mobile/babel.config.js` | Expo Babel config | MVP |
| `mobile/jest.config.js` | Mobile Jest/RNTL config | MVP |
| `mobile/tsconfig.json` | Mobile TypeScript config | MVP |
| `mobile/index.js` | Expo root registration entry | MVP |
| `mobile/.gitignore` | Mobile-local ignores for native service files and Expo artifacts | MVP |
| `mobile/.env.example` | Mobile env var template (no secrets) | MVP |
| `mobile/.env.*.example` | Mobile environment-specific env templates (no secrets) | MVP |
| `mobile/*.md` | Mobile package docs | MVP |
| `mobile/src/App.tsx` | Mobile app root | MVP |
| `mobile/src/components/**/*.tsx` | Shared native UI components | MVP |
| `mobile/src/navigation/**/*.tsx` | Native navigation shell | MVP |
| `mobile/src/providers/**/*.tsx` | React providers for auth/query/session | MVP |
| `mobile/src/screens/**/*.tsx` | Native screen components | MVP |
| `mobile/src/**/*.test.{ts,tsx}` | Mobile Jest/RNTL tests | MVP |
| `mobile/src/test/**` | Mobile Jest setup and test utilities | MVP |
| `mobile/src/hooks/*.{ts,tsx}` | Mobile React hooks | MVP |
| `mobile/src/lib/*.{ts,d.ts}` | Mobile client utilities (API client, auth storage, query config, generated types) | MVP |
| `mobile/src/lib/*.json` | Generated specs (openapi-spec.json) | MVP |
| `mobile/src/stores/*.ts` | Zustand state stores | MVP |
| `mobile/src/types/*.ts` | Mobile-only TypeScript types | MVP |
| `mobile/assets/**` | Mobile static assets | MVP |
| `tests/mobile/**/*.{ts,tsx,js,jsx}` | Mobile E2E/unit test harness files | MVP |
| `tests/mobile/**/*.py` | Mobile staging/test setup utilities | MVP |
| `tests/mobile/bin/*` | Mobile local tool shims for WSL/native E2E | MVP |
| `tests/mobile/**/*.sh` | Mobile test runner scripts | MVP |
| `tests/mobile/**/*.yaml` | Mobile Maestro E2E flows | MVP |
| `tests/mobile/**/*.md` | Mobile E2E docs | MVP |
| `tests/mobile/fixtures/**/*.{jpg,jpeg,png,webp}` | Mobile E2E receipt/media fixtures | MVP |

### Infrastructure

| Pattern | Description | Tier |
|---------|-------------|------|
| `docker/**` | Dockerfiles + compose | MVP |
| `docker-compose.yml` | Local dev stack | MVP |
| `infra/**` | Deployment configs | E |
| `infra/railway/**` | Railway staging/prod environment docs and service notes | MVP |

### Receipt Prompt Lab

| Pattern | Description | Tier |
|---------|-------------|------|
| `prompt-testing/README.md` | Prompt lab runbook and evidence boundary | MVP |
| `prompt-testing/RECEIPT-PIPELINE.md` | Durable receipt scan and prompt-lab pipeline map | MVP |
| `prompt-testing/STATEMENT-PIPELINE.md` | Durable statement prompt-lab pipeline map and privacy boundary | MVP |
| `prompt-testing/import-manifest.json` | Whitelist import manifest for legacy receipt corpus | MVP |
| `prompt-testing/PATTERN-CATALOG.md` | Manual receipt pattern catalog for prompt-lab coverage | MVP |
| `prompt-testing/baselines/*.json` | Versioned receipt baseline sets, coverage tags, and promotion thresholds | MVP |
| `prompt-testing/cache/.gitkeep` | Placeholder for ignored Gemini response cache | MVP |
| `prompt-testing/results/**/.gitkeep` | Placeholders for ignored prompt-lab result packets | MVP |
| `prompt-testing/test-cases/receipts/**/*.json` | Imported receipt baselines and fixtures | MVP |
| `prompt-testing/test-cases/receipts/**/*.{jpg,jpeg,png,webp}` | Imported receipt image corpus | MVP |
| `prompt-testing/test-cases/statements/manifest.json` | Sanitized statement corpus manifest with no raw PDFs or credentials | MVP |

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
| `frontend/biome.json` | Biome linter config | MVP |
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
