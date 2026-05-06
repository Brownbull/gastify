# AGENTS.md — Scan + Batch

Learnings from RALPH iterations on the Scan feature.

## Phase A Seed

- [2026-05-04] Scan routes: `/scan` (new), `/transactions/:transactionId` (edit/view), `/batch/capture`, `/batch/review`. Uses `scanId` as route param.
- [2026-05-04] Scan event streaming uses SSE with seven-state union defined in `shared/types/scan-events.ts` (RALPH-untouchable). Mock event streams at `hooks/ui/` boundary, never import scan-events.ts directly in stories.
- [2026-05-04] Credit lifecycle (debit/refund/retry) documented in `backend/runbooks/CREDIT-LIFECYCLE.md`. Credit balance hook: `useCreditBalance()`.
- [2026-05-04] High `human-authored` ratio in this gravity well — scan workflow cross-screen states (scan→review→confirm→history) require human authoring.
- [2026-05-04] Scan is mobile-primary UI. Tablet/desktop layouts may differ significantly from mobile.
- [2026-05-04] Statement scan (PDF upload + processing + merge preview) is a distinct sub-flow within this scope.

## Stuck Stories
(none yet)
