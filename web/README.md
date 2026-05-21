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

Other templates:

- `.env.staging.example` for the Railway staging SPA.
- `.env.staging-e2e.example` for local/debug web runs against the deterministic fixture API.
- `.env.production.example` for future production provisioning.

## Development

```bash
# Start dev server (port 5173, proxies /api to localhost:8000)
npm run dev

# Lint
npm run lint

# Type-check + build
npm run build
```

The dev server proxies `/api` requests to `http://localhost:8000`. Start the backend first:

```bash
cd ../backend && uv run uvicorn app.main:app --reload
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
