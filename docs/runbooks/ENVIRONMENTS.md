# Environment-Gated Development

> **Current operating mode — production-direct (set 2026-06-25, DECISIONS.md D97).**
> The `staging` and `staging-e2e` lanes are **dropped** (cost control during the
> local/mockup phase — see [`RAILWAY-STAGING-TEARDOWN.md`](RAILWAY-STAGING-TEARDOWN.md)).
> Until decided otherwise, **`production` is the single deployed environment and the
> source of truth for all deployed and end-to-end testing**, and its **data is
> disposable** (seed / destroy / recreate freely). The promotion ladder below is the
> *target* model — currently suspended; `local` + unit/typecheck still drive the
> implementation loop, but deployed/runtime proof now happens directly on production.

Gastify's *target* operating model uses three durable development trees plus one
deterministic support lane (mandatory for user-facing, upload, realtime, auth, DB,
native, and media changes — restored when the staging lanes return):

| Lane | Database | Scan provider | Purpose | Can close runtime gates? |
|---|---|---|---|---|
| `local` | SQLite | `mock` | Fast local iteration | No |
| `staging-e2e` | Isolated Railway Postgres | `fixture` | Deterministic S23 proof | **Dropped 2026-06-25** |
| `staging` | Railway Postgres | `gemini` | Deployed/provider proof | **Dropped 2026-06-25** |
| `production` | Railway Postgres | `gemini` | **Active: working + all deployed/e2e testing; disposable data** | Yes — current source of truth |

## Development Rule

Start every feature locally where possible, then promote evidence upward:

1. `local` proves quick UI/API mechanics with cheap deterministic data.
2. `staging-e2e` proves auth/upload/realtime/native/media journeys with
   fixture-backed deterministic S23 results.
3. `staging` proves deployed Railway, Postgres, Firebase, Gemini, CORS,
   multiuser isolation, cache/idempotency, and SPA behavior.
4. `production` is, as of 2026-06-25, the **active deployed + e2e target** with
   disposable data — provision, seed, smoke, and destroy freely here (D97). (Target
   model: this lane was "guarded until staging green"; suspended while
   production-direct is in effect.)

Unit tests, lint, typechecks, and local mocks remain necessary but are not
sufficient for changed runtime journeys.

## Gabe Gate Order

> **Production-direct override (2026-06-25, D97):** with the staging lanes dropped,
> "after staging" below means **after production** — deploy the candidate to
> production, capture deployed proof there, then run `/gabe-review`. Restore the
> staging-first order from [`RAILWAY-STAGING-TEARDOWN.md`](RAILWAY-STAGING-TEARDOWN.md)
> when staging returns.

For runtime-gated phase types (`auth`, `session`, `DB`, `upload`, `realtime`,
`streaming`, `native-mobile`, `notifications`, `file-media`, `web`, and
user-facing deployed paths), Gabe uses **Review after staging**:

1. `/gabe-execute` implements locally, commits a candidate, pushes it to
   `origin/staging` or deploys it with the Railway CLI fallback, and records
   deployed staging proof.
2. `/gabe-review` runs only after that proof exists.
3. `/gabe-push staging` is an integration push, not final production delivery.
4. Final `Push ✅` is reserved for production promotion.

Local, `127.0.0.1`, SQLite, fixture-only, lint, typecheck, and unit evidence
can support the implementation loop, but they cannot close Exec/Review for
runtime-gated phases.

## Operational Tracks

- Local quickstart: [`LOCAL.md`](LOCAL.md)
- Railway setup: [`RAILWAY-STAGING-SETUP.md`](RAILWAY-STAGING-SETUP.md)
- Railway staging drop/restore (cost control): [`RAILWAY-STAGING-TEARDOWN.md`](RAILWAY-STAGING-TEARDOWN.md)
- Production test-user login (smoke without staging): [`PRODUCTION-TEST-USER.md`](PRODUCTION-TEST-USER.md)
- Staging testing: [`STAGING-TESTING.md`](STAGING-TESTING.md)
- Production checklist: [`PRODUCTION-CHECKLIST.md`](PRODUCTION-CHECKLIST.md)

## Completion Evidence

For every environment-gated phase, `.kdbp/LEDGER.md` must include:

- exact commands;
- target lane and service/API URL;
- database target or schema;
- device/browser target;
- APK/build id for mobile native tests;
- provider mode (`mock`, `fixture`, or `gemini`);
- screenshot/report/log result paths;
- pass/fail result and unresolved blockers.
