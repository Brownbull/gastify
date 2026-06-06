# Active Plan

<!-- status: active -->
<!-- project_type: code -->

## Goal

Reports v2 — rebuild the legacy BoletApp "Resumen" report **detail** experience in gastify (web + mobile): tap a period report → a rich detail view with hierarchical store + product/item group breakdowns, a persona insight, highlights, and a drill into the underlying transactions. Recovers the depth the current flat period-cards Reports screen is missing, reusing the analytics backend we already ship.

## Context

- **Maturity:** mvp
- **Domain:** Chilean smart expense tracker (AI receipt scanning, multi-currency analytics, PWA + native mobile)
- **Created:** 2026-06-05
- **Last Updated:** 2026-06-06 (Phase 3 — Quarter/Year breakdowns — COMPLETE ✅×4 + shipped to production (D81, P65/P66). **ALL Reports v2 phases (1–3) done + in prod.** The range-based /insights/tree + /monthly now accept YYYY-MM / YYYY-Qn / YYYY (month behavior byte-identical); the report detail opens for quarter/year cards with the grouped breakdown + a quarter-aware insight (trend gated to month so quarter/year aren't mislabeled "vs last month"). Adversarial review workflow (4 dims incl. security-reviewer; 16 raw → 12 confirmed, 2 HIGH fixed: year baseline over-read + the "vs last month" mislabel). backend 827 (6 new quarter/year tests, month unchanged) / web 117 / mobile 247. B2-proven both platforms (web month+quarter + S23 p14 month + p15 quarter — the S23 re-locked twice mid-session; user unlocked it for the proofs). A backend slice, so the deployed backend had to STABILIZE before the FE proofs were valid. Per-category trend sparklines descoped → PENDING P66. Current Phase advanced 3→done. Next: ROADMAP P16 (Compliance + Launch Hardening). Prior: Phase 2 — Persona insight + highlights — COMPLETE ✅×4 + shipped to production (D80, P63/P64). A shared buildReportInsight(monthly, card) → persona insight sentence + highlights ("trophies") in the report detail (web overlay + mobile screen), from /insights/monthly gravity_centers + top categories + the card trend; ported from the legacy reportInsights decision tree + Chilean seasonal copy (web i18n es/en/pt; mobile English). Adversarial review workflow (4 dims, 24 raw → 15 confirmed, all HIGH + impactful MEDIUM fixed). B2-proven both platforms (web Playwright + S23 Maestro p14 — S23 auto-locked mid-session; user unlocked it for the proof). Current Phase advanced 2→3. Pure frontend (only Phase 3 needs backend). Prior: Phase 1 — Report Detail Overlay + grouped breakdown — COMPLETE ✅×4 + shipped to production (D79, P61/P62). Tap a month report → web overlay / mobile ReportDetailScreen with the hierarchical store + item grouped breakdown (donut + group cards) from `/insights/tree` (D69) + "view transactions" drill (new `/transactions` validateSearch {dateFrom,dateTo}; resolved PENDING P47). Pure frontend, no migration. Reviewed (typescript + code reviewer, 0 CRITICAL; 3 HIGH + MEDIUMs fixed); web vitest 98 / mobile jest 238; B2-proven both platforms on deployed staging-e2e (web Playwright + S23 Maestro p14). In-proof fixes: empty-dimension message ("No categories in this period.") + mobile flow taps the most-recent completed month. Current Phase advanced 1→2. Prior: plan authored 2026-06-05 — Reports v2 ROADMAP scope-addition, legacy "Resumen" rebuild; backend already ships /insights/tree + gravity_centers + week series, so Slices 1+2 are FE assembly, only Slice 3 needs new backend.)
- **Decision basis:** Legacy reports gap analysis (2026-06-05, in LEDGER) comparing `boletapp/src/features/reports/` vs gastify `web/src/routes/reports.tsx` + `mobile/src/screens/ReportsScreen.tsx`. Legacy-parity-as-reference (rebuild the feel, don't gold-plate). This is a ROADMAP scope-addition (not yet on the roadmap) — add via `/gabe-scope-addition` when greenlit; sits after P15, around/before P16.

## Phases

| # | Phase | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Report Detail Overlay + grouped breakdown | Tap a period report card → a detail overlay/screen with store-group cards + item-group cards (from `/insights/tree`) each with a `CategoryDonut`, plus a "view transactions" drill into the filtered transactions list. Reuses existing tree + donut — no new backend. Web + mobile. | mvp | high | ✅ | ✅ | ✅ | ✅ |
| 2 | Persona insight + highlights | Add a Rosa-friendly insight sentence + a highlights ("trophies") block to the detail view — biggest category rise/drop, category leader, dominant/diverse patterns — sourced from `/insights/monthly` `gravity_centers` + the period series; Chilean seasonal copy (verano / fiestas patrias / fin de año) as frontend strings. Port `reportInsights.ts` logic. Web + mobile. | mvp | med | ✅ | ✅ | ✅ | ✅ |
| 3 | Quarter/Year breakdowns + per-category trend | The only net-new backend: generalize the `/insights/tree` + `/insights/monthly` category rollups to **quarter/year** periods (lifts the D77 month-only limit). Detail opens for quarter/year cards with the grouped breakdown + insight. Web + mobile. (Per-category trend **sparklines** descoped to a follow-up — see PENDING.) | mvp | high | ✅ | ✅ | ✅ | ✅ |

<!-- Exec is written by /gabe-execute: ⬜ not started, 🔄 in progress, ✅ complete -->
<!-- Review/Commit/Push auto-ticked by /gabe-review, /gabe-commit, /gabe-push -->
<!-- A phase is complete when all four status columns are ✅ -->
<!-- /gabe-next routes to the next command based on column state (Exec → Review → Commit → Push → advance phase) -->
<!-- Tier column values: mvp | ent | scale. Read by /gabe-execute (tier-cap) and /gabe-review (TIER_DRIFT finding). -->
<!-- User-facing/runtime phase types require journey evidence artifacts before Exec can be ✅. -->
<!-- Manual override is fine — edit cells by hand any time -->

## Phase Details

### Phase 1 — Report Detail Overlay + grouped breakdown

```yaml
phase: 1
types: [user-facing, web, native-mobile, data-view, analytics]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, UI/UX, Data]
suppressed_dims_count: 0
decisions_entry: D79
```

- **Tier chosen:** mvp — new read-only detail surface assembled over the EXISTING `/insights/tree` endpoint + the existing `CategoryDonut`. No new backend, no migration.
- **Prototype:** no
- **Why first:** the detail overlay with the grouped, hierarchical breakdown is the single most distinctive thing the legacy "Resumen" had and gastify lacks. Highest value/effort, and unblocks Slices 2–3 (they decorate this surface).
- **Legacy reference to port:** `boletapp/src/features/reports/components/{ReportDetailOverlay,CategoryGroupCard,ItemGroupCard,SpendingDonutChart}.tsx` + `utils/reportCategoryGrouping.ts` (the store-group + item-group rollup shapes).
- **Key gastify reuse:** `GET /insights/tree` (4-level store + item hierarchy — `services/insights.py::_build_store_cross_walk_tree`), `web/src/components/charts/CategoryDonut.tsx` + the mobile donut, `web/src/hooks/useInsights.ts::useInsightsTree`.
- **Tasks:**
  - **T1 (web)** — `useReportDetail` (thread the tapped report's period date-range into `useInsightsTree`); derive store-group + item-group card view-models from the tree's nested `children`.
  - **T2 (web)** — `ReportDetailOverlay` component (modal): hero (total + trend), store-group cards + item-group cards each with a `CategoryDonut`; wired to open on a `reports-card` tap. i18n keys. vitest.
  - **T3 (web)** — "view transactions" drill: map the report period → a transactions filter and navigate. Verify `/transactions` accepts a date-range filter (it has `date_from`/`date_to`); add a `validateSearch` schema if missing (this is the residual from PENDING P47).
  - **T4 (web)** — Playwright proof on deployed staging-e2e: tap a month card → overlay → group cards + donut visible → drill to transactions.
  - **T5 (mobile)** — `ReportDetailScreen`/sheet: same group cards + donut (reuse the mobile donut); open on card tap; jest.
  - **T6 (mobile)** — nav + drill-to-transactions + S23 Maestro proof.
- **Runtime evidence:** web Playwright (`tests/web-e2e/report-detail.spec.ts`) + S23 Maestro (`tests/mobile/maestro/p14-report-detail-active.yaml`) on deployed staging-e2e — tap a report, assert the grouped breakdown + donut render, drill to transactions.

### Phase 2 — Persona insight + highlights

```yaml
phase: 2
types: [user-facing, web, native-mobile, analytics]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, UI/UX]
suppressed_dims_count: 0
decisions_entry: D80
```

- **Tier chosen:** mvp — a presentational insight string + highlights derived from data the `/insights/monthly` response already returns (`gravity_centers`). Mostly frontend; no new backend.
- **Prototype:** no
- **Legacy reference to port:** `boletapp/src/features/reports/utils/reportInsights.ts` (`generateMonthlyPersonaInsight`, `generate{Monthly,Quarterly,Yearly}Highlights`, the biggest-change detector, `HOLIDAY_MONTHS` seasonal copy).
- **Key gastify reuse:** `/insights/monthly` `gravity_centers` (direction + explanation per category — `services/insights.py::_gravity_centers`) + the top category; the `week` series for "high/low week within the month."
- **Tasks:**
  - **T1 (shared)** — a framework-agnostic `reportInsights` formatter: input = monthly insight (`gravity_centers`, top categories) + the period series; output = `{ insight: string, highlights: Highlight[] }`. Port the legacy thresholds (>15/25% rise/drop, ≥45% dominant, ≥4 diversity). Unit-tested directly.
  - **T2 (web)** — Chilean seasonal copy as i18n/FE strings + render the insight sentence + highlights block in `ReportDetailOverlay`. vitest.
  - **T3 (mobile)** — same insight + highlights in the mobile detail screen. jest.
  - **T4** — Playwright + S23 Maestro proofs: the insight sentence + at least one highlight render for a real month.
- **Runtime evidence:** web Playwright + S23 Maestro on deployed staging-e2e — assert the persona sentence + a highlight render in the detail view.

### Phase 3 — Quarter/Year breakdowns + per-category trend

```yaml
phase: 3
types: [analytics, data, user-facing, web, native-mobile]
phase_tier: mvp
prototype: false
dim_overrides: []
sections_considered: [Core, Data, UI/UX]
suppressed_dims_count: 0
decisions_entry: D81
```

- **Tier chosen:** mvp — additive analytics aggregation (read-only). The cross-scope RLS + period-windowing infrastructure already exists; this generalizes the existing rollup, no migration.
- **Prototype:** no
- **Why last:** it's the only slice needing backend, and it DEEPENS surfaces Slices 1–2 already built (quarter/year cards gain a breakdown; group cards gain a sparkline) rather than adding the missing core.
- **Legacy reference to port:** `boletapp/.../components/CategoryGroupCard.tsx` + `ItemGroupCard.tsx` (the `TrendSparkline`/`TrendChange` mini-SVGs).
- **Key gastify targets:** `backend/app/services/insights.py` (`_build_store_cross_walk_tree`, the monthly rollup) + `backend/app/api/insights.py` — add quarter/year period support + a per-category prior-period trend field.
- **Tasks:**
  - **T1 (backend)** — generalize the tree + monthly category rollup to accept `period` granularity (quarter/year), aggregating the constituent months. pytest (quarter/year tree shape, RLS scope).
  - **T2 (backend)** — expose per-category current-vs-prior trend (a `trend`/`delta_pct` field on tree nodes, or a thin sibling endpoint). pytest.
  - **T3 (cross)** — OpenAPI regen (web + mobile).
  - **T4 (web)** — quarter/year breakdown in the overlay (Slices 1–2 now work for all grains) + `TrendSparkline` in the group cards. vitest.
  - **T5 (mobile)** — same. jest.
  - **T6** — backend pytest + web Playwright + S23 Maestro proofs (quarter/year card → breakdown; sparkline renders).
- **Runtime evidence:** backend pytest (quarter/year rollups + trend) + web Playwright + S23 Maestro on deployed staging-e2e — open a quarter/year report → grouped breakdown + sparklines render.

## Current Phase

ALL Reports v2 phases (1–3) COMPLETE + in production.

Reports v2 rebuilt the legacy "Resumen" report-detail experience: Phase 1 (grouped
store/item breakdown + drill), Phase 2 (persona insight + highlights), Phase 3
(quarter/year periods — the D77 lift). All B2-proven both platforms + shipped to prod
2026-06-06. The per-category trend **sparklines** were descoped from Phase 3 to a
follow-up (PENDING). Next roadmap item is ROADMAP **P16 — Compliance + Launch
Hardening**; run `/gabe-plan` to open it when ready.

(Phase 3 — Quarter/Year breakdowns — COMPLETE ✅×4, shipped 2026-06-06 (D81). The
range-based /insights/tree + /monthly now accept YYYY-MM / YYYY-Qn / YYYY (month
behavior byte-identical); the detail opens for quarter/year cards with the grouped
breakdown + a quarter-aware insight. Adversarial review (12 findings, 2 HIGH fixed:
year baseline over-read + the "vs last month" mislabel). B2-proven both platforms —
the S23 re-locked twice mid-session; the user unlocked it for the proofs.)

(Phase 1 — Report Detail Overlay + grouped breakdown — COMPLETE ✅×4, shipped to
production 2026-06-06. Tap a month report → web overlay / mobile screen with the
hierarchical store + item grouped breakdown (donut + group cards) from /insights/tree
+ "view transactions" drill (new /transactions validateSearch; resolved P47). B2-proven
both platforms on deployed staging-e2e. Detail is month-only — Phase 3 lifts to
quarter/year. Phase 2 decorates this overlay with the persona insight + highlights.)

## Dependencies

- Phase 2 depends on Phase 1 (the insight + highlights decorate the Phase 1 detail overlay).
- Phase 3 depends on Phases 1–2 (quarter/year breakdown + sparklines extend the overlay + group cards built in 1–2). Phase 3's backend (T1–T2) can start in parallel with Phase 1 if desired, but the UI half gates on Phase 1.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| `/transactions` lacks a URL date-range filter schema for the "view transactions" drill (PENDING P47 residual) | medium | It already accepts `date_from`/`date_to` query params; add a thin `validateSearch` route schema in Phase 1 T3 (small, scoped). |
| Item-group hierarchy in `/insights/tree` may not map 1:1 to the legacy item-group shape | medium | The tree returns nested store + item levels (verified); map to group cards in T1, adjust the view-model rather than the backend. |
| Quarter/year category rollup (Phase 3) re-aggregating months could be slow/uncached | low | MVP volume is scope-of-one; aggregate per-request like the existing month rollup; add caching only if a real latency signal appears. |
| Persona insight copy feels generic/wrong for Chilean users | low | Port the legacy thresholds + seasonal copy verbatim; keep it data-grounded (only assert what `gravity_centers` supports). |
| Reports v2 cosmetic warning carryover (PENDING P65 VirtualizedList) on the new detail screen | low | Reuse the (to-be-fixed) ScreenShell pattern; fold the P65 list-screen fix in if convenient during Phase 1 mobile. |

## Notes

- ROADMAP scope-addition: when greenlit, run `/gabe-scope-addition` to insert Reports v2 as a roadmap phase (decimal id, e.g. P15.1) covering the legacy-reports parity gap. `/gabe-plan` does not write ROADMAP.
- Legacy reference root: `boletapp/src/features/reports/` at `/home/khujta/projects/bmad/boletapp/`. Full gap analysis (legacy feature inventory + per-capability gap table) is in `.kdbp/LEDGER.md` (this session) and was produced by a dedicated exploration agent.
- Deliberately DEFERRED from legacy (out of MVP scope): PDF/print export (`printUtils.ts`), the Instagram-style carousel (legacy built it but never shipped it), the year-stepper + unread/first-period affordances (cheap FE add-ons that can ride along with Phase 1 if time permits).
- Slices 1+2 reconstruct ~80% of the legacy report experience with zero new backend; Phase 3 is the only backend work.

## Review Artifacts

- HTML review artifact: none — markdown plan is the review surface (run `/gabe-plan update --html-artifact` to generate a visual one).
- Canonical source: `.kdbp/PLAN.md`, `.kdbp/DECISIONS.md`, `.kdbp/LEDGER.md`

## Runtime Evidence Checkpoints

- **Phase 1:** web Playwright `report-detail.spec.ts` (tap report → grouped breakdown + donut + drill-to-transactions) + S23 Maestro `p14-report-detail-active.yaml`, both vs deployed staging-e2e. Artifacts under `tests/mobile/results/runs/staging-e2e/`.
- **Phase 2:** web Playwright + S23 Maestro — persona sentence + highlight render in the detail view.
- **Phase 3:** backend pytest (quarter/year rollups + per-category trend) + web Playwright + S23 Maestro — quarter/year breakdown + sparklines.
