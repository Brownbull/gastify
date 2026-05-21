# Active Plan — P4 Mobile App MVP

<!-- status: active -->
<!-- project_type: code -->

## Goal

Deliver a cross-platform mobile app MVP — Expo/React Native scaffold, Firebase auth, native camera receipt scan, WebSocket scan progress, transaction ledger/edit, platform sign-out isolation, and push registration — proving the first mobile user journey on Android and iOS.

## Context

- **Maturity:** mvp
- **Domain:** Smart personal expense tracker — AI receipt scanning with 86-category V4 taxonomy, multi-currency analytics with USD-shadow
- **ROADMAP phase:** P4 Mobile App MVP (depends on P1 Foundation + P2 Receipt Scan Pipeline; parallel with completed P3 Web Portal MVP)
- **Covers REQs:** REQ-05 (mobile slice), REQ-13, REQ-14 (mobile), REQ-24, REQ-25
- **Authored:** 2026-05-14
- **Last Updated:** 2026-05-21

## Environment Gate Standard

- `local` is SQLite + mock provider + local file storage only. It is the fast developer loop and never closes runtime Exec/Review gates.
- `staging-e2e` is isolated Railway Postgres + fixture provider. It is the deterministic proof lane for S23 upload/realtime/auth/media flows.
- `staging` is Railway Postgres + Railway API/SPA + staging Firebase + real Gemini. It is the deployed/provider proof lane.
- `production` is documented and guarded now, but not provisioned before staging evidence is green. Production must refuse mock, fixture, SQLite, legacy E2E fixtures, and E2E auth.
- User-facing, upload, realtime, auth, DB, native, and file/media phases cannot be marked Exec/Review complete from local/unit/static evidence alone; `.kdbp/LEDGER.md` must record artifact-backed runtime evidence.

## Phases

| # | Phase | Types | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Mobile scaffold + typed API + auth | `auth, native-mobile, client-state` | Expo + React Native TypeScript app in `mobile/`, navigation shell, Firebase Auth SDK, platform keystore/keychain token storage, generated typed API client, authenticated query/store baseline, and KDBP structure registration | ent | high | ✅ | ✅ | ✅ | ✅ |
| 2 | Camera scan + WebSocket progress | `upload, realtime, streaming, native-mobile, file-media` | Native camera/file-picker scan capture, multipart submission, WebSocket `scan_event` client, reconnect/backoff, staged scan progress UI, and completion/error routing | ent | high | ✅ | ✅ | ✅ | ✅ |
| 3 | Mobile ledger + detail + edit | `client-state, user-facing, native-mobile` | Mobile transaction list/detail/edit flow with V4 categories, original + USD amounts, user_edited_at precedence, optimistic mutation rollback, and cache invalidation | ent | medium | ✅ | ✅ | ✅ | ✅ |
| 4 | Sign-out isolation + push registration + platform polish | `auth, session, client-state, native-mobile, notifications` | Firebase sign-out clears secure store, query/store/image caches, and authenticated local state; push-token registration/permission flow; safe-area and platform ergonomics | ent | medium | ⬜ | ⬜ | ⬜ | ⬜ |
| 5 | Mobile E2E journey + edge tests | `core-only, native-mobile, test` | Jest + Maestro coverage for sign in → camera scan → stream → transaction view → edit → sign out → assert keystore/cache eviction on Android physical hardware and the best available iOS simulator/device lane, plus key edge cases | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |

<!-- Exec is written by /gabe-execute: ⬜ not started, 🔄 in progress, ✅ complete -->
<!-- Review/Commit/Push auto-ticked by /gabe-review, /gabe-commit, /gabe-push -->
<!-- A phase is complete when all four status columns are ✅ -->
<!-- /gabe-next routes to the next command based on column state -->
<!-- Tier values: mvp | ent | scale. Read by /gabe-execute (tier-cap) and /gabe-review (TIER_DRIFT finding). -->

## Phase Details

### Phase 1 — Mobile scaffold + typed API + auth

```yaml
phase: 1
types: [auth, native-mobile, client-state]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Auth/Session, Client State, Native Mobile]
suppressed_dims_count: 6
decisions_entry: D38
```

- **Types:** `auth, native-mobile, client-state`
- **Tier:** ent
- **Prototype:** no
- **Sections considered:** Core, Auth/Session, Client State, Native Mobile
- **Suppressed dimensions:** 6 (Auth/Session: Multi-tab sync; Client State: Optimistic updates, Mutation propagation, Cross-tab sync, Offline support; Native Mobile: App-store release)
- **Key deliverables:**
  - Expo + React Native + TypeScript strict app in `mobile/`
  - Expo Router or React Navigation shell with authenticated and unauthenticated stacks
  - Firebase Auth SDK wired for native sign-in and token refresh
  - Secure token storage via platform keystore/keychain (`expo-secure-store` or equivalent)
  - Generated typed API client from backend OpenAPI spec with auth header injection
  - Query/cache provider and scoped client state stores
  - Base screens: sign in, loading/session gate, app shell
  - Mobile testing foundation: Jest/RNTL, staged CI gates, staging-first Firebase Auth E2E seam, Maestro Phase 1 smoke flow
  - `.kdbp/STRUCTURE.md` registration for `mobile/**` and `tests/mobile/**`
- **CSRF posture:** `none` — native bearer-token API, no cookies (D3 precedent)
- **Trade-offs accepted:** See D38

### Phase 2 — Camera scan + WebSocket progress

```yaml
phase: 2
types: [upload, realtime, streaming, native-mobile, file-media]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Real-time, File/Media, Native Mobile]
suppressed_dims_count: 7
decisions_entry: D39
```

- **Types:** `upload, realtime, streaming, native-mobile, file-media`
- **Tier:** ent
- **Prototype:** no
- **Sections considered:** Core, Real-time, File/Media, Native Mobile
- **Suppressed dimensions:** 7 (Real-time: Presence, Backpressure; File/Media: CDN, Retention, Virus scan; Native Mobile: Background upload, App-store release)
- **Key deliverables:**
  - Native camera capture and file/image picker flow
  - Client-side validation for supported receipt image formats and size
  - Multipart upload to `/api/v1/scans`
  - Authenticated WebSocket client for backend `scan_event` stream
  - Reconnect/backoff handling and terminal-state cleanup
  - Staged progress UI: submitted → processing → extracting → categorizing → verified → complete | failed
- Completion routing to transaction detail or review state
- Unknown merchant / low confidence mobile affordance using post-scan fetch or backend contract update if needed
- Physical S23 evidence for gallery upload through backend WebSocket progress using deterministic fixture-backed happy/review/failure flows
- Railway staging runtime prerequisite: `local` remains SQLite/mock convenience only; Phase 2 proof requires Railway/Postgres `staging-e2e` fixture evidence plus `staging` live-Gemini smoke
- Backend-native receipt prompt lab for AI-quality iteration: imported receipt corpus, shared prompt registry, cache/dry-run default, live-cost guard, schema adapter, scoring, and promotion traceability. Prompt-lab evidence never replaces S23 runtime evidence.
- Phase 2C transaction categorization contract before Phase 2 closure: canonical L1-L4 taxonomy split, L2 store categories, L4 item categories, remembered merchant/item mapping contracts, store-category provenance, prompt-lab scoring, OpenAPI/client updates, and staging runtime evidence.
- **Contract note:** Web uses SSE; mobile uses WebSocket. Both must consume the same `scan_event` contract.
- **Trade-offs accepted:** See D39

#### Phase 2B — Environment proof gate

- **Purpose:** make environment readiness a blocking Phase 2 prerequisite and the standard for later development.
- **Local coverage:** `local` can prove mock happy/review/failure mechanics only; it cannot close Phase 2.
- **Staging-e2e coverage:** S23 fixture happy/review/failure/camera-permission flows must pass against isolated Railway Postgres.
- **Staging coverage:** one real S23 gallery receipt must pass against Railway `staging` with Gemini enabled and fixture/mock disabled.
- **Production guard impact:** production remains unprovisioned for now, but config tests must prove mock, fixture, SQLite, and E2E auth fail fast.
- **Artifacts:** exact commands, Railway service/API URL, database target, S23 id, APK/build id, fixture/live provider mode, screenshots, reports, logs, and command traces must be recorded in `LEDGER.md`.
- **Current evidence:** Railway API runtime proof was captured on 2026-05-20. The deterministic S23 fixture packet passed four flows under `tests/mobile/results/runs/staging-e2e/20260520Tresume-staging-e2e-s23-fixture-phase2/`; the live Gemini S23 packet passed against Railway staging under `tests/mobile/results/runs/staging/20260520Tresume-staging-s23-live-gemini-super-lider/`.

#### Phase 2C — Transaction categorization contract

- **Purpose:** close the backend scan data-contract gap identified by the transaction categorization study and Gabe review before Phase 2 can close.
- **Status:** local code/test implementation complete, and Railway-backed S23 runtime evidence was captured on 2026-05-20. Phase 2 is ready for review.
- **Taxonomy contract:** seed canonical English-key taxonomy with Spanish labels from day zero:
  - L1 `Industry` / es `Rubro`: deterministic store parent group only.
  - L2 `Business Type` / es `Giro`: transaction/store category and only store-category prompt output.
  - L3 `Family` / es `Familia`: deterministic item parent group only.
  - L4 `Category` / es `Categoría`: item category and only item-category prompt output.
- **Prompt contract:** item categorization prompt must see/emit only L4 keys; store fallback prompt must see/emit only L2 keys; L1/L3 must be derived, never generated.
- **Mapping contract:** define merchant alias/category memory, item-name memory, and item-category memory scoped by ownership. Item category memory must target `item_categories`; subcategory memory remains out of scope.
- **Provenance contract:** persist store-category source, confidence, matched mapping id when present, and reviewable unknown/low-confidence state. `merchant_source` must stay limited to merchant text source.
- **Pipeline order:** extraction -> post-processing -> L4 item categorization -> remembered item mappings -> merchant memory -> L2 store fallback if needed -> persistence.
- **Local coverage:** backend tests now prove taxonomy split/seed, prompt-safe L2/L4 validation, remembered mapping application, store fallback ordering, persistence provenance, and generated client compatibility. This remains contract evidence only.
- **Staging coverage:** staging-e2e S23 fixture flows must show persisted/visible L2/L4 categories; staging live Gemini smoke must prove unknown-merchant fallback with real provider.
- **Production guard impact:** production must refuse unknown prompt IDs and must not allow dev-only taxonomy or test controls.

#### Phase 2D — Receipt prompt evaluation contract and targeted candidate

- **Purpose:** apply the latest Gabe Assess recommendation for the receipt prompt pipeline: fix the evaluation contract before another paid prompt/postprocess iteration.
- **Status:** local contract/prompt-lab implementation complete; prompt-lab threshold now passes, and v2-dev.9 is accepted as the current candidate state with explicit review-warning risks (DECISION D44). Production promotion is still blocked. The latest 14-case no-cache run (`20260520Treceipt-v2dev9-14-case-no-cache`) ended at strict `7 completed` / `7 threshold-failed`, severity `7 pass` / `7 minor_review` / `0 significant_failure`, with `provider_error_count=0`, `cache_evidence_status_count=0`, and `no_cache_evidence_valid=true`. This is AI-quality prompt-lab work only; it does not replace the staging-e2e S23 gate or staging live Gemini proof required for Phase 2 closure.
- **Inputs:** previous 14-case no-cache baseline (`20260520T040535Z-14-case-v1-no-cache`), Gabe Roast findings on runtime parity, scoring semantics, promotion locking, and cost split-brain, plus Gabe Health pressure around `coalesce.py` / `prompt_lab/runner.py`.
- **Evaluation contract deliverables:**
  - Tighten scoring semantics so the reconstruction gate either includes item-total correctness in `passed` or is renamed/reported so item-total failures cannot be hidden.
  - Define a machine-readable promotion threshold for receipt extraction candidates: 14-case no-cache evidence, no cache-derived/provider-error packets, zero `significant_failure`, explicit `minor_review` policy, no unclassified gate failures, and production promotion still blocked until staging/S23 runtime evidence is green.
  - Add baseline coverage tags for the 14-case corpus: discount-heavy, service/no-item, zero-decimal CLP, cent-currency, long receipt, damaged/wrinkled image, tender/tax noise, weighted items, multi-buy, and edge arithmetic.
  - Allow baseline artifacts structurally before committing more prompt-lab truth/catalog changes. Add or verify `.kdbp/STRUCTURE.md` coverage for `prompt-testing/baselines/*.json` and `prompt-testing/PATTERN-CATALOG.md`.
  - Align prompt-lab cost reporting with the runtime pricing source or label any remaining estimate split clearly enough that promotion decisions use one source of truth.
- **Targeted iteration scope:**
  - Focus the single prompt/postprocess pass on the three 14-case `significant_failure` cases: `edge-cases/edgeqtytotal`, `supermarket/super_lily`, and `trips/US/descuentos`.
  - Keep `supermarket/super_lider` and `supermarket/super_lider_arrugado` as tracked `minor_review` cases unless the contract change reclassifies them.
  - Avoid broad prompt rewrites or god-file expansion. If `coalesce.py` or `prompt_lab/runner.py` must change, keep edits narrow and backed by focused tests; defer decomposition to a separate health/debt phase unless the targeted fix requires a small extraction.
- **Verification:**
  - `cd backend && uv run pytest tests/test_prompt_lab.py tests/test_prompt_registry.py tests/test_coalesce.py tests/test_math_gate.py tests/test_persist_scan.py`
  - `cd backend && uv run ruff check app/prompts app/prompt_lab app/services/coalesce.py app/services/math_gate.py app/services/persist_scan.py tests/test_prompt_lab.py tests/test_coalesce.py tests/test_math_gate.py tests/test_persist_scan.py`
  - `cd backend && uv run python -m app.prompt_lab validate`
  - Run all 14 baseline cases live with `--bypass-cache --confirm-live-cost --run-id <YYYYMMDDTHHMMSSZ-14-case-v1-candidate>` and write the batch report into that run folder.
- **Exit decision:** either keep the candidate dev-only with the next focused failure list, or promote only if the prompt-lab threshold passes and the separate staging/S23 runtime gates are satisfied.
- **Current exit decision:** keep `receipt-extraction-v2-evidence@2026-05-20.v2-dev.9` dev-only until the staging runtime gates pass, but treat it as good enough for the next runtime-proof step. Remaining prompt-lab issues are accepted minor-review risks: one-line service item labels (`other/estacionamiento`, `restaurant/restaurant_2001_recibo`), weighted quantity/unit details (`supermarket/super_lider`, `supermarket/super_lider_arrugado`), isolated item-price misses (`supermarket/super_lily`, `trips/US/long`), and discount/extra-row cleanup (`trips/US/descuentos`). Runtime must carry these forward as review-warning signals where math, item-count, discount, or meaningful item amount discrepancies exist.
- **Runtime-warning follow-up:** backend contract is now implemented under DECISION D45. Scan-created transactions persist `scan_review_level` and `scan_review_signals`, `scan_complete` emits `review_level` and `review_signals`, and transaction list/detail APIs expose the fields. P24 remains open for mobile/web warning presentation and receipt-order/category-grouped views.

### Phase 3 — Mobile ledger + detail + edit

```yaml
phase: 3
types: [client-state, user-facing, native-mobile]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Client State, UI/UX, Native Mobile]
suppressed_dims_count: 5
decisions_entry: D40
```

- **Types:** `client-state, user-facing, native-mobile`
- **Tier:** ent
- **Prototype:** no
- **Sections considered:** Core, Client State, UI/UX, Native Mobile
- **Suppressed dimensions:** 5 (Client State: Cross-tab sync, Offline support, Store coupling; UI/UX: Advanced accessibility; Native Mobile: Background sync)
- **Key deliverables:**
  - Transaction list with pagination and basic period/category/card filters
  - Transaction detail with line items, V4 category path, merchant, date, original currency, and USD shadow
  - Edit flow for merchant/date/category/line items as supported by backend API
  - `user_edited_at` precedence display and mutation payload handling (REQ-13)
  - Optimistic updates with rollback on failed edit
  - Query invalidation and stale data handling after scan completion and edits
  - Mobile loading, empty, and inline error states
- **Trade-offs accepted:** See D40
- **Environment matrix:** local validates list/detail/edit mechanics with mock data; staging validates Railway/Postgres transaction reads, edits, cache invalidation, and user isolation; production impact is guard-only until staging is green.

### Phase 4 — Sign-out isolation + push registration + platform polish

```yaml
phase: 4
types: [auth, session, client-state, native-mobile, notifications]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Auth/Session, Client State, Native Mobile, Notifications]
suppressed_dims_count: 7
decisions_entry: D41
```

- **Types:** `auth, session, client-state, native-mobile, notifications`
- **Tier:** ent
- **Prototype:** no
- **Sections considered:** Core, Auth/Session, Client State, Native Mobile, Notifications
- **Suppressed dimensions:** 7 (Auth/Session: CSRF, refresh-token custom server flow; Client State: Optimistic updates, Mutation propagation; Native Mobile: App-store release; Notifications: Campaigning, Quiet hours)
- **Key deliverables:**
  - Sign-out flow: Firebase `signOut()` → secure store/keychain clear → query cache clear → scoped store reset → cached receipt/image data purge
  - REQ-14 mobile verification: no authenticated API data or native token reachable after sign-out
  - Device push-token registration flow for Expo/FCM/APNs path, with backend contract added or adapted if missing
  - Push permission request, denied-state handling, and unregister-on-sign-out behavior
  - Safe-area, keyboard, platform back navigation, and error banner polish
  - Android and iOS platform configuration for native permissions
- **SC-08 enforcement:** Sign-out leaves no authenticated data reachable on the device.
- **Trade-offs accepted:** See D41
- **Environment matrix:** local validates store/cache reset mechanics; staging validates staging Firebase, native secure storage, push registration contract, and deployed API state; production impact is guard-only until staging is green.

### Phase 5 — Mobile E2E journey + edge tests

```yaml
phase: 5
types: [core-only, native-mobile, test]
phase_tier: ent
prototype: false
dim_overrides: []
sections_considered: [Core, Native Mobile]
suppressed_dims_count: 2
decisions_entry: D42, D43
```

- **Types:** `core-only, native-mobile, test`
- **Tier:** ent
- **Prototype:** no
- **Sections considered:** Core, Native Mobile
- **Suppressed dimensions:** 2 (Native Mobile: App-store release, deep-linking)
- **Key deliverables:**
  - Jest unit/component harness for mobile screens, hooks, and API state
  - Maestro E2E configuration for Android physical hardware and iOS simulator/device builds
  - **Golden journey test:** sign in → camera scan → streaming events → transaction view → edit → sign out → assert platform keystore cleared and no cached API data
  - **Edge case tests:**
    1. Camera permission denied → recoverable prompt
    2. File/image validation failure → client-side rejection
    3. WebSocket disconnect → reconnect/backoff and terminal-state recovery
    4. Scan failure event → error-code-specific UX
    5. Unknown merchant / low confidence → review affordance
    6. Edit network failure → optimistic rollback + retry
    7. Token refresh mid-stream → stream resumes with valid auth
    8. Push permission denied → app remains usable and records denied state
    9. Sign-out after scan/edit → native token + query/cache eviction
  - CI-compatible command documentation; if iOS simulator is unavailable in CI, document the local simulator gate and keep Android hardware smoke green
- **Exit signal per ROADMAP:** Mobile E2E journey green on Android physical hardware plus the best available iOS simulator/device lane.
- **Trade-offs accepted:** See D42
- **Environment matrix:** local validates Jest/component behavior only; staging-e2e validates deterministic mobile journeys on S23; staging validates real Gemini and deployed multiuser/cache/concurrency behavior; production remains documented/guarded only.

## Current Phase

Phase 3: Mobile ledger + detail + edit

## Dependencies

- Phase 1 depends on P1 Foundation + P2 Receipt Scan Pipeline and consumes the completed P3 web API/client lessons.
- Phase 2 depends on Phase 1 auth, API client, and mobile navigation shell.
- Phase 3 depends on Phase 1 API state and Phase 2 scan completion routing.
- Phase 4 depends on Phases 1-3 so it can evict the real authenticated mobile surface.
- Phase 5 depends on Phases 1-4 and must validate the full ROADMAP exit signal on Android physical hardware and the best available iOS simulator/device lane.

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Mobile repository shape is in SCOPE/KNOWLEDGE but not yet registered in STRUCTURE.md | medium | Phase 1 updates `.kdbp/STRUCTURE.md` before broad mobile code lands |
| Expo/Firebase native auth details may differ from web Firebase behavior | medium | Prove sign-in/token-refresh in Phase 1 with real SDK wiring, not mocks |
| WebSocket auth/proxy behavior may differ from existing web SSE path | high | Phase 2 tests the mobile WebSocket path directly and keeps the `scan_event` contract identical to SSE |
| BaseHTTPMiddleware streaming/WebSocket limitations (PENDING P18) | medium | Exercise unhappy-path streaming in Phase 2 and move middleware to pure ASGI if WebSocket/SSE behavior is blocked |
| Unknown merchant / low confidence signals are still staging-incomplete after P3 (PENDING P8/P9 reopened) | medium | Phase 2 or Phase 3 must either fetch post-scan transaction metadata or add backend terminal-event fields |
| iOS simulator/build availability may be weaker than Android in local/CI environments | medium | Document any local-only iOS gate in Phase 5 and keep Android hardware coverage green |
| WSL2 Android emulator path consumes too many local resources and leaves Maestro unstable | high | Deprecated local emulator/bridge work; use Samsung S23 physical-device lane and EAS APK builds first |
| Push registration may require backend endpoint changes | medium | Phase 4 treats client registration plus backend contract adaptation as one deliverable |
| Cloud mobile E2E can create cost or quota surprises | medium | Use EAS only for controlled APK artifacts first; defer EAS Workflow Maestro and Firebase Test Lab to later gates with documented quotas and manual run controls |
| Local SQLite/mock scan can create false confidence | high | Treat `local` as development convenience only; S23/runtime evidence must come from Railway/Postgres staging lanes |
| Fixture E2E can pollute live Gemini smoke data | high | Keep `staging-e2e` on a separate Railway database/schema and reset only disposable seeded users |
| Railway static SPA hosting may miss CDN/Vercel ergonomics | medium | Verify nested-route refresh, headers, custom domain, and app-open latency; move only the SPA to Vercel/CDN if those fail |
| Production provisioning can distract from the current proof gap | medium | Document and test production guards now, but do not provision production until staging evidence is green |
| Prompt-lab scoring can overstate confidence if gate names, item-total semantics, and promotion thresholds stay ambiguous | high | Phase 2D hardens scoring semantics and a machine-readable promotion threshold before another broad prompt rewrite |
| Receipt prompt/postprocess files are current health hotspots | medium | Keep Phase 2D changes targeted, test-backed, and avoid expanding `coalesce.py` / `prompt_lab/runner.py` except for necessary narrow fixes |
| Baseline artifacts can drift outside STRUCTURE allowances | medium | Phase 2D adds or verifies allowed paths for baseline JSON and the pattern catalog before new baseline/catalog artifact commits |

## Notes

- `web/` is the completed P3 production web app; `frontend/` remains a design/reference surface. P4 builds native mobile separately in `mobile/`.
- Per SCOPE, mobile shares types, OpenAPI client patterns, and category data conceptually with web/backend. It does not share web UI components.
- Mobile streaming uses WebSocket even though web uses SSE. The semantic event contract stays shared.
- Phase 1 Android hardware automation is now proven on the Samsung S23 through WSL `usbipd-win` + native Linux ADB + `p4-phase1-smoke-active.yaml`. For next phases, pre-open the Expo dev client with ADB and run Maestro with its bundled Android driver preinstalled plus `MAESTRO_REINSTALL_DRIVER=false`.
- Phase 1 physical-device lane status (2026-05-15): EAS project `@brownbull/gastify-mobile` is linked in `mobile/app.config.ts`, ignored Firebase native config files are present as EAS secret file env vars, Android e2e APK build `bf9b3488-0dba-4aad-9b49-238b4cabf93d` finished and installed on S23 `RFCW90N4BYP`, and Expo tunnel Metro completed a manual sign-in → test auth → sign-out smoke with screenshots in `tests/mobile/results/latest/manual-smoke/`. Automated Maestro still requires same-host ADB/Maestro.
- WSL-native Maestro path status (2026-05-15): `usbipd-win` and native Linux Android platform-tools are installed, and `usbipd bind --force` + attach can present the S23 to WSL. The remaining setup blocker is WSL USB permissions for Samsung vendor `04e8`; install the documented udev rule before expecting native Linux `adb` or Maestro to control the device.
- Tier distribution: ent × 5. No MVP phases because native auth storage, camera capture, streaming recovery, sign-out isolation, and cross-platform E2E are all exit-signal behavior.
- Open PENDING items carried into this plan: P8/P9 mobile scan review metadata gap, P18 streaming middleware risk.
- Testing ladder: current Phase 1 gate is fast JS checks + staging Firebase auth verification; next gate is a Samsung S23 physical-device smoke with an EAS Android APK; Firebase Test Lab becomes later Android compatibility evidence; Phase 5 requires Maestro scripted journeys on Android hardware and the best available iOS lane.
- Android E2E setup status: Expo dev-client and `mobile/eas.json` are in place; Maestro is installed locally and detected by scripts; the local WSL2 emulator/bridge path is deprecated. The Samsung S23 is authorized through Windows ADB from WSL, which is enough for APK install/manual smoke after an EAS build, but WSL Maestro still needs a same-host path: either Windows-side Maestro or direct WSL USB attachment via `usbipd-win`. The immediate APK-build blocker is Expo/EAS login.
- Receipt prompt status (2026-05-20): the latest v2-dev.9 14-case no-cache prompt-lab batch is valid AI-quality evidence and passes the prompt-lab threshold: strict counts are 7 completed and 7 threshold-failed; severity counts are 7 pass, 7 `minor_review`, and 0 `significant_failure`; provider/cache evidence blockers are 0. DECISION D44 accepts this as the current candidate state with explicit review-warning risks. Production promotion remains blocked until staging-e2e S23 fixture proof and staging live Gemini smoke pass. The mobile/web scan result must preserve receipt-order item display for image comparison and may also expose a category-grouped view over the same items.
