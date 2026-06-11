# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Feature-correctness verification: prove the behavior contracts of existing features that must survive the upcoming UI overhaul — the learned-mappings loop, transaction delete (+ the 90-day window rule, to build), stats reacting to edits/shares (personal + group), reconciliation outcomes, and group admin operations — on web AND the S23.

## Context

- **Maturity:** mvp; Phase 2 tiered ent (data deletion + stats integrity).
- **Created:** 2026-06-11
- **Last Updated:** 2026-06-11 (authored after the feature audit: learned mappings FULLY BUILT (learn on merchant/store_category/item-name/item_category edits → auto-apply on next scan, usage_count) but ZERO tests on the loop; batch-update suspected NOT to learn (inconsistency); DELETE /transactions exists but hard + no 90-day window (UX-11 parity gap — user wants delete gated ≤90 days so old-period stats stay stable); stats-react-to-edits/group-stats/recon-matrix/admin-ops are e2e gaps. S23 reachable via WiFi ADB.)

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Learned-mappings contract | API-level tests for the full loop: edit merchant/category → MerchantMapping; edit item name/category → CategoryMapping; NEXT fixture scan auto-applies both; usage_count increments; re-edit updates the mapping. Fix batch-update if it doesn't learn (consistency). | mvp | med | ✅ | ✅ | ✅ | ✅ |
| 2 | Delete + 90-day window | Implement UX-11 parity: DELETE /transactions/{id} refused for transactions older than 90 days (409, config-tunable window); DSR erasure NEVER gated (separate bulk path). Tests: delete ≤90d works + stats reflect it; >90d blocked; erasure still total. Web e2e delete journey. | ent | med | ✅ | ✅ | ✅ | ✅ |
| 3 | Stats-react + groups + recon e2e | Web e2e: category edit → dashboard/report figures CHANGE; share txn → GROUP stats include it; group admin ops (remove member, role change, delete group); reconciliation outcome matrix (matched / statement-only / app-only — fixture-driven where possible, backend-level otherwise). S23 mirrors: mappings loop + delete + stats-react. | mvp | med-high | ⬜ | ⬜ | ⬜ | ⬜ |

## Current Phase

Phase 3: Stats-react + groups + recon e2e

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| The 90-day delete gate breaks DSR erasure or batch ops | high | erasure uses delete_user_personal_data (bulk SQL, not the endpoint) — explicit test that erasure ignores the window |
| Mapping auto-apply tests depend on fixture scan internals | med | drive via the real persist path (fixture provider) not mocks |
| Stats e2e flake on shared staging data | med | timestamped test data + the P82 cleanup pattern |
