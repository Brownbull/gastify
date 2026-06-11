# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Functionality completion: fix the two filed bugs now (P83, P84) and BUILD the missing user-facing functionality the audit found — matched-transaction indicator, per-user currency switch (CLP↔USD), group admin controls, learned-mappings management — each as backend + minimal FUNCTIONAL UI + tests, fully independent of the parallel visual overhaul (which re-skins only; it must find every behavior already working and tested).

## Context

- **Maturity:** mvp.
- **Created:** 2026-06-11
- **Last Updated:** 2026-06-11 (authored per user directive: bugs triaged fix-now; missing functionality built NOW unless too large; the design-lab session is VISUAL ONLY. Deferred with rationale: credit UX (no payment provider; billing enforcement deliberately off), onboarding/offline-banner/empty-states/undo-toast/theme-preview (presentation-dominant → the visual session).)

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Bug fixes (P83+P84) | P83: deleting a group (or leave-with-delete) resets is_shared on source transactions whose LAST group copy is gone — no more locked-forever strands; shared helper + tests. P84: ledger-edit Maestro flow made row-robust (pick a row with items, lock-resilient). | mvp | low-med | ✅ | ✅ | ✅ | ✅ |
| 2 | Matched-transaction indicator | Expose reconciliation match state per transaction (list + detail API) + a minimal UI badge on rows/detail; e2e asserts a matched txn shows it after statement reconcile. | mvp | med | ✅ | ✅ | ✅ | ✅ |
| 3 | User currency switch | PATCH settings endpoint for users.default_currency (CLP↔USD, validated vs currencies) + expose in profile API; the dashboard/display consumes it (primary-display preference per UX-10); minimal settings select; tests both directions. | mvp | med | ✅ | ✅ | ✅ | ✅ |
| 4 | Group admin UI | Web controls for the EXISTING backend admin ops: remove member, change role, delete group (delete also un-strands via P83 fix); e2e for each incl. the admin-must-promote-before-leave 409 path. | mvp | med | ✅ | ✅ | ✅ | ✅ |
| 5 | Learned-mappings management | UX-4 parity: GET+DELETE APIs for merchant/item mappings + a minimal settings list with delete; e2e: delete a mapping → next scan no longer applies it. | mvp | med | ⬜ | ⬜ | ⬜ | ⬜ |

## Current Phase

Phase 5: Learned-mappings management

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| is_shared reset hits a source whose copy still exists elsewhere | high | reset ONLY when no live group copy remains (count copies across all groups); contract tests both ways |
| Currency switch implies recompute semantics | med | display-preference ONLY (UX-10: native primary) — totals stay per-currency + USD shadow; no stored-amount rewrites |
| UI work collides with the visual overhaul | low | minimal functional markup with stable data-testids; overhaul re-skins on top |
