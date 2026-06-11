# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Port the legacy analytics navigation bars: the L1–L4 classification-level bar (flatten the spend distribution at Industry / Store-type / Item-family / Item) and the W/M/Q/Y temporal bar with prev/next period navigation — functionality-first (API + web reference UI + contracts), overhaul-independent.

## Context

- **Maturity:** mvp.
- **Created:** 2026-06-11
- **Last Updated:** 2026-06-11 (authored from the legacy analysis: legacy's DonutViewMode = 4 pills over one classification ladder (store-groups/store-categories/item-groups/item-categories) + TimePeriod pills week|month|quarter|year with prev/next (TimeSelector). Gastify's /insights/tree already serves the FULL 4-level cross-walk (level bar = client-side flattening, no backend change) and /insights/series already does week granularity; the ONLY backend gap is ISO-week periods (YYYY-Wnn) for tree/monthly. Mobile RN bars deliberately ride the visual overhaul — the API + behavior contracts land here first.)

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Week periods (backend) | parse_report_period accepts ISO weeks (YYYY-Wnn → Mon..Sun range) for /insights/tree + /insights/monthly; endpoint patterns/docs updated; contract tests incl. year-boundary weeks (W01/W53). Types regen. | mvp | low-med | ⬜ | ⬜ | ⬜ | ⬜ |
| 2 | The two bars (web) | Trends page: L1–L4 segmented control (flatten the tree at depth N client-side; drill still narrows) + W/M/Q/Y pills with prev/next period arrows. Stable testids; minimal styling (overhaul re-skins). | mvp | med | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | Proof (e2e) | Web e2e vs deployed staging-e2e: level switch changes the slice set (L1 coarse → L4 fine); period pills + arrows change the figures; weekly renders end-to-end. | mvp | low-med | ⬜ | ⬜ | ⬜ | ⬜ |

## Current Phase

Phase 1: Week periods (backend)

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| ISO-week edge cases (W01 belonging to the prior year, W53) | med | use Python's date.fromisocalendar; boundary contract tests |
| Level flattening double-counts when tree nodes carry rolled-up totals | med | flatten by summing LEAF-ward at depth N exactly; assert level totals all equal the period total |
| Trends UI churn collides with the overhaul lane | low | testids + minimal markup only; no styling investment |
