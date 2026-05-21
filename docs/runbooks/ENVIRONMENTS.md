# Environment-Gated Development

Gastify uses three durable development trees plus one deterministic support lane.
This operating model is mandatory for user-facing, upload, realtime, auth, DB,
native, and media changes.

| Lane | Database | Scan provider | Purpose | Can close runtime gates? |
|---|---|---|---|---|
| `local` | SQLite | `mock` | Fast local iteration | No |
| `staging-e2e` | Isolated Railway Postgres | `fixture` | Deterministic S23 proof | Yes, for deterministic journeys |
| `staging` | Railway Postgres | `gemini` | Deployed/provider proof | Yes |
| `production` | Railway Postgres | `gemini` | Real users | Not before staging is green |

## Development Rule

Start every feature locally where possible, then promote evidence upward:

1. `local` proves quick UI/API mechanics with cheap deterministic data.
2. `staging-e2e` proves auth/upload/realtime/native/media journeys with
   fixture-backed deterministic S23 results.
3. `staging` proves deployed Railway, Postgres, Firebase, Gemini, CORS,
   multiuser isolation, cache/idempotency, and SPA behavior.
4. `production` is documented and guarded now. Do not provision or smoke real
   production user journeys until staging evidence is green.

Unit tests, lint, typechecks, and local mocks remain necessary but are not
sufficient for changed runtime journeys.

## Gabe Gate Order

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
