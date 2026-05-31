# Web app e2e — scan progress over SSE

Real-browser proof of the desktop web app's scan/statement **progress journey over SSE**,
the accessible runtime-evidence surface for the progress-delivery case (the web uses
`EventSource`, which works through Railway's edge — unlike the mobile WebSocket, it is
unaffected by the WS-403 bug; see ADR D62).

Runs a real Chromium with a real `EventSource` consuming the real SSE stream from the
deployed **staging-e2e** backend (`environment=staging-e2e` → **fixture** scan provider,
**no Gemini, $0, deterministic**). No local backend needed.

## Run

```bash
# from repo root
npm run test:web-e2e
# or: npx playwright test --config=tests/web-e2e/playwright.config.ts
```

## One-time setup

Create the gitignored `web/.env.staging-e2e` with the disposable test-auth creds (the
public Firebase config is pinned in `playwright.config.ts` so it can't be shadowed):

```
VITE_E2E_AUTH_ENABLED=true
VITE_E2E_AUTH_EMAIL=<disposable staging-e2e user email>
VITE_E2E_AUTH_PASSWORD=<disposable staging-e2e user password>
```

The web's gated `signInWithTestAuth` path (only active when `!import.meta.env.PROD` AND
`VITE_E2E_AUTH_ENABLED=true`) signs in via email/password, avoiding the Google-OAuth popup.

## Gotchas (learned the hard way)

- **Shell-profile `VITE_*` vars shadow `.env` files.** Vite lets real `process.env` win over
  `.env`. A dev shell exporting `VITE_FIREBASE_*` for another project (e.g. legacy
  `boletapp-d609f`) silently points the app at the wrong Firebase project →
  `INVALID_LOGIN_CREDENTIALS`. The config pins the gastify-staging Firebase config in
  `webServer.env` to neutralize this.
- **gastify-staging Firebase** had Email-Enumeration-Protection / reCAPTCHA enforcement that
  can block web-client password sign-in. If it's re-enabled and auth starts failing, switch
  the harness to `signInWithCustomToken` (mint via the staging admin SDK — no reCAPTCHA).
- The completed result renders **"Scan Complete" + merchant/total** (detailed view), not the
  simple "processed" copy — assert on `Scan Complete` / the merchant.
