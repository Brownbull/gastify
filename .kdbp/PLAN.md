# Active Plan — P6 Insights + Item Flags

<!-- status: active -->
<!-- project_type: code -->
<!-- created: 2026-05-28 -->
<!-- last_updated: 2026-05-29 -->

## Goal

Implement P6: monthly insights with deterministic taxonomy rollups, gravity-center detection, and user-private item flags that exclude special-case spend from aggregates while preserving the original transaction record.

## Context

- Roadmap phase: P6 Insights + Item Flags.
- Scope requirements: REQ-06, REQ-10, REQ-11.
- Depends on P2 receipt scan extraction and transaction persistence, which are complete.
- P5 Statement Reconciliation + Cards is complete and available as supporting transaction/coverage context, but this plan owns only insights and item flags.
- P6 unlocks P7 Compliance + Launch Hardening.
- Runtime closure requires staging evidence for seeded multiuser data, cache behavior, deployed web rendering, Android/S23 rendering, and flag-driven aggregate exclusion.
- iOS runtime testing remains deferred post-roadmap by D47/P31 and is not a P6 blocker.

## Environment Gate Standard

Runtime-gated P6 phases must close against branch-backed Railway staging evidence before review. Local unit, integration, and fixture runs are development evidence; they do not close user-facing analytics, cache, web, or Android runtime gates by themselves.

- Seeded test data must cover at least 3 months of transactions.
- Analytics proof must include deterministic L1/L2 transaction-category rollups and L3/L4 item-category rollups from canonical taxonomy parents.
- Item flags must prove personal-only semantics: flagged items disappear from aggregate views but remain visible in transaction detail.
- Web proof must exercise the deployed web/API path, not only jsdom.
- Android proof must run on the Samsung S23 lane and preserve grouped stage-run artifacts.
- iOS proof stays deferred until the post-roadmap iOS lane is pulled forward.

## Phases

| # | Phase | Types | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Analytics contract + seeded 3-month corpus | `data-contract, analytics, test` | Define monthly insight response contracts, deterministic expected rollups, and fixture data for three months of multi-category transactions. | ent | high | ✅ | ✅ | ✅ | ✅ |
| 2 | Rollup + gravity-center engine | `analytics, data-view, persistence` | Build deterministic monthly top-category rollups, trailing-baseline comparison, growth/shrink detection, and explainable gravity-center output. | ent | high | ✅ | ✅ | ✅ | ✅ |
| 3 | Item flag persistence + exclusion semantics | `data-migration, persistence, user-facing, multi-tenant` | Add user-private urgency/special-case item flags, API mutations, transaction-detail visibility, and aggregate-exclusion behavior. | ent | high | ✅ | ✅ | ✅ | ⬜ |
| 4 | Web insights + flag review flow | `web, user-facing, client-state, data-view` | Implement the deployed web monthly insights view, drilldowns, item flag controls, aggregate refresh, and sign-out/cache cleanup. | ent | high | ✅ | ✅ | ✅ | ⬜ |
| 5 | Android insights + flag review flow | `native-mobile, user-facing, client-state, data-view` | Implement the Android/S23 monthly insights journey, item flag controls, aggregate refresh, and sign-out/cache cleanup. | ent | high | ✅ | ✅ | ✅ | ⬜ |
| 6 | P6 exit gate + performance evidence | `core-only, test, web, native-mobile, analytics` | Prove the full P6 journey on staging with 3-month seeded data, web + S23 artifacts, cache checks, and the <=20s top-5 visibility target. | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |

<!-- Exec is written by /gabe-execute: ⬜ not started, 🔄 in progress, ✅ complete -->
<!-- Review/Commit/Push auto-ticked by /gabe-review, /gabe-commit, /gabe-push -->
<!-- A phase is complete when all four status columns are ✅ -->
<!-- /gabe-next routes to the next command based on column state (Exec → Review → Commit → Push → advance phase) -->
<!-- Tier column values: mvp | ent | scale. Read by /gabe-execute (tier-cap) and /gabe-review (TIER_DRIFT finding). -->
<!-- User-facing/runtime phase types require journey evidence artifacts before Exec can be ✅. -->

## Phase Details

### Phase 1 — Analytics contract + seeded 3-month corpus

```yaml
phase: 1
types: [data-contract, analytics, test]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Data, Analytics, Test]
suppressed_dims_count: 4
decisions_entry: D56
requirements: [REQ-06, REQ-10, REQ-11]
```

Define the analytics input/output contract before building UI:

- Monthly insight schemas for top categories, totals, category shares, period filters, and drilldown rows.
- Deterministic rollup definitions for L2 transaction/store categories and L4 item categories, grouped through canonical L1/L3 parents.
- Three-month fixture corpus with enough transaction and item variety to prove top-5, growth, shrinkage, zero/spike categories, multi-currency USD-shadow handling, statement-created transactions, and user-edited fields.
- Expected fixture outputs for aggregate totals, top categories, gravity-center candidates, and flagged-item exclusion.
- Contract tests that fail when taxonomy parent relationships, category keys, currency handling, or user-edit precedence drift.

Exit signal:

- Fixture corpus and expected analytics outputs are committed or generated from committed deterministic seeds.
- Backend tests prove the expected rollup contract without web/mobile involvement.
- No user-facing analytics endpoint is promoted until this contract is reviewed.

### Phase 2 — Rollup + gravity-center engine

```yaml
phase: 2
types: [analytics, data-view, persistence]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Data, Analytics]
suppressed_dims_count: 3
decisions_entry: D57
requirements: [REQ-06, REQ-10]
```

Build the deterministic insights backend:

- Monthly top-category rollups for transaction-level L2 categories and item-level L4 categories.
- Deterministic parent grouping through L1 and L3 taxonomy relationships; prompts do not generate parent categories.
- Gravity-center detection against a trailing 3-month baseline with explainable growth and shrink thresholds.
- Cache strategy that keeps the monthly view fast while respecting user edits, transaction changes, statement-created transactions, and item flag changes.
- API endpoints that return enough explanation for UI drilldowns without exposing other users' data.

Exit signal:

- Backend tests cover top-5 selection, baseline windows, growth/shrink thresholds, empty periods, user-edited category precedence, and ownership isolation.
- Seeded staging API returns monthly top categories and gravity-center rows for the fixture user.
- The API path is ready for web UI implementation.

### Phase 3 — Item flag persistence + exclusion semantics

```yaml
phase: 3
types: [data-migration, persistence, user-facing, multi-tenant]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Data, Multi-tenant, UI/UX]
suppressed_dims_count: 5
decisions_entry: D58
requirements: [REQ-11]
```

Add item-level personal context flags:

- Persist user-private item flags such as `urgency` and `special_case` on transaction items or an equivalent user-scoped association.
- Ensure flagged items remain visible in transaction detail and audit/history contexts.
- Exclude flagged items from analytics aggregates for that user without deleting or mutating the original transaction.
- Preserve user-edit authority and do not let automated categorization or reconciliation overwrite a user flag.
- Keep household/future sharing safe by making flag scope explicit and personal-only.

Exit signal:

- Migration/API tests prove flag create/update/remove behavior, ownership isolation, aggregate exclusion, and transaction-detail visibility.
- Seeded analytics prove one flagged item disappears from aggregates while the source transaction still shows it.
- API contracts are regenerated for web and mobile if schemas change.

### Phase 4 — Web insights + flag review flow

```yaml
phase: 4
types: [web, user-facing, client-state, data-view]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Web, Client State, UI/UX]
suppressed_dims_count: 4
decisions_entry: D59
requirements: [REQ-06, REQ-10, REQ-11]
```

Expose P6 on desktop web:

- Monthly insights page with top categories visible within the target user journey.
- Toggle/drilldown between transaction-category and item-category rollups.
- Gravity-center ranking with enough explanation for growth/shrink behavior.
- Item flag controls from transaction/detail or insight drilldown context.
- Aggregate refresh after a flag change and sign-out/cache isolation for analytics data.

Exit signal:

- Web tests cover monthly rendering, drilldowns, flag mutation, aggregate refresh, loading/error states, and sign-out cleanup.
- Deployed browser proof against Railway staging shows the monthly top-5, gravity-center rows, item flagging, aggregate exclusion, and transaction-detail persistence.

### Phase 5 — Android insights + flag review flow

```yaml
phase: 5
types: [native-mobile, user-facing, client-state, data-view]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Native Mobile, Client State, UI/UX]
suppressed_dims_count: 4
decisions_entry: D60
requirements: [REQ-06, REQ-10, REQ-11]
```

Expose P6 on Android:

- Monthly insights screen optimized for S23 viewport and repeated scanning of category totals.
- Gravity-center list and category drilldowns.
- Item flag controls with immediate cache refresh or deterministic invalidation.
- Transaction-detail persistence check after flagging.
- Sign-out/cache cleanup consistent with previous Android gates.

Exit signal:

- Mobile typecheck/Jest cover the P6 Android flow and state transitions.
- Samsung S23 staging-e2e run captures monthly insights, gravity center, item flagging, aggregate exclusion, transaction detail, and sign-out cleanup with grouped stage artifacts.

### Phase 6 — P6 exit gate + performance evidence

```yaml
phase: 6
types: [core-only, test, web, native-mobile, analytics]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Test, Web, Native Mobile, Analytics]
suppressed_dims_count: 3
decisions_entry: D61
requirements: [REQ-06, REQ-10, REQ-11]
```

Close P6 with artifact-backed runtime proof:

- Seeded 3-month multiuser staging data.
- Monthly top-5 visible within 20 seconds app-open-to-visible.
- Gravity-center list shows at least one growth category and one shrink/neutral control case.
- User flags one item; analytics excludes it and transaction detail still shows it.
- Cache behavior proves aggregate refresh after the mutation and no stale authenticated data after sign-out.
- Durable evidence packet maps backend tests, web proof, Android/S23 proof, and performance timing to the roadmap exit signal.

Exit signal:

- Full local gates pass for touched backend/web/mobile surfaces.
- Railway staging and staging-e2e checks are green.
- Web browser evidence and Android/S23 stage artifacts prove the deployed P6 journey.
- `.kdbp/REVIEW.md` approves P6 with iOS still explicitly deferred.

## Current Phase

Phase 6: P6 exit gate + performance evidence.

(Phases 3, 4 & 5 are Exec ✅ Review ✅ Commit ✅; their Push is ⬜ pending the user's staging push — see LEDGER "PUSH HANDOFF POLICY". Phase 6 closes the local-evidence portion of the exit gate; deployed-staging browser proof, S23 e2e, and perf timing are deferred per PENDING P34/P35.)

## Dependencies

- Phase 1 depends on P2 receipt scan and transaction persistence being complete.
- Phase 2 depends on Phase 1's expected rollup contract and fixture corpus.
- Phase 3 can begin after Phase 1, but its aggregate-exclusion proof depends on Phase 2.
- Phase 4 depends on Phases 2 and 3 for stable API behavior.
- Phase 5 depends on Phases 2 and 3 plus regenerated mobile API contracts if schemas change.
- Phase 6 depends on Phases 1-5 and closes the P6 roadmap exit signal.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Taxonomy parent drift corrupts analytics groupings | high | Contract tests derive L1/L3 only from canonical parent relationships and fail on orphan or unknown keys. |
| Fixture data hides cache/performance problems | medium | Use staging data with multiple periods/users and measure app-open-to-visible timing in the exit gate. |
| Item flags accidentally mutate or hide source transaction detail | high | Separate aggregate exclusion from transaction persistence; test detail visibility after flagging. |
| Personal-only flags leak into future household/cohort contexts | high | Store flag ownership explicitly and add ownership/isolation tests before UI promotion. |
| Web and Android diverge on analytics semantics | medium | Share generated API contracts and use the same seeded expected outputs for both runtime gates. |
| P24 receipt review-warning UX expands P6 scope | medium | Keep P24 separate unless a P6 implementation touchpoint makes it cheaper to resolve explicitly in-plan. |

## Notes

- This plan treats "Item Facts" as the roadmap's "Item Flags" capability: urgency/special-case item annotations with personal-only aggregate behavior.
- P5 statement-created transactions are now part of the ledger surface and should be included in analytics fixtures, but statement reconciliation itself stays out of P6 scope.
- P24 receipt review-warning UX remains open and adjacent. It should be pulled into P6 only if the item review/flag UI touches the same screens and the scope is explicitly amended.
- P32/P33 statement RLS/scale follow-ups are not P6 blockers; they are better candidates for P7 hardening unless they block a P6 ownership/isolation test.

## Runtime Evidence Checkpoints

- Backend staging fixture: seed at least 3 months of transactions/items for at least two ownership scopes.
- Web staging proof: deployed browser journey showing monthly top-5, gravity-center rows, item flag mutation, aggregate exclusion, transaction-detail persistence, and sign-out cleanup.
- Android staging proof: Samsung S23 journey showing the same P6 behavior with grouped stage artifacts.
- Performance proof: record app-open-to-top-5-visible timing and keep it at or below the 20-second roadmap bound.
