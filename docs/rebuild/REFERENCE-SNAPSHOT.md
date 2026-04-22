# Rebuild Reference Snapshot

**Purpose:** Capture exact state of the current BoletApp codebase so the Gastify rebuild (FastAPI + PostgreSQL) has a stable, immutable reference point. Copy this folder (`docs/rebuild/`) into the new repo; clone this repo at the tagged commit when deep source inspection is needed.

---

## Pinned Source State

| Field | Value |
|---|---|
| **Repo** | `https://github.com/Brownbull/gmni_boletapp` |
| **Branch at snapshot** | `feature/epic18` |
| **Commit SHA** | `6842cf302f3a97000c901e5d88cd9010064f3f2f` |
| **Short SHA** | `6842cf30` |
| **Commit date** | `2026-04-20 22:40:49 -0400` |
| **Commit message** | `docs(rebuild): add D17 domain limits + D18 two-workstream execution` |
| **Package version** | `1.0.0-beta.5` |
| **Snapshot taken** | `2026-04-21` |
| **Recommended tag** | `rebuild-reference-2026-04-21` (see §Tag Creation below) |

---

## Firebase Project References

| Env | Project ID | Notes |
|---|---|---|
| **Production** | `boletapp-d609f` | Shared with Gustify — see INC-001 (rules deploy caveat) |
| **Staging** | `boletapp-staging` | Shared with Gustify |
| **Auth provider** | Firebase Auth (Google OAuth) | Preserved in rebuild (ADR D-auth) |
| **Storage bucket** | `boletapp-d609f.firebasestorage.app` | Receipt images + thumbnails |
| **Cloud Functions** | `functions/` (11 functions, codebase=`default`) | Replaced by FastAPI + worker in rebuild |

---

## Critical Source Files (consumed by rebuild)

The rebuild plan (`PLAN.md`) and prompt (`ultraplan-rebuild-prompt.md`) reference these files. Clone this repo at the pinned SHA to inspect them:

| File | Purpose in rebuild |
|---|---|
| `docs/architecture/architecture.md` | System overview + Mermaid diagrams |
| `docs/architecture/scan-pipeline-architecture.md` | Async scan pipeline (current Firestore triggers) |
| `docs/architecture/data-models.md` | Firestore collection shapes → source for schema translation |
| `docs/architecture/cloud-functions.md` | All 11 CF documented → ported to FastAPI routes + worker |
| `docs/architecture/api-contracts.md` | Cloud Function API specs → source for REST endpoint design |
| `shared/schema/categories.ts` | V4 taxonomy (12 L1 + 44 L2 + 9 L3 + 42 L4) — **MUST preserve exactly** in `shared/categories.json` |
| `src/types/transaction.ts` | `Transaction`, `TransactionItem`, `TransactionPeriods` types → Pydantic models |
| `src/types/item.ts` | `FlattenedItem`, `AggregatedItem` types → Items view API |
| `src/features/scan/` | Scan state machine, handlers, hooks → reference for SSE narrative states |
| `functions/src/processReceiptScan.ts` | Core scan pipeline logic → port to worker process |
| `functions/src/analyzeReceipt.ts` | Gemini integration + prompt → port with Pydantic `output_type` |
| `functions/src/analyzeStatement.ts` | Statement PDF scanning → port to worker statement variant |
| `firestore.rules` | Security rules → source for validation logic in Pydantic models |
| `src/utils/categoryTranslations.ts` | ES/EN category translations → source for `display[locale]` map |
| `src/utils/translations.ts` | i18n strings → source for frontend locale files |
| `docs/decisions/` | ADRs + planning artifacts |
| `functions/src/categoryMigrationMap.ts` | V3→V4 migration map → reference for `scripts/migrate_from_firestore.py` |

---

## Rebuild Docs to Carry Over

When forking to the new repo, copy the entire `docs/rebuild/` folder:

```
docs/rebuild/
├── README.md
├── ADR-2026-04-20-REBUILD-STACK.md   # 18 architecture decisions
├── UX-PLAN.md                         # 7-phase UX workstream
├── ultraplan-rebuild-prompt.md        # Full context prompt
├── PLAN.md                            # Graph-structured implementation plan (this session)
└── REFERENCE-SNAPSHOT.md              # This file
```

---

## Tag Creation (recommended)

Create an immutable git tag at the snapshot SHA so the new repo can always point back to a stable reference, even if `feature/epic18` moves forward:

```bash
# From the current repo
git tag -a rebuild-reference-2026-04-21 6842cf302f3a97000c901e5d88cd9010064f3f2f \
  -m "Rebuild reference snapshot — source of truth for Gastify FastAPI+PostgreSQL rebuild. See docs/rebuild/PLAN.md."
git push origin rebuild-reference-2026-04-21
```

After tagging, the new repo's `docs/rebuild/REFERENCE-SNAPSHOT.md` stays valid indefinitely — anyone can:

```bash
git clone https://github.com/Brownbull/gmni_boletapp
cd gmni_boletapp
git checkout rebuild-reference-2026-04-21
# Now at the exact state referenced by the rebuild plan
```

---

## Migration Data State

For the eventual Firestore → Postgres data migration (B13 in PLAN.md), the relevant production state at cutover will be captured separately:

```bash
gcloud firestore export gs://boletapp-backups/pre-migration-YYYY-MM-DD/ \
  --project=boletapp-d609f
```

This snapshot (code) is independent from the data snapshot (Firestore export). Both are needed at cutover.

---

## Current App Scale (for context in new repo)

| Metric | Value | Source |
|---|---|---|
| Lines of TypeScript | ~21K | `cloc src/` |
| Feature modules | 13 | `src/features/` |
| Cloud Functions | 11 | `functions/src/index.ts` |
| Unit tests (Vitest) | ~200 | `src/**/*.test.ts` |
| E2E tests (Playwright) | 13 flows | `tests/e2e/` |
| Categories | 44 store + 42 item (86 total) | `shared/schema/categories.ts` |
| Active users at rebuild start | 1 (single-user cutover justified) | — |

---

## Rebuild Decision Summary

Plan locked 2026-04-21 with 8 resolved decisions (see `PLAN.md` §Resolved Decisions):

- Hosting: **Railway** (API + worker + Postgres + Volume)
- Python deps: **uv**
- Frontend types: **openapi-typescript + openapi-fetch**
- Component showcase: **ladle**
- Gemini quota: env var `GEMINI_SAFETY_LIMIT=12`, tier-based user pricing
- Scheduling: **pg_cron** (fallback APScheduler + advisory lock)
- VAPID: fresh keys
- Edit window: API middleware + FE gate + shared constant `EDIT_WINDOW_DAYS=90`

---

## Next Step from the New Repo

Once the new repo is initialized:

1. Copy `docs/rebuild/` from this snapshot.
2. `git clone` this repo at `rebuild-reference-2026-04-21` for source inspection.
3. Start **B0** (monorepo scaffold + tooling + CI) per `PLAN.md`.
4. When B13 (Firestore → Postgres migration) runs, add `MIGRATION-LOG.md` to `docs/rebuild/` recording the production data export timestamp + validation results.
