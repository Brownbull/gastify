# Gastify Rebuild Documentation

This folder holds the planning docs for the **Gastify** full-stack rebuild — moving the BoletApp prototype (React + Firebase + Cloud Functions + Firestore) to a production-grade stack (FastAPI + PostgreSQL + React + TypeScript).

This repo (`~/projects/apps/gastify`) is the **target repo**. The source prototype lives at a pinned reference — see [`REFERENCE-SNAPSHOT.md`](REFERENCE-SNAPSHOT.md).

## Reading Order

1. [`PLAN.md`](PLAN.md) — **start here.** Graph-structured implementation plan with phases + dependencies + estimates.
2. [`LESSONS.md`](LESSONS.md) — **read before coding.** 13 rebuild rules (R1–R13) tied to observed failures in the prototype. PR review checklist in §6.
3. [`REFERENCE-SNAPSHOT.md`](REFERENCE-SNAPSHOT.md) — pinned commit in the source repo; list of critical files to inspect when porting behavior.
4. [`ADR-2026-04-20-REBUILD-STACK.md`](ADR-2026-04-20-REBUILD-STACK.md) — the "why" behind each technology choice. 18 decisions with constraint boxes, options considered, and revisit triggers.
5. [`UX-PLAN.md`](UX-PLAN.md) — Workstream A (UX) 7-phase pipeline.
6. [`ultraplan-rebuild-prompt.md`](ultraplan-rebuild-prompt.md) — original prompt; kept as reference context for what needs to be built.

## Execution Model (from PLAN.md)

- **Workstream A (UX):** U0 → U7 per UX-PLAN; handoff bundle lands in `docs/rebuild/ux/handoff/`.
- **Workstream B (Backend):** B0 scaffold → B1-B13 per PLAN.md DAG.
- A and B run in parallel after B0.
- **Integration (I1-I4):** consumes A7 handoff + deployed B backend.
- **Cutover (C1-C4):** data migration + 30-day cooldown.

## Locked Decisions (PLAN.md §Resolved Decisions, 2026-04-21)

Hosting: Railway · Python deps: uv · Frontend types: openapi-typescript+openapi-fetch · Component showcase: ladle · Gemini limit: env var 12/min · Scheduling: pg_cron fallback APScheduler · VAPID: fresh keys · Edit window: API middleware + FE gate + shared constant.

## Ready-to-Act Next Step

Start **B0** per PLAN.md: monorepo scaffold (apps/api, apps/worker, apps/web, shared/, alembic/) + CI skeleton. Estimate: 1-2 days. Unblocks everything.

## Naming Convention

- `ADR-YYYY-MM-DD-<topic>.md` — dated ADRs.
- Implementation docs produced during execution: `FAILURE-MODES.md` (blocker for B4 per LESSONS R7), `MIGRATION-LOG.md` (during B13), `ux/*` (during A0-A7).

## Source-Repo Cross-Reference

- Pinned commit: `6842cf302f3a97000c901e5d88cd9010064f3f2f` on branch `feature/epic18`
- Tag: `rebuild-reference-2026-04-21`
- Source repo URL: `https://github.com/Brownbull/gmni_boletapp`
- Clone with: `git clone https://github.com/Brownbull/gmni_boletapp && cd gmni_boletapp && git checkout rebuild-reference-2026-04-21`
