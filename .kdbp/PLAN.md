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
- **Last Updated:** 2026-05-15

## Phases

| # | Phase | Types | Description | Tier | Complexity | Exec | Review | Commit | Push |
|---|-------|-------|-------------|------|------------|------|--------|--------|------|
| 1 | Mobile scaffold + typed API + auth | `auth, native-mobile, client-state` | Expo + React Native TypeScript app in `mobile/`, navigation shell, Firebase Auth SDK, platform keystore/keychain token storage, generated typed API client, authenticated query/store baseline, and KDBP structure registration | ent | high | ✅ | ✅ | ⬜ | ⬜ |
| 2 | Camera scan + WebSocket progress | `upload, realtime, streaming, native-mobile, file-media` | Native camera/file-picker scan capture, multipart submission, WebSocket `scan_event` client, reconnect/backoff, staged scan progress UI, and completion/error routing | ent | high | ⬜ | ⬜ | ⬜ | ⬜ |
| 3 | Mobile ledger + detail + edit | `client-state, user-facing, native-mobile` | Mobile transaction list/detail/edit flow with V4 categories, original + USD amounts, user_edited_at precedence, optimistic mutation rollback, and cache invalidation | ent | medium | ⬜ | ⬜ | ⬜ | ⬜ |
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
- **Contract note:** Web uses SSE; mobile uses WebSocket. Both must consume the same `scan_event` contract.
- **Trade-offs accepted:** See D39

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

## Current Phase

Phase 1: Mobile scaffold + typed API + auth

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
| Unknown merchant / low confidence signals are still integration-incomplete after P3 (PENDING P8/P9 reopened) | medium | Phase 2 or Phase 3 must either fetch post-scan transaction metadata or add backend terminal-event fields |
| iOS simulator/build availability may be weaker than Android in local/CI environments | medium | Document any local-only iOS gate in Phase 5 and keep Android hardware coverage green |
| WSL2 Android emulator path consumes too many local resources and leaves Maestro unstable | high | Deprecated local emulator/bridge work; use Samsung S23 physical-device lane and EAS APK builds first |
| Push registration may require backend endpoint changes | medium | Phase 4 treats client registration plus backend contract adaptation as one deliverable |
| Cloud mobile E2E can create cost or quota surprises | medium | Use EAS only for controlled APK artifacts first; defer EAS Workflow Maestro and Firebase Test Lab to later gates with documented quotas and manual run controls |

## Notes

- `web/` is the completed P3 production web app; `frontend/` remains a design/reference surface. P4 builds native mobile separately in `mobile/`.
- Per SCOPE, mobile shares types, OpenAPI client patterns, and category data conceptually with web/backend. It does not share web UI components.
- Mobile streaming uses WebSocket even though web uses SSE. The semantic event contract stays shared.
- Phase 1 Android hardware automation is now proven on the Samsung S23 through WSL `usbipd-win` + native Linux ADB + `p4-phase1-smoke-active.yaml`. For next phases, pre-open the Expo dev client with ADB and run Maestro with its bundled Android driver preinstalled plus `MAESTRO_REINSTALL_DRIVER=false`.
- Phase 1 physical-device lane status (2026-05-15): EAS project `@brownbull/gastify-mobile` is linked in `mobile/app.config.ts`, ignored Firebase native config files are present as EAS secret file env vars, Android e2e APK build `bf9b3488-0dba-4aad-9b49-238b4cabf93d` finished and installed on S23 `RFCW90N4BYP`, and Expo tunnel Metro completed a manual sign-in → test auth → sign-out smoke with screenshots in `tests/mobile/artifacts/latest/manual-smoke/`. Automated Maestro still requires same-host ADB/Maestro.
- WSL-native Maestro path status (2026-05-15): `usbipd-win` and native Linux Android platform-tools are installed, and `usbipd bind --force` + attach can present the S23 to WSL. The remaining setup blocker is WSL USB permissions for Samsung vendor `04e8`; install the documented udev rule before expecting native Linux `adb` or Maestro to control the device.
- Tier distribution: ent × 5. No MVP phases because native auth storage, camera capture, streaming recovery, sign-out isolation, and cross-platform E2E are all exit-signal behavior.
- Open PENDING items carried into this plan: P8/P9 mobile scan review metadata gap, P18 streaming middleware risk.
- Testing ladder: current Phase 1 gate is fast JS checks + staging Firebase auth verification; next gate is a Samsung S23 physical-device smoke with an EAS Android APK; Firebase Test Lab becomes later Android compatibility evidence; Phase 5 requires Maestro scripted journeys on Android hardware and the best available iOS lane.
- Android E2E setup status: Expo dev-client and `mobile/eas.json` are in place; Maestro is installed locally and detected by scripts; the local WSL2 emulator/bridge path is deprecated. The Samsung S23 is authorized through Windows ADB from WSL, which is enough for APK install/manual smoke after an EAS build, but WSL Maestro still needs a same-host path: either Windows-side Maestro or direct WSL USB attachment via `usbipd-win`. The immediate APK-build blocker is Expo/EAS login.
