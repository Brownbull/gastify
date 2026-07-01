# Gastify Web

Responsive web portal for the Gastify expense tracker. Connects to the FastAPI backend for AI receipt scanning, transaction management, and multi-currency analytics.

## Tech Stack

- **React 19** + TypeScript (strict mode)
- **Vite 8** with Tailwind CSS 4
- **TanStack Router** — file-based routing
- **TanStack Query v5** — server state with 5m stale time
- **Zustand** — scoped client stores
- **Firebase Auth** — Google OAuth sign-in
- **openapi-fetch** — typed API client generated from backend spec

## Setup

```bash
# Install dependencies
npm install

# Copy environment variables. Prefer the environment-specific template.
cp .env.local.example .env.local
```

Fill in the copied `.env.local` with your Firebase project credentials:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_API_BASE_URL=              # optional — defaults to "/" (uses Vite proxy in dev)
```

Other templates / env files:

- `.env.prod-e2e` (gitignored) — points `VITE_API_BASE_URL` at the **production API** and enables the disposable test-auth users. Used by "Option A" below and by the Playwright suite. Ask a maintainer for it.
- `.env.staging.example` for the Railway staging SPA.
- `.env.staging-e2e.example` for local/debug web runs against the deterministic fixture API.
- `.env.production.example` for future production provisioning.

## Development — spin up the local server

There are two ways to run the web app locally.

### Option A — against production (quick; no local backend) — recommended

Local UI → the **production API**, with the gated test-auth path enabled. This is
the day-to-day mode (production-direct policy): nothing to run but the web server.

```bash
cd web
npx vite --mode prod-e2e --port 5174 --strictPort
# → http://localhost:5174
```

- The port **must be 5174** — it is the CORS-allowed origin on the production API.
- Requires the gitignored `web/.env.prod-e2e` (see Setup above).
- Sign in from `/sign-in` with the **test-auth buttons** (disposable users A / B) —
  no Google sign-in needed. User B carries demo data for data-rich screens.

### Option B — full local stack (local backend + database)

Local UI → a **local backend** on `:8000`.

```bash
# 1. start the backend (from the repo root)
cd backend && uv run uvicorn app.main:app --reload    # → http://localhost:8000

# 2. start the web dev server (in another shell)
cd web && npm run dev                                 # → http://localhost:5173
```

With `VITE_API_BASE_URL` unset (base URL `/`), the dev server proxies `/api` to
`http://localhost:8000` (see `server.proxy` in `vite.config.ts`). Set it in
`.env.local` to target a different backend.

### Other commands

```bash
npm run lint      # eslint
npm run build     # tsc -b + vite build — the REAL type-check.
                  # (npx tsc --noEmit is a no-op here: the root tsconfig uses
                  #  project references, so `npm run build` / `tsc -b` is the gate.)
npm run test      # vitest
```

## API Client Regeneration

When backend endpoints change, regenerate the typed API client:

```bash
npm run generate:api
```

This extracts the OpenAPI spec from the running backend and generates `src/lib/api-types.d.ts`.

## Project Structure

```
src/
  components/     UI components (AppLayout, ProtectedRoute)
  hooks/          React hooks (useAuth)
  lib/            API client, Firebase config, query client, generated types
  routes/         TanStack Router file-based routes
  stores/         Zustand stores (uiStore)
  styles/         Global CSS with theme custom properties
```
