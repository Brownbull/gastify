# Deployments

<!-- Append-only log of push / CI / deploy events. Written solely by /gabe-push Step 7.5. -->
<!-- One row per successful push (Step 4 reached). Never edited by other commands. -->
<!-- -->
<!-- Columns: -->
<!--   #              Sequential ID (P[N]) -->
<!--   Date           YYYY-MM-DD HH:MM -->
<!--   Branch → Target  Source branch → PR target -->
<!--   PR             PR number (#42) or URL -->
<!--   CI Result      ✅ N/N (Ms)  |  ⚠ N/M (Ms)  |  ❌ X/M (Ms) — failed: name  |  ⏳ timeout  |  — (no CI) -->
<!--   Notes          promoted main → prod | auto-fix applied: lint | CI re-run after fix | PR merged before push -->
<!--   Decisions      Empty by default; populated by Step 7.5b note action (operational summaries) -->
<!-- -->
<!-- Growth policy: no auto-archive in v1. Revisit if file exceeds ~500 rows. -->

| # | Date | Branch → Target | PR | CI Result | Notes | Decisions |
|---|------|-----------------|-----|-----------|-------|-----------|
| P1 | 2026-04-23 00:17 | main → main (direct) | — | — | first push; trunk-based direct-to-main (pre-code-scaffold repo state) | Trunk-based chosen during scaffold phase — revisit when 2nd contributor joins OR CI wires up OR first lane branch opens |
| P2 | 2026-04-23 00:31 | main → main (direct) | — | — | bookkeeping mop-up push (closes P1 Step 8.5 gap) | — |
| P3 | 2026-04-24 10:40 | main → main (direct) | — | — | Phase 1 UX mockups exit-push — 35 commits since P2; includes 14 desktop variants + design-system.html + tokens.json + Phase 1 review artifacts (PLATFORM-NOTES, D20, P1-P4 defers) | — |
| P4 | 2026-04-25 03:42 | main → main (direct) | — | — | Phase 2 atoms exit-push — 6 commits since P3; bundles atoms tooling (Tweaks rebuild, Space Grotesk, atoms gallery hub, legacy reference Layer A+B, viewport toggle, 43-spec Playwright harness) + Phase 4 hub seeds (root index.html, flows/index.html, molecules/, gap-matrix.html) | — |
| P5 | 2026-04-27 16:30 | main → main (direct) | — | — | 5-phase catch-up exit-push — 3 commits since P4: be9aefd (P3 molecules + P4 hub D22 + Spike P14 frontend + L0 + L1 + /gabe-review L1 fixes; 1184 files, +154970/-157) + c69447d (LEDGER + PLAN tick bookkeeping). 91/91 Playwright tests pass. Pixel art budget 0/2000 used (BoletApp set mirrored). | Phase L1 Commit auto-ticked; P3/P4/Spike P14/L0 Commit columns remain ⬜ — only Current Phase auto-ticks per /gabe-commit Step 6.6 |
| P6 | 2026-04-28 11:36 | main → main (direct) | — | — | L2 mid-phase push — 4 commits since P5: 907157f (Current Phase advance to L2) + bb934e1 (D18 file-triple cascade + KDBP audit D23 + parallel validate-mode scaffold; 49 files, +4167/-65) + f80ac14 (LEDGER bookkeeping for bb934e1) + this push's bookkeeping commit. P12 deferred: 5 broken molecule triples flagged for rebuild after R1+R2 enforcement gates land (see DECISIONS.md D23 + ~/.claude/plans/why-did-you-do-twinkling-lecun.md). Trunk-based; no PR; CI=none. | L2 Push column NOT auto-ticked (Exec=🔄 in-progress, not ✅). User override accepted broken work despite plan; rebuild deferred to post-R1+R2 session. |
| P7 | 2026-05-06 | rebuild/be-phase-01 → main | #2 | ❌ 7/9 — failed: backend-test, frontend-lint, frontend-test, security-sca, custom-gates | Backend P1-P3 foundation push — 50 commits on feature branch; key commits: 3eff76f (P1 scaffold + P2 money/FX/i18n + P3 identity/RLS; 39 files, +3993/-472) + 2e42423 (KDBP bookkeeping). 52 tests pass, ruff clean. 3 Alembic migrations, 11 models, FX lazy cache service, Firebase JIT auth, RLS policies. First PR-based push (vs. prior trunk-based direct). | — |
| P8 | 2026-05-06 16:58 | rebuild/be-phase-01 → main | #2 | ✅ 9/9 (40s) | CI-fix iteration — 5 commits (e266afd → 059d642): uv.lock tracked + ruff format + biome lint + vitest script + backend coverage 81% + deprecated nav refs + dependency-groups migration + esbuild peer dep + pip-audit added + serialize-javascript audit fix. All 9 CI jobs green. | — |
| P9 | 2026-05-07 | main → main (direct) | — | ✅ 8/8 | Phase 4 review fixes (7 findings) + coverage greenlet concurrency fix. 3 commits: 618a445 (KDBP tick) + 741e973 (review fixes) + 721ee06 (coverage config). 105 tests, 96% coverage. | — |
| P10 | 2026-05-07 15:01 | main → main (direct) | — | ✅ 8/8 (70s) | Phase 5 observability push — 5 commits: per-scan metric columns + Prometheus exporter + ge≥0 constraints + metrics API-key auth + 8 new tests. 125 tests pass. | — |
| P11 | 2026-05-07 21:01 | main → main (direct) | — | ✅ 8/8 (60s) | Phase 6 exit-signal + review bookkeeping — 3 commits: addc2b2 (P10 bookkeeping) + e8cf7ed (P1 exit-signal smoke test) + 2fac518 (Phase 6 Review tick + LEDGER trace). 126 tests, 96% coverage. All P1 phases complete. | — |
| P12 | 2026-05-12 16:36 | main → main (direct) | — | ✅ 8/8 (50s) | P2 Phase 1 push — 5 commits (900a1be → 59479ab): feat(scan) schema + V4 taxonomy + image compression + submission endpoint, review fixes (corrupt image guard, DB-failure cleanup, CHECK constraint), CI fixes (ruff format, urllib3 2.7.0, protobufjs audit). 140 tests pass. auto-fix applied: format,deps; CI re-run after fix | — |
| P13 | 2026-05-12 19:15 | main → main (direct) | — | ✅ 8/8 (50s) | P2 Phase 2 push — 7 commits (59479ab → 870856b): PydanticAI extraction agent + idempotent worker + review fixes (RATE_LIMIT→transient, QUOTA_EXCEEDED split, stuck-scan recovery, async I/O, README API key fix). 232 tests pass. auto-fix applied: format; CI re-run after fix | — |

<!-- Example rows:
| P1 | 2026-04-17 14:22 | feature/add-auth → main | #42 | ✅ 3/3 (47s) | promoted main → (none) | — |
| P2 | 2026-04-17 15:08 | fix/ci-typo → main | #43 | ❌ 1/3 (12s) — failed: lint | auto-fix applied: lint; CI re-run after fix | — |
| P3 | 2026-04-18 09:15 | feat/blue-green → main | #45 | ✅ 3/3 (52s) | — | CI workflow updated to add staging gate |
-->
