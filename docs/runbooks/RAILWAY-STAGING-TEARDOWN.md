# Railway Staging Teardown & Restore

Drop the `staging` and `staging-e2e` Railway environments when no deployed
backend work is happening (e.g. during pure local mockup/design phases), and
bring them back when deployed proof is needed again.

This runbook is the cost-control companion to
[`RAILWAY-STAGING-SETUP.md`](RAILWAY-STAGING-SETUP.md) (full provisioning) and
[`ENVIRONMENTS.md`](ENVIRONMENTS.md) (the lane model).

## Why drop them

Railway bills almost entirely on **memory held per minute** — and every Online
service holds memory 24/7 whether or not anyone hits it. Postgres in particular
**cannot sleep**. The Gastify project runs three Postgres databases (one per
environment) plus four API/web services, so the two staging lanes account for
the majority of the monthly bill even while idle.

During a local-only phase (mockups, design-lab/Ladle, frontend-only work) the
`staging` and `staging-e2e` lanes produce no value: they only matter when you
run deployed web/mobile smoke or the deterministic S23 fixture gate. Dropping
them is the single biggest lever and is fully reversible from this runbook.

> Need to smoke-test a real deployment while staging is down? Use the production
> test-user login instead of restoring staging — see
> [`PRODUCTION-TEST-USER.md`](PRODUCTION-TEST-USER.md).

## Snapshot at last teardown — 2026-06-25

Project `Gastify` (`7301c54a-162a-4288-a4cf-cc6f5bd4f2b1`), region **US East**.

### Dropped: `staging` (env `32976a17-6845-4960-8e48-f15b62fabbc4`)

| Resource | Type | Volume | Public URL |
|---|---|---|---|
| `gastify-api-staging` | API (Docker, `/backend`) | `gastify-api-staging-volume` | `gastify-api-staging-staging.up.railway.app` |
| `gastify-web-staging` | Web SPA (Docker, `/web`) | — | `gastify-web-staging-staging.up.railway.app` |
| `Postgres` | Postgres | `postgres-volume` | internal |

### Dropped: `staging-e2e` (env `e27fc716-1baa-4945-8a86-5c6a482a0a21`)

| Resource | Type | Volume | Public URL |
|---|---|---|---|
| `gastify-api-staging-e2e` | API (Docker, `/backend`) | `gastify-api-staging-e2e-volume` | `gastify-api-staging-e2e-staging-e2e.up.railway.app` |
| `Postgres-67_W` | Postgres | `postgres-volume-hONV` | internal |

### Kept running: `production` (env `7ad4ccb4-bf97-4a88-b11c-c715bce2000c`)

`gastify-api-production` (Online), `Postgres-b8-I` (Online),
`gastify-web-production` (Sleeping), `gastify-retention-cron` (daily `17 4 * * *`).
Production is **not** touched by this runbook.

## What is preserved vs lost on drop

| Preserved (recoverable) | Lost on drop (regenerated on restore) |
|---|---|
| Service configs — `backend/railway.toml`, `web/railway.toml` (in git) | Deployed containers + public `*.up.railway.app` URLs |
| Provisioning steps + variable templates — `RAILWAY-STAGING-SETUP.md` | Postgres volumes and **all staging/e2e DB data** (disposable seed/fixture data) |
| Staging Firebase admin key — `.secrets/gastify-staging-admin.json` (gitignored, local) | Railway-generated Postgres passwords and `DATABASE_URL`s |
| Seed scripts — `scripts/staging/seed-staging.py`, `tests/mobile/scripts/setup-staging-auth-user.py` | Environment-level Railway variables (must be re-supplied — see below) |
| Firebase web config (public) + Gemini key (your Google console) | — |

Staging data is **disposable by design** (`seed-staging.py` recreates it
deterministically), so destroying the Postgres volumes is safe. The only manual
re-entry on restore is the set of environment variables / secrets, all of which
are recoverable from the sources in the left column.

> Before dropping, confirm `.secrets/gastify-staging-admin.json` exists and that
> you can reach the staging Gemini key and Firebase web config. Everything else
> regenerates.

## Drop procedure

Deleting an environment removes all its services, volumes, data, and
environment-level variables in one step.

```bash
railway environment delete staging --yes
railway environment delete staging-e2e --yes
```

Verify only `production` remains:

```bash
railway environment list
railway status --environment production   # production unchanged
```

Expected: the project keeps a single environment (`production`) with one
Postgres, the API (Online), the web (Sleeping), and the retention cron.

## Restore procedure

Recreating the lanes is the inverse. Two paths:

### Path A — canonical (from scratch)

Follow [`RAILWAY-STAGING-SETUP.md`](RAILWAY-STAGING-SETUP.md) end to end. In
short:

1. **Create the environments.**
   ```bash
   railway environment new staging
   railway environment new staging-e2e
   ```
2. **Add Postgres to each** (CLI `railway add --database postgres`, or the
   Railway dashboard → New → Database → PostgreSQL). Each gets a fresh volume
   and a fresh generated password.
3. **Recreate the API/web services** and connect source + root dir:
   ```bash
   railway service source connect --repo Brownbull/gastify --branch staging \
     --service gastify-api-staging        # root dir /backend, config /backend/railway.toml
   ```
   Repeat for `gastify-api-staging-e2e` (`/backend`) and `gastify-web-staging`
   (`/web`). The Source/Branch/Root/Autodeploy/Wait-for-CI settings are
   documented in `RAILWAY-STAGING-SETUP.md` → "Branch-Backed Deploys".
4. **Set environment variables** from the templates in
   `RAILWAY-STAGING-SETUP.md` (Backend / Web variable blocks). The two staging
   API services use the **two-role DB split** (`gastify_app` runtime +
   `gastify_migrator` migrations) — see [`db-role-split.md`](db-role-split.md).
   Wire the new Postgres `DATABASE_URL`/`MIGRATION_DATABASE_URL` from step 2.
   The Firebase admin JSON comes from `.secrets/gastify-staging-admin.json`.
5. **Deploy** (CLI fallback if not using GitHub autodeploy):
   ```bash
   railway up ./backend --path-as-root --environment staging      --service gastify-api-staging      --detach --ci
   railway up ./backend --path-as-root --environment staging-e2e  --service gastify-api-staging-e2e  --detach --ci
   railway up ./web     --path-as-root --environment staging      --service gastify-web-staging      --detach --ci
   ```
6. **Migrate + seed + verify:**
   ```bash
   bash scripts/staging/run-migrations.sh
   GASTIFY_ENVIRONMENT=staging python scripts/staging/seed-staging.py --execute --reset
   python tests/mobile/scripts/setup-staging-auth-user.py --execute   # Firebase test users
   bash scripts/staging/check-backend-ready.sh https://<new-staging-api-url>
   ```
   Expect `status=ok` and `migration_status=current`.

### Path B — duplicate from production (shortcut)

```bash
railway environment create staging --duplicate production
```

Copies the service topology and variable keys from `production`. You then must
retarget the copies for staging: set `GASTIFY_ENVIRONMENT=staging` (and
`staging-e2e` forces `GASTIFY_SCAN_PROVIDER=fixture`), update `CORS_ORIGINS`,
repoint Firebase to the staging project, and rotate the Gemini key. Faster, but
double-check every variable against the `RAILWAY-STAGING-SETUP.md` templates so
no production value leaks into a staging lane.

## Idle alternative (no drop)

If you want the lanes to come back instantly and only need to trim cost
temporarily, stop the stateless deployments but keep Postgres — see
`RAILWAY-STAGING-SETUP.md` → "Hobby-Plan Idle State" (`railway down` on the API
and web services). This keeps the (non-sleeping) Postgres bill but avoids
reprovisioning. Full drop (this runbook) is required to zero the staging cost.

## Cost expectation

- Full drop of both staging lanes removes 2 Postgres + 2 API + 1 web from the
  always-on set, eliminating the staging share of the memory bill.
- Production keeps its single Postgres + API online (web sleeps), so the project
  floor is roughly one Postgres + one API of sustained memory.
- Confirm post-drop with the Railway dashboard "Usage by Project" view or
  [`COST-USAGE.md`](COST-USAGE.md) (`railway metrics`).
