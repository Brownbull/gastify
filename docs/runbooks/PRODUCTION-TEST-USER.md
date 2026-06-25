# Production Test User (smoke-test login)

Lets a **disposable test account** log in to the live production deployment with
email/password, so you can smoke-test production without standing the
[`staging`/`staging-e2e` lanes](RAILWAY-STAGING-TEARDOWN.md) back up.

Default **OFF**: production looks exactly as today (Google sign-in only) until you
explicitly enable the flag.

> **Firebase project note (verified 2026-06-25):** production verifies tokens
> against `GASTIFY_FIREBASE_PROJECT_ID = gastify-staging` — i.e. **production
> currently reuses the `gastify-staging` Firebase project**, not a dedicated one.
> So the local staging Admin SDK key (`.secrets/gastify-staging-admin.json`)
> manages production users, and Email/Password is already enabled. (Future
> hardening: give production its own isolated Firebase project.)

## How it works

- The production backend already verifies **any** valid Firebase ID token from
  the configured Firebase project and just-in-time provisions the user
  (`backend/app/auth/deps.py`). A test user is a **real Firebase account**, not a
  token bypass — there is no backend change and no weakened auth.
- The web sign-in screen shows an email/password form **only** when
  `VITE_PROD_TEST_AUTH_ENABLED === "true"`
  ([`web/src/lib/prodTestAuth.ts`](../../web/src/lib/prodTestAuth.ts)). This is a
  deliberately separate path from the e2e test-auth, which is compiled out of
  production builds.
- No credentials ship in the bundle — the tester types email + password into the
  form.

## One-time setup

### 1. Enable Email/Password (already done)

Email/Password is enabled on the `gastify-staging` Firebase project (it backed
e2e there and is the project production reuses). Google is already enabled too.

### 2. Create the test account

Either from the Firebase console (Authentication → Users → Add user) **or**
reproducibly via the Admin SDK script (preferred — it reuses the local staging
admin key):

```bash
cd backend
GASTIFY_FIREBASE_PROJECT_ID=gastify-staging \
GASTIFY_FIREBASE_CREDENTIALS_PATH=../.secrets/gastify-staging-admin.json \
GASTIFY_PROD_TEST_EMAIL=prod-test@gastify.test \
GASTIFY_PROD_TEST_PASSWORD='<choose-a-strong-password>' \
uv run python ../scripts/ops/setup-production-test-user.py --execute
```

Without `--execute` it dry-runs. Pass `--reset-password` to rotate the password
of an existing account. Record the credentials in your secret store — they are
**not** committed and **not** bundled (the tester types them into the form).

### 3. Provision the production web service

> **Verified 2026-06-25:** `gastify-web-production` had **no app variables** — it
> was a guarded placeholder. The production *API* is provisioned, but the web
> frontend needs its full `VITE_*` set before any login (Google or test) works.
> Because prod reuses the `gastify-staging` Firebase project, the web config from
> `web/.env.staging-e2e` can be reused verbatim.

Set on `gastify-web-production` (then redeploy — `VITE_*` is inlined at **build
time** via `web/Dockerfile`):

```text
VITE_API_BASE_URL=https://gastify-api-production-production.up.railway.app
VITE_FIREBASE_API_KEY=<gastify-staging web api key>
VITE_FIREBASE_AUTH_DOMAIN=<gastify-staging auth domain>
VITE_FIREBASE_PROJECT_ID=gastify-staging
VITE_FIREBASE_STORAGE_BUCKET=<gastify-staging storage bucket>
VITE_FIREBASE_MESSAGING_SENDER_ID=<gastify-staging sender id>
VITE_FIREBASE_APP_ID=<gastify-staging web app id>
VITE_PROD_TEST_AUTH_ENABLED=true
```

### 4. Allow the web origin in the API CORS

The prod API `GASTIFY_CORS_ORIGINS` must include the prod web origin or browser
calls fail. Add it and redeploy the API:

```text
GASTIFY_CORS_ORIGINS=["https://gastify-web-production-production.up.railway.app","http://localhost:5173","http://localhost:5174"]
```

> Email/password sign-in (`signInWithEmailAndPassword`) does **not** require the
> web domain to be in Firebase "Authorized domains" — that only gates OAuth
> popup/redirect (Google). So the test login works without touching authorized
> domains; add the prod web domain there only if you also want Google sign-in.

### 5. Log in

Open the production sign-in page. Below "Sign in with Google" an email/password
form now appears. Enter the test credentials → you're in.

## Disable when done

Set `VITE_PROD_TEST_AUTH_ENABLED=false` (or remove it) on `gastify-web-production`
and redeploy. The form disappears. Optionally delete the test user in the
Firebase console.

## Notes & limits

- **Scans cost real money in production.** New users JIT-provision with **0 scan
  credits**, so the test user can browse the app but cannot run a Gemini scan
  until credits are granted. Granting credits is a direct write to the production
  Postgres (`credit_balances`) — see the credit logic in
  [`scripts/staging/seed-staging.py`](../../scripts/staging/seed-staging.py) for
  reference. Only grant credits when you intend to pay for live Gemini calls.
- **Isolation.** The test user is RLS-scoped like any user — it only sees its own
  data and cannot read other users' data.
- **Keep it off by default.** Leave the flag unset in normal production; enable it
  only for a smoke window, then turn it back off.

## Related

- [`RAILWAY-STAGING-TEARDOWN.md`](RAILWAY-STAGING-TEARDOWN.md) — dropping/restoring
  the staging lanes (why you'd smoke against prod instead).
- [`ENVIRONMENTS.md`](ENVIRONMENTS.md) — the overall lane model.
