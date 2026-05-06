# RALPH — RETIRED (Day-1 of Phase B)

> **Status: RETIRED.** This directory is the original parked RALPH install. It does NOT run any iterations. All RALPH execution happens via the 7 per-feature instances at `scripts/ralph-*/`. Files here (`ralph.sh`, `prompt.md`, `prd.json.example`) survive as **templates** for bootstrapping per-feature instances.

## Retirement disposition

Per RALPH-viability review wave 2: the single-monolith `scripts/ralph/` install is replaced by 7 per-feature RALPH instances. Cross-instance orchestration (if needed post-pilot) uses a separate `scripts/ralph-orchestrate.sh`, not this directory.

## Phase A gate — PASSED (all 21/21 prereqs complete)

- [x] A.1 mock boundary cut (`frontend/src/hooks/ui/`)
- [x] A.2 routing decision (file-based TanStack Router, recorded in `docs/rebuild/ux/ROUTING.md`)
- [x] A.3 baseline snapshots captured (`docs/rebuild/ux/baseline-snapshots/`)
- [x] A.4 locale extracted (`frontend/src/locales/es-CL.json`)
- [x] A.5 a11y baseline captured (`docs/rebuild/ux/a11y-baseline.json`)
- [x] A.6 STORYBOOK-STRUCTURE.md path override
- [x] A.7 5+ exemplar stories archived
- [x] A.8 Storybook test runner (addon-vitest + addon-a11y)
- [x] A.9–A.21 (all remaining prereqs)

## Template files

| File | Purpose |
|------|---------|
| `ralph.sh` | Template for per-feature `ralph.sh` (add cost-cap + housekeeping) |
| `prompt.md` | Template for per-feature `prompt.md` (project-tune per checklist) |
| `prd.json.example` | Reference for upstream PRD format (extended in `RALPH-PRD-FORMAT.md`) |
| `AGENTS.md.upstream` | Reference for AGENTS.md conventions |
| `README.upstream.md` | Reference for how the loop works |
| `CLAUDE.md.upstream` | Reference for Claude Code mode |

## Per-feature instances

| Instance | Scope |
|----------|-------|
| `scripts/ralph-atoms-molecules/` | Cross-feature atoms + molecules (~53 entries) |
| `scripts/ralph-features-dashboard/` | Dashboard gravity well (~18 entries) |
| `scripts/ralph-features-history/` | History gravity well (~36 entries) |
| `scripts/ralph-features-analytics/` | Trends gravity well (~36 entries) |
| `scripts/ralph-features-items/` | Items gravity well (~21 entries) |
| `scripts/ralph-features-scan/` | Scan + Batch gravity well (~50 entries) |
| `scripts/ralph-features-settings/` | Settings + Onboarding + Profile (~30 entries) |

Reports + Insights gravity well is hand-authored (no RALPH instance).

## Reference

- Plan: `docs/rebuild/PLAN-FULL-PIVOT.md`
- PRD format: `docs/rebuild/ux/RALPH-PRD-FORMAT.md`
- Upstream RALPH: `/home/khujta/projects/refrepos/ralph/`
- gabe-mockup skill: `~/.claude/skills/gabe-mockup/SKILL.md`
