# Human Knowledge Map

<!-- Tracks what the human (operator/architect) understands about decisions made. -->
<!-- Populated and updated by /gabe-teach. -->
<!-- Goal: the human knows WHY/WHEN/WHERE, not HOW. Architect-level, not coder-level. -->

## Root artifacts

- [`.kdbp/SCOPE.md`](SCOPE.md) — project premise v1 (2026-04-22). Changed via `/gabe-scope-change` only.
- [`.kdbp/ROADMAP.md`](ROADMAP.md) — phase plan v1 (2026-04-22), derived from SCOPE. Updated on `/gabe-scope-change` or phase completion.
- [`.kdbp/scope-references.yaml`](scope-references.yaml) — Reference Frame + conflict/override audit trail (3 overrides recorded this session).
- [`.kdbp/research/archive/20260422T223746Z/`](research/archive/20260422T223746Z/) — archived scope-authoring research (domain, pitfalls, SUMMARY).
- [`.kdbp/archive/tombstones/scope-session-20260422T223746Z.json`](archive/tombstones/scope-session-20260422T223746Z.json) — scope-authoring session tombstone.

## Gravity Wells

<!-- Architectural sections of the app. Topics anchor to a primary well. -->
<!-- Soft cap: 7 wells (Miller's number). -->
<!-- A topic that spans wells gets one primary Well + `cross` in the Tags column. -->
<!-- G0 Uncategorized is a reserved fallback for orphan topics; /gabe-teach flags it. -->

<!-- Analogy column: one-liner (5-15 words) from gabe-lens. Makes each well graspable at a glance. -->
<!-- Paths column: comma-separated globs where this well's code lives (e.g., `app/api/**, tests/api/**`). Used by brief mode for health/last-commit signals. -->
<!-- Docs column: single path to this well's docs file (e.g., `docs/wells/3-api.md`). Empty = opt-out (no docs tracked for this well). Used by brief mode to surface doc links, by /gabe-teach topics to auto-append verified summaries, by /gabe-commit CHECK 7 Layer 3 for drift detection. -->
<!-- All three columns generated at init-wells time; regenerable via /gabe-teach wells. -->

| # | Name | Description | Analogy | Paths | Docs | Topics (verified / pending / total) |
|---|------|-------------|---------|-------|------|--------------------------------------|
| G1 | API Core | FastAPI entry + config + DB session + routes + observability. The stage. | "Building's front lobby — routes in, plumbing for everyone, lights always on." | `api/main.py`, `api/config.py`, `api/database.py`, `api/types.py`, `api/routes/**`, `api/observability/**`, `tests/api/test_main.py`, `tests/api/routes/**` | `docs/wells/1-api-core.md` | 0 / 0 / 0 |
| G2 | Data Model | SQLAlchemy ORM + Pydantic schemas + Alembic migrations. Money/FX/ownership schema invariants. | "Warehouse shelves and labels — everything kept, named, findable." | `api/models/**`, `api/schemas/**`, `alembic/**`, `tests/api/models/**`, `tests/api/schemas/**` | `docs/wells/2-data-model.md` | 0 / 0 / 0 |
| G3 | Identity + Ownership | Firebase auth + JIT provisioning + `ownership_scope` + consent/processing register (4-jurisdiction). | "Badge-reader at every door — who you are, what you can touch." | `api/services/auth*`, `api/services/consent*`, `api/services/scope*`, `tests/api/services/test_auth*`, `tests/api/services/test_consent*` | `docs/wells/3-identity-ownership.md` | 0 / 0 / 0 |
| G4 | Scan Pipeline | Vision LLM (Gemini) → guardrails → two-stage extraction → V4 categorizer → math-reconciliation gate → streaming. Core differentiator. | "Receipt translator — photo in, line-items out, hallucinations caught at gate." | `api/agents/**`, `api/guardrails/**`, `api/services/scan*`, `api/services/categor*`, `tests/api/agents/**`, `tests/api/guardrails/**` | `docs/wells/4-scan-pipeline.md` | 0 / 0 / 0 |
| G5 | Integrations | External adapters — Firebase, Gemini, FX feed, PDF statement parser. Every outside service behind one doorway. | "Diplomatic embassies — each outside service, exactly one doorway we control." | `api/integrations/**`, `tests/api/integrations/**` | `docs/wells/5-integrations.md` | 0 / 0 / 0 |
| G6 | Web Portal | React + Vite + Zustand + TanStack Query + Ladle. Responsive SPA. | "Shopfront window — desktop or phone browser, same storefront." | `web/**`, `tests/web/**` | `docs/wells/6-web-portal.md` | 0 / 0 / 0 |
| G7 | Mobile App | React Native + Expo + EAS + Detox + Jest. Android + iOS single codebase. Native camera, bidirectional streaming, keystore. | "Pocket version — native camera, offline-tolerant, same shared backend." | `mobile/**`, `tests/mobile/**` | `docs/wells/7-mobile-app.md` | 0 / 0 / 0 |

## Topic Classes

| Class | Question it answers | Source |
|-------|--------------------|--------|
| **WHY** | Why did we choose this approach? | commits, PLAN.md, DECISIONS.md |
| **WHEN** | When to apply / not apply this pattern? | repeated patterns across commits |
| **WHERE** | Why does this file live here? (static gravity well) | new files + project structure conventions |

## Status Lifecycle

| Status | Meaning | Re-surfaces? |
|--------|---------|--------------|
| `pending` | Detected from changes, not yet discussed | Yes, next /gabe-teach |
| `verified` | Human answered quiz correctly (score recorded) | No, unless stale |
| `skipped` | Human deferred this session | Yes, next /gabe-teach |
| `already-known` | Human claimed prior knowledge | No |
| `stale` | Verified >90 days ago | Yes, for refresh |

## Topics

<!-- ArchConcepts column: comma-separated architecture concept IDs from the gabe-arch skill -->
<!-- (e.g., "retry-with-exponential-backoff, idempotency-keys"). Empty = no tags. -->
<!-- Populated by /gabe-teach Step 4b.5 (deterministic match + LLM fallback + human confirm). -->
<!-- Cross-project concept verification lives in ~/.claude/gabe-arch/STATE.md. -->

| # | Well | Class | Topic | Status | Tags | ArchConcepts | Last Touched | Verified Date | Score | Source |
|---|------|-------|-------|--------|------|--------------|--------------|---------------|-------|--------|

## Sessions

<!-- Append-only log of /gabe-teach runs. Enriched with wells active + plan/phase reference. -->

## Storyline

<!-- Generated on demand by /gabe-teach story. Lossy analogy of what's been built and why. -->
<!-- Auto-refresh trigger: 3 new archived plans since last generation. Manual: /gabe-teach story refresh. -->

No storyline generated yet. Run `/gabe-teach story` after a few completed phases to generate one.
