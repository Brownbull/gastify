# Gravity Wells

Gastify's architecture is organized into **gravity wells** — numbered sections
(G1-G7) that each own a distinct slice of the system. A well is the unit of
ownership: it defines which files belong to it, what decisions were made there,
and how it connects to other wells.

The numbering is stable and referenced throughout documentation, commit
messages, and code comments.

| # | Name | One-liner | Doc |
|---|------|-----------|-----|
| G1 | [API Core](1-api-core.md) | FastAPI entry, config, DB session, routes, observability | `backend/app/main.py`, `backend/app/api/**` |
| G2 | [Data Model](2-data-model.md) | SQLAlchemy ORM, Pydantic schemas, Alembic migrations, V4 taxonomy | `backend/app/models/**`, `backend/app/schemas/**`, `backend/alembic/**` |
| G3 | [Identity + Ownership](3-identity-ownership.md) | Firebase auth, JIT provisioning, RLS scoping, consent/DSR | `backend/app/auth/**`, `backend/app/api/consent.py`, `backend/app/api/privacy.py` |
| G4 | [Scan Pipeline](4-scan-pipeline.md) | Gemini vision extraction, categorization, math gate, prompt lab | `backend/app/agents/**`, `backend/app/services/scan*`, `backend/app/prompts/**` |
| G5 | [Integrations](5-integrations.md) | External service adapters (Firebase, Gemini, FX, PDF) | `backend/app/auth/firebase.py`, `backend/app/services/fx.py`, `backend/app/services/provider_retry.py` |
| G6 | [Web Portal](6-web-portal.md) | React + Vite SPA, TanStack Router/Query, SSE scan progress | `web/**` |
| G7 | [Mobile App](7-mobile-app.md) | React Native + Expo, WebSocket scan progress, secure token storage | `mobile/**` |

## How wells relate

Wells are not isolated. Cross-well dependencies follow a gravity rule: each
well owns its domain and exposes typed contracts that other wells consume.

- **G1** wires everything together but delegates domain logic to other wells.
- **G2** defines schemas and models consumed by every backend well.
- **G3** provides auth context (user + ownership scope) used by G1 routes.
- **G4** owns the scan pipeline and calls G5 integrations for AI/FX.
- **G5** wraps every external service so no other well calls an outside API directly.
- **G6** and **G7** are frontend clients that talk to G1 over HTTP/WebSocket.

## Canonical source

The full gravity wells table with analogies, path globs, topic tracking, and
session history lives in [`.kdbp/KNOWLEDGE.md`](../../.kdbp/KNOWLEDGE.md).
These docs under `docs/wells/` are the detailed per-well reference.
