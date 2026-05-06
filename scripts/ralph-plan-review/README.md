# RALPH Plan Review

A purpose-built RALPH instance for iteratively reviewing and hardening the Gastify full-pivot plan.

## What this loop does

Loops a fresh Claude Code instance per iteration. Each iteration picks one perspective (architect, security, database, planner, scan, transactions, statistics, communication, or ralph-viability), reads the plan, identifies gaps relative to that perspective, applies surgical edits, signs off (or queues another wave), and commits. After 3 waves of all 9 perspectives plus a synthesis pass, the plan is either declared READY or has explicit residual blockers documented.

This is **plan review**, not code construction. The loop edits a markdown file. It does not touch frontend/, backend/, or any application code.

## Prerequisites

The plan must live inside the gastify git repo so iterations can commit revisions. Move it now:

```bash
mkdir -p /home/khujta/projects/apps/gastify/docs/rebuild
cp /home/khujta/.claude/plans/i-would-like-to-elegant-tarjan.md \
   /home/khujta/projects/apps/gastify/docs/rebuild/PLAN-FULL-PIVOT.md
git -C /home/khujta/projects/apps/gastify add docs/rebuild/PLAN-FULL-PIVOT.md
git -C /home/khujta/projects/apps/gastify commit -m "review: import plan v1 for RALPH-driven hardening"
```

The original file at `~/.claude/plans/...` stays as the v1 historical snapshot.

## Invocation

From the repo root:

```bash
cd /home/khujta/projects/apps/gastify

# Create the review branch (PRD declares branchName: plan-review/full-pivot-hardening)
git checkout -b plan-review/full-pivot-hardening

# Run the loop. 28 stories total (3 waves × 9 perspectives + 1 synthesis).
./scripts/ralph-plan-review/ralph.sh --tool claude 28
```

The loop:
- Reads `prompt.md` (amp) or `CLAUDE.md` (claude) per iteration
- Picks the highest-priority `passes: false` story from `prd.json`
- Spawns a fresh Claude Code instance with the prompt
- Iteration commits a revision to the plan + appends to `findings.md` + appends to `progress.txt`
- Continues until all 28 stories `passes: true` (RALPH emits `<promise>COMPLETE</promise>`) or hits the iteration cap

Each iteration costs roughly $0.30–$1.50 in API tokens depending on plan size and grounding-file reads. **Estimated total: $10–$45.**

## Tunables before running

You probably want to adjust these:

1. **Story count.** 28 is the canonical 3-wave + synthesis sweep. Cheaper alternatives:
   - **Wave 1 only + synthesis** (10 stories): edit `prd.json` to delete `REV-W2-*` and `REV-W3-*` entries; renumber synthesis to priority 10. Lighter pass; finds the big stuff but doesn't catch wave-1-introduced gaps.
   - **Waves 1+2 + synthesis** (19 stories): keep W1 and W2, drop W3. Good middle ground.
2. **Iteration cap.** `28` matches the story count exactly. If you want headroom for retries, run `./ralph.sh --tool claude 35`.
3. **Grounding files per story.** Each story lists `groundingFiles[]` the iteration must read. Add or remove based on what each perspective should consider.

## What you'll have when it's done

Three artifacts:

1. **`docs/rebuild/PLAN-FULL-PIVOT.md`** — the hardened plan, with all CRITICAL/HIGH gaps fixed in place, a Tensions section recording any cross-perspective disagreements, and a final "Plan execution readiness" section declaring READY or listing residual blockers.
2. **`scripts/ralph-plan-review/findings.md`** — full structured findings log. Every issue raised, severity, fix applied or tension recorded, sign-off decision per perspective per wave.
3. **Git history on `plan-review/full-pivot-hardening`** — 28 commits, one per perspective per wave. Squash before merging if you want a clean history; keep all if you want the audit trail.

## Stop conditions

- All 28 stories `passes: true` → loop emits `<promise>COMPLETE</promise>` and exits 0.
- Iteration cap reached → loop exits 1, status in `progress.txt`. Review what's incomplete and either re-run, or accept the partial result.
- You ctrl-C — partial work is committed; no rollback needed.

## Failure modes to watch for

- **Plan shrinks unexpectedly.** A bad iteration deleted content. Per `CLAUDE.md` quality requirements, this should fail the iteration's commit gate; if it doesn't, manually revert.
- **findings.md not appended.** An iteration skipped the log step. Quality gate should catch; manual review of `git diff` per commit is the backup.
- **Tensions section grows large.** Many cross-perspective disagreements. Read them; the plan needs human decisions there before execution.
- **Same perspective signs off in W1 but raises new issues in W2/W3.** Normal — wave 1 may have introduced changes that wave 2 perspective notices. The iterations naturally surface these.

## Differences from the parked frontend RALPH

The parked install at `scripts/ralph/` is for the **frontend code rebuild** (Phase D of the plan). It runs against `frontend/src/`, generates Storybook stories, runs typecheck/lint/test gates, and is not yet unparked.

This install at `scripts/ralph-plan-review/` is for **plan review only**. It edits markdown, has no test gates, and runs entirely on the plan document. Different prompt, different PRD, different verification, separate branch.

## Reference

- Plan being reviewed: `docs/rebuild/PLAN-FULL-PIVOT.md` (or wherever you place it; update the prompt if you move it)
- Per-iteration prompt: `CLAUDE.md`
- Work queue: `prd.json`
- Findings log: `findings.md`
- Loop runner: `ralph.sh`
- Upstream RALPH: https://github.com/snarktank/ralph
