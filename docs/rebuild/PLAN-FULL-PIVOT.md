# Gastify Full Pivot — Frontend + Backend + Data Migration via RALPH

## Context

Originally framed as a UI rebuild; expanded after SCOPE-driven analysis to a **full pivot** because the existing frontend talks directly to Firestore + Gemini, and SCOPE explicitly targets a different architecture: FastAPI + PostgreSQL backend with an OpenAPI-typed client, two separate codebases (web in `apps/web/`, native in `apps/mobile/` — single React Native + Expo), sharing only types/OpenAPI client/category data.

The user's three locked decisions:

1. **TanStack Router** for web routing (URL-as-truth, type-safe params, native TanStack Query integration).
2. **Flavor (c) — full pivot:** rebuild UI + write the FastAPI backend + migrate data Firestore → PostgreSQL + cut over. Multi-month scope.
3. **Platform-aware stories** — every screen ships mobile (390×844) + tablet (768×1024) + desktop (1440) variants, even though native code (`apps/mobile/`) is deferred.

Plus: **Playwright verification tests on the mockups themselves** — every Storybook story has functional assertions, not just visual rendering, so the mockup catalog doubles as a behavioral spec.

Driving the frontend rebuild with **RALPH** (autonomous Claude Code loop at `/home/khujta/projects/refrepos/ralph/`, parked install at `scripts/ralph/`); using **`gabe-mockup` skill in React + Storybook mode** with **Storybook 10.3.5** (already installed) and both mockup sets as spec (clean-slate wins design language; legacy fills coverage gaps).

This document is a feasibility plan for a multi-month, multi-track effort. The frontend rebuild was originally framed as the headline work; with full pivot, the backend rebuild is at least equal in scope, and the data cutover is a third track with its own risk profile.

---

## Reality check — read before deciding

The "Full pivot" choice means three parallel tracks must be coordinated. None of them is optional, and each has independent failure modes:

1. **Backend track** — design and ship a FastAPI + PostgreSQL + Alembic backend that publishes an OpenAPI schema. Touches data modeling, auth (Firebase ID tokens against FastAPI deps), Gemini proxying, idempotency, rate limiting, observability. ~4–8 weeks of solo work; less with a backend-experienced collaborator.
2. **Frontend track** — RALPH-driven UI rebuild against the OpenAPI client (TanStack Query + TanStack Router). Stories are platform-aware. ~6–10 weeks calendar with batched RALPH supervision.
3. **Data migration track** — Firestore → PostgreSQL ETL with validation, dry-run, dual-write transition window, cutover, and rollback protocol. ~2–4 weeks plus a soak period.

The two old "untouchable" pins from the original plan (`services/`, `repositories/`) **dissolve** in the full pivot — services become the OpenAPI client (auto-generated), repositories disappear (TanStack Query handles caching). What stays untouchable for RALPH iterations is now: `backend/**`, the generated OpenAPI client output, `.kdbp/**`, and the frozen reference stories.

Three parallel tracks means one human-shaped role becomes load-bearing: **integration shepherd.** Someone has to keep the OpenAPI contract, the frontend client, and the backend implementation in sync as all three change. RALPH cannot own this; it's a cross-cutting human responsibility.

---

## Three tracks at a glance

| Track | Owner | Driver | Verification |
|---|---|---|---|
| **Backend** | human + optional second RALPH instance | KDBP plan + `/gabe-execute`, OR `scripts/ralph-backend/` with backend-tuned prompt | pytest + alembic check + OpenAPI schema diff + contract tests against the frontend mock |
| **Frontend** | RALPH (`scripts/ralph/`) | tiered `prd.json` (atom → molecule → screen-shell → screen-state × platform) | tiered Storybook gates: typecheck + render + axe + i18n regex + `play()` interactions + Playwright iframe screenshot + visual diff |
| **Data migration** | human | hand-written ETL scripts in `scripts/migrate/`, dry-run + validate + dual-write + cutover | row-count parity + sampled deep-equality + soak period with alerting |

---

## Recommended approach — 6 phases with decision gates

### Phase A — Prerequisite cuts (human work, NO RALPH yet)

These are one-time architectural cuts RALPH cannot bootstrap. Budget the majority of effort here. The original 7 items expand to 12.

**Frontend prerequisites:**

1. **Mock boundary.** Author `frontend/src/hooks/ui/` adapter layer. Every screen consumes typed hooks that return mockable shapes. Real implementations live in `frontend/src/hooks/data/` and call the OpenAPI client through TanStack Query. Stories mock at the `hooks/ui/` boundary only.
2. **TanStack Router migration plan.** Author `docs/rebuild/ux/ROUTING.md` defining: route tree shape, mapping from current `View` enum to routes, params strategy (`pendingHistoryFilters` → search params, `analyticsInitialState` → search params, `settingsSubview` → nested route, etc.), and the deletion plan for `useNavigationStore.ts` (349 lines → ~50). Decide file-based vs code-based route definition.
3. **Visual ground-truth refresh.** Run Playwright capture against running `localhost:5174` for every route in [App.tsx](/home/khujta/projects/apps/gastify/frontend/src/App.tsx) (13 routes × 3 platforms × 6 theme×mode = ~234 captures). Save under `docs/rebuild/ux/baseline-snapshots/`. Reuse extraction infra at `docs/mockups-legacy/VERIFICATION.md`.
4. **Locale extraction.** Search frontend for inline Spanish strings (`/[áéíóúñ]/i` and Chilean idioms). Extract to `frontend/src/locales/es-CL.json`. Frozen before any RALPH iteration.
5. **Accessibility baseline.** Run axe against every existing route; capture violations to `docs/rebuild/ux/a11y-baseline.json`.
6. **gabe-mockup path override.** ✅ Done — `docs/rebuild/ux/STORYBOOK-STRUCTURE.md` declares `frontend/` as the web dir.
7. **Archive 5 exemplar stories.** ✅ Done — `docs/rebuild/ux/reference-stories/`.
8. **Storybook test runner setup.** Install `@storybook/addon-vitest` + `@storybook/test` + Playwright config inside Storybook. Wire `npm run test-storybook` to execute play functions and report failures. Without this, Playwright-on-mockups is theater.

**Backend prerequisites:**

9. **API contract sketch.** Author `docs/rebuild/api/OPENAPI-SKETCH.md` enumerating every endpoint the frontend needs (transactions CRUD, scans, mappings, insights, batch, settings, credit, auth-me). Group by resource. Mark which are CRUD vs RPC. This is the contract the frontend builds against.
10. **Schema sketch.** Author `backend/schema/INITIAL-SCHEMA.md` mapping current Firestore collections to PostgreSQL tables. Money columns suffixed `_minor` per SCOPE §monetary-conventions (line 423). Currencies reference table seeded day-1.
11. **FastAPI scaffold.** Stand up `backend/` with FastAPI + SQLAlchemy 2.x + Alembic + Firebase Auth dep + pytest. Health-check endpoint live; CI green. No business endpoints yet — just the harness.

**Migration prerequisites:**

12. **Firestore export inventory.** Use `firebase firestore:export` to snapshot the prod collections (or a representative test tenant). Quantify row counts, identify any documents with non-portable shapes. Produces a baseline for ETL acceptance criteria.

**Gate A:** All 12 prereqs done. If incomplete, halt — RALPH iterations and backend work both blocked on these foundations.

### Phase B — RALPH installation + prompt authoring

1. **Frontend RALPH** — already installed at [scripts/ralph/](/home/khujta/projects/apps/gastify/scripts/ralph/) (parked per `PARKED.md`). In Phase B:
   - Project-tune `scripts/ralph/prompt.md` with: TanStack Router + TanStack Query patterns, OpenAPI client import paths, the `hooks/ui/` mock boundary contract, the 5 archived exemplars as read-only references, mockup precedence rule, tiered verification gate, platform-aware story conventions, untouchables list.
   - Author `scripts/ralph/AGENTS.md` seed with project-specific gotchas from Phase A.
   - Author `docs/rebuild/ux/RALPH-PRD-FORMAT.md` defining the prd.json schema:
     ```
     {
       id, tier: "atom"|"molecule"|"screen-shell"|"screen-state",
       source: "clean-slate"|"legacy"|"new",
       platform: ["mobile"]|["tablet"]|["desktop"]|["mobile","tablet","desktop"],
       spec_path, snapshot_paths[], deps[],
       api_endpoints[],   // OpenAPI ops the screen depends on
       gate: "atom"|"molecule"|"screen", play_function: bool,
       passes, notes
     }
     ```

2. **Backend RALPH (optional — DECISION POINT).** Two viable paths:
   - **B2.a — Single-track.** Build backend by hand using `/gabe-execute` against a separate `.kdbp/PLAN.md` phase. RALPH only owns frontend. Lower coordination overhead; backend gets human attention throughout.
   - **B2.b — Dual-track.** Install second RALPH at `scripts/ralph-backend/` with a backend-tuned `prompt.md` (FastAPI patterns, SQLAlchemy 2.x style, Alembic migration discipline, pytest TDD gate, OpenAPI emission verification). Parallel iteration on both tracks; integration shepherd reconciles per batch.

   **Recommendation: B2.a for now.** Backend has more architectural judgment per LOC than frontend; RALPH's strength is grinding through PRD-able mechanical work. Revisit B2.b after frontend RALPH proves out at Phase D pilot.

### Phase C — PRD generation

#### C.1 Frontend PRD (single human-driven pass)

Walk both mockup sets and emit a tiered `scripts/ralph/prd.json`. Slice aggressively (RALPH thrashes on >200-LOC changes):

- **Tier 1 — Atoms:** dedupe legacy 14 + clean-slate 10 → ~18 unique. One PRD entry per atom × 3 platforms is overkill — use single entry per atom with responsive primitives, platform variations in stories only.
- **Tier 2 — Molecules:** dedupe legacy 29 + clean-slate 19 → ~35 unique. One PRD entry per molecule.
- **Tier 3 — Screen-shells:** 13 routes × 3 platforms = ~39 entries (layout only, mocked data).
- **Tier 4 — Screen-states:** per shell, one entry per state (default/loading/empty/error). One Story export per entry, ≤150 LOC delta.
- **Tier 5 — Route definitions:** TanStack Router file-based route entries connecting screens to URLs. One per route.

Total: roughly **250–350 PRD entries.** Cross-reference each entry to a SCOPE.md REQ where applicable.

#### C.2 Backend PRD (separate, in `.kdbp/PLAN.md`)

Driven via `/gabe-plan` and `/gabe-execute` per the gabe convention. Slice by:

- **Schema migrations** (Alembic): one migration per coherent table set.
- **Endpoints** (FastAPI): one PR per resource (transactions CRUD, scans CRUD, etc.).
- **Auth integration** (Firebase token verification): one phase.
- **Gemini proxying** (move from frontend to backend): one phase.
- **OpenAPI publication**: continuous — every endpoint contributes to the schema; CI verifies the schema is committed.

#### C.3 Data migration PRD (separate, in `scripts/migrate/PLAN.md`)

- **Per-collection ETL** scripts (`scripts/migrate/<collection>.py`): read from Firestore export, transform, write to PostgreSQL.
- **Validation scripts**: row-count parity, sampled deep-equality (configurable sample rate), referential integrity checks.
- **Dual-write helper** (transient): during the cutover window, frontend reads from Postgres, writes to both — until soak passes.
- **Cutover runbook**: `scripts/migrate/CUTOVER.md` documenting the freeze → final delta sync → DNS/feature-flag flip → soak → rollback procedure.

### Phase D — Execution (RALPH frontend + manual backend + manual ETL)

1. **Branch-per-batch.** Each 10-iteration RALPH batch runs on `rebuild/fe-batch-NN`. Backend work runs on `rebuild/be-<phase>-NN`. Migration work runs on `rebuild/migrate-NN`. Each merges to `rebuild/main` only after its own gate passes.
2. **Tiered Storybook verification gate** — embedded in `prd.json` as `gate`:
   - **atom**: `npm run typecheck` + render test + axe + i18n regex (~5s).
   - **molecule**: + Storybook `play()` function with at least one assertion on key interactions (~15s).
   - **screen**: + `play()` function walking ≥2 states + Playwright iframe screenshot + visual diff vs `docs/rebuild/ux/baseline-snapshots/` + `npm run test-storybook` execution (~60s).
3. **Per-batch frontend integration smoke.** After each frontend batch closes: mount the actual `App.tsx` against an in-memory MSW server mocking the OpenAPI endpoints. Click through 3 critical flows (dashboard load, history filter+drilldown, scan upload). If smoke fails, branch is discarded.
4. **Per-batch backend integration smoke.** After each backend batch closes: pytest run with full integration suite against an ephemeral PostgreSQL + Firebase Auth Emulator. OpenAPI schema diff — if breaking changes, the frontend integration shepherd is on the hook to update the OpenAPI client and any affected hooks before merge.
5. **Per-batch contract test.** A separate suite at `tests/contract/` runs the frontend's MSW handlers against the real backend's OpenAPI schema, catching drift.
6. **Mockup verification suite.** `npm run test-storybook` runs all play functions in headless Chromium; `npm run test-storybook-visual` runs visual diff. Both gate every frontend batch.
7. **AGENTS.md feedback loop.** Each iteration appends to `frontend/src/AGENTS.md` (and `backend/AGENTS.md` if dual-track). Audit weekly for staleness.

### Phase E — Migration cutover (was Reconciliation)

Renamed because cutover is genuinely the heaviest single risk in the project.

1. **Pre-cutover gate:** all three tracks green on `rebuild/main`. Frontend Storybook coverage at 100% of routes. Backend OpenAPI complete and frontend client regenerated. ETL dry-run produces 100% row-count parity and ≥99.9% sample deep-equality.
2. **Dual-write period (1–2 weeks):** Frontend reads from Postgres, writes to both Firestore and Postgres via the new API. Daily reconciliation script identifies any drift; alerts on >0.1% divergence.
3. **Cutover:** Freeze writes → final delta sync → flip feature flag → 24-hour soak with alerting on every endpoint.
4. **Decommission:** After 30-day soak with zero drift alerts, retire Firestore writes, archive Firestore export, delete Firestore project.
5. **KDBP updates:** `/gabe-scope-pivot` to record the rebuild as a scope event; update PLAN, DECISIONS (D27 supersession noted), STRUCTURE, KNOWLEDGE.

### Phase F — Native track (deferred, NOT in this plan)

`apps/mobile/` is the future React Native + Expo codebase per SCOPE override-03. ADR D19 (mobile navigation/state/camera library picks) is open. Building it is a separate plan that consumes the OpenAPI client and category data from `shared/`. Mockups built in this plan inform the native UI spec but native production code is **not** in scope here.

---

## Critical files

### To create — frontend track
- `scripts/ralph/{prompt.md (project-tuned), AGENTS.md, prd.json (populated)}`
- `docs/rebuild/ux/RALPH-PRD-FORMAT.md`
- `docs/rebuild/ux/MOCKUP-PRECEDENCE.md`
- `docs/rebuild/ux/ROUTING.md` (TanStack Router migration plan)
- `docs/rebuild/ux/baseline-snapshots/` (Phase A.3)
- `docs/rebuild/ux/a11y-baseline.json` (Phase A.5)
- `frontend/src/hooks/ui/**`, `frontend/src/hooks/data/**` (adapter boundary)
- `frontend/src/locales/es-CL.json` (extracted strings)
- `frontend/src/api-client/**` (generated from backend OpenAPI schema; keep generated/hand-written split)
- `frontend/src/routes/**` (TanStack Router file-based routes)
- `frontend/src/AGENTS.md` (RALPH learning surface)
- `frontend/playwright-storybook.config.ts` (Phase A.8 test runner config)

### To create — backend track
- `backend/{app,tests,alembic,pyproject.toml,Dockerfile}` (FastAPI scaffold)
- `backend/openapi.yaml` (committed, regenerated on each backend change; CI verifies)
- `docs/rebuild/api/OPENAPI-SKETCH.md` (Phase A.9)
- `backend/schema/INITIAL-SCHEMA.md` (Phase A.10)
- `backend/AGENTS.md`

### To create — migration track
- `scripts/migrate/{<collection>.py × N, validate.py, dual_write.py, CUTOVER.md, PLAN.md}`
- `tests/contract/**` (frontend MSW handlers vs backend OpenAPI schema)

### To reference (read-only)
- [docs/mockups/INDEX.md](/home/khujta/projects/apps/gastify/docs/mockups/INDEX.md), [docs/mockups-legacy/INDEX.md](/home/khujta/projects/apps/gastify/docs/mockups-legacy/INDEX.md)
- [docs/rebuild/ux/REACT-STORYBOOK-WORKFLOW.md](/home/khujta/projects/apps/gastify/docs/rebuild/ux/REACT-STORYBOOK-WORKFLOW.md)
- [docs/rebuild/ux/STORYBOOK-STRUCTURE.md](/home/khujta/projects/apps/gastify/docs/rebuild/ux/STORYBOOK-STRUCTURE.md) (taxonomy contract)
- [docs/rebuild/ux/reference-stories/](/home/khujta/projects/apps/gastify/docs/rebuild/ux/reference-stories/) (frozen exemplars)
- [frontend/STORIES.md](/home/khujta/projects/apps/gastify/frontend/STORIES.md)
- [frontend/src/styles/global.css](/home/khujta/projects/apps/gastify/frontend/src/styles/global.css)
- [frontend/.storybook/main.ts](/home/khujta/projects/apps/gastify/frontend/.storybook/main.ts), [frontend/.storybook/preview.tsx](/home/khujta/projects/apps/gastify/frontend/.storybook/preview.tsx)
- [.kdbp/SCOPE.md](/home/khujta/projects/apps/gastify/.kdbp/SCOPE.md) (REQ traceability + monetary conventions + mobile architecture)

### Untouchable by RALPH (pin in `prompt.md`)
- `backend/**` (frontend RALPH never edits backend; backend track owns this)
- `frontend/src/api-client/**` if generated (regenerate via script, never hand-edit)
- `.kdbp/**` (only gabe commands edit these)
- `docs/rebuild/ux/reference-stories/**` (read-only exemplars)
- `scripts/migrate/**` (migration track owns this)

---

## Risks → mitigations

| ID | Risk | Mitigation |
|----|------|------------|
| R1 | Three parallel tracks drift apart (OpenAPI ↔ frontend client ↔ backend impl) | Per-batch contract tests at `tests/contract/`; integration shepherd role; OpenAPI schema diff check in CI |
| R2 | RALPH thrashes on >200-LOC changes | Tier-4/5 PRD slicing: one Story export or one route definition per entry, ≤150 LOC delta |
| R3 | Verification false-passes (axe/i18n/screenshot all pass on hollow components) | Storybook `play()` functions with assertions are mandatory at molecule+ tier; per-batch integration smoke against MSW |
| R4 | TanStack Router file-based routes break Storybook | Stories use `<MemoryRouter>` from TanStack Router or pure component stories without router context; documented in `STORYBOOK-STRUCTURE.md` |
| R5 | Sparse visual ground truth for screens | Phase A.3 fresh Playwright capture against localhost:5174 |
| R6 | i18n key hallucination | Phase A.4 frozen es-CL.json before any RALPH iteration |
| R7 | Existing 5 stories overwritten | ✅ Phase A.7 archive done; pinned read-only in `prompt.md` |
| R8 | Mockup precedence ambiguity | `MOCKUP-PRECEDENCE.md` decision matrix + per-PRD `source` field |
| R9 | KDBP plan supersedure left implicit | Phase E `/gabe-scope-pivot` formalizes; new ROADMAP.md replaces L-block phases |
| R10 | AGENTS.md staleness as iterations compound | Weekly audit; truncate stale entries; track velocity per batch |
| R11 | **Data loss during Firestore → PostgreSQL cutover** | Dual-write window with daily reconciliation; explicit rollback runbook; 30-day soak before Firestore decommission |
| R12 | **Backend velocity slower than frontend RALPH velocity** (frontend gets ahead, has no API to call) | Stub OpenAPI responses via MSW from day 1; frontend RALPH builds against the spec, not the implementation; backend catches up async |
| R13 | Storybook test runner timeouts on slow `play()` functions | Tier the gate; only screen-tier stories run full play+visual diff; atoms/molecules run lightweight checks |
| R14 | Gemini API key exposure if proxying isn't done early in backend | Phase A.11 backend scaffold includes Gemini proxy endpoint stub; frontend never holds the Gemini key after cutover |
| R15 | Firebase Auth migration: ID token verification differs Firestore-direct vs FastAPI-dep | Backend track Phase 2 ships Firebase Auth dep; frontend keeps Firebase Auth SDK for token issuance only |

---

## Decision gates

- **Gate A** (end of Phase A): All 12 prerequisite cuts done. If incomplete, halt.
- **Gate B2** (Phase B step 2): Confirm B2.a (single-track RALPH) vs B2.b (dual-track) with current evidence. Default: B2.a.
- **Gate Pilot-FE** (after first 5-iter frontend RALPH run): ≥3 of 5 stories pass tiered gate AND integration smoke. If <3, abandon RALPH approach; revert to manual Storybook authoring.
- **Gate Backend-Phase-N** (after each backend Alembic + endpoint phase): pytest green; OpenAPI schema diff reviewed; contract tests pass.
- **Gate Migration-Dryrun**: ETL produces 100% row-count parity + ≥99.9% sample deep-equality on production-shaped Firestore export.
- **Gate Cutover-Ready**: All three tracks green on `rebuild/main`; dual-write reconciliation showing zero drift for 7 consecutive days.
- **Gate Cutover-Done**: 30-day post-cutover soak with zero drift alerts; Firestore decommissioned.

---

## Verification — how to know this worked

End-to-end:
1. `cd frontend && npm run storybook` — every route in the new TanStack Router tree has ≥1 mountable story across mobile/tablet/desktop platforms.
2. `cd frontend && npm run build && npm run build-storybook` — both pass.
3. `cd frontend && npm run test-storybook` — every screen-tier story's `play()` function executes successfully (Storybook test runner under headless Chromium).
4. `cd frontend && npm run test-storybook-visual` — Playwright iframe screenshots match `docs/rebuild/ux/baseline-snapshots/` within tolerance.
5. `node ~/.claude/skills/gabe-mockup/scripts/check-storybook-correspondence.mjs --web-dir frontend` — reports PASS or REVIEW.
6. `cd backend && pytest --cov` — backend coverage ≥80%, integration tests pass against ephemeral Postgres.
7. `cd tests/contract && npm test` — frontend MSW handlers match backend OpenAPI schema; zero drift.
8. Run full Playwright E2E suite at `tests/e2e/` against the new stack — all critical flows pass against the new backend.
9. `bash scripts/migrate/validate.py --full` — Firestore vs Postgres parity report shows zero drift.
10. Run axe against rebuilt routes — no regression vs `docs/rebuild/ux/a11y-baseline.json`.
11. `git diff main..rebuild/main -- backend/` — non-empty (full backend exists).
12. Compare `frontend/src/locales/es-CL.json` count of unique keys before vs after — equal or greater.

---

## Effort budget (rough)

Multi-month, multi-track. Original estimate (UI-only) was ~10–15 sessions; with full pivot, more like:

- **Phase A:** ~5–8 sessions. Twelve prereqs across frontend, backend, migration. The hard part — most decisions made here.
- **Phase B:** ~2–3 sessions. RALPH project-tuning + AGENTS seeding + PRD format authoring.
- **Phase C:** ~3–5 sessions. Three PRDs (frontend tiered, backend KDBP, migration runbook).
- **Phase D:** ~15–25 sessions across calendar weeks.
  - Frontend RALPH supervision: 8–12 sessions of batched runs + hand-finishing.
  - Backend implementation: 6–10 sessions hand-built (or +half if dual-track RALPH).
  - Per-batch integration shepherd work: continuous.
- **Phase E:** ~3–5 sessions plus 30-day soak in calendar time.

**Calendar:** with single-developer cadence, **3–5 months** is realistic. With a backend collaborator, **2–3 months**. Multi-track parallelism without coordination roles becomes a quality liability — surfaces R1 (drift) and R12 (velocity mismatch).

**Where the leverage is:** Phase A. Every shortcut taken here costs 5× to recover from in Phase D. The mock boundary (A.1), routing plan (A.2), API contract sketch (A.9), and Storybook test runner (A.8) are the four highest-leverage items.

---

## Decisions still open

These don't block Phase A start, but should be settled before Phase B:

1. **B2 — Single vs dual RALPH track** (frontend-only RALPH, OR add backend-tuned second instance). Default: single (B2.a).
2. **TanStack Router style — file-based vs code-based** route definitions. File-based is more idiomatic; code-based gives RALPH a more constrained search space per iteration. Recommend trying file-based first; fall back to code-based if RALPH struggles.
3. **MSW for stub backend OR real backend by Phase D start.** Recommend MSW from day 1 — frontend never blocks on backend.
4. **Visual diff threshold** for Playwright screenshots (pixel %, perceptual diff, etc.). Recommend perceptual diff with 2% tolerance; tighten over time.
5. **Where the OpenAPI client lives.** Generated to `frontend/src/api-client/` (RALPH-untouchable) vs `shared/api-client/` (per SCOPE monorepo target, eventual home). Recommend `frontend/src/api-client/` now, plan migration to `shared/` when monorepo restructure happens.
