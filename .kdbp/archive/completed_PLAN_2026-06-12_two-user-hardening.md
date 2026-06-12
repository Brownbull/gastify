# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Two-user runtime hardening: prove (and fix where broken) the second user's LIVE view of group interactions — share propagation into B's statistics, visibility/consent gating of B's transaction list, deletion semantics (share-lock refusal; leave keep-vs-delete) as seen by the OTHER user, including the D72 departed-contributor contrast (keep: stats stay, row hides) vs D82 (delete: month voids).

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Semantics recon | Pin down: voided-month rendering on the web group dashboard, B-user cleanup capability, manual-entry/POST behavior in group scope, unshare path existence, role-change controls, batch-delete refusal surface. | mvp | low | ✅ | ✅ | ✅ | ✅ |
| 2 | Two-user stats/delete e2e | New groups-two-user-stats.spec.ts: share→B stats + gated list; role promote→A leave-delete→B sees voided month + empty list; leave-keep contrast (stats stay, departed row hides); source-delete inertness (D74 D-Q3). Fixes found: web void notice, manual-entry D70 guard, D94 ownership transfer, D95 leave-delete proof scope + tombstone cascade. | mvp | med | ✅ | ✅ | ✅ | ✅ |

## Current Phase

Phase 2: Two-user stats/delete e2e
