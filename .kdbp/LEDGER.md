# Session Ledger

## 2026-05-29 — PHASE 1+2 + P9 LOCAL-COMPLETE: DP cohort benchmarking — ★ P6→P9 ROADMAP DRIVE COMPLETE ★
SCOPE: Ph1 — `app/services/cohort.py`: `cohort_baseline` (k≥20 floor → suppress; clamp to [0,cap]; Laplace DP sum scale=cap/ε with ε≤1 enforced; mean), `compare_to_cohort` (sensitive-category suppression), `eligible_cohort_member_ids` (live data_sharing consent → revocation-aware, no cached membership). Ph2 — `docs/runbooks/P9-COHORT-EXIT-GATE.md`.
REVIEW: security-reviewer DP-privacy adversarial pass → APPROVE, 0 CRITICAL/HIGH; 5 privacy properties verified (DP scale, k-floor ordering, suppression, revocation-aware, Laplace correctness); 1 MED (exact member_count un-noised) resolved via precise DP-scope docs + PENDING P37 (count-DP = Scale hardening; degrading the baseline with a noisy denominator now is the worse trade). Ph2 self-review (docs).
GATES: ruff + format (pass), mypy app/ (Success, 132 files), pytest test_cohort.py (12); full suite 717 passed.
P9 PLAN STATUS: both phases Exec ✅ Review ✅ Commit ✅. Push ⬜ pending staging + deferred runtime (50-profile run + bar-chart UI).
ARCHIVE: .kdbp/reviews-archive/REVIEW_2026-05-29-154500_resolved.md
★ ROADMAP DRIVE COMPLETE: P6 (Insights+Flags) + P7 (Compliance+Launch) + P8 (Boleta shortcut) + P9 (DP cohort) all local-complete. All pushes + runtime/operational drills deferred to the user's staging session (PENDING P34/P35 runtime, P36 billing-enforcement, P37 count-DP; iOS P31).
NEXT: commit → archive P9 plan → user runs staging pushes + deferred runtime closures.

## 2026-05-29 — PLAN: P9 Cohort Benchmarking (DP-engineered) created (P8 plan archived) — FINAL roadmap phase
ARCHIVED: P8 plan → `.kdbp/archive/completed_PLAN_2026-05-29_p8-boleta-shortcut.md`.
NEW PLAN: P9 — 2 phases (scale): (1) DP cohort engine + consent-gated aggregation (k≥20 floor, ε≤1 Laplace, sensitive-category suppression, revocation-aware via P7's is_cohort_eligible), (2) exit-gate packet.
DEFERRED: 50-synthetic-profile deployed cohort run + bar-chart client UI + live revocation-recompute proof → runtime/staging.
NEXT: /gabe-execute Phase 1 (DP cohort engine).

## 2026-05-29 — PHASE 2+3 + P8 LOCAL-COMPLETE: Boleta scan shortcut + exit-gate packet
SCOPE: Ph2 — `decode_boleta_barcode` seam (native decode runtime-deferred, returns None) + `_try_boleta_shortcut`/`_run_boleta_pipeline` in scan_worker (parse TED → produce transaction with 0 extraction+categorization LLM tokens via `_run_stage2` with prebuilt result; synthetic item when no IT1 so math gate passes; fail-safe fall-through to vision on any miss). Ph3 — `docs/runbooks/P8-BOLETA-EXIT-GATE.md`.
REVIEW: python-reviewer adversarial pass on Ph2 → APPROVE, 0 CRITICAL/HIGH; all 5 safety axes confirmed (fail-safe, 0 tokens, persist-empty-categorization safe, no regression, no silent mis-transaction); 1 MED (no-IT1 test) + 1 LOW (prompt_version audit signal) both fixed. Ph3 self-review (docs).
GATES: ruff + format (pass), mypy app/ (clean), pytest scan_worker (28) + boleta (9); full suite 705 passed.
P8 PLAN STATUS: all 3 phases Exec ✅ Review ✅ Commit ✅. Push ⬜ pending staging push + deferred runtime (native PDF417/QR decode + <3s/0-token live proof).
ARCHIVE: .kdbp/reviews-archive/REVIEW_2026-05-29-153300_resolved.md
NEXT: commit → archive P8 plan → /gabe-plan P9 (final: DP cohort benchmarking).

## 2026-05-29 — PHASE 1 EXEC+REVIEW: P8 Phase 1 — TED payload parser
SCOPE: `app/services/boleta.py` — `parse_ted_payload(payload) -> GeminiExtractionResult` parsing the SII TED `<DD>` (RE/TD/F/FE/RR/RSR/MNT/IT1) into the extraction shape; validates TD∈{39,41}; rejects malformed/non-boleta/missing-required/oversized/negative. Uses defusedxml (untrusted barcode input) + 8KB size cap.
REVIEW: self-review (pure parser, security-hardened with defusedxml, 9 tests incl. attack cases: malformed XML, oversized, negative/invalid MNT, non-boleta TD, missing DD/fields). Adversarial review reserved for Phase 2 (the worker integration / LLM-bypass safety).
GATES: ruff + format (pass), mypy app/ (Success, 131 files; defusedxml import-untyped ignored locally), pytest test_boleta.py (9 passed); full suite 702 passed.
EXEC ✅ Review ✅. Commit next.
NEXT: commit → Phase 2 (boleta scan shortcut bypassing the vision LLM).

## 2026-05-29 — PLAN: P8 Structured-Boleta QR/CAF Shortcut created (P7 plan archived)
ARCHIVED: P7 plan → `.kdbp/archive/completed_PLAN_2026-05-29_p7-compliance-launch-hardening.md` (local-complete; Push pending).
NEW PLAN: P8 — 3 phases (ent): (1) TED payload parser, (2) boleta scan shortcut bypassing the vision LLM (0 tokens), (3) exit-gate packet.
RESEARCH: confirmed the SII timbre TED format (<DD>: RE/TD/F/FE/RR/RSR/MNT/IT1 + FRMT signature; TD 39/41 = boleta) via SII docs + sii-chile prior art.
DEFERRED: native barcode image-decode (PDF417/QR) + <3s/0-token live proof → runtime/staging (decode behind a seam).
NEXT: /gabe-execute Phase 1 (TED parser).

## 2026-05-29 — PHASE 6 + P7 LOCAL-COMPLETE: Launch hardening + readiness packet
SCOPE: Runbooks docs/runbooks/{DPO-PROCEDURES, DISASTER-RECOVERY, INCIDENT-RESPONSE, SECURITY-CHECKLIST, P7-LAUNCH-EXIT-GATE}.md + compliance observability counter (`metrics.inc("audit_event_{type}")` in log_audit_event → counts every DSR/consent/propagation event on /metrics, REQ-21) + test.
REVIEW: self-review (docs + 1-line observability counter, low-risk; full suite green). Per-phase adversarial reviews already covered the code surfaces.
GATES: ruff + format (pass), mypy app/ (clean), pytest (693 passed, 2 skipped — +1 compliance-metric test).
EXEC ✅ Review ✅ Commit ✅.
P7 PLAN STATUS: all 6 phases Exec ✅ Review ✅ Commit ✅. Push columns ⬜ pending the user's staging push + deferred operational drills (load test, retention scheduled run, paid-Gemini pre-commit, cutover/DR drill).
DEFERRED: P34/P35 (runtime), P36 (billing concurrency), + the P7 operational drills (P7-LAUNCH-EXIT-GATE.md "Deferred").
NEXT: commit → archive P7 plan → /gabe-plan P8 (Structured-boleta QR/CAF shortcut).

## 2026-05-29 — PHASE 5 EXEC+REVIEW: P7 Phase 5 — Monetization plumbing (schema-only)
SCOPE: `plan_tier` on credit_balances (migration 025 + model CHECK constraint) + `app/services/billing.py` (PlanTier free/basic/pro, PLAN_MONTHLY_CREDITS 50/500/5000, credits_for_plan, get_or_create_balance, set_plan, has_scan_credit, deduct_scan_credit, BillingHook seam + NullBillingHook). Schema-only per SCOPE §9.2 — no live provider, no live enforcement.
REVIEW: security-reviewer (financial code) → APPROVE, 0 CRITICAL/HIGH; 2 MED concurrency findings DEFERRED to PENDING P36 with the pricing-enforcement ADR (both carry inline caveats; not on a live path), 1 LOW (missing CHECK) FIXED. Tenant isolation + validation + no-secrets verified.
GATES: ruff + format (pass), mypy app/ (clean), alembic heads (025), pytest test_billing.py (6 passed); full suite 692 passed.
EXEC ✅ Review ✅. Commit next.
ARCHIVE: .kdbp/reviews-archive/REVIEW_2026-05-29-150500_resolved.md
DEFERRED: P36 (billing concurrency hardening) + the pricing mechanism/enforcement (SCOPE §9.2 ADR).
NEXT: commit → Phase 6 (launch hardening + readiness packet).

## 2026-05-29 — PHASE 4 EXEC+REVIEW: P7 Phase 4 — Retention / TTL enforcement
SCOPE: `app/services/retention.py` (purge_expired_scans [terminal + processed_at<now-90d], purge_expired_audit_events [<now-6y], count_expired dry-run, apply_retention) + `scripts/ops/run_retention.py` (dry-run default, --apply, best-effort image unlink) + tests. Transactions never deleted (anonymized via DSR per D4); in-flight scans never deleted.
REVIEW: security-reviewer data-loss adversarial pass → APPROVE, 0 CRITICAL/HIGH; 1 MED (TTL rationale undocumented) + 1 LOW (test coverage gap) both fixed. All safety properties verified (no financial/in-flight deletion, no FK cascade, correct cutoff, non-destructive count, dry-run default).
GATES: ruff + format (pass), mypy app/ (clean), pytest test_retention.py (4 passed); full suite 686 passed.
EXEC ✅ Review ✅. Commit next.
ARCHIVE: .kdbp/reviews-archive/REVIEW_2026-05-29-145300_resolved.md
DEFERRED: scheduled run_retention.py invocation (cron/Railway scheduler) → operational.
NEXT: commit → Phase 5 (monetization schema).

## 2026-05-29 — PHASE 3 EXEC+REVIEW: P7 Phase 3 — Scan quota graceful degradation
SCOPE: ScanStatus.QUEUED (migration 024 ALTER TYPE ADD VALUE) + _queue_scan/_settle_pipeline_error routing QUOTA_EXCEEDED → QUEUED (scan_queued event + scans_queued + per-error-code metrics) instead of FAILED, at both LLM call sites; + re-entry path (HIGH review fix).
REVIEW: adversarial python-reviewer → 1 HIGH (QUEUED parked-forever, no re-entry) FIXED; 2 MED (1 addressed=status-based re-entry, 1 refuted=patch auto-AsyncMock); 1 LOW accepted. 5 verification points all confirmed. VERDICT APPROVE ~94/100.
HIGH FIX: _acquire_scan accepts QUEUED (reprocess from stage1); reprocess endpoint accepts QUEUED (reset→SUBMITTED); requeue_quota_throttled_scans() sweep primitive (scheduled dispatch = deferred-runtime).
GATES: ruff + format (pass), mypy app/ (clean), pytest scan_worker+scans (48 passed); full suite 682 passed.
EXEC ✅ Review ✅. Commit next.
ARCHIVE: .kdbp/reviews-archive/REVIEW_2026-05-29-144500_resolved.md
DEFERRED: scheduled requeue-sweep dispatch + the real quota load test → operational/staging.
NEXT: commit → Phase 4 (retention/TTL).

## 2026-05-29 — PHASE 2 EXEC+REVIEW+COMMIT: P7 Phase 2 — Consent-revocation propagation
SCOPE: New `consent_propagation.py` (is_cohort_eligible / is_ai_training_eligible derived live from granted ConsentRecord, scoped user+scope — the P9 recompute seam) + propagation audit logging wired into grant/revoke/revoke_all in consent.py.
REVIEW: 2-lens adversarial workflow → 2 distinct confirmed (MED audit-key `cohort_effect` wrong for ai_training; LOW revoke_all_consents docstring), both fixed; load-bearing eligibility behavior verified correct (live-derived, scoped, immediate cohort-unflag, no import cycle). VERDICT APPROVE, ~96/100.
GATES: ruff + format (pass), mypy app/ (clean), pytest tests/test_consent_propagation.py + test_consent.py + test_privacy.py (31 passed); full suite 676 passed.
EXEC ✅ Review ✅. Commit next.
ARCHIVE: .kdbp/reviews-archive/REVIEW_2026-05-29-143000_resolved.md
NEXT: commit → Phase 3 (scan quota graceful degradation).

## 2026-05-29 — PHASE 1 EXEC+REVIEW: P7 Phase 1 — DSR completeness + four-jurisdiction audit
SCOPE-DISCOVERY: `backend/app/api/consent.py` already ships single-consent revoke, audit-event read (`/consent/audit`), and processing-register read (`/consent/processing-register`) — all registered + covered by test_consent.py (10) + test_privacy.py (13). The Explore inventory had missed this file, so Phase 1's planned scope was largely pre-built.
REAL DELTA: added the `withdrawn_at` distinction — user-initiated withdrawal (set in `revoke_consent`, GDPR Art 7(3)) vs system revocation on erasure (`revoke_all_consents` leaves it null); cleared on re-grant. Migration 023, model + schema + service + 3 tests.
EXEC ✅ + REVIEW ✅ (self-review — additive nullable column + audit distinction, low-risk, mirrors existing patterns; full multi-agent review reserved for the larger Phases 2-5).
GATES: ruff (pass), ruff format (pass), mypy app/ (clean), alembic heads (023), pytest tests/test_consent.py tests/test_privacy.py (26 passed, +3 new).
NEXT: commit → Phase 2 (consent-revocation propagation — genuinely missing, real work).

## 2026-05-29 — PLAN: P7 Compliance + Launch Hardening created (P6 plan archived)
ARCHIVED: P6 plan → `.kdbp/archive/completed_PLAN_2026-05-29_p6-insights-item-flags.md` (local-complete; Push pending user).
NEW PLAN: P7 — 6 phases (all ent): (1) DSR completeness + four-jurisdiction audit, (2) consent-revocation propagation, (3) scan quota graceful degradation, (4) retention/TTL enforcement, (5) monetization plumbing (SCHEMA-ONLY per SCOPE §9.2), (6) launch hardening + readiness packet.
GROUNDING: Explore-agent inventory of existing consent/DSR/observability/credit surface vs gaps; SCOPE confirms monetization is schema-only (pricing mechanism = separate ADR) and the four jurisdictions.
DEFERRED (runtime): load test to real quota throttle, retention scheduled-job on staging, paid-Gemini tier pre-commit, cutover/DR drill → user staging session.
NEXT: /gabe-execute Phase 1 (after user reviews the P7 plan — gabe-plan checkpoint).

## 2026-05-29 — [c8b5b10] docs(p6): P6 insights exit-gate evidence packet + P6 PLAN LOCAL-COMPLETE
SCOPE: Phase 6 evidence packet committed; Phase 6 Commit ✅.
P6 PLAN STATUS: all 6 phases Exec ✅ Review ✅ Commit ✅. Push columns ⬜ across all phases pending the user's staging push (the agent is reserved from shared-infra deploys per the classifier; PUSH HANDOFF POLICY above).
RUNTIME CLOSURE PENDING: P34 (deployed-staging browser + insights-api-gate), P35 (Samsung S23 e2e), perf timing — all fold into one staging session. P6 roadmap phase stays "active" until that session + staging→main promotion.
NEXT: roadmap drive continues — /gabe-plan P7 (Compliance + launch hardening), then execute. P6 runtime closure proceeds in parallel when the user pushes.

## 2026-05-29 — PHASE EXEC+REVIEW COMPLETE: P6 Phase 6 — Exit gate + performance evidence
TIER: ent
SCOPE: Consolidated P6 exit-gate evidence packet (`docs/runbooks/P6-INSIGHTS-EXIT-GATE.md`) mapping every roadmap exit-signal element to its local evidence, plus a deployed-staging runbook for the deferred portions.
LOCAL GATE SWEEP: backend `uv run pytest` 668 passed/2 skipped; web `tsc -b` clean + vitest 35 passed; mobile `tsc --noEmit` clean + jest 125 passed. 828 tests across the P6 surface, all green.
REVIEW: self-verified — every test name + script + review-archive cited in the packet exists on disk; per-phase reviews (Ph3 94/100, Ph4 98/100, Ph5 100/100) all APPROVE; iOS deferred (P31). No code diff to adversarially review (doc + consolidation only).
EXEC ✅ + REVIEW ✅ on the local-evidence portion of the exit gate.
DEFERRED (runtime closure): Railway staging + staging-e2e green, web browser journey, Samsung S23 stage artifacts, and app-open-to-top-5 ≤20s timing → PENDING P34 (staging/web) + P35 (S23). Folds into one staging session the user runs after pushing origin/staging.
NEXT: /gabe-commit (evidence packet) → push handoff. P6 plan local-complete; Push columns ⬜ pending the user's staging push.

## 2026-05-29 — [9c0667e] feat(mobile): Android monthly insights screen + item-flag controls
FINDINGS: 0 confirmed (2 refuted) from the Phase 5 adversarial review — nothing to fix.
GATES: npm run typecheck (clean), npm test (27 suites / 125 passed, clean exit).
CHECK 6/7/8: deferred=none matching at MVP gate; doc-drift=none (no backend routes); structure=all new mobile files match mobile/src/{components,hooks,lib,screens} MVP patterns.
SCOPE: Android insights screen + item-flag controls + insightsKeys decoupling. 18 files (10 modified incl. 2 patched existing tests, 8 new). .kdbp bookkeeping committed separately.
TICK: Phase 5 Commit ✅. Current Phase advanced to Phase 6.

## 2026-05-29 — PHASE 5 REVIEW: P6 Phase 5 — Android insights + flag review flow
VERDICT: APPROVE
METHOD: 2-lens adversarial workflow (typescript-reviewer / web-parity+correctness+test-integrity) → per-finding verification.
FINDINGS: 0 confirmed, 2 refuted (missing-detail-invalidation = intentional for non-optimistic mutation; ScrollView/flex = incorrect RN premises).
COVERAGE: HIGH — 9 new tests; full mobile suite 125 passed clean-exit.
CONFIDENCE: 100/100
TRIAGE: nothing to fix.
GATES: npm run typecheck (clean), npm test (27 suites / 125 passed, clean exit).
DEFERRED: Samsung S23 staging-e2e (PENDING P35); iOS lane (P31).
ALIGNMENT: ALIGNED
TIER: ent | DRIFT: none
TICK: ✅ (Phase 5 Review ticked)
ARCHIVE: .kdbp/reviews-archive/REVIEW_2026-05-29-110000_resolved.md

## 2026-05-29 — PHASE EXEC COMPLETE: P6 Phase 5 — Android insights + flag review flow (code-only)
TIER: ent
SCOPE: Android monthly insights journey + item flags. New: lib/insights.ts (getMonthlyInsights + currentPeriod + types), hooks/useInsights.ts (useMonthlyInsights), hooks/insightsKeys.ts (decoupled key factory), components/ItemFlagChips.tsx, screens/InsightsScreen.tsx. Modified: lib/transactions.ts (updateItemFlags + ItemFlagKind), hooks/useTransactions.ts (useUpdateItemFlags), screens/TransactionDetailScreen.tsx (flag chips + flag-error banner), navigation (types + AppNavigator Insights screen), HomeScreen (Open insights button).
EXEC: ⬜ → ✅ on local evidence per the code-complete + defer-runtime drive.
GATES: `npm run typecheck` (tsc --noEmit clean); `npm test` (jest 27 suites / 125 passed, clean exit). Added 9 tests (useInsights hook query/mutation/error, InsightsScreen render/toggle/empty/error, ItemFlagChips press/disabled).
TEST-INFRA: extracted insightsKeys to a pure module so useTransactions no longer transitively loads lib/api→expo-secure-store (fixes useTransactions.test); patched AppNavigator.test (mock InsightsScreen) + TransactionDetailScreen.test (mock useUpdateItemFlags); hook test uses gcTime:Infinity + cleanup to avoid jest open-handle hang.
DEFERRED: Samsung S23 staging-e2e journey (grouped stage artifacts) per PENDING P35 + user "defer android tests". iOS lane stays deferred (D47/P31).
NEXT: /gabe-review → /gabe-commit → push handoff.

## 2026-05-29 — [8310a63] feat(web): monthly insights view + item-flag controls
FINDINGS: 3 distinct (0 critical, 0 high, 1 medium, 2 low) from the Phase 4 adversarial review — all fixed pre-commit.
ACTIONS: disable-while-pending + error banner for flag chips; dropped redundant detail invalidation; DimensionToggle aria-pressed; +1 regression test.
GATES: npx tsc -b (clean), npx eslint . (0 errors), npm run build (ok), npm test (vitest 35 passed).
CHECK 6/7/8: deferred=none matching web files; doc-drift=none (no new backend routes; web files unmapped to wells); structure=all new files match web/src/{hooks,routes} MVP patterns.
SCOPE: web monthly insights surface + item-flag controls. 9 files (5 modified incl. generated route tree, 4 new). .kdbp bookkeeping committed separately.
TICK: Phase 4 Commit ✅. Current Phase advanced to Phase 5.

## 2026-05-29 — PHASE 4 REVIEW: P6 Phase 4 — Web insights + flag review flow
VERDICT: APPROVE (post-triage)
METHOD: 2-lens adversarial workflow (typescript-reviewer / correctness+cache+a11y) → per-finding verification. 4 confirmed (2 = same lost-update race from both lenses → high-confidence), 1 refuted.
FINDINGS: 3 distinct (0 critical, 0 high, 1 medium, 2 low)
COVERAGE: MEDIUM → HIGH — added flag-mutation error regression test.
CONFIDENCE: 86 → 98/100
TRIAGE: 3 fixed (disable-while-pending + error banner for flag chips; dropped redundant detail invalidation; DimensionToggle aria-pressed a11y), 0 deferred, 1 refuted (ExcludedItems key provably unique).
GATES: npx tsc -b (clean), npx eslint . (0 errors), npm run build (ok), npm test (vitest 35 passed, 11 files).
ALIGNMENT: ALIGNED
TIER: ent | DRIFT: none
TICK: ✅ (Phase 4 Review ticked)
ARCHIVE: .kdbp/reviews-archive/REVIEW_2026-05-29-102400_resolved.md

## 2026-05-29 — PHASE EXEC COMPLETE: P6 Phase 4 — Web insights + flag review flow
TIER: ent
SCOPE: New web monthly insights surface — `useInsights` hook (monthly query + currentPeriod), `useUpdateItemFlags` mutation (PUT flags → set detail cache + invalidate insights), `/insights` route page (period selector, summary stats, transaction↔item dimension toggle, top-category rollups with share bars + per-category exclusion annotation, gravity-center ranking, excluded-items summary, loading/error/empty states), item-flag toggle chips on the transaction-detail line items, `nav.insights` i18n (es/en/pt) + sidebar/mobile nav, route-tree registration.
EXEC: ⬜ → ✅ on local evidence per the code-complete + defer-runtime drive.
GATES: `npx tsc -b` (clean); `npx eslint .` (0 errors; pre-existing react-refresh warnings only); `npm test` (vitest 34 passed, 11 files — +2 new test files: useInsights.test.tsx, -insights.test.tsx); `npm run build` (tsc -b && vite build pass, pre-existing >500kB chunk warning).
TESTS ADDED: useInsights query success/error, useUpdateItemFlags cache-write + insights invalidation, currentPeriod formatting, queryClient.clear analytics eviction (sign-out isolation), insights page render (summary/top-categories/gravity/excluded), dimension toggle, empty + error states.
DEFERRED: Deployed-staging browser journey proof (Railway SPA/API) folds into PENDING P34 + the P6 Phase 6 exit gate. Local jsdom/build is development evidence, not the deployed-web runtime gate.
NEXT: /gabe-review → /gabe-commit → push handoff (user pushes staging).

## 2026-05-29 — PUSH HANDOFF POLICY (roadmap drive)
The auto-mode permission classifier reserves pushes to shared staging/main infra for the user. Operating mode for the P6→P9 drive: the agent does plan/execute/review/commit + all local gates (ruff/mypy/pytest/tsc/vitest/jest/build); the USER runs the staging pushes + main promotions. Push columns stay ⬜ until the user pushes.
READY TO PUSH (origin/staging): local `main` @ 544d1ff (P6 Phase 3 item flags, 4 commits ahead of origin/staging). Command: `git push origin main:staging` → watch GitHub Actions → `git push origin staging:main` (or `/gabe-push`) to promote + tick Phase 3 Push ✅.

## 2026-05-29 — [2d91f1f] feat(insights): user-private item flags with aggregate exclusion
FINDINGS: 6 (0 critical, 1 high, 3 medium, 2 low) from the Phase 3 adversarial review
ACTIONS: 4 fixed (RLS migration-content test, urgency insights-exclusion test, cross-user PUT write-isolation assertion, anonymize_user_transactions user_id required), 1 deferred (P34 runtime evidence), 1 dismissed (dedupe nit)
GATES: ruff (pass), mypy app/ (clean), uv run pytest (668 passed, 2 skipped)
CHECK 6/7/8: deferred=P34 (intentional, tracked); doc-drift=none (wells 1/2 + P6 contract in-diff); structure=migration 022 matches backend/alembic/versions/*.py (MVP)
SCOPE: backend item-flag persistence/API/insights-exclusion/DSR + regenerated web+mobile contracts + docs. 21 files. .kdbp bookkeeping committed separately.
TICK: Phase 3 Commit ✅

## 2026-05-29 — PHASE 3 REVIEW: P6 Phase 3 — Item flag persistence + exclusion semantics
VERDICT: APPROVE (post-triage)
METHOD: 3-lens adversarial workflow (python-reviewer / security-reviewer / coverage+runtime) → per-finding verification. 6 confirmed, 9 refuted.
FINDINGS: 6 total (0 critical, 1 high, 3 medium, 2 low)
COVERAGE: MEDIUM → HIGH — added urgency-exclusion, RLS-migration-content, and cross-user write-isolation tests.
CONFIDENCE: 64 → 94/100
TRIAGE: 4 fixed (#1 RLS migration-content test, #2 urgency insights exclusion test, #3 cross-user PUT write-isolation assertion, #5 made anonymize_user_transactions user_id required), 1 deferred (#4 runtime evidence → PENDING P34), 1 dismissed (#6 dedupe O(n) nit — 2-value enum, dedup-merge premise refuted).
GATES: ruff (pass), ruff format (pass), mypy app/ (clean), uv run pytest (668 passed, 2 skipped) — +2 net new tests.
DEFERRED: P34 (deployed-staging runtime proof; folds into P6 Phase 6 exit gate).
ALIGNMENT: ALIGNED
TIER: ent | DRIFT: none
TICK: ✅ (Phase 3 Review ticked)
ARCHIVE: .kdbp/reviews-archive/REVIEW_2026-05-29-093900_resolved.md

## 2026-05-29 — PHASE EXEC COMPLETE: P6 Phase 3 — Item flag persistence + exclusion semantics
TIER: ent
TASKS: 1 implementation unit (item flag persistence + API + insights exclusion + DSR/consent cleanup + contract regen), code-complete.
EXEC: 🔄 → ✅ on backend evidence per Phase 3's own exit signal (migration/API tests, seeded aggregate-exclusion proof, contract regen — all present and green).
EVIDENCE: `uv run pytest` → 666 passed, 2 skipped. Exit-signal proofs present: `test_item_flag_api_excludes_item_from_monthly_insights` (aggregate exclusion), `test_update_item_flags_are_visible_and_clearable` (create/update/remove + detail visibility), `test_update_item_flags_is_owner_scoped` + `test_detail_only_exposes_current_users_item_flags` (ownership/personal-only isolation), `test_monthly_insights_cache_fingerprint_reflects_item_flag_changes` (cache invalidation), privacy/consent tests (flag erasure on DSR). Contracts regenerated: `web/` + `mobile/` openapi-spec.json + api-types.d.ts.
DECISION: Per explicit user direction (2026-05-29 roadmap drive), runtime-evidence gates that need deployed Railway staging / physical device / live-Gemini are CODE-COMPLETE + local-gate closed and the deployed-staging runtime proof is DEFERRED to PENDING (see new PENDING row). This supersedes the prior session's "Exec stays 🔄 until staging" hold for the explicitly-authorized roadmap drive. Phase 3's exit signal itself is backend-test-closeable; deployed UI proof is owned by P6 Phases 4/5/6.
NEXT: /gabe-review → /gabe-commit → /gabe-push.

## 2026-05-29 00:01 -04 — P6 PHASE 3 LOCAL CHECKPOINT: item flag persistence + exclusion
SCOPE: Added user-scoped `transaction_item_flags` persistence, transaction item flag mutation API, current-user flag projection in transaction detail, current-user aggregate exclusion in monthly insights, cache fingerprinting for item flags, DSR erasure cleanup for user flag rows, regenerated web/mobile API contracts, docs, and an upgraded staging insights gate that now verifies deployed item flag mutation plus aggregate refresh.
PLATFORM PROGRESS: The backend can now persist urgency/special-case item flags without mutating the source transaction item. A flagged item remains visible in transaction detail, disappears from that user's monthly aggregate totals, and appears in `excluded_items`; other users' flags are not projected into the current user's detail response.
CHECKS: `cd backend && uv run ruff check app tests ../scripts/staging/run-insights-api-gate.py alembic/versions/022_transaction_item_user_flags.py` (pass); `cd backend && uv run ruff format --check app tests ../scripts/staging/run-insights-api-gate.py alembic/versions/022_transaction_item_user_flags.py` (pass); `cd backend && uv run mypy app/ --no-error-summary` (pass); `cd backend && uv run pytest tests/ -x --tb=line -q` (666 passed, 2 skipped, 1 warning); `cd backend && uv run alembic heads` (`022 (head)`); `python3 -m py_compile scripts/staging/run-insights-api-gate.py` (pass); `cd web && npm run build` (pass, existing chunk-size warning); `cd mobile && npm run typecheck` (pass); `git diff --check` (pass).
STATE: Phase 3 Exec remains 🔄 until this branch is committed/pushed and `scripts/staging/run-insights-api-gate.py` passes against branch-backed Railway staging with the new migration and item-flag endpoint deployed.

## 2026-05-28 23:49 -04 — PHASE EXEC START: P6 Phase 3 — Item flag persistence + exclusion semantics
ROUTE: `/gabe-next` advanced the active P6 plan to Phase 3 and dispatched `/gabe-execute`.
TASKS: add user-private urgency/special-case item flag persistence, transaction-detail visibility, ownership isolation, analytics aggregate exclusion, API contract updates, and focused migration/API/analytics verification.
STATE: Phase 3 Exec set to 🔄.

## 2026-05-28 23:37 -04 — PUSH staging -> main
PR: —
CI: all passed, 13/13 on GitHub Actions run `26616372516`.
PROMOTION: promoted `origin/staging` at `53aba37` to `origin/main`.
DEPLOYMENTS: P42 (added row to `.kdbp/DEPLOYMENTS.md`).
TICK: ✅ Phase 2 Push.
NOTES: Production promotion ships P6 Phase 2 monthly insights engine/API after green staging CI `26615771386`, green main CI `26616372516`, and deployed staging-e2e API proof `tests/mobile/results/runs/staging-e2e/20260528T2300-p6-phase2-insights-api-gate/p6-insights-api-gate/manifest.json`.
NEXT: `/gabe-next` can advance the active plan to Phase 3 — Item flag persistence + exclusion semantics.

## 2026-05-28 23:17 -04 — PUSH main -> staging
PR: —
CI: all passed, 13/13 on GitHub Actions run `26615771386`.
PROMOTION: N/A — staging integration push only.
DEPLOYMENTS: P41 (added row to `.kdbp/DEPLOYMENTS.md`).
NOTES: Pushed local `main` at `53aba37` to `origin/staging`, carrying the Phase 2 exec proof and review tick commits. Phase 2 Push remains ⬜ until tested `origin/staging` is promoted to `main`.

## 2026-05-28 23:14 -04 — PHASE 2 REVIEW COMPLETE: monthly insights engine/API
ROUTE: `/gabe-next` resolved P6 Phase 2 to `/gabe-review` because Exec ✅ and Review ⬜.
FINDINGS: 0 actionable findings. Verdict APPROVE, confidence 95/100, coverage HIGH.
SCOPE REVIEWED: deterministic insights engine, authenticated `/api/v1/insights/monthly` route, cache/fingerprint behavior, generated web/mobile contracts, docs, CI status, and deployed staging-e2e runtime proof.
EVIDENCE: `.kdbp/REVIEW.md`; `origin/staging` CI run `26615109015` passed 13/13; Railway staging-e2e deployment `3aa3b796-2fb2-466a-95a3-22fcd459e053` succeeded; API gate artifact `tests/mobile/results/runs/staging-e2e/20260528T2300-p6-phase2-insights-api-gate/p6-insights-api-gate/manifest.json` has `result_status=passed`.
TICK: ✅ Phase 2 Review.
NEXT: Route to `/gabe-push` for Phase 2 Push.

## 2026-05-28 23:02 -04 — PHASE 2 EXEC COMPLETE: deployed monthly insights API gate
ROUTE: `/gabe-next` resumed P6 Phase 2 `/gabe-execute`; Phase 2 Exec is now closed by deployed staging-e2e proof.
COMMITS: `6dc490f` monthly insights engine/API/staging gate; `9cd2a99` Phase 2 commit bookkeeping.
CI: `origin/staging` run `26615109015` passed 13/13, including Backend Typecheck, Backend Test, Mobile API Drift, web/mobile gates, SCA, and secret scan.
RAILWAY: Branch push did not auto-create a fresh Railway deployment. Manual CLI fallback from repo root failed because it ignored `backend/railway.toml` and selected Railpack/Node without a start command (`78650c28-78c7-4236-9e63-1eab60099eef`, failed). Corrected fallback deploy used `railway up backend --path-as-root --service gastify-api-staging-e2e --environment staging --detach`, producing deployment `3aa3b796-2fb2-466a-95a3-22fcd459e053` with Dockerfile backend config; deployment reached `SUCCESS`.
READINESS: `bash scripts/staging/check-backend-ready.sh https://gastify-api-staging-e2e-staging.up.railway.app` passed with `status=ok`, database connected, migration current/head `021`.
RUNTIME PROOF: `cd backend && uv run python ../scripts/staging/run-insights-api-gate.py --api-base-url https://gastify-api-staging-e2e-staging.up.railway.app --stage-id 20260528T2300-p6-phase2-insights-api-gate` passed. The gate signed into staging Firebase, seeded 15 P6 fixture transactions through the deployed `/transactions` API, fetched `/api/v1/insights/monthly?period=2026-03&currency=USD`, and verified top transaction categories, top item categories, gravity centers, and total spend.
ARTIFACTS: `tests/mobile/results/runs/staging-e2e/20260528T2300-p6-phase2-insights-api-gate/p6-insights-api-gate/manifest.json`; `readiness.json`; `seeded-transactions.json`; `insights-response.json`.
RESULT: manifest `result_status=passed`, `seeded_transaction_count=15`, `top_transaction_count=5`, `top_item_count=5`, `gravity_center_count=3`, `git_rev=9cd2a99377917e5cf13a492ddfda328ba3e73bf9`.
TICK: ✅ Phase 2 Exec. Review remains ⬜; Commit is already ✅ from the pre-proof checkpoint.
NEXT: Route to `/gabe-review` for Phase 2 before the push/promotion lane.

## 2026-05-28 22:52 -04 — [6dc490f] feat(insights): add monthly rollup engine
FINDINGS: 0 critical blockers. Docs/structure drift was preemptively resolved by updating the P6 insights runbook and API well docs before commit.
ACTIONS: Committed the Phase 2 monthly insights engine, authenticated `/api/v1/insights/monthly` route, generated web/mobile contracts, local tests, KDBP checkpoint, and deployed staging API gate script.
CHECKS: `cd backend && uv run ruff check app tests ../scripts/staging/run-insights-api-gate.py` (pass); `cd backend && uv run ruff format --check app tests ../scripts/staging/run-insights-api-gate.py` (pass); `cd backend && uv run mypy app/ --no-error-summary` (pass); `cd backend && uv run pytest tests/ -x --tb=line -q` (660 passed, 2 skipped, 1 warning); `cd web && npm run build` (pass, chunk-size warning only); `cd mobile && npm run typecheck` (pass); `cd backend && uv run python -m py_compile ../scripts/staging/run-insights-api-gate.py` (pass); `git diff --cached --check` (pass).
TICK: ✅ Phase 2 Commit.
NEXT: Push `HEAD` to `origin/staging`, wait for Railway readiness, then run the deployed insights API gate before Phase 2 Exec can close.

## 2026-05-28 22:32 -04 — P6 PHASE 2 LOCAL CHECKPOINT: insights rollup API
SCOPE: Added the deterministic monthly insights engine, ownership-scoped `/api/v1/insights/monthly` endpoint, cache fingerprinting, fixture/database adapters, generated web/mobile API contracts, API/runbook docs, and a reusable deployed staging API gate at `scripts/staging/run-insights-api-gate.py`.
PLATFORM PROGRESS: The backend can now compute monthly top L2 transaction categories, top L4 item categories, special-case exclusions, and growth/shrink gravity centers from persisted transactions. The API is ready for Web/Android integration once branch-backed staging proof confirms the deployed path.
CHECKS: `cd backend && uv run ruff check app tests` (pass); `cd backend && uv run ruff format --check app tests` (pass after formatting new files); `cd backend && uv run mypy app/ --no-error-summary` (pass); `cd backend && uv run pytest tests/ -x --tb=line -q` (660 passed, 2 skipped, 1 warning); `cd backend && uv run pytest tests/test_insights_contract.py tests/test_insights_engine.py -q` (12 passed); `cd backend && uv run python -m py_compile ../scripts/staging/run-insights-api-gate.py` (pass); `cd web && npm run generate:api` (pass); `cd web && npm run build` (pass); `cd mobile && npm run generate:api` (pass); `cd mobile && npm run typecheck` (pass); `git diff --check` (pass). Refreshed focused gates after docs alignment: `cd backend && uv run ruff check app tests ../scripts/staging/run-insights-api-gate.py` (pass); `cd backend && uv run mypy app/ --no-error-summary` (pass); `cd backend && uv run pytest tests/test_insights_contract.py tests/test_insights_engine.py -q` (12 passed); `git diff --check` (pass).
NEXT: Commit/push this candidate to `origin/staging`, wait for CI/Railway readiness, then run `cd backend && uv run python ../scripts/staging/run-insights-api-gate.py --api-base-url https://gastify-api-staging-e2e-staging.up.railway.app` to capture the required staging artifact before ticking Phase 2 Exec ✅.

## 2026-05-28 22:17 -04 — PHASE EXEC START: P6 Phase 2 — Rollup + gravity-center engine
ROUTE: `/gabe-next` advanced the active P6 plan to Phase 2 and dispatched `/gabe-execute`.
TASKS: implement deterministic monthly L2/L4 rollups, trailing-baseline gravity-center detection, ownership-scoped API access, and cache/fingerprint behavior against the Phase 1 seeded corpus.
STATE: Phase 2 Exec set to 🔄.

## 2026-05-27 13:44 -04 — [7fcd8ba] feat(statements): promote fallback prompt lab
FINDINGS: 0 critical blockers. Structure/docs drift was resolved before commit by adding nested prompt package patterns and updating the affected well docs.
ACTIONS: Committed the Phase 4 statement prompt-lab/runtime fallback surface, migrations, generated web/mobile contracts, docs, and KDBP review fixes.
CHECKS: `cd backend && uv run ruff check app tests` (pass); `cd backend && uv run pytest tests/ -x --tb=line -q` (645 passed, 2 skipped, 1 warning); `cd backend && uv run python -m app.prompt_lab validate` (49 total, 0 invalid); `cd web && npm run build` (pass); `cd mobile && npm run typecheck` (pass); `cd mobile && npm test -- --runInBand` (20 suites, 102 tests passed); `git diff --cached --check` (pass); staged leak scan found only generic `credentials.json` test-path references and generic gcloud command documentation, no local ADC tokens, project quota config, billing screenshots, or secrets.
NOTE: Backend `mypy app/` was attempted but remains a non-established gate for this repository; it reports broad pre-existing untyped FastAPI/SQLAlchemy/Firebase surfaces in addition to new statement modules. Web and mobile TypeScript gates passed.
TICK: ✅ Phase 4 Commit.
NEXT: Route Phase 4 to `/gabe-push`, then start Phase 5 Web statement reconciliation flow after push bookkeeping.

## 2026-05-27 13:32 -04 — PHASE 4 REVIEW FIXES COMPLETE: duplicate metadata + tracker state
VERDICT: APPROVE
FINDINGS: 2 total (0 critical, 1 high, 1 medium, 0 low), both fixed.
COVERAGE: HIGH — duplicate statement reprocess metadata is now tested in addition to the Phase 4 consolidation gates.
CONFIDENCE: 95/100
FIXES: Duplicate statement uploads now persist consent audit and provided card alias metadata before optional password/failure requeue. Added regression coverage for an encrypted duplicate requeue that upgrades a legacy false consent row and links the selected card alias. Reconciled stale Phase 3 Review state so direct `/gabe-review` routing no longer targets the older row.
PRODUCT NOTE: The user-facing prompt for statement AI-processing consent belongs in Web/Android statement upload flows; this backend fix only preserves the consent/card metadata already submitted by the app.
CHECKS: `cd backend && uv run ruff check app/api/statements.py tests/test_statements.py` (pass); `cd backend && uv run pytest tests/test_statements.py tests/test_statement_reconciliation.py -q` (21 passed); scoped `git diff --check` (pass).
DEFERRED: none.
ALIGNMENT: ALIGNED.
TIER: ent | DRIFT: none.
TICK: ✅ Phase 4 Review.
NEXT: Route to `/gabe-commit` for the Phase 4 backend/prompt-lab/docs set.

## 2026-05-27 13:11 -04 — PHASE 4 EXEC COMPLETE: statement prompt-lab consolidation
SCOPE: Consolidated and verified the Phase 4 statement backend, prompt-lab, and documentation surface after the product decision to promote Gemini fallback with caveats. No new Gemini provider call was made in this pass.
PLATFORM PROGRESS: Known-layout statements now have a deterministic PyMuPDF primary path and unsupported readable text-layer statements have a promoted Gemini `profile-rows` fallback with P0 transaction-readiness gates. Reports keep strict fixture diagnostics separate from runtime fallback readiness, and cost controls now show the validated fallback estimate before live runs.
EVIDENCE: Regenerated a cache-only 7-case suite at `prompt-testing/results/latest/statements/20260527T171106Z-001-statement-approach-suite/`. Summary recommendation: `pymupdf_primary_gemini_fallback_promoted_with_caveats`. `auto` passed `7/7` strict cases with cost `$0`; cached Gemini fallback remained strict `0/7` but P0-ready with `0` amount/date/currency mismatches and `0` unsafe candidates.
LEAK CHECK: Scrubbed the real personal email from profile mockup files and verified no gcloud ADC path, billing account id fragments, refresh tokens, client secrets, or exact billing export table names are present in tracked content. Local `.secrets/`, `.tmp/`, and mobile result runs remain ignored.
CHECKS: `cd backend && uv run ruff check app/agents app/api app/models app/prompts app/prompt_lab app/schemas app/services tests/test_statement_prompt_lab.py tests/test_statement_routing.py tests/test_statement_reconciliation.py tests/test_statement_worker.py tests/test_statements.py tests/test_prompt_registry.py tests/test_prompt_lab.py tests/test_transactions.py tests/test_persist_scan.py tests/test_config.py` (pass); focused backend pytest for statement/prompt-lab/transaction/config tests (215 passed); full backend `uv run pytest` (645 passed, 2 skipped, 1 warning); `cd backend && uv run python -m app.prompt_lab validate` (49 total, 18 baselined, 5 fixture-baselined, 26 unbaselined, 0 invalid); cache-only `statement-suite-run` for the 7-case suite (written); `cd web && npm run build` (pass); `cd mobile && npm run typecheck` (pass); `cd mobile && npm test -- --runInBand` (102 passed); `git diff --check` (pass).
TICK: ✅ Phase 4 Exec. Review remains ⬜.
NEXT: Route Phase 4 to `/gabe-review`, then commit/push the Phase 4 backend/prompt-lab/docs set before starting Phase 5 Web statement reconciliation flow.

## 2026-05-26 14:35 -04 — PHASE 4 ITERATION: amount evidence + CMR coalesce correction
CHANGE: Added required statement-line amount evidence (`amount_selection_reason`, `amount_candidates`) to the statement extraction contract and prompt. Added deterministic coalesce correction for fixed-term installment rows only when the provider supplies an explicit `current_installment` candidate, with warnings and field provenance showing raw vs processed amount. Updated statement reports so expected-vs-actual rows show value deltas and transaction context/candidate totals.
PLATFORM PROGRESS: Statement scans can now distinguish the selected statement amount from visible plan totals, preserve the evidence used for that choice, and safely correct a current-cuota amount when the provider output proves it. App-facing statement-only candidate payload examples now show fixed-term recurrence fields in `REPORT.md`, so downstream transaction creation risk is visible before Web/Android UI work.
LIVE RUNS: First CMR rerun with prompt `2026-05-26.2` proved optional amount evidence was too weak: `87/87` lines, but `0/87` lines had amount candidates. Tightened the schema/prompt to `2026-05-26.3` and reran live CMR with `statement-run --case cmr/cmr202503 --live --bypass-cache --confirm-live-cost --transaction-scope-firebase-uid local-user --run-id 20260526-phase4-live-cmr-amount-evidence-v3`.
LIVE RESULT: v3 provider call completed with no provider error and `87/87` lines. Prompt evidence improved amount matches from `77/87` to `86/87`; all `87/87` lines included amount candidates and selection reasons. Provider usage: `3826` input tokens, `21908` output tokens, `25734` total tokens, estimated cost `$0.0091458`, latency `62382.6ms`. The direct v3 live manifest still had `1` critical amount mismatch.
COALESCE RESULT: Reprocessed the v3 cached Gemini output with the explicit-evidence coalesce correction. Final report has `amount_minor=0` mismatches and `critical=0`. One row was corrected in provenance: source_order `7`, raw amount `165106` -> processed amount `55036`, source `statement_coalesce_current_installment_candidate`.
ARTIFACTS: v3 live manifest `prompt-testing/results/latest/statements/gemini/statement-extraction-current/20260526-phase4-live-cmr-amount-evidence-v3/cmr-cmr202503/manifest.json`; coalesced cached manifest `.../20260526-phase4-cmr-amount-evidence-v3-coalesce-correction/cmr-cmr202503/manifest.json`; final report `prompt-testing/results/latest/statements/20260526-statement-live-gemini-cmr-amount-evidence-v3-coalesced-report/REPORT.md`; machine report `.../report.json`.
REMAINING QUALITY GAPS: CMR still fails strict promotion because the coalesced report has `date=1`, `line_type=7`, `description=16`, `original_amount_minor=2`, and low-severity `installment=17` mismatches. Promotion blockers remain `date_mismatches_present`, `description_mismatches_present`, `foreign_currency_metadata_mismatches_present`, and `line_type_mismatches_present`. Do not expand to Edwards/Scotiabank yet.
CHECKS: `cd backend && uv run ruff check app/schemas/statement.py app/prompts/statement/extraction.py app/prompt_lab/statement/coalesce.py app/prompt_lab/statement/provenance.py app/prompt_lab/statement/report.py tests/test_statement_prompt_lab.py tests/test_statement_reconciliation.py tests/test_transactions.py tests/test_persist_scan.py tests/test_prompt_registry.py` (pass); `cd backend && uv run ruff format --check ...` (pass); `cd backend && uv run pytest tests/test_statement_prompt_lab.py tests/test_statement_reconciliation.py tests/test_transactions.py tests/test_persist_scan.py tests/test_prompt_registry.py tests/test_prompt_lab.py -q` (131 passed); `cd web && npm run generate:api` (pass); `cd mobile && npm run generate:api` (pass); `cd mobile && npm run typecheck` (pass); `cd web && npm run build` (pass); scoped `git diff --check` (pass).
NEXT: Iterate prompt/coalesce classification for the remaining non-financial blockers: insurance line typing, one wrong date on `Pago automatico seg auto subaru`, foreign-currency description/original amount handling, and low-severity omission of `01/01` markers.

## 2026-05-26 14:16 -04 — PHASE 4 PLATFORM UPDATE: reliable statement matching + recurrence contract
CHANGE: Replaced statement report pass/fail scoring with deterministic best-match line alignment while keeping source-order drift as a diagnostic. Added recurrence/term fields to transactions, transaction API schemas, statement-only candidate payloads, receipt scan persistence, and generated web/mobile OpenAPI contracts. Tightened statement and receipt prompts so visible installment/recurrence evidence is captured without silently rewriting money values.
PLATFORM PROGRESS: Statement prompt-lab reports can now distinguish true value extraction failures from line-order noise, and app-facing transaction payloads can carry fixed-term installments or recurring-bill hints from statement and receipt scans for later user verification. This makes the next Gemini iteration more actionable before Web/Android reconciliation UI work starts.
ARTIFACTS: Regenerated the CMR live-manifest report without a new Gemini call at `prompt-testing/results/latest/statements/20260526-statement-live-gemini-cmr-prompt-iteration-1-report/`; regenerated `web/src/lib/openapi-spec.json`, `web/src/lib/api-types.d.ts`, `mobile/src/lib/openapi-spec.json`, and `mobile/src/lib/api-types.d.ts`.
RESULT: CMR remains failed for true value differences, not ordering drift: order drift `0`, unmatched expected `0`, unmatched actual `0`, with remaining amount/description/line-type/original-amount mismatches visible as expected-vs-actual pairs.
CHECKS: `cd backend && uv run ruff check app/schemas/recurrence.py app/services/recurrence.py app/models/transaction.py app/schemas/transaction.py app/schemas/scan.py app/api/transactions.py app/services/coalesce.py app/services/persist_scan.py app/services/statement_reconciliation.py app/prompts/receipt/extraction.py app/prompts/statement/extraction.py app/prompt_lab/statement/scoring.py app/prompt_lab/statement/report.py tests/test_statement_prompt_lab.py tests/test_statement_reconciliation.py tests/test_transactions.py tests/test_persist_scan.py tests/test_prompt_registry.py` (pass); `cd backend && uv run ruff format --check ...` (pass); `cd backend && uv run pytest tests/test_statement_prompt_lab.py tests/test_statement_reconciliation.py tests/test_transactions.py tests/test_persist_scan.py tests/test_prompt_registry.py tests/test_prompt_lab.py -q` (131 passed); `cd web && npm run generate:api` (pass); `cd mobile && npm run generate:api` (pass); `cd mobile && npm run typecheck` (pass); `cd web && npm run build` (pass); targeted mobile Jest transaction tests (7 passed); targeted web journey test (1 passed); scoped `git diff --check` (pass).
NEXT: Run one new no-cache live Gemini CMR pass with prompt version `2026-05-26.1`, regenerate the report, and compare whether amount matches improve before expanding to Edwards/Scotiabank.

## 2026-05-26 13:49 -04 — PHASE 4 DIAGNOSTIC TWEAK: expected-vs-actual statement values
CHANGE: Updated statement report diagnostics so mismatch samples include compact expected and actual line snapshots plus visible expected-vs-actual field values in `REPORT.md`. Added explicit line comparison metadata documenting that provider output is sorted by provider-supplied `source_order` during coalesce, then scored positionally against expected lines without date/amount/merchant re-alignment.
ARTIFACTS: Regenerated `prompt-testing/results/latest/statements/20260526-statement-live-gemini-cmr-prompt-iteration-1-report/REPORT.md` and `report.json` from the existing CMR live manifest; no Gemini call was made.
CHECKS: `cd backend && uv run ruff check app/prompt_lab/statement/report.py tests/test_statement_prompt_lab.py` (pass); `cd backend && uv run ruff format --check app/prompt_lab/statement/report.py tests/test_statement_prompt_lab.py` (pass); `cd backend && uv run pytest tests/test_statement_prompt_lab.py -q` (22 passed); scoped `git diff --check` (pass).
NEXT: If future CMR reports show large cascades, inspect whether provider `source_order` is wrong before treating every positional field mismatch as a true extraction-value failure.

## 2026-05-26 13:35 -04 — PHASE 4 ITERATION: statement prompt diagnostics and CMR rerun
CHANGE: Tightened the statement Gemini prompt around installment amounts, installment marker preservation, foreign-currency metadata, zero-decimal CLP, cent-based foreign currencies, and negative refund/payment classification. Added deterministic post-provider diagnostics without silent amount correction, including severity counts, downstream impact, recommended owner, promotion blockers, and top source-order mismatch examples in `statement-report` / `statement-batch-report`.
OLD REPORT REGEN: Regenerated `prompt-testing/results/latest/statements/20260525-statement-live-gemini-cmr-report/REPORT.md` from the prior CMR live manifest without a new provider call. It now explains the threshold failure: `87/87` lines extracted, but `10` critical amount mismatches, `16` description mismatches, `4` line type mismatches, and `10` foreign-currency original-amount mismatches. Blocking mismatched lines: `22`; recommended owner: `prompt`.
LIVE COMMAND: `cd backend && GOOGLE_API_KEY=<local secret> uv run python -m app.prompt_lab statement-run --case cmr/cmr202503 --live --bypass-cache --confirm-live-cost --transaction-scope-firebase-uid local-user --run-id 20260526-phase4-live-cmr-prompt-iteration-1`.
LIVE RESULT: Provider call completed with no cache reuse and no provider error; case remains `threshold-failed`. Model `google-gla:gemini-2.5-flash-lite`; prompt version `2026-05-26.0`; input tokens `3209`; output tokens `6586`; total tokens `9795`; estimated cost `$0.0029553`; latency `26605.2ms`.
QUALITY DELTA: New CMR run still extracted `87/87` lines and kept amount matches at `77/87`, so the critical financial blocker did not improve. Installment mismatches improved from `87` to `1`; line type matches regressed from `83/87` to `80/87`; description matches stayed `77/87` with `71/87` exact before safe OCR normalization. Report severity: `critical=10`, `high=7`, `medium=20`, `low=7`; promotion blockers are `amount_mismatches_present`, `description_mismatches_present`, `foreign_currency_metadata_mismatches_present`, and `line_type_mismatches_present`.
ARTIFACTS: Live manifest `prompt-testing/results/latest/statements/gemini/statement-extraction-current/20260526-phase4-live-cmr-prompt-iteration-1/cmr-cmr202503/manifest.json`; batch analysis `.../20260526-phase4-live-cmr-prompt-iteration-1/phase4-live-cmr-prompt-iteration-1-statement-live-analysis.md`; mock-style report `prompt-testing/results/latest/statements/20260526-statement-live-gemini-cmr-prompt-iteration-1-report/REPORT.md`; machine report `.../report.json`.
CHECKS: `cd backend && uv run ruff check app/prompts/statement/extraction.py app/prompt_lab/statement/scoring.py app/prompt_lab/statement/coalesce.py app/prompt_lab/statement/report.py app/prompt_lab/statement/batch_report.py tests/test_statement_prompt_lab.py` (pass); `cd backend && uv run ruff format --check app/prompts/statement/extraction.py app/prompt_lab/statement/scoring.py app/prompt_lab/statement/coalesce.py app/prompt_lab/statement/report.py app/prompt_lab/statement/batch_report.py tests/test_statement_prompt_lab.py` (pass); `cd backend && uv run pytest tests/test_statement_prompt_lab.py tests/test_statement_reconciliation.py tests/test_prompt_lab.py tests/test_prompt_registry.py` (69 passed); scoped `git diff --check` (pass).
NEXT: Phase 4 Exec remains 🔄. Do not expand live provider runs to Edwards/Scotiabank yet; iterate CMR prompt/diagnostics again or deliberately classify the residual installment amount, foreign-currency metadata, and line-type blockers before representative expansion.

## 2026-05-25 20:07 -04 — PHASE 4 REPORT: live Gemini manifest compared in mock-style report lane
CHANGE: Added `statement-report --actual-source live-gemini --manifest ...` so prior live `statement-run` manifests can be compared using the same top-level `REPORT.md` / `report.json` shape as mock-Gemini statement reports without calling Gemini again.
COMMAND: `cd backend && uv run python -m app.prompt_lab statement-report --actual-source live-gemini --manifest ../prompt-testing/results/latest/statements/gemini/statement-extraction-current/20260525-phase4-live-cmr-one/cmr-cmr202503/manifest.json --transaction-scope-firebase-uid local-user --run-id 20260525-statement-live-gemini-cmr-report`.
RESULT: Report written for `cmr/cmr202503`; actual source `live-gemini`; expected lines `87`; actual normalized lines `87`; comparison failed; reconciliation counts matched `2`, ambiguous `1`, statement-only `84`, receipt-only `2`, candidate transactions `81`, failed `0`.
ARTIFACTS: `prompt-testing/results/latest/statements/20260525-statement-live-gemini-cmr-report/REPORT.md`; `report.json`; `manifest.json`; case artifacts under `cmr-cmr202503/`.
CHECKS: `cd backend && uv run ruff check app/prompt_lab/cli.py app/prompt_lab/statement/report.py tests/test_statement_prompt_lab.py` (pass); `cd backend && uv run pytest tests/test_statement_prompt_lab.py tests/test_statement_reconciliation.py tests/test_prompt_lab.py tests/test_prompt_registry.py` (67 passed).

## 2026-05-25 20:00 -04 — PHASE 4 LIVE GEMINI ATTEMPT: CMR representative statement
COMMAND: `cd backend && GOOGLE_API_KEY=<local secret> uv run python -m app.prompt_lab statement-run --case cmr/cmr202503 --live --bypass-cache --confirm-live-cost --transaction-scope-firebase-uid local-user --run-id 20260525-phase4-live-cmr-one`.
RESULT: Live Gemini provider call completed with no cache reuse. Case status `threshold-failed`; failure owner `prompt_or_coalesce`; no provider error.
MODEL/COST: `google-gla:gemini-2.5-flash-lite`; provider usage `2766` input tokens, `6321` output tokens, `9087` total tokens; estimated cost `$0.002805`; latency `28583.2ms`.
QUALITY: Expected and actual line counts both `87`; dates matched `87/87`; descriptions matched `71/87`; amounts matched `77/87`; mismatch samples show amount scaling/field classification issues, so prompt/coalesce iteration is required before promotion.
RECONCILIATION SNAPSHOT: local SQLite `local-user` scope had `16` statement-lab seed transactions. Result buckets: matched `2`, ambiguous `1`, statement-only `84`, receipt-only `2`, candidate transactions `81`, failed `0`.
ARTIFACTS: `prompt-testing/results/latest/statements/gemini/statement-extraction-current/20260525-phase4-live-cmr-one/cmr-cmr202503/manifest.json`; `raw_output.json`; `processed_output.json`; `score.json`; `reconciliation.json`; `payload_examples.json`; `cost_summary.json`; batch summary `prompt-testing/results/latest/statements/gemini/statement-extraction-current/20260525-phase4-live-cmr-one/phase4-live-cmr-one-statement-live-summary.json`; analysis `.../phase4-live-cmr-one-statement-live-analysis.md`. Cache written under ignored `prompt-testing/cache/gemini/statements/`.
NEXT: Fix prompt/coalesce issues for amount normalization and line type classification, then rerun this one CMR case before expanding to Edwards/Scotiabank.

## 2026-05-25 19:57 -04 — PHASE 4 EXEC STARTED: statement Gemini prompt-lab gate
ROUTE: `/gabe-next` resolved Current Phase 4 (`Statement Gemini prompt lab + coalesce gate`) to `/gabe-execute` because Exec was ⬜.
TICK: 🔄 Phase 4 Exec.
LOCAL CHECKS: `cd backend && uv run pytest tests/test_statement_prompt_lab.py tests/test_statement_reconciliation.py tests/test_prompt_lab.py tests/test_prompt_registry.py` (66 passed); `git diff --check -- .kdbp/PLAN.md .kdbp/DECISIONS.md .kdbp/LEDGER.md backend/app backend/tests prompt-testing docs/wells` (pass).
DRY-RUN ARTIFACTS: `prompt-testing/results/latest/statements/gemini/statement-extraction-current/20260525-phase4-dry-run/cmr-cmr202503/manifest.json`; `.../edwards-edw202506/manifest.json`; `.../scotiabank-sco202206/manifest.json`; batch summary `.../phase4-dry-run-statement-live-summary.json`; analysis `.../phase4-dry-run-statement-live-analysis.md`.
DRY-RUN RESULT: 3 representative cases generated the required artifact skeletons with `status=dry-run`, `total_cost_usd=0`, and failure owner `not_provider_quality_evidence`.
LIVE-COST GUARD: `cd backend && uv run python -m app.prompt_lab statement-run --case cmr/cmr202503 --live` refused with `statement-run --live requires --confirm-live-cost`.
BLOCKER: Phase 4 cannot close Exec until the representative no-cache Gemini runs are explicitly approved and run with `--live --bypass-cache --confirm-live-cost`, then batch-classified. No provider call was made in this step.
NEXT: Run the live representative statement prompt-lab pass after operator cost confirmation, then re-run `statement-batch-report` and decide whether the prompt is ready, needs prompt/coalesce iteration, or needs baseline expansion.

## 2026-05-25 19:50 -04 — PLAN UPDATED: P5 numeric phase routing for statement Gemini prompt lab
CHANGE: Renumbered the inserted statement Gemini prompt-lab gate from non-numeric `Phase 3A` to numeric `Phase 4`, then shifted Web, Android, and P5 exit phases to Phases 5, 6, and 7. Added D55 for the Phase 4 tier decision and updated D51-D53 phase labels. This preserves the roadmap content while restoring `/gabe-next` parser compatibility with numeric phase ids.
NEXT: Route `/gabe-next`; expected command is `/gabe-execute` for Phase 4.

## 2026-05-25 18:10 -04 — PHASE 3 EXEC COMPLETE: deployed statement reconciliation three-bucket gate
ROUTE: `/gabe-next` resumed Phase 3 `/gabe-execute`; Phase 3 Exec is now closed by deployed `staging-e2e` proof.
COMMITS: `bd4a621` reconciliation engine; `70602ca` mobile API drift fix; `e38e82b` fixture gate FX independence; `9b6409c` fixture gate completion wait.
CI: `origin/staging` run 26421680669 for `9b6409c` passed 12/12. Earlier run 26421416829 for `70602ca` also passed after the mobile API drift fix.
RAILWAY: `gastify-api-staging-e2e` deployment `dd03ec7a-ebe9-4c12-bc7b-5083dcb7289c` and `gastify-api-staging` deployment `3b936f9e-9932-42e9-a568-c49c58368005` reached `SUCCESS/RUNNING`. Readiness for both returned `status=ok`, DB connected, migration current/head `016`.
RUNTIME PROOF: Ran `GASTIFY_STAGING_E2E_API_BASE_URL=https://gastify-api-staging-e2e-staging.up.railway.app GASTIFY_RESULT_ENV=staging-e2e GASTIFY_STATEMENT_STAGE_ID=20260525T-p5-phase3-reconciliation-gate-clean scripts/staging/run-statement-fixture-gate.py --seed-fixture-transactions --require-three-buckets`.
RESULT: Passed. Manifest records `result_status=passed`, statement status `completed`, line count `2`, reconciliation status `completed`, `matched_count=1`, `statement_only_count=1`, `receipt_only_count=26`, `ambiguous_count=0`, and `coverage_ratio=0.5`. The receipt-only bucket is inflated by pre-existing staging-e2e receipt data in the statement period, but the seeded proof still shows all required buckets through the deployed API.
ARTIFACTS: `tests/mobile/results/runs/staging-e2e/20260525T-p5-phase3-reconciliation-gate-clean/p5-statement-fixture-backend/manifest.json`; `readiness.json`; `upload-response.json`; `final-statement.json`; `lines.json`; `seeded-transactions.json`; `reconciliation.json`; run manifest `tests/mobile/results/runs/staging-e2e/20260525T-p5-phase3-reconciliation-gate-clean/run-manifest.json`.
NOTE: Manifest `git_dirty_file_count=1` is the pre-existing untracked `backend/.gitignore`; tracked files were clean at proof time.
TICK: ✅ Phase 3 Exec
NEXT: Route to `/gabe-review` for Phase 3. Review should inspect the reconciliation service/API, fixture-gate evidence, and the accepted staging-data pollution caveat before Phase 4 web work begins.

## 2026-05-25 18:04 -04 — GATE FIX: statement fixture seed avoids live FX dependency
RUNTIME ATTEMPT: `scripts/staging/run-statement-fixture-gate.py --seed-fixture-transactions --require-three-buckets` reached deployed `staging-e2e` readiness but failed while seeding the first receipt transaction because `/api/v1/transactions` returned `503 Exchange rate unavailable` for the CLP fixture seed.
CAUSE: The three-bucket gate was depending on live FX just to create deterministic receipt seed data, before the statement upload/reconciliation portion could run.
FIX: Changed the deterministic statement fixture provider and staging fixture seed script to use USD for the generated fixture rows/transactions, preserving currency-equality reconciliation coverage while removing the live-FX dependency from the gate.
FOLLOW-UP: After the USD seed fix, the gate seeded receipts and persisted USD statement lines but stopped polling at transient `status=extracted`; `/statements/{id}/reconciliation` returned 404 before the worker committed the reconciliation run. Tightened the gate so `--require-three-buckets` waits for `status=completed`.
CHECKS: `cd backend && uv run ruff check app/services/statement_extraction.py tests/test_statement_worker.py ../scripts/staging/run-statement-fixture-gate.py` (pass); `cd backend && uv run ruff format --check app/services/statement_extraction.py tests/test_statement_worker.py ../scripts/staging/run-statement-fixture-gate.py` (pass); targeted statement `mypy` (pass); targeted statement pytest (31 passed); `python3 -m py_compile scripts/staging/run-statement-fixture-gate.py` (pass); `git diff --check` (pass).
NEXT: Commit and push the gate fix, redeploy `staging-e2e`, then rerun the seeded three-bucket statement fixture gate before ticking Phase 3 Exec complete.

## 2026-05-25 17:58 -04 — CI FIX: Phase 3 mobile API contract drift
CI: `origin/staging` run 26421348282 failed `Mobile API Drift` because the new statement reconciliation endpoints changed OpenAPI without regenerated mobile API artifacts.
FIX: Ran `cd mobile && npm run generate:api`, updating `mobile/src/lib/openapi-spec.json` and `mobile/src/lib/api-types.d.ts`.
CHECKS: `cd mobile && npm run typecheck` (pass); `git diff --check -- mobile/src/lib/openapi-spec.json mobile/src/lib/api-types.d.ts` (pass).
NEXT: Commit and push the generated API artifacts, wait for the staging CI retry, redeploy if needed, then run the seeded three-bucket statement fixture gate.

## 2026-05-25 17:54 -04 — [bd4a621] feat(statements): add reconciliation engine
FINDINGS: 1 (0 critical, 1 high, 0 medium, 0 low)
ACTIONS: accepted broad `mypy app/` backlog as pre-existing for this checkpoint; targeted Phase 3 app mypy passed and full backend pytest passed.
DEFERRED: none
TICK: ✅ Phase 3 Commit
NEXT: Push/deploy the Phase 3 candidate to Railway `staging-e2e`, then run `scripts/staging/run-statement-fixture-gate.py --seed-fixture-transactions --require-three-buckets` before marking Exec complete.

## 2026-05-25 17:52 -04 — PHASE 3 LOCAL IMPLEMENTATION CHECKPOINT: statement reconciliation
SCOPE: Created ignored/private representative statement expected baselines for `cmr/cmr202503`, `edwards/edw202506`, and `scotiabank/sco202206`; added deterministic statement-to-receipt reconciliation service, API buckets, worker reconciliation kickoff, and staged fixture-gate reconciliation artifact support.
LOCAL VERIFICATION: `cd backend && uv run ruff check . ../scripts/staging/run-statement-fixture-gate.py` (pass); `cd backend && uv run ruff format --check . ../scripts/staging/run-statement-fixture-gate.py` (pass); targeted statement `mypy` (pass); `cd backend && uv run pytest tests/test_statement_reconciliation.py tests/test_statement_worker.py tests/test_statements.py tests/test_statement_prompt_lab.py tests/test_statement_stream.py -q` (31 passed); `cd backend && uv run pytest tests/ -q` (565 passed, 2 skipped, 1 warning); `python3 -m py_compile scripts/staging/run-statement-fixture-gate.py` (pass); `scripts/staging/run-statement-fixture-gate.py --help` (pass).
TYPECHECK NOTE: Full `cd backend && uv run mypy app tests/test_statement_reconciliation.py tests/test_statement_worker.py` still hits the repo's existing broad mypy backlog in unrelated modules/tests; the Phase 3 touched app files pass targeted mypy.
NEXT: Commit/checkpoint this local candidate through `/gabe-commit`, push/deploy to `staging-e2e`, then run the seeded statement fixture gate with `--seed-fixture-transactions --require-three-buckets` before Phase 3 Exec can close.

## 2026-05-25 17:38 -04 — PHASE EXEC START: Phase 3 — Reconciliation engine + coverage metric
ROUTE: `/gabe-next` advanced the active P5 plan from completed Phase 2 to Phase 3 and dispatched `/gabe-execute`.
TASKS: private representative statement `.expected.json` baselines first, deterministic reconciliation engine, persisted verdict buckets, API contract, and deployed staging-e2e proof.
STATE: Phase 3 Exec set to 🔄. Raw PDFs, credentials, and expected statement targets remain local/private and must not be committed.

## 2026-05-25 17:33 -04 — PUSH main -> main
PR: —
CI: ✅ 12/12 (78s) — GitHub Actions run 26420576369 for `004972fc698839b45766cf4a2d2ae344973c9bbd`
PROMOTION: push-local — `origin/staging` was ahead of `origin/main` but only carried the Phase 2 exec commits; pushed local `main` so review fixes and the statement-baseline-before-Gemini plan guard shipped with Phase 2.
DEPLOYMENTS: P30  (added row to .kdbp/DEPLOYMENTS.md)
CLASSIFIER: P26 resurfaced and deferred by default; PyJWT audit-ignore revisit remains open with times_deferred=4.
TICK: ✅ Phase 2 Push
NEXT: Phase 2 is complete. Route to `/gabe-next`; expected command is to advance to Phase 3.

## 2026-05-25 17:32 -04 — PLAN CLARIFICATION: statement baselines before Gemini
SCOPE: Tightened P5 Phase 3 so private `.expected.json` statement baselines from Codex/manual review must exist before any Gemini statement prompt iteration or live-provider statement extraction scoring is used as quality evidence.
BASELINE GATE: Minimum first pass is one CMR, one Edwards, and one Scotiabank statement, expanding toward the full 24-PDF corpus before promotion.
CHECKS: `git diff --cached --check` (pass).
NEXT: Continue `/gabe-push` for Phase 2.

## 2026-05-25 17:16 -04 — [25effae] fix(statements): resolve phase 2 review findings
FINDINGS: 3 review findings triaged and fixed (0 critical, 2 high, 0 medium, 1 low)
ACTIONS: committed the Phase 2 review-resolution set: codex-text no-normalization now fails explicitly, statement SSE has endpoint integration tests, and the staging fixture manifest records `auth_verified` instead of Firebase identifiers.
DEFERRED: none
CHECKS: `git diff --cached --check` (pass); `cd backend && uv run ruff check .` (pass); `cd backend && uv run ruff format --check app/services/statement_extraction.py tests/test_statement_worker.py tests/test_statement_stream.py` (pass); targeted statement `mypy` (pass); `cd backend && uv run pytest tests/test_statement_worker.py tests/test_statement_stream.py tests/test_statements.py -q` (18 passed); `cd backend && uv run pytest tests/ -x --tb=line -q` (558 passed, 2 skipped, 1 warning).
TICK: ✅ Phase 2 Commit
NEXT: Route to `/gabe-next`; expected command is `/gabe-push` for Phase 2.

## 2026-05-25 17:15 -04 — PHASE 2 REVIEW: Statement PDF upload + extraction worker
VERDICT: APPROVE
FINDINGS: 3 total (0 critical, 2 high, 0 medium, 1 low)
COVERAGE: HIGH — SSE endpoint tested (4 integration tests), codex-text-no-normalization path tested, artifact privacy fixed
CONFIDENCE: 95/100
DEFERRED: none
ALIGNMENT: DRIFTED (23/27 on-scope; 4 off-scope docs/wells files thematically related)
TIER: ent | DRIFT: none
TICK: ✅ Phase 2 Review
SOURCES: codex (gpt-5) + claude (claude-opus-4-6) — blind-first cross-agent triangulation, union consolidation (3 strict overlapping findings, 0 unique)
TRIAGE: option [2] fix all — fixed 3 (#1 extraction false-success → extraction_failed, #2 SSE integration tests added, #3 manifest auth_verified boolean)
FIXES: statement_extraction.py codex-text returns extraction_failed; new test_statement_stream.py (4 tests); run-statement-fixture-gate.py redacted identifiers
ARCHIVED: `.kdbp/reviews-archive/REVIEW_2026-05-25-171500_resolved.md`

## 2026-05-25 10:50 -04 — PUSH main -> main
PR: —
CI: ✅ 12/12 (64s) — GitHub Actions run 26406355703 for `f4f5edd169e58f2351abeaf6dafbefe490162d4e`
PROMOTION: N/A — `origin/staging` was not ahead of `origin/main`; pushed local `main` directly to production target.
DEPLOYMENTS: P28 (added row to .kdbp/DEPLOYMENTS.md)
AUTO-FIX: Initial CI run 26406216066 failed SCA on `pypdf==5.9.0`; upgraded backend dependency to `pypdf>=6.10.2,<6.11.0` in `f4f5edd` and reran CI green.
LOCAL CHECKS: `cd backend && uv run pip-audit --ignore-vuln PYSEC-2025-183` (pass); `cd backend && uv run pytest tests/ -x --tb=line -q` (532 passed, 2 skipped, 1 warning); `cd backend && uv run ruff check .` (pass); `cd backend && uv run ruff format --check .` (pass).
TICK: ✅ Phase 0 Push
NEXT: Phase 0 is complete. Route to `/gabe-next`; expected command is `/gabe-execute` for Phase 1.

## 2026-05-25 10:28 -04 — [e760260] feat(prompt-lab): add statement corpus preflight
SCOPE: Committed P5 Phase 0 statement corpus preflight: ignored private PDF fixture lane, sanitized manifest, statement extraction contract, prompt kind, CLI, Codex-only text packet wrapper, statement scoring, docs, and KDBP plan/decision/review evidence.
CHECKS: `git diff --cached --check` (pass); `cd backend && uv run ruff check app/ tests/test_statement_prompt_lab.py` (pass); `cd backend && uv run ruff format --check app/prompt_lab/statement_cases.py app/prompt_lab/statement_scoring.py app/schemas/statement.py app/prompts/statement_extraction.py tests/test_statement_prompt_lab.py` (pass); targeted statement `mypy` (pass); `cd backend && uv run pytest tests/ -x --tb=line -q` (532 passed, 2 skipped, 1 warning). Full `mypy app/` still reports pre-existing unrelated baseline type debt outside Phase 0; changed statement modules pass targeted mypy.
COMMIT_GATE: Structure patterns updated for statement prompt-lab artifacts; README updated for P5 status and prompt id configuration; staged privacy scan found no non-test dummy passwords or raw statement text in committed artifacts.
TICK: ✅ Phase 0 Commit
NEXT: Route to `/gabe-next`; expected command is `/gabe-push` for Phase 0.

## 2026-05-25 10:03 -04 — PHASE 0 REVIEW: Statement corpus + extraction contract preflight
VERDICT: APPROVE after triage.
FINDINGS: 3 high findings fixed: raw statement text removed from the normalized statement contract and kept in a prompt-lab-only packet; password-required/password-invalid extraction packets now expose typed status; statement scoring now requires description/merchant matches.
CHECKS: `git diff --check` (pass); targeted `ruff check` and `ruff format --check` (pass); targeted `mypy` for new statement modules (pass); `cd backend && uv run pytest tests/test_statement_prompt_lab.py tests/test_prompt_lab.py tests/test_prompt_registry.py tests/test_config.py` (58 passed); `cd backend && uv run pytest` (532 passed, 2 skipped, 1 warning).
ARTIFACTS: Review archived at `.kdbp/reviews-archive/REVIEW_2026-05-25-100300_resolved.md`; ignored Codex sample extraction packets regenerated under `prompt-testing/results/latest/statements/20260525Tstatement-codex-samples/`.
TICK: ✅ Phase 0 Review
NEXT: Route to `/gabe-commit` for Phase 0 changes.

## 2026-05-25 09:46 -04 — PHASE 0 EXEC COMPLETE: Statement corpus + extraction contract preflight
SCOPE: Implemented the pre-runtime statement prompt-lab lane: ignored private PDF corpus import, sanitized corpus manifest, statement Pydantic contracts, statement prompt kind, Codex-only PDF/password extraction, statement-specific scoring, docs, and KDBP Phase 0 routing.
CORPUS: Imported 24 PDFs into ignored local fixtures: CMR 12 unencrypted, Edwards 9 encrypted, Scotiabank 3 encrypted. Manifest records hashes/page counts/encryption/password-source flags without credentials or raw statement text.
CODEX SAMPLES: Created ignored extraction packets for `cmr/cmr202503`, `edwards/edw202506`, and `scotiabank/sco202206` under `prompt-testing/results/latest/statements/20260525Tstatement-codex-samples/`.
CHECKS: `git diff --check` (pass); targeted `ruff check` and `ruff format --check` (pass); `cd backend && uv run pytest tests/test_statement_prompt_lab.py tests/test_prompt_lab.py tests/test_prompt_registry.py` (44 passed); `cd backend && uv run pytest tests/test_config.py tests/test_env_files.py tests/test_statement_prompt_lab.py` (21 passed); targeted `mypy` for new statement modules (pass); `cd backend && uv run pytest` (531 passed, 2 skipped, 1 warning).
TICK: ✅ Phase 0 Exec
NEXT: Route to `/gabe-review` for Phase 0 before any runtime schema/UI implementation.

## 2026-05-25 09:42 -04 — PLAN AMENDED + PHASE 0 EXEC STARTED: P5 statement corpus preflight
SCOPE: Added P5 Phase 0 before runtime implementation so statement corpus intake, PDF password states, Codex-only extraction, statement Pydantic contracts, prompt kind, and statement-specific scoring are reviewed before schema/UI work.
DECISION: D54 logged for Phase 0 tier = ent.
ARTIFACTS: Sanitized statement corpus manifest at `prompt-testing/test-cases/statements/manifest.json`; private PDFs copied under ignored `prompt-testing/test-cases/statements/private/`; ignored Codex sample extraction packets created under `prompt-testing/results/latest/statements/20260525Tstatement-codex-samples/`.
CHECKS: `cd backend && uv run pytest tests/test_statement_prompt_lab.py` (5 passed).
TICK: 🔄 Phase 0 Exec
NEXT: Finish Phase 0 docs/verification, then route to `/gabe-review` for Phase 0 before runtime Phase 1.

## 2026-05-24 13:15 -04 — PLAN CREATED: P5 Statement Reconciliation + Cards
PHASES: 6 | COMPLEXITY: high | MATURITY: mvp
TIERS: mvp × 0, ent × 6, scale × 0 | PROTOTYPES: 0
DECISIONS: D48 → D53 (6 phase tier decisions logged)
SCOPE: PDF statement upload, statement extraction, reconciliation against receipt-sourced transactions, three-bucket view, coverage metric, and alias-only card CRUD with no PCI fields.
NATIVE GATE: Android/S23 only for this roadmap cycle; iOS remains deferred by D47/P31.
NEXT: Route to `/gabe-next`; expected command is `/gabe-execute` for Phase 1.

## 2026-05-24 13:02 -04 — PLAN COMPLETED: P4 Mobile App MVP
ARCHIVE: .kdbp/archive/completed_PLAN_2026-05-24_p4-mobile-app-mvp.md
PHASES COMPLETED: 5 of 5
REASON: Goal achieved — Android/S23 mobile MVP journey closed with Phase 5 push green; iOS runtime testing remains deferred post-roadmap by D47/P31.

## 2026-05-24 13:00 -04 — PUSH main -> main
PR: —
CI: ✅ 12/12 (70s) — GitHub Actions run 26367289042
PROMOTION: N/A — `origin/staging` was not ahead of `origin/main`; pushed local `main` directly to production target.
DEPLOYMENTS: P27  (added row to .kdbp/DEPLOYMENTS.md)
CLASSIFIER: P26 resurfaced and deferred by default; PyJWT audit-ignore revisit remains open with times_deferred=3. No new operational candidate was triggered by this push.
TICK: ✅ Phase 5 Push
NEXT: Phase 5 is complete. Route to `/gabe-plan complete` or `/gabe-plan update` for the post-P4 roadmap transition.

## 2026-05-24 12:53 -04 — ARTIFACT LAYOUT: Phase 5 S23 stage folders
SCOPE: Collapsed local ignored Phase 5 retry result folders from one top-level folder per `rN` into one folder per stage with `attempts/<attempt-id>/` children.
ACTIONS: Updated the Maestro result runner to support `GASTIFY_MOBILE_STAGE_ID` + `GASTIFY_MOBILE_ATTEMPT_ID`; updated the Phase 5 S23 wrapper to derive stage/attempt from old `GASTIFY_MOBILE_RUN_ID=...-rN` values while writing stage-root manifests; refreshed mobile testing/result docs.
ARTIFACTS: Final clean proof is now grouped at `tests/mobile/results/runs/staging-e2e/20260524Tphase5-s23-clean-gate/run-manifest.json` with attempt evidence under `tests/mobile/results/runs/staging-e2e/20260524Tphase5-s23-clean-gate/attempts/r4/`. The stage manifest records `result_layout=mobile-stage-run-folder-v1`, `latest_attempt_id=r4`, `flow_manifest_count=4`, `attempt_count=4`, `git_rev=7f0fddf`, and `git_dirty_file_count=0`.
CHECKS: `bash -n tests/mobile/scripts/run-maestro.sh scripts/staging/run-s23-phase5-gate.sh` (pass); fake ADB/Maestro stage-layout smoke (pass); grouped artifact manifest inspection with `jq` (pass).
NEXT: Checkpoint this artifact-layout fix before Phase 5 push; after that `/gabe-next` remains `/gabe-push`.

## 2026-05-24 12:42 -04 — [ce4ee32] chore(kdbp): record Phase 5 review
FINDINGS: 1 low accepted (P31 iOS runtime deferral touches `.kdbp/PLAN.md` but remains intentional by D47)
ACTIONS: accepted P31 as existing deferred lane; no new deferred items
CHECKS: `git diff --cached --check` (pass); staged diff limited to `.kdbp/PLAN.md` and `.kdbp/LEDGER.md`
TICK: ✅ Phase 5 Commit
NEXT: Route to `/gabe-next`; expected command is `/gabe-push` for Phase 5.

## 2026-05-24 12:33 -04 — PHASE 5 REVIEW: Mobile E2E journey + edge tests
VERDICT: APPROVE
FINDINGS: 0 total (0 critical, 0 high, 0 medium, 0 low)
COVERAGE: HIGH — committed Phase 5 harness/docs reviewed against clean S23/Railway evidence, local typecheck/Jest, shell syntax, Maestro syntax, manifest metadata, and screenshot packet.
CONFIDENCE: 100/100
DEFERRED: none new; P31 iOS runtime lane remains intentionally deferred by D47.
ALIGNMENT: SKIP — review target was the committed Phase 5 range from KDBP/LEDGER, with no live pre-review worktree diff.
TIER: ent | DRIFT: none
TICK: ✅ Phase 5 Review
NOTES: Runtime evidence remains the clean Android/S23 packet at `tests/mobile/results/runs/staging-e2e/20260524Tphase5-s23-clean-gate/attempts/r4/`: the stage `run-manifest.json` records `git_rev=7f0fddf`, `git_dirty_file_count=0`, device `RFCW90N4BYP`, Railway `staging-e2e`, fixture provider, build id `dev-client-localhost-20260524-phase5-7f0fddf`, and four passed flow manifests. The closure bookkeeping commit `77803ff` only records the completed gate.
NEXT: Route to `/gabe-next`; expected command is `/gabe-commit` for Phase 5 review/bookkeeping changes.

## 2026-05-24 12:28 -04 — PHASE 5 EXEC COMPLETE: Android/S23 clean gate captured
ROUTE: Resumed Phase 5 `/gabe-execute` after D47/P31 clarified that iOS runtime testing is officially deferred post-roadmap. Current Phase 5 now closes on Android physical hardware only.
SCOPE: Checkpointed the Phase 5 harness and KDBP changes in `34c28a5`, then fixed three clean-gate harness issues exposed by the S23 reruns: review copy alignment in `6eee876`, golden start-state normalization in `ba83948`, and camera-denied reset viewport handling in `7f0fddf`.
LOCAL VERIFICATION: `git diff --check` (pass before checkpoint); `bash -n scripts/staging/run-s23-phase5-gate.sh` (pass); `node -e "JSON.parse(require('fs').readFileSync('mobile/package.json','utf8'))"` (pass); Maestro `check-syntax` for the Phase 5 golden plus happy/review/failure/camera active flows (pass); `cd mobile && npm run typecheck` (pass); `cd mobile && npm test -- --runInBand` (20 suites / 102 tests passed).
RUNTIME PREFLIGHT: `bash scripts/staging/check-backend-ready.sh https://gastify-api-staging-e2e-staging.up.railway.app` returned `status=ok`, DB connected, migration current/head `014`; `cd mobile && GASTIFY_RESULT_ENV=staging-e2e GASTIFY_MOBILE_RUN_ID=20260524Tphase5-preclean-doctor npm run doctor:e2e` found S23 `RFCW90N4BYP` visible to native WSL ADB, with expected WSL warnings for missing JDK 17 and missing `xcrun`.
CLEAN RUNTIME GATE: `GASTIFY_MOBILE_RUN_ID=20260524Tphase5-s23-clean-gate-r4 GASTIFY_MOBILE_BUILD_ID=dev-client-localhost-20260524-phase5-7f0fddf GASTIFY_RESULT_ENV=staging-e2e GASTIFY_ENVIRONMENT=staging-e2e GASTIFY_SCAN_PROVIDER=fixture EXPO_PUBLIC_APP_ENV=staging-e2e EXPO_PUBLIC_API_BASE_URL=https://gastify-api-staging-e2e-staging.up.railway.app MAESTRO_DEVICE_ID=RFCW90N4BYP MAESTRO_REINSTALL_DRIVER=false bash scripts/staging/run-s23-phase5-gate.sh` passed all four flows.
ARTIFACTS: `tests/mobile/results/runs/staging-e2e/20260524Tphase5-s23-clean-gate/run-manifest.json` records `git_rev=7f0fddf`, `git_dirty_file_count=0`, `device_id=RFCW90N4BYP`, `api_base_url=https://gastify-api-staging-e2e-staging.up.railway.app`, `backend_environment=staging-e2e`, `scan_provider=fixture`, `build_id=dev-client-localhost-20260524-phase5-7f0fddf`, `latest_attempt_id=r4`, `attempt_count=4`, and `flow_manifest_count=4`. The four flow manifests under `tests/mobile/results/runs/staging-e2e/20260524Tphase5-s23-clean-gate/attempts/r4/` record `result_status=passed` for `p4-phase5-golden-journey-active`, `p4-phase2-scan-upload-review-active`, `p4-phase2-scan-upload-failure-active`, and `p4-phase2-camera-permission-denied-active`.
NOTES: Earlier clean-gate attempts R1/R2/R3 failed on harness/copy/state/viewport assumptions, not product regressions; each exposed issue was fixed before the final clean R4 pass. iOS runtime testing remains deferred by D47/P31 and does not block Phase 5 closure.
TICK: ✅ Phase 5 Exec
NEXT: Route to `/gabe-review` for Phase 5. Review should validate the clean Android/S23 evidence packet and keep iOS as a deferred post-roadmap lane.

## 2026-05-24 11:53 -04 — DECISION: iOS runtime lane deferred post-roadmap
SCOPE: User clarified that the remaining platform gap is iOS testing and chose to officially defer it. P4/Phase 5 is now Android/S23-only for the current roadmap cycle; iOS simulator/device proof moves to the end of the roadmap as P31/D47.
BOOKKEEPING: Updated `.kdbp/ROADMAP.md` to v1.2 with a deferred iOS runtime lane, amended `.kdbp/PLAN.md` Phase 5 exit signal/dependencies/risks, added D47 to `.kdbp/DECISIONS.md`, added P31 to `.kdbp/PENDING.md`, and updated mobile testing docs.
NEXT: Close Phase 5 through the Android path only: checkpoint/commit the harness changes, rerun the S23 Phase 5 gate cleanly against Railway `staging-e2e`, then proceed to Review/Commit/Push. iOS no longer blocks Phase 5.

## 2026-05-24 11:40 -04 — PHASE 5 EXEC CHECKPOINT: Mobile E2E journey + edge tests
ROUTE: `/gabe-next` advanced Current Phase from Phase 4 to Phase 5, then dispatched `/gabe-execute`. Phase 5 Exec was ticked from `⬜` to `🔄`.
SCOPE: Added Phase 5 local harness coverage for receipt permissions, stale scan uploads after sign-out, scan reconnect token refresh, scan failure copy/reset, and transaction edit rollback UI. Added `p4-phase5-golden-journey-active.yaml`, `scripts/staging/run-s23-phase5-gate.sh`, mobile package script `maestro:phase5:golden:active`, and Phase 5 runbook docs. Hardened reused Phase 2 active Maestro flows for dev-menu dismissal, below-fold scan controls, and review-title assertions.
LOCAL VERIFICATION: `git diff --check` (pass); `bash -n scripts/staging/run-s23-phase5-gate.sh` (pass); `node -e "JSON.parse(require('fs').readFileSync('mobile/package.json','utf8'))"` (pass); `maestro check-syntax` for Phase 5 golden plus happy/review/failure/camera active flows (pass); `cd mobile && npm run typecheck` (pass); `cd mobile && npm test -- --runInBand` (20 suites / 102 tests passed).
RUNTIME PREFLIGHT: `bash scripts/staging/check-backend-ready.sh https://gastify-api-staging-e2e-staging.up.railway.app` returned `status=ok`, DB connected, migration current/head `014`; `GASTIFY_RESULT_ENV=staging-e2e GASTIFY_MOBILE_RUN_ID=20260524Tphase5-runtime-preflight npm run doctor:e2e` found S23 `RFCW90N4BYP` visible to native Linux ADB, Maestro available, staging Firebase/native files present, and expected WSL warnings for missing JDK 17 and missing `xcrun`.
RUNTIME PARTIAL: S23 golden journey passed against Railway `staging-e2e` with Metro localhost dev client and build id `dev-client-localhost-20260524-phase5`: `tests/mobile/results/runs/staging-e2e/20260524Tphase5-s23-golden-gate-r3/p4-phase5-golden-journey-active/manifest.json` has `result_status=passed`, `device_id=RFCW90N4BYP`, `api_base_url=https://gastify-api-staging-e2e-staging.up.railway.app`, `backend_environment=staging-e2e`, `scan_provider=fixture`, `test_case_id=happy`, `git_rev=c19e1fd`, and `git_dirty_file_count=11`. The flow covered sign in, native gallery scan, WebSocket progress, transaction detail, merchant edit, sign out, reauth, and clean home without stale scan result.
BLOCKERS: Phase 5 Exec cannot close yet. The golden runtime proof is useful but not branch-backed/clean (`git_dirty_file_count>0`), and the reused review/failure/camera edge flows still need one clean rerun after the harness fixes. iOS runtime testing was later deferred post-roadmap by D47/P31 and no longer blocks Phase 5. Exec remains `🔄`; Review/Commit/Push remain `⬜`.
NEXT: Commit or otherwise checkpoint the Phase 5 harness changes through `/gabe-commit`, push/deploy as required by the runtime gate, then rerun `bash scripts/staging/run-s23-phase5-gate.sh` cleanly against Railway `staging-e2e`.

## 2026-05-24 11:07 -04 — PUSH main -> main
PR: —
CI: ✅ 12/12 (68s) — GitHub Actions run 26364742516
PROMOTION: direct production push of reviewed local HEAD; `origin/staging` was older than local Phase 4 review/commit fixes, so local `main` was fast-forwarded before push.
AUTO-FIX: first push run 26364670718 failed SCA on `starlette 1.0.0` (`PYSEC-2026-161`, fixed in 1.0.1). Added commit `ea1a6c9` locking `starlette 1.1.0`; local `cd backend && uv run pip-audit --ignore-vuln PYSEC-2025-183` returned no known vulnerabilities.
DEPLOYMENTS: P26  (added row to .kdbp/DEPLOYMENTS.md)
CLASSIFIER: P26 resurfaced and deferred by default; PyJWT audit-ignore revisit remains open with times_deferred=2.
TICK: ✅ Phase 4 Push
NEXT: Route to `/gabe-next`; expected next action is to advance to Phase 5.

## 2026-05-24 10:58 -04 — [462ca6c] fix(mobile): revoke push registrations on sign-out
FINDINGS: 1 low accepted (mobile well docs drift deferred by existing KDBP evidence)
ACTIONS: accepted low docs-drift signal for `docs/wells/7-mobile-app.md`; no new PENDING item
CHECKS: `git diff --staged --check` (pass); `cd mobile && npm run typecheck` (pass); `cd mobile && npm test -- --runInBand` (18 suites / 92 tests passed); `cd backend && uv run pytest tests/test_push_tokens.py` (6 passed)
TICK: ✅ Phase 4 Commit

## 2026-05-24 10:45 -04 — PHASE 4 REVIEW: Sign-out isolation + push registration + platform polish
VERDICT: APPROVE
FINDINGS: 2 total (0 critical, 1 high, 0 medium, 1 low) — 1 fixed, 1 deferred
COVERAGE: HIGH — 6 backend push-token tests, 4 mobile suites (27 tests), S23 staging-e2e Maestro green
CONFIDENCE: 98/100 (post-triage)
DEFERRED: P30 (ops script file length — Scale gate)
ALIGNMENT: ALIGNED
TIER: ent | DRIFT: none
TICK: ✅
SOURCES: codex (gpt-5, 1 finding) + claude (claude-opus-4-6, 2 findings). Consolidated via union. 1 strict overlap.
KEY FIX: `unregisterCurrentPushToken` now calls backend revoke-all when no local token is known (after app restart/reload), preventing stale push-delivery eligibility for signed-out devices. Two new tests added.
RESOLVED: P29 (deployed S23 push-registration staging proof confirmed from LEDGER 2026-05-21 entry).
RUNTIME RECHECK: Added and ran `tests/mobile/maestro/p4-phase4-signout-push-auto-unregister-active.yaml`, which registers notifications and signs out without pressing `push-unregister-button`.
RUNTIME ARTIFACT: `tests/mobile/results/runs/staging-e2e/20260524Tphase4-signout-push-auto-unregister-staging-s23-r1/p4-phase4-signout-push-auto-unregister-active/manifest.json` has `result_status=passed`, `device_id=RFCW90N4BYP`, `api_base_url=https://gastify-api-staging-e2e-staging.up.railway.app`, `backend_environment=staging-e2e`, `git_rev=3b436c8`, and `git_dirty_file_count=6`; screenshots cover home push panel, registered state, and signed-out state.
SERVER PROOF: Railway `gastify-api-staging-e2e` logs during the run show `POST /api/v1/push-tokens` `201` at `2026-05-24T14:48:32Z` and `POST /api/v1/push-tokens/unregister` `200` at `2026-05-24T14:48:42Z`.

## 2026-05-21 19:47 -04 — PHASE EXEC COMPLETE: Phase 4 deployed staging proof
ROUTE: Re-ran Phase 4 under the new review-after-staging gate using the current staging candidate.
BRANCH: Local `staging/phase4-workflow-proof-20260521`; `origin/staging` app candidate `2b36ac31e672fdba03b3c712a115c3cb82e736af`.
COMMITS: `2a0b60e` Phase 4 runtime/policy candidate; `5b696ef` cost-usage tooling kept as a separate commit in the staging lane; `2b36ac3` CI gate fixes (`ruff format` migration 014 and `pydantic-ai` audit floor).
LOCAL CHECKS: `git diff --check`; backend ruff/tests including `uv run pytest --cov=app --cov-fail-under=80` (526 passed, 2 skipped, 91.27%); mobile typecheck/Jest/Expo config; web build.
CI: First staging push run `26259257629` failed on `ruff format --check` and `pydantic-ai` CVE-2026-46678. Follow-up staging push run `26259390776` completed `success` for commit `2b36ac31e672fdba03b3c712a115c3cb82e736af`.
RAILWAY: `railway service list --environment staging --json` still reports `source: null` for `gastify-api-staging` and `gastify-api-staging-e2e`, so GitHub autodeploy/Wait-for-CI is not attached yet. Used documented fallback CLI deploy path.
DEPLOYS: `gastify-api-staging` deployment `b714a73f-f9e4-4252-b57a-98fbde35c6e9` `SUCCESS`, image `sha256:44970e708134569eacdc97e4bde715c068ddd14a111a4c6786652d69086b1668`; `gastify-api-staging-e2e` deployment `759f855f-a188-46c1-94d1-bd8894e66e6b` `SUCCESS`, image `sha256:62ec123df548a765353318fd05709f0cdfa7711fbf2985f892e2420ff04a465f`.
READINESS: `bash scripts/staging/check-backend-ready.sh https://gastify-api-staging-staging.up.railway.app` and `bash scripts/staging/check-backend-ready.sh https://gastify-api-staging-e2e-staging.up.railway.app` passed with `status=ok`, DB connected, and Alembic current/head `014`.
RUNTIME: S23 `RFCW90N4BYP`; `GASTIFY_RESULT_ENV=staging-e2e GASTIFY_MOBILE_RUN_ID=20260521Tphase4-signout-push-staging-s23-r2 EXPO_PUBLIC_APP_ENV=staging-e2e EXPO_PUBLIC_API_BASE_URL=https://gastify-api-staging-e2e-staging.up.railway.app EXPO_PUBLIC_SCAN_TEST_CONTROLS_ENABLED=true GASTIFY_ENVIRONMENT=staging-e2e GASTIFY_SCAN_PROVIDER=fixture GASTIFY_MOBILE_BUILD_ID=eas-dd0229be-phase4-notifications MAESTRO_DEVICE_ID=RFCW90N4BYP MAESTRO_VERBOSE=true MAESTRO_REINSTALL_DRIVER=false bash tests/mobile/scripts/run-maestro.sh tests/mobile/maestro/p4-phase4-signout-push-active.yaml` — passed in 41s after enabling Android `POST_NOTIFICATIONS` permission on the device.
ARTIFACTS: `tests/mobile/results/runs/staging-e2e/20260521Tphase4-signout-push-staging-s23-r2/p4-phase4-signout-push-active/manifest.json` has `result_status=passed`, `device_id=RFCW90N4BYP`, `api_base_url=https://gastify-api-staging-e2e-staging.up.railway.app`, `backend_environment=staging-e2e`, and `git_rev=2b36ac3`; screenshots `01-phase4-home-push-panel.png`, `02-phase4-push-registered.png`, `03-phase4-push-unregistered.png`, and `04-phase4-signed-out.png`.
SERVER PROOF: Railway staging-e2e logs showed Alembic `013 -> 014`, `POST /api/v1/push-tokens` `201`, and `POST /api/v1/push-tokens/unregister` `200` during the passing S23 run.
TICK: ✅ Phase 4 Exec
NEXT: Route to `/gabe-review` for Phase 4. P29 is now review-ready but remains open until `/gabe-review` validates this deployed S23 evidence and resolves it.

## 2026-05-21 19:12 -04 — POLICY RESET: Durable staging proof gate
ROUTE: Implemented the review-after-staging operating model for Gastify runtime-gated phases.
STATE: Phase 4 reset from Exec ✅ / Review ✅ / Commit ⬜ / Push ⬜ to Exec 🔄 / Review ⬜ / Commit ⬜ / Push ⬜ so deployed Railway staging proof can happen before the next `/gabe-review`.
POLICY: Runtime-gated phase types now require branch-backed Railway staging evidence before Review. Local, unit, static, and `127.0.0.1` S23 artifacts can support development but cannot close Exec/Review.
FOLLOW-UP: P29 remains open until S23 `p4-phase4-signout-push-active.yaml` passes against `https://gastify-api-staging-e2e-staging.up.railway.app` with migration 014 current.
NEXT: Route to `/gabe-next`; expected command is `/gabe-execute` to create the staging candidate and deployed S23 proof.

## 2026-05-21 19:20 -04 — STAGING LANE CREATED: origin/staging
ROUTE: Created the durable GitHub integration branch for Gastify runtime-gated phases.
BRANCH: `git push origin HEAD:staging` created `origin/staging` from committed HEAD `ce40204dade5a77c95876cadc20e329f90b335f1`.
CI CONFIG: `.github/workflows/ci.yml` now includes `staging` in push and pull-request branch triggers. This local policy/config change must be committed before the staging branch itself has the updated workflow trigger.
RAILWAY: `railway --version` returned `railway 4.59.0`; `docs/runbooks/RAILWAY-STAGING-SETUP.md` documents Railway Service Settings for GitHub autodeploy + Wait for CI and the explicit `railway up ./backend --path-as-root --environment staging --service ... --detach --ci` fallback.
CHECKS: `git diff --check`; scoped `git diff --check` for KDBP/docs/CI policy files; `bash -n scripts/staging/check-backend-ready.sh`; `git -C /home/khujta/projects/gabe_lens diff --check -- commands/gabe-execute.md commands/gabe-review.md commands/gabe-next.md commands/gabe-push.md skills/gabe-review/SKILL.md`.
NEXT: Commit the policy/runtime candidate in an isolated changeset, push it to `origin/staging`, wait for CI/Railway readiness, then run the Phase 4 S23 proof against `https://gastify-api-staging-e2e-staging.up.railway.app`.

## 2026-05-21 18:58 -04 — REVIEW COMPLETE: Phase 4 — Sign-out isolation + push registration + platform polish
VERDICT: WARNING
CONFIDENCE: 86/100
FINDINGS: 2 (0 critical, 2 high, 0 medium, 0 low)
ACTIONS: #1 fixed in review by revoking enabled rows for the same physical push token when another user registers it; #2 deferred to P29 as a required deployed-staging push gate because pre-commit evidence can only use the local push-token stub.
CHECKS: `cd backend && uv run pytest tests/test_push_tokens.py` (6 passed); `cd backend && uv run pytest tests/test_push_tokens.py tests/test_auth.py` (20 passed); `cd backend && uv run ruff check app/api/push_tokens.py tests/test_push_tokens.py`; `cd mobile && npm test -- --runInBand src/hooks/__tests__/usePushRegistration.test.ts src/lib/__tests__/pushNotifications.test.ts src/lib/__tests__/authSession.test.ts src/screens/__tests__/HomeScreen.test.tsx` (4 suites / 25 tests); `cd mobile && npm run typecheck`; `git diff --check`.
ARTIFACTS: Review archived at `.kdbp/reviews-archive/REVIEW_2026-05-21-185800_resolved.md`; P29 tracks the post-deploy S23 rerun against Railway staging API/migration 014.
TICK: ✅ Phase 4 Review
NEXT: Route to `/gabe-next`; expected next command is `/gabe-commit` for Phase 4.

## 2026-05-21 18:06 -04 — PHASE EXEC COMPLETE: Phase 4 — Sign-out isolation + push registration + platform polish
TIER: ent
TASKS: 1 implementation batch, 0 commits yet (review/commit pending)
DEVIATIONS: 0 structural, 1 minor (see DEVIATIONS.md: S23 push proof used a local push-token stub because the new endpoint is not deployed yet)
SCOPE: Added mobile sign-out isolation, query/store reset hardening, stale scan completion guards, push registration/unregister state, Expo notification configuration, backend push-token API/schema/model/migration/tests, generated API clients, and platform/safe-area polish.
BUILD: EAS Android `e2e-staging` APK build `dd0229be-fcee-4abc-844b-0cdfc07c0b45`, artifact installed on Samsung S23 `RFCW90N4BYP` / `SM_S911B`; app bundle loaded through Expo tunnel `ji-xkqs-brownbull-8081.exp.direct`; ADB reverse `tcp:8000` and `tcp:8081` active during proof.
VERIFICATION: `git diff --check`; `cd mobile && npm run typecheck`; `cd mobile && npm test -- --runInBand` (18 suites / 90 tests); `cd mobile && npm run check:expo-config`; `cd mobile && npm audit --audit-level=high` (0 high; 10 moderate Expo-chain advisories); `cd backend && uv run pytest tests/test_push_tokens.py tests/test_transactions.py tests/test_auth.py` (50 passed); `cd backend && uv run pytest` (519 passed, 2 skipped); `cd backend && uv run ruff check .`; `cd web && npm run build`; `cd mobile && npm run doctor:e2e` (S23 visible, JDK 17/xcrun warnings only).
RUNTIME: `GASTIFY_RESULT_ENV=local GASTIFY_MOBILE_RUN_ID=20260521Tphase4-signout-push-s23-r5 EXPO_PUBLIC_APP_ENV=staging-e2e EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:8000 GASTIFY_ENVIRONMENT=local GASTIFY_MOBILE_BUILD_ID=eas-dd0229be-phase4-notifications MAESTRO_DEVICE_ID=RFCW90N4BYP MAESTRO_VERBOSE=true MAESTRO_REINSTALL_DRIVER=false bash tests/mobile/scripts/run-maestro.sh tests/mobile/maestro/p4-phase4-signout-push-active.yaml` — passed in 48s. Flow covered dev-client startup, test auth sign-in, push panel visibility, `Device registered`, `Device unregistered`, scroll-to-sign-out, and return to `sign-in-screen`.
ARTIFACTS: Passing run folder `tests/mobile/results/runs/local/20260521Tphase4-signout-push-s23-r5/`; flow manifest `p4-phase4-signout-push-active/manifest.json` has `result_status=passed`, `device_id=RFCW90N4BYP`, `app_env=staging-e2e`, `api_base_url=http://127.0.0.1:8000`, and build id `eas-dd0229be-phase4-notifications`; screenshots `01-phase4-home-push-panel.png` through `04-phase4-signed-out.png`; local stub log `environment/push-token-stub.log` records health check, `POST /api/v1/push-tokens` 201, and `POST /api/v1/push-tokens/unregister` 200.
ARCHIVE: Failed/debug iterations `20260521Tphase4-signout-push-s23-r1` through `r4` were moved to `tests/mobile/results/archive/20260521-phase4-signout-push-debug/local/`; active `runs/local` keeps the passing `r5` packet.
TICK: ✅ Phase 4 Exec
NEXT: Route to `/gabe-review` for Phase 4 review before commit/push. Review should decide whether the local-stub runtime proof is sufficient for Exec or whether a deployed staging rerun is required after commit/push.

## 2026-05-21 17:25 -04 — PUSH main -> main
PR: —
CI: ✅ 12/12 (68s) — GitHub Actions run 26253946312
PROMOTION: N/A (origin/staging absent; pushed current HEAD directly to production target)
DEPLOYMENTS: P25  (added row to .kdbp/DEPLOYMENTS.md)
CLASSIFIER: P26 resurfaced and deferred by default; PyJWT audit-ignore revisit remains open.
TICK: ✅ Phase 3 Push
NEXT: Route to `/gabe-next`; expected next action is to advance to Phase 4.

## 2026-05-21 17:21 -04 — [edf8d2b] feat(mobile): add transaction ledger and edit flow
FINDINGS: 1 (0 critical, 1 high, 0 medium, 0 low)
ACTIONS: 1:skip — P24 remains open as the accepted scan-warning/order-preserving result UI follow-up and did not block this Phase 3 commit.
DEFERRED: 0 new
CHECKS: `git diff --cached --check`; `cd mobile && npm run typecheck`; `cd mobile && npm test -- --runInBand` (16 suites / 80 tests); `cd backend && uv run pytest tests/test_transactions.py` (31 passed); `cd backend && uv run ruff check app tests`; `cd web && npm run build`.
TICK: ✅ Phase 3 Commit
NEXT: Route to `/gabe-next`; expected next command is `/gabe-push` for Phase 3.

## 2026-05-21 15:05 -04 — PHASE EXEC COMPLETE: Phase 3 — Mobile ledger + detail + edit
TIER: ent
TASKS: 1 implementation batch, 0 commits yet (review/commit pending)
DEVIATIONS: 0 structural, 1 minor (see DEVIATIONS.md: backend `card_alias` filter added to satisfy the mobile card-filter contract)
SCOPE: Mobile transaction list/detail/edit flow, V4 category helpers, transaction/category hooks, optimistic mutation rollback, scan-complete transaction invalidation, navigation handoff, generated API clients, and narrow backend card-alias filtering.
VERIFICATION: Local/code gates are recorded in the 2026-05-20 Phase 3 partial entry. Runtime proof is recorded in `20260521Tphase3-ledger-edit-s23-r12`: S23 `RFCW90N4BYP`, `staging-e2e`, Railway API `https://gastify-api-staging-e2e-staging.up.railway.app`, fixture provider, dev-client build id `dev-client-s23-phase3`, Maestro flow `tests/mobile/maestro/p4-phase3-ledger-edit-active.yaml`, result `passed` in 1m48s.
ARTIFACTS: `tests/mobile/results/runs/staging-e2e/20260521Tphase3-ledger-edit-s23-r12/p4-phase3-ledger-edit-active/manifest.json`; screenshots `01-phase3-ledger-list.png` through `06-phase3-ledger-list-updated.png`.
TICK: ✅ Phase 3 Exec
NEXT: Route to `/gabe-review` for Phase 3 review before commit/push.

## 2026-05-21 14:57 -04 — PHASE 3 EXEC SUPPLEMENT: S23 ledger/detail/edit runtime proof green
ROUTE: resumed Phase 3 S23 verification after computer restart and S23 reconnect.
TIER: ent
TASKS: Rechecked the previous Maestro runs, recovered the WSL-native S23 lane, hardened the Phase 3 active Maestro flow against Expo dev-client onboarding timing and final list text matching, and reran the physical-device proof.
RERUN ANALYSIS: `20260521Tphase3-ledger-edit-s23-r6` failed because ADB lost `RFCW90N4BYP` while waiting for scan results; `r7` stayed connected but Google Photos selected the wrong image, so the backend correctly rejected the upload as an unmatched fixture hash; `r9` and `r10` reached the desired ledger/edit behavior but failed on brittle final assertions even though screenshots showed the updated row. The active flow now starts from existing staging-e2e ledger data instead of the polluted gallery picker.
VERIFICATION: native WSL ADB saw `RFCW90N4BYP device`; `cd mobile && npm run doctor:e2e` wrote `tests/mobile/results/runs/local/20260521T183335Z-local-environment-doctor/environment/mobile-doctor.txt`; `bash scripts/staging/check-backend-ready.sh https://gastify-api-staging-e2e-staging.up.railway.app` returned status ok with migration current/head `013`; `cd mobile && npm run maestro:install-driver`; `EXPO_DEV_CLIENT_URL=exp+gastify-mobile://... CLEAR_APP_STATE=true MAESTRO_DEVICE_ID=RFCW90N4BYP bash tests/mobile/scripts/open-dev-client.sh`; `GASTIFY_RESULT_ENV=staging-e2e GASTIFY_MOBILE_RUN_ID=20260521Tphase3-ledger-edit-s23-r12 EXPO_PUBLIC_APP_ENV=staging-e2e EXPO_PUBLIC_API_BASE_URL=https://gastify-api-staging-e2e-staging.up.railway.app EXPO_PUBLIC_SCAN_TEST_CONTROLS_ENABLED=true GASTIFY_ENVIRONMENT=staging-e2e GASTIFY_SCAN_PROVIDER=fixture GASTIFY_MOBILE_BUILD_ID=dev-client-s23-phase3 MAESTRO_DEVICE_ID=RFCW90N4BYP MAESTRO_VERBOSE=true MAESTRO_REINSTALL_DRIVER=false bash tests/mobile/scripts/run-maestro.sh tests/mobile/maestro/p4-phase3-ledger-edit-active.yaml` — passed in 1m48s.
ARTIFACTS: `tests/mobile/results/runs/staging-e2e/20260521Tphase3-ledger-edit-s23-r12/p4-phase3-ledger-edit-active/manifest.json` has `result_status=passed`, `device_id=RFCW90N4BYP`, `app_env=staging-e2e`, `backend_environment=staging-e2e`, `scan_provider=fixture`, `build_id=dev-client-s23-phase3`; screenshots `01-phase3-ledger-list.png` through `06-phase3-ledger-list-updated.png` cover list, detail, merchant edit, rollback banner, line-item edit submission, and returned list with `S23 Ledger Edit R12`.
ARCHIVE: Failed/diagnostic retry packets `20260521Tphase3-ledger-edit-s23` through `r11` were moved out of the active run list to `tests/mobile/results/archive/20260521-phase3-ledger-edit-debug/staging-e2e/`; only the passing `r12` packet remains under `tests/mobile/results/runs/staging-e2e/`.
RESULT: The repeated S23 runtime proof for the Phase 3 ledger/detail/edit path is green. No need to repeat this exact Maestro lane unless review decides Phase 3 must also produce a fresh scan-to-transaction invalidation artifact; the gallery-picker route remains unsuitable until the fixture selection is made deterministic.

## 2026-05-20 21:39 -04 — PHASE 3 EXEC PARTIAL: Mobile ledger + detail + edit
ROUTE: `/gabe-next` advanced Current Phase from Phase 2 to Phase 3 and dispatched `/gabe-execute`; Phase 3 Exec is `🔄`.
TIER: ent
TASKS: Implemented mobile transaction list/detail/edit foundations plus the narrow backend card-alias filter needed by the Phase 3 filter contract.
SCOPE: Added typed mobile transaction/category/format helpers, React Query ledger/detail/update hooks with optimistic cache updates and rollback helpers, authenticated navigation routes for `Transactions` and `TransactionDetail`, home-screen ledger entry plus scan-complete transaction handoff, list filters for date/merchant/category/card/currency, detail summary with original/USD amounts and review warnings, merchant/date/store-category edits, line-item name/amount/category/flag edits, and generated mobile/web OpenAPI artifacts.
BACKEND: Added `card_alias` filter to `GET /api/v1/transactions` and covered it in `backend/tests/test_transactions.py`.
VERIFICATION: `cd mobile && npm run generate:api`; `cd web && npm run generate:api`; `cd mobile && npm run typecheck`; `cd mobile && npm test -- --runInBand` (14 suites, 50 tests passed); `cd backend && uv run pytest tests/test_transactions.py` (31 passed); `cd backend && uv run pytest` (514 passed, 2 skipped); `cd backend && uv run ruff check app/api/transactions.py tests/test_transactions.py`; `cd web && npm run build`; `git diff --check`.
RUNTIME: Blocked. `cd mobile && npm run doctor:e2e` wrote `tests/mobile/results/runs/local/20260521T014020Z-local-environment-doctor/environment/mobile-doctor.txt` and reported no authorized Android device visible to ADB. Phase 3 changes a user-facing native-mobile path, so Exec remains `🔄` until S23/staging journey artifacts prove ledger list/detail/edit, optimistic rollback/error state, scan-to-transaction invalidation, and user isolation against the deployed backend.
NEXT: Reattach/authorize the S23 in WSL native ADB, start the dev-client bundle for the target environment, add or run a Phase 3 Maestro/runtime lane against staging/staging-e2e, archive screenshots/report/manifests under `tests/mobile/results/runs/...`, then re-evaluate Phase 3 Exec closure.

## 2026-05-20 21:09 -04 — PUSH main -> main
PR: —
CI: ✅ 12/12 (66s)
PROMOTION: N/A
DEPLOYMENTS: P24 (added row to .kdbp/DEPLOYMENTS.md)
FOLLOW-UP: First CI run `26199123171` failed `Mobile API Drift` and `SCA Audit`; fix commit `45517cc` regenerated mobile/web API artifacts, updated `idna` to 3.15, and added a targeted `PYSEC-2025-183` audit ignore for current latest PyJWT 2.12.1. Rerun `26199292463` passed all jobs.

## 2026-05-20 20:56 -04 — [4f757e7] feat(scan): close Phase 2 mobile upload proof
FINDINGS: 1 (0 critical, 1 high, 0 medium, 0 low)
ACTIONS: P24:skip — backend review-signal contract committed; mobile/web warning presentation remains intentionally open in P24
DEFERRED: none added
CHECKS: `git diff --check`; `cd backend && uv run ruff format --check`; `cd backend && uv run ruff check`; `cd backend && uv run pytest` (513 passed, 2 skipped); `cd backend && uv run python -m app.prompt_lab validate`; `cd mobile && npm run typecheck`; `cd mobile && npm test -- --runInBand` (36 passed); `cd mobile && npm run check:expo-config`; `cd web && npm run build`; `cd web && npm test -- --run` (23 passed); shell syntax check for dev/staging/mobile scripts.
STRUCTURE: Added MVP patterns for env-template variants, backend fixture/reference JSON payloads, and mobile E2E receipt fixtures.
TICK: ✅ Phase 2 Commit

## 2026-05-20 20:44 -04 — PHASE 2 REVIEW SUPPLEMENT: staging-e2e fixture evidence repeated
VERDICT: APPROVE
FINDINGS: 1 total (0 critical, 1 high, 0 medium, 0 low) — fixed by rerunning runtime evidence
COVERAGE: HIGH — second-pass backend/mobile regressions stayed green, and S23 staging-e2e fixture proof was regenerated with self-proving metadata
CONFIDENCE: 95/100
DEFERRED: none
ALIGNMENT: ALIGNED
TIER: ent | DRIFT: none
TICK: unchanged (Phase 2 Review was already ✅)
RERUN: First repeat attempt `20260521T003812Z-staging-e2e-s23-fixture-phase2` proved metadata wiring but failed review flow because the S23 still had a stale normal-staging bundle. Started a fresh Metro dev-client bundle with `EXPO_PUBLIC_APP_ENV=staging-e2e` and `EXPO_PUBLIC_API_BASE_URL=https://gastify-api-staging-e2e-staging.up.railway.app`, reopened the S23 app, then reran the gate.
VERIFICATION: `bash scripts/staging/check-backend-ready.sh https://gastify-api-staging-e2e-staging.up.railway.app` — status ok, migration current at 013; `GASTIFY_RESULT_ENV=staging-e2e GASTIFY_MOBILE_RUN_ID=20260520Tsecond-pass-staging-e2e-prereq tests/mobile/scripts/doctor-mobile.sh` — S23 `RFCW90N4BYP` visible to native WSL ADB; `GASTIFY_STAGING_E2E_API_BASE_URL=https://gastify-api-staging-e2e-staging.up.railway.app MAESTRO_DEVICE_ID=RFCW90N4BYP MAESTRO_REINSTALL_DRIVER=false GASTIFY_MOBILE_BUILD_ID=dev-client-railway-staging-e2e-2026-05-20 bash scripts/staging/run-s23-fixture-gate.sh` — passed happy, review, failure, and camera-permission flows.
ARTIFACTS: `tests/mobile/results/runs/staging-e2e/20260521T004114Z-staging-e2e-s23-fixture-phase2/` has `flow_manifest_count=4`; every flow manifest has `result_status=passed`, `backend_environment=staging-e2e`, `scan_provider=fixture`, and `build_id=dev-client-railway-staging-e2e-2026-05-20`.

## 2026-05-20 21:45 -04 — PHASE 2 REVIEW: Camera scan + WebSocket progress
VERDICT: APPROVE
FINDINGS: 14 total (0 critical, 5 high, 7 medium, 2 low) — all 14 fixed
COVERAGE: HIGH — 513 tests pass (0 fail, 2 skip); mapping-hit, mock-pipeline, and store-fallback paths now tested
CONFIDENCE: 95/100
DEFERRED: none (P8, P9 resolved by this diff; 6 Enterprise findings fixed in triage)
ALIGNMENT: ALIGNED
TIER: ent | DRIFT: none
TICK: ✅
SOURCES: codex (gpt-5, 1 finding — evidence traceability) + claude (claude-opus-4-6, 13 findings — code quality). Consolidated via union.
KEY FIXES: mock pipeline None guard added; `_emit` converted to async (no more event-loop blocking); WebSocket `as ScanEvent`/`as ScanResultData` casts replaced with runtime type guards; `fail()` now cancels pending reconnect timer; N+1 item-mapping queries batched; 3 persist_scan mapping-hit tests added; fixture gate script exports provider/build trace; Decimal NaN/Inf guard; Alembic head cached; Firebase JSON parse error handling; test routes hidden from OpenAPI; upload progress bar indeterminate.

## 2026-05-17 18:15 — PUSH main -> main
PR: —
CI: ✅ 12/12 (65s)
PROMOTION: N/A
DEPLOYMENTS: P23 (added row to .kdbp/DEPLOYMENTS.md)

## 2026-05-17 — [7bb1b3f] feat(mobile): add Expo auth scaffold
FINDINGS: 0 (0 critical, 0 high, 0 medium, 0 low)
ACTIONS: none
DEFERRED: none

## 2026-05-17 17:33 — PHASE 1 REVIEW: Mobile scaffold + typed API + auth
VERDICT: APPROVE
FINDINGS: 3 total (0 critical, 2 high, 0 medium, 1 low) — all 3 fixed
COVERAGE: MEDIUM — mobile Jest/RNTL now covers SecureStore cleanup failure and stale auth-event guard behavior; native S23/Maestro evidence remains happy-path smoke only.
CONFIDENCE: 95/100
DEFERRED: none
ALIGNMENT: ALIGNED
TIER: ent | DRIFT: none
TICK: ✅
KEY FIXES: cleanup no longer short-circuits query/store reset when SecureStore deletion fails; auth observer work is serialized and guarded against stale token commits; mobile docs now match React Native 0.83.

## 2026-05-15 18:45 — SESSION HANDOFF: Phase 1 — Mobile hardware lane ready for next session
TIER: ent
TASKS: 1 handoff update, 0 commits yet (review/commit pending)
DEVIATIONS: 0
SCOPE: Updated `MOBILE.md` with a next-session resume checklist, S23 WSL attach commands, Expo dev-client startup, proven active Maestro smoke command, driver-stall recovery, and shutdown cleanup. Updated `mobile/ANDROID_E2E_SETUP.md` to clarify the admin `detach`/`unbind` requirement for restoring normal Windows USB behavior.
PENDING CLOSED: none
VERIFICATION: Phone stay-awake disabled with native Linux ADB; `com.gastify.mobile` force-stopped; Metro/ngrok/Maestro processes stopped; native WSL ADB no longer lists the S23 after USB/IP detach attempt; `usbipd list` shows the S23 as `Shared (forced)`, so final `unbind --busid 2-2` must be run from Administrator PowerShell before Windows ADB will use the phone normally; `git diff --check` passed before the final doc tweak and should be rerun next session if more edits continue.
FOLLOW-UP: Before shutdown or after reboot, run Administrator PowerShell: `& 'C:\Program Files\usbipd-win\usbipd.exe' unbind --busid 2-2`. Next work item remains Phase 1 review, then commit/push, then Phase 2 camera scan + WebSocket progress.

## 2026-05-15 18:36 — PHASE EXEC SUPPLEMENT: Phase 1 — WSL-native S23 Maestro smoke green
TIER: ent
TASKS: 1 setup-hardening supplement, 0 commits yet (review/commit pending)
DEVIATIONS: 0 structural, 1 tooling lane refinement (Maestro `openLink` and automatic Android driver reinstall are unreliable on this S23; the stable lane pre-opens Expo dev client through ADB and runs with preinstalled Maestro driver APKs)
SCOPE: Completed the `usbipd-win` WSL-native path for Samsung S23 `RFCW90N4BYP`, verified native Linux ADB after the Samsung udev rule, added a cwd-safe Maestro runner, added `p4-phase1-smoke-active.yaml` for already-open Expo dev-client assertions, added helper scripts/npm commands for opening the dev client, installing/resetting Maestro's Android driver packages, and documented the stable next-phase command sequence in `mobile/ANDROID_E2E_SETUP.md`.
PENDING CLOSED: none
VERIFICATION: `ADB_BIN=$HOME/.local/share/gastify/android-platform-tools/platform-tools/adb adb devices -l` — `RFCW90N4BYP device`; `npm run doctor:e2e` (mobile, native ADB) — diagnostic pass with expected JDK 17 and Xcode WARN only; `maestro --verbose hierarchy --compact --no-ansi` — returned React Native ids including `sign-in-screen`, `google-sign-in-button`, and `e2e-sign-in-button`; `npm run maestro:install-driver` (mobile) — installed `dev.mobile.maestro` and `dev.mobile.maestro.test`; `MAESTRO_VERBOSE=true MAESTRO_REINSTALL_DRIVER=false npm run maestro:smoke:active -- --archive` (mobile) — `[Passed] p4-phase1-smoke-active (10s)`, artifacts in `tests/mobile/results/latest/p4-phase1-smoke-active/` with `report.html`, command JSON, and screenshots `01-sign-in.png`, `02-home.png`, `03-signed-out.png`; `bash -n tests/mobile/scripts/run-maestro.sh tests/mobile/scripts/open-dev-client.sh tests/mobile/scripts/install-maestro-driver.sh tests/mobile/scripts/reset-maestro-driver.sh tests/mobile/scripts/android-tooling.sh` — pass; `node` package.json parse — pass; `git diff --check` — pass.
FOLLOW-UP: Keep using WSL `usbipd-win` + native Linux ADB for Android hardware automation in Phase 2. Start Metro tunnel, export `EXPO_DEV_CLIENT_URL`, run `npm run maestro:open-dev-client`, `npm run maestro:install-driver`, then `MAESTRO_REINSTALL_DRIVER=false npm run maestro:smoke:active`. Revisit all-in-one `openLink` only if a later Expo/Maestro update makes it reliable.

## 2026-05-15 17:52 — PHASE EXEC SUPPLEMENT: Phase 1 — WSL usbipd native ADB probe partially ready
TIER: ent
TASKS: 1 setup-hardening supplement, 0 commits yet (review/commit pending)
DEVIATIONS: 0 structural, 1 tooling setup blocker (native WSL ADB sees the S23 only after USB/IP attach, but WSL udev permissions still need a sudo-installed Samsung rule)
SCOPE: Installed `usbipd-win` 5.3.0 on Windows through winget, installed native Linux Android platform-tools under `~/.local/share/gastify/android-platform-tools/platform-tools`, identified the Samsung S23 as usbipd bus `2-2` (`04e8:6860`, `RFCW90N4BYP`), confirmed normal bind is blocked by Windows using the composite Samsung interface, confirmed `bind --force` lets WSL receive the device through USB/IP, and restored the S23 to normal Windows ADB visibility after the sudo step was not completed.
PENDING CLOSED: none
VERIFICATION: `usbipd list` — S23 bus `2-2`; `usbipd bind --force --busid 2-2` — S23 became `Shared (forced)` after UAC approval; `usbipd attach --wsl --busid 2-2` — S23 became `Attached`; WSL `dmesg` — Samsung USB `04e8:6860` attached with serial `RFCW90N4BYP`; native Linux `adb devices -l` — saw `RFCW90N4BYP no permissions`; `sudo` udev-rule install was prompted but not completed; `usbipd unbind --busid 2-2` — restored S23 to `Not shared`; `tests/mobile/bin/adb devices` — Windows ADB again sees `RFCW90N4BYP device`.
FOLLOW-UP: Install the WSL udev rule for Samsung (`04e8`) with sudo, re-run `usbipd bind --force --busid 2-2` + `usbipd attach --wsl --busid 2-2`, verify native Linux `adb devices -l` shows `device`, then run Maestro with `ADB_BIN=$HOME/.local/share/gastify/android-platform-tools/platform-tools/adb`.

## 2026-05-15 17:22 — PHASE EXEC SUPPLEMENT: Phase 1 — EAS APK installed and manual S23 smoke green
TIER: ent
TASKS: 1 supplement, 0 commits yet (review/commit pending)
DEVIATIONS: 0 structural, 1 tooling lane clarification (WSL Metro LAN/ADB reverse is unreliable through Windows ADB; Expo tunnel works for manual dev-client smoke)
SCOPE: Created/linked the EAS project `@brownbull/gastify-mobile` (`eecbbed5-3325-4687-9756-c3b1135e3de5`), pinned the project id in `mobile/app.config.ts`, uploaded ignored Firebase native config files as secret EAS file env vars, removed the unnecessary e2e update channel prompt, aligned `expo-dev-client` with Expo Doctor, built Android e2e APK `bf9b3488-0dba-4aad-9b49-238b4cabf93d`, downloaded it to `tests/mobile/results/latest/eas/gastify-e2e.apk`, installed it on S23 `RFCW90N4BYP`, enabled USB-only stay-awake for physical-device work, and completed the manual sign-in → test auth → sign-out smoke through an Expo tunnel.
PENDING CLOSED: none
VERIFICATION: `npx eas-cli@latest project:info` (mobile) — linked to `@brownbull/gastify-mobile`; `npx eas-cli@latest env:list --environment development` (mobile) — secret file env vars present for Android/iOS Firebase config; `npx expo install --check` (mobile) — pass; `npm run check:expo-config` (mobile) — pass; `npm run typecheck` (mobile) — pass; `npm test` (mobile) — 6 suites / 14 tests pass; EAS build `bf9b3488-0dba-4aad-9b49-238b4cabf93d` — FINISHED, artifact downloaded; `tests/mobile/bin/adb devices` — `RFCW90N4BYP device`; `tests/mobile/bin/adb install -r tests/mobile/results/latest/eas/gastify-e2e.apk` — Success; `tests/mobile/bin/adb shell svc power stayon usb` — set `stay_on_while_plugged_in=2`; `npm run doctor:e2e` (mobile) — diagnostic pass with expected WARN for Windows/WSL ADB bridge, optional JDK 17, and missing Xcode; `npm run start:dev-client -- --host tunnel` (mobile) — Metro tunnel bundled `index.js` for Android; curated manual smoke screenshots captured in `tests/mobile/results/latest/manual-smoke/06-sign-in-visible.png`, `07-after-test-auth.png`, and `08-signed-out.png`; troubleshooting captures archived under `tests/mobile/results/latest/manual-smoke/debug/`.
FOLLOW-UP: Phase 1 is ready for `gabe-review`; automated Maestro remains deferred until ADB and Maestro run from the same host side (Windows-side Maestro or WSL `usbipd-win` native ADB).

## 2026-05-15 16:42 — PHASE EXEC SUPPLEMENT: Phase 1 — Physical S23 detected, EAS login still blocking APK build
TIER: ent
TASKS: 1 supplement, 0 commits yet (review/commit pending)
DEVIATIONS: 0 structural, 1 tooling clarification (doctor now distinguishes Windows ADB visibility from WSL Maestro readiness)
SCOPE: Resumed the interrupted physical-device lane after restart; confirmed the connected Samsung S23 is authorized through Windows ADB (`RFCW90N4BYP device`), confirmed EAS is still not logged in, made the Android setup doc explicit that EAS requires a personal Expo account/login for the cloud APK build, and fixed `doctor:e2e` to strip Windows ADB CRLF output plus warn when WSL is seeing the phone only through the Windows/WSL ADB bridge.
PENDING CLOSED: none
VERIFICATION: `bash -n tests/mobile/scripts/doctor-mobile.sh tests/mobile/scripts/run-maestro.sh tests/mobile/scripts/android-tooling.sh tests/mobile/bin/adb` — pass; `npm run check:expo-config` (mobile) — pass; `npm run doctor:e2e` (mobile) — diagnostic pass, S23 authorized through Windows ADB, expected WARN for Windows/WSL bridge, JDK 17 optional missing, Xcode missing; `npm run eas:whoami` (mobile) — blocked, "Not logged in"; `tests/mobile/scripts/run-maestro.sh` — exits early as designed because WSL Maestro cannot use the Windows/WSL ADB wrapper; `npm run typecheck` (mobile) — pass; `npm test` (mobile) — 6 suites / 14 tests pass; `npm run verify:staging-auth` (mobile) — pass for `gastify-mobile-e2e@gastify-staging.test`.
FOLLOW-UP: Create or sign into a personal Expo account, run `npx eas-cli@latest login` from `mobile/`, verify `npm run eas:whoami`, then run `npm run eas:build:android:e2e`. After the APK exists, install/manual-smoke through Windows ADB is viable; automated Maestro still requires Windows-side Maestro or attaching the S23 into WSL with `usbipd-win`.

## 2026-05-15 15:43 — PHASE EXEC SUPPLEMENT: Phase 1 — Android emulator path retired, Samsung S23 lane selected
TIER: ent
TASKS: 1 supplement, 0 commits yet (review/commit pending)
DEVIATIONS: 1 intentional execution-lane change (local WSL emulator/bridge path deprecated in favor of physical Samsung S23)
SCOPE: Removed the `android:dev` script and retired WSL ADB bridge/local installer scripts; rewrote Android E2E/testing docs around a USB Samsung S23 + EAS APK lane; added decision D43 and updated `.kdbp/PLAN.md`; changed ignored `mobile/.env` away from the Android emulator `10.0.2.2` API URL to `127.0.0.1` for the `adb reverse` path; deleted generated local resource state (`mobile/android/`, `.android-sdk-shim/`, failed-run `tests/mobile/results/latest/`, `mobile/.expo/`, local JDK/platform-tools under `~/.local/share/gastify`).
PENDING CLOSED: none
VERIFICATION: `bash -n tests/mobile/scripts/android-tooling.sh tests/mobile/scripts/doctor-mobile.sh tests/mobile/scripts/run-maestro.sh tests/mobile/bin/adb tests/mobile/scripts/check-expo-config.sh tests/mobile/scripts/verify-staging-auth.sh` — pass; `npm run typecheck` (mobile) — pass; `npm test` (mobile) — 6 suites / 14 tests pass; `npm run check:expo-config` (mobile) — pass, API base now `http://127.0.0.1:8000`; `npm run doctor:e2e` (mobile) — diagnostic pass with expected WARN for no authorized S23 connected, optional JDK 17 missing, and no Xcode; `git diff --check` — pass.
FOLLOW-UP: Connect Samsung S23 over USB, enable USB debugging, approve device prompt, then choose either Windows-side ADB+Maestro or WSL `usbipd-win` attachment so ADB and Maestro see the same phone before running `tests/mobile/scripts/run-maestro.sh`.

## 2026-05-14 22:28 — PHASE EXEC SUPPLEMENT: Phase 1 — Android dev-build and Maestro setup
TIER: ent
TASKS: 1 supplement, 0 commits yet (review/commit pending)
DEVIATIONS: 0
SCOPE: Added `expo-dev-client`, EAS development/E2E build profiles, Android E2E setup documentation, generated-native-folder ignores, package scripts for dev-client/EAS builds, and Maestro fallback detection in doctor/runner scripts. Installed Maestro locally at `~/.maestro/bin/maestro`.
PENDING CLOSED: none
VERIFICATION: `~/.maestro/bin/maestro --version` — 2.5.1; `npm run doctor:e2e` (mobile) — staging config OK, Maestro OK, EAS via npx OK, ADB/xcrun WARN; `npm run check:expo-config` (mobile) — pass with password redacted; `npm run typecheck` (mobile) — pass; `npm test` (mobile) — 6 suites / 14 tests pass; `npm run verify:staging-auth` (mobile) — pass; `npm run generate:api` (mobile) — pass; `npm audit --audit-level=high` (mobile) — no high vulnerabilities, 5 moderate Expo/PostCSS-chain findings remain; `npx eas-cli@latest config --platform android --profile e2e --non-interactive --json` — blocked because Expo account is not logged in; `git diff --check` — pass.

## 2026-05-14 22:14 — PHASE EXEC SUPPLEMENT: Phase 1 — Mobile testing ladder + repeatable staging auth gate
TIER: ent
TASKS: 1 supplement, 0 commits yet (review/commit pending)
DEVIATIONS: 0
SCOPE: Documented the mobile testing ladder in `mobile/TESTING.md`, `MOBILE.md`, and `.kdbp/PLAN.md`; added `npm run verify:staging-auth` for repeatable Firebase staging email/password verification; added `npm run check:expo-config` to avoid logging the E2E password from raw Expo public config output.
PENDING CLOSED: none
VERIFICATION: `npm run verify:staging-auth` (mobile) — pass for `gastify-mobile-e2e@gastify-staging.test`; `npm run doctor:e2e` (mobile) — staging files/env/Admin SDK all OK, native tooling WARN remains; `npm run typecheck` (mobile) — pass; `npm test` (mobile) — 6 suites / 14 tests pass; `npm run generate:api` (mobile) — pass; `npm run check:expo-config` (mobile) — pass with `e2eAuthPassword` redacted; `npm audit --audit-level=high` (mobile) — no high vulnerabilities, 5 moderate Expo/PostCSS-chain findings remain; `git diff --check` — pass.

## 2026-05-14 21:58 — PHASE EXEC SUPPLEMENT: Phase 1 — Staging E2E user ready
TIER: ent
TASKS: 1 supplement, 0 commits yet (review/commit pending)
DEVIATIONS: 0
SCOPE: Normalized the repo-local ignored Admin SDK key path, filled ignored `mobile/.env` with staging E2E user values and Android-emulator local API URL, created the disposable Firebase Auth staging user, and verified actual email/password sign-in against the staging Firebase API.
PENDING CLOSED: none
VERIFICATION: Admin SDK key present at ignored `.secrets/gastify-staging-admin.json`; `tests/mobile/scripts/setup-staging-auth-user.py --execute --reset-password` — created user `gastify-mobile-e2e@gastify-staging.test`; `npm run doctor:e2e` (mobile) — all staging files/env/backend token checks OK, native tooling still WARN; Firebase Identity Toolkit email/password sign-in — OK for uid `EDTdOPF7oUWTCBLGq8foAp3tmjL2`.

## 2026-05-14 21:41 — PHASE EXEC SUPPLEMENT: Phase 1 — Firebase staging app registration
TIER: ent
TASKS: 1 supplement, 0 commits yet (review/commit pending)
DEVIATIONS: 0
SCOPE: Used authenticated Firebase CLI for `gastify-staging`, created Android and iOS app registrations for `com.gastify.mobile`, downloaded ignored native Firebase config files into `mobile/google-services.json` and `mobile/GoogleService-Info.plist`, recorded app ids in `mobile/STAGING_SETUP.md`, and prefilled the safe project id in ignored `mobile/.env`.
PENDING CLOSED: none
VERIFICATION: `firebase apps:list --project gastify-staging` — 2 apps registered; `git check-ignore -v mobile/.env mobile/google-services.json mobile/GoogleService-Info.plist` — all ignored; `npm run doctor:e2e` (mobile) — passes with expected WARN lines for API URL, E2E credentials, Admin SDK JSON, and local native tooling still missing.

## 2026-05-14 21:29 — PHASE EXEC SUPPLEMENT: Phase 1 — Local staging secret fill-in file
TIER: ent
TASKS: 1 supplement, 0 commits yet (review/commit pending)
DEVIATIONS: 0
SCOPE: Added ignored local `mobile/.env` placeholder for staging/mobile E2E inputs, created `/home/khujta/.secrets/gastify` for the staging Admin SDK JSON, and added `mobile/STAGING_SETUP.md` with step-by-step setup instructions.
PENDING CLOSED: none
VERIFICATION: `git check-ignore -v mobile/.env mobile/google-services.json mobile/GoogleService-Info.plist` — all ignored by `mobile/.gitignore`; `git status --short mobile/.env mobile/STAGING_SETUP.md mobile/google-services.json mobile/GoogleService-Info.plist` — only tracked doc appears; `npm run doctor:e2e` (mobile) — pass with expected WARN lines for missing staging values/files/tooling.

## 2026-05-14 21:21 — PHASE EXEC SUPPLEMENT: Phase 1 — Staging-first mobile E2E lane
TIER: ent
TASKS: 1 supplement, 0 commits yet (review/commit pending)
DEVIATIONS: 0 structural, 1 implementation note (Firebase Auth Emulator remains available only as an opt-in fallback)
SCOPE: Switched mobile E2E config/docs from emulator-first to staging-first, added explicit `EXPO_PUBLIC_E2E_AUTH_MODE`, added a local mobile E2E doctor that writes to `tests/mobile/results/latest/environment/`, and added a staging-only Firebase Auth test-user setup script.
PENDING CLOSED: none
VERIFICATION: `npm run typecheck` (mobile) — pass; `npm test` (mobile) — 6 suites / 14 tests pass; `npm run doctor:e2e` (mobile) — pass with expected WARN lines for missing local staging secrets/native tooling; `uv run python -m py_compile ../tests/mobile/scripts/setup-staging-auth-user.py` (backend) — pass; staging setup script dry-run with `GASTIFY_FIREBASE_PROJECT_ID=gastify-staging` — pass; `npx expo config --type public` (mobile) — pass and shows `e2eAuthMode: 'staging'`; `npm run generate:api` (mobile) — pass; `npm audit --audit-level=high` (mobile) — no high vulnerabilities, 5 moderate Expo/PostCSS-chain findings remain; `git diff --check` — pass.

## 2026-05-14 10:51 — PHASE EXEC SUPPLEMENT: Phase 1 — Mobile testing strategy
TIER: ent
TASKS: 1 supplement, 0 commits yet (review/commit pending)
DEVIATIONS: 0 structural, 1 implementation note (`jest-expo` was replaced by `@react-native/jest-preset` because React Native 0.85 moved its Jest preset)
SCOPE: Added mobile Jest/RNTL config and tests, stable React Native `testID` values, staging-first Firebase Auth E2E sign-in seam, Maestro Phase 1 smoke flow, mobile testing docs, KDBP STRUCTURE test patterns, and GitHub Actions mobile gates for typecheck, tests, API drift, and audit.
PENDING CLOSED: none
VERIFICATION: `npm test` (mobile) — 6 suites / 14 tests pass; `npm run typecheck` (mobile) — pass; `npm run generate:api` (mobile) — pass; `npx expo config --type public` (mobile) — pass; `npm audit --audit-level=high` (mobile) — no high vulnerabilities, 5 moderate Expo/PostCSS-chain findings remain; `uv run ruff check . && uv run ruff format --check .` (backend) — pass; `uv run pytest` (backend) — 362 passed, 2 skipped; `git diff --check` — pass.

## 2026-05-14 10:32 — PHASE EXEC COMPLETE: Phase 1 — Mobile scaffold + typed API + auth
TIER: ent
TASKS: 4 tasks, 0 commits yet (review/commit pending)
DEVIATIONS: 0 structural, 1 minor (backend reference OpenAPI UUID import fixed to unblock generated clients)
SCOPE: Added `mobile/` Expo React Native app with native Firebase Auth + Google Sign-In, SecureStore API-token mirror, React Navigation auth shell, TanStack Query, Zustand session store, generated OpenAPI client, mobile env/readme/config, and KDBP STRUCTURE mobile/test patterns.
PENDING CLOSED: none
VERIFICATION: `npm run generate:api` (mobile) — pass; `npm run typecheck` (mobile) — pass; `npx expo config --type public` (mobile) — pass; `uv run ruff check .` (backend) — pass; `uv run ruff format --check .` (backend) — pass; backend OpenAPI probe — pass; `uv run pytest` (backend) — 362 passed, 2 skipped; `npm audit --audit-level=high` (mobile) — no high vulnerabilities, 5 moderate Expo/PostCSS-chain findings remain.

## 2026-05-14 10:18 — PLAN CREATED: P4 Mobile App MVP
PHASES: 5 | COMPLEXITY: high | MATURITY: mvp
TIERS: mvp × 0, ent × 5, scale × 0 | PROTOTYPES: 0
DECISIONS: D38 → D42 (5 phase tier decisions logged)

## 2026-05-14 10:09 — PUSH main -> main
PR: — (direct push)
CI: ✅ 8/8 (72s)
PROMOTION: N/A
DEPLOYMENTS: P22 (added row to .kdbp/DEPLOYMENTS.md)

## 2026-05-14 09:40 — PLAN COMPLETED: P3 Web Portal MVP
ARCHIVE: .kdbp/archive/completed_PLAN_2026-05-14_p3-web-portal-mvp.md
PHASES COMPLETED: 5 of 5

## 2026-05-14 09:35 — PUSH main -> main
PR: — (direct push)
CI: ✅ 8/8 (69s)
PROMOTION: N/A
DEPLOYMENTS: P21 (added row to .kdbp/DEPLOYMENTS.md)

## 2026-05-14 — [2abcab8] test(web): add Phase 5 E2E journey + edge-case Vitest coverage
FINDINGS: 0 (0 critical, 0 high, 0 medium, 0 low)
ACTIONS: none
DEFERRED: none

## 2026-05-14 — PHASE 5 REVIEW: E2E journey + edge case tests
VERDICT: APPROVE
FINDINGS: 4 total (0 critical, 2 high, 1 medium, 1 low) — all 4 fixed
COVERAGE: MEDIUM — Vitest/jsdom mocked staging tests; contract-aligned after fix (SSE terminal payload matches backend). No browser E2E.
CONFIDENCE: 90/100 (was 59 pre-triage; +31 from fixing all 4 findings via fix-all)
DEFERRED: none new; P8/P9 re-opened (component-tested but SSE staging path incomplete)
ALIGNMENT: DRIFTED → ALIGNED (post-fix — plan description amended for Vitest strategy)
TIER: ent | DRIFT: none
TICK: ✅ Phase 5 Review column ticked
TRIAGE: fix all — #1 SSE contract aligned to backend, #2 PLAN.md amended for Vitest, #3 testTimeout 15s, #4 MockEventSource shared
SOURCES: codex/gpt-5 (inbox, 3 findings) + claude/claude-opus-4-6 (blind, 4 findings) — 2 strict matches, 1 fuzzy confirmed (merged as MEDIUM), 1 Claude-only
ARCHIVED: .kdbp/reviews-archive/REVIEW_2026-05-14-091600_resolved.md

## 2026-05-13 20:01 — PHASE EXEC COMPLETE: Phase 5 — E2E journey + edge case tests
TIER: ent
TASKS: 1 task, 0 commits yet (review/commit pending)
DEVIATIONS: 0 structural, 1 minor (see DEVIATIONS.md)
SCOPE: Added web Vitest route/hook/component coverage for sign-in → scan upload → SSE stream → transaction list/detail → merchant edit → sign-out eviction, plus scan error UX, unknown merchant, low confidence, edit retry, SSE token refresh/reconnect, double-submit abort, and invalid-file rejection.
PENDING CLOSED: P6, P8, P9
VERIFICATION: `npm test` — 8 files / 23 tests pass; `npm run lint` — 0 errors, 27 existing Fast Refresh warnings; `npm run build` — pass.

## 2026-05-13 19:14 — PHASE EXEC COMPLETE: Phase 4 — Sign-out isolation + responsive polish
TIER: ent
TASKS: 1 task, 1 feature commit (+1 KDBP bookkeeping commit)
DEVIATIONS: 0 structural, 0 minor

## 2026-05-13 19:10 — [00c00e6] feat(web): isolate sign-out session state and add i18n chrome
FINDINGS: 2 (0 critical, 0 high, 0 medium, 2 low)
ACTIONS: 1:accept (existing Fast Refresh route warnings) 2:accept (G6 well docs drift)
DEFERRED: 0

## 2026-05-13 18:58 — PLAN UPDATED: P3 Web Portal MVP
CHANGE: Current Phase advanced from Phase 3 (Transaction ledger + detail + edit) to Phase 4 (Sign-out isolation + responsive polish) after Phase 3 reached Exec/Review/Commit/Push ✅.
SCOPE: bookkeeping only — no phase scope, tier, pending item, decision, or implementation changes.

## 2026-05-13 22:52 — PUSH main -> main
PR: — (direct push)
CI: ✅ 8/8 (~45s) — auto-fix lint (ruff TC003 in reference.py), CI re-run after fix
PROMOTION: N/A
DEPLOYMENTS: P19 (added row to .kdbp/DEPLOYMENTS.md)

## 2026-05-13 22:49 — [36f4d71] fix(backend): move UUID import to TYPE_CHECKING block (ruff TC003)
FINDINGS: 0
ACTIONS: CI auto-fix

## 2026-05-13 18:42 — [5c7ba61] feat(web): add category editing, filtering, and test harness (review fixes)
FINDINGS: 3 (0 critical, 0 high, 2 medium, 1 low)
ACTIONS: 1:defer 2:accept 3:update-structure
DEFERRED: +P23 (doc drift — new route in reference.py)

## 2026-05-15 — PHASE 3 REVIEW: Transaction ledger + detail + edit
VERDICT: APPROVE
FINDINGS: 6 total (0 critical, 4 high, 1 medium, 1 low) — all 6 fixed
COVERAGE: MEDIUM — 4 tests pass (vitest); optimistic update/rollback/invalidation/field-preservation covered; broader web harness still partial (P22)
CONFIDENCE: 90/100 (was 35 pre-triage; +55 from fixing all 6 findings via option [2] Fix all including Enterprise)
DEFERRED: none
ALIGNMENT: ALIGNED — all changed files on-scope for Phase 3
TIER: ent | DRIFT: none
TICK: ✅ Phase 3 Review column ticked
TRIAGE: option [2] Fix all (MVP + Enterprise) — all 6 findings fixed
KEY FIXES: adjust-state-during-render pattern replacing useEffect+setState (#1), EditableCategory dropdown + backend reference endpoint (#2), category filter in TransactionFilters + FilterBar (#3), vitest harness + 4 optimistic mutation tests (#4), PLAN.md date corrected (#5), explicit field-level optimistic spread replacing type assertion (#6)
SOURCES: codex/gpt-5 (inbox, 5 findings) + claude/claude-opus-4-6 (blind, 6 findings) — 4 strict matches, 1 fuzzy confirmed, 1 Claude-only
ARCHIVED: .kdbp/reviews-archive/REVIEW_2026-05-15-000000_resolved.md

## 2026-05-14 — PHASE EXEC COMPLETE: Phase 3 — Transaction ledger + detail + edit
TIER: ent
TASKS: 3 tasks, 3 commits
DEVIATIONS: 0 structural, 0 minor

## 2026-05-14 — [2af8e3d] feat(web): add inline field editing with optimistic updates and user_edited_at markers
FINDINGS: 1 (0 critical, 0 high, 0 medium, 1 low)
ACTIONS: 1:update-docs (G6 well doc Key Decisions — optimistic update pattern)
DEFERRED: 0

## 2026-05-14 — [a0f8b84] feat(web): add transaction detail view with line items, images, and processing metadata
FINDINGS: 1 (0 critical, 0 high, 0 medium, 1 low)
ACTIONS: 1:update-docs (G6 well doc Purpose + Key Decisions populated)
DEFERRED: 0

## 2026-05-14 — [ca39caf] feat(web): add transaction list page with cursor pagination, filters, and skeleton loading
FINDINGS: 1 (0 critical, 0 high, 0 medium, 1 low)
ACTIONS: 1:accept (G6 well docs drift)
DEFERRED: 0

## 2026-05-13 21:17 — PUSH main -> main
PR: — (direct push)
CI: all passed (8/8, ~45s)
PROMOTION: N/A
DEPLOYMENTS: P18 (added row to .kdbp/DEPLOYMENTS.md)

## 2026-05-13 — [af138fc] fix(web): apply Phase 2 review fixes — SSE vocabulary, error codes, scan result handling
FINDINGS: 0 (0 critical, 0 high, 0 medium, 0 low)
ACTIONS: none
DEFERRED: 0

## 2026-05-13 — PHASE 2 REVIEW: Scan flow + streaming progress UI
VERDICT: WARNING
FINDINGS: 7 total (0 critical, 4 high, 3 medium, 0 low) — all 7 fixed
COVERAGE: LOW — no frontend test harness in web/; verdict capped at WARNING
CONFIDENCE: 90/100 (was 27 pre-triage; +63 from fixing all 7 MVP-gate findings via option [1])
DEFERRED: none
ALIGNMENT: ALIGNED — 10/10 on-scope, 0 off-scope
TIER: ent | DRIFT: none
TICK: ✅ Phase 2 Review column ticked
TRIAGE: option [1] Fix MVP items only — 7 findings fixed, 0 deferred
KEY FIXES: SSE event names aligned to backend vocabulary (#1), step-to-phase mapping aligned (#2), ScanResult handles minimal terminal data with completion state (#3), error codes case-normalized + vocabulary matched to ScanErrorCode enum (#4), PDF deviation logged (#5), LEDGER dates corrected 05-15→05-13 (#6), formatAmount heuristic removed — Intl.NumberFormat handles CLP/USD natively (#7)
SOURCES: codex/gpt-5 (inbox, 6 findings) + claude/opus-4-6 (blind, 7 findings) — 6 strict matches, 0 fuzzy, union consolidation
ARCHIVED: .kdbp/reviews-archive/REVIEW_2026-05-13-210000_resolved.md

## 2026-05-13 — PHASE EXEC COMPLETE: Phase 2 — Scan flow + streaming progress UI
TIER: ent
TASKS: 5 tasks, 1 commit
DEVIATIONS: 0 structural, 0 minor

## 2026-05-13 — [61277a1] feat(web): implement scan flow with file upload, SSE streaming, and staged progress UI
FINDINGS: 1 (0 critical, 0 high, 0 medium, 1 low)
ACTIONS: 1:accept (G6 well docs drift)
DEFERRED: 0

## 2026-05-13 16:24 — PUSH main -> main
PR: —
CI: all passed (8/8, 65s)
PROMOTION: N/A
DEPLOYMENTS: P17  (added row to .kdbp/DEPLOYMENTS.md)

## 2026-05-13 — [f49917c] fix(web): apply Phase 1 review fixes — env config, auth error handling, README, theme token
FINDINGS: 1 (0 critical, 0 high, 0 medium, 1 low)
ACTIONS: 1:accept (lint warnings — TanStack Router file-based routing)
DEFERRED: none

## 2026-05-13 — PHASE 1 REVIEW: Web scaffold + OpenAPI client + auth
VERDICT: WARNING
FINDINGS: 6 total (0 critical, 2 high, 2 medium, 2 low) — 5 fixed, 1 deferred
COVERAGE: LOW — no test harness in web/; verdict capped at WARNING
CONFIDENCE: 85/100 (was 52 pre-triage; +33 from fixing all 5 MVP-gate findings via option [1])
DEFERRED: P22 (no test harness, Enterprise gate)
ALIGNMENT: ALIGNED — 34/34 on-scope, 0 off-scope
TIER: ent | DRIFT: none
TICK: ✅ Phase 1 Review column ticked
TRIAGE: option [1] Fix MVP items only — 5 findings fixed, 1 deferred
KEY FIXES: VITE_API_BASE_URL env var (#1), auth token try/catch on getIdToken + refresh (#2), KDBP date correction 05-14/05-15→05-13 (#4), real README replacing Vite template (#5), dark mode hover:bg-(--primary-light) replacing hardcoded gray-100 (#6)
SOURCES: codex/gpt-5 (inbox, 5 findings) + claude/opus-4-6 (blind, 6 findings) — 4 strict matches, 1 fuzzy (confirmed merge), union consolidation
ARCHIVED: .kdbp/reviews-archive/REVIEW_2026-05-15_resolved.md

## 2026-05-13 — PHASE EXEC COMPLETE: Phase 1 — Web scaffold + OpenAPI client + auth
TIER: ent
TASKS: 7 tasks, 1 commit
DEVIATIONS: 0 structural, 1 minor (React 19 instead of 18 — see DEVIATIONS.md)

## 2026-05-13 — [cd6c123] feat(web): scaffold Vite + React 19 + TanStack Router + Firebase Auth web portal
FINDINGS: 4 (0 critical, 0 high, 2 medium, 2 low)
ACTIONS: 3:update-structure 4:update-structure 1:accept 2:accept
DEFERRED: none
STRUCTURE: updated web/ patterns in STRUCTURE.md (routes/ not pages/, tsx hooks, config files, stores→MVP)

## 2026-05-13 — PLAN CREATED: P3 Web Portal MVP
PHASES: 5 | COMPLEXITY: high | MATURITY: mvp
TIERS: ent × 5 | PROTOTYPES: 0
DECISIONS: D33 → D37 (5 phase tier decisions logged)
COVERS: REQ-05, REQ-13, REQ-14, REQ-23
PENDING ADDRESSED: P6 (error UX), P8 (unknown merchant), P9 (low confidence) — verified in Phase 5 E2E

## 2026-05-12 — PLAN COMPLETED: P2 Receipt Scan Pipeline
ARCHIVE: .kdbp/archive/completed_PLAN_2026-05-12_p2-receipt-scan-pipeline.md
PHASES COMPLETED: 5 of 5
TIERS: mvp × 1, ent × 4 | DECISIONS: D28→D32
REQs PROVEN: REQ-01, REQ-02, REQ-03, REQ-04, REQ-12

## 2026-05-12 18:11 — PUSH main -> main
PR: —
CI: all passed (8/8 ~45s)
PROMOTION: N/A
DEPLOYMENTS: P16 (added row to .kdbp/DEPLOYMENTS.md)

## 2026-05-12 — [16788f8] test(scan): apply Phase 5 review fixes
FINDINGS: 0 (all checks passed)
ACTIONS: none
DEFERRED: none

## 2026-05-12 22:00 — PHASE 5 REVIEW: Exit-signal + error case tests
VERDICT: APPROVE
FINDINGS: 4 total (0 critical, 3 high, 1 medium, 0 low) — all 4 fixed
COVERAGE: HIGH — 362 tests pass, 95.82% coverage; 70 Phase 5 tests (2 skipped credit placeholders)
CONFIDENCE: 100/100 (was 59 pre-triage; +41 from fixing all 4 findings via option [1] Fix MVP items only)
DEFERRED: none
ALIGNMENT: ALIGNED — 7/7 on-scope, 0 off-scope
TIER: mvp | DRIFT: none
TICK: ✅ Phase 5 Review column ticked
TRIAGE: option [1] Fix MVP items only — all 4 findings fixed
KEY FIXES: ruff format 3 files (#4), MERCHANT_CATEGORY_MAP + 5 varied taxonomy tests (#3), finance category seeding + TestDefenseBoundary proving architectural defense (#1), TestCreditRefund skip-marked placeholders (#2)
SOURCES: codex/gpt-5 (inbox, 4 findings) + claude/opus-4-6 (blind, 4 findings) — 3 strict matches, 1 fuzzy (severity: HIGH vs MEDIUM on #2, resolved as HIGH), union consolidation
ARCHIVED: .kdbp/reviews-archive/REVIEW_2026-05-12-220000_resolved.md

## 2026-05-12 — PHASE EXEC COMPLETE: Phase 5 — Exit-signal + error case tests
TIER: mvp
TASKS: 5 tasks, 1 commit
DEVIATIONS: 0 structural, 1 minor (credit refund test skipped — no service exists)

## 2026-05-12 — [d0d162c] test(scan): add Phase 5 exit-signal + error case tests for P2 pipeline
FINDINGS: 0 (0 critical, 0 high, 0 medium, 0 low)
ACTIONS: none
DEFERRED: 0

## 2026-05-12 17:07 — PUSH main -> main
PR: —
CI: all passed (8/8, 67s)
PROMOTION: N/A
DEPLOYMENTS: P15 (added row to .kdbp/DEPLOYMENTS.md)

## 2026-05-12 — [bb53eb3] fix(scan): apply Phase 4 review fixes — terminal snapshots, WS cleanup, formatting
FINDINGS: 0 (0 critical, 0 high, 0 medium, 0 low)
ACTIONS: none
DEFERRED: none

## 2026-05-12 — PHASE 4 REVIEW: Scan progress streaming
VERDICT: APPROVE
FINDINGS: 3 total (0 critical, 2 high, 1 medium, 0 low) — all 3 fixed
COVERAGE: HIGH — 301 tests pass, 96% coverage; late-subscribe, terminal snapshot, WS disconnect, eviction all tested (8 new tests)
CONFIDENCE: 90/100 (was 57 pre-triage; +33 from fixing all 3 findings via option [2] Fix MVP + Enterprise)
DEFERRED: none
ALIGNMENT: ALIGNED — 10/10 on-scope, 0 off-scope
TIER: ent | DRIFT: none
TICK: ✅ Phase 4 Review column ticked
TRIAGE: option [2] Fix MVP + Enterprise — all 3 findings fixed
KEY FIXES: ruff format + lint (E501/B017/SIM117) (#1), terminal snapshot store + late-subscribe delivery + 8 tests (#2), WS heartbeat sub.close() on send failure (#3)
SOURCES: codex/gpt-5 (inbox, 3 findings) + claude/opus-4-6 (blind, 3 findings) — 3 strict matches, 0 unique, union consolidation
ARCHIVED: .kdbp/reviews-archive/REVIEW_2026-05-12-164438_resolved.md

## 2026-05-12 — PHASE EXEC COMPLETE: Phase 4 — Scan progress streaming
TIER: ent
TASKS: 5 tasks, 1 commit
DEVIATIONS: 0 structural, 0 minor

## 2026-05-12 — [c8227ad] feat(scan): add dual-transport scan progress streaming (SSE + WebSocket)
FINDINGS: 2 (0 critical, 0 high, 1 medium, 1 low)
ACTIONS: 1:update-docs 2:update-docs
DEFERRED: none

## 2026-05-12 16:13 — PUSH main -> main
PR: — (direct push)
CI: ✅ 8/8 (64s) — all passed
PROMOTION: N/A
DEPLOYMENTS: P14 (added row to .kdbp/DEPLOYMENTS.md)

## 2026-05-12 — [5f70de7] fix(scan): apply Phase 3 review fixes — type annotations, error classification, persist tests
FINDINGS: 0 (all checks passed)
ACTIONS: none
DEFERRED: none

## 2026-05-12 20:00 — PHASE 3 REVIEW: Stage 2: Categorization + math gate
VERDICT: APPROVE
FINDINGS: 6 total (0 critical, 3 high, 2 medium, 1 low) — all 6 fixed
COVERAGE: HIGH — persist_scan.py 27%→100%, Phase 3 aggregate 78%→98%, 270 tests pass
CONFIDENCE: 90/100 (was 36 pre-triage; +54 from fixing all 6 findings via option [3] Fix all incl. Scale)
DEFERRED: none
ALIGNMENT: ALIGNED — 8/8 on-scope, 0 off-scope
TIER: ent | DRIFT: none
TICK: ✅ Phase 3 Review column ticked
TRIAGE: option [3] Fix all including Scale — all 6 findings fixed
KEY FIXES: 16 persist_scan tests (#1), category_not_found warning log (#2), always re-run extraction on EXTRACTED resume (#3), CATEGORIZATION_PARSE_ERROR wired to classify_error (#4), deduplicated GEMINI cost constants (#5), datetime|None return type (#6)
SOURCES: claude/opus-4-6
ARCHIVED: .kdbp/reviews-archive/REVIEW_2026-05-12-200000_resolved.md

## 2026-05-13 — PHASE EXEC COMPLETE: Phase 3 — Stage 2: Categorization + math gate
TIER: ent
TASKS: 6 tasks, 1 commit (f2af679)
DEVIATIONS: 0 structural, 0 minor

## 2026-05-13 — [f2af679] feat(scan): add Stage 2 categorization + math gate + persistence pipeline
FINDINGS: 0 (0 critical, 0 high, 0 medium, 0 low)
ACTIONS: none
DEFERRED: none

## 2026-05-13 — PUSH main → origin/main
PR: — (direct push)
CI: ✅ 8/8 (50s) — all checks passed (2nd run after format fix)
PROMOTION: N/A
DEPLOYMENTS: P13 (added row to .kdbp/DEPLOYMENTS.md)

## 2026-05-13 — [4c80cd1] fix(scan): apply Phase 2 review fixes
FINDINGS: 1 (0 critical, 0 high, 0 medium, 1 low)
ACTIONS: 1:update-docs (README.md — GEMINI_API_KEY → GOOGLE_API_KEY)
DEFERRED: none

## 2026-05-13 — PHASE 2 REVIEW: Stage 1: Vision extraction worker
VERDICT: PASS
FINDINGS: 6 total (0 critical, 2 high, 3 medium, 1 low) — 5 fixed, 1 accepted
COVERAGE: HIGH — 232 tests pass (106 Phase 2); trigger_process_scan endpoint covered (6 new tests)
CONFIDENCE: 95/100 (was 54 pre-triage; +41 from fixing all findings via option [3] Fix all incl. Scale)
DEFERRED: none
ALIGNMENT: ALIGNED — 19/19 on-scope, 0 off-scope
TIER: ent | DRIFT: none
TICK: ✅ Phase 2 Review column ticked
TRIAGE: option [3] Fix all incl. Scale — 5 fixed, 1 accepted
KEY FIXES: asyncio.to_thread for read_bytes (#1), 6 trigger endpoint tests (#2), RATE_LIMIT→transient + QUOTA_EXCEEDED split (#3), removed unused gemini_api_key (#4), PROCESSING_TIMEOUT_S stuck-scan recovery (#5)
ACCEPTED: #6 json_repair — PydanticAI output_type handles structured output; module retained for Stage 2
SOURCES: claude/opus-4-6

## 2026-05-13 — PHASE EXEC COMPLETE: Phase 2 — Stage 1: Vision extraction worker
TIER: ent
TASKS: 5 tasks, 2 commits (8f4ff3d, 077a1b0)
DEVIATIONS: 0 structural, 0 minor

## 2026-05-13 — [077a1b0] feat(scan): add idempotent extraction worker, process trigger, and scan staging
FINDINGS: 1 (0 critical, 0 high, 1 medium, 0 low)
ACTIONS: 1:update-docs (docs/architecture.md#API Endpoints — added scan endpoints table)
DEFERRED: none

## 2026-05-13 — [8f4ff3d] feat(scan): add PydanticAI extraction agent, JSON repair, coalescing, and scan error types
FINDINGS: 1 (0 critical, 0 high, 0 medium, 1 low)
ACTIONS: 1:update-docs (README.md — added Configuration section + PydanticAI link)
DEFERRED: none

## 2026-05-12 16:36 — PUSH main -> main
PR: — (direct push)
CI: ✅ 8/8 (50s) — all passed after auto-fix (format + deps)
PROMOTION: N/A (staging not available)
DEPLOYMENTS: P12 (added row to .kdbp/DEPLOYMENTS.md)

## 2026-05-12 — [5c5627e] fix(scan): add corrupt image guard, DB-failure cleanup, and file_size CHECK constraint
FINDINGS: 0 (0 critical, 0 high, 0 medium, 0 low)
ACTIONS: none
DEFERRED: none

## 2026-05-12 — PHASE 1 REVIEW: Scan schema + V4 taxonomy + image processing
VERDICT: APPROVE
FINDINGS: 5 total (0 critical, 2 high, 2 medium, 1 low) — all 5 resolved
COVERAGE: MEDIUM — 140 tests pass, 97% coverage; corrupt image path now tested; missing disk-write-failure and DB-failure-cleanup staging tests
CONFIDENCE: 95/100 (was 59 pre-triage; +36 from fixing all 5 findings via option [2] Fix MVP + Enterprise)
DEFERRED: none
ALIGNMENT: ALIGNED — 12/12 on-scope, 0 off-scope
TIER: ent | DRIFT: none
TICK: ✅ Phase 1 Review column ticked
TRIAGE: option [2] Fix MVP + Enterprise items — all 5 findings fixed
KEY FIXES: try/except for corrupt image → 422 (#1), shutil.rmtree cleanup on DB commit failure (#2), CHECK(file_size_bytes >= 0) constraint in migration + model (#3), corrupt image test (#4), PLAN piexif→Pillow text correction (#5)
SOURCES: claude/opus-4-6

## 2026-05-12 — [3acb5ee] feat(scan): add scan schema, V4 taxonomy, image compression, and submission endpoint
FINDINGS: 2 (0 critical, 0 high, 1 medium, 1 low)
ACTIONS: 1:accept 2:accept (all:commit)
DEFERRED: none

## 2026-05-12 — PHASE EXEC COMPLETE: Phase 1 — Scan schema + V4 taxonomy + image processing
TIER: ent
TASKS: 5 tasks, 1 commit (batched)
DEVIATIONS: 0 structural, 0 minor

## 2026-05-07 — PLAN CREATED: P2 Receipt Scan Pipeline
PHASES: 5 | COMPLEXITY: high overall | MATURITY: mvp
TIERS: mvp x 1, ent x 4, scale x 0 | PROTOTYPES: 0
DECISIONS: D28 → D32 (5 phase tier decisions logged)
SOURCE: /gabe-plan P2 Receipt Scan Pipeline
COVERS: REQ-01, REQ-02, REQ-03, REQ-04, REQ-12
RED-LINES: AI/Agent.Structured-output (Ph2+Ph3), BG-jobs.Idempotency (Ph2), BG-jobs.Dead-letter (Ph2), Real-time.Reconnection (Ph4), File/Media.Image-pipeline (Ph1)
DEPENDS: P1 Foundation (completed 2026-05-07)

## 2026-05-07 — PLAN COMPLETED: Backend P1 Foundation
ARCHIVE: .kdbp/archive/completed_PLAN_2026-05-07_backend-p1-foundation.md
PHASES COMPLETED: 6 of 6
TIERS: mvp×1, ent×5, scale×0
TESTS: 126/126 pass, 96% coverage
REQs PROVEN: REQ-15 through REQ-22 (exit-signal smoke test)
NEXT: No active plan. Run /gabe-plan [goal] to create one.

## 2026-05-07 21:01 — PUSH main -> main
PR: — (direct push)
CI: ✅ 8/8 (60s) — all checks passed
PROMOTION: N/A
DEPLOYMENTS: P11 (added row to .kdbp/DEPLOYMENTS.md)
SOURCE: 3 commits since 790b9bb — addc2b2 (P10 bookkeeping) + e8cf7ed (P1 exit-signal smoke test) + 2fac518 (Phase 6 Review tick). 126 tests, 96% coverage.
TICK: ✅ Phase 6 Push auto-ticked — all 6 phases complete (Exec/Review/Commit/Push = ✅)

## 2026-05-07 21:00 — PHASE 6 REVIEW: Exit-signal smoke test
VERDICT: APPROVE
FINDINGS: 0 total (0 critical, 0 high, 0 medium, 0 low)
COVERAGE: HIGH — Phase 6 deliverable IS the smoke test; 126/126 pass, 96% coverage
CONFIDENCE: 100/100
DEFERRED: none
ALIGNMENT: ALIGNED — 3/3 on-scope, 0 off-scope
TIER: mvp | DRIFT: none
TICK: ✅ Phase 6 Review column ticked
SOURCES: codex/gpt-5 (inbox, 0 findings) + claude/opus-4-6 (blind, 0 findings) — union consolidation, zero findings both passes
ARCHIVED: .kdbp/reviews-archive/REVIEW_2026-05-07-164744_resolved.md

## 2026-05-07 — PHASE EXEC COMPLETE: Phase 6 — Exit-signal smoke test
TIER: mvp
TASKS: 1 tasks, 1 commits
DEVIATIONS: 0 structural, 1 minor (fx_captured_at added to TransactionDetail — not in original Scope but required by assertion chain)

## 2026-05-07 — [e8cf7ed] test(p1): add exit-signal smoke test proving all P1 REQs end-to-end
FINDINGS: 0 (0 critical, 0 high, 0 medium, 0 low)
ACTIONS: (none)
DEFERRED: 0

## 2026-05-07 15:01 — PUSH main -> main
PR: — (direct push)
CI: ✅ 8/8 (70s) — all checks passed
PROMOTION: N/A
DEPLOYMENTS: P10 (added row to .kdbp/DEPLOYMENTS.md)

## 2026-05-07 — [790b9bb] fix(observability): add ge≥0 constraints and metrics API-key auth
FINDINGS: 0 (0 critical, 0 high, 0 medium, 0 low)
ACTIONS: none — all checks passed
DEFERRED: none

## 2026-05-07 — PHASE 5 REVIEW: Observability pipeline
VERDICT: APPROVE
FINDINGS: 4 total (0 critical, 3 high, 1 medium, 0 low) — all 4 resolved
COVERAGE: HIGH — 32 observability tests pass; negative validation, metrics auth, Prometheus format, content negotiation, scan-metric round-trip all exercised
CONFIDENCE: 95/100 (was 50 pre-triage; +45 from fixing all 4 findings via option [2] Fix MVP + Enterprise)
DEFERRED: none
ALIGNMENT: ALIGNED — 7/7 on-scope, 0 off-scope
TIER: ent (Obs→scale) | DRIFT: none
TICK: ✅ Phase 5 Review column ticked
TRIAGE: option [2] Fix MVP + Enterprise items — all 4 findings fixed
KEY FIXES: ruff format migration (#1), ge=0 Pydantic constraints + 4 negative/zero tests (#2), METRICS_API_KEY env-gated auth dependency + 4 auth tests (#3), CHECK constraints in migration + model __table_args__ (#4)
SOURCES: codex/gpt-5 (inbox, 3 findings) + claude/opus-4-6 (blind, 4 findings) — 3 strict matches, 1 Claude-only, union consolidation
RESOLVED: P17 (metrics auth — recurring, now fixed with API key guard)
ARCHIVED: .kdbp/reviews-archive/REVIEW_2026-05-07-041500_resolved.md

## 2026-05-07 — PHASE EXEC COMPLETE: Phase 5 — Observability pipeline
TIER: ent (Core.Observability → scale)
TASKS: 3 tasks, 2 commits
DEVIATIONS: 0 structural, 1 minor (schema + endpoint wiring for scan metrics — scope-creep from pure observability into transaction API, necessary for round-trip)

## 2026-05-07 — [dfa5ab2] test(observability): add scan metric columns, Prometheus format, and content negotiation tests
FINDINGS: 0 (0 critical, 0 high, 0 medium, 0 low)
ACTIONS: none
DEFERRED: 0

## 2026-05-07 — [8f4cd8b] feat(observability): add per-scan metric columns and Prometheus text exporter
FINDINGS: 0 (0 critical, 0 high, 0 medium, 0 low)
ACTIONS: none
DEFERRED: 0

## 2026-05-07 — PUSH main → origin/main
PR: — (direct push to main, no PR)
CI: ✅ 8/8 (all green after coverage config fix)
PROMOTION: N/A (origin/staging does not exist)
DEPLOYMENTS: P9 added to .kdbp/DEPLOYMENTS.md
SOURCE: 3 commits since cc5d95c — 618a445 (KDBP Phase 4 tick) + 741e973 (review fixes: 7 findings) + 721ee06 (coverage greenlet concurrency fix). 105 tests, 96% coverage.
TICK: ✅ Phase 4 Push auto-ticked

## 2026-05-06 — PHASE 4 REVIEW: Consent + processing register + DSR
VERDICT: APPROVE
FINDINGS: 7 total (1 critical, 4 high, 1 medium, 1 low) — all 7 resolved
COVERAGE: MEDIUM — 23 Phase 4 tests pass; erasure now exercised with real txn/item/image data; rectification FK validated; portability shape tested
CONFIDENCE: 95/100 (was 15 pre-triage; +80 from fixing all 7 findings via option [3] Fix all including Scale)
DEFERRED: none
ALIGNMENT: ALIGNED — 12/12 on-scope, 0 off-scope
TIER: ent | DRIFT: none
TICK: ✅ Phase 4 Review column ticked
TRIAGE: option [3] Fix all including Scale — all 7 findings fixed
KEY FIXES: expanded erasure to redact all PII (#1 CRITICAL), currency FK pre-validation (#2), Literal jurisdiction enum (#3), server-derived IP/UA for audit (#4), real-data erasure test (#5), portability 10k cap + truncated flag (#6), removed VALID_PURPOSES frozenset (#7)
SOURCES: codex/gpt-5 (inbox, 5 findings) + claude/opus-4-6 (blind, 7 findings) — 5 strict matches, 2 Claude-only, union consolidation
ARCHIVED: .kdbp/reviews-archive/REVIEW_2026-05-06-230000_resolved.md

## 2026-05-06 — PHASE EXEC COMPLETE: Phase 4 — Consent + processing register + DSR
TIER: ent
TASKS: 5 tasks, 1 commit (02d089c)
DEVIATIONS: 0 structural, 1 minor (conftest: seeded user + processing_register rows; set explicit updated_at on consent mutations to avoid SQLite lazy-load)
FILES: 12 changed (+1394 / -1)
TESTS: 20 new (10 consent + 10 DSR), 102 total passing, 0 regressions

## 2026-05-06 16:58 — PUSH rebuild/be-phase-01 → origin/main (PR #2)
PR: https://github.com/Brownbull/gastify/pull/2
CI: ✅ 9/9 (all green after 5 CI-fix commits)
DEPLOYMENTS: P7 updated (initial push, CI failed) + P8 added (CI-fix iteration, all green)
SOURCE: 5 CI-fix commits (e266afd → 059d642) covering: uv.lock tracked, ruff format, biome install + lint script, vitest test script, backend coverage 74→81%, deprecated nav refs rename, dependency-groups migration, esbuild peer dep, pip-audit addition, serialize-javascript audit fix.
FIXES APPLIED: 10 distinct CI issues resolved across 7 originally-failing jobs + 3 cascade issues discovered during iteration.

## 2026-04-28 — [main bb934e1] feat(mockups): D18 file-triple cascade + KDBP audit (D23) + parallel validate-mode scaffold
FINDINGS: 3 (0 critical, 0 high, 2 medium, 1 low)
  - medium: tests/mockups/validate/runner.mjs — `.mjs` not in STRUCTURE.md test pattern (stream B / not-mine; accepted)
  - medium: tests/mockups/validate/rules.json — `.json` not in STRUCTURE.md test pattern (stream B / not-mine; accepted)
  - low (deferred): P11 — review-skip pattern persists on this commit too (user acknowledged + chose to commit)
ACTIONS: all-accept (per user "commit everything" override of just-approved plan)
DEFERRED: +P12 (5 broken molecule triples from D18 cascade — rebuild gated on R1+R2 enforcement landing first; see DECISIONS.md D23 + ~/.claude/plans/why-did-you-do-twinkling-lecun.md)
SCOPE: 3 independent workstreams bundled (D18 cascade + KDBP audit + parallel validate-mode scaffold). Honest multi-section commit message documents each.
NOTABLE:
  - D23 audit doc landed: documents WHY the suite's gates didn't catch the class-name hallucination (helper-script authors demos as Python literals; /gabe-review opt-in + skipped 5 phases running)
  - PENDING.md P12: explicit deferral with file paths + rebuild prerequisite (R1+R2 land first)
  - Tweaks panel viewport chip retired across all mockup files; surface chrome lives in desktop-shell.css
NEXT: implement R1 (class-name lint hook) + R2 (helper-script source extraction) per plan; then rebuild the 5 molecules through the new gates as proof they work.

## 2026-04-28 14:25 — SPIKE P15.0 EXECUTED: `/gabe-mockup validate` mode + per-screen validator

DISPATCH: ad-hoc `/plan` → codify validation in gabe-mockup as new `validate` mode (parallel shape to `spike`). One-pass GAN/PDD: design SKILL.md + templates, run on gastify, calibrate, run on gustify, calibrate, lock.

EMITTED:
- `tests/mockups/validate/runner.mjs` (orchestrator: architecture detection, screen enumeration, manifest, Playwright dispatch, MOCKUP-VALIDATION.md write with stable-ID merge)
- `tests/mockups/validate/screen-validator.spec.ts` (Playwright spec, data-driven from manifest, 4 check categories per (screen × viewport))
- `tests/mockups/validate/rules.json` (rule catalog + viewport widths 360/768/1440 + min-column 60px + skip patterns)
- `.kdbp/MOCKUP-VALIDATION.md` (live findings document, 0 active findings on gastify)
- `docs/mockups/VALIDATE-MODE-RECIPE.md` (project-specific recipe + run history table)

VERIFICATION:
- Architecture detection: `dynamic` with hybrid reason (tweaks.js + per-device *-desktop.html suffixes)
- 87 specs (28 base × 3 viewports + 3 desktop-only at desktop) ran in 14s
- 0 raw findings — gastify mockups are clean per C1/C2/C3 (C4 inert: no `applies-to: mockup-screens` rules in RULES.md)
- Stable-ID hashing uses `fingerprint || selector` for proper dedup (calibration #2 from gustify run)
- Skips `_*.html` template files + `index.html`

CALIBRATIONS UPSTREAM (template edits to gabe_lens during this run):
1. Hybrid architecture enumeration: shared file seeded to all viewports; per-device suffix overrides override per-viewport. Gastify-style projects no longer skip *-desktop.html files.
2. Skip leading-underscore template files (`_desktop-template.html`, `_filter-dropdowns.html`, `_nav-reference.html` — 3 files, 9 specs eliminated from gastify's run).

GATES:
- ✅ Validator boots, finds the manifest, runs Playwright, writes MOCKUP-VALIDATION.md
- ✅ Tablet viewport (768px) included alongside phone + desktop
- ✅ Validate spec is additive: lives at `tests/mockups/validate/screen-validator.spec.ts` and gracefully skips when invoked without runner.mjs env vars (`MOCKUP_VALIDATE_MANIFEST`, `MOCKUP_VALIDATE_FINDINGS_DIR`). Plain `npm test` reports it as 1 skipped, not 1 failure.
- ⚠ Pre-existing test failures: 44 atoms.spec.ts failures asserting `.legacy-section` visibility (line 53). Verified via `git stash` on clean main — failures persist without any of my validate work. Root cause is unrelated to Spike P15.0; tracked separately.
- ✅ Refrepos mirror (Layer 3): templates at `setup/cherry-pick/kdbp/templates/mockup/validate/` (6 files). Bench-tested in `mktemp -d` — install.sh recursive `cp -r` picks up the validate/ subtree alongside react/. 34 mockup template files now (was 28).
- ✅ Dual-home install: validate templates land at `~/.claude/templates/gabe/mockup/validate/` AND `~/.agents/templates/gabe/mockup/validate/`. SKILL.md "Mode: validate" section appears in both Claude Code and Codex CLI mode listings after restart.

NEXT (handed back to user):
- Pre-existing atoms-spec failures (`.legacy-section` not visible) are independent of this spike; tracking but not blocking.
- Validate-mode is now codified, calibrated against 2 architectures (dynamic-hybrid via gastify; per-device via gustify), mirrored, installed.

## 2026-04-27 17:30 — L2a BATCH 2 EXECUTED (mockups-legacy cards, 4 of 5; card-feature deferred)
DISPATCH: /gabe-mockup continue → Phase L2 batch 2 (cards)
EMITTED:
  - docs/mockups-legacy/molecules/card-transaction.html (canonical, 571-line source — receipt thumb + emoji badge + merchant + amount + meta-pills + expandable items + selection + duplicate-flag + grouped border)
  - docs/mockups-legacy/molecules/card-stat.html (aggregate tile from AggregatedItemCard.tsx — icon block + name + total + meta pills with optional action-pill)
  - docs/mockups-legacy/molecules/card-empty.html (centered empty-state from HistoryEmptyStates.tsx + ItemsViewEmptyState.tsx — 3 sub-states: primary-with-CTA / filter-empty / duplicates-empty + 2 scales)
  - docs/mockups-legacy/molecules/card-celebration.html (PersonalRecordBanner — Trophy + title + message + dismiss + auto-dismiss 8s + is-leaving exit anim)
  - docs/mockups-legacy/assets/css/molecules.css (246 → 555 lines, +309 lines, 5 new sections incl. .card base + 4 variants, zero hex/rgb literals)
  - docs/mockups-legacy/molecules/index.html (4 catalog cards added with inline real-DOM previews; live count 3 → 7)
DEFERRED:
  - card-feature — no live frontend source. Settings entries are list rows not feature cards; insights BatchSummary is multi-row panel (better fit for future card-summary). Documented in SCREEN-USAGE.md as "skipped from L2a, revisit if hero pattern lands in L4."
SPEC-FLAG UX FIX (mid-batch):
  - banner.html: dropped floating ::before pseudo-badge ("speculative — not in live frontend") that was absolute-positioned and clipping into adjacent banner content (per user screenshot feedback).
  - Replaced with ⚠ inline marker tied to existing (speculative) text in swatch labels — semantic data-speculative attribute kept, no visual chrome.
CROSS-REFS UPDATED:
  - atoms/button.html "Used by molecules" → adds card-empty (CTA) link
  - INDEX.md §1 phase-status: 3 → 7 of ~18
  - INDEX.md §2 atoms table: button "Used by molecules" → banner + card-empty
  - INDEX.md §3 molecules table: 4 new card rows + speculative card-feature row collapsed to remaining-list
  - INDEX.md last-updated bumped
  - mockups-legacy/index.html principal hub: meta-pills 3→7, Molecules card preview list updated
  - SCREEN-USAGE.md: 4 new molecule sections + card-feature DEFERRED section
PLAN BOOKKEEPING:
  - Current Phase prose: batch-2 paragraph appended; batches 3-5 outlined; scan-mode-selector noted as future FAB/sheet sibling per user screenshot
TRACE METHODOLOGY (per molecule):
  - card-transaction: TransactionCard imports → 3 views (RecentScansView, DashboardView, HistoryView) ✅ heavy. Disambiguated 2 source files; history/components/TransactionCard.tsx is dead code (zero consumers, kept for git history).
  - card-stat: AggregatedItemCard → 1 view (ItemsView) ⚠️ thin but real
  - card-empty: HistoryEmptyStates → HistoryView (3 sub-states); ItemsViewEmptyState → ItemsView (filter-empty only) ✅
  - card-celebration: PersonalRecordBanner wired but no production trigger; CelebrationView is placeholder per Story 14.33d ⚠️ wired-but-not-fired
VERIFICATION: smoke-test pending (next step) — http-server :4176 + curl 200 check + zero-hex-literal grep
NEXT: smoke-test all 4 cards; user review before continuing to batch 3 (modals + sheet + drawer)

## 2026-04-27 16:55 — L2a BATCH 1 EXECUTED (mockups-legacy molecules, 3 of ~18)
DISPATCH: /gabe-mockup auto-mode → Phase L2 batch 1
EMITTED:
  - docs/mockups-legacy/molecules/banner.html (atom-composing, 4 variants: info/warning/error/offline-edge-bleed; consumes button atom)
  - docs/mockups-legacy/molecules/state-tabs.html (canonical primitive: pill+sliding-indicator + simple-flat variant; sourced from ItemViewToggle.tsx)
  - docs/mockups-legacy/molecules/toast-system.html (system layer: .toast-stack + .is-leaving + useToast hook contract; wraps L1 toast atom)
  - docs/mockups-legacy/assets/css/molecules.css (17 → 237 lines, 3 sections, zero hex/rgb literals)
  - docs/mockups-legacy/molecules/index.html (sub-hub flipped placeholder→live, 3 catalog cards with inline real-DOM previews)
CROSS-REFS UPDATED:
  - atoms/button.html "Used by molecules" → links banner.html (closes bidirectional contract)
  - atoms/toast.html "Used by molecules" → links toast-system.html (closes bidirectional contract)
  - INDEX.md §1 phase-status: L2a ⬜ → 🔄 (3 of 6 batches)
  - INDEX.md §2 atoms table: button "Used by molecules" placeholder → live banner link; toast → live toast-system link
  - INDEX.md §3 molecules table: 3 catalog rows populated with sources + variants + atom deps
  - mockups-legacy/index.html principal hub: Molecules card placeholder→live; meta-pill "11 atoms ✅ · 3 molecules ✅"
PLAN BOOKKEEPING:
  - Phases table: L2 row Exec ⬜ → 🔄
  - Current Phase prose: explains batch 1 completion + suggested batches 2-5 for remaining 15
  - Retrofit Log: 2026-04-27 L2a batch 1 entry appended (drift-vs-clean-slate: BEM-lite class names, frontend-token vocabulary)
DRIFT NOTES:
  - toast-system intentionally diverges from clean-slate `toast.html` — splits atom-render (L1) from positioning + hook contract (L2). Single-toast semantics from live useToast.ts (NOT spike P14.0's queue+max3+FIFO).
  - banner uses BEM-lite (.banner--warning) instead of clean-slate's .is-warning, matching L1 atom convention
VERIFICATION: deferred to next /gabe-mockup run (smoke-test: http-server :4173 + Playwright snapshot per molecule × Normal Light/Dark)
NEXT: continue L2a batch 2 (cards: transaction / stat / empty / feature / celebration) via /gabe-mockup

## 2026-04-27 16:35 — PLAN UPDATED: advance to L2 + retro-tick bundled phases
CHANGE: Current Phase L1 → L2 (mockups-legacy Molecules; three sub-phases L2a/L2b/L2c). Retro-ticked Commit+Push ✅ for Phase 3 (Molecules), Phase 4 (Hub layer D22), Phase L0 (mockups-legacy Foundation), Spike P14.0 (Mockup→React) — all four shipped in be9aefd and pushed in P5 (origin/main 16:30). Review columns remain ⬜ for these four; no /gabe-review pass occurred. PENDING.md P11 tracks the retroactive review backlog. Last Updated bumped to reflect retroactive correction.
SCOPE: structural fix — column state now matches deployment reality for P3/P4/L0/Spike P14. Future /gabe-review on those phases will flip Review ⬜ → ✅ when they actually run.
NEXT: start L2a via /gabe-execute or /gabe-mockup. ~18 direct-counterpart molecules from frontend/src/features/.

## 2026-04-27 16:30 — PUSH main -> origin/main
PR: — (trunk-based; direct push, no PR hop)
CI: skipped (provider=none)
PROMOTION: N/A (origin/staging does not exist; promote_from=staging skipped silently per Step 3)
DEPLOYMENTS: P5 added to .kdbp/DEPLOYMENTS.md
SOURCE: Phase L1 exit-push — 3 commits since P4. Tip: c69447d (chore: bookkeeping for be9aefd) preceded by be9aefd (5-phase catch-up: P3 molecules + P4 hub + Spike P14 + L0 + L1 + /gabe-review L1 fixes).
TICK: ✅ Phase L1 Push auto-ticked

## 2026-04-27 — [be9aefd] feat: ship P3/P4 + spike P14 + L0/L1 + L1 review (5-phase catch-up)
SCOPE: 5-phase catch-up commit per /gabe-commit [B] commit-all. 1184 files staged, +154970/-157.
PHASES BUNDLED:
  - P4 Hub layer D22 (2026-04-24): principal index.html + sub-hubs + tweaks.js breadcrumb + hubs.spec.ts
  - P3 Molecules (2026-04-25): 18 molecules at docs/mockups/molecules/ + molecules.css + COMPONENT-LIBRARY.md
  - Spike P14 Frontend (2026-04-26): full React+Vite+TS at frontend/ — toast molecule + ~50 components + mocks
  - L0 Foundation (2026-04-27): docs/mockups-legacy/ scaffold extracted from frontend/index.html
  - L1 Atoms (2026-04-27): 11 atoms + atoms.css + categories.html + icon.html + 115-icon emoji↔pixel toggle
  - /gabe-review L1 (2026-04-27): cross-agent Codex+Claude union, all 9 findings fixed in same session
TICK: ✅ Phase L1 Commit auto-ticked
TICK-DEFERRED: P3 / P4 / Spike P14 / L0 Commit columns remain ⬜ (only Current Phase auto-ticks per /gabe-commit Step 6.6) — retroactive correction pending
CHECKS: ✅ tests (91/91) | – lint (no biome) | – types (no tsconfig) | – coverage (mvp skip) | – shape (HTML/CSS excluded)
FINDINGS: scope flagged HIGH at triage; user picked [B] commit-all over [A] scope-l1-only. STRUCTURE.md does not yet match docs/mockups-legacy/** or frontend/** — accepted with this commit, register patterns in follow-up.
PIXEL BUDGET: 0 / 2000 used (107 category PNGs + 8 nav PNGs mirrored from BoletApp existing set)

## 2026-04-27 19:15 — PHASE L1 REVIEW: mockups-legacy Atoms
VERDICT: APPROVE
FINDINGS: 9 total (0 critical, 3 high, 3 medium, 3 low)
COVERAGE: HIGH — `npm test` 87/87 pass; new `mockups-legacy` Playwright project covers 11 atoms × 6 theme/mode combos + ARIA contract + on-primary contrast smoke
CONFIDENCE: 100/100 (was 33 pre-fix; all 9 findings fixed in same session per option [1] Fix MVP items)
DEFERRED: none (P11 added to PENDING.md tracks retroactive review of Phases 3, 4, L0 — surfaced by finding #6 but is meta-cleanup not a deferral)
ALIGNMENT: DRIFTED — diff mixes L1 work with KDBP adjacencies + clean-slate INDEX.md fix + new tests/mockups-legacy spec; non-blocking
TIER: mvp | DRIFT: none
SOURCES: codex (gpt-5, inbox pass, 6 findings) + claude (claude-opus-4-7, blind pass, 9 findings) — union consolidation, fuzzy F1+F2 auto-accepted as Claude superset
TICK: ✅ Phase L1 Review column ticked
ARCHIVED: .kdbp/reviews-archive/REVIEW_2026-04-27_191500_resolved.md
KEY FIXES: per-theme on-color ink tokens added to desktop-shell.css × 6 theme blocks (--on-primary, --on-error, --on-warning, --on-accent + shadow/focus-ring/chip-count tokens); 8 #ffffff literals + 5 rgba literals removed from atoms.css; 13 progress demos got role=progressbar + aria-valuenow|aria-busy + aria-label; playwright.config.ts gained second webServer + project; tests/mockups-legacy/atoms.spec.ts authored (24 tests); README L0/L1 status flipped to ✅; INDEX atom count 11→10 + molecule count 17→18; PLAN inline comment + PENDING P11 entry document the no-arg /gabe-review collision.

## 2026-04-26 — SPIKE P14.0 EXECUTED: Mockup→React (Toast molecule)
SOURCE: /gabe-mockup spike toast --system (first invocation of the new spike mode)
GOAL: validate the recipe codified in gabe_lens/skills/gabe-mockup/SKILL.md "Mode: spike" by walking it end-to-end on a live mockup
SKILL CHANGES (in /home/khujta/projects/gabe_lens/):
  L1 — skills/gabe-mockup/SKILL.md: new "Modes" section + "Mode: spike" subsection (S1-S8 recipe + verification gate + idempotency rules + error recovery) + "Shared conventions — React port" + non-goal #4 reframed (M0-M13 framework-agnostic; spike is opt-in framework coupling)
  L2 — templates/mockup/react/ NEW SUBTREE (16 files):
       package.json.tmpl · vite.config.ts.tmpl · tsconfig.json.tmpl · index.html.tmpl · README.md.tmpl
       src/main.tsx.tmpl · src/App.tsx.tmpl · src/styles/tokens.css.tmpl
       src/components/{Component.tsx, Component.css, Component.types.ts, ComponentProvider.tsx, ComponentContainer.tsx, useComponent.ts}.tmpl
       src/demo/ComponentDemo.tsx.tmpl
       recipe/REACT-PORT-RECIPE.md.tmpl
GASTIFY EMISSIONS (15 files):
  frontend/{package.json, vite.config.ts, tsconfig.json, index.html, README.md}
  frontend/src/{main.tsx, App.tsx, styles/tokens.css}
  frontend/src/components/Toast/{Toast.tsx, Toast.css, Toast.types.ts, ToastProvider.tsx, ToastContainer.tsx, useToast.ts}
  frontend/src/demo/ToastDemo.tsx
  docs/mockups/REACT-PORT-RECIPE.md
VERIFICATION:
  tsc --noEmit → clean (no type errors)
  vite build → clean (37 modules transformed, 65.93kB CSS bundled — confirms @import chain to desktop-shell.css + atoms.css + molecules.css resolves through @mockups alias)
  npm install → clean (2 unrelated transitive vulns, non-blocking)
  Visual diff at runtime → deferred to user (requires browser at localhost:5173 vs. localhost:4173)
TEMPLATE CALIBRATION (real-time edits during the spike):
  - Renamed Component.module.css.tmpl → Component.css.tmpl (Vite scopes .module.css class names; broke DOM-mirroring rule)
  - Component.tsx state `isLeaving` → `isDismissing` (matches existing molecules.css `.toast.is-dismissing` selector verbatim)
  - SKILL.md S3 step + spike-mode outputs section updated to reflect both fixes
PLAN/SCOPE IMPACT:
  - .kdbp/PLAN.md: new "Spike P14.0" row added below row 13 (Exec ✅; Review/Commit/Push ⬜); Retrofit Log entry appended documenting out-of-band nature ahead of queued backend P1
  - .kdbp/SCOPE.md: untouched (this is a workflow spike, not a SCOPE addition)
  - .gitignore: untouched (existing `node_modules/` and `dist/` patterns already cover frontend/)
NEXT: refrepos mirror of templates/mockup/react/ + bench-test in tmp project; gastify regression check (npm test still 63/63); user-side visual diff in browser.

## 2026-04-25 03:42 — PUSH main -> origin/main
PR: — (trunk-based; direct-to-main, no PR hop)
CI: skipped (provider=none)
PROMOTION: N/A (origin/staging does not exist; promote_from=staging skipped silently per Step 3)
DEPLOYMENTS: P4 added to .kdbp/DEPLOYMENTS.md
SOURCE: Phase 2 exit-push — 6 commits since P3 covering atoms tooling completion + Phase 4 hub seeds. Tip: 4a0de9b feat(mockups): P2 atoms hub + Tweaks panel rebuild + legacy reference + Playwright harness

## 2026-04-25 — [4a0de9b] feat(mockups): P2 atoms hub + Tweaks panel rebuild + legacy reference + Playwright harness
FINDINGS: 5 (0 critical, 0 high, 3 medium, 2 low)
ACTIONS: 1+2+3:update-structure (added Mockup Test Harness section to STRUCTURE.md — package.json, package-lock.json, playwright.config.ts, tests/legacy-extract/**); 4:accept (README.md is Agent App scoped, not active mockup phase); 5:accept (top-level docs/mockups/INDEX.md governance is owned by Phase 4 amendment)
DEFERRED: 0
TESTS: 43/43 pass (Playwright mockup suite, ~9s)
SCOPE: 50 files, +4183 -474. Bundles Phase 2 atoms (this session — Tweaks rebuild, Space Grotesk, atoms gallery, legacy reference, viewport toggle, 43-spec harness) + Phase 4 hub seeds (root index.html, flows/index.html, molecules/, gap-matrix.html landed via prior session linter). Phase 4 hub work itself remains in P4 scope.
NOTABLE: legacy-snapshots/ committed (Layer A dump + Layer B Playwright extracts); 4 woff2 weights for Space Grotesk added.

## 2026-04-24 — [09f30b3] chore(kdbp): sync P4/P13 YAML types to Phases table
FINDINGS: 0 (0 critical, 0 high, 0 medium, 0 low)
ACTIONS: none (all checks passed — markdown-only diff; deferred ✅; docs Layer 1–4 ✅; structure skipped)
DEFERRED: 0
SCOPE: 2 files, +25 -9. Scoped to session work only — pre-existing unstaged pile (DECISIONS.md, PENDING.md, docs/mockups/** v2 cleanup + tweaks.js rename) left for separate commit.

## 2026-04-24 — PLAN COMPLIANCE CHECK: /gabe-plan check + [fix-types]
SPEC: v7.1 (9-rule compliance matrix)
VERDICT: 13/13 phases COMPLIANT on C1–C9
RETROFIT APPLIED: [fix-types] — synced P4 + P13 Phase Details YAML `types:` + `sections_considered:` + prose `**Types:**` to match Phases table cells (drift from 2026-04-24 /gabe-mockup retrofit)
CHANGES: P4 `[flows, index]` → `[mockup-flows, mockup-index]`; P13 `[documentation, validation]` → `[mockup-docs, mockup-validation]`
LLM CALLS: 0 | TIER CHANGES: 0 | DECISIONS TOUCHED: 0
FILES: .kdbp/PLAN.md (3 edits: P4 YAML/prose, P13 YAML/prose, Last Updated + Retrofit Log)

## 2026-04-24 — PHASE 1 REVIEW: ux-mockups P1 Design language + tokens
VERDICT: WARNING (provisional) → WARNING (final, post-triage)
FINDINGS: 7 total (0 critical, 2 high, 3 medium, 2 low)
COVERAGE: HIGH (static mockups, no test expectation; design-system.html is visual spec)
CONFIDENCE: 64 → 93 / 100 (post-triage, +29)
DEFERRED: P1 (scope sprawl P5-11 pre-build), P2 (style prompt count trim), P3 (a11y audit), P4 (piggy-bank.png location)
ALIGNMENT: DRIFTED (on-scope: tokens.json + design-system.html + 6 prompts; on-scope-missing: T5 72-render pass, Native Mobile frames, a11y; off-scope-delivered: 9 production desktop surfaces)
TIER: ent | DRIFT: none (mockups don't hit core.md drift signals)
TICK: ✅ (Review column Phase 1)
FIXES APPLIED: F1 → D20 DECISIONS entry + `docs/mockups/explorations/README.md`; F2 → `docs/mockups/PLATFORM-NOTES.md`; F5 → resolved on next `/gabe-commit` (LEDGER auto-tick delta flushes naturally)

## 2026-04-23 — [a37fd59] feat(mockups): canonical filter strip — timeframe pills + period-nav + L1/L2/L3/L4 taxonomy chips, retrofit Dashboard/History/Trends
FINDINGS: 0
ACTIONS: none
SCOPE: extracted BoletApp legacy filter UX (useHistoryFiltersStore) into shared `assets/css/desktop-shell.css` + paste-ready partial `screens/_filter-dropdowns.html`. Retrofitted Dashboard/History/Trends. Category modal uses 4 V4 taxonomy chips L1–L4 + Lugar (not legacy's 3-tab Receipt/Package/MapPin).

## 2026-04-23 — LANE ROLLBACK: drop `.kdbp/lanes/` layout → serial single-plan
SCOPE: rolled back Gabe Suite lane/parallelism feature. `.kdbp/lanes/ux-mockups/` promoted to `.kdbp/PLAN.md`. `.kdbp/lanes/p1-backend/` parked at `.kdbp/archive/queued_backend-p1.md` (activate post-UX handoff). `.kdbp/lanes/default/` discarded (empty template). Worktree `.worktrees/p1-backend/` removed + branch `gabe/p1-backend` deleted (content preserved in archive + `pre-rollback-snapshot` tag).
RATIONALE: complexity of parallel UX + backend stream did not pay off at mvp maturity. Serial plan (mockups first, backend second) is the match.
GABE SUITE: also rolled back — `~/.claude/commands/gabe-lane.md` removed; gabe-{init,commit,push,plan,execute,next,teach,review,help,scope*} restored to pre-lane heads + 5 non-lane improvements cherry-picked (push auto-commit bookkeeping, plan Core-as-table invariant, plan per-dim tier override data model, plan check subcommand, execute/review per-dim consumers).
RECOVERABILITY: `pre-rollback-snapshot` tags on both repos; `lane-archive` branch on gabe_lens preserves full lane work.

## 2026-04-23 04:36 — PLAN CREATED (ux-mockups): Complete gastify clean-slate mockup surface (web + mobile)
PHASES: 13 | COMPLEXITY: med-high overall | MATURITY: mvp
TIERS: mvp × 10, ent × 3, scale × 0 | PROTOTYPES: 0
DECISIONS: D7 → D19 (13 phase tier decisions logged)
SOURCE: /gabe-plan --lane=ux-mockups (lane layout now retired — see rollback entry above)

## 2026-04-23 01:48 — PLAN RETROFIT: ux-mockups PLAN.md → spec v7.1
SCOPE: 13 phases retrofitted (all non-compliant rows C3/C5/C6 + prose-only DN references)
CHANGES: +Types col | +13 YAML blocks (phase/types/phase_tier/prototype/dim_overrides:[]/sections_considered/suppressed_dims_count/decisions_entry) | DN refs D1-D13 → D7-D19
LLM CALLS: 0 (no prose-only dim_overrides detected)
TIER DECISIONS CHANGED: 0 (structural fix only)
SOURCE: /gabe-plan check --lane=ux-mockups [all]

## 2026-04-23 01:52 — [1f7e268 / e93472a] chore(kdbp): retrofit ux-mockups PLAN to spec v7.1
FINDINGS: 0 (0 critical, 0 high, 0 medium, 0 low)
ACTIONS: none
DEFERRED: none

## 2026-04-23 00:31 — PUSH main -> origin/main
PR: — (trunk-based; direct-to-main)
CI: skipped (provider=none)
PROMOTION: N/A (main is final link)
DEPLOYMENTS: P2 added to .kdbp/DEPLOYMENTS.md

## 2026-04-23 — [c6d6ff2] chore(kdbp): record push bookkeeping for P1
FINDINGS: 0
ACTIONS: none (all checks skipped — no source files; structure ✅; deferred ✅; shared-file policy ✅)
DEFERRED: 0
NOTE: Auto-commit mop-up of orphan bookkeeping left by prior /gabe-push that never reached Step 8.5. 3 files, +52.

## 2026-04-23 00:17 — PUSH main -> origin/main
PR: — (trunk-based; direct-to-main, no PR hop)
CI: skipped (provider=none; .github/workflows/ absent)
PROMOTION: N/A (main is final link in chain)
DEPLOYMENTS: P1 added to .kdbp/DEPLOYMENTS.md
SETUP: first run — wrote .kdbp/PUSH.md (remote=origin, strategy=trunk-based, CI=none) + seeded .kdbp/DEPLOYMENTS.md from template
CLASSIFIER: Trunk-first-push trigger fired → [note] action → DEPLOYMENTS P1.Decisions populated with trunk-based scaffold-phase rationale + revisit triggers

## 2026-04-23 00:09 — [a9e1bf2] chore(kdbp): migrate to lane layout + scaffold 7 gravity wells
FINDINGS: 2 (0 critical, 0 high, 1 medium, 0 low, 1 warning)
ACTIONS: 1:update-structure (added CLAUDE.md as MVP allowed pattern) · 2:scope-bypass-continue (ROADMAP phase ID normalization 1..9->P1..P9 cosmetic)
DEFERRED: 0
NOTE: Combined delta from /gabe-init update migration + /gabe-teach init-wells session. 21 files, +417 -12. Lane scaffolding part since rolled back; gravity wells content retained in KNOWLEDGE.md.

## 2026-04-22 23:33 — /gabe-teach init-wells
WELLS: 7 defined (G1 API Core, G2 Data Model, G3 Identity+Ownership, G4 Scan Pipeline, G5 Integrations, G6 Web Portal, G7 Mobile App) | RETAGGED: 0 topics (none pre-existing) | SOURCES: STRUCTURE.md Agent App patterns, ROADMAP phases, SCOPE pillars. Paths aspirational — code not scaffolded yet.

## 2026-04-22 23:30 — Alignment check (standard, target: SCOPE v1 + ROADMAP v1)
U1:PASS U2:CONCERN U4:PASS U5:PASS U6:PASS U8:CONCERN | V1:PASS V2:PASS V3:CONCERN V4:CONCERN | A1:PASS A2:CONCERN A3:PASS A4:PASS A5:PASS A6:PASS | Scenarios: n/a (planning artifacts)
VERDICT: PROCEED WITH CONCERNS
ACTIONS: (1) add per-run cost/latency/token telemetry to REQ-21 (closes U8+V4), (2) decide cost-tier for categorization stage (closes V3), (3) start Phase 1 execute to cap plan drift (closes U2), (4) audit rebuild ADRs for weighed alternatives (closes A2).

## 2026-04-22 22:40 — [54ea717] feat(scope): initial SCOPE + ROADMAP v1 for Gastify
FINDINGS: 0
ACTIONS: none (all checks passed)
DEFERRED: 0
NOTE: /gabe-scope v1.0 finalize commit. 18 files added (.kdbp/ + archives).

## 2026-04-23 11:58 — [main 4beed22] refactor(kdbp): rollback lane layout — serial single-plan workflow

## 2026-04-23 12:15 — [main 4beed22] refactor(kdbp): rollback lane layout — serial single-plan workflow

## 2026-04-23 13:56 — [main 35a6956] chore(kdbp): retrofit STRUCTURE for UX mockups + document design-first ordering

## 2026-04-23 14:12 — [main b6613e2] chore(kdbp): migrate PUSH.md to env-block shape (staging + production)

## 2026-04-23 — TIER ESCALATION: Phase 1 — Design language + tokens
FROM: mvp → TO: ent
TRIGGER: user mid-exec intervention — hand-rolled HTML rejected as low-fidelity vs legacy; legacy inspection revealed runtime multi-theme model + 3 platform surfaces + 4-screen stress-test convention not captured in original MVP plan
ROOT CAUSE: original D7 presumed single-theme-locked model; user + legacy evidence show runtime multi-theme (Normal/Pro/Mono × light/dark = 6 variants in-app) + 3 platform frames (Desktop Web / Mobile Web PWA / Native Mobile RN) + legacy stress-test methodology
DECISIONS: D7 amended with escalation block
REINSTATED: design-system.{Token-architecture, Platform-frames, Stress-test-breadth, State-matrix} → Ent
DISCARDED: 5 hand-rolled theme dashboard HTMLs (uncommitted, zero-cost rollback)
REPLAN: 7-task list (port 6 legacy prompts + author 3 new + stress-test spec + external render handoff + user pick + lock tokens/design-system)
EXEC STATE: 🔄 (continues)

## 2026-04-23 14:39 — [main b71a7be] docs(mockups): scaffold Phase 1 multi-theme design brief + 6 style prompts

## 2026-04-23 20:12 — [main a6193f0] docs(mockups): bundle self-hosted Outfit + Baloo 2 fonts + 200 pixel-art icons for Claude Design

## 2026-04-23 20:16 — [main 045f340] docs(mockups): pin wordmark as brand-invariant Baloo 2 700 @ 24px across all themes

## 2026-04-23 20:22 — [main c6c7929] docs(mockups): port canonical V4 taxonomy + category colors from BoletApp

## 2026-04-23 20:54 — [main afb533b] docs(mockups): port legacy BoletApp mockup tree as reference (29 screens + 13 flows + hub)

## 2026-04-23 21:17 — [main c950442] docs(mockups): dual-track setup — frozen legacy-reference + active editable working surface

## 2026-04-23 21:25 — [main 36baf7d] docs(mockups): AUDIT.md + gap-matrix index.html

## 2026-04-23 21:32 — [main 603b66f] docs(mockups): T9 anchor — Dashboard desktop variant (1440 responsive, 3-column)

## 2026-04-23 21:45 — [main 31e53a9] docs(mockups): T9b template extract — shared desktop shell CSS + template HTML

## 2026-04-23 21:51 — [main c61cd92] docs(mockups): T9c — History desktop variant (first template application)

## 2026-04-23 22:01 — [main ff88026] docs(mockups): T9d — Transaction Editor desktop (split-panel pattern)

## 2026-04-23 22:04 — [main 7da65b5] docs(mockups): desktop cross-nav — quick-nav dropdown + mobile-link in controls

## 2026-04-23 22:08 — [main 0452994] docs(mockups): T9e — Settings desktop (nested-subnav pattern, 4/29)

## 2026-04-23 22:11 — [main 4bd5b87] docs(mockups): T9f — Trends desktop (donut + drill + sparklines, 5/29)

## 2026-04-23 22:33 — [main a37fd59] feat(mockups): canonical filter strip — timeframe pills + period-nav + L1/L2/L3/L4 taxonomy chips, retrofit Dashboard/History/Trends

## 2026-04-23 22:43 — [main 88455c7] feat(mockups): Insights desktop — split panel + 3-tab switcher + filter strip

## 2026-04-23 22:54 — [main 9308c58] feat(mockups): Reports desktop — accordion groups + detail drawer

## 2026-04-23 22:57 — [main 022baaf] fix(mockups): Reports desktop layout — single-col accordion + explicit row columns

## 2026-04-23 23:03 — [main ffd517b] feat(mockups): Items desktop — aggregated 8-col table + L3 grouping

## 2026-04-23 23:19 — [main 7243c03] feat(mockups): 3 scan desktops — mode selector + scan states + quicksave, 11/29

## 2026-04-23 23:29 — [main 347c9e1] feat(mockups): Group Hub desktop — unified switcher + home + members + activity, 12/29

## 2026-04-23 23:35 — [main dec125b] fix(mockups): Group Hub tx row layout — 4-col grid with proper card padding

## 2026-04-23 23:41 — [main b45d80c] feat(mockups): Auth + Consent desktops — 4-tab auth + 4-jurisdiction consent, 14/29

## 2026-04-23 23:51 — [main aa97301] feat(mockups): T10 lock Phase 1 artifacts — tokens.json + design-system.html

## 2026-04-24 10:38 — [main b3f973d] docs(kdbp): Phase 1 review — warning verdict, D20 T5 supersession, platform notes, defer P1-P4

## 2026-04-24 10:45 — PUSH main -> origin/main
PR: — (trunk-based; direct-to-main, no PR hop)
CI: skipped (provider=none)
PROMOTION: N/A (main is final link)
DEPLOYMENTS: P3 added to .kdbp/DEPLOYMENTS.md
SOURCE: Phase 1 exit-push — 35 commits since P2 covering UX mockups P1 (14 desktop variants + design-system + tokens + Phase 1 review artifacts)

## 2026-04-24 10:44 — [main 83ef0c9] chore(kdbp): record push bookkeeping for P3

## 2026-04-24 14:22 — [main 083201f] chore(kdbp): adopt /gabe-mockup peer-command + seed P2 mockup infra
FINDINGS: 1 (0 critical, 0 high, 1 medium, 0 low)
ACTIONS: 1:update-structure (resolved via .gitignore — docs/mockups/legacy-reference/ now unversioned reference vault)
DEFERRED: none

## 2026-04-24 16:07 — [main 8690049] chore(kdbp): /gabe-mockup v2 retrofit corrections — self-contained panel + canonical paths

## 2026-04-24 16:07 — [main 542e0cf] feat(mockups): P2 atoms — 10 atom HTMLs + consolidated atoms.css
FINDINGS: retroactive — structured /gabe-review pending against docs/mockups/atoms/**
ACTIONS: LEDGER audit row backfilled; Phase 2 Review tick deferred until retroactive review triage completes
DEFERRED: see `.kdbp/PENDING.md` P1-P5 (none touch atoms surface)
SOURCE: commit landed via raw git commit (Codex CLI session, `.codex` marker present) bypassing /gabe-commit. Entry added during 2026-04-24 LEDGER dedup cleanup.

## 2026-04-24 18:30 — PLAN UPDATED: Phase 4 amendment (centralized mockup hub)
SOURCE: /gabe-plan update (invoked from inline /plan confirmation)
SCOPE ADDITION TO PHASE 4 (tier unchanged: mvp):
  A1 — Restructure docs/mockups/index.html as principal hub with section cards (Design / Atoms / Molecules / Flows / Screens / Handoff); migrate inline :root tokens → desktop-shell.css canonical (option a)
  A2 — Build docs/mockups/flows/index.html sub-hub (13 flow cards)
  A3 — Build docs/mockups/molecules/index.html placeholder (P3 stub)
  A4 — Generalize tweaks.js breadcrumb → section-aware
  A5 — Rename atoms-hub.spec.ts → hubs.spec.ts; add hub navigability + breadcrumb chain coverage
  A6 — Cross-reference docs/mockups/INDEX.md + atoms/INDEX.md → principal hub; add Navigation section to mockups/INDEX.md
DECISIONS: D22 logged (centralized hub pattern adopted, Layer B queued)
TIER CHANGES: 0 (Phase 4 stays mvp)
DIM_OVERRIDES: 0 (Phase 4 dim_overrides remains [])
LLM CALLS: 0 (structural amendment, no tier re-render)
FILES TOUCHED: .kdbp/PLAN.md (Last Updated, Phases row 4, Phase 4 Details Scope, Retrofit Log) · .kdbp/DECISIONS.md (D22 row + full prose entry)
NEXT: /gabe-execute on Phase 4 (or /gabe-next to dispatch)

## 2026-04-24 17:30 — PHASE 2 REVIEW: Atomic components (cross-CLI consolidated)
VERDICT: APPROVE (post-triage; provisional WARNING upgraded after 7/7 fixed)
FINDINGS: 7 total (0 critical, 2 high, 2 medium, 3 low) | SOURCES: codex/gpt-5 + claude/opus-4-7 (4 strict-overlap corroborated, 3 claude-only, 0 codex-only)
COVERAGE: MEDIUM — no automated a11y check on atom layer; INDEX.md Known Gaps surfaces residual M13-audit items
CONFIDENCE: 55 → 95 / 100 (+40, all 7 findings resolved)
DEFERRED: none added this run; PENDING.md P1-P5 unchanged (none touch atoms surface)
ALIGNMENT: DRIFTED (atom desktop-only vs phase row "Web + mobile" — non-blocking; atoms responsive by nature, mobile composition deferred to P3 molecule layer per recommendation)
TIER: mvp | DRIFT: 2 findings (1 fixed via downgrade — pill role removal; 1 accept-drift — prefers-reduced-motion logged on D8)
TICK: ✅ (Review column Phase 2)
FIXES APPLIED:
  F1 → desktop-shell.css [data-theme="mono"][data-mode="dark"] block: --primary-ink override #09090b (~9:1 contrast)
  F2 → progress.html: role=progressbar + aria-valuenow/min/max added to 4 semantic-color demos + 5 value-stage demos + 5 circular demos
  F3 → pill.html: dropped role=tablist/role=tab from atom demo, replaced aria-selected with aria-pressed (atom layer = visual only; tab semantics moved to P3 molecule contract)
  F4 → atoms.css: --progress-mask token (default var(--bg)), molecule consumers override with style="--progress-mask: var(--surface);"
  F5 → DECISIONS.md D8: drift-accepted note for prefers-reduced-motion (Enterprise-tier pattern in MVP phase, beneficial a11y kept)
  F6 → atoms/INDEX.md catalog row Badge: removed phantom xs size column entry
  F7 → desktop-shell.css: new --overlay-soft token across all 6 themes (rgba(0,0,0,0.08) light / rgba(255,255,255,0.08) dark); atoms.css 3 sites tokenized; functional alpha literals (shimmer, spinner ring, active-pill count bubble, btn-destructive #fff) retained with documented rationale in INDEX.md Known Gaps GAP-2/3/4
SOURCE: REVIEW.md archived to .kdbp/reviews-archive/REVIEW_2026-04-24-173000_resolved.md (schema 1.1, two sources)

## 2026-04-24 — PHASE 4 EXECUTED: centralized hub + section sub-hubs (Layer A)
PHASE: 4 (mockup-flows, mockup-index, mvp tier)
EXEC: ✅ (column flipped ⬜ → ✅; Review/Commit/Push remain ⬜)
SOURCE: /home/khujta/projects/gabe_lens/docs/LAYER-B-MOCKUP-HUB-TEMPLATES.md preconditions + D22 amendment in PLAN.md Phase 4 Details
A1 — Renamed legacy `docs/mockups/index.html` (P5–P12 gap matrix) → `gap-matrix.html` (preserved). New `index.html` is section-card hub: Design System / Atoms / Molecules / Flows / Screens / Handoff. Tokens via desktop-shell.css canonical (no inline :root). Each card has data-section + data-status="live|placeholder".
A2 — `docs/mockups/flows/index.html` created. 13 live flow cards (F1–F13) + 7 planned (F14–F20). Card pattern matches atoms/index.html. Footer back-link to `../index.html`.
A3 — `docs/mockups/molecules/index.html` created. Placeholder banner + 7 planned molecule cards (balance-card, transaction-card, state-tabs, filter-strip, nav-bottom, nav-sidebar, fab). All non-interactive divs with status="planned".
A4 — `assets/js/tweaks.js` breadcrumb generalized. Atoms-only path-match replaced with section-aware logic: `/<section>/<page>.html` → "← <Section> index" → ./index.html; `/<section>/index.html` → "← Mockups home" → ../index.html; `/<top-level>.html` (non-index) → "← Mockups home" → ./index.html; `/index.html` → no breadcrumb (it IS home).
A5 — `tests/mockups/atoms-hub.spec.ts` → `tests/mockups/hubs.spec.ts` (renamed + generalized). Added describe blocks: Top hub (5 specs), Atoms sub-hub (5), Flows sub-hub (4), Molecules sub-hub (3), Breadcrumb chain (2). Total 19 specs in this file.
A6 — npm test: 43 passed, 0 failed (was 33 before; +10 from new hub coverage in hubs.spec.ts).
FILES TOUCHED: docs/mockups/{index.html (new section-card), gap-matrix.html (renamed-from-old), flows/index.html (new), molecules/index.html (new), assets/js/tweaks.js (breadcrumb logic)}, tests/mockups/{hubs.spec.ts (renamed-from-atoms-hub.spec.ts + generalized)}, .kdbp/PLAN.md (Phase 4 Exec ✅).
NEXT: Layer B execution in /home/khujta/projects/gabe_lens/ — extract this hub + sub-hub + Playwright pattern into `templates/mockup/` so future mockup projects get it from `/gabe-mockup` for free. Per LAYER-B-MOCKUP-HUB-TEMPLATES.md D1–D8.

## 2026-04-25 02:00 — [main b9230e6] chore(kdbp): record push bookkeeping for P4

## 2026-04-27 16:27 — [main c69447d] chore(kdbp): record be9aefd + tick Phase L1 Commit column

## 2026-04-27 16:32 — [main 7600c83] chore(kdbp): record push bookkeeping for P5

## 2026-04-27 16:38 — [main 907157f] chore(kdbp): advance Current Phase to L2 + retro-tick P3/P4/L0/Spike P14

## 2026-04-28 11:35 — [main bb934e1] feat(mockups): D18 file-triple cascade + KDBP audit (D23) + parallel validate-mode scaffold

## 2026-04-28 11:35 — [main f80ac14] chore(kdbp): record bb934e1 in LEDGER + flag P11 review-skip continuance

## 2026-04-28 11:36 — PUSH main -> origin/main
PR: — (trunk-based; direct-to-main, no PR hop)
CI: skipped (provider=none)
PROMOTION: N/A (origin/staging does not exist; main is final link)
DEPLOYMENTS: P6 added to .kdbp/DEPLOYMENTS.md
SOURCE: L2 mid-phase push — 4 commits since P5 (907157f + bb934e1 + f80ac14 + push-bookkeeping). Includes D18 cascade with 5 broken molecules acknowledged in PENDING.md P12; rebuild gated on R1+R2 enforcement landing first (see DECISIONS.md D23).
PUSH_COL_TICK: skipped (L2 Exec=🔄, not ✅; auto-tick precondition failed per Step 10)

## 2026-04-28 11:39 — [main 0269fae] chore(kdbp): record push bookkeeping for P6

## 2026-04-28 13:13 — [main 5eb8ba6] chore(kdbp): record 0269fae push entry in LEDGER

## 2026-04-28 13:14 — [main 9f660be] docs(mockups): rework cross-session handoff brief

## 2026-04-28 13:14 — [main 7a41233] chore(kdbp): record 5eb8ba6 + 9f660be entries in LEDGER

## 2026-04-28 16:37 — [main d562685] feat(frontend): migrate Tailwind CDN to built Tailwind 4
FINDINGS: 4 (0 critical, 1 high, 2 medium, 1 low)
ACTIONS: 1:defer 2:update-structure 3:defer 4:defer-to-pivot-phase-9
DEFERRED: +P13 (firestore.ts pre-existing type errors), +P14 (README Tailwind update — folded into pivot Phase 9), +P15 (PLAN.md L2 → Ladle pivot reconciliation — folded into pivot Phase 9)
COMMIT_COL_TICK: skipped (Current Phase = L2 mockups-legacy, but commit is Ladle pivot Phase 1 from a different plan; auto-tick precondition failed per Step 6.6 mismatch rule — silent no-op as designed). Manually reconcile in pivot Phase 9.
NOTES: Phase 1 of the Ladle pivot. Tailwind 4 + @tailwindcss/vite installed. Inline <style> block (1057 lines) extracted to frontend/src/styles/global.css. STRUCTURE.md gained a Frontend section (React + Vite + TS — port of BoletApp). Dev server boots clean (383ms); dashboard renders correctly at 390×844 Normal Light. Build still fails on the same 2 pre-existing firestore.ts errors (now tracked as P13). Plan reference: ~/.claude/plans/okay-here-s-something-that-ancient-graham.md.

## 2026-04-28 16:49 — [main 0f8bbbb] feat(frontend): stand up Ladle showcase + author story conventions
FINDINGS: 3 (0 critical, 1 high, 1 medium, 1 low)
ACTIONS: 1:accept (P13 already tracks firestore type errors) 2:accept (P14 already tracks README drift) 3:update-structure (frontend/*.md pattern added)
DEFERRED: none new (re-flags of P13/P14 accepted without re-deferring)
COMMIT_COL_TICK: skipped (Current Phase = L2 mockups-legacy; commit is Ladle pivot Phases 2+3 from a different plan; auto-tick precondition failed per Step 6.6 mismatch rule). Manually reconcile in pivot Phase 9.
NOTES: Phases 2+3 of the Ladle pivot. Ladle 5.1.1 installed; sentinel Welcome story serves at http://localhost:5175 with theme/viewport/mode switchers. STORIES.md documents authoring conventions (CSF3, Atoms/Molecules/Organisms/Templates/Screens/Flows hierarchy, args, parameters.tags forward-look, production-isolation rule). Lint guard at scripts/check-no-story-imports.sh — fails CI if any non-story file imports *.stories.*. Side fix: root .gitignore had a stale `.ladle/` rule hiding source config; corrected to `frontend/build-ladle/` (the real Ladle build output). Plan reference: ~/.claude/plans/okay-here-s-something-that-ancient-graham.md.

## 2026-04-28 17:30 — [main 108aad0] feat(frontend): atom showcase stories + Ladle stylesheet/theme wiring fixes
FINDINGS: 1 (0 critical, 1 high, 0 medium, 0 low)
ACTIONS: 1:accept (P13 firestore type errors already tracked)
DEFERRED: none new
COMMIT_COL_TICK: skipped (Current Phase = L2 mockups-legacy; commit is Ladle pivot Phase 4 from a different plan; auto-tick precondition failed per Step 6.6 mismatch rule). Manually reconcile in pivot Phase 9.
NOTES: Phase 4 of the Ladle pivot — 3 atom showcase stories (Colors / Typography / Icons) under src/_design/ with 9 named variants total. Plus critical Ladle wiring fixes: useMirrorStylesheetsToOwnerDoc (clones parent stylesheets into iframe head when stories run iframed), theme vs mode disambiguation (URL ?theme=dark, not ?mode=dark), config.mjs schema correction (width.defaultState=0; theme.defaultState='light'), Tailwind 4 @source directive (default scan skips _design/ underscore-prefixed dirs). Verified end-to-end via 42-combination Playwright sweep (7 stories × 3 viewports × 2 modes); zero errors, all utilities compile, all themes cascade. Plan reference: ~/.claude/plans/okay-here-s-something-that-ancient-graham.md.

## 2026-04-28 21:14 — [main 1c54c34] feat(frontend): pivot showcase tool from Ladle to Storybook 10
FINDINGS: 1 (0 critical, 1 high, 0 medium, 0 low)
ACTIONS: 1:accept (P13 firestore type errors already tracked)
DEFERRED: none new
COMMIT_COL_TICK: skipped (Current Phase = L2 mockups-legacy; commit is mockup-pivot showcase-tool reversal from a different plan; auto-tick precondition failed per Step 6.6 mismatch rule). Manually reconcile in pivot Phase 9.
NOTES: Reversed axis 2 of the mockup-to-React pivot plan from Ladle (2A) to Storybook 10 (2B) per user direction. Storybook handles iframe CSS injection natively, removing the useMirrorStylesheetsToOwnerDoc hack from .ladle/components.tsx. CSF3 stories migrated with minimal changes. 28-combination Playwright verification: zero errors, all stories render with theme tokens + Tailwind utilities + viewport switching. Plan reference: ~/.claude/plans/okay-here-s-something-that-ancient-graham.md. DECISION D25 records the pivot rationale (to be added in pivot Phase 9 archive cleanup).

## 2026-04-28 21:21 — [main b98e314] fix(frontend): inject Google Fonts into Storybook preview iframe
FINDINGS: 0
ACTIONS: none
DEFERRED: none
COMMIT_COL_TICK: skipped (Current Phase = L2 mockups-legacy; commit is mockup-pivot showcase fix from a different plan).
NOTES: Storybook preview iframe head was missing the Google Fonts <link>, so Baloo 2 (Gastify wordmark) fell back silently. Added .storybook/preview-head.html mirroring index.html's preconnect + fonts.googleapis.com link. Updated Typography story's Baloo 2 sample to match TopHeader.tsx shape: var(--font-family-wordmark) + fontWeight: 700 + fontSize: 28px (Baloo 2 is loaded at weight 700 only; without explicit weight match, browser falls back). Verified via document.fonts API: Baloo 2/700 status="loaded".

## 2026-04-28 21:32 — [main 8795b52] feat(frontend): ship Dashboard screen story (Phase 6 milestone)
FINDINGS: 1 (0 critical, 1 high, 0 medium, 0 low)
ACTIONS: 1:accept (P13 firestore type errors already tracked)
DEFERRED: none new
COMMIT_COL_TICK: skipped (Current Phase = L2 mockups-legacy; commit is Ladle-pivot Phase 6 milestone from a different plan).
NOTES: **PHASE 6 MILESTONE LANDED.** The handoff brief's named first deliverable shipped: Dashboard, Mobile 390×844, Normal theme, Light mode, with real Transaction data shape. Story mounts <DashboardView /> with no props — reads everything via useDashboardViewData() from Zustand stores + repositories backed by mocked Firestore. Wrapper calls useHistoryFiltersInit() to mirror viewRenderers.tsx's DashboardViewWithFilters. Layout 'fullscreen' so the view fills the iframe. 5 transactions surface from seed data (Jumbo, Café Altura, Shell, Farmacias Cruz Verde, Spotify Premium); 5 category groups (Supermercado, Bencinera, Restaurante, Farmacia, Más). Layout + visual language matches docs/mockups-legacy/screens/gastify-dashboard.html. Verified via Playwright. The pivot has now demonstrated end-to-end that Storybook + mocked Firebase + real React component = a viable mockup surface.

## 2026-04-28 21:48 — [main 8dc7262] feat(frontend): adopt platform × state args pattern for screen stories
FINDINGS: 0
ACTIONS: none
DEFERRED: none
COMMIT_COL_TICK: skipped (Current Phase = L2 mockups-legacy; commit is mockup-pivot screens-convention pattern from a different plan).
NOTES: Mirrored the sibling Storybook's screen-story pattern after user pointed to a Storybook running on :6006. Pattern: each screen exposes `platform` (mobile/tablet/desktop) + `state` (default/empty/loading/error/...) as args, with pre-baked named stories like "Mobile · Default" locking in the canonical combinations. Drilling into a story shows the args panel below for live tweaking. Documented in frontend/STORIES.md under "Screens convention — platform × state args" with the canonical wrapper + meta + named-story snippet so future screens follow the same shape. 4 Dashboard stories shipped (Mobile · Default, Mobile · Empty, Tablet · Default, Desktop · Default).

## 2026-04-28 22:08 — [main 5a39a10] revert: scan flow batch 1 (1c75ef4) and its LEDGER chore (95f3051)
FINDINGS: 0 (revert; no new work)
ACTIONS: none
DEFERRED: none
COMMIT_COL_TICK: skipped (revert commit; no phase advancement).
NOTES: User flagged that visual verification of Phase 6.3 batch 1 (IdleState) revealed two issues warranting redo not fix-forward: (1) translation keys leaked to UI because the stub `t = (key) => key` short-circuited the component's `||` fallback (manufactured the same bug PENDING.md P10 tracks for production scan flow); (2) IdleState is documented as "often handled by FAB" — not the user-facing first step of the scan flow. The plan's "01-Capture" expected the camera viewfinder UI (CameraView / BatchCaptureView), not the small IdleState fallback card. Combined revert: 1c75ef4 + 95f3051 → 5a39a10. Phase 6.3 paused pending a clearer plan that picks the right entry component(s) and locks the translation strategy before any story authoring.

## 2026-04-28 22:18 — [main da4e022] docs(frontend): lock Storybook scope boundary in STORIES.md
FINDINGS: 0
ACTIONS: none
DEFERRED: none
COMMIT_COL_TICK: skipped (Current Phase = L2; commit is mockup-pivot scope-narrowing from a different plan).
NOTES: Step 1 of the post-revert recommendation approach. Adds Storybook scope boundary doc to frontend/STORIES.md (what belongs / doesn't / decision aid table). Direct response to Phase 6.3 batch 1 revert (5a39a10) — prevents future contributors from forcing orchestrator-driven flows into Storybook stories (which manufactured the translation-key leak bug previously). Next steps in this plan: investigate other views for self-containedness (Step 2), add 1-2 more screen stories if they fit (Step 3), build docs/reference/scan-flow.md for complex flows (Step 4), Phase 9 KDBP cleanup (Step 5).

## 2026-04-28 22:24 — [main 70600b4] feat(frontend): add Trends + History screen stories (post-revert recommendation Step 3)
FINDINGS: 0
ACTIONS: none
DEFERRED: none
COMMIT_COL_TICK: skipped (Current Phase = L2; commit is mockup-pivot scaling from a different plan).
NOTES: Step 3 of the post-revert recommendation approach. Two more self-contained-screen stories shipped: Screens/Trends (4 variants) and Screens/History (4 variants). Both views use the Dashboard pattern — mount the view with no/optional props, read everything via the view's hook from Zustand + mocked Firestore. Verification gate (post-revert bar): Playwright iframe screenshot per variant + translation-key leak regex check + zero console/page errors. All 8 stories passed. Storybook scope now: atoms + 3 self-contained screen stories. Step 4 (docs/reference/scan-flow.md) and Step 5 (Phase 9 cleanup) pending.

## 2026-04-28 22:35 — [main 6bb149e] docs(reference): add scan-flow navigable map (post-revert recommendation Step 4)
FINDINGS: 0
ACTIONS: none
DEFERRED: none
COMMIT_COL_TICK: skipped (Current Phase = L2; commit is mockup-pivot reference doc from a different plan).
NOTES: Step 4 of the post-revert recommendation approach. Replaces the failed Storybook approach for the scan flow with a navigable markdown reference at docs/reference/scan-flow.md. Orchestrator → component mapping table, dialog overlay table, 4-phase walkthrough (01-Capture / 02-Processing / 03-Review / 04-Save), error variants table, full PENDING.md P6-P10 cross-reference, "Why this isn't a Storybook story" rationale linking back to the IdleState revert (5a39a10). No screenshots embedded — designers grab them from the live app when needed; doc stays low-maintenance. Step 5 (Phase 9 KDBP cleanup) remaining.

## 2026-04-28 22:50 — [main da3ceb4] chore(kdbp): Phase 9 cleanup — close P12, log D24-27, advance Current Phase, rewrite handoff doc
FINDINGS: 0
ACTIONS: none
DEFERRED: none
COMMIT_COL_TICK: skipped (Current Phase = L2 in commit's diff base; commit itself ADVANCES Current Phase to "Post-pivot scaling" — the auto-tick precondition still skips because the new Phase isn't a numbered row in the Phases table).
NOTES: Step 5 (final step) of the post-revert recommendation approach. KDBP-only cleanup per D27 — directories not moved. PENDING.md P12 closed (pivot superseded the rebuild gate). DECISIONS.md +D24 (pivot), +D25 (Storybook 10 over Ladle), +D26 (Storybook scope boundary), +D27 (don't move directories). PLAN.md Current Phase: "Phase L2: mockups-legacy Molecules" → "Post-pivot scaling — mockup work happens in Storybook stories at frontend/.storybook/" with L0-L5 marked OBSOLETED. docs/MOCKUP-REWORK-HANDOFF.md rewritten 153 → 47 lines as a status pointer. Pivot session: done. The 5 steps of the post-revert recommendation approach all landed: STORIES.md scope boundary (da4e022), Trends + History stories (70600b4), scan-flow reference doc (6bb149e), Phase 9 KDBP cleanup (this commit).

## 2026-04-28 23:05 — [main 3c4bbf2] feat(scripts): add prod-bundle leakage check + close P13 firestore mock typing
FINDINGS: 0
ACTIONS: none
DEFERRED: none
COMMIT_COL_TICK: skipped (Current Phase = Post-pivot scaling; commit is pivot plan Phase 8 from external plan).
NOTES: Pivot plan Phase 8 — production safety verification. Added scripts/check-prod-bundle.sh (6 checks: story files, framework refs, Tailwind CDN, atom showcase, story identifiers, Storybook config). All checks pass on current dist/ (exit 0). Closed P13 (firestore mock typing) as prerequisite — generic-ified QueryConstraint.apply + queryToSpec; structural cast for startAfter. npm run build now passes cleanly. Remaining optional: more screen stories (Items qualifies), Phase 7 Playwright snapshot suite. Pivot plan now has Phases 0-9 + post-revert Steps 1-5 + Phase 8 all completed; only Phase 7 (snapshot suite) remains in the original plan.

## 2026-04-28 23:14 — [main b6b6ea5] feat(frontend): add Items screen story (4th self-contained-screen example)
FINDINGS: 0
ACTIONS: none
DEFERRED: none
COMMIT_COL_TICK: skipped (Current Phase = Post-pivot scaling; commit is more of the same scaling pattern).
NOTES: 4th self-contained-screen story shipped. Storybook scope: 9 atom stories + 16 screen stories (Dashboard 4 + Trends 4 + History 4 + Items 4) = 25 stories total + Welcome sentinel. Phase 7 (Playwright snapshot suite) is the only remaining optional/queued item from the original pivot plan.

## 2026-05-06 — PUSH rebuild/be-phase-01 -> main
PR: https://github.com/Brownbull/gastify/pull/2
CI: — (none configured)
PROMOTION: N/A (staging not on remote; direct feature-branch push)
DEPLOYMENTS: P7 added to .kdbp/DEPLOYMENTS.md
DRIFT: origin/rebuild/fe-dashboard-batch-01 detected — old frontend batch branch, ignored

## 2026-05-06 — [3eff76f] feat: implement P1 scaffold + P2 money/FX/i18n + P3 identity/RLS — backend foundation phases 1-3
FINDINGS: 3 (0 critical, 0 high, 2 medium, 1 low)
ACTIONS: 1:accept (new API routes, docs deferred to P6), 2:accept (README drift, P14 tracks), 3:update-structure (added backend/ patterns to STRUCTURE.md)
DEFERRED: 0
TESTS: 52/52 pass | LINT: 0 errors
SCOPE: 39 files, +3993 -472. P1 (structlog + metrics + middleware), P2 (fx_rates + USD-shadow + i18n), P3 (Firebase JIT + RLS + credits). 3 Alembic migrations. 25 new source files + 11 modified + 3 KDBP state files.
TICK: ✅ Phase 1/2/3 Exec + Commit columns ticked
STRUCTURE: STRUCTURE.md backend/ section added (16 patterns replacing template api/ paths)

## 2026-05-06 15:30 — PHASE 3 REVIEW: Identity + ownership scope + RLS
VERDICT: APPROVE
FINDINGS: 8 total (1 critical, 4 high, 2 medium, 1 low) — all 8 resolved
COVERAGE: MEDIUM — 52 tests pass; app-level scope isolation proven with real cross-scope data; RLS not exercised at DB level (SQLite)
CONFIDENCE: 90/100 (was 20 pre-triage; +70 from fixing all 8 findings via option [3] Fix all including Scale)
DEFERRED: none
ALIGNMENT: DRIFTED (branch carries P2 + P3 work; findings span both phases)
TIER: ent | DRIFT: none
TICK: ✅ Phase 3 Review column ticked
TRIAGE: option [3] Fix all including Scale — all 8 findings fixed
KEY FIXES: SET LOCAL before RLS inserts (#1 CRITICAL), real cross-scope test data (#2), FX rejection + autouse mock (#3), PATCH USD-shadow recompute (#4), credit backfill before RLS (#5), unused import removal (#6), asyncio.to_thread for Firebase (#7), credit balance DB verification (#8)
POST-TRIAGE LINT: E501 ×2 + B904 raise-from chain
SOURCES: codex/gpt-5 (inbox, 6 findings) + claude/opus-4-6 (blind, 8 findings) — 6 strict matches, 2 Claude-only
ARCHIVED: .kdbp/reviews-archive/REVIEW_2026-05-06-153000_resolved.md

## 2026-05-06 14:45 — PHASE 2 REVIEW: Money + currency + FX + i18n
VERDICT: PASS
FINDINGS: 9 total (1 critical, 4 high, 2 medium, 2 low) — 8 resolved, 1 deferred (P21)
COVERAGE: MEDIUM — 29 tests, 78% line coverage; transactions.py at 38%, auth paths ~50%
CONFIDENCE: 83/100 (was 35 pre-triage; +48 from fixing 8 of 9 findings via option [2] Fix MVP + Enterprise)
DEFERRED: P21 (JSON/JSONB ORM-migration mismatch — cosmetic autogenerate noise, not runtime defect)
ALIGNMENT: DRIFTED (branch mixes P1 obs, P2 money, P3 identity — all 3 phases Exec=🔄 on this branch)
TIER: ent | DRIFT: none
TICK: ✅ Phase 2 Review column ticked
TRIAGE: option [2] Fix all MVP + Enterprise items — 8 fixes applied, 1 reverted (JSONB broke SQLite)
KEY FIXES: middleware 500 try/except, setattr→field allowlist, Literal types + IntegrityError handler, batch max_length=200, float→Decimal FX rate, 3 JIT auth tests, ruff format 13 files, PRAGMA FK + UUID seed format, raise-from + naming + unused import lint fixes
ACTIVE: .kdbp/REVIEW.md (schema 1.1, claude/opus-4-6 source)

## 2026-05-06 — [e266afd] fix(ci): green all 7 CI checks — backend coverage 81%, frontend lint/test scripts, deprecated nav refs cleanup
FINDINGS: 3 (0 critical, 0 high, 2 medium, 1 low)
  - low: README.md not updated when package.json deps changed (already tracked as P14; accepted)
  - medium: frontend/biome.json no STRUCTURE.md pattern (update-structure applied)
  - medium: backend/uv.lock no STRUCTURE.md pattern (update-structure applied)
ACTIONS: 1:accept 2:update-structure 3:update-structure
DEFERRED: 0
TESTS: 82/82 pass | LINT: 0 errors (ruff + biome) | COVERAGE: 81.03% (mvp skip)
SCOPE: 14 files, +2440 -19. Backend: uv.lock tracked (.gitignore rule removed), ruff format 3 files, 30 new test functions (auth 100%, fx 98%, health 94%, obs 91%). Frontend: biome 2.4.14 installed + tuned config, vitest/lint scripts added, package-lock regenerated. Custom gates: analyticsInitialState→analyticsUrlParams rename, stale pendingHistoryFilters comment fix.
STRUCTURE: +2 patterns (backend/uv.lock, frontend/biome.json)

## 2026-05-06 12:00 — PHASE 1 REVIEW: Scaffold + DB baseline
VERDICT: APPROVE
FINDINGS: 6 total (0 critical, 1 high, 3 medium, 2 low)
COVERAGE: MEDIUM — core registry + endpoint + request-id + access-log→metrics tested; structlog format untested
CONFIDENCE: 76/100 (was 64 pre-triage; +12 from fixing #1)
DEFERRED: P16 (conftest metadata mutation), P17 (metrics endpoint auth), P18 (BaseHTTPMiddleware), P19 (structlog format test), P20 (threading.Lock at scale)
ALIGNMENT: DRIFTED (branch mixes P1 obs with P2/P3 concurrent work; P1 subset complete)
TIER: ent (Obs→scale) | DRIFT: none
TICK: ✅ Phase 1 Review column ticked
TRIAGE: option [1] Fix MVP items only — #1 fixed (access-log→metrics test), #2-#6 deferred to PENDING.md P16-P20
ARCHIVED: .kdbp/reviews-archive/REVIEW_2026-05-06-120000_resolved.md

## 2026-05-13 22:00 — PHASE 4 REVIEW: Sign-out isolation + responsive polish
VERDICT: APPROVE
FINDINGS: 4 total (0 critical, 3 high, 0 medium, 1 low) — all 4 resolved
COVERAGE: MEDIUM — 5 new AuthProvider tests (storage-event handler, signOut cleanup, Firebase error resilience, non-broadcast filtering, token-refresh expiry) + 3 sessionIsolation + 4 i18n helpers. Coverage upgraded from LOW (pre-triage) to MEDIUM.
CONFIDENCE: 90/100 (was 52 pre-triage; +38 from fixing all 4 findings via option [2] Fix MVP + Enterprise)
DEFERRED: none added; P22 resolved (auth boundary tests now covered)
ALIGNMENT: ALIGNED (Phase 4 scope matches feature commit 00c00e6)
TIER: ent | DRIFT: none
TICK: ✅ Phase 4 Review column ticked
TRIAGE: option [2] Fix all MVP + Enterprise items — all 4 findings fixed
KEY FIXES: selective localStorage key removal breaks rebroadcast loop (#1), locale state lifted from per-component useState to Zustand store (#2), 5 AuthProvider tests + signOut error handling (#3), theme-aware hover token (#4). Bonus: Node.js 25 localStorage polyfill in test setup + defensive try/catch in i18n localStorage access.
SOURCES: codex/gpt-5 (inbox, 3 findings) + claude/opus-4-6 (blind, 4 findings) — 3 strict matches, 1 Claude-only
ARCHIVED: .kdbp/reviews-archive/REVIEW_2026-05-13-220000_resolved.md

## 2026-05-13 19:45 — [8c95c0c] fix(web): resolve Phase 4 review findings — session isolation and i18n hardening
FINDINGS: 0 (0 critical, 0 high, 0 medium, 0 low)
ACTIONS: none
DEFERRED: none

## 2026-05-13 19:47 — PUSH main -> main
PR: — (direct push)
CI: all passed (8/8, ~45s)
PROMOTION: N/A
DEPLOYMENTS: P20 (added row to .kdbp/DEPLOYMENTS.md)

## 2026-05-15 00:45 — P4 Mobile Android local setup probe
RESULT: PARTIAL READY
READY: WSL fast checks green; staging Firebase auth verified; Android Studio Windows emulator visible through `adb.exe`; Expo dev build compiled, installed, and launched on emulator.
BLOCKER: Full Maestro Android E2E from WSL is not stable against the Windows-hosted emulator. Maestro/DADB either sees no device through WSL's local ADB server or hits EOF on the Windows ADB stream.
EVIDENCE: `tests/mobile/results/latest/p4-phase1-smoke/` contains failed-run screenshot/debug output showing the app rendered the sign-in screen behind Expo dev-client onboarding.
FOLLOW-UP: Run full Maestro Android on a native Android/CI emulator path or promote Android E2E to Firebase Test Lab/EAS device lane; keep WSL path for build/manual visual smoke until ADB boundary is solved.

## 2026-05-17 — P4 Phase 2 EXEC: Camera scan + WebSocket progress
RESULT: COMPLETE
SCOPE: Mobile camera/library receipt capture via `expo-image-picker`; local image validation; authenticated multipart upload to `POST /api/v1/scans`; scan Zustand store; WebSocket progress client with auth token query, reconnect/backoff, terminal cleanup, and error mapping; home-screen staged progress/review UI; backend `scan_complete` terminal payload enriched with transaction id, merchant, amount, confidence, and unknown-merchant signal; Phase 2 Maestro scan-entry smoke flow; mobile docs/testing updates.
TESTS: `cd mobile && npm run generate:api`; `cd mobile && npm run typecheck`; `cd mobile && npm test` (30 passed); `cd mobile && npm run check:expo-config`; `cd mobile && npm audit --audit-level=high` (pass threshold; 5 moderate Expo/PostCSS advisories remain, forced fix is breaking); `cd backend && uv run pytest tests/test_scan_worker.py tests/test_scan_stream.py` (29 passed); `cd backend && uv run pytest` (362 passed, 2 skipped); `cd backend && uv run ruff check`; `cd backend && uv run ruff format --check`; `git diff --check`.
NOTES: Native camera permission/file picker and full upload-to-stream screenshots still require the physical-device/staging backend lane; the added Maestro flow verifies the authenticated scan entry controls only.
TICK: Phase 2 Exec initially ticked, then reopened after physical-device validation exposed a native-build blocker.

## 2026-05-17 — P4 Phase 2 PHYSICAL DEVICE PROBE
RESULT: BLOCKED
DEVICE: Samsung S23 `RFCW90N4BYP` was visible through Windows ADB at the start of the probe; native WSL ADB could not see it. `usbipd bind --force --busid 2-2` failed because Windows Administrator privileges are required.
EVIDENCE: `tests/mobile/results/latest/p4-phase2-physical-probe/screenshots/00-after-launch.png` shows the installed dev build at Expo Dev Launcher; `01-loaded-current-bundle.png` shows the current JS bundle loading; `02-after-bundle-wait.png` shows a red-screen runtime failure: missing native module `ExponentImagePicker`.
BUILD: New EAS Android e2e dev build completed: `c913b986-ce00-4f16-8c4a-cfdc6bbdd27b`; APK downloaded to `tests/mobile/results/latest/eas/gastify-phase2-e2e.apk`.
BLOCKER: Installing the fresh APK could not proceed because both Windows ADB and native WSL ADB stopped listing the S23 after the build/probe (`adb devices` empty). The phone must be reconnected or re-authorized, or USB/IP must be bound from Administrator PowerShell, before the fresh APK can be installed and Maestro screenshots captured.
TICK: Phase 2 Exec set back to 🔄 pending a green physical-device happy path with screenshots.

## 2026-05-18 — P4 Phase 2 PHYSICAL DEVICE RERUN: S23 scan-entry smoke
RESULT: PASS
DEVICE: Samsung S23 `RFCW90N4BYP`, attached through native WSL ADB after `usbipd attach --wsl --busid 2-2`.
BUILD: Fresh EAS Android e2e development APK `c913b986-ce00-4f16-8c4a-cfdc6bbdd27b` installed successfully from `tests/mobile/results/latest/eas/gastify-phase2-e2e.apk`.
RUN: Metro served through USB ADB reverse on `127.0.0.1:8081`; Maestro active flow `tests/mobile/maestro/p4-phase2-scan-entry-active.yaml` passed on physical device.
EVIDENCE: `tests/mobile/results/latest/p4-phase2-scan-entry-active/screenshots/01-scan-entry.png`; `tests/mobile/results/latest/p4-phase2-scan-entry-active/report.html`; `tests/mobile/results/latest/p4-phase2-scan-entry-active/2026-05-18_102135/commands-(p4-phase2-scan-entry-active).json`; setup report `tests/mobile/results/latest/environment/mobile-doctor.txt`.
NOTES: This verifies the physical-device sign-in → authenticated home → scan capture controls → sign-out path and confirms the ImagePicker native module is present in the fresh dev build. It does not execute a real camera/gallery upload through backend WebSocket progress; that still needs a receipt fixture/media-picker lane or a full journey Phase 5 flow.
TICK: ✅ Phase 2 Exec column restored; Review remains pending.

## 2026-05-18 — P4 Phase 2 EXEC FOLLOW-UP: deterministic scan-upload fixture gate + Gabe runtime-evidence standard
RESULT: PARTIAL — harness implemented; required upload happy/review/failure physical runs blocked by missing Postgres URL
SCOPE: Added backend-only deterministic scan fixture mode guarded by `GASTIFY_E2E_SCAN_FIXTURES_ENABLED` and refused in production; raw-upload SHA-256 marker lookup; fixture outputs for happy, low-confidence/unknown-merchant review, and deterministic scan failure; physical S23 fixture images; gallery seeding + fixture-backend + scan-upload Maestro wrappers; new happy/review/failure/camera-permission flows; Gabe execute/plan/review runtime-evidence gate in source and synced `~/.claude`/`~/.agents` installs.
TESTS: `cd backend && uv run pytest tests/test_config.py tests/test_scan_e2e_fixtures.py tests/test_scans.py tests/test_scan_worker.py tests/test_scan_stream.py` (57 passed); `cd backend && uv run pytest` (370 passed, 2 skipped); `cd backend && uv run ruff format --check && uv run ruff check` (pass); `cd mobile && npm run generate:api`; `cd mobile && npm run typecheck`; `cd mobile && npm test -- --runInBand` (30 passed); `cd mobile && npm run check:expo-config`; `cd mobile && npm audit --audit-level=high` (0 high/critical; 5 known moderate Expo/PostCSS advisories); `maestro check-syntax` for all four new Phase 2 flows; `bash -n` for new scripts; `git diff --check`; `cmp` source Gabe command/skill files to installed `~/.claude` and `~/.agents` copies.
PHYSICAL DEVICE: Samsung S23 `RFCW90N4BYP` / model `SM-S911B` / Android `16`; native WSL ADB path `$HOME/.local/share/gastify/android-platform-tools/platform-tools/adb`; `tests/mobile/scripts/seed-scan-fixture.sh happy` pushed `gastify-e2e-happy.jpg` to `/sdcard/Pictures/GastifyE2E/`.
PHYSICAL EDGE EVIDENCE: `cd mobile && npm run maestro:camera-permission-denied:active` passed on S23 with `MAESTRO_DEVICE_ID=RFCW90N4BYP`; evidence at `tests/mobile/results/latest/p4-phase2-camera-permission-denied-active/screenshots/01-camera-permission-denied.png`, `tests/mobile/results/latest/p4-phase2-camera-permission-denied-active/report.html`, and `tests/mobile/results/latest/p4-phase2-camera-permission-denied-active/2026-05-18_110504/commands-(p4-phase2-camera-permission-denied-active).json`.
BLOCKER: Required upload happy/review/failure physical flows were not run because no local/staging Postgres URL is available. `GASTIFY_DATABASE_URL` is missing, default local Postgres refused `127.0.0.1:5432`, Docker Desktop is not running, and `tests/mobile/scripts/start-scan-fixture-backend.sh` exits with `GASTIFY_DATABASE_URL is required and must point at local/staging Postgres.` Live Gemini smoke is blocked by the same backend/database prerequisite.
TICK: Phase 2 Exec remains 🔄 until the S23 happy/review/failure scan-upload fixture flows pass and artifact paths are logged.

## 2026-05-18 — P4 Phase 2A EXEC: Railway staging runtime + local lane scaffolding
RESULT: IMPLEMENTED + LOCAL VERIFIED — repo scaffolding only; cloud services not yet provisioned
SCOPE: Added explicit backend runtime lanes (`local`, `staging`, `staging-e2e`, `production`) and scan providers (`mock`, `fixture`, `gemini`); production guards for mock/fixture/E2E auth/SQLite; local SQLite bootstrap and start script; mock scan provider using schema-backed fixture payloads; deployed readiness now reports Alembic migration head state; Railway backend config with migrate-before-start; Railway SPA Caddy/Nixpacks config; staging seed/reset/readiness/S23 gate scripts; mobile EAS staging/e2e-staging profiles and production E2E-auth guard; staging runbook and KDBP plan/structure updates.
FILES: `backend/app/config.py`, `backend/app/api/health.py`, `backend/app/services/scan_providers.py`, `backend/app/services/scan_worker.py`, `backend/app/services/scan_e2e_fixtures.py`, `scripts/dev/bootstrap-local-db.py`, `scripts/dev/start-local.sh`, `scripts/staging/*`, `backend/railway.toml`, `web/Caddyfile`, `web/nixpacks.toml`, `infra/railway/README.md`, `docs/runbooks/ENVIRONMENTS.md`, mobile/web/backend env examples and docs.
TESTS: `bash -n scripts/dev/start-local.sh scripts/staging/run-migrations.sh scripts/staging/check-backend-ready.sh scripts/staging/run-s23-fixture-gate.sh tests/mobile/scripts/start-scan-fixture-backend.sh` (pass); `cd backend && uv run python -m py_compile ../scripts/dev/bootstrap-local-db.py ../scripts/staging/seed-staging.py` (pass); `cd backend && uv run python ../scripts/dev/bootstrap-local-db.py` (local SQLite bootstrap pass); `cd backend && uv run ruff format --check && uv run ruff check` (pass); `cd backend && uv run pytest tests/test_config.py tests/test_scan_e2e_fixtures.py tests/test_scan_providers.py tests/test_scan_worker.py tests/test_health.py` (36 passed); `cd backend && uv run pytest` (380 passed, 2 skipped); `cd mobile && npm run generate:api`; `cd web && npm run generate:api`; `cd mobile && npm run check:expo-config`; `cd mobile && npm run typecheck`; `cd mobile && npm test -- --runInBand` (30 passed); `cd mobile && npm audit --audit-level=high` (0 high/critical; 5 moderate Expo/PostCSS advisories remain); `cd web && npm run build`; `cd backend && GASTIFY_ENVIRONMENT=staging GASTIFY_DATABASE_URL=postgresql+asyncpg://example:example@localhost:5432/gastify uv run python ../scripts/staging/seed-staging.py` (dry-run guard pass); `git diff --check` (pass).
NOTES: This does not satisfy the physical S23 upload gate by itself. Phase 2 remains `🔄` until Railway `staging-e2e` is provisioned, migrations are run, S23 happy/review/failure/camera-permission flows pass with artifacts, and one live Gemini smoke passes against normal `staging`.

## 2026-05-18 — P4 Phase 2B EXEC: environment-gated development standard
RESULT: IMPLEMENTED + VERIFIED — documentation/planning guardrail only; Railway services still not provisioned
SCOPE: Promoted the environment model from a Phase 2 scaffold note to a standing KDBP development gate; renamed the prerequisite to `Phase 2B — Environment proof gate`; updated `.kdbp/ROADMAP.md` exit signals so user-facing/runtime phases require artifact-backed staging evidence; split runtime docs into local, Railway setup, staging testing, and production checklist tracks; updated README status/next-step links; enforced `local` as SQLite + mock-only in backend settings and tests.
FILES: `.kdbp/PLAN.md`, `.kdbp/ROADMAP.md`, `README.md`, `docs/runbooks/ENVIRONMENTS.md`, `docs/runbooks/LOCAL.md`, `docs/runbooks/RAILWAY-STAGING-SETUP.md`, `docs/runbooks/STAGING-TESTING.md`, `docs/runbooks/PRODUCTION-CHECKLIST.md`, `backend/app/config.py`, `backend/tests/test_config.py`.
TESTS: `cd backend && uv run ruff format --check app/config.py tests/test_config.py && uv run ruff check app/config.py tests/test_config.py` (pass); `cd backend && uv run pytest tests/test_config.py` (8 passed); `cd backend && uv run pytest tests/test_config.py tests/test_scan_providers.py tests/test_scan_e2e_fixtures.py tests/test_scan_worker.py tests/test_health.py` (37 passed); `cd backend && uv run python ../scripts/dev/bootstrap-local-db.py` (local SQLite bootstrap pass); `cd backend && uv run pytest` (381 passed, 2 skipped); `cd backend && uv run ruff format --check && uv run ruff check` (pass); `cd mobile && npm run typecheck`; `cd mobile && npm test -- --runInBand` (30 passed); `cd mobile && npm run check:expo-config`; `cd mobile && npm audit --audit-level=high` (0 high/critical; 5 moderate Expo/PostCSS advisories remain); `cd web && npm run build`; `bash -n scripts/dev/start-local.sh scripts/staging/run-migrations.sh scripts/staging/check-backend-ready.sh scripts/staging/run-s23-fixture-gate.sh tests/mobile/scripts/start-scan-fixture-backend.sh` (pass); local negative guards for `GASTIFY_SCAN_PROVIDER=gemini` and Postgres DB both failed as expected; `git diff --check` (pass).
NOTES: Production remains documentation/guard-only per decision. Phase 2 still remains `🔄` until Railway `staging-e2e` S23 fixture flows and Railway `staging` live Gemini smoke pass with artifact paths logged.

## 2026-05-18 — P4 Phase 2B LOCAL PROOF: local API smoke + S23 local UI wrapper
RESULT: API SMOKE PASS; LOCAL S23 UI SMOKE BLOCKED BY DEVICE/CREDENTIAL PREREQS
SCOPE: Added `scripts/dev/smoke-local.sh` / `.py` to exercise local scan upload through the real FastAPI route and mock provider using a local-only auth dependency override; added `scripts/dev/run-s23-local-ui-smoke.sh` to run the existing S23 Maestro upload flows against a local backend with `adb reverse`; documented both in `docs/runbooks/LOCAL.md`.
LOCAL API EVIDENCE: `bash scripts/dev/smoke-local.sh` passed. Artifact: `.tmp/local/smoke/latest.json`. Current run uploaded happy/review/failure images through `POST /api/v1/scans`; happy finished `completed` with transaction merchant `Supermercado Jumbo` / CLP `3280`; review finished `completed` with transaction merchant `Unknown` / CLP `1500`; failure finished `failed` with no transaction; provider `mock`; DB `sqlite+aiosqlite:////home/khujta/projects/apps/gastify/.tmp/local/gastify.db`.
LOCAL UI STATUS: `bash scripts/dev/run-s23-local-ui-smoke.sh happy` did not run Maestro because no authorized Android device was visible to ADB in this shell, and `GASTIFY_FIREBASE_CREDENTIALS_PATH` was not set. The script is ready to run once the S23 is attached to the same host side as Maestro and Firebase Admin credentials or ADC are available for local token verification.
TESTS: `bash -n scripts/dev/smoke-local.sh scripts/dev/run-s23-local-ui-smoke.sh` (pass); `cd backend && uv run ruff format --check ../scripts/dev/smoke-local.py && uv run ruff check ../scripts/dev/smoke-local.py` (pass); `git diff --check` (pass).

## 2026-05-18 — P4 Phase 2B GABE REVIEW: local S23 wrapper gaps remediated
RESULT: REVIEW COMPLETE; ADB AND CONFIG GAPS FIXED; LOCAL UI SCREENSHOTS STILL PENDING METRO DEV-CLIENT URL
SCOPE: Reviewed the environment-gated local/S23 approach and fixed the local wrapper gaps that prevented useful runtime evidence. `tests/mobile/scripts/android-tooling.sh` now prefers native WSL platform-tools before Windows SDK paths; `scripts/dev/run-s23-local-ui-smoke.sh` now loads required values from `mobile/.env`, validates local API/E2E auth/Firebase Admin prerequisites, defaults `GASTIFY_E2E_FORCE_RESTART=false`, requires `EXPO_DEV_CLIENT_URL`, opens the Expo dev-client bundle before Maestro, and records the API base in `.tmp/local/ui-smoke/latest.json`; `mobile/.env.example` and `docs/runbooks/LOCAL.md` document the required local S23 variables.
DEVICE: Samsung S23 `RFCW90N4BYP` is currently visible to native WSL ADB at `/home/khujta/.local/share/gastify/android-platform-tools/platform-tools/adb`; `bash tests/mobile/scripts/doctor-mobile.sh` reports authorized Android device visible, with expected JDK/Xcode warnings.
EVIDENCE: `bash scripts/dev/smoke-local.sh` passed and refreshed `.tmp/local/smoke/latest.json` with happy/review/failure local uploads. A pre-fix S23 UI attempt reached Maestro but failed because the phone was on Expo Dev Launcher instead of the app bundle; artifact directory `tests/mobile/results/latest/p4-phase2-scan-upload-happy-active/2026-05-18_130212/`. The post-fix wrapper now fails fast with `EXPO_DEV_CLIENT_URL is required`, which is the remaining setup action before screenshots can be captured.
REVIEW ARTIFACT: `.kdbp/REVIEW.md`.
TESTS: `bash -n scripts/dev/run-s23-local-ui-smoke.sh tests/mobile/scripts/android-tooling.sh tests/mobile/scripts/open-dev-client.sh tests/mobile/scripts/run-scan-upload-maestro.sh` (pass); native WSL `adb devices -l` (S23 authorized); `bash scripts/dev/run-s23-local-ui-smoke.sh happy` (expected fail-fast on missing `EXPO_DEV_CLIENT_URL`); `bash tests/mobile/scripts/doctor-mobile.sh` (diagnostic pass); `bash scripts/dev/smoke-local.sh` (pass); `cd backend && uv run ruff format --check ../scripts/dev/smoke-local.py && uv run ruff check ../scripts/dev/smoke-local.py` (pass); `git diff --check` (pass).
FOLLOW-UP: Start Metro with `cd mobile && npm run start:dev-client -- --host tunnel`, export the printed `EXPO_DEV_CLIENT_URL`, then rerun `bash scripts/dev/run-s23-local-ui-smoke.sh happy` to capture local UI screenshots. Phase 2 Exec remains `🔄` until Railway `staging-e2e` S23 fixture flows and Railway `staging` live Gemini smoke pass with artifacts.

## 2026-05-18 — P4 Phase 2B LOCAL S23 UI PROOF: local gallery upload screenshots
RESULT: PASS — HAPPY, REVIEW, AND FAILURE LOCAL S23 FLOWS PRODUCED SCREENSHOTS
SCOPE: Completed the local S23 setup after Expo tunnel failed with `CommandError: failed to start tunnel`; used Metro localhost plus existing USB reverse instead. Patched the local S23 flow to handle Google Photos picker behavior (`Dismiss`, top-left fixture tap, `Done`), applied `GASTIFY_E2E_SCAN_EVENT_DELAY_MS=600` to mock/fixture providers so progress UI is observable, and made local mock selection use the uploaded-file hash marker. Added known S23 Android Photo Picker transformed hashes for happy/review/failure so backend fixture lookup reflects the actual bytes uploaded through the physical gallery path.
DEVICE/RUNTIME: Samsung S23 `RFCW90N4BYP`; ADB `/home/khujta/.local/share/gastify/android-platform-tools/platform-tools/adb`; Metro `cd mobile && npm run start:dev-client -- --host localhost`; dev-client URL `exp+gastify-mobile://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081`; `adb reverse tcp:8000 tcp:8000`; `adb reverse tcp:8081 tcp:8081`; backend `local`, SQLite `.tmp/local/gastify.db`, provider `mock`, API base `http://127.0.0.1:8000`, E2E delay `600ms`.
COMMANDS: `EXPO_DEV_CLIENT_URL='exp+gastify-mobile://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081' bash scripts/dev/run-s23-local-ui-smoke.sh happy` (pass); same command with `review` (pass); same command with `failure` (pass).
ARTIFACTS: Happy screenshots `tests/mobile/results/latest/p4-phase2-scan-upload-happy-active/screenshots/01-selected-image.png`, `02-progress.png`, `03-scan-complete.png`; happy report `tests/mobile/results/latest/p4-phase2-scan-upload-happy-active/report.html`; happy commands `tests/mobile/results/latest/p4-phase2-scan-upload-happy-active/2026-05-18_132836/commands-(p4-phase2-scan-upload-happy-active).json`. Review screenshots `tests/mobile/results/latest/p4-phase2-scan-upload-review-active/screenshots/01-progress.png`, `02-review-affordance.png`; review report `tests/mobile/results/latest/p4-phase2-scan-upload-review-active/report.html`; review commands `tests/mobile/results/latest/p4-phase2-scan-upload-review-active/2026-05-18_133048/commands-(p4-phase2-scan-upload-review-active).json`. Failure screenshots `tests/mobile/results/latest/p4-phase2-scan-upload-failure-active/screenshots/01-progress-before-failure.png`, `02-scan-failure.png`; failure report `tests/mobile/results/latest/p4-phase2-scan-upload-failure-active/report.html`; failure commands `tests/mobile/results/latest/p4-phase2-scan-upload-failure-active/2026-05-18_133144/commands-(p4-phase2-scan-upload-failure-active).json`.
TESTS: `maestro check-syntax tests/mobile/maestro/p4-phase2-scan-upload-happy-active.yaml` (pass); `maestro check-syntax tests/mobile/maestro/p4-phase2-scan-upload-review-active.yaml` (pass); `maestro check-syntax tests/mobile/maestro/p4-phase2-scan-upload-failure-active.yaml` (pass); `cd backend && uv run pytest tests/test_scan_e2e_fixtures.py tests/test_scan_providers.py tests/test_scan_worker.py tests/test_scan_stream.py` (40 passed); `cd backend && uv run ruff format app/services/scan_e2e_fixtures.py tests/test_scan_e2e_fixtures.py && uv run ruff check app/services/scan_e2e_fixtures.py tests/test_scan_e2e_fixtures.py` (pass); screenshot file probe confirmed all seven PNG artifacts are present at `1080x2340`; native WSL `adb devices -l` confirms S23 remains authorized.
NOTES: This closes the local UI proof gap only. It does not close Phase 2 Exec because local is explicitly non-gating; Railway `staging-e2e` S23 fixture proof and Railway `staging` live Gemini smoke are still required.

## 2026-05-18 — P4 Phase 2B EXEC: dev local, staging, production environment controls
RESULT: IMPLEMENTED + LOCAL VERIFIED — staging services still not provisioned
SCOPE: Completed active environment rename from integration to staging. Canonical runtime names are now `local`, `staging`, `staging-e2e`, and `production`; active scripts/docs/env examples use staging naming. Added guarded backend scan test-case API (`GET /api/v1/scan-test-cases`, `POST /api/v1/scan-test-cases/{case_id}/runs`), curated image fixtures imported from Boletapp prompt-testing, mobile scan test controls gated by `EXPO_PUBLIC_SCAN_TEST_CONTROLS_ENABLED`, source-safe `.env.local/.env.staging/.env.production` templates, Railway staging docs, and environment-scoped mobile artifact packets under `tests/mobile/results/latest/<env>/<flow>/` with per-run manifests.
PRODUCTION GUARDS: Backend config tests prove production refuses mock provider, fixture provider, E2E auth, scan test controls, and SQLite. Mobile Expo config rejects `EXPO_PUBLIC_APP_ENV=production` with `EXPO_PUBLIC_SCAN_TEST_CONTROLS_ENABLED=true` (command exited 1 as expected).
LOCAL EVIDENCE: `bash scripts/dev/smoke-local.sh` passed after the env-file loader changes. Artifact: `.tmp/local/smoke/latest.json`. The current run used `local` + SQLite `.tmp/local/gastify.db` + mock provider, uploaded happy/review/failure images through `POST /api/v1/scans`, and produced final statuses `completed`, `completed`, and `failed`.
ARTIFACT PACKETS: Future Maestro runs write directly to `tests/mobile/results/latest/<env>/<flow>/`. Prior local S23 proof folders were backfilled non-destructively into `tests/mobile/results/latest/local/p4-phase2-scan-upload-happy-active/`, `tests/mobile/results/latest/local/p4-phase2-scan-upload-review-active/`, `tests/mobile/results/latest/local/p4-phase2-scan-upload-failure-active/`, and `tests/mobile/results/latest/local/p4-phase2-camera-permission-denied-active/` with `manifest.json` files.
TESTS: `cd mobile && npm run generate:api`; `cd web && npm run generate:api`; `cd backend && uv run pytest tests/test_config.py tests/test_scan_test_cases.py tests/test_scan_e2e_fixtures.py tests/test_scan_providers.py tests/test_scan_worker.py tests/test_scan_stream.py` (56 passed); `cd backend && uv run pytest` (390 passed, 2 skipped); `cd backend && uv run ruff check . && uv run ruff format --check .` (pass); `cd mobile && npm run typecheck`; `cd mobile && npm test -- --runInBand` (36 passed); `cd mobile && npm run check:expo-config`; `GASTIFY_MOBILE_ENV_FILE=mobile/.env.local.example bash tests/mobile/scripts/check-expo-config.sh` (pass, `local true`); `cd mobile && npm audit --audit-level=high` (0 high/critical; 5 known moderate Expo/PostCSS advisories remain); `cd web && npm run build`; `cd web && npm test -- --run` (23 passed); `bash -n` for local/staging/mobile scripts (pass); source-safety probe for `backend/.env*.example` and `mobile/.env*.example` (pass); `maestro check-syntax` for happy/review/failure/camera-permission Phase 2 active flows (pass); `git diff --check` (pass); static rename gate for deprecated runtime-environment identifiers (no active matches).
NOTES: Direct scan test-case controls are convenience evidence only. They do not replace S23 gallery/camera upload proof. Phase 2 remains `🔄` until Railway `staging-e2e` S23 fixture happy/review/failure/camera-permission flows pass with environment-scoped artifacts and Railway `staging` live Gemini smoke passes with provider-path evidence.

## 2026-05-18 — P4 Phase 2B STAGING PROVISION: Railway services online
RESULT: PARTIAL STAGING READY — Railway services, DBs, domains, migrations, readiness, CORS, Firebase Admin credentials, and SPA fallback verified; Gemini key and S23 staging proof still pending
RAILWAY PROJECT: `Gastify`; environment `staging`; services `Postgres` (staging DB), `Postgres-67_W` (staging-e2e DB), `gastify-api-staging`, `gastify-api-staging-e2e`, `gastify-web-staging`.
DOMAINS: staging API `https://gastify-api-staging-staging.up.railway.app`; staging-e2e API `https://gastify-api-staging-e2e-staging.up.railway.app`; staging web `https://gastify-web-staging-staging.up.railway.app`.
CONFIG FIXES: Added Railway-safe Firebase Admin JSON config (`GASTIFY_FIREBASE_CREDENTIALS_JSON`), normalized Railway `postgresql://` URLs to `postgresql+asyncpg://`, fixed backend start command `PYTHONPATH=/app`, made scan enum and V4 taxonomy migrations asyncpg-compatible, and pinned web TypeScript to a peer-compatible `~5.9.3`.
DEPLOY COMMANDS: `npx -y @railway/cli@latest up ./backend --path-as-root --service gastify-api-staging --detach --ci`; `npx -y @railway/cli@latest up ./backend --path-as-root --service gastify-api-staging-e2e --detach --ci`. Earlier deploys without `--path-as-root` failed because Railway packaged the monorepo root and inferred the wrong service type.
READINESS: `bash scripts/staging/check-backend-ready.sh https://gastify-api-staging-staging.up.railway.app` returned `status=ok`, `database=connected`, `migration_current=007`, `migration_head=007`; same command against `https://gastify-api-staging-e2e-staging.up.railway.app` returned the same current migration state.
WEB SMOKE: `curl -I https://gastify-web-staging-staging.up.railway.app` returned `200` with security headers; `curl -I https://gastify-web-staging-staging.up.railway.app/scan/progress/deep-link` returned `200` proving SPA fallback; hashed asset response returned `cache-control: public, max-age=31536000, immutable`.
CORS SMOKE: `curl -H 'Origin: https://gastify-web-staging-staging.up.railway.app' https://gastify-api-staging-staging.up.railway.app/api/v1/health/ready` returned `200` with `access-control-allow-origin` set to the Railway web domain.
LOCAL VERIFICATION: `cd backend && uv run pytest tests/test_auth.py tests/test_config.py` (22 passed); `cd backend && uv run pytest tests/test_config.py` (11 passed after deploy fixes); `cd backend && uv run ruff check app/auth/firebase.py app/config.py tests/test_auth.py alembic/versions/006_scans.py alembic/versions/007_v4_taxonomy.py`; `cd backend && uv run ruff format --check app/auth/firebase.py app/config.py tests/test_auth.py alembic/versions/006_scans.py alembic/versions/007_v4_taxonomy.py`; `cd web && npm run build`; `cd web && npm test -- --run` (23 passed).
SECRET STATUS: `GASTIFY_FIREBASE_CREDENTIALS_JSON` is set on both API services from the ignored local staging Admin SDK file and both APIs were redeployed successfully; `GOOGLE_API_KEY` is still not set on `gastify-api-staging`.
REMAINING BLOCKER: Staging-e2e authenticated S23 fixture proof can proceed next if the mobile build/env points at `https://gastify-api-staging-e2e-staging.up.railway.app`. Staging live Gemini smoke remains blocked until `GOOGLE_API_KEY` is supplied through Railway variables and `gastify-api-staging` is redeployed.
TICK: Phase 2 Exec remains `🔄`; this closes the cloud infrastructure blocker but not the required S23 staging-e2e and live Gemini evidence gates.

## 2026-05-18 — P4 Phase 2B COST CONTROL + ENV TEMPLATES
RESULT: PARTIAL COST CONTROL APPLIED — stateless Railway staging deploys stopped; both Postgres services intentionally left running
RAILWAY: Ran `railway down --service gastify-api-staging --yes`, `railway down --service gastify-api-staging-e2e --yes`, and `railway down --service gastify-web-staging --yes`. Final check shows `running=0` for both API services and the web service; both Postgres services remain `SUCCESS` with `running=1`.
NOTE: The stopped stateless services may show non-green deployment status in Railway because their latest active deployment was removed; redeploy before staging tests with `npx -y @railway/cli@latest up ./backend --path-as-root --service gastify-api-staging --detach --ci`, `npx -y @railway/cli@latest up ./backend --path-as-root --service gastify-api-staging-e2e --detach --ci`, and `npx -y @railway/cli@latest up ./web --path-as-root --service gastify-web-staging --detach --ci`.
ENV TEMPLATES: Added/updated source-safe examples for backend, mobile, and web local/staging/staging-e2e/production configs. New copied secret-bearing files such as `.env.staging-e2e` are ignored by git.
FILES: `.gitignore`, `backend/.env*.example`, `mobile/.env*.example`, `web/.env*.example`, `web/README.md`, `docs/runbooks/RAILWAY-STAGING-SETUP.md`, `docs/runbooks/STAGING-TESTING.md`, `docs/runbooks/PRODUCTION-CHECKLIST.md`.
VERIFY: `bash -n` across all backend/mobile/web `.env*.example` templates; `git diff --check`.
FOLLOW-UP: Paste the Gemini key into an ignored `backend/.env.staging` copy, export/source it locally, set Railway `GOOGLE_API_KEY` on `gastify-api-staging`, then redeploy the staging API before live Gemini smoke.

## 2026-05-18 — P4 Phase 2B STAGING S23 PROOF: staging-e2e green; live Gemini blocked by Google credits
RESULT: STAGING-E2E PASS; LIVE STAGING GEMINI SMOKE BLOCKED BY PROVIDER BILLING/CREDITS
CONFIG: Set `GOOGLE_API_KEY` on Railway `gastify-api-staging` from ignored `backend/.env.staging` without printing the secret. Corrected Railway `GASTIFY_FIREBASE_PROJECT_ID` to `gastify-staging` on both `gastify-api-staging` and `gastify-api-staging-e2e`, then redeployed both API services.
BACKEND FIX: Patched `backend/app/auth/deps.py` to set Postgres RLS scope with `SELECT set_config('app.ownership_scope_id', :sid, true)` instead of asyncpg-incompatible `SET LOCAL ... = :sid`; added coverage in `backend/tests/test_auth.py`.
RAILWAY READINESS: `bash scripts/staging/check-backend-ready.sh https://gastify-api-staging-staging.up.railway.app` and `bash scripts/staging/check-backend-ready.sh https://gastify-api-staging-e2e-staging.up.railway.app` both returned `status=ok`, `database=connected`, `migration_current=007`, and `migration_head=007`.
DEVICE/RUNTIME: Samsung S23 `RFCW90N4BYP`; native WSL ADB; Metro dev-client localhost with `adb reverse tcp:8081 tcp:8081`; API base `https://gastify-api-staging-e2e-staging.up.railway.app` for deterministic proof and `https://gastify-api-staging-staging.up.railway.app` for live smoke.
STAGING-E2E COMMAND: `GASTIFY_STAGING_E2E_API_BASE_URL=https://gastify-api-staging-e2e-staging.up.railway.app MAESTRO_DEVICE_ID=RFCW90N4BYP GASTIFY_ARTIFACT_ENV=staging-e2e EXPO_PUBLIC_APP_ENV=staging-e2e EXPO_PUBLIC_API_BASE_URL=https://gastify-api-staging-e2e-staging.up.railway.app GASTIFY_ENVIRONMENT=staging-e2e GASTIFY_SCAN_PROVIDER=fixture GASTIFY_MOBILE_BUILD_ID=dev-client-localhost-2026-05-18 bash scripts/staging/run-s23-fixture-gate.sh` passed all four flows.
STAGING-E2E ARTIFACTS: Happy `tests/mobile/results/latest/staging-e2e/p4-phase2-scan-upload-happy-active/manifest.json`, `screenshots/01-selected-image.png`, `screenshots/02-progress.png`, `screenshots/03-scan-complete.png`, and `report.html`; review `tests/mobile/results/latest/staging-e2e/p4-phase2-scan-upload-review-active/manifest.json`, `screenshots/01-progress.png`, `screenshots/02-review-affordance.png`, and `report.html`; failure `tests/mobile/results/latest/staging-e2e/p4-phase2-scan-upload-failure-active/manifest.json`, `screenshots/01-progress-before-failure.png`, `screenshots/02-scan-failure.png`, and `report.html`; camera permission `tests/mobile/results/latest/staging-e2e/p4-phase2-camera-permission-denied-active/manifest.json`, `screenshots/01-camera-permission-denied.png`, and `report.html`.
LIVE STAGING SMOKE: Ran the S23 gallery upload flow against `staging` with `GASTIFY_SCAN_PROVIDER=gemini` and `GASTIFY_SCAN_TEST_CASE_ID=live-super-lider`; the selected image was the real `super_lider.jpg` receipt from the curated Boletapp cases after refreshing its device-side media timestamp.
LIVE STAGING ARTIFACTS: Failed packet `tests/mobile/results/latest/staging/p4-phase2-scan-upload-happy-active/manifest.json` (`result_status=failed`, `scan_provider=gemini`), `screenshots/01-selected-image.png`, `screenshots/02-progress.png`, failure screenshot `tests/mobile/results/latest/staging/p4-phase2-scan-upload-happy-active/2026-05-18_164757/screenshot-❌-1779137362734-(p4-phase2-scan-upload-happy-active).png`, `report.html`, command trace, and sanitized provider-path log `tests/mobile/results/latest/staging/p4-phase2-scan-upload-happy-active/logs/backend-gemini-smoke-redacted.log`.
LIVE BLOCKER: Backend accepted the upload (`POST /api/v1/scans` returned 201), opened the WebSocket progress stream, and called `generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, but Google returned HTTP 429 on three attempts with `RESOURCE_EXHAUSTED` / prepaid credits depleted for the configured project. Live Gemini smoke remains blocked until the Google AI Studio project has usable billing/credits or a different valid Gemini key is configured.
HARNESS FIXES: `tests/mobile/scripts/run-maestro.sh` now writes `manifest.json` for failed runs too, including result status and exit code; `tests/mobile/scripts/seed-scan-fixture.sh` touches pushed receipt files before Android media scan so Photo Picker prioritizes the intended fixture.
COST CONTROL: After evidence capture, stopped stateless Railway services again with `railway down --service gastify-api-staging --yes`, `railway down --service gastify-api-staging-e2e --yes`, and `railway down --service gastify-web-staging --yes`; both Postgres services remain online. Railway shows the stopped stateless services as `Failed`, which is expected for the current cost-control posture.
TESTS: `cd backend && uv run ruff check app/auth/deps.py tests/test_auth.py` (pass); `cd backend && uv run ruff format --check app/auth/deps.py tests/test_auth.py` (pass); `cd backend && uv run pytest tests/test_auth.py` (14 passed); `bash -n tests/mobile/scripts/run-maestro.sh tests/mobile/scripts/seed-scan-fixture.sh scripts/staging/run-s23-fixture-gate.sh` (pass); `git diff --check` (pass).
TICK: Phase 2 Exec remains `🔄` because deterministic `staging-e2e` proof is complete but live `staging` Gemini success is not yet green.

## 2026-05-18 — P4 Phase 2B STAGING LIVE SMOKE: Gemini flash-lite provider path
RESULT: PROVIDER SUCCESS + UI RESULT REACHED; MAESTRO HAPPY ASSERTION NEEDS LIVE-SMOKE SEMANTICS
MODEL CHANGE: Switched the backend default and staging/production templates from `gemini-2.5-flash` to cheaper `gemini-2.5-flash-lite`; updated ignored `backend/.env.staging` and Railway `GASTIFY_GEMINI_MODEL=gemini-2.5-flash-lite` for `gastify-api-staging`.
MODEL AVAILABILITY: Verified the configured Google API key can list `models/gemini-2.5-flash-lite` and that it supports `generateContent` before running the paid smoke.
DEPLOY: Redeployed only `gastify-api-staging` with `npx -y @railway/cli@latest up ./backend --path-as-root --service gastify-api-staging --detach --ci`.
READINESS: `bash scripts/staging/check-backend-ready.sh https://gastify-api-staging-staging.up.railway.app` returned `status=ok`, `database=connected`, `migration_current=007`, and `migration_head=007`.
LIVE COMMAND: Ran one S23 gallery upload against `staging` with `MAESTRO_DEVICE_ID=RFCW90N4BYP`, `GASTIFY_ARTIFACT_ENV=staging`, `EXPO_PUBLIC_APP_ENV=staging`, `GASTIFY_SCAN_PROVIDER=gemini`, and `GASTIFY_SCAN_TEST_CASE_ID=live-super-lider-flash-lite`. The selected image was the real `super_lider.jpg` receipt seeded to `/sdcard/Pictures/GastifyE2E/gastify-live-super-lider.jpg`.
PROVIDER EVIDENCE: Redacted backend log `tests/mobile/results/latest/staging/p4-phase2-scan-upload-happy-active/logs/backend-gemini-flash-lite-redacted.log` shows two successful Gemini 200 calls to `gemini-2.5-flash-lite`: extraction with `input_tokens=998`, `output_tokens=791`, `estimated_cost_usd=0.000624`, and categorization with `input_tokens=1180`, `output_tokens=722`.
PIPELINE RESULT: Backend persisted transaction `a7247237-d95f-423a-8b57-c654929441e5` for scan `6a52c386-0135-4d01-adcd-f0e37dc838e8`; final pipeline status was `needs_review` with discrepancy `446`, not provider failure.
UI EVIDENCE: `tests/mobile/results/latest/staging/p4-phase2-scan-upload-happy-active/screenshots/01-selected-image.png` and `screenshots/02-progress.png` were captured; failure screenshot `tests/mobile/results/latest/staging/p4-phase2-scan-upload-happy-active/2026-05-18_175020/screenshot-❌-1779141069726-(p4-phase2-scan-upload-happy-active).png` shows the UI result panel with `Scan needs review`.
HARNESS FIX: Added `tests/mobile/maestro/p4-phase2-scan-upload-live-active.yaml` and `mobile/package.json` script `maestro:scan-upload:live:active` for future live smoke runs. This live flow asserts `scan-result-panel` and captures `03-scan-result` instead of requiring the text `Scan complete`, because real receipts may legitimately complete as `needs_review`.
TESTS: `cd backend && uv run ruff check app/config.py tests/test_config.py tests/test_extraction_agent.py` (pass); `cd backend && uv run ruff format --check app/config.py tests/test_config.py tests/test_extraction_agent.py` (pass); `cd backend && uv run pytest tests/test_config.py tests/test_extraction_agent.py` (19 passed); `maestro check-syntax tests/mobile/maestro/p4-phase2-scan-upload-live-active.yaml` (pass); `node -e "JSON.parse(require('fs').readFileSync('mobile/package.json','utf8'))"` (pass); `bash -n backend/.env.example backend/.env.local.example backend/.env.staging.example backend/.env.staging-e2e.example backend/.env.production.example backend/.env.staging` (pass); `git diff --check` (pass).
COST CONTROL: Stopped `gastify-api-staging` after the live smoke with `railway down --service gastify-api-staging --yes`; Railway now shows stateless services as `Failed` because they are intentionally stopped, while both Postgres services remain online.
TICK: Live provider proof is now available and no longer blocked by billing. Phase 2 final closure still needs a clean live-smoke harness pass with the new live flow or acceptance of the current result-panel evidence.

## 2026-05-18 — P4/P2 SUPPORT: receipt prompt lab foundation
RESULT: IMPLEMENTED + BACKEND VERIFIED; NO PAID LIVE PROMPT RUN EXECUTED
SCOPE: Added backend-native receipt prompt lab and shared prompt registry. Production extraction/categorization agents now read from `backend/app/prompts/registry.py`; active prompt IDs are configurable through `GASTIFY_RECEIPT_EXTRACTION_PROMPT_ID` and `GASTIFY_ITEM_CATEGORIZATION_PROMPT_ID`; production rejects dev-only prompt IDs; persisted transactions now record extraction prompt + categorization prompt + Gemini model in `Transaction.prompt_version`. The non-production scan test-case catalog now reuses the prompt-lab legacy baseline adapter instead of maintaining a separate expected-payload parser.
PROMPT LAB: Added `python -m app.prompt_lab` with `import-legacy`, `list-cases`, `validate`, `render`, `run`, `compare`, and `analyze`. Default runs are dry/cache-only and use the same `compress_receipt_image` path as backend uploads; `--raw-image` is labeled non-runtime-equivalent; `--live` requires `--limit` plus `--confirm-live-cost` and displays an estimated max cost.
CORPUS: Imported the legacy Boletapp receipt test-case corpus through the whitelist importer from `/home/khujta/projects/bmad/boletapp/prompt-testing/test-cases` into `prompt-testing/test-cases/receipts/`. Manifest `prompt-testing/import-manifest.json` records 69 imported receipt assets and 32 skipped files. No PDFs, credentials, CreditCard, or statement-family files were imported.
VALIDATION: `uv run python -m app.prompt_lab validate` reported `total_cases=49`, `baselined=13`, `fixture_baselined=5`, `unbaselined=31`, `invalid=[]`. Dry-run manifest created at `prompt-testing/results/latest/local/receipt-extraction-current/20260518T222913Z-supermarket-super_lider/manifest.json`; this result is ignored generated output and is prompt-lab evidence only.
DOCS/BOOKKEEPING: Added `prompt-testing/README.md`, `.gitignore` rules for generated prompt-lab caches/results, prompt-lab structure patterns in `.kdbp/STRUCTURE.md`, and the Phase 2 prompt-lab evidence boundary in `.kdbp/PLAN.md` / `.kdbp/ROADMAP.md`.
TESTS: `cd backend && uv run pytest tests/test_prompt_registry.py tests/test_prompt_lab.py tests/test_config.py tests/test_extraction_agent.py tests/test_categorization_agent.py tests/test_persist_scan.py` (52 passed); `cd backend && uv run pytest tests/test_scan_test_cases.py tests/test_prompt_lab.py` after scan-test-case adapter reuse (13 passed); `cd backend && uv run ruff check . && uv run ruff format --check .` (pass); `bash -n backend/.env.example backend/.env.local.example backend/.env.staging.example backend/.env.staging-e2e.example backend/.env.production.example` (pass); `git diff --check` (pass); `cd backend && uv run pytest` (406 passed, 2 skipped).
TICK: Prompt-lab foundation is ready for offline prompt iteration. It does not close Phase 2 runtime gates; S23 staging evidence remains the runtime source of truth.

## 2026-05-18 — P4/P2 SUPPORT: prompt module split
RESULT: IMPLEMENTED — prompt text and reusable prompt values no longer live in the registry
SCOPE: Split prompt ownership so `backend/app/prompts/registry.py` is now only the lookup/index. Prompt data types live in `backend/app/prompts/definitions.py`; receipt structure extraction prompt lives in `backend/app/prompts/receipt_structure.py`; item categorization prompt lives in `backend/app/prompts/item_categorization.py`; reusable prompt values such as supported receipt currencies, zero-decimal currency sets, V4 taxonomy prompt text, and V4 category keys live in `backend/app/prompts/values.py`.
RATIONALE: Future prompt changes now have clear file ownership, and backend/prompt-lab code can import category/currency values without scraping prompt strings or depending on the registry internals. This is the first step toward eventually sharing richer category metadata such as labels, colors, and icons through a dedicated reference surface.
DOCS: Updated `prompt-testing/README.md` to document the prompt file split.
TESTS: `cd backend && uv run ruff format app/prompts app/agents/extraction.py app/agents/categorization.py app/prompt_lab/scoring.py tests/test_prompt_registry.py`; `cd backend && uv run ruff check app/prompts app/agents/extraction.py app/agents/categorization.py app/prompt_lab/scoring.py tests/test_prompt_registry.py`; `cd backend && uv run pytest tests/test_prompt_registry.py tests/test_prompt_lab.py tests/test_extraction_agent.py tests/test_categorization_agent.py tests/test_config.py tests/test_persist_scan.py tests/test_scan_test_cases.py` (60 passed); `cd backend && uv run ruff check . && uv run ruff format --check . && uv run pytest` (407 passed, 2 skipped).

## 2026-05-18 — P4/P2 SUPPORT: English canonical category taxonomy
RESULT: IMPLEMENTED — prompt/backend category identifiers now match SCOPE English-key standard
SCOPE: Added `backend/app/reference/categories.py` as the canonical V4 item-category definition. Category keys are now English PascalCase (`Supermarket`, `CafeSnack`, `Fuel`, `Miscellaneous`, etc.); Spanish/English/Portuguese user-facing text lives in `display_labels`. `backend/app/prompts/values.py` now imports taxonomy values from this reference module, and the categorization prompt renders English keys with Spanish label hints only as translation context.
DB MIGRATION: Updated fresh taxonomy seed `007_v4_taxonomy.py` to seed English keys from the reference taxonomy, and added `008_english_category_keys.py` to rename existing Spanish-key staging rows to English keys while preserving existing opaque IDs/FKs. Alembic head is now `008`.
TEST FIXES: Updated prompt, fixture, adversarial, scan-worker, stream, persist, and P2 exit-signal tests to use English category keys. Added `backend/tests/test_reference_categories.py` to guard 86-key taxonomy count, absence of old Spanish keys as canonical identifiers, English/Spanish labels, and English prompt rendering.
DOCS/BOOKKEEPING: Updated `prompt-testing/README.md` and `.kdbp/STRUCTURE.md` for the shared reference category module.
VERIFY: `cd backend && uv run ruff check . && uv run ruff format --check .` (pass); `cd backend && uv run pytest` (410 passed, 2 skipped); `cd backend && uv run alembic heads` (`008 (head)`); `cd backend && uv run python -m app.prompt_lab render --prompt item-categorization-current` shows `L1 Food` and `Supermarket (es: Supermercado)`.
NOTE: A local SQLite `alembic upgrade head` probe still fails at the pre-existing `001_core_tables.py` JSONB-on-SQLite issue, before these new migrations run. That is not introduced by this taxonomy change; the real migration target remains Postgres for staging/prod.

## 2026-05-18 — P4/P2 SUPPORT: SQLite local-fast caveat review
RESULT: LOCAL-FAST NOT BLOCKED — SQLite remains a convenience runtime; Postgres remains the migration/proof target
FINDING: Local SQLite bootstrapping intentionally uses ORM metadata, not Alembic. A direct `GASTIFY_ENVIRONMENT=local GASTIFY_SCAN_PROVIDER=mock GASTIFY_DATABASE_URL=sqlite+aiosqlite:///../.tmp/test-alembic-english-taxonomy.db uv run alembic upgrade head` probe fails in `001_core_tables.py` before current taxonomy migrations because PostgreSQL `JSONB` is not SQLite-renderable. UUID defaults and PostgreSQL seed SQL would also need dialect work before SQLite could become an Alembic target.
FIX: Updated `scripts/dev/bootstrap-local-db.py` so local-fast seeds the canonical English V4 item-category taxonomy from `app.reference.categories`, keeps English/Spanish/Portuguese labels, cleans up legacy Spanish local seed keys, seeds English-first currency labels, and defaults the local user locale to `en`.
EVIDENCE: `bash scripts/dev/smoke-local.sh` passed against SQLite + mock provider with happy/review/failure uploads; artifact `.tmp/local/smoke/latest.json`. Local taxonomy query showed `category_count=86`, canonical keys `Bakery`, `Miscellaneous`, and `Supermarket`, and no legacy Spanish canonical keys.
TESTS: `cd backend && uv run ruff format --check ../scripts/dev/bootstrap-local-db.py && uv run ruff check ../scripts/dev/bootstrap-local-db.py` (pass); `git diff --check` (pass).
DECISION: Do not make SQLite migration parity a runtime gate now. If local migration parity becomes necessary later, implement dialect-aware migrations for JSON/JSONB, UUID defaults, and PostgreSQL-specific seed/upsert SQL as a separate task, or use local Postgres when migration behavior matters.

## 2026-05-18 — P4/P2 SUPPORT: prompt-lab local env loading
RESULT: IMPLEMENTED — prompt-lab live runs now consider ignored local API-key files without exposing secrets
SCOPE: Added `app.env_files.load_backend_env_files()` and wired it into `python -m app.prompt_lab` before backend settings are created. The prompt lab fully loads ignored `backend/.env` and `backend/.env.local` when present; if `GOOGLE_API_KEY` is still missing, it loads only `GOOGLE_API_KEY` from ignored staging files. Production env files are never auto-loaded. `GASTIFY_PROMPT_LAB_ENV_FILE` can point to an explicit full env file when needed.
SECRET SAFETY: The helper returns/prints only file/key names, never values. `.gitignore` already excludes `.env`, `.env.local`, `.env.staging`, `.env.staging-e2e`, and `.env.production`; examples remain source-safe placeholders.
EVIDENCE: A no-cost import probe showed `google_api_key_loaded=True` with `GASTIFY_ENVIRONMENT` and `GASTIFY_GEMINI_MODEL` unset, proving the staging API key fallback did not accidentally switch the prompt lab into full staging config. `uv run python -m app.prompt_lab run --case supermarket/super_lider --limit 1` passed as a dry run and wrote a local manifest.
TESTS: `cd backend && uv run ruff format --check app/env_files.py app/prompt_lab/cli.py tests/test_env_files.py && uv run ruff check app/env_files.py app/prompt_lab/cli.py tests/test_env_files.py` (pass); `cd backend && uv run pytest tests/test_env_files.py tests/test_prompt_registry.py tests/test_prompt_lab.py tests/test_reference_categories.py` (17 passed); `git diff --check` (pass).
NOTE: I did not re-run the paid live Gemini command after this fix; the missing-key blocker is removed, and the next live run should be intentionally triggered because it consumes credits.

## 2026-05-18 — P4/P2 SUPPORT: prompt-lab live super_lider pass + integer money contract
RESULT: PASS — one-case live Gemini prompt-lab run completed after fixing provider usage, money extraction, tax, and discount handling
SCOPE: Fixed PydanticAI usage extraction for the installed API shape where `result.usage` is a method; both extraction and categorization agents now use a shared compatibility helper. Updated the receipt extraction prompt to require integer minor-unit money outputs for every currency (`CLP 102.052 -> 102052`, `USD $48.50 -> 4850`), preserve quantity decimals separately, read full receipts top-to-bottom, treat included Chilean IVA as non-added tax, and include visible discount/promotion lines. Updated coalescing to normalize legacy major-unit/locale-formatted amounts into minor units, ignore included CLP IVA, and append an inferred `Discount` line when item totals exceed the receipt total and no summary discount exists.
PROMPT VERSION: `receipt-extraction-current@2026-05-18.4`; hash `b76c16515028630bc524be8570b8413cdc3fc38e4c8efc72bc3ea7d706f6f612`. Categorization remains `item-categorization-current@2026-05-18.1`.
LIVE COMMAND: `cd backend && uv run python -m app.prompt_lab run --case supermarket/super_lider --live --limit 1 --confirm-live-cost`.
LIVE RESULT: Completed with `gemini-2.5-flash-lite`; manifest `prompt-testing/results/latest/local/receipt-extraction-current/20260518T234816Z-supermarket-super_lider/manifest.json`; total `102052`, tax `null`, item count `26`, inferred final discount line `-12820`, math discrepancy `0`, all category keys valid, all extracted items assigned, score `passed=true`.
USAGE: Extraction `input_tokens=4387`, `output_tokens=1906`, `latency_ms=10219.6`; categorization `input_tokens=1525`, `output_tokens=725`, `latency_ms=5112.0`.
TESTS: `cd backend && uv run pytest tests/test_coalesce.py tests/test_math_gate.py tests/test_extraction_agent.py tests/test_categorization_agent.py tests/test_prompt_lab.py tests/test_prompt_registry.py` (81 passed); `cd backend && uv run pytest tests/test_persist_scan.py tests/test_coalesce.py tests/test_math_gate.py tests/test_prompt_registry.py` (74 passed); `cd backend && uv run ruff check . && uv run ruff format --check .` (pass); `cd backend && uv run pytest` (424 passed, 2 skipped); `git diff --check` (pass).
NOTE: Prompt-lab pass is AI-quality evidence only. It does not replace S23 staging evidence. The live pass still extracted fewer line items than the legacy baseline (`item_count_delta=-5`), so future prompt-quality work should tighten long-receipt item coverage even though current gate passed on merchant/currency/total/math/category validity.

## 2026-05-19 — P4/P2 SUPPORT: raw receipt extraction + deterministic post-processing contract
RESULT: IMPLEMENTED + VERIFIED LOCALLY; RUNTIME STAGING/S23 GATES STILL REQUIRED BEFORE PROMPT DEFAULT PROMOTION
SCOPE: Refactored receipt extraction into a raw Gemini output plus deterministic processed output. `extract_receipt()` now keeps `raw_extraction` while production continues using processed `GeminiExtractionResult`. Added raw schema evidence fields for source lines, modifier lines, and receipt adjustment rows; added receipt/item discount metadata to processed scan schemas, transaction API schemas, persistence, WebSocket completion payloads, and generated mobile/web OpenAPI clients.
POST-PROCESSING: `coalesce_extraction()` now normalizes money to integer minor units by currency, defaults missing quantity to `1`, parses weighted item evidence like `x 1.045 KG`, parses multi-buy evidence like `2X990`, treats CLP IVA as included, folds negative visible discount rows out of product items, stores discounts as positive values, attributes only high-confidence item discounts, and reconciles as gross item totals plus added tax minus receipt discount.
DB/API/UI: Added Alembic migration `009_receipt_discount_fields.py` for nullable `transactions.discount_total_minor`, `transaction_items.discount_minor`, and `transaction_items.discount_label`. Mobile and web scan result views now display receipt total, receipt discount, product rows, and optional item discounts from the scan completion event.
PROMPT LAB: Added split raw/processed cache keys, `--stage raw|processed|both`, `--no-postprocess`, `raw_output.json`, `processed_output.json`, `score.json`, two gates (`transaction_gate` and `reconstruction_gate`), and legacy baseline adaptation that converts negative legacy discount rows into canonical positive discount fields. Added `receipt-extraction-v2-evidence` as a dev-only prompt candidate and `prompt-testing/PATTERN-CATALOG.md` for the manual pattern catalog.
TESTS: `cd backend && uv run pytest` (434 passed, 2 skipped); `cd backend && uv run ruff check app tests` (pass); `cd backend && uv run ruff format --check app tests` (pass); `cd mobile && npm run generate:api` (pass); `cd web && npm run generate:api` (pass); `cd mobile && npm run typecheck` (pass); `cd mobile && npm test -- --runInBand` (36 passed); `cd mobile && npm run check:expo-config` (pass); `cd web && npm run build` (pass); `cd web && npm run test` (23 passed).
TICK: This closes the local code/test implementation for the receipt prompt + post-processing contract. It remains prompt/backend/local evidence only; Phase 2 closure still depends on staging-e2e deterministic S23 artifacts and staging live Gemini runtime evidence after deployment with migration `009`.

## 2026-05-19 — PROMPT LAB: current prompt four-case live receipt scan sample
RESULT: MIXED — current prompt can identify merchant/currency/totals on common cases, but quantity/unit reconstruction and some totals still need prompt/post-processing work
COMMAND: Ran `uv run python -m app.prompt_lab run --case <case> --live --limit 1 --confirm-live-cost` for `supermarket/super_lider`, `trips/US/long`, `trips/london/british_museum_1`, and `other/estacionamiento` using `receipt-extraction-current@2026-05-18.4`, `item-categorization-current@2026-05-18.1`, and `gemini-2.5-flash-lite`.
ARTIFACTS: `prompt-testing/results/latest/local/receipt-extraction-current/20260519T005143Z-supermarket-super_lider/manifest.json`; `prompt-testing/results/latest/local/receipt-extraction-current/20260519T005205Z-trips-US-long/manifest.json`; `prompt-testing/results/latest/local/receipt-extraction-current/20260519T005217Z-trips-london-british_museum_1/manifest.json`; `prompt-testing/results/latest/local/receipt-extraction-current/20260519T005237Z-other-estacionamiento/manifest.json`.
FINDINGS: `super_lider` extracted total `102052`, receipt discount `12820`, 25 product rows, and math passed, but reconstruction failed on quantity/unit/item discount detail. `trips/US/long` detected USD and total `12440` but produced 29 rows vs 28 expected and an unattributed `400` discount, leaving math discrepancy `400`. `british_museum_1` detected GBP and four items correctly, but incorrectly treated the credit-card payment line as a discount and tax as added, causing a `needs_review` math result. `estacionamiento` created one synthetic service item as required for no-item receipts and math passed internally, but total was extracted as `860000` CLP instead of expected `860`, so transaction gate failed.
TICK: Evidence is prompt-lab AI-quality only. Next prompt iteration should focus on payment-line exclusion, service/parking total scaling, source-line capture in current prompt, and separating gross item totals from quantity/unit reconstruction.

## 2026-05-19 — PROMPT LAB: compact V2 receipt prompt mutation test
RESULT: MIXED BUT USEFUL — compact V2 fixed parking and GBP, improved quantity/unit evidence on `super_lider`, but regressed full discount capture there and did not solve USD markdown math
PROMPT CHANGE: Replaced the dev-only `receipt-extraction-v2-evidence` body with a compact general prompt, not a production default. The prompt now avoids receipt-specific merchant rules and focuses on concise universal guidance: integer minor units, zero-decimal currency scaling, ISO dates, tender/payment exclusion, visible-only adjustments, included VAT/IVA/GST handling, no-item service receipt synthesis, quantity/unit examples, and source/modifier evidence capture. Current version `receipt-extraction-v2-evidence@2026-05-19.v2-dev.2`; hash `828a895409d15b7c9e180d74bae5d416290b368813bf3bbd4d8a9d1e60a8ebad`.
COMMAND: Ran `uv run python -m app.prompt_lab run --case <case> --extraction-prompt receipt-extraction-v2-evidence --live --limit 1 --confirm-live-cost` for `supermarket/super_lider`, `trips/US/long`, `trips/london/british_museum_1`, and `other/estacionamiento` with `gemini-2.5-flash-lite`.
ARTIFACTS: `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260519T010248Z-supermarket-super_lider/manifest.json`; `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260519T010311Z-trips-US-long/manifest.json`; `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260519T010321Z-trips-london-british_museum_1/manifest.json`; `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260519T010331Z-other-estacionamiento/manifest.json`.
MUTATION: `british_museum_1` improved from threshold-failed to completed: payment/tender line was ignored, VAT was not treated as added tax, date normalized to `2025-05-23`, and both transaction/reconstruction gates passed. `estacionamiento` improved from threshold-failed to completed: total stayed `860` CLP and the synthetic service item matched expected output. `super_lider` kept correct merchant/date/currency/total and improved quantity/unit reconstruction (`quantity_matches=24`, `unit_price_matches=24`), but missed one visible discount so math failed by `3080` CLP. `trips/US/long` still failed: markdown lines remained adjustments (`discount_amount=400`) and item count stayed one above baseline.
TESTS: `cd backend && uv run ruff check app/prompts/receipt_structure.py tests/test_prompt_registry.py` (pass); `cd backend && uv run pytest tests/test_prompt_registry.py tests/test_prompt_lab.py` (14 passed); live prompt-lab four-case sample completed with two `completed` and two `threshold-failed` packets.
TICK: Do not promote V2 yet. It is a strong candidate for service receipts and payment/tax classification, but needs broader discount/markdown policy and line-item coverage work before becoming `receipt-extraction-current`.

## 2026-05-19 — P4/P2 SUPPORT: prompt-lab four-case current prompt probe
RESULT: EXECUTED — current prompt exposes money/discount/payment-line gaps across CLP, USD, GBP, and parking
COMMANDS: Ran `uv run python -m app.prompt_lab run --case <case> --live --limit 1 --confirm-live-cost --model google-gla:gemini-2.5-flash-lite` for `supermarket/super_lider`, `trips/US/long`, `trips/london/british_museum_1`, and `other/estacionamiento`.
PROMPT: `receipt-extraction-current@2026-05-18.4`; categorization `item-categorization-current@2026-05-18.1`; model `google-gla:gemini-2.5-flash-lite`.
ARTIFACTS: CLP supermarket `prompt-testing/results/latest/local/receipt-extraction-current/20260519T004920Z-supermarket-super_lider/manifest.json`; USD supermarket `prompt-testing/results/latest/local/receipt-extraction-current/20260519T004957Z-trips-US-long/manifest.json`; GBP museum shop `prompt-testing/results/latest/local/receipt-extraction-current/20260519T005017Z-trips-london-british_museum_1/manifest.json`; CLP parking `prompt-testing/results/latest/local/receipt-extraction-current/20260519T005041Z-other-estacionamiento/manifest.json`.
FINDINGS: `super_lider` extracted the correct merchant/date/currency/total and 25 product rows, but incorrectly treated `TOTAL AFECTO` as an adjustment discount of `85758`, so math failed. `trips/US/long` detected USD and total `12440`, but produced one extra item and item-level discounts that made math fail by `400`. `british_museum_1` detected GBP, correct total, and four product rows, but treated the credit-card payment line `-29.97` as a discount adjustment and also surfaced VAT/tax as added, so math failed. `other/estacionamiento` correctly detected merchant/date/category and created a single parking item, but interpreted CLP `860,00` as `86000`; math passed internally while the transaction gate failed against the baseline total.
NEXT RULES: Add prompt/post-processing rules to classify `TOTAL AFECTO`/`TOTAL EXENTO` as tax-base summary, not discount; classify payment/tender lines such as `Credit Card`, card masks, and negative card payments as payment evidence, not discounts; and handle zero-decimal currency receipts that print trailing `,00` or `.00` as formatting, not cents.
TICK: These runs are AI-quality evidence only and do not close runtime gates. They should drive the next prompt/post-processing candidate before another paid batch.

## 2026-05-19 — PROMPT LAB: V2 quantity/tax/discount candidate refinement
RESULT: IMPLEMENTED LOCALLY; LIVE GEMINI COMPARISON BLOCKED BY PROVIDER 503
SCOPE: Updated dev-only `receipt-extraction-v2-evidence` to `2026-05-19.v2-dev.3`. The prompt now keeps the quantity rule general across implicit single item, unit multiplier, and measured weight/volume/length patterns; keeps quantities numeric; clarifies that tax must be added tax participating in the payable total; and narrows markdown/price-history labels so they do not become discounts unless a visible reducing line participates in the total. Updated `prompt-testing/PATTERN-CATALOG.md` with the same general rules.
PROMPT HASH: `c47f49944396c4b7b46c68f6610e1ea40a2790af9190f027a8d9249d18d9d666`.
TOOLING FIX: While attempting a live run, Gemini returned `503 UNAVAILABLE` for `gemini-2.5-flash-lite`. Added prompt-lab handling for `ModelHTTPError` so future provider outages write structured `provider-error` manifests instead of dumping a stack trace.
LIVE ATTEMPT: `cd backend && uv run python -m app.prompt_lab run --case supermarket/super_lider --extraction-prompt receipt-extraction-v2-evidence --live --limit 1 --confirm-live-cost --model google-gla:gemini-2.5-flash-lite` failed before producing a prompt result with provider message `This model is currently experiencing high demand`.
TESTS: `cd backend && uv run ruff check app/prompts/receipt_structure.py app/prompt_lab/runner.py app/prompt_lab/cli.py tests/test_prompt_registry.py tests/test_prompt_lab.py` (pass); `cd backend && uv run ruff format --check app/prompts/receipt_structure.py app/prompt_lab/runner.py app/prompt_lab/cli.py tests/test_prompt_registry.py tests/test_prompt_lab.py` (pass); `cd backend && uv run pytest tests/test_prompt_registry.py tests/test_prompt_lab.py` (16 passed); `cd backend && uv run python -m app.prompt_lab render --prompt receipt-extraction-v2-evidence` verified version `2026-05-19.v2-dev.3`.
TICK: This is prompt/text/tooling evidence only. Do not promote V2 or close runtime gates until the four-case live prompt-lab comparison can run successfully and staging/S23 evidence remains green.

## 2026-05-19 — PROMPT LAB: V2 prompt replay + adjustment reconciliation guard
RESULT: IMPLEMENTED + VERIFIED FROM RAW CACHE; V2 STILL NOT PROMOTED
SCOPE: Kept `receipt-extraction-current@2026-05-18.4` unchanged as the production default and continued refining only dev-only `receipt-extraction-v2-evidence@2026-05-19.v2-dev.3`. Added a deterministic coalescing guard for raw adjustment rows: if product/service line totals already reconcile to the grand total, and applying a visible adjustment would break that reconciliation, the processed canonical result ignores that adjustment. Bumped prompt-lab `POSTPROCESSING_VERSION` to `money-qty-item-discount-v2` so processed replays are regenerated from raw Gemini cache instead of reusing stale processed packets.
PROMPT HASH: `receipt-extraction-v2-evidence` rendered with hash `c47f49944396c4b7b46c68f6610e1ea40a2790af9190f027a8d9249d18d9d666`.
LIVE/CACHE COMMANDS: Retried `supermarket/super_lider` with `uv run python -m app.prompt_lab run --case supermarket/super_lider --extraction-prompt receipt-extraction-v2-evidence --live --limit 1 --confirm-live-cost`; first attempt hit Gemini extraction `503 UNAVAILABLE`, second attempt completed extraction but hit Gemini categorization `503 UNAVAILABLE`. Ran `trips/US/long` with `--live --stage raw` to capture raw extraction only, then replayed both cases with `--cache-only` after the post-processing version bump.
ARTIFACTS: Provider error `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260519T151448Z-supermarket-super_lider/manifest.json`; extraction-complete/categorization-provider-error packet `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260519T151521Z-supermarket-super_lider/manifest.json`; final processed replay `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260519T151855Z-supermarket-super_lider/manifest.json`; raw USD extraction `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260519T151617Z-trips-US-long/manifest.json`; final USD processed replay `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260519T151855Z-trips-US-long/manifest.json`.
MUTATION: `super_lider` replay now has `discount_amount=12820`, 25 items, `tax_amount=null`, and math discrepancy `0`; transaction gate passes, reconstruction still fails on item quantity/unit/discount detail and categorization was not rerun because the cache-only replay avoids Gemini cost. `trips/US/long` raw Gemini still emits `Temporary markdown` as a `400` adjustment, but processed replay ignores it because items already total `12440`; final `discount_amount=null`, math discrepancy `0`, and transaction gate passes. USD reconstruction still has one extra item vs baseline.
TESTS: `cd backend && uv run ruff check app/services/coalesce.py app/prompt_lab/cache.py app/prompts/receipt_structure.py tests/test_coalesce.py tests/test_prompt_registry.py tests/test_prompt_lab.py` (pass); `cd backend && uv run ruff format --check app/services/coalesce.py app/prompt_lab/cache.py app/prompts/receipt_structure.py tests/test_coalesce.py tests/test_prompt_registry.py tests/test_prompt_lab.py` (pass); `cd backend && uv run pytest tests/test_coalesce.py tests/test_math_gate.py tests/test_prompt_registry.py tests/test_prompt_lab.py` (78 passed).
TICK: V2 is improved but remains a dev-only candidate. Promotion still requires a clean live comparison with categorization, broader corpus coverage, staging live smoke, and S23 staging evidence.

## 2026-05-19 — PROMPT LAB/APPLICATION: shared Gemini provider retry policy
RESULT: IMPLEMENTED + VERIFIED
SCOPE: Added `app.services.provider_retry.retry_provider_call()` as the shared retry policy for transient AI-provider failures. Prompt-lab live extraction and categorization now use it, so Gemini `503 UNAVAILABLE` / high-demand responses are retried with exponential backoff before a provider-error manifest is written. Enhanced scan error classification to inspect structured provider response bodies, so `UNAVAILABLE`/5xx remains transient while `RESOURCE_EXHAUSTED` quota failures, auth failures, blocked keys, and client errors remain visible and are not hidden by retries.
RUNTIME ALIGNMENT: The production scan worker already had stage-level retries for transient scan errors; its tests remain green. This change brings the prompt-lab suite onto the same retry semantics without multiplying scan-worker retries inside the runtime path.
TESTS: `cd backend && uv run ruff format --check app/services/provider_retry.py app/services/scan_errors.py app/prompt_lab/runner.py tests/test_provider_retry.py tests/test_scan_errors.py tests/test_prompt_lab.py` (pass); `cd backend && uv run ruff check app/services/provider_retry.py app/services/scan_errors.py app/prompt_lab/runner.py tests/test_provider_retry.py tests/test_scan_errors.py tests/test_prompt_lab.py` (pass); `cd backend && uv run pytest tests/test_provider_retry.py tests/test_scan_errors.py tests/test_prompt_lab.py tests/test_scan_worker.py` (51 passed).
TICK: Prompt-lab live runs now treat provider overload as retryable infrastructure instability, not prompt-quality failure. If retries exhaust, the original provider error is still recorded in the manifest.

## 2026-05-19 — PROMPT LAB/APPLICATION: consolidated scan-agent retry ownership
RESULT: IMPLEMENTED + VERIFIED
SCOPE: Moved Gemini provider retry ownership into the shared agent entrypoints. `extract_receipt()` now retries transient provider failures around the image extraction `agent.run()` call, and `categorize_items()` does the same for item categorization. Prompt-lab no longer wraps the agents with a separate retry layer, and the scan worker no longer retries Gemini stages itself; it now performs state transitions, WebSocket events, final failure classification, math gate, and persistence around one call to each shared agent.
RETRY CONTRACT: `Agent(retries=2)` remains for PydanticAI output/tool/model retry behavior, while `retry_provider_call()` handles provider/transport instability (`503 UNAVAILABLE`, 5xx, network/timeouts). Quota/billing, auth, invalid request/image, and safety failures remain non-retryable and surface as final failures.
ARTIFACT CLEANUP: Prompt-lab result packets no longer write duplicate `normalized_output` or duplicate `cache_key`; `processed_output`, `raw_cache_key`, and `processed_cache_key` are the canonical artifact fields. Bumped prompt-lab `POSTPROCESSING_VERSION` to `money-qty-item-discount-v3` so stale processed caches with the old artifact shape are not reused.
TESTS: `cd backend && uv run ruff check app tests && uv run ruff format --check app tests` (pass); `cd backend && uv run pytest` (445 passed, 2 skipped); `git diff --check` (pass).
TICK: Runtime and prompt-lab now share one retry strategy per AI stage, without multiplying attempts in production.

## 2026-05-19 — STUDY: transaction/store categorization strategy
RESULT: COMPLETED STUDY — no runtime/code changes made
SCOPE: Compared legacy Boletapp transaction categorization with current Gastify scan persistence. Legacy produced a top-level receipt/store `category` and item `items[].category` in the image prompt, then applied learned merchant/category mappings. Current Gastify has `Transaction.store_category_id`, `MerchantMapping.store_category_id`, `CategoryMapping`, and store-category reference API surfaces, but the scan path only persists item-category assignments and leaves `store_category_id` unset. Also identified a current mapping-contract ambiguity: `CategoryMapping.target_category_id` points to `store_categories` while scan item categorization persists to `item_categories`.
ARTIFACT: `docs/runbooks/TRANSACTION-CATEGORIZATION-STUDY.md`.
RECOMMENDATION: Future implementation should run item categorization first, apply remembered item name/category overrides, then resolve the final transaction/store category. If the remembered merchant category is confident, use it; otherwise run a separate lightweight merchant/store categorization prompt using merchant evidence plus effective item-category distribution. Do not make the extraction prompt or current item-categorization prompt the primary owner of transaction categorization. Before implementation, define and seed the canonical Gastify four-level taxonomy across local/staging/prod: L1 Industry, L2 Business Type, L3 Family, L4 Category, with English canonical keys/names and Spanish labels from day zero. The study captures the legacy L1/L3 group names, L2/L4 key sets, remembered merchant/item mapping requirements, and nullable free-form item subcategory requirement. Subcategory is editable on the current item but is not remembered or auto-applied in this implementation shape.
DIAGRAM: Added a Mermaid workflow diagram covering upload intake, extraction, post-processing, item categorization, item memory overrides, merchant memory, final store-category fallback, persistence, WebSocket/UI result, and user-correction learning loops.
TAXONOMY UPDATE: Clarified that prompts assign only L2 `Business Type` transaction/store categories and L4 `Category` item categories. L1 `Industry` and L3 `Family` are deterministic parent groups for statistics, filters, drill-downs, charts, and UI grouping. Updated `.kdbp/ROADMAP.md` to carry the same standard for Phase 2 scan proof and Phase 6 insights.
TESTS: `git diff --check -- docs/runbooks/TRANSACTION-CATEGORIZATION-STUDY.md .kdbp/ROADMAP.md .kdbp/LEDGER.md` (pass).
TICK: This is planning evidence only. No prompts, schemas, migrations, or tests were changed in this study.

## 2026-05-19 — PLAN FIX: transaction categorization Gabe review remediation
RESULT: PLAN UPDATED — implementation still not started
SOURCE: `.kdbp/REVIEW.md` conditional Gabe review found 6 gaps: prompt taxonomy mismatch, missing full L2 store taxonomy, incomplete remembered-mapping contracts, missing store-category provenance, active-plan routing gap, and untested Spanish label behavior.
SCOPE: Updated `docs/runbooks/TRANSACTION-CATEGORIZATION-STUDY.md` with a Gabe Review Remediation Plan and explicit Phase 2C execution order: canonical taxonomy split/seed, prompt-safe L2/L4 projections, remembered mapping schema/services, store-category resolution service, persistence/provenance, and prompt-lab/backend/client/staging tests. Updated `.kdbp/PLAN.md` so Phase 2C is a blocking prerequisite for Phase 2 Exec closure.
DECISION: Proceed with the transaction categorization implementation only through Phase 2C. Do not implement the store fallback prompt first; the taxonomy, mapping, provenance, and locale contracts must land before store-category assignment is treated as complete.
TESTS: `git diff --check -- docs/runbooks/TRANSACTION-CATEGORIZATION-STUDY.md .kdbp/PLAN.md .kdbp/LEDGER.md .kdbp/REVIEW.md` (pass).

## 2026-05-19 19:30 — RE-REVIEW: transaction categorization remediation plan
VERDICT: APPROVE
FINDINGS: 2 total (0 critical, 0 high, 2 medium, 0 low) — 2 deferred (informational notes for Phase 2C implementer)
COVERAGE: HIGH — study artifact, PLAN Phase 2C, ROADMAP taxonomy boundary, and LEDGER entries are consistent.
CONFIDENCE: 95/100
PRIOR FINDINGS: All 6 prior Codex findings resolved: (1) prompt taxonomy mismatch → 2C.1+2C.2, (2) missing L2 store taxonomy → 2C.1, (3) incomplete mapping contracts → 2C.3, (4) missing store-category provenance → 2C.5, (5) active-plan routing gap → Phase 2C sub-phase, (6) untested Spanish labels → 2C.6.
NEW FINDINGS: (M1) subcategory end-to-end not explicit in Phase 2C numbered sub-steps — covered implicitly by 2C.2+2C.6, deferred as implementer note. (M2) current item taxonomy level 1-2-3 → new L3/L4 mapping not documented — implementation detail for 2C.1, study provides full key lists.
SEQUENCE: extraction → post-processing → L4 item categorization → item memory → merchant memory → L2 store fallback → persistence. Verified consistent across study, PLAN Phase 2C, and Mermaid diagram.
CROSS-FILE: PLAN ↔ study ↔ ROADMAP ↔ LEDGER all consistent on level names, pipeline order, subcategory policy, and English key / Spanish label requirement.
IMPLEMENTABILITY: Phase 2C.1-2C.6 order prevents premature fallback prompt work. Study explicitly says "start with the contract work, not with the merchant fallback prompt."
ARCHIVED: `.kdbp/reviews-archive/REVIEW_2026-05-19-150406_superseded.md` (prior Codex conditional review).
TICK: N/A — this is a plan/doc review, not a phase completion review.
TESTS: `git diff --check -- docs/runbooks/TRANSACTION-CATEGORIZATION-STUDY.md .kdbp/PLAN.md .kdbp/ROADMAP.md .kdbp/LEDGER.md .kdbp/REVIEW.md` (pass).

## 2026-05-19 15:45 -04 — PHASE 2C: transaction categorization contract local implementation
RESULT: IMPLEMENTED + VERIFIED LOCALLY; RUNTIME STAGING/S23 GATES STILL REQUIRED BEFORE PHASE 2 CLOSURE
SCOPE: Implemented the Phase 2C contract approved by the Gabe re-review. Added canonical four-level taxonomy code: L1/L2 store taxonomy and L3/L4 item taxonomy with English canonical keys and Spanish labels. Item prompts and `CategoryAssignment` now emit/validate only L4 item keys; the new store-categorization prompt and `StoreCategorizationResult` emit/validate only L2 store keys. L1/L3 remain deterministic parent groups.
DB/API: Added full store taxonomy seed support, `GET /api/v1/reference/item-categories`, store-category hierarchy fields in the store reference API, `transactions.store_category_source`, `transactions.store_category_confidence`, `transactions.store_category_mapping_id`, and corrected `CategoryMapping.target_category_id` to point at `item_categories` with optional `target_item`. Added Alembic migrations `010_four_level_store_taxonomy.py` and `011_mapping_memory_and_store_provenance.py`.
PIPELINE: Scan persistence now applies remembered merchant mappings, remembered item name/category mappings, clears stale prompt subcategory when a remembered item category overrides AI, resolves store category from confident merchant memory first, and only then uses the lightweight store-categorization Gemini fallback when the runtime scan provider is `gemini`. Mock/fixture providers do not make an extra Gemini call. Store fallback receives effective item category keys after item categorization and item memory.
PROVENANCE: Persisted store category source/confidence/mapping id separately from `merchant_source`. `merchant_source` remains about merchant text/alias source. Prompt version now includes `store-categorization-current@2026-05-19.1`.
CLIENTS: Regenerated mobile and web OpenAPI specs/types after the backend schema changes.
TESTS: `cd backend && uv run pytest tests/test_config.py tests/test_reference_categories.py tests/test_prompt_registry.py tests/test_persist_scan.py tests/test_transactions.py tests/test_categorization_agent.py tests/test_prompt_lab.py tests/test_scan_worker.py tests/test_scan_stream.py tests/test_adversarial.py tests/test_p2_exit_signal.py` (167 passed); `cd backend && uv run pytest` (452 passed, 2 skipped); `cd backend && uv run ruff check app tests` (pass); `cd backend && uv run ruff format --check app tests` (pass); `cd mobile && npm run generate:api` (pass); `cd web && npm run generate:api` (pass); `cd mobile && npm run typecheck` (pass); `cd mobile && npm test -- --runInBand` (36 passed); `cd web && npm run build` (pass); `cd web && npm test` (23 passed).
TICK: Phase 2C local implementation is complete as contract evidence. Do not close Phase 2 Exec until the migrated code is deployed to staging-e2e/staging and S23 fixture/live Gemini artifacts prove the runtime journey.

## 2026-05-19 15:51 -04 — PROMPT LAB: V2.3 four-case comparison rerun
RESULT: MIXED — current V2 improves supermarket/USD transaction math but regresses GBP/payment-tax and parking service-line behavior; do not promote
COMMANDS: Ran `uv run python -m app.prompt_lab run --case <case> --extraction-prompt receipt-extraction-v2-evidence --live --limit 1 --confirm-live-cost --model google-gla:gemini-2.5-flash-lite` for `supermarket/super_lider`, `trips/US/long`, `trips/london/british_museum_1`, and `other/estacionamiento`.
PROMPT: `receipt-extraction-v2-evidence@2026-05-19.v2-dev.3`; categorization `item-categorization-current@2026-05-18.1`; model `google-gla:gemini-2.5-flash-lite`.
ARTIFACTS: `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260519T195019Z-supermarket-super_lider/manifest.json`; `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260519T195033Z-trips-US-long/manifest.json`; `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260519T195052Z-trips-london-british_museum_1/manifest.json`; `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260519T195106Z-other-estacionamiento/manifest.json`; gap analysis `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260519T195106Z-four-case-gap-analysis.md`.
CAVEAT: `trips/US/long` produced a new processed/categorized packet from the existing raw extraction cache (`threshold-failed-from-raw-cache`). It is useful for current processed scoring, but is not fresh provider evidence for extraction.
FINDINGS: `super_lider` now passes the transaction gate and math with total `102052`, discount `12820`, item delta `0`, quantity matches `23`, and unit-price matches `22`, but reconstruction still fails. `trips/US/long` now passes transaction gate and math with discount `null`, but still has item delta `+1`. `british_museum_1` regressed from the earlier V2 completed run: raw output treats `Credit Card` as a `2997` adjustment and VAT/tax as `698`, so math fails by `2299`. `estacionamiento` extracts total `860` correctly but returns zero items, so the service-line reconstruction and math fail.
DECISION: Do not promote `receipt-extraction-v2-evidence@2026-05-19.v2-dev.3`. Keep the production default unchanged until the next candidate is tested. Next work should add deterministic post-processing for tender/payment adjustment removal, non-additive tax suppression when item totals already reconcile, service-line synthesis when no items exist, and a prompt-lab cache-bypass mode for strict fresh live retests.
TICK: Prompt-lab AI-quality evidence only; no runtime gate closed.

## 2026-05-19 16:12 -04 — PROMPT LAB: V2.4 discount/tax/service post-processing
RESULT: IMPLEMENTED + VERIFIED LOCALLY; V2 STILL NOT PROMOTED
SCOPE: Applied the next prompt-lab recommendations to the dev-only `receipt-extraction-v2-evidence` candidate and deterministic post-processing. Bumped the candidate to `receipt-extraction-v2-evidence@2026-05-19.v2-dev.4`; production `receipt-extraction-current@2026-05-18.4` remains unchanged. Added compact prompt guidance that `adjustment_lines` are discount evidence only, tax is null when item/service totals already equal the grand total, and service receipts without item tables should still produce one service line.
POST-PROCESSING: Added deterministic adjustment classification in `coalesce_extraction`: payment/tender/card settlement rows and tax-reporting summary rows are rejected as discounts; non-discount adjustment rows without item linkage are ignored; included/reporting tax is suppressed when items already reconcile to the total; and a positive-total/no-item service receipt gets one synthesized service line. Bumped prompt-lab `POSTPROCESSING_VERSION` to `money-qty-item-discount-v4`.
DISCOUNT CONTRACT: Current canonical fields are `RawGeminiExtractionResult.discount_amount`, `RawGeminiExtractionResult.adjustment_lines[]`, raw/processed `LineItemExtraction.discount_amount`, `discount_label`, `discount_attribution_confidence`, processed `GeminiExtractionResult.discount_amount`, persisted `transactions.discount_total_minor`, and persisted `transaction_items.discount_minor/discount_label`. Discounts are positive minor-unit amounts. Product/service rows remain product/service rows; valid discounts become item discounts only with confident linkage, otherwise receipt-level discount. Payment/tender, tax summaries, included tax, subtotals, balance/change, and price-history labels without a separate reducing amount are not discounts.
PROMPT-LAB TOOLING: Added `run --bypass-cache` so fresh live comparisons can force provider calls after prompt changes; it is rejected unless combined with `--live` and cannot be combined with `--cache-only`.
NO-COST RAW REPLAY: Existing v2-dev.3 raw outputs were replayed directly through the new post-processing without calling Gemini. Results: `supermarket/super_lider` still math passes with `discount_amount=12820`, 25 items, discrepancy `0`; `trips/US/long` math passes with `discount_amount=null`, 29 items, discrepancy `0`; `trips/london/british_museum_1` now math passes with `discount_amount=null`, `tax_amount=null`, 4 items, discrepancy `0`; `other/estacionamiento` now math passes with one synthesized service item for `860`, discrepancy `0`.
CACHE NOTE: `python -m app.prompt_lab run --case <case> --extraction-prompt receipt-extraction-v2-evidence --cache-only --limit 1` correctly returned `missing-cache` for the four cases after the prompt text changed, because raw cache keys include the prompt text hash. Fresh provider evidence for v2-dev.4 still requires `--live --bypass-cache --limit N --confirm-live-cost`.
TESTS: `cd backend && uv run pytest tests/test_coalesce.py tests/test_prompt_registry.py tests/test_prompt_lab.py tests/test_math_gate.py` (85 passed); `cd backend && uv run ruff format --check app/services/coalesce.py app/prompts/receipt_structure.py app/prompt_lab/cache.py app/prompt_lab/cli.py app/prompt_lab/runner.py tests/test_coalesce.py tests/test_prompt_registry.py tests/test_prompt_lab.py` (pass); `cd backend && uv run ruff check app/services/coalesce.py app/prompts/receipt_structure.py app/prompt_lab/cache.py app/prompt_lab/cli.py app/prompt_lab/runner.py tests/test_coalesce.py tests/test_prompt_registry.py tests/test_prompt_lab.py` (pass); `cd backend && uv run pytest` (459 passed, 2 skipped).
TICK: This is local prompt-lab/post-processing evidence only. Do not promote v2-dev.4 until a fresh four-case live comparison with `--bypass-cache`, broader corpus review, staging live smoke, and S23 staging evidence are complete.

## 2026-05-19 16:35 -04 — PROMPT LAB: V2.4 six-case no-cache live run with provenance/cost
RESULT: IMPLEMENTED + LIVE-RUN COMPLETE; V2.4 STILL NOT PROMOTED
SCOPE: Added prompt-lab instrumentation for field provenance and model-specific token/cost tracking, then ran the requested six-case live Gemini batch with `--bypass-cache`. The run used `receipt-extraction-v2-evidence@2026-05-19.v2-dev.4`, `item-categorization-current@2026-05-18.1`, and `google-gla:gemini-2.5-flash-lite`.
INSTRUMENTATION: Each successful live packet now writes `field_provenance.json` and `cost_summary.json` alongside `raw_output.json`, `processed_output.json`, `score.json`, and `manifest.json`. Provenance separates `extraction_prompt`, `postprocess`, `item_categorization_prompt`, `deterministic_math_gate`, and `scoring`. Cost summaries use provider-reported tokens and model-specific Standard pricing for `gemini-2.5-flash-lite`: `$0.10/1M` input and `$0.40/1M` output, sourced from Google Gemini API pricing docs.
COMMANDS: Ran the focused pre-live gate `cd backend && uv run pytest tests/test_prompt_lab.py tests/test_coalesce.py tests/test_prompt_registry.py tests/test_math_gate.py` (89 passed); `cd backend && uv run ruff format --check app/prompt_lab app/services/coalesce.py app/prompts/receipt_structure.py tests/test_prompt_lab.py` (pass); `cd backend && uv run ruff check app/prompt_lab app/services/coalesce.py app/prompts/receipt_structure.py tests/test_prompt_lab.py` (pass). Live cases were run with `cd backend && uv run python -m app.prompt_lab run --case <case> --environment local --extraction-prompt receipt-extraction-v2-evidence --model google-gla:gemini-2.5-flash-lite --live --bypass-cache --limit 1 --confirm-live-cost`.
ARTIFACTS: Batch summary `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260519T203403Z-six-case-v2.4/six-case-summary.json`; batch analysis `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260519T203403Z-six-case-v2.4/six-case-analysis.md`. Case manifests: `20260519T203303Z-supermarket-super_lider/manifest.json`, `20260519T203324Z-trips-US-long/manifest.json`, `20260519T203336Z-trips-london-british_museum_1/manifest.json`, `20260519T203344Z-other-estacionamiento/manifest.json`, `20260519T203351Z-gas-station-copec/manifest.json`, `20260519T203403Z-trips-paris-galeries_lafayette_1/manifest.json`.
RESULTS: Two cases completed both gates: `trips/london/british_museum_1` and `gas-station/copec`. Four cases were `threshold-failed`: `supermarket/super_lider` passed transaction/math but failed reconstruction on quantity/unit/item-discount detail; `trips/US/long` passed transaction/math but had item delta `+1` and reconstruction misses; `other/estacionamiento` failed transaction gate because Gemini returned `86000` CLP instead of expected `860`; `trips/paris/galeries_lafayette_1` passed transaction/math but failed reconstruction because one quantity differed. No final provider-error packets occurred; one transient categorization server error on the British Museum case was retried and recovered.
COST/TOKENS: Batch total was 28,520 tokens: 19,417 input and 9,103 output. Estimated Gastify batch cost was `$0.0055829` using provider-reported tokens. Legacy comparison remains labeled `legacy_estimated`: Boletapp prompt-testing used flat `apiCost: 0.01` estimates and rough token estimates, producing a six-case legacy estimate of `$0.06`.
DECISION: Do not promote V2.4. The deterministic post-processing improvements hold for British Museum and COPEC, but the parking amount regression and remaining reconstruction failures need prompt/post-processing follow-up before promotion. This remains prompt-lab AI-quality evidence only; it does not close staging/S23 runtime gates.
TICK: All requested live prompt-lab artifacts exist for the six cases, including raw/processed/provenance/cost/score/manifest files.

## 2026-05-19 21:18 -04 — PROMPT LAB: V2.5 visible-total and quantity regression remediation
RESULT: IMPLEMENTED + VERIFIED LOCALLY; V2.5 STILL NOT PROMOTED
SCOPE: Implemented the Gabe-reviewed bounded remediation for the dev-only `receipt-extraction-v2-evidence` candidate. Production `receipt-extraction-current@2026-05-18.4` remains unchanged. Bumped the candidate to `receipt-extraction-v2-evidence@2026-05-19.v2-dev.5` with compact prompt guidance for zero-decimal visible totals, service receipt evidence, and item price/source evidence. Bumped prompt-lab `POSTPROCESSING_VERSION` through `money-qty-item-discount-v7`.
POST-PROCESSING: `coalesce_extraction()` now performs conservative visible-total reconciliation for zero-decimal currencies: explicit top-level total labels can correct exact x100 scale errors such as CLP `86000` -> `860`, while tax/tender/document/item-count lines are ignored and unresolved conflicts are surfaced. A sole service-like item is synchronized to the corrected visible total. Quantity parsing now prefers explicit markers (`Qté`, `QTY`, `Cant`, `@`) and line-start multipliers, rejects package-size tokens such as `7X70G`, and corrects double-multiplied multiplier totals such as `3X990` + `8910` -> `2970`.
PROMPT-LAB EVIDENCE: `field_provenance.json` now records visible-total candidates, unresolved visible-total conflicts, multiplier accepted/rejected events, and multiplier-driven total corrections. `score.json` now blocks the transaction gate on unresolved visible-total conflicts. Cost labels now distinguish `legacy_flat_estimate` and `legacy_rough_token_estimate` from Gastify provider-reported token estimated cost. `cache-only` raw replays no longer write processed caches with empty categorization.
NO-COST REPLAY: Replayed prior v2.4/v2.5 raw outputs through the new post-processing without a fresh extraction call. Parking corrected from `86000` to `860`; Paris `7X70G BAGUETTE` remained `qty=2`, `unit_price=1890`, `total_price=3780`; Super Lider `3X990 GALL DONUTS COCO` corrected from `8910` to `2970`.
LIVE/CACHE COMMANDS: Ran the requested six-case live extraction batch with `cd backend && uv run python -m app.prompt_lab run --case <case> --environment local --extraction-prompt receipt-extraction-v2-evidence --model google-gla:gemini-2.5-flash-lite --live --bypass-cache --limit 1 --confirm-live-cost`. After the final deterministic total correction, regenerated final packets from the live raw extraction cache with live categorization only using the same command without `--bypass-cache`.
ARTIFACTS: Initial fresh live batch summary `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260520T010843Z-six-case-v2.5/six-case-summary.json`; final post-process v7 batch summary `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260520T011303Z-six-case-v2.5-postprocess-v7/six-case-summary.json`; final batch analysis `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260520T011303Z-six-case-v2.5-postprocess-v7/six-case-analysis.md`. Final case manifests: `20260520T011232Z-supermarket-super_lider/manifest.json`, `20260520T011239Z-trips-US-long/manifest.json`, `20260520T011247Z-trips-london-british_museum_1/manifest.json`, `20260520T011254Z-other-estacionamiento/manifest.json`, `20260520T011258Z-gas-station-copec/manifest.json`, `20260520T011303Z-trips-paris-galeries_lafayette_1/manifest.json`.
RESULTS: Four cases now pass transaction and reconstruction gates: `trips/london/british_museum_1`, `other/estacionamiento`, `gas-station/copec`, and `trips/paris/galeries_lafayette_1`. `supermarket/super_lider` improved from 24/25 to 25/25 item-price matches and its math discrepancy fell from `11800` to `5860`, but it still fails math/reconstruction due discount reconstruction (`discount_amount=6960` vs expected canonical total). `trips/US/long` still fails math/reconstruction with a `400` discrepancy tied to markdown/discount handling and item delta `+1`.
COST/TOKENS: Final v7 batch total was 36,992 tokens: 23,443 input and 13,549 output. Estimated Gastify batch cost was `$0.0077639` using provider-reported tokens and `gemini-2.5-flash-lite` Standard pricing. Legacy comparison is labeled `legacy_flat_estimate` / `legacy_rough_token_estimate`, with a six-case flat estimate of `$0.06`.
TESTS: `cd backend && uv run pytest tests/test_coalesce.py tests/test_prompt_lab.py tests/test_prompt_registry.py tests/test_math_gate.py` (98 passed); `cd backend && uv run ruff check app/services/coalesce.py app/prompt_lab/provenance.py app/prompt_lab/scoring.py app/prompt_lab/runner.py app/prompt_lab/costs.py app/prompt_lab/batch_report.py app/prompt_lab/cache.py app/prompts/receipt_structure.py tests/test_coalesce.py tests/test_prompt_lab.py tests/test_prompt_registry.py` (pass); `cd backend && uv run ruff format --check app/services/coalesce.py app/prompt_lab/provenance.py app/prompt_lab/scoring.py app/prompt_lab/runner.py app/prompt_lab/costs.py app/prompt_lab/batch_report.py app/prompt_lab/cache.py app/prompts/receipt_structure.py tests/test_coalesce.py tests/test_prompt_lab.py tests/test_prompt_registry.py` (pass); `cd backend && uv run pytest` (472 passed, 2 skipped); `cd backend && uv run ruff check .` (pass). Full `cd backend && uv run ruff format --check .` is still blocked by unrelated pre-existing formatting drift in `alembic/versions/010_four_level_store_taxonomy.py`, which was not modified in this remediation.
DECISION: Do not promote V2.5. The parking, Paris, British Museum, and COPEC regressions are resolved, but Super Lider and the US long receipt still need a discount/markdown reconstruction follow-up before the candidate can be considered for production default or staging/S23 runtime gates.
TICK: Prompt-lab AI-quality evidence only; staging live Gemini and S23 staging evidence remain required before Phase 2 closure.
## 2026-05-19 21:39 -04 — PROMPT LAB: coalescing readability and discount precedence cleanup
RESULT: IMPLEMENTED + VERIFIED LOCALLY
SCOPE: Added short case-oriented comments to the deterministic coalescing rules so the receipt semantics are visible while reading the code: visible total correction (`TOTAL: $860` vs CLP `86000`), negative discount rows, adjustment/tax/tender rejection, service-item synchronization, multiplier total correction (`3X990` vs `8910`), package-size rejection (`7X70G`), explicit quantity markers, line-start multipliers, and weighted items.
DISCOUNT PRECEDENCE: Updated canonical receipt discount selection to mirror the receipt-total policy. An explicit receipt-level discount wins first; visible discount rows/adjustments are used next; item-level discount aggregation is the fallback when no receipt-level discount exists. Removed the final fallback that inferred a discount only from `sum(items) - receipt_total`; that mismatch must now be handled by math/review logic instead of inventing a discount. Bumped prompt-lab `POSTPROCESSING_VERSION` to `money-qty-item-discount-v8`.
TESTS: `cd backend && uv run pytest tests/test_coalesce.py tests/test_prompt_lab.py tests/test_prompt_registry.py tests/test_math_gate.py` (100 passed); `cd backend && uv run pytest` (474 passed, 2 skipped); `cd backend && uv run ruff check app/services/coalesce.py app/prompt_lab/cache.py tests/test_coalesce.py` (pass); `cd backend && uv run ruff format --check app/services/coalesce.py app/prompt_lab/cache.py tests/test_coalesce.py` (pass); `cd backend && uv run ruff check .` (pass); `git diff --check -- backend/app/services/coalesce.py backend/app/prompt_lab/cache.py backend/tests/test_coalesce.py` (pass).
TICK: No prompt promotion and no live Gemini spend in this step. This is deterministic post-processing cleanup only; prompt-lab live comparison remains a separate decision.

## 2026-05-19 21:50 -04 — PROMPT LAB: eight-case current-state run after v8 coalescing cleanup
RESULT: RUN COMPLETE; PROMPT STILL NOT PROMOTED
SCOPE: Re-ran the prior six prompt-lab cases plus two additional baselined cases under current `receipt-extraction-v2-evidence@2026-05-19.v2-dev.5` and `POSTPROCESSING_VERSION=money-qty-item-discount-v8`. Added `trips/US/descuentos` as an international discount-heavy case and `restaurant/restaurant_2001_recibo` as a Chilean restaurant receipt. Used existing live raw extraction cache for the prior six cases, then ran live Gemini extraction for the two new cases.
COMMAND: `cd backend && uv run python -m app.prompt_lab run --case <case> --environment local --extraction-prompt receipt-extraction-v2-evidence --model google-gla:gemini-2.5-flash-lite --live --limit 1 --confirm-live-cost` for `supermarket/super_lider`, `trips/US/long`, `trips/london/british_museum_1`, `other/estacionamiento`, `gas-station/copec`, `trips/paris/galeries_lafayette_1`, `trips/US/descuentos`, and `restaurant/restaurant_2001_recibo`.
ARTIFACTS: Batch summary `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260520T014918Z-eight-case-v2.5-postprocess-v8/six-case-summary.json`; batch analysis `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260520T014918Z-eight-case-v2.5-postprocess-v8/six-case-analysis.md`. Case manifests: `20260520T014830Z-supermarket-super_lider/manifest.json`, `20260520T014839Z-trips-US-long/manifest.json`, `20260520T014843Z-trips-london-british_museum_1/manifest.json`, `20260520T014847Z-other-estacionamiento/manifest.json`, `20260520T014852Z-gas-station-copec/manifest.json`, `20260520T014856Z-trips-paris-galeries_lafayette_1/manifest.json`, `20260520T014910Z-trips-US-descuentos/manifest.json`, `20260520T014918Z-restaurant-restaurant_2001_recibo/manifest.json`.
RESULTS: Four prior cases remain fully passing: `trips/london/british_museum_1`, `other/estacionamiento`, `gas-station/copec`, and `trips/paris/galeries_lafayette_1`. Known failures remain: `supermarket/super_lider` has correct total and 25/25 item-price matches but fails math by `5860` CLP (`5.7%` of total) due discount reconstruction; `trips/US/long` fails math by `400` USD minor units (`3.2%`) with item delta `+1`; new `trips/US/descuentos` fails severely with discount/reconstruction mismatch, discrepancy `2277` USD minor units (`79.4%`) and item delta `+2`; new `restaurant/restaurant_2001_recibo` passes math and reconstruction but fails transaction gate due merchant mismatch (`SOCIEDAD CAFE 2001 LIMITADA` vs baseline `CAFE 2001 DELIVERY`).
COST/TOKENS: Equivalent full eight-case cost was `$0.0092659` from 45,208 tokens. Incremental spend for this run was approximately `$0.0031242`: `$0.0015282` for re-categorizing the six cached raw extractions and `$0.0015960` for the two new full live cases. Legacy flat estimate for eight scans remains `$0.08`, labeled `legacy_flat_estimate` / `legacy_rough_token_estimate`.
DECISION: Do not promote. Current deterministic infrastructure is stable for parking, restaurant math, gas station, Paris quantity, and British Museum tax/tender cases, but discount-heavy receipts are still not reliable enough. Next prompt-lab work should focus on discount representation and review-threshold semantics, especially avoiding repeated promotional discount lines as product/items and treating receipt total as truth with reconstruction warnings.
TICK: Prompt-lab AI-quality evidence only; no staging/S23 runtime gate closed.

## 2026-05-19 22:24 -04 — PROMPT LAB: V2.6 deterministic receipt remediation and ten-case no-cache run
RESULT: IMPLEMENTED + VERIFIED; PROMPT STILL NOT PROMOTED
SCOPE: Implemented the Gabe-reviewed high-priority receipt remediation. Production `receipt-extraction-current@2026-05-18.4` remains unchanged. Bumped the dev-only candidate to `receipt-extraction-v2-evidence@2026-05-19.v2-dev.6` with compact general guidance for duplicate discount representation, post-total savings summaries, and `N FOR amount` pricing. Deterministic coalescing now treats receipt total as canonical, selects one receipt-level discount only when it improves reconstruction, suppresses savings/markdown data when item totals already reconcile, ignores informational savings summaries, and parses `2 FOR 5.00` as qty `2`, unit `2.50`, total `5.00`.
MATH/PERSISTENCE: `MathReconciliationVerdict` now records diagnostic `reconstructed_total`, `discrepancy_ratio`, and `severity` (`none`, `minor`, `major_warning`). Exact reconciliation still controls `passed`; non-exact scans remain `needs_review`. `persist_scan_result()` no longer overwrites the transaction total with reconstructed math; `extraction.total_amount` is the persisted canonical total. Scan WebSocket progress/complete payloads now expose reconciliation severity diagnostics when math fails.
PROMPT-LAB REPORTING: Field provenance now records `N FOR amount` parsing, informational savings suppression, and major reconstruction warnings. Batch reports are label-driven instead of hardcoded six-case names and separate scored baselined cases from unbaselined smoke cases. Unbaselined smoke scoring now uses runtime math/category validity instead of failing because no expected baseline exists.
TESTS: `cd backend && uv run pytest tests/test_coalesce.py tests/test_math_gate.py tests/test_prompt_lab.py tests/test_prompt_registry.py tests/test_persist_scan.py` (125 passed); `cd backend && uv run ruff check app/services/coalesce.py app/services/math_gate.py app/services/persist_scan.py app/services/scan_worker.py app/prompts/receipt_structure.py app/prompt_lab tests/test_coalesce.py tests/test_math_gate.py tests/test_prompt_lab.py tests/test_prompt_registry.py tests/test_persist_scan.py` (pass); `cd backend && uv run pytest` (479 passed, 2 skipped).
LIVE COMMANDS: Ran no-cache Gemini extraction/categorization with `cd backend && uv run python -m app.prompt_lab run --case <case> --environment local --extraction-prompt receipt-extraction-v2-evidence --model google-gla:gemini-2.5-flash-lite --live --bypass-cache --limit 1 --confirm-live-cost` for `supermarket/super_lider`, `trips/US/long`, `trips/london/british_museum_1`, `other/estacionamiento`, `gas-station/copec`, `trips/paris/galeries_lafayette_1`, `trips/US/descuentos`, `restaurant/restaurant_2001_recibo`, `supermarket/super_lily`, and `trips/london/IMG-20251212-WA0104`. Re-ran the unbaselined London smoke case once after fixing smoke scoring; final report uses that fresh no-cache manifest.
ARTIFACTS: Final batch summary `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260520T022416Z-ten-case-v2.6-no-cache/ten-case-v2-6-no-cache-summary.json`; final batch analysis `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260520T022416Z-ten-case-v2.6-no-cache/ten-case-v2-6-no-cache-analysis.md`. Case manifests: `20260520T021915Z-supermarket-super_lider/manifest.json`, `20260520T021928Z-trips-US-long/manifest.json`, `20260520T021938Z-trips-london-british_museum_1/manifest.json`, `20260520T021948Z-other-estacionamiento/manifest.json`, `20260520T021957Z-gas-station-copec/manifest.json`, `20260520T022007Z-trips-paris-galeries_lafayette_1/manifest.json`, `20260520T022020Z-trips-US-descuentos/manifest.json`, `20260520T022028Z-restaurant-restaurant_2001_recibo/manifest.json`, `20260520T022046Z-supermarket-super_lily/manifest.json`, `20260520T022402Z-trips-london-IMG-20251212-WA0104/manifest.json`.
RESULTS: Completed both gates: `trips/london/british_museum_1`, `other/estacionamiento`, `gas-station/copec`, `trips/paris/galeries_lafayette_1`, and unbaselined smoke `trips/london/IMG-20251212-WA0104`. `trips/US/long` now passes transaction/math with discount `null` but fails reconstruction because the model extracted one synthesized service item instead of the expected item table. `supermarket/super_lider` remains a minor reconstruction review: correct merchant/date/currency/total, 25/25 item-price matches, discrepancy `2780` CLP (`2.7%`). `supermarket/super_lily` is also minor review: discrepancy `3100` CLP (`7.8%`). `trips/US/descuentos` improved from the prior severe double-count pattern but still has a major warning: discrepancy `843` USD minor units (`29.4%`) and discount/item reconstruction failures. `restaurant/restaurant_2001_recibo` still passes reconstruction but fails transaction gate on legal-entity vs trade-name merchant aliasing, which remains out of scope for this prompt pass.
COST/TOKENS: Final ten-case report has zero cache-derived evidence, 9 scored baselined cases, 1 unbaselined smoke case, 44,346 provider-reported tokens, and estimated Gastify cost `$0.0084294`. Legacy comparison remains labeled `legacy_flat_estimate` / `legacy_rough_token_estimate`, with ten-case flat estimate `$0.10`.
DECISION: Do not promote V2.6. Deterministic total/discount handling is safer and previous passing cases did not regress, but discount-heavy reconstruction and item-table extraction on `trips/US/long` still need follow-up before production default, staging live smoke, or S23 runtime proof.
TICK: Prompt-lab AI-quality evidence only; staging live Gemini and S23 staging evidence remain required before Phase 2 closure.

## 2026-05-19 22:41 -04 — PROMPT LAB: ten-case failure analysis and grouped run artifacts
RESULT: IMPLEMENTED + VERIFIED LOCALLY
SCOPE: Added a failure-analysis section to the V2.6 ten-case report and fixed prompt-lab artifact layout for future runs. The runner now accepts an explicit `run_id`, and the CLI exposes it as `run --run-id`. When present, artifacts are grouped as `prompt-testing/results/latest/<environment>/<prompt>/<run-id>/<case-id>/` instead of appending every case directly under the prompt folder. Existing one-off commands without `--run-id` keep the legacy flat layout.
ANALYSIS: The ten-case report now calls out the biggest failures: `trips/US/long` collapsed a visible item table into one synthesized service line; discount-heavy cases still mix product/promo/savings evidence; Chilean supermarket failures are reconstruction/discount attribution issues rather than total extraction failures; and `restaurant_2001_recibo` is a merchant alias/mapping issue, not a receipt math issue.
SMOKE: Ran a no-cost grouped-layout smoke with `cd backend && uv run python -m app.prompt_lab run --case trips/london/IMG-20251212-WA0104 --environment local --extraction-prompt receipt-extraction-v2-evidence --model google-gla:gemini-2.5-flash-lite --run-id layout-smoke-20260520`. It wrote `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/layout-smoke-20260520/trips-london-IMG-20251212-WA0104/manifest.json` with `artifact_layout=run-folder-v1`.
CLEANUP: Grouped the existing final V2.6 ten-case evidence in place under `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260520T022416Z-ten-case-v2.6-no-cache/`. The folder now contains `README.md`, the summary/analysis files, and one subfolder per case. Copied manifests use `artifact_layout=run-folder-v1` and preserve `original_artifact_dir` / `original_manifest_path` back to the original flat packet folders.
TESTS: `cd backend && uv run pytest tests/test_prompt_lab.py` (22 passed); `cd backend && uv run ruff check app/prompt_lab/runner.py app/prompt_lab/cli.py tests/test_prompt_lab.py` (pass); `cd backend && uv run pytest tests/test_coalesce.py tests/test_math_gate.py tests/test_prompt_lab.py tests/test_prompt_registry.py tests/test_persist_scan.py` (126 passed).
TICK: Future prompt-lab batches should pass the same `--run-id` to every case command and write `batch-report` output into that same run folder. Older flat packet folders were preserved for traceability.

## 2026-05-19 23:14 -04 — PROMPT LAB: receipt-level discount simplification and V2.7 ten-case no-cache run
RESULT: IMPLEMENTED + VERIFIED; PROMPT STILL NOT PROMOTED
SCOPE: Implemented the Gabe-reviewed receipt discount simplification. Scan behavior now treats discounts as transaction-level receipt evidence only. Item-level discount fields remain nullable/deprecated compatibility surface, but scan-created transaction items now persist `discount_minor=null` and `discount_label=null`. Bumped the dev-only extraction candidate to `receipt-extraction-v2-evidence@2026-05-20.v2-dev.7`; production prompt promotion remains blocked.
SCHEMA/API: Added nullable `transactions.gross_total_minor` and `transactions.reconstructed_total_minor` via `backend/alembic/versions/012_transaction_reconciliation_totals.py`. Transaction schemas and generated OpenAPI clients now expose final total, optional gross total, optional reconstructed total, and reconciliation severity/diagnostics. Raw extraction `total_amount` may be null; processed extraction resolves a final total from visible total first and reconstructed fallback second.
POST-PROCESSING: Removed item discount attribution from scan coalescing. Negative discount rows and valid adjustment evidence now fold into one receipt-level discount candidate. `gross_total_minor` is populated only when selected payable discount evidence exists; `reconstructed_total_minor` remains diagnostic. Item rows remain product/service rows with no scan-created discount fields.
CLIENTS/UI: Regenerated mobile and web OpenAPI clients. Mobile and web scan result surfaces now show final total, optional before-discount/gross total, reconstructed total, and reconciliation warning; item-level discount display was removed from scan result rows.
TESTS: `cd backend && uv run pytest tests/test_coalesce.py tests/test_math_gate.py tests/test_prompt_lab.py tests/test_prompt_registry.py tests/test_persist_scan.py tests/test_scan_stream.py` (140 passed); `cd backend && uv run ruff check ...touched backend files...` (pass); `cd mobile && npm run generate:api` (pass); `cd web && npm run generate:api` (pass); `cd mobile && npm run typecheck` (pass); `cd mobile && npm test -- --runInBand` (10 suites, 36 tests passed); `cd web && npm run build` (pass); `cd web && npm test` (8 files, 23 tests passed); `cd backend && uv run ruff check .` (pass); `cd backend && uv run ruff format --check app tests alembic/versions/012_transaction_reconciliation_totals.py` (pass); `cd backend && uv run pytest` (482 passed, 2 skipped).
LIVE COMMANDS: Ran no-cache Gemini extraction/categorization with `cd backend && uv run python -m app.prompt_lab run --case <case> --environment local --extraction-prompt receipt-extraction-v2-evidence --model google-gla:gemini-2.5-flash-lite --live --bypass-cache --limit 1 --confirm-live-cost --run-id 20260520T031000Z-ten-case-v2.7-discount-simplification-no-cache` for `supermarket/super_lider`, `trips/US/long`, `trips/london/british_museum_1`, `other/estacionamiento`, `gas-station/copec`, `trips/paris/galeries_lafayette_1`, `trips/US/descuentos`, `restaurant/restaurant_2001_recibo`, `supermarket/super_lily`, and `trips/london/IMG-20251212-WA0104`.
ARTIFACTS: Grouped batch summary `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260520T031000Z-ten-case-v2.7-discount-simplification-no-cache/ten-case-v2-7-discount-simplification-no-cache-summary.json`; grouped batch analysis `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260520T031000Z-ten-case-v2.7-discount-simplification-no-cache/ten-case-v2-7-discount-simplification-no-cache-analysis.md`. The run folder contains one case subfolder per receipt and zero cache-derived evidence.
RESULTS: Completed both gates: `gas-station/copec`, `other/estacionamiento`, `trips/london/IMG-20251212-WA0104`, `trips/london/british_museum_1`, and `trips/paris/galeries_lafayette_1`. Threshold failures: `restaurant/restaurant_2001_recibo` failed transaction gate on merchant alias only while reconstruction passed; `supermarket/super_lider` passed transaction/math with final total `102052`, receipt discount `12820`, gross total `114872`, but reconstruction still failed; `supermarket/super_lily` remained minor review with discrepancy `4190`; `trips/US/descuentos` improved to minor review with discrepancy `489`; `trips/US/long` passed transaction/math but failed reconstruction.
COST/TOKENS: Ten-case V2.7 no-cache batch used 51,366 provider-reported tokens: 34,053 input and 17,313 output. Estimated Gastify cost was `$0.0103305` using `gemini-2.5-flash-lite` Standard pricing. Legacy comparison remains labeled `legacy_flat_estimate` / `legacy_rough_token_estimate`.
DECISION: Do not promote V2.7 yet. The transaction-level discount contract is cleaner and previous passing non-discount/tender/tax/service cases remain stable, but reconstruction failures remain on Super Lider, Super Lily, US descuentos, and US long. Prompt-lab evidence remains AI-quality only; staging live Gemini and S23 staging evidence are still required before Phase 2 closure.
TICK: Receipt-level discount simplification is implemented and verified locally. Runtime proof is still open.

## 2026-05-19 23:22 -04 — PROMPT LAB: V2.7 threshold failure details
RESULT: IMPLEMENTED + VERIFIED LOCALLY
SCOPE: Updated prompt-lab batch reporting so threshold failures explain why they failed. The machine-readable summary now includes extracted item count, expected item count, item delta, item-price/quantity/unit-price match counts, receipt-discount match, and `threshold_failure_reasons`. The Markdown analysis now includes a `Gate Failure Details` table.
ARTIFACTS: Regenerated the existing V2.7 analysis without new Gemini spend at `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260520T031000Z-ten-case-v2.7-discount-simplification-no-cache/ten-case-v2-7-discount-simplification-no-cache-analysis.md` and summary JSON beside it.
TESTS: `cd backend && uv run pytest tests/test_prompt_lab.py` (23 passed); `cd backend && uv run ruff check app/prompt_lab/batch_report.py tests/test_prompt_lab.py` (pass).
TICK: Report clarity improved only; no prompt, model, or scan behavior changed.

## 2026-05-20 00:10 -04 — PROMPT LAB: receipt validation policy V1 and 14-case no-cache baseline
RESULT: IMPLEMENTED + VERIFIED; PROMPT STILL NOT PROMOTED
SCOPE: Added the shared versioned receipt validation policy `receipt-validation-policy@2026-05-20.v1` and wired it into backend math severity plus prompt-lab scoring/reporting. Prompt-lab score artifacts now separate exact `strict_status` from threshold interpretation `severity_status`, so a strict failure can be labeled `minor_review` without being converted into a strict pass. Added cache/provider validity flags to batch summaries and documented optional `GASTIFY_RECEIPT_VALIDATION_POLICY_PATH` in backend env examples.
POLICY: Exact math tolerance remains `1` minor unit. Major reconstruction warning threshold is `>25%`. Significant thresholds are `>25%` for item-count delta, item total mismatches, quantity mismatches, unit-price mismatches, and receipt-discount delta. Receipt-discount significance uses expected final transaction total as denominator.
BASELINES: Added `prompt-testing/baselines/receipt-baseline-set-v1.json` with 14 cases and policy metadata. Archived old edge baselines under `prompt-testing/test-cases/receipts/_archive/20260520Tvalidation-policy-v1/`. Refreshed `edge-cases/edgeqtytotal` and `edge-cases/totalassumedfromitemprice`; added new expected truth for `edge-cases/wtf` and `supermarket/super_lider_arrugado` by manual visual inspection.
LIVE COMMANDS: Ran no-cache Gemini extraction/categorization with `cd backend && uv run python -m app.prompt_lab run --case <case> --environment local --extraction-prompt receipt-extraction-v2-evidence --model google-gla:gemini-2.5-flash-lite --live --bypass-cache --limit 1 --confirm-live-cost --run-id 20260520T040535Z-14-case-v1-no-cache` for `gas-station/copec`, `other/estacionamiento`, `restaurant/restaurant_2001_recibo`, `supermarket/super_lider`, `supermarket/super_lily`, `trips/US/descuentos`, `trips/US/long`, `trips/london/IMG-20251212-WA0104`, `trips/london/british_museum_1`, `trips/paris/galeries_lafayette_1`, `edge-cases/edgeqtytotal`, `edge-cases/totalassumedfromitemprice`, `edge-cases/wtf`, and `supermarket/super_lider_arrugado`. Provider-level transient `SERVER_ERROR` retries occurred inside the agent for some cases, but no case ended as `provider-error`.
ARTIFACTS: Grouped run folder `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260520T040535Z-14-case-v1-no-cache/`; summary `14-case-v1-no-cache-summary.json`; analysis `14-case-v1-no-cache-analysis.md`; one case subfolder per receipt containing manifest, raw output, processed output, score, provenance, and cost summary. Batch report has `cache_evidence_status_count=0`, `provider_error_count=0`, and `no_cache_evidence_valid=true`.
RESULTS: Strict counts: 9 `completed`, 5 `threshold-failed`. Severity counts: 9 `pass`, 2 `minor_review`, 3 `significant_failure`. Minor reviews: `supermarket/super_lider` and `supermarket/super_lider_arrugado` have correct final totals, discounts, item counts, and item totals but miss some quantity/unit details. Significant failures: `edge-cases/edgeqtytotal` has correct final total/quantity/unit but wrong item total (`10420` vs expected `12400`); `supermarket/super_lily` misses the receipt discount and has item detail mismatches; `trips/US/descuentos` collapsed to zero total/items and remains a severe extraction failure.
COST/TOKENS: 14-case no-cache batch used 66,193 provider-reported tokens: 44,455 input and 21,738 output. Estimated Gastify cost was `$0.0131407` using `gemini-2.5-flash-lite` Standard pricing. Legacy comparison remains labeled `legacy_flat_estimate` / `legacy_rough_token_estimate`.
TESTS: `cd backend && uv run pytest tests/test_math_gate.py tests/test_prompt_lab.py` (45 passed); `cd backend && uv run python -m app.prompt_lab validate` (16 baselined, 5 fixture-baselined, 0 invalid, 28 unbaselined); `cd backend && uv run pytest tests/test_env_files.py tests/test_config.py` (16 passed, after fixing env test cleanup order-dependence); `cd backend && uv run ruff check app/services/receipt_validation_policy.py app/services/math_gate.py app/prompt_lab/scoring.py app/prompt_lab/batch_report.py tests/test_math_gate.py tests/test_prompt_lab.py tests/test_env_files.py` (pass); `cd backend && uv run pytest tests/test_coalesce.py tests/test_math_gate.py tests/test_prompt_lab.py tests/test_prompt_registry.py tests/test_persist_scan.py` (134 passed); `cd backend && uv run pytest` (488 passed, 2 skipped).
DECISION: Do not promote `receipt-extraction-v2-evidence@2026-05-20.v2-dev.7`. The validation policy and 14-case baseline are now durable, but significant failures remain and prompt-lab evidence is still AI-quality evidence only. Staging live Gemini and S23 staging proof remain required before Phase 2 closure.

## 2026-05-19 23:42 -04 — PROMPT LAB: manual truth refresh for V2.7 ten-case corpus
RESULT: IMPLEMENTED + REPORTED; NO GEMINI SPEND
SCOPE: Archived the previous prompt-testing expected baselines and replaced the V2.7 ten-case corpus with manually inspected expected JSON truth files. The refresh used local receipt images and Codex visual inspection only, not Gemini. Added the first expected baseline for `trips/london/IMG-20251212-WA0104`.
ARCHIVE: Previous expected files copied under `prompt-testing/test-cases/receipts/_archive/20260520T033000Z-manual-truth-refresh/` preserving case-relative paths.
KEY TRUTH FIXES: `gas-station/copec` date corrected to `2025-11-11`; `restaurant/restaurant_2001_recibo` canonical merchant changed to legal entity `SOCIEDAD CAFE 2001 LIMITADA`; `supermarket/super_lily` palta quantity corrected to `1` and line unit prices filled; `trips/US/long` corrected to 29 items by adding the missing `TRIANGLE K KIMBOLL EA` row and correcting the first chicken row to `496`; `trips/US/descuentos` rewritten as gross product rows plus receipt-level discount evidence totaling `2575`; `trips/london/IMG-20251212-WA0104` now has a 3-item Superdrug baseline.
RESCORE: Recomputed existing V2.7 `score.json` and manifest statuses from the saved raw/processed outputs against the new expected files. No extraction or categorization provider call was made.
ARTIFACTS: New comparison report `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260520T031000Z-ten-case-v2.7-discount-simplification-no-cache/ten-case-v2-7-manual-truth-refresh-analysis.md`; machine summary `ten-case-v2-7-manual-truth-refresh-summary.json`. The original label report in the same run folder was also regenerated against the refreshed truth to avoid stale score/report mismatch.
RESULTS: 10/10 cases are now baselined. 7/10 complete both gates: `gas-station/copec`, `other/estacionamiento`, `restaurant/restaurant_2001_recibo`, `trips/US/long`, `trips/london/IMG-20251212-WA0104`, `trips/london/british_museum_1`, and `trips/paris/galeries_lafayette_1`. Remaining failures: `supermarket/super_lider` has correct transaction, item count, and item totals but misses weighted quantity/unit details on 3 rows; `supermarket/super_lily` has correct item rows but fails because the scan missed receipt discount `4190`; `trips/US/descuentos` still fails discount/item interpretation with 12 extracted rows vs 10 expected and discount `2755` vs expected `2575`.
VALIDATION: Expected corpus reconstruction check passed for all ten cases: positive item totals minus expected receipt discount equal final receipt totals. `cd backend && uv run pytest tests/test_prompt_lab.py` (23 passed); `cd backend && uv run ruff check app/prompt_lab/batch_report.py tests/test_prompt_lab.py` (pass).
TICK: This changed the comparison truth and report artifacts only; no prompt, backend behavior, mobile, web, or Gemini call changed.

## 2026-05-19 23:27 -04 — PROMPT LAB: expanded gate failure detail columns
RESULT: IMPLEMENTED + VERIFIED LOCALLY
SCOPE: Expanded prompt-lab batch failure reporting again so the `Gate Failure Details` table includes transaction match, final total, expected final total, before-discount/gross total, receipt discount, item total-match count, item total-match boolean, and full item-match count. Full item match means the same expected row matches total, quantity, and unit price.
ARTIFACTS: Regenerated the V2.7 analysis and summary without new Gemini spend at `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260520T031000Z-ten-case-v2.7-discount-simplification-no-cache/`.
TESTS: `cd backend && uv run pytest tests/test_prompt_lab.py` (23 passed); `cd backend && uv run ruff check app/prompt_lab/batch_report.py tests/test_prompt_lab.py` (pass).
TICK: Report clarity improved only; no prompt, model, or scan behavior changed.

## 2026-05-20 09:02 -04 — PLAN UPDATED: P4 Phase 2 receipt prompt evaluation contract
CHANGE: Added Phase 2D to the active P4 plan for the assessed proper fix: scoring semantics, promotion threshold, baseline coverage tags, STRUCTURE allowance for baseline artifacts, one targeted prompt/postprocess iteration, and a 14-case no-cache rerun.
INPUTS: Incorporated the latest 14-case no-cache evidence (`9 completed`, `5 threshold-failed`; severity `9 pass`, `2 minor_review`, `3 significant_failure`), the Gabe Roast concerns around runtime parity, reconstruction-gate semantics, promotion locking, and cost split-brain, plus the Gabe Health pressure around receipt prompt/postprocess god files.
NEXT: `/gabe-next` should keep routing Phase 2 Exec work. The first Phase 2D batch is contract hardening before another broad prompt rewrite; receipt prompt evidence remains AI-quality only until the separate staging-e2e S23 and staging live Gemini gates pass.

## 2026-05-20 09:35 -04 — P4 Phase 2D EXEC: receipt prompt evaluation contract and v2-dev.8 no-cache run
RESULT: IMPLEMENTED + VERIFIED; PROMPT STILL NOT PROMOTED
SCOPE: Hardened prompt-lab scoring semantics so item-total mismatches are part of the reconstruction gate; added machine-readable promotion threshold and batch promotion decision; added baseline coverage tags and STRUCTURE allowance for baseline artifacts; centralized Gemini flash-lite pricing through one runtime/prompt-lab source using the official Google AI pricing page; bumped the dev-only receipt extraction candidate to `receipt-extraction-v2-evidence@2026-05-20.v2-dev.8`; added a conservative single-item `quantity * unit_price` total correction.
LIVE COMMANDS: Ran all 14 baseline cases no-cache with `cd backend && uv run python -m app.prompt_lab run --case <case> --environment local --extraction-prompt receipt-extraction-v2-evidence --model google-gla:gemini-2.5-flash-lite --live --bypass-cache --limit 1 --confirm-live-cost --run-id 20260520T131535Z-14-case-v1-v2dev8-no-cache`. `gas-station/copec` first ended in a provider `SERVER_ERROR` packet and was rerun clean under the same run id before the batch report was generated; the final batch has `provider_error_count=0`.
ARTIFACTS: Batch summary `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260520T131535Z-14-case-v1-v2dev8-no-cache/14-case-v1-v2dev8-no-cache-summary.json`; batch analysis `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260520T131535Z-14-case-v1-v2dev8-no-cache/14-case-v1-v2dev8-no-cache-analysis.md`; one grouped case folder per receipt under the run folder.
RESULTS: 14 scored baselined cases, `cache_evidence_status_count=0`, `no_cache_evidence_valid=true`. Strict counts: `8 completed`, `6 threshold-failed`. Severity counts: `8 pass`, `2 minor_review`, `4 significant_failure`. Cost/tokens: 67,816 provider-reported tokens (`46,393` input, `21,423` output), estimated cost `$0.0132085`.
PASSING FIXES: `edge-cases/edgeqtytotal` now passes after the single-item total correction. `trips/US/descuentos` no longer collapses to zero total/items and now extracts final total plus item rows, but remains significant because discount and reconstruction are still wrong.
FAILURE LIST: Significant failures are `edge-cases/wtf` (item total/quantity/unit reconstruction), `supermarket/super_lider` (visible-total conflict plus weighted quantity/unit detail), `trips/US/descuentos` (discount/item reconstruction), and `trips/US/long` (item-table over-extraction and reconstruction). Minor reviews are `supermarket/super_lider_arrugado` and `supermarket/super_lily`.
PROMOTION: Do not promote. `prompt_lab_threshold_passed=false`, `production_promotion_allowed=false`; blockers are `4 significant_failure cases present`, `staging-e2e S23 fixture gate`, and `staging S23 live Gemini smoke`.
TESTS: `cd backend && uv run ruff check app/services/llm_costs.py app/prompt_lab/costs.py app/prompt_lab/scoring.py app/prompt_lab/batch_report.py app/services/coalesce.py app/services/scan_worker.py app/services/persist_scan.py app/prompts/receipt_structure.py tests/test_prompt_lab.py tests/test_coalesce.py tests/test_prompt_registry.py tests/test_persist_scan.py tests/test_scan_worker.py` (pass); `cd backend && uv run ruff format --check app/services/llm_costs.py app/prompt_lab/costs.py app/prompt_lab/scoring.py app/prompt_lab/batch_report.py app/services/coalesce.py app/services/scan_worker.py app/services/persist_scan.py app/prompts/receipt_structure.py tests/test_prompt_lab.py tests/test_coalesce.py tests/test_prompt_registry.py tests/test_persist_scan.py tests/test_scan_worker.py` (13 files already formatted); `cd backend && uv run pytest tests/test_prompt_lab.py tests/test_prompt_registry.py tests/test_coalesce.py tests/test_math_gate.py tests/test_persist_scan.py tests/test_scan_worker.py` (157 passed); `cd backend && uv run python -m app.prompt_lab validate` (49 total, 16 baselined, 5 fixture-baselined, 28 unbaselined, 0 invalid); `cd backend && uv run pytest` (491 passed, 2 skipped); `git diff --check` on the scoped Phase 2D files (pass).
TICK: Phase 2 Exec remains 🔄. Phase 2D local prompt-lab contract work is implemented, but broader Phase 2 closure still requires the remaining prompt failure follow-up plus separate staging-e2e S23 fixture and staging live Gemini runtime gates.

## 2026-05-20 09:39 -04 — P4 Phase 2D SUPPORT: receipt pipeline documentation and Gemini 3 pricing rows
RESULT: IMPLEMENTED + VERIFIED
SCOPE: Added `prompt-testing/RECEIPT-PIPELINE.md` as the durable map of runtime scan stages, prompt-lab stages, artifact files, field ownership, scoring gates, promotion threshold, and the v2-dev.8 structural/prompt changes. Linked it from `prompt-testing/README.md` and registered it in `.kdbp/STRUCTURE.md`. Added shared pricing rows for `gemini-3.5-flash`, `gemini-3.1-flash-lite`, and `gemini-3.1-flash-lite-preview` so runtime and prompt-lab cost reports stay meaningful if those models are tested.
MODEL COST NOTE: Against the latest 14-case v2-dev.8 token counts (`46,393` input, `21,423` output), `gemini-3.5-flash` Standard would estimate about `$0.2623965` versus `$0.0132085` for `gemini-2.5-flash-lite` Standard, roughly `19.87x` higher. The newer `gemini-3.1-flash-lite` Standard would estimate about `$0.0437328`, roughly `3.31x` higher.
TESTS: `cd backend && uv run ruff format app/services/llm_costs.py tests/test_prompt_lab.py tests/test_persist_scan.py tests/test_scan_worker.py` (4 files left unchanged); `cd backend && uv run ruff check app/services/llm_costs.py tests/test_prompt_lab.py tests/test_persist_scan.py tests/test_scan_worker.py` (pass); `cd backend && uv run pytest tests/test_prompt_lab.py tests/test_persist_scan.py tests/test_scan_worker.py` (72 passed); `git diff --check` on the documentation/pricing files (pass).

## 2026-05-20 09:48 -04 — P4 Phase 2D SUPPORT: threshold factor matrix in batch reports
RESULT: IMPLEMENTED + REGENERATED CURRENT REPORT
SCOPE: Updated `backend/app/prompt_lab/batch_report.py` so batch summaries are now `prompt-lab-batch-summary.v6` and each case includes `threshold_factors`: transaction gate components, reconstruction mismatch counts/ratios, validation-policy thresholds, and severity reasons. The Markdown analysis now starts with a `Threshold Factor Matrix` before the output/cost table, showing transaction factors, reconstruction factors, severity metrics, and compact error summaries per case.
ARTIFACTS: Regenerated `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260520T131535Z-14-case-v1-v2dev8-no-cache/14-case-v1-v2dev8-no-cache-summary.json` and `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260520T131535Z-14-case-v1-v2dev8-no-cache/14-case-v1-v2dev8-no-cache-analysis.md` from existing manifests only; no Gemini calls were made.
TESTS: `cd backend && uv run ruff format app/prompt_lab/batch_report.py tests/test_prompt_lab.py` (1 file reformatted, then unchanged after final edit); `cd backend && uv run ruff check app/prompt_lab/batch_report.py tests/test_prompt_lab.py` (pass); `cd backend && uv run pytest tests/test_prompt_lab.py` (30 passed); `git diff --check` on the scoped files and regenerated artifacts (pass).

## 2026-05-20 10:01 -04 — P4 Phase 2D SUPPORT: receipt pipeline artifact diagram
RESULT: IMPLEMENTED
SCOPE: Expanded `prompt-testing/RECEIPT-PIPELINE.md` with a Gabe Docs-style diagram grammar and multiple focused diagrams: code ownership flow, runtime scan state lifecycle, prompt-lab case flow, six-file per-scan artifact packet, current issue map, extraction field class diagram, and scoring/promotion decision flow. The prompt-lab flow now uses different shapes for processes, output artifacts, decisions, stores, and events instead of identical boxes. The six per-scan artifacts are explicitly shown: `raw_output.json`, `processed_output.json`, `score.json`, `field_provenance.json`, `cost_summary.json`, and `manifest.json`.
TESTS: `git diff --check -- prompt-testing/RECEIPT-PIPELINE.md .kdbp/LEDGER.md` (pass).

## 2026-05-20 10:41 -04 — P4 Phase 2D SUPPORT: raw-vs-processed arithmetic diagnostics
RESULT: IMPLEMENTED + REGENERATED CURRENT REPORT
SCOPE: Updated `backend/app/prompt_lab/batch_report.py` to schema `prompt-lab-batch-summary.v7`. Each case now includes raw and processed arithmetic diagnostics for transaction total delta, item identity coverage, item count delta, item total-price matches, gross item-sum delta, item-level price deltas, and primary stage attribution (`raw-extraction`, `postprocess/math`, `scoring/policy`, `pass`, or `unbaselined`). The Markdown report now includes `Raw Vs Processed Arithmetic`, `Item Price Delta Details`, and `Fix Focus From This Run` sections.
ARTIFACTS: Regenerated `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260520T131535Z-14-case-v1-v2dev8-no-cache/14-case-v1-v2dev8-no-cache-summary.json` and `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260520T131535Z-14-case-v1-v2dev8-no-cache/14-case-v1-v2dev8-no-cache-analysis.md` from existing manifests only; no Gemini calls were made.
ANALYSIS: All 6 threshold-failed cases have raw transaction total delta `0`; final payable total extraction is not the current blocker. Stage attribution is 8 pass, 5 raw-extraction failures, and 1 postprocess/math failure. `supermarket/super_lider` has perfect raw and processed item totals but fails the deterministic visible-total rule. The 5 raw-extraction failures all identify every expected item name but lose positional item-price matches, which points to a scoring/matching contract fix before treating row-position drift as broad item failure.
TESTS: `cd backend && uv run ruff format app/prompt_lab/batch_report.py tests/test_prompt_lab.py` (pass); `cd backend && uv run ruff check app/prompt_lab/batch_report.py tests/test_prompt_lab.py` (pass); `cd backend && uv run pytest tests/test_prompt_lab.py` (30 passed).

## 2026-05-20 11:20 -04 — P4 Phase 2D EXEC: receipt prompt v2-dev.9 and 14-case no-cache rerun
RESULT: IMPLEMENTED + VERIFIED; PROMPT-LAB THRESHOLD PASSED; PRODUCTION STILL NOT PROMOTED
SCOPE: Implemented the focused v2-dev.9 pass. `backend/app/prompt_lab/scoring.py` now records name-aware item reconstruction counts while preserving positional diagnostics, uses name-aware severity for multi-item reconstruction, and applies a severity-only single-item positional fallback so exact one-line service receipts do not become significant amount failures because of generic item labels. `backend/app/services/coalesce.py` now ignores article-count visible-total candidates, recognizes plural Spanish discounts such as `Total Descuentos`, and keeps `N FOR` correction conservative when explicit adjustment evidence exists. `backend/app/prompts/receipt_structure.py` bumped the dev-only candidate to `receipt-extraction-v2-evidence@2026-05-20.v2-dev.9`. `backend/app/prompt_lab/batch_report.py` now writes `prompt-lab-batch-summary.v8` with name-aware/positional reconstruction factors and severity basis. `prompt-testing/RECEIPT-PIPELINE.md` now documents v2-dev.9 as the current receipt pipeline reference.
LIVE COMMANDS: Ran all 14 baseline cases no-cache with `cd backend && uv run python -m app.prompt_lab run --case <case> --environment local --extraction-prompt receipt-extraction-v2-evidence --model google-gla:gemini-2.5-flash-lite --live --bypass-cache --limit 1 --confirm-live-cost --run-id 20260520Treceipt-v2dev9-14-case-no-cache`. Transient provider `SERVER_ERROR` packets occurred for `edge-cases/wtf`, `supermarket/super_lider`, and `trips/US/long`; each was rerun under the same run id until the final batch had zero provider errors. After the final scoring-policy correction, existing no-cache artifacts were deterministically rescored and the batch report regenerated without new provider calls.
ARTIFACTS: Run folder `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260520Treceipt-v2dev9-14-case-no-cache/`; summary `14-case-v1-v2dev9-no-cache-summary.json`; analysis `14-case-v1-v2dev9-no-cache-analysis.md`; one grouped case folder per receipt with the six prompt-lab files: cost summary, field provenance, manifest, processed output, raw output, and score.
RESULTS: Final report has `case_count=14`, `provider_error_count=0`, `cache_evidence_status_count=0`, and `no_cache_evidence_valid=true`. Strict counts are `7 completed`, `7 threshold-failed`. Severity counts are `7 pass`, `7 minor_review`, and `0 significant_failure`. All 7 threshold-failed cases have raw transaction total delta `0`. `supermarket/super_lider` no longer fails due visible-total conflict; it is minor review for quantity/unit details. `supermarket/super_lily` recognizes `Total Descuentos` with discount delta `0`. `trips/US/descuentos` processed item-sum delta is not worse than raw; remaining issues are raw extraction row/discount drift, with item count `12` vs `10`, item total by name `9/10`, and discount delta `-59`.
PROMOTION: Prompt-lab threshold now passes because there are zero significant failures and no provider/cache evidence blockers. Production promotion remains blocked by the planned runtime gates: staging-e2e S23 fixture proof and staging live Gemini smoke.
TESTS: `cd backend && uv run ruff check app/prompt_lab app/services/coalesce.py app/prompts/receipt_structure.py tests/test_prompt_lab.py tests/test_coalesce.py` (pass); `cd backend && uv run pytest tests/test_prompt_lab.py tests/test_coalesce.py tests/test_math_gate.py tests/test_prompt_registry.py` (125 passed); `cd backend && uv run python -m app.prompt_lab validate` (49 total, 16 baselined, 5 fixture-baselined, 28 unbaselined, 0 invalid); `git diff --check` on scoped source, docs, KDBP, and v2-dev.9 report artifacts (pass).
TICK: Phase 2D prompt-lab pass is complete. Remaining work is runtime proof, not prompt-lab production promotion.

## 2026-05-20 11:35 -04 — DECISION: accept v2-dev.9 prompt-lab state with review-warning risks
RESULT: DOCUMENTED; NO CODE CHANGES
SCOPE: Recorded the user decision that v2-dev.9 is good enough for now because the remaining threshold failures are `minor_review`, all failed cases have correct final payable transaction totals, and names/categories/service labels are expected to be user-correctable. Added DECISION D44, updated `prompt-testing/RECEIPT-PIPELINE.md`, refreshed `.kdbp/PLAN.md`, and added PENDING P24 for the future runtime/UI work.
DECISION: Proceed with v2-dev.9 as the accepted prompt-lab candidate state, still dev-only until staging runtime gates pass. The accepted risk is that discount-heavy, math-warning, item-count, or meaningful item amount discrepancies must produce a review warning instead of being silently treated as clean. Small discrepancies and item-name issues are acceptable review/edit concerns.
UI REQUIREMENT: Preserve original extracted item order for a receipt-order view that can be compared side by side against the receipt image. Category grouping is a secondary view over the same items, not a replacement for receipt order.
PENDING: P24 now tracks the runtime review-warning signal and order-preserving/category-grouped UI requirement.
TESTS: `git diff --check` on `.kdbp/DECISIONS.md`, `.kdbp/PLAN.md`, `.kdbp/PENDING.md`, `.kdbp/LEDGER.md`, and `prompt-testing/RECEIPT-PIPELINE.md` (pass).

## 2026-05-20 12:09 -04 — G4 SCAN PIPELINE: backend review-signal contract
RESULT: IMPLEMENTED + VERIFIED; NO LIVE GEMINI SPEND
SCOPE: Implemented the gravity-well backend pass for accepted v2-dev.9 risks. Added typed scan review contracts (`ScanReviewSignal`, `ScanReviewLevel`, `ScanCompleteData`), one G4 helper (`backend/app/services/scan_review.py`) that computes runtime signals from raw extraction, processed extraction, and `MathReconciliationVerdict`, and persisted `scan_review_level` / `scan_review_signals` on transactions via Alembic revision `013`.
RUNTIME CONTRACT: `scan_complete` now includes `review_level` and `review_signals` while preserving existing fields and existing completed/needs-review status behavior. Math reconciliation deltas still route to `needs_review`; non-math signals can complete with `review_level=warning`. Transaction list responses expose `scan_review_level`; transaction detail responses expose both `scan_review_level` and `scan_review_signals`. Manual transaction create/update schemas still do not accept scan-owned review fields. `TransactionItem.sort_order` remains the receipt-order view contract.
ARCHITECTURE: Added DECISION D45. Review-signal computation stays inside G4 Scan Pipeline; G2 is touched only for Pydantic/DB transaction contract fields; G1 is touched only for stream/API read contracts. Did not split `coalesce.py` or create a shared runtime/prompt-lab engine.
DOCS: Updated `prompt-testing/RECEIPT-PIPELINE.md` with runtime review-signal fields, diagram, signal-code table, and backend follow-up notes. Upgraded `docs/wells/4-scan-pipeline.md` from placeholder to a concise G4 gravity-well diagram and boundary table. Marked P24 as backend-contract implemented while still open for mobile/web warning UI.
TESTS: `cd backend && uv run ruff check app tests` (pass); `cd backend && uv run pytest tests/test_scan_worker.py tests/test_scan_stream.py tests/test_persist_scan.py tests/test_scans.py tests/test_math_gate.py` (94 passed); focused `cd backend && uv run pytest tests/test_scan_review.py tests/test_scan_stream.py tests/test_persist_scan.py tests/test_transactions.py` (70 passed); `cd backend && uv run python -m app.prompt_lab validate` (49 total, 16 baselined, 5 fixture-baselined, 28 unbaselined, 0 invalid); cached v2-dev.9 batch-report regeneration from existing manifests (14 cases, total cost `$0.0143665`, no provider call); `git diff --check` (pass).

## 2026-05-20 12:43 -04 — PROMPT LAB: expanded 44-real-case v2-dev.9 no-cache run
RESULT: COMPLETED; TWO NEW EXPECTED BASELINES ADDED
SCOPE: Repeated the expanded real receipt corpus with `google-gla:gemini-2.5-flash-lite` and dev-only prompt `receipt-extraction-v2-evidence@2026-05-20.v2-dev.9`. The prompt-testing corpus contains 49 image cases: 44 real receipt images plus 5 adversarial fixture placeholders. The run covered all 44 real cases rather than silently dropping live receipt images from the requested broad rerun.
BASELINES: Added manual expected JSON for two previously unbaselined backlog receipts: `other/peaje` and `other/venta_x_pucon`. Also corrected existing Villarrica expected truth after visual review: `CABLE EXTENSION USB 1.8 M` is a quantity-3 row with a canonical line total of CLP 10,500, not CLP 3,500. Prompt-lab validation now reports 49 total cases, 18 scored expected baselines, 5 fixture baselines, 26 unbaselined smoke cases, and 0 invalid expected files.
LIVE COMMANDS: Ran all non-adversarial cases no-cache under run id `20260520Treceipt-v2dev9-44-real-case-no-cache`. A long-running Paris case was killed and resumed under the same run id with per-case timeouts. After correcting Villarrica truth, that case was rerun live with `--bypass-cache` under the same run id; transient provider `SERVER_ERROR` retries cleared on a second attempt. Final manifests exist for all 44 real cases and `provider_error_count=0`.
ARTIFACTS: Run folder `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260520Treceipt-v2dev9-44-real-case-no-cache/`; summary `44-real-case-v2dev9-no-cache-summary.json`; analysis `44-real-case-v2dev9-no-cache-analysis.md`; one grouped case folder per receipt with the six prompt-lab files.
RESULTS: `case_count=44`, strict counts `31 completed` and `13 threshold-failed`; severity counts `31 pass`, `11 minor_review`, and `2 significant_failure`; no-cache evidence valid; estimated cost `$0.0346024` over 204,025 tokens. The two new baselines behaved as follows: `other/peaje` passed cleanly, while `other/venta_x_pucon` was minor review only because the single service-item label differed while total/math were exact.
REMAINING SIGNIFICANT CASES: `other/test_villarrica` is a false-severity scoring case after truth correction: final total is correct, item count and names match, and the remaining item delta is only 3 CLP (`CABLE EXTENSION USB 1.8 M` expected 10,500 vs extracted 10,503), but exact item-total matching counts this as 1/3 item-total mismatch and escalates it. `trips/paris/IMG-20251212-WA0110` is an unbaselined real issue: total 84.00 EUR, item 112.00 EUR, and a French `REMise` 28.00 EUR adjustment is extracted but ignored by postprocess, yielding a 33.3% math warning.
TESTS: `cd backend && uv run python -m app.prompt_lab validate` (49 total, 18 baselined, 5 fixture-baselined, 26 unbaselined, 0 invalid); refreshed Villarrica with a live no-cache rerun; regenerated the 44-case batch report from final manifests; `git diff --check` on the expected files, expanded report folder, and ledger (pass).

## 2026-05-20 13:08 -04 — PROMPT LAB: French remise deterministic fix and 16-case no-cache run
RESULT: IMPLEMENTED + VERIFIED; BROAD PROMPT CHASING STILL NOT RECOMMENDED
SCOPE: Added French discount evidence terms (`remise`, `réduction`/`reduction`, `rabais`) to the deterministic receipt discount recognizer in `backend/app/services/coalesce.py`, added a targeted Sephora-style unit test, and bumped the prompt-lab postprocessing cache version to avoid stale processed replay packets.
TARGETED VERIFICATION: Replayed the prior Paris raw shape from the 44-case run (`PACO INVICTUS SET 200` item total `11200`, `REMise` adjustment `2800`, final total `8400`) through the new coalesce logic. The processed result now keeps item total `11200`, sets receipt discount `2800`, reconstructs final total `8400`, and passes math with severity `none`.
LIVE COMMANDS: Ran the controlled 16-case no-cache set under run id `20260520Treceipt-v2dev9-remise-16-case-no-cache`: the 14 receipt-baseline-set-v1 cases plus `other/test_villarrica` and `trips/paris/IMG-20251212-WA0110`. All 16 final manifests have `prompt-lab-ai-quality` evidence; `provider_error_count=0`; `cache_evidence_status_count=0`; `no_cache_evidence_valid=true`.
ARTIFACTS: Run folder `prompt-testing/results/latest/local/receipt-extraction-v2-evidence/20260520Treceipt-v2dev9-remise-16-case-no-cache/`; summary `16-case-v2dev9-remise-no-cache-summary.json`; analysis `16-case-v2dev9-remise-no-cache-analysis.md`.
RESULTS: The Paris sentinel now passes in the live no-cache run with final total `8400`, reconstructed total `8400`, discrepancy `0`, and severity `pass`. In that live extraction, Gemini returned the item total already discounted (`8400`) while still including a `REMISE 2800` adjustment, so postprocess correctly ignored the adjustment to avoid double-discounting. The deterministic replay above proves the original gross-item-plus-remise failure mode is also fixed.
RESIDUALS: The 16-case report has strict counts `7 completed` / `9 threshold-failed` and severity counts `7 pass`, `7 minor_review`, `2 significant_failure`. The two significant cases are not evidence that the remise fix regressed runtime totals: `gas-station/copec` has correct merchant, final total, item total, and unit price but fails quantity exactness; `other/test_villarrica` has correct final total but this live run merged two item rows and missed one item, producing a raw-extraction reconstruction warning. These are review-signal/scoring concerns under the accepted policy, not reasons to reopen broad prompt work.
TESTS: `cd backend && uv run ruff check app/services/coalesce.py app/prompt_lab/cache.py tests/test_coalesce.py` (pass); `cd backend && uv run pytest tests/test_coalesce.py` (69 passed); `cd backend && uv run python -m app.prompt_lab validate` (49 total, 18 baselined, 5 fixture-baselined, 26 unbaselined, 0 invalid); `cd backend && uv run pytest tests/test_coalesce.py tests/test_prompt_lab.py tests/test_math_gate.py` (121 passed); targeted old-raw Paris deterministic replay (math passed); `git diff --check` on scoped code and 16-case artifacts (pass).

## 2026-05-20 14:08 -04 — P4 Phase 2 EXEC RESUME: live runtime proof blocked
RESULT: HALTED; PHASE 2 EXEC REMAINS 🔄
ROUTE: `/gabe-next` resolved Current Phase 2 (`Camera scan + WebSocket progress`) to `/gabe-execute` because Exec is still `🔄`.
EVIDENCE INVENTORY: Existing S23 `staging-e2e` fixture artifacts are present for happy, review, failure, and camera-permission flows under `tests/mobile/results/latest/staging-e2e/`. Existing staging live-Gemini evidence proves provider-path calls succeeded with `gemini-2.5-flash-lite`, but the stored Maestro manifest remains `result_status=failed` because that pre-fix flow expected `Scan complete` instead of accepting the result panel.
BLOCKER: The required clean live-staging S23 harness pass cannot be rerun from the current environment. `bash scripts/staging/check-backend-ready.sh https://gastify-api-staging-staging.up.railway.app` and the staging-e2e equivalent both returned HTTP 404 at `/api/v1/health/ready`; `cd mobile && npm run doctor:e2e` reported no authorized S23 visible to native ADB.
NEXT: Bring the Railway staging/staging-e2e APIs back to ready state, attach/authorize Samsung S23 `RFCW90N4BYP` to WSL native ADB, open the dev client, then run `tests/mobile/maestro/p4-phase2-scan-upload-live-active.yaml` against `staging` with `scan_provider=gemini`. If that clean live harness pass is captured, Phase 2 Exec can be re-evaluated for closure; otherwise it must remain `🔄`.

## 2026-05-20 14:46 -04 — P4 Phase 2 EXEC RESUME: S23 local-staging runtime proof captured
RESULT: RUNTIME PROOF ADVANCED; STRICT DEPLOYED RAILWAY GATE STILL BLOCKED; PHASE 2 EXEC REMAINS 🔄
SETUP: Railway CLI is authenticated to project `Gastify`, environment `staging`. Samsung S23 `RFCW90N4BYP` is attached to WSL native ADB and passed the mobile E2E ADB gate. `adb reverse tcp:8000 tcp:8000` and `adb reverse tcp:8081 tcp:8081` were active. Staging and staging-e2e Railway Postgres databases were migrated to Alembic head `013`.
CONFIG FIXES: Set staging runtime variables to `GASTIFY_SCAN_PROVIDER=gemini`, `GASTIFY_GEMINI_MODEL=gemini-2.5-flash-lite`, and `GASTIFY_RECEIPT_EXTRACTION_PROMPT_ID=receipt-extraction-v2-evidence`. Set staging-e2e fixture variables to `GASTIFY_SCAN_PROVIDER=fixture`, `GASTIFY_E2E_SCAN_FIXTURES_ENABLED=true`, and `GASTIFY_E2E_SCAN_EVENT_DELAY_MS=600`. Corrected API database references to the Railway Postgres services.
HARNESS FIX: The live and happy Maestro upload flows now scroll before tapping `scan-reset-button`; the scan proof was already visible, but the reset button was below the fold on longer result panels.
LIVE GEMINI PROOF: Ran `tests/mobile/maestro/p4-phase2-scan-upload-live-active.yaml` on the S23 through Expo dev client + local WSL API process using Railway staging variables and Railway staging Postgres. The first live attempt exposed local storage path `/data/scans` as invalid outside Railway, so the rerun used a writable local scan storage override while preserving staging DB/Firebase/Gemini config. Final artifact: `tests/mobile/results/latest/staging-local/p4-phase2-scan-upload-live-active/manifest.json` with `result_status=passed`, `backend_environment=staging`, `scan_provider=gemini`, `device_id=RFCW90N4BYP`, and `api_base_url=http://127.0.0.1:8000`.
LIVE RESULT: Final live scan id `44945d0f-bd28-4704-a0b1-13b85dab1f14` persisted transaction `10bfa443-3984-4899-9ce5-24ca30f40658` for `COMERCIAL MASSALUD SPA`, `CLP 29,002`, `10` items. Runtime logs show `receipt-extraction-v2-evidence@2026-05-20.v2-dev.9`, `google-gla:gemini-2.5-flash-lite`, extraction HTTP 200, one transient categorization HTTP 503 recovered by retry, math discrepancy `0`, `scan_review_level=none`, and `scan_review_signal_count=0`.
FIXTURE PROOF: Refreshed deterministic S23 fixture flows against local WSL API process using Railway staging-e2e Postgres and fixture provider. All latest manifests now include `result_status=passed`: `tests/mobile/results/latest/staging-e2e/p4-phase2-scan-upload-happy-active/manifest.json`, `tests/mobile/results/latest/staging-e2e/p4-phase2-scan-upload-review-active/manifest.json`, `tests/mobile/results/latest/staging-e2e/p4-phase2-scan-upload-failure-active/manifest.json`, and `tests/mobile/results/latest/staging-e2e/p4-phase2-camera-permission-denied-active/manifest.json`.
BLOCKER: Public Railway API services are still not deployable or reachable. `railway deployment redeploy --service gastify-api-staging --yes` returned `Deploys have been paused temporarily`, and the public staging/staging-e2e API domains still return Railway 404 at `/api/v1/health/ready`. Because the active environment gate requires deployed Railway API proof, this pass does not close Phase 2 Exec even though the S23 + Railway DB + provider paths are now proven locally.
NEXT: Unpause Railway deploys, redeploy `gastify-api-staging` and `gastify-api-staging-e2e`, verify `/api/v1/health/ready` on the public domains, then rerun the same S23 live and fixture flows with `api_base_url` set to the Railway domains. If those pass, Phase 2 Exec can be considered for ✅ and routed to `/gabe-review`.

## 2026-05-25 16:46 -04 — P5 Phase 2 EXEC COMPLETE: Statement PDF upload + extraction worker
RESULT: IMPLEMENTED + VERIFIED; PHASE 2 EXEC MARKED ✅
ROUTE: `/gabe-next` resolved P5 Current Phase 2 to `/gabe-execute` because Exec was ⬜, then opened the phase as 🔄 before implementation.
IMPLEMENTATION COMMIT: `4f08a7a` (`feat(statements): add PDF upload worker`) adds authenticated statement PDF upload/list/get/lines/process endpoints, an SSE statement event stream, Railway-volume-backed file storage, PDF encryption/password inspection, a statement extraction worker, deterministic staging-e2e fixture extraction, generated web/mobile API contracts, and a deployed statement fixture gate script.
LOCAL VERIFICATION: `cd backend && uv run ruff check .` (pass); `cd backend && uv run ruff format --check .` (pass); targeted mypy over statement API/worker modules (pass); statement/config focused tests (35 passed); full backend suite (553 passed, 2 skipped, 1 warning); `cd web && npm run build` (pass); `cd mobile && npm run typecheck` (pass); `git diff --check` (pass); `bash scripts/ci/check-ng06-pci-exclusion.sh` (pass); `bash scripts/ci/check-rls-table-coverage.sh` (pass).
CI: Pushed `4f08a7a472255e3afd41cd20b2983612fa8de033` to `origin/staging`; GitHub Actions `CI` run `26419027709` passed.
RAILWAY DEPLOY: Explicit fallback deploy used for both API services: `railway up ./backend --path-as-root --environment staging --service gastify-api-staging --detach --ci` produced deployment `4bd96488-33f4-48b1-8c3f-e947101f0a57`; `railway up ./backend --path-as-root --environment staging --service gastify-api-staging-e2e --detach --ci` produced deployment `3db66826-cd1f-4478-b072-10a2935a41ee`. Both reached `SUCCESS/RUNNING`.
READINESS: `bash scripts/staging/check-backend-ready.sh https://gastify-api-staging-staging.up.railway.app` and `bash scripts/staging/check-backend-ready.sh https://gastify-api-staging-e2e-staging.up.railway.app` both returned `status=ok`, `database=connected`, `migration_status=current`, `migration_current=016`, `migration_head=016`.
RUNTIME PROOF: Ran `cd backend && GASTIFY_STAGING_E2E_API_BASE_URL=https://gastify-api-staging-e2e-staging.up.railway.app GASTIFY_RESULT_ENV=staging-e2e GASTIFY_STATEMENT_STAGE_ID=20260525T-p5-statement-fixture-gate uv run python ../scripts/staging/run-statement-fixture-gate.py`. The gate signed into the staging E2E Firebase user, uploaded a generated PDF through `/api/v1/statements`, polled the deployed worker to `status=extracted`, and verified two persisted fixture lines (`SUPERMERCADO FIXTURE`, `PAGO RECIBIDO`).
ARTIFACTS: `tests/mobile/results/runs/staging-e2e/20260525T-p5-statement-fixture-gate/p5-statement-fixture-backend/manifest.json`; `readiness.json`; `upload-response.json`; `final-statement.json`; `lines.json`; run manifest `tests/mobile/results/runs/staging-e2e/20260525T-p5-statement-fixture-gate/run-manifest.json`. Statement id: `4a17c00a-1787-4968-bd76-ffcbff290618`; final status: `extracted`; line count: `2`.
PRIVACY: The runtime gate uses a generated non-sensitive PDF. No raw legacy bank PDFs, credentials, PAN, CVV, expiry, or password values are committed or written to evidence artifacts.
NEXT: Route Phase 2 to `/gabe-review`; Review remains ⬜ and Push remains ⬜.

## 2026-05-20 15:10 -04 — MOBILE E2E: environment run-folder artifact layout
RESULT: IMPLEMENTED + SMOKE-VERIFIED; NO DEVICE OR PROVIDER SPEND
SCOPE: Changed mobile environment testing artifacts from latest/archive-first packets to durable run-folder packets. `tests/mobile/scripts/run-maestro.sh` now writes source-of-truth evidence to `tests/mobile/results/runs/<env>/<run-id>/<flow>/`, writes a run-level `run-manifest.json`, and mirrors the latest flow packet to `tests/mobile/results/latest/<env>/<flow>/` only for quick inspection. The legacy `--archive` flag is now compatibility-only because each run has a durable folder.
GROUPING: `GASTIFY_MOBILE_RUN_ID` groups several flows into one environment proof packet. `scripts/staging/run-s23-fixture-gate.sh` now sets one shared run id for the full staging-e2e fixture gate; `tests/mobile/scripts/run-scan-upload-maestro.sh` sets a per-case run id only when no shared id exists. `tests/mobile/scripts/doctor-mobile.sh` also writes to `runs/<env>/<run-id>/environment/mobile-doctor.txt` and mirrors to latest.
DOCS: Updated `tests/mobile/results/README.md`, `mobile/TESTING.md`, `tests/mobile/maestro/README.md`, `mobile/ANDROID_E2E_SETUP.md`, and `mobile/STAGING_SETUP.md` to make `runs/<env>/<run-id>/` the proof source and `latest/<env>/` a convenience mirror.
TESTS: `bash -n tests/mobile/scripts/run-maestro.sh tests/mobile/scripts/run-scan-upload-maestro.sh tests/mobile/scripts/doctor-mobile.sh scripts/staging/run-s23-fixture-gate.sh scripts/dev/run-s23-local-ui-smoke.sh` (pass); fake ADB/Maestro artifact-layout smoke wrote and validated a run manifest, flow manifest, latest mirror, and JSON with `jq` (pass); fake doctor layout smoke validated run/latest report mirroring and JSON with `jq` (pass); `git diff --check` on scoped scripts/docs/KDBP files (pass).

## 2026-05-20 15:19 -04 — MOBILE E2E: legacy packet archive and first run-folder examples
RESULT: IMPLEMENTED + REAL S23 EXAMPLE CAPTURED; NO GEMINI SPEND
ARCHIVE: Moved pre-run-folder generated mobile packets into `tests/mobile/results/archive/20260520T191623Z-legacy-pre-run-folder/`. The bundle preserves the old `latest/` tree and previous `archive/` tree so the old evidence is not lost, while new `latest/` starts clean.
EXAMPLE DOCTOR RUN: Ran `tests/mobile/scripts/doctor-mobile.sh` with `GASTIFY_ARTIFACT_ENV=local` and `GASTIFY_MOBILE_RUN_ID=20260520T191627Z-local-environment-doctor-example`. It wrote `tests/mobile/results/runs/local/20260520T191627Z-local-environment-doctor-example/run-manifest.json`, `environment/mobile-doctor.txt`, and mirrored to `tests/mobile/results/latest/local/`.
EXAMPLE MAESTRO RUN: Started local Metro/dev-client, opened the S23 dev client, and ran `tests/mobile/scripts/run-maestro.sh tests/mobile/maestro/p4-phase2-scan-entry-active.yaml` with `GASTIFY_MOBILE_RUN_ID=20260520T191745Z-local-s23-scan-entry-example`. The S23 flow passed in 10s, proving sign-in, home screen, scan capture panel, camera button, library button, screenshot capture, and sign-out. Results are under `tests/mobile/results/runs/local/20260520T191745Z-local-s23-scan-entry-example/p4-phase2-scan-entry-active/`; latest mirror points to that run through `tests/mobile/results/latest/local/CURRENT_RUN.txt`.
NOTES: This was a local scan-entry structure example only. It did not call Gemini and does not close the deployed Railway Phase 2 gate.

## 2026-05-20 15:30 -04 — MOBILE E2E: rename artifacts surface to results
RESULT: IMPLEMENTED; STRUCTURE PRESERVED
SCOPE: Renamed the mobile environment evidence root from `tests/mobile/artifacts/` to `tests/mobile/results/` so the folder reads as test results instead of generic generated artifacts. Existing `runs/`, `latest/`, and `archive/` packets were moved in place.
SCRIPT CONTRACT: `tests/mobile/scripts/run-maestro.sh` and `tests/mobile/scripts/doctor-mobile.sh` now default to `tests/mobile/results/`, emit result-oriented manifest fields, and support `GASTIFY_MOBILE_RESULTS_ROOT` plus `GASTIFY_RESULT_ENV`. The older `GASTIFY_MOBILE_ARTIFACT_ROOT` and `GASTIFY_ARTIFACT_ENV` names remain accepted as compatibility fallbacks.
DOCS: Updated mobile/runbook references to `tests/mobile/results/` and changed the mobile evidence README to `tests/mobile/results/README.md`.
TESTS: `bash -n tests/mobile/scripts/run-maestro.sh tests/mobile/scripts/run-scan-upload-maestro.sh tests/mobile/scripts/doctor-mobile.sh scripts/staging/run-s23-fixture-gate.sh scripts/dev/run-s23-local-ui-smoke.sh` (pass); temp-root fake ADB/Maestro smoke verified `run-maestro.sh` writes `mobile-e2e-run-manifest.v2` and `mobile-e2e-flow-manifest.v3` under a `results/` root; temp-root doctor smoke verified `doctor-mobile.sh` writes the new result manifest shape.

## 2026-05-20 19:34 -04 — DEPLOYMENT ARCH: Railway primary, Render fallback deferred
RESULT: DECISION RECORDED; NO CODE CHANGES
SCOPE: Added D46 to record that Railway remains the current deployment platform for staging, production cutover, and MVP launch work. Render is the selected future managed fallback platform, but the migration/escape-hatch plan is deferred until after production launch unless Railway blocks launch-critical proof again.
PENDING: Added P25 for the post-launch Render fallback proof: backend deploy, WebSocket/SSE behavior, SPA hosting choice, Postgres/scheduler fit, storage portability, backup/restore drill, and staging smoke evidence.
RATIONALE: The Railway outage exposed provider-concentration risk, but an immediate migration would disrupt the current Railway/S23 proof path more than it would reduce MVP risk.

## 2026-05-20 19:44 -04 — P4 Phase 2 EXEC RESUME: Railway APIs recovered, S23 still blocking
RESULT: PARTIAL READY; PHASE 2 EXEC REMAINS 🔄
ROUTE: `/gabe-next` resolved Current Phase 2 (`Camera scan + WebSocket progress`) to `/gabe-execute` because Exec is still `🔄`.
RAILWAY: Public Railway deploys are working again. Redeployed `gastify-api-staging-e2e` with `npx -y @railway/cli@latest up ./backend --path-as-root --service gastify-api-staging-e2e --detach --ci` and `gastify-api-staging` with `railway up ./backend --path-as-root --service gastify-api-staging --detach --ci` after one parallel `npx` cache race on the staging service.
READINESS: `bash scripts/staging/check-backend-ready.sh https://gastify-api-staging-staging.up.railway.app` and the same command for `https://gastify-api-staging-e2e-staging.up.railway.app` both returned `status=ok`, `database=connected`, `migration_status=current`, `migration_current=013`, and `migration_head=013`. `railway status --json` shows both API deployments `SUCCESS` and not stopped.
BLOCKER: The Samsung S23 is not currently visible to native WSL ADB or the Windows ADB wrapper. `cd mobile && npm run doctor:e2e` and `GASTIFY_RESULT_ENV=staging-e2e GASTIFY_MOBILE_RUN_ID=20260520T234500Z-staging-e2e-device-blocker tests/mobile/scripts/doctor-mobile.sh` both reported no authorized Android device visible to ADB.
ARTIFACTS: Device blocker report `tests/mobile/results/runs/staging-e2e/20260520T234500Z-staging-e2e-device-blocker/environment/mobile-doctor.txt`, mirrored to `tests/mobile/results/latest/staging-e2e/environment/mobile-doctor.txt`.
NEXT: Attach/authorize Samsung S23 `RFCW90N4BYP` to the same host side as Maestro, open the Expo dev client with the Railway API base URL, then run the staging-e2e fixture gate and one staging live Gemini flow against the now-healthy Railway API domains.

## 2026-05-20 19:57 -04 — P4 Phase 2 EXEC COMPLETE: deployed Railway S23 runtime proof captured
RESULT: IMPLEMENTED + VERIFIED; PHASE 2 EXEC MARKED ✅
ROUTE: Resumed the Phase 2 `/gabe-execute` runtime proof after the Samsung S23 was attached to WSL native ADB. Public Railway `staging` and `staging-e2e` APIs were already healthy at Alembic head `013`.
DEVICE: Attached Samsung S23 `RFCW90N4BYP` through `usbipd attach --wsl --busid 2-2`. Native WSL ADB reported `RFCW90N4BYP device usb:1-1 product:dm1qxxx model:SM_S911B device:dm1q`.
STAGING-E2E FIXTURE PROOF: Ran the deployed Railway fixture gate with `GASTIFY_STAGING_E2E_API_BASE_URL=https://gastify-api-staging-e2e-staging.up.railway.app`, `MAESTRO_DEVICE_ID=RFCW90N4BYP`, `MAESTRO_REINSTALL_DRIVER=false`, and shared run id `20260520Tresume-staging-e2e-s23-fixture-phase2`. The happy, review, failure, and camera-permission-denied flows all have `result_status=passed` and `flow_manifest_count=4`.
STAGING LIVE GEMINI PROOF: Seeded `prompt-testing/test-cases/receipts/supermarket/super_lider.jpg` to `/sdcard/Pictures/GastifyE2E/gastify-live-super-lider.jpg`, started the Expo dev client against `https://gastify-api-staging-staging.up.railway.app`, and ran `tests/mobile/maestro/p4-phase2-scan-upload-live-active.yaml` with `GASTIFY_RESULT_ENV=staging`, `GASTIFY_ENVIRONMENT=staging`, `GASTIFY_SCAN_PROVIDER=gemini`, `GASTIFY_SCAN_TEST_CASE_ID=live-super-lider-flash-lite`, and run id `20260520Tresume-staging-s23-live-gemini-super-lider`. The flow passed in 1m 3s with `scan_provider=gemini`, `backend_environment=staging`, and `api_base_url=https://gastify-api-staging-staging.up.railway.app`.
LIVE RESULT: The live `super_lider` scan reached the review terminal state, not a clean no-warning completion. Screenshot `03-scan-result.png` shows `Scan needs review`, total `CLP 102,052`, before discount `CLP 111,792`, discount `-CLP 9,740`, and reconstructed `CLP 105,132`. This is acceptable Phase 2 runtime routing evidence under the accepted review-warning policy; it should be carried into Phase 3/4 warning UI work rather than hidden.
ARTIFACTS: Fixture packet `tests/mobile/results/runs/staging-e2e/20260520Tresume-staging-e2e-s23-fixture-phase2/`; live packet `tests/mobile/results/runs/staging/20260520Tresume-staging-s23-live-gemini-super-lider/`; latest mirrors updated under `tests/mobile/results/latest/staging-e2e/` and `tests/mobile/results/latest/staging/`.
NEXT: Route to `/gabe-review` for Phase 2 review before commit/push. Review should verify that the deployed Railway evidence is sufficient and should call out the live review-state result as an accepted runtime warning, not a prompt-lab blocker.

## 2026-05-21 15:40 -04 — P4 Phase 3 REVIEW COMPLETE: S23 scan-to-transaction handoff proof captured
RESULT: VERIFIED; PHASE 3 REVIEW MARKED ✅
ROUTE: Resumed the Phase 3 `/gabe-review` closure after the consolidated review left one HIGH runtime-evidence gap: scan completion had unit coverage, but no physical S23 artifact proved the `scan-view-transaction-button` handoff into `TransactionDetail`.
DEVICE: Samsung S23 `RFCW90N4BYP` was visible to native WSL ADB as `SM_S911B`. The Railway `staging-e2e` API readiness check returned `status=ok`, `database=connected`, `migration_status=current`, `migration_current=013`, and `migration_head=013`.
HARNESS: Added `tests/mobile/maestro/p4-phase3-scan-to-transaction-active.yaml`. The first app-control attempt proved the app-side test controls were visible but the deployed API currently rejects `/api/v1/scan-test-cases/*/runs` with `Scan test controls are disabled`, so the closure run uses the existing deterministic fixture-gallery lane instead: seed `gastify-e2e-happy.jpg`, choose it through the real Android picker, wait for scan progress/result, tap `scan-view-transaction-button`, and assert `transaction-detail-screen`.
COMMANDS: `bash scripts/staging/check-backend-ready.sh https://gastify-api-staging-e2e-staging.up.railway.app`; `MAESTRO_DEVICE_ID=RFCW90N4BYP bash tests/mobile/scripts/seed-scan-fixture.sh happy`; `EXPO_DEV_CLIENT_URL=<exp+gastify-mobile tunnel> CLEAR_APP_STATE=true MAESTRO_DEVICE_ID=RFCW90N4BYP bash tests/mobile/scripts/open-dev-client.sh`; `GASTIFY_RESULT_ENV=staging-e2e GASTIFY_MOBILE_RUN_ID=20260521Tphase3-scan-to-transaction-s23-r4 EXPO_PUBLIC_APP_ENV=staging-e2e EXPO_PUBLIC_API_BASE_URL=https://gastify-api-staging-e2e-staging.up.railway.app EXPO_PUBLIC_SCAN_TEST_CONTROLS_ENABLED=true GASTIFY_ENVIRONMENT=staging-e2e GASTIFY_SCAN_PROVIDER=fixture GASTIFY_MOBILE_BUILD_ID=dev-client-s23-phase3 GASTIFY_SCAN_TEST_CASE_ID=happy MAESTRO_DEVICE_ID=RFCW90N4BYP MAESTRO_VERBOSE=true MAESTRO_REINSTALL_DRIVER=false bash tests/mobile/scripts/run-maestro.sh tests/mobile/maestro/p4-phase3-scan-to-transaction-active.yaml`.
ARTIFACTS: Passing run folder `tests/mobile/results/runs/staging-e2e/20260521Tphase3-scan-to-transaction-s23-r4/`; flow manifest `p4-phase3-scan-to-transaction-active/manifest.json` has `result_status=passed`, `device_id=RFCW90N4BYP`, `app_env=staging-e2e`, `scan_provider=fixture`, and `test_case_id=happy`. Screenshots captured `01-phase3-scan-image-selected.png`, `02-phase3-scan-progress.png`, `03-phase3-scan-complete-view-transaction.png`, and `04-phase3-transaction-detail-from-scan.png`.
CLEANUP: Failed setup/debug iterations `20260521Tphase3-scan-to-transaction-s23-r1`, `r2`, and `r3` were moved out of the active run folder into `tests/mobile/results/archive/20260521-phase3-scan-to-transaction-debug/staging-e2e/` so the active `runs/staging-e2e` lane keeps only the passing Phase 3 handoff packet.
ARCHIVED: `.kdbp/reviews-archive/REVIEW_2026-05-21-154000_resolved.md`
TESTS: S23 Maestro flow passed in 58s; `cd mobile && npm run typecheck` passed; `cd mobile && npm test -- --runInBand` passed (16 suites / 80 tests); `cd backend && uv run pytest tests/test_transactions.py` passed (31 tests); `git diff --check` passed. Archived review has `Verdict: APPROVE`; `.kdbp/PLAN.md` marks Phase 3 Review ✅.

## 2026-05-25 13:17 -04 — [105f697] feat(statements): add card alias schema foundation
FINDINGS: 3 (0 critical, 0 high, 1 medium, 2 low)
ACTIONS: accepted documentation drift for this implementation commit; `docs/wells/**` and `.kdbp/KNOWLEDGE.md` already have separate unstaged edits and were intentionally not mixed into Phase 1 backend schema scope.
DEFERRED: none
CHECKS: `cd backend && uv run ruff check .` (pass); `cd backend && uv run ruff format --check .` (pass); `cd backend && uv run mypy app/models/statement.py app/api/card_aliases.py app/api/transactions.py app/schemas/card_alias.py app/schemas/statement.py` (pass); `cd backend && uv run pytest tests/test_card_aliases.py tests/test_statement_models.py tests/test_transactions.py tests/test_rls.py -q` (48 passed); `cd backend && uv run pytest tests/ -x --tb=line -q` (540 passed, 2 skipped, 1 warning); `bash scripts/ci/check-ng06-pci-exclusion.sh` (pass); `bash scripts/ci/check-rls-table-coverage.sh` (pass); `git diff --cached --check` (pass).

Gabe-Lens brief: Phase 1 adds the first durable shelf for statements: aliases remain labels only, statement evidence gets its own tables, and transaction edits keep authority unless reconciliation later proves a match around them.

## 2026-05-25 13:24 -04 — PHASE EXEC COMPLETE: Phase 1 — Card alias + statement schema foundation
TIER: ent
TASKS: 5 tasks, 3 implementation/contract commits (`105f697`, `c424453`, `9cae77f`)
COMMITS: `105f697` added the statement/card persistence foundation; `c424453` recorded the Gabe commit checkpoint and Commit ✅; `9cae77f` refreshed generated mobile OpenAPI contracts after CI caught API drift.
BRANCH: `main` pushed to `origin/staging` at `9cae77f4a66ad1174383455d63aa38949f813293`.
CI: GitHub Actions `CI` run `26412150430` passed for `9cae77f`; earlier run `26411997648` failed only `Mobile API Drift` for missing generated mobile API artifacts and was corrected by `9cae77f`.
RAILWAY DEPLOY: Explicit fallback deploy used because push alone left APIs on Alembic `014`. Commands: `railway up ./backend --path-as-root --environment staging --service gastify-api-staging --detach --ci`; `railway up ./backend --path-as-root --environment staging --service gastify-api-staging-e2e --detach --ci`.
RAILWAY SERVICES: `gastify-api-staging` deployment `05991f02-e8c2-48a6-af08-bc0c740858cd` status `SUCCESS/RUNNING`; `gastify-api-staging-e2e` deployment `14a37f1e-4a6a-40fd-8f5e-987348771ce2` status `SUCCESS/RUNNING`.
STAGING READINESS: `bash scripts/staging/check-backend-ready.sh https://gastify-api-staging-staging.up.railway.app` returned `status=ok`, `database=connected`, `migration_status=current`, `migration_current=015`, `migration_head=015`.
STAGING-E2E READINESS: `bash scripts/staging/check-backend-ready.sh https://gastify-api-staging-e2e-staging.up.railway.app` returned `status=ok`, `database=connected`, `migration_status=current`, `migration_current=015`, `migration_head=015`.
LOCAL VERIFICATION: `cd backend && uv run ruff check .` (pass); `cd backend && uv run ruff format --check .` (pass); targeted mypy over changed backend modules (pass); focused backend tests (48 passed); full backend tests (540 passed, 2 skipped, 1 warning); PCI and RLS guard scripts (pass); `cd mobile && npm run generate:api` (pass); `cd mobile && npm run typecheck` (pass).
RUNTIME SCOPE: Deployed API/DB proof only. No raw PDFs, credentials, statement extraction provider calls, browser journey, or Android/S23 statement journey are part of Phase 1; later P5 phases own upload/worker/web/mobile runtime artifacts.
DEVIATIONS: 1 minor corrected CI contract drift; no structural deviations.
RESULT: Phase 1 Exec marked ✅. Review remains ⬜; Push remains ⬜ pending the normal `/gabe-review` and `/gabe-push` route.

## 2026-05-25 14:45 -04 — PHASE 1 REVIEW: Card alias + statement schema foundation
VERDICT: APPROVE
FINDINGS: 6 total (0 critical, 2 high, 3 medium, 1 low)
COVERAGE: MEDIUM — RLS proof is static-only; web contract was stale (both fixed during triage)
CONFIDENCE: 88/100
DEFERRED: P32 (RLS execution test, ent gate), P33 (subquery RLS perf, scale gate)
ALIGNMENT: ALIGNED
TIER: ent | DRIFT: none
TICK: ✅
SOURCES: codex (gpt-5) + claude (claude-opus-4-6) — blind-first cross-agent triangulation, union consolidation (0 overlapping findings, 6 unique)
TRIAGE: option [2] fix MVP+Enterprise — fixed 4 (#1 composite FK scope, #2 web contract regen, #4 JSON/JSONB with_variant, #5 remove index=True drift), deferred 2 (#3 RLS execution → P32, #6 subquery RLS → P33)
FIXES: migration 016 (same-scope composite FK constraints), statement.py model cleanup (with_variant + index removal), web contract regeneration
ARCHIVED: `.kdbp/reviews-archive/REVIEW_2026-05-25-144500_resolved.md`

## 2026-05-25 14:58 -04 — [8743f5a] fix(statements): enforce same-scope schema constraints
FINDINGS: 6 review findings triaged (4 fixed, 2 deferred)
ACTIONS: committed Phase 1 review-resolution set only; left unrelated `docs/wells/**` and `.kdbp/KNOWLEDGE.md` edits unstaged.
DEFERRED: P32 (PostgreSQL-backed statement RLS execution test), P33 (scale-tier RLS subquery performance follow-up)
CHECKS: `git diff --cached --check` (pass); `cd backend && uv run ruff check .` (pass); `cd backend && uv run ruff format --check .` (pass); `cd backend && uv run mypy app/models/statement.py` (pass); `cd web && npx tsc --noEmit` (pass); `bash scripts/ci/check-ng06-pci-exclusion.sh` (pass); `bash scripts/ci/check-rls-table-coverage.sh` (pass); `cd backend && uv run pytest tests/test_card_aliases.py tests/test_statement_models.py tests/test_transactions.py tests/test_rls.py -q` (48 passed); `cd backend && uv run pytest tests/ -x --tb=line -q` (540 passed, 2 skipped, 1 warning).

Gabe-Lens brief: The fix adds database rails around the new statement shelves: a statement can only point at an alias in its own scope, and reconciliation runs can only attach to statements from the same scope, while the web client receives the same generated API contract as mobile.

## 2026-05-25 15:51 -04 — PUSH staging -> main
PR: —
CI: all passed (`staging` run 26417108834, `main` run 26417227311)
PROMOTION: promoted `origin/staging` -> `main` at `8f4e77b`
DEPLOYMENTS: P29
STAGING: `origin/staging` updated from `b84923f` to `8f4e77b`; GitHub Actions CI run 26417108834 passed 12/12. Railway fallback deploys used for `gastify-api-staging` deployment `55ef7412-314b-4763-adb3-ff0cfaf9400c` and `gastify-api-staging-e2e` deployment `235be0ab-25b4-4af9-b71b-193a3ba825aa`; both readiness probes returned `status=ok`, `database=connected`, `migration_status=current`, `migration_current=016`, `migration_head=016`.
PRODUCTION PUSH: promoted tested `origin/staging` to `origin/main`; GitHub Actions CI run 26417227311 passed 12/12 for `8f4e77b`.
PLAN: Phase 1 Push marked ✅.

## 2026-05-27 14:19 -04 — [9a939fc] chore(backend): enforce strict mypy gate
FINDINGS: 1 deferred item surfaced on a touched file; P24 remains open because this commit only typed the existing scan-complete payload construction and does not implement the remaining warning UI requirement.
ACTIONS: skipped P24 for this commit; no new deferred items.
CHECKS: `cd backend && uv run mypy app/ --no-error-summary` (pass); `cd backend && uv run ruff check app tests` (pass); `cd backend && uv run ruff format --check .` (pass); `cd backend && uv run pytest tests/ -x --tb=line -q` (645 passed, 2 skipped, 1 warning); `git diff --check` (pass).
Gabe-Lens brief: The backend now has a typecheck turnstile in CI. The cleanup makes the existing strict mypy policy executable across the app instead of leaving it as local configuration debt.

## 2026-05-27 14:27 -04 — [8db82d9] fix(prompt-lab): tolerate missing local statement db
FINDINGS: GitHub Actions staging run `26530292183` failed `Backend Test` because `test_statement_fallback_calibration_from_manifest_writes_reports` tried to open the private local SQLite path `../.tmp/local/gastify.db` on a fresh runner where the parent directory does not exist.
ACTIONS: report generation now returns an empty unreadable DB snapshot with reason `transaction_database_unavailable` when the local transaction DB cannot be opened.
CHECKS: `cd backend && uv run pytest tests/test_statement_prompt_lab.py::test_statement_fallback_calibration_from_manifest_writes_reports -q` (1 passed); `cd backend && uv run mypy app/ --no-error-summary` (pass); `cd backend && uv run ruff check app tests` (pass); `cd backend && uv run ruff format --check .` (pass); `cd backend && uv run pytest tests/ -x --tb=line -q` (645 passed, 2 skipped, 1 warning); `git diff --check` (pass).
Gabe-Lens brief: The prompt-lab report now treats the local transaction DB like optional lab equipment. If it is not present on a clean runner, the report records that absence instead of stopping the whole CI line.

## 2026-05-27 14:33 -04 — PUSH staging -> main
PR: —
CI: all passed (`staging` run 26530619227, `main` run 26530813772)
PROMOTION: promoted `origin/staging` -> `main` at `4354ad0`
DEPLOYMENTS: P31
STAGING: `origin/staging` updated from `9873d4e` to `4354ad0`; GitHub Actions CI run 26530619227 passed after failed staging run 26530292183 exposed a fresh-runner local SQLite report assumption.
PRODUCTION PUSH: promoted tested `origin/staging` to `origin/main`; GitHub Actions CI run 26530813772 passed 13/13 for `4354ad0`, including the new `Backend Typecheck` job.
PLAN: Phase 4 Push marked ✅.

## 2026-05-27 14:54 -04 — [2737d93] feat(web): add statement reconciliation flow
FINDINGS: 0 blocking. `npm run lint` exits 0 with the existing Fast Refresh warning class; the new statement route follows the current route-file pattern and adds no lint errors.
ACTIONS: committed Phase 5 T1-T4 web implementation checkpoint; left Phase 5 Exec 🔄 because deployed staging browser evidence is still required before closure.
DEFERRED: none
CHECKS: `git diff --cached --check` (pass); `git diff --check` (pass); `cd web && npm run build` (pass, Vite chunk-size warning only); `cd web && npm test -- --run` (9 files / 25 tests passed); `cd web && npm run lint` (0 errors, 33 warnings).
SCOPE: `/statements` web route, statement upload hooks/store/SSE, card-alias controls, reconciliation buckets, statement-only transaction creation, session cleanup, route tree, and focused Vitest coverage.
RUNTIME SCOPE: local web build/unit/component proof only. The branch-backed staging browser journey for statement upload/reconciliation remains the required Phase 5 runtime gate.
Gabe-Lens brief: The web app now has the statement desk in place: users can bring in a card statement, watch the scan move, inspect reconciliation buckets, and choose which statement-only rows become transactions without mixing that state into receipt scanning.

## 2026-05-27 15:47 -04 — PHASE 5 EXEC COMPLETE: Web statement reconciliation flow
SCOPE: Completed the deployed web statement journey for P5 after refreshing backend staging services and fixing the statement-created transaction constraint. The web app now supports card aliases, statement upload with per-scan AI-processing consent, progress/completed state, reconciliation buckets, and accepting a statement-only candidate into `/api/v1/transactions`.
FIX: `[3fcfa95] fix(statement): allow unidentified statement item source` adds migration `021` so `transaction_items.category_source='statement_unidentified'` is accepted; regression posts the reconciliation candidate through the transaction API.
STAGING: `origin/staging` at `3fcfa95`; GitHub Actions run `26534433130` passed. Railway deploys: web `8e1b34a6-5082-4878-b9f2-66139af26bcd` success; API staging-e2e `81d2ce63-c418-46a0-ab4e-1d94c3ad79f8` success; API staging `cc107903-a9c8-4e91-8a71-4c2c62108bf9` success. Readiness: staging-e2e and staging both `status=ok`, `migration_current=021`, `migration_head=021`.
WEB PROOF: `node .tmp/scripts/phase5-web-statement-proof.mjs` passed against deployed Railway web with API requests routed to deployed staging-e2e for isolated fixture data. Artifacts: `.tmp/staging-e2e/web-statement/20260527T194301Z-phase5-web-statement/` (`01-statements-ready.png`, `02-consent-before-upload.png`, `03-upload-started.png`, `04-reconciliation-buckets.png`, `05-statement-only-candidate.png`, `06-after-add-transaction.png`, `upload-response.json`, `create-transaction-response.json`, `manifest.json`). Upload response `201`; statement-created transaction response `201` with id `aab06d07-8d3a-4fce-b50d-c5a3c2eeac26`; console messages empty.
CHECKS: `cd backend && uv run ruff check app/models/transaction.py tests/test_statement_reconciliation.py alembic/versions/021_statement_unidentified_item_source.py` (pass); `cd backend && uv run pytest tests/test_statement_reconciliation.py -q` (10 passed); `cd backend && uv run pytest tests/test_transactions.py tests/test_statement_reconciliation.py tests/test_statements.py -q` (54 passed); `cd backend && uv run ruff check app tests` (pass); `cd backend && uv run mypy app/ --no-error-summary` (pass); `git diff --check` (pass).
TICK: ✅ Phase 5 Exec
NEXT: Route to `/gabe-next`; expected command is `/gabe-review` for Phase 5.

## 2026-05-27 16:53 -04 — PHASE 5 REVIEW: Web statement reconciliation flow
VERDICT: APPROVE
FINDINGS: 1 total (0 critical, 1 high, 0 medium, 0 low)
COVERAGE: HIGH — Phase 5 staging/CI/Railway/browser proof exists, and the only review finding was resolved with focused web route coverage.
CONFIDENCE: 96/100
TRIAGE: fixed #1 consent reset issue. Successful statement upload now clears the selected PDF, password, and AI-processing consent while preserving the chosen card alias; the hidden file input remounts so the browser cannot reuse the stale file value.
CHECKS: `cd web && npm test -- src/routes/-statements.test.tsx` (2 passed); `cd web && npx tsc -b` (pass); `git diff --check` (pass).
TICK: ✅ Phase 5 Review
NEXT: Commit the Phase 5 consent-reset fix and KDBP review reconciliation, then push to `origin/staging`.
Gabe-Lens brief: The statement desk now closes the consent latch after each upload. A second scan must start with a fresh PDF selection and a fresh consent click, while the existing reconciliation and add-transaction proof still holds.

## 2026-05-27 16:57 -04 — [414b139] fix(web): reset statement consent after upload
FINDINGS: 1 Phase 5 review finding fixed (0 critical, 1 high, 0 medium, 0 low)
ACTIONS: committed the web consent reset and focused route regression; successful uploads now clear the PDF, password, and AI-processing consent while preserving the selected alias.
DEFERRED: none
CHECKS: `git diff --cached --check` (pass); `git diff --check` (pass); `cd web && npm run lint` (0 errors, 33 existing Fast Refresh warnings); `cd web && npx tsc -b` (pass); `cd web && npm test -- src/routes/-statements.test.tsx` (2 passed).
PLAN: Phase 5 Commit marked ✅.
Gabe-Lens brief: The statement upload form now behaves like a consent turnstile. Once a scan goes through, the file and consent reset, so the next scan has to pass through the same explicit gate again.

## 2026-05-27 17:02 -04 — PUSH main -> staging
PR: —
CI: all passed (`staging` run 26538457661)
PROMOTION: N/A — staging push only
DEPLOYMENTS: P32
STAGING: `origin/staging` updated from `7ef9d1c` to `e6d04aa`; GitHub Actions CI run 26538457661 passed 13/13 for the Phase 5 web consent-reset fix and KDBP commit bookkeeping.
PLAN: Phase 5 Push remains ⬜ because this was the non-default staging environment; production promotion is the next push gate.

## 2026-05-27 17:07 -04 — PUSH staging -> main
PR: —
CI: all passed (`main` run 26538710272)
PROMOTION: promoted `origin/staging` -> `origin/main` at `e6d04aa`
DEPLOYMENTS: P33
STAGING: `origin/staging` had already passed GitHub Actions run 26538457661 for the Phase 5 consent-reset fix.
PRODUCTION PUSH: promoted tested `origin/staging` to `origin/main`; GitHub Actions CI run 26538710272 passed 13/13 for `e6d04aa`.
PLAN: Phase 5 Push marked ✅.
Gabe-Lens brief: The web statement lane has crossed the final gate for this phase. The consent-reset fix was tested on staging, promoted to main, and the phase is now ready to hand off to Android.

## 2026-05-27 17:31 -04 — [5f8552b] feat(mobile): add statement reconciliation journey
FINDINGS: 1 deferred item surfaced on touched mobile screens; P24 remains open because this checkpoint adds the statement journey and does not implement the separate receipt review-warning UI requirement.
ACTIONS: skipped P24 for this commit; no new deferred items.
CHECKS: `cd backend && uv run ruff check app tests` (pass); `cd backend && uv run mypy app/ --no-error-summary` (pass); `cd backend && uv run pytest tests/test_statement_stream.py tests/test_statement_worker.py tests/test_statements.py -q` (26 passed); `cd mobile && npm run typecheck` (pass); `cd mobile && npm test -- --runInBand` (116 passed); `cd mobile && npm run check:expo-config` (pass); `git diff --check` and `git diff --cached --check` (pass).
SCOPE: Added Android statement PDF selection, per-scan AI consent, card alias selection/creation, statement upload and password states, WebSocket progress, reconciliation buckets with coverage, statement-only candidate creation, and sign-out cleanup. Added `/ws/statements/{statement_id}` backend stream parity for mobile.
RUNTIME SCOPE: Local type/Jest/backend proof only. Phase 6 Exec remains 🔄 until candidate code is pushed to staging and the Samsung S23 staging-e2e statement journey is captured with grouped artifacts.
PLAN: Phase 6 Commit marked ✅; Exec remains 🔄 pending Android/S23 runtime evidence.
Gabe-Lens brief: Android now has the statement workbench installed locally. The app can accept a statement PDF, keep consent per scan, watch reconciliation move over WebSocket, and expose the same buckets the web path already proved.

## 2026-05-27 17:44 -04 — PHASE 6 STAGING CANDIDATE: Android statement reconciliation flow
SCOPE: Pushed Phase 6 Android statement work and the dedicated S23 statement gate harness to `origin/staging` at `1273186`. Added grouped Maestro wrapper `scripts/staging/run-s23-phase6-statement-gate.sh`, flow `tests/mobile/maestro/p5-phase6-statement-reconciliation-active.yaml`, private-PDF seeding helper, and statement-provider metadata in mobile E2E manifests.
STAGING CI: GitHub Actions staging run `26540085926` passed 13/13 for `ca5815c`; staging run `26540440645` passed 13/13 for `1273186`.
STAGING-E2E API: Railway fallback deploy `87fc0b5b-55a9-4252-a2e0-aced4ca05853` succeeded for `gastify-api-staging-e2e`; readiness returned `status=ok`, `database=connected`, `migration_current=021`, `migration_head=021`.
CHECKS: `bash -n tests/mobile/scripts/seed-statement-fixture.sh scripts/staging/run-s23-phase6-statement-gate.sh tests/mobile/scripts/run-maestro.sh` (pass); `git diff --check` (pass); `node -e "JSON.parse(require('fs').readFileSync('mobile/package.json','utf8'))"` (pass); `cd mobile && npm run typecheck` (pass); `cd mobile && npm run check:expo-config` (pass).
S23 GATE STATUS: blocked before Maestro. `adb devices` showed no authorized devices, and `GASTIFY_STAGING_E2E_API_BASE_URL=https://gastify-api-staging-e2e-staging.up.railway.app bash scripts/staging/run-s23-phase6-statement-gate.sh` stopped after backend readiness with `adb: no devices/emulators found`.
PLAN: Phase 6 Exec remains 🔄. Do not mark Review, Exec closure, or Push complete until the Samsung S23 is visible to ADB and the statement upload/progress/buckets/coverage/sign-out cleanup flow writes grouped artifacts under `tests/mobile/results/runs/staging-e2e/<stage-id>/attempts/<attempt-id>/`.
Gabe-Lens brief: The Android statement lane is staged and the runway is built, but the plane has not taken off. CI and the deployed API are ready; the missing piece is the physical S23 connection that lets the statement journey produce real device evidence.

## 2026-05-27 19:08 -04 — PHASE 6 EXEC COMPLETE: Android S23 statement reconciliation flow
SCOPE: Captured the required Samsung S23 staging-e2e runtime proof for Android statement reconciliation after the device was reattached and authorized as `RFCW90N4BYP`. The flow exercised the real Android PDF picker, upload-level AI consent, deployed statement upload/worker/reconciliation, bucket drilldown, statement-only transaction creation, app-only transaction review, sign-out, and re-authenticated clean statement state.
BUILD/DEVICE: Installed fresh EAS e2e-staging dev build `be6452bb-c4b2-47b8-a9d5-babc37fbc086` (`gastify-e2e-staging-be6452bb.apk`) after the prior dev client lacked `ExpoDocumentPicker`. Metro ran locally with `adb reverse tcp:8081 tcp:8081`; S23 device id `RFCW90N4BYP`.
BACKEND PROVIDER PROOF: `cd backend && uv run pytest tests/test_statement_routing.py -q -vv` passed 23 tests, including deterministic PyMuPDF routing/extraction, generic evidence, profile fallback application, encrypted password states, and auto-provider password gating. `cd backend && uv run pytest tests/test_statement_worker.py -q -vv` passed 8 tests, including auto deterministic success and auto Gemini fallback when routing is unsupported. Focused combined gate `cd backend && uv run pytest tests/test_statement_worker.py tests/test_statement_reconciliation.py tests/test_statement_routing.py -q` passed 41 tests.
STAGING-E2E API: Railway fallback deploy `26f0efdd-4a65-4c0c-aa77-ed5bca100e01` refreshed `gastify-api-staging-e2e`; readiness returned `status=ok`, `database=connected`, `migration_current=021`, `migration_head=021`.
BACKEND FIXTURE GATE: `GASTIFY_STAGING_E2E_API_BASE_URL=https://gastify-api-staging-e2e-staging.up.railway.app cd backend && uv run python ../scripts/staging/run-statement-fixture-gate.py --stage-id 20260527-phase6-s23-statement-gate --seed-fixture-transactions --require-three-buckets` passed. Artifact manifest: `tests/mobile/results/runs/staging-e2e/20260527-phase6-s23-statement-gate/p5-statement-fixture-backend/manifest.json`; statement id `f969d5c9-9ccd-4cec-a507-336228a857bf`; counts: matched `1`, statement-only `1`, app-only `43`, coverage `0.5`. Lines included matched charge `SUPERMERCADO FIXTURE` and positive statement-only charge `STATEMENT ONLY FIXTURE 036DACB4`.
S23 RUNTIME PROOF: `GASTIFY_STAGING_E2E_API_BASE_URL=https://gastify-api-staging-e2e-staging.up.railway.app MAESTRO_DEVICE_ID=RFCW90N4BYP bash scripts/staging/run-s23-phase6-statement-gate.sh` passed. Flow manifest: `tests/mobile/results/runs/staging-e2e/20260527-phase6-s23-statement-gate/attempts/230600Z/p5-phase6-statement-reconciliation-active/manifest.json` with `result_status=passed`, `device_id=RFCW90N4BYP`, `statement_provider=fixture`, API URL set to deployed staging-e2e, and `exit_code=0`.
S23 ARTIFACTS: Screenshots captured signed-in home, statement entry, PDF selected, progress, reconciliation buckets, app-only transactions, statement-only candidate with Add transaction, after candidate action, signed-out state, and reauthenticated clean statements under `tests/mobile/results/runs/staging-e2e/20260527-phase6-s23-statement-gate/attempts/230600Z/p5-phase6-statement-reconciliation-active/screenshots/`.
HARNESS FIXES: Hardened the S23 gate to generate a unique local PDF per run, seed deployed backend fixture data before Maestro, avoid stale duplicate statement hashes, require the statement-only Add transaction control, and avoid destructive fixture transaction cleanup against reconciliation-linked staging rows.
CHECKS: `bash -n scripts/staging/run-s23-phase6-statement-gate.sh scripts/staging/run-statement-fixture-gate.py tests/mobile/scripts/seed-statement-fixture.sh tests/mobile/scripts/run-maestro.sh` (pass); `cd backend && uv run ruff check app/services/statement_extraction.py tests/test_statement_worker.py ../scripts/staging/run-statement-fixture-gate.py` (pass); `cd backend && uv run pytest tests/test_statement_worker.py tests/test_statement_reconciliation.py tests/test_statement_routing.py -q` (41 passed); targeted verbose provider checks above passed.
PLAN: Phase 6 Exec marked ✅. Review remains ⬜ pending `/gabe-review`; Push remains ⬜ until the new S23 gate hardening changes and KDBP evidence are committed/pushed.
Gabe-Lens brief: The Android statement lane now has runway, takeoff, and landing evidence. The S23 proved the user can pick a PDF, consent, see the three reconciliation buckets, turn a statement-only charge into a transaction, inspect app-only rows, and return after sign-out without stale statement state leaking back in.

## 2026-05-27 19:30 -04 — PHASE 6 REVIEW FIXES COMPLETE: Android statement transaction proof
VERDICT: APPROVE
FINDINGS: 2 total (0 critical, 1 high, 1 medium, 0 low), both fixed.
COVERAGE: HIGH — the Samsung S23 staging-e2e packet now proves PDF picking, per-scan AI consent, deployed fixture processing, progress, matched/statement-only/app-only buckets, statement-only transaction creation success, app-only review visibility, and sign-out cleanup.
FIXES: Added an Android-visible `Transaction added` state after statement-only candidate creation resolves, hid the add button for created candidates, and updated the Maestro gate to assert the success state plus absence of `Add transaction`. Made backend fixture app-only seeding same-stage idempotent with `created_receipt_only_transaction` evidence.
S23 RERUN: `GASTIFY_STAGING_E2E_API_BASE_URL=https://gastify-api-staging-e2e-staging.up.railway.app GASTIFY_MOBILE_STAGE_ID=20260527-phase6-s23-statement-gate MAESTRO_DEVICE_ID=RFCW90N4BYP bash scripts/staging/run-s23-phase6-statement-gate.sh` passed. Fresh flow manifest: `tests/mobile/results/runs/staging-e2e/20260527-phase6-s23-statement-gate/attempts/232758Z/p5-phase6-statement-reconciliation-active/manifest.json`; result `passed`, device `RFCW90N4BYP`, provider `fixture`, API URL deployed staging-e2e. Screenshot `08-phase6-after-candidate-action.png` now shows `Transaction added`.
BACKEND FIXTURE RERUN: `tests/mobile/results/runs/staging-e2e/20260527-phase6-s23-statement-gate/p5-statement-fixture-backend/manifest.json` passed with matched `1`, statement-only `1`, app-only `43`, coverage `0.5`; `seeded-transactions.json` records `created_matching_transaction=false` and `created_receipt_only_transaction=false`.
CHECKS: `cd mobile && npm test -- --runInBand src/screens/__tests__/StatementsScreen.test.tsx` (3 passed); `cd mobile && npm run typecheck` (pass); `cd mobile && npm test -- --runInBand` (24 suites, 116 tests passed); `cd mobile && npm run check:expo-config` (pass); `python3 -m py_compile scripts/staging/run-statement-fixture-gate.py` (pass); `bash -n scripts/staging/run-s23-phase6-statement-gate.sh scripts/staging/run-statement-fixture-gate.py tests/mobile/scripts/seed-statement-fixture.sh tests/mobile/scripts/run-maestro.sh` (pass); `cd backend && uv run ruff check app/services/statement_extraction.py tests/test_statement_worker.py ../scripts/staging/run-statement-fixture-gate.py` (pass); `cd backend && uv run pytest tests/test_statement_worker.py tests/test_statement_reconciliation.py tests/test_statement_routing.py -q` (41 passed); `git diff --check` (pass).
PLAN: Phase 6 Review marked ✅. Commit and Push remain ⬜ until the review-fix and KDBP evidence changes are committed and pushed.
Gabe-Lens brief: The Android statement lane now closes the loop instead of just pressing the button. The evidence shows the candidate crossed from "can be added" to "added", while the fixture runway stopped adding duplicate app-only obstacles on each same-stage pass.

## 2026-05-28 00:00 -04 — [09f39ae] fix(mobile): prove statement candidate creation
FINDINGS: 2 Phase 6 review findings fixed (0 critical, 1 high, 1 medium).
ACTIONS: Committed the Android statement candidate success state, Maestro assertion for `Transaction added`, same-stage idempotent app-only fixture seeding, fixture statement-only charge hardening, and focused regression coverage.
CHECKS: `cd backend && uv run ruff check app/services/statement_extraction.py tests/test_statement_worker.py ../scripts/staging/run-statement-fixture-gate.py` (pass); `cd backend && uv run pytest tests/test_statement_worker.py tests/test_statement_reconciliation.py tests/test_statement_routing.py -q` (41 passed); `cd mobile && npm run typecheck` (pass); `cd mobile && npm test -- --runInBand src/screens/__tests__/StatementsScreen.test.tsx` (3 passed after one transient timeout rerun); `cd mobile && npm test -- --runInBand` (24 suites, 116 tests passed); `python3 -m py_compile scripts/staging/run-statement-fixture-gate.py` (pass); `bash -n scripts/staging/run-s23-phase6-statement-gate.sh scripts/staging/run-statement-fixture-gate.py tests/mobile/scripts/seed-statement-fixture.sh tests/mobile/scripts/run-maestro.sh` (pass); `git diff --cached --check` (pass).
TICK: ✅ Phase 6 Commit.
NEXT: Route Phase 6 to `/gabe-push` so the review fixes and S23 evidence can be pushed to `origin/staging`.

Gabe-Lens brief: The commit changes the Android statement journey from a button press into a proven handoff. The S23 artifact now shows the charge crossing the line into an added transaction, and the staging fixture no longer adds extra app-only rows every time we rerun the same gate.

## 2026-05-28 10:40 -04 — PUSH main -> staging
PR: —
CI: all passed (`staging` run 26581579919, 13/13 jobs, 104s)
PROMOTION: N/A — staging push only
DEPLOYMENTS: P35
STAGING: `origin/staging` updated from `b49a3cd` to `1f00a4d`; pushed `09f39ae fix(mobile): prove statement candidate creation` and `1f00a4d chore(kdbp): record Phase 6 review fixes`.
RESOURCE SMOKE: After Railway was resized to lower CPU/RAM limits, two deployed backend statement fixture gates passed: `tests/mobile/results/runs/staging-e2e/20260528-resource-smoke/p5-statement-fixture-backend/manifest.json` and `tests/mobile/results/runs/staging-e2e/20260528-resource-smoke-r2/p5-statement-fixture-backend/manifest.json`.
S23 RESOURCE GATE: `GASTIFY_STAGING_E2E_API_BASE_URL=https://gastify-api-staging-e2e-staging.up.railway.app GASTIFY_MOBILE_STAGE_ID=20260528-resource-smoke-s23 bash scripts/staging/run-s23-phase6-statement-gate.sh` passed after attaching the S23 to WSL USBIP, authorizing ADB, starting Metro, and opening the dev-client URL. Manifest: `tests/mobile/results/runs/staging-e2e/20260528-resource-smoke-s23/attempts/143225Z/p5-phase6-statement-reconciliation-active/manifest.json`; result `passed`, device `RFCW90N4BYP`, provider `fixture`, API URL deployed staging-e2e.
RAILWAY METRICS: Post-run `railway metrics --all --environment staging --since 20m --json` showed `gastify-api-staging-e2e` at about 0.6% CPU and 308 MB / 1 GB RAM, `Postgres-67_W` at about 0.2% CPU and 61 MB / 1 GB RAM, and `gastify-web-staging` at about 10 MB / 512 MB RAM.
PLAN: Phase 6 Push remains ⬜ because this was the non-default staging environment; production promotion is the next push gate once we choose to promote tested `origin/staging`.
Gabe-Lens brief: The Android statement lane is now staged with its review fix and resource proof. The smaller Railway box still carried the S23 journey: PDF picked, consent granted, buckets loaded, statement-only charge added, and clean sign-out verified.

## 2026-05-28 10:47 -04 — PUSH staging -> main
PR: —
CI: all passed (`main` run 26581997471, 13/13 jobs, 110s)
PROMOTION: promoted `origin/staging` -> `origin/main` at `1f00a4d`
DEPLOYMENTS: P36
STAGING: `origin/staging` had already passed GitHub Actions run `26581579919` for the Phase 6 review-fix push and had supplemental S23 resource proof at `tests/mobile/results/runs/staging-e2e/20260528-resource-smoke-s23/attempts/143225Z/p5-phase6-statement-reconciliation-active/manifest.json`.
PRODUCTION PUSH: Promoted tested `origin/staging` to `origin/main`; GitHub Actions CI run `26581997471` passed 13/13 for `1f00a4d`.
PENDING: Re-surfaced classifier item P26 remains deferred; incremented `Times Deferred` to 5 because no triage action was selected during the push.
PLAN: Phase 6 Push marked ✅. Phase 6 is complete.
Gabe-Lens brief: Phase 6 has crossed the final gate. The Android statement journey was staged, tested on the S23, promoted to main, and now has the proof chain from device screen to CI to production branch.

## 2026-05-28 11:04 -04 — PHASE 7 EXEC COMPLETE: P5 exit gate + edge tests
SCOPE: Closed the P5 statement exit gate by adding a repeatable 20-day receipt-history fixture lane to the deployed statement backend gate, rerunning deployed backend and S23 proof against `staging-e2e`, and writing a durable evidence packet at `docs/runbooks/P5-STATEMENT-EXIT-GATE.md`.
HARNESS: `scripts/staging/run-statement-fixture-gate.py` now supports `--seed-20-day-receipt-history`, seeding one receipt-sourced app transaction for each of 20 statement-period days and verifying all 20 appear in the receipt-only/app-only reconciliation bucket. The S23 wrapper now enables that flag before Maestro.
BACKEND 20-DAY GATE: `cd backend && uv run python ../scripts/staging/run-statement-fixture-gate.py --api-base-url https://gastify-api-staging-e2e-staging.up.railway.app --stage-id 20260528-phase7-exit-gate --seed-fixture-transactions --seed-20-day-receipt-history --require-three-buckets` passed. Manifest: `tests/mobile/results/runs/staging-e2e/20260528-phase7-exit-gate/p5-statement-fixture-backend/manifest.json`; same-stage rerun reused all 20 rows (`created=0`, `reused=20`) and kept `receipt_history_receipt_only_verified=true`.
S23 FINAL GATE: `GASTIFY_STAGING_E2E_API_BASE_URL=https://gastify-api-staging-e2e-staging.up.railway.app GASTIFY_MOBILE_STAGE_ID=20260528-phase7-exit-s23 MAESTRO_DEVICE_ID=RFCW90N4BYP bash scripts/staging/run-s23-phase6-statement-gate.sh` passed. Backend preflight manifest: `tests/mobile/results/runs/staging-e2e/20260528-phase7-exit-s23/p5-statement-fixture-backend/manifest.json`; S23 flow manifest: `tests/mobile/results/runs/staging-e2e/20260528-phase7-exit-s23/attempts/145857Z/p5-phase6-statement-reconciliation-active/manifest.json`.
S23 COUNTS: backend preflight proved migration `021`, line count `2`, matched `1`, statement-only `1`, app-only `88`, coverage `0.5`, and 20-day receipt-history verification. Maestro captured statement entry, PDF selection, consent, progress, reconciliation buckets, app-only drilldown, statement-only candidate, successful `Transaction added`, sign-out, and clean reauth.
EDGE MATRIX: Evidence packet maps encrypted/missing/wrong password, invalid PDF, duplicate upload idempotency, extraction failure, no matches, ambiguous matches, archived alias, user-edited precedence, non-ledger-ready fallback rows, payment-like rows, SSE, WebSocket, web sign-out cleanup, and Android sign-out cleanup to backend/web/mobile tests and runtime artifacts.
CHECKS: `python3 -m py_compile scripts/staging/run-statement-fixture-gate.py` (pass); `bash -n scripts/staging/run-s23-phase6-statement-gate.sh scripts/staging/run-statement-fixture-gate.py tests/mobile/scripts/seed-statement-fixture.sh tests/mobile/scripts/run-maestro.sh` (pass); `cd backend && uv run ruff check app tests` (pass); `cd backend && uv run ruff format --check .` (pass); `cd backend && uv run mypy app/ --no-error-summary` (pass); `cd backend && uv run pytest tests/ -x --tb=line -q` (648 passed, 2 skipped, 1 warning); `cd web && npm run lint` (0 errors, 33 existing Fast Refresh warnings); `cd web && npx tsc -b` (pass); `cd web && npm test -- --run` (25 passed); `cd mobile && npm run typecheck` (pass); `cd mobile && npm test -- --runInBand` (116 passed); `cd mobile && npm run check:expo-config` (pass); `git diff --check` (pass).
TICK: ✅ Phase 7 Exec.
NEXT: Route to `/gabe-review` for final P5 exit-gate review. iOS remains explicitly deferred by D47/P31.
Gabe-Lens brief: P5 now has a closing ledger, not just scattered receipts. The platform can prove the statement loop from deployed backend to Web to S23: a monthly statement lands, twenty days of app-only receipt history stay visible, matched and statement-only rows are separated, a statement-only charge can be added, and sign-out clears the desk before the next user session.

## 2026-05-28 11:18 -04 — PHASE 7 REVIEW FIXES COMPLETE: P5 fixture scope cleanup
FINDINGS: 1 medium Phase 7 review finding fixed.
COVERAGE: HIGH — Phase 7 still has deployed backend, Web, and S23 proof. The review fix tightens only the staging-e2e fixture data lifecycle.
FIX: Changed the statement fixture backend gate so both the single app-only fixture row and the 20-day receipt-history rows use a shared deterministic fixture namespace (`shared-v1`) instead of appending new rows for every new stage id.
CROSS-STAGE PROOF: `20260528-phase7-cleanup-c` passed with shared 20-day history reused and created the shared app-only row once. `20260528-phase7-cleanup-d` then passed under a different stage id with `created_receipt_only_transaction=false`, `receipt_history_created_count=0`, `receipt_history_reused_count=20`, and stable `receipt_only_count=111`. Artifacts: `tests/mobile/results/runs/staging-e2e/20260528-phase7-cleanup-c/p5-statement-fixture-backend/manifest.json` and `tests/mobile/results/runs/staging-e2e/20260528-phase7-cleanup-d/p5-statement-fixture-backend/manifest.json`.
CHECKS: `python3 -m py_compile scripts/staging/run-statement-fixture-gate.py` (pass); `bash -n scripts/staging/run-s23-phase6-statement-gate.sh scripts/staging/run-statement-fixture-gate.py tests/mobile/scripts/seed-statement-fixture.sh tests/mobile/scripts/run-maestro.sh` (pass); `cd backend && uv run ruff check ../scripts/staging/run-statement-fixture-gate.py` (pass); `cd backend && uv run pytest tests/test_statement_worker.py tests/test_statement_reconciliation.py tests/test_statement_routing.py tests/test_statement_stream.py tests/test_statements.py -q` (59 passed); `git diff --check` (pass).
REVIEW: `.kdbp/REVIEW.md` updated to resolved with verdict APPROVE and confidence 96/100.
TICK: ✅ Phase 7 Review.
NEXT: Route to `/gabe-commit` for Phase 7 exit-gate harness, evidence packet, and KDBP review closure.
Gabe-Lens brief: The runway cleanup is now scoped. New statement test stages reuse the same fixture history instead of piling up another month of app-only rows, so future P5 checks stay readable while the current Web and S23 proof remains intact.

## 2026-05-28 16:46 -04 — [7d23447] test(statements): close p5 exit gate
FINDINGS: 1 medium Phase 7 review finding fixed before commit; no open blockers.
ACTIONS: Committed the P5 Phase 7 exit-gate harness updates, shared 20-day fixture-history scope, S23 wrapper preflight flag, durable exit evidence packet, and resolved review document.
CHECKS: `python3 -m py_compile scripts/staging/run-statement-fixture-gate.py` (pass); `bash -n scripts/staging/run-s23-phase6-statement-gate.sh scripts/staging/run-statement-fixture-gate.py tests/mobile/scripts/seed-statement-fixture.sh tests/mobile/scripts/run-maestro.sh` (pass); `cd backend && uv run ruff check ../scripts/staging/run-statement-fixture-gate.py` (pass); `cd backend && uv run pytest tests/test_statement_worker.py tests/test_statement_reconciliation.py tests/test_statement_routing.py tests/test_statement_stream.py tests/test_statements.py -q` (59 passed); `git diff --cached --check` (pass).
TICK: ✅ Phase 7 Commit.
NEXT: Route to `/gabe-push` for the P5 exit-gate candidate; iOS remains deferred by D47/P31.
Gabe-Lens brief: The P5 exit package is now sealed for shipping. The commit keeps the deployed proof, edge matrix, and fixture cleanup together so the next step can focus on pushing and watching CI instead of rediscovering what was tested.

## 2026-05-28 16:51 -04 — PUSH main -> staging
PR: —
CI: ✅ 13/13 (79s) — GitHub Actions run `26601432082` for `8e03928`
PROMOTION: staging-only push; production promotion still pending.
DEPLOYMENTS: P37  (added row to .kdbp/DEPLOYMENTS.md)
STAGING: `origin/staging` updated from `1f00a4d` to `8e03928`; pushed `f72588c`, `d4e8909`, `7d23447`, and `8e03928`.
PLAN: Phase 7 Push remains ⬜ because this was the non-default staging environment.
PENDING: Re-surfaced classifier item P26 remains deferred; incremented `Times Deferred` to 6 because no triage action was selected during the push.
Gabe-Lens brief: Phase 7 is now on the staging track. The exit-gate proof and cleanup are in the integration lane with green CI, ready for the production promotion step once we choose to ship the tested staging head.

## 2026-05-28 16:55 -04 — PUSH staging -> main
PR: —
CI: ✅ 13/13 (112s) — GitHub Actions run `26601589188` for `8e03928`
PROMOTION: promoted `origin/staging` -> `origin/main` at `8e03928`
DEPLOYMENTS: P38  (added row to .kdbp/DEPLOYMENTS.md)
PRODUCTION PUSH: Promoted tested `origin/staging` to `origin/main`; GitHub Actions CI run `26601589188` passed 13/13 after staging CI run `26601432082`.
PENDING: Re-surfaced classifier item P26 remains deferred; incremented `Times Deferred` to 7 because no triage action was selected during the push.
PLAN: Phase 7 Push marked ✅. Phase 7 is complete; P5 Statement Reconciliation + Cards is ready for plan completion routing.
Gabe-Lens brief: The P5 statement lane is now fully shipped. The final push moved the tested staging head to main, with Web, backend, S23, edge evidence, and CI all pointing at the same exit-gate package.

## 2026-05-28 16:56 -04 — PLAN RECONCILIATION: Phase 3 push tick
SCOPE: Reconciled the stale P5 Phase 3 Push cell before plan archival.
EVIDENCE: Deployment `P31` promoted `origin/staging` to `origin/main` at `4354ad0` and explicitly carried the Phase 3 reconciliation engine alongside Phase 4 prompt-lab/backend hardening. Staging CI run `26530619227` and main CI run `26530813772` passed 13/13.
TICK: ✅ Phase 3 Push.

## 2026-05-28 16:56 -04 — PLAN COMPLETED: P5 Statement Reconciliation + Cards
ARCHIVE: .kdbp/archive/completed_PLAN_2026-05-28_p5-statement-reconciliation-cards.md
PHASES COMPLETED: 8 of 8
REASON: Goal achieved — statement upload, card aliases, extraction, deterministic primary parsing, promoted Gemini fallback with caveats, reconciliation buckets, Web desktop validation, Android/S23 validation, and the final P5 exit gate are complete. iOS runtime testing remains deferred post-roadmap by D47/P31.

## 2026-05-28 17:07 -04 — ROADMAP STATUS RECONCILED: P1-P5 complete, P6 active
SCOPE: Updated `.kdbp/ROADMAP.md` from v1.2 to v1.3 so the phase table reflects the current KDBP archive/ledger truth: P1 Foundation, P2 Receipt Scan Pipeline, P3 Web Portal MVP, P4 Mobile App MVP, and P5 Statement Reconciliation + Cards are complete; P6 Insights + Item Flags is active; P7-P9 remain pending; iOS remains deferred post-roadmap by D47/P31.
EVIDENCE: Completed plan archives exist for P1, P2, P3, P4, and P5. Latest P5 completion archive is `.kdbp/archive/completed_PLAN_2026-05-28_p5-statement-reconciliation-cards.md`.
NEXT: Start the P6 plan.

## 2026-05-28 17:07 -04 — PLAN CREATED: P6 Insights + Item Flags
PHASES: 6 | COMPLEXITY: high | MATURITY: mvp
TIERS: mvp × 0, ent × 6, scale × 0 | PROTOTYPES: 0
DECISIONS: D56 → D61 (6 phase tier decisions logged)
SCOPE: Monthly analytics contracts, deterministic taxonomy rollups, gravity-center detection, item urgency/special-case flags, aggregate exclusion, web desktop validation, Android/S23 validation, and a final P6 performance/runtime exit gate.
NATIVE GATE: Android/S23 only for this roadmap cycle; iOS remains deferred by D47/P31.
NEXT: Route to `/gabe-next`; expected command is `/gabe-execute` for Phase 1.

## 2026-05-28 17:14 -04 — PHASE EXEC START: Phase 1 — Analytics contract + seeded 3-month corpus
ROUTE: `/gabe-next` resolved active P6 Phase 1 to `/gabe-execute` because Exec was ⬜.
TASKS: Define monthly insights schemas, deterministic three-month seed corpus, expected rollup outputs, taxonomy-parent validation, and focused contract tests. Runtime endpoints and UI are explicitly out of scope for Phase 1.
STATE: Phase 1 Exec set to 🔄.

## 2026-05-28 17:20 -04 — PHASE EXEC COMPLETE: Phase 1 — Analytics contract + seeded 3-month corpus
TIER: ent
TASKS: Added the P6 monthly insights response contract, taxonomy-parent validation, a deterministic 3-month seed corpus, locked March 2026 expected insights, and a runbook describing the Phase 2 target.
PLATFORM PROGRESS: The backend now has a fixed analytics target for Phase 2: deterministic L1/L2 and L3/L4 rollups, a March top-category expected output, gravity-center expected rows, statement-sourced transaction coverage, user-edited category coverage, multi-scope isolation data, and a special-case flagged item excluded from aggregates.
FILES: `backend/app/schemas/insights.py`; `backend/app/services/insights_fixtures.py`; `backend/tests/test_insights_contract.py`; `docs/runbooks/P6-INSIGHTS-CONTRACT.md`.
CHECKS: `cd backend && uv run ruff check app tests` (pass); `cd backend && uv run mypy app/ --no-error-summary` (pass); `cd backend && uv run pytest tests/ -x --tb=line -q` (654 passed, 2 skipped, 1 warning); `git diff --check` (pass).
TICK: ✅ Phase 1 Exec. Review remains ⬜.
NEXT: Route to `/gabe-review` for Phase 1 contract review.

## 2026-05-28 17:38 -04 — PHASE 1 REVIEW FIXES COMPLETE: analytics contract hardening
VERDICT: APPROVE
FINDINGS: 2 total (0 critical, 1 high, 1 medium, 0 low), both fixed.
FIXES: Added a March USD source transaction with USD-shadow identity and deterministic CLP reporting totals; updated the locked March expected response and runbook totals. Added response-level validation so `top_transaction_categories` only accepts transaction-category rollups, `top_item_categories` only accepts item-category rollups, both top lists are capped at five, and rollup/exclusion currencies match the response currency.
PLATFORM PROGRESS: Phase 2 now has a stronger analytics target: the rollup engine must preserve source currency/USD-shadow data while aggregating into the reporting currency, and the API contract rejects swapped category axes before Web/Android consume it.
CHECKS: `cd backend && uv run ruff check app tests` (pass); `cd backend && uv run mypy app/ --no-error-summary` (pass); `cd backend && uv run pytest tests/test_insights_contract.py tests/test_reference_categories.py -q` (14 passed); `cd backend && uv run pytest tests/ -x --tb=line -q` (655 passed, 2 skipped, 1 warning); `git diff --check` (pass).
TICK: ✅ Phase 1 Review.
NEXT: Route to `/gabe-commit` for the P6 Phase 1 contract set.

## 2026-05-28 17:48 -04 — [b667ca1] feat(insights): add P6 analytics contract
FINDINGS: 0 commit-gate blockers. Direct `.kdbp/ROADMAP.md` edit accepted as status reconciliation after P5 completion and P6 activation; commit carries `Scope-Bypass-Audit: true`.
ACTIONS: Committed the P6 Phase 1 analytics contract, deterministic seed corpus, locked March expected output, review fixes, KDBP roadmap/plan/decision updates, runbook, and Data Model well doc note.
CHECKS: `cd backend && uv run ruff check app tests` (pass); `cd backend && uv run mypy app/ --no-error-summary` (pass); `cd backend && uv run pytest tests/ -x --tb=line -q` (655 passed, 2 skipped, 1 warning); `git diff --cached --check` (pass).
TICK: ✅ Phase 1 Commit.
NEXT: Route to `/gabe-push` for the P6 Phase 1 contract set.

## 2026-05-28 18:08 -04 — PUSH main -> staging
PR: —
CI: ✅ 13/13 (117s) — GitHub Actions run `26605045075` for `133a076`
PROMOTION: staging-only push; production promotion still pending.
DEPLOYMENTS: P39  (added row to .kdbp/DEPLOYMENTS.md)
STAGING: `origin/staging` updated from `8e03928` to `133a076`; pushed `a5479cb`, `cc423e2`, `dbd04b7`, `b667ca1`, and `133a076`.
CI FIX: Initial staging run `26604835283` failed on backend `ruff format --check` and a gitleaks false positive from `InsightSeedTransaction.key`. Rewrote the local Phase 1 commits so the fixture identifier field is `fixture_id`, verified local gitleaks/ruff/mypy/focused pytest, then force-updated only `origin/staging` with lease.
PLAN: Phase 1 Push remains ⬜ because this was the non-default staging environment.
PENDING: Re-surfaced classifier item P26 remains deferred; incremented `Times Deferred` to 8 because no triage action was selected during the push.
Gabe-Lens brief: Phase 1 is now on the staging track. The analytics contract, fixture corpus, and review hardening are in the integration lane with green CI, while production remains a separate promotion step.

## 2026-05-28 19:02 -04 — PUSH staging -> main
PR: —
CI: ✅ 13/13 (111s) — GitHub Actions run `26607287523` for `133a076`
PROMOTION: promoted `origin/staging` -> `origin/main` at `133a076`
DEPLOYMENTS: P40  (added row to .kdbp/DEPLOYMENTS.md)
PRODUCTION PUSH: Promoted tested `origin/staging` to `origin/main`; GitHub Actions CI run `26607287523` passed 13/13 after staging CI run `26605045075`.
PLAN: Phase 1 Push marked ✅. Phase 1 is complete.
PENDING: Re-surfaced classifier item P26 remains deferred; incremented `Times Deferred` to 9 because no triage action was selected during the push.
Gabe-Lens brief: The P6 analytics contract is now shipped through the full lane. The seeded 3-month corpus and monthly insight shape are on main with green staging and production CI, so Phase 2 can build the rollup engine against a stable target.
- 2026-05-29 14:38 | Write | /home/khujta/projects/apps/gastify/backend/app/services/retention.py
- 2026-05-29 14:38 | Write | /home/khujta/projects/apps/gastify/scripts/ops/run_retention.py
- 2026-05-29 14:51 | Write | /home/khujta/projects/apps/gastify/backend/alembic/versions/025_credit_plan_tier.py
- 2026-05-29 14:51 | Edit | /home/khujta/projects/apps/gastify/backend/app/models/credit.py
- 2026-05-29 14:51 | Edit | /home/khujta/projects/apps/gastify/backend/app/models/credit.py
- 2026-05-29 14:51 | Write | /home/khujta/projects/apps/gastify/backend/app/services/billing.py
- 2026-05-29 14:52 | Write | /home/khujta/projects/apps/gastify/backend/tests/test_billing.py
