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
| `LICENSE*` | License file | MVP |
| `.gitignore` | Git ignore | MVP |
| `docs/**/*.md` | Project documentation | MVP |
| `tests/**/*.{py,ts,tsx,js,jsx}` | Test files | MVP |
| `scripts/**/*.{sh,py}` | Utility scripts | MVP |

### Agent App (Python + FastAPI + PydanticAI + React + Bun + Postgres)

| Pattern | Description | Tier |
|---------|-------------|------|
| `api/main.py` | FastAPI entry | MVP |
| `api/config.py` | Settings | MVP |
| `api/database.py` | DB session/engine | MVP |
| `api/types.py` | Shared enums/constants | MVP |
| `api/routes/*.py` | HTTP handlers (thin) | MVP |
| `api/models/*.py` | SQLAlchemy ORM | MVP |
| `api/schemas/*.py` | Pydantic request/response | MVP |
| `api/services/*.py` | Business logic (no FastAPI/agent imports) | MVP |
| `api/agents/*.py` | PydanticAI agent definition | MVP |
| `api/guardrails/*.py` | Prompt-injection, validation, moderation | MVP |
| `api/integrations/*.py` | External service adapters | E |
| `api/context/*.py` | Context engineering | E |
| `api/observability/*.py` | Tracing, metrics, logging | E |
| `web/src/pages/*.tsx` | Route-level components | MVP |
| `web/src/components/**/*.tsx` | Shared UI components | MVP |
| `web/src/lib/*.ts` | Client utilities (api, fetcher) | MVP |
| `web/src/hooks/*.ts` | React hooks | MVP |
| `web/src/stores/*.ts` | State management | E |
| `web/public/**` | Static assets | MVP |
| `docker/**` | Dockerfiles + compose | MVP |
| `infra/**` | Deployment configs | E |
| `pyproject.toml` | Python deps | MVP |
| `web/package.json` | Frontend deps | MVP |
| `docker-compose.yml` | Local dev stack | MVP |

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
