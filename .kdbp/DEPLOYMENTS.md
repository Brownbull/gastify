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

<!-- Example rows:
| P1 | 2026-04-17 14:22 | feature/add-auth → main | #42 | ✅ 3/3 (47s) | promoted main → (none) | — |
| P2 | 2026-04-17 15:08 | fix/ci-typo → main | #43 | ❌ 1/3 (12s) — failed: lint | auto-fix applied: lint; CI re-run after fix | — |
| P3 | 2026-04-18 09:15 | feat/blue-green → main | #45 | ✅ 3/3 (52s) | — | CI workflow updated to add staging gate |
-->
