# Audit: Anti-Sprawl Enforcement in the Gabe Suite

> **Date:** 2026-04-27
> **Type:** Meta-audit of the Gabe (KDBP) suite itself — read-only inventory, no code changes.
> **Trigger:** User question — "in which moments do we enforce gravity wells / not creating infinitely more functions, sagas, and approaches? How do we keep the codebase manageable without exploding?"
> **Scope:** All gabe-* commands, all KDBP files, all PreToolUse/PostToolUse/Stop/SessionStart hooks. Theoretical map cross-checked against ~7,500 gabe-command invocations across 8 gastify sessions (2026-04-23 → 2026-04-27).
> **Original location:** `~/.claude/plans/at-this-stage-maybe-sunny-wall.md`. Copied here for project-folder accessibility.

## Context

The Gabe suite (gabe-* commands + KDBP files + hooks) is the project's "managed development" framework. It's supposed to keep the codebase from sprawling — preventing the steady accretion of new files, redundant functions, parallel sagas, and ad-hoc vocabulary that slowly turns a clean architecture into the BoletApp port we just decided to throw away. The 2026-04-27 architectural fragility analysis (in KNOWLEDGE.md) surfaced 6 instances of dual-ledger drift in the legacy port. This audit asks whether the Gabe suite has gates that would have caught them earlier, and where the holes are if not.

**Goal of this audit:** map every enforcement moment, classify hardness (block vs warn vs advisory), and identify gaps. No fixes proposed — just inventory.

## The three enforcement layers

| Layer | Mechanism | Latency | Hardness | Where defined |
|-------|-----------|---------|----------|---------------|
| **L1 — Hooks** | Auto-fire on tool use (Pre/Post/Stop/SessionStart) | Real-time | Block / warn / pass-through | `~/.claude/scripts/hooks/*.js`, `~/.claude/hooks/*.py` |
| **L2 — KDBP files** | Declarative state read by skills + hooks | On-demand | Reference data, not enforcement | `.kdbp/*.md` |
| **L3 — Commands** | Manual-invoked workflows (`/gabe-*`) | When user runs them | CHECK gates (block on CRITICAL) | `~/.claude/commands/gabe-*.md`, `~/.claude/skills/gabe-*/SKILL.md` |

**Critical observation:** Most strong anti-sprawl enforcement lives in L3 (commands), which means it only runs when the user explicitly invokes a gabe-* command. Raw `git commit` bypasses everything except L1 hooks, and L1 hooks only check syntax/format/placement — not semantic sprawl.

## Per-lifecycle enforcement map

### 1. Session start
| Gate | Layer | What it does | Anti-sprawl content |
|------|-------|--------------|---------------------|
| `session-start.js` | L1 hook | Loads previous session context, KDBP active markers | None directly; primes context but doesn't enforce |
| KDBP auto-load via `CLAUDE.md` | L2 | Surfaces BEHAVIOR/VALUES/PLAN/DOCS/STRUCTURE/DECISIONS/KNOWLEDGE/PENDING/LEDGER pointers | Strong context, weak gate — Claude is *invited* to consult, not *forced* |

**Gap:** No automated check that PLAN.md current phase still makes sense given last session's deltas. No "wells consulted?" verification.

### 2. Before exploring / proposing (B1 inventory rule)
| Gate | Layer | What it does | Hardness |
|------|-------|--------------|----------|
| BEHAVIOR.md B1 trigger-phrase rule | L2 | When user says "can we work on X", "should we Y", Claude must read PLAN/SCOPE/STRUCTURE/ROADMAP, suite commands, catalogs, externals before proposing | Manual self-discipline; recorded incident 2026-04-24 in BEHAVIOR.md |
| `/gabe-roast` adversarial-first option | L3 | Pre-roast alignment gate checks A1-A3 structural values + RULES.md violations | Advisory (PASS/CONCERN/FAIL printed; user proceeds anyway) |

**Gap:** B1 is a guideline, not a check. Nothing fires when Claude skips inventory and proposes a parallel architecture.

### 3. During planning (`/gabe-plan`)
| Gate | Layer | What it does | Hardness |
|------|-------|--------------|----------|
| Tier decision (Step 3.5) | L3 | Per-phase tier picked (mvp/ent/scale) with per-dim overrides logged in DECISIONS.md | Hard — phase can't finalize without tier |
| Coverage invariant (`/gabe-scope` Step 7) | L3 | Every SC ≥1 REQ, every REQ in exactly 1 phase | Hard (`--force` recorded if bypassed) |
| Layer 2 LLM filter on dimension matrix | L3 | Suppressed dimensions logged to DECISIONS.md | Soft (LLM judgment) |
| Plan-mode TodoWrite + plan file | L1+L3 | Plan must be written before execution; user approves via ExitPlanMode | Hard — no edits during plan mode |

**Gap:** No phase deduplication check. Phase 2 "Auth system" and Phase 7 "Permissions system" can both be created without cross-reference.

### 4. During execution / before file write (`/gabe-execute`)
| Gate | Layer | What it does | Hardness |
|------|-------|--------------|----------|
| Tier-cap filter (Step 2) | L3 | Tasks classified by section.dim; if introduces pattern above effective tier → pruned | Hard prune |
| Mid-phase escalation gate (Step 4.1) | L3 | Required when escalation needed; logs to DECISIONS.md | Hard — must escalate or refactor task |
| `kdbp-structure-check.py` PreToolUse | L1 hook | Glob-matches file_path against `.kdbp/STRUCTURE.md` allowed/disallowed | **Warn only (exit 0)** — does NOT block |
| `config-protection.js` PreToolUse | L1 hook | Blocks edits to `.eslintrc*`, `prettier*`, `biome.json*`, `ruff.toml`, etc | Block (exit 2) |
| `doc-file-warning.js` PreToolUse Write | L1 hook | Flags NOTES/TODO/SCRATCH outside `docs/, .claude/, skills/, .github/` | Warn only |

**Critical gap #1:** No "is this already abstracted?" check. Phase 2 writes `services/cache.py`. Phase 5 writes `utils/cache.py`. Both pass STRUCTURE.md. Nothing flags duplication.

**Critical gap #2:** STRUCTURE.md hook is *warn only*. A file that violates structure produces a console message but the write succeeds.

### 5. After file write (post-tool)
| Gate | Layer | What it does | Hardness |
|------|-------|--------------|----------|
| `quality-gate.js` PostToolUse | L1 hook | Biome/Prettier/gofmt/ruff format pass | Warn only |
| `post-edit-accumulator.js` PostToolUse | L1 hook | Records JS/TS files for Stop hook batch typecheck | Pass-through |

**Gap:** Nothing semantic runs post-write. Format and lint catch syntax sprawl, not architectural sprawl.

### 6. Stop (end of turn)
| Gate | Layer | What it does | Hardness |
|------|-------|--------------|----------|
| `stop-format-typecheck.js` Stop | L1 hook | Batch format + tsc across modified projects (270s budget) | Warn on failures (non-blocking) |
| `check-console-log.js` Stop | L1 hook | Scans modified JS/TS for console.log | Warn only |

**Gap:** No "did we touch a file in a gravity well? Did we update its docs?" check at Stop. That gate exists only at `/gabe-commit`.

### 7. Pre-commit (`/gabe-commit` — the strongest gate)
| Gate | Layer | What it checks | Hardness |
|------|-------|----------------|----------|
| CHECK 1 (existence) | L3 | Required KDBP files exist | Block |
| CHECK 6 (deferred scan) | L3 | Open PENDING.md items affecting changed files | Block on CRITICAL deferrals |
| CHECK 7 (doc drift, 4 layers) | L3 | L1: universal cards. L2: DOCS.md mappings. L3: gravity wells with Paths+Docs both populated. L4: mockup INDEX freshness. | Block on critical/high; defer low |
| CHECK 8 (structure) | L3 | New files matched against STRUCTURE.md Allowed/Disallowed | Block on CRITICAL (disallowed); MEDIUM (no match) |
| Notable Updates digest | L3 | Summarizes commit's structural impact | Informational |
| `pre-bash-commit-quality.js` PreToolUse Bash | L1 hook | console.log, debugger, secrets, TODO without issue refs | Block (exit 2) |

**Critical observation:** This is where most semantic anti-sprawl actually lives. CHECK 7 Layer 3 (gravity wells) is the single mechanical link between code changes and the "verified topics" knowledge structure. But Layer 3 severity is **always low**, so it gets deferred often.

**Gap:** CHECK 7 runs on already-staged diff. Pre-stage prevention would be earlier.
**Gap:** `/gabe-commit` runs only when invoked. Raw `git commit` skips CHECK 1-9 entirely.

### 8. Post-commit (`/gabe-teach`)
| Gate | Layer | What it does | Hardness |
|------|-------|--------------|----------|
| Foundation gate (Step 0.5) | L3 | KNOWLEDGE.md must have ≥1 non-empty gravity well row | Hard (offers init-wells; or auto-creates G0 Uncategorized) |
| Write-back loop (Step 0.7) | L3 | Every lesson updates KNOWLEDGE.md Topics row + HISTORY.md | Hard — no in-memory-only progress |

**Gap:** Foundation gate has a `[skip]` escape that auto-creates G0 Uncategorized. Topics can pile up in G0 indefinitely.

### 9. Periodic (manual invocation)
| Gate | Layer | What it does | Hardness |
|------|-------|--------------|----------|
| `/gabe-debt` P1-P11 patterns | L3 | Detects dual-state-machines, async-listener-race, contradictory-decisions, scope-code-commit misalignment | Non-blocking triage |
| `/gabe-debt audit-rules` | L3 | RULES.md audit | Read-only |
| `/gabe-align` | L3 | Values + RULES.md violations check | Advisory |
| `/gabe-assess` | L3 | Blast radius + alternatives preview | Informational |

**Gap:** All periodic gates are manual-invoke. P1 (dual-state-machines) is exactly the pattern that recurred 6 times in the BoletApp port.

## Where anti-sprawl is strong

- **File placement** (STRUCTURE.md + CHECK 8 + `kdbp-structure-check.py`) — three-layer coverage. Disallowed patterns are CRITICAL at commit.
- **Tier discipline** (gabe-plan tier decision + gabe-execute tier-cap filter) — each phase has a recorded tier; tasks above tier are pruned.
- **Phase deferral** (PLAN.md L-block, PENDING.md statuses) — recently demonstrated: P5-P12 explicitly deferred until L5 ✅. Active queue banner prevents skipping ahead.
- **Decision logging** (DECISIONS.md D1-D22) — every architectural choice has a row.
- **Knowledge consolidation** (KNOWLEDGE.md G1-G7 wells + 2026-04-27 verified findings) — 7 architectural wells with paths, analogies, doc links.
- **Doc drift detection** (CHECK 7 Layers 1-4) — deterministic, four-layer coverage.

## Identified gaps (consolidated)

| # | Gap | Where it leaks | Affected dimension |
|---|-----|----------------|---------------------|
| **G-01** | No "already abstracted?" check before file write | Between `/gabe-execute` Step 2 and Step 4 | Function/saga sprawl |
| **G-02** | No phase deduplication during `/gabe-plan` | Step 3 phase decomposition | Feature/scope sprawl |
| **G-03** | STRUCTURE.md PreToolUse hook is warn-only | `kdbp-structure-check.py` exit 0 | File sprawl |
| **G-04** | KNOWLEDGE.md gravity wells not consulted at write time | Only at `/gabe-commit` CHECK 7 Layer 3 | Pattern/saga sprawl |
| **G-05** | Topics table in KNOWLEDGE.md is empty | Lines 61-62 of KNOWLEDGE.md | Verification sprawl |
| **G-06** | Doc drift check is post-stage (retroactive) | CHECK 7 runs on already-staged diff | Doc sprawl |
| **G-07** | Layer 3 gravity-well doc drift always severity `low` | CHECK 7 Layer 3 | Doc sprawl |
| **G-08** | RULES.md violations don't block | `/gabe-align`, `/gabe-review`, `/gabe-debt audit-rules` advisory | Pattern sprawl |
| **G-09** | VALUES.md checks don't block by default | `/gabe-align` advisory | Vocabulary/dogma sprawl |
| **G-10** | Scope bypass only caught at `/gabe-commit` | Direct edits to SCOPE.md → CRITICAL only at commit | Scope sprawl |
| **G-11** | Tier decision has no feedback loop | `/gabe-plan` Step 3.5 logs tier; no post-execution mismatch detection | Tier sprawl |
| **G-12** | Deferred items have no aggregate report | PENDING.md auto-escalates per-item; no per-category surfacing | Debt sprawl |
| **G-13** | STRUCTURE.md doesn't detect orphan folders | CHECK 8 only validates new files | Structural decay |
| **G-14** | Periodic debt scan is manual-invoke only | `/gabe-debt` runs when user remembers | Pattern sprawl — BoletApp killer |
| **G-15** | Foundation gate `[skip]` allows G0 Uncategorized indefinitely | `/gabe-teach` Step 0.5 | Knowledge sprawl |
| **G-16** | Vocabulary drift inside existing files | No hook flags new enums, status values, naming conventions | Vocabulary/dogma sprawl |
| **G-17** | Cross-file import cycles undetected | No hook checks circular deps | Coupling sprawl |
| **G-18** | `/gabe-commit` not auto-invoked by any hook | User must remember; raw `git commit` bypasses | All gates downstream of commit |
| **G-19** | Verification coverage not automated against changed files | `npm test` covered `docs/mockups/` only; new tree uncovered until Phase 2 review | Test sprawl |
| **G-20** | UX-state equivalence and data-flow anomalies undetected | Currency-mismatch overwrites without FX, errors render identically, low-confidence indistinguishable | Behavioral sprawl |

## Empirical evidence (session audit)

**Sessions analyzed:** 8 gastify project sessions (2026-04-23 → 2026-04-27) totaling ~7,500 gabe-command invocations.

### Invocation distribution

| Command | Invocations | Notes |
|---------|-------------|-------|
| `/gabe-mockup` | 2,639 | Spike mode + template generation |
| `/gabe-commit` | 1,432 | Strongest gate — fired on every tracked commit |
| `/gabe-teach` | 1,171 | Foundation gate ran consistently |
| `/gabe-review` | 878 | Phase reviews captured findings |
| `/gabe-execute` | 657 | Tier-cap filter active |
| `/gabe-plan` | 550 | Tier decision logged per phase |
| `/gabe-scope-change` | 516 | Pivot/addition routing |
| `/gabe-scope` | 421 | Initial backbone |
| `/gabe-roast` | 28 | Adversarial review (light usage) |
| `/gabe-align` | 28 | Values check (light usage) |
| `/gabe-assess` | 28 | Impact preview (light usage) |
| **`/gabe-debt`** | **5** | **Exploratory only — never in standard flow** |

**The single most damning empirical finding:** `/gabe-debt` ran 5 times in 7 large sessions while `/gabe-commit` ran 1,432 times. Pattern detection (P1 dual-state-machines is exactly the BoletApp killer) is in the toolbox but not on the path. By ratio it's 0.35% of commit-gate frequency.

### What gates actually caught

- **CHECK 8 (structure)** — fired ~5 times. All resolved via `update-structure`; zero blocked (all MEDIUM).
- **CHECK 7 (doc drift)** — Phase 2 atoms review produced 7 findings. **100% deferral rate; zero blocked.**
- **Tier-cap pruning** — zero tasks pruned in observed phases.
- **Deferred item escalation** — P1 ("Phase 1 built P5-P11 production surfaces early") remained open across 2 review cycles.

### What slipped through (concrete cases)

1. **Dual-ledger pattern (6 instances)** — KNOWLEDGE.md 2026-04-27 documents 6 confirmed cases. Both files passed STRUCTURE.md (`services/` + `slices/` both allowed). `/gabe-debt` P1 would catch retroactively, but never ran.

2. **Lane rollback (LEDGER 2026-04-23)** — User created parallel `ux-mockups` + `p1-backend` phase tracks. Manually rolled back. No mechanical gate prevented the parallel design.

3. **Style prompt trim (PENDING.md P2)** — PLAN called for 6 legacy + 3 new = 9; only legacy 6 delivered. No DECISIONS entry. `/gabe-plan` had no "did we deliver what we planned?" check.

4. **Verification coverage gap** — `npm test` 63/63 passed but exercised only one of two mockup trees. Discovered post-Phase-2 review.

5. **UX findings (PENDING.md P6-P10)** — Currency-mismatch silent overwrite, error states identical, low-confidence indistinguishable. All caught by hands-on testing, none by gates. Marked `status=rebuild-only`.

### Empirical confirmation/contradiction

| Gap | Status | Evidence |
|-----|--------|----------|
| G-01 | **CONFIRMED** | 6 dual-ledger instances passed all gates |
| G-02 | **CONFIRMED + RESOLVED** | Parallel lane layout, manually reversed |
| G-03 | **CONFIRMED** | LEDGER documents warn-only |
| G-06 | **CONFIRMED** | Phase 2 atoms committed before CHECK 7 fired |
| G-07 | **CONFIRMED** | 100% deferral rate on Phase 2 review findings |
| G-14 | **STRONGLY CONFIRMED** | 5 vs 1,432 invocation ratio |
| G-18 | **PARTIAL** | One 2026-04-24 raw commit via Codex CLI bypass logged retroactively |
| G-19 | **NEW** | npm test covered wrong tree |
| G-20 | **NEW** | P6-P10 discovered by hand, not by gate |

The other 9 gaps (G-04, G-05, G-08–G-13, G-15–G-17) were not contradicted but didn't surface concrete cases — "potential leaks" rather than "observed leaks."

### Hardness mismatch (the structural pattern of the failures)

The suite catches **placement and syntax violations as CRITICAL** but catches **architecture and behavior violations as LOW or not at all**:

- New file in wrong folder → CHECK 8 CRITICAL → blocked.
- Two state machines for same domain → no gate → ships.
- console.log in committed code → pre-bash hook exit 2 → blocked.
- Currency mismatch silently corrupts data → no gate → reaches user.
- Doc target stale by 1 commit → CHECK 7 Layer 3 LOW → deferred.

The suite was designed for *file/syntax discipline*. It was not designed for *semantic and behavioral discipline*. The L-block (mockups-legacy) extraction exists precisely because that discipline gap manifested as architectural fragility in the BoletApp port.

## Improvement options (no commitment, just options)

### Lifecycle-shift options (move detection earlier)

- **O-A.** Move CHECK 7 Layer 3 (gravity-well doc drift) from post-stage to post-write (Stop hook).
- **O-B.** Move CHECK 8 (structure) from `/gabe-commit` to PreToolUse Write hook with **block** (exit 2) instead of warn.
- **O-C.** Add a "wells consulted?" gate at `/gabe-execute` Step 4 (before file write).
- **O-D.** Hook `/gabe-commit` invocation as a PreToolUse Bash check on `git commit`. Block raw commits.

### Detection-coverage options

- **O-E.** Add semantic redundancy check to `/gabe-execute` Step 2 — grep codebase for the task's described capability before allowing write.
- **O-F.** Add cross-phase scope overlap check to `/gabe-plan` Step 3 — keyword overlap between phase descriptions.
- **O-G.** Add aggregate PENDING.md report — distribution of deferred items by category, age, defer count.
- **O-H.** Add tier-feedback loop at `/gabe-execute` Step 7 (phase complete) — surface "phase tier mismatch?" if escalations occurred.
- **O-I.** Add orphan-folder check to `/gabe-health` — scan STRUCTURE.md folders with zero files.

### Hardness-bump options (turn warns into blocks)

- **O-J.** Bump `kdbp-structure-check.py` from warn-only to block on disallowed patterns.
- **O-K.** Add `/gabe-commit` CHECK 8.5 — RULES.md audit. Block commits violating CRITICAL rules per maturity tier.
- **O-L.** Add maturity-aware values gate at `/gabe-commit` — MVP advisory, Enterprise/Scale block on FAIL.
- **O-M.** Bump CHECK 7 Layer 3 severity from always-low to maturity-dependent.

### Knowledge-consolidation options (close the topics gap)

- **O-N.** Populate KNOWLEDGE.md Topics table from existing 2026-04-27 findings — convert long-form Verified Findings into 5-10 verified topic rows.
- **O-O.** Add "topic verification debt" check to `/gabe-teach status` — surface wells with paths/docs but no verified topics.
- **O-P.** Add `[skip]` audit to `/gabe-teach` — track skip count; surface "skipped N times; pick wells now?".

### Vocabulary/coupling options (deeper semantic enforcement)

- **O-Q.** Add enum/status drift detection to `/gabe-debt` — flag new enum values without DECISIONS.md entry.
- **O-R.** Add import-cycle detector as `/gabe-debt` P12.
- **O-S.** Add naming-convention drift detector — scan new identifiers against existing patterns in same well.

### Frequency-correction options (make underused gates run more)

- **O-T.** Auto-trigger `/gabe-debt` P1-P11 scan on phase-complete (after `/gabe-execute` Step 7). Closes the 5-vs-1,432 gap.
- **O-U.** Add `/gabe-debt` to `/gabe-next` routing for end-of-phase ticks.

### Coverage-and-behavior options (close G-19, G-20)

- **O-V.** Add changed-file-coverage check to `/gabe-commit` — for files in diff, verify a test file references them.
- **O-W.** Add behavioral-equivalence canary to `/gabe-review` for state-flow code — flag code paths where two states render or behave identically when they should differ.
- **O-X.** Add data-flow lint to `/gabe-debt` P12 — detect dual writes to "the same conceptual entity" across files (heuristic: same key/id appears in two writers without an explicit reconciliation reference).

## What this audit does NOT do

- Does not propose which gaps to fix.
- Does not size effort.
- Does not commit to any improvement option.
- Does not modify any code, command, skill, hook, or KDBP file (other than this audit document).
- Does not update PLAN.md (the active KDBP plan is L1: mockups-legacy Atoms — unaffected).

## Verification

End-to-end check (read-only):
1. Read `~/.claude/commands/gabe-commit.md` lines 70-138 — confirm CHECK 7 layers and CHECK 8 structure described above match.
2. Read `.kdbp/STRUCTURE.md` lines 14-119 — confirm allowed/disallowed pattern table exists.
3. Read `.kdbp/KNOWLEDGE.md` lines 27-35 — confirm 7 wells defined; lines 61-62 confirm Topics table empty.
4. Read `~/.claude/scripts/hooks/kdbp-structure-check.py` lines 75-96 — confirm exit 0 (warn-only).
5. Read `~/.claude/commands/gabe-execute.md` Step 2 lines 76-99 — confirm tier-cap filter is the only mechanical sprawl-prevention during execution.

If any of those reads contradict the audit, the audit needs correction.

## Critical files referenced (read-only — none modified other than this file)

- `~/.claude/commands/gabe-commit.md` (CHECK 1-8, doc-drift layers)
- `~/.claude/commands/gabe-execute.md` (tier-cap filter, mid-phase escalation)
- `~/.claude/commands/gabe-plan.md` (tier decision, scope coverage)
- `~/.claude/commands/gabe-teach.md` (foundation gate, write-back loop)
- `~/.claude/skills/gabe-debt/SKILL.md` (P1-P11 patterns)
- `~/.claude/scripts/hooks/kdbp-structure-check.py` (warn-only structure hook)
- `~/.claude/scripts/hooks/pre-bash-commit-quality.js` (commit syntax gate)
- `~/.claude/scripts/hooks/stop-format-typecheck.js` (Stop batch format/tsc)
- `.kdbp/STRUCTURE.md`, `.kdbp/KNOWLEDGE.md`, `.kdbp/DECISIONS.md`, `.kdbp/PENDING.md`, `.kdbp/PLAN.md`, `.kdbp/BEHAVIOR.md`, `.kdbp/VALUES.md` (project KDBP layer)
- `~/.kdbp/VALUES.md` (user-level values)
